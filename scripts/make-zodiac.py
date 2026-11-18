# -*- coding: utf-8 -*-
"""12간지 캐릭터 시트 → 개별 투명 캐릭터(*-cut.webp).

원본: attachments/2026-11-18/250C4D19-…jpg
  1254×1254, 4열 × 3행. 각 칸 위쪽에 손글씨 이름(자니·우니 …), 아래에 남색 잉크 캐릭터.

하는 일
1) 시트 전체를 연결요소로 나눈다. 칸 위쪽의 손글씨 라벨은 '작은 덩어리'라서 걷어내고,
   캐릭터(큰 덩어리 + 몸통 bbox 안의 눈·별·번쩍임)만 남긴다.
2) 종이(흰색)를 투명으로: 알파 = 밝기 반전. 잉크는 시트에서 뽑은 남색 한 색으로 통일.
3) 320×320 정사각 캔버스에 비율 유지로 가운데 정렬해 저장.

결과: public/images/zodiac/{jani,uni,honi,toni,yongi,sani,mani,yangni,woni,dakni,gaeni,dweni}-cut.webp
"""
import os
from collections import deque

import numpy as np
from PIL import Image

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.join(BASE, '..', 'attachments', '2026-11-18',
                   '250C4D19-C9F0-45BC-BACF-15234ADCF12E-47ac4d2c9fc541768fc220717e71d75c.jpg')
OUT = os.path.join(BASE, 'public', 'images', 'zodiac')

SOLID_L = 168.0   # 이보다 어두우면 잉크 덩어리로 본다
INK_L = 62.0      # 이보다 어두우면 알파 100%
WHITE_L = 247.0   # 이보다 밝으면 종이(알파 0)
CANVAS = 320

# 칸 순서: 행 우선 (자니·우니·호니·토니 / 용니·사니·마니·양니 / 원니·닭니·개니·돼니)
LAYOUT = [
    ('jani', 0, 0), ('uni', 0, 1), ('honi', 0, 2), ('toni', 0, 3),
    ('yongi', 1, 0), ('sani', 1, 1), ('mani', 1, 2), ('yangni', 1, 3),
    ('woni', 2, 0), ('dakni', 2, 1), ('gaeni', 2, 2), ('dweni', 2, 3),
]
CELL_W = 1254 // 4
CELL_H = 1254 // 3

# 칸 경계를 넘어가거나 라벨과 붙은 캐릭터는 손으로 잡아준다 (원본 픽셀 좌표, x1,y1,x2,y2)
MANUAL = {
    'honi': (628, 122, 947, 405),      # 호랑이 — 수염·꼬리가 칸 경계를 넘는다(위 라벨 '—' 는 뺀다)
    'yongi': (14, 500, 332, 792),      # 용 — 뿔이 라벨 '(용)' 과 붙어 한 덩어리로 잡힌다
    'gaeni': (622, 885, 940, 1195),    # 개 — 귀가 라벨과 붙고 오른쪽으로 넘친다
    'woni': (10, 890, 320, 1195),      # 원숭이 — 왼쪽 꼬리가 칸 밖
}


def luminance(a):
    return 0.299 * a[:, :, 0] + 0.587 * a[:, :, 1] + 0.114 * a[:, :, 2]


def components(mask):
    """4-연결 연결요소 — [(면적, (x1,y1,x2,y2))]"""
    h, w = mask.shape
    seen = np.zeros((h, w), dtype=bool)
    out = []
    for y0 in range(h):
        for x0 in range(w):
            if not mask[y0, x0] or seen[y0, x0]:
                continue
            q = deque([(y0, x0)])
            seen[y0, x0] = True
            n = 0
            x1 = x2 = x0
            y1 = y2 = y0
            while q:
                y, x = q.popleft()
                n += 1
                if x < x1: x1 = x
                if x > x2: x2 = x
                if y < y1: y1 = y
                if y > y2: y2 = y
                for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        q.append((ny, nx))
            out.append((n, (x1, y1, x2, y2)))
    return out


def ink_color(a):
    lum = luminance(a)
    dark = a[lum < 85]
    if len(dark) == 0:
        return (18, 32, 84)
    return tuple(int(v) for v in dark.mean(axis=0))


