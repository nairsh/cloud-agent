"use client";

import {
  Archive,
  ArrowUp,
  Check,
  ChevronDown,
  Clock3,
  ExternalLink,
  GitBranch,
  GripVertical,
  Image as ImageIcon,
  Keyboard,
  KeyRound,
  MoreHorizontal,
  MousePointer2,
  Paperclip,
  Pin,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Square,
  Trash2,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { AppFrame } from "@/components/app-frame";
import { StatusPill } from "@/components/status-pill";
import { mockSessions, mockViewer } from "./mock";

// Visual preview harness for screenshot-based UI verification. Renders the real
// AppFrame shell with mock data so the design system can be inspected without a
// live Clerk/Convex backend. Not shipped in production. Switch screens with the
// `?screen=home|chat|history|interactions|settings|onboarding|question|approval|loading|empty|error|running-tool|failed-tool|disabled`
// query string.
export default function DevUiPage() {
  return (
    <Suspense fallback={null}>
      <DevUiPreview />
    </Suspense>
  );
}

function DevUiPreview() {
  const params = useSearchParams();
  const screen = params.get("screen") ?? "home";
  const theme = params.get("theme") ?? "light";
  const rail = params.get("rail") ?? "right";
  const picker = params.get("picker");
  const variant = params.get("variant") === "website" ? "website" : "desktop";

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.visualPreview = "true";
    return () => {
      delete document.documentElement.dataset.visualPreview;
    };
  }, [theme]);

  // Dev-only visual harness; never expose in production builds.
  if (process.env.NODE_ENV === "production") return null;

  return (
    <AppFrame
      viewer={mockViewer}
      sessions={variant === "website" ? [] : mockSessions}
      selectedSessionId={screen === "home" || screen === "settings" || variant === "website" ? undefined : "s1"}
      sidebarPosition={variant === "website" ? "left" : rail === "right" ? "right" : "left"}
      sidebarVariant={variant}
      forcedTheme={theme === "dark" ? "dark" : "light"}
    >
      {screen === "home" ? (
        <HomeScreen
          picker={picker === "repo" || picker === "model" ? picker : undefined}
          variant={variant}
        />
      ) : screen === "question" ? (
        <QuestionScreen />
      ) : screen === "approval" ? (
        <ApprovalScreen />
      ) : screen === "history" ? (
        <HistoryScreen />
      ) : screen === "interactions" ? (
        <InteractionsScreen />
      ) : screen === "settings" ? (
        <SettingsPreview />
      ) : screen === "onboarding" ? (
        <OnboardingScreen />
      ) : isStateScreen(screen) ? (
        <StateScreen screen={screen} />
      ) : (
        <ChatScreen />
      )}
    </AppFrame>
  );
}

function isStateScreen(screen: string): screen is StateScreenKind {
  return [
    "loading",
    "empty",
    "error",
    "running-tool",
    "failed-tool",
    "disabled",
  ].includes(screen);
}

type StateScreenKind =
  | "loading"
  | "empty"
  | "error"
  | "running-tool"
  | "failed-tool"
  | "disabled";

