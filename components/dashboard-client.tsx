"use client";

import {
  ArrowUp,
  Check,
  ChevronDown,
  ExternalLink,
  FileText,
  GitBranch,
  Loader2,
  Paperclip,
  Plus,
  Square,
  X,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type ReactNode } from "react";

import { AppFrame } from "@/components/app-frame";
import { useRuntimeConfig } from "@/components/providers";
import { SetupPanel } from "@/components/setup-panel";
import { StatusPill } from "@/components/status-pill";
import { convexApi } from "@/lib/convex-api";
import {
  buildPromptWithAttachments,
  isReadableAttachment,
  MAX_ATTACHMENTS,
  type PromptAttachment,
} from "@/lib/prompt-attachments";
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
}: {
  viewer: NonNullable<Viewer>;
  repositories: RepositoryOption[] | undefined;
  models: ModelOption[] | undefined;
}) {
  const createSession = useMutation(convexApi.sessions.create);
  const router = useRouter();
  const [repositoryId, setRepositoryId] = useState("");
  const [modelKey, setModelKey] = useState("");
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attachmentNotice, setAttachmentNotice] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<PromptAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const defaultRepositoryId = repositories?.[0]?._id ?? "";
  const defaultModel =
    models?.find((model) => model.model === "gpt-5-mini") ??
    models?.find((model) => model.provider === "github-copilot") ??
    models?.[0];
  const effectiveRepositoryId = repositoryId || defaultRepositoryId;
  const effectiveModelKey =
    modelKey || (defaultModel ? `${defaultModel.credentialId}:${defaultModel.model}` : "");
  const selectedModel = models?.find(
    (model) => `${model.credentialId}:${model.model}` === effectiveModelKey,
  );

  const canSubmit = Boolean(effectiveRepositoryId && selectedModel && prompt.trim() && !submitting);

  async function onFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (selectedFiles.length === 0) return;

    setAttachmentNotice(null);
    const slotsRemaining = Math.max(MAX_ATTACHMENTS - attachments.length, 0);
    const acceptedFiles = selectedFiles.slice(0, slotsRemaining);
    const skippedCount = selectedFiles.length - acceptedFiles.length;
    const readableFiles = acceptedFiles.filter(isReadableAttachment);
    const rejectedCount = acceptedFiles.length - readableFiles.length;

    if (slotsRemaining === 0) {
      setAttachmentNotice(`Remove a file before adding another. Up to ${MAX_ATTACHMENTS} files are supported.`);
      return;
    }

    const nextAttachments = await Promise.all(
      readableFiles.map(async (file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        name: file.name,
        type: file.type,
        size: file.size,
        content: await file.text(),
      })),
    );

    if (nextAttachments.length > 0) {
      setAttachments((current) => [...current, ...nextAttachments]);
    }

    if (rejectedCount > 0 || skippedCount > 0) {
      const notes = [];
      if (rejectedCount > 0) {
        notes.push("Only small text or code files are sent to the worker right now.");
      }
      if (skippedCount > 0) {
        notes.push(`Up to ${MAX_ATTACHMENTS} files can be attached.`);
      }
      setAttachmentNotice(notes.join(" "));
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedModel || !canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    setAttachmentNotice(null);
    const submittedPrompt = buildPromptWithAttachments(prompt, attachments);
    try {
      const result = await createSession({
        repositoryId: effectiveRepositoryId,
        credentialId: selectedModel.credentialId,
        provider: selectedModel.provider,
        model: selectedModel.model,
        prompt: submittedPrompt,
        title: prompt.trim(),
      });
      setPrompt("");
      setAttachments([]);
      router.push(`/app/sessions/${result.sessionId}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Task submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <section className="agent-home">
        {repositories === undefined || models === undefined ? (
          <LoadingPanel label="Loading repositories and models" />
        ) : !viewer.hasGithubInstallation ? (
          <EmptyState
            title="Connect GitHub to start"
            body="Repository access comes from your GitHub App installation. After GitHub redirects back, repositories will appear here."
            action={<GitHubConnect />}
          />
        ) : repositories.length === 0 ? (
          <EmptyState
            title="No repositories available"
            body="Install or update the GitHub App for at least one repository, then wait for the installation webhook to sync."
            action={<GitHubConnect label="Update GitHub App" />}
          />
        ) : models.length === 0 ? (
          <EmptyState
            title="No models available"
            body="Connect a Pi provider in settings. Models appear after a stored provider credential reports available models."
            action={<a className="ghost-button" href="/app/settings">Open settings</a>}
          />
        ) : (
          <form onSubmit={onSubmit} className="composer-shell">
            <textarea
              id="prompt"
              className="composer-input"
              placeholder="Ask the cloud agent to build, fix, or explore..."
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
            <div className="composer-toolbar">
              <div className="composer-selects">
                <ComposerMenu
                  icon={<GitBranch size={15} />}
                  label="Repository"
                  value={effectiveRepositoryId}
                  display={repositories.find((repo) => repo._id === effectiveRepositoryId)?.fullName ?? "Select repository"}
                  options={repositories.map((repo) => ({
                    value: repo._id,
                    label: repo.fullName,
                    detail: repo.defaultBranch ? `default ${repo.defaultBranch}` : repo.private ? "private" : "public",
                  }))}
                  onChange={setRepositoryId}
                />
                <ComposerMenu
                  label="Model"
                  value={effectiveModelKey}
                  display={selectedModel?.label ?? "Select model"}
                  options={models.map((model) => ({
                    value: `${model.credentialId}:${model.model}`,
                    label: model.label,
                    detail: model.provider,
                  }))}
                  onChange={setModelKey}
                />
              </div>
              <div className="composer-actions">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="visually-hidden"
                  accept=".txt,.md,.mdx,.json,.js,.jsx,.ts,.tsx,.css,.html,.py,.go,.rs,.java,.rb,.sh,.yaml,.yml,.toml,.xml,.sql,.log,text/*"
                  onChange={onFilesSelected}
                />
                <button
                  className="icon-button"
                  type="button"
                  title="Attach text or code files"
                  aria-label="Add file"
                  onClick={() => {
                    fileInputRef.current?.click();
                  }}
                >
                  <Paperclip size={16} />
                </button>
                <button
                  className="primary-button submit-button"
                  disabled={!canSubmit}
                  type="submit"
                  aria-label="Start task"
                >
                  {submitting ? <Loader2 size={16} /> : <ArrowUp size={16} />}
                </button>
              </div>
            </div>
            {attachments.length > 0 ? (
              <div className="attachment-list" aria-label="Attached files">
                {attachments.map((attachment) => (
                  <span className="attachment-chip" key={attachment.id}>
                    <FileText size={14} />
                    <span>{attachment.name}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${attachment.name}`}
                      onClick={() => {
                        setAttachments((current) =>
                          current.filter((item) => item.id !== attachment.id),
                        );
                      }}
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            {submitError ? <p className="form-error">{submitError}</p> : null}
            {attachmentNotice ? <p className="form-note">{attachmentNotice}</p> : null}
          </form>
        )}
      </section>

    </>
  );
}

