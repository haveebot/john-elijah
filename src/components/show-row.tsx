import type { Show, Residency } from "@/lib/db/shows";

const WEEKDAY_LABEL: Record<string, string> = {
  sun: "Sundays",
  mon: "Mondays",
  tue: "Tuesdays",
  wed: "Wednesdays",
  thu: "Thursdays",
  fri: "Fridays",
  sat: "Saturdays",
};

export function formatShowDate(iso: string): { dow: string; day: string; mon: string } {
  const d = new Date(`${iso}T12:00:00`);
  return {
    dow: d.toLocaleDateString("en-US", { weekday: "short" }),
    day: d.toLocaleDateString("en-US", { day: "numeric" }),
    mon: d.toLocaleDateString("en-US", { month: "short" }),
  };
}

export function ShowRow({ show }: { show: Show }) {
  const d = formatShowDate(show.date);
  const venue = show.venue_url ? (
    <a href={show.venue_url} target="_blank" rel="noopener noreferrer" className="brass-link hover:text-ink">
      {show.venue_name}
    </a>
  ) : (
    show.venue_name
  );
  return (
    <div className="flex items-center gap-5 px-5 py-4">
      <div className="w-14 shrink-0 text-center">
        <p className="label">{d.dow}</p>
        <p className="wordmark text-3xl leading-none">{d.day}</p>
        <p className="label">{d.mon}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="wordmark text-xl">{venue}</p>
        <p className="mt-0.5 text-sm text-ink-dim">
          {[show.city, show.start_time, show.status === "tentative" ? "tentative" : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      {show.ticket_url ? (
        <a href={show.ticket_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
          Tickets
        </a>
      ) : null}
    </div>
  );
}

export function ResidencyRow({ residency }: { residency: Residency }) {
  const days = residency.weekdays.map((w) => WEEKDAY_LABEL[w] ?? w).join(" + ");
  const venue = residency.venue_url ? (
    <a href={residency.venue_url} target="_blank" rel="noopener noreferrer" className="brass-link hover:text-ink">
      {residency.venue_name}
    </a>
  ) : (
    residency.venue_name
  );
  return (
    <div className="flex items-center gap-5 px-5 py-4">
      <div className="w-14 shrink-0 text-center">
        <p className="script text-2xl leading-none text-brass">every</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="wordmark text-xl">{venue}</p>
        <p className="mt-0.5 text-sm text-ink-dim">
          {[days, residency.city, residency.start_time, residency.label].filter(Boolean).join(" · ")}
        </p>
      </div>
    </div>
  );
}
