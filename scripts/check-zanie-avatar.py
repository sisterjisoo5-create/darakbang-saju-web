# -*- coding: utf-8 -*-
"""브랜드 아바타(시크 밤하늘 자니) 검수 — 2026-11-23 시연 님 지시.

확인 항목
  · 헤더 · 푸터 로고(.brand__mark)가 images/zanie-profile.webp 를 원형으로 꽉 채워 보여 준다
  · 생년월일시 입력 화면 상단(.input-page__jani)도 같은 아바타 · 원형 크롭
  · 리포트 화면(무료 결과 · 유료 상품) 헤더도 같은 아바타
  · 12간지 미니 아이콘(zodiac/jani-cut.webp)은 그대로 — 카드 안 캐릭터는 바뀌지 않는다
  · 파비콘(favicon.png) 200 응답 · 128×128
  · 1280 / 390 폭 가로 넘침 0 · 콘솔 오류 0

사용
  python3 scripts/check-zanie-avatar.py           # dist 로컬
  SITE=1 python3 scripts/check-zanie-avatar.py    # 라이브(GitHub Pages)
"""
import http.server
import os
import socketserver
import threading
import time

from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DIST = os.path.join(ROOT, 'dist')
OUT = os.path.abspath(os.path.join(ROOT, '..', 'downloads', 'zanie-avatar-check'))
PORT = 4371
CHROME = '/workspace/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell'
LIBS = ':'.join([
    '/workspace/tmp/libs/usr/lib/x86_64-linux-gnu',
    '/workspace/.cache/sysroot/usr/lib/x86_64-linux-gnu',
])
BASE_PATH = '/darakbang-saju-web'
LIVE = os.environ.get('SITE', '').strip()
LIVE_URL = 'https://sisterjisoo5-create.github.io/darakbang-saju-web/'
TAG = 'live-' if LIVE else 'dist-'
BUST = '?v=' + str(int(time.time())) if LIVE else ''

os.makedirs(OUT, exist_ok=True)
FAILS = []

ME = {'year': '1991', 'month': '05', 'day': '07', 'hour': '18', 'minute': '22'}


def check(ok, label):
    print(('  ok   ' if ok else '  FAIL ') + label)
    if not ok:
        FAILS.append(label)


def serve():
    class H(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **k):
            super().__init__(*a, directory=DIST, **k)

        def translate_path(self, path):
            if path.startswith(BASE_PATH + '/'):
                path = path[len(BASE_PATH):]
            return super().translate_path(path)

        def log_message(self, *a):
            pass

    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(('127.0.0.1', PORT), H)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


MARK_JS = """(sel) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const img = el.querySelector('img');
  const cs = getComputedStyle(el);
  const ics = img ? getComputedStyle(img) : null;
  const box = el.getBoundingClientRect();
  const ib = img ? img.getBoundingClientRect() : null;
  return {
    radius: cs.borderRadius,
    overflow: cs.overflow,
    w: Math.round(box.width), h: Math.round(box.height),
    innerW: el.clientWidth, innerH: el.clientHeight,
    imgW: ib ? Math.round(ib.width) : 0,
    imgH: ib ? Math.round(ib.height) : 0,
    natural: img ? img.naturalWidth : 0,
    fit: ics ? ics.objectFit : null,
    src: img ? img.currentSrc.split('/').slice(-1)[0] : '',
    complete: img ? img.complete : false,
    opacity: cs.opacity,
  };
}"""


def report(page, label, sel):
    m = page.evaluate(MARK_JS, sel)
    print(f'  · {label}: {m}')
    ok = bool(m) and m['natural'] == 320 and m['src'].endswith('zanie-profile.webp')
    ok = ok and m['fit'] == 'cover' and m['complete']
    # 테두리(1px 금빛 링) 안쪽을 이미지가 남김없이 채운다
    ok = ok and abs(m['imgW'] - m['innerW']) <= 1 and abs(m['imgH'] - m['innerH']) <= 1
    ok = ok and (m['radius'].startswith('50%') or float(m['radius'].replace('px', '')) >= m['w'] / 2 - 1)
    ok = ok and m['overflow'] in ('hidden', 'clip')
    check(ok, f'{label} — 원형 · 이미지 꽉 채움')
    return m


