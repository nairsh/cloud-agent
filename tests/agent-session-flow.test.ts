import { describe, expect, it } from "vitest";

import { blocksFollowup } from "@/convex/sessions";
import { promptForClaim, runWasCancelled, sessionStatusForFinishedRun } from "@/convex/worker";

describe("agent session flow helpers", () => {
  it("uses the latest user event when a follow-up run is claimed", () => {
    expect(
      promptForClaim("Read package name", {
        text: "Read package version",
      }),
    ).toBe("Read package version");
  });

  it("falls back to the original session prompt when no user event is available", () => {
    expect(promptForClaim("Read package name", null)).toBe("Read package name");
  });

  it("blocks follow-ups while a run is already active", () => {
    expect(blocksFollowup("queued")).toBe(true);
    expect(blocksFollowup("running")).toBe(true);
    expect(blocksFollowup("cancel_requested")).toBe(true);
  });

  it("allows follow-ups after terminal states", () => {
    expect(blocksFollowup("completed")).toBe(false);
    expect(blocksFollowup("failed")).toBe(false);
    expect(blocksFollowup("cancelled")).toBe(false);
  });

  it("detects cancellation from requested or terminal worker run state", () => {
    expect(runWasCancelled({ status: "cancel_requested" })).toBe(true);
    expect(runWasCancelled({ status: "cancelled" })).toBe(true);
    expect(runWasCancelled({ status: "running", cancelRequested: true })).toBe(true);
    expect(runWasCancelled({ status: "running", cancelRequested: false })).toBe(false);
  });

  it("preserves cancellation when a worker reports completion late", () => {
    expect(
      sessionStatusForFinishedRun(
        "completed",
        { status: "cancel_requested", cancelRequested: true },
        { status: "cancel_requested" },
      ),
    ).toBe("cancelled");
  });

  it("maps ordinary worker finish statuses to session statuses", () => {
    expect(
      sessionStatusForFinishedRun(
        "completed",
        { status: "running", cancelRequested: false },
        { status: "running" },
      ),
    ).toBe("completed");
    expect(
      sessionStatusForFinishedRun(
        "failed",
        { status: "running", cancelRequested: false },
        { status: "running" },
      ),
    ).toBe("failed");
  });
});
