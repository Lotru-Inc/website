"""
Build the lotru wordmark: Fredoka (weight 600) letters, with the "o" replaced by the ring of light.

Outputs
  brand/lotru-logo-on-dark.svg      standalone logo for dark backgrounds
  brand/lotru-logo-on-light.svg     standalone logo for light backgrounds
  client/src/logo-geometry.json     letter outlines + ring geometry for the site's <Logo /> component

Rules (the "Pure" concept):
  - ring diameter = the font's x-height (from "u") + 4% overshoot, like a real round letter
  - ring stroke   = the mean stroke width of the font's own "o" (2 * area / perimeter)
  - ring centre   = horizontal centroid of the "o"; vertically centred on the x-height
  - the letters are knocked out around the ring (a mask, so it works on any background)

Requirements: pip install fonttools brotli uharfbuzz
Run from the repo root:  python brand/build_logo.py
Favicon (the ring alone, same proportions):
  python brand/build_logo.py --favicon client/public/favicon.svg --touch-icon-svg /tmp/touch.svg
Other faces, e.g. the Geist "Pure" variant:
  python brand/build_logo.py --font client/node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2 \
      --wght 600 --tracking -0.03 --svg-dir /tmp/out --geometry /tmp/out/logo-geometry.json
"""

import argparse
import io
import json
import math
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.areaPen import AreaPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.perimeterPen import PerimeterPen
from fontTools.pens.statisticsPen import StatisticsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument("--font", type=Path, default=ROOT / "brand/source/Fredoka-Variable.woff2")
ap.add_argument("--wght", type=float, default=600, help="instance a variable font at this weight (0 = leave as is)")
ap.add_argument("--axis", action="append", default=[], metavar="TAG=VALUE", help="pin any variable axis, e.g. SOFT=100 (repeatable)")
ap.add_argument("--soften", type=float, default=0.0, help="round the letter corners: round-join outline width in em")
ap.add_argument("--tracking", type=float, default=0.0, help="letter-spacing in em (like CSS)")
ap.add_argument("--svg-dir", type=Path, default=ROOT / "brand")
ap.add_argument("--geometry", type=Path, default=ROOT / "client/src/logo-geometry.json")
ap.add_argument("--favicon", type=Path, help="also write the ring on its own as a favicon SVG")
ap.add_argument("--touch-icon-svg", type=Path, help="also write a 180px home-screen icon SVG (ring on dark)")
args = ap.parse_args()
FONT = args.font

# Ring palette walked clockwise from the top (matches the site's hero ring).
DARK_STOPS = ["#ffb25c", "#ff7a59", "#f2618f", "#b77cf0", "#7d93ff", "#ffc77a", "#ffb25c"]
# Deeper variant so the pale end doesn't wash out on light backgrounds.
LIGHT_STOPS = ["#f39a3e", "#f0663b", "#db4585", "#9466ee", "#5f78f0", "#f0a040", "#f39a3e"]
ROTATE = -0.35  # radians; where the palette starts around the ring
OVERSHOOT = 1.04
GAP = 0.45  # knockout gap around the ring, as a fraction of the ring stroke
PAD = 0.04  # padding around the artwork, in em


def hex_rgb(h):
    return [int(h[i : i + 2], 16) for i in (1, 3, 5)]


def color_at(a, stops):
    u = ((a / (2 * math.pi)) % 1) * (len(stops) - 1)
    i = int(u)
    c0, c1 = hex_rgb(stops[i]), hex_rgb(stops[min(i + 1, len(stops) - 1)])
    t = u - i
    return "#%02x%02x%02x" % tuple(round(x + (y - x) * t) for x, y in zip(c0, c1))


def fmt(v):
    return f"{v:.1f}".rstrip("0").rstrip(".")


# Decompress (HarfBuzz can't read WOFF2) and optionally pin a variable font's weight,
# then load both fontTools and HarfBuzz from the same plain sfnt bytes.
_src = TTFont(FONT)
_src.flavor = None
_axes = {k: float(v) for k, v in (a.split("=") for a in args.axis)}
if args.wght:
    _axes["wght"] = args.wght
if _axes:
    from fontTools.varLib.instancer import instantiateVariableFont

    _src = instantiateVariableFont(_src, _axes)
_sfnt = io.BytesIO()
_src.save(_sfnt)
font = TTFont(io.BytesIO(_sfnt.getvalue()))
upm = font["head"].unitsPerEm
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
glyph_order = font.getGlyphOrder()
hb_font = hb.Font(hb.Face(_sfnt.getvalue()))
track = args.tracking * upm


def shape(text):
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(hb_font, buf, {})
    names = [glyph_order[i.codepoint] for i in buf.glyph_infos]
    return list(zip(names, buf.glyph_positions))


def measure(name, pen_cls):
    pen = pen_cls(glyphs)
    glyphs[name].draw(pen)
    return pen


