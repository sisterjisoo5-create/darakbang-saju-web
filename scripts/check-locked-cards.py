# -*- coding: utf-8 -*-
"""미결제(잠금) 상태 카드 노출 전수 검수 — 2026-11-23 시연 님 지시.

확인 항목 (12종 유료 상품 + 평생 종합 리포트 전부)
  · 미결제: 1번 카드 = 맛보기 1~2블록만(표·리스트·막대·점수·박스·12궁 차트 없음)
            2번 카드부터 = 본문 0줄(제목 + 잠금 띠/블러 결제 카드만)
  · 블러 영역(.lock-blur)은 실제로 blur 필터가 걸려 있어 읽을 수 없다
  · 결제 후(검수 미리보기 ?preview=3f990): 모든 카드의 모든 블록이 그대로 보인다
  · 390px 가로 넘침 0 · 콘솔 오류 0

사용
  python3 scripts/check-locked-cards.py           # dist 로컬
  SITE=1 python3 scripts/check-locked-cards.py    # 라이브(GitHub Pages)
"""
import http.server
import os
import socketserver
import threading

from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DIST = os.path.join(ROOT, 'dist')
OUT = os.path.abspath(os.path.join(ROOT, '..', 'downloads', 'locked-check'))
PORT = 4341
CHROME = '/workspace/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell'
LIBS = ':'.join([
    '/workspace/tmp/libs/usr/lib/x86_64-linux-gnu',
    '/workspace/.cache/sysroot/usr/lib/x86_64-linux-gnu',
])
BASE_PATH = '/darakbang-saju-web'
LIVE = os.environ.get('SITE', '').strip()
LIVE_URL = 'https://sisterjisoo5-create.github.io/darakbang-saju-web/'
PREVIEW = '3f990'
TAG = 'live-' if LIVE else 'dist-'

os.makedirs(OUT, exist_ok=True)
FAILS = []

ME = {'year': '1991', 'month': '05', 'day': '07', 'hour': '18', 'minute': '22'}
PARTNER = {'year': '1990', 'month': '05', 'day': '02', 'hour': '11', 'minute': '10'}
BIAS = {'year': '1997', 'month': '03', 'day': '30'}

PRODUCTS = [
    ('newyear', '일년 운세'),
    ('compat', '1:1 사주 궁합'),
    ('bias', '최애궁합'),
    ('zodiac-ilju', '12띠 × 일주동물'),
    ('love', '연애운 · 사랑운'),
    ('reunion', '재회운'),
    ('wealth', '재물운'),
    ('jami', '자미두수 심층'),
    ('career', '직업 · 이직운'),
    ('daewoon', '10년 대운 풀이'),
    ('saju', '정통 사주 해설'),
    ('lifetime', '평생 종합 리포트'),
]

BULK_SEL = 'table, ul, dl.kv-grid, .bars, .score-block, .rp-box, .jb-board, canvas, img'


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


def fill_birth(page, base, suffix=''):
    page.goto(f'{base}{suffix}#/input', wait_until='networkidle')
    for k, v in ME.items():
        page.fill(f'form[data-form="birth"] input[name="{k}"]', v)
    page.click('form[data-form="birth"] button[type="submit"]')
    page.wait_for_selector('.result-page', timeout=15000)


def fill_partner(page, base, suffix=''):
    page.goto(f'{base}{suffix}#/product/compat', wait_until='networkidle')
    if page.locator('form[data-form="partner"]').count():
        for k, v in PARTNER.items():
            page.fill(f'form[data-form="partner"] input[name="{k}"]', v)
        page.click('form[data-form="partner"] button[type="submit"]')
        page.wait_for_selector('#sec-cp-temp', timeout=15000)


def fill_bias(page, base, suffix=''):
    page.goto(f'{base}{suffix}#/product/bias', wait_until='networkidle')
    if page.locator('form[data-form="bias"]').count():
        page.fill('form[data-form="bias"] input[name="biasName"]', '테스트최애')
        for k, v in BIAS.items():
            page.fill(f'form[data-form="bias"] input[name="{k}"]', v)
        page.check('form[data-form="bias"] input[name="timeUnknown"]')
        page.click('form[data-form="bias"] button[type="submit"]')
        page.wait_for_selector('#sec-bi-six', timeout=15000)


