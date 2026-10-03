"use client";
import { useState } from "react";
type Row = {
  id: string;
  startedAt: string;
  result: string;
  httpStatus: number | null;
  durationMs: number;
};
export function CheckHistory({
  monitorId,
  initial,
  nextCursor,
}: {
  monitorId: string;
  initial: Row[];
  nextCursor: string | null;
}) {
  const [rows, setRows] = useState(initial);
  const [cursor, setCursor] = useState(nextCursor);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load(selected = filter, more = false) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(
        `/api/monitors/${monitorId}/checks?filter=${selected}${more && cursor ? `&cursor=${cursor}` : ""}`,
      );
      const b = await r.json();
      if (!r.ok) throw new Error(b.error.message);
      setRows(more ? [...rows, ...b.data.checks] : b.data.checks);
      setCursor(b.data.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load history");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="my-8">
      <h2 className="text-xl font-semibold">Check history</h2>
      <label className="my-4 block">
        Filter{" "}
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            void load(e.target.value);
          }}
        >
          <option value="all">All checks</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
        </select>
      </label>
      {error && <p role="alert">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th>Time</th>
              <th>Result</th>
              <th>HTTP</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-400/20">
                <td className="py-3">
                  {new Date(r.startedAt).toLocaleString()}
                </td>
                <td>{r.result}</td>
                <td>{r.httpStatus ?? "—"}</td>
                <td>{r.durationMs} ms</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="py-6">No checks yet.</p>}
      </div>
      {cursor && (
        <button
          className="my-4 underline"
          disabled={busy}
          onClick={() => load(filter, true)}
        >
          {busy ? "Loading…" : "Load more"}
        </button>
      )}
    </section>
  );
}
