"use client";

import { GitBranch, KeyRound, Loader2 } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

import { AppFrame } from "@/components/app-frame";
import { useRuntimeConfig } from "@/components/providers";
import { SetupPanel } from "@/components/setup-panel";
import { convexApi } from "@/lib/convex-api";
import type { ProviderCredentialSummary } from "@/lib/types";

export function SettingsClient() {
  const config = useRuntimeConfig();
  const setupIssues = [
    !config.clerkConfigured && "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not configured.",
    !config.convexConfigured && "NEXT_PUBLIC_CONVEX_URL is not configured.",
    !config.githubAppSlug && "NEXT_PUBLIC_GITHUB_APP_SLUG is not configured.",
  ].filter(Boolean) as string[];

  if (!config.convexConfigured || !config.clerkConfigured) {
    return (
      <AppFrame viewer={null} sessions={[]}>
        <div style={{ maxWidth: 780 }}>
          <SetupPanel issues={setupIssues} />
        </div>
      </AppFrame>
    );
  }

  return <SettingsData setupIssues={setupIssues} />;
}

function SettingsData({ setupIssues }: { setupIssues: string[] }) {
  const viewer = useQuery(convexApi.viewer.get);
  const sessions = useQuery(convexApi.sessions.list);
  const repositories = useQuery(convexApi.github.listRepositories);
  const models = useQuery(convexApi.providers.listModels);
  const credentials = useQuery(convexApi.providers.listCredentials);
  const startLogin = useMutation(convexApi.providers.startLogin);
  const [provider, setProvider] = useState("openai-codex");
  const [loginStatus, setLoginStatus] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const { githubAppSlug } = useRuntimeConfig();
  const activeProviders = new Set(
    credentials
      ?.filter((credential) => credential.status === "active")
      .map((credential) => credential.provider) ?? [],
  );
  const visibleCredentials = credentials?.filter((credential) => {
    if (credential.error === "Replaced by a newer provider login attempt.") return false;
    if (credential.status === "failed" && activeProviders.has(credential.provider)) return false;
    return true;
  });

  async function startProviderLogin(providerName: string) {
    setLoginSubmitting(true);
    setLoginStatus(null);
    setLoginError(null);
    try {
      const result = await startLogin({ provider: providerName });
      setLoginStatus(`${providerLabel(providerName)} login queued: ${result.status}`);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Provider login could not start.");
    } finally {
      setLoginSubmitting(false);
    }
  }

  return (
    <AppFrame viewer={viewer ?? null} sessions={sessions ?? []}>
      <div className="settings-page">
        {setupIssues.length > 0 ? <SetupPanel issues={setupIssues} /> : null}

        <section className="settings-section">
          <div className="settings-section-header">
            <div>
              <h2>Account</h2>
              <p>Clerk owns sign-in. Convex stores the app user record and task state.</p>
            </div>
            <UserButton />
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-header">
            <div>
              <h2>GitHub App</h2>
              <p>
                Repository access is granted through a GitHub App installation, not a long-lived
                browser OAuth token.
              </p>
            </div>
            <span className="settings-badge" data-state={viewer?.hasGithubInstallation ? "ok" : "warn"}>
              {viewer?.hasGithubInstallation ? "Connected" : "Not connected"}
            </span>
          </div>
          <a
            className="ghost-button"
            href={
              githubAppSlug
                ? "/api/github/install"
                : "#"
            }
            style={{ width: "fit-content" }}
          >
            <GitBranch size={16} />
            Install or update GitHub App
          </a>
          {process.env.NODE_ENV !== "production" ? (
            <a className="ghost-button" href="/dev/github-sync" style={{ width: "fit-content" }}>
              <GitBranch size={16} />
              Sync installed GitHub App
            </a>
          ) : null}
          {repositories === undefined ? (
            <p className="settings-muted">
              <Loader2 size={14} /> Loading repositories
            </p>
          ) : repositories.length > 0 ? (
            <div className="settings-list">
              {repositories.map((repo) => (
                <div className="settings-row" key={repo._id}>
                  <strong>{repo.fullName}</strong>
                  <span>{repo.private ? "Private" : "Public"}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="settings-muted">
              No repositories are synced yet. Install or update the GitHub App, then return here.
            </p>
          )}
        </section>

        <section className="settings-section">
          <div className="settings-section-header">
            <div>
              <h2>Pi provider credentials</h2>
              <p>
                Provider credentials are captured by the worker, encrypted, then used for model
                selection and task execution.
              </p>
            </div>
            <span className="settings-badge" data-state={models && models.length > 0 ? "ok" : "warn"}>
              {models && models.length > 0 ? `${models.length} models` : "No models"}
            </span>
          </div>
          <div className="settings-control-row">
            <div className="field">
              <label htmlFor="provider">Provider</label>
              <select
                id="provider"
                value={provider}
                onChange={(event) => setProvider(event.target.value)}
              >
                <option value="openai-codex">Codex / ChatGPT</option>
                <option value="anthropic">Claude</option>
                <option value="github-copilot">GitHub Copilot</option>
              </select>
            </div>
            <button
              className="primary-button"
              type="button"
              onClick={() => startProviderLogin(provider)}
              disabled={loginSubmitting}
            >
              {loginSubmitting ? <Loader2 size={16} /> : <KeyRound size={16} />}
              {loginSubmitting ? "Starting login" : "Start provider login"}
            </button>
          </div>
          {loginStatus ? <p className="settings-muted">{loginStatus}</p> : null}
          {loginError ? <p className="settings-error">{loginError}</p> : null}
          {credentials === undefined ? (
            <p className="settings-muted">
              <Loader2 size={14} /> Loading credential status
            </p>
          ) : visibleCredentials && visibleCredentials.length > 0 ? (
            <div className="settings-list">
              {visibleCredentials.map((credential) => (
                <ProviderCredentialRow
                  credential={credential}
                  key={credential._id}
                  loginSubmitting={loginSubmitting}
                  onRetry={() => startProviderLogin(credential.provider)}
                />
              ))}
            </div>
          ) : (
            <p className="settings-muted">No provider login attempts yet.</p>
          )}
          {models === undefined ? (
            <p className="settings-muted">
              <Loader2 size={14} /> Loading models
            </p>
          ) : models.length === 0 ? (
            <p className="settings-muted">No provider credentials have reported available models yet.</p>
          ) : (
            <div className="settings-model-grid">
              {models.map((model) => (
                <div className="settings-model-row" key={`${model.credentialId}:${model.model}`}>
                  <strong>{model.model}</strong>
                  <span>{model.provider}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppFrame>
  );
}

function ProviderCredentialRow({
  credential,
  loginSubmitting,
  onRetry,
}: {
  credential: ProviderCredentialSummary;
  loginSubmitting: boolean;
  onRetry: () => void;
}) {
  const ageMs = credential.pendingForMs ?? 0;
  const isStalePending = credential.status === "pending" && ageMs > 5 * 60 * 1000;
  const canRetry =
    credential.status === "failed" ||
    credential.status === "revoked" ||
    credential.status === "pending";
  const state =
    credential.status === "active"
      ? "ok"
      : credential.status === "failed" || credential.status === "revoked"
        ? "error"
        : "warn";

  return (
    <div className="settings-row settings-row-stacked">
      <div>
        <strong>{credential.provider}</strong>
        <span className="settings-badge" data-state={state}>
          {credential.status}
        </span>
      </div>
      <span>
        {credential.models?.length
          ? `${credential.models.length} models available`
          : credential.status === "pending"
            ? `Waiting for login · updated ${formatRelativeTime(ageMs)} ago`
            : "Waiting for models"}
      </span>
      {credential.loginInstructions ? (
        <ProviderInstructions text={credential.loginInstructions} />
      ) : null}
      {isStalePending ? (
        <p className="settings-warning">
          This login has been waiting for a while. Retry login to replace it.
        </p>
      ) : null}
      {credential.error ? <p className="settings-error">{credential.error}</p> : null}
      {canRetry ? (
        <button
          className="ghost-button settings-row-action"
          type="button"
          onClick={onRetry}
          disabled={loginSubmitting}
        >
          <KeyRound size={14} />
          Retry {providerLabel(credential.provider)} login
        </button>
      ) : null}
    </div>
  );
}

function providerLabel(provider: string) {
  if (provider === "openai-codex") return "Codex / ChatGPT";
  if (provider === "anthropic") return "Claude";
  if (provider === "github-copilot") return "GitHub Copilot";
  return provider;
}

function formatRelativeTime(ageMs: number) {
  const totalSeconds = Math.max(0, Math.floor(ageMs / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  return `${Math.floor(totalMinutes / 60)}h`;
}

function ProviderInstructions({ text }: { text: string }) {
  return (
    <div className="settings-instructions">
      {text.split("\n").map((line) => {
        const url = line.match(/https?:\/\/\S+/)?.[0];
        const code = line.match(/^Code:\s*(.+)$/)?.[1];

        if (url) {
          return (
            <div key={line}>
              URL:{" "}
              <a href={url} target="_blank" rel="noreferrer">
                {url}
              </a>
            </div>
          );
        }

        if (code) {
          return (
            <div key={line}>
              Code: <strong>{code}</strong>
            </div>
          );
        }

        return <div key={line}>{line}</div>;
      })}
    </div>
  );
}
