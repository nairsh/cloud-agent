import { internalMutationGeneric as internalMutation } from "convex/server";
import { v } from "convex/values";

export const upsertFromClerk = internalMutation({
  args: {
    externalId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", args.externalId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        name: args.name,
        imageUrl: args.imageUrl,
        deletedAt: undefined,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("users", {
        externalId: args.externalId,
        email: args.email,
        name: args.name,
        imageUrl: args.imageUrl,
        updatedAt: now,
      });
    }

    return null;
  },
});

export const deleteFromClerk = internalMutation({
  args: { externalId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", args.externalId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        deletedAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});
