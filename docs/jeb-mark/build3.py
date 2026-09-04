"""Set three — concept-driven, drawn geometry, no typesetting as the subject.
   1 Almost · 2 Take and Give · 3 One line · 4 Through the haze"""
import math, os, subprocess, sys, random
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from textpath import text_path, text_bounds, FONTS
D = os.path.dirname(os.path.abspath(__file__))
INK = (11, 10, 8); CREAM = "#f3ead8"; BRASS = "#d9a441"; BRASS_DK = "#a8781f"
random.seed(7); np.random.seed(7)

def fit(text, font, width, tracking=0):
    w, _, _ = text_bounds(text, font, 100); return 100 * width / (w + tracking * max(0, len(text) - 1))
def mask_text(text, font, size, W, H, cx, baseline, tracking=0):
    img = Image.new("L", (W, H), 0); dr = ImageDraw.Draw(img)
    f = ImageFont.truetype(os.path.join(FONTS, font + ".ttf"), int(size))
    # tracking by drawing char by char
    widths = [dr.textlength(c, font=f) for c in text]; total = sum(widths) + tracking * (len(text) - 1)
    x = cx - total / 2
    for c, w in zip(text, widths):
        dr.text((x, baseline), c, font=f, fill=255, anchor="ls"); x += w + tracking
    return img
def sprite(r):
    y, x = np.mgrid[-r:r+1, -r:r+1]; return np.exp(-(x*x + y*y) / (2 * (r/2.2)**2))
def splat(canvas, x, y, r, color, gain=1.0):
    s = sprite(r); H, W, _ = canvas.shape
    x0, y0 = int(x) - r, int(y) - r; x1, y1 = x0 + s.shape[1], y0 + s.shape[0]
    sx0, sy0 = max(0, -x0), max(0, -y0); sx1, sy1 = s.shape[1] - max(0, x1 - W), s.shape[0] - max(0, y1 - H)
    if sx1 <= sx0 or sy1 <= sy0: return
    patch = s[sy0:sy1, sx0:sx1][..., None] * np.array(color)[None, None, :] * gain
    canvas[max(0, y0):max(0, y0) + (sy1 - sy0), max(0, x0):max(0, x0) + (sx1 - sx0)] += patch
def save(canvas, name, grain=0.0):
    img = np.clip(canvas, 0, 1)
    if grain: img = np.clip(img + np.random.normal(0, grain, img.shape), 0, 1)
    Image.fromarray((img * 255).astype(np.uint8)).save(os.path.join(D, name)); return os.path.join(D, name)

# ── 1 · ALMOST: the name a beat before it resolves ──────────────────────────
def almost(name, mode):
    W, H = 2400, 1200
    m = np.array(mask_text("JOHN ELIJAH", "Oswald", fit("JOHN ELIJAH", "Oswald", 1900, 24), W, H, W/2, 760, tracking=24)) > 128
    canvas = np.zeros((H, W, 3), dtype=np.float32) + np.array([0.043, 0.039, 0.031])
    ys, xs = np.nonzero(m); n = len(xs); idx = np.random.choice(n, 9000, replace=False)
    warm = np.array([1.0, 0.86, 0.55]); hot = np.array([1.0, 0.96, 0.85])
    for i in idx:
        x, y = float(xs[i]), float(ys[i])
        if mode == "sweep":      # resolved on the left, dissolving to the right
            t = (x - 250) / 1900
        else:                    # resolved at the baseline, lifting away toward the top
            t = 1 - (y - 380) / 380
        t = min(1, max(0, t))
        settled = np.random.rand() > t * 0.9
        if settled:
            r = int(np.random.choice([2, 2, 3, 3, 4])); gain = 0.55 + 0.45 * np.random.rand()
            splat(canvas, x + np.random.randn() * 1.2, y + np.random.randn() * 1.2, r, hot if r >= 3 else warm, gain)
        else:
            drift = 40 + 420 * t * np.random.rand()
            ang = np.random.rand() * 2 * math.pi if mode == "sweep" else (-math.pi/2 + np.random.randn() * 0.5)
            splat(canvas, x + math.cos(ang) * drift, y + math.sin(ang) * drift, int(np.random.choice([1, 2, 2, 3])), warm, 0.15 + 0.5 * (1 - t) * np.random.rand())
    for _ in range(700):   # ambient dust
        splat(canvas, np.random.rand() * W, np.random.rand() * H, int(np.random.choice([1, 1, 2])), warm, 0.08 + 0.2 * np.random.rand())
    # a soft bloom of the whole word underneath
    bloom = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(60))
    canvas += (np.array(bloom, dtype=np.float32) / 255)[..., None] * np.array([0.30, 0.20, 0.06]) * (0.6 if mode == "sweep" else 0.45)
    return save(canvas, name, grain=0.012)

