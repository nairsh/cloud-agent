import { ConvexHttpClient } from "convex/browser";

import { convexApi } from "@/lib/convex-api";
import { loadWorkerConfig } from "@/worker/config";
import { runClaimInContainer } from "@/worker/docker";
import { createInstallationToken } from "@/worker/github-app";
import type { ClaimedRun } from "@/worker/types";

async function main() {
  const config = loadWorkerConfig();
  const convex = new ConvexHttpClient(config.convexUrl);

  while (true) {
    const claim = (await convex.mutation(convexApi.worker.claimNextRun, {
      token: config.runnerToken,
      workerId: config.workerId,
    })) as ClaimedRun | null;

    if (!claim) {
      await sleep(2500);
      continue;
    }

    try {
      const githubInstallationToken =
        claim.kind === "agent_session"
          ? await createInstallationToken({
              appId: config.githubAppId,
              privateKey: config.githubAppPrivateKey,
              installationId: claim.repository.installationId,
              repositoryId: claim.repository.id,
            })
          : undefined;

      await runClaimInContainer({
        claim,
        config,
        githubInstallationToken,
      });
    } catch (error) {
      await convex.mutation(convexApi.worker.finishRun, {
        token: config.runnerToken,
        runId: claim.runId,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