# ---- metrics of the real "o" and x-height ----
o_name = cmap[ord("o")]
o_area = abs(measure(o_name, AreaPen).value)
o_perim = measure(o_name, PerimeterPen).value
o_stats = measure(o_name, StatisticsPen)
o_bounds = measure(o_name, BoundsPen).bounds  # xMin, yMin, xMax, yMax
o_adv = font["hmtx"][o_name][0]
x_height = measure(cmap[ord("u")], BoundsPen).bounds[3]

# --soften grows every letter by half its width on each side; the ring must match that weight and size.
_soft = args.soften * upm
stroke = 2 * o_area / o_perim + _soft
diameter = (x_height + _soft) * OVERSHOOT
extra = max(0.0, diameter - (o_bounds[2] - o_bounds[0]))  # widen the o's slot if the ring is wider

# ---- layout: "l" + ring slot + "tru" (shaped separately, so nothing kerns across the ring) ----
paths, x = [], 0.0
bounds = [math.inf, math.inf, -math.inf, -math.inf]


def place(text):
    global x
    for name, pos in shape(text):
        dx, dy = x + pos.x_offset, pos.y_offset
        pen = SVGPathPen(glyphs, ntos=fmt)
        glyphs[name].draw(TransformPen(pen, (1, 0, 0, -1, dx, -dy)))
        if pen.getCommands():
            paths.append(pen.getCommands())
        b = measure(name, BoundsPen).bounds
        if b:
            bounds[0] = min(bounds[0], b[0] + dx)
            bounds[1] = min(bounds[1], -(b[3] + dy))
            bounds[2] = max(bounds[2], b[2] + dx)
            bounds[3] = max(bounds[3], -(b[1] + dy))
        x += pos.x_advance + track


place("l")
ring_cx = x + o_stats.meanX + extra / 2
ring_cy = -x_height / 2
ring_r = diameter / 2 - stroke / 2
x += o_adv + extra + track
place("tru")

outer = ring_r + stroke / 2
bounds = [
    min(bounds[0], ring_cx - outer),
    min(bounds[1], ring_cy - outer),
    max(bounds[2], ring_cx + outer),
    max(bounds[3], ring_cy + outer),
]
soften = args.soften * upm
pad = PAD * upm + soften / 2
vb = [bounds[0] - pad, bounds[1] - pad, bounds[2] - bounds[0] + 2 * pad, bounds[3] - bounds[1] + 2 * pad]
letters = "".join(paths)
gap = stroke * GAP


def ring_markup(stops, uid):
    """Conic gradient approximated by short arcs with linear gradients, clipped to the exact ring by a mask."""
    n = 24
    grads, arcs = [], []

    def pt(a):
        return ring_cx + math.sin(a) * ring_r, ring_cy - math.cos(a) * ring_r

    for i in range(n):
        a0 = i / n * 2 * math.pi
        a1 = (i + 1) / n * 2 * math.pi
        (x0, y0), (x1, y1) = pt(a0), pt(a1)
        (ex, ey) = pt(a1 + 0.04)  # overlap into the next arc so seams never show
        gid = f"{uid}g{i}"
        grads.append(
            f'<linearGradient id="{gid}" gradientUnits="userSpaceOnUse" x1="{fmt(x0)}" y1="{fmt(y0)}" x2="{fmt(x1)}" y2="{fmt(y1)}">'
            f'<stop offset="0" stop-color="{color_at(a0 + ROTATE, stops)}"/><stop offset="1" stop-color="{color_at(a1 + ROTATE, stops)}"/></linearGradient>'
        )
        arcs.append(
            f'<path d="M{fmt(x0)} {fmt(y0)}A{fmt(ring_r)} {fmt(ring_r)} 0 0 1 {fmt(ex)} {fmt(ey)}" stroke="url(#{gid})"/>'
        )
    defs = "".join(grads) + (
        f'<mask id="{uid}r" maskUnits="userSpaceOnUse" x="{fmt(vb[0])}" y="{fmt(vb[1])}" width="{fmt(vb[2])}" height="{fmt(vb[3])}">'
        f'<circle cx="{fmt(ring_cx)}" cy="{fmt(ring_cy)}" r="{fmt(ring_r)}" fill="none" stroke="#fff" stroke-width="{fmt(stroke)}"/></mask>'
    )
    body = f'<g mask="url(#{uid}r)" fill="none" stroke-width="{fmt(stroke * 1.6)}">{"".join(arcs)}</g>'
    return defs, body


def soft_attrs(ink):
    # A round-joined outline in the letter colour rounds every corner (and adds a touch of weight).
    if not soften:
        return ""
    return f' stroke="{ink}" stroke-width="{fmt(soften)}" stroke-linejoin="round"'


