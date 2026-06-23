"use client";

import {
  ArrowUp,
  ExternalLink,
  GitBranch,
  Loader2,
  Plus,
  Square,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";

import { AppFrame } from "@/components/app-frame";
import { useRuntimeConfig } from "@/components/providers";
import { SetupPanel } from "@/components/setup-panel";
import { StatusPill } from "@/components/status-pill";
import { convexApi } from "@/lib/convex-api";
import type {
  AgentSessionSummary,
  ModelOption,
  RepositoryOption,
  SessionEvent,
  TimelineResult,
  Viewer,
} from "@/lib/types";

export function DashboardClient({ selectedSessionId }: { selectedSessionId?: string }) {
  const config = useRuntimeConfig();
  const setupIssues = [
    !config.clerkConfigured && "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not configured.",
    !config.convexConfigured && "NEXT_PUBLIC_CONVEX_URL is not configured.",
  ].filter(Boolean) as string[];

  if (setupIssues.length > 0) {
    return (
      <AppFrame viewer={null} sessions={[]} selectedSessionId={selectedSessionId}>
        <div style={{ maxWidth: 780 }}>
          <SetupPanel issues={setupIssues} />
        </div>
      </AppFrame>
    );
  }

  return <DashboardData selectedSessionId={selectedSessionId} />;
}

function DashboardData({ selectedSessionId }: { selectedSessionId?: string }) {
  const viewer = useQuery(convexApi.viewer.get);
  const sessions = useQuery(convexApi.sessions.list);
  const repositories = useQuery(convexApi.github.listRepositories);
  const models = useQuery(convexApi.providers.listModels);
  const timeline = useQuery(
    convexApi.sessions.getTimeline,
    selectedSessionId ? { sessionId: selectedSessionId } : "skip",
  );

  const loadedSessions = sessions ?? [];

  return (
    <AppFrame
      viewer={viewer ?? null}
      sessions={loadedSessions}
      selectedSessionId={selectedSessionId}
    >
      <div style={{ maxWidth: 1180, display: "grid", gap: 18 }}>
        {viewer === undefined ? (
          <LoadingPanel label="Loading account" />
        ) : viewer === null ? (
          <div className="empty-panel">
            <h2>Account is not synced yet</h2>
            <p>
              Clerk authentication is active, but the Convex user record has not
              been created. Configure the Clerk webhook or sign out and back in
              after Convex is deployed.
            </p>
          </div>
        ) : selectedSessionId ? (
          <SessionDetail
            timeline={timeline}
            sessions={loadedSessions}
            selectedSessionId={selectedSessionId}
          />
        ) : (
          <NewSessionPanel
            viewer={viewer}
            repositories={repositories}
            models={models}
            sessions={loadedSessions}
          />
        )}
      </div>
    </AppFrame>
  );
}

function NewSessionPanel({
  viewer,
  repositories,
  models,
  sessions,
}: {
  viewer: NonNullable<Viewer>;
  repositories: RepositoryOption[] | undefined;
  models: ModelOption[] | undefined;
  sessions: AgentSessionSummary[];
}) {
  const createSession = useMutation(convexApi.sessions.create);
  const [repositoryId, setRepositoryId] = useState("");
  const [credentialId, setCredentialId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const selectedModel = models?.find((model) => model.credentialId === credentialId);

  const canSubmit = Boolean(repositoryId && selectedModel && prompt.trim() && !submitting);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedModel || !canSubmit) return;
    setSubmitting(true);
    try {
      await createSession({
        repositoryId,
        credentialId,
        provider: selectedModel.provider,
        model: selectedModel.model,
        prompt: prompt.trim(),
      });
      setPrompt("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <section className="empty-panel" style={{ display: "grid", gap: 16 }}>
        <div>
          <h2>Start a coding task</h2>
          <p>
            Select a GitHub App repository and a model from stored Pi provider
            credentials. No repositories or models are faked here.
          </p>
        </div>

        {!viewer.hasGithubInstallation ? <GitHubConnect /> : null}
        {repositories === undefined || models === undefined ? (
          <LoadingPanel label="Loading repositories and models" />
        ) : repositories.length === 0 ? (
          <div className="empty-panel">
            <h3>No repositories available</h3>
            <p>
              Install the GitHub App for at least one repository, then wait for
              the installation webhook to sync.
            </p>
          </div>
        ) : models.length === 0 ? (
          <div className="empty-panel">
            <h3>No provider models available</h3>
            <p>
              Connect a Pi provider in settings. Models appear only after a
              stored provider credential reports available models.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) minmax(220px, 320px)",
                gap: 12,
              }}
            >
              <div className="field">
                <label htmlFor="repository">Repository</label>
                <select
                  id="repository"
                  value={repositoryId}
                  onChange={(event) => setRepositoryId(event.target.value)}
                >
                  <option value="">Select repository</option>
                  {repositories.map((repo) => (
                    <option key={repo._id} value={repo._id}>
                      {repo.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="model">Model</label>
                <select
                  id="model"
                  value={credentialId}
                  onChange={(event) => setCredentialId(event.target.value)}
                >
                  <option value="">Select model</option>
                  {models.map((model) => (
                    <option key={`${model.credentialId}:${model.model}`} value={model.credentialId}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="prompt">Task</label>
              <textarea
                id="prompt"
                placeholder="Describe the coding task to run in an isolated container."
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="primary-button" disabled={!canSubmit} type="submit">
                {submitting ? <Loader2 size={16} /> : <ArrowUp size={16} />}
                Start task
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="empty-panel">
        <h2>Recent activity</h2>
        {sessions.length === 0 ? (
          <p>Completed and running tasks will appear here after the first session is created.</p>
        ) : (
          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            {sessions.slice(0, 6).map((session) => (
              <a
                key={session._id}
                href={`/app/sessions/${session._id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "10px 12px",
                }}
              >
                <span style={{ flex: 1, minWidth: 0 }}>
                  <strong>{session.title}</strong>
                  <span style={{ color: "var(--muted)", display: "block", fontSize: 13 }}>
                    {session.repository.fullName} · {session.model}
                  </span>
                </span>
                <StatusPill status={session.status} />
              </a>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function SessionDetail({
  timeline,
  sessions,
  selectedSessionId,
}: {
  timeline: TimelineResult | undefined;
  sessions: AgentSessionSummary[];
  selectedSessionId: string;
}) {
  const cancelSession = useMutation(convexApi.sessions.cancel);
  const sendFollowup = useMutation(convexApi.sessions.sendFollowup);
  const [prompt, setPrompt] = useState("");
  const sessionFromList = useMemo(
    () => sessions.find((session) => session._id === selectedSessionId),
    [sessions, selectedSessionId],
  );

  if (timeline === undefined) {
    return <LoadingPanel label="Loading session" />;
  }

  if (!timeline.session && !sessionFromList) {
    return (
      <div className="empty-panel">
        <h2>Session not found</h2>
        <p>This session either does not exist or is not accessible to the current user.</p>
      </div>
    );
  }

  const session = timeline.session ?? sessionFromList;
  if (!session) return null;
  const pullRequestUrl =
    "pullRequestUrl" in session && typeof session.pullRequestUrl === "string"
      ? session.pullRequestUrl
      : undefined;

  async function onFollowup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prompt.trim()) return;
    await sendFollowup({ sessionId: selectedSessionId, prompt: prompt.trim() });
    setPrompt("");
  }

  return (
    <>
      <section className="empty-panel" style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2>{session.title}</h2>
            <p>
              {session.repository.fullName} · {session.provider}/{session.model}
            </p>
          </div>
          <StatusPill status={session.status} />
          {session.status === "running" || session.status === "queued" ? (
            <button
              className="danger-button"
              type="button"
              onClick={() => cancelSession({ sessionId: selectedSessionId })}
            >
              <Square size={14} />
              Cancel
            </button>
          ) : null}
          {pullRequestUrl ? (
            <a className="ghost-button" href={pullRequestUrl} target="_blank">
              <ExternalLink size={15} />
              Pull request
            </a>
          ) : null}
        </div>
      </section>

      <section style={{ display: "grid", gap: 10 }}>
        {timeline.events.length === 0 ? (
          <div className="empty-panel">
            <h2>No events yet</h2>
            <p>The worker has not streamed output for this session.</p>
          </div>
        ) : (
          timeline.events.map((event) => <TimelineEvent key={event._id} event={event} />)
        )}
      </section>

      <form
        onSubmit={onFollowup}
        style={{
          position: "sticky",
          bottom: 0,
          display: "flex",
          alignItems: "center",
          gap: 12,
          border: "1px solid var(--input-border)",
          background: "var(--input)",
          borderRadius: 28,
          padding: "9px 10px 9px 16px",
          boxShadow: "var(--shadow)",
        }}
      >
        <Plus size={18} color="var(--muted)" />
        <input
          aria-label="Send follow-up"
          placeholder="Send follow-up"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            color: "var(--text)",
            minWidth: 0,
          }}
        />
        <button className="primary-button" type="submit" disabled={!prompt.trim()}>
          <ArrowUp size={16} />
        </button>
      </form>
    </>
  );
}

function TimelineEvent({ event }: { event: SessionEvent }) {
  return (
    <article
      style={{
        border: "1px solid var(--card-border)",
        borderRadius: 8,
        background: event.role === "user" ? "var(--card)" : "transparent",
        padding: "13px 15px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "var(--muted)",
          fontSize: 12,
          fontWeight: 700,
          marginBottom: 8,
          textTransform: "uppercase",
        }}
      >
        {event.role} · {event.type}
      </div>
      <div style={{ color: "var(--text)", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
        {event.text || JSON.stringify(event.payload, null, 2)}
      </div>
    </article>
  );
}

function GitHubConnect() {
  const { githubAppSlug } = useRuntimeConfig();
  const href = githubAppSlug
    ? `https://github.com/apps/${githubAppSlug}/installations/new`
    : "/app/settings";

  return (
    <a className="ghost-button" href={href}>
      <GitBranch size={16} />
      Connect GitHub App
    </a>
  );
}

function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="empty-panel" style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <Loader2 size={16} />
      <p>{label}</p>
    </div>
  );
}
