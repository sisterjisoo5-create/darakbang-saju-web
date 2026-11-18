# -*- coding: utf-8 -*-
"""빌드 결과(dist)를 로컬 서버로 띄우고 헤드리스 Chromium으로 검수용 스크린샷을 찍는다.

사용:
    cd darakbang-saju-web
    npm run build
    python shoot.py   (또는 python3 scripts/shoot.py)

결과물은 저장소 상위의 downloads/ 로 저장된다.
"""
import http.server
import os
import socketserver
import subprocess
import sys
import threading
import time

from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DIST = os.path.join(ROOT, 'dist')
OUT = os.path.abspath(os.path.join(ROOT, '..', 'downloads'))
PORT = 4173
CHROME = '/workspace/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome'
LIBS = '/workspace/.cache/sysroot/usr/lib/x86_64-linux-gnu'

os.makedirs(OUT, exist_ok=True)


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=DIST, **kw)

    def log_message(self, *a):
        pass


def serve():
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(('127.0.0.1', PORT), Handler)
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    return httpd


NO_ANIM = "*,*::before,*::after{animation:none!important;transition:none!important}"
FULL_PREP = NO_ANIM + ".site-header{position:static!important}#toast-root{display:none!important}.report-actions{display:none!important}html{scroll-behavior:auto!important}"


def settle(page, ms=350):
    page.wait_for_timeout(ms)
    page.wait_for_function("document.fonts.status === 'loaded'")


def prep_full(page):
    page.add_style_tag(content=FULL_PREP)
    page.evaluate("window.scrollTo(0,0)")
    page.wait_for_timeout(150)


