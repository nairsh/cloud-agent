import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const slug = process.env.GITHUB_APP_SLUG;
  if (!slug) {
    return NextResponse.json({ error: "GITHUB_APP_SLUG is not configured" }, { status: 500 });
  }

  redirect(`https://github.com/apps/${slug}/installations/new`);
}
