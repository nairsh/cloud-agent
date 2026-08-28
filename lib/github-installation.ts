import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";

export async function listInstallationIds() {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const clientId = process.env.GITHUB_APP_CLIENT_ID;
  const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET;

  if (!appId || !privateKey || !clientId || !clientSecret) {
    throw new Response("GitHub App credentials are not configured", { status: 500 });
  }

  const auth = createAppAuth({
    appId,
    privateKey,
    clientId,
    clientSecret,
  });
  const appAuth = await auth({ type: "app" });
  const octokit = new Octokit({ auth: appAuth.token });
  const installations = await octokit.paginate("GET /app/installations", {
    per_page: 100,
  });
  return installations.map((installation: any) => installation.id as number);
}

export async function loadInstallation(installationId: number) {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const clientId = process.env.GITHUB_APP_CLIENT_ID;
  const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET;

  if (!appId || !privateKey || !clientId || !clientSecret) {
    throw new Response("GitHub App credentials are not configured", { status: 500 });
  }

  const auth = createAppAuth({
    appId,
    privateKey,
    clientId,
    clientSecret,
  });
  const appAuth = await auth({ type: "app" });
  const installationAuth = await auth({ type: "installation", installationId });
  const appOctokit = new Octokit({ auth: appAuth.token });
  const octokit = new Octokit({ auth: installationAuth.token });
  const installation = await appOctokit.request("GET /app/installations/{installation_id}", {
    installation_id: installationId,
  });
  const repos = await octokit.paginate("GET /installation/repositories", {
    per_page: 100,
  });

  return {
    installationId,
    accountId: (installation.data.account as any)?.id,
    accountLogin: (installation.data.account as any)?.login,
    targetType: installation.data.target_type,
    permissions: installation.data.permissions,
    repositorySelection: installation.data.repository_selection,
    repositories: repos.map((repo: any) => ({
      id: repo.id,
      owner: repo.owner.login,
      name: repo.name,
      fullName: repo.full_name,
      private: repo.private,
      defaultBranch: repo.default_branch,
      permissions: repo.permissions,
    })),
  };
}
