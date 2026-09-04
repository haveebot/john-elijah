"""Set three, second pass: constellation Almost · spine ligature Take and Give · One line with beats · Haze at the horizon."""
import math, os, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from textpath import text_path
from build3 import fit, mask_text, splat, save, thin, D, CREAM, BRASS, BRASS_DK
from collections import deque
np.random.seed(11)

def components(m, min_w=0):
    lab = np.zeros(m.shape, dtype=np.int32); comps = []
    ys, xs = np.nonzero(m); H, W = m.shape; c = 0
    for y0, x0 in zip(ys, xs):
        if lab[y0, x0]: continue
        c += 1; q = deque([(y0, x0)]); lab[y0, x0] = c; pts = []
        while q:
            y, x = q.popleft(); pts.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < H and 0 <= xx < W and m[yy, xx] and not lab[yy, xx]: lab[yy, xx] = c; q.append((yy, xx))
        comps.append(np.array(pts))
    return comps

# ── 1 · ALMOST as a constellation along the strokes ─────────────────────────
def almost2(name, mode):
    W, H = 2400, 1200
    m = np.array(mask_text("JOHN ELIJAH", "Oswald", fit("JOHN ELIJAH", "Oswald", 1900, 30), W, H, W/2, 760, tracking=30)) > 128
    sk = thin(m)
    ys, xs = np.nonzero(sk); pts = np.stack([xs, ys], 1).astype(float)
    order = np.random.permutation(len(pts)); chosen = []
    for i in order:
        p = pts[i]
        if all(np.hypot(*(p - q)) > 23 for q in chosen): chosen.append(p)
    chosen = np.array(chosen)
    canvas = np.zeros((H, W, 3), dtype=np.float32) + np.array([0.043, 0.039, 0.031])
    warm = np.array([1.0, 0.86, 0.55]); hot = np.array([1.0, 0.97, 0.88])
    def tval(p):
        if mode == "sweep": return min(1, max(0, (p[0] - 1450) / 700))
        return min(1, max(0, 1 - (p[1] - 400) / 200))
    placed = []
    for p in chosen:
        t = tval(p)
        if np.random.rand() < t * 0.6:
            drift = 20 + 220 * t * np.random.rand(); ang = np.random.rand() * 2 * math.pi
            q = p + np.array([math.cos(ang), math.sin(ang)]) * drift
            splat(canvas, q[0], q[1], 2, warm, 0.3 + 0.4 * np.random.rand())
        else:
            q = p + np.random.randn(2) * (1.0 + 6 * t); placed.append((q, p))
            big = np.random.rand() < 0.22
            splat(canvas, q[0], q[1], 6 if big else 3, hot if big else warm, 1.0 if big else 0.75 + 0.25 * np.random.rand())
            if big: splat(canvas, q[0], q[1], 22, warm, 0.22)
    # lines only along the strokes: the midpoint must sit on the skeleton
    skd = np.array(Image.fromarray(sk.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(9))) > 0
    lines = Image.new("F", (W, H), 0.0); dr = ImageDraw.Draw(lines)
    Q = np.array([q for q, _ in placed]); P = np.array([p for _, p in placed])
    for i in range(len(P)):
        d = np.hypot(*(P - P[i]).T)
        for j in np.where((d < 52) & (d > 0))[0]:
            if j < i: continue
            mid = ((P[i] + P[j]) / 2).astype(int)
            if skd[mid[1], mid[0]]:
                a = 1 - 0.5 * (tval(P[i]) + tval(P[j]))
                dr.line([tuple(Q[i]), tuple(Q[j])], fill=float(0.30 * a), width=2)
    canvas += np.array(lines)[..., None] * warm
    for _ in range(500): splat(canvas, np.random.rand() * W, np.random.rand() * H, int(np.random.choice([1, 1, 2])), warm, 0.06 + 0.16 * np.random.rand())
    bloom = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(70))
    canvas += (np.array(bloom, dtype=np.float32) / 255)[..., None] * np.array([0.30, 0.20, 0.06]) * 0.4
    return save(canvas, name, grain=0.012)

