import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { fetchRun, streamRun } from "../api";

const AGENT_LABELS = {
  content_ideas: "Content Ideas",
  marketing: "Marketing Strategy",
  pricing: "Pricing Strategy",
  competitor: "Competitor Analysis",
  support: "Customer Support",
  ceo: "CEO Report",
};

const AGENT_ICONS = {
  content_ideas: "C",
  marketing: "M",
  pricing: "P",
  competitor: "A",
  support: "S",
  ceo: "CEO",
};

// Custom lightweight markdown renderer to display beautiful reports
function renderMarkdown(text) {
  if (!text) return "";
  
  // Protect HTML tags
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  
  // Headings
  html = html.replace(/^### (.*?)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.*?)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.*?)$/gm, "<h1>$1</h1>");
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  
  // Bullet points
  html = html.replace(/^[*-] (.*?)$/gm, "<li>$1</li>");
  
  // Wrap list items in <ul>
  // A simple way is to find consecutive <li> and wrap them, but here we can just styling list items nicely
  
  // Inline code
  html = html.replace(/`(.*?)`/g, "<code>$1</code>");
  
  // Line breaks (convert double newlines to paragraphs)
  html = html.replace(/\n\n/g, "</p><p>");
  html = html.replace(/\n/g, "<br />");
  
  return <div dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }} />;
}

export default function RunDetail() {
  const { id } = useParams();
  const [run, setRun] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState("content_ideas");
  const esRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    fetchRun(id).then((data) => {
      if (data && !data.error) {
        setRun(data);
        // If CEO is finished, default to CEO report
        if (data.agents?.ceo?.status === "completed") {
          setSelectedAgent("ceo");
        }
      }
    });

    const es = streamRun(id, (event, eventData) => {
      fetchRun(id).then((data) => {
        if (data && !data.error) {
          setRun(data);
          // Auto select the running or completed agent
          if (event === "agent_started") {
            setSelectedAgent(eventData.agent_id);
          } else if (event === "agent_completed" && eventData.agent_id === "ceo") {
            setSelectedAgent("ceo");
          }
        }
      });
    });
    esRef.current = es;

    pollRef.current = setInterval(() => {
      fetchRun(id).then((data) => {
        if (data && !data.error) setRun(data);
      });
    }, 3000);

    return () => {
      es.close();
      clearInterval(pollRef.current);
    };
  }, [id]);

  if (!run) {
    return (
      <div className="empty" style={{ minHeight: "60vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <span className="spinner" style={{ width: "32px", height: "32px", marginBottom: "16px" }} />
        Retrieving run configurations...
      </div>
    );
  }

  if (run.error) {
    return (
      <div className="empty" style={{ color: "var(--red)" }}>
        ⚠️ {run.error}
      </div>
    );
  }

  // Stop polling once run is done
  if (run.status !== "running" && pollRef.current) {
    clearInterval(pollRef.current);
    pollRef.current = null;
  }

  const isRunning = run.status === "running";
  const specialistIds = ["content_ideas", "marketing", "pricing", "competitor", "support"];
  const allAgentIds = [...specialistIds, "ceo"];
  
  const currentOutput = run.agents?.[selectedAgent];

  return (
    <div>
      <div className="row-between" style={{ marginBottom: "28px" }}>
        <div>
          <h1 style={{ marginBottom: "4px" }}>Run <span className="mono" style={{ background: "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: "4px", fontSize: "24px" }}>{run.id}</span></h1>
          <div style={{ fontSize: "14px", color: "var(--text-dim)", display: "flex", gap: "8px" }}>
            <span style={{ textTransform: "capitalize", fontWeight: "600" }}>{run.provider}</span>
            <span>&bull;</span>
            <span className="mono">{run.model}</span>
            <span>&bull;</span>
            <span>{run.created_at ? new Date(run.created_at + "Z").toLocaleString() : ""}</span>
          </div>
        </div>
        
        <span className={`badge badge-${run.status}`} style={{ fontSize: "14px", padding: "6px 16px" }}>
          {isRunning && <span className="spinner" style={{ marginRight: "8px", width: "12px", height: "12px" }} />}
          {run.status}
        </span>
      </div>

      {/* Header product description */}
      <div className="card card-glass" style={{ marginBottom: "32px" }}>
        <label>Analyzed Service Description</label>
        <p style={{ marginTop: "6px", color: "white", fontSize: "15px", fontWeight: "500" }}>{run.product}</p>
      </div>

      <h2>Collaboration Terminal</h2>

      <div className="agent-flow-container">
        {/* Timeline on the left */}
        <div className="agent-timeline">
          {allAgentIds.map((aid) => {
            const agent = run.agents?.[aid];
            const isActive = selectedAgent === aid;
            const isCeo = aid === "ceo";
            
            let cardClass = "timeline-card";
            if (isActive) cardClass += " active";
            if (agent?.status) cardClass += ` ${agent.status}`;

            return (
              <div 
                key={aid} 
                className={cardClass}
                onClick={() => setSelectedAgent(aid)}
                style={isCeo ? { 
                  marginTop: "16px",
                  background: isRunning && agent?.status === "pending" ? "rgba(99,102,241,0.02)" : undefined,
                  borderWidth: isCeo && isActive ? "1px 1px 1px 4px" : "1px"
                } : {}}
              >
                <div className="timeline-info">
                  <span className="agent-timeline-icon">{AGENT_ICONS[aid]}</span>
                  <div>
                    <div className="timeline-agent-name" style={{ color: isCeo ? "var(--accent-purple)" : "white" }}>
                      {AGENT_LABELS[aid]}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "capitalize" }}>
                      {agent?.status || "pending"}
                    </div>
                  </div>
                </div>

                <div className="row">
                  {agent?.status === "running" && (
                    <span className="spinner" style={{ width: "12px", height: "12px" }} />
                  )}
                  {agent?.status === "completed" && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: "14px", height: "14px" }}>
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                  {agent?.status === "failed" && (
                    <span style={{ color: "var(--red)", fontSize: "12px", fontWeight: "bold" }}>✕</span>
                  )}
                  {(!agent?.status || agent?.status === "pending") && (
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--text-muted)" }}></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Display Output on the right */}
        <div className={`card output-display-card ${selectedAgent === "ceo" ? "ceo-premium-card" : ""}`}>
          <div className="output-header">
            <div className="output-title-wrapper" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="agent-timeline-icon" style={{ width: "36px", height: "36px", fontSize: "14px" }}>{AGENT_ICONS[selectedAgent]}</span>
              <span className={`output-title ${selectedAgent === "ceo" ? "ceo-premium-title" : ""}`}>
                {AGENT_LABELS[selectedAgent]}
              </span>
            </div>
            {currentOutput?.status && (
              <span className={`badge badge-${currentOutput.status}`}>
                {currentOutput.status}
              </span>
            )}
          </div>

          <div className="output-body">
            {currentOutput?.output ? (
              renderMarkdown(currentOutput.output)
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", textAlign: "center", gap: "12px", padding: "40px" }}>
                {currentOutput?.status === "running" ? (
                  <>
                    <span className="spinner" style={{ width: "32px", height: "32px" }} />
                    <p style={{ marginTop: "12px", color: "var(--text-dim)" }}>Agent is actively synthesizing response...</p>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "48px", height: "48px" }}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                    <p>Waiting for workflow steps to trigger this agent...</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
