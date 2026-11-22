# -*- coding: utf-8 -*-
"""히어로 자니 카드 상단 배지(사주 · 자미두수 동시 풀이) 검수.

375 / 390 / 1280 폭에서 배지가 잘리거나 다른 요소와 겹치지 않는지 확인한다.
SITE=1 환경변수를 주면 dist 대신 라이브 주소를 본다.
"""
import http.server
import os
import socketserver
import threading

from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DIST = os.path.join(ROOT, 'dist')
PORT = 4197
CHROME = '/workspace/.cache/ms-playwright/chrome-linux64/chrome'
LIBS = '/workspace/.cache/sysroot/usr/lib/x86_64-linux-gnu'
BASE_PATH = '/darakbang-saju-web'
LIVE = os.environ.get('SITE', '').strip()
LIVE_URL = 'https://sisterjisoo5-create.github.io/darakbang-saju-web/'
LIVE_LATEST = LIVE_URL + '?v=' + str(int(__import__('time').time()))
TAG_PREFIX = 'live-' if LIVE else ''
OUT = os.path.abspath(os.path.join(ROOT, '..', 'downloads'))

os.makedirs(OUT, exist_ok=True)
FAILS = []

EXPECT = '사주 · 자미두수 동시 풀이'


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


NO_ANIM = "*,*::before,*::after{animation:none!important;transition:none!important}"


def run(browser, width, height, mobile=False):
    tag = f'{width}'
    print(f'=== {tag} ===')
    kw = dict(viewport={'width': width, 'height': height}, device_scale_factor=2,
              reduced_motion='reduce', locale='ko-KR')
    if mobile:
        kw.update(is_mobile=True, has_touch=True,
                  user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')
    ctx = browser.new_context(**kw)
    page = ctx.new_page()
    base = LIVE_LATEST if LIVE else f'http://127.0.0.1:{PORT}{BASE_PATH}/'
    page.goto(base, wait_until='networkidle')
    page.add_style_tag(content=NO_ANIM)
    page.wait_for_timeout(400)
    page.wait_for_function("document.fonts.status === 'loaded'")

    badge = page.locator('.jani-card__badge--visitors').first
    text = badge.inner_text().replace('\n', ' ').strip()
    check(text == EXPECT, f'배지 문구 — {text}')

    r = page.evaluate("""() => {
      const b = document.querySelector('.jani-card__badge--visitors');
      const v = document.querySelector('.jani-card__badge--verified');
      const card = document.querySelector('.jani-card');
      const fig = document.querySelector('.jani-card__figure');
      const br = b.getBoundingClientRect();
      const vr = v.getBoundingClientRect();
      const cr = card.getBoundingClientRect();
      const fr = fig.getBoundingClientRect();
      const overlap = (a, c) => !(a.right <= c.left + 1 || a.left >= c.right - 1 || a.bottom <= c.top + 1 || a.top >= c.bottom - 1);
      return {
        text: b.textContent.trim(),
        vw: document.documentElement.clientWidth,
        scrollW: document.documentElement.scrollWidth,
        badge: {l: Math.round(br.left), r: Math.round(br.right), t: Math.round(br.top), b: Math.round(br.bottom), w: Math.round(br.width), h: Math.round(br.height)},
        card: {l: Math.round(cr.left), r: Math.round(cr.right), w: Math.round(cr.width)},
        fig: {t: Math.round(fr.top), l: Math.round(fr.left)},
        clippedX: b.scrollWidth > b.clientWidth + 1,
        clippedY: b.scrollHeight > b.clientHeight + 1,
        overVerified: overlap(br, vr),
        whiteSpace: getComputedStyle(b).whiteSpace,
        fontSize: getComputedStyle(b).fontSize,
      };
    }""")
    print('   ', r)
    check(r['badge']['l'] >= 0 and r['badge']['r'] <= r['vw'], '배지가 화면 밖으로 나가지 않는다')
    check(r['scrollW'] <= r['vw'] + 1, f'가로 스크롤 없음 (scrollW={r["scrollW"]}, vw={r["vw"]})')
    check(not r['clippedX'] and not r['clippedY'], '배지 글자가 잘리지 않는다')
    check(not r['overVerified'], '만세력 검증 배지와 겹치지 않는다')
    check(r['badge']['t'] >= r['fig']['t'] - 1, '배지가 카드 그림 영역 위쪽에 놓인다')

    card = page.locator('.jani-card').first
    card.screenshot(path=os.path.join(OUT, f'{TAG_PREFIX}darakbang-badge-{tag}-card.png'))
    page.screenshot(path=os.path.join(OUT, f'{TAG_PREFIX}darakbang-badge-{tag}-hero.png'))
    ctx.close()


def main():
    httpd = None if LIVE else serve()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
            run(browser, 375, 812, mobile=True)
            run(browser, 390, 844, mobile=True)
            run(browser, 1280, 900)
            browser.close()
    finally:
        if httpd:
            httpd.shutdown()
    print('\nRESULT:', 'ALL PASS' if not FAILS else f'{len(FAILS)} FAIL')
    for f in FAILS:
        print(' -', f)


if __name__ == '__main__':
    main()