function HomeScreen({
  picker,
  variant,
}: {
  picker?: "repo" | "model";
  variant: "desktop" | "website";
}) {
  return (
    <div style={{ maxWidth: 1180, display: "grid", gap: 18 }}>
      <section className="agent-home">
        {variant === "website" ? (
          <div className="composer-notice">Cloud Agents requires a Pro Account -&gt;</div>
        ) : null}
        {variant === "desktop" ? (
          <div className="desktop-home-controls">
            <DevComposerMenu
              icon={<GitBranch size={14} />}
              label="Repository"
              display="cloud-agent"
              open={picker === "repo"}
              options={[
                ["cloud-agent", "nairsh/cloud-agent", true],
                ["vibecademy-ui", "matthewmiller2925/vibecademy-ui", false],
                ["bridgebench-ui", "bridge-mind/bridgebench-ui", false],
              ]}
            />
            <button className="desktop-home-pill" type="button">main</button>
            <button className="desktop-home-pill" type="button">Local</button>
            <DevComposerMenu
              label="Model"
              display="Composer 2.5 Fast"
              open={picker === "model"}
              options={[
                ["Composer 2.5 Fast", "default", true],
                ["Composer 2.5 Thinking", "deeper reasoning", false],
                ["Auto", "let Cursor choose", false],
              ]}
            />
          </div>
        ) : null}
        <form className="composer-shell" onSubmit={(e) => e.preventDefault()}>
          <textarea
            className="composer-input"
            placeholder={
              variant === "website"
                ? "Ask Cursor to build, fix bugs, explore"
                : "Ask the cloud agent to build, fix, or explore..."
            }
            defaultValue=""
          />
          <div className="composer-toolbar">
            <div className="composer-selects">
              {variant === "website" ? (
                <>
                  <DevComposerMenu
                    label="Model"
                    display="GPT-5.5 High"
                    open={picker === "model"}
                    options={[
                      ["GPT-5.5 High", "recommended", true],
                      ["GPT-5.5", "balanced", false],
                      ["Auto", "let Cursor choose", false],
                    ]}
                  />
                  <DevComposerMenu
                    label="MCPs"
                    display="MCPs"
                    open={picker === "repo"}
                    options={[
                      ["MCPs", "no servers selected", true],
                      ["GitHub", "connected", false],
                      ["Linear", "available", false],
                    ]}
                  />
                </>
              ) : (
                null
              )}
            </div>
            <div className="composer-actions">
              <button className="icon-button" type="button" aria-label="Attach">
                {variant === "website" ? <ImageIcon size={16} /> : <Paperclip size={16} />}
              </button>
              <button className="primary-button submit-button" type="button" aria-label="Start">
                <ArrowUp size={16} />
              </button>
            </div>
          </div>
        </form>
        {variant === "desktop" ? (
          <div className="composer-quick-actions">
            <button className="pill-button" type="button">
              <GitBranch size={14} />
              Connect GitHub
            </button>
            <button className="pill-button" type="button">
              <Plus size={14} />
              Plan New Idea
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function SettingsPreview() {
  return (
    <div className="settings-page">
      <section className="settings-section">
        <div className="settings-section-header">
          <div>
            <h2>Customize</h2>
            <p>Set the defaults Cursor uses when a new agent starts.</p>
          </div>
          <span className="settings-badge" data-state="ok">Synced</span>
        </div>
        <div className="settings-list">
          <div className="settings-row">
            <strong>Default mode</strong>
            <span>Agent</span>
          </div>
          <div className="settings-row">
            <strong>Default model</strong>
            <span>Composer 2.5 Fast</span>
          </div>
          <div className="settings-row">
            <strong>Thinking budget</strong>
            <span>High</span>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-header">
          <div>
            <h2>MCPs</h2>
            <p>Choose which connected tools are available to cloud agents.</p>
          </div>
          <span className="settings-badge">2 enabled</span>
        </div>
        <div className="settings-list">
          <div className="settings-row">
            <strong>GitHub</strong>
            <span>Enabled</span>
          </div>
          <div className="settings-row">
            <strong>Linear</strong>
            <span>Enabled</span>
          </div>
          <div className="settings-row">
            <strong>Browser</strong>
            <span>Ask first</span>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-header">
          <div>
            <h2>Agent rules</h2>
            <p>Project instructions and approvals used during remote runs.</p>
          </div>
          <span className="settings-badge" data-state="warn">Review</span>
        </div>
        <div className="settings-list">
          <div className="settings-row">
            <strong>Terminal commands</strong>
            <span>Auto-run safe reads</span>
          </div>
          <div className="settings-row">
            <strong>File edits</strong>
            <span>Require review</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function ApprovalScreen() {
  const [response, setResponse] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function choose(value: string) {
    setResponse(value);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <div style={{ maxWidth: 1180, display: "grid", gap: 18 }}>
      <section className="timeline-list">
        <article className="timeline-event" data-role="assistant">
          <div className="timeline-body">
            I need permission before running a command that changes the repository.
          </div>
        </article>
        <div className="approval-inline">
          <div className="approval-inline-head">
            <span>Approval requested</span>
            <small>Waiting for your decision</small>
          </div>
          <p className="approval-inline-prompt">Allow the agent to run this command?</p>
          <div className="approval-inline-command">
            <div>
              <strong>Command</strong>
              <span>This may update generated files in the working tree.</span>
            </div>
            <pre>npm run build</pre>
          </div>
          <div className="approval-inline-actions">
            <button
              className="approval-inline-button"
              data-tone="deny"
              type="button"
              onClick={() => choose("Do not run this command.")}
            >
              <Square size={13} />
              Deny
            </button>
            <button
              className="approval-inline-button"
              data-tone="approve"
              type="button"
              onClick={() => choose("Approved. Run npm run build.")}
            >
              <ShieldCheck size={14} />
              Allow
            </button>
          </div>
        </div>
      </section>

      <form className="followup-composer" onSubmit={(e) => e.preventDefault()}>
        <Plus size={18} color="var(--muted)" />
        <input
          ref={inputRef}
          aria-label="Approval response"
          placeholder="Reply to approval request"
          value={response}
          onChange={(event) => setResponse(event.target.value)}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            color: "var(--text)",
            minWidth: 0,
          }}
        />
        <button className="primary-button submit-button" type="button" aria-label="Send">
          <ArrowUp size={16} />
        </button>
      </form>
    </div>
  );
}

function OnboardingScreen() {
  return (
    <div className="onboarding-page">
      <section className="onboarding-panel">
        <div className="onboarding-head">
          <h2>Set up Agents</h2>
          <p>Connect a repository and model provider before starting the first cloud agent.</p>
        </div>
        <div className="onboarding-steps">
          <div className="onboarding-step" data-state="done">
            <span className="step-icon">
              <Check size={14} />
            </span>
            <div>
              <strong>Sign in</strong>
              <span>Nairsh is signed in and ready.</span>
            </div>
          </div>
          <div className="onboarding-step" data-state="active">
            <span className="step-icon">
              <GitBranch size={14} />
            </span>
            <div>
              <strong>Connect GitHub</strong>
              <span>Install the GitHub App to choose repositories.</span>
            </div>
            <button className="ghost-button" type="button">
              <GitBranch size={14} />
              Connect
            </button>
          </div>
          <div className="onboarding-step">
            <span className="step-icon">
              <KeyRound size={14} />
            </span>
            <div>
              <strong>Add a model provider</strong>
              <span>Use Cursor, Copilot, Codex, or Claude credentials.</span>
            </div>
            <button className="ghost-button" type="button">
              <KeyRound size={14} />
              Add provider
            </button>
          </div>
        </div>
        <div className="onboarding-foot">
          <button className="skip-button" type="button">Skip for now</button>
          <button className="primary-button" type="button">
            <ArrowUp size={14} />
            Start first agent
          </button>
        </div>
      </section>
    </div>
  );
}

type HistoryFilter = "all" | "active" | "unread" | "archived";

const historySessions = [
  {
    id: "s1",
    title: "Redesign the chat timeline to match reference",
    repo: "nairsh/cloud-agent",
    branch: "codex/cursor-agents-ui",
    status: "running",
    updated: "Now",
    pinned: true,
    unread: true,
    archived: false,
  },
  {
    id: "s2",
    title: "Cancellation verification: run a long operation",
    repo: "nairsh/cloud-agent",
    branch: "main",
    status: "cancelled",
    updated: "11m ago",
    pinned: false,
    unread: false,
    archived: false,
  },
  {
    id: "s3",
    title: "Using the attached package.json context, reply",
    repo: "nairsh/cloud-agent",
    branch: "main",
    status: "completed",
    updated: "37m ago",
    pinned: false,
    unread: true,
    archived: false,
  },
  {
    id: "s5",
    title: "Catalog page redesign",
    repo: "matthewmiller2925/vibecademy-ui",
    branch: "cursor/catalog-page",
    status: "queued",
    updated: "1h ago",
    pinned: false,
    unread: false,
    archived: false,
  },
  {
    id: "s7",
    title: "Build and deployment pipeline",
    repo: "bridge-mind/bridgebench-ui",
    branch: "main",
    status: "failed",
    updated: "Yesterday",
    pinned: false,
    unread: false,
    archived: true,
  },
];

function HistoryScreen() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = historySessions.filter((session) => {
    const matchesQuery = normalizedQuery
      ? `${session.title} ${session.repo} ${session.branch} ${session.status}`
          .toLowerCase()
          .includes(normalizedQuery)
      : true;
    const matchesFilter =
      filter === "all" ||
      (filter === "active" && ["running", "queued"].includes(session.status)) ||
      (filter === "unread" && session.unread) ||
      (filter === "archived" && session.archived);
    return matchesQuery && matchesFilter;
  });

  return (
    <div className="history-page">
      <section className="history-toolbar">
        <div>
          <h2>History</h2>
          <p>Review, reopen, and organize cloud agent sessions.</p>
        </div>
        <div className="history-toolbar-actions">
          <button className="ghost-button" type="button">
            <Archive size={14} />
            Archived
          </button>
          <button className="primary-button" type="button">
            <Plus size={14} />
            New Agent
          </button>
        </div>
      </section>

      <section className="history-controls">
        <label className="history-search">
          <Search size={14} />
          <input
            aria-label="Search history"
            placeholder="Search history..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="history-filter" aria-label="History filter">
          {(["all", "active", "unread", "archived"] as HistoryFilter[]).map((value) => (
            <button
              type="button"
              key={value}
              data-active={filter === value ? "true" : undefined}
              onClick={() => setFilter(value)}
            >
              {value[0].toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>
      </section>

      <section className="history-list" aria-label="Agent history">
        {filtered.length === 0 ? (
          <div className="history-empty">
            <Clock3 size={16} />
            <strong>No matching agents</strong>
            <span>Try another search or filter.</span>
          </div>
        ) : (
          filtered.map((session) => (
            <article
              className="history-row"
              data-unread={session.unread ? "true" : undefined}
              key={session.id}
            >
              <span className="session-dot" data-state={session.status} />
              <div className="history-main">
                <div className="history-title-row">
                  <strong>{session.title}</strong>
                  <span className="history-time">{session.updated}</span>
                </div>
                <div className="history-meta">
                  <span>{session.repo}</span>
                  <span>{session.branch}</span>
                  <span>{session.status}</span>
                </div>
              </div>
              <div className="history-badges">
                {session.pinned ? (
                  <span className="history-badge">
                    <Pin size={11} />
                    Pinned
                  </span>
                ) : null}
                {session.unread ? <span className="history-badge">Unread</span> : null}
                {session.archived ? <span className="history-badge">Archived</span> : null}
              </div>
              <div className="history-actions">
                <button className="icon-button" type="button" aria-label="Reopen agent">
                  <ExternalLink size={14} />
                </button>
                <div className="history-menu-anchor">
                  <button
                    className="icon-button"
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={openMenuId === session.id ? "true" : "false"}
                    aria-label={`Manage ${session.title}`}
                    onClick={() => setOpenMenuId((current) => current === session.id ? null : session.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") setOpenMenuId(null);
                    }}
                  >
                    <MoreHorizontal size={14} />
                  </button>
                  {openMenuId === session.id ? (
                    <div className="history-row-menu" role="menu">
                      <button type="button" role="menuitem">
                        <Pin size={13} />
                        {session.pinned ? "Unpin" : "Pin"}
                      </button>
                      <button type="button" role="menuitem">
                        <RotateCcw size={13} />
                        Fork Chat
                      </button>
                      <button type="button" role="menuitem">
                        <Clock3 size={13} />
                        {session.unread ? "Mark as Read" : "Mark as Unread"}
                      </button>
                      <button type="button" role="menuitem">
                        <Archive size={13} />
                        {session.archived ? "Unarchive" : "Archive"}
                      </button>
                      <button type="button" role="menuitem" data-danger="true">
                        <Trash2 size={13} />
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}

function InteractionsScreen() {
  const [split, setSplit] = useState(46);
  const [dragging, setDragging] = useState(false);
  const [activeAction, setActiveAction] = useState("Review changes");
  const dragAreaRef = useRef<HTMLDivElement>(null);
  const clampedSplit = Math.min(70, Math.max(30, split));

  function updateSplit(clientX: number) {
    const rect = dragAreaRef.current?.getBoundingClientRect();
    if (!rect) return;
    const next = ((clientX - rect.left) / rect.width) * 100;
    setSplit(Math.min(70, Math.max(30, Math.round(next))));
  }

  return (
    <div className="interaction-page">
      <section className="interaction-toolbar">
        <div>
          <h2>Interactions</h2>
          <p>Keyboard, hover, drag, focus, and scroll states for the Agents shell.</p>
        </div>
        <div className="interaction-shortcuts" aria-label="Shortcuts">
          <span><Keyboard size={12} />⌘K</span>
          <span>/</span>
          <span>⇧F10</span>
        </div>
      </section>

      <section
        className="interaction-drag-area"
        ref={dragAreaRef}
        data-dragging={dragging ? "true" : undefined}
        onPointerMove={(event) => {
          if (dragging) updateSplit(event.clientX);
        }}
        onPointerUp={() => setDragging(false)}
        onPointerLeave={() => setDragging(false)}
        onMouseMove={(event) => {
          if (dragging) updateSplit(event.clientX);
        }}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
      >
        <div className="interaction-pane" style={{ width: `${clampedSplit}%` }}>
          <div className="interaction-pane-head">
            <strong>Timeline</strong>
            <span>{clampedSplit}%</span>
          </div>
          <div className="interaction-scroll scrl" tabIndex={0} aria-label="Scrollable timeline">
            {[
              "Read package.json",
              "Searched app routes",
              "Thought briefly",
              "Edited dashboard client",
              "Ran npm run lint",
              "Ran npm test",
              "Captured dark viewport",
              "Captured mobile viewport",
              "Updated visual audit report",
              "Waiting for follow-up",
              "Opened context menu",
              "Checked keyboard focus",
              "Dragged timeline splitter",
              "Scrolled history list",
              "Compared dark theme",
              "Compared mobile theme",
              "Queued next audit",
              "Prepared fix list",
            ].map((item, index) => (
              <div className="interaction-step" key={item}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{item}</strong>
              </div>
            ))}
          </div>
        </div>

        <button
          className="interaction-splitter"
          type="button"
          role="separator"
          aria-label="Resize timeline"
          aria-valuemin={30}
          aria-valuemax={70}
          aria-valuenow={clampedSplit}
          tabIndex={0}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            setDragging(true);
            updateSplit(event.clientX);
          }}
          onPointerUp={() => setDragging(false)}
          onMouseDown={(event) => {
            setDragging(true);
            updateSplit(event.clientX);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              setSplit((current) => Math.max(30, current - 4));
            }
            if (event.key === "ArrowRight") {
              event.preventDefault();
              setSplit((current) => Math.min(70, current + 4));
            }
          }}
        >
          <GripVertical size={15} />
        </button>

        <div className="interaction-pane" style={{ width: `${100 - clampedSplit}%` }}>
          <div className="interaction-pane-head">
            <strong>Actions</strong>
            <span>{activeAction}</span>
          </div>
          <div className="interaction-action-list">
            {["Review changes", "Open in editor", "Fork chat", "Archive prior chats"].map((action) => (
              <button
                className="interaction-action"
                type="button"
                key={action}
                data-active={activeAction === action ? "true" : undefined}
                onClick={() => setActiveAction(action)}
                onFocus={() => setActiveAction(action)}
              >
                <MousePointer2 size={14} />
                <span>{action}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function DevComposerMenu({
  icon,
  label,
  display,
  open,
  options,
}: {
  icon?: ReactNode;
  label: string;
  display: string;
  open?: boolean;
  options: Array<[string, string, boolean]>;
}) {
  const selectedIndex = Math.max(options.findIndex(([, , selected]) => selected), 0);
  const [menuOpen, setMenuOpen] = useState(Boolean(open));
  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  function moveActive(delta: number) {
    setActiveIndex((current) => (current + delta + options.length) % options.length);
  }

  return (
    <div
      className="composer-menu"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false);
      }}
    >
      <button
        className="composer-menu-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={menuOpen ? "true" : "false"}
        aria-label={label}
        onClick={() => setMenuOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            setMenuOpen(false);
            return;
          }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!menuOpen) {
              setActiveIndex(selectedIndex);
              setMenuOpen(true);
              return;
            }
            moveActive(event.key === "ArrowDown" ? 1 : -1);
            return;
          }
          if ((event.key === "Enter" || event.key === " ") && menuOpen) {
            event.preventDefault();
            setMenuOpen(false);
          }
        }}
      >
        {icon ? <span className="composer-menu-icon">{icon}</span> : null}
        <span className="composer-menu-label">{display}</span>
        <ChevronDown size={13} />
      </button>
      {menuOpen ? (
        <div className="composer-popover" role="listbox" aria-label={label}>
          {options.map(([optionLabel, detail, selected], index) => (
            <button
              className="composer-option"
              type="button"
              role="option"
              aria-selected={selected}
              data-active={index === activeIndex ? "true" : undefined}
              key={optionLabel}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => setMenuOpen(false)}
            >
              <span className="composer-option-copy">
                <span>{optionLabel}</span>
                <small>{detail}</small>
              </span>
              {selected ? <Check size={14} /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ChatScreen() {
  return (
    <div style={{ maxWidth: 1180, display: "grid", gap: 18 }}>
      <section className="session-header" data-compact="true">
        <div className="session-title-row">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2>Redesign the chat timeline to match reference</h2>
            <p>nairsh/cloud-agent · github-copilot/gpt-5-mini</p>
          </div>
          <StatusPill status="running" />
        </div>
      </section>

      <section className="timeline-list">
        <article className="timeline-event" data-role="user">
          <div className="timeline-chrome">
            <span>You</span>
            <span>10:18</span>
          </div>
          <div className="timeline-body">
            I want you to do an in-depth review of the SVG logo for Vibe Academy here, and update it.
            I am not a fan of this logo.
          </div>
        </article>

        <article className="timeline-event" data-role="assistant">
          <div className="timeline-chrome">
            <span>Agent</span>
            <span>10:18</span>
          </div>
          <div className="timeline-body">
            I&apos;ll assess repo cleanliness across structure, git state, lint/tests, and code
            organization.
          </div>
        </article>

        <article className="timeline-event" data-role="tool">
          <div className="timeline-chrome">
            <span>Tool</span>
            <span>10:19</span>
          </div>
          <div className="tool-line">
            <span>
              <span className="verb">Explored</span> <span className="tool-name">package.json, 1 search</span>
            </span>
          </div>
        </article>

        <article className="timeline-event" data-role="system">
          <div className="timeline-chrome">
            <span>System</span>
            <span>10:19</span>
          </div>
          <div className="timeline-body">Thought briefly</div>
        </article>

        <article className="timeline-event" data-role="tool">
          <div className="timeline-chrome">
            <span>Command</span>
            <span>10:20</span>
          </div>
          <details className="cmd-card">
            <summary className="cmd-card-header">
              <span className="glyph" aria-hidden="true">
                {">_"}
              </span>
              <span className="cmd-title">git log --oneline -5</span>
              <span className="cmd-state">done</span>
            </summary>
            <pre className="cmd-card-output">{`ef8110c Fix worker tool event serialization
09219ae Implement Pi provider login capture
682a1e0 Add app icon for browser smoke tests
494d447 Configure Convex dev deployment support
2e2a5f2 Document setup and harden empty states`}</pre>
          </details>
        </article>

        <article className="timeline-event" data-role="tool">
          <div className="timeline-chrome">
            <span>Command</span>
            <span>10:21</span>
          </div>
          <details className="cmd-card" open>
            <summary className="cmd-card-header">
              <span className="glyph" aria-hidden="true">
                {">_"}
              </span>
              <span className="cmd-title">npm run lint</span>
              <span className="cmd-state">done</span>
            </summary>
            <pre className="cmd-card-output">{`> cloud-agent@1.0.0 lint
> eslint .

(no warnings or errors)`}</pre>
          </details>
        </article>

        <article className="timeline-event" data-role="tool">
          <div className="timeline-chrome">
            <span>Tool</span>
            <span>10:21</span>
          </div>
          <div className="tool-line">
            <span>
              <span className="verb">Grepped</span>{" "}
              <span className="tool-name">TODO|FIXME|HACK|XXX in cloud-agent</span>
            </span>
          </div>
        </article>

        <article className="timeline-event" data-role="tool">
          <div className="timeline-chrome">
            <span>Tool</span>
            <span>10:22</span>
          </div>
          <div className="tool-line">
            <span>
              <span className="verb">Read</span> <span className="tool-name">README.md L1-40</span>
            </span>
          </div>
        </article>

        <article className="timeline-event" data-role="assistant">
          <div className="timeline-chrome">
            <span>Agent</span>
            <span>10:23</span>
          </div>
          <div className="timeline-body">
            This repo is in good shape: <code>eslint .</code> passes clean, the Vitest suite is green
            (25 tests), and a grep for <code>TODO|FIXME|HACK|XXX</code> turns up nothing in app code.
            Structure is conventional for a Next.js + Convex project.
          </div>
        </article>
      </section>

      <form className="followup-composer" onSubmit={(e) => e.preventDefault()}>
        <Plus size={18} color="var(--muted)" />
        <input
          aria-label="Send follow-up"
          placeholder="Send follow-up"
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            color: "var(--text)",
            minWidth: 0,
          }}
        />
        <button className="primary-button submit-button" type="button" aria-label="Send">
          <ArrowUp size={16} />
        </button>
      </form>
    </div>
  );
}

function StateScreen({ screen }: { screen: StateScreenKind }) {
  const status = screen === "error" || screen === "failed-tool" ? "failed" : "running";
  return (
    <div style={{ maxWidth: 1180, display: "grid", gap: 18 }}>
      <section className="session-header" data-compact="true">
        <div className="session-title-row">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2>{screen === "empty" ? "Waiting for first event" : "Repo cleanliness assessment"}</h2>
            <p>nairsh/cloud-agent · github-copilot/gpt-5-mini</p>
          </div>
          <StatusPill status={status} />
        </div>
      </section>

      <section className="timeline-list">
        {screen === "empty" ? (
          <div className="empty-panel empty-state">
            <h2>Waiting for the first event</h2>
            <p>The worker has not streamed output for this session yet.</p>
          </div>
        ) : screen === "loading" ? (
          <div className="empty-panel" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="spinner-dot" aria-hidden="true" />
            <p>Loading session</p>
          </div>
        ) : screen === "error" ? (
          <div className="empty-panel">
            <h2>Agent failed</h2>
            <p>The worker exited before it could finish this task.</p>
            <p className="form-error">Container exited with code 1.</p>
          </div>
        ) : screen === "running-tool" ? (
          <ExecutionProgress />
        ) : (
          <>
            <article className="timeline-event" data-role="user">
              <div className="timeline-body">How clean is this repo?</div>
            </article>
            <article className="timeline-event" data-role="tool">
              <details
                className="cmd-card"
                data-state={screen === "failed-tool" ? "failed" : "running"}
                data-error={screen === "failed-tool" ? "true" : undefined}
                open
              >
                <summary className="cmd-card-header">
                  <span className="glyph" aria-hidden="true">
                    {">_"}
                  </span>
                  <span className="cmd-title">
                    {screen === "failed-tool" ? "npm test" : "npm run build"}
                  </span>
                  <span className="cmd-state">
                    {screen === "failed-tool" ? "failed" : "running"}
                  </span>
                </summary>
                <pre
                  className="cmd-card-output"
                  data-error={screen === "failed-tool" ? "true" : undefined}
                >
                  {screen === "failed-tool"
                    ? "Error: Cannot find module '@/missing-helper'"
                    : "> cloud-agent@1.0.0 build\n> next build\n\nCompiling..."}
                </pre>
              </details>
            </article>
          </>
        )}
      </section>

      <form className="followup-composer" onSubmit={(e) => e.preventDefault()}>
        <Plus size={18} color="var(--muted)" />
        <input
          aria-label="Send follow-up"
          placeholder={screen === "disabled" ? "Wait for this run to finish" : "Send follow-up"}
          disabled={screen === "disabled" || screen === "loading"}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            color: "var(--text)",
            minWidth: 0,
          }}
        />
        <button
          className="primary-button submit-button"
          type="button"
          disabled={screen === "disabled" || screen === "loading"}
          aria-label="Send"
        >
          <ArrowUp size={16} />
        </button>
      </form>
    </div>
  );
}

const executionSteps = [
  { title: "Preparing workspace", detail: "Checking repository state" },
  { title: "Reading project files", detail: "Scanned package.json and app routes" },
  { title: "Planning changes", detail: "Selected a narrow UI patch" },
  { title: "Editing files", detail: "Updating the execution timeline surface" },
  { title: "Running checks", detail: "npm run lint" },
  { title: "Streaming result", detail: "Writing the summary back to the timeline" },
];

const commandOutputLines = [
  "> cloud-agent@1.0.0 build",
  "> next build",
  "",
  "Creating an optimized production build ...",
  "Compiled successfully",
  "Running TypeScript ...",
  "Collecting page data ...",
  "Generating static pages ...",
  "Finalizing page optimization ...",
];

function ExecutionProgress() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % executionSteps.length);
    }, 1400);
    return () => window.clearInterval(id);
  }, []);

  const visibleLines = commandOutputLines.slice(0, Math.min(commandOutputLines.length, index + 4));

  return (
    <>
      <article className="timeline-event" data-role="user">
        <div className="timeline-body">Run the checks and tell me what changed.</div>
      </article>
      <article className="timeline-event" data-role="system">
        <div
          className="execution-progress"
          aria-live="polite"
          data-step={index + 1}
          data-total={executionSteps.length}
        >
          <div className="execution-progress-head">
            <span className="spinner-dot" aria-hidden="true" />
            <div>
              <strong>{executionSteps[index].title}</strong>
              <span>{executionSteps[index].detail}</span>
            </div>
            <small>{index + 1}/{executionSteps.length}</small>
          </div>
          <div className="execution-step-list">
            {executionSteps.map((step, stepIndex) => (
              <div
                className="execution-step"
                data-state={
                  stepIndex < index ? "done" : stepIndex === index ? "active" : "pending"
                }
                key={step.title}
              >
                <span className="execution-step-dot" />
                <div>
                  <strong>{step.title}</strong>
                  <span>{step.detail}</span>
                </div>
              </div>
            ))}
          </div>
          <details className="cmd-card" data-state="running" open>
            <summary className="cmd-card-header">
              <span className="glyph" aria-hidden="true">{">_"}</span>
              <span className="cmd-title">npm run build</span>
              <span className="cmd-state">running</span>
            </summary>
            <div className="cmd-progress-strip">
              <span className="spinner-dot" aria-hidden="true" />
              <span>Streaming command output</span>
            </div>
            <pre className="cmd-card-output" data-streaming="true">
              {visibleLines.join("\n")}
            </pre>
          </details>
        </div>
      </article>
    </>
  );
}

function QuestionScreen() {
  const [response, setResponse] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const options = [
    ["A", "Clean geometric V — bold, simple, modern (think Vercel/Stripe level simplicity)"],
    ["B", "Gradient V with brand blue/purple — uses the accent colors with a subtle glow"],
    ["C", "Abstract code bracket mark — something like </> or { } styled as a V shape"],
    ["D", "VC monogram — interlock V and C into a single compact mark"],
    ["E", "Surprise me — just make it look great and on-brand"],
  ];
  return (
    <div style={{ maxWidth: 1180, display: "grid", gap: 18 }}>
      <section className="timeline-list">
        <article className="timeline-event" data-role="assistant">
          <div className="timeline-body">
            Before I redesign, I want to confirm direction with you:
          </div>
        </article>
        <div className="question-card">
          <div className="question-card-head">
            <span className="q-title">Waiting for input</span>
          </div>
          <p className="question-prompt">What style direction do you want for the new logo mark?</p>
          <div className="question-options">
            {options.map(([key, label]) => (
              <button
                className="question-option"
                type="button"
                key={key}
                onClick={() => {
                  setResponse(label);
                  requestAnimationFrame(() => inputRef.current?.focus());
                }}
              >
                <span className="opt-key">{key}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div className="question-card-foot">
            <span className="decision-hint">Choose an option or reply below.</span>
          </div>
        </div>
      </section>

      <form className="followup-composer" onSubmit={(e) => e.preventDefault()}>
        <Plus size={18} color="var(--muted)" />
        <input
          ref={inputRef}
          aria-label="Add details"
          placeholder="Send follow-up"
          value={response}
          onChange={(event) => setResponse(event.target.value)}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            color: "var(--text)",
            minWidth: 0,
          }}
        />
        <button className="primary-button submit-button" type="button" aria-label="Send">
          <ArrowUp size={16} />
        </button>
      </form>
    </div>
  );
}
