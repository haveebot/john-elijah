"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="whitespace-nowrap text-ink-faint transition-colors hover:text-ink"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/hq/login");
        router.refresh();
      }}
    >
      Log out
    </button>
  );
}
