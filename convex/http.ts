import { httpActionGeneric as httpAction, httpRouter } from "convex/server";
import { Webhook } from "svix";

import { internalMutationRef } from "./lib/refs";

const http = httpRouter();

const upsertUser = internalMutationRef<
  { externalId: string; email?: string; name?: string; imageUrl?: string },
  null
>("users:upsertFromClerk");
const deleteUser = internalMutationRef<{ externalId: string }, null>(
  "users:deleteFromClerk",
);
const syncInstallation = internalMutationRef<
  {
    externalUserId: string;
    installationId: number;
    accountId: number;
    accountLogin: string;
    targetType?: string;
    permissions?: unknown;
    repositorySelection?: string;
    repositories: Array<{
      id: number;
      owner: string;
      name: string;
      fullName: string;
      private: boolean;
      defaultBranch?: string;
      permissions?: unknown;
    }>;
  },
  null
>("github:syncInstallation");

http.route({
  path: "/webhooks/clerk",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
    if (!secret) return new Response("Missing Clerk webhook secret", { status: 500 });

    const payload = await request.text();
    const headers = {
      "svix-id": request.headers.get("svix-id") ?? "",
      "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
      "svix-signature": request.headers.get("svix-signature") ?? "",
    };
    const event = new Webhook(secret).verify(payload, headers) as any;

    if (event.type === "user.deleted" && event.data.id) {
      await ctx.runMutation(deleteUser, { externalId: event.data.id });
    } else if (event.type === "user.created" || event.type === "user.updated") {
      const email = event.data.email_addresses?.find(
        (candidate: any) => candidate.id === event.data.primary_email_address_id,
      )?.email_address;
      await ctx.runMutation(upsertUser, {
        externalId: event.data.id,
        email,
        name: [event.data.first_name, event.data.last_name].filter(Boolean).join(" ") || undefined,
        imageUrl: event.data.image_url,
      });
    }

    return new Response("ok");
  }),
});

http.route({
  path: "/webhooks/github",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret) return new Response("Missing GitHub webhook secret", { status: 500 });

    const body = await request.text();
    const signature = request.headers.get("x-hub-signature-256");
    const valid = await verifyGitHubSignature(secret, body, signature);
    if (!valid) return new Response("Invalid signature", { status: 401 });

    const eventName = request.headers.get("x-github-event");
    const payload = JSON.parse(body);

    if (eventName === "installation" || eventName === "installation_repositories") {
      const externalUserId =
        payload.sender?.node_id ?? payload.sender?.id?.toString() ?? undefined;
      if (!externalUserId) return new Response("No sender id", { status: 202 });
      const repositories = (
        payload.repositories ??
        payload.repositories_added ??
        payload.installation?.repositories ??
        []
      ).map((repo: any) => normalizeRepository(repo));

      await ctx.runMutation(syncInstallation, {
        externalUserId,
        installationId: payload.installation.id,
        accountId: payload.installation.account.id,
        accountLogin: payload.installation.account.login,
        targetType: payload.installation.target_type,
        permissions: payload.installation.permissions,
        repositorySelection: payload.installation.repository_selection,
        repositories,
      });
    }

    return new Response("ok");
  }),
});

function normalizeRepository(repo: any) {
  const fullName = repo.full_name ?? `${repo.owner?.login ?? ""}/${repo.name}`;
  const [owner, name] = fullName.split("/");
  return {
    id: repo.id,
    owner,
    name: repo.name ?? name,
    fullName,
    private: Boolean(repo.private),
    defaultBranch: repo.default_branch,
    permissions: repo.permissions,
  };
}

async function verifyGitHubSignature(
  secret: string,
  body: string,
  signature: string | null,
) {
  if (!signature?.startsWith("sha256=")) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const expected = `sha256=${Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
  return timingSafeEqual(expected, signature);
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

export default http;
