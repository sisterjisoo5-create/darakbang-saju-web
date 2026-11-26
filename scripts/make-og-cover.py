# -*- coding: utf-8 -*-
"""OG / X 카드 대표 썸네일 (1200×630 JPEG).

링크 공유(X·카카오톡 등)에서 뜨는 카드 한 장.
다락방 다크모드(--night-1 #0B1020 · 골드 #E6C378 · 달빛 크림 #F5EFE2)로 짜고,
오른쪽에 양피지 카드에 얹은 자니 일러스트(attic-hero-night)를 세운다.

메타데이터는 0건으로 저장한다(EXIF·ICC·C2PA 없음).
글꼴은 public/fonts 의 브랜드 서체(DarakbangSerif: 제목 / PretendardSubset: 본문).

    python3 scripts/make-og-cover.py
"""
import math
import os

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
IMG = os.path.join(BASE, 'public', 'images')
FONT_DIR = os.path.join(BASE, 'public', 'fonts')
OUT = os.path.join(IMG, 'og-cover.jpg')

W, H = 1200, 630

NIGHT_TOP = (18, 25, 46)      # #12192E
NIGHT_MID = (11, 16, 32)      # #0B1020
NIGHT_BOT = (7, 11, 22)       # #070B16
CREAM = (245, 239, 226)       # #F5EFE2
CREAM_SOFT = (222, 216, 200)  # #DED8C8
GOLD = (230, 195, 120)        # #E6C378
GOLD_BRIGHT = (246, 221, 171)  # #F6DDAB
GOLD_DIM = (201, 169, 97)     # #C9A961
PARCHMENT = (242, 233, 213)   # #F2E9D5
INK_DARK = (32, 24, 10)       # #20180A


# ─────────────────────────── 글꼴 ───────────────────────────
def font(name, size):
    """public/fonts 의 woff2 를 ttf 로 풀어 Pillow 에 물린다(브랜드 서체 그대로)."""
    from fontTools.ttLib import TTFont

    cache = os.path.join('/tmp', 'og-fonts')
    os.makedirs(cache, exist_ok=True)
    ttf = os.path.join(cache, name + '.ttf')
    if not os.path.exists(ttf):
        f = TTFont(os.path.join(FONT_DIR, name + '.woff2'))
        f.flavor = None
        f.save(ttf)
    return ImageFont.truetype(ttf, size)


def tw(draw, text, f, tracking=0.0):
    """자간(tracking, px)을 넣은 글자 폭."""
    if not tracking:
        return draw.textlength(text, font=f)
    return sum(draw.textlength(ch, font=f) for ch in text) + tracking * (len(text) - 1)


def draw_tracked(draw, xy, text, f, fill, tracking=0.0, anchor_v='la'):
    """자간을 넣어 한 줄 그리기. xy 는 (x, y) 기준점."""
    x, y = xy
    if not tracking:
        draw.text((x, y), text, font=f, fill=fill, anchor=anchor_v)
        return x + draw.textlength(text, font=f)
    for ch in text:
        draw.text((x, y), ch, font=f, fill=fill, anchor=anchor_v)
        x += draw.textlength(ch, font=f) + tracking
    return x - tracking


# ─────────────────────────── 배경 ───────────────────────────
def vertical_gradient():
    im = Image.new('RGB', (W, H))
    px = im.load()
    for y in range(H):
        t = y / (H - 1)
        if t < 0.55:
            k = t / 0.55
            c = tuple(round(NIGHT_TOP[i] * (1 - k) + NIGHT_MID[i] * k) for i in range(3))
        else:
            k = (t - 0.55) / 0.45
            c = tuple(round(NIGHT_MID[i] * (1 - k) + NIGHT_BOT[i] * k) for i in range(3))
        for x in range(W):
            px[x, y] = c
    return im


