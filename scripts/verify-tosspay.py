# -*- coding: utf-8 -*-
"""토스페이 반려 사유 3건 보완 검수 — 로컬 dist를 GitHub Pages와 같은 경로로 띄워 캡처한다.

산출물 (../darakbang-saju-web-verify/)
  tosspay-fix-terms.png         이용약관 제5조 — 제공(배송) 방법·기간, 열람 가능 기간 및 구슬 유효기간 1년 이내
  tosspay-fix-terms-7.png       이용약관 제7조 — 구슬의 목적·용도, 구슬로 결제 가능한 상품, 유효기간
  tosspay-fix-terms-8.png       이용약관 제8조 — 7일 청약철회, 묶음 구슬 부분 환불
  tosspay-fix-refund.png        환불규정 — 1~3항(1년 이내 · 7일 · 묶음 구슬 부분 환불)
  tosspay-fix-beads.png         구슬 충전 모달 — 구슬 목적·사용 가능 상품·유효기간
  tosspay-fix-beads-mobile.png  모바일(390px) 구슬 충전 모달
  tosspay-fix-products.png      상품 안내 — 구슬 안내 블록
"""
import http.server
import os
import socketserver
import tempfile
import threading
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DIST = os.path.join(ROOT, 'dist')
OUT = os.path.abspath(os.path.join(ROOT, '..', 'darakbang-saju-web-verify'))
PORT = 4188
BASE = '/darakbang-saju-web/'
CHROME = '/workspace/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome'
LIBS = '/workspace/.cache/sysroot/usr/lib/x86_64-linux-gnu'

os.makedirs(OUT, exist_ok=True)
SERVE_ROOT = tempfile.mkdtemp(prefix='darakbang-serve-')
os.symlink(DIST, os.path.join(SERVE_ROOT, 'darakbang-saju-web'))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=SERVE_ROOT, **kw)

    def log_message(self, *a):
        pass


