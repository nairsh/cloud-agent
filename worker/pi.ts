import {
  AuthStorage,
  createAgentSession,
  ModelRegistry,
} from "@earendil-works/pi-coding-agent";

import { redactSecrets } from "@/lib/redaction";

export type NormalizedPiEvent =
  | {
      kind: "event";
      role: "assistant" | "system" | "tool";
      type: string;
      streamOrder?: number;
      text?: string;
      payload?: unknown;
    }
  | {
      kind: "tool";
      streamOrder?: number;
      providerCallId?: string;
      toolName: string;
      status: string;
      args?: unknown;
      result?: unknown;
      error?: string;
    };

export async function runPiTask({
  cwd,
  authData,
  provider,
  modelId,
  prompt,
  onEvent,
}: {
  cwd: string;
  authData: Record<string, any>;
  provider: string;
  modelId: string;
  prompt: string;
  onEvent: (event: NormalizedPiEvent) => Promise<void>;
}) {
  const authStorage = AuthStorage.inMemory(authData);
  const modelRegistry = ModelRegistry.inMemory(authStorage);
  const model =
    modelRegistry.find(provider, modelId) ??
    modelRegistry.getAvailable().find((candidate) => candidate.id === modelId);

  if (!model) throw new Error(`Model ${provider}/${modelId} is not available`);

  const { session } = await createAgentSession({
    cwd,
    authStorage,
    modelRegistry,
    model,
  });

  let streamOrder = 0;
  let streamWrites = Promise.resolve();
  const unsubscribe = session.subscribe((event: unknown) => {
    const normalized = normalizePiEvent(event);
    if (!normalized) return;
    streamOrder += 1;
    streamWrites = streamWrites.then(() => onEvent({ ...normalized, streamOrder }));
  });

  try {
    await session.prompt(prompt);
  } finally {
    unsubscribe();
    await streamWrites;
  }
}

export function normalizePiEvent(event: unknown): NormalizedPiEvent | null {
  const value = redactSecrets(event) as any;
  if (!value || typeof value !== "object") return null;

  if (value.type?.includes?.("tool")) {
    return {
      kind: "tool",
      providerCallId: value.id ?? value.toolCallId ?? value.callId,
      toolName: value.name ?? value.toolName ?? "tool",
      status: value.status ?? value.type,
      args: value.args ?? value.input,
      result: value.result ?? value.output,
      error: value.error ?? value.errorMessage,
    };
  }

  const text =
    typeof value.text === "string"
      ? value.text
      : typeof value.delta === "string"
        ? value.delta
        : typeof value.message === "string"
          ? value.message
          : undefined;

  return {
    kind: "event",
    role: value.role === "tool" ? "tool" : value.role === "system" ? "system" : "assistant",
    type: value.type ?? "pi_event",
    text,
    payload: text ? undefined : value,
  };
}
