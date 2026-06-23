import { SignUp } from "@clerk/nextjs";

import { SetupPanel } from "@/components/setup-panel";

export default function SignUpPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <main style={{ display: "grid", minHeight: "100vh", placeItems: "center" }}>
        <div style={{ width: "min(520px, calc(100vw - 32px))" }}>
          <SetupPanel issues={["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not configured."]} />
        </div>
      </main>
    );
  }

  return (
    <main style={{ display: "grid", minHeight: "100vh", placeItems: "center" }}>
      <SignUp />
    </main>
  );
}
