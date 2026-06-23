import { mutationGeneric as mutation } from "convex/server";
import { v } from "convex/values";

function assertWorkerToken(token: string) {
  const expected = process.env.RUNNER_API_TOKEN;
  if (!expected || token !== expected) throw new Error("Unauthorized worker");
}

async function nextSequence(ctx: any, sessionId: string) {
  const last = await ctx.db
    .query("sessionEvents")
    .withIndex("by_session_sequence", (q: any) => q.eq("sessionId", sessionId))
    .order("desc")
    .first();
  return (last?.sequence ?? 0) + 1;
}

export const claimNextRun = mutation({
  args: { token: v.string(), workerId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    assertWorkerToken(args.token);
    const run = await ctx.db
      .query("workerRuns")
      .withIndex("by_status_created", (q) => q.eq("status", "queued"))
      .order("asc")
      .first();
    if (!run) return null;

    const now = Date.now();
    await ctx.db.patch(run._id, {
      status: "claimed",
      workerId: args.workerId,
      attempts: run.attempts + 1,
      claimedAt: now,
      heartbeatAt: now,
      updatedAt: now,
    });

    if (run.kind === "provider_login") {
      const credential = run.providerCredentialId
        ? await ctx.db.get(run.providerCredentialId)
        : null;
      if (!credential) throw new Error("Provider credential missing");
      return {
        runId: run._id,
        kind: run.kind,
        providerCredentialId: credential._id,
        provider: credential.provider,
      };
    }

    const session = run.sessionId ? await ctx.db.get(run.sessionId) : null;
    if (!session) throw new Error("Session missing");
    const repo = await ctx.db.get(session.repositoryId);
    const credential = await ctx.db.get(session.providerCredentialId);
    if (!repo || !credential) throw new Error("Session dependencies missing");

    await ctx.db.patch(session._id, { status: "running", updatedAt: now });

    return {
      runId: run._id,
      kind: run.kind,
      session: {
        id: session._id,
        prompt: session.prompt,
        model: session.model,
        provider: session.provider,
      },
      repository: {
        id: repo.githubRepositoryId,
        installationId: repo.installationId,
        owner: repo.owner,
        name: repo.name,
        fullName: repo.fullName,
        defaultBranch: repo.defaultBranch,
      },
      credential: {
        id: credential._id,
        provider: credential.provider,
        encryptedPayload: credential.encryptedPayload,
      },
    };
  },
});

