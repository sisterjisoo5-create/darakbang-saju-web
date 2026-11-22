# -*- coding: utf-8 -*-
"""내 다락방(#/my) 머리 안내 문구 검수 — 겹침·넘침 0건.

확인 항목
  · 「내 기록과 구슬」 아래 안내가 한 문단으로만 있다 (겹치는 문단 없음)
  · 문구가 시연 님 지시 그대로 — `이 브라우저에만 저장되니, 기록을 지우기 전에 주문한 카드를 이미지로 저장해 두세요.`
  · 375·390·430·1280 폭에서 글자가 화면 밖으로 넘치지 않고, 제목·아래 카드와 겹치지 않는다
  · 390 폭에서 두 줄 안쪽으로 들어간다

사용
  python3 scripts/check-my-note.py            # dist 로컬
  SITE=1 python3 scripts/check-my-note.py     # 라이브
"""
import http.server
import os
import socketserver
import threading

from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DIST = os.path.join(ROOT, 'dist')
OUT = os.path.abspath(os.path.join(ROOT, '..', 'downloads'))
PORT = 4237
CHROME = '/workspace/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell'
LIBS = ':'.join([
    '/workspace/tmp/libs/usr/lib/x86_64-linux-gnu',
    '/workspace/.cache/sysroot/usr/lib/x86_64-linux-gnu',
])
BASE_PATH = '/darakbang-saju-web'
LIVE = os.environ.get('SITE', '').strip()
LIVE_URL = 'https://sisterjisoo5-create.github.io/darakbang-saju-web/'
TAG = 'live-' if LIVE else ''

os.makedirs(OUT, exist_ok=True)
FAILS = []

NOTE = '이 브라우저에만 저장되니, 기록을 지우기 전에 주문한 카드를 이미지로 저장해 두세요.'
ME = {'year': '1991', 'month': '05', 'day': '07', 'hour': '18', 'minute': '22'}


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


def main():
    httpd = None
    base = LIVE_URL
    if not LIVE:
        httpd = serve()
        base = f'http://127.0.0.1:{PORT}{BASE_PATH}/'

    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=CHROME,
            args=['--no-sandbox', '--font-render-hinting=none'],
            env={**os.environ, 'LD_LIBRARY_PATH': LIBS},
        )

        for w, h in [(375, 812), (390, 844), (430, 932), (1280, 900)]:
            print(f'[{w}px] 내 다락방 — 「내 기록과 구슬」 안내 한 문단')
            ctx = browser.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2)
            page = ctx.new_page()
            errs = []
            page.on('pageerror', lambda e: errs.append(str(e)))
            page.goto(base + '#/input', wait_until='networkidle')
            for name, val in ME.items():
                page.fill(f'input[name="{name}"]', val)
            page.click('form[data-form="birth"] button[type="submit"]')
            page.wait_for_selector('#zodiac-share', timeout=10000)
            page.goto(base + '#/my', wait_until='networkidle')
            page.wait_for_selector('.result-head h1', timeout=10000)

            info = page.evaluate("""() => {
              const head = document.querySelector('.result-head');
              const h1 = head.querySelector('h1');
              const ps = [...head.querySelectorAll('p')];
              const box = (el) => { const b = el.getBoundingClientRect();
                return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, b: b.bottom }; };
              const grid = document.querySelector('.my-grid');
              const cs = ps[0] ? getComputedStyle(ps[0]) : null;
              return {
                h1: h1.textContent.trim(),
                h1box: box(h1),
                texts: ps.map((p) => p.textContent.trim()),
                pboxes: ps.map(box),
                lineHeight: cs ? parseFloat(cs.lineHeight) || 0 : 0,
                fontSize: cs ? parseFloat(cs.fontSize) || 0 : 0,
                gridbox: grid ? box(grid) : null,
                over: document.documentElement.scrollWidth - window.innerWidth,
                vw: window.innerWidth,
              };
            }""")

            check(info['h1'] == '내 기록과 구슬', f'{w}px — 제목 「{info["h1"]}」')
            check(len(info['texts']) == 1, f'{w}px — 안내 문단 1개 ({len(info["texts"])}개)')
            check(NOTE in (info['texts'][0] if info['texts'] else ''), f'{w}px — 안내 문구 그대로')
            check('기록 지우기를 누르면 모두 사라져요' not in ' '.join(info['texts']),
                  f'{w}px — 예전 두 문장 안내 없음')
            check(info['over'] <= 0, f'{w}px — 가로 스크롤 없음({info["over"]}px)')

            pb = info['pboxes'][0] if info['pboxes'] else None
            if pb:
                inside = pb['r'] <= info['vw'] + 1 and pb['x'] >= -1
                check(inside, f'{w}px — 안내가 화면 안 (x={pb["x"]:.1f}, right={pb["r"]:.1f} / {info["vw"]})')
                # 제목 아래에서 시작하고, 제목과 세로로 겹치지 않는다
                gap = pb['y'] - (info['h1box']['y'] + info['h1box']['h'])
                check(gap >= 0, f'{w}px — 제목과 겹치지 않음 (간격 {gap:.1f}px)')
                # 아래 카드(PROFILE 시트)와 겹치지 않는다
                gb = info['gridbox']
                check(gb is None or pb['b'] <= gb['y'] + 1, f'{w}px — 아래 카드와 겹치지 않음')
                lh = info['lineHeight'] or info['fontSize'] * 1.6
                lines = round(pb['h'] / lh) if lh else 0
                if w == 390:
                    check(lines <= 2, f'390px — 두 줄 안쪽 ({lines}줄, 높이 {pb["h"]:.1f}px)')
                print(f'   안내 상자 x={pb["x"]:.1f} y={pb["y"]:.1f} w={pb["w"]:.1f} h={pb["h"]:.1f} · {lines}줄')
                page.locator('.result-head').screenshot(path=os.path.join(OUT, f'{TAG}my-note-head-{w}.png'))
            if w == 390:
                page.screenshot(path=os.path.join(OUT, f'{TAG}my-note-390.png'), full_page=False)
            check(not errs, f'{w}px — 페이지 오류 없음 {errs[:2]}')
            ctx.close()

        browser.close()
    if httpd:
        httpd.shutdown()

    print()
    if FAILS:
        print(f'실패 {len(FAILS)}건')
        for f in FAILS:
            print('  -', f)
        raise SystemExit(1)
    print('전부 통과')


if __name__ == '__main__':
    main()
