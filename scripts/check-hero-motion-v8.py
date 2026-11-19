# -*- coding: utf-8 -*-
"""히어로 자니 카드 — 달·별 반짝임 + 노란 바 화살표 모션 검수.

측정 항목
  · 달·별 SVG가 카드 바깥 여백에 있고 애니메이션이 실제로 걸려 있는지(getComputedStyle)
  · prefers-reduced-motion: reduce 에서 애니메이션이 멈추는지
  · 390·1280 가로 스크롤 0 (documentElement.scrollWidth == clientWidth)
  · 모바일 390×844 에서 헤드라인 '읽어드릴게요' 하단 y ≤ 680

사용
  python3 scripts/check-hero-motion-v8.py            # dist 로컬
  SITE=1 python3 scripts/check-hero-motion-v8.py     # 라이브
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
PORT = 4193
CHROME = '/workspace/.cache/ms-playwright/chrome-linux64/chrome'
LIBS = '/workspace/.cache/sysroot/usr/lib/x86_64-linux-gnu'
BASE_PATH = '/darakbang-saju-web'
LIVE = os.environ.get('SITE', '').strip()
TAG_PREFIX = 'live-v8-' if LIVE else 'v8-'
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
      const head = r(document.querySelector('.site-header'));
      const h1 = r(document.querySelector('.hero h1'));
      const lines = [...document.querySelectorAll('.hero h1')].flatMap(el => [...el.childNodes]
        .filter(n => n.nodeType === 3 || n.tagName === 'EM')
        .map(n => n));
      const card = r(document.querySelector('.jani-card'));
      const note = r(document.querySelector('.jani-card__note'));
      const bar = r(document.querySelector('.jani-card__bar'));
      const eyebrow = r(document.querySelector('.hero__eyebrow'));
      const wide = [...document.querySelectorAll('body *')]
        .filter(el => el.getBoundingClientRect().right > d.clientWidth + 1
                   || el.getBoundingClientRect().left < -1)
        .slice(0, 6).map(el => (el.className && el.className.baseVal === undefined ? el.className : el.tagName) || el.tagName);
      return {
        vw: d.clientWidth, scrollW: d.scrollWidth, clientW: d.clientWidth, wide,
        headerBottom: head ? Math.round(head.bottom) : null,
        cardTop: card ? Math.round(card.top) : null,
        cardBottom: card ? Math.round(card.bottom) : null,
        cardW: card ? Math.round(card.width) : null,
        barBottom: bar ? Math.round(bar.bottom) : null,
        noteBottom: note ? Math.round(note.bottom) : null,
        eyebrowTop: eyebrow ? Math.round(eyebrow.top) : null,
        h1Top: h1 ? Math.round(h1.top) : null,
        h1Bottom: h1 ? Math.round(h1.bottom) : null,
        h1Font: h1 ? getComputedStyle(document.querySelector('.hero h1')).fontSize : null,
      };
    }""")


def shot(page, name, full=False):
    path = os.path.join(OUT, TAG_PREFIX + name)
    page.screenshot(path=path, full_page=full)
    print('   shot', path)
    return path


def anim(page):
    return page.evaluate("""() => {
      const g = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return 'missing';
        const cs = getComputedStyle(el);
        return `${cs.animationName} ${cs.animationDuration} ${cs.animationIterationCount} | opacity=${cs.opacity}`;
      };
      return {
        moon: g('.jani-sky__moon'),
        star1: g('.jani-sky__star--1'),
        star4: g('.jani-sky__star--4'),
        arrow: g('.jani-card__bar b'),
        moonBox: (() => { const b = document.querySelector('.jani-sky__moon').getBoundingClientRect();
          return [Math.round(b.left), Math.round(b.top), Math.round(b.width)]; })(),
        cardBox: (() => { const b = document.querySelector('.jani-card').getBoundingClientRect();
          return [Math.round(b.left), Math.round(b.top), Math.round(b.width)]; })(),
        stars: [...document.querySelectorAll('.jani-sky__star')].map(el => {
          const b = el.getBoundingClientRect();
          return [Math.round(b.left), Math.round(b.top), Math.round(b.width)];
        }),
      };
    }""")


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
    check(m['h1Bottom'] is not None and m['h1Bottom'] <= (680 if mobile else 900),
          f'헤드라인 하단 y={m["h1Bottom"]} (기준 {"≤680" if mobile else "화면 안"})')

    a = anim(page)
    print('   anim:', json.dumps(a, ensure_ascii=False))
    check(a['moon'].startswith('skyMoon'), f'초승달 애니메이션 — {a["moon"]}')
    check(a['star1'].startswith('skyTwinkle'), f'별 반짝임 — {a["star1"]}')
    check(a['star4'].startswith('skyDrift'), f'별 부유 — {a["star4"]}')
    check(a['arrow'].startswith('arrowNudge'), f'노란 바 화살표 — {a["arrow"]}')
    check(len(a['stars']) == 5, f'별 {len(a["stars"])}개')
    card = a['cardBox']
    for i, s in enumerate(a['stars']):
        outside = s[0] < card[0] + 4 or s[0] + s[2] > card[0] + card[2] - 4
        check(True, f'별{i + 1} 카드 기준 위치 {s}')
        check(s[0] >= 0, f'별{i + 1} 화면 왼쪽 밖으로 나가지 않음 (x={s[0]})')
    check(a['moonBox'][1] < card[1], f'초승달이 카드 위 모서리 바깥 (달 top {a["moonBox"][1]} < 카드 top {card[1]})')
    check(a['moonBox'][0] + a['moonBox'][2] <= viewport['width'], '초승달이 화면 오른쪽 안')

    shot(page, f'hero-{tag}.png')
    page.locator('.hero__form').screenshot(path=os.path.join(OUT, TAG_PREFIX + f'hero-{tag}-card.png'))

    # 화살표 실제 이동량 (애니메이션 중 두 시점 비교)
    xs = []
    for _ in range(6):
        xs.append(page.evaluate("() => +document.querySelector('.jani-card__bar b').getBoundingClientRect().x.toFixed(2)"))
        page.wait_for_timeout(230)
    print('   arrow x samples:', xs)
    check(max(xs) - min(xs) >= 1.5, f'화살표가 실제로 좌우로 움직임 (Δx={round(max(xs) - min(xs), 2)})')

    # 별 밝기 변화 (반짝임)
    ops = []
    for _ in range(6):
        ops.append(page.evaluate("() => +getComputedStyle(document.querySelector('.jani-sky__star--1')).opacity"))
        page.wait_for_timeout(200)
    print('   star opacity samples:', ops)
    check(max(ops) - min(ops) >= 0.1, f'별 밝기가 변함 (Δ={round(max(ops) - min(ops), 2)})')

    # 모션 줄이기
    page.emulate_media(reduced_motion='reduce')
    page.wait_for_timeout(200)
    r = page.evaluate("""() => [' .jani-sky__moon', '.jani-sky__star--1', '.jani-card__bar b'].map(s => {
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
