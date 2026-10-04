# Deployment status — 4 October 2026

The application is deployed at **https://uptimeforge.vercel.app** on Vercel Hobby. Phase 14 infrastructure and bounded real smoke verification are implemented. Continuous monitoring and general-user email remain externally blocked. Phase 15 documentation, screenshots and audit are prepared; the full v1.0.0 release gate is not satisfied.

| Item                   | Actual state                                                                                                                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub                 | Public K-Kabak/uptimeforge, main; operational code CI run 37206420048 succeeded for 0147f92fd7b863844d1da7bffdc97f4010c98661; final documentation SHA is checked again before the final report             |
| Vercel                 | Hobby, GitHub connected, Next.js / Node 24, functions in Frankfurt; actual production build and canonical HTTPS requests verified                                                                          |
| Production environment | Required variables configured encrypted; isolated preflight passes in explicit email sandbox and bounded scheduler mode                                                                                    |
| Neon                   | uptimeforge-postgres, Free, Frankfurt; actual Prisma transactions and certified client TLS verified                                                                                                        |
| Migrations             | All 9 applied through unpooled Neon; pooled runtime DB verified; no destructive production reset                                                                                                           |
| Redis                  | uptimeforge-redis, Free; autoUpgrade=false, prodPack=false, eviction=false; real PING, NX/expiry, read/delete and application's Lua rate limiter verified with cleanup                                     |
| QStash                 | uptimeforge-qstash, Free, Frankfurt; real signed scheduled dispatch, outbox publication, HTTP check worker, notification worker, duplicate delivery and cleanup requests verified                          |
| Dispatcher             | Exactly one minute schedule, now **paused**; two real scheduled checks completed in bounded smoke windows. SCHEDULER_MODE=bounded blocks indefinite setup and shows the restriction in the dashboard       |
| Retention              | Exactly one cleanup schedule at 02:00 UTC daily, **enabled**, within Free quota; real signed cleanup returned HTTP 200. Its future daily cron invocation has not yet been observed                         |
| Resend                 | Dedicated Sending-access key encrypted on Vercel; RESEND_MODE=sandbox, onboarding@resend.dev, private account-owner allowlist. Direct test and outage/recovery emails show actual Delivered events         |
| GitHub OAuth           | Production app 3903753; exact homepage/callback; Client Secret exists exclusively in Vercel. Actual login, logout, relogin and database sessions verified                                                  |
| Smoke cleanup          | Owner-scoped account deletion returned 200 and invalidated the session; 0 users/accounts/sessions/monitors/checks/jobs/incidents/deliveries/status pages remain. Disposable Vercel fixture project removed |
| Tag / Release          | Not created: full production DoD remains blocked by continuous queue capacity and unrestricted sender-domain requirements                                                                                  |

Read [smoke evidence](production-smoke.md), [verification boundaries](test-boundaries.md), [runbook](deployment.md) and [full DoD audit](definition-of-done.md).

No paid plan, billing auto-upgrade or domain purchase was activated. Resource lists were inspected before creation. Existing taskflow and freight-flow resources were not modified. Provider email delivery/audit logs remain as evidence; sent emails cannot be recalled.

The owner explicitly authorized a domain-free, owner-only Resend smoke test. This restriction is not an implicit fallback and does not redirect other users' notifications. Other recipients are durably SKIPPED. A verified owned domain is still needed for alerts to arbitrary users. The minute dispatcher alone needs 1440 messages/day versus the advertised Free allowance of 1000; manual checks and daily cleanup do not justify leaving it continuously active. No MVP interval or monitor limit was reduced to hide that constraint.

Neon client-to-pooler TLS was checked on the real encrypted/certificate-authorized socket; pooled backend pg_stat_ssl does not describe that connection. OAuth credentials were never pulled into repository files. A real-secret scan checked tracked files and Git history without printing values and found no matches.
