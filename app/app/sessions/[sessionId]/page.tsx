import { DashboardClient } from "@/components/dashboard-client";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <DashboardClient selectedSessionId={sessionId} />;
}
