import { describe, expect, it } from "vitest";

import {
  buildPromptWithAttachments,
  isReadableAttachment,
  MAX_ATTACHMENT_BYTES,
} from "@/lib/prompt-attachments";

describe("prompt attachments", () => {
  it("accepts small text and code files", () => {
    expect(isReadableAttachment({ name: "notes.txt", type: "text/plain", size: 120 })).toBe(true);
    expect(isReadableAttachment({ name: "component.tsx", type: "", size: 120 })).toBe(true);
  });

  it("rejects large or binary-looking files", () => {
    expect(
      isReadableAttachment({
        name: "screenshot.png",
        type: "image/png",
        size: 120,
      }),
    ).toBe(false);
    expect(
      isReadableAttachment({
        name: "large.txt",
        type: "text/plain",
        size: MAX_ATTACHMENT_BYTES + 1,
      }),
    ).toBe(false);
  });

  it("appends readable file content as explicit prompt context", () => {
    expect(
      buildPromptWithAttachments("Review this", [
        {
          id: "1",
          name: "notes.md",
          type: "text/markdown",
          size: 14,
          content: "# Notes\nShip it\n",
        },
      ]),
    ).toBe(
      [
        "Review this",
        "",
        "Attached files for context:",
        "",
        "Attachment 1: notes.md",
        "Type: text/markdown",
        "Content:",
        "```",
        "# Notes\nShip it",
        "```",
      ].join("\n"),
    );
  });
});
