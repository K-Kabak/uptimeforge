const email = /^[^\s@<>;,]+@[^\s@<>;,]+\.[^\s@<>;,]+$/;
export function senderAddress(from: string) {
  return (from.match(/<([^<>]+)>$/)?.[1] ?? from).trim().toLowerCase();
}
export function emailPolicyErrors(env: Record<string, string | undefined>) {
  const mode = env.RESEND_MODE || "production";
  const sender = senderAddress(env.EMAIL_FROM ?? "");
  if (mode === "sandbox") {
    const errors: string[] = [];
    if (sender !== "onboarding@resend.dev")
      errors.push("EMAIL_FROM: sandbox requires onboarding@resend.dev");
    if (!email.test(env.RESEND_SANDBOX_RECIPIENT ?? ""))
      errors.push("RESEND_SANDBOX_RECIPIENT: one account-owner email required");
    return errors;
  }
  if (mode !== "production") return ["RESEND_MODE: invalid mode"];
  if (!email.test(sender) || sender.endsWith("@resend.dev"))
    return ["EMAIL_FROM: sender on a verified production domain required"];
  return [];
}
export function emailRecipientAllowed(
  recipient: string,
  from: string,
  env: Record<string, string | undefined> = process.env,
) {
  const mode = env.RESEND_MODE || "production";
  if (mode === "production") return true;
  if (mode !== "sandbox") return false;
  const allowed = env.RESEND_SANDBOX_RECIPIENT ?? "";
  return (
    senderAddress(from) === "onboarding@resend.dev" &&
    email.test(allowed) &&
    email.test(recipient) &&
    recipient.toLowerCase() === allowed.toLowerCase()
  );
}
