import { requireUser } from "@/lib/auth";
import { DeleteAccount } from "@/components/delete-account";
import { SignOutButton } from "@/components/auth-controls";
export const metadata = { title: "Account — UptimeForge" };
export default async function Account() {
  const user = await requireUser();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Account</h1>
      <p>
        {user.name} · {user.email ?? "No email provided"}
      </p>
      <SignOutButton />
      <DeleteAccount />
    </div>
  );
}