def shot(page, name, full=True, prep=False):
    page.add_style_tag(content="#toast-root{display:none!important}")
    if prep:
        prep_full(page)
    path = os.path.join(OUT, name)
    page.screenshot(path=path, full_page=full)
    print('shot', path, os.path.getsize(path) // 1024, 'KB')
    return path


def main():
    httpd = serve()
    print('serving', DIST, 'on', PORT)
    env = dict(os.environ)
    env['LD_LIBRARY_PATH'] = LIBS + ':' + env.get('LD_LIBRARY_PATH', '')

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--hide-scrollbars'], env=env)
        base = f'http://127.0.0.1:{PORT}/'

        # ── 데스크톱 ─────────────────────────────
        ctx = browser.new_context(viewport={'width': 1280, 'height': 800}, device_scale_factor=2, reduced_motion='reduce')
        page = ctx.new_page()
        page.goto(base, wait_until='networkidle')
        page.add_style_tag(content=NO_ANIM)
        settle(page)
        shot(page, 'darakbang-web-desktop.png', full=True, prep=True)
        # 뷰포트 기준 히어로 컷(추가 산출물)
        shot(page, 'darakbang-web-desktop-hero.png', full=False)

        # 무료 맛보기 (1992-10-15 07:33 여 — 폼 기본값)
        page.click('form[data-form="birth"] button[type="submit"]')
        page.wait_for_url('**#/free')
        settle(page, 600)
        page.add_style_tag(content=NO_ANIM)
        page.wait_for_timeout(3600)
        shot(page, 'darakbang-web-free-desktop.png', full=True, prep=True)

        # ── 990원 결제 모달 ──────────────────────
        page.goto(base + '#/product/saju', wait_until='networkidle')
        settle(page, 500)
        page.add_style_tag(content=NO_ANIM)
        page.click('button[data-action="open-pay"][data-pid="saju"]')
        page.wait_for_selector('.modal', timeout=5000)
        settle(page, 400)
        page.add_style_tag(content=NO_ANIM)
        shot(page, 'darakbang-web-payment.png', full=False)

        # 동의 → 테스트 결제 → 잠금 해제
        page.check('input[data-action="agree-all"]')
        page.wait_for_timeout(200)
        page.click('button[data-action="submit-pay"]')
        page.wait_for_selector('button[data-action="close-and-open"]', timeout=15000)
        settle(page, 300)
        shot(page, 'darakbang-web-payment-done.png', full=False)
        page.click('button[data-action="close-and-open"]')
        page.wait_for_timeout(1600)
        page.add_style_tag(content=NO_ANIM)
        settle(page, 400)
        page.wait_for_timeout(1200)
        shot(page, 'darakbang-web-unlocked.png', full=True, prep=True)

        # 결제창 + 잠금 해제 화면을 한 장으로 합성 (요구 산출물)
        from PIL import Image
        a = Image.open(os.path.join(OUT, 'darakbang-web-payment.png'))
        b = Image.open(os.path.join(OUT, 'darakbang-web-unlocked.png'))
        b = b.crop((0, 0, b.width, min(b.height, int(b.width * 1.15))))
        gap = 24
        canvas = Image.new('RGB', (a.width, a.height + gap + b.height), (14, 19, 32))
        canvas.paste(a, (0, 0))
        canvas.paste(b, (0, a.height + gap))
        merged = os.path.join(OUT, 'darakbang-web-result.png')
        canvas.save(merged, quality=92)
        print('merged', merged, os.path.getsize(merged) // 1024, 'KB', canvas.size)

        # ── 모바일 ──────────────────────────────
        m = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2,
                                is_mobile=True, has_touch=True, reduced_motion='reduce',
                                user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')
        mp = m.new_page()
        mp.goto(base, wait_until='networkidle')
        mp.add_style_tag(content=NO_ANIM)
        settle(mp)
        shot(mp, 'darakbang-web-mobile-home.png', full=True, prep=True)
        mp.click('form[data-form="birth"] button[type="submit"]')
        mp.wait_for_url('**#/free')
        settle(mp, 600)
        mp.add_style_tag(content=NO_ANIM)
        mp.wait_for_timeout(3600)
        shot(mp, 'darakbang-web-mobile-result.png', full=True, prep=True)

        # 요구 산출물: '모바일 메인 + 무료 맛보기 결과' 한 장 (390pt 두 화면 나란히)
        from PIL import Image as _Img
        home = _Img.open(os.path.join(OUT, 'darakbang-web-mobile-home.png'))
        res = _Img.open(os.path.join(OUT, 'darakbang-web-mobile-result.png'))
        h = min(2700, home.height, res.height)
        a = home.crop((0, 0, home.width, h))
        b = res.crop((0, 0, res.width, h))
        gap = 28
        canvas = _Img.new('RGB', (a.width + b.width + gap, h), (14, 19, 32))
        canvas.paste(a, (0, 0))
        canvas.paste(b, (a.width + gap, 0))
        merged_m = os.path.join(OUT, 'darakbang-web-mobile.png')
        canvas.save(merged_m, quality=92)
        print('merged', merged_m, os.path.getsize(merged_m) // 1024, 'KB', canvas.size)

        # 결제 후 리포트 모바일
        mp.goto(base + '#/product/newyear', wait_until='networkidle')
        settle(mp, 400)
        mp.add_style_tag(content=NO_ANIM)
        shot(mp, 'darakbang-web-mobile-product.png', full=True, prep=True)

        # 궁합 리포트(상대 입력 후, 잠금 상태)
        mp.goto(base + '#/product/compat', wait_until='networkidle')
        settle(mp, 300)
        if mp.query_selector('form[data-form="partner"]'):
            mp.click('form[data-form="partner"] button[type=submit]')
            mp.wait_for_timeout(800)
        mp.add_style_tag(content=NO_ANIM)
        shot(mp, 'darakbang-web-compat.png', full=True, prep=True)

        # 내 다락방
        mp.goto(base + '#/my', wait_until='networkidle')
        settle(mp, 300)
        mp.add_style_tag(content=NO_ANIM)
        shot(mp, 'darakbang-web-mypage.png', full=True, prep=True)

        # 약관 모달
        mp.goto(base + '#/my', wait_until='networkidle')
        settle(mp, 400)
        mp.click('button[data-action="legal"][data-doc="refund"]')
        mp.wait_for_selector('.modal', timeout=5000)
        settle(mp, 300)
        shot(mp, 'darakbang-web-legal.png', full=False)

        browser.close()

    httpd.shutdown()
    print('done')


if __name__ == '__main__':
    main()
