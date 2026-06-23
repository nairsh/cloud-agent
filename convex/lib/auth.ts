export async function getUserByIdentity(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("byExternalId", (q: any) => q.eq("externalId", identity.subject))
    .unique();
}

export async function requireExistingUser(ctx: any) {
  const user = await getUserByIdentity(ctx);
  if (!user) throw new Error("User is not synced");
  return user;
}

export async function ensureUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");

  const existing = await ctx.db
    .query("users")
    .withIndex("byExternalId", (q: any) => q.eq("externalId", identity.subject))
    .unique();

  if (existing) return existing;

  const now = Date.now();
  const userId = await ctx.db.insert("users", {
    externalId: identity.subject,
    email: identity.email,
    name: identity.name,
    imageUrl: identity.pictureUrl,
    updatedAt: now,
  });
  return await ctx.db.get(userId);
}

export function assertOwns(doc: any, userId: string) {
  if (!doc || doc.userId !== userId) throw new Error("Not found");
}
