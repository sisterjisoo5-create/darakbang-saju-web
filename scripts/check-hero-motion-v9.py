# -*- coding: utf-8 -*-
"""히어로 자니 카드 — 그림 안쪽 별·달·촛불 모션 / 슬림 노란 바 / 3줄 헤드라인 검수.

측정 항목
  · 별·달·촛불 빛(overlay)의 중심이 attic-hero-cut.webp에 실제로 그려진 잉크의 중심과 맞는지
    (브라우저 canvas로 원본 webp의 알파를 읽어 잉크 무게중심과 비교)
  · 별 반짝임 · 달 호흡 · 촛불 일렁임 애니메이션이 실제로 걸려 있고 밝기가 변하는지
  · prefers-reduced-motion: reduce 에서 멈추는지
  · 390·1280 가로 스크롤 0
  · 노란 바 높이 (모바일 28~30px, 데스크톱 32~34px)
  · 헤드라인 3줄 + 390×844 에서 '읽어드릴게요' 하단 y ≤ 680

사용
  python3 scripts/check-hero-motion-v9.py            # dist 로컬
  SITE=1 python3 scripts/check-hero-motion-v9.py     # 라이브
"""
import http.server
import json
import os
import socketserver
import sys
import threading

from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DIST = os.path.join(ROOT, 'dist')
OUT = os.path.abspath(os.path.join(ROOT, '..', 'downloads'))
PORT = 4198
CHROME = '/workspace/.cache/ms-playwright/chrome-linux64/chrome'
LIBS = '/workspace/.cache/sysroot/usr/lib/x86_64-linux-gnu'
BASE_PATH = '/darakbang-saju-web'
LIVE = os.environ.get('SITE', '').strip()
TAG_PREFIX = 'live-v9-' if LIVE else 'v9-'
LIVE_URL = 'https://sisterjisoo5-create.github.io/darakbang-saju-web/'

os.makedirs(OUT, exist_ok=True)
FAILS = []


def check(cond, msg):
    print(('  ok   ' if cond else '  FAIL ') + msg)
    if not cond:
        FAILS.append(msg)


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=DIST, **kw)

    def translate_path(self, path):
        if path.startswith(BASE_PATH + '/'):
            path = path[len(BASE_PATH):]
        return super().translate_path(path)

    def log_message(self, *a):
        pass


