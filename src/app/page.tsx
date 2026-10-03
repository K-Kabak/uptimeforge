import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { StatusBadge } from "@/components/status-badge";
export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-400/20 py-6">
        <Link href="/" className="text-lg font-bold">
          UptimeForge<span className="text-emerald-600">.</span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-4">
          <ThemeToggle />
          <Link href="/signin" className="rounded-lg border px-4 py-2">
            Sign in
          </Link>
        </nav>
      </header>
      <main id="main-content">
        <section className="grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="font-mono text-sm text-emerald-700 dark:text-emerald-300">
              SERVICE MONITORING / BUILT FOR DEVELOPERS
            </p>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">
              Know when your services need you.
            </h1>
            <p className="mt-6 text-lg opacity-75">
              Track HTTP availability, investigate confirmed incidents and keep
              your users informed with a public status page.
            </p>
            <Link
              className="mt-8 inline-block rounded-xl bg-emerald-700 px-6 py-3 font-semibold text-white"
              href="/signin"
            >
              Sign in with GitHub
            </Link>
            <p className="mt-4 text-sm opacity-60">
              Up to 10 active monitors. Checks from every 5 minutes.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-400/25 p-6 shadow-xl">
            <p className="mb-6 font-mono text-xs opacity-60">
              EXAMPLE WORKSPACE
            </p>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Your services</h2>
              <span className="text-sm opacity-60">3 monitors</span>
            </div>
            <div className="mt-6 space-y-3">
              {[
                { name: "Website", host: "web.example", status: "UP" as const },
                { name: "API", host: "api.example", status: "DOWN" as const },
                {
                  name: "Worker",
                  host: "jobs.example",
                  status: "PENDING" as const,
                },
              ].map((service) => (
                <div
                  key={service.name}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-400/20 p-4"
                >
                  <div>
                    <p className="font-semibold">{service.name}</p>
                    <p className="text-xs opacity-60">{service.host}</p>
                  </div>
                  <StatusBadge status={service.status} />
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs opacity-60">
              Illustrative dashboard. Connect your own services after signing
              in.
            </p>
          </div>
        </section>
        <section aria-label="Features" className="grid gap-5 md:grid-cols-3">
          {[
            {
              title: "HTTP monitoring",
              text: "Availability, response times and 24h / 7d / 30d check-based uptime in one workspace.",
            },
            {
              title: "Confirmed incidents",
              text: "Two consecutive failures confirm an outage. Two successes confirm recovery, with email alerts.",
            },
            {
              title: "Public status pages",
              text: "Choose services, set public names and share an ordered view of availability and incidents.",
            },
          ].map((feature) => (
            <article
              key={feature.title}
              className="rounded-xl border border-slate-400/20 p-6"
            >
              <h2 className="text-lg font-bold">{feature.title}</h2>
              <p className="mt-3 leading-relaxed opacity-75">{feature.text}</p>
            </article>
          ))}
        </section>
        <section className="my-16 grid gap-6 rounded-2xl border border-slate-400/20 p-8 md:grid-cols-2">
          <h2 className="text-3xl font-semibold">
            Reliable checks start with careful boundaries.
          </h2>
          <p className="leading-relaxed opacity-75">
            Targets are checked against public IP rules before connecting.
            Redirects are validated independently. Durable jobs and idempotency
            protect check results, incidents and alert retries.
          </p>
        </section>
        <section className="py-8 text-center">
          <h2 className="text-3xl font-semibold">
            Give your services a clear status.
          </h2>
          <Link
            href="/signin"
            className="mt-6 inline-block rounded-xl bg-emerald-700 px-6 py-3 text-white"
          >
            Start monitoring
          </Link>
        </section>
      </main>
      <footer className="mt-12 flex flex-wrap justify-between gap-4 border-t border-slate-400/20 py-8 text-sm opacity-65">
        <span>UptimeForge · Check-based uptime, not a continuous SLA</span>
        <a href="https://github.com/K-Kabak/uptimeforge">
          Source on GitHub · MIT
        </a>
      </footer>
    </div>
  );
}
