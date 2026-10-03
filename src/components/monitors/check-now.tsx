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
      setMessage("Check queued…");
      for (let attempt = 0; attempt < 30; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const response = await fetch(
          `/api/monitors/${id}/jobs/${b.data.jobId}`,
        );
        const body = await response.json();
        if (!response.ok) throw new Error(body.error.message);
        if (body.data.status === "COMPLETED") {
          setMessage(
            `${body.data.check.result} · ${body.data.check.durationMs} ms`,
          );
          break;
        }
        if (["CANCELLED", "FAILED"].includes(body.data.status)) {
          setMessage("Check cancelled or expired. Please try again.");
          break;
        }
        if (attempt === 29)
          setMessage("Still queued. The result will appear in history.");
      }
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
