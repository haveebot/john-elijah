"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HqSignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", display_name: "", signup_key: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      router.push("/hq");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.message ?? "Signup failed — check the signup key.");
      setBusy(false);
    }
  }

  const inputCls =
    "rounded-lg border border-canvas-edge bg-canvas-raised px-4 py-2.5 text-ink placeholder:text-ink-faint focus:border-brass focus:outline-none";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5">
      <p className="label">John Elijah HQ · Operator signup</p>
      <form onSubmit={submit} className="mt-8 flex w-full max-w-sm flex-col gap-4">
        <input type="text" placeholder="Display name" className={inputCls}
          value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
        <input type="email" required placeholder="Email" className={inputCls}
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input type="password" required placeholder="Password (10+ chars)" className={inputCls}
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <input type="password" required placeholder="Signup key" className={inputCls}
          value={form.signup_key} onChange={(e) => setForm({ ...form, signup_key: e.target.value })} />
        <button type="submit" disabled={busy}
          className="rounded-full bg-brass px-6 py-2.5 font-medium text-canvas transition-opacity hover:opacity-90 disabled:opacity-50">
          {busy ? "Creating…" : "Create operator account"}
        </button>
        {error ? <p className="text-center text-sm text-coral">{error}</p> : null}
      </form>
    </main>
  );
}
