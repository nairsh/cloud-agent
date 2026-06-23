"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type RuntimeConfig = {
  clerkConfigured: boolean;
  convexConfigured: boolean;
  githubAppSlug?: string;
};

const runtimeConfig: RuntimeConfig = {
  clerkConfigured: Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
  convexConfigured: Boolean(process.env.NEXT_PUBLIC_CONVEX_URL),
  githubAppSlug: process.env.NEXT_PUBLIC_GITHUB_APP_SLUG,
};

const RuntimeConfigContext = createContext<RuntimeConfig>(runtimeConfig);

export function useRuntimeConfig() {
  return useContext(RuntimeConfigContext);
}

export function Providers({ children }: { children: ReactNode }) {
  const [convex] = useState(() => {
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) return null;
    return new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  });

  const value = useMemo(() => runtimeConfig, []);
  const content = (
    <RuntimeConfigContext.Provider value={value}>
      {children}
    </RuntimeConfigContext.Provider>
  );

  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return content;
  }

  if (!convex) {
    return (
      <ClerkProvider
        publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      >
        {content}
      </ClerkProvider>
    );
  }

  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {content}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
