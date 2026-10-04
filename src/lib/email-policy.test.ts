import { expect, it } from "vitest";
import { emailPolicyErrors, emailRecipientAllowed } from "./email-policy";
const sandbox = {
  RESEND_MODE: "sandbox",
  EMAIL_FROM: "UptimeForge <onboarding@resend.dev>",
  RESEND_SANDBOX_RECIPIENT: "owner@example.test",
};
it("permits only an explicit sandbox with one account-owner recipient", () => {
  expect(emailPolicyErrors(sandbox)).toEqual([]);
  expect(
    emailRecipientAllowed("OWNER@example.test", sandbox.EMAIL_FROM, sandbox),
  ).toBe(true);
  for (const recipient of [
    "other@example.test",
    "owner@example.test,other@example.test",
    "Name <owner@example.test>",
    "owner@example.test\n",
    "",
  ]) {
    expect(emailRecipientAllowed(recipient, sandbox.EMAIL_FROM, sandbox)).toBe(
      false,
    );
  }
});
it("fails closed for invalid configuration and a stale sender", () => {
  expect(
    emailRecipientAllowed("owner@example.test", "old@example.test", sandbox),
  ).toBe(false);
  expect(
    emailRecipientAllowed("owner@example.test", sandbox.EMAIL_FROM, {
      ...sandbox,
      RESEND_MODE: "typo",
    }),
  ).toBe(false);
  expect(
    emailPolicyErrors({ ...sandbox, RESEND_SANDBOX_RECIPIENT: "" }),
  ).toHaveLength(1);
  expect(
    emailPolicyErrors({ ...sandbox, EMAIL_FROM: "alerts@resend.dev" }),
  ).toHaveLength(1);
  expect(
    emailPolicyErrors({ ...sandbox, RESEND_MODE: "production" }),
  ).toHaveLength(1);
});
