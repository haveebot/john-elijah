/**
 * Stage plots per configuration — schematic SVGs a sound tech can read in
 * five seconds. Audience at the bottom. Inputs listed alongside on the EPK.
 */

type Spot = { x: number; y: number; label: string; w?: number };

const PLOTS: Record<string, { spots: Spot[]; inputs: string[]; footprint: string }> = {
  solo: {
    footprint: "8 × 6 ft",
    spots: [{ x: 50, y: 62, label: "John · gtr/vox" }],
    inputs: ["1 vocal (SM58 or better)", "1 guitar amp mic or DI", "1 monitor wedge"],
  },
  duo: {
    footprint: "12 × 8 ft",
    spots: [
      { x: 38, y: 62, label: "John · gtr/vox" },
      { x: 66, y: 62, label: "Bass or keys" },
    ],
    inputs: ["1–2 vocals", "1 guitar amp mic", "1 bass DI or keys stereo DI", "2 monitor wedges"],
  },
  trio: {
    footprint: "16 × 12 ft",
    spots: [
      { x: 50, y: 66, label: "John · gtr/vox" },
      { x: 22, y: 52, label: "Bass" },
      { x: 76, y: 34, label: "Drums", w: 22 },
    ],
    inputs: ["2 vocals", "1 guitar amp mic", "1 bass DI", "drum mics: kick, snare, 2 OH (+ toms if available)", "3 monitor wedges"],
  },
  four_piece: {
    footprint: "20 × 14 ft",
    spots: [
      { x: 50, y: 68, label: "John · gtr/vox" },
      { x: 20, y: 50, label: "Bass" },
      { x: 78, y: 54, label: "Organ / keys", w: 20 },
      { x: 50, y: 30, label: "Drums", w: 22 },
    ],
    inputs: ["3 vocals", "1 guitar amp mic", "1 bass DI", "keys stereo DI (Leslie mic if organ)", "drum mics: kick, snare, hat, 2 toms, 2 OH", "4 monitor wedges"],
  },
  full_band: {
    footprint: "24 × 16 ft",
    spots: [
      { x: 50, y: 70, label: "John · gtr/vox" },
      { x: 22, y: 56, label: "Bass" },
      { x: 78, y: 62, label: "Guitar 2" },
      { x: 80, y: 30, label: "Organ / keys", w: 20 },
      { x: 42, y: 30, label: "Drums", w: 22 },
    ],
    inputs: ["3 vocals", "2 guitar amp mics", "1 bass DI", "keys stereo DI (Leslie mic if organ)", "drum mics: kick, snare, hat, 2 toms, 2 OH", "5 monitor wedges (or IEM mix)"],
  },
};

export function stagePlotFor(key: string) {
  return PLOTS[key] ?? PLOTS.full_band;
}

export function StagePlot({ configuration, label }: { configuration: string; label: string }) {
  const plot = stagePlotFor(configuration);
  return (
    <figure className="rounded-lg border border-canvas-edge/60 bg-canvas-raised p-4">
      <svg viewBox="0 0 100 90" className="w-full" role="img" aria-label={`Stage plot: ${label}`}>
        <rect x="4" y="8" width="92" height="66" rx="2" fill="none" stroke="#2a251c" strokeWidth="1" />
        <text x="50" y="5" textAnchor="middle" fontSize="3.6" fill="#6f6756" letterSpacing="0.6">UPSTAGE</text>
        <text x="50" y="86" textAnchor="middle" fontSize="3.6" fill="#6f6756" letterSpacing="0.6">AUDIENCE</text>
        {plot.spots.map((s) => {
          const w = s.w ?? 16;
          return (
            <g key={s.label}>
              <rect x={s.x - w / 2} y={s.y - 5} width={w} height={10} rx="1.5" fill="#14120e" stroke="#d9a441" strokeWidth="0.8" />
              <text x={s.x} y={s.y + 1.4} textAnchor="middle" fontSize="3.4" fill="#f3ead8">{s.label}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="label mt-2">{label} · footprint {plot.footprint}</figcaption>
      <ul className="mt-2 space-y-0.5 text-xs text-ink-dim">
        {plot.inputs.map((i) => (
          <li key={i}>· {i}</li>
        ))}
      </ul>
    </figure>
  );
}
