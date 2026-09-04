"""Text → SVG path data via fontTools (no fontconfig, no font dependency in the output)."""
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
import math, os
FONTS = "/private/tmp/claude-501/-Users-winstoncaraker-Projects-workspace/b36c94d1-1c23-498c-878c-31b715bd0308/scratchpad/je/fonts"
_cache = {}
def load(name):
    if name not in _cache:
        f = TTFont(os.path.join(FONTS, name + ".ttf"))
        _cache[name] = (f, f.getGlyphSet(), f.getBestCmap(), f["head"].unitsPerEm, f["hmtx"].metrics)
    return _cache[name]
def kern_pairs(font):
    k = {}
    if "kern" in font:
        for t in font["kern"].kernTables:
            k.update(getattr(t, "kernTable", {}))
    return k
def layout(text, fontname, size, tracking=0):
    """Returns list of (glyphname, x_offset_in_px, advance_px) and total width, using advances + kern table."""
    font, gs, cmap, upm, hmtx = load(fontname)
    s = size / upm
    k = kern_pairs(font)
    names = [cmap.get(ord(c), ".notdef") for c in text]
    out, x = [], 0.0
    for i, g in enumerate(names):
        adv = hmtx[g][0] * s if g in hmtx else size * 0.3
        out.append((g, x, adv))
        x += adv + tracking
        if i + 1 < len(names):
            x += k.get((g, names[i+1]), 0) * s
    return out, x - tracking
def text_path(text, fontname, size, x=0, y=0, tracking=0, anchor="start"):
    """SVG path d for text with baseline at (x,y). anchor: start|middle|end."""
    font, gs, cmap, upm, hmtx = load(fontname)
    s = size / upm
    glyphs, width = layout(text, fontname, size, tracking)
    x0 = x - (width / 2 if anchor == "middle" else width if anchor == "end" else 0)
    pen = SVGPathPen(gs)
    for g, gx, adv in glyphs:
        if g not in gs: continue
        tp = TransformPen(pen, (s, 0, 0, -s, x0 + gx, y))
        gs[g].draw(tp)
    return pen.getCommands(), width
def arc_text_path(text, fontname, size, cx, cy, r, tracking=0, up=True):
    """Text along a circle centred (cx,cy), radius r. up=True: centred at 12 o'clock, tops outward.
    up=False: centred at 6 o'clock, reads left->right, tops toward the centre."""
    font, gs, cmap, upm, hmtx = load(fontname)
    s = size / upm
    glyphs, width = layout(text, fontname, size, tracking)
    total = width / r
    pen = SVGPathPen(gs)
    for g, gx, adv in glyphs:
        if g not in gs: continue
        mid = gx + adv / 2
        phi = -total / 2 + mid / r          # increases left -> right
        if up:
            px, py, rot = cx + r * math.sin(phi), cy - r * math.cos(phi), phi
        else:
            px, py, rot = cx + r * math.sin(phi), cy + r * math.cos(phi), -phi
        c, sn = math.cos(rot), math.sin(rot)
        tp = TransformPen(pen, (s*c, s*sn, s*sn, -s*c, px - (adv/2)*c, py - (adv/2)*sn))
        gs[g].draw(tp)
    return pen.getCommands()
def text_bounds(text, fontname, size):
    font, gs, cmap, upm, hmtx = load(fontname)
    s = size / upm
    glyphs, width = layout(text, fontname, size)
    ymin, ymax = 0, 0
    for g, gx, adv in glyphs:
        if g not in gs: continue
        bp = BoundsPen(gs); gs[g].draw(bp)
        if bp.bounds:
            ymin = min(ymin, bp.bounds[1] * s); ymax = max(ymax, bp.bounds[3] * s)
    return width, ymin, ymax
