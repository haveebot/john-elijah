/**
 * Route planner — no maps API. Venues get coordinates from OSM when we have
 * them, else the centroid of their city. Greedy nearest-neighbour from the
 * start city under a per-day drive cap, one stop per night, best-fit venue
 * per city, then home. Distances are great-circle × 1.25 (Texas road factor).
 */

import type { Venue } from "./db/venues";

export const CITY_COORDS: Record<string, [number, number]> = {
  "port aransas": [27.833, -97.061], "corpus christi": [27.800, -97.396], rockport: [28.020, -97.054], fulton: [28.061, -97.041],
  "aransas pass": [27.909, -97.150], portland: [27.877, -97.324], ingleside: [27.878, -97.212], kingsville: [27.516, -97.856],
  victoria: [28.805, -97.004], "port lavaca": [28.615, -96.626], beeville: [28.401, -97.749], alice: [27.752, -98.070],
  "san antonio": [29.425, -98.494], helotes: [29.578, -98.690], boerne: [29.795, -98.732], "new braunfels": [29.703, -98.124], gruene: [29.738, -98.104],
  seguin: [29.569, -97.965], bandera: [29.727, -99.074], "spring branch": [29.887, -98.418], fischer: [29.972, -98.263], hunter: [29.795, -98.020],
  "san marcos": [29.883, -97.941], kendalia: [29.966, -98.512], stonewall: [30.238, -98.660], blanco: [30.098, -98.421], fredericksburg: [30.274, -98.872],
  luckenbach: [30.180, -98.755], kerrville: [30.047, -99.140], "johnson city": [30.277, -98.412], "marble falls": [30.578, -98.273], sisterdale: [29.970, -98.720],
  austin: [30.267, -97.743], spicewood: [30.476, -98.157], "round rock": [30.508, -97.679], "dripping springs": [30.190, -98.087], wimberley: [29.997, -98.099],
  buda: [30.085, -97.840], kyle: [29.989, -97.877], lockhart: [29.885, -97.670], bastrop: [30.110, -97.315], granger: [30.718, -97.443],
  houston: [29.760, -95.370], galveston: [29.301, -94.797], katy: [29.786, -95.824], "the woodlands": [30.158, -95.489], kemah: [29.543, -95.020],
  brenham: [30.167, -96.398], bellville: [29.950, -96.257], "cat spring": [29.792, -96.386], burton: [30.180, -96.598], schulenburg: [29.682, -96.903],
  fayetteville: [29.905, -96.674], "round top": [30.065, -96.697], "la grange": [29.906, -96.877], "el maton": [28.895, -96.148], "sweet home": [29.359, -97.070],
  dallas: [32.777, -96.797], "fort worth": [32.755, -97.331], denton: [33.215, -97.133], waco: [31.549, -97.147], temple: [31.098, -97.343],
  anson: [32.757, -99.894], marfa: [30.309, -104.021], "el paso": [31.762, -106.485], lubbock: [33.578, -101.855], midland: [32.000, -102.078],
  "college station": [30.628, -96.334], bryan: [30.674, -96.370], mcallen: [26.203, -98.230], brownsville: [25.902, -97.497], "south padre island": [26.104, -97.165],
  laredo: [27.506, -99.507], tyler: [32.351, -95.301], beaumont: [30.080, -94.127], amarillo: [35.222, -101.831], "wichita falls": [33.914, -98.493],
};

export function coordsFor(v: Venue): [number, number] | null {
  if (v.lat != null && v.lng != null) return [v.lat, v.lng];
  const key = v.city.toLowerCase().replace(/,.*$/, "").replace(/\s+tx$/, "").trim();
  return CITY_COORDS[key] ?? null;
}

export function milesBetween(a: [number, number], b: [number, number]): number {
  const R = 3958.8;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s)) * 1.25;
}

export type Stop = { night: number; city: string; venue: Venue; alternates: Venue[]; miles: number; hours: number };

export function planRoute(input: { venues: Venue[]; start: [number, number]; startCity?: string; nights: number; maxDailyMiles: number; minScore: number }): { stops: Stop[]; homeMiles: number; totalMiles: number } {
  // group by city; best venue per city by score (email on file wins ties)
  const byCity = new Map<string, Venue[]>();
  for (const v of input.venues) {
    if (v.score < input.minScore || !coordsFor(v)) continue;
    const k = v.city.toLowerCase();
    byCity.set(k, [...(byCity.get(k) ?? []), v]);
  }
  const cities = Array.from(byCity.entries()).map(([k, vs]) => {
    const sorted = [...vs].sort((a, b) => (b.score + ((b.email_count ?? 0) + (b.email ? 1 : 0) > 0 ? 5 : 0)) - (a.score + ((a.email_count ?? 0) + (a.email ? 1 : 0) > 0 ? 5 : 0)));
    return { key: k, venues: sorted, coords: coordsFor(sorted[0])! };
  });
  const stops: Stop[] = [];
  let here = input.start;
  let total = 0;
  const used = new Set<string>(input.startCity ? [input.startCity.toLowerCase()] : []);
  for (let night = 1; night <= input.nights; night++) {
    let best: { c: (typeof cities)[number]; miles: number; value: number } | null = null;
    for (const c of cities) {
      if (used.has(c.key)) continue;
      const miles = milesBetween(here, c.coords);
      if (miles > input.maxDailyMiles || miles < 15) continue;
      // value: fit, minus a little per mile, plus a bump for a second city clustered nearby
      const value = c.venues[0].score - miles * 0.08;
      if (!best || value > best.value) best = { c, miles, value };
    }
    if (!best) break;
    used.add(best.c.key);
    stops.push({ night, city: best.c.venues[0].city, venue: best.c.venues[0], alternates: best.c.venues.slice(1, 4), miles: Math.round(best.miles), hours: Math.round((best.miles / 60) * 10) / 10 });
    here = best.c.coords;
    total += best.miles;
  }
  const homeMiles = stops.length ? Math.round(milesBetween(here, input.start)) : 0;
  return { stops, homeMiles, totalMiles: Math.round(total + homeMiles) };
}
