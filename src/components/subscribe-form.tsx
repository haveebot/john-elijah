"use client";

import { useState } from "react";

export function SubscribeForm({ source = "home" }: { source?: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    setState("busy");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return <p className="mt-6 text-brass md:mt-0">You&apos;re on the list.</p>;
  }

  return (
    <form onSubmit={submit} className="mt-6 flex w-full max-w-md gap-3 md:mt-0">
      <input
        type="email"
        name="email"
        required
        placeholder="you@email.com"
        className="field"
      />
      <button type="submit" disabled={state === "busy"} className="btn btn-brass whitespace-nowrap disabled:opacity-50">
        {state === "busy" ? "…" : "Join"}
      </button>
      {state === "error" ? <p className="text-sm text-coral">Try again?</p> : null}
    </form>
  );
}
