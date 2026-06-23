import type { SessionStatus } from "@/lib/types";

export function StatusPill({ status }: { status: SessionStatus | string }) {
  return (
    <span className="status-pill" data-state={status}>
      {status.replaceAll("_", " ")}
    </span>
  );
}
