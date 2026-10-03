"use client";
import { signIn, signOut } from "next-auth/react";
import { Button } from "./ui/button";
export function SignInButton() {
  return (
    <Button onClick={() => signIn("github", { callbackUrl: "/dashboard" })}>
      Continue with GitHub
    </Button>
  );
}
export function SignOutButton() {
  return (
    <button
      className="text-sm underline"
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      Sign out
    </button>
  );
}
