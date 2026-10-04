import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { SignOutButton } from "@/components/auth-controls";
import { ThemeToggle } from "@/components/theme-toggle";
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
        <ThemeToggle />
        <span className="text-sm">
          {user.name}
          <span className="ml-4">
            <SignOutButton />
          </span>
        </span>
      </header>
      <main id="main-content" className="py-10">
        {process.env.SCHEDULER_MODE === "bounded" && (
          <p
            role="status"
            className="mb-6 rounded-lg border border-amber-500 p-4 text-sm"
          >
            Continuous automatic monitoring is disabled on this smoke
            deployment. Check now is available; automatic checks run only during
            operator tests.
          </p>
        )}
        {process.env.RESEND_MODE === "sandbox" && (
          <p
            role="status"
            className="mb-6 rounded-lg border border-amber-500 p-4 text-sm"
          >
            Email sandbox: alerts are available only to the operator’s test
            account. Other recipients are skipped until a sending domain is
            verified.
          </p>
        )}
        {children}
      </main>
    </div>
  );
}
