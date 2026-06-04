#!/usr/bin/env python3
"""Build the Hockley Mint starter notice-board deck (board.pptx).

Recreates the eight default slides in the brand's ink-green / brass / ivory
style so the manager never starts from a blank deck. 16:9, 1920x1080.
The top-right corner is kept clear for the live clock/weather overlay the
kiosk draws on top.
"""
import os
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import qn

try:
    from PIL import Image, ImageChops
except ImportError:
    Image = None

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.normpath(os.path.join(HERE, "..", "assets"))

# ---- palette -------------------------------------------------------------
INK      = RGBColor(0x06, 0x12, 0x0D)
INK2     = RGBColor(0x0B, 0x20, 0x1A)
GREEN    = RGBColor(0x0F, 0x4D, 0x3C)
GREEN_LT = RGBColor(0x1C, 0x5C, 0x47)
BRASS    = RGBColor(0xC9, 0xA4, 0x5C)
BRASS_HI = RGBColor(0xEC, 0xD6, 0xA3)
IVORY    = RGBColor(0xF3, 0xEF, 0xE4)
IVORY_DIM= RGBColor(0xBE, 0xCD, 0xC4)
MINT     = RGBColor(0xCF, 0xE8, 0xDD)
AMBER    = RGBColor(0xE3, 0xA9, 0x3C)
AMBER_HI = RGBColor(0xF2, 0xC6, 0x6A)
PAPER    = RGBColor(0xF3, 0xEF, 0xE4)
GREY_LN  = RGBColor(0xC9, 0xCB, 0xC2)

HEADER = "Georgia"
BODY   = "Arial"

EMU_IN = 914400
W = Inches(13.333)
H = Inches(7.5)

prs = Presentation()
prs.slide_width = W
prs.slide_height = H
BLANK = prs.slide_layouts[6]


def _gen_deck_bg():
    """Dark ink background woven with a faint diamond (jewel) brand pattern,
    derived from assets/pattern-01.png. Kept dark so ivory/mint text stays
    high-contrast. Returns a path, or None to fall back to a vector gradient."""
    pat_path = os.path.join(ASSETS, "pattern-01.png")
    if Image is None or not os.path.exists(pat_path):
        return None
    w, h = 1280, 720
    grad = Image.new("RGB", (1, h))
    top, mid, bot = (0x06, 0x12, 0x0D), (0x10, 0x2C, 0x22), (0x04, 0x0E, 0x0A)
    for y in range(h):
        t = y / (h - 1)
        if t < 0.5:
            f = t / 0.5; c = tuple(int(top[i] + (mid[i] - top[i]) * f) for i in range(3))
        else:
            f = (t - 0.5) / 0.5; c = tuple(int(mid[i] + (bot[i] - mid[i]) * f) for i in range(3))
        grad.putpixel((0, y), c)
    base = grad.resize((w, h))
    pat = Image.open(pat_path).convert("RGB").resize((w, h))
    # multiply keeps the diamond structure but dark; blend it back faintly.
    dark_pat = ImageChops.multiply(pat, base)
    blended = Image.blend(base, dark_pat, 0.6)
    out = os.path.join(HERE, "_deck_bg.png")
    blended.save(out, optimize=True)
    return out


DECK_BG = _gen_deck_bg()


# ---- helpers -------------------------------------------------------------
def slide():
    return prs.slides.add_slide(BLANK)


def no_shadow(shape):
    # python-pptx adds an inherited shadow on autoshapes; turn it off.
    sp = shape._element.spPr
    existing = sp.find(qn("a:effectLst"))
    if existing is None:
        sp.append(sp.makeelement(qn("a:effectLst"), {}))


