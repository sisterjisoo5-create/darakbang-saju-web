# -*- coding: utf-8 -*-
"""3층 다락방 AI 오피스(public/office) 검수용 스크린샷.

사용:
    python3 scripts/office-shot.py            # public/office 를 그대로 서빙
    python3 scripts/office-shot.py --dist     # dist/office 를 서빙

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

os.makedirs(OUT, exist_ok=True)


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=SERVE, **kw)

    def log_message(self, *a):
        pass


def main():
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(('127.0.0.1', PORT), Handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{PORT}/office/index.html'

    with sync_playwright() as p:
        env = os.environ.copy()
        env['LD_LIBRARY_PATH'] = LIBS + ':' + env.get('LD_LIBRARY_PATH', '')
        browser = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--hide-scrollbars'], env=env)
        # 데스크톱
        page = browser.new_page(viewport={'width': 1440, 'height': 980}, device_scale_factor=1)
        page.goto(base, wait_until='networkidle')
        page.wait_for_timeout(700)
        page.screenshot(path=os.path.join(OUT, 'shot-desktop-map.png'), full_page=True)

        page.click('[data-tab="meet"]')
        page.wait_for_timeout(400)
        page.screenshot(path=os.path.join(OUT, 'shot-desktop-meet.png'), full_page=True)

        page.click('[data-tab="work"]')
        page.wait_for_timeout(400)
        page.screenshot(path=os.path.join(OUT, 'shot-desktop-work.png'), full_page=True)

        page.click('[data-tab="stats"]')
        page.wait_for_timeout(400)
        page.screenshot(path=os.path.join(OUT, 'shot-desktop-stats.png'), full_page=True)

        page.click('[data-tab="memo"]')
        page.wait_for_timeout(400)
        page.screenshot(path=os.path.join(OUT, 'shot-desktop-memo.png'), full_page=True)

        # 맵 상세 클릭(부서 하나)
        page.click('[data-tab="map"]')
        page.wait_for_timeout(300)
        page.click('[data-deptrow="darak"]')
        page.wait_for_timeout(400)
        page.screenshot(path=os.path.join(OUT, 'shot-desktop-detail.png'), full_page=True)

        # 기본(2D) 뷰
        page.click('[data-view="pixel"]')
        page.wait_for_timeout(400)
        page.screenshot(path=os.path.join(OUT, 'shot-desktop-plan.png'), full_page=True)

        page.close()

        # 모바일
        m = browser.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True)
        m.goto(base, wait_until='networkidle')
        m.wait_for_timeout(700)
        m.screenshot(path=os.path.join(OUT, 'shot-mobile-map.png'), full_page=True)
        m.close()
        browser.close()

    httpd.shutdown()
    print('saved to', OUT)


if __name__ == '__main__':
    main()