function ComposerMenu({
  icon,
  label,
  value,
  display,
  options,
  onChange,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
  display: string;
  options: Array<{ value: string; label: string; detail?: string }>;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(options.findIndex((option) => option.value === value), 0),
  );
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = Math.max(options.findIndex((option) => option.value === value), 0);

  function chooseOption(index: number) {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
  }

  function focusOption(index: number) {
    const nextIndex = (index + options.length) % options.length;
    setActiveIndex(nextIndex);
    requestAnimationFrame(() => optionRefs.current[nextIndex]?.focus());
  }

  function openMenu() {
    setActiveIndex(selectedIndex);
    setOpen(true);
    requestAnimationFrame(() => optionRefs.current[selectedIndex]?.focus());
  }

  function onMenuKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      focusOption(activeIndex + (event.key === "ArrowDown" ? 1 : -1));
      return;
    }

    if ((event.key === "Enter" || event.key === " ") && open) {
      event.preventDefault();
      chooseOption(activeIndex);
    }
  }

  return (
    <div
      className="composer-menu"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
      onKeyDown={onMenuKeyDown}
    >
      <button
        className="composer-menu-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => {
          setOpen((current) => {
            if (!current) setActiveIndex(selectedIndex);
            return !current;
          });
        }}
      >
        {icon ? <span className="composer-menu-icon">{icon}</span> : null}
        <span className="composer-menu-label">{display}</span>
        <ChevronDown size={13} />
      </button>
      {open ? (
        <div className="composer-popover" role="listbox" aria-label={label} tabIndex={-1}>
          {options.map((option) => {
            const selected = option.value === value;
            const index = options.indexOf(option);
            return (
              <button
                className="composer-option"
                type="button"
                role="option"
                aria-selected={selected}
                data-active={index === activeIndex ? "true" : undefined}
                key={option.value}
                ref={(node) => {
                  optionRefs.current[index] = node;
                }}
                tabIndex={index === activeIndex ? 0 : -1}
                onFocus={() => setActiveIndex(index)}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => {
                  chooseOption(index);
                }}
              >
                <span className="composer-option-copy">
                  <span>{option.label}</span>
                  {option.detail ? <small>{option.detail}</small> : null}
                </span>
                {selected ? <Check size={14} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
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
  const [followupSubmitting, setFollowupSubmitting] = useState(false);
  const [followupError, setFollowupError] = useState<string | null>(null);
  const followupInputRef = useRef<HTMLInputElement>(null);
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
  const displayedEvents = timeline.events
    .map(getTimelineDisplay)
    .filter((event): event is TimelineDisplay => event !== null);
  const timelineItems = [
    ...displayedEvents.map((event) => ({
      kind: "event" as const,
      id: event.id,
      streamOrder: event.streamOrder,
      time: event.createdAt,
      event,
    })),
    ...timeline.toolCalls.map((toolCall) => ({
      kind: "tool" as const,
      id: toolCall._id,
      streamOrder: toolCall.streamOrder,
      time: toolCall.startedAt ?? toolCall.finishedAt ?? toolCall.updatedAt,
      toolCall,
    })),
  ].sort(compareTimelineItems);
  const sessionError =
    "error" in session && typeof session.error === "string" ? session.error : undefined;
  const terminalEvent = getTerminalDisplay(session.status, sessionError);
  const followupLocked =
    session.status === "queued" ||
    session.status === "running" ||
    session.status === "cancel_requested";
  const pullRequestUrl =
    "pullRequestUrl" in session && typeof session.pullRequestUrl === "string"
      ? session.pullRequestUrl
      : undefined;

  async function onFollowup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prompt.trim() || followupLocked || followupSubmitting) return;
    setFollowupSubmitting(true);
    setFollowupError(null);
    try {
      await sendFollowup({ sessionId: selectedSessionId, prompt: prompt.trim() });
      setPrompt("");
    } catch (error) {
      setFollowupError(
        error instanceof Error ? error.message : "Follow-up submission failed.",
      );
    } finally {
      setFollowupSubmitting(false);
    }
  }

  return (
    <>
      <section className="session-header" data-compact="true">
        <div className="session-title-row">
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

      <section className="timeline-list">
        {displayedEvents.length === 0 && timeline.toolCalls.length === 0 && !terminalEvent ? (
          <EmptyState
            title="Waiting for the first event"
            body="The worker has not streamed output for this session yet."
          />
        ) : (
          <>
            {timelineItems.map((item) =>
              item.kind === "event" ? (
                <TimelineEvent
                  key={item.id}
                  event={item.event}
                  onDecision={(value) => {
                    if (followupSubmitting) return;
                    setPrompt(value);
                    requestAnimationFrame(() => followupInputRef.current?.focus());
                  }}
                />
              ) : (
                <ToolCallEvent key={item.id} toolCall={item.toolCall} />
              ),
            )}
            {terminalEvent ? <TimelineEvent event={terminalEvent} /> : null}
          </>
        )}
      </section>

      <form
        onSubmit={onFollowup}
        className="followup-composer"
      >
        <Plus size={18} color="var(--muted)" />
        <input
          ref={followupInputRef}
          aria-label="Send follow-up"
          placeholder={followupLocked ? "Wait for this run to finish" : "Send follow-up"}
          value={prompt}
          disabled={followupLocked || followupSubmitting}
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
        <button
          className="primary-button"
          type="submit"
          disabled={!prompt.trim() || followupLocked || followupSubmitting}
          aria-label="Send follow-up"
        >
          {followupSubmitting ? <Loader2 size={16} /> : <ArrowUp size={16} />}
        </button>
        {followupError ? <p className="followup-error">{followupError}</p> : null}
      </form>
    </>
  );
}

function TimelineEvent({
  event,
  onDecision,
}: {
  event: TimelineDisplay;
  onDecision?: (value: string) => void;
}) {
  return (
    <article className="timeline-event" data-role={event.role}>
      <div className="timeline-meta">{event.title}</div>
      <div className="timeline-chrome">
        <span>{formatTimelineRole(event.role, event.title)}</span>
        <span>{formatTimelineTime(event.createdAt)}</span>
      </div>
      {event.decision ? (
        <DecisionCard decision={event.decision} onDecision={onDecision} />
      ) : (
        <TimelineBody event={event} />
      )}
    </article>
  );
}

function formatTimelineRole(role: TimelineDisplay["role"], title: string) {
  if (role === "user") return "You";
  if (role === "assistant") return "Agent";
  if (role === "tool") return "Tool";
  if (title) return title.replace(/_/g, " ").toLowerCase();
  return "System";
}

function formatTimelineTime(timestamp: number) {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function ToolCallEvent({
  toolCall,
}: {
  toolCall: TimelineResult["toolCalls"][number];
}) {
  const detail = formatToolDetail(toolCall.args);
  const resultBody = formatToolResult(toolCall);
  const error = toolCall.error;

  // Terminal commands render as a titled card with a `>_` header and an output
  // region beneath it (Cursor Composer style). The command itself is the title.
  if (isCommandTool(toolCall.toolName)) {
    const command = detail || toolCall.toolName;
    const output = error || resultBody;
    const longOutput =
      output.split("\n").length > 8 || output.length > 520;
    const running = toolCall.status === "running" || toolCall.status === "queued";
    const state = error ? "failed" : running ? "running" : "done";
    return (
      <article className="timeline-event" data-role="tool">
        <details
          className="cmd-card"
          data-error={error ? "true" : undefined}
          data-state={state}
          open={!longOutput || Boolean(error) || running}
        >
          <summary className="cmd-card-header">
            <span className="glyph" aria-hidden="true">
              {">_"}
            </span>
            <span className="cmd-title">{command}</span>
            <span className="cmd-state">{state}</span>
          </summary>
          {running ? (
            <div className="cmd-progress-strip">
              <span className="spinner-dot" aria-hidden="true" />
              <span>{output ? "Streaming command output" : "Waiting for command output"}</span>
            </div>
          ) : null}
          {output ? (
            <pre
              className="cmd-card-output"
              data-error={error ? "true" : undefined}
              data-streaming={running ? "true" : undefined}
            >
              {output}
            </pre>
          ) : null}
        </details>
      </article>
    );
  }

  // Lightweight reads/searches render as a quiet inline line with a bold verb:
  // "Read README.md L1-40", "Grepped TODO in cloud-agent", "Explored package.json".
  const verb = error ? "Failed" : toolVerb(toolCall.toolName);
  const label = detail || toolCall.toolName;
  return (
    <article className="timeline-event" data-role="tool">
      <div className="tool-line" data-error={error ? "true" : undefined}>
        <span>
          <span className="verb">{verb}</span> <span className="tool-name">{label}</span>
        </span>
      </div>
      {error ? <pre className="tool-output">{error}</pre> : null}
    </article>
  );
}

function TimelineBody({ event }: { event: TimelineDisplay }) {
  const promptWithAttachments =
    event.role === "user" ? splitPromptAttachmentContext(event.body) : null;

  if (promptWithAttachments) {
    return (
      <div className="timeline-body">
        <div>{promptWithAttachments.prompt}</div>
        <details className="attachment-context">
          <summary>{promptWithAttachments.label}</summary>
          <pre>{promptWithAttachments.context}</pre>
        </details>
      </div>
    );
  }

  if (event.collapsible) {
    return (
      <details>
        <summary>Show output</summary>
        <pre>{event.body}</pre>
      </details>
    );
  }

  return (
    <div className="timeline-body">
      {event.role === "assistant" ? renderMarkdown(event.body) : event.body}
    </div>
  );
}

type TimelineDisplay = {
  id: string;
  title: string;
  body: string;
  role: SessionEvent["role"];
  decision?: DecisionPrompt;
  streamOrder?: number;
  createdAt: number;
  collapsible?: boolean;
};

type DecisionPrompt = {
  title: string;
  prompt: string;
  options: Array<{ value: string; label: string; detail?: string }>;
};

type TimelineItem =
  | {
      kind: "event";
      id: string;
      streamOrder?: number;
      time: number;
      event: TimelineDisplay;
    }
  | {
      kind: "tool";
      id: string;
      streamOrder?: number;
      time: number;
      toolCall: TimelineResult["toolCalls"][number];
    };

function compareTimelineItems(a: TimelineItem, b: TimelineItem) {
  const aStreamOrder = a.streamOrder;
  const bStreamOrder = b.streamOrder;
  const aHasStreamOrder = typeof aStreamOrder === "number";
  const bHasStreamOrder = typeof bStreamOrder === "number";

  if (aHasStreamOrder && bHasStreamOrder && aStreamOrder !== bStreamOrder) {
    return aStreamOrder - bStreamOrder;
  }

  if (aHasStreamOrder !== bHasStreamOrder) {
    return aHasStreamOrder ? 1 : -1;
  }

  return a.time - b.time;
}

function renderMarkdown(text: string) {
  const blocks: ReactNode[] = [];
  const fenceParts = text.split(/```/g);

  fenceParts.forEach((part, fenceIndex) => {
    if (!part) return;
    if (fenceIndex % 2 === 1) {
      const [firstLine = "", ...rest] = part.replace(/^\n/, "").split("\n");
      const language = firstLine.trim() && !firstLine.includes(" ") ? firstLine.trim() : "";
      const code = language ? rest.join("\n") : [firstLine, ...rest].join("\n");
      blocks.push(
        <pre className="markdown-code-block" key={`code-${fenceIndex}`}>
          <code>{code.trimEnd()}</code>
        </pre>,
      );
      return;
    }

    blocks.push(...renderMarkdownTextBlocks(part, `text-${fenceIndex}`));
  });

  return <div className="timeline-markdown">{blocks}</div>;
}

function renderMarkdownTextBlocks(text: string, keyPrefix: string) {
  const blocks: ReactNode[] = [];
  const lines = text.split("\n");
  let paragraph: string[] = [];
  let list: Array<{ ordered: boolean; text: string }> = [];

  function flushParagraph() {
    if (paragraph.length === 0) return;
    const value = paragraph.join(" ").trim();
    if (value) {
      blocks.push(<p key={`${keyPrefix}-p-${blocks.length}`}>{renderInlineMarkdown(value)}</p>);
    }
    paragraph = [];
  }

  function flushList() {
    if (list.length === 0) return;
    const ordered = list.every((item) => item.ordered);
    const children = list.map((item, index) => (
      <li key={`${keyPrefix}-li-${blocks.length}-${index}`}>{renderInlineMarkdown(item.text)}</li>
    ));
    blocks.push(
      ordered ? (
        <ol key={`${keyPrefix}-ol-${blocks.length}`}>{children}</ol>
      ) : (
        <ul key={`${keyPrefix}-ul-${blocks.length}`}>{children}</ul>
      ),
    );
    list = [];
  }

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
    if (bullet || ordered) {
      flushParagraph();
      list.push({ ordered: Boolean(ordered), text: (bullet?.[1] ?? ordered?.[1] ?? "").trim() });
      return;
    }

    flushList();
    paragraph.push(trimmed.replace(/^#{1,4}\s+/, ""));
  });

  flushParagraph();
  flushList();
  return blocks;
}

function renderInlineMarkdown(text: string) {
  const nodes: ReactNode[] = [];
  const pattern =
    /(`([^`]+)`)|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    if (match[2]) {
      nodes.push(<code key={`code-${match.index}`}>{match[2]}</code>);
    } else if (match[3] && match[4]) {
      nodes.push(
        <a key={`link-${match.index}`} href={match[4]} target="_blank" rel="noreferrer">
          {match[3]}
        </a>,
      );
    } else if (match[5]) {
      nodes.push(<strong key={`strong-${match.index}`}>{match[5]}</strong>);
    } else if (match[6]) {
      nodes.push(<em key={`em-${match.index}`}>{match[6]}</em>);
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function DecisionCard({
  decision,
  onDecision,
}: {
  decision: DecisionPrompt;
  onDecision?: (value: string) => void;
}) {
  const approval = decision.title.toLowerCase().includes("approval");
  if (approval) {
    return <ApprovalInlineCard decision={decision} onDecision={onDecision} />;
  }

  return (
    <div className="question-card">
      <div className="question-card-head">
        <span className="q-title">{decision.title}</span>
      </div>
      <p className="question-prompt">{decision.prompt}</p>
      {decision.options.length > 0 ? (
        <div className="question-options">
          {decision.options.map((option, index) => (
            <button
              className="question-option"
              type="button"
              key={`${option.value}-${index}`}
              onClick={() => onDecision?.(option.value)}
            >
              <span className="opt-key">{String.fromCharCode(65 + index)}</span>
              <span>
                {option.label}
                {option.detail ? <small>{option.detail}</small> : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      <div className="question-card-foot">
        <span className="decision-hint">
          {decision.options.length > 0 ? "Choose an option or reply below." : "Reply below to continue this agent."}
        </span>
      </div>
    </div>
  );
}

function ApprovalInlineCard({
  decision,
  onDecision,
}: {
  decision: DecisionPrompt;
  onDecision?: (value: string) => void;
}) {
  return (
    <div className="approval-inline">
      <div className="approval-inline-head">
        <span>{decision.title}</span>
        <small>Waiting for your decision</small>
      </div>
      <p className="approval-inline-prompt">{decision.prompt}</p>
      {decision.options.length > 0 ? (
        <div className="approval-inline-actions">
          {decision.options.map((option, index) => (
            <button
              className="approval-inline-button"
              data-tone={approvalOptionTone(option.label, option.value)}
              type="button"
              key={`${option.value}-${index}`}
              onClick={() => onDecision?.(option.value)}
            >
              {option.label}
              {option.detail ? <small>{option.detail}</small> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function approvalOptionTone(label: string, value: string) {
  const text = `${label} ${value}`.toLowerCase();
  if (/\b(approve|allow|yes|accept|continue|run)\b/.test(text)) return "approve";
  if (/\b(deny|reject|no|cancel|stop)\b/.test(text)) return "deny";
  return undefined;
}

function getTimelineDisplay(event: SessionEvent): TimelineDisplay | null {
  const decision = getDecisionPrompt(event);
  if (decision) {
    return {
      id: event._id,
      title: event.type.replace(/_/g, " ").toUpperCase(),
      body: decision.prompt,
      role: event.role,
      decision,
      streamOrder: event.streamOrder,
      createdAt: event.createdAt,
    };
  }

  const progress = getProgressDisplay(event);
  if (progress) return progress;

  if (event.role === "assistant" && event.text) {
    return {
      id: event._id,
      title: event.type.replace(/_/g, " ").toUpperCase(),
      body: event.text,
      role: event.role,
      streamOrder: event.streamOrder,
      createdAt: event.createdAt,
    };
  }
  if (event.role === "assistant" && event.payload) {
    const payloadType = getPayloadType(event.payload);
    if (payloadType === "agent_start") {
      return {
        id: event._id,
        title: "AGENT STARTED",
        body: "The worker started this task.",
        role: "system",
        streamOrder: event.streamOrder,
        createdAt: event.createdAt,
      };
    }
    const assistantOutput = extractAssistantOutput(event.payload);
    if (assistantOutput) {
      return {
        id: event._id,
        title: event.type.replace(/_/g, " ").toUpperCase(),
        body: assistantOutput,
        role: event.role,
        streamOrder: event.streamOrder,
        createdAt: event.createdAt,
      };
    }
    return null;
  }

  if (event.role === "user") {
    return {
      id: event._id,
      title: event.type === "followup" ? "FOLLOW-UP" : "PROMPT",
      body: event.text ?? "",
      role: event.role,
      streamOrder: event.streamOrder,
      createdAt: event.createdAt,
    };
  }

  if (event.text) {
    return {
      id: event._id,
      title: event.type.replace(/_/g, " ").toUpperCase(),
      body: event.text,
      role: event.role,
      streamOrder: event.streamOrder,
      createdAt: event.createdAt,
    };
  }

  if (event.payload) {
    return {
      id: event._id,
      title: event.type.replace(/_/g, " ").toUpperCase(),
      body: truncateText(formatValue(event.payload), 900),
      role: event.role,
      streamOrder: event.streamOrder,
      createdAt: event.createdAt,
      collapsible: true,
    };
  }

  return null;
}

function getProgressDisplay(event: SessionEvent): TimelineDisplay | null {
  const type = event.type.toLowerCase();
  const payload = event.payload && typeof event.payload === "object"
    ? (event.payload as Record<string, unknown>)
    : {};
  const progressLike =
    type.includes("thinking") ||
    type.includes("reasoning") ||
    type.includes("thought") ||
    type.includes("progress") ||
    type.includes("status") ||
    type.includes("step");

  if (!progressLike) return null;

  const text =
    event.text ??
    stringValue(payload.summary) ??
    stringValue(payload.title) ??
    stringValue(payload.message) ??
    stringValue(payload.status);

  const body = formatProgressLabel(type, text);
  if (!body) return null;

  return {
    id: event._id,
    title: event.type.replace(/_/g, " ").toUpperCase(),
    body,
    role: "system",
    streamOrder: event.streamOrder,
    createdAt: event.createdAt,
  };
}

function formatProgressLabel(type: string, text?: string) {
  if (type.includes("thinking") || type.includes("reasoning") || type.includes("thought")) {
    return text && /thought/i.test(text) ? text : "Thought briefly";
  }

  if (!text) return null;
  return text.length > 80 ? truncateText(text, 80) : text;
}

function getDecisionPrompt(event: SessionEvent): DecisionPrompt | null {
  const type = event.type.toLowerCase();
  const maybeDecisionType =
    type.includes("question") ||
    type.includes("approval") ||
    type.includes("input") ||
    type.includes("select") ||
    type.includes("choice");
  if (!maybeDecisionType && !hasDecisionPayload(event.payload)) return null;

  const payload = event.payload && typeof event.payload === "object"
    ? (event.payload as Record<string, unknown>)
    : {};
  const prompt =
    stringValue(payload.prompt) ??
    stringValue(payload.question) ??
    stringValue(payload.message) ??
    event.text ??
    "";

  if (!prompt.trim()) return null;

  return {
    title: type.includes("approval") ? "Approval requested" : "Waiting for input",
    prompt: prompt.trim(),
    options: normalizeDecisionOptions(payload.options ?? payload.choices ?? payload.answers),
  };
}

function hasDecisionPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") return false;
  const record = payload as Record<string, unknown>;
  return Boolean(record.question || record.prompt || record.message || record.options || record.choices);
}

function normalizeDecisionOptions(value: unknown): DecisionPrompt["options"] {
  if (!Array.isArray(value)) return [];
  return value
    .map((option) => {
      if (typeof option === "string") {
        return { value: option, label: option };
      }
      if (!option || typeof option !== "object") return null;
      const record = option as Record<string, unknown>;
      const label =
        stringValue(record.label) ??
        stringValue(record.text) ??
        stringValue(record.title) ??
        stringValue(record.id) ??
        stringValue(record.value);
      if (!label) return null;
      return {
        value: stringValue(record.value) ?? stringValue(record.id) ?? label,
        label,
        detail: stringValue(record.description) ?? stringValue(record.detail),
      };
    })
    .filter((option): option is DecisionPrompt["options"][number] => option !== null);
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getTerminalDisplay(status: string, error?: string): TimelineDisplay | null {
  const createdAt = Date.now();
  if (status === "completed") {
    return {
      id: "terminal:completed",
      title: "AGENT FINISHED",
      body: "The task finished.",
      role: "system",
      createdAt,
    };
  }

  if (status === "failed") {
    return {
      id: "terminal:failed",
      title: "AGENT FAILED",
      body: error ?? "The task failed.",
      role: "system",
      createdAt,
    };
  }

  if (status === "cancelled" || status === "cancel_requested") {
    return {
      id: "terminal:cancelled",
      title: "AGENT CANCELLED",
      body: "The task was cancelled.",
      role: "system",
      createdAt,
    };
  }

  return null;
}

// Maps a tool name to a natural verb, matching the reference's "Read Logo.tsx",
// "Used streamer-mode" phrasing. Falls back to "Used" for anything unknown.
function toolVerb(toolName: string): string {
  const name = toolName.toLowerCase();
  if (name.includes("read") || name.includes("cat") || name.includes("view")) return "Read";
  if (name.includes("write") || name.includes("edit") || name.includes("apply")) return "Edited";
  if (name.includes("grep")) return "Grepped";
  if (name.includes("search") || name.includes("find") || name.includes("glob") || name.includes("list"))
    return "Searched";
  if (name.includes("fetch") || name.includes("http") || name.includes("web")) return "Fetched";
  return "Explored";
}

// Terminal/command tools render as titled output cards; everything else stays a
// quiet inline line.
function isCommandTool(toolName: string): boolean {
  const name = toolName.toLowerCase();
  return (
    name.includes("bash") ||
    name.includes("shell") ||
    name.includes("exec") ||
    name.includes("terminal") ||
    name.includes("command") ||
    name === "run"
  );
}

// Surfaces a short, human-readable detail from tool args only when one is
// actually present (file path, command, query, url) — never faked precision.
function formatToolDetail(args: unknown): string {
  if (!args || typeof args !== "object") return "";
  const record = args as Record<string, unknown>;
  for (const key of ["path", "file", "filePath", "command", "query", "url", "pattern"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return truncateText(value.trim(), 80);
    }
  }
  return "";
}

function formatToolResult(toolCall: TimelineResult["toolCalls"][number]) {
  if (toolCall.error) return toolCall.error;
  if (toolCall.result === undefined || toolCall.result === null) return "";
  return truncateText(extractToolText(toolCall.result), 1200);
}

// Pulls plain text out of common tool-result shapes ({ content: [{ text }] },
// { text }, { output }, strings) so the UI shows readable output instead of raw
// JSON. Falls back to a formatted dump only when no text field is found.
function extractToolText(result: unknown): string {
  if (typeof result === "string") return result;
  if (result && typeof result === "object") {
    const record = result as Record<string, unknown>;
    const fromContent = extractTextContent(record.content);
    if (fromContent) return fromContent;
    for (const key of ["text", "output", "stdout", "result", "message"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) return value;
    }
  }
  return formatValue(result);
}

function splitPromptAttachmentContext(body: string) {
  const marker = "\n\nAttached files for context:\n\n";
  const markerIndex = body.indexOf(marker);
  if (markerIndex === -1) return null;
  const prompt = body.slice(0, markerIndex).trim();
  const context = body.slice(markerIndex + marker.length).trim();
  const attachmentCount = context.match(/^Attachment \d+:/gm)?.length ?? 0;
  return {
    prompt,
    context,
    label:
      attachmentCount === 1
        ? "Show 1 attached file"
        : `Show ${attachmentCount || "attached"} files`,
  };
}

function formatValue(value: unknown) {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function truncateText(value: string, length: number) {
  return value.length > length ? `${value.slice(0, length)}...` : value;
}

function getPayloadType(payload: unknown) {
  if (!payload || typeof payload !== "object") return undefined;
  return (payload as { type?: unknown }).type;
}

function extractAssistantOutput(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const value = payload as Record<string, any>;

  const assistantMessageEvent = value.assistantMessageEvent;
  if (assistantMessageEvent && typeof assistantMessageEvent === "object") {
    if (typeof assistantMessageEvent.content === "string" && assistantMessageEvent.content.trim()) {
      return assistantMessageEvent.content;
    }
    const partialText = extractTextContent(assistantMessageEvent.partial?.content);
    if (partialText) return partialText;
  }

  if (value.message?.role === "assistant") {
    return extractTextContent(value.message.content);
  }

  if (Array.isArray(value.messages)) {
    const assistantMessages = value.messages.filter((message) => message?.role === "assistant");
    for (const message of assistantMessages.reverse()) {
      const text = extractTextContent(message.content);
      if (text) return text;
    }
  }

  return undefined;
}

function extractTextContent(content: unknown) {
  if (!Array.isArray(content)) return undefined;
  const text = content
    .filter((item) => item?.type === "text" && typeof item.text === "string")
    .map((item) => item.text)
    .join("");
  return text.trim() ? text : undefined;
}

function GitHubConnect({ label = "Connect GitHub App" }: { label?: string }) {
  const { githubAppSlug } = useRuntimeConfig();
  const href = githubAppSlug ? "/api/github/install" : "/app/settings";

  return (
    <a className="ghost-button" href={href}>
      <GitBranch size={16} />
      {label}
    </a>
  );
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-panel empty-state">
      <h2>{title}</h2>
      <p>{body}</p>
      {action ? <div>{action}</div> : null}
    </div>
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
