"use client";

import { useActionState } from "react";
import { actionCreateAgentToken } from "../actions";

type State = { token: string | null };

async function create(_prev: State, formData: FormData): Promise<State> {
  const result = await actionCreateAgentToken(formData);
  return { token: result?.token ?? null };
}

export function TokenCreator() {
  const [state, formAction, pending] = useActionState(create, { token: null });

  return (
    <div>
      <form action={formAction} className="flex gap-3">
        <input
          name="name"
          required
          placeholder="Token name (e.g. claude-ops)"
          className="flex-1 rounded-lg border border-canvas-edge bg-canvas-raised px-4 py-2 text-ink placeholder:text-ink-faint focus:border-brass focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full border border-canvas-edge px-4 py-2 text-sm text-ink-dim hover:border-ink-faint hover:text-ink disabled:opacity-50"
        >
          {pending ? "Minting…" : "Create token"}
        </button>
      </form>
      {state.token ? (
        <div className="mt-4 rounded-lg border border-brass/50 bg-canvas-raised p-4">
          <p className="label mb-2">Copy it now — shown once</p>
          <code className="break-all text-sm text-brass">{state.token}</code>
        </div>
      ) : null}
    </div>
  );
}
