import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadPublicStatus } from "@/lib/public-status";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await loadPublicStatus(slug);
  return page
    ? {
        title: `${page.name} status`,
        description: page.description,
        openGraph: {
          title: `${page.name} status`,
          description: page.description,
          type: "website",
        },
      }
    : { title: "Status page not found", robots: { index: false } };
}
export default async function PublicStatus({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const page = await loadPublicStatus((await params).slug);
  if (!page) notFound();
  return (
    <main id="main-content" className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm font-semibold text-emerald-600">SERVICE STATUS</p>
      <h1 className="mt-4 text-4xl font-bold">{page.name}</h1>
      <p className="mt-4 opacity-70">{page.description}</p>
      <div className="my-8 rounded-xl border border-slate-400/20 p-6">
        <h2 className="text-2xl font-semibold">{page.overall}</h2>
        <p className="mt-2 text-sm opacity-60">
          Last updated {page.lastUpdated}
        </p>
      </div>
      <section aria-label="Services" className="grid gap-4">
        {page.monitors.map((m, i) => (
          <article
            key={i}
            className="rounded-xl border border-slate-400/20 p-6"
          >
            <div className="flex justify-between">
              <h2 className="font-semibold">{m.name}</h2>
              <p>
                {m.status}
                {m.stale ? " · stale" : ""}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-6 text-sm">
              {Object.entries(m.uptime).map(([range, value]) => (
                <p key={range}>
                  {range}: {value === null ? "No data" : `${value.toFixed(2)}%`}
                </p>
              ))}
            </div>
          </article>
        ))}
      </section>
      <section className="mt-10">
        <h2 className="text-xl font-semibold">Recent incidents</h2>
        {!page.incidents.length && (
          <p className="mt-4 opacity-60">No incidents recorded.</p>
        )}
        {page.incidents.map((i, n) => (
          <article className="mt-4 border-t border-slate-400/20 pt-4" key={n}>
            <h3>
              {i.monitorName} · {i.status}
            </h3>
            <p className="text-sm opacity-70">
              {i.summary} · {i.startedAt}
              {i.resolvedAt ? ` → ${i.resolvedAt}` : ""}
            </p>
          </article>
        ))}
      </section>
      <footer className="mt-12 text-sm opacity-50">
        Powered by UptimeForge · Check-based uptime
      </footer>
    </main>
  );
}
