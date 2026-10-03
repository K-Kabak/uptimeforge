"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
export function CheckNow({
  id,
  disabled = false,
}: {
  id: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  async function check() {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch(`/api/monitors/${id}/check`, { method: "POST" });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error.message);
      setMessage(`${b.data.result} · ${b.data.durationMs} ms`);
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Check failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="my-4">
      <Button disabled={busy || disabled} onClick={check}>
        {busy ? "Checking…" : "Check now"}
      </Button>
      <p className="mt-2" role="status">
        {message}
      </p>
    </div>
  );
}
