import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { SignOutButton } from "@/components/auth-controls";
export const metadata = { robots: { index: false, follow: false } };
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/signin");
  return (
    <div className="mx-auto max-w-7xl px-6">
      <header className="flex flex-wrap items-center justify-between gap-6 border-b border-slate-400/20 py-6">
        <Link href="/dashboard" className="font-bold">
          UptimeForge
        </Link>
        <nav className="flex gap-6" aria-label="Dashboard">
          <Link href="/dashboard">Monitors</Link>
          <Link href="/dashboard/status-pages">Status pages</Link>
          <Link href="/dashboard/account">Account</Link>
        </nav>
        <span className="text-sm">
          {user.name}
          <span className="ml-4">
            <SignOutButton />
          </span>
        </span>
      </header>
      <main className="py-10">{children}</main>
    </div>
  );
}
