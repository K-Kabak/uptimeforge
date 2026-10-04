# Implementation progress

The specification is authoritative. A phase is verified only by recorded checks, never by provider mocks alone.

| Phase                    | Status                                                             |
| ------------------------ | ------------------------------------------------------------------ |
| 0 Repository             | Complete: remote main pushed                                       |
| 1 Foundation             | Complete                                                           |
| 2 Database/auth          | Implemented; OAuth live check blocked                              |
| 3 Monitor CRUD           | Implemented; Redis provider check blocked                          |
| 4 Secure checker         | Complete                                                           |
| 5 Persistence/analytics  | Complete                                                           |
| 6 QStash pipeline        | Implemented; live queue/Redis blocked                              |
| 7 Incidents              | Complete                                                           |
| 8 Email                  | Implemented; real Resend blocked                                   |
| 9 Status pages           | Complete                                                           |
| 10 Retention/lifecycle   | Complete                                                           |
| 11 UX                    | Complete                                                           |
| 12 Test hardening        | Complete                                                           |
| 13 CI                    | Complete                                                           |
| 14 Deployment            | In progress; browser authorization blocked                         |
| 15 Documentation/release | Documentation prepared; release blocked by production verification |

## Decisions

- Node 24 LTS, pnpm, strict TypeScript, Next.js App Router.
- Stable NextAuth v4 and its Prisma adapter; database sessions.
- PostgreSQL is the durable job/outbox authority; Redis locks only coordinate.
- All network checks use DNS validation and a pinned connector; no automatic redirects.
- Two consecutive results confirm initial UP/DOWN; recovery requires two successes.
- URL changes invalidate queued results; pause never sends a false recovery.
- The subsequent user request authorizes Phase 14–15, including production provisioning, deployment and release after the full Definition of Done. Paid plans still require explicit consent.

## External verification blockers

- Real GitHub OAuth requires development client ID and secret.
- Real Upstash Redis/QStash and Resend require credentials. Provisioning is now authorized; current provider dependencies are recorded in deployment-status.md.
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

- Phase 14 preparation: authenticated Vercel CLI created the UptimeForge Hobby project, connected GitHub and selected Next.js / Node 24. The canonical domain is reserved; APP_URL, NEXTAUTH_URL and a random encrypted NEXTAUTH_SECRET are configured. Neon and Upstash provisioning returned browser terms-acceptance blockers. Git-triggered Vercel builds reached production preflight and failed on missing provider variables, as confirmed in actual build logs. No successful production deployment, migration or smoke test has run.
- Phase 15 preparation: documented architecture, setup, environment, deployment, capacity, smoke cleanup and release criteria. Captured six screenshots using disposable local PostgreSQL fixtures and cleaned their owner afterwards. Lint, format, typecheck, 112 Vitest tests, optimized build and 8 desktop/mobile E2E passed locally. These checks do not verify hosted providers.

- Phase 14, 4 October 2026: after owner acceptance, provisioned Neon, Redis and QStash Free resources in Frankfurt and connected them to Vercel production. Applied all 8 Prisma migrations; migrate status reports up to date. Verified pooled Neon SQL with an encrypted, certificate-authorized client socket, hosted Redis read/write/expiry-option/delete with fixture cleanup, and authenticated hosted QStash schedules API (no schedules created). OAuth browser setup, Resend sender DNS/credentials and queue capacity still block the complete production smoke/release. Quality run 37156880634 succeeded for SHA 6618edd1b368a1764984479b8a03842397aac823.
