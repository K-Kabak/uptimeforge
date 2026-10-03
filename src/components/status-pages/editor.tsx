"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";
type Selection = { monitorId: string; displayName?: string | null };
type Page = {
  id: string;
  name: string;
  slug: string;
  description: string;
  isPublished: boolean;
  monitors: Selection[];
};
export function StatusPageEditor({
  page,
  monitors,
}: {
  page?: Page;
  monitors: { id: string; name: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [selected, setSelected] = useState<Selection[]>(page?.monitors ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const r = await fetch(
        page ? `/api/status-pages/${page.id}` : "/api/status-pages",
        {
          method: page ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.get("name"),
            slug: form.get("slug"),
            description: form.get("description"),
            isPublished: form.has("published"),
            monitors: selected.map((s) => ({
              monitorId: s.monitorId,
              ...(s.displayName ? { displayName: s.displayName } : {}),
            })),
          }),
        },
      );
      const b = await r.json();
      if (!r.ok) throw new Error(b.error.message);
      toast("Status page saved");
      router.push("/dashboard/status-pages");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save status page");
    } finally {
      setBusy(false);
    }
  }
  function move(index: number, delta: number) {
    const values = [...selected];
    [values[index], values[index + delta]] = [
      values[index + delta],
      values[index],
    ];
    setSelected(values);
  }
  async function remove() {
    if (!page || !window.confirm("Delete this status page?")) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/status-pages/${page.id}`, {
        method: "DELETE",
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error.message);
      router.push("/dashboard/status-pages");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="mt-8 grid max-w-2xl gap-6">
      {error && (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      )}
      <label className="grid gap-2">
        Page name
        <input
          className="rounded-lg border p-3"
          name="name"
          minLength={2}
          maxLength={80}
          required
          defaultValue={page?.name}
        />
      </label>
      <label className="grid gap-2">
        Public slug
        <input
          className="rounded-lg border p-3"
          name="slug"
          minLength={3}
          maxLength={50}
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          defaultValue={page?.slug}
          placeholder="acme-services"
        />
      </label>
      <label className="grid gap-2">
        Description
        <textarea
          className="rounded-lg border p-3"
          name="description"
          maxLength={1000}
          defaultValue={page?.description}
        />
      </label>
      <label className="flex gap-3">
        <input
          name="published"
          type="checkbox"
          defaultChecked={page?.isPublished}
        />
        Publish this status page
      </label>
      <fieldset className="grid gap-3">
        <legend className="mb-3 font-semibold">
          Select monitors ({selected.length}/10)
        </legend>
        {monitors.map((m) => (
          <label key={m.id} className="flex gap-3">
            <input
              type="checkbox"
              checked={selected.some((s) => s.monitorId === m.id)}
              disabled={
                selected.length >= 10 &&
                !selected.some((s) => s.monitorId === m.id)
              }
              onChange={(e) =>
                setSelected(
                  e.target.checked
                    ? [...selected, { monitorId: m.id }]
                    : selected.filter((s) => s.monitorId !== m.id),
                )
              }
            />
            {m.name}
          </label>
        ))}
      </fieldset>
      <section>
        <h2 className="font-semibold">Public names and order</h2>
        {selected.map((s, i) => (
          <div
            key={s.monitorId}
            className="my-3 flex flex-wrap items-center gap-3"
          >
            <label className="flex-1">
              {monitors.find((m) => m.id === s.monitorId)?.name}
              <input
                aria-label={`Public name for ${monitors.find((m) => m.id === s.monitorId)?.name}`}
                className="mt-2 block w-full rounded border p-2"
                placeholder="Optional public name"
                value={s.displayName ?? ""}
                maxLength={80}
                onChange={(e) =>
                  setSelected(
                    selected.map((v, n) =>
                      n === i ? { ...v, displayName: e.target.value } : v,
                    ),
                  )
                }
              />
            </label>
            <button
              type="button"
              aria-label={`Move ${i + 1} up`}
              disabled={i === 0}
              onClick={() => move(i, -1)}
            >
              ↑
            </button>
            <button
              type="button"
              aria-label={`Move ${i + 1} down`}
              disabled={i === selected.length - 1}
              onClick={() => move(i, 1)}
            >
              ↓
            </button>
          </div>
        ))}
      </section>
      <div className="flex gap-4">
        <Button disabled={busy}>{busy ? "Saving…" : "Save status page"}</Button>
        {page && (
          <Button
            type="button"
            className="bg-red-700 hover:bg-red-800"
            disabled={busy}
            onClick={remove}
          >
            Delete page
          </Button>
        )}
      </div>
    </form>
  );
}
