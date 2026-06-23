import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { AuthStorage, ModelRegistry } from "@earendil-works/pi-coding-agent";
import { ConvexHttpClient } from "convex/browser";

import { convexApi } from "@/lib/convex-api";
import { decryptJson, encryptJson } from "@/lib/secrets";
import { octokitForToken } from "@/worker/github-app";
import { runPiTask, type NormalizedPiEvent } from "@/worker/pi";
import type { ClaimedRun } from "@/worker/types";

const exec = promisify(execFile);

async function main() {
  const claim = parseClaim();
  const convex = new ConvexHttpClient(requiredEnv("NEXT_PUBLIC_CONVEX_URL"));
  const token = requiredEnv("RUNNER_API_TOKEN");

  try {
    if (claim.kind === "provider_login") {
      await runProviderLogin(convex, token, claim);
      return;
    }

    const installationToken = requiredEnv("GITHUB_INSTALLATION_TOKEN");
    const workspace = await mkdtemp(path.join(tmpdir(), "cloud-agent-"));
    try {
      const repoDir = path.join(workspace, "repo");
      await cloneRepository(claim.repository.fullName, installationToken, repoDir);
      const authData = claim.credential.encryptedPayload
        ? await decryptJson<Record<string, any>>(
            claim.credential.encryptedPayload,
            requiredEnv("CREDENTIAL_ENCRYPTION_KEY"),
          )
        : {};

      await runPiTask({
        cwd: repoDir,
        authData,
        provider: claim.session.provider,
        modelId: claim.session.model,
        prompt: claim.session.prompt,
        onEvent: async (event) => streamPiEvent(convex, token, claim.runId, event),
      });

      const pr = await pushChangesIfNeeded({
        repoDir,
        fullName: claim.repository.fullName,
        installationToken,
        baseBranch: claim.repository.defaultBranch ?? "main",
        branchName: `cloud-agent/${claim.session.id.slice(-8)}`,
        title: claim.session.prompt.split("\n")[0]?.slice(0, 80) || "Cloud agent task",
      });

      await convex.mutation(convexApi.worker.finishRun, {
        token,
        runId: claim.runId,
        status: "completed",
        branchName: pr?.branchName,
        pullRequestUrl: pr?.url,
      });
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (claim.kind === "provider_login") {
      await convex.mutation(convexApi.worker.finishProviderLogin, {
        token,
        runId: claim.runId,
        status: "failed",
        error: message,
      });
    } else {
      await convex.mutation(convexApi.worker.finishRun, {
        token,
        runId: claim.runId,
        status: "failed",
        error: message,
      });
    }
    throw error;
  }
}

function parseClaim(): ClaimedRun {
  const raw = requiredEnv("CLOUD_AGENT_RUN_PAYLOAD");
  return JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as ClaimedRun;
}

async function streamPiEvent(
  convex: ConvexHttpClient,
  token: string,
  runId: string,
  event: NormalizedPiEvent,
) {
  if (event.kind === "tool") {
    await convex.mutation(convexApi.worker.upsertToolCall, {
      token,
      runId,
      toolCall: event,
    });
    return;
  }

  await convex.mutation(convexApi.worker.appendEvents, {
    token,
    runId,
    events: [
      {
        role: event.role,
        type: event.type,
        text: event.text,
        payload: event.payload,
      },
    ],
  });
}

async function runProviderLogin(
  convex: ConvexHttpClient,
  token: string,
  claim: Extract<ClaimedRun, { kind: "provider_login" }>,
) {
  const workspace = await mkdtemp(path.join(tmpdir(), "cloud-agent-auth-"));
  const authPath = path.join(workspace, "auth.json");
  try {
    const authStorage = AuthStorage.create(authPath);
    await authStorage.login(claim.provider, {
      onAuth: (info: { url: string; instructions?: string }) => {
        void publishProviderLoginProgress(convex, token, claim.runId, [
          "Open the provider authorization URL to continue.",
          info.url,
          info.instructions,
        ]);
      },
      onDeviceCode: (info: {
        verificationUri: string;
        userCode: string;
        expiresInSeconds?: number;
      }) => {
        void publishProviderLoginProgress(convex, token, claim.runId, [
          "Open the provider device-login page and enter the code.",
          `URL: ${info.verificationUri}`,
          `Code: ${info.userCode}`,
          info.expiresInSeconds
            ? `This code expires in ${Math.round(info.expiresInSeconds / 60)} minutes.`
            : undefined,
        ]);
      },
      onPrompt: async (prompt: { message: string; allowEmpty?: boolean }) => {
        if (prompt.allowEmpty || /domain|enterprise/i.test(prompt.message)) return "";
        await publishProviderLoginProgress(convex, token, claim.runId, [
          prompt.message,
          "This provider requires a manual value. Retry with a device-code provider or extend the settings UI to submit this value.",
        ]);
        throw new Error(`Provider login requires manual input: ${prompt.message}`);
      },
      onManualCodeInput: async () => {
        await publishProviderLoginProgress(convex, token, claim.runId, [
          "Waiting for browser callback or provider device-code completion.",
        ]);
        return new Promise<string>(() => {});
      },
      onProgress: (message: string) => {
        void publishProviderLoginProgress(convex, token, claim.runId, [message]);
      },
      onSelect: async (prompt: { options: Array<{ id: string }> }) => {
        return (
          prompt.options.find((option) => option.id === "device_code")?.id ??
          prompt.options.find((option) => option.id.includes("device"))?.id ??
          prompt.options[0]?.id
        );
      },
    });

    const authData = JSON.parse(await readFile(authPath, "utf8")) as Record<string, any>;
    const encryptedPayload = await encryptJson(
      authData,
      requiredEnv("CREDENTIAL_ENCRYPTION_KEY"),
    );
    const modelRegistry = ModelRegistry.inMemory(AuthStorage.inMemory(authData));
    const models = modelRegistry
      .getAvailable()
      .filter((model) => model.provider === claim.provider)
      .map((model) => model.id);

    await convex.mutation(convexApi.worker.finishProviderLogin, {
      token,
      runId: claim.runId,
      status: "active",
      encryptedPayload,
      models,
      loginInstructions: "Provider credentials captured and encrypted.",
    });
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

async function publishProviderLoginProgress(
  convex: ConvexHttpClient,
  token: string,
  runId: string,
  lines: Array<string | undefined>,
) {
  await convex.mutation(convexApi.worker.updateProviderLogin, {
    token,
    runId,
    loginInstructions: lines.filter(Boolean).join("\n"),
  });
}

async function cloneRepository(fullName: string, token: string, repoDir: string) {
  await exec("git", [
    "clone",
    `https://x-access-token:${token}@github.com/${fullName}.git`,
    repoDir,
  ]);
  await exec("git", ["remote", "set-url", "origin", `https://github.com/${fullName}.git`], {
    cwd: repoDir,
  });
}

async function pushChangesIfNeeded({
  repoDir,
  fullName,
  installationToken,
  baseBranch,
  branchName,
  title,
}: {
  repoDir: string;
  fullName: string;
  installationToken: string;
  baseBranch: string;
  branchName: string;
  title: string;
}) {
  const status = await exec("git", ["status", "--porcelain"], { cwd: repoDir });
  if (!status.stdout.trim()) return null;

  await exec("git", ["checkout", "-b", branchName], { cwd: repoDir });
  await exec("git", ["add", "-A"], { cwd: repoDir });
  await exec("git", ["-c", "user.name=Cloud Agent", "-c", "user.email=cloud-agent@users.noreply.github.com", "commit", "-m", title], {
    cwd: repoDir,
  });
  await exec(
    "git",
    ["push", `https://x-access-token:${installationToken}@github.com/${fullName}.git`, branchName],
    { cwd: repoDir },
  );

  const [owner, repo] = fullName.split("/");
  const octokit = octokitForToken(installationToken);
  const { data } = await octokit.pulls.create({
    owner,
    repo,
    title,
    head: branchName,
    base: baseBranch,
    body: "Created by Cloud Agent Handoff.",
  });

  return { branchName, url: data.html_url };
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
