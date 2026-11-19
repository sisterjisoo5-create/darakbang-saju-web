# -*- coding: utf-8 -*-
"""무료 원국 개편 검수 스크린샷 — 02. 오행 온도계 설명 · 12띠 × 일주 동물 · 자미두수 슬림(명궁/신궁/부처궁).

산출물 (workspace/downloads)
  darakbang-free-v5-desktop.png   무료 원국 전체 (PC 1280)
  darakbang-free-v5-mobile.png    무료 원국 전체 (모바일 390)
  darakbang-free-v5-home-cards.png  홈 [결제 없이 먼저 확인하세요] 카드 4장
  darakbang-free-v5-temp.png      02. 오행 온도 영역
  darakbang-free-v5-zi.png        12띠 × 일주 동물 영역
  darakbang-free-v5-jami.png      슬림 자미두수 카드
"""
import http.server
import os
import socketserver
import threading
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DIST = os.path.join(ROOT, 'dist')
OUT = os.path.abspath(os.path.join(ROOT, '..', 'downloads'))
PORT = 4187
CHROME = '/workspace/.cache/ms-playwright/chrome-linux64/chrome'
LIBS = '/workspace/.cache/sysroot/usr/lib/x86_64-linux-gnu'

os.makedirs(OUT, exist_ok=True)


BASE_PATH = '/darakbang-saju-web'


class Handler(http.server.SimpleHTTPRequestHandler):
    """빌드 산출물의 절대경로(/darakbang-saju-web/...)를 dist 로 매핑한다."""

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
PREP = NO_ANIM + ".site-header{position:static!important}#toast-root{display:none!important}.report-actions{display:none!important}html{scroll-behavior:auto!important}"


def settle(page, ms=400):
    page.wait_for_timeout(ms)
    page.wait_for_function("document.fonts.status === 'loaded'")


def overflow(page, label):
    r = page.evaluate("""() => {
      const d = document.documentElement;
      const wide = [...document.querySelectorAll('body *')]
        .filter(el => el.getBoundingClientRect().right > d.clientWidth + 2)
        .slice(0, 5).map(el => el.className || el.tagName);
      return { scrollW: d.scrollWidth, clientW: d.clientWidth, wide };
    }""")
    print(f'[{label}] scrollWidth={r["scrollW"]} clientWidth={r["clientW"]} overflow={r["wide"]}')
    return r


def open_free(page, base):
    page.goto(base, wait_until='networkidle')
    page.add_style_tag(content=NO_ANIM)
    settle(page)
    page.click('form[data-form="birth"] button[type="submit"]')
    page.wait_for_url('**#/free')
    settle(page, 800)
    page.add_style_tag(content=PREP)
    page.wait_for_timeout(1200)


def main():
    httpd = serve()
    env = dict(os.environ)
    env['LD_LIBRARY_PATH'] = LIBS + ':' + env.get('LD_LIBRARY_PATH', '')
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--hide-scrollbars'], env=env)
        base = f'http://127.0.0.1:{PORT}{BASE_PATH}/'

        # ── 데스크톱 ──
        ctx = browser.new_context(viewport={'width': 1280, 'height': 900}, device_scale_factor=2,
                                  reduced_motion='reduce', locale='ko-KR')
        page = ctx.new_page()
        page.goto(base, wait_until='networkidle')
        page.add_style_tag(content=NO_ANIM)
        settle(page)
        card02 = page.locator('.card', has_text='오행 온도계').first
        card02.screenshot(path=os.path.join(OUT, 'darakbang-free-v5-card02.png'))
        page.locator('.grid--4').first.screenshot(path=os.path.join(OUT, 'darakbang-free-v5-home-cards.png'))
        print('shot home cards')

        open_free(page, base)
        overflow(page, 'desktop free')
        page.screenshot(path=os.path.join(OUT, 'darakbang-free-v5-desktop.png'), full_page=True)

        # 오행 온도 영역
        temp = page.locator('.sheet h3', has_text='오행 온도').first
        temp.scroll_into_view_if_needed()
        box = temp.bounding_box()
        page.screenshot(path=os.path.join(OUT, 'darakbang-free-v5-temp.png'),
                        clip={'x': box['x'] - 10, 'y': box['y'] - 10, 'width': 1180, 'height': 430})
        # 12띠 × 일주
        zi = page.locator('h3', has_text='12띠 × 일주 동물').first
        zi.scroll_into_view_if_needed()
        page.wait_for_timeout(200)
        el = page.locator('.zi__faces').first
        top = el.bounding_box()['y']
        page.screenshot(path=os.path.join(OUT, 'darakbang-free-v5-zi.png'),
                        clip={'x': 40, 'y': top - 90, 'width': 1200, 'height': 1500})
        # 자미두수 슬림
        jami = page.locator('.jami3').first
        jami.scroll_into_view_if_needed()
        page.wait_for_timeout(200)
        jb = jami.bounding_box()
        page.screenshot(path=os.path.join(OUT, 'darakbang-free-v5-jami.png'),
                        clip={'x': jb['x'] - 34, 'y': jb['y'] - 120, 'width': jb['width'] + 68, 'height': jb['height'] + 210})
        print('shot desktop sections')

        # ── 모바일 390 ──
        m = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2,
                                is_mobile=True, has_touch=True, reduced_motion='reduce', locale='ko-KR',
                                user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')
        mp = m.new_page()
        open_free(mp, base)
        overflow(mp, 'mobile free')
        mp.screenshot(path=os.path.join(OUT, 'darakbang-free-v5-mobile.png'), full_page=True)
        zi = mp.locator('h3', has_text='12띠 × 일주 동물').first
        zi.scroll_into_view_if_needed()
        mp.wait_for_timeout(250)
        ztop = mp.locator('.zi__faces').first.bounding_box()['y']
        mp.screenshot(path=os.path.join(OUT, 'darakbang-free-v5-zi-mobile.png'),
                      clip={'x': 0, 'y': ztop - 80, 'width': 390, 'height': 1500})
        jami = mp.locator('.jami3').first
        jami.scroll_into_view_if_needed()
        mp.wait_for_timeout(250)
        jb = jami.bounding_box()
        mp.screenshot(path=os.path.join(OUT, 'darakbang-free-v5-jami-mobile.png'),
                      clip={'x': 0, 'y': jb['y'] - 110, 'width': 390, 'height': jb['height'] + 220})
        print('shot mobile sections')

        browser.close()
    httpd.shutdown()
    print('done')


if __name__ == '__main__':
    main()
