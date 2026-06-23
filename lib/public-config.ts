export type PublicAppConfig = {
  clerkPublishableKey?: string;
  convexUrl?: string;
  githubAppSlug?: string;
};

export function getPublicAppConfig(): PublicAppConfig {
  return {
    clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL,
    githubAppSlug: process.env.NEXT_PUBLIC_GITHUB_APP_SLUG ?? process.env.GITHUB_APP_SLUG,
  };
}

export function getSetupIssues(config = getPublicAppConfig()): string[] {
  const issues: string[] = [];
  if (!config.clerkPublishableKey) {
    issues.push("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not configured.");
  }
  if (!config.convexUrl) {
    issues.push("NEXT_PUBLIC_CONVEX_URL is not configured.");
  }
  if (!config.githubAppSlug) {
    issues.push("GITHUB_APP_SLUG is not configured.");
  }
  return issues;
}
