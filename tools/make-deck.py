#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tools/make-deck.py — يولّد عرض ZATHURA التقديمي (عربي، RTL، ١٦:٩)

    pip install python-pptx
    python3 tools/make-deck.py            # → docs/ZATHURA-pitch-ar.pptx

كل اللقطات مأخوذة من assets/ (نسخ حقيقية من اللعبتين).
"""

import os
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import qn
from pptx.oxml.xmlchemy import OxmlElement  # noqa: F401  (متاح في python-pptx)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'assets')
OUT = os.path.join(ROOT, 'docs', 'ZATHURA-pitch-ar.pptx')

# ── الهوية البصرية ─────────────────────────────────────────────────────────
BG      = RGBColor(0x04, 0x06, 0x0B)
PANEL   = RGBColor(0x0D, 0x14, 0x20)
PANEL_2 = RGBColor(0x11, 0x1A, 0x29)
CYAN    = RGBColor(0x4D, 0xD9, 0xFF)
AMBER   = RGBColor(0xFF, 0xB4, 0x54)
WHITE   = RGBColor(0xE9, 0xF1, 0xFB)
DIM     = RGBColor(0xA3, 0xB6, 0xCD)
DIM2    = RGBColor(0x6F, 0x83, 0x99)
GREEN   = RGBColor(0x4A, 0xDE, 0x80)

FONT = 'Tahoma'          # متاح على ويندوز وماك، ويدعم العربية جيدًا
MONO = 'Consolas'

W, H = 13.333, 7.5        # بوصة


# ── أدوات مساعدة ───────────────────────────────────────────────────────────
def font(run, size, color=DIM, bold=False, face=FONT, italic=False):
    """يضبط الخط مع دعم النص العربي (complex script) بشكل صريح."""
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = color
    run.font.name = face
    rPr = run._r.get_or_add_rPr()
    cs = rPr.find(qn('a:cs'))
    if cs is None:
        cs = OxmlElement('a:cs')
        latin = rPr.find(qn('a:latin'))
        if latin is not None:
            latin.addnext(cs)
        else:
            rPr.append(cs)
    cs.set('typeface', face)
    return run


def para(tf, first=False, rtl=True, align=PP_ALIGN.RIGHT, space_before=0,
         space_after=6, line=1.25, level=0):
    p = tf.paragraphs[0] if first else tf.add_paragraph()
    p.alignment = align
    p.level = level
    p.space_before = Pt(space_before)
    p.space_after = Pt(space_after)
    p.line_spacing = line
    if rtl:
        p._p.get_or_add_pPr().set('rtl', '1')
    return p


def textbox(slide, x, y, w, h, anchor=MSO_ANCHOR.TOP):
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    return tf


def rect(slide, x, y, w, h, fill=PANEL, line=None, line_w=1.0, radius=0.05, shape=MSO_SHAPE.ROUNDED_RECTANGLE):
    s = slide.shapes.add_shape(shape, Inches(x), Inches(y), Inches(w), Inches(h))
    if shape == MSO_SHAPE.ROUNDED_RECTANGLE:
        try:
            s.adjustments[0] = radius
        except Exception:
            pass
    if fill is None:
        s.fill.background()
    else:
        s.fill.solid()
        s.fill.fore_color.rgb = fill
    if line is None:
        s.line.fill.background()
    else:
        s.line.color.rgb = line
        s.line.width = Pt(line_w)
    s.shadow.inherit = False
    s.text_frame.word_wrap = True
    return s


def bullets(tf, items, size=15.5, color=DIM, marker='◂', marker_color=CYAN,
            space_after=10, line=1.3):
    """قائمة نقطية RTL: علامة ملوّنة + نص."""
    for i, item in enumerate(items):
        p = para(tf, first=(i == 0), space_after=space_after, line=line)
        r1 = p.add_run(); r1.text = marker + '  '
        font(r1, size - 1, marker_color, bold=True)
        r2 = p.add_run(); r2.text = item
        font(r2, size, color)


def eyebrows(slide, text, x=None, y=0.5, w=None):
    x = x if x is not None else 0.8
    w = w if w is not None else W - 1.6
    tf = textbox(slide, x, y, w, 0.3)
    p = para(tf, first=True, space_after=0)
    r = p.add_run(); r.text = text
    font(r, 10.5, CYAN, bold=True, face=MONO)
    # فاصل قصير تحت العنوان الصغير
    line = rect(slide, W - x - 0.5, y + 0.33, 0.5, 0.02, fill=CYAN, shape=MSO_SHAPE.RECTANGLE)
    line.line.fill.background()


def title(slide, text, y=0.85, size=33, color=WHITE, w=None, x=0.8, align=PP_ALIGN.RIGHT):
    tf = textbox(slide, x, y, w if w else W - 1.6, 0.9)
    p = para(tf, first=True, space_after=0, align=align, line=1.15)
    r = p.add_run(); r.text = text
    font(r, size, color, bold=True)


def lead(slide, text, y=1.72, size=14.5, color=DIM, w=None, x=0.8):
    tf = textbox(slide, x, y, w if w else W - 1.6, 0.85)
    p = para(tf, first=True, space_after=0, line=1.45)
    r = p.add_run(); r.text = text
    font(r, size, color)


def picture(slide, name, x, y, w, h, frame=True):
    """صورة داخل إطار رقيق، بمقاس يحافظ على النسبة (5:3)."""
    path = os.path.join(ASSETS, name)
    if frame:
        rect(slide, x - 0.07, y - 0.07, w + 0.14, h + 0.14,
             fill=RGBColor(0x06, 0x0A, 0x12), line=RGBColor(0x1E, 0x6A, 0x86), line_w=1.0, radius=0.03)
    pic = slide.shapes.add_picture(path, Inches(x), Inches(y), Inches(w), Inches(h))
    return pic


def chip(slide, x, y, w, h, big, small, color=CYAN):
    box = rect(slide, x, y, w, h, fill=PANEL_2, line=RGBColor(0x1B, 0x3A, 0x50), radius=0.12)
    tf = box.text_frame
    tf.margin_top = Pt(6); tf.margin_bottom = Pt(6)
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = para(tf, first=True, align=PP_ALIGN.CENTER, space_after=0, line=1.0)
    r = p.add_run(); r.text = big
    font(r, 19, color, bold=True)
    p2 = para(tf, align=PP_ALIGN.CENTER, space_after=0, line=1.1)
    r2 = p2.add_run(); r2.text = small
    font(r2, 9.5, DIM2)
    return box


def footer(slide, num, label='ZATHURA · NASA Space Apps 2026'):
    tf = textbox(slide, 0.8, H - 0.55, 6.0, 0.3)
    p = para(tf, first=True, align=PP_ALIGN.LEFT, space_after=0)
    r = p.add_run(); r.text = label
    font(r, 8.5, DIM2, face=MONO)

    tf2 = textbox(slide, W - 1.4, H - 0.55, 0.6, 0.3)
    p2 = para(tf2, first=True, align=PP_ALIGN.LEFT, space_after=0)
    r2 = p2.add_run(); r2.text = f'{num:02d}'
    font(r2, 9, DIM2, face=MONO)


def notes(slide, text):
    slide.notes_slide.notes_text_frame.text = text


def blank(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    bg = s.background.fill
    bg.solid()
    bg.fore_color.rgb = BG
    # شريط علوي رقيق
    top = rect(s, 0, 0, W, 0.035, fill=RGBColor(0x14, 0x2A, 0x3A), shape=MSO_SHAPE.RECTANGLE)
    top.line.fill.background()
    return s


# ══════════════════════════════════════════════════════════════════════════
prs = Presentation()
prs.slide_width = Inches(W)
prs.slide_height = Inches(H)

# ── ١ · الغلاف ────────────────────────────────────────────────────────────
s = blank(prs)
picture(s, 'shot-launcher.jpg', 0.75, 1.55, 5.35, 3.21)
rect(s, 0.75, 4.95, 5.35, 0.02, fill=RGBColor(0x1E, 0x6A, 0x86), shape=MSO_SHAPE.RECTANGLE).line.fill.background()

tf = textbox(s, 6.35, 1.35, 6.2, 0.35)
p = para(tf, first=True, space_after=0)
r = p.add_run(); r.text = 'NASA SPACE APPS CHALLENGE · 2026'
font(r, 10.5, CYAN, bold=True, face=MONO)

tf = textbox(s, 6.35, 1.75, 6.2, 1.5)
p = para(tf, first=True, space_after=0, line=0.95)
r = p.add_run(); r.text = 'ZATHURA'
font(r, 72, WHITE, bold=True)

tf = textbox(s, 6.35, 3.05, 6.2, 0.5)
p = para(tf, first=True, space_after=0)
r = p.add_run(); r.text = 'مدرّب مهمّات رائد الفضاء'
font(r, 25, CYAN, bold=True)

tf = textbox(s, 6.35, 3.72, 6.2, 1.3)
p = para(tf, first=True, space_after=0, line=1.5)
r = p.add_run(); r.text = 'لعبة فضائية تعليمية عربية للأعمار ٧–١٢'
font(r, 15, WHITE)
p = para(tf, space_after=0, line=1.5)
r = p.add_run(); r.text = 'وضعان في بوابة واحدة · تعمل أوفلاين · بدون تثبيت'
font(r, 15, DIM)

tf = textbox(s, 6.35, 5.25, 6.2, 0.9)
p = para(tf, first=True, space_after=2, line=1.3)
r = p.add_run(); r.text = 'Junior Astronaut Mission Trainer · The Next Frontier'
font(r, 11, DIM2, face=MONO)
p = para(tf, space_after=0, line=1.3)
r = p.add_run(); r.text = 'القائد مُؤمن — رائد فضاء مصري 🇪🇬'
font(r, 12, AMBER, bold=True)

footer(s, 1)
notes(s, 'افتتاحية في ٢٠ ثانية: «إحنا بنعلّم الطفل إن استكشاف الفضاء مش لعبة قوة — '
         'ده سلسلة قرارات، ولكل قرار ثمن». اللعبة عربية بالكامل، وتعمل أوفلاين على أي متصفح.')

# ── ٢ · الغرض ─────────────────────────────────────────────────────────────
s = blank(prs)
eyebrows(s, 'THE PURPOSE')
title(s, 'ليه اللعبة دي؟')
lead(s, 'فجوة حقيقية: محتوى عربي قليل جدًا في هذا العمر يجمع علم NASA الحقيقي باللعب.', y=1.62)

bullets(textbox(s, 0.8, 2.45, 7.4, 3.4), [
    'طفل عربي ٧–١٢ نادرًا ما يلاقي لعبة فضاء بلغته وبعلم صحيح',
    'ألعاب الفضاء الحالية بتعلّم «قوة مطلقة»؛ الاستكشاف الحقيقي سلسلة مقايضات',
    'هدفنا: الطفل يخرج فاهم إن الوقت والإشعاع موردان لا يُعوَّضان',
    'اللعبة تشرح «ليه» بعد كل حدث — مش بس «إيه اللي حصل»',
], size=16, space_after=16)

chip(s, 8.75, 2.5, 1.75, 1.15, '٧–١٢', 'سنة')
chip(s, 10.65, 2.5, 1.75, 1.15, '١٠٠٪', 'عربي وRTL', color=GREEN)
chip(s, 8.75, 3.85, 1.75, 1.15, '٠', 'تثبيت مطلوب', color=AMBER)
chip(s, 10.65, 3.85, 1.75, 1.15, '٢٢', 'مصدر NASA', color=CYAN)

footer(s, 2)
notes(s, 'دي المشكلة اللي العرض كله بيجاوب عليها. لو المحكّم سأل «إيه الجديد؟» — '
         'الإجابة: مش لعبة فضاء تانية، دي لعبة بتعلّم إن القرار له ثمن.')

# ── ٣ · الفكرة ────────────────────────────────────────────────────────────
s = blank(prs)
eyebrows(s, 'THE IDEA IN ONE LINE')
quote = rect(s, 5.6, 1.05, 6.95, 1.5, fill=PANEL, line=RGBColor(0x1E, 0x6A, 0x86), radius=0.06)
tf = quote.text_frame
tf.margin_left = Pt(22); tf.margin_right = Pt(22)
tf.vertical_anchor = MSO_ANCHOR.MIDDLE
p = para(tf, first=True, space_after=0, line=1.4)
r = p.add_run(); r.text = '«كل ألعاب الفضاء بتديك أوكسجين زيادة لما تفشل. ZATHURA لأ.»'
font(r, 19, WHITE, bold=True)

bullets(textbox(s, 5.6, 2.85, 6.95, 2.9), [
    'الـSol = ٢٤ ساعة طاقم، وهي العملة الوحيدة في اللعبة',
    'حفر عينة ٨ ساعات · تحليل ٤ · تنظيف ألواح ٤ · إصلاح ٢',
    'كل قرار له ثمن مكتوب، واللعبة تشرح «ليه» بعد كل حدث',
    'مفيش زر «نفّذ اليوم» — الزمن ماشي والموارد بتنزل لوحدها',
], size=15.5, space_after=13)

picture(s, 'shot-storm.jpg', 0.75, 1.55, 4.45, 2.67)

footer(s, 3)
notes(s, 'الجملة دي هي هوية المشروع. لو حفظت حاجة واحدة من العرض، خليها دي. '
         'بعدها افتح اللعبة دقيقة واحدة على شاشة الحكم لو الوقت يسمح.')

# ── ٤ · وضعان ─────────────────────────────────────────────────────────────
s = blank(prs)
eyebrows(s, 'TWO MODES · ONE LAUNCHER')
title(s, 'وضعان… بوابة واحدة')

# الوضع ١ (يمين في RTL)
picture(s, 'shot-hq.jpg', 6.95, 1.45, 5.6, 2.1)
tf = textbox(s, 6.95, 3.68, 5.6, 1.0)
p = para(tf, first=True, space_after=2)
r = p.add_run(); r.text = 'MODE 01 · OUTPOST'
font(r, 10.5, CYAN, bold=True, face=MONO)
p = para(tf, space_after=0, line=1.2)
r = p.add_run(); r.text = 'محاكي القاعدة الاستراتيجي'
font(r, 17, WHITE, bold=True)
p = para(tf, space_after=0, line=1.3)
r = p.add_run(); r.text = 'Canvas 2D · WASD + E مطوّل · إدارة موارد وEVA'
font(r, 11.5, DIM)

# الوضع ٢ (يسار)
picture(s, 'shot-odyssey-ingame.jpg', 0.8, 1.45, 5.6, 2.1)
tf = textbox(s, 0.8, 3.68, 5.6, 1.0)
p = para(tf, first=True, space_after=2)
r = p.add_run(); r.text = 'MODE 02 · ODYSSEY — SURVIVE'
font(r, 10.5, AMBER, bold=True, face=MONO)
p = para(tf, space_after=0, line=1.2)
r = p.add_run(); r.text = 'مهمة بقاء بالمنظور الأول 3D'
font(r, 17, WHITE, bold=True)
p = para(tf, space_after=0, line=1.3)
r = p.add_run(); r.text = 'React 19 + Three.js · ماوس + لمس · ٨ كوارث'
font(r, 11.5, DIM)

band = rect(s, 0.8, 5.15, 11.75, 0.75, fill=PANEL_2, line=RGBColor(0x1B, 0x3A, 0x50), radius=0.1)
tf = band.text_frame
tf.vertical_anchor = MSO_ANCHOR.MIDDLE
p = para(tf, first=True, align=PP_ALIGN.CENTER, space_after=0)
r = p.add_run(); r.text = 'نفس البطل — القائد مُؤمن، رائد فضاء مصري 🇪🇬 — ونفس الست وجهات، بقيود صادقة'
font(r, 13.5, WHITE)

footer(s, 4)
notes(s, 'الوضعان مش لعبتين منفصلتين في الفكرة: نفس البطل، نفس الوجهات، نفس الأرقام — '
         'واحد تلعب بعقلك (إدارة)، والتاني بإيدك (منظور أول).')

# ── ٥ · المحرّك ───────────────────────────────────────────────────────────
s = blank(prs)
eyebrows(s, 'HOW IT WORKS · THE ENGINE')
title(s, 'إزاي بتشتغل؟')

bullets(textbox(s, 0.8, 1.75, 11.7, 3.1), [
    'الزمن ماشي لوحده: مفيش زر «نفّذ اليوم»، والموارد بتتناقص كل ثانية وأنت بتلعب',
    'خمسة أنظمة على ميزانية طاقة واحدة: حياة · دفيئة · معمل · دروع · تدفئة',
    'بالليل الألواح صفر وRTG ١٤ kW يغطي الحد الأدنى؛ أي عجز ⇒ أكسجين ×1.5 وماء ×1.4',
    'جرعة تراكمية بسقف ٦٠٠ mSv لا تُرجَع — الوصول للسقف = إلغاء المهمة',
    '٣٦ سيناريو موزونة على قراراتك السابقة + حفظ تلقائي واستئناف للمهمة',
], size=15.5, space_after=14)

chip(s, 9.0, 5.05, 1.05, 1.25, '٢٤', 'ساعة/Sol')
chip(s, 7.75, 5.05, 1.05, 1.25, '٥', 'أنظمة', color=AMBER)
chip(s, 6.5, 5.05, 1.05, 1.25, '٦٠٠', 'mSv سقف')
chip(s, 5.25, 5.05, 1.05, 1.25, '٣٦', 'سيناريو', color=GREEN)
chip(s, 4.0, 5.05, 1.05, 1.25, '٦', 'وجهات')

footer(s, 5)
notes(s, 'لو الحكم سأل «إيه اللي بيخليها صعبة؟» — الوقت. مفيش وقت لكل حاجة، '
         'وده اللي بيحوّل اللعب لقرارات حقيقية.')

# ── ٦ · ISRU ──────────────────────────────────────────────────────────────
s = blank(prs)
eyebrows(s, 'IN-SITU RESOURCE UTILISATION')
title(s, 'تُعيش من اللي تلاقيه هناك')
lead(s, 'الهدف مش «جمع نقاط» — الهدف إننا نتوقف عن الاعتماد على الأرض.', y=1.62)

rows = [
    ('❄ ٢ ثلج', 'تحليل كهربائي', '+٤ ماء · +٦ أوكسجين'),
    ('🧱 ٢ ريجوليث', 'صهر', '+١٠٪ درع محلي (حتى −٤٠٪ جرعة)'),
    ('💨 CO₂ + طاقة', 'MOXIE', '+٨ أوكسجين'),
]
y = 2.5
for a, b, c in rows:
    box1 = rect(s, 9.55, y, 3.0, 0.66, fill=PANEL_2, line=RGBColor(0x1B, 0x3A, 0x50), radius=0.14)
    tf = box1.text_frame; tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = para(tf, first=True, align=PP_ALIGN.CENTER, space_after=0)
    r = p.add_run(); r.text = a; font(r, 12.5, CYAN, bold=True)

    tf = textbox(s, 8.05, y + 0.17, 1.45, 0.35)
    p = para(tf, first=True, align=PP_ALIGN.CENTER, space_after=0)
    r = p.add_run(); r.text = b; font(r, 11, DIM, bold=True)

    box3 = rect(s, 4.55, y, 3.4, 0.66, fill=RGBColor(0x0A, 0x1A, 0x14), line=RGBColor(0x26, 0x5A, 0x3E), radius=0.14)
    tf = box3.text_frame; tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = para(tf, first=True, align=PP_ALIGN.CENTER, space_after=0)
    r = p.add_run(); r.text = c; font(r, 12.5, RGBColor(0xBD, 0xF5, 0xD2), bold=True)
    y += 0.86

bullets(textbox(s, 0.8, 5.35, 3.5, 1.5), [
    '٦ مهام ISRU قبل فتح زر الإقلاع',
    'إمداد الأرض (DSN) يُحسب ضدك',
], size=12.5, space_after=8)

footer(s, 6)
notes(s, 'دي نقطة التقييم الأساسية عند ناسا (ISRU). اللاعب بيصنع فعليًا، '
         'والنتيجة بتعدّ الكيلوجرامات اللي لم تُشحن من الأرض.')

# ── ٧ · الوجهات ───────────────────────────────────────────────────────────
s = blank(prs)
eyebrows(s, 'SIX DESTINATIONS')
title(s, 'ست وجهات… بقيود صادقة')

dests = [
    ('القمر', 'ليل ١٤ يومًا بلا إنتاج شمسي', 'Apollo 11 / LM Eagle', RGBColor(0xB9, 0xC6, 0xD4)),
    ('المريخ', 'عواصف ترابية وتأخير اتصال', 'Mars 2020', RGBColor(0xD1, 0x60, 0x3D)),
    ('عطارد', 'فرق حراري ٦٠٠° وإشعاع شمسي', 'MESSENGER', RGBColor(0xA2, 0x91, 0x8A)),
    ('الزهرة', 'سطح مستحيل: منصّة عائمة ٥٠ كم', 'Magellan', RGBColor(0xE3, 0xB2, 0x5C)),
    ('زحل / تايتان', 'محطة مدارية وعزلة طويلة', 'Cassini–Huygens', RGBColor(0xD9, 0xC2, 0x7A)),
    ('كوكب زويل', 'جليد مالح وبرد −١٤٨° (خيالي)', 'تكريم أحمد زويل', RGBColor(0x7F, 0xD8, 0xEF)),
]
x0, y0 = 8.85, 1.55
for i, (name, desc, ref, col) in enumerate(dests):
    col_i, row_i = i % 2, i // 2
    x = x0 - col_i * 4.0
    y = y0 + row_i * 1.72
    card = rect(s, x, y, 3.75, 1.52, fill=PANEL, line=RGBColor(0x18, 0x2A, 0x3C), radius=0.08)
    dot = rect(s, x + 0.24, y + 0.2, 0.28, 0.28, fill=col, line=None, shape=MSO_SHAPE.OVAL)
    dot.line.fill.background()
    tf = card.text_frame
    tf.margin_left = Pt(14); tf.margin_right = Pt(14); tf.margin_top = Pt(10)
    p = para(tf, first=True, space_after=2)
    r = p.add_run(); r.text = name; font(r, 14, WHITE, bold=True)
    p = para(tf, space_after=2, line=1.15)
    r = p.add_run(); r.text = desc; font(r, 10, DIM)
    p = para(tf, space_after=0)
    r = p.add_run(); r.text = ref; font(r, 8.5, DIM2, face=MONO)

tf = textbox(s, 0.8, 3.0, 3.6, 2.4)
p = para(tf, first=True, space_after=10, line=1.4)
r = p.add_run(); r.text = 'المركبات خيالية، والمرجع والأرقام حقيقية.'
font(r, 13.5, WHITE, bold=True)
p = para(tf, space_after=0, line=1.5)
r = p.add_run(); r.text = ('كل وجهة بفيزيائها: ليل قمري طويل، سطح زهرة مستحيل، '
                           'وتأخير اتصال على المريخ يحوّل كل طارئ لقرار وحيد.')
font(r, 11.5, DIM)

footer(s, 7)
notes(s, '«كوكب زويل» وجهة خيالية ابتكرها الفريق تكريمًا لأحمد زويل — بنقولها صريحة، '
         'لأن الشفافية جزء من التقييم.')

# ── ٨ · العلم ─────────────────────────────────────────────────────────────
s = blank(prs)
eyebrows(s, 'VALIDITY · THE SCIENCE')
title(s, 'أرقام بمصادرها')

bullets(textbox(s, 6.75, 1.68, 5.8, 3.62), [
    'ECLSS: 0.84 kg أوكسجين للرائد يوميًا · BVAD 2022: 1.56 غذاء / 3.20 ماء',
    'استرجاع الماء ٩٠٪ ← ٩٨٪ مع Brine Processor',
    'أكاديمية: سقف الجرعة ٦٠٠ mSv (NASA STD-3001)',
    'RAD/MSL: جرعة سطح المريخ 0.64 وجرعة العبور 1.84 mSv يوميًا',
    'DONKI مايو ٢٠٢٤ — Kp 9.0 وSEP ×14: الجزيئات هي اللي بتضرب الروّاد، لا التوهجات',
    '٢٢ مصدرًا منسوبًا داخل اللعبة، وكل رقم مُصنَّف: «بيانات NASA» أو «تقدير لعبة»',
], size=13, space_after=11)

picture(s, 'shot-nasa-live.jpg', 0.75, 1.75, 5.5, 3.3)

note_box = rect(s, 0.8, 5.5, 11.75, 0.8, fill=RGBColor(0x1A, 0x14, 0x08), line=RGBColor(0x5A, 0x42, 0x18), radius=0.08)
tf = note_box.text_frame
tf.vertical_anchor = MSO_ANCHOR.MIDDLE
tf.margin_left = Pt(16); tf.margin_right = Pt(16)
p = para(tf, first=True, space_after=0, line=1.25)
r = p.add_run(); r.text = 'أمانة علمية: '
font(r, 11.5, AMBER, bold=True)
r = p.add_run(); r.text = ('الأرقام محاكاة تعليمية مبنية على قيم منشورة وليست قياسات حيّة؛ '
                           'ومصادر DONKI بجودة prototyping وليست تنبؤات رسمية (المرجع NOAA SWPC).')
font(r, 11.5, RGBColor(0xE2, 0xCF, 0xB5))

footer(s, 8)
notes(s, 'أقوى نقطة تقييم: الدقة. اللعبة نفسها بتقول للحكم أي رقم من NASA وأي رقم تقدير '
         'من اللعبة — وده بيمنع أي ادعاء زائد. (راجع SOURCES-AUDIT.md في المستودع.)')

# ── ٩ · إزاي نستخدمها ─────────────────────────────────────────────────────
s = blank(prs)
eyebrows(s, 'HOW TO USE IT')
title(s, 'إزاي نستخدمها؟')

steps = [
    ('١', 'افتح البوابة', 'play/index.html أو رابط GitHub Pages — بدون تثبيت أو خادم'),
    ('٢', 'اختار الوضع', 'قاعدة استراتيجية (Outpost) أو منظور أول (Odyssey)'),
    ('٣', 'في القاعدة', 'WASD تمشي · E مطوّل للشغل · وزّع الطاقة كل صباح'),
    ('٤', 'في أوديسي', 'ماوس للبص · E مطوّل للإصلاح · عصا لمس على الموبايل'),
    ('٥', 'بعد المهمة', 'لكل وجهة نجومها، وفي الآخر زر «شارك نتيجتك»'),
]
y = 1.75
for num, head, desc in steps:
    badge = rect(s, 11.45, y, 0.62, 0.62, fill=RGBColor(0x0A, 0x1A, 0x24), line=RGBColor(0x1E, 0x6A, 0x86), radius=0.25)
    tf = badge.text_frame; tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = para(tf, first=True, align=PP_ALIGN.CENTER, space_after=0)
    r = p.add_run(); r.text = num; font(r, 16, CYAN, bold=True)

    tf = textbox(s, 3.4, y - 0.03, 7.85, 0.75)
    p = para(tf, first=True, space_after=1)
    r = p.add_run(); r.text = head; font(r, 14.5, WHITE, bold=True)
    p = para(tf, space_after=0, line=1.2)
    r = p.add_run(); r.text = desc; font(r, 11.5, DIM)
    y += 0.86

tbox = rect(s, 0.8, 6.15, 11.3, 0.62, fill=PANEL_2, line=RGBColor(0x1B, 0x3A, 0x50), radius=0.1)
tf = tbox.text_frame; tf.vertical_anchor = MSO_ANCHOR.MIDDLE
tf.margin_left = Pt(16); tf.margin_right = Pt(16)
p = para(tf, first=True, space_after=0, line=1.2)
r = p.add_run(); r.text = 'للفصل الدراسي: '
font(r, 11.5, GREEN, bold=True)
r = p.add_run(); r.text = '٥–١٠ دقايق تمهيد + مهمة واحدة في الحصة — مفيش حسابات، مفيش إنترنت، مفيش تثبيت.'
font(r, 11.5, DIM)

footer(s, 9)
notes(s, 'اعرض خطوة واحدة عمليًا: افتح البوابة، اختار الوضع، وامشِ بالـWASD — '
         '٤٠ ثانية كفاية يبان إنها شغالة فعلاً.')

# ── ١٠ · الخاتمة ──────────────────────────────────────────────────────────
s = blank(prs)
eyebrows(s, 'IMPACT · GOALS')
title(s, 'الوقت والإشعاع ما بترجعوش.', y=1.0, size=34)
lead(s, 'ده الدرس الوحيد اللي عايزين الطفل يخرجه من اللعبة.', y=1.75)

pillars = [
    ('تعلّم بالمقايضة', 'موارد · طاقة · إشعاع · ISRU',
     'الطفل يخطّط ويختار ويتحمّل نتيجة اختياره'),
    ('عربي أولًا وأوفلاين', 'RTL · ملف واحد · بدون شبكة',
     'يشتغل على أجهزة المدرسة الضعيفة وفي فصول بلا إنترنت'),
    ('شفافية علمية', '٢٢ مصدرًا منسوبًا داخل اللعبة',
     'كل رقم مُصنَّف: بيانات NASA أو تقدير لعبة'),
]
x = 9.2
for head, sub, desc in pillars:
    card = rect(s, x, 2.6, 3.7, 2.15, fill=PANEL, line=RGBColor(0x18, 0x2A, 0x3C), radius=0.07)
    tf = card.text_frame
    tf.margin_left = Pt(16); tf.margin_right = Pt(16); tf.margin_top = Pt(16)
    p = para(tf, first=True, space_after=4)
    r = p.add_run(); r.text = head; font(r, 15, CYAN, bold=True)
    p = para(tf, space_after=8, line=1.2)
    r = p.add_run(); r.text = sub; font(r, 10, DIM2, face=MONO)
    p = para(tf, space_after=0, line=1.4)
    r = p.add_run(); r.text = desc; font(r, 11.5, DIM)
    x -= 3.95

tf = textbox(s, 0.8, 5.05, 11.7, 0.6)
p = para(tf, first=True, space_after=0, line=1.3)
r = p.add_run(); r.text = 'github.com/Eng-OmarAli-146/Zathura_NASA_space_app_ZC'
font(r, 12, CYAN, face=MONO)

tf = textbox(s, 0.8, 5.55, 11.7, 1.0)
p = para(tf, first=True, space_after=0, line=1.4)
r = p.add_run(); r.text = ('مشروع تعليمي مستقل غير رسمي — غير تابع لـNASA ولا يمثلها. '
                           'المركبات والوجهات خيالية مستوحاة من مهام NASA التاريخية، '
                           'وبيانات NASA منسوبة داخل اللعبة وفي لوحة المصادر.')
font(r, 9.5, DIM2)

footer(s, 10)
notes(s, 'اقفل على الجملة الكبيرة، وبعدها سؤال للجنة: «عايزين الطفل يفتكر إيه بعد ساعة لعب؟» '
         'الإجابة: إن كل قرار في الفضاء له ثمن — وإن الوقت أغلى مورد.')

# ── حفظ ──────────────────────────────────────────────────────────────────
os.makedirs(os.path.dirname(OUT), exist_ok=True)
prs.save(OUT)
size_kb = os.path.getsize(OUT) / 1024
print(f'✓ {os.path.relpath(OUT, ROOT)} — {len(prs.slides.__iter__.__self__._sldIdLst)} slides, {size_kb:.0f} KB')
