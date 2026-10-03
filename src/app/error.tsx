"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="p-12">
      <h1 className="text-2xl">Something went wrong</h1>
      <p>Please try again. Your private details are never displayed here.</p>
      <button onClick={reset} className="mt-6 underline">
        Try again
      </button>
    </main>
  );
}
