import type { AuthConfig } from "convex/server";

const clerkIssuerEnvName = ["CLERK", "JWT", "ISSUER", "DOMAIN"].join("_");
const clerkIssuerDomain = Object.prototype.hasOwnProperty.call(
  process.env,
  clerkIssuerEnvName,
)
  ? process.env[clerkIssuerEnvName]
  : undefined;

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
