import { auth } from "@clerk/nextjs/server";
import { createHmac, randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const slug = process.env.GITHUB_APP_SLUG;
  if (!slug) {
    return NextResponse.json({ error: "GITHUB_APP_SLUG is not configured" }, { status: 500 });
  }

  const state = signState({
    userId,
    issuedAt: Date.now(),
    nonce: randomUUID(),
  });
  redirect(`https://github.com/apps/${slug}/installations/new?state=${state}`);
}

function signState(payload: { userId: string; issuedAt: number; nonce: string }) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET ?? process.env.CLERK_SECRET_KEY;
  if (!secret) {
    throw new Response("GITHUB_WEBHOOK_SECRET or CLERK_SECRET_KEY is required", { status: 500 });
  }
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}
