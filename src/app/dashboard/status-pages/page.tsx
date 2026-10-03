import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { CopyUrl } from "@/components/status-pages/copy-url";
export default async function StatusPages() {
  const user = await requireUser();
  const pages = await db().statusPage.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return (
    <>
      <div className="flex justify-between">
        <h1 className="text-3xl font-bold">Status pages</h1>
        <Link
          className="rounded-lg bg-emerald-700 px-4 py-3 text-white"
          href="/dashboard/status-pages/new"
        >
          New status page
        </Link>
      </div>
      <p className="my-6 opacity-70">
        Share the availability of selected services.
      </p>
      {!pages.length && (
        <p className="rounded-xl border border-dashed p-12">
          No status pages yet.
        </p>
      )}
      {pages.map((p) => (
        <article
          className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-400/20 p-6"
          key={p.id}
        >
          <div>
            <Link
              className="font-semibold"
              href={`/dashboard/status-pages/${p.id}`}
            >
              {p.name}
            </Link>
            <p className="mt-1 text-sm opacity-60">
              {p.isPublished ? "Published" : "Unpublished"} · /status/{p.slug}
            </p>
          </div>
          <div className="flex gap-4">
            <Link href={`/dashboard/status-pages/${p.id}`}>Edit</Link>
            {p.isPublished && <Link href={`/status/${p.slug}`}>View</Link>}
            <CopyUrl path={`/status/${p.slug}`} />
          </div>
        </article>
      ))}
    </>
  );
}