# ── 2 · TAKE AND GIVE: one spine, arms right, hook left ─────────────────────
def ligature(name, two_tone=True, badge=False, caption=True):
    W = H = 1400
    spine = '<rect x="620" y="260" width="130" height="590"/>'
    hook = '<path d="M 750 720 A 250 250 0 0 1 250 720 L 380 720 A 120 120 0 0 0 620 720 L 620 850 L 750 850 Z"/>'
    arms = '<rect x="620" y="260" width="440" height="130"/><rect x="620" y="490" width="380" height="130"/><rect x="620" y="720" width="440" height="130"/>'
    jc, ec = (CREAM, BRASS) if two_tone else (CREAM, CREAM)
    body = []
    if badge: body.append(f'<circle cx="680" cy="620" r="600" fill="none" stroke="{BRASS}" stroke-width="8"/>')
    body.append(f'<g fill="{ec}">{arms}</g><g fill="{jc}">{spine}{hook}</g>')
    if caption:
        d, _ = text_path("JOHN ELIJAH", "Oswald", 46, 680, 1130 if not badge else 1300, tracking=18, anchor="middle"); body.append(f'<path d="{d}" fill="{BRASS_DK}"/>')
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><rect width="{W}" height="{H}" fill="#0b0a08"/>{"".join(body)}</svg>'
    p = os.path.join(D, name); open(p + ".svg", "w").write(svg)
    subprocess.run(["rsvg-convert", "-w", str(W), p + ".svg", "-o", p + ".png"], check=True); return p + ".png"

# ── 3 · ONE LINE with the two beats ──────────────────────────────────────────
def one_line2(name, signal=True):
    W, H = 2400, 1200
    size = fit("John Elijah", "Yellowtail", 1650)
    m = np.array(mask_text("John Elijah", "Yellowtail", size, W, H, W/2 - 140, 700)) > 128
    comps = components(m)
    keep = np.zeros_like(m); dots = []
    for p in comps:
        if np.ptp(p[:, 1]) > 60: keep[p[:, 0], p[:, 1]] = True
        else: dots.append((p[:, 1].mean(), p[:, 0].mean()))
    sk = thin(keep); ys, xs = np.nonzero(sk); S = set(zip(ys.tolist(), xs.tolist())); segs = []
    for y, x in S:
        for dy, dx in ((0, 1), (1, 0), (1, 1), (1, -1)):
            if (y + dy, x + dx) in S: segs.append(f"M{x} {y}L{x+dx} {y+dy}")
    body = [f'<path d="{"".join(segs)}" stroke="{BRASS}" stroke-width="18" stroke-linecap="round" fill="none"/>']
    for dx, dy in dots: body.append(f'<circle cx="{dx:.0f}" cy="{dy:.0f}" r="11" fill="{BRASS}"/>')
    xr = xs.max(); yr = int(np.median(ys[xs > xr - 4])); pts = [(xr, yr)]
    if signal:
        x = xr + 24
        for k in range(44):
            amp = 95 * math.exp(-k / 13) * (1 if k % 2 == 0 else -1)
            pts.append((x, yr + amp * (0.35 + 0.65 * math.sin(k * 0.9) ** 2))); x += 12 + k * 0.5
        pts.append((x + 30, yr))
    pts.append((W - 110, yr))
    d = "M" + " L".join(f"{p[0]:.1f} {p[1]:.1f}" for p in pts)
    body.append(f'<path d="{d}" stroke="{BRASS}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" fill="none"/>')
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}"><rect width="{W}" height="{H}" fill="#0b0a08"/>{"".join(body)}</svg>'
    p = os.path.join(D, name); open(p + ".svg", "w").write(svg)
    subprocess.run(["rsvg-convert", "-w", str(W), p + ".svg", "-o", p + ".png"], check=True); return p + ".png"

