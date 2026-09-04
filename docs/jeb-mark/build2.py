"""Set 2 — blues + classic rock angles, less Texas country."""
import math, os, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
from textpath import text_path, arc_text_path, text_bounds, FONTS
from PIL import Image, ImageDraw, ImageFont, ImageFilter
D = os.path.dirname(os.path.abspath(__file__))
INK, CREAM, BRASS, BRASS_DK = "#0b0a08", "#f3ead8", "#d9a441", "#a8781f"
ORANGE, MUSTARD, PAPER, BLUE, TEAL, RED = "#c8601f", "#d9a441", "#f3ead8", "#2f5fd6", "#3fa79a", "#b01f25"

def fit(text, font, width, tracking=0):
    w, _, _ = text_bounds(text, font, 100)
    return 100 * width / (w + tracking * max(0, len(text) - 1))
def svg(w, h, body, bg=None, defs=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
            f'<defs>{defs}</defs>' + (f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else "") + body + "</svg>")
def render(name, content, width):
    p = os.path.join(D, name); open(p + ".svg", "w").write(content)
    subprocess.run(["rsvg-convert", "-w", str(width), p + ".svg", "-o", p + ".png"], check=True); return p + ".png"
def bolt(x, y, h, fill):
    w = h * 0.42
    pts = [(x + w*0.55, y), (x, y + h*0.58), (x + w*0.42, y + h*0.58), (x + w*0.2, y + h), (x + w, y + h*0.4), (x + w*0.58, y + h*0.4), (x + w*0.85, y)]
    return f'<polygon points="{" ".join(f"{a:.1f},{b:.1f}" for a, b in pts)}" fill="{fill}"/>'

