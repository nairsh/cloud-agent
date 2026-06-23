const SECRET_KEY_RE = /(token|secret|password|authorization|api[_-]?key|access[_-]?key)/i;
const SECRET_VALUE_RE =
  /(gho_[A-Za-z0-9_]+|ghs_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|sk-[A-Za-z0-9_-]+|xox[baprs]-[A-Za-z0-9-]+)/g;

export function redactSecrets<T>(value: T): T {
  return redactValue(value) as T;
}

function redactValue(value: unknown): unknown {
  if (typeof value === "string") return value.replace(SECRET_VALUE_RE, "[REDACTED]");
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redactValue);

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, inner]) => [
      key,
      SECRET_KEY_RE.test(key) ? "[REDACTED]" : redactValue(inner),
    ]),
  );
}
