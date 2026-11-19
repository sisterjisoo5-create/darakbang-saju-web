# -*- coding: utf-8 -*-
"""토스페이 V2 실결제 연동 — 로컬 dist 검증 (실제 돈은 결제하지 않는다)

하는 일
  1. dist 를 GitHub Pages 와 같은 하위 경로(/darakbang-saju-web/)로 띄운다.
  2. 결제 모달에서 토스페이가 기본 선택·유일한 활성 수단인지, 카드·카카오페이가 '심사 중'으로
     비활성인지, 실결제 모드 문구가 뜨는지 확인한다.
  3. 포트원 V2 SDK(CDN 실물)를 불러온 뒤 requestPayment 만 스텁으로 바꿔, 우리 코드가 SDK 에
     넘기는 요청 객체(storeId·channelKey·payMethod·easyPay·currency·totalAmount·redirectUrl)를 캡처한다.
     → 결제창을 실제로 열지 않고 규격만 검증한다.
  4. 모바일 리디렉션 복귀(?pay=portone&paymentId=…)를 흉내 내 승인 → 잠금 해제 / 취소 → 오류 안내를 확인한다.

산출물: downloads/darakbang-local-pay-modal.png, downloads/darakbang-local-pay-done.png
"""
import http.server
import json
import os
import socketserver
import tempfile
import threading
import urllib.request
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DIST = os.path.join(ROOT, 'dist')
OUT = os.path.abspath(os.path.join(ROOT, '..', 'downloads'))
PORT = 4191
BASE = '/darakbang-saju-web/'
CHROME = '/workspace/.cache/ms-playwright/chrome-linux64/chrome'
LIBS = '/workspace/.cache/sysroot/usr/lib/x86_64-linux-gnu'
SDK_URL = 'https://cdn.portone.io/v2/browser-sdk.js'

STORE_ID = 'store-5ad01159-8552-4b67-a6f7-474a40a9fc9a'
CHANNEL = 'channel-key-d1b42578-273f-4a86-9a75-3af09b467930'

STUB = """
;(function () {
  var real = window.PortOne;
  window.__realSdkLoaded = !!real && typeof real.requestPayment === 'function';
  window.PortOne = {
    requestPayment: async function (req) {
      window.__payReq = req;
      return { transactionType: 'PAYMENT', paymentId: req.paymentId, txId: 'TX-STUB' };
    },
  };
})();
"""

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


def settle(page, ms=350):
    page.wait_for_timeout(ms)
    page.wait_for_function("document.fonts.status === 'loaded'")


