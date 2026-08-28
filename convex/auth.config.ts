import type { AuthConfig } from "convex/server";

const clerkIssuerDomain = process.env.CLERK_JWT_ISSUER_DOMAIN;

const providers = clerkIssuerDomain
  ? [
      {
        domain: clerkIssuerDomain,
        applicationID: "convex",
      },
    ]
  : [];

export default {
  providers,
} satisfies AuthConfig;
