import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { captureAttributionSource } from "~/client/attribution";
import { authSignup } from "~/server/api";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [signupSource, setSignupSource] = useState<string | null>(null);

  useEffect(() => {
    setSignupSource(captureAttributionSource());
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await authSignup({ data: { businessName, email, password, signupSource } });
      if (!result.ok) {
        setError(result.error ?? "Could not create the account.");
        return;
      }
      window.location.replace("/operator");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the account.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-10 text-slate-900">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <a href="/" className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">ReceptIO</a>
        <h1 className="mt-5 text-2xl font-bold">Create your help desk</h1>
        <p className="mt-1 text-sm text-slate-600">Start a workspace for your business. No verification email is required.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700">Business name<input required value={businessName} onChange={(event) => setBusinessName(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600" /></label>
          <label className="block text-sm font-medium text-slate-700">Email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600" /></label>
          <label className="block text-sm font-medium text-slate-700">Password<input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600" /><span className="mt-1 block text-xs font-normal text-slate-500">At least 8 characters.</span></label>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
          <button disabled={busy} className="w-full rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">{busy ? "Creating…" : "Create account"}</button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-600">Already have an account? <a className="font-semibold text-teal-700 underline" href="/login">Sign in</a></p>
      </section>
    </main>
  );
}
