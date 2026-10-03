import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{40,}\b/,
  /\bre_[A-Za-z0-9]{30,}\b/,
];
const failures = files.filter((file) => {
  if (/(^|\/)\.env(?:\.|$)/.test(file) && file !== ".env.example") return true;
  const source = readFileSync(file, "utf8");
  return patterns.some((pattern) => pattern.test(source));
});
if (failures.length) {
  console.error("Potential secret files:", failures.join(", "));
  process.exit(1);
}
console.info(
  `Reviewed ${files.length} tracked files for common secret formats; provider-specific manual review remains required.`,
);
