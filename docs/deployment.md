# Deployment runbook

## Provisioning and identity

Use the existing public GitHub repository and the Vercel project `uptimeforge` in `k-kabaks-projects`. Before resuming, list Vercel projects and marketplace resources; reuse named resources rather than repeating creation blindly. CLI authentication is available for Vercel/GitHub. Marketplace acceptance and OAuth/dashboard logins may require the account owner in a browser.

Target region: Frankfurt (`fra1`) for the application, Neon and Upstash. Keep Next.js Node runtime on job routes; do not replace the pinned connector with generic fetch or an Edge runtime. Verify Node proxy support and actual Neon connectivity on Vercel.

Neon is intended as `uptimeforge-postgres`, free_v3, with built-in Neon Auth disabled because the application uses GitHub OAuth/NextAuth. Redis is intended as `uptimeforge-redis`, Free, eviction=false, prodPack=false and autoUpgrade=false. Do not reuse another project's database, enable billing auto-upgrades or activate a paid tier without explicit authorization.

Marketplace-native integration variables may use different names. Inspect names and map actual values securely to `DATABASE_URL`, `DIRECT_URL` and Upstash REST variables. Production GitHub OAuth credentials are stored only in Vercel: transfer via API stdin, never command arguments, logs or a local repository file, even an ignored one. Do not pull the complete production environment into the repository now that it includes the OAuth secret. Retain Neon TLS requirements. Use pooled runtime and unpooled migration connections.

## Quota gate

