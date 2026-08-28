"use client";

import {
  Archive,
  Bot,
  BriefcaseBusiness,
  Bug,
  CopyPlus,
  ExternalLink,
  Folder,
  Home,
  ListFilter,
  MessageSquare,
  Moon,
  MoreHorizontal,
  PanelLeft,
  Pin,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Sun,
  TextCursorInput,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { RunningGrid } from "@/components/running-grid";
import { StatusPill } from "@/components/status-pill";
import { useRuntimeConfig } from "@/components/providers";
import type { AgentSessionSummary, Viewer } from "@/lib/types";

const THEME_KEY = "cloud-agent-theme";

// Theme is client-only state read from localStorage. useSyncExternalStore reads
// it without a hydration mismatch (server snapshot is always "light", the default)
// and without setState-in-effect. Default is light; dark is opt-in.
function subscribeTheme(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function getThemeSnapshot() {
  return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
}

function setStoredTheme(theme: "light" | "dark") {
  localStorage.setItem(THEME_KEY, theme);
  // The storage event only fires in other tabs; notify this tab too.
  window.dispatchEvent(new StorageEvent("storage", { key: THEME_KEY }));
}

export function AppFrame({
  viewer,
  sessions,
  selectedSessionId,
  sidebarPosition = "right",
  sidebarVariant = "desktop",
  forcedTheme,
  children,
}: {
  viewer: Viewer;
  sessions: AgentSessionSummary[];
  selectedSessionId?: string;
  sidebarPosition?: "left" | "right";
  sidebarVariant?: "desktop" | "website";
  forcedTheme?: "light" | "dark";
  children: ReactNode;
}) {
  const storedTheme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => "light");
  const theme = forcedTheme ?? storedTheme;
  const dark = theme === "dark";
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sessionMenu, setSessionMenu] = useState<{
    x: number;
    y: number;
    session: AgentSessionSummary;
  } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const autoCollapsedSidebarRef = useRef(false);
  const { clerkConfigured } = useRuntimeConfig();
  const viewerInitial = viewer?.name?.[0] ?? viewer?.email?.[0];
  const viewerLabel = viewer?.name ?? viewer?.email;
  const selectedSession = selectedSessionId
    ? sessions.find((session) => session._id === selectedSessionId)
    : undefined;
  const websiteSidebar = sidebarVariant === "website";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!sessionMenu) return;

    function closeMenu() {
      setSessionMenu(null);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeMenu();
    }

    window.addEventListener("click", closeMenu);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [sessionMenu]);

  useEffect(() => {
    function syncSidebarForViewport() {
      setSidebarOpen((open) => {
        if (window.innerWidth < 820) {
          autoCollapsedSidebarRef.current = true;
          return false;
        }

        if (autoCollapsedSidebarRef.current) {
          autoCollapsedSidebarRef.current = false;
          return true;
        }

        return open;
      });

      if (window.innerWidth < 820) {
        setSearchOpen(false);
      }
    }

    syncSidebarForViewport();
    window.addEventListener("resize", syncSidebarForViewport);
    return () => window.removeEventListener("resize", syncSidebarForViewport);
  }, []);

  function closeSearch() {
    setSearchQuery("");
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable);

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSidebarOpen(true);
        setSearchOpen(true);
        return;
      }

      if (event.key === "/" && !isTyping) {
        event.preventDefault();
        setSidebarOpen(true);
        setSearchOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredSessions = normalizedSearchQuery
    ? sessions.filter((session) => {
        const searchableText = [
          session.title,
          session.status,
          session.repository.owner,
          session.repository.name,
          `${session.repository.owner}/${session.repository.name}`,
          session.provider,
          session.model,
          `${session.provider}/${session.model}`,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedSearchQuery);
      })
    : sessions;

  function openSessionMenu(
    session: AgentSessionSummary,
    point: { x: number; y: number },
  ) {
    setSessionMenu({
      session,
      x: Math.min(point.x, window.innerWidth - 190),
      y: Math.min(point.y, window.innerHeight - 236),
    });
  }

  return (
    <div className="app-root">
      <div
        className="app-shell"
        data-sidebar-position={sidebarPosition}
        data-sidebar-variant={sidebarVariant}
        data-has-session-tab={selectedSession ? "true" : undefined}
      >
        <aside
          className="agent-sidebar"
          data-collapsed={sidebarOpen ? undefined : "true"}
        >
          <div className="sidebar-topbar">
            <button
              className="icon-button"
              type="button"
              aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              onClick={() => {
                autoCollapsedSidebarRef.current = false;
                setSidebarOpen((v) => !v);
                if (!sidebarOpen) setSearchOpen(false);
              }}
            >
              <PanelLeft size={16} />
            </button>
            {sidebarOpen ? (
              <button
                className="icon-button"
                type="button"
                aria-label="Focus search"
                onClick={() => {
                  setSearchOpen(true);
                  searchInputRef.current?.focus();
                }}
              >
                <Search size={16} />
              </button>
            ) : null}
          </div>

          {sidebarOpen ? (
            <div className="sidebar-content scrl">
              <div className="sidebar-search-panel">
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && closeSearch()}
                  placeholder="Search Agents..."
                  aria-label="Search agents"
                />
              </div>
              <nav className="sidebar-nav" aria-label="Agents">
                {websiteSidebar ? (
                  <>
                    <Link href="/app" className="sidebar-item" data-active="true">
                      <Plus size={15} />
                      <span>New Agent</span>
                    </Link>
                    <Link href="/app" className="sidebar-item" aria-disabled="true">
                      <BriefcaseBusiness size={15} />
                      <span>Automations</span>
                    </Link>
                    <Link href="/app" className="sidebar-item" aria-disabled="true">
                      <Bug size={15} />
                      <span>Bugbot</span>
                    </Link>
                    <Link href="/app" className="sidebar-item" aria-disabled="true">
                      <Home size={15} />
                      <span>Dashboard</span>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/app" className="sidebar-item" data-active={!selectedSessionId ? "true" : undefined}>
                      <Plus size={15} />
                      <span>New Agent</span>
                      <kbd>⌘N</kbd>
                    </Link>
                    <Link href="/app" className="sidebar-item" aria-disabled="true">
                      <BriefcaseBusiness size={15} />
                      <span>Automations</span>
                    </Link>
                    <Link href="/app/settings" className="sidebar-item">
                      <SlidersHorizontal size={15} />
                      <span>Customize</span>
                    </Link>
                  </>
                )}
              </nav>

              <div className="sidebar-history">
                {!websiteSidebar ? (
                  <div className="sidebar-section-head">
                    <span>Repositories</span>
                    <button type="button" aria-label="Customize sidebar">
                      <ListFilter size={12} />
                    </button>
                    <button type="button" aria-label="Open workspace">
                      <Folder size={12} />
                    </button>
                  </div>
                ) : null}
                {filteredSessions.length === 0 ? (
                  <div className="sidebar-empty">
                    {searchQuery ? "No Agents match." : "No Agents Yet"}
                  </div>
                ) : (
                  groupSessionsByRepository(filteredSessions).map((group) => (
                    <div className="sidebar-repo-block" key={group.fullName}>
                      <div className="sidebar-repo-row" title={group.fullName}>
                        <Folder size={13} />
                        <span>{group.name}</span>
                      </div>
                      {group.sessions.map((session) => {
                        const active = selectedSessionId === session._id;
                        const live =
                          session.status === "running" ||
                          session.status === "queued" ||
                          session.status === "cancel_requested";
                        return (
                          <Link
                            key={session._id}
                            href={`/app/sessions/${session._id}`}
                            className="sidebar-item sidebar-session"
                            data-active={active ? "true" : undefined}
                            title={`${session.title} · ${session.repository.fullName} · ${session.model}`}
                            onContextMenu={(event) => {
                              event.preventDefault();
                              openSessionMenu(session, { x: event.clientX, y: event.clientY });
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
                                event.preventDefault();
                                const rect = event.currentTarget.getBoundingClientRect();
                                openSessionMenu(session, {
                                  x: rect.left + 18,
                                  y: rect.top + rect.height,
                                });
                              }
                            }}
                          >
                            <span className="session-icon">
                              {live ? (
                                <RunningGrid />
                              ) : (
                                <span className="session-dot" data-state={session.status} />
                              )}
                            </span>
                            <span className="session-copy">
                              <span className="session-title">{session.title}</span>
                            </span>
                            <span className="session-time" suppressHydrationWarning>
                              {formatSessionAge(session.updatedAt)}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}

          {sidebarOpen ? (
            <footer className="sidebar-footer">
              {websiteSidebar ? (
                <>
                  <Link className="sidebar-settings-link" href="/app/settings">
                    <Bot size={13} />
                    Upgrade to Pro
                  </Link>
                  <div className="website-account-row">
                    <div className="viewer-avatar">
                      {viewerInitial ?? (clerkConfigured ? "…" : "A")}
                    </div>
                    <div className="viewer-copy">
                      <div className="viewer-name">
                        {viewerLabel ?? (clerkConfigured ? "Loading account" : "Account setup")}
                      </div>
                      <div className="viewer-plan">Free</div>
                    </div>
                    <button className="icon-button" type="button" aria-label="Account menu">
                      <MoreHorizontal size={15} />
                    </button>
                    <button className="icon-button" type="button" aria-label="Preferences">
                      <SlidersHorizontal size={15} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link className="sidebar-settings-link" href="/app/settings">
                    <Settings size={13} />
                    Settings
                  </Link>
                  <div className="viewer-row">
                    <div className="viewer-avatar">
                      {viewerInitial ?? (clerkConfigured ? "…" : "A")}
                    </div>
                    <div className="viewer-copy">
                      <div className="viewer-name">
                        {viewerLabel ?? (clerkConfigured ? "Loading account" : "Account setup")}
                      </div>
                      <div className="viewer-plan">{clerkConfigured ? "Signed in" : "Setup needed"}</div>
                    </div>
                    <button
                      className="icon-button"
                      type="button"
                      aria-label="Toggle theme"
                      onClick={() => setStoredTheme(dark ? "light" : "dark")}
                    >
                      {dark ? <Sun size={16} /> : <Moon size={16} />}
                    </button>
                  </div>
                </>
              )}
            </footer>
          ) : null}
        </aside>

        <div className="mobile-agent-bar">
          <details className="mobile-session-menu">
            <summary>Agents</summary>
            <div className="mobile-session-popover">
              <Link
                href="/app"
                className="mobile-session-link"
                data-active={!selectedSessionId ? "true" : undefined}
              >
                <Plus size={14} />
                <span>New Agent</span>
              </Link>
              <Link href="/app/settings" className="mobile-session-link">
                <SlidersHorizontal size={14} />
                <span>Customize</span>
              </Link>
              {filteredSessions.length === 0 ? (
                <span className="mobile-session-empty">No Agents Yet</span>
              ) : (
                filteredSessions.map((session) => (
                  <Link
                    key={session._id}
                    href={`/app/sessions/${session._id}`}
                    className="mobile-session-link"
                    data-active={selectedSessionId === session._id ? "true" : undefined}
                  >
                    <span className="session-dot" data-state={session.status} />
                    <span>{session.title}</span>
                  </Link>
                ))
              )}
            </div>
          </details>
          <Link href="/app/settings" className="mobile-settings-link" aria-label="Settings">
            <Settings size={15} />
          </Link>
        </div>

        <main
          className="app-main scrl"
        >
          {children}
        </main>
        {selectedSession ? (
          <aside className="session-tab-strip" aria-label="Open agent sessions">
            <Link
              className="session-tab"
              href={`/app/sessions/${selectedSession._id}`}
              title={selectedSession.title}
              data-active="true"
            >
              <MessageSquare size={13} />
              <span>{selectedSession.title}</span>
            </Link>
            <Link className="session-tab-close" href="/app" aria-label="Close session tab">
              <X size={13} />
            </Link>
          </aside>
        ) : null}
        {sessionMenu ? (
          <div
            className="session-context-menu"
            role="menu"
            aria-label={`Actions for ${sessionMenu.session.title}`}
            style={{ left: sessionMenu.x, top: sessionMenu.y }}
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" role="menuitem">
              <Pin size={13} />
              Pin
            </button>
            <button type="button" role="menuitem">
              <CopyPlus size={13} />
              Fork Chat
            </button>
            <Link
              role="menuitem"
              href={`/app/sessions/${sessionMenu.session._id}`}
              target="_blank"
            >
              <ExternalLink size={13} />
              Open in New Tab
            </Link>
            <button type="button" role="menuitem">
              <MessageSquare size={13} />
              Mark as Unread
            </button>
            <button type="button" role="menuitem">
              <TextCursorInput size={13} />
              Rename
            </button>
            <button type="button" role="menuitem">
              <Archive size={13} />
              Archive Prior Chats
            </button>
            <button type="button" role="menuitem" aria-disabled="true" disabled>
              <Trash2 size={13} />
              Delete
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

type SessionGroup = { fullName: string; name: string; sessions: AgentSessionSummary[] };

// Groups sessions under their repository, preserving the order repositories
// first appear in the (already sorted) session list.
function groupSessionsByRepository(sessions: AgentSessionSummary[]): SessionGroup[] {
  const groups: SessionGroup[] = [];
  const index = new Map<string, SessionGroup>();

  for (const session of sessions) {
    const fullName = session.repository.fullName;
    let group = index.get(fullName);
    if (!group) {
      group = { fullName, name: session.repository.name, sessions: [] };
      index.set(fullName, group);
      groups.push(group);
    }
    group.sessions.push(session);
  }

  return groups;
}

function formatSessionAge(timestamp: number) {
  const diff = Math.max(0, Date.now() - timestamp);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "now";
  if (diff < hour) return `${Math.floor(diff / minute)}m`;
  if (diff < day) return `${Math.floor(diff / hour)}h`;
  return `${Math.floor(diff / day)}d`;
}
