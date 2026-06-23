import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";

export async function createInstallationToken({
  appId,
  privateKey,
  installationId,
  repositoryId,
}: {
  appId: string;
  privateKey: string;
  installationId: number;
  repositoryId: number;
}) {
  const auth = createAppAuth({ appId, privateKey });
  const installationAuth = await auth({
    type: "installation",
    installationId,
    repositoryIds: [repositoryId],
    permissions: {
      contents: "write",
      pull_requests: "write",
      metadata: "read",
    },
  });
  return installationAuth.token;
}

export function octokitForToken(token: string) {
  return new Octokit({ auth: token });
}
