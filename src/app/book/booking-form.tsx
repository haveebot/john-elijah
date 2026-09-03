"use client";

import { useState } from "react";

const EVENT_KINDS = [
  { value: "venue", label: "Bar / club / restaurant" },
  { value: "private", label: "Private party" },
  { value: "wedding", label: "Wedding" },
  { value: "corporate", label: "Corporate event" },
  { value: "festival", label: "Festival / public event" },
  { value: "other", label: "Something else" },
];

const BUDGETS = [
  { value: "", label: "Not sure yet" },
  { value: "500", label: "Around $500" },
  { value: "1000", label: "Around $1,000" },
  { value: "1500", label: "Around $1,500" },
  { value: "2500", label: "$2,500 or more" },
];

type Config = { key: string; label: string; lineup: string };

export function BookingForm({
  configurations,
  defaultConfiguration,
}: {
  configurations: Config[];
  defaultConfiguration: string;
}) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [configuration, setConfiguration] = useState(defaultConfiguration);
  const [company_site, setCompanySite] = useState(""); // honeypot

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState("busy");
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_name: form.get("contact_name"),
          contact_email: form.get("contact_email"),
          contact_phone: form.get("contact_phone") || "",
          event_kind: form.get("event_kind"),
          event_date: form.get("event_date") || null,
          start_time: form.get("start_time") || "",
          hours: form.get("hours") || null,
          venue_name: form.get("venue_name") || "",
          city: form.get("city") || "",
          configuration,
          guests: form.get("guests") || null,
          budget: form.get("budget") || null,
          details: form.get("details") || "",
          company_site,
        }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-lg border border-brass/40 bg-canvas-raised p-8">
        <p className="script text-3xl text-brass">Got it.</p>
        <p className="mt-2 text-ink-dim">
          The date&apos;s in the book as an inquiry. You&apos;ll hear back with a quote and a hold —
          usually within a day.
        </p>
      </div>
    );
  }

  const inputCls = "field";
  const selected = configurations.find((c) => c.key === configuration);

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <p className="label mb-3">The lineup</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {configurations.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setConfiguration(c.key)}
              className={`rounded-lg border px-3 py-3 text-left transition-colors ${
                configuration === c.key
                  ? "border-brass bg-brass/10 text-ink"
                  : "border-canvas-edge text-ink-dim hover:border-ink-faint"
              }`}
            >
              <span className="wordmark block text-lg">{c.label}</span>
            </button>
          ))}
        </div>
        {selected ? <p className="mt-2 text-sm text-ink-dim">{selected.lineup}</p> : null}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className="label mb-2 block" htmlFor="event_kind">What kind of night</label>
          <select id="event_kind" name="event_kind" className={inputCls} defaultValue="venue">
            {EVENT_KINDS.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label mb-2 block" htmlFor="event_date">Date</label>
          <input id="event_date" name="event_date" type="date" className={inputCls} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div>
          <label className="label mb-2 block" htmlFor="start_time">Start time</label>
          <input id="start_time" name="start_time" placeholder="8:00 PM" className={inputCls} />
        </div>
        <div>
          <label className="label mb-2 block" htmlFor="hours">Hours of music</label>
          <input id="hours" name="hours" type="number" min="1" max="6" step="0.5" placeholder="3" className={inputCls} />
        </div>
        <div>
          <label className="label mb-2 block" htmlFor="guests">Crowd size (rough)</label>
          <input id="guests" name="guests" type="number" min="1" placeholder="150" className={inputCls} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className="label mb-2 block" htmlFor="venue_name">Venue / location</label>
          <input id="venue_name" name="venue_name" placeholder="Venue name" className={inputCls} />
        </div>
        <div>
          <label className="label mb-2 block" htmlFor="city">City</label>
          <input id="city" name="city" placeholder="Port Aransas, TX" className={inputCls} />
        </div>
      </div>

      <div>
        <label className="label mb-2 block" htmlFor="budget">Budget</label>
        <select id="budget" name="budget" className={inputCls} defaultValue="">
          {BUDGETS.map((b) => (
            <option key={b.value} value={b.value}>{b.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label mb-2 block" htmlFor="details">Anything else</label>
        <textarea
          id="details"
          name="details"
          rows={4}
          placeholder="Indoor or outdoor, sound provided or not, the vibe you're after…"
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div>
          <label className="label mb-2 block" htmlFor="contact_name">Your name</label>
          <input id="contact_name" name="contact_name" required className={inputCls} />
        </div>
        <div>
          <label className="label mb-2 block" htmlFor="contact_email">Email</label>
          <input id="contact_email" name="contact_email" type="email" required className={inputCls} />
        </div>
        <div>
          <label className="label mb-2 block" htmlFor="contact_phone">Phone</label>
          <input id="contact_phone" name="contact_phone" className={inputCls} />
        </div>
      </div>

      {/* honeypot */}
      <div className="hidden" aria-hidden>
        <label htmlFor="company_site">Company site</label>
        <input id="company_site" name="company_site" tabIndex={-1} autoComplete="off" value={company_site} onChange={(e) => setCompanySite(e.target.value)} />
      </div>

      <div className="flex items-center gap-4">
        <button type="submit" disabled={state === "busy"} className="btn btn-brass disabled:opacity-50">
          {state === "busy" ? "Sending…" : "Send the inquiry"}
        </button>
        {state === "error" ? <p className="text-sm text-coral">Something slipped — try again.</p> : null}
      </div>
    </form>
  );
}
