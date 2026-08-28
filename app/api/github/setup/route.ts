import { auth } from "@clerk/nextjs/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { ConvexHttpClient } from "convex/browser";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

import { convexApi } from "@/lib/convex-api";
import { loadInstallation } from "@/lib/github-installation";

export async function GET(request: NextRequest) {
  const authState = await auth();
  const { userId } = authState;
  if (!userId) redirect("/sign-in");

  const installationIdRaw = request.nextUrl.searchParams.get("installation_id");
  const installationId = installationIdRaw ? Number(installationIdRaw) : NaN;
  if (!Number.isFinite(installationId)) {
    return NextResponse.json({ error: "Missing installation_id" }, { status: 400 });
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json({ error: "NEXT_PUBLIC_CONVEX_URL is not configured" }, { status: 500 });
  }

  const convexToken = await authState.getToken({ template: "convex" });
  if (!convexToken) {
    return NextResponse.json(
      { error: "Clerk Convex JWT template is not configured" },
      { status: 500 },
    );
  }

  const state = request.nextUrl.searchParams.get("state");
  const verifiedState = state ? verifyState(state) : null;
  const allowLocalRecovery = !state && process.env.NODE_ENV !== "production";
  if (!allowLocalRecovery && verifiedState?.userId !== userId) {
    return NextResponse.json(
      { error: "Start GitHub installation from this app before returning to setup." },
      { status: 403 },
    );
  }

  const installation = await loadInstallation(installationId);
  const convex = new ConvexHttpClient(convexUrl, { auth: convexToken });
  await convex.mutation(convexApi.github.syncInstallationForCurrentUser, installation);

  redirect("/app/settings");
}

function verifyState(state: string) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET ?? process.env.CLERK_SECRET_KEY;
  if (!secret) {
    throw new Response("GITHUB_WEBHOOK_SECRET or CLERK_SECRET_KEY is required", { status: 500 });
  }
  const [body, signature] = state.split(".");
  if (!body || !signature) return null;

  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  if (!safeEqual(signature, expected)) return null;

  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
    userId?: string;
    issuedAt?: number;
  };
  if (!payload.userId || !payload.issuedAt) return null;
  if (Date.now() - payload.issuedAt > 30 * 60 * 1000) return null;
  return payload;
}

function safeEqual(left: string, right: string) {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}
