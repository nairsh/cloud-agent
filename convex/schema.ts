import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const encryptedPayload = v.object({
  algorithm: v.string(),
  nonce: v.string(),
  ciphertext: v.string(),
});

export default defineSchema({
  users: defineTable({
    externalId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    deletedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("byExternalId", ["externalId"])
    .index("byEmail", ["email"]),

  githubInstallations: defineTable({
    userId: v.id("users"),
    installationId: v.number(),
    accountId: v.number(),
    accountLogin: v.string(),
    targetType: v.optional(v.string()),
    permissions: v.optional(v.any()),
    repositorySelection: v.optional(v.string()),
    suspendedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_user_installation", ["userId", "installationId"])
    .index("by_installation", ["installationId"]),

  repositories: defineTable({
    userId: v.id("users"),
    installationDocId: v.id("githubInstallations"),
    installationId: v.number(),
    githubRepositoryId: v.number(),
    owner: v.string(),
    name: v.string(),
    fullName: v.string(),
    private: v.boolean(),
    defaultBranch: v.optional(v.string()),
    active: v.boolean(),
    permissions: v.optional(v.any()),
    updatedAt: v.number(),
  })
    .index("by_user_fullName", ["userId", "fullName"])
    .index("by_githubRepositoryId", ["githubRepositoryId"])
    .index("by_installation", ["installationId"]),

  providerCredentials: defineTable({
    userId: v.id("users"),
    provider: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("failed"),
      v.literal("revoked"),
    ),
    encryptedPayload: v.optional(encryptedPayload),
    models: v.optional(v.array(v.string())),
    loginInstructions: v.optional(v.string()),
    error: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_user_provider", ["userId", "provider"])
    .index("by_status", ["status"]),

  agentSessions: defineTable({
    userId: v.id("users"),
    repositoryId: v.id("repositories"),
    providerCredentialId: v.id("providerCredentials"),
    provider: v.string(),
    model: v.string(),
    title: v.string(),
    prompt: v.string(),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("waiting_for_input"),
      v.literal("cancel_requested"),
      v.literal("cancelled"),
      v.literal("failed"),
      v.literal("completed"),
    ),
    branchName: v.optional(v.string()),
    pullRequestUrl: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_updated", ["userId", "updatedAt"])
    .index("by_user_status", ["userId", "status"])
    .index("by_repository", ["repositoryId"]),

  sessionEvents: defineTable({
    userId: v.id("users"),
    sessionId: v.id("agentSessions"),
    workerRunId: v.optional(v.id("workerRuns")),
    sequence: v.number(),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system"),
      v.literal("tool"),
    ),
    type: v.string(),
    text: v.optional(v.string()),
    payload: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_session_sequence", ["sessionId", "sequence"])
    .index("by_user_created", ["userId", "createdAt"]),

  toolCalls: defineTable({
    userId: v.id("users"),
    sessionId: v.id("agentSessions"),
    workerRunId: v.optional(v.id("workerRuns")),
    providerCallId: v.optional(v.string()),
    toolName: v.string(),
    status: v.string(),
    args: v.optional(v.any()),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_status", ["status"])
    .index("by_provider_call", ["providerCallId"]),

  workerRuns: defineTable({
    userId: v.id("users"),
    sessionId: v.optional(v.id("agentSessions")),
    providerCredentialId: v.optional(v.id("providerCredentials")),
    kind: v.union(v.literal("agent_session"), v.literal("provider_login")),
    status: v.union(
      v.literal("queued"),
      v.literal("claimed"),
      v.literal("running"),
      v.literal("cancel_requested"),
      v.literal("failed"),
      v.literal("completed"),
    ),
    workerId: v.optional(v.string()),
    attempts: v.number(),
    cancelRequested: v.boolean(),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    claimedAt: v.optional(v.number()),
    heartbeatAt: v.optional(v.number()),
  })
    .index("by_status_created", ["status", "createdAt"])
    .index("by_session", ["sessionId"])
    .index("by_worker", ["workerId"]),
});
