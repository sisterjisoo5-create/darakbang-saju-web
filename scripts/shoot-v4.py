# -*- coding: utf-8 -*-
"""v4 검수 스크린샷 — 10종 운세 카드 그리드 · 12간지 캐릭터 · 새 리포트 잠금 해제.

산출물
  downloads/darakbang-web-desktop-v4.png   데스크톱 홈 전체
  downloads/darakbang-web-mobile-v4.png    모바일(390px) 홈 + 띠 카드 결과
  downloads/darakbang-web-result-v4.png    재회운 맛보기 → 결제 모달 → 잠금 해제 리포트
  (+ 검수용 개별 컷)
"""
import http.server
import os
import socketserver
import threading
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DIST = os.path.join(ROOT, 'dist')
OUT = os.path.abspath(os.path.join(ROOT, '..', 'downloads'))
PORT = 4179
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
        ctx = browser.new_context(viewport={'width': 1280, 'height': 900}, device_scale_factor=2,
                                  reduced_motion='reduce', locale='ko-KR')
        page = ctx.new_page()
        page.goto(base, wait_until='networkidle')
        page.add_style_tag(content=NO_ANIM)
        settle(page)

        # 카드 그리드가 화면에 다 들어오도록 상품 섹션 확인용 컷
        page.locator('#products').screenshot(path=os.path.join(OUT, 'v4-products-desktop.png'))
        print('shot v4-products-desktop.png')
        shot(page, 'darakbang-web-desktop-v4.png', full=True, prep=True)

        # 무료 맛보기 — 띠 안내 카드에 해당 띠 캐릭터
        page.click('form[data-form="birth"] button[type="submit"]')
        page.wait_for_url('**#/free')
        settle(page, 700)
        page.add_style_tag(content=NO_ANIM)
        page.wait_for_timeout(3400)   # 토스트 사라질 때까지
        shot(page, 'v4-free-desktop.png', full=True, prep=True)
        page.locator('.guide-card').screenshot(path=os.path.join(OUT, 'v4-tii-card.png'))
        print('shot v4-tii-card.png')

        # ── 재회운: 잠금 → 결제 → 잠금 해제 ──
        page.goto(base + '#/product/reunion', wait_until='networkidle')
        settle(page, 400)
        page.add_style_tag(content=NO_ANIM)
        shot(page, 'v4-reunion-locked.png', full=True, prep=True)
        page.locator('button[data-action="open-pay"][data-pid="reunion"]').first.click()
        page.wait_for_selector('.modal', timeout=5000)
        settle(page, 300)
        page.add_style_tag(content=NO_ANIM)
        page.check('input[data-action="agree-all"]')
        page.wait_for_timeout(250)
        shot(page, 'v4-payment-modal.png', full=False)
        page.click('button[data-action="submit-pay"]')
        page.wait_for_selector('button[data-action="close-and-open"]', timeout=15000)
        settle(page, 300)
        shot(page, 'v4-payment-done.png', full=False)
        page.click('button[data-action="close-and-open"]')
        page.wait_for_timeout(1700)
        page.add_style_tag(content=NO_ANIM)
        settle(page, 400)
        page.wait_for_timeout(900)
        shot(page, 'v4-reunion-unlocked.png', full=True, prep=True)

        # 부자의 조건도 열어 확인 (재물 그릇 점수 · 통로)
        page.goto(base + '#/product/wealth', wait_until='networkidle')
        settle(page, 400)
        page.add_style_tag(content=NO_ANIM)
        shot(page, 'v4-wealth-locked.png', full=True, prep=True)

        # ── 모바일 390px ──
        m = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2,
                                is_mobile=True, has_touch=True, reduced_motion='reduce', locale='ko-KR',
                                user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')
        mp = m.new_page()
        mp.goto(base, wait_until='networkidle')
        mp.add_style_tag(content=NO_ANIM)
        settle(mp)
        mp.locator('#products').screenshot(path=os.path.join(OUT, 'v4-products-mobile.png'))
        print('shot v4-products-mobile.png')
        shot(mp, 'v4-mobile-home.png', full=True, prep=True)
        mp.click('form[data-form="birth"] button[type="submit"]')
        mp.wait_for_url('**#/free')
        settle(mp, 700)
        mp.add_style_tag(content=NO_ANIM)
        mp.wait_for_timeout(3400)
        shot(mp, 'v4-mobile-result.png', full=True, prep=True)
        mp.goto(base + '#/product/reunion', wait_until='networkidle')
        settle(mp, 400)
        mp.add_style_tag(content=NO_ANIM)
        shot(mp, 'v4-mobile-reunion.png', full=True, prep=True)

        # ── 요구 산출물 합성 ──
        from PIL import Image

        # 결과: 결제 모달 + 잠금 해제된 재회운 리포트
        modal = Image.open(os.path.join(OUT, 'v4-payment-modal.png')).convert('RGB')
        a = modal.crop((0, int(modal.height * 0.05), modal.width, int(modal.height * 0.88)))
        b = Image.open(os.path.join(OUT, 'v4-reunion-unlocked.png')).convert('RGB')
        bw = b.crop((0, 0, b.width, min(b.height, 2700)))
        gap = 30
        canvas = Image.new('RGB', (a.width, a.height + gap + bw.height), BG)
        canvas.paste(a, (0, 0))
        canvas.paste(bw, (0, a.height + gap))
        canvas.save(os.path.join(OUT, 'darakbang-web-result-v4.png'), quality=94)
        print('merged darakbang-web-result-v4.png', canvas.size)

        # 모바일: 홈(2열 카드 그리드 포함) + 띠 카드 결과
        home = Image.open(os.path.join(OUT, 'v4-mobile-home.png')).convert('RGB')
        res = Image.open(os.path.join(OUT, 'v4-mobile-result.png')).convert('RGB')
        h = min(2600, home.height, res.height)
        left = home.crop((0, 0, home.width, h))
        right = res.crop((0, 0, res.width, h))
        gap = 30
        canvas = Image.new('RGB', (left.width + right.width + gap, h), BG)
        canvas.paste(left, (0, 0))
        canvas.paste(right, (left.width + gap, 0))
        canvas.save(os.path.join(OUT, 'darakbang-web-mobile-v4.png'), quality=94)
        print('merged darakbang-web-mobile-v4.png', canvas.size)

        browser.close()
    httpd.shutdown()
    print('done')


if __name__ == '__main__':
    main()