def main():
    httpd = serve()
    sdk_body = urllib.request.urlopen(SDK_URL, timeout=30).read().decode('utf-8')
    print('portone sdk bytes:', len(sdk_body))
    env = dict(os.environ)
    env['LD_LIBRARY_PATH'] = LIBS + ':' + env.get('LD_LIBRARY_PATH', '')
    errors = []
    checks = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--hide-scrollbars'], env=env)
        ctx = browser.new_context(viewport={'width': 1280, 'height': 900}, device_scale_factor=2,
                                  reduced_motion='reduce', locale='ko-KR')
        page = ctx.new_page()
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        page.on('pageerror', lambda e: errors.append(str(e)))

        def route_sdk(route):
            route.fulfill(status=200, content_type='application/javascript; charset=utf-8', body=sdk_body + STUB)

        page.route(SDK_URL, route_sdk)
        base = f'http://127.0.0.1:{PORT}{BASE}'

        # 내 원국 만들기
        page.goto(base, wait_until='networkidle')
        page.click('form[data-form="birth"] button[type="submit"]')
        page.wait_for_timeout(600)

        # 상품 페이지 → 결제 모달
        page.goto(f'{base}#/product/saju', wait_until='networkidle')
        settle(page)
        page.click('[data-action="open-pay"][data-pid="saju"]')
        page.wait_for_selector('.pay-methods', timeout=5000)
        settle(page, 300)
        page.add_style_tag(content=NO_ANIM)

        methods = page.evaluate("""() => [...document.querySelectorAll('.pay-methods .pay-method')].map((b) => ({
            method: b.dataset.method,
            on: b.classList.contains('is-on'),
            off: b.classList.contains('is-off'),
            disabled: b.disabled,
            text: b.innerText.replace(/\\n/g, ' ').trim(),
        }))""")
        print('methods:', json.dumps(methods, ensure_ascii=False, indent=1))
        note = page.inner_text('.pay-test-note').replace('\n', ' ')
        pending_note = page.inner_text('.pay-method__note').replace('\n', ' ')
        print('pay note:', note)
        print('pending note:', pending_note)
        page.screenshot(path=os.path.join(OUT, 'darakbang-local-pay-modal.png'))
        print('shot darakbang-local-pay-modal.png')

        checks['토스페이 기본 선택'] = any(m['method'] == 'tosspay' and m['on'] and not m['disabled'] for m in methods)
        checks['카드·카카오페이 비활성'] = all(m['disabled'] and m['off'] for m in methods if m['method'] != 'tosspay')
        checks['심사 중 배지'] = sum(1 for m in methods if '심사 중' in m['text']) == 2
        checks['심사 중 안내 문구'] = '심사 중' in pending_note and '토스페이' in pending_note
        checks['실결제 모드 문구'] = '실결제' in note and '실제로 청구' in note
        checks['테스트 문구 없음'] = 'TEST' not in note and '테스트 결제' not in note

        # 동의 → 결제 (SDK 스텁이 요청 객체만 캡처)
        page.click('input[data-action="agree-all"]')
        page.wait_for_timeout(250)
        page.click('button[data-action="submit-pay"]')
        page.wait_for_selector('.done-view', timeout=8000)
        settle(page, 300)
        page.add_style_tag(content=NO_ANIM)
        req = page.evaluate('() => window.__payReq')
        print('request:', json.dumps(req, ensure_ascii=False, indent=1))
        page.screenshot(path=os.path.join(OUT, 'darakbang-local-pay-done.png'))

        checks['SDK(CDN) 로드'] = page.evaluate('() => !!window.__realSdkLoaded')
        checks['SDK 로드·호출'] = bool(req)
        checks['storeId'] = (req or {}).get('storeId') == STORE_ID
        checks['channelKey(토스페이)'] = (req or {}).get('channelKey') == CHANNEL
        checks['payMethod EASY_PAY'] = (req or {}).get('payMethod') == 'EASY_PAY'
        checks['easyPay TOSSPAY'] = ((req or {}).get('easyPay') or {}).get('easyPayProvider') == 'TOSSPAY'
        checks['통화 KRW'] = (req or {}).get('currency') in ('CURRENCY_KRW', 'KRW')
        checks['금액 990'] = (req or {}).get('totalAmount') == 990
        checks['주문명'] = (req or {}).get('orderName') == '정통 사주 해설'
        checks['redirectUrl'] = str((req or {}).get('redirectUrl', '')).endswith('/darakbang-saju-web/?pay=portone')
        checks['paymentId 발급'] = str((req or {}).get('paymentId', '')).startswith('DRK-')

        st = page.evaluate("() => JSON.parse(localStorage.getItem('darakbang.v2') || '{}')")
        checks['승인 후 잠금 해제'] = bool((st.get('unlocks') or {}).get('saju'))
        checks['주문 기록'] = any(o.get('method') == '토스페이' for o in (st.get('orders') or []))
        checks['모바일 복귀 대기값 정리'] = page.evaluate("() => localStorage.getItem('darakbang.pay.pending')") is None

        # ── 모바일 리디렉션 복귀: 성공
        page.evaluate("""() => {
          localStorage.setItem('darakbang.pay.pending', JSON.stringify({
            paymentId: 'DRK-REDIRECT-1', kind: 'product', productId: 'wealth',
            orderName: '재물운', amount: 990, method: 'tosspay', at: new Date().toISOString(),
          }));
        }""")
        page.goto(f'{base}?pay=portone&paymentId=DRK-REDIRECT-1&txId=TX-R', wait_until='networkidle')
        page.wait_for_selector('.done-view', timeout=8000)
        settle(page, 300)
        st = page.evaluate("() => JSON.parse(localStorage.getItem('darakbang.v2') || '{}')")
        checks['리디렉션 복귀 승인 → 열림'] = bool((st.get('unlocks') or {}).get('wealth'))
        checks['복귀 후 주소 정리'] = 'paymentId' not in page.url and '#/product/wealth' in page.url
        print('after redirect url:', page.url)

        # ── 모바일 리디렉션 복귀: 취소
        page.evaluate("""() => {
          localStorage.setItem('darakbang.pay.pending', JSON.stringify({
            paymentId: 'DRK-REDIRECT-2', kind: 'product', productId: 'love',
            orderName: '연애운', amount: 990, method: 'tosspay', at: new Date().toISOString(),
          }));
        }""")
        page.goto(f'{base}?pay=portone&paymentId=DRK-REDIRECT-2&code=FAIL&message=%EC%82%AC%EC%9A%A9%EC%9E%90%EA%B0%80%20%EA%B2%B0%EC%A0%9C%EB%A5%BC%20%EC%B7%A8%EC%86%8C%ED%95%98%EC%98%80%EC%8A%B5%EB%8B%88%EB%8B%A4', wait_until='networkidle')
        page.wait_for_selector('.modal', timeout=8000)
        settle(page, 300)
        err_body = page.inner_text('.modal__body').replace('\n', ' ')
        st = page.evaluate("() => JSON.parse(localStorage.getItem('darakbang.v2') || '{}')")
        checks['취소 복귀 → 오류 안내'] = '취소' in err_body
        checks['취소 시 잠금 유지'] = not (st.get('unlocks') or {}).get('love')
        print('cancel body:', err_body)

        # ── 모바일 뷰 결제 모달 (토스페이만 활성)
        m = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2,
                                is_mobile=True, has_touch=True, reduced_motion='reduce', locale='ko-KR',
                                user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')
        mp = m.new_page()
        mp.on('pageerror', lambda e: errors.append(str(e)))
        mp.goto(base, wait_until='networkidle')
        mp.click('form[data-form="birth"] button[type="submit"]')
        mp.wait_for_timeout(600)
        mp.goto(f'{base}#/product/saju', wait_until='networkidle')
        settle(mp)
        mp.click('[data-action="open-pay"][data-pid="saju"]')
        mp.wait_for_selector('.pay-methods', timeout=5000)
        settle(mp, 300)
        mp.add_style_tag(content=NO_ANIM)
        mp.wait_for_timeout(200)
        mp.screenshot(path=os.path.join(OUT, 'darakbang-local-pay-modal-mobile.png'))
        overflow = mp.evaluate("""() => {
          const body = document.querySelector('.modal__body').getBoundingClientRect();
          return [...document.querySelectorAll('.pay-methods .pay-method')]
            .map((r) => r.getBoundingClientRect())
            .filter((b) => b.right > body.right + 1 || b.left < body.left - 1).length;
        }""")
        checks['모바일 가로 넘침 없음'] = overflow == 0
        print('mobile overflow rows:', overflow)

        browser.close()
        httpd.shutdown()

    print('console/page errors:', errors if errors else 'none')
    for k, v in checks.items():
        print(('OK   ' if v else 'FAIL ') + k)
    if not all(checks.values()) or errors:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
