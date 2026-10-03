"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
export function DeleteAccount() {
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error?.message ?? "Deletion failed");
      await signOut({ callbackUrl: "/" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Deletion failed");
      setBusy(false);
    }
  }
  return (
    <section className="rounded-xl border border-red-500 p-6">
      <h2 className="text-xl font-semibold">Delete account</h2>
      <p className="my-3">
        This permanently removes your monitors, history, incidents, status pages
        and sessions. Type DELETE to confirm.
      </p>
      <label htmlFor="delete-confirmation">Confirmation</label>
      <input
        id="delete-confirmation"
        className="mx-3 rounded border bg-transparent p-2"
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
        autoComplete="off"
      />
      <Button disabled={busy || confirmation !== "DELETE"} onClick={remove}>
        {busy ? "Deleting…" : "Delete account permanently"}
      </Button>
      {error && (
        <p role="alert" className="mt-3 text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}
