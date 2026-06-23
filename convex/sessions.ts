import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { v } from "convex/values";

import { assertOwns, ensureUser, requireExistingUser } from "./lib/auth";

function titleFromPrompt(prompt: string) {
  const compact = prompt.replace(/\s+/g, " ").trim();
  if (!compact) return "New Agent";
  return compact.length > 72 ? `${compact.slice(0, 69)}...` : compact;
}

async function repositoryView(ctx: any, repositoryId: string) {
  const repo = await ctx.db.get(repositoryId);
  if (!repo) return null;
  return {
    owner: repo.owner,
    name: repo.name,
    fullName: repo.fullName,
  };
}

async function sessionView(ctx: any, session: any) {
  const repository = await repositoryView(ctx, session.repositoryId);
  return {
    _id: session._id,
    title: session.title,
    status: session.status,
    model: session.model,
    provider: session.provider,
    repository,
    prompt: session.prompt,
    branchName: session.branchName,
    pullRequestUrl: session.pullRequestUrl,
    error: session.error,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

export const list = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const user = await requireExistingUser(ctx);
    const sessions = await ctx.db
      .query("agentSessions")
      .withIndex("by_user_updated", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);

    const views = await Promise.all(sessions.map((session) => sessionView(ctx, session)));
    return views.filter((view) => view.repository);
  },
});

export const getTimeline = query({
  args: { sessionId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const user = await requireExistingUser(ctx);
    const session = await ctx.db.get(args.sessionId as any);
    if (!session || session.userId !== user._id) {
      return { session: null, events: [], toolCalls: [] };
    }

    const events = await ctx.db
      .query("sessionEvents")
      .withIndex("by_session_sequence", (q) => q.eq("sessionId", session._id))
      .order("asc")
      .collect();
    const toolCalls = await ctx.db
      .query("toolCalls")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .collect();

    return {
      session: await sessionView(ctx, session),
      events: events.map((event) => ({
        _id: event._id,
        sessionId: event.sessionId,
        sequence: event.sequence,
        role: event.role,
        type: event.type,
        text: event.text,
        payload: event.payload,
        createdAt: event.createdAt,
      })),
      toolCalls,
    };
  },
});

export const create = mutation({
  args: {
    repositoryId: v.string(),
    credentialId: v.string(),
    provider: v.string(),
    model: v.string(),
    prompt: v.string(),
  },
  returns: v.object({ sessionId: v.string() }),
  handler: async (ctx, args) => {
    const user = await ensureUser(ctx);
    const repo = await ctx.db.get(args.repositoryId as any);
    assertOwns(repo, user._id);
    const credential = await ctx.db.get(args.credentialId as any);
    assertOwns(credential, user._id);
    if (credential.status !== "active") throw new Error("Provider credential is not active");
    if (!(credential.models ?? []).includes(args.model)) {
      throw new Error("Model is not available for this credential");
    }

    const now = Date.now();
    const sessionId = await ctx.db.insert("agentSessions", {
      userId: user._id,
      repositoryId: repo._id,
      providerCredentialId: credential._id,
      provider: args.provider,
      model: args.model,
      title: titleFromPrompt(args.prompt),
      prompt: args.prompt,
      status: "queued",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("sessionEvents", {
      userId: user._id,
      sessionId,
      sequence: 1,
      role: "user",
      type: "prompt",
      text: args.prompt,
      createdAt: now,
    });

    await ctx.db.insert("workerRuns", {
      userId: user._id,
      sessionId,
      kind: "agent_session",
      status: "queued",
      attempts: 0,
      cancelRequested: false,
      createdAt: now,
      updatedAt: now,
    });

    return { sessionId };
  },
});

export const sendFollowup = mutation({
  args: { sessionId: v.string(), prompt: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireExistingUser(ctx);
    const session = await ctx.db.get(args.sessionId as any);
    assertOwns(session, user._id);
    const last = await ctx.db
      .query("sessionEvents")
      .withIndex("by_session_sequence", (q) => q.eq("sessionId", session._id))
      .order("desc")
      .first();
    const now = Date.now();

    await ctx.db.insert("sessionEvents", {
      userId: user._id,
      sessionId: session._id,
      sequence: (last?.sequence ?? 0) + 1,
      role: "user",
      type: "followup",
      text: args.prompt,
      createdAt: now,
    });
    await ctx.db.patch(session._id, { status: "queued", updatedAt: now });
    await ctx.db.insert("workerRuns", {
      userId: user._id,
      sessionId: session._id,
      kind: "agent_session",
      status: "queued",
      attempts: 0,
      cancelRequested: false,
      createdAt: now,
      updatedAt: now,
    });
    return null;
  },
});

export const cancel = mutation({
  args: { sessionId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireExistingUser(ctx);
    const session = await ctx.db.get(args.sessionId as any);
    assertOwns(session, user._id);
    const now = Date.now();
    await ctx.db.patch(session._id, {
      status: "cancel_requested",
      updatedAt: now,
    });
    const runs = await ctx.db
      .query("workerRuns")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "queued"),
          q.eq(q.field("status"), "claimed"),
          q.eq(q.field("status"), "running"),
        ),
      )
      .collect();
    for (const run of runs) {
      await ctx.db.patch(run._id, {
        status: "cancel_requested",
        cancelRequested: true,
        updatedAt: now,
      });
    }
    return null;
  },
});
