"use client";
import { useSyncExternalStore } from "react";
const subscribe = () => () => {};
export function LocalTime({ value }: { value: string | null }) {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  if (!value) return <span>Never</span>;
  return (
    <time dateTime={value} title={value}>
      {mounted
        ? new Date(value).toLocaleString()
        : new Date(value).toUTCString()}
    </time>
  );
}
