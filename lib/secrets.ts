export type EncryptedPayload = {
  algorithm: "AES-GCM";
  nonce: string;
  ciphertext: string;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function encryptJson(value: unknown, keyMaterial: string): Promise<EncryptedPayload> {
  const key = await deriveKey(keyMaterial);
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = encoder.encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, plaintext);
  return {
    algorithm: "AES-GCM",
    nonce: base64UrlEncode(nonce),
    ciphertext: base64UrlEncode(new Uint8Array(ciphertext)),
  };
}

export async function decryptJson<T>(
  payload: EncryptedPayload,
  keyMaterial: string,
): Promise<T> {
  if (payload.algorithm !== "AES-GCM") {
    throw new Error(`Unsupported encryption algorithm: ${payload.algorithm}`);
  }
  const key = await deriveKey(keyMaterial);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64UrlDecode(payload.nonce) },
    key,
    base64UrlDecode(payload.ciphertext),
  );
  return JSON.parse(decoder.decode(plaintext)) as T;
}

async function deriveKey(keyMaterial: string) {
  if (!keyMaterial) throw new Error("Missing encryption key material");
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(keyMaterial));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

function base64UrlEncode(bytes: Uint8Array) {
  return Buffer.from(bytes)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlDecode(value: string) {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  return new Uint8Array(Buffer.from(padded.replaceAll("-", "+").replaceAll("_", "/"), "base64"));
}
