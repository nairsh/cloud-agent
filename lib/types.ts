export type SessionStatus =
  | "queued"
  | "running"
  | "waiting_for_input"
  | "cancel_requested"
  | "cancelled"
  | "failed"
  | "completed";

export type WorkerRunStatus =
  | "queued"
  | "claimed"
  | "running"
  | "cancel_requested"
  | "failed"
  | "completed";

export type EventRole = "user" | "assistant" | "system" | "tool";

export type SessionEvent = {
  _id: string;
  sessionId: string;
  sequence: number;
  role: EventRole;
  type: string;
  text?: string;
  payload?: unknown;
  createdAt: number;
};

export type AgentSessionSummary = {
  _id: string;
  title: string;
  status: SessionStatus;
  model: string;
  provider: string;
  repository: {
    owner: string;
    name: string;
    fullName: string;
  };
  updatedAt: number;
  createdAt: number;
};

export type AgentSessionDetail = AgentSessionSummary & {
  prompt: string;
  branchName?: string;
  pullRequestUrl?: string;
  error?: string;
};

export type RepositoryOption = {
  _id: string;
  githubRepositoryId: number;
  installationId: number;
  owner: string;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch?: string;
};

export type ModelOption = {
  provider: string;
  model: string;
  label: string;
  credentialId: string;
};

export type ProviderCredentialSummary = {
  _id: string;
  provider: string;
  status: "pending" | "active" | "failed" | "revoked";
  models?: string[];
  loginInstructions?: string;
  error?: string;
  updatedAt: number;
};

export type Viewer = {
  userId: string;
  name?: string;
  email?: string;
  imageUrl?: string;
  hasGithubInstallation: boolean;
  hasProviderCredentials: boolean;
} | null;

export type TimelineResult = {
  session: AgentSessionDetail | null;
  events: SessionEvent[];
  toolCalls: Array<{
    _id: string;
    toolName: string;
    status: string;
    args?: unknown;
    result?: unknown;
    error?: string;
    startedAt?: number;
    finishedAt?: number;
  }>;
};
