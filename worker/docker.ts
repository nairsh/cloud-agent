import { spawn } from "node:child_process";

import type { ClaimedRun, WorkerConfig } from "@/worker/types";

export async function runClaimInContainer({
  claim,
  config,
  githubInstallationToken,
}: {
  claim: ClaimedRun;
  config: WorkerConfig;
  githubInstallationToken?: string;
}) {
  const args = [
    "run",
    "--rm",
    "--network",
    "bridge",
    "-e",
    `NEXT_PUBLIC_CONVEX_URL=${config.convexUrl}`,
    "-e",
    `RUNNER_API_TOKEN=${config.runnerToken}`,
    "-e",
    `CREDENTIAL_ENCRYPTION_KEY=${config.credentialEncryptionKey}`,
    "-e",
    `CLOUD_AGENT_RUN_PAYLOAD=${Buffer.from(JSON.stringify(claim)).toString("base64url")}`,
  ];

  if (githubInstallationToken) {
    args.push("-e", `GITHUB_INSTALLATION_TOKEN=${githubInstallationToken}`);
  }

  args.push(config.containerImage);

  await new Promise<void>((resolve, reject) => {
    const child = spawn("docker", args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Container exited with code ${code}`));
    });
  });
}