# ── D · marquee lights (ties to the site's name-in-lights hero) ──────────
def marquee():
    W, H = 1800, 1000
    font, size = "Sigmar_One", fit("JOHN ELIJAH", "Sigmar_One", 1560)
    d, width = text_path("JOHN ELIJAH", font, size, 900, 560, anchor="middle")
    # bulb positions from a PIL mask of the same text
    scale = 1
    img = Image.new("L", (W, H), 0); dr = ImageDraw.Draw(img)
    f = ImageFont.truetype(os.path.join(FONTS, font + ".ttf"), int(size))
    bb = dr.textbbox((0, 0), "JOHN ELIJAH", font=f, anchor="ls")
    dr.text((900 - (bb[2] - bb[0]) / 2 - bb[0], 560), "JOHN ELIJAH", font=f, fill=255, anchor="ls")
    core = img.filter(ImageFilter.MinFilter(19))  # erode so bulbs sit inside the stroke
    px = core.load(); step = 30; bulbs = []
    for yy in range(0, H, step):
        for xx in range((yy // step % 2) * step // 2, W, step):
            if px[xx, yy] > 128: bulbs.append((xx, yy))
    defs = ('<radialGradient id="glow"><stop offset="0" stop-color="#fff6d5"/><stop offset="0.3" stop-color="#ffd76a" stop-opacity="0.85"/><stop offset="1" stop-color="#d9a441" stop-opacity="0"/></radialGradient>'
            '<linearGradient id="body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2a12"/><stop offset="1" stop-color="#1c1409"/></linearGradient>')
    body = [f'<path d="{d}" transform="translate(0,14)" fill="#000" opacity="0.6"/>',
            f'<path d="{d}" fill="url(#body)" stroke="{BRASS}" stroke-width="10" stroke-linejoin="round"/>',
            f'<path d="{d}" fill="none" stroke="{BRASS_DK}" stroke-width="3" transform="translate(0,4)"/>']
    body += [f'<circle cx="{x}" cy="{y}" r="22" fill="url(#glow)"/>' for x, y in bulbs]
    body += [f'<circle cx="{x}" cy="{y}" r="6.5" fill="#fff6d5"/>' for x, y in bulbs]
    d2, w2 = text_path("BLUES & SOUL, LIVE", "Bebas_Neue", 64, 900, 720, tracking=14, anchor="middle"); body.append(f'<path d="{d2}" fill="{BRASS}"/>')
    body.append(f'<rect x="{900-w2/2-170}" y="696" width="130" height="3" fill="{BRASS_DK}"/><rect x="{900+w2/2+40}" y="696" width="130" height="3" fill="{BRASS_DK}"/>')
    return svg(W, H, "".join(body), bg=INK, defs=defs)

# ── E · amp-badge chrome script ──────────────────────────────────────────
def chrome():
    W, H = 1800, 1000
    defs = ('<linearGradient id="chrome" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.38" stop-color="#d6d6d6"/><stop offset="0.5" stop-color="#6e6e6e"/><stop offset="0.62" stop-color="#ececec"/><stop offset="1" stop-color="#8c8c8c"/></linearGradient>'
            '<pattern id="tolex" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="14" height="14" fill="#141210"/><rect width="7" height="14" fill="#1a1713"/></pattern>')
    s = fit("John Elijah", "Lobster", 1420)
    d, _ = text_path("John Elijah", "Lobster", s, 900, 560, anchor="middle")
    body = [f'<rect width="{W}" height="{H}" fill="url(#tolex)"/>',
            f'<path d="{d}" transform="translate(10,16)" fill="#000" opacity="0.7"/>',
            f'<path d="{d}" fill="url(#chrome)" stroke="#1a1a1a" stroke-width="6" stroke-linejoin="round"/>',
            f'<path d="{d}" fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.6" transform="translate(-1,-2)"/>']
    d2, w2 = text_path("BLUES & SOUL", "Oswald", 54, 900, 690, tracking=16, anchor="middle"); body.append(f'<path d="{d2}" fill="{CREAM}"/>')
    body.append(f'<rect x="{900-w2/2-40}" y="640" width="{w2+80}" height="2" fill="{BRASS}"/>')
    body.append(f'<circle cx="{900-w2/2-70}" cy="675" r="7" fill="{RED}"/><circle cx="{900+w2/2+70}" cy="675" r="7" fill="{RED}"/>')
    return svg(W, H, "".join(body), defs=defs)

# ── F · 45 rpm label (record-label soul) ─────────────────────────────────
def label45():
    W = H = 1600; cx = cy = 800
    body = [f'<circle cx="{cx}" cy="{cy}" r="760" fill="#111"/>',
            f'<circle cx="{cx}" cy="{cy}" r="700" fill="{MUSTARD}"/>',
            f'<circle cx="{cx}" cy="{cy}" r="700" fill="none" stroke="{ORANGE}" stroke-width="26"/>',
            f'<circle cx="{cx}" cy="{cy}" r="640" fill="none" stroke="#111" stroke-width="3"/>',
            f'<path d="M {cx-700} {cy} A 700 700 0 0 1 {cx+700} {cy} Z" fill="{ORANGE}" opacity="0.18"/>']
    s = fit("JOHN ELIJAH", "Archivo_Black", 1000)
    d, _ = text_path("JOHN ELIJAH", "Archivo_Black", s, cx, 560, anchor="middle"); body.append(f'<path d="{d}" fill="#111"/>')
    d, _ = text_path("BLUES & SOUL", "Oswald", 72, cx, 660, tracking=20, anchor="middle"); body.append(f'<path d="{d}" fill="#111"/>')
    body.append(f'<circle cx="{cx}" cy="{cy+80}" r="110" fill="#111"/><circle cx="{cx}" cy="{cy+80}" r="42" fill="{PAPER}"/>')
    d, _ = text_path("45", "Archivo_Black", 90, cx - 340, cy + 110, anchor="middle"); body.append(f'<path d="{d}" fill="#111"/>')
    d, _ = text_path("RPM", "Oswald", 40, cx - 340, cy + 160, tracking=6, anchor="middle"); body.append(f'<path d="{d}" fill="#111"/>')
    d, _ = text_path("STEREO", "Oswald", 40, cx + 340, cy + 130, tracking=8, anchor="middle"); body.append(f'<path d="{d}" fill="#111"/>')
    body.append(f'<path d="{arc_text_path("PORT ARANSAS, TEXAS  ·  RECORDED LIVE", "Oswald", 54, cx, cy, 590, tracking=8, up=False)}" fill="#111"/>')
    body.append(f'<path d="{arc_text_path("SIDE A", "Oswald", 54, cx, cy, 590, tracking=10, up=True)}" fill="#111"/>')
    return svg(W, H, "".join(body))

# ── G · typographic block (Blue Note / Chess) ─────────────────────────────
def block():
    W = H = 1600
    body = []
    s = fit("JOHN", "Anton", 1360); d, _ = text_path("JOHN", "Anton", s, 120, 570); body.append(f'<path d="{d}" fill="{CREAM}"/>')
    body.append(f'<rect x="120" y="600" width="1360" height="470" fill="{BLUE}"/>')
    s2 = fit("ELIJAH", "Anton", 1300); d, _ = text_path("ELIJAH", "Anton", s2, 150, 1010); body.append(f'<path d="{d}" fill="{CREAM}"/>')
    d, _ = text_path("BLUES", "Oswald", 60, 120, 1150, tracking=14); body.append(f'<path d="{d}" fill="{CREAM}"/>')
    d, _ = text_path("SOUL", "Oswald", 60, 700, 1150, tracking=14); body.append(f'<path d="{d}" fill="{CREAM}"/>')
    d, _ = text_path("LIVE", "Oswald", 60, 1290, 1150, tracking=14); body.append(f'<path d="{d}" fill="{CREAM}"/>')
    body.append(f'<rect x="120" y="1190" width="1360" height="4" fill="{CREAM}"/>')
    d, _ = text_path("PORT ARANSAS, TEXAS", "Oswald", 40, 120, 1260, tracking=8); body.append(f'<path d="{d}" fill="#8f8779"/>')
    d, _ = text_path("JE · 001", "Oswald", 40, 1480, 1260, tracking=8, anchor="end"); body.append(f'<path d="{d}" fill="#8f8779"/>')
    return svg(W, H, "".join(body), bg=INK)

# ── H · bolt monogram on a pick ──────────────────────────────────────────
def pick():
    W = H = 1600
    pk = "M 800 1440 C 560 1240 300 980 300 640 C 300 400 520 250 800 250 C 1080 250 1300 400 1300 640 C 1300 980 1040 1240 800 1440 Z"
    body = [f'<path d="{pk}" transform="translate(0,18)" fill="#000" opacity="0.5"/>',
            f'<path d="{pk}" fill="{CREAM}"/>',
            f'<path d="{pk}" fill="none" stroke="#111" stroke-width="10" transform="translate(800,845) scale(0.93) translate(-800,-845)"/>']
    d, _ = text_path("JE", "Sigmar_One", 520, 760, 1020, tracking=-30, anchor="middle"); body.append(f'<path d="{d}" fill="#111"/>')
    body.append(bolt(1010, 400, 260, BRASS))
    body.append(bolt(1010, 400, 260, "none").replace('fill="none"', f'fill="none" stroke="#111" stroke-width="8" stroke-linejoin="round"'))
    d, _ = text_path("JOHN ELIJAH", "Oswald", 60, 800, 1170, tracking=14, anchor="middle"); body.append(f'<path d="{d}" fill="#111"/>')
    return svg(W, H, "".join(body), bg=INK)

# ── I · soul revue, 70s misregistered print ───────────────────────────────
def revue():
    W, H = 1800, 1200
    defs = (f'<pattern id="dots" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="8" cy="8" r="4.2" fill="{MUSTARD}"/></pattern>'
            '<clipPath id="txt"><path id="t"/></clipPath>')
    s = fit("JOHN ELIJAH", "Shrikhand", 1520)
    d, _ = text_path("JOHN ELIJAH", "Shrikhand", s, 900, 560, anchor="middle")
    defs = defs.replace('<path id="t"/>', f'<path d="{d}"/>')
    body = [f'<path d="{d}" transform="translate(-18,-14)" fill="{MUSTARD}"/>',
            f'<path d="{d}" fill="{ORANGE}"/>',
            f'<rect x="0" y="480" width="{W}" height="120" fill="url(#dots)" clip-path="url(#txt)" opacity="0.9"/>',
            f'<path d="{d}" fill="none" stroke="#2a1d0e" stroke-width="3" opacity="0.5"/>']
    d2, w2 = text_path("BLUES & SOUL", "Bowlby_One", 96, 900, 720, tracking=6, anchor="middle")
    body.append(f'<path d="{d2}" transform="translate(-8,-6)" fill="{MUSTARD}"/><path d="{d2}" fill="#2a1d0e"/>')
    d3, _ = text_path("Live from the Texas coast", "Yellowtail", 84, 900, 860, anchor="middle"); body.append(f'<path d="{d3}" fill="{ORANGE}"/>')
    # sunburst behind, subtle
    rays = []
    for i in range(24):
        a = i * math.pi / 12
        rays.append(f'<polygon points="900,560 {900+2000*math.cos(a):.0f},{560+2000*math.sin(a):.0f} {900+2000*math.cos(a+0.13):.0f},{560+2000*math.sin(a+0.13):.0f}" fill="{MUSTARD}" opacity="0.10"/>')
    return svg(W, H, "".join(rays) + "".join(body), bg=PAPER, defs=defs)

outs = {}
for name, fn, w in [("D-marquee", marquee, 1800), ("E-chrome", chrome, 1800), ("F-label45", label45, 1600), ("G-block", block, 1600), ("H-pick", pick, 1600), ("I-revue", revue, 1800)]:
    outs[name] = render(name, fn(), w); print("ok", name)

# board 2
tiles = {k: Image.open(v).convert("RGBA") for k, v in outs.items()}
B = Image.new("RGBA", (2400, 2600), (20, 18, 16, 255))
def put(k, box):
    x, y, w, h = box; im = tiles[k]; r = min(w / im.width, h / im.height); im = im.resize((int(im.width * r), int(im.height * r))); B.paste(im, (x + (w - im.width)//2, y + (h - im.height)//2), im)
put("D-marquee", (20, 20, 1170, 650)); put("E-chrome", (1210, 20, 1170, 650))
put("F-label45", (20, 700, 760, 760)); put("G-block", (820, 700, 760, 760)); put("H-pick", (1620, 700, 760, 760))
put("I-revue", (20, 1490, 2360, 1090))
B.convert("RGB").save(os.path.join(D, "board2.png"), quality=92); print("board2")
