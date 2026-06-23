"use client";

import {
  GitBranch,
  Moon,
  PanelLeft,
  Plus,
  Search,
  Settings,
  Sun,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { RunningGrid } from "@/components/running-grid";
import { StatusPill } from "@/components/status-pill";
import { useRuntimeConfig } from "@/components/providers";
import type { AgentSessionSummary, Viewer } from "@/lib/types";

export function AppFrame({
  viewer,
  sessions,
  selectedSessionId,
  children,
}: {
  viewer: Viewer;
  sessions: AgentSessionSummary[];
  selectedSessionId?: string;
  children: ReactNode;
}) {
  const [dark, setDark] = useState(false);
  const { clerkConfigured } = useRuntimeConfig();

  useEffect(() => {
    setDark(localStorage.getItem("cloud-agent-theme") === "dark");
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("cloud-agent-theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <div
      className="app-root"
      style={{
        height: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <header style={{ display: "flex", height: 52, flex: "none" }}>
        <div
          style={{
            width: 332,
            flex: "none",
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "0 16px",
            background: "var(--sidebar)",
            borderRight: "1px solid var(--border)",
          }}
        >
          <PanelLeft size={18} color="var(--muted)" />
          <Search size={18} color="var(--muted)" />
        </div>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            padding: "0 22px",
            background: "var(--bg)",
            borderBottom: "1px solid transparent",
          }}
        >
          <span
            style={{
              fontSize: 16,
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            Cloud Agent Handoff
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <Link className="icon-button" href="/app/settings" aria-label="Settings">
              <Settings size={18} />
            </Link>
          </div>
        </div>
      </header>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <aside
          style={{
            width: 332,
            flex: "none",
            background: "var(--sidebar)",
            borderRight: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <div className="scrl" style={{ flex: 1, overflowY: "auto", padding: "6px 10px 12px" }}>
            <Link
              href="/app"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 10px",
                borderRadius: 8,
                color: "var(--text)",
              }}
            >
              <Plus size={18} color="var(--accent)" />
              <span style={{ fontSize: 15, fontWeight: 600, flex: 1 }}>New Agent</span>
            </Link>

            <div
              style={{
                color: "var(--subtle)",
                fontSize: 12,
                fontWeight: 700,
                marginTop: 18,
                padding: "0 10px 7px",
                textTransform: "uppercase",
              }}
            >
              Sessions
            </div>

            {sessions.length === 0 ? (
              <div style={{ color: "var(--muted)", fontSize: 14, padding: "8px 10px" }}>
                No coding tasks yet.
              </div>
            ) : (
              sessions.map((session) => (
                <Link
                  key={session._id}
                  href={`/app/sessions/${session._id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "8px 10px",
                    borderRadius: 8,
                    background:
                      selectedSessionId === session._id ? "var(--active)" : "transparent",
                    color: "var(--text)",
                  }}
                >
                  {session.status === "running" || session.status === "queued" ? (
                    <RunningGrid />
                  ) : (
                    <GitBranch size={16} color="var(--muted)" />
                  )}
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: 14,
                      fontWeight: selectedSessionId === session._id ? 600 : 500,
                    }}
                  >
                    {session.title}
                  </span>
                  <StatusPill status={session.status} />
                </Link>
              ))
            )}
          </div>

          <footer
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "11px 14px",
              borderTop: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "var(--accent)",
                color: "#fff",
                display: "grid",
                placeItems: "center",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              {viewer?.name?.[0] ?? viewer?.email?.[0] ?? "A"}
            </div>
            <div style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}>
              <div
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {viewer?.name ?? viewer?.email ?? "Account setup"}
              </div>
              <div style={{ color: "var(--subtle)", fontSize: 12 }}>
                {clerkConfigured ? "Clerk authenticated" : "Clerk not configured"}
              </div>
            </div>
            <button
              className="icon-button"
              type="button"
              aria-label="Toggle theme"
              onClick={() => setDark((value) => !value)}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </footer>
        </aside>

        <main
          className="scrl"
          style={{
            flex: 1,
            minWidth: 0,
            overflowY: "auto",
            background: "var(--bg)",
            padding: "24px 30px",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
