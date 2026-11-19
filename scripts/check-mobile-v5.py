# -*- coding: utf-8 -*-
"""모바일 홈 검수 — 프리뷰 4카드 2×2 압축 배치 · 가로 넘침 · 카드 높이."""
import http.server, os, socketserver, threading
from playwright.sync_api import sync_playwright

DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'dist'))
OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'downloads'))
BASE = '/darakbang-saju-web'; PORT = 4203
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

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--hide-scrollbars'])
    for label, vp, mob in [('mobile', {'width': 390, 'height': 844}, True), ('tablet', {'width': 768, 'height': 1024}, False), ('desktop', {'width': 1280, 'height': 900}, False)]:
        ctx = b.new_context(viewport=vp, device_scale_factor=2, is_mobile=mob, has_touch=mob, reduced_motion='reduce', locale='ko-KR')
        pg = ctx.new_page()
        pg.goto(base, wait_until='networkidle')
        pg.add_style_tag(content=NO)
        pg.wait_for_timeout(900)
        grid = pg.locator('.grid--4').first
        grid.scroll_into_view_if_needed()
        pg.wait_for_timeout(300)
        bb = grid.bounding_box()
        cols = pg.evaluate("() => getComputedStyle(document.querySelector('.grid--4')).gridTemplateColumns")
        ov = pg.evaluate("() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })")
        cards = pg.evaluate("() => [...document.querySelectorAll('.grid--4 .card')].map(el => Math.round(el.getBoundingClientRect().height))")
        print(f'{label}: grid {round(bb["width"])}x{round(bb["height"])} cols={cols} cards={cards} overflow={ov}')
        grid.screenshot(path=os.path.join(OUT, f'final-home-cards-{label}.png'))
        if label == 'mobile':
            pg.evaluate("() => window.scrollTo(0, 600)")
            pg.wait_for_timeout(250)
            print('sticky header top:', pg.evaluate("() => Math.round(document.querySelector('.site-header').getBoundingClientRect().top)"))
        ctx.close()
    b.close()
httpd.shutdown()
print('done')
