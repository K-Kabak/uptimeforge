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
| 6 QStash pipeline       | Pending                                   |
| 7 Incidents             | Pending                                   |
| 8 Email                 | Pending                                   |
| 9 Status pages          | Pending                                   |
| 10 Retention/lifecycle  | Pending                                   |
| 11 UX                   | Pending                                   |
| 12 Test hardening       | Pending                                   |
| 13 CI                   | Pending                                   |

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