def main():
    os.makedirs(OUT, exist_ok=True)
    sheet = Image.open(SRC).convert('RGB')
    arr = np.asarray(sheet).astype(np.float32)
    lum = luminance(arr)
    alpha = np.clip((WHITE_L - lum) / (WHITE_L - INK_L), 0.0, 1.0)
    solid = lum < SOLID_L
    color = ink_color(arr)
    print('ink color', color)

    comps = components(solid)
    print('components', len(comps))
    comps.sort(key=lambda t: -t[0])

    for stem, r, c in LAYOUT:
        cx0, cy0 = c * CELL_W, r * CELL_H
        cx1, cy1 = cx0 + CELL_W, cy0 + CELL_H
        label_zone = cy0 + 118  # 손글씨 라벨은 이 위쪽

        # 이 칸에 속한 덩어리: 중심이 칸(살짝 넓힌) 안에 있고, 라벨 글씨가 아닌 것
        mine = []
        for n, (x1, y1, x2, y2) in comps:
            mx, my = (x1 + x2) / 2, (y1 + y2) / 2
            inside = (cx0 - 18) <= mx <= (cx1 + 18) and (cy0 - 18) <= my <= (cy1 + 18)
            if not inside:
                continue
            is_label = n < 700 and y2 <= label_zone and (x2 - x1) < 120 and (y2 - y1) < 70
            if is_label:
                continue
            mine.append((n, (x1, y1, x2, y2)))
        if not mine:
            print(stem, 'MISSING'); continue
        body = max(mine, key=lambda t: t[0])[1]
        big = [b for n, b in mine if n >= 1500]
        char_top = min(b[1] for b in big) if big else body[1]
        # 몸통 bbox 안(여유 30px)에 중심이 들어오는 덩어리까지 합친다 (눈·별·번쩍임)
        bx1, by1, bx2, by2 = body
        keep = []
        for n, (x1, y1, x2, y2) in mine:
            mx, my = (x1 + x2) / 2, (y1 + y2) / 2
            if not (bx1 - 30 <= mx <= bx2 + 30 and by1 - 30 <= my <= by2 + 30):
                continue
            # 몸통 위쪽에 떨어진 작은 조각은 손글씨 라벨의 '—' 장식이다
            if n < 700 and y2 < char_top - 2:
                continue
            keep.append((x1, y1, x2, y2))
        x1 = min(k[0] for k in keep); y1 = min(k[1] for k in keep)
        x2 = max(k[2] for k in keep); y2 = max(k[3] for k in keep)
        if stem in MANUAL:
            x1, y1, x2, y2 = MANUAL[stem]

        a_sub = alpha[y1:y2 + 1, x1:x2 + 1]
        h, w = a_sub.shape
        # 알파가 실제로 있는 부분으로 한 번 더 타이트하게 자른다
        mask = a_sub > 0.10
        rows_any = np.where(mask.any(axis=1))[0]
        cols_any = np.where(mask.any(axis=0))[0]
        py1, py2 = rows_any[0], rows_any[-1]
        px1, px2 = cols_any[0], cols_any[-1]
        a_sub = a_sub[py1:py2 + 1, px1:px2 + 1]

        # 위쪽에 남은 손글씨 '—' 자국(가로 폭 6% 미만)은 지운다
        for r_ in range(min(26, a_sub.shape[0])):
            if (a_sub[r_] > 0.10).sum() >= a_sub.shape[1] * 0.06:
                break
            a_sub[r_] = 0

        h, w = a_sub.shape
        rgba = np.zeros((h, w, 4), dtype=np.uint8)
        rgba[:, :, 0] = color[0]
        rgba[:, :, 1] = color[1]
        rgba[:, :, 2] = color[2]
        rgba[:, :, 3] = (a_sub * 255).astype(np.uint8)
        cut = Image.fromarray(rgba, 'RGBA')

        scale = (CANVAS * 0.90) / max(cut.width, cut.height)
        nw, nh = max(1, round(cut.width * scale)), max(1, round(cut.height * scale))
        cut = cut.resize((nw, nh), Image.LANCZOS)
        canvas = Image.new('RGBA', (CANVAS, CANVAS), (0, 0, 0, 0))
        canvas.paste(cut, ((CANVAS - nw) // 2, (CANVAS - nh) // 2), cut)

        # 캔버스 맨 위에 떨어진 짧은 잉크 조각(손글씨 '—' 자국)은 한 덩어리로 지운다
        arr_c = np.array(canvas)
        rows_ink = (arr_c[:, :, 3] > 26).sum(axis=1)
        nz = np.where(rows_ink > 0)[0]
        if len(nz):
            top = nz[0]
            gap = None
            for r_ in range(top, min(top + 40, CANVAS)):
                if rows_ink[r_] == 0:
                    gap = r_
                    break
            if gap is not None and gap - top < 10:
                nxt = np.where(rows_ink[gap:] > 0)[0]
                if len(nxt) and nxt[0] + gap - gap >= 5:
                    arr_c[: gap, :, 3] = 0
                    canvas = Image.fromarray(arr_c, 'RGBA')
        dest = os.path.join(OUT, f'{stem}-cut.webp')
        canvas.save(dest, 'WEBP', quality=92, method=6)
        print(f'{stem:7s} src=({x1},{y1})-({x2},{y2}) {cut.width}x{cut.height} '
              f'{os.path.getsize(dest) // 1024}KB')

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
    print('contact sheets ready')


if __name__ == '__main__':
    main()
