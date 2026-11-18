# -*- coding: utf-8 -*-
"""다크모드용 일러스트 가공 (v3).

원본은 흰 종이 위 남색 잉크(리소그래프) 그림.
다크모드에서는 '흰 사각 스티커'처럼 떠 보이므로 두 가지로 만든다.

1) *-night.webp  — 흰 종이를 양피지(#F2E9D5)로 옮긴 판. 큰 히어로 카드용.
2) *-cut.webp    — 종이를 투명으로 뽑아낸 판(잉크만 남김). 양피지 카드·메달 위에 얹어
                   카드의 그라데이션이 그대로 비치게 한다.
"""
import os
from PIL import Image

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.join(BASE, '..', 'attachments', '2026-11-18')
OUT = os.path.join(BASE, 'public', 'images')

PARCHMENT = (242, 233, 213)   # #F2E9D5
WHITE_L = 250.0               # 이보다 밝으면 종이(투명)
INK_L = 62.0                  # 이보다 어두우면 잉크 100%

JOBS = [
    ('81044E20-3E95-451C-8C55-1ED58B1CFD98-28cc3b328e0a46ca9c2e71740e4f451e.jpg', 'attic-hero', 1100),
    ('984C10D5-1E38-4593-80CB-69663E4C96A4-fb6429c295fa40a8af6fb9119eb61ae5.jpg', 'mascot-mouse', 760),
]


def lum(r, g, b):
    return 0.299 * r + 0.587 * g + 0.114 * b


def to_parchment(im):
    im = im.convert('RGB')
    w, h = im.size
    src = im.load()
    out = Image.new('RGB', (w, h))
    dst = out.load()
    lo, hi = 228.0, 254.0
    for y in range(h):
        for x in range(w):
            r, g, b = src[x, y]
            l = lum(r, g, b)
            if l >= hi:
                dst[x, y] = PARCHMENT
            elif l <= lo:
                dst[x, y] = (r, g, b)
            else:
                t = (l - lo) / (hi - lo)
                dst[x, y] = (
                    int(r * (1 - t) + PARCHMENT[0] * t),
                    int(g * (1 - t) + PARCHMENT[1] * t),
                    int(b * (1 - t) + PARCHMENT[2] * t),
                )
    return out


def ink_color(im):
    """가장 어두운 픽셀들의 평균 = 잉크 색."""
    px = im.convert('RGB').resize((im.width // 4 or 1, im.height // 4 or 1)).load()
    w, h = im.width // 4 or 1, im.height // 4 or 1
    dark = []
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if lum(r, g, b) < 90:
                dark.append((r, g, b))
    if not dark:
        return (10, 30, 99)
    n = len(dark)
    return tuple(int(sum(c[i] for c in dark) / n) for i in range(3))


def to_cut(im):
    """종이를 투명으로. 잉크는 단색으로 통일해 가장자리 번짐을 없앤다."""
    src_im = im.convert('RGB')
    ink = ink_color(src_im)
    print('  ink', ink)
    w, h = src_im.size
    src = src_im.load()
    out = Image.new('RGBA', (w, h))
    dst = out.load()
    span = WHITE_L - INK_L
    for y in range(h):
        for x in range(w):
            r, g, b = src[x, y]
            a = (WHITE_L - lum(r, g, b)) / span
            if a <= 0:
                dst[x, y] = (ink[0], ink[1], ink[2], 0)
            elif a >= 1:
                dst[x, y] = (ink[0], ink[1], ink[2], 255)
            else:
                dst[x, y] = (ink[0], ink[1], ink[2], int(a * 255))
    return out


def save(im, name, width):
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    dest = os.path.join(OUT, name)
    if im.mode == 'RGBA':
        im.save(dest, 'WEBP', quality=92, method=6, lossless=False)
    else:
        im.save(dest, 'WEBP', quality=92, method=6)
    print('saved', dest, im.size, os.path.getsize(dest) // 1024, 'KB')


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, stem, width in JOBS:
        im = Image.open(os.path.join(SRC, name))
        print(stem)
        save(to_parchment(im), f'{stem}-night.webp', width)
        save(to_cut(im), f'{stem}-cut.webp', width)

    # 작은 얼굴 — 판화 질감을 살려야 하므로 이미 가공된 판에서 뽑는다
    face = Image.open(os.path.join(OUT, 'mouse-face.webp'))
    print('mouse-face')
    save(to_parchment(face), 'mouse-face-night.webp', 480)
    save(to_cut(face), 'mouse-face-cut.webp', 480)


if __name__ == '__main__':
    main()