def gradient_bg(s, c_top=INK, c_mid=GREEN_LT, c_bot=INK):
    # Preferred: the baked diamond-pattern background (cohesive across slides).
    if DECK_BG:
        s.shapes.add_picture(DECK_BG, 0, 0, width=W, height=H)
        return None
    # Fallback: a plain vector gradient if Pillow / the pattern is unavailable.
    r = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, W, H)
    r.line.fill.background()
    no_shadow(r)
    f = r.fill
    f.gradient()
    stops = f.gradient_stops
    stops[0].position = 0.0
    stops[0].color.rgb = c_top
    stops[1].position = 1.0
    stops[1].color.rgb = c_bot
    # insert a middle stop for a richer ramp
    try:
        f.gradient_angle = 90.0
    except Exception:
        pass
    return r


def set_tracking(run, pts):
    run._r.get_or_add_rPr().set("spc", str(int(pts * 100)))


def text(s, l, t, w, h, runs, size, color, font=BODY, bold=False, italic=False,
         align=PP_ALIGN.LEFT, tracking=0.0, line_spacing=1.05, anchor=MSO_ANCHOR.TOP):
    box = s.shapes.add_textbox(l, t, w, h)
    tf = box.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = 0
    tf.margin_right = 0
    tf.margin_top = 0
    tf.margin_bottom = 0
    if isinstance(runs, str):
        runs = [runs]
    p = tf.paragraphs[0]
    p.alignment = align
    p.line_spacing = line_spacing
    for i, txt in enumerate(runs):
        r = p.add_run()
        r.text = txt
        r.font.size = Pt(size)
        r.font.name = font
        r.font.bold = bold
        r.font.italic = italic
        r.font.color.rgb = color
        if tracking:
            set_tracking(r, tracking)
    return box


def kicker(s, l, t, label, color=BRASS):
    return text(s, l, t, Inches(8), Inches(0.5), label.upper(), 15, color,
                font=BODY, bold=True, tracking=4.0)


def card(s, l, t, w, h, fill=None, border=BRASS, radius=0.08, line_w=1.0,
         border_alpha=None):
    sh = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, l, t, w, h)
    sh.adjustments[0] = radius
    no_shadow(sh)
    if fill is None:
        sh.fill.background()
    else:
        sh.fill.solid()
        sh.fill.fore_color.rgb = fill
    if border is None:
        sh.line.fill.background()
    else:
        sh.line.color.rgb = border
        sh.line.width = Pt(line_w)
    return sh


def circle(s, l, t, d, fill, glyph=None, glyph_color=INK, glyph_size=18, glyph_font=BODY):
    e = s.shapes.add_shape(MSO_SHAPE.OVAL, l, t, d, d)
    no_shadow(e)
    e.fill.solid()
    e.fill.fore_color.rgb = fill
    e.line.fill.background()
    if glyph is not None:
        tf = e.text_frame
        tf.margin_left = 0; tf.margin_right = 0; tf.margin_top = 0; tf.margin_bottom = 0
        tf.word_wrap = False
        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER
        r = p.add_run(); r.text = glyph
        r.font.size = Pt(glyph_size); r.font.bold = True
        r.font.name = glyph_font; r.font.color.rgb = glyph_color
    return e


def meta(s, l, t, label, value, color=BRASS, value_color=IVORY, w=Inches(4)):
    text(s, l, t, w, Inches(0.4), label.upper(), 13, color, bold=True, tracking=3.0)
    text(s, l, t + Inches(0.38), w, Inches(0.6), value, 24, value_color,
         font=HEADER, bold=True)


LM = Inches(0.95)   # left margin


# ========================================================================
# Slide 1 - Welcome (hero)
# ========================================================================
s = slide()
gradient_bg(s, INK, GREEN_LT, INK)
kicker(s, LM, Inches(1.15), "Today at Hockley Mint")
text(s, LM, Inches(1.65), Inches(8.0), Inches(2.2),
     "Good morning, co-owners", 50, IVORY, font=HEADER, bold=True, line_spacing=1.0)
text(s, LM, Inches(3.55), Inches(6.7), Inches(1.8),
     "A quick look at the notices, events, birthdays, values and useful "
     "updates for the workshop today.", 22, MINT, line_spacing=1.25)
