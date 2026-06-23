import { describe, expect, it } from "vitest";

import { redactSecrets } from "@/lib/redaction";

describe("redactSecrets", () => {
  it("redacts secret-like keys recursively", () => {
    expect(
      redactSecrets({
        token: "gho_abc123",
        nested: { apiKey: "sk-test", visible: "ok" },
      }),
    ).toEqual({
      token: "[REDACTED]",
      nested: { apiKey: "[REDACTED]", visible: "ok" },
    });
  });

  it("redacts known token patterns in text", () => {
    expect(redactSecrets("push https://gho_secret123@github.com/repo.git")).toBe(
      "push https://[REDACTED]@github.com/repo.git",
    );
  });
});
