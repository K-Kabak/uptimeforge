import { cn } from "@/lib/ui";
export function Button({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex min-h-10 items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
