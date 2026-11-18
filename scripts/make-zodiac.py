# -*- coding: utf-8 -*-
"""12간지 캐릭터 시트 → 개별 투명 캐릭터(*-cut.webp).

원본: attachments/2026-11-19/IMG_3760-a29b4aa723fb40c8ad3b2ce46b5872b1.jpg
  1024×1024, 4열 × 3행. 칸 위쪽에 손글씨 이름과 괄호(자니(쥐) …), 아래에 남색 잉크 캐릭터.

하는 일
1) 시트를 8-연결 연결요소로 나눈다. 칸마다 캐릭터(가장 큰 덩어리)의 꼭대기를 기준으로
   그 위에 있는 덩어리는 전부 손글씨 라벨로 보고 걷어낸다(라벨 반짝임 장식까지 함께).
   단, 그림의 일부인 두 장식(양의 '//' 획, 개 옆 별)은 KEEP 으로 남긴다.
2) 종이(흰색)를 투명으로: 알파 = 밝기 반전. 잉크는 시트에서 뽑은 남색 한 색으로 통일.
3) 320×320 정사각 캔버스에 비율 유지로 가운데 정렬해 저장.

결과: public/images/zodiac/{jani,ox,tiger,rabbit,dragon,snake,horse,sheep,monkey,rooster,dog,pig}-cut.webp
이름을 가진 캐릭터는 자니(쥐) 하나뿐이고, 나머지 칸은 동물 이름을 그대로 키로 쓴다.
"""
import os
from collections import deque

import numpy as np
from PIL import Image

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.join(BASE, '..', 'attachments', '2026-11-19',
                   'IMG_3760-a29b4aa723fb40c8ad3b2ce46b5872b1.jpg')
OUT = os.path.join(BASE, 'public', 'images', 'zodiac')

SOLID_L = 150.0   # 이보다 어두우면 잉크 덩어리로 본다(연결요소 판정)
INK_L = 31.0      # 잉크 남색(13,28,96)의 밝기 — 알파 100%
WHITE_L = 253.0   # 종이 밝기 — 알파 0
CANVAS = 320
FILL = 0.90       # 캔버스 대비 캐릭터가 차지하는 비율

# 칸 순서: 행 우선 (자니·소·호랑이·토끼 / 용·뱀·말·양 / 원숭이·닭·개·돼지)
LAYOUT = [
    ('jani', 0, 0), ('ox', 0, 1), ('tiger', 0, 2), ('rabbit', 0, 3),
    ('dragon', 1, 0), ('snake', 1, 1), ('horse', 1, 2), ('sheep', 1, 3),
    ('monkey', 2, 0), ('rooster', 2, 1), ('dog', 2, 2), ('pig', 2, 3),
]
COL_EDGES = (0, 289, 515, 780, 1024)      # 시트에서 잉크가 끊기는 열 경계
ROW_EDGES = (0, 344, 657, 1024)           # 시트에서 잉크가 끊기는 행 경계

# 그림의 일부라서 남기는 장식 (원본 픽셀 x1,y1,x2,y2)
KEEP = (
    (964, 416, 978, 437),   # 양 — 머리 옆 '//' 획
    (721, 740, 739, 760),   # 개 — 머리 위 별
)


def luminance(a):
    return 0.299 * a[:, :, 0] + 0.587 * a[:, :, 1] + 0.114 * a[:, :, 2]


def components(mask):
    """8-연결 연결요소 — [(면적, (x1,y1,x2,y2), (cx,cy))]"""
    h, w = mask.shape
    seen = np.zeros((h, w), dtype=bool)
    out = []
    for y0 in range(h):
        row = mask[y0]
        for x0 in range(w):
            if not row[x0] or seen[y0, x0]:
                continue
            q = deque([(y0, x0)])
            seen[y0, x0] = True
            n = 0
            x1 = x2 = x0
            y1 = y2 = y0
            sx = sy = 0
            while q:
                y, x = q.popleft()
                n += 1
                sx += x
                sy += y
                if x < x1: x1 = x
                if x > x2: x2 = x
                if y < y1: y1 = y
                if y > y2: y2 = y
                for ny in (y - 1, y, y + 1):
                    if ny < 0 or ny >= h:
                        continue
                    for nx in (x - 1, x, x + 1):
                        if 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True
                            q.append((ny, nx))
            out.append((n, (x1, y1, x2, y2), (sx / n, sy / n)))
    return out


def ink_color(a, lum):
    dark = a[lum < 85]
    if len(dark) == 0:
        return (13, 28, 96)
    return tuple(int(v) for v in np.median(dark, axis=0))