def serve():
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(('127.0.0.1', PORT), Handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


NO_ANIM = "*,*::before,*::after{animation:none!important;transition:none!important}"

SCROLL_TO_SECTION = """(needle) => {
  const box = document.querySelector('.modal__body > div');
  if (!box) return false;
  const h = [...box.querySelectorAll('h3')].find((el) => el.textContent.includes(needle));
  if (!h) return false;
  box.scrollTop += h.getBoundingClientRect().top - box.getBoundingClientRect().top - 6;
  return true;
}"""


def settle(page, ms=350):
    page.wait_for_timeout(ms)
    page.wait_for_function("document.fonts.status === 'loaded'")


def main():
    httpd = serve()
    env = dict(os.environ)
    env['LD_LIBRARY_PATH'] = LIBS + ':' + env.get('LD_LIBRARY_PATH', '')
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--hide-scrollbars'], env=env)
        ctx = browser.new_context(viewport={'width': 1280, 'height': 900}, device_scale_factor=2,
                                  reduced_motion='reduce', locale='ko-KR')
        page = ctx.new_page()
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        page.on('pageerror', lambda e: errors.append(str(e)))

        base = f'http://127.0.0.1:{PORT}{BASE}'
        page.goto(base, wait_until='networkidle')
        page.add_style_tag(content=NO_ANIM)
        settle(page)

        # 상품 안내 — 구슬 안내 블록이 화면 가운데 오도록 스크롤 (스티키 헤더에 가리지 않게)
        page.evaluate("""() => {
          const g = document.querySelector('.bead-guide');
          const y = g.getBoundingClientRect().top + window.scrollY - 230;
          window.scrollTo(0, y);
        }""")
        page.wait_for_timeout(300)
        page.add_style_tag(content=NO_ANIM)
        page.screenshot(path=os.path.join(OUT, 'tosspay-fix-products.png'))
        print('shot tosspay-fix-products.png')

        # 이용약관 — 제5조 · 제7조 · 제8조
        page.evaluate("window.scrollTo(0, 0)")
        page.click('footer button[data-doc="terms"]')
        page.wait_for_selector('.modal', timeout=5000)
        settle(page, 300)
        page.add_style_tag(content=NO_ANIM)
        for needle, name in [('제5조', 'tosspay-fix-terms.png'),
                             ('제7조', 'tosspay-fix-terms-7.png'),
                             ('제8조', 'tosspay-fix-terms-8.png')]:
            assert page.evaluate(SCROLL_TO_SECTION, needle), f'{needle} not found'
            page.wait_for_timeout(250)
            page.screenshot(path=os.path.join(OUT, name))
            print('shot', name)
        page.click('button[data-action="close-modal"]')
        page.wait_for_timeout(200)

        # 환불규정
        page.click('footer button[data-doc="refund"]')
        page.wait_for_selector('.modal', timeout=5000)
        settle(page, 300)
        page.add_style_tag(content=NO_ANIM)
        page.evaluate(SCROLL_TO_SECTION, '3. 일부 사용 후')
        page.wait_for_timeout(250)
        page.screenshot(path=os.path.join(OUT, 'tosspay-fix-refund.png'))
        print('shot tosspay-fix-refund.png')
        page.click('button[data-action="close-modal"]')
        page.wait_for_timeout(200)

        # 구슬 충전 모달
        page.click('header button[data-action="open-beads"]')
        page.wait_for_selector('.bead-info', timeout=5000)
        settle(page, 300)
        page.add_style_tag(content=NO_ANIM)
        page.wait_for_timeout(250)
        page.screenshot(path=os.path.join(OUT, 'tosspay-fix-beads.png'))
        print('shot tosspay-fix-beads.png')

        # 모바일 구슬 모달
        m = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2,
                                is_mobile=True, has_touch=True, reduced_motion='reduce', locale='ko-KR',
                                user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')
        mp = m.new_page()
        mp.on('pageerror', lambda e: errors.append(str(e)))
        mp.goto(base, wait_until='networkidle')
        mp.add_style_tag(content=NO_ANIM)
        settle(mp)
        mp.click('footer button[data-action="open-beads"]')
        mp.wait_for_selector('.bead-info', timeout=5000)
        settle(mp, 300)
        mp.add_style_tag(content=NO_ANIM)
        mp.wait_for_timeout(250)
        mp.screenshot(path=os.path.join(OUT, 'tosspay-fix-beads-mobile.png'))
        print('shot tosspay-fix-beads-mobile.png')

        # 모바일: 충전 모달의 3종 상품이 모두 화면 폭 안에 들어오는지 (가로 넘침 없음)
        boxes = mp.evaluate("""() => {
          const rows = [...document.querySelectorAll('.pay-methods--stack .pay-method')];
          const body = document.querySelector('.modal__body').getBoundingClientRect();
          return rows.map((r) => { const b = r.getBoundingClientRect(); return { left: b.left, right: b.right, bodyRight: body.right }; });
        }""")
        overflow = [b for b in boxes if b['right'] > b['bodyRight'] + 1 or b['left'] < 0]
        print('mobile pack rows:', boxes)
        print('mobile overflow rows:', overflow)

        # 본문에 실제로 렌더된 문구 확인
        mp.click('button[data-action="close-modal"]')
        mp.wait_for_timeout(150)
        mp.click('footer button[data-doc="terms"]')
        mp.wait_for_selector('.modal', timeout=5000)
        text = mp.inner_text('.modal__body')
        mp.click('button[data-action="close-modal"]')
        mp.wait_for_timeout(150)
        mp.click('footer button[data-doc="refund"]')
        mp.wait_for_selector('.modal', timeout=5000)
        rtext = mp.inner_text('.modal__body')
        mp.click('button[data-action="close-modal"]')
        mp.wait_for_timeout(150)
        mp.click('footer button[data-action="open-beads"]')
        mp.wait_for_selector('.bead-info', timeout=5000)
        btext = mp.inner_text('.modal__body')
        mp.click('button[data-action="close-modal"]')
        mp.wait_for_timeout(150)

        # 상품 안내 구슬 블록 (모바일)
        gtext = mp.inner_text('.bead-guide')

        checks = {
            'terms: 제공 즉시 + 1년 이내': '결제 즉시 제공되며, 열람 가능 기간 및 구슬 유효기간은 결제일로부터 1년 이내입니다' in text.replace('\n', ' '),
            'terms: 제7조 구슬 사용 상품': '구슬로 결제 가능한 상품' in text and '평생 종합 리포트(10구슬)' in text,
            'terms: 다회차 부분 환불': '다회차·묶음 이용권(5구슬·10구슬)의 부분 환불' in text,
            'terms: 5년 없음': '5년' not in text,
            'refund: 부분 환불 3항': '3. 일부 사용 후' in rtext and '6,930원 환불' in rtext,
            'refund: 5년 없음': '5년' not in rtext,
            'beads: 목적 문장': '전용 이용권(1구슬 = 990원)입니다' in btext,
            'beads: 사용 상품 목록': '최애궁합(1구슬)' in btext and '평생 종합 리포트(10구슬)' in btext,
            'beads: 유효기간': '유효기간은 결제일로부터 1년 이내' in btext,
            'products: 구슬 안내 블록': '구슬로 결제 가능한 상품' in gtext and '전용 이용권' in gtext,
            'mobile: 충전 상품 가로 넘침 없음': not overflow,
        }
        for k, v in checks.items():
            print(('OK  ' if v else 'FAIL') + ' ' + k)

        browser.close()
        httpd.shutdown()

    print('console/page errors:', errors if errors else 'none')
    if not all(checks.values()):
        raise SystemExit('검수 실패')


if __name__ == '__main__':
    main()
