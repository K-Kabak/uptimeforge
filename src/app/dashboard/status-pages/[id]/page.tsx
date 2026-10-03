import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ownedStatusPage } from "@/features/status-pages/service";
import { StatusPageEditor } from "@/components/status-pages/editor";
export default async function EditStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const page = await ownedStatusPage(user.id, (await params).id).catch(() =>
    notFound(),
  );
  const monitors = await db().monitor.findMany({
    where: { userId: user.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return (
    <>
      <h1 className="text-3xl font-bold">Edit status page</h1>
      <StatusPageEditor page={page} monitors={monitors} />
    </>
  );
}
