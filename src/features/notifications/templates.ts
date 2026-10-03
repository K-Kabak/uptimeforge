import { z } from "zod";
export const emailPayload = z.object({
  subject: z.string(),
  html: z.string(),
  text: z.string(),
  from: z.string(),
});
function escape(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export function incidentEmail(
  kind: "OPENED" | "RESOLVED",
  name: string,
  url: string,
  at: Date,
  from: string,
) {
  const title =
    kind === "OPENED" ? "Service outage confirmed" : "Service recovered";
  const text = `${title}\n${name}\n${at.toISOString()}\nView incident: ${url}`;
  return {
    from,
    subject: `${kind === "OPENED" ? "[DOWN]" : "[UP]"} ${name}`,
    text,
    html: `<!doctype html><html><body><h1>${title}</h1><p>${escape(name)}</p><p>${escape(at.toISOString())}</p><p><a href="${escape(url)}">View incident in UptimeForge</a></p></body></html>`,
  };
}
