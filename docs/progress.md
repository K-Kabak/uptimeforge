# Implementation progress

The specification is authoritative. A phase is verified only by recorded checks, never by provider mocks alone.

| Phase                   | Status                                    |
| ----------------------- | ----------------------------------------- |
| 0 Repository            | Complete: remote main pushed              |
| 1 Foundation            | Complete                                  |
| 2 Database/auth         | Implemented; OAuth live check blocked     |
| 3 Monitor CRUD          | Implemented; Redis provider check blocked |
| 4 Secure checker        | Complete                                  |
| 5 Persistence/analytics | Complete                                  |
| 6 QStash pipeline       | Implemented; live queue/Redis blocked     |
| 7 Incidents             | Complete                                  |
| 8 Email                 | Implemented; real Resend blocked          |
| 9 Status pages          | Complete                                  |
| 10 Retention/lifecycle  | Complete                                  |
| 11 UX                   | Complete                                  |
| 12 Test hardening       | Complete                                  |
| 13 CI                   | Complete                                  |

## Decisions

- Node 24 LTS, pnpm, strict TypeScript, Next.js App Router.
- Stable NextAuth v4 and its Prisma adapter; database sessions.
- PostgreSQL is the durable job/outbox authority; Redis locks only coordinate.
- All network checks use DNS validation and a pinned connector; no automatic redirects.
- Two consecutive results confirm initial UP/DOWN; recovery requires two successes.
- URL changes invalidate queued results; pause never sends a false recovery.
- Production provisioning, deployment, tag and release are not authorized in this run.

## External verification blockers

- Real GitHub OAuth requires development client ID and secret.
- Real Upstash Redis/QStash and Resend require credentials; no production provisioning will be attempted.
- Production capacity and DNS/domain verification belong to Phase 14.

## Verification evidence

- Phase 0: Git initialized with configured author; public repository created; main pushed.
- Phase 1: Node 24.21.0; lint/typecheck/unit test/format/build verified locally.
- PostgreSQL 17 container is available at localhost:55432 (development only).

- Phase 1: Local lint, format, typecheck, unit test and build passed under Node 24.

- Phase 2: Auth migration applied on development and test PostgreSQL; adapter integration and guard tests passed. Real OAuth credentials missing.

- Phase 3: CRUD, ownership and concurrent 10-monitor limit tests passed on PostgreSQL. Redis provider credentials missing.

- Phase 4: 49 checker security cases passed; real example.com HTTPS check returned 200; build passed.

- Phase 5: 58 cumulative tests passed; check persistence, idempotency, version fencing and analytics verified on PostgreSQL.

- Phase 6: Dispatcher/outbox/signature rejection and lease takeover verified on PostgreSQL; provider deliveries not exercised without credentials.

- Phase 7: 72 cumulative tests passed; PostgreSQL incident transitions, duplicate jobs, pause/resume and URL change verified; partial OPEN index applied.

- Phase 8: 75 cumulative tests passed. Email rendering, transactional outbox, duplicate sender prevention and 24h-window handling tested with provider test doubles; no real email sent.

- Phase 9: 84 cumulative tests passed; status-page ownership, publication, limits, safe DTO and cascade verified on PostgreSQL.

- Phase 10: 87 cumulative tests passed; batched retention preserves incidents, account cascade and in-flight email deletion guard verified on PostgreSQL.

- Phase 11: 87 tests, lint, format, typecheck and full optimized build passed. Responsive forms, themes, keyboard focus, toast feedback and target-only analytics reset implemented. Shared dispatcher DB fixtures run serially; concurrency remains explicitly tested.

- Phase 12: 105 Vitest tests and 8 desktop/mobile E2E cases passed with real PostgreSQL/Redis and optimized Next server. Real cryptographic signature verification and safe external HTTP exercised; hosted OAuth/QStash/Resend remain unverified.

- Phase 13: GitHub Actions Quality run 37140965116 succeeded for source SHA 66766e32a124bdb81f52ff85f08c3902f7ec84ea: Prisma validate/generate/fresh migrations/status, lint, format, typecheck, 108 tests, optimized build and 8 E2E. Providers remain unverified without credentials. Phase 14 and 15 have not started.
