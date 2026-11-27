# -*- coding: utf-8 -*-
"""3층 다락방 AI 오피스(public/office) 검수용 스크린샷.

비밀번호 잠금(2026-11-27) 이후: 잠금 화면 → 틀린 비밀번호 안내 → 해제 후 5탭을 찍는다.
비밀번호는 인자 또는 OFFICE_PASSWORD 환경변수로 넘긴다(코드에 두지 않는다).

사용:
    OFFICE_PASSWORD=... python3 scripts/office-shot.py            # public/office 를 그대로 서빙
    OFFICE_PASSWORD=... python3 scripts/office-shot.py --dist     # dist/office 를 서빙

결과물은 상위 폴더의 downloads/office/ 로 저장한다.
"""
import http.server
import os
import socketserver
import sys
import threading

from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SERVE = os.path.join(ROOT, 'dist' if '--dist' in sys.argv else 'public')
OUT = os.path.abspath(os.path.join(ROOT, '..', 'downloads', 'office'))
PORT = 4188
CHROME = '/workspace/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell'
LIBS = '/workspace/.cache/sysroot/usr/lib/x86_64-linux-gnu'
PW = os.environ.get('OFFICE_PASSWORD', '')

os.makedirs(OUT, exist_ok=True)


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=SERVE, **kw)

    def log_message(self, *a):
        pass


def main():
    if not PW:
        sys.exit('OFFICE_PASSWORD 환경변수에 오피스 비밀번호를 넘겨 주세요.')
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(('127.0.0.1', PORT), Handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{PORT}/office/index.html'

    with sync_playwright() as p:
        env = os.environ.copy()
        env['LD_LIBRARY_PATH'] = LIBS + ':' + env.get('LD_LIBRARY_PATH', '')
        browser = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--hide-scrollbars'], env=env)

        # ── 잠금 화면 (데스크톱) ──
        page = browser.new_page(viewport={'width': 1440, 'height': 980}, device_scale_factor=1)
        page.goto(base, wait_until='networkidle')
        page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(OUT, 'shot-lock-desktop.png'))

        # ── 틀린 비밀번호 ──
        page.fill('#lockPw', '000000')
        page.click('#lockBtn')
        page.wait_for_timeout(1200)
        page.screenshot(path=os.path.join(OUT, 'shot-lock-wrong.png'))
        print('wrong-pw msg:', page.inner_text('#lockMsg'))

        # ── 해제 ──
        page.fill('#lockPw', PW)
        page.click('#lockBtn')
        page.wait_for_selector('#lockScreen.hidden', state='attached', timeout=10000)
        page.wait_for_timeout(600)
        print('sessionStorage key:', bool(page.evaluate("() => sessionStorage.getItem('darakbang.office.key')")))
        page.screenshot(path=os.path.join(OUT, 'shot-desktop-map.png'), full_page=True)

        for tab in ('meet', 'work', 'stats', 'memo'):
            page.click(f'[data-tab="{tab}"]')
            page.wait_for_timeout(400)
            page.screenshot(path=os.path.join(OUT, f'shot-desktop-{tab}.png'), full_page=True)

        page.click('[data-tab="map"]')
        page.wait_for_timeout(300)
        page.click('[data-deptrow="settlement"]')
        page.wait_for_timeout(400)
        page.screenshot(path=os.path.join(OUT, 'shot-desktop-detail.png'), full_page=True)

        page.click('[data-view="pixel"]')
        page.wait_for_timeout(400)
        page.screenshot(path=os.path.join(OUT, 'shot-desktop-plan.png'), full_page=True)
        page.close()

        # ── 모바일 잠금 · 해제 ──
        m = browser.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True)
        m.goto(base, wait_until='networkidle')
        m.wait_for_timeout(500)
        m.screenshot(path=os.path.join(OUT, 'shot-mobile-lock.png'))
        m.fill('#lockPw', PW)
        m.click('#lockBtn')
        m.wait_for_selector('#lockScreen.hidden', state='attached', timeout=10000)
        m.wait_for_timeout(700)
        m.screenshot(path=os.path.join(OUT, 'shot-mobile-map.png'), full_page=True)
        m.close()
        browser.close()

    httpd.shutdown()
    print('saved to', OUT)


if __name__ == '__main__':
    main()
