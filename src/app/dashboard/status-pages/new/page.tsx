import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { StatusPageEditor } from "@/components/status-pages/editor";
export default async function NewStatusPage() {
  const user = await requireUser();
  const monitors = await db().monitor.findMany({
    where: { userId: user.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return (
    <>
      <h1 className="text-3xl font-bold">New status page</h1>
      <StatusPageEditor monitors={monitors} />
    </>
  );
}
