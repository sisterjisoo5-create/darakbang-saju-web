# -*- coding: utf-8 -*-
"""라이브(GitHub Pages) 토스페이 실결제창 검증 — 실제 돈은 결제하지 않는다.

사용법
  python3 scripts/verify-live-pay.py desktop
  python3 scripts/verify-live-pay.py mobile

확인하는 것
  1. 라이브 빌드 반영 · 결제 모달(토스페이 기본 선택 / 카드·카카오페이 심사 중 / 실결제 문구)
  2. 결제하기 → 포트원 V2 SDK(CDN) 로드 → 토스페이 결제창 호출, 콘솔 에러 없음
  3. PC 는 팝업 창, 모바일은 리디렉션으로 결제창이 실제로 뜨는지 (파라미터가 PG 에서 받아들여졌는지)
  ※ 결제는 절대 완료하지 않는다. 창을 열어 확인만 하고 닫는다.

산출물
  downloads/darakbang-live-tosspay-ready.png          결제 모달 (토스페이 선택)
  downloads/darakbang-live-tosspay-window.png         PC 결제창(팝업) 호출 장면
  downloads/darakbang-live-tosspay-window-mobile.png  모바일 결제창(리디렉션) 장면
"""
import json
import os
import re
import sys
import time
import urllib.request
from playwright.sync_api import sync_playwright

LIVE = 'https://sisterjisoo5-create.github.io/darakbang-saju-web/'
OUT = '/workspace/downloads'
CHROME = '/workspace/.cache/ms-playwright/chrome-linux64/chrome'
LIBS = '/workspace/.cache/sysroot/usr/lib/x86_64-linux-gnu'

os.makedirs(OUT, exist_ok=True)


def live_assets():
    html = urllib.request.urlopen(LIVE, timeout=30).read().decode('utf-8')
    return re.findall(r'assets/index-[A-Za-z0-9_-]+\.(?:js|css)', html)


NO_ANIM = "*,*::before,*::after{animation:none!important;transition:none!important}"


def open_pay_modal(page):
    page.goto(LIVE, wait_until='load', timeout=60000)
    page.click('form[data-form="birth"] button[type="submit"]')
    page.wait_for_timeout(700)
    page.goto(f'{LIVE}#/product/saju', wait_until='load', timeout=60000)
    page.wait_for_timeout(400)
    page.click('[data-action="open-pay"][data-pid="saju"]')
    page.wait_for_selector('.pay-methods', timeout=10000)
    page.wait_for_timeout(400)
    page.add_style_tag(content=NO_ANIM)


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else 'desktop'
    print('live assets:', live_assets(), flush=True)

    env = dict(os.environ)
    env['LD_LIBRARY_PATH'] = LIBS + ':' + env.get('LD_LIBRARY_PATH', '')
    errors, net, popups = [], [], []
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--hide-scrollbars'], env=env)
        mobile = mode == 'mobile'
        ctx = browser.new_context(
            viewport={'width': 390, 'height': 844} if mobile else {'width': 1280, 'height': 900},
            device_scale_factor=2, is_mobile=mobile, has_touch=mobile,
            reduced_motion='reduce', locale='ko-KR',
            user_agent=('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 '
                        '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1') if mobile else None,
        )
        page = ctx.new_page()
        page.on('console', lambda m: errors.append('console: ' + m.text) if m.type == 'error' else None)
        page.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))
        page.on('response', lambda r: net.append([r.status, r.url[:150]])
                if ('portone' in r.url or 'tosspay' in r.url) else None)
        ctx.on('page', lambda pg: popups.append(pg) if pg is not page else None)

        open_pay_modal(page)

        methods = page.evaluate("""() => [...document.querySelectorAll('.pay-methods .pay-method')].map((b) => ({
            method: b.dataset.method, on: b.classList.contains('is-on'), disabled: b.disabled,
            text: b.innerText.replace(/\\n/g, ' ').trim() }))""")
        note = page.inner_text('.pay-test-note').replace('\n', ' ')
        print('methods:', json.dumps(methods, ensure_ascii=False), flush=True)
        print('note:', note, flush=True)
        if not mobile:
            page.screenshot(path=os.path.join(OUT, 'darakbang-live-tosspay-ready.png'))
            print('shot darakbang-live-tosspay-ready.png', flush=True)

        page.click('input[data-action="agree-all"]')
        page.wait_for_timeout(250)
        page.click('button[data-action="submit-pay"]')

        shot = 'darakbang-live-tosspay-window-mobile.png' if mobile else 'darakbang-live-tosspay-window.png'
        popup_url, modal_text = '', ''
        for _ in range(40):
            page.wait_for_timeout(700)
            if popups:
                break
            if page.url != LIVE and not page.url.startswith(LIVE + '#') and 'darakbang-saju-web' not in page.url:
                break  # 모바일 리디렉션 진입
            try:
                modal_text = page.inner_text('.modal').replace('\n', ' ')
            except Exception:  # noqa: BLE001
                modal_text = ''
            if '완료되지 않았' in modal_text:
                break

        if popups:
            pp = popups[0]
            try:
                pp.wait_for_load_state('load', timeout=25000)
            except Exception:  # noqa: BLE001
                pass
            pp.wait_for_timeout(5000)
            popup_url = pp.url
            pp.screenshot(path=os.path.join(OUT, shot))
            print('shot', shot, flush=True)
            print('popup url:', popup_url, flush=True)
        else:
            page.wait_for_timeout(3000)
            page.screenshot(path=os.path.join(OUT, shot))
            print('shot', shot, flush=True)
            print('page url:', page.url, flush=True)

        sdk = 'PortOne' in page.evaluate('() => Object.keys(window).join(",")')
        print('sdk_present:', sdk, flush=True)
        print('errors:', errors if errors else 'none', flush=True)
        print('net:', json.dumps(net[-6:], ensure_ascii=False), flush=True)

        ctx.close()
        browser.close()

    checks = {
        '토스페이 기본 선택': any(m['method'] == 'tosspay' and m['on'] and not m['disabled'] for m in methods),
        '카드·카카오페이 비활성': all(m['disabled'] for m in methods if m['method'] != 'tosspay'),
        '실결제 문구': '실결제' in note,
        '콘솔 에러 없음': not errors,
        '포트원 SDK 호출': any('cdn.portone.io/v2/browser-sdk.js' in u for _, u in net),
        '토스페이 결제창 진입': bool(popups) if not mobile else ('darakbang-saju-web' not in page.url),
    }
    for k, v in checks.items():
        print(('OK   ' if v else 'FAIL ') + k)
    return 0 if all(checks.values()) else 2


if __name__ == '__main__':
    raise SystemExit(main())