As checked on 3 October 2026, [QStash Free](https://upstash.com/pricing/qstash) allows 1000 messages/day, and schedule invocations and retries count as messages. The required one-minute dispatcher alone uses 1440/day. Ten five-minute monitors add up to 2880 check jobs/day before jitter; cleanup adds one and alerts/manual jobs/retries add more. Budget up to 4321/day for this baseline, before those additions.

Continuous deployment with this architecture cannot be certified on the advertised free allowance. Keep the minute schedule inactive until adequate capacity is confirmed or a paid plan is explicitly authorized. Do not silently change cadence, reduce the monitor limit or replace required queue semantics to fit the quota. A bounded smoke session on Free cannot establish long-term production capacity. Check Neon connection/compute quotas, Redis command quotas, Resend recipients/rate limits and Vercel function/transfer limits separately with the actual account.

## Production configuration and migrations

Use a stable HTTPS canonical deployment domain for matching `APP_URL` and `NEXTAUTH_URL`. Register or reuse the GitHub OAuth app with homepage at this origin and callback `${origin}/api/auth/callback/github`. A GitHub CLI access token is not an OAuth client secret. Production credentials must not be shared with local test sessions.

GitHub OAuth uses expiring access tokens. Its token response includes `refresh_token_expires_in`, which NextAuth v4 passes to the Prisma adapter. The ninth migration adds this nullable Account field; a real PostgreSQL adapter regression test reproduced the prior validation failure and now accepts the metadata. Keep token expiration enabled. GitHub is used for login/profile retrieval; application sessions are stored separately in PostgreSQL. See [GitHub's token response documentation](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps).

Set a freshly generated strong `NEXTAUTH_SECRET`, actual OAuth credentials, Neon URLs, Upstash REST URL/token, QStash token/current/next signing keys, regional QStash URL if applicable, Resend key and a verified-domain `EMAIL_FROM`. Confirm SPF/DKIM verification through Resend; `resend.dev` sandbox restrictions are insufficient for arbitrary GitHub users.

`pnpm production:preflight` validates the complete variable set without revealing values. `pnpm production:migrate` gates migration execution on the database URLs independently of OAuth/email blockers, then runs Prisma validate, migrate deploy and migrate status through the unpooled connection. Review migration SQL and backup/branch the production DB before a later destructive change. Do not run migrate dev or reset in production. The Vercel build generates Prisma but does not apply migrations.

For administration without secret files, Vercel CLI supports `env run --environment production --project uptimeforge -- <command>`. Execute it from an empty administration directory outside the repository, with an absolute entrypoint. CLI 61 merges local `.env` files over downloaded production variables: running from the repository was actually tested and selected development URLs; the production database guard rejected them. A subsequent preflight from an empty temporary directory used the real production configuration and reported only missing Resend variables. Do not treat `--environment production` alone as an isolation guarantee. On PowerShell, invoking the CLI through its Node entrypoint preserves the `--` separator; the PowerShell wrapper consumed it in the tested invocation. Keep environment values out of stdout.

Deploy only after environment and migrations are ready. Inspect the actual build, function logs, headers, signed endpoint responses and database connection behavior. A created Vercel project is not a successful deployment. Keep database secrets server-only and session cookies Secure/HttpOnly/SameSite on HTTPS. Ensure deployment protection does not intercept public status pages or QStash callbacks.

## Background jobs

### Explicit email sandbox for bounded smoke tests

Without an owned domain, set `RESEND_MODE=sandbox`, `EMAIL_FROM=UptimeForge <onboarding@resend.dev>` and encrypted `RESEND_SANDBOX_RECIPIENT` to the actual Resend account-owner address. Use a dedicated Sending-access API key. This is an explicitly restricted smoke environment, not certification of general-user production alerts. The default mode remains `production`, which rejects resend.dev senders.

The application skips other recipients with a durable reason; it does not redirect their alerts to the operator. Queued deliveries recheck the policy before claiming, and the sender checks again before the provider request. Dashboard users see a sandbox notice without exposing the allowlisted address. Change the mode and sender only after verifying an owned domain. See [Resend's account-owner restriction](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).

On 4 October 2026 a real request through the application's email sender was accepted (`01a1070d-1d85-713f-a0d8-a23d1da65194`); the authenticated Resend dashboard showed both Sent and Delivered events. This proves account-owner sandbox delivery, not arbitrary-recipient sending or the complete incident pipeline.

The schedules script defaults to a dry run. After successful deployment and capacity authorization, run it with the production environment and `--apply` to upsert `uptimeforge-dispatch` (every minute) and `uptimeforge-cleanup` (02:00 UTC daily). Inspect existing schedules first, including their destinations, and confirm exactly one matching schedule of each kind. A daily UTC cleanup stays at 02:00 UTC across DST changes.

Confirm real signed dispatch calls, durable publication, check completion and nextCheckAt movement. Exercise actual provider retry/redelivery without fabricating endpoint failures. Inspect QStash events/DLQ and application structured logs. Recovery must reclaim expired leases, fence old workers and leave completed jobs idempotent. Never hold a DB transaction during HTTP/email calls. Do not report schedule creation alone as automatic-check success.

## Production smoke test and cleanup

Record timestamps, deployment ID/SHA and provider IDs without storing tokens. Use a designated account and explicitly named disposable monitors/status pages. Do not inject a test authentication bypass into production.

1. Complete real GitHub login in the browser; verify session cookies and private dashboard. Anonymous API access must remain 401, foreign resources 404 and invalid mutation origin 403.
2. Create a public HTTP monitor, run Check now and verify a stored result, visible history, chart and check-based uptime. Confirm manual scheduling does not disturb nextCheckAt.
3. Observe at least one genuine scheduler-driven check through QStash, outside an open UI session. Verify signed workers, no duplicate Check and a subsequent scheduled time.
4. Use an owned, controlled public HTTPS fixture to return 503 twice, then 200 twice. Validate one incident and one accepted/opened alert, then one recovery and one accepted/recovery alert. Preserve real provider IDs and verify receipt. Do not classify a provider mock or manually inserted database incident as production evidence.
5. Publish a status page, check safe HTML/RSC projection without URLs/tokens/owner identifiers, then unpublish and confirm immediate 404 even after caching.
6. Pause/resume, queued edit/delete and duplicate delivery must remain safe. Confirm private/reserved/mixed-DNS/redirect targets remain blocked before connection; do not probe internal infrastructure in production.
7. Log out and verify session invalidation. Remove only identified smoke resources via owner-scoped deletion. Verify cascades and absence of remaining smoke jobs/deliveries; never run a blanket production cleanup.
8. Confirm no residual controlled-outage monitors are scheduled. Delete the fixture endpoint if created solely for smoke. Inspect ordinary application data is unaffected.

## Recovery and release

On a deployment regression, pause schedules if needed and promote the last verified Vercel deployment. Assess migration compatibility before rollback; do not reverse applied SQL blindly. For UNKNOWN email deliveries, reconcile the frozen key with Resend before another send; never blindly retry outside its idempotency window.

After every relevant change run quality gates, review the diff/secrets, commit, push and inspect CI for the exact SHA. Release only after the full specification DoD and production smoke/cleanup pass. Then create an annotated `v1.0.0` tag on the verified commit, push the tag and create the GitHub Release with honest integration results and known limitations. No tag or release is created while this runbook still has blocked production gates.
