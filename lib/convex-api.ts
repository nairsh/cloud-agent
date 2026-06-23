import { makeFunctionReference } from "convex/server";

import type {
  AgentSessionSummary,
  ModelOption,
  RepositoryOption,
  TimelineResult,
  Viewer,
} from "@/lib/types";

export const convexApi = {
  viewer: {
    get: makeFunctionReference<"query", Record<string, never>, Viewer>(
      "viewer:get",
    ),
  },
  github: {
    listRepositories: makeFunctionReference<
      "query",
      Record<string, never>,
      RepositoryOption[]
    >("github:listRepositories"),
    syncInstallationForCurrentUser: makeFunctionReference<
      "mutation",
      {
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
    >("github:syncInstallationForCurrentUser"),
  },
  providers: {
    listModels: makeFunctionReference<
      "query",
      Record<string, never>,
      ModelOption[]
    >("providers:listModels"),
    startLogin: makeFunctionReference<
      "mutation",
      { provider: string },
      { credentialId: string; status: string }
    >("providers:startLogin"),
  },
  sessions: {
    list: makeFunctionReference<
      "query",
      Record<string, never>,
      AgentSessionSummary[]
    >("sessions:list"),
    getTimeline: makeFunctionReference<
      "query",
      { sessionId: string },
      TimelineResult
    >("sessions:getTimeline"),
    create: makeFunctionReference<
      "mutation",
      {
        repositoryId: string;
        credentialId: string;
        provider: string;
        model: string;
        prompt: string;
      },
      { sessionId: string }
    >("sessions:create"),
    sendFollowup: makeFunctionReference<
      "mutation",
      { sessionId: string; prompt: string },
      null
    >("sessions:sendFollowup"),
    cancel: makeFunctionReference<"mutation", { sessionId: string }, null>(
      "sessions:cancel",
    ),
  },
  worker: {
    claimNextRun: makeFunctionReference<
      "mutation",
      { token: string; workerId: string },
      unknown
    >("worker:claimNextRun"),
    appendEvents: makeFunctionReference<
      "mutation",
      { token: string; runId: string; events: unknown[] },
      null
    >("worker:appendEvents"),
    upsertToolCall: makeFunctionReference<
      "mutation",
      { token: string; runId: string; toolCall: unknown },
      null
    >("worker:upsertToolCall"),
    finishRun: makeFunctionReference<
      "mutation",
      {
        token: string;
        runId: string;
        status: "completed" | "failed" | "cancelled";
        error?: string;
        branchName?: string;
        pullRequestUrl?: string;
      },
      null
    >("worker:finishRun"),
    finishProviderLogin: makeFunctionReference<
      "mutation",
      {
        token: string;
        runId: string;
        status: "active" | "failed";
        encryptedPayload?: {
          algorithm: string;
          nonce: string;
          ciphertext: string;
        };
        models?: string[];
        loginInstructions?: string;
        error?: string;
      },
      null
    >("worker:finishProviderLogin"),
  },
};
