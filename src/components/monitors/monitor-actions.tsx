"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
export function MonitorActions({
  id,
  paused,
}: {
  id: string;
  paused: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function run(action: string) {
    if (
      action === "delete" &&
      !window.confirm("Delete this monitor and all its history?")
    )
      return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch(
        `/api/monitors/${id}${action === "delete" ? "" : `/${action}`}`,
        { method: action === "delete" ? "DELETE" : "POST" },
      );
      const b = await r.json();
      if (!r.ok) throw new Error(b.error.message);
      if (action === "delete") router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="my-6 flex flex-wrap gap-3">
      <Button disabled={busy} onClick={() => run(paused ? "resume" : "pause")}>
        {paused ? "Resume" : "Pause"}
      </Button>
      <Button
        className="bg-red-700 hover:bg-red-800"
        disabled={busy}
        onClick={() => run("delete")}
      >
        Delete monitor
      </Button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
