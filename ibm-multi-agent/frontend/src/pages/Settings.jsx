import { useState, useEffect } from "react";
import { fetchAgents, updateAgent, fetchSettings, updateProvider, setDefaultProvider } from "../api";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("providers"); // "providers" or "agents"
  const [agents, setAgents] = useState([]);
  const [settings, setSettings] = useState({});
  const [editing, setEditing] = useState(null);
  const [promptText, setPromptText] = useState("");
  const [providerKeys, setProviderKeys] = useState({});
  const [providerModels, setProviderModels] = useState({});
  const [saved, setSaved] = useState(null);

  useEffect(() => {
    fetchAgents().then(setAgents);
    fetchSettings().then((s) => {
      setSettings(s);
      setProviderModels({
        openai: s.openai_model || "",
        anthropic: s.anthropic_model || "",
        gemini: s.gemini_model || "",
        groq: s.groq_model || "",
      });
    });
  }, []);

  const handleSavePrompt = async (agentId) => {
    await updateAgent(agentId, promptText);
    setAgents((prev) => prev.map((a) => a.id === agentId ? { ...a, system_prompt: promptText } : a));
    setEditing(null);
    setSaved(agentId);
    setTimeout(() => setSaved(null), 2000);
  };

  const handleSaveProvider = async (provider) => {
    await updateProvider(provider, providerKeys[provider] || "***", providerModels[provider]);
    setSaved(provider);
    setTimeout(() => setSaved(null), 2000);
  };

  const handleSetDefault = async (provider) => {
    await setDefaultProvider(provider);
    setSettings((s) => ({ ...s, default_provider: provider }));
    setSaved("default");
    setTimeout(() => setSaved(null), 2000);
  };

  return (
    <div>
      <h1>System Settings</h1>

      {/* Tab Switcher */}
      <div className="tabs-header">
        <button 
          className={`tab-btn ${activeTab === "providers" ? "active" : ""}`}
          onClick={() => setActiveTab("providers")}
        >
          LLM Providers
        </button>
        <button 
          className={`tab-btn ${activeTab === "agents" ? "active" : ""}`}
          onClick={() => setActiveTab("agents")}
        >
          Specialist Prompts
        </button>
      </div>

      {activeTab === "providers" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
          {["openai", "anthropic", "gemini", "groq"].map((provider) => (
            <div key={provider} className="card card-clickable">
              <div className="row-between" style={{ marginBottom: "16px" }}>
                <h3 style={{ textTransform: "capitalize", margin: 0, fontSize: "18px", color: "white" }}>{provider === "groq" ? "Groq (Recommended)" : provider}</h3>
                <div className="row" style={{ gap: "8px" }}>
                  {settings.default_provider === provider ? (
                    <span className="badge badge-completed">Default</span>
                  ) : (
                    <button className="btn btn-secondary" style={{ fontSize: "11px", padding: "4px 10px" }}
                      onClick={() => handleSetDefault(provider)}>
                      Set Default
                    </button>
                  )}
                  {saved === provider && <span style={{ color: "var(--green)", fontSize: "13px", fontWeight: "600" }}>Saved</span>}
                </div>
              </div>
              <div className="form-group">
                <label>API Key</label>
                <input
                  type="password"
                  placeholder={settings[`${provider}_api_key`] ? "••••••••••••••••" : "Not configured"}
                  value={providerKeys[provider] || ""}
                  onChange={(e) => setProviderKeys((k) => ({ ...k, [provider]: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Model Identifier</label>
                <input
                  value={providerModels[provider] || ""}
                  onChange={(e) => setProviderModels((m) => ({ ...m, [provider]: e.target.value }))}
                  placeholder="e.g. gpt-4o, llama-3.3-70b-versatile..."
                />
              </div>
              <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => handleSaveProvider(provider)}>
                Apply Settings
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === "agents" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {agents.map((agent) => (
            <div key={agent.id} className="card">
              <div className="row-between" style={{ marginBottom: "12px" }}>
                <h3 style={{ margin: 0, fontSize: "16px", color: "white", fontWeight: "600" }}>{agent.name} System Profile</h3>
                {saved === agent.id && <span style={{ color: "var(--green)", fontSize: "13px", fontWeight: "600" }}>Prompt Saved</span>}
              </div>
              {editing === agent.id ? (
                <>
                  <textarea
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    rows={8}
                    style={{ fontFamily: "monospace", fontSize: "13px" }}
                  />
                  <div className="row" style={{ marginTop: "12px", gap: "8px" }}>
                    <button className="btn btn-primary" onClick={() => handleSavePrompt(agent.id)}>Save Changes</button>
                    <button className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="output-box" style={{ fontSize: "13px", color: "var(--text-dim)", maxHeight: "140px", overflowY: "auto", borderStyle: "solid" }}>
                    {agent.system_prompt}
                  </div>
                  <button className="btn btn-secondary" style={{ marginTop: "12px", fontSize: "12px", padding: "6px 14px" }}
                    onClick={() => { setEditing(agent.id); setPromptText(agent.system_prompt); }}>
                    Modify System Prompt
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