meta(s, LM, Inches(5.55), "Workshop hours", "07:30 – 17:00")
logo = os.path.join(ASSETS, "logo-white.png")
if os.path.exists(logo):
    s.shapes.add_picture(logo, Inches(9.15), Inches(2.95), width=Inches(3.4))


# ========================================================================
# Slide 2 - Announcements (notice)
# ========================================================================
s = slide()
gradient_bg(s, INK, GREEN, INK)
kicker(s, LM, Inches(0.95), "Announcements")
text(s, LM, Inches(1.45), Inches(7.4), Inches(1.6),
     "Annual co-owners' meeting", 46, IVORY, font=HEADER, bold=True, line_spacing=1.0)
text(s, LM, Inches(3.05), Inches(7.2), Inches(1.6),
     "All co-owners are invited to the main workshop. Agenda: FY results, "
     "Aurora collection, sustainability update and open Q&A.", 20, MINT, line_spacing=1.25)
# meta card (right, below overlay zone)
mc = card(s, Inches(9.35), Inches(2.3), Inches(3.1), Inches(1.5),
          fill=GREEN_LT, border=BRASS, radius=0.1)
text(s, Inches(9.65), Inches(2.55), Inches(2.6), Inches(0.4),
     "When", 13, BRASS_HI, bold=True, tracking=3.0)
text(s, Inches(9.65), Inches(2.95), Inches(2.6), Inches(0.8),
     "Friday 16 May\n15:00", 24, IVORY, font=HEADER, bold=True, line_spacing=1.05)
items = ["Refreshments from 14:30", "RSVP on the kitchen sign-up sheet",
         "Questions welcome in advance"]
y = 4.85
for i, it in enumerate(items):
    text(s, LM, Inches(y), Inches(0.9), Inches(0.6),
         f"{i+1:02d}", 26, BRASS, font=HEADER, bold=True)
    text(s, LM + Inches(0.85), Inches(y + 0.06), Inches(6.6), Inches(0.6),
         it, 20, IVORY, anchor=MSO_ANCHOR.MIDDLE)
    y += 0.72


# ========================================================================
# Slide 3 - Birthday
# ========================================================================
s = slide()
gradient_bg(s, INK2, GREEN, INK2)
# confetti motif (top band only: clear of the text and the overlay zone)
for (cx, cy, d, col) in [(3.8, 0.6, 0.16, BRASS), (5.0, 0.5, 0.10, MINT),
                          (6.2, 0.78, 0.12, BRASS_HI), (7.4, 0.55, 0.10, MINT),
                          (8.4, 0.7, 0.09, BRASS)]:
    circle(s, Inches(cx), Inches(cy), Inches(d), col)
kicker(s, LM, Inches(1.5), "Birthday celebration", color=MINT)
text(s, LM, Inches(2.0), Inches(7.4), Inches(1.8),
     "Happy Birthday, Aisha", 58, IVORY, font=HEADER, bold=True, line_spacing=1.0)
text(s, LM, Inches(4.2), Inches(6.7), Inches(1.7),
     "Wishing you a wonderful day from everyone at Hockley Mint. Thank you "
     "for the care and craft you bring to the workshop.", 22, MINT, line_spacing=1.25)
meta(s, LM, Inches(6.0), "From", "Your Hockley Mint team", w=Inches(5.5))
# photo placeholder
ph = card(s, Inches(9.2), Inches(2.45), Inches(3.25), Inches(4.0),
          fill=None, border=BRASS, radius=0.06, line_w=1.5)
ph.line.dash_style = 2  # dashed
text(s, Inches(9.2), Inches(4.2), Inches(3.25), Inches(0.6),
     "Add a photo", 16, IVORY_DIM, align=PP_ALIGN.CENTER, tracking=2.0)


