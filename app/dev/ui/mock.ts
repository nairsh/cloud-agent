import type { AgentSessionSummary, Viewer } from "@/lib/types";

// Shared mock data for the /dev/ui visual preview harness. Mirrors the shapes
// the real Convex queries return so the preview exercises the same components.

export const mockViewer: Viewer = {
  userId: "user_preview",
  name: "Nairsh",
  email: "nairsh@example.com",
  hasGithubInstallation: true,
  hasProviderCredentials: true,
};

function session(
  partial: Pick<AgentSessionSummary, "_id" | "title" | "status"> & {
    owner?: string;
    name?: string;
  },
): AgentSessionSummary {
  const owner = partial.owner ?? "nairsh";
  const name = partial.name ?? "cloud-agent";
  return {
    _id: partial._id,
    title: partial.title,
    status: partial.status,
    model: "gpt-5-mini",
    provider: "github-copilot",
    repository: { owner, name, fullName: `${owner}/${name}` },
    updatedAt: Date.now(),
    createdAt: Date.now(),
  };
}

export const mockSessions: AgentSessionSummary[] = [
  session({ _id: "s1", title: "Redesign the chat timeline to match reference", status: "running" }),
  session({ _id: "s2", title: "Cancellation verification: run a long operation", status: "cancelled" }),
  session({ _id: "s3", title: "Using the attached package.json context, reply", status: "completed" }),
  session({ _id: "s4", title: "Final live verification: read package.json", status: "completed" }),
  session({
    _id: "s5",
    title: "Catalog page redesign",
    status: "queued",
    owner: "matthewmiller2925",
    name: "vibecademy-ui",
  }),
  session({
    _id: "s6",
    title: "SEO strategy review with the marketing team",
    status: "completed",
    owner: "matthewmiller2925",
    name: "vibecademy-ui",
  }),
  session({
    _id: "s7",
    title: "Build and deployment pipeline",
    status: "failed",
    owner: "bridge-mind",
    name: "bridgebench-ui",
  }),
];
