import asyncio
import logging
import uuid
from datetime import datetime, timezone

from agents import SPECIALIST_IDS, run_agent
from database import get_db

log = logging.getLogger("agent")


# ponytail: in-memory event bus per run, good enough for <10 concurrent runs
# upgrade to Redis pub/sub when you need multi-process or persistence
_run_events: dict[str, list[dict]] = {}
_run_signals: dict[str, asyncio.Event] = {}


async def _emit(run_id: str, event: str, data: dict):
    _run_events.setdefault(run_id, []).append({"event": event, **data})
    if run_id in _run_signals:
        _run_signals[run_id].set()


def get_events(run_id: str) -> list[dict]:
    return _run_events.get(run_id, [])


def new_run_signal():
    ev = asyncio.Event()
    return ev


async def run_workflow(
    run_id: str, product: str, provider: str, model: str, api_key: str
):
    db = await get_db()
    try:
        # Run specialists in parallel
        await _emit(run_id, "run_started", {"run_id": run_id})

        async def _run_and_store(agent_id: str):
            await _emit(run_id, "agent_started", {"agent_id": agent_id})
            log.info(f"[{run_id}] {agent_id} started")
            await db.execute(
                "UPDATE agent_outputs SET status='running' WHERE run_id=? AND agent_id=?",
                (run_id, agent_id),
            )
            await db.commit()
            try:
                output = await run_agent(agent_id, product, provider, model, api_key)
                log.info(f"[{run_id}] {agent_id} completed ({len(output)} chars)")
                await _emit(
                    run_id, "agent_completed", {"agent_id": agent_id, "output": output}
                )
                await db.execute(
                    "UPDATE agent_outputs SET output=?, status='completed' WHERE run_id=? AND agent_id=?",
                    (output, run_id, agent_id),
                )
            except Exception as e:
                log.error(f"[{run_id}] {agent_id} failed: {e}")
                await _emit(
                    run_id, "agent_failed", {"agent_id": agent_id, "error": str(e)}
                )
                await db.execute(
                    "UPDATE agent_outputs SET output=?, status='failed' WHERE run_id=? AND agent_id=?",
                    (str(e), run_id, agent_id),
                )
            await db.commit()

        await asyncio.gather(*[_run_and_store(aid) for aid in SPECIALIST_IDS])

        # Collect specialist outputs
        rows = await db.execute_fetchall(
            "SELECT agent_id, output FROM agent_outputs WHERE run_id=? AND status='completed'",
            (run_id,),
        )
        specialist_outputs = {row[0]: row[1] for row in rows}

        # CEO synthesizes
        await _emit(run_id, "agent_started", {"agent_id": "ceo"})
        await db.execute(
            "UPDATE agent_outputs SET status='running' WHERE run_id=? AND agent_id='ceo'",
            (run_id,),
        )
        await db.commit()

        ceo_input = f"Product: {product}\n\n" + "\n\n".join(
            f"## {aid.replace('_', ' ').title()}\n{output}"
            for aid, output in specialist_outputs.items()
        )
        log.info(
            f"[{run_id}] CEO agent started with {len(specialist_outputs)} specialist reports"
        )
        try:
            ceo_output = await run_agent("ceo", ceo_input, provider, model, api_key)
            await _emit(
                run_id, "agent_completed", {"agent_id": "ceo", "output": ceo_output}
            )
            await db.execute(
                "UPDATE agent_outputs SET output=?, status='completed' WHERE run_id=? AND agent_id='ceo'",
                (ceo_output, run_id),
            )
        except Exception as e:
            await _emit(run_id, "agent_failed", {"agent_id": "ceo", "error": str(e)})
            await db.execute(
                "UPDATE agent_outputs SET output=?, status='failed' WHERE run_id=? AND agent_id='ceo'",
                (str(e), run_id),
            )

        await db.execute(
            "UPDATE runs SET status='completed', completed_at=? WHERE id=?",
            (datetime.now(timezone.utc).isoformat(), run_id),
        )
        await db.commit()
        log.info(f"[{run_id}] Run completed")
        await _emit(run_id, "run_completed", {"run_id": run_id})

    except Exception as e:
        log.error(f"[{run_id}] Workflow failed: {e}")
        await db.execute("UPDATE runs SET status='failed' WHERE id=?", (run_id,))
        await db.commit()
        await _emit(run_id, "run_failed", {"error": str(e)})
    finally:
        await db.close()
