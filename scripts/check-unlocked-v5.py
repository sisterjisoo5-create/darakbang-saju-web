# -*- coding: utf-8 -*-
"""열람 상태 렌더링 확인 — 결제 없이 로컬 저장소의 잠금 해제 플래그만 세워 본다(실결제 아님)."""
import http.server, os, socketserver, threading
from playwright.sync_api import sync_playwright

DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'dist'))
OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'downloads'))
BASE = '/darakbang-saju-web'; PORT = 4207
CHROME = '/workspace/.cache/ms-playwright/chrome-linux64/chrome'
os.environ['LD_LIBRARY_PATH'] = '/workspace/.cache/sysroot/usr/lib/x86_64-linux-gnu:' + os.environ.get('LD_LIBRARY_PATH', '')


class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=DIST, **kw)

    def translate_path(self, path):
        if path.startswith(BASE + '/'):
            path = path[len(BASE):]
        return super().translate_path(path)

    def log_message(self, *a):
        pass


socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(('127.0.0.1', PORT), H)
threading.Thread(target=httpd.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{PORT}{BASE}/'
NO = "*,*::before,*::after{animation:none!important;transition:none!important}"
PREP = NO + ".site-header{position:static!important}#toast-root{display:none!important}html{scroll-behavior:auto!important}"

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--hide-scrollbars'])
    for label, vp, mob in [('desktop', {'width': 1280, 'height': 900}, False), ('mobile', {'width': 390, 'height': 844}, True)]:
        ctx = b.new_context(viewport=vp, device_scale_factor=2, is_mobile=mob, has_touch=mob, reduced_motion='reduce', locale='ko-KR')
        pg = ctx.new_page()
        pg.goto(base, wait_until='networkidle')
        pg.wait_for_timeout(600)
        pg.click('form[data-form="birth"] button[type="submit"]')
        pg.wait_for_url('**#/free')
        pg.wait_for_timeout(1200)
        pg.evaluate("() => { const k='darakbang.v2'; const d=JSON.parse(localStorage.getItem(k)||'{}'); d.unlocks={...(d.unlocks||{}), 'zodiac-ilju':'LOCAL-RENDER-CHECK'}; localStorage.setItem(k, JSON.stringify(d)); }")
        pg.goto(base + '?r=1', wait_until='networkidle')
        pg.goto(base + '?r=1#/product/zodiac-ilju', wait_until='networkidle')
        pg.add_style_tag(content=PREP)
        pg.wait_for_timeout(1000)
        print(label, '열람 chip:', pg.locator('.chip--ok').count(), '잠금 UI:', pg.locator('.lock-band, .lock-wrap').count(),
              '매력 포인트 li:', pg.locator('.rp .sheet li').count())
        pg.screenshot(path=os.path.join(OUT, f'final-unlocked-{label}.png'), full_page=True)
        ctx.close()
    b.close()
httpd.shutdown()
print('done')
