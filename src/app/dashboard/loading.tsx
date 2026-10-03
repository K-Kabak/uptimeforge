export default function Loading() {
  return (
    <div role="status" aria-label="Loading dashboard" className="space-y-6">
      <div className="h-10 w-48 animate-pulse rounded-lg bg-slate-400/20" />
      {[1, 2, 3].map((key) => (
        <div
          key={key}
          className="h-28 animate-pulse rounded-xl bg-slate-400/20"
        />
      ))}
    </div>
  );
}
