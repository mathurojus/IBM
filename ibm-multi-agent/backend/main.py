import asyncio
import json
import logging
import os
import uuid
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

from database import get_db, init_db
from models import AgentConfigUpdate, ProviderConfigUpdate, RunRequest
from orchestrator import (
    get_events,
    new_run_signal,
    run_workflow,
    _run_signals,
    _run_events,
)

from pathlib import Path
load_dotenv(Path(__file__).resolve().parent.parent / ".env")
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("agent")

SPECIALIST_IDS = ["content_ideas", "marketing", "pricing", "competitor", "support"]
ALL_AGENT_IDS = SPECIALIST_IDS + ["ceo"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Multi-Agent Dashboard", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"ok": True}


# --- Runs ---


@app.post("/api/runs")
async def create_run(req: RunRequest):
    db = await get_db()
    run_id = str(uuid.uuid4())[:8]

    # Resolve provider/model from settings or env
    provider = req.provider
    model = req.model
    if not provider:
        row = await db.execute_fetchall(
            "SELECT value FROM settings WHERE key='default_provider'"
        )
        provider = row[0][0] if row else os.getenv("DEFAULT_PROVIDER", "openai")
    if not model:
        row = await db.execute_fetchall(
            "SELECT value FROM settings WHERE key=?", (f"{provider}_model",)
        )
        model = row[0][0] if row else os.getenv(f"{provider.upper()}_MODEL", "gpt-4o")

    # Get API key from settings or env
    row = await db.execute_fetchall(
        "SELECT value FROM settings WHERE key=?", (f"{provider}_api_key",)
    )
    api_key = row[0][0] if row else os.getenv(f"{provider.upper()}_API_KEY", "")
    if not api_key:
        return {"error": f"No API key configured for {provider}. Set it in Settings."}

    log.info(f"Resolved provider={provider}, model={model}, has_key={bool(api_key)}")

    await db.execute(
        "INSERT INTO runs (id, product, provider, model, status) VALUES (?, ?, ?, ?, 'running')",
        (run_id, req.product, provider, model),
    )
    for aid in ALL_AGENT_IDS:
        await db.execute(
            "INSERT INTO agent_outputs (run_id, agent_id, status) VALUES (?, ?, 'pending')",
            (run_id, aid),
        )
    await db.commit()
    await db.close()

    # Fire and forget — SSE stream picks up events
    task = asyncio.create_task(
        run_workflow(run_id, req.product, provider, model, api_key)
    )
    task.add_done_callback(
        lambda t: (
            log.error(f"Workflow {run_id} failed: {t.exception()}")
            if t.exception()
            else None
        )
    )
    log.info(f"Started run {run_id} with {provider}/{model}")

    return {"run_id": run_id, "status": "running"}


@app.get("/api/runs")
async def list_runs():
    db = await get_db()
    rows = await db.execute_fetchall(
        "SELECT id, product, provider, model, status, created_at, completed_at FROM runs ORDER BY created_at DESC LIMIT 50"
    )
    await db.close()
    return [
        {
            "id": r[0],
            "product": r[1],
            "provider": r[2],
            "model": r[3],
            "status": r[4],
            "created_at": r[5],
            "completed_at": r[6],
        }
        for r in rows
    ]


@app.get("/api/runs/{run_id}")
async def get_run(run_id: str):
    db = await get_db()
    rows = await db.execute_fetchall(
        "SELECT id, product, provider, model, status, created_at, completed_at FROM runs WHERE id=?",
        (run_id,),
    )
    if not rows:
        await db.close()
        return {"error": "Run not found"}
    r = rows[0]
    outputs = await db.execute_fetchall(
        "SELECT agent_id, output, status FROM agent_outputs WHERE run_id=?",
        (run_id,),
    )
    await db.close()
    return {
        "id": r[0],
        "product": r[1],
        "provider": r[2],
        "model": r[3],
        "status": r[4],
        "created_at": r[5],
        "completed_at": r[6],
        "agents": {o[0]: {"output": o[1], "status": o[2]} for o in outputs},
    }


@app.delete("/api/runs/{run_id}")
async def delete_run(run_id: str):
    db = await get_db()
    await db.execute("DELETE FROM agent_outputs WHERE run_id=?", (run_id,))
    await db.execute("DELETE FROM runs WHERE id=?", (run_id,))
    await db.commit()
    await db.close()
    return {"ok": True}


@app.get("/api/runs/{run_id}/stream")
async def stream_run(run_id: str):
    _run_events.pop(run_id, None)  # fresh start for reconnect
    signal = new_run_signal()
    _run_signals[run_id] = signal

    async def generate():
        idx = 0
        try:
            while True:
                events = get_events(run_id)
                while idx < len(events):
                    e = events[idx]
                    yield {"event": e["event"], "data": json.dumps(e)}
                    idx += 1
                if any(e["event"] in ("run_completed", "run_failed") for e in events):
                    break
                # ponytail: clear before wait to avoid race — events emitted
                # between our last check and clear() are caught on next loop
                signal.clear()
                events_after = get_events(run_id)
                if len(events_after) > idx:
                    continue
                try:
                    await asyncio.wait_for(signal.wait(), timeout=5)
                except asyncio.TimeoutError:
                    pass
        finally:
            _run_signals.pop(run_id, None)

    return EventSourceResponse(generate())


# --- Agents ---


@app.get("/api/agents")
async def list_agents():
    db = await get_db()
    rows = await db.execute_fetchall(
        "SELECT agent_id, system_prompt FROM agent_configs"
    )
    await db.close()
    configs = {r[0]: r[1] for r in rows}
    # ponytail: hardcoded agent metadata + DB overrides
    from agents import AGENT_PROMPTS

    return [
        {
            "id": aid,
            "name": AGENT_PROMPTS.get(aid, {}).get("name", aid),
            "system_prompt": configs.get(
                aid, AGENT_PROMPTS.get(aid, {}).get("system", "")
            ),
        }
        for aid in ALL_AGENT_IDS
    ]


@app.put("/api/agents/{agent_id}")
async def update_agent(agent_id: str, body: AgentConfigUpdate):
    db = await get_db()
    await db.execute(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        (f"agent_prompt_{agent_id}", body.system_prompt),
    )
    # Also upsert agent_configs table
    await db.execute(
        "INSERT INTO agent_configs (agent_id, system_prompt) VALUES (?, ?) ON CONFLICT(agent_id) DO UPDATE SET system_prompt=excluded.system_prompt",
        (agent_id, body.system_prompt),
    )
    await db.commit()
    await db.close()
    return {"ok": True}


# --- Settings ---


@app.get("/api/settings")
async def get_settings():
    db = await get_db()
    rows = await db.execute_fetchall("SELECT key, value FROM settings")
    await db.close()
    settings = {r[0]: r[1] for r in rows}
    # Mask API keys for display
    providers = ["openai", "anthropic", "gemini", "groq"]
    result = {
        "default_provider": settings.get(
            "default_provider", os.getenv("DEFAULT_PROVIDER", "openai")
        )
    }
    for p in providers:
        env_key = f"{p.upper()}_API_KEY"
        env_model = f"{p.upper()}_MODEL"
        default_model = {
            "openai": "gpt-4o",
            "anthropic": "claude-sonnet-4-20250514",
            "gemini": "gemini-2.0-flash",
            "groq": "llama-3.3-70b-versatile",
        }[p]
        result[f"{p}_api_key"] = (
            "***" if settings.get(f"{p}_api_key") or os.getenv(env_key) else ""
        )
        result[f"{p}_model"] = settings.get(
            f"{p}_model", os.getenv(env_model, default_model)
        )
    return result


@app.put("/api/settings/{provider}")
async def update_provider(provider: str, body: ProviderConfigUpdate):
    db = await get_db()
    if body.api_key and body.api_key != "***":
        await db.execute(
            "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (f"{provider}_api_key", body.api_key),
        )
    if body.model:
        await db.execute(
            "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (f"{provider}_model", body.model),
        )
    await db.commit()
    await db.close()
    return {"ok": True}


@app.put("/api/settings/default-provider")
async def set_default_provider(body: dict):
    db = await get_db()
    await db.execute(
        "INSERT INTO settings (key, value) VALUES ('default_provider', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        (body["provider"],),
    )
    await db.commit()
    await db.close()
    return {"ok": True}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