# ── 2 · TAKE AND GIVE: two letters, one shared stroke, one bite ─────────────
def take_and_give(name, e_color, j_color, badge=False):
    W = H = 1400
    E = '<rect x="240" y="300" width="130" height="600"/><rect x="240" y="300" width="420" height="130"/><rect x="240" y="535" width="360" height="130"/><rect x="240" y="770" width="420" height="130"/>'
    Jtop = '<rect x="660" y="300" width="340" height="130"/>'
    Jstem = '<rect x="870" y="300" width="130" height="430"/>'
    Jhook = '<path d="M 1000 730 A 300 300 0 0 1 400 730 L 530 730 A 170 170 0 0 0 870 730 Z"/>'
    defs = f'<clipPath id="ce">{E}</clipPath>'
    body = []
    if badge: body.append(f'<circle cx="700" cy="640" r="640" fill="{CREAM if e_color != CREAM else "#0b0a08"}" opacity="0.06"/><circle cx="700" cy="640" r="640" fill="none" stroke="{BRASS}" stroke-width="6"/>')
    body.append(f'<g fill="{e_color}">{E}</g>')
    body.append(f'<g fill="{j_color}">{Jtop}{Jstem}{Jhook}</g>')
    body.append(f'<g fill="#0b0a08" clip-path="url(#ce)">{Jhook}</g>')      # the take: the hook bites the E
    d, _ = text_path("TAKE AND GIVE", "Oswald", 40, 700, 1090, tracking=14, anchor="middle"); body.append(f'<path d="{d}" fill="{BRASS_DK}"/>')
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><defs>{defs}</defs><rect width="{W}" height="{H}" fill="#0b0a08"/>{"".join(body)}</svg>'
    p = os.path.join(D, name); open(p + ".svg", "w").write(svg)
    subprocess.run(["rsvg-convert", "-w", str(W), p + ".svg", "-o", p + ".png"], check=True); return p + ".png"

# ── 3 · ONE LINE: the name as a single stroke, then a signal, then flat ─────
def thin(mask):
    """Zhang-Suen thinning, vectorised."""
    img = mask.astype(np.uint8).copy()
    def nb(a):
        P = np.pad(a, 1)
        return [P[0:-2, 1:-1], P[0:-2, 2:], P[1:-1, 2:], P[2:, 2:], P[2:, 1:-1], P[2:, 0:-2], P[1:-1, 0:-2], P[0:-2, 0:-2]]
    while True:
        changed = False
        for step in (0, 1):
            p2, p3, p4, p5, p6, p7, p8, p9 = nb(img)
            B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9
            seq = [p2, p3, p4, p5, p6, p7, p8, p9, p2]
            A = sum(((seq[i] == 0) & (seq[i+1] == 1)).astype(np.uint8) for i in range(8))
            c1 = (p2 * p4 * p6 == 0) if step == 0 else (p2 * p4 * p8 == 0)
            c2 = (p4 * p6 * p8 == 0) if step == 0 else (p2 * p6 * p8 == 0)
            rm = (img == 1) & (B >= 2) & (B <= 6) & (A == 1) & c1 & c2
            if rm.any(): img[rm] = 0; changed = True
        if not changed: return img.astype(bool)

def one_line(name, signal=True):
    W, H = 2400, 1200
    size = fit("John Elijah", "Yellowtail", 1700)
    m = np.array(mask_text("John Elijah", "Yellowtail", size, W, H, W/2 - 120, 700)) > 128
    # drop the dots on i and j: keep only components wider than 60px
    from collections import deque
    lab = np.zeros(m.shape, dtype=np.int32); comp = 0; keep = np.zeros_like(m)
    ys, xs = np.nonzero(m)
    for y0, x0 in zip(ys, xs):
        if lab[y0, x0]: continue
        comp += 1; q = deque([(y0, x0)]); lab[y0, x0] = comp; pts = []
        while q:
            y, x = q.popleft(); pts.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < H and 0 <= xx < W and m[yy, xx] and not lab[yy, xx]: lab[yy, xx] = comp; q.append((yy, xx))
        p = np.array(pts)
        if np.ptp(p[:, 1]) > 60: keep[p[:, 0], p[:, 1]] = True
    sk = thin(keep)
    ys, xs = np.nonzero(sk)
    segs = []
    S = set(zip(ys.tolist(), xs.tolist()))
    for y, x in S:
        for dy, dx in ((0, 1), (1, 0), (1, 1), (1, -1)):
            if (y + dy, x + dx) in S: segs.append(f"M{x} {y}L{x+dx} {y+dy}")
    body = [f'<path d="{"".join(segs)}" stroke="{BRASS}" stroke-width="16" stroke-linecap="round" fill="none"/>']
    # the tail: from the far right of the line, a signal burst, then flat
    xr = xs.max(); yr = int(np.median(ys[xs > xr - 4]))
    pts = [(xr, yr)]
    if signal:
        x = xr + 20
        for k in range(48):
            amp = 90 * math.exp(-k / 14) * (1 if k % 2 == 0 else -1)
            pts.append((x, yr + amp * (0.4 + 0.6 * math.sin(k * 0.9) ** 2))); x += 11 + k * 0.4
        pts.append((x + 30, yr)); pts.append((W - 120, yr))
    else:
        pts.append((W - 120, yr))
    d = "M" + " L".join(f"{p[0]:.1f} {p[1]:.1f}" for p in pts)
    body.append(f'<path d="{d}" stroke="{BRASS}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" fill="none"/>')
    d2, _ = text_path("BLUES & SOUL", "Oswald", 44, W/2, 960, tracking=16, anchor="middle"); body.append(f'<path d="{d2}" fill="{BRASS_DK}"/>')
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}"><rect width="{W}" height="{H}" fill="#0b0a08"/>{"".join(body)}</svg>'
    p = os.path.join(D, name); open(p + ".svg", "w").write(svg)
    subprocess.run(["rsvg-convert", "-w", str(W), p + ".svg", "-o", p + ".png"], check=True); return p + ".png"