export const appendEvents = mutation({
  args: {
    token: v.string(),
    runId: v.string(),
    events: v.array(
      v.object({
        role: v.union(
          v.literal("user"),
          v.literal("assistant"),
          v.literal("system"),
          v.literal("tool"),
        ),
        type: v.string(),
        text: v.optional(v.string()),
        payload: v.optional(v.any()),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertWorkerToken(args.token);
    const run = await ctx.db.get(args.runId as any);
    if (!run?.sessionId) throw new Error("Run does not belong to a session");
    const session = await ctx.db.get(run.sessionId);
    if (!session) throw new Error("Session missing");

    let sequence = await nextSequence(ctx, session._id);
    const now = Date.now();
    for (const event of args.events) {
      await ctx.db.insert("sessionEvents", {
        userId: session.userId,
        sessionId: session._id,
        workerRunId: run._id,
        sequence,
        role: event.role,
        type: event.type,
        text: event.text,
        payload: event.payload,
        createdAt: now,
      });
      sequence += 1;
    }
    await ctx.db.patch(run._id, { heartbeatAt: now, updatedAt: now });
    await ctx.db.patch(session._id, { updatedAt: now });
    return null;
  },
});

export const upsertToolCall = mutation({
  args: {
    token: v.string(),
    runId: v.string(),
    toolCall: v.object({
      providerCallId: v.optional(v.string()),
      toolName: v.string(),
      status: v.string(),
      args: v.optional(v.any()),
      result: v.optional(v.any()),
      error: v.optional(v.string()),
      startedAt: v.optional(v.number()),
      finishedAt: v.optional(v.number()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertWorkerToken(args.token);
    const run = await ctx.db.get(args.runId as any);
    if (!run?.sessionId) throw new Error("Run does not belong to a session");
    const session = await ctx.db.get(run.sessionId);
    if (!session) throw new Error("Session missing");

    const now = Date.now();
    const existing = args.toolCall.providerCallId
      ? await ctx.db
          .query("toolCalls")
          .withIndex("by_provider_call", (q) =>
            q.eq("providerCallId", args.toolCall.providerCallId),
          )
          .unique()
      : null;
    const patch = {
      userId: session.userId,
      sessionId: session._id,
      workerRunId: run._id,
      providerCallId: args.toolCall.providerCallId,
      toolName: args.toolCall.toolName,
      status: args.toolCall.status,
      args: args.toolCall.args,
      result: args.toolCall.result,
      error: args.toolCall.error,
      startedAt: args.toolCall.startedAt,
      finishedAt: args.toolCall.finishedAt,
      updatedAt: now,
    };

    if (existing) await ctx.db.patch(existing._id, patch);
    else await ctx.db.insert("toolCalls", patch);
    await ctx.db.patch(run._id, { heartbeatAt: now, updatedAt: now });
    return null;
  },
});

export const finishRun = mutation({
  args: {
    token: v.string(),
    runId: v.string(),
    status: v.union(v.literal("completed"), v.literal("failed"), v.literal("cancelled")),
    error: v.optional(v.string()),
    branchName: v.optional(v.string()),
    pullRequestUrl: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertWorkerToken(args.token);
    const run = await ctx.db.get(args.runId as any);
    if (!run) throw new Error("Run not found");
    const now = Date.now();

    await ctx.db.patch(run._id, {
      status: args.status,
      error: args.error,
      heartbeatAt: now,
      updatedAt: now,
    });

    if (run.sessionId) {
      const sessionStatus =
        args.status === "completed"
          ? "completed"
          : args.status === "cancelled"
            ? "cancelled"
            : "failed";
      await ctx.db.patch(run.sessionId, {
        status: sessionStatus,
        error: args.error,
        branchName: args.branchName,
        pullRequestUrl: args.pullRequestUrl,
        updatedAt: now,
      });
    }

    return null;
  },
});

export const finishProviderLogin = mutation({
  args: {
    token: v.string(),
    runId: v.string(),
    status: v.union(v.literal("active"), v.literal("failed")),
    encryptedPayload: v.optional(
      v.object({
        algorithm: v.string(),
        nonce: v.string(),
        ciphertext: v.string(),
      }),
    ),
    models: v.optional(v.array(v.string())),
    loginInstructions: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertWorkerToken(args.token);
    const run = await ctx.db.get(args.runId as any);
    if (!run?.providerCredentialId) {
      throw new Error("Run does not belong to a provider credential");
    }
    const now = Date.now();
    await ctx.db.patch(run.providerCredentialId, {
      status: args.status,
      encryptedPayload: args.encryptedPayload,
      models: args.models,
      loginInstructions: args.loginInstructions,
      error: args.error,
      updatedAt: now,
    });
    await ctx.db.patch(run._id, {
      status: args.status === "active" ? "completed" : "failed",
      error: args.error,
      heartbeatAt: now,
      updatedAt: now,
    });
    return null;
  },
});

export const updateProviderLogin = mutation({
  args: {
    token: v.string(),
    runId: v.string(),
    loginInstructions: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertWorkerToken(args.token);
    const run = await ctx.db.get(args.runId as any);
    if (!run?.providerCredentialId) {
      throw new Error("Run does not belong to a provider credential");
    }
    const now = Date.now();
    await ctx.db.patch(run.providerCredentialId, {
      status: "pending",
      loginInstructions: args.loginInstructions,
      error: args.error,
      updatedAt: now,
    });
    await ctx.db.patch(run._id, {
      status: "running",
      error: args.error,
      heartbeatAt: now,
      updatedAt: now,
    });
    return null;
  },
});
