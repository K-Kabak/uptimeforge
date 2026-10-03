import Link from "next/link";
export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-24">
      <p className="font-mono text-sm text-emerald-600">
        UPTIMEFORGE / SERVICE MONITORING
      </p>
      <h1 className="mt-6 max-w-3xl text-6xl font-bold tracking-tight">
        Know when your services need you.
      </h1>
      <p className="mt-6 max-w-xl text-lg opacity-70">
        Reliable HTTP monitoring, actionable incidents and transparent status
        pages.
      </p>
      <Link
        className="mt-8 inline-block rounded-xl bg-emerald-700 px-6 py-3 text-white"
        href="/signin"
      >
        Sign in with GitHub
      </Link>
    </main>
  );
}
