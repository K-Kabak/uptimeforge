# Deployment status — 3 October 2026

Phase 14 is in progress. Phase 15 documentation is prepared; release remains blocked until the production Definition of Done is verified.

| Item                          | Actual state                                                                                                                              |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub                        | Public K-Kabak/uptimeforge; main; existing CI green before this deployment-preparation milestone                                          |
| Vercel                        | Project uptimeforge created in k-kabaks-projects, Hobby; GitHub repository connected; framework Next.js; Node 24                          |
| Production URL                | No successful production deployment yet                                                                                                   |
| Reserved domain / environment | uptimeforge.vercel.app verified by Vercel; APP_URL, NEXTAUTH_URL and encrypted random NEXTAUTH_SECRET configured for production           |
| Neon                          | No existing marketplace resource found; free_v3 provisioning blocked by browser terms acceptance                                          |
| Upstash Redis                 | No existing marketplace resource found; Free provisioning blocked by browser terms acceptance; intended autoUpgrade=false, prodPack=false |
| QStash                        | No installed marketplace resource; Free capacity cannot cover the required continuous minute dispatcher                                   |
| Resend                        | Credentials/domain verification not available; no real alert sent                                                                         |
| GitHub OAuth                  | Production OAuth app credentials not available; real login not verified                                                                   |
| Production migrations         | Not executed; production database does not exist yet                                                                                      |
| Scheduler / smoke / cleanup   | Not executed in production                                                                                                                |
| v1.0.0 / GitHub Release       | Not created; production verification remains incomplete                                                                                   |

Current user action: accept Neon marketplace terms at the CLI-provided Vercel URL. Afterwards retry the same named resource operation, first listing existing resources to prevent duplication. Upstash authorization, OAuth app registration, Resend access/domain DNS and queue-capacity approval are tracked subsequent dependencies, not completed integrations.

No paid plan has been activated. No existing taskflow or freight-flow resource has been modified. Only the UptimeForge project is in scope. Local screenshots use disposable fixtures, not production data.
