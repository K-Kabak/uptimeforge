# Implementation progress

The specification is authoritative. A phase is verified only by recorded checks, never by provider mocks alone.

| Phase | Status |
| --- | --- |
| 0 Repository | In progress |
| 1 Foundation | Pending |
| 2 Database/auth | Pending |
| 3 Monitor CRUD | Pending |
| 4 Secure checker | Pending |
| 5 Persistence/analytics | Pending |
| 6 QStash pipeline | Pending |
| 7 Incidents | Pending |
| 8 Email | Pending |
| 9 Status pages | Pending |
| 10 Retention/lifecycle | Pending |
| 11 UX | Pending |
| 12 Test hardening | Pending |
| 13 CI | Pending |

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
