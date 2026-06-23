import type { WorkerConfig } from "@/worker/types";

export function loadWorkerConfig(): WorkerConfig {
  const config = {
    convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL,
    runnerToken: process.env.RUNNER_API_TOKEN,
    workerId: process.env.WORKER_ID ?? `worker-${process.pid}`,
    containerImage: process.env.RUNNER_CONTAINER_IMAGE,
    credentialEncryptionKey: process.env.CREDENTIAL_ENCRYPTION_KEY,
    githubAppId: process.env.GITHUB_APP_ID,
    githubAppPrivateKey: process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  };

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new Error(`Missing worker configuration: ${missing.join(", ")}`);
  }

  return config as WorkerConfig;
}
