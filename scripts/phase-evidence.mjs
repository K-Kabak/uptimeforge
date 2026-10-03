import { readFileSync, writeFileSync } from "node:fs";
const [phase, status, evidence] = process.argv.slice(2);
if (!/^\d+$/.test(phase) || !status || !evidence)
  throw new Error("Provide phase, status and verified evidence");
const path = new URL("../docs/progress.md", import.meta.url);
let content = readFileSync(path, "utf8");
content = content.replace(
  new RegExp(`^\\| ${phase} ([^|]+)\\|[^\\n]+`, "m"),
  `| ${phase} $1| ${status} |`,
);
content += `\n- Phase ${phase}: ${evidence}\n`;
writeFileSync(path, content);
