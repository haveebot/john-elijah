import math, os, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
from textpath import text_path, arc_text_path, text_bounds
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__))
LOGOS = "ls/7-0"
RED, GOLD, CREAM, INK = "#b01f25", "#c7a660", "#f0efeb", "#141210"
GOLD_DK, RED_DK = "#a4864a", "#7a1218"

def fit(text, font, width, tracking=0):
    w, _, _ = text_bounds(text, font, 100)
    return 100 * width / (w + tracking * max(0, len(text) - 1) / 1)

def star_facets(cx, cy, r, inner=0.42, light=GOLD, dark=GOLD_DK, keyline=CREAM, rot=-math.pi/2):
    pts = []
    for i in range(10):
        a = rot + i * math.pi / 5
        rr = r if i % 2 == 0 else r * inner
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    out = []
    for i in range(10):
        p1, p2 = pts[i], pts[(i + 1) % 10]
        out.append(f'<polygon points="{cx:.1f},{cy:.1f} {p1[0]:.1f},{p1[1]:.1f} {p2[0]:.1f},{p2[1]:.1f}" fill="{light if i % 2 == 0 else dark}"/>')
    outline = " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
    return f'<polygon points="{outline}" fill="none" stroke="{keyline}" stroke-width="{r*0.045:.1f}" stroke-linejoin="round"/>' + "".join(out) + f'<polygon points="{outline}" fill="none" stroke="{keyline}" stroke-width="{r*0.02:.1f}" stroke-linejoin="round"/>'

def star_flat(cx, cy, r, fill=GOLD, inner=0.42):
    pts = []
    for i in range(10):
        a = -math.pi/2 + i * math.pi / 5
        rr = r if i % 2 == 0 else r * inner
        pts.append(f"{cx + rr*math.cos(a):.1f},{cy + rr*math.sin(a):.1f}")
    return f'<polygon points="{" ".join(pts)}" fill="{fill}"/>'

def layered(d, fill=CREAM, edge=GOLD, shadow=RED_DK, dx=9, dy=9, edge_w=10):
    return (f'<path d="{d}" transform="translate({dx},{dy})" fill="{shadow}" stroke="{shadow}" stroke-width="{edge_w}" stroke-linejoin="round"/>'
            f'<path d="{d}" fill="none" stroke="{edge}" stroke-width="{edge_w}" stroke-linejoin="round"/>'
            f'<path d="{d}" fill="{fill}"/>')

def svg(w, h, body, bg=None):
    return f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{w}" height="{h}" viewBox="0 0 {w} {h}">' + (f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else "") + body + "</svg>"

def render(name, content, width):
    p = os.path.join(D, name)
    open(p + ".svg", "w").write(content)
    subprocess.run(["rsvg-convert", "-w", str(width), p + ".svg", "-o", p + ".png"], check=True)
    return p + ".png"

# ───────── A · companion crest (LONE/STAR/BEER ↔ JOHN/ELIJAH/BAND) ─────────
def crest(with_city=True):
    W = H = 1600
    shield = "M 300 430 C 470 490 1130 490 1300 430 C 1260 700 1300 990 1330 1080 C 1270 1260 1010 1340 800 1430 C 590 1340 330 1260 270 1080 C 300 990 340 700 300 430 Z"
    body = []
    body.append(f'<path d="{shield}" fill="{GOLD}" stroke="{GOLD}" stroke-width="70" stroke-linejoin="round"/>')
    body.append(f'<path d="{shield}" fill="{RED}" stroke="{CREAM}" stroke-width="12" stroke-linejoin="round"/>')
    body.append(star_facets(800, 385, 200))
    s1 = fit("JOHN", "Rye", 560); d, _ = text_path("JOHN", "Rye", s1, 800, 800, anchor="middle"); body.append(f'<path d="{d}" fill="{CREAM}"/>')
    s2 = fit("ELIJAH", "Rye", 860); d, _ = text_path("ELIJAH", "Rye", s2, 800, 1010, anchor="middle"); body.append(f'<path d="{d}" fill="{CREAM}"/>')
    s3 = fit("BAND", "Alfa_Slab_One", 400); d, _ = text_path("BAND", "Alfa_Slab_One", s3, 800, 1160, anchor="middle"); body.append(f'<path d="{d}" fill="{CREAM}"/>')
    if with_city:
        d, _ = text_path("PORT ARANSAS · TEXAS", "Bebas_Neue", 44, 800, 1262, tracking=6, anchor="middle"); body.append(f'<path d="{d}" fill="{GOLD}"/>')
    return svg(W, H, "".join(body))