# ── 4 · THROUGH THE HAZE: light is the subject ──────────────────────────────
def haze(name, water=False):
    W, H = 2400, 1200
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    canvas = np.zeros((H, W, 3), dtype=np.float32)
    # sky gradient: deep teal-black at top to warm at the horizon
    t = (yy / H)[..., None]
    canvas += (1 - t) * np.array([0.03, 0.05, 0.07]) + t * np.array([0.32, 0.16, 0.06])
    # the sun
    cx, cy = W * 0.5, H * 0.46
    r = np.sqrt((xx - cx) ** 2 + ((yy - cy) * 1.0) ** 2)
    core = np.exp(-(r / 150) ** 2); glow = np.exp(-(r / 520) ** 1.4); wide = np.exp(-(r / 1100) ** 1.2)
    canvas += core[..., None] * np.array([1.0, 0.93, 0.78]) + glow[..., None] * np.array([0.95, 0.55, 0.18]) * 0.85 + wide[..., None] * np.array([0.6, 0.3, 0.1]) * 0.5
    # haze bands
    bands = 0.5 + 0.5 * np.sin(yy / 38 + 2 * np.sin(xx / 400))
    canvas += (bands * np.exp(-((yy - cy - 120) / 260) ** 2))[..., None] * np.array([0.25, 0.14, 0.05]) * 0.35
    if water:
        # horizon and a smeared reflection under the sun
        hz = int(H * 0.62)
        refl = np.exp(-((xx - cx) / 90) ** 2) * np.exp(-((yy - hz) / 420) ** 2) * (yy > hz)
        ripple = 0.55 + 0.45 * np.sin(yy / 6 + np.sin(xx / 30) * 2)
        canvas[hz:] *= 0.55
        canvas += (refl * ripple)[..., None] * np.array([1.0, 0.7, 0.3]) * 0.9
    # the name, emerging: cream, but eaten by the light where the sun is brightest
    m = np.array(mask_text("JOHN ELIJAH", "Oswald", fit("JOHN ELIJAH", "Oswald", 1500, 30), W, H, W/2, int(H * 0.56), tracking=30), dtype=np.float32) / 255
    eat = np.clip(1 - np.exp(-(r / 330) ** 2) * 1.15, 0, 1)
    letters = m * eat
    canvas = canvas * (1 - letters[..., None] * 0.85) + letters[..., None] * np.array([0.95, 0.91, 0.84])
    # a faint blurred copy of the letters as light bleed
    bl = np.array(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(28)), dtype=np.float32) / 255
    canvas += (bl * (1 - eat))[..., None] * np.array([1.0, 0.8, 0.5]) * 0.35
    # tone: soft roll-off
    canvas = 1 - np.exp(-canvas * 1.35)
    return save(canvas, name, grain=0.02)

outs = []
outs.append(almost("1-almost-sweep.png", "sweep"))
outs.append(almost("1-almost-lift.png", "lift"))
outs.append(take_and_give("2-take-and-give", CREAM, BRASS))
outs.append(take_and_give("2-take-and-give-badge", BRASS, CREAM, badge=True))
outs.append(one_line("3-one-line-signal", signal=True))
outs.append(one_line("3-one-line-plain", signal=False))
outs.append(haze("4-haze.png"))
outs.append(haze("4-haze-water.png", water=True))
for o in outs: print("ok", os.path.basename(o))