def main():
    os.makedirs(OUT, exist_ok=True)
    sheet = Image.open(SRC).convert('RGB')
    arr = np.asarray(sheet).astype(np.float32)
    lum = luminance(arr)
    alpha = np.clip((WHITE_L - lum) / (WHITE_L - INK_L), 0.0, 1.0)
    alpha[alpha < 0.03] = 0.0
    color = ink_color(arr, lum)
    print('ink color', color)

    comps = components(lum < SOLID_L)
    print('components', len(comps))

    def is_keep(box):
        x1, y1, x2, y2 = box
        for kx1, ky1, kx2, ky2 in KEEP:
            if abs(x1 - kx1) <= 2 and abs(y1 - ky1) <= 2 and abs(x2 - kx2) <= 2 and abs(y2 - ky2) <= 2:
                return True
        return False

    for stem, r, c in LAYOUT:
        cx0, cy0, cx1, cy1 = COL_EDGES[c], ROW_EDGES[r], COL_EDGES[c + 1], ROW_EDGES[r + 1]
        mine = [(n, b, ctr) for n, b, ctr in comps
                if cx0 <= ctr[0] < cx1 and cy0 <= ctr[1] < cy1]
        if not mine:
            print(stem, 'MISSING')
            continue
        big = [b for n, b, _ in mine if n >= 600]
        char_top = min(b[1] for b in big) if big else min(b[1] for _, b, _ in mine)

        # 캐릭터 꼭대기 위의 덩어리 = 손글씨 라벨 → 그 자리를 지운다(안티에일리어싱까지 3px)
        for n, (x1, y1, x2, y2), (_, my) in mine:
            if my < char_top - 2 and not is_keep((x1, y1, x2, y2)):
                alpha[max(0, y1 - 3):y2 + 4, max(0, x1 - 3):x2 + 4] = 0.0
            elif n <= 12:   # 종이의 잡점
                alpha[max(0, y1 - 2):y2 + 3, max(0, x1 - 2):x2 + 3] = 0.0

        a_sub = alpha[cy0:cy1, cx0:cx1]
        mask = a_sub > 0.04
        rows_any = np.where(mask.any(axis=1))[0]
        cols_any = np.where(mask.any(axis=0))[0]
        a_sub = a_sub[rows_any[0]:rows_any[-1] + 1, cols_any[0]:cols_any[-1] + 1]
        h, w = a_sub.shape

        rgba = np.zeros((h, w, 4), dtype=np.uint8)
        rgba[:, :, 0] = color[0]
        rgba[:, :, 1] = color[1]
        rgba[:, :, 2] = color[2]
        rgba[:, :, 3] = (a_sub * 255).astype(np.uint8)
        cut = Image.fromarray(rgba, 'RGBA')

        scale = (CANVAS * FILL) / max(cut.width, cut.height)
        nw, nh = max(1, round(cut.width * scale)), max(1, round(cut.height * scale))
        cut = cut.resize((nw, nh), Image.LANCZOS)
        canvas = Image.new('RGBA', (CANVAS, CANVAS), (0, 0, 0, 0))
        canvas.paste(cut, ((CANVAS - nw) // 2, (CANVAS - nh) // 2), cut)

        dest = os.path.join(OUT, f'{stem}-cut.webp')
        canvas.save(dest, 'WEBP', quality=92, method=6)
        print(f'{stem:7s} cell=({cx0},{cy0})-({cx1},{cy1}) charTop={char_top} '
              f'{cut.width}x{cut.height} {os.path.getsize(dest) // 1024}KB')

    # 검수용 콘택트시트 — 양피지/밤 배경
    files = [f'{stem}-cut.webp' for stem, _, _ in LAYOUT]
    cols, cell = 6, 160
    for bg_name, bg in (('parchment', (242, 233, 213, 255)), ('night', (18, 25, 46, 255))):
        canvas = Image.new('RGBA', (cols * cell, 2 * cell + 20), bg)
        for i, f in enumerate(files):
            im = Image.open(os.path.join(OUT, f)).resize((cell - 16, cell - 16), Image.LANCZOS)
            canvas.paste(im, ((i % cols) * cell + 8, (i // cols) * cell + 8), im)
        p = os.path.join(BASE, '..', 'tmp2', 'zodiac', f'contact-{bg_name}.png')
        os.makedirs(os.path.dirname(p), exist_ok=True)
        canvas.convert('RGB').save(p)
        print('contact', p)


if __name__ == '__main__':
    main()
