"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HqLoginPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "bad">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("busy");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    }).catch(() => null);
    if (res?.ok) {
      router.push("/hq");
      router.refresh();
    } else {
      setStatus("bad");
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5">
      <p className="wordmark text-5xl">John Elijah</p>
      <p className="label mt-3">HQ</p>
      <form onSubmit={submit} className="mt-8 flex w-full max-w-xs flex-col gap-4">
        <input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Access code"
          autoComplete="off"
          className="field text-center font-display text-xl tracking-[0.25em]"
        />
        <button type="submit" disabled={status === "busy"} className="btn btn-brass disabled:opacity-50">
          {status === "busy" ? "Checking…" : "Come on in"}
        </button>
        {status === "bad" ? <p className="text-center text-sm text-coral">That code didn&apos;t work.</p> : null}
      </form>
      <p className="label mt-10">Port Aransas, Texas</p>
    </main>
  );
}
