"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { StageIdent } from "@/components/stage-ident";

export function LoginScene({ photo }: { photo: { url: string; alt: string } | null }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "bad">("idle");
  const [identOn, setIdentOn] = useState(false);
  const [lit, setLit] = useState(false);
  const onReady = useCallback((r: boolean) => { setIdentOn(r); if (r) setLit(true); }, []);
  useEffect(() => {
    const t = window.setTimeout(() => setLit(true), 1500);
    return () => window.clearTimeout(t);
  }, []);

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
    <main className="relative flex min-h-screen flex-col items-center justify-end overflow-hidden bg-canvas px-5 pb-16">
      {photo ? (
        <Image src={photo.url} alt={photo.alt} fill priority sizes="100vw" className="hero-drift object-cover object-center" />
      ) : null}
      <div className="stage-veil absolute inset-0" aria-hidden />
      <div className="absolute inset-0 bg-canvas/40" aria-hidden />
      <div className="absolute inset-0">
        <StageIdent onReady={onReady} />
      </div>
      <div className={`pointer-events-none absolute inset-0 z-20 bg-canvas transition-opacity duration-700 ease-out ${lit ? "opacity-0" : "opacity-100"}`} aria-hidden />

      <form
        onSubmit={submit}
        className="relative z-10 w-full max-w-xs rounded-lg border border-brass/40 bg-canvas/55 px-7 py-8 text-center shadow-2xl backdrop-blur-md"
      >
        {!identOn ? <p className="wordmark text-4xl">John Elijah</p> : null}
        <p className="label mt-1">HQ</p>
        <input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Access code"
          autoComplete="off"
          className="field mt-6 text-center font-display text-xl tracking-[0.25em]"
        />
        <button type="submit" disabled={status === "busy"} className="btn btn-brass mt-4 w-full disabled:opacity-50">
          {status === "busy" ? "Checking…" : "Come on in"}
        </button>
        {status === "bad" ? <p className="mt-3 text-sm text-coral">That code didn&apos;t work.</p> : null}
      </form>
    </main>
  );
}
