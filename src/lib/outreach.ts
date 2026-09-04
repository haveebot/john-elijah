/**
 * Venue outreach copy: three touches, each shorter than the last.
 *   1  first touch      — who we are, why this room, the EPK, one ask
 *   2  day-7 bump       — a specific date idea + one clip, two sentences
 *   3  day-21 close     — last note, keep us on file, no pressure
 * Principles carried from the Farley first-touch generator: true and useful
 * to the booker, name the room, name the lineup that fits, one link.
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

export type Draft = { subject: string; text: string };

export function firstTouch(v: Venue, opts: { toName?: string; from?: string } = {}): Draft {
  const hello = opts.toName ? `Hi ${opts.toName.split(" ")[0]},` : `Hi ${v.name} team,`;
  const lineup = suggestLineup(v);
  const where = v.city ? ` in ${v.city}` : "";
  return {
    subject: `Live blues & soul for ${v.name}, John Elijah Band`,
    text: [
      hello,
      ``,
      `I book for John Elijah, blues and soul originals out of Port Aransas, and an official Lone Star Beer artist. We play all over Texas and ${v.name}${where} looks like our kind of room.`,
      ``,
      `The short version: nine originals on the record (Take and Give, tracked live), a catalog deep enough for a full night, and ${lineup} for a room like yours. Crowds stay, drink, and dance.`,
      ``,
      `Everything a booker needs is here: ${SITE.domain}/epk, bio, photos, stage plot, and a couple of live clips.`,
      ``,
      `Is there a night this fall you're looking to fill? Send me a date or two and I'll come back with a number the same day.`,
      ``,
      `Thanks,`,
      opts.from ?? "Winston",
      `${SITE.bandName} · booking@johnelijahmusic.com · ${SITE.domain}`,
    ].join("\n"),
  };
}

export function secondTouch(v: Venue, opts: { toName?: string; from?: string } = {}): Draft {
  const hello = opts.toName ? `Hi ${opts.toName.split(" ")[0]},` : `Hi again,`;
  return {
    subject: `Re: Live blues & soul for ${v.name}, John Elijah Band`,
    text: [
      hello,
      ``,
      `Quick follow-up on John Elijah for ${v.name}. If it helps to hear the room before you decide, this is the band live: https://www.youtube.com/watch?v=F_2CH_WoaZo`,
      ``,
      `We have open weekends in the next two months and can do ${suggestLineup(v)}. One date is all I need to send a number.`,
      ``,
      opts.from ?? "Winston",
      `${SITE.bandName} · booking@johnelijahmusic.com`,
    ].join("\n"),
  };
}

export function thirdTouch(v: Venue, opts: { toName?: string; from?: string } = {}): Draft {
  const hello = opts.toName ? `Hi ${opts.toName.split(" ")[0]},` : `Hi,`;
  return {
    subject: `Re: John Elijah Band for ${v.name}`,
    text: [
      hello,
      ``,
      `Last note from me, no pressure. If ${v.name} ever needs a blues and soul act that can carry a full night, John Elijah is a text away, and the press kit stays current at ${SITE.domain}/epk.`,
      ``,
      `Keep us on file, and thanks for the time.`,
      ``,
      opts.from ?? "Winston",
      `${SITE.bandName} · booking@johnelijahmusic.com`,
    ].join("\n"),
  };
}

export function draftForTouch(touch: number, v: Venue, opts: { toName?: string; from?: string } = {}): Draft {
  if (touch <= 1) return firstTouch(v, opts);
  if (touch === 2) return secondTouch(v, opts);
  return thirdTouch(v, opts);
}

/** Days after a send until the next touch is due. */
export const NEXT_TOUCH_DAYS: Record<number, number> = { 1: 7, 2: 14, 3: 0 };