def svg(ink, stops, title="lotru"):
    uid = "l"
    ring_defs, ring_body = ring_markup(stops, uid)
    knock = (
        f'<mask id="{uid}k" maskUnits="userSpaceOnUse" x="{fmt(vb[0])}" y="{fmt(vb[1])}" width="{fmt(vb[2])}" height="{fmt(vb[3])}">'
        f'<rect x="{fmt(vb[0])}" y="{fmt(vb[1])}" width="{fmt(vb[2])}" height="{fmt(vb[3])}" fill="#fff"/>'
        f'<circle cx="{fmt(ring_cx)}" cy="{fmt(ring_cy)}" r="{fmt(outer + gap)}" fill="#000"/></mask>'
    )
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{" ".join(fmt(v) for v in vb)}" role="img" aria-label="{title}">'
        f"<title>{title}</title><defs>{knock}{ring_defs}</defs>"
        f'<path d="{letters}" fill="{ink}"{soft_attrs(ink)} mask="url(#{uid}k)"/>{ring_body}</svg>\n'
    )


(args.svg_dir / "lotru-logo-on-dark.svg").write_text(svg("#f4efe9", DARK_STOPS))
(args.svg_dir / "lotru-logo-on-light.svg").write_text(svg("#0f0e0d", LIGHT_STOPS))

geometry = {
    "viewBox": [round(v, 1) for v in vb],
    "letters": letters,
    "letterSoften": round(soften, 1),
    "ring": {"cx": round(ring_cx, 1), "cy": round(ring_cy, 1), "r": round(ring_r, 1), "stroke": round(stroke, 1)},
    "knockoutRadius": round(outer + gap, 1),
    "arcs": [],
}
# Precomputed arcs + colours for the site component (dark palette).
n = 24
for i in range(n):
    a0, a1 = i / n * 2 * math.pi, (i + 1) / n * 2 * math.pi
    p = lambda a: [round(ring_cx + math.sin(a) * ring_r, 1), round(ring_cy - math.cos(a) * ring_r, 1)]
    geometry["arcs"].append(
        {"from": p(a0), "to": p(a1), "end": p(a1 + 0.04), "c0": color_at(a0 + ROTATE, DARK_STOPS), "c1": color_at(a1 + ROTATE, DARK_STOPS)}
    )
args.geometry.write_text(json.dumps(geometry, separators=(",", ":")) + "\n")



def ring_icon(size, outer_frac, background=None):
    """The logo's "o" alone: same stroke-to-diameter ratio, palette and rotation; follows light/dark mode."""
    c = size / 2
    outer_r = size * outer_frac / 2
    ratio = stroke / diameter  # ring thickness relative to its outer diameter, as in the wordmark
    th = ratio * outer_r * 2
    r = outer_r - th / 2
    n = 12  # plenty of colour segments at icon sizes

    def pt(a, rad=r):
        return c + math.sin(a) * rad, c - math.cos(a) * rad

    def ring(stops, uid):
        grads, arcs = [], []
        for i in range(n):
            a0, a1 = i / n * 2 * math.pi, (i + 1) / n * 2 * math.pi
            (x0, y0), (x1, y1), (ex, ey) = pt(a0), pt(a1), pt(a1 + 0.04)
            gid = f"{uid}{i}"
            f2 = lambda v: f"{v:.2f}".rstrip("0").rstrip(".")
            grads.append(
                f'<linearGradient id="{gid}" gradientUnits="userSpaceOnUse" x1="{f2(x0)}" y1="{f2(y0)}" x2="{f2(x1)}" y2="{f2(y1)}">'
                f'<stop offset="0" stop-color="{color_at(a0 + ROTATE, stops)}"/><stop offset="1" stop-color="{color_at(a1 + ROTATE, stops)}"/></linearGradient>'
            )
            arcs.append(f'<path d="M{f2(x0)} {f2(y0)}A{f2(r)} {f2(r)} 0 0 1 {f2(ex)} {f2(ey)}" stroke="url(#{gid})"/>')
        return "".join(grads), f'<g class="{uid}" mask="url(#m)" fill="none" stroke-width="{th * 1.6:.2f}">{"".join(arcs)}</g>'

    dg, dbody = ring(DARK_STOPS, "d")
    lg, lbody = ring(LIGHT_STOPS, "l")
    bg = f'<rect width="{size}" height="{size}" fill="{background}"/>' if background else ""
    # Without a background, deepen the colours when the browser chrome is light.
    style = "" if background else (
        "<style>.l{display:none}@media (prefers-color-scheme:light){.d{display:none}.l{display:inline}}</style>"
    )
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}">{style}<defs>{dg}{"" if background else lg}'
        f'<mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="{size}" height="{size}">'
        f'<circle cx="{c}" cy="{c}" r="{r:.2f}" fill="none" stroke="#fff" stroke-width="{th:.2f}"/></mask></defs>'
        f'{bg}{dbody}{"" if background else lbody}</svg>\n'
    )


if args.favicon:
    args.favicon.write_text(ring_icon(64, 62 / 64))
if args.touch_icon_svg:
    # iOS rounds the corners itself; keep the ring well inside the visible area.
    args.touch_icon_svg.write_text(ring_icon(180, 0.66, background="#0a0908"))

print(f"upm={upm} x-height={x_height} stroke={stroke:.1f} ring d={diameter:.1f} viewBox={[round(v) for v in vb]}")