# ───────── B · layered marquee stack (type-only, koozie/poster) ─────────
def stack():
    W, H = 1800, 1200
    body = []
    s = fit("JOHN ELIJAH", "Rye", 1480); d, _ = text_path("JOHN ELIJAH", "Rye", s, 900, 470, anchor="middle")
    body.append(layered(d))
    body.append(f'<rect x="510" y="560" width="780" height="118" fill="{RED}"/>')
    d, _ = text_path("BAND", "Bebas_Neue", 118, 900, 668, tracking=40, anchor="middle"); body.append(f'<path d="{d}" fill="{CREAM}"/>')
    body.append(f'<rect x="300" y="618" width="180" height="4" fill="{GOLD}"/><rect x="1320" y="618" width="180" height="4" fill="{GOLD}"/>')
    body.append(star_flat(270, 620, 26) + star_flat(1530, 620, 26))
    d, _ = text_path("Blues & Soul, Live", "Yellowtail", 120, 900, 860, anchor="middle"); body.append(f'<path d="{d}" fill="{GOLD}"/>')
    body.append(f'<image xlink:href="{LOGOS}5-LS_Logo-White.png" x="676" y="960" width="120" height="120"/>')
    d, _ = text_path("OFFICIAL LONE STAR BEER ARTIST", "Bebas_Neue", 52, 816, 1044, tracking=8); body.append(f'<path d="{d}" fill="{CREAM}"/>')
    return svg(W, H, "".join(body), bg=INK)

# ───────── C · star-and-ribbon seal ─────────
def seal():
    W = H = 1600; cx = cy = 800
    body = []
    body.append(f'<circle cx="{cx}" cy="{cy}" r="700" fill="{RED}" stroke="{GOLD}" stroke-width="40"/>')
    body.append(f'<circle cx="{cx}" cy="{cy}" r="664" fill="none" stroke="{CREAM}" stroke-width="8"/>')
    body.append(f'<circle cx="{cx}" cy="{cy}" r="500" fill="none" stroke="{GOLD}" stroke-width="6"/>')
    body.append(f'<path d="{arc_text_path("JOHN ELIJAH BAND", "Rye", 118, cx, cy, 560, tracking=6, up=True)}" fill="{CREAM}"/>')
    body.append(f'<path d="{arc_text_path("PORT ARANSAS  ·  TEXAS", "Bebas_Neue", 84, cx, cy, 580, tracking=10, up=False)}" fill="{CREAM}"/>')
    body.append(star_flat(cx - 590, cy, 34, CREAM) + star_flat(cx + 590, cy, 34, CREAM))
    body.append(star_facets(cx, cy - 60, 300))
    rib = f"M {cx-420} 905 L {cx+420} 905 L {cx+390} 1005 L {cx+420} 1105 L {cx-420} 1105 L {cx-390} 1005 Z"
    body.append(f'<path d="{rib}" fill="{CREAM}" stroke="{GOLD}" stroke-width="10" stroke-linejoin="round"/>')
    d, _ = text_path("BLUES & SOUL", "Alfa_Slab_One", 96, cx, 1040, tracking=4, anchor="middle"); body.append(f'<path d="{d}" fill="{RED}"/>')
    return svg(W, H, "".join(body))

# ───────── pairings with the official Lone Star mark ─────────
def pair(png, bg, name, cross=False):
    W, H = 2400, 1300
    if cross:
        d, _ = text_path("×", "Bebas_Neue", 220, 1200, 720, anchor="middle")
        body = f'<image xlink:href="{png}" x="60" y="100" width="1060" height="1060"/><path d="{d}" fill="{GOLD}"/><image xlink:href="{LOGOS}4-LS_Logo-Keyline-Full-Color.png" x="1280" y="100" width="1060" height="1060"/>'
    else:
        body = f'<image xlink:href="{png}" x="120" y="100" width="1100" height="1100"/><image xlink:href="{LOGOS}4-LS_Logo-Keyline-Full-Color.png" x="1180" y="100" width="1100" height="1100"/>'
    return render(name, svg(W, H, body, bg=bg), 2400)

a = render("A-crest", crest(), 1600)
a2 = render("A-crest-clean", crest(with_city=False), 1600)
b = render("B-stack", stack(), 1800)
c = render("C-seal", seal(), 1600)
pa = pair(a, INK, "pair-A-black", cross=True)
pa2 = pair(a, CREAM, "pair-A-cream", cross=True)
pc = pair(c, INK, "pair-C-black")

# contact sheet
tiles = [Image.open(p).convert("RGBA") for p in (a, c, b, pa, pc)]
board = Image.new("RGBA", (2400, 1300 + 900 + 900 + 60), (20, 18, 16, 255))
t0 = tiles[0].resize((800, 800)); t1 = tiles[1].resize((800, 800)); t2 = tiles[2].resize((800, 533))
board.paste(t0, (20, 20), t0); board.paste(t1, (840, 20), t1); board.paste(t2, (1660, 150), t2)
p3 = tiles[3].resize((2360, 1278)); board.paste(p3, (20, 860), p3)
p4 = tiles[4].resize((1180, 639)); board.paste(p4, (20, 2180), p4)
p5 = Image.open(pa2).convert("RGBA").resize((1180, 639)); board.paste(p5, (1200, 2180), p5)
board.convert("RGB").save(os.path.join(D, "board.png"), quality=92)
print("done")
