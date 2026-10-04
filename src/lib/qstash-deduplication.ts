import { createHash } from "node:crypto";
// QStash rejects ':' in transport identifiers. Hash framed parts rather than
// replacing characters, which could merge distinct logical deliveries.
export function queueDeduplicationId(...parts: (string | number)[]) {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}