def main():
    httpd = serve()
    base = f'http://127.0.0.1:{PORT}{BASE_PATH}/'
    url = LIVE_URL if LIVE else base
    suffix = BUST + ('&' if '?' in BUST else '?')
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=CHROME,
            args=['--no-sandbox', '--disable-dev-shm-usage'],
            env={**os.environ, 'LD_LIBRARY_PATH': LIBS},
        )
        for width, height in ((1280, 900), (390, 844)):
            ctx = browser.new_context(viewport={'width': width, 'height': height}, device_scale_factor=2)
            page = ctx.new_page()
            errors = []
            page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
            page.on('pageerror', lambda e: errors.append(str(e)))

            # 1) 홈 — 헤더 로고
            page.goto(f'{url}{suffix}', wait_until='networkidle')
            page.wait_for_selector('.brand__mark img')
            header = report(page, f'{width} 홈 헤더', '.site-header .brand__mark')
            page.locator('.site-header').screenshot(path=os.path.join(OUT, f'{TAG}{width}-header.png'))

            # 2) 푸터 로고
            page.locator('.site-footer').scroll_into_view_if_needed()
            report(page, f'{width} 푸터', '.site-footer .brand__mark')

            # 3) 입력 화면 상단
            page.goto(f'{url}{suffix}#/input', wait_until='networkidle')
            page.wait_for_selector('.input-page__jani img')
            inp = report(page, f'{width} 입력 화면', '.input-page__jani')
            page.locator('.input-page__head').screenshot(path=os.path.join(OUT, f'{TAG}{width}-input.png'))
            check(abs(inp['w'] - (84 if width == 1280 else 64)) <= 1, f'{width} 입력 아바타 크기 {inp["w"]}px')
            check(not page.evaluate('() => document.documentElement.scrollWidth > window.innerWidth'),
                  f'{width} 입력 화면 가로 넘침 없음')

            # 4) 무료 결과(리포트) 헤더 + 12간지 카드 아이콘은 그대로
            for k, v in ME.items():
                page.fill(f'form[data-form="birth"] input[name="{k}"]', v)
            page.click('form[data-form="birth"] button[type="submit"]')
            page.wait_for_selector('.result-page', timeout=15000)
            report(page, f'{width} 무료 결과 헤더', '.site-header .brand__mark')
            zodiac_src = page.evaluate(
                "() => { const i = document.querySelector('.zi-teaser__badge img, .jani-badge__img');"
                " return i ? i.currentSrc.split('/').slice(-2).join('/') : null; }")
            check(bool(zodiac_src) and 'zodiac/' in zodiac_src, f'{width} 12간지 아이콘 유지 ({zodiac_src})')
            page.locator('.site-header').screenshot(path=os.path.join(OUT, f'{TAG}{width}-result-header.png'))
            check(not page.evaluate('() => document.documentElement.scrollWidth > window.innerWidth'),
                  f'{width} 결과 화면 가로 넘침 없음')

            # 5) 유료 상품 리포트 헤더 (검수 미리보기)
            page.goto(f'{url}{suffix}&preview=3f990#/product/saju', wait_until='networkidle')
            if page.locator('form[data-form="birth"]').count():
                for k, v in ME.items():
                    page.fill(f'form[data-form="birth"] input[name="{k}"]', v)
                page.click('form[data-form="birth"] button[type="submit"]')
                page.wait_for_selector('.result-page', timeout=15000)
            report(page, f'{width} 유료 리포트 헤더', '.site-header .brand__mark')

            # 6) 파비콘
            page.goto(f'{url}{suffix}', wait_until='networkidle')
            icon = page.evaluate(
                "() => { const l = document.querySelector('link[rel=\"icon\"]'); return l ? l.href : null; }")
            info = page.evaluate(
                """async (href) => {
                    const r = await fetch(href, { cache: 'no-store' });
                    const b = await r.blob();
                    const bmp = await createImageBitmap(b);
                    return { status: r.status, type: r.headers.get('content-type'), w: bmp.width, h: bmp.height };
                }""", icon)
            print(f'  · 파비콘: {icon} {info}')
            check(info['status'] == 200 and info['type'] and 'png' in info['type'] and info['w'] == 128,
                  f'{width} 파비콘 128×128 PNG 200')

            check(not errors, f'{width} 콘솔 오류 없음 {errors[:2]}')
            ctx.close()
        browser.close()
    if not LIVE:
        httpd.shutdown()
    print('\n' + ('ALL PASS' if not FAILS else f'FAIL {len(FAILS)}: {FAILS}'))
    return 0 if not FAILS else 1


if __name__ == '__main__':
    raise SystemExit(main())