# ========================================================================
# Slide 4 - Events
# ========================================================================
s = slide()
gradient_bg(s, INK, GREEN_LT, INK)
kicker(s, LM, Inches(0.95), "Upcoming events")
text(s, LM, Inches(1.45), Inches(8.5), Inches(1.2),
     "This fortnight at the workshop", 46, IVORY, font=HEADER, bold=True, line_spacing=1.0)
text(s, LM, Inches(3.05), Inches(8.0), Inches(0.8),
     "Key dates and useful reminders for everyone on site.", 20, MINT)
events = [("08 May", "Co-owners coffee  ·  Kitchen  ·  09:00"),
          ("13 May", "Fire drill  ·  whole building  ·  11:30"),
          ("22 May", "Aurora press preview  ·  Showroom  ·  10:00")]
y = 3.75
for date, desc in events:
    chip = card(s, LM, Inches(y), Inches(2.0), Inches(0.78),
                fill=BRASS, border=None, radius=0.18)
    text(s, LM, Inches(y), Inches(2.0), Inches(0.78), date, 22, INK,
         font=HEADER, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    text(s, LM + Inches(2.35), Inches(y), Inches(8.4), Inches(0.78),
         desc, 22, IVORY, anchor=MSO_ANCHOR.MIDDLE)
    y += 1.02


# ========================================================================
# Slide 5 - Values (the real brand wallpaper, full-bleed)
# ========================================================================
s = slide()
values_img = os.path.join(ASSETS, "Values (Desktop Wallpaper).jpg")
if os.path.exists(values_img):
    # 16:9 brand graphic - fills the slide exactly, no overlay needed.
    s.shapes.add_picture(values_img, 0, 0, width=W, height=H)
else:
    # Fallback: a 2x2 card grid if the wallpaper is missing.
    gradient_bg(s, INK, GREEN, INK)
    kicker(s, LM, Inches(0.85), "Our values")
    text(s, LM, Inches(1.35), Inches(9), Inches(1.1),
         "What we stand for", 46, IVORY, font=HEADER, bold=True)
    values = ["Kind to our environment", "Delighted customers",
              "Honest British craftsmanship", "Happy co-owners"]
    gx, gy = LM, Inches(2.75)
    cw, ch, gap = Inches(5.45), Inches(1.85), Inches(0.45)
    for i, v in enumerate(values):
        col, row = i % 2, i // 2
        l = gx + col * (cw + gap)
        t = gy + row * (ch + gap)
        card(s, l, t, cw, ch, fill=GREEN_LT, border=BRASS, radius=0.08)
        circle(s, l + Inches(0.35), t + Inches(0.52), Inches(0.8), BRASS,
               glyph="◆", glyph_color=INK, glyph_size=22)
        text(s, l + Inches(1.45), t, cw - Inches(1.7), ch, v, 24, IVORY,
             font=HEADER, bold=True, anchor=MSO_ANCHOR.MIDDLE, line_spacing=1.05)


# ========================================================================
# Slide 6 - Health & Safety (amber)
# ========================================================================
s = slide()
gradient_bg(s, INK, INK2, INK)
# amber accent bar on the left edge
bar = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(0.22), H)
no_shadow(bar); bar.fill.solid(); bar.fill.fore_color.rgb = AMBER
bar.line.fill.background()
kicker(s, LM, Inches(0.95), "Safety", color=AMBER_HI)
text(s, LM, Inches(1.45), Inches(8.2), Inches(1.4),
     "Fire drill on Tuesday", 48, IVORY, font=HEADER, bold=True)
text(s, LM, Inches(2.95), Inches(7.4), Inches(1.4),
     "Scheduled drill for all departments. Please leave by your nearest route "
     "and meet at the east car park assembly point.", 20, MINT, line_spacing=1.25)
mc = card(s, Inches(9.5), Inches(2.2), Inches(3.0), Inches(1.6),
          fill=None, border=AMBER, radius=0.1)
text(s, Inches(9.8), Inches(2.5), Inches(2.5), Inches(0.4),
     "Time", 13, AMBER_HI, bold=True, tracking=3.0)
