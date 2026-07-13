import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchRuns, deleteRun } from "../api";

export default function History() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const navigate = useNavigate();

  const loadRuns = () => {
    setLoading(true);
    fetchRuns()
      .then((data) => {
        setRuns(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Unable to retrieve run history. Is backend running?");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadRuns();
  }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this run?")) {
      await deleteRun(id);
      setRuns((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const filteredRuns = runs.filter((run) => {
    const matchesSearch = 
      run.id.toLowerCase().includes(search.toLowerCase()) ||
      run.product.toLowerCase().includes(search.toLowerCase()) ||
      (run.provider && run.provider.toLowerCase().includes(search.toLowerCase())) ||
      (run.model && run.model.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "" || run.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <div className="row-between" style={{ marginBottom: "28px" }}>
        <h1>Workflow History</h1>
        <button className="btn btn-secondary" onClick={loadRuns} disabled={loading}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px" }}>
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 11-.57-8.38l5.67-5.67"/>
          </svg>
          Refresh
        </button>
      </div>

      <div className="history-controls">
        <div className="search-input-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search by Run ID, product details, model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-select-wrapper">
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="running">Running</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>
      {error && (
        <div style={{ color: "var(--red)", background: "rgba(239, 68, 68, 0.08)", padding: "16px", borderRadius: "var(--radius-lg)", border: "1px solid rgba(239, 68, 68, 0.2)", marginBottom: "20px" }}>
          Error: {error}
        </div>
      )}

      {loading ? (
        <div className="empty">
          <span className="spinner" style={{ width: "32px", height: "32px" }} /><br/><br/>
          Loading history...
        </div>
      ) : filteredRuns.length === 0 ? (
        <div className="card empty" style={{ borderStyle: "dashed" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "48px", height: "48px", color: "var(--text-muted)", marginBottom: "16px" }}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {runs.length === 0 ? "No workflows run yet. Click 'New Run' to get started." : "No workflows matched your search filters."}
        </div>
      ) : (
        <div className="history-grid">
          {filteredRuns.map((run) => (
            <div 
              key={run.id} 
              className="card card-clickable" 
              onClick={() => navigate(`/runs/${run.id}`)}
              style={{ display: "flex", flexDirection: "column", gap: "12px", borderLeft: `4px solid var(--border)` }}
            >
              <div className="row-between">
                <div className="row" style={{ gap: "8px" }}>
                  <span className={`status-dot ${run.status}`} />
                  <strong className="mono" style={{ fontSize: "14px", color: "white" }}>{run.id}</strong>
                  <span className={`badge badge-${run.status}`}>
                    {run.status}
                  </span>
                </div>
                <button 
                  className="btn btn-danger" 
                  style={{ padding: "6px 12px", fontSize: "12px" }}
                  onClick={(e) => handleDelete(e, run.id)}
                >
                  Delete
                </button>
              </div>

              <p style={{ fontSize: "14px", color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                {run.product}
              </p>

              <div className="row-between" style={{ borderTop: "1px solid var(--border)", paddingTop: "12px", fontSize: "12px", color: "var(--text-muted)" }}>
                <div>
                  <span style={{ textTransform: "capitalize", fontWeight: "600", color: "var(--text-dim)" }}>{run.provider}</span>
                  {run.model && ` / ${run.model}`}
                </div>
                <div>
                  {run.created_at ? new Date(run.created_at + "Z").toLocaleString() : "Date unknown"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
