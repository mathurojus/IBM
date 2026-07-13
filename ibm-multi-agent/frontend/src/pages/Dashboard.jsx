import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRun } from "../api";

export default function Dashboard() {
  const [product, setProduct] = useState("");
  const [provider, setProvider] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!product.trim()) return;
    setLoading(true);
    setError(null);
    const res = await createRun(product, provider || undefined);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    navigate(`/runs/${res.run_id}`);
  };

  return (
    <div className="home-container">
      <div className="home-bg-wrapper">
        <img 
          src="/robot_orchestrator.png" 
          alt="Robot Orchestration Background" 
          className="home-bg-image"
        />
        <div className="home-bg-gradient"></div>
      </div>

      <div className="home-content-card card-glass">
        <div className="home-header">
          <h1>Initiate Multi-Agent Analysis</h1>
          <p>Describe your product or service below. Our specialized autonomous agents will collaborate to synthesize content ideas, marketing campaigns, pricing, competitor audits, and support frameworks.</p>
        </div>

        {error && (
          <div style={{ 
            color: "var(--red)", 
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            padding: "12px 16px",
            borderRadius: "var(--radius-md)",
            marginBottom: "20px",
            fontSize: "14px"
          }}>
            Error: {error}
          </div>
        )}

        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label>Product / Service Details</label>
            <textarea
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="e.g. A cybernetic personal trainer app that designs custom daily workout splits and nutrition templates using local context and biometric sensors..."
              rows={4}
              disabled={loading}
              required
            />
          </div>
          
          <div className="form-group">
            <label>AI Model Provider</label>
            <select 
              value={provider} 
              onChange={(e) => setProvider(e.target.value)}
              disabled={loading}
            >
              <option value="">Default Provider</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="gemini">Gemini</option>
              <option value="groq">Groq</option>
            </select>
          </div>

          <button 
            className="btn btn-primary" 
            type="submit" 
            style={{ width: "100%", marginTop: "12px" }}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" />
                Orchestrating Agents...
              </>
            ) : (
              "Deploy Agents"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
