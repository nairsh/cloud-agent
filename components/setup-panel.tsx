import { AlertTriangle, CheckCircle2 } from "lucide-react";

export function SetupPanel({
  title = "Configuration required",
  issues,
}: {
  title?: string;
  issues: string[];
}) {
  if (issues.length === 0) {
    return (
      <div className="empty-panel">
        <h2>
          <CheckCircle2 size={16} /> Ready
        </h2>
        <p>Required services are configured.</p>
      </div>
    );
  }

  return (
    <div className="empty-panel" style={{ display: "grid", gap: 12 }}>
      <h2 style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <AlertTriangle size={16} /> {title}
      </h2>
      <div style={{ display: "grid", gap: 8 }}>
        {issues.map((issue) => (
          <div
            key={issue}
            style={{
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--muted)",
              fontSize: 13,
              padding: "9px 10px",
            }}
          >
            {issue}
          </div>
        ))}
      </div>
    </div>
  );
}