# ── 4 · HAZE at the horizon ──────────────────────────────────────────────────
def haze2(name, water=True):
    W, H = 2400, 1200
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    canvas = np.zeros((H, W, 3), dtype=np.float32)
    t = (yy / H)[..., None]
    canvas += (1 - t) * np.array([0.02, 0.04, 0.07]) + t * np.array([0.34, 0.17, 0.06])
    cx, hz = W * 0.5, int(H * 0.60); cy = H * 0.44
    r = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    core = np.exp(-(r / 140) ** 2); glow = np.exp(-(r / 480) ** 1.5); wide = np.exp(-(r / 1000) ** 1.2)
    canvas += core[..., None] * np.array([1.0, 0.94, 0.80]) + glow[..., None] * np.array([0.95, 0.55, 0.18]) * 0.8 + wide[..., None] * np.array([0.6, 0.3, 0.1]) * 0.45
    bands = 0.5 + 0.5 * np.sin(yy / 30 + 2 * np.sin(xx / 500)); canvas += (bands * np.exp(-((yy - cy - 60) / 200) ** 2))[..., None] * np.array([0.25, 0.14, 0.05]) * 0.3
    if water:
        canvas[hz:] = canvas[hz:] * 0.5 + np.array([0.05, 0.03, 0.02])
        # broken glints: short horizontal streaks under the sun
        gl = np.zeros((H, W), dtype=np.float32)
        for _ in range(900):
            y = hz + int(abs(np.random.randn()) * 160) + 4; x = int(cx + np.random.randn() * (40 + (y - hz) * 0.45))
            w = int(6 + np.random.rand() * (20 + (y - hz) * 0.25)); h = 2 + int(np.random.rand() * 2)
            if 0 <= y < H - h and 0 <= x - w and x + w < W: gl[y:y+h, x-w:x+w] += 0.5 + 0.7 * np.random.rand()
        gl = np.array(Image.fromarray(np.clip(gl * 80, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2)), dtype=np.float32) / 255
        canvas += gl[..., None] * np.array([1.0, 0.75, 0.35]) * 1.1
        canvas += (np.exp(-((xx - cx) / 120) ** 2) * np.exp(-((yy - hz) / 260) ** 2) * (yy > hz))[..., None] * np.array([0.6, 0.35, 0.12]) * 0.5
    m = np.array(mask_text("JOHN ELIJAH", "Oswald", fit("JOHN ELIJAH", "Oswald", 1560, 34), W, H, W/2, hz - 14, tracking=34), dtype=np.float32) / 255
    eat = 1 - 0.55 * np.exp(-(r / 300) ** 2)
    letters = m * eat
    canvas = canvas * (1 - letters[..., None] * 0.9) + letters[..., None] * np.array([0.96, 0.92, 0.85])
    bl = np.array(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(24)), dtype=np.float32) / 255
    canvas += bl[..., None] * np.array([1.0, 0.8, 0.5]) * 0.25
    canvas = 1 - np.exp(-canvas * 1.35)
    return save(canvas, name, grain=0.02)

import sys as _s
which = _s.argv[1:] or ["all"]
outs = []
if "all" in which or "almost" in which: outs += [almost2("1b-almost-sweep.png", "sweep"), almost2("1b-almost-lift.png", "lift")]
if "all" in which or "lig" in which: outs += [ligature("2b-ligature"), ligature("2b-ligature-mono", two_tone=False, badge=True)]
if "all" in which or "line" in which: outs += [one_line2("3b-one-line-signal"), one_line2("3b-one-line-plain", signal=False)]
if "all" in which or "haze" in which: outs += [haze2("4b-haze-water.png", water=True), haze2("4b-haze-sky.png", water=False)]
for o in outs: print("ok", os.path.basename(o))