text(s, Inches(9.8), Inches(2.9), Inches(2.5), Inches(0.7),
     "Tuesday, 11:30", 22, IVORY, font=HEADER, bold=True, line_spacing=1.05)
items = ["Do not use lifts", "Take visitors with you",
         "Return only when cleared by Facilities"]
y = 4.7
for it in items:
    circle(s, LM, Inches(y + 0.05), Inches(0.32), AMBER, glyph="✓",
           glyph_color=INK, glyph_size=14)
    text(s, LM + Inches(0.55), Inches(y), Inches(7.6), Inches(0.5),
         it, 20, IVORY, anchor=MSO_ANCHOR.MIDDLE)
    y += 0.62


# ========================================================================
# Slide 7 - Kudos (people)
# ========================================================================
s = slide()
gradient_bg(s, INK2, GREEN, INK2)
kicker(s, LM, Inches(0.9), "Shout-outs")
text(s, LM, Inches(1.4), Inches(9), Inches(1.1),
     "Kudos from the workshop", 46, IVORY, font=HEADER, bold=True)
text(s, LM, Inches(2.6), Inches(9), Inches(0.7),
     "Small notes of appreciation from around the business.", 20, MINT)
people = [("C", "Casting team", "Q1 wedding band run shipped a day early"),
          ("C", "CAD team", "Bespoke commission turned around in 48 hours"),
          ("D", "Despatch", "Every next-day parcel out before cut-off")]
cw, gap = Inches(3.7), Inches(0.42)
x = LM
for initial, who, what in people:
    card(s, x, Inches(3.5), cw, Inches(2.95), fill=GREEN_LT, border=BRASS, radius=0.08)
    circle(s, x + Inches(0.4), Inches(3.9), Inches(0.85), BRASS,
           glyph=initial, glyph_color=INK, glyph_size=26, glyph_font=HEADER)
    text(s, x + Inches(0.4), Inches(4.95), cw - Inches(0.8), Inches(0.45),
         who, 20, BRASS_HI, font=HEADER, bold=True)
    text(s, x + Inches(0.4), Inches(5.45), cw - Inches(0.8), Inches(0.9),
         what, 16, IVORY, line_spacing=1.2)
    x += cw + gap


# ========================================================================
# Slide 8 - Document
# ========================================================================
s = slide()
gradient_bg(s, INK, GREEN_LT, INK)
kicker(s, LM, Inches(1.2), "Useful document")
text(s, LM, Inches(1.7), Inches(7.4), Inches(1.3),
     "Brand Guidelines V2", 48, IVORY, font=HEADER, bold=True)
text(s, LM, Inches(3.15), Inches(6.7), Inches(1.5),
     "The latest brand guidelines are available for anyone preparing internal "
     "or customer-facing materials.", 22, MINT, line_spacing=1.25)
meta(s, LM, Inches(5.2), "PDF", "P4707 Hockley Mint Brand Guidelines V2", w=Inches(7))
# stylised paper sheet on the right
sheet = card(s, Inches(9.35), Inches(2.35), Inches(3.0), Inches(3.9),
             fill=PAPER, border=None, radius=0.03)
corner = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(11.55), Inches(2.35),
                            Inches(0.8), Inches(0.55))
no_shadow(corner); corner.fill.solid(); corner.fill.fore_color.rgb = BRASS
corner.line.fill.background()
text(s, Inches(11.55), Inches(2.35), Inches(0.8), Inches(0.55), "PDF", 13, INK,
     bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
ly = 3.25
for w_in in [2.2, 2.4, 1.8, 2.4, 2.1, 1.6]:
    ln = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(9.7), Inches(ly),
                            Inches(w_in), Inches(0.12))
    no_shadow(ln); ln.fill.solid(); ln.fill.fore_color.rgb = GREY_LN
    ln.line.fill.background()
    ly += 0.42

out = os.path.join(HERE, "board.pptx")
prs.save(out)
print("wrote", out, "with", len(prs.slides._sldIdLst), "slides")
