import {
  internalMutationGeneric as internalMutation,
  mutationGeneric as mutation,
  queryGeneric as query,
} from "convex/server";
import { v } from "convex/values";

import { ensureUser, getUserByIdentity } from "./lib/auth";

export const listRepositories = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const user = await getUserByIdentity(ctx);
    if (!user || user.deletedAt) return [];
    const repos = await ctx.db
      .query("repositories")
      .withIndex("by_user_fullName", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("active"), true))
      .collect();

    return repos.map((repo) => ({
      _id: repo._id,
      githubRepositoryId: repo.githubRepositoryId,
      installationId: repo.installationId,
      owner: repo.owner,
      name: repo.name,
      fullName: repo.fullName,
      private: repo.private,
      defaultBranch: repo.defaultBranch,
    }));
  },
});

async function syncInstallationForUser(ctx: any, user: any, args: any) {
  const now = Date.now();
  const existing = await ctx.db
    .query("githubInstallations")
    .withIndex("by_user_installation", (q: any) =>
      q.eq("userId", user._id).eq("installationId", args.installationId),
    )
    .unique();

  const installationDocId =
    existing?._id ??
    (await ctx.db.insert("githubInstallations", {
      userId: user._id,
      installationId: args.installationId,
      accountId: args.accountId,
      accountLogin: args.accountLogin,
      targetType: args.targetType,
      permissions: args.permissions,
      repositorySelection: args.repositorySelection,
      updatedAt: now,
    }));

  if (existing) {
    await ctx.db.patch(existing._id, {
      accountId: args.accountId,
      accountLogin: args.accountLogin,
      targetType: args.targetType,
      permissions: args.permissions,
      repositorySelection: args.repositorySelection,
      suspendedAt: undefined,
      updatedAt: now,
    });
  }

  const syncedIds = new Set(args.repositories.map((repo: any) => repo.id));
  const current = await ctx.db
    .query("repositories")
    .withIndex("by_installation", (q: any) => q.eq("installationId", args.installationId))
    .collect();

  for (const repo of current) {
    if (!syncedIds.has(repo.githubRepositoryId)) {
      await ctx.db.patch(repo._id, { active: false, updatedAt: now });
    }
  }

  for (const repo of args.repositories) {
    const existingRepo = current.find(
      (candidate: any) => candidate.githubRepositoryId === repo.id,
    );
    const patch = {
      userId: user._id,
      installationDocId,
      installationId: args.installationId,
      githubRepositoryId: repo.id,
      owner: repo.owner,
      name: repo.name,
      fullName: repo.fullName,
      private: repo.private,
      defaultBranch: repo.defaultBranch,
      active: true,
      permissions: repo.permissions,
      updatedAt: now,
    };

    if (existingRepo) await ctx.db.patch(existingRepo._id, patch);
    else await ctx.db.insert("repositories", patch);
  }
}

const installationArgs = {
  installationId: v.number(),
  accountId: v.number(),
  accountLogin: v.string(),
  targetType: v.optional(v.string()),
  permissions: v.optional(v.any()),
  repositorySelection: v.optional(v.string()),
  repositories: v.array(
    v.object({
      id: v.number(),
      owner: v.string(),
      name: v.string(),
      fullName: v.string(),
      private: v.boolean(),
      defaultBranch: v.optional(v.string()),
      permissions: v.optional(v.any()),
    }),
  ),
};

export const syncInstallationForCurrentUser = mutation({
  args: installationArgs,
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ensureUser(ctx);
    await syncInstallationForUser(ctx, user, args);
    return null;
  },
});

export const syncInstallation = internalMutation({
  args: {
    externalUserId: v.string(),
    ...installationArgs,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", args.externalUserId))
      .unique();
    if (!user) return null;

    await syncInstallationForUser(ctx, user, args);
    return null;
  },
});
