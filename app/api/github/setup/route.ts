import { auth, clerkClient } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

import { convexApi } from "@/lib/convex-api";

export async function GET(request: NextRequest) {
  const authState = await auth();
  const { userId } = authState;
  if (!userId) redirect("/sign-in");

  const installationIdRaw = request.nextUrl.searchParams.get("installation_id");
  const installationId = installationIdRaw ? Number(installationIdRaw) : NaN;
  if (!Number.isFinite(installationId)) {
    return NextResponse.json({ error: "Missing installation_id" }, { status: 400 });
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json({ error: "NEXT_PUBLIC_CONVEX_URL is not configured" }, { status: 500 });
  }

  const convexToken = await authState.getToken({ template: "convex" });
  if (!convexToken) {
    return NextResponse.json(
      { error: "Clerk Convex JWT template is not configured" },
      { status: 500 },
    );
  }

  await assertUserCanAccessInstallation(userId, installationId);
  const installation = await loadInstallation(installationId);
  const convex = new ConvexHttpClient(convexUrl, { auth: convexToken });
  await convex.mutation(convexApi.github.syncInstallationForCurrentUser, installation);

  redirect("/app/settings");
}

async function assertUserCanAccessInstallation(userId: string, installationId: number) {
  const client = await clerkClient();
  const tokenResponse = await client.users.getUserOauthAccessToken(userId, "github");
  const token = tokenResponse.data[0]?.token;
  if (!token) {
    throw new Response("GitHub OAuth token is required to verify installation ownership", {
      status: 403,
    });
  }

  const octokit = new Octokit({ auth: token });
  const installations = await octokit.paginate("GET /user/installations", {
    per_page: 100,
  });
  if (!installations.some((installation: any) => installation.id === installationId)) {
    throw new Response("Installation is not accessible to this user", { status: 403 });
  }
}

async function loadInstallation(installationId: number) {
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
  const installationAuth = await auth({ type: "installation", installationId });
  const octokit = new Octokit({ auth: installationAuth.token });
  const installation = await octokit.request("GET /app/installations/{installation_id}", {
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
