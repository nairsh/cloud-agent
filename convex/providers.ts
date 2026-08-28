import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { v } from "convex/values";

import { ensureUser, getUserByIdentity } from "./lib/auth";

export const listModels = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const user = await getUserByIdentity(ctx);
    if (!user || user.deletedAt) return [];
    const credentials = await ctx.db
      .query("providerCredentials")
      .withIndex("by_user_provider", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    return credentials.flatMap((credential) =>
      (credential.models ?? []).map((model: string) => ({
        provider: credential.provider,
        model,
        label: `${credential.provider} · ${model}`,
        credentialId: credential._id,
      })),
    );
  },
});

export const listCredentials = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const user = await getUserByIdentity(ctx);
    if (!user || user.deletedAt) return [];
    const now = Date.now();
    const credentials = await ctx.db
      .query("providerCredentials")
      .withIndex("by_user_provider", (q) => q.eq("userId", user._id))
      .collect();

    return credentials
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .map((credential) => ({
        _id: credential._id,
        provider: credential.provider,
        status: credential.status,
        models: credential.models,
        loginInstructions: credential.loginInstructions,
        error: credential.error,
        pendingForMs:
          credential.status === "pending" ? now - credential.updatedAt : undefined,
        updatedAt: credential.updatedAt,
      }));
  },
});

export const startLogin = mutation({
  args: { provider: v.string() },
  returns: v.object({ credentialId: v.string(), status: v.string() }),
  handler: async (ctx, args) => {
    const user = await ensureUser(ctx);
    const now = Date.now();

    const pendingCredentials = await ctx.db
      .query("providerCredentials")
      .withIndex("by_user_provider", (q) => q.eq("userId", user._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("provider"), args.provider),
          q.eq(q.field("status"), "pending"),
        ),
      )
      .collect();

    for (const credential of pendingCredentials) {
      await ctx.db.patch(credential._id, {
        status: "failed",
        error: "Replaced by a newer provider login attempt.",
        loginInstructions: undefined,
        updatedAt: now,
      });
    }

    const credentialId = await ctx.db.insert("providerCredentials", {
      userId: user._id,
      provider: args.provider,
      status: "pending",
      updatedAt: now,
    });

    await ctx.db.insert("workerRuns", {
      userId: user._id,
      providerCredentialId: credentialId,
      kind: "provider_login",
      status: "queued",
      attempts: 0,
      cancelRequested: false,
      createdAt: now,
      updatedAt: now,
    });

    return { credentialId, status: "queued" };
  },
});
