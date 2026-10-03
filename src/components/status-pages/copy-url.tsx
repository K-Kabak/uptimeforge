"use client";
import { useState } from "react";
export function CopyUrl({ path }: { path: string }) {
  const [message, setMessage] = useState("Copy public URL");
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        new URL(path, window.location.origin).href,
      );
      setMessage("Copied");
    } catch {
      setMessage("Copy from your browser address bar");
    }
  }
  return (
    <button className="text-sm underline" type="button" onClick={copy}>
      {message}
    </button>
  );
}
