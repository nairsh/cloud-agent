"use client";

import { GitBranch, KeyRound, Loader2 } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

import { AppFrame } from "@/components/app-frame";
import { useRuntimeConfig } from "@/components/providers";
import { SetupPanel } from "@/components/setup-panel";
import { convexApi } from "@/lib/convex-api";

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
  const models = useQuery(convexApi.providers.listModels);
  const startLogin = useMutation(convexApi.providers.startLogin);
  const [provider, setProvider] = useState("codex");
  const [loginStatus, setLoginStatus] = useState<string | null>(null);
  const { githubAppSlug } = useRuntimeConfig();

  async function onProviderLogin() {
    const result = await startLogin({ provider });
    setLoginStatus(`Provider login queued: ${result.status}`);
  }

  return (
    <AppFrame viewer={viewer ?? null} sessions={sessions ?? []}>
      <div style={{ maxWidth: 860, display: "grid", gap: 16 }}>
        {setupIssues.length > 0 ? <SetupPanel issues={setupIssues} /> : null}

        <section className="empty-panel" style={{ display: "grid", gap: 12 }}>
          <h2>Account</h2>
          <p>Clerk owns user authentication. Convex stores the app user record and task state.</p>
          <div>
            <UserButton />
          </div>
        </section>

        <section className="empty-panel" style={{ display: "grid", gap: 12 }}>
          <h2>GitHub App</h2>
          <p>
            Repository access is granted through a GitHub App installation, not
            a long-lived browser OAuth token.
          </p>
          <a
            className="ghost-button"
            href={
              githubAppSlug
                ? `https://github.com/apps/${githubAppSlug}/installations/new`
                : "#"
            }
            style={{ width: "fit-content" }}
          >
            <GitBranch size={16} />
            Install or update GitHub App
          </a>
        </section>

        <section className="empty-panel" style={{ display: "grid", gap: 12 }}>
          <h2>Pi provider credentials</h2>
          <p>
            A provider login job captures Pi OAuth credentials in an isolated
            auth directory, encrypts them, and deletes the temporary directory.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(160px, 240px) auto",
              gap: 12,
              alignItems: "end",
            }}
          >
            <div className="field">
              <label htmlFor="provider">Provider</label>
              <select
                id="provider"
                value={provider}
                onChange={(event) => setProvider(event.target.value)}
              >
                <option value="codex">Codex / ChatGPT</option>
                <option value="claude">Claude</option>
                <option value="github-copilot">GitHub Copilot</option>
              </select>
            </div>
            <button className="primary-button" type="button" onClick={onProviderLogin}>
              <KeyRound size={16} />
              Start provider login
            </button>
          </div>
          {loginStatus ? <p>{loginStatus}</p> : null}
          {models === undefined ? (
            <p>
              <Loader2 size={14} /> Loading models
            </p>
          ) : models.length === 0 ? (
            <p>No provider credentials have reported available models yet.</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {models.map((model) => (
                <div
                  key={`${model.credentialId}:${model.model}`}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "10px 12px",
                  }}
                >
                  {model.label}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppFrame>
  );
}
