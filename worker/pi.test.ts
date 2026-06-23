import { describe, expect, it } from "vitest";

import { normalizePiEvent } from "@/worker/pi";

describe("normalizePiEvent", () => {
  it("normalizes assistant text deltas", () => {
    expect(normalizePiEvent({ type: "text_delta", delta: "hello" })).toEqual({
      kind: "event",
      role: "assistant",
      type: "text_delta",
      text: "hello",
      payload: undefined,
    });
  });

  it("normalizes tool events and redacts sensitive values", () => {
    expect(
      normalizePiEvent({
        type: "tool_start",
        id: "call_1",
        toolName: "bash",
        args: { command: "echo ok", token: "gho_secret" },
      }),
    ).toEqual({
      kind: "tool",
      providerCallId: "call_1",
      toolName: "bash",
      status: "tool_start",
      args: { command: "echo ok", token: "[REDACTED]" },
      result: undefined,
      error: undefined,
    });
  });
});
