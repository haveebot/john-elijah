"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HqLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      router.push("/hq");
      router.refresh();
    } else {
      setError("That didn't match. Try again.");
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5">
      <p className="wordmark text-5xl">John Elijah</p>
      <p className="label mt-3">HQ</p>
      <form onSubmit={submit} className="mt-8 flex w-full max-w-sm flex-col gap-4">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="rounded-lg border border-canvas-edge bg-canvas-raised px-4 py-2.5 text-ink placeholder:text-ink-faint focus:border-brass focus:outline-none"
        />
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="rounded-lg border border-canvas-edge bg-canvas-raised px-4 py-2.5 text-ink placeholder:text-ink-faint focus:border-brass focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-brass px-6 py-2.5 font-medium text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Checking…" : "Come on in"}
        </button>
        {error ? <p className="text-center text-sm text-coral">{error}</p> : null}
      </form>
    </main>
  );
}