READ_JS = """() => {
  const secs = [...document.querySelectorAll('.sheet.rp')];
  return secs.map((sec) => {
    const kids = [...sec.children].filter((el) => !el.classList.contains('sheet__head'));
    const boxes = kids.filter((el) => el.matches('.lock-wrap, .lock-band'));
    const shown = kids.filter((el) => !el.matches('.lock-wrap, .lock-band'));
    const blur = sec.querySelector('.lock-blur');
    const blurStyle = blur ? getComputedStyle(blur) : null;
    const textOutside = shown.map((el) => el.textContent.replace(/\\s+/g, ' ').trim()).filter(Boolean).join(' ');
    const textAll = [...sec.children]
      .filter((el) => !el.classList.contains('sheet__head') && !el.matches('.lock-wrap, .lock-band'))
      .map((el) => el.textContent.replace(/\\s+/g, ' ').trim())
      .filter(Boolean).join(' ');
    return {
      id: sec.id,
      heading: (sec.querySelector('.sheet__title') || {}).textContent || '',
      shown: shown.length,
      shownTags: shown.map((el) => el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : '')),
      bulk: shown.some((el) => el.matches('%BULK%')),
      text: textOutside.slice(0, 90),
      textLen: textAll.length,
      lockBand: Boolean(sec.querySelector('.lock-band')),
      lockCta: Boolean(sec.querySelector('.lock-cta')),
      blurFilter: blurStyle ? blurStyle.filter : null,
      contentNodes: sec.querySelectorAll('p, table, ul li, dl > div, .bars, .score-block, .rp-box, .jb-cell').length,
    };
  });
}""".replace('%BULK%', BULK_SEL)


def read(page):
    return page.evaluate(READ_JS)


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

        print('[1] 미결제 — 12종 전수: 첫 카드 맛보기만, 2번 카드부터 본문 0줄')
        for pid, name in PRODUCTS:
            ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
            page = ctx.new_page()
            errs = []
            page.on('pageerror', lambda e: errs.append(str(e)))
            fill_birth(page, base)
            if pid == 'compat':
                fill_partner(page, base)
            if pid == 'bias':
                fill_bias(page, base)
            page.goto(f'{base}#/product/{pid}', wait_until='networkidle')
            page.wait_for_selector('.sheet.rp', timeout=15000)
            secs = read(page)
            check(len(secs) >= 3, f'{name} — 카드 {len(secs)}장')
            for i, s in enumerate(secs):
                if i == 0:
                    check(s['shown'] <= 2, f'{name} 1번 카드 공개 {s["shown"]}블록 {s["shownTags"]}')
                    check(not s['bulk'], f'{name} 1번 카드에 표·리스트·차트 없음 {s["shownTags"]}')
                else:
                    check(s['shown'] == 0, f'{name} {i + 1}번 카드 본문 {s["shown"]}블록 {s["shownTags"]}')
                    check(s['text'] == '', f'{name} {i + 1}번 카드 본문 글자 없음 「{s["text"][:40]}」')
                    check(s['lockBand'] or s['lockCta'], f'{name} {i + 1}번 카드 잠금 표시')
            ctas = [s for s in secs if s['lockCta']]
            check(len(ctas) == 1, f'{name} — 블러 결제 카드 {len(ctas)}곳(첫 잠금 카드 한 곳)')
            if ctas:
                check('blur' in (ctas[0]['blurFilter'] or ''), f'{name} — 블러 미리보기에 blur 필터 {ctas[0]["blurFilter"]}')
            check(not errs, f'{name} — 콘솔 오류 없음 {errs[:2]}')
            over = page.evaluate('document.documentElement.scrollWidth - window.innerWidth')
            check(over <= 0, f'{name} — 390px 가로 넘침 없음({over}px)')
            page.screenshot(path=os.path.join(OUT, f'{TAG}locked-{pid}.png'), full_page=True)
            ctx.close()

        print('[2] 결제 후(검수 미리보기) — 12종 전수: 모든 카드의 모든 블록이 보인다')
        for pid, name in PRODUCTS:
            ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
            page = ctx.new_page()
            errs = []
            page.on('pageerror', lambda e: errs.append(str(e)))
            fill_birth(page, base, suffix=f'?preview={PREVIEW}')
            if pid == 'compat':
                fill_partner(page, base, suffix=f'?preview={PREVIEW}')
            if pid == 'bias':
                fill_bias(page, base, suffix=f'?preview={PREVIEW}')
            page.goto(f'{base}?preview={PREVIEW}#/product/{pid}', wait_until='networkidle')
            page.wait_for_selector('.sheet.rp', timeout=15000)
            secs = read(page)
            check(len(secs) >= 3, f'{name}(열람) — 카드 {len(secs)}장')
            for i, s in enumerate(secs):
                check(s['textLen'] > 20, f'{name}(열람) {i + 1}번 카드 본문 {s["contentNodes"]}개 · 글자 {s["textLen"]}')
                check(not s['lockBand'] and not s['lockCta'], f'{name}(열람) {i + 1}번 카드 잠금 없음')
            check(not errs, f'{name}(열람) — 콘솔 오류 없음 {errs[:2]}')
            page.screenshot(path=os.path.join(OUT, f'{TAG}unlocked-{pid}.png'), full_page=True)
            ctx.close()

        browser.close()

    if httpd:
        httpd.shutdown()

    print()
    print('실패' if FAILS else '전부 통과', f'({len(FAILS)}건)')
    for f in FAILS:
        print('  -', f)
    raise SystemExit(1 if FAILS else 0)


if __name__ == '__main__':
    main()
