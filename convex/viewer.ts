import { queryGeneric as query } from "convex/server";
import { v } from "convex/values";

import { getUserByIdentity } from "./lib/auth";

export const get = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const user = await getUserByIdentity(ctx);
    if (!user || user.deletedAt) return null;

    const installation = await ctx.db
      .query("githubInstallations")
      .withIndex("by_user_installation", (q) => q.eq("userId", user._id))
      .first();
    const credential = await ctx.db
      .query("providerCredentials")
      .withIndex("by_user_provider", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    return {
      userId: user._id,
      name: user.name,
      email: user.email,
      imageUrl: user.imageUrl,
      hasGithubInstallation: Boolean(installation),
      hasProviderCredentials: Boolean(credential),
    };
  },
});
