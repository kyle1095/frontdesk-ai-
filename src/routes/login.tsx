import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authLogin, authMe } from "~/server/api";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void authMe().then((account) => {
      if (account) window.location.replace("/operator");
    });
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await authLogin({ data: { email, password } });
      if (!result.ok) {
        setError(result.error ?? "Could not sign in.");
        return;
      }
      window.location.replace("/operator");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Sign in" subtitle="Open your business help desk operator view.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        <strong className="text-slate-800">Demo account</strong><br />
        Email: <code>demo@cadence.example</code><br />
        Password: <code>CadenceDemo2026!</code>
      </div>
      <p className="mt-5 text-center text-sm text-slate-600">New business? <a className="font-semibold text-teal-700 underline" href="/signup">Create an account</a></p>
    </AuthShell>
  );
}

function Field({ label, type, value, onChange, autoComplete }: { label: string; type: string; value: string; onChange: (value: string) => void; autoComplete: string }) {
  return <label className="block text-sm font-medium text-slate-700">{label}<input required type={type} value={value} autoComplete={autoComplete} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600" /></label>;
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-10 text-slate-900"><section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><a href="/" className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Frontdesk AI</a><h1 className="mt-5 text-2xl font-bold">{title}</h1><p className="mt-1 text-sm text-slate-600">{subtitle}</p>{children}</section></main>;
}
