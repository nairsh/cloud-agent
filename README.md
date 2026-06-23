# Cloud Agent Handoff

Next.js + Clerk + Convex control plane for running Pi SDK coding tasks in isolated Docker workers.

## Local Setup

1. Copy `.env.example` to `.env.local` and fill the Clerk, Convex, GitHub App, worker, and encryption values.
2. Configure Clerk with a Convex JWT template named `convex`.
3. Configure the GitHub App setup callback to `/api/github/setup` and webhook callback to the Convex HTTP route `/webhooks/github`.
4. Configure Clerk webhooks to the Convex HTTP route `/webhooks/clerk`.
5. Run the app:

```bash
npm run dev
```

## Worker

Build the container image:

```bash
docker build -f worker/Dockerfile -t cloud-agent-runner:latest .
```

Run the host worker with the required environment values:

```bash
npm run worker
```

The host worker claims queued Convex runs, mints a short-lived GitHub App installation token, starts one Docker container per task, and the container streams sanitized Pi events back to Convex.

## Checks

```bash
npm run lint
npm run build
npm test
```
