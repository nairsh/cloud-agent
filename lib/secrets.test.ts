import { describe, expect, it } from "vitest";

import { decryptJson, encryptJson } from "@/lib/secrets";

describe("credential encryption", () => {
  it("round-trips JSON payloads without storing plaintext", async () => {
    const payload = { github: { accessToken: "gho_secret", expiresAt: 123 } };
    const encrypted = await encryptJson(payload, "test-key-material");

    expect(encrypted.algorithm).toBe("AES-GCM");
    expect(encrypted.ciphertext).not.toContain("gho_secret");
    await expect(decryptJson(encrypted, "test-key-material")).resolves.toEqual(payload);
  });
});
