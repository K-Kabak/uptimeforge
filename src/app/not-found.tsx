import Link from "next/link";
export default function NotFound() {
  return (
    <main className="p-12">
      <h1 className="text-3xl">Page not found</h1>
      <Link href="/">Return home</Link>
    </main>
  );
}