def serve():
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(('127.0.0.1', PORT), Handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def settle(page, ms=600):
    page.wait_for_timeout(ms)
    page.wait_for_function("document.fonts.status === 'loaded'")


def metrics(page):
    return page.evaluate("""() => {
      const r = (el) => el ? el.getBoundingClientRect() : null;
      const d = document.documentElement;
      const h1 = document.querySelector('.hero h1');
      const bar = document.querySelector('.jani-card__bar');
      const fig = document.querySelector('.jani-card__figure');
      const card = document.querySelector('.jani-card');
      const note = document.querySelector('.jani-card__note');
      // 헤드라인 줄 수 = Range가 돌려주는 line box 수
      const range = document.createRange();
      range.selectNodeContents(h1);
      const tops = [...range.getClientRects()].filter(x => x.height > 4).map(x => Math.round(x.top));
      const lineTops = [...new Set(tops)].sort((a, b) => a - b);
      const last = [...h1.childNodes].filter(n => n.nodeType === 3).pop();
      const lr = document.createRange();
      lr.setStart(last, 0); lr.setEnd(last, last.length);
      const lastRect = lr.getBoundingClientRect();
      const wide = [...document.querySelectorAll('body *')]
        .filter(el => el.getBoundingClientRect().right > d.clientWidth + 1
                   || el.getBoundingClientRect().left < -1)
        .slice(0, 6).map(el => (el.className && el.className.baseVal === undefined ? el.className : el.tagName) || el.tagName);
      return {
        vw: d.clientWidth, scrollW: d.scrollWidth, clientW: d.clientWidth, wide,
        h1Top: h1 ? Math.round(r(h1).top) : null,
        h1Bottom: h1 ? Math.round(r(h1).bottom) : null,
        h1Lines: lineTops.length,
        h1LineTops: lineTops,
        lastLineText: (last ? last.textContent : '').trim(),
        lastLineTop: Math.round(lastRect.top),
        barH: bar ? +r(bar).height.toFixed(1) : null,
        barFont: bar ? getComputedStyle(bar).fontSize : null,
        barPad: bar ? getComputedStyle(bar).paddingTop : null,
        noteBottom: note ? Math.round(r(note).bottom) : null,
        cardBottom: card ? Math.round(r(card).bottom) : null,
        fig: fig ? { left: +r(fig).left.toFixed(1), top: +r(fig).top.toFixed(1),
                     w: +r(fig).width.toFixed(1), h: +r(fig).height.toFixed(1) } : null,
      };
    }""")


def glow_alignment(page, fig):
    """원본 그림(1100×1100)의 알파를 읽어, 오버레이 좌표와 그려진 잉크 중심이 얼마나 벗어나는지."""
    return page.evaluate("""async () => {
      const img = document.querySelector('.jani-card__figure img');
      const cv = document.createElement('canvas');
      cv.width = img.naturalWidth; cv.height = img.naturalHeight;
      const ctx = cv.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const W = cv.width, H = cv.height;
      const data = ctx.getImageData(0, 0, W, H).data;
      const alpha = (x, y) => data[((y | 0) * W + (x | 0)) * 4 + 3];
      const out = [];
      for (const el of document.querySelectorAll('.jani-glow__halo')) {
        const cx = +el.getAttribute('cx'), cy = +el.getAttribute('cy');
        const px = cx / 100 * W, py = cy / 100 * H, win = Math.round(W * 0.035);
        let sx = 0, sy = 0, n = 0;
        for (let y = Math.max(0, py - win); y < Math.min(H, py + win); y++)
          for (let x = Math.max(0, px - win); x < Math.min(W, px + win); x++)
            if (alpha(x, y) > 160) { sx += x; sy += y; n++; }
        if (!n) { out.push({ cx, cy, ink: 0 }); continue; }
        out.push({ cx, cy, ink: n,
          dx: +((sx / n - px) / W * 100).toFixed(2),
          dy: +((sy / n - py) / H * 100).toFixed(2) });
      }
      return { W, H, stars: out,
        hard: (() => {
          // 반짝임이 그림 위에서 선화를 얼마나 흐리는지: 별 하나 영역의 잉크 최소 밝기 비교용 표본
          return null;
        })() };
    }""")


def anim(page):
    return page.evaluate("""() => {
      const g = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return 'missing';
        const cs = getComputedStyle(el);
        return `${cs.animationName} ${cs.animationDuration} ${cs.animationIterationCount} | opacity=${cs.opacity}`;
      };
      const box = (sel) => { const el = document.querySelector(sel); if (!el) return null;
        const b = el.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
      return {
        halo: g('.jani-glow__halo'),
        core: g('.jani-glow__core'),
        spark: g('.jani-glow__spark'),
        moon: g('.jani-glow__moon'),
        moonCore: g('.jani-glow__moon-core'),
        flame: g('.jani-glow__flame'),
        flameCore: g('.jani-glow__flame-core'),
        arrow: g('.jani-card__bar b'),
        counts: {
          halo: document.querySelectorAll('.jani-glow__halo').length,
          core: document.querySelectorAll('.jani-glow__core').length,
          spark: document.querySelectorAll('.jani-glow__spark').length,
          moon: document.querySelectorAll('.jani-glow__moon').length,
          flame: document.querySelectorAll('.jani-glow__flame').length,
        },
        firstHaloBox: box('.jani-glow__halo'),
        moonBox: box('.jani-glow__moon'),
        flameBox: box('.jani-glow__flame'),
        glintBlend: (() => { const el = document.querySelector('.jani-glow--glint');
          return el ? getComputedStyle(el).mixBlendMode : 'missing'; })(),
      };
    }""")


def shot(page, name, full=False):
    path = os.path.join(OUT, TAG_PREFIX + name)
    page.screenshot(path=path, full_page=full)
    print('   shot', path)
    return path


def run(browser, tag, viewport, mobile=False):
    print(f'=== {tag} {viewport["width"]}x{viewport["height"]} ===')
    kw = dict(viewport=viewport, device_scale_factor=2, locale='ko-KR')
    if mobile:
        kw.update(is_mobile=True, has_touch=True,
                  user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')
    ctx = browser.new_context(**kw)
    page = ctx.new_page()
    base = LIVE_URL if LIVE else f'http://127.0.0.1:{PORT}{BASE_PATH}/'
    page.goto(base, wait_until='networkidle')
    settle(page)
    page.emulate_media(reduced_motion='no-preference')

    m = metrics(page)
    print('   metrics:', json.dumps(m, ensure_ascii=False))
    check(m['scrollW'] <= m['clientW'], f'가로 스크롤 없음 — scrollWidth {m["scrollW"]} / clientWidth {m["clientW"]} · {m["wide"]}')

    # 헤드라인 3줄: 마지막 줄이 '읽어드릴게요'
    check(m['h1Lines'] == 3, f'헤드라인 {m["h1Lines"]}줄 (기대 3줄 · 시작 y {m["h1LineTops"]})')
    check(m['lastLineText'] == '읽어드릴게요', f'3번째 줄 = "{m["lastLineText"]}"')
    check(m['h1Bottom'] is not None and m['h1Bottom'] <= (680 if mobile else 900),
          f'헤드라인 하단 y={m["h1Bottom"]} (기준 {"≤680" if mobile else "화면 안"})')

    # 노란 바 높이
    lo, hi = (27, 31) if mobile else (31, 35)
    check(m['barH'] is not None and lo <= m['barH'] <= hi,
          f'노란 바 높이 {m["barH"]}px (기준 {lo}~{hi} · font {m["barFont"]} · padding {m["barPad"]})')

    # 그림 안쪽 빛 정렬
    a = anim(page)
    print('   anim:', json.dumps(a, ensure_ascii=False))
    check(a['counts']['halo'] == 13 and a['counts']['core'] == 13,
          f'별 빛 {a["counts"]["halo"]}개 / 중심광 {a["counts"]["core"]}개')
    check(a['counts']['spark'] == 13, f'별 반짝임 {a["counts"]["spark"]}개')
    check(a['halo'].startswith('janiStarTwinkle'), f'별 반짝임 — {a["halo"]}')
    check(a['moon'].startswith('janiMoonGlow'), f'달 호흡 — {a["moon"]}')
    check(a['flame'].startswith('janiCandleFlicker'), f'촛불 일렁임 — {a["flame"]}')
    check(a['arrow'].startswith('arrowNudge'), f'노란 바 화살표 — {a["arrow"]}')
    check(a['glintBlend'] == 'screen', f'별 중심광 블렌드 — {a["glintBlend"]}')

    al = glow_alignment(page, m['fig'])
    worst = max(al['stars'], key=lambda s: max(abs(s.get('dx', 99)), abs(s.get('dy', 99))))
    check(all(s.get('ink', 0) > 200 for s in al['stars']),
          f'별 13개 자리에 실제 잉크가 있음 (최소 잉크 픽셀 {min(s.get("ink", 0) for s in al["stars"])})')
    check(max(abs(worst['dx']), abs(worst['dy'])) <= 1.2,
          f'빛 중심과 그려진 별의 어긋남 최대 ({worst["dx"]}%, {worst["dy"]}%) — 기준 ±1.2%')

    # 빛이 그림 안(카드 그림 영역)에 있는지
    fig = m['fig']
    for name, b in (('별', a['firstHaloBox']), ('달', a['moonBox']), ('촛불', a['flameBox'])):
        if not b:
            check(False, f'{name} 빛 박스 없음')
            continue
        inside = (b[0] >= fig['left'] - 30 and b[1] >= fig['top'] - 30
                  and b[0] + b[2] <= fig['left'] + fig['w'] + 30
                  and b[1] + b[3] <= fig['top'] + fig['h'] + 30)
        check(inside, f'{name} 빛이 그림 영역 안 — {b} / 그림 {fig}')

    shot(page, f'hero-{tag}.png')
    page.locator('.jani-card').screenshot(path=os.path.join(OUT, TAG_PREFIX + f'hero-{tag}-card.png'))
    page.locator('.jani-card__figure').screenshot(path=os.path.join(OUT, TAG_PREFIX + f'hero-{tag}-figure.png'))

    # 밝기가 실제로 변하는지 (별 · 달 · 촛불)
    samples = {'halo': [], 'moon': [], 'flame': [], 'arrow': []}
    for _ in range(20):
        s = page.evaluate("""() => {
          const o = (sel) => { const el = document.querySelector(sel);
            return el ? +getComputedStyle(el).opacity : -1; };
          return { halo: o('.jani-glow__halo'), moon: o('.jani-glow__moon'), flame: o('.jani-glow__flame'),
                   arrow: +document.querySelector('.jani-card__bar b').getBoundingClientRect().x.toFixed(2) };
        }""")
        for k in samples:
            samples[k].append(s[k])
        page.wait_for_timeout(300)
    for k in ('halo', 'moon', 'flame'):
        d = round(max(samples[k]) - min(samples[k]), 3)
        print(f'   {k} opacity samples:', [round(v, 2) for v in samples[k]])
        check(d >= 0.15, f'{k} 밝기가 실제로 변함 (Δ={d})')
    d = round(max(samples['arrow']) - min(samples['arrow']), 2)
    check(d >= 1.5, f'화살표가 실제로 좌우로 움직임 (Δx={d})')

    # 모션 줄이기
    page.emulate_media(reduced_motion='reduce')
    page.wait_for_timeout(250)
    r = page.evaluate("""() => [' .jani-glow__halo', '.jani-glow__spark', '.jani-glow__moon', '.jani-glow__flame', '.jani-card__bar b'].map(s => {
      const el = document.querySelector(s.trim());
      const cs = getComputedStyle(el);
      return s.trim() + '=' + cs.animationName;
    })""")
    print('   reduced:', r)
    check(all(x.endswith('=none') for x in r), 'prefers-reduced-motion: reduce 에서 정지')

    if mobile:
        page.emulate_media(reduced_motion='no-preference')
        shot(page, f'hero-{tag}-viewport.png')
    ctx.close()


def main():
    if not LIVE:
        serve()
    env = dict(os.environ)
    env['LD_LIBRARY_PATH'] = LIBS + ':' + env.get('LD_LIBRARY_PATH', '')
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--hide-scrollbars'], env=env)
        run(browser, 'desktop', {'width': 1280, 'height': 900})
        run(browser, 'mobile', {'width': 390, 'height': 844}, mobile=True)
        browser.close()
    print('\nFAILS:', json.dumps(FAILS, ensure_ascii=False, indent=1) if FAILS else 'none')
    sys.exit(1 if FAILS else 0)


if __name__ == '__main__':
    main()
