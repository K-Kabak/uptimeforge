# Real production smoke evidence — 4 October 2026

Scope: the actual application at https://uptimeforge.vercel.app, Neon, hosted Upstash Redis/QStash and Resend sandbox. No authentication bypass, fake incident, injected Check row or provider test double was used for the production pipeline. SMTP delivery was verified through Resend's Delivered events, not a simulated resend.dev recipient or a claim that a person read the email.

The successful incident pipeline ran on implementation SHA `9515791e9ca1e44d97475485c2faf701a24103a1`, Vercel deployment `dpl_A5PyHh6aJ2c6tEU4ZFs4XoZPLnW8`. The initial deployment at `67662ae55dec69187eb17fff42f7a7a275663484` exposed the QStash deduplication-format defect described below, which was fixed and redeployed before automatic pipeline success. Subsequent changes add explicit operational notices/guards and documentation; the final report checks their CI and deployment separately.

| Test               | Actual evidence                                                                                                                                                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub OAuth       | Browser completed GitHub authorization and exact production callback, reached private dashboard; real PostgreSQL session present                                                                                                       |
| Cookie protection  | Session cookie Secure=true, HttpOnly=true, SameSite=Lax on HTTPS                                                                                                                                                                       |
| Anonymous access   | /api/monitors returned 401; unsigned dispatch/check returned 401                                                                                                                                                                       |
| Origin / SSRF      | Authenticated foreign-Origin mutation returned 403; localhost monitor creation returned BLOCKED_TARGET / 400. Comprehensive DNS/redirect/peer variants are covered by security tests, not production attacks against internal networks |
| Monitor creation   | Owner API created Disposable production smoke API against a controlled, public HTTPS fixture                                                                                                                                           |
| Manual checks      | Four actual manual jobs completed; manual requests returned 202 and the signed QStash check worker persisted results                                                                                                                   |
| Automatic checks   | Two SCHEDULED jobs completed from genuine minute-schedule dispatcher calls; publication and nextCheckAt movement verified on Neon                                                                                                      |
| Outage             | Same fixture URL returned 503 twice; monitor became DOWN and exactly one OPEN incident was written                                                                                                                                     |
| Recovery           | Same fixture URL was redeployed to return 200 twice; the same incident became RESOLVED with RECOVERED reason and monitor became UP                                                                                                     |
| Email outbox       | One OPENED and one RESOLVED delivery, each ACCEPTED with attempts=1; both have real Resend Delivered events                                                                                                                            |
| Duplicate delivery | Completed scheduled-check and accepted-notification IDs were republished through real QStash; no extra Check, incident, delivery or send attempt appeared                                                                              |
| Analytics UI       | Actual monitor page displayed history, uptime and a rendered Recharts response chart after successful HTTP observations                                                                                                                |
| Public status      | Anonymous published page returned 200 and public display name; full HTML/RSC excluded target URL and internal monitor ID; unpublish returned 200 followed by anonymous 404                                                             |
| Pause / resume     | Pause returned PAUSED with nextCheckAt=null; Check now returned MONITOR_PAUSED / 400; resume returned PENDING and subsequent genuine scheduled/manual successes returned UP                                                            |
| Retention worker   | Signed QStash call to /api/internal/cleanup; Vercel request log confirms HTTP 200                                                                                                                                                      |
| Logout             | Actual NextAuth signout returned 200; session became empty and private API returned 401; real GitHub relogin succeeded                                                                                                                 |
| Account lifecycle  | After ownership inventory confirmed only named smoke resources and no work in flight, account DELETE returned 200, session empty, private API 401                                                                                      |

Final inventory before deletion: **6 CheckJobs, 6 Checks, 2 completed scheduled jobs, 1 resolved incident, 2 accepted incident emails**. Four 200 observations and two 503 observations correspond to check-based uptime of 66.67% in the smoke dataset; the earlier two-success recovery stage had 50% uptime. These are fixture observations, not claims about an external service's SLA.

Email provider evidence (recipient deliberately omitted):

- Direct integration test: `01a1070d-1d85-713f-a0d8-a23d1da65194`, Sent and Delivered.
- Outage: `01a1071a-888c-79f6-a186-f5c7cdf2b810`, Sent and Delivered.
- Recovery: `01a1071d-4544-7921-b3e3-bf7b7e507b0e`, Sent and Delivered.

## Discovered defect and regression fix

Actual QStash publication returned HTTP 400: DeduplicationId cannot contain a colon. Transport identifiers now hash framed logical key parts with SHA-256. Database and Resend idempotency keys remain unchanged. A regression test checks stable, delimiter-safe identifiers without character-replacement collisions. Fresh local gates and GitHub CI passed, and the actual scheduled pipeline succeeded after redeployment. The first manual worker was published from the administration process to verify the fix; the later automatic job was published by the real production dispatcher.

## Cleanup and remaining restrictions

Production account/monitor data was deleted through the owner-authenticated application route, not blanket SQL deletion. A subsequent real database inventory confirmed zero users, OAuth accounts, sessions, monitors, checks, jobs, incidents, deliveries and status pages. The separately created uptimeforge-smoke-fixture Vercel project and deployments were deleted after matching its exact project ID, name and team; a project listing confirmed absence. The application and unrelated projects remain intact.

The minute dispatcher was active only during bounded eight-minute and three-minute windows with automatic pause; it is now paused. Daily 02:00 UTC cleanup is enabled and fits the Free quota, but its next cron trigger has not yet been observed. Resend email remains limited to the actual account owner; no arbitrary-recipient production readiness is claimed. The real QStash DLQ list returned zero messages and no pagination cursor. QStash's logs API returned empty history; scheduled-success states, actual Vercel request logs and persisted jobs/results provide delivery evidence instead. No provider retry caused by an actual destination outage was deliberately induced; automatic retry behavior is additionally tested locally, without claiming this smoke proves all provider retry paths.
