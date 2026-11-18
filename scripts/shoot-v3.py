# -*- coding: utf-8 -*-
"""밤의 다락방(다크모드) 디자인 검수용 스크린샷 (v3)."""
import http.server
import os
import socketserver
import threading
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DIST = os.path.join(ROOT, 'dist')
OUT = os.path.abspath(os.path.join(ROOT, '..', 'downloads'))
PORT = 4178
CHROME = '/workspace/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome'
LIBS = '/workspace/.cache/sysroot/usr/lib/x86_64-linux-gnu'
BG = (11, 16, 32)

os.makedirs(OUT, exist_ok=True)


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=DIST, **kw)

    def log_message(self, *a):
        pass


def serve():
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(('127.0.0.1', PORT), Handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


NO_ANIM = "*,*::before,*::after{animation:none!important;transition:none!important}"
FULL_PREP = NO_ANIM + ".site-header{position:static!important}#toast-root{display:none!important}.report-actions{display:none!important}html{scroll-behavior:auto!important}"


def settle(page, ms=350):
    page.wait_for_timeout(ms)
    page.wait_for_function("document.fonts.status === 'loaded'")


def shot(page, name, full=True, prep=False):
    page.add_style_tag(content="#toast-root{display:none!important}")
    if prep:
        page.add_style_tag(content=FULL_PREP)
        page.evaluate("window.scrollTo(0,0)")
        page.wait_for_timeout(150)
    path = os.path.join(OUT, name)
    page.screenshot(path=path, full_page=full)
    print('shot', path, os.path.getsize(path) // 1024, 'KB')
    return path


def main():
    httpd = serve()
    env = dict(os.environ)
    env['LD_LIBRARY_PATH'] = LIBS + ':' + env.get('LD_LIBRARY_PATH', '')
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--hide-scrollbars'], env=env)
        base = f'http://127.0.0.1:{PORT}/'

        # ── 데스크톱 ──
        ctx = browser.new_context(viewport={'width': 1280, 'height': 800}, device_scale_factor=2, reduced_motion='reduce', locale='ko-KR')
        page = ctx.new_page()
        page.goto(base, wait_until='networkidle')
        page.add_style_tag(content=NO_ANIM)
        settle(page)
        shot(page, 'v3-desktop-hero.png', full=False)
        shot(page, 'darakbang-web-desktop-v3.png', full=True, prep=True)

        # 무료 맛보기 (폼 기본값 1992-10-15 07:33 여)
        page.click('form[data-form="birth"] button[type="submit"]')
        page.wait_for_url('**#/free')
        settle(page, 600)
        page.add_style_tag(content=NO_ANIM)
        page.wait_for_timeout(3200)
        shot(page, 'v3-free-desktop.png', full=True, prep=True)

        # ── 결제 모달 ──
        page.goto(base + '#/product/saju', wait_until='networkidle')
        settle(page, 400)
        page.add_style_tag(content=NO_ANIM)
        shot(page, 'v3-product-locked.png', full=True, prep=True)
        page.locator('button[data-action="open-pay"][data-pid="saju"]').first.click()
        page.wait_for_selector('.modal', timeout=5000)
        settle(page, 300)
        page.add_style_tag(content=NO_ANIM)
        shot(page, 'v3-payment-modal.png', full=False)
        page.check('input[data-action="agree-all"]')
        page.wait_for_timeout(200)
        page.click('button[data-action="submit-pay"]')
        page.wait_for_selector('button[data-action="close-and-open"]', timeout=15000)
        settle(page, 300)
        shot(page, 'v3-payment-done.png', full=False)
        page.click('button[data-action="close-and-open"]')
        page.wait_for_timeout(1600)
        page.add_style_tag(content=NO_ANIM)
        settle(page, 400)
        page.wait_for_timeout(1000)
        shot(page, 'v3-unlocked.png', full=True, prep=True)

        # FAQ 열기 · 약관 모달
        page.goto(base, wait_until='networkidle')
        settle(page, 300)
        page.add_style_tag(content=NO_ANIM)
        page.click('button[data-action="faq"][data-i="0"]')
        page.wait_for_timeout(200)
        page.click('button[data-action="legal"][data-doc="refund"]')
        page.wait_for_selector('.modal', timeout=5000)
        settle(page, 300)
        shot(page, 'v3-legal-modal.png', full=False)
        page.click('button[data-action="close-modal"]')

        # ── 모바일 ──
        m = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2,
                                is_mobile=True, has_touch=True, reduced_motion='reduce', locale='ko-KR',
                                user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')
        mp = m.new_page()
        mp.goto(base, wait_until='networkidle')
        mp.add_style_tag(content=NO_ANIM)
        settle(mp)
        shot(mp, 'v3-mobile-home.png', full=True, prep=True)
        mp.click('form[data-form="birth"] button[type="submit"]')
        mp.wait_for_url('**#/free')
        settle(mp, 600)
        mp.add_style_tag(content=NO_ANIM)
        mp.wait_for_timeout(3200)
        shot(mp, 'v3-mobile-result.png', full=True, prep=True)
        mp.goto(base + '#/product/saju', wait_until='networkidle')
        settle(mp, 400)
        # 모바일 결제 모달
        mp.locator('button[data-action="open-pay"][data-pid="saju"]').first.click()
        mp.wait_for_selector('.modal', timeout=5000)
        settle(mp, 300)
        shot(mp, 'v3-mobile-modal.png', full=False)
        mp.click('button[data-action="close-modal"]')
        mp.goto(base + '#/my', wait_until='networkidle')
        settle(mp, 300)
        mp.add_style_tag(content=NO_ANIM)
        shot(mp, 'v3-mobile-my.png', full=True, prep=True)

        # ── 요구 산출물 합성 ──
        from PIL import Image

        # 결제 모달 + 잠금 해제 리포트 (세로로 이어 붙임)
        a = Image.open(os.path.join(OUT, 'v3-payment-modal.png')).convert('RGB')
        b = Image.open(os.path.join(OUT, 'v3-unlocked.png')).convert('RGB')
        bw = b.crop((0, 0, b.width, min(b.height, 2600)))
        gap = 28
        canvas = Image.new('RGB', (a.width, a.height + gap + bw.height), BG)
        canvas.paste(a, (0, 0))
        canvas.paste(bw, (0, a.height + gap))
        merged = os.path.join(OUT, 'darakbang-web-result-v3.png')
        canvas.save(merged, quality=94)
        print('merged', merged, os.path.getsize(merged) // 1024, 'KB', canvas.size)

        # 모바일 메인 + 무료 맛보기 결과 (나란히)
        home = Image.open(os.path.join(OUT, 'v3-mobile-home.png')).convert('RGB')
        res = Image.open(os.path.join(OUT, 'v3-mobile-result.png')).convert('RGB')
        h = min(2500, home.height, res.height)
        a = home.crop((0, 0, home.width, h))
        b = res.crop((0, 0, res.width, h))
        gap = 28
        canvas = Image.new('RGB', (a.width + b.width + gap, h), BG)
        canvas.paste(a, (0, 0))
        canvas.paste(b, (a.width + gap, 0))
        merged_m = os.path.join(OUT, 'darakbang-web-mobile-v3.png')
        canvas.save(merged_m, quality=94)
        print('merged', merged_m, os.path.getsize(merged_m) // 1024, 'KB', canvas.size)

        browser.close()
    httpd.shutdown()
    print('done')


if __name__ == '__main__':
    main()
