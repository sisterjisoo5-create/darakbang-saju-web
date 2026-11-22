# -*- coding: utf-8 -*-
"""내 다락방 [다시 보기] · 리포트 상단 액션 바 개편 검수 (2026-11-22 개편).

확인 항목
  · 유료 리포트 상단 — 「무료 결과로」 없음, [이미지 저장] 이 왼쪽, 그 오른쪽에
    「저장해 두면 브라우저를 바꿔도 사라지지 않아요」가 **같은 줄**에 붙어 있다(두 줄 이내)
  · 잠금 상태(일반 방문자) — 안내 문구 없이 결제 버튼만, 넘침 없음
  · 내 다락방 주문 내역 — 리포트 주문에만 [다시 보기], 구슬 충전·옛 주문은 버튼 없음
  · [다시 보기] 클릭 → 그 상품 리포트가 바로 열린다(재결제 없음)
  · 375 · 390px 가로 넘침 0 · 콘솔 오류 0
  · 데스크톱(1280px)에서도 같은 규칙

사용
  python3 scripts/check-report-bar.py            # dist 로컬
  SITE=1 python3 scripts/check-report-bar.py     # 라이브
"""
import http.server
import json
import os
import socketserver
import threading

from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DIST = os.path.join(ROOT, 'dist')
OUT = os.path.abspath(os.path.join(ROOT, '..', 'downloads'))
PORT = 4251
CHROME = '/workspace/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell'
LIBS = ':'.join([
    '/workspace/tmp/libs/usr/lib/x86_64-linux-gnu',
    '/workspace/.cache/sysroot/usr/lib/x86_64-linux-gnu',
])
BASE_PATH = '/darakbang-saju-web'
LIVE = os.environ.get('SITE', '').strip()
LIVE_URL = 'https://sisterjisoo5-create.github.io/darakbang-saju-web/'
PREVIEW = '3f990'
TAG = 'live-' if LIVE else ''
HINT = '저장해 두면 브라우저를 바꿔도 사라지지 않아요'

os.makedirs(OUT, exist_ok=True)
FAILS = []

ME = {'year': '1991', 'month': '05', 'day': '07', 'hour': '18', 'minute': '22'}


def check(ok, label):
    print(('  ok   ' if ok else '  FAIL ') + label)
    if not ok:
        FAILS.append(label)


def serve():
    class H(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **k):
            super().__init__(*a, directory=DIST, **k)

        def translate_path(self, path):
            if path.startswith(BASE_PATH):
                path = path[len(BASE_PATH):] or '/'
            return super().translate_path(path)

        def log_message(self, *a):
            pass

    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(('127.0.0.1', PORT), H)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def fill_birth(page, base, preview=False):
    url = f'{base}?preview={PREVIEW}#/input' if preview else f'{base}#/input'
    page.goto(url, wait_until='networkidle')
    for k, v in ME.items():
        page.fill(f'input[name="{k}"]', v)
    page.click('form[data-form="birth"] button[type="submit"]')
    page.wait_for_selector('.result-page', timeout=12000)


def bar_geometry(page):
    return page.evaluate("""() => {
      const bar = document.querySelector('.report-bar');
      if (!bar) return null;
      const btn = bar.querySelector('[data-action="save-image"]');
      const hint = bar.querySelector('.report-bar__hint');
      const r = (el) => el ? (() => { const b = el.getBoundingClientRect();
        return { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width, h: b.height }; })() : null;
      return {
        btn: r(btn), hint: r(hint), extra: r(bar.querySelector('.report-bar__extra')),
        text: hint ? hint.textContent.trim() : '',
        barRight: bar.getBoundingClientRect().right,
        free: (document.body.innerText || '').includes('무료 결과로'),
        over: document.documentElement.scrollWidth - window.innerWidth,
      };
    }""")


