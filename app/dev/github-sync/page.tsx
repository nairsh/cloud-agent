import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { notFound, redirect } from "next/navigation";

import { convexApi } from "@/lib/convex-api";
import { listInstallationIds, loadInstallation } from "@/lib/github-installation";

export default async function DevGitHubSyncPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const authState = await auth();
  if (!authState.userId) redirect("/sign-in");

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");

  const convexToken = await authState.getToken({ template: "convex" });
  if (!convexToken) throw new Error("Clerk Convex JWT template is not configured");

  const installationIds = await listInstallationIds();
  const convex = new ConvexHttpClient(convexUrl, { auth: convexToken });

  for (const installationId of installationIds) {
    const installation = await loadInstallation(installationId);
    await convex.mutation(convexApi.github.syncInstallationForCurrentUser, installation);
  }

  redirect("/app/settings");
}
