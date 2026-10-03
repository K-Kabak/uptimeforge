# UptimeForge

[![Quality](https://github.com/K-Kabak/uptimeforge/actions/workflows/ci.yml/badge.svg)](https://github.com/K-Kabak/uptimeforge/actions/workflows/ci.yml)

HTTP uptime monitoring with SSRF protection, durable background jobs, incident detection, email alerts and public status pages. Built as a developer portfolio SaaS with real PostgreSQL integration tests and desktop/mobile E2E.

**Deployment status:** Phase 0–13 implementation and CI are verified. Phase 14 is in progress: the Vercel Hobby project exists and is connected to GitHub; provider setup is blocked on browser authorization, credentials and QStash capacity. No live production URL or v1.0.0 release is claimed. See [deployment status](docs/deployment-status.md).

## Product

- GitHub OAuth with database sessions and owner-scoped resources.
- Up to 10 active HTTP/HTTPS monitors per user; intervals of 5, 10, 15, 30 or 60 minutes; timeout of 1–10 seconds.
- PENDING / UP / DOWN / PAUSED states; two consecutive failures confirm an incident, two successes confirm recovery.
- Check history with cursor pagination and success/failure filters, response-time charts and 24h / 7d / 30d uptime.
- Durable check jobs, transaction-level deduplication, lease fencing and configuration-version guards.
- Outage/recovery email outbox with provider idempotency keys and bounded retries.
- Up to 3 status pages per user, with ordered selections of up to 10 monitors, optional public names and publication controls.
- Batched 30-day check retention and transactional account deletion.
- Responsive dashboard, light/dark/system themes, keyboard focus, loading states and accessible feedback.

## Screenshots

These images show the local application with explicitly controlled fixture data. They are not production measurements or evidence of hosted provider integration. The screenshot script deletes its fixture account afterwards.

![Landing page](docs/screenshots/landing.png)
![Dashboard](docs/screenshots/dashboard.png)
![Dark dashboard](docs/screenshots/dashboard-dark.png)
![Monitor details](docs/screenshots/monitor.png)
![Public status page](docs/screenshots/status-page.png)

[Mobile status page](docs/screenshots/status-mobile.png)

## Architecture

```mermaid
flowchart TD
  Browser[Browser] --> Next[Next.js App Router / Node runtime]
  Next --> Auth[NextAuth / GitHub OAuth]
  Auth --> DB[(PostgreSQL / Neon)]
  Next --> DB
  Next --> Redis[(Upstash Redis: rate limits / dispatcher lock)]
  Schedule[QStash schedules] --> Dispatcher[Signed dispatcher]
  Dispatcher --> Jobs[Durable CheckJob outbox in PostgreSQL]
  Jobs --> QStash[QStash delivery / retries]
  QStash --> Worker[Signed check worker / DB lease]
  Worker --> Checker[DNS validation / pinned HTTP connector]
  Checker --> Target[Public HTTP or HTTPS target]
  Worker --> Check[Check / Monitor / Incident transaction]
  Check --> Delivery[NotificationDelivery outbox]
  Delivery --> QStash
  QStash --> Notify[Signed notification worker]
  Notify --> Resend[Resend]
  Next --> Public[Public status page DTO / 30s cache]
```

PostgreSQL owns durable jobs and business state. Redis coordinates dispatch and rate limits; it is not the durable source of check results. External HTTP/email requests happen outside database transactions. A worker claims a lease, makes the external request, then commits only if its lease token and configuration version are still valid.

The stack uses Next.js App Router, React, strict TypeScript, Prisma with the PostgreSQL driver adapter, stable NextAuth v4 with its Prisma adapter, Upstash Redis/QStash, Resend, Tailwind CSS, Recharts, Vitest, Playwright and GitHub Actions. Node 24 and pnpm are pinned in the repository. Auth.js v5 beta was not adopted as the stable authentication baseline.

## Local setup

Prerequisites: Node 24, pnpm 12.1.0, Docker and a development GitHub OAuth app. OAuth login cannot be tested with GitHub CLI credentials alone.

```sh
pnpm install --frozen-lockfile
docker compose up -d
```

Copy `.env.example` to `.env`, generate a strong `NEXTAUTH_SECRET`, and fill development provider credentials. The database runs on localhost port **55432** and Redis on **56379**. The development OAuth callback is `http://localhost:3000/api/auth/callback/github`.

```sh
pnpm exec prisma generate
pnpm exec prisma migrate deploy
pnpm exec prisma migrate status
pnpm dev
```

Hosted Redis REST credentials are needed for normal application mutations and public status pages: rate limits fail closed. The test REST bridge is limited to test scripts and is not a production substitute. QStash callbacks require a reachable HTTPS deployment; `scripts/dev-check.ts` offers a local, explicitly invoked checker path. Local OAuth and email are not automatically configured.

## Environment variables

Secrets belong in ignored local files or the Vercel environment, never in Git. `.env.production.local` is the ignored file used by production administration scripts. Do not use production credentials in `.env.test`.

| Variable                                                | Purpose                                                                |
| ------------------------------------------------------- | ---------------------------------------------------------------------- |
| `DATABASE_URL`                                          | Runtime pooled PostgreSQL connection; production Neon with TLS         |
| `DIRECT_URL`                                            | Unpooled Neon connection for Prisma migrations                         |
| `NEXTAUTH_SECRET`                                       | Strong session/auth secret, at least 32 characters in production       |
| `NEXTAUTH_URL`                                          | Canonical application origin                                           |
| `APP_URL`                                               | Same canonical origin; trusted queue callback and email-link base      |
| `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`                  | GitHub OAuth app credentials                                           |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`    | Hosted Redis REST access                                               |
| `QSTASH_TOKEN`                                          | Queue publishing and schedule administration                           |
| `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` | Queue signature verification and rotation                              |
| `QSTASH_URL`                                            | Optional provider base URL, including regional endpoint                |
| `RESEND_API_KEY`                                        | Email delivery credential                                              |
| `EMAIL_FROM`                                            | Sender on a verified domain; display-name format supported             |
| `TEST_REDIS_URL`                                        | Test-only local Redis TCP URL; defaults to localhost:56379 database 15 |

## Tests and CI

Create the separate test database once:

```sh
docker compose exec postgres createdb -U uptimeforge uptimeforge_test
```

Create ignored `.env.test` with `DATABASE_URL=postgresql://uptimeforge:uptimeforge@localhost:55432/uptimeforge_test`. Migrate it with a test `DIRECT_URL` (PowerShell helper: `./scripts/test-migrations.ps1`). Test runners refuse another database name because retention cases intentionally operate across the isolated database.

```sh
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Vitest exercises actual PostgreSQL and local Redis. Shared dispatcher fixtures run sequentially between files; concurrency is tested explicitly inside cases. Playwright uses actual database sessions and an optimized Next server, with no application auth bypass. Signature tests use the real QStash verifier with locally signed keys. Business-logic HTTP and email test doubles do not prove hosted delivery. See [verification boundaries](docs/test-boundaries.md).

GitHub Actions starts fresh PostgreSQL/Redis services, validates/generates Prisma, deploys migrations, checks migration status, runs formatting/lint/typecheck/tests/build and desktop/mobile E2E, then checks generated-file reproducibility. Action versions are pinned by SHA. Failure traces are retained for seven days.

For reproducible screenshots, run the test server (`pnpm exec tsx tests/e2e/server.ts`) after building, then `pnpm screenshots` in another terminal. Both must use the isolated test database. Stop the server afterwards.

## Deployment and operation

See [deployment runbook](docs/deployment.md) for provisioning, environment mapping, migrations, queue schedules, smoke checks, cleanup and rollback. `vercel.json` targets Next.js on Node 24 in Frankfurt and gates builds on complete production configuration. Schema migrations are a separate administration step, never an automatic preview build side effect.

```sh
pnpm production:preflight
pnpm production:migrate
```

Preflight validates configuration syntax; it does not certify provider connectivity, verified email DNS or quota sufficiency. Actual production smoke tests remain required before release.

## Security and trade-offs

- URLs are restricted to HTTP/HTTPS and matching standard ports, without credentials. Private, reserved, metadata and mapped addresses are blocked. Mixed DNS answers fail closed. Every redirect is revalidated; the connector pins an approved IP and verifies the socket peer. Response bodies are not downloaded. DNS and the overall check are bounded by deadlines.
- Mutation routes check sessions, resource ownership, origin, input size and rate limits. Internal jobs require verified signatures bound to the raw body and destination. Public projections exclude target URLs, credentials, owner identity, internal IDs and raw infrastructure errors.
- Duplicate jobs cannot create another Check or OPEN incident. Pausing/editing/deleting a queued monitor invalidates its results. URL changes close the old incident without a false recovery alert and reset target metrics. Other configuration changes preserve target history.
- Email acceptance is not inbox delivery. Uncertain delivery retries reuse a frozen key and stop after 23 hours, before the provider's 24-hour key horizon. UNKNOWN deliveries require provider reconciliation. Account deletion waits for a currently leased send; already accepted email cannot be recalled.
- Uptime is **check-based**: successes divided by completed endpoint observations, excluding internal checker errors. It is not a continuous time-based SLA. No observations means “No data”. Charts aggregate successful response times into bounded buckets.
- Monitoring is single-region. Initial state needs two consistent observations. Scheduler jitter and dispatch/delivery delay mean the selected interval is a target cadence, not an exact wall-clock guarantee.
- CSP restricts connections/forms/frames/objects but allows inline bootstrap scripts required by the current Next.js/theme integration. A nonce policy needs additional caching and runtime validation.

## Roadmap

The MVP scope is retained. Optional later work includes custom expected status ranges, richer incident filters, SSL expiry monitoring, notifications to additional channels, team workspaces and multiple probe regions. These features are not substitutes for completing the current production verification.

## License and sources

[MIT](LICENSE). [UptimeForge_SPEC.md](UptimeForge_SPEC.md) remains authoritative; [progress](docs/progress.md) records actual verification. Issues and PRs should preserve ownership, SSRF safeguards, durable idempotency and the CI gates.