def glow(im, center, radius, color, strength):
    """부드러운 달빛 번짐. screen 블렌드로 얹는다."""
    layer = Image.new('RGB', (W, H), (0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy = center
    steps = 26
    for i in range(steps, 0, -1):
        r = radius * i / steps
        a = (1 - i / steps) ** 2 * strength
        c = tuple(round(v * a) for v in color)
        d.ellipse((cx - r, cy - r * 0.92, cx + r, cy + r * 0.92), fill=c)
    layer = layer.filter(ImageFilter.GaussianBlur(radius * 0.06))
    return ImageChops.screen(im, layer)


def four_point_star(draw, cx, cy, r, fill, waist=0.30):
    """다락방 시그니처 별(가운데가 오목한 네 갈래)."""
    w = r * waist
    pts = []
    for i in range(4):
        ang = math.pi / 2 * i
        # 갈래 끝
        pts.append((cx + math.sin(ang) * r, cy - math.cos(ang) * r))
        # 사이 오목
        a2 = ang + math.pi / 4
        pts.append((cx + math.sin(a2) * w, cy - math.cos(a2) * w))
    draw.polygon(pts, fill=fill)


def vignette(im):
    """네 귀퉁이를 살짝 눌러 가운데(제목·자니)로 눈이 모이게."""
    mask = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse((-W * 0.34, -H * 0.52, W * 1.34, H * 1.52), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(110))
    dark = Image.new('RGBA', (W, H), (4, 6, 13, 255))
    return Image.composite(im.convert('RGBA'), dark, mask)


def stars(im):
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    spots = [
        (96, 78, 9, 150), (300, 46, 6, 90), (452, 92, 5, 80), (612, 58, 7, 100),
        (700, 120, 5, 70), (648, 452, 8, 100), (566, 520, 5, 70), (250, 540, 7, 90),
        (128, 300, 6, 80), (188, 236, 4, 60), (74, 452, 5, 60), (404, 300, 4, 55),
        (1160, 92, 7, 90), (1104, 40, 5, 70), (1042, 588, 6, 80), (1166, 560, 4, 60),
        (860, 600, 4, 55), (330, 372, 3, 45), (520, 178, 3, 45), (760, 520, 3, 40),
    ]
    for cx, cy, r, a in spots:
        four_point_star(d, cx, cy, r, GOLD + (a,))
    # 잔별 먼지
    for cx, cy, a in [(150, 120, 70), (222, 320, 55), (366, 250, 50), (700, 190, 45),
                      (980, 120, 55), (1130, 470, 45), (600, 560, 50), (460, 470, 40)]:
        d.ellipse((cx - 1.6, cy - 1.6, cx + 1.6, cy + 1.6), fill=GOLD_BRIGHT + (a,))
    layer = layer.filter(ImageFilter.GaussianBlur(0.4))
    return Image.alpha_composite(im.convert('RGBA'), layer)


# ─────────────────────────── 양피지 카드 ───────────────────────────
def parchment_card(size):
    """자니 일러스트를 카드 비율로 잘라 둥근 양피지 카드로."""
    card_w, card_h = size
    art = Image.open(os.path.join(IMG, 'attic-hero-night.webp')).convert('RGB')
    scale = max(card_w / art.width, card_h / art.height)
    art = art.resize((round(art.width * scale), round(art.height * scale)), Image.LANCZOS)
    left = (art.width - card_w) // 2
    top = (art.height - card_h) // 2
    art = art.crop((left, top, left + card_w, top + card_h))

    radius = 26
    mask = Image.new('L', (card_w, card_h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, card_w - 1, card_h - 1), radius=radius, fill=255)
    card = Image.new('RGBA', (card_w, card_h), (0, 0, 0, 0))
    card.paste(art, (0, 0))
    card.putalpha(mask)
    return card, radius


def place_card(base, card, radius, box):
    x, y = box
    card_w, card_h = card.size

    # 달빛 그림자 + 골드 번짐
    halo = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(halo).rounded_rectangle(
        (x - 16, y - 10, x + card_w + 16, y + card_h + 26), radius=radius + 12,
        fill=GOLD + (66,))
    halo = halo.filter(ImageFilter.GaussianBlur(26))
    base = Image.alpha_composite(base, halo)

    base = Image.alpha_composite(base, _paste(card, (x, y)))

    # 골드 테두리
    d = ImageDraw.Draw(base)
    d.rounded_rectangle(
        (x, y, x + card_w - 1, y + card_h - 1), radius=radius,
        outline=GOLD + (215,), width=3)
    d.rounded_rectangle(
        (x + 7, y + 7, x + card_w - 8, y + card_h - 8), radius=radius - 6,
        outline=GOLD_DIM + (70,), width=1)
    return base


def _paste(card, xy):
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    layer.paste(card, xy, card)
    return layer


def main():
    base = vertical_gradient()
    base = glow(base, (936, 268), 430, (58, 74, 122), 0.62)   # 남색 달빛
    base = glow(base, (960, 300), 300, (84, 66, 34), 0.55)    # 카드 뒤 온기
    base = stars(base)
    base = vignette(base)

    # 안쪽 머리카락 같은 프레임
    frame = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(frame).rounded_rectangle(
        (24, 24, W - 25, H - 25), radius=20, outline=GOLD + (46,), width=1)
    base = Image.alpha_composite(base, frame)

    # 카드
    card_box = (700, 82)
    card, radius = parchment_card((438, 466))
    base = place_card(base, card, radius, card_box)

    d = ImageDraw.Draw(base)
    f_title = font('DarakbangSerif', 92)
    f_kicker = font('PretendardSubset', 24)
    f_body = font('PretendardSubset', 26)
    f_badge = font('PretendardSubset', 23)
    f_price = font('PretendardSubset', 24)

    x = 86
    # 키커
    draw_tracked(d, (x + 2, 120), '만세력 · 자미두수로 읽는 내 사주', f_kicker, GOLD + (235,), 2.0)
    d.line((x + 2, 160, x + 62, 160), fill=GOLD + (170,), width=2)

    # 제목
    d.text((x, 186), '사주보는', font=f_title, fill=CREAM)
    d.text((x, 292), '3층 다락방', font=f_title, fill=GOLD_BRIGHT)

    # 본문
    BODY = (233, 226, 212)
    d.text((x + 2, 424), '무료로 내 원국 8글자와 오행 온도를 보고,', font=f_body, fill=BODY)
    d.text((x + 2, 466), '마음에 들면 990원에 전체 풀이를 열어보세요.', font=f_body, fill=BODY)

    # 배지
    bx, by = x, 530
    label = '990원'
    price_w = tw(d, label, f_price)
    pill_w = price_w + 40
    d.rounded_rectangle((bx, by, bx + pill_w, by + 46), radius=23, fill=GOLD + (255,))
    d.text((bx + 20, by + 23), label, font=f_price, fill=INK_DARK + (255,), anchor='lm')
    d.text((bx + pill_w + 14, by + 23), '가입 없이 30초 · 무료 맛보기',
           font=f_badge, fill=(233, 226, 212, 240), anchor='lm')

    out = base.convert('RGB')
    out.save(OUT, 'JPEG', quality=90, optimize=True, progressive=True, subsampling=0)
    print('saved', OUT, out.size, os.path.getsize(OUT) // 1024, 'KB')


if __name__ == '__main__':
    main()
