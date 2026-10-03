"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";
type Values = {
  id?: string;
  name: string;
  url: string;
  intervalMinutes: number;
  timeoutMs: number;
};
export function MonitorForm({ monitor }: { monitor?: Values }) {
  const toast = useToast();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(
        monitor ? `/api/monitors/${monitor.id}` : "/api/monitors",
        {
          method: monitor ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.get("name"),
            url: data.get("url"),
            intervalMinutes: Number(data.get("interval")),
            timeoutMs: Number(data.get("timeout")) * 1000,
          }),
        },
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.error.message);
      toast(monitor ? "Monitor updated" : "Monitor created");
      router.push(`/dashboard/monitors/${body.data.id}`);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not save monitor",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="mt-8 grid max-w-xl gap-6">
      {error && (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      )}
      <label className="grid gap-2">
        Name
        <input
          className="rounded-lg border p-3"
          name="name"
          required
          minLength={2}
          maxLength={80}
          defaultValue={monitor?.name}
        />
      </label>
      <label className="grid gap-2">
        URL
        <input
          className="rounded-lg border p-3"
          name="url"
          type="url"
          required
          defaultValue={monitor?.url}
          placeholder="https://example.com/health"
        />
      </label>
      <label className="grid gap-2">
        Interval
        <select
          className="rounded-lg border p-3"
          name="interval"
          defaultValue={monitor?.intervalMinutes ?? 5}
        >
          {[5, 10, 15, 30, 60].map((n) => (
            <option key={n} value={n}>
              {n} minutes
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-2">
        Timeout (seconds)
        <input
          className="rounded-lg border p-3"
          name="timeout"
          type="number"
          min={1}
          max={10}
          required
          defaultValue={(monitor?.timeoutMs ?? 10000) / 1000}
        />
      </label>
      <Button disabled={busy}>{busy ? "Saving…" : "Save monitor"}</Button>
    </form>
  );
}
