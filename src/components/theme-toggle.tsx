"use client";
import { useTheme } from "next-themes";
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <select
      aria-label="Color theme"
      className="rounded-lg border bg-transparent p-2 text-sm"
      value={theme ?? "system"}
      onChange={(event) => setTheme(event.target.value)}
    >
      <option value="system">System theme</option>
      <option value="light">Light theme</option>
      <option value="dark">Dark theme</option>
    </select>
  );
}
