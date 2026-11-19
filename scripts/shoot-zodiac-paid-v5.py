# -*- coding: utf-8 -*-
"""12띠 × 일주 매력(990원) — 무료 맛보기 카드 · 상품 페이지 · 결제 모달 검수 (로컬 dist)."""
import http.server, os, socketserver, threading, time
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DIST = os.path.join(ROOT, 'dist')
OUT = os.path.abspath(os.path.join(ROOT, '..', 'downloads'))
PORT = 4191
BASE_PATH = '/darakbang-saju-web'
CHROME = '/workspace/.cache/ms-playwright/chrome-linux64/chrome'
LIBS = '/workspace/.cache/sysroot/usr/lib/x86_64-linux-gnu'
NO = "*,*::before,*::after{animation:none!important;transition:none!important}"
PREP = NO + ".site-header{position:static!important}#toast-root{display:none!important}.report-actions{display:none!important}html{scroll-behavior:auto!important}"


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=DIST, **kw)

    def translate_path(self, path):
        if path.startswith(BASE_PATH + '/'):
            path = path[len(BASE_PATH):]
        return super().translate_path(path)

    def log_message(self, *a):
        pass


socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(('127.0.0.1', PORT), Handler)
threading.Thread(target=httpd.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{PORT}{BASE_PATH}/'
os.environ['LD_LIBRARY_PATH'] = LIBS + ':' + os.environ.get('LD_LIBRARY_PATH', '')

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--hide-scrollbars'])
    for label, vp, mobile in [('desktop', {'width': 1280, 'height': 900}, False), ('mobile', {'width': 390, 'height': 844}, True)]:
        ctx = b.new_context(viewport=vp, device_scale_factor=2, reduced_motion='reduce', locale='ko-KR',
                            is_mobile=mobile, has_touch=mobile)
        pg = ctx.new_page()
        pg.goto(base, wait_until='networkidle')
        pg.add_style_tag(content=NO)
        pg.wait_for_timeout(700)
        # 홈 03 카드
        if label == 'desktop':
            pg.locator('.card', has_text='띠 × 일주 동물').first.screenshot(path=os.path.join(OUT, 'paid-v5-card03.png'))
        # 무료 원국 → 맛보기 카드
        pg.click('form[data-form="birth"] button[type="submit"]')
        pg.wait_for_url('**#/free')
        pg.add_style_tag(content=PREP)
        pg.wait_for_timeout(1600)
        teaser = pg.locator('.zi-teaser').first
        teaser.scroll_into_view_if_needed()
        pg.wait_for_timeout(250)
        teaser.screenshot(path=os.path.join(OUT, f'paid-v5-teaser-{label}.png'))
        # 상품 페이지
        pg.goto(base + '#/product/zodiac-ilju', wait_until='networkidle')
        pg.add_style_tag(content=PREP)
        pg.wait_for_timeout(900)
        pg.screenshot(path=os.path.join(OUT, f'paid-v5-product-{label}.png'), full_page=True)
        # 결제 모달 (열기만, 제출하지 않음)
        pg.locator('button[data-action="open-pay"][data-pid="zodiac-ilju"]').first.click()
        pg.wait_for_selector('.modal', timeout=8000)
        pg.wait_for_timeout(700)
        pg.screenshot(path=os.path.join(OUT, f'paid-v5-modal-{label}.png'))
        print(label, 'modal text:', pg.locator('.modal').inner_text()[:300].replace('\n', ' | '))
        pg.keyboard.press('Escape')
        # 열람 상태 렌더링 확인 — 결제 없이 로컬 저장소의 잠금 해제 플래그만 세워 본다(실결제 아님)
        pg.evaluate("""() => { const k = 'darakbang.v2'; const d = JSON.parse(localStorage.getItem(k) || '{}'); d.unlocks = { ...(d.unlocks || {}), 'zodiac-ilju': 'LOCAL-RENDER-CHECK' }; localStorage.setItem(k, JSON.stringify(d)); }""")
        pg.goto(base + '#/product/zodiac-ilju', wait_until='networkidle')
        pg.add_style_tag(content=PREP)
        pg.wait_for_timeout(900)
        pg.screenshot(path=os.path.join(OUT, f'paid-v5-unlocked-{label}.png'), full_page=True)
        print(label, 'unlocked lock-bands:', pg.locator('.lock-band, .lock-wrap').count(), 'sections:', pg.locator('.sheet.rp').count())
        ctx.close()
    b.close()
httpd.shutdown()
print('done')
