export type PromptAttachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string;
};

const READABLE_EXTENSIONS = new Set([
  "c",
  "cpp",
  "cs",
  "css",
  "go",
  "h",
  "html",
  "java",
  "js",
  "json",
  "jsx",
  "kt",
  "log",
  "md",
  "mdx",
  "py",
  "rb",
  "rs",
  "sh",
  "sql",
  "swift",
  "toml",
  "ts",
  "tsx",
  "txt",
  "xml",
  "yaml",
  "yml",
]);

export const MAX_ATTACHMENT_BYTES = 64 * 1024;
export const MAX_ATTACHMENTS = 3;

export function isReadableAttachment(file: { name: string; type?: string; size: number }) {
  if (file.size > MAX_ATTACHMENT_BYTES) return false;
  if (file.type?.startsWith("text/")) return true;
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension ? READABLE_EXTENSIONS.has(extension) : false;
}

export function buildPromptWithAttachments(prompt: string, attachments: PromptAttachment[]) {
  const trimmedPrompt = prompt.trim();
  if (attachments.length === 0) return trimmedPrompt;

  const attachmentContext = attachments
    .map((attachment, index) => {
      const type = attachment.type || "text/plain";
      return [
        `Attachment ${index + 1}: ${attachment.name}`,
        `Type: ${type}`,
        "Content:",
        "```",
        attachment.content.trimEnd(),
        "```",
      ].join("\n");
    })
    .join("\n\n");

  return `${trimmedPrompt}\n\nAttached files for context:\n\n${attachmentContext}`;
}
