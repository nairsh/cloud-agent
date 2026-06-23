import type { EncryptedPayload } from "@/lib/secrets";

export type ClaimedRun =
  | {
      runId: string;
      kind: "provider_login";
      providerCredentialId: string;
      provider: string;
    }
  | {
      runId: string;
      kind: "agent_session";
      session: {
        id: string;
        prompt: string;
        model: string;
        provider: string;
      };
      repository: {
        id: number;
        installationId: number;
        owner: string;
        name: string;
        fullName: string;
        defaultBranch?: string;
      };
      credential: {
        id: string;
        provider: string;
        encryptedPayload?: EncryptedPayload;
      };
    };

export type WorkerConfig = {
  convexUrl: string;
  runnerToken: string;
  workerId: string;
  containerImage: string;
  credentialEncryptionKey: string;
  githubAppId: string;
  githubAppPrivateKey: string;
};
