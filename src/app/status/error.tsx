"use client";
export default function StatusError({ reset }: { reset: () => void }) {
  return (
    <main id="main-content" className="mx-auto max-w-xl p-12">
      <h1 className="text-2xl font-bold">Status temporarily unavailable</h1>
      <p className="my-4">Please wait a moment and try again.</p>
      <button className="underline" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