def main():
    httpd = None
    base = LIVE_URL
    if not LIVE:
        httpd = serve()
        base = f'http://127.0.0.1:{PORT}{BASE_PATH}/'

    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=CHROME,
            args=['--no-sandbox', '--font-render-hinting=none'],
            env={**os.environ, 'LD_LIBRARY_PATH': LIBS},
        )

        # ── 1. 열람 상태 — newyear · love · lifetime, 375 · 390 · 1280 ──
        for width in (375, 390, 1280):
            print(f'[1] {width}px — 열람한 리포트 상단 액션 바')
            ctx = browser.new_context(viewport={'width': width, 'height': 844 if width < 800 else 900},
                                      device_scale_factor=2)
            page = ctx.new_page()
            errs = []
            page.on('pageerror', lambda e: errs.append(str(e)))
            fill_birth(page, base, preview=True)
            for pid in ('newyear', 'love', 'lifetime'):
                page.goto(f'{base}?preview={PREVIEW}#/product/{pid}', wait_until='networkidle')
                page.wait_for_selector('#report-capture', timeout=15000)
                g = bar_geometry(page)
                check(g is not None, f'{pid} — 상단 액션 바 있음')
                if not g:
                    continue
                check(not g['free'], f'{pid} — 「무료 결과로」 없음')
                check(g['btn'] is not None, f'{pid} — [이미지 저장] 있음')
                check(g['text'] == HINT, f'{pid} — 안내 문구 「{g["text"]}」')
                if g['btn'] and g['hint']:
                    same_row = g['hint']['t'] >= g['btn']['t'] - 2 and g['hint']['b'] <= g['btn']['b'] + 24
                    check(same_row, f'{pid} — 버튼·안내가 같은 줄 (btn {g["btn"]["t"]:.0f}~{g["btn"]["b"]:.0f} / '
                                    f'hint {g["hint"]["t"]:.0f}~{g["hint"]["b"]:.0f})')
                    check(g['hint']['l'] >= g['btn']['r'] - 1, f'{pid} — 안내가 버튼 오른쪽 '
                          f'({g["btn"]["r"]:.0f} ≤ {g["hint"]["l"]:.0f})')
                    check(g['hint']['l'] - g['btn']['r'] < 22, f'{pid} — 붙어 있음({g["hint"]["l"] - g["btn"]["r"]:.0f}px)')
                    check(g['hint']['h'] <= (2 * 18 if width < 800 else 19), f'{pid} — 안내 두 줄 이내({g["hint"]["h"]:.0f}px)')
                    check(g['hint']['r'] <= width, f'{pid} — 안내가 화면 안({g["hint"]["r"]:.0f} ≤ {width})')
                    check(g['btn']['w'] > 60, f'{pid} — 버튼 폭 {g["btn"]["w"]:.0f}px')
                check(g['over'] <= 0, f'{pid} — {width}px 가로 스크롤 없음({g["over"]}px)')
                if width < 800:
                    page.locator('.result-head').screenshot(
                        path=os.path.join(OUT, f'{TAG}report-bar-{pid}-{width}.png'))
            check(not errs, f'{width}px — 콘솔 오류 없음 {errs[:2]}')
            ctx.close()

        # ── 2. 잠금 상태(일반 방문자) — 안내 없이 결제 버튼만 ──
        print('[2] 390px — 잠금 상태')
        ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
        page = ctx.new_page()
        errs2 = []
        page.on('pageerror', lambda e: errs2.append(str(e)))
        fill_birth(page, base)
        page.goto(f'{base}#/product/love', wait_until='networkidle')
        page.wait_for_selector('#report-capture', timeout=15000)
        g = bar_geometry(page)
        check(g is not None and g['btn'] is None, '390px — 잠금에는 [이미지 저장] 없음')
        check(g is not None and g['hint'] is None, '390px — 잠금에는 안내 문구 없음')
        pay = page.locator('.report-bar [data-action="open-pay"]')
        check(pay.count() == 1, '390px — 결제 버튼이 그 자리에')
        check(g and g['over'] <= 0, f'390px — 가로 스크롤 없음({g["over"] if g else "?"}px)')
        check(not errs2, f'390px 잠금 — 콘솔 오류 없음 {errs2[:2]}')
        page.locator('.result-head').screenshot(path=os.path.join(OUT, f'{TAG}report-bar-locked-390.png'))
        ctx.close()

        # ── 3. 내 다락방 주문 내역 — [다시 보기] ──
        print('[3] 내 다락방 — 주문 내역 [다시 보기]')
        for width in (375, 390, 1280):
            ctx = browser.new_context(viewport={'width': width, 'height': 844 if width < 800 else 900},
                                      device_scale_factor=2)
            page = ctx.new_page()
            errs3 = []
            page.on('pageerror', lambda e: errs3.append(str(e)))
            fill_birth(page, base)
            profile = page.evaluate("() => JSON.parse(localStorage.getItem('darakbang.v2')).profile")
            orders = [
                {'id': 'ord-love', 'txId': '01a1f484-38f3-ef5b-4eaf-cd18aceb312f', 'productId': 'love',
                 'name': '연애운', 'amount': 990, 'method': '토스페이', 'mode': 'live',
                 'at': '2026-11-22T14:40:00.000Z'},
                {'id': 'ord-lifetime', 'txId': 'BEAD-8K3J2M', 'productId': 'lifetime',
                 'name': '평생 종합 리포트', 'amount': 0, 'method': '구슬 10개', 'mode': 'bead',
                 'at': '2026-11-20T02:10:00.000Z'},
                {'id': 'ord-beads', 'txId': 'BDS-77X1Q0', 'productId': 'beads',
                 'name': '5구슬 충전', 'amount': 4900, 'method': '토스페이', 'mode': 'live',
                 'at': '2026-11-19T23:05:00.000Z'},
                {'id': 'ord-old', 'txId': 'OLD-LEGACY-000', 'name': '옛 주문(상품 id 없음)',
                 'amount': 990, 'method': '카드', 'mode': 'live', 'at': '2026-11-10T05:00:00.000Z'},
            ]
            page.evaluate("""(data) => {
              const cur = JSON.parse(localStorage.getItem('darakbang.v2')) || {};
              cur.orders = data.orders;
              cur.unlocks = { love: 'ord-love', lifetime: 'ord-lifetime' };
              cur.beads = 4;
              localStorage.setItem('darakbang.v2', JSON.stringify(cur));
            }""", {'orders': orders})
            # 해시만 바꾸면 다시 읽지 않는다 — 주문을 넣은 뒤 문서를 새로 띄운다
            page.goto(f'{base}#/my', wait_until='networkidle')
            page.evaluate("() => location.reload()")
            page.wait_for_selector('.my-grid', timeout=15000)

            data = page.evaluate("""() => {
              const rows = [...document.querySelectorAll('.order-row')];
              return {
                rows: rows.length,
                replay: rows.filter((r) => r.querySelector('[data-replay], .order-row__replay'))
                  .map((r) => ({ name: r.querySelector('.order-row__top b').textContent.trim(),
                                 href: r.querySelector('.order-row__replay').getAttribute('href'),
                                 text: r.querySelector('.order-row__replay').textContent.trim() })),
                over: document.documentElement.scrollWidth - window.innerWidth,
                boxes: rows.map((r) => {
                  const b = r.getBoundingClientRect();
                  const btn = r.querySelector('.order-row__replay');
                  const bb = btn ? btn.getBoundingClientRect() : null;
                  return { l: b.left, r: b.right, over: bb ? bb.right - b.right : null, h: b.height };
                }),
              };
            }""")
            check(data['rows'] == 4, f'{width}px — 주문 {data["rows"]}건')
            names = [x['name'] for x in data['replay']]
            check(names == ['연애운', '평생 종합 리포트'], f'{width}px — [다시 보기]는 리포트 주문에만 {names}')
            check(all(x['text'] == '다시 보기' for x in data['replay']), f'{width}px — 버튼 문구 「다시 보기」')
            check(all(x['href'] == '#/product/love' or x['href'] == '#/product/lifetime' for x in data['replay']),
                  f'{width}px — 주소 {[x["href"] for x in data["replay"]]}')
            check(all(b['over'] is None or b['over'] <= 0 for b in data['boxes']),
                  f'{width}px — 버튼이 주문 줄 밖으로 넘치지 않음',
                  )
            check(data['over'] <= 0, f'{width}px — 가로 스크롤 없음({data["over"]}px)')
            if width < 800:
                page.locator('.my-grid .sheet').nth(1).screenshot(
                    path=os.path.join(OUT, f'{TAG}my-orders-{width}.png'))

            # 클릭 → 그 상품 리포트 (미리보기 아님 — unlocks 로 열려 있어야 한다)
            page.click('.order-row__replay')
            page.wait_for_selector('#report-capture', timeout=15000)
            check(page.url.endswith('#/product/love'), f'{width}px — [다시 보기] → {page.url.split("#")[-1]}')
            locked = page.locator('.report-bar [data-action="open-pay"]').count()
            check(locked == 0, f'{width}px — 다시 열린 리포트는 잠기지 않음')
            check(page.locator('[data-action="save-image"]').count() == 1, f'{width}px — [이미지 저장] 있음')
            check(page.locator('#report-capture h1').inner_text().strip() != '', f'{width}px — 리포트 제목 있음')
            check(not errs3, f'{width}px — 콘솔 오류 없음 {errs3[:2]}')
            ctx.close()

        # ── 4. 최애궁합 — 세 번째 버튼(최애 정보 바꾸기)까지 있을 때 ──
        print('[4] 최애궁합 — [이미지 저장] + 안내 + [최애 정보 바꾸기]')
        for width in (375, 390):
            ctx = browser.new_context(viewport={'width': width, 'height': 844}, device_scale_factor=2)
            page = ctx.new_page()
            errs4 = []
            page.on('pageerror', lambda e: errs4.append(str(e)))
            fill_birth(page, base, preview=True)
            page.evaluate("""() => {
              const cur = JSON.parse(localStorage.getItem('darakbang.v2')) || {};
              cur.bias = { name: '차은우', profile: { calendar: 'solar', year: 1997, month: 3, day: 30,
                hour: 12, minute: 0, timeUnknown: true, gender: 'male', leap: false } };
              localStorage.setItem('darakbang.v2', JSON.stringify(cur));
            }""")
            page.goto(f'{base}?preview={PREVIEW}#/product/bias', wait_until='networkidle')
            page.evaluate("() => location.reload()")
            page.wait_for_selector('#report-capture', timeout=15000)
            g = bar_geometry(page)
            check(g is not None and g['btn'] is not None, f'bias {width}px — [이미지 저장] 있음')
            check(g is not None and g['extra'] is not None, f'bias {width}px — [최애 정보 바꾸기] 있음')
            check(g and g['over'] <= 0, f'bias {width}px — 가로 스크롤 없음({g["over"] if g else "?"}px)')
            check(g and g['extra'] and g['extra']['r'] <= width, f'bias {width}px — 세 버튼 모두 화면 안')
            if g and g['btn'] and g['hint']:
                check(g['hint']['l'] >= g['btn']['r'] - 1, f'bias {width}px — 안내는 이미지 저장 오른쪽')
            check(not errs4, f'bias {width}px — 콘솔 오류 없음 {errs4[:2]}')
            page.locator('.result-head').screenshot(path=os.path.join(OUT, f'{TAG}report-bar-bias-{width}.png'))
            ctx.close()

        browser.close()
    if httpd:
        httpd.shutdown()

    print()
    if FAILS:
        print(f'실패 {len(FAILS)}건')
        for f in FAILS:
            print(' - ' + f)
        raise SystemExit(1)
    print('전부 통과')


main()
