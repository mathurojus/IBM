const BASE = "/api";

export async function fetchRuns() {
  const res = await fetch(`${BASE}/runs`);
  return res.json();
}

export async function fetchRun(id) {
  const res = await fetch(`${BASE}/runs/${id}`);
  return res.json();
}

export async function createRun(product, provider, model) {
  try {
    const res = await fetch(`${BASE}/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product, provider, model }),
    });
    return res.json();
  } catch (e) {
    return { error: `Cannot reach backend: ${e.message}` };
  }
}

export async function deleteRun(id) {
  await fetch(`${BASE}/runs/${id}`, { method: "DELETE" });
}

export function streamRun(id, onEvent) {
  const es = new EventSource(`${BASE}/runs/${id}/stream`);
  const handler = (name) => (e) => onEvent(name, JSON.parse(e.data));
  es.addEventListener("agent_started", handler("agent_started"));
  es.addEventListener("agent_completed", handler("agent_completed"));
  es.addEventListener("agent_failed", handler("agent_failed"));
  es.addEventListener("run_completed", (e) => { onEvent("run_completed", JSON.parse(e.data)); es.close(); });
  es.addEventListener("run_failed", (e) => { onEvent("run_failed", JSON.parse(e.data)); es.close(); });
  // ponytail: don't close on transient errors — EventSource reconnects automatically
  es.onerror = () => {};
  return es;
}

export async function fetchAgents() {
  const res = await fetch(`${BASE}/agents`);
  return res.json();
}

export async function updateAgent(id, systemPrompt) {
  await fetch(`${BASE}/agents/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system_prompt: systemPrompt }),
  });
}

export async function fetchSettings() {
  const res = await fetch(`${BASE}/settings`);
  return res.json();
}

export async function updateProvider(provider, apiKey, model) {
  await fetch(`${BASE}/settings/${provider}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, model }),
  });
}

export async function setDefaultProvider(provider) {
  await fetch(`${BASE}/settings/default-provider`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider }),
  });
}
