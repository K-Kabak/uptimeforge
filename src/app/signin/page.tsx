import { SignInButton } from "@/components/auth-controls";
export default function SignIn() {
  const configured = Boolean(
    process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET,
  );
  return (
    <main id="main-content" className="mx-auto max-w-lg px-6 py-24">
      <h1 className="text-4xl font-bold">Welcome to UptimeForge</h1>
      <p className="my-6 opacity-70">
        Sign in with your GitHub account to monitor your services.
      </p>
      {configured ? (
        <SignInButton />
      ) : (
        <p role="status">
          GitHub sign-in requires OAuth credentials in this development
          environment.
        </p>
      )}
    </main>
  );
}
