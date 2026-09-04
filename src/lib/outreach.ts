/**
 * Venue outreach — the first-touch email. Short, specific, no hype; the
 * ask is one line and the proof is one link. Principles carried from the
 * Farley first-touch generator: lead with what's true and useful to the
 * booker, name the room, name the lineup that fits it, give them the EPK.
 */

import { SITE } from "./site";
import type { Venue } from "./db/venues";

export function suggestLineup(v: Venue): string {
  if (v.kind === "festival" || v.kind === "dance_hall") return "the full band";
  if (v.kind === "listening_room" || v.kind === "winery") return "a duo or trio";
  if (v.kind === "restaurant" || v.kind === "brewery") return "a trio or the four-piece";
  if (v.capacity && v.capacity >= 250) return "the full band";
  if (v.capacity && v.capacity <= 80) return "a duo or trio";
  return "the four-piece or full band";
}

export function firstTouch(v: Venue, opts: { toName?: string; from?: string } = {}): { subject: string; text: string } {
  const hello = opts.toName ? `Hi ${opts.toName.split(" ")[0]},` : `Hi ${v.name} team,`;
  const lineup = suggestLineup(v);
  const where = v.city ? ` in ${v.city}` : "";
  const subject = `Live blues & soul for ${v.name} — John Elijah Band`;
  const text = [
    hello,
    ``,
    `I book for John Elijah — blues and soul originals out of Port Aransas, and an official Lone Star Beer artist. We play all over Texas and ${v.name}${where} looks like our kind of room.`,
    ``,
    `The short version: nine originals on the record (Take and Give, tracked live), a catalog deep enough for a full night, and ${lineup} for a room like yours. Crowds stay, drink, and dance.`,
    ``,
    `Everything a booker needs is here: ${SITE.domain}/epk — bio, photos, stage plot, and a couple of live clips.`,
    ``,
    `Is there a night this fall you're looking to fill? Send me a date or two and I'll come back with a number the same day.`,
    ``,
    `Thanks,`,
    opts.from ?? "Winston",
    `${SITE.bandName} · booking@johnelijahmusic.com · ${SITE.domain}`,
  ].join("\n");
  return { subject, text };
}
