import type { Incident } from "@prisma/client";
export function Incidents({ incidents }: { incidents: Incident[] }) {
  return (
    <section className="my-10">
      <h2 className="text-xl font-semibold">Incidents</h2>
      {!incidents.length ? (
        <p className="mt-4 opacity-60">No incidents recorded.</p>
      ) : (
        incidents.map((i) => (
          <article
            key={i.id}
            className="my-4 rounded-xl border border-slate-400/20 p-5"
          >
            <p className="font-semibold">
              {i.status === "OPEN" ? "Active incident" : "Resolved incident"}
            </p>
            <p className="mt-2">{i.cause}</p>
            <p className="mt-2 text-sm opacity-60">
              Started {i.startedAt.toISOString()} ·{" "}
              {i.resolvedAt
                ? `Resolved ${i.resolvedAt.toISOString()}`
                : "Awaiting recovery"}
              {i.resolutionReason === "TARGET_CHANGED"
                ? " · Monitor URL changed"
                : ""}
            </p>
          </article>
        ))
      )}
    </section>
  );
}
