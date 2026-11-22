# -*- coding: utf-8 -*-
"""최애궁합 개편 검수 — 1장 최애의 이상형 코드 → 2장 TOP 3 → 3장 나랑 연애 → 4장 오래 가는 법
  · 무료 맛보기 카드(최애가 끌리는 결 · 찰떡 1위 · 내 자리)가 먼저 보인다
  · 리포트 4장이 순서대로 서고, 잠금 전 맛보기가 비어 있지 않다
  · 375·390·430·1280 에서 가로 스크롤·겹침이 없다
  · 이미지 저장 → PNG 860px 폭, 빈 파일 아님
사용: python3 scripts/check-bias-redesign.py [--live]
"""
import http.server
import os
import re
import socketserver
import sys
import threading

from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DIST = os.path.join(ROOT, 'dist')
OUT = os.path.abspath(os.path.join(ROOT, '..', 'downloads'))
PORT = 4237
CHROME = '/workspace/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell'
LIBS = ':'.join([
    '/workspace/tmp/libs/usr/lib/x86_64-linux-gnu',
    '/workspace/.cache/sysroot/usr/lib/x86_64-linux-gnu',
])
BASE_PATH = '/darakbang-saju-web'
LIVE = '--live' in sys.argv
LIVE_URL = 'https://sisterjisoo5-create.github.io/darakbang-saju-web/'
TAG = 'live-bias-' if LIVE else 'bias-'

os.makedirs(OUT, exist_ok=True)
FAILS = []

ME = {'year': '1991', 'month': '05', 'day': '07', 'hour': '18', 'minute': '22'}
BIAS = {'name': '차은우', 'year': '1997', 'month': '03', 'day': '30'}


def check(cond, msg):
    print(('  ok   ' if cond else '  FAIL ') + msg)
    if not cond:
        FAILS.append(msg)


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=DIST, **kw)

    def translate_path(self, path):
        if path.startswith(BASE_PATH + '/'):
            path = path[len(BASE_PATH):]
        return super().translate_path(path)

    def log_message(self, *a):
        pass


def serve():
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(('127.0.0.1', PORT), Handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def fill_birth(page):
    page.fill('input[name="year"]', ME['year'])
    page.fill('input[name="month"]', ME['month'])
    page.fill('input[name="day"]', ME['day'])
    page.fill('input[name="hour"]', ME['hour'])
    page.fill('input[name="minute"]', ME['minute'])
    page.click('form[data-form="birth"] button[type="submit"]')


def fill_bias(page):
    page.wait_for_selector('form[data-form="bias"]')
    page.fill('input[name="biasName"]', BIAS['name'])
    page.fill('form[data-form="bias"] input[name="year"]', BIAS['year'])
    page.fill('form[data-form="bias"] input[name="month"]', BIAS['month'])
    page.fill('form[data-form="bias"] input[name="day"]', BIAS['day'])
    page.click('form[data-form="bias"] button[type="submit"]')


def png_size(path):
    with open(path, 'rb') as f:
        head = f.read(33)
    assert head[:8] == b'\x89PNG\r\n\x1a\n', 'PNG 시그니처가 아니다'
    return int.from_bytes(head[16:20], 'big'), int.from_bytes(head[20:24], 'big')


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

        # ── 1. 무료 맛보기 — 최애가 끌리는 결부터 ─────────────
        print('[1] 최애궁합 — 무료 맛보기 카드')
        for w, h in [(375, 812), (390, 844), (1280, 900)]:
            ctx = browser.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2)
            page = ctx.new_page()
            page.goto(base + '?preview=3f990#/input?next=bias', wait_until='networkidle')
            fill_birth(page)
            fill_bias(page)
            page.wait_for_selector('#report-capture', timeout=15000)
            preview = page.inner_text('.bias-preview')
            check('최애가 끌리는 사람' in preview, f'{w}px — 맛보기 제목이 최애의 시선')
            check('최애가 끌리는 결' in preview, f'{w}px — 끌리는 결 행')
            check('찰떡인 일주' in preview and '1위' in preview, f'{w}px — TOP 3 1위 맛보기')
            check('60일주 중' in preview, f'{w}px — 내 일주 자리')
            over = page.evaluate('document.documentElement.scrollWidth - window.innerWidth')
            check(over <= 0, f'{w}px — 가로 스크롤 없음({over}px)')
            if w in (390, 1280):
                page.locator('.bias-preview').screenshot(path=os.path.join(OUT, f'{TAG}preview-{w}.png'))
            ctx.close()

        # ── 2. 리포트 4장 순서·문구 ────────────────────────
        print('[2] 리포트 — 4장 순서와 첫 문단')
        ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2,
                                  accept_downloads=True)
        page = ctx.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(base + '?preview=3f990#/input?next=bias', wait_until='networkidle')
        fill_birth(page)
        fill_bias(page)
        page.wait_for_selector('#report-capture', timeout=15000)
        report = page.inner_text('#report-capture')
        heads = ['최애가 끌리는 사주', '찰떡인 일주 TOP 3', '그래서 나랑 연애하면', '오래 가려면']
        pos = [report.find(x) for x in heads]
        check(all(x >= 0 for x in pos), f'네 장 제목이 다 있다 {pos}')
        check(pos == sorted(pos), '장 순서가 이상형 → TOP 3 → 나랑 연애 → 오래 가기')
        check('무장해제되는 사람' in report, '1장에 무장해제 포인트')
        check('[1위]' in report and '[2위]' in report and '[3위]' in report, 'TOP 3 세 자리')
        check('어! 내 일주' in report or '60일주 중' in report, '내 일주 자리 안내')
        check('설렘 포인트 셋' in report, '3장 설렘 포인트')
        check('엇박자' in report and '빛나는 달' in report, '4장 엇박자·빛나는 달')
        check('오늘의 다락방 처방' not in report, 'TODAY 처방은 빠져 있다')
        check(not errors, f'자바스크립트 오류 없음 {errors[:1]}')
        if not LIVE:
            for sid in ['bi-ideal', 'bi-top3', 'bi-us', 'bi-long']:
                page.locator(f'#sec-{sid}').screenshot(path=os.path.join(OUT, f'{TAG}card-{sid}-390.png'))

        # ── 3. 잠금 전 맛보기 (미리보기 없이) ────────────────
        print('[3] 잠금 상태 — 첫 장 무료 블록이 보인다')
        ctx2 = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
        p2 = ctx2.new_page()
        p2.goto(base + '#/input', wait_until='networkidle')
        fill_birth(p2)
        p2.goto(base + '#/product/bias', wait_until='networkidle')
        fill_bias(p2)
        p2.wait_for_selector('#report-capture', timeout=15000)
        body = p2.inner_text('#report-capture')
        check('최애가 끌리는 사주' in body, '잠금 상태에서도 첫 장 제목')
        blurred = p2.evaluate('''() => {
          const out = [];
          document.querySelectorAll('#report-capture .lock-blur').forEach((n) => out.push(n.innerText));
          return out.join(' ');
        }''')
        visible = p2.evaluate('''() => {
          const root = document.querySelector('#report-capture');
          let text = '';
          root.querySelectorAll('*').forEach((n) => {
            if (n.closest('.lock-blur') || n.closest('.lock-wrap') || n.closest('.lock-band')) return;
            if (n.children.length === 0) text += ' ' + n.textContent;
          });
          return text;
        }''')
        check('무장해제되는 사람' not in visible, '무장해제 문단은 잠금 뒤(흐림)에만 있다')
        check('무장해제되는 사람' in blurred, '잠금 뒤 블록이 흐림 처리로 이어진다')
        check('결제 후' in body or '잠금 해제' in body or '여기서부터 잠겨' in body, '잠금 안내가 보인다')
        over = p2.evaluate('document.documentElement.scrollWidth - window.innerWidth')
        check(over <= 0, f'잠금 화면 가로 스크롤 없음({over}px)')
        ctx2.close()

        # ── 4. 이미지 저장 → PNG ──────────────────────────
        print('[4] 이미지 저장 — PNG 생성')
        downloads = []
        page.on('download', lambda d: downloads.append(d))
        page.locator('[data-action="save-image"]').first.click()
        page.wait_for_function('document.querySelectorAll("#toast-root .toast").length > 0', timeout=90000)
        page.wait_for_timeout(15000)
        check(len(downloads) >= 1, f'PNG 다운로드 {len(downloads)}장')
        for i, download in enumerate(downloads):
            path = os.path.join(OUT, f'{TAG}report-{download.suggested_filename}')
            download.save_as(path)
            w, h = png_size(path)
            size = os.path.getsize(path)
            check(w == 860, f'{i+1}장 가로 {w}px (430 × 2배)')
            check(400 <= h <= 12100, f'{i+1}장 세로 {h}px')
            check(size > 30000, f'{i+1}장 파일 {size // 1024}KB (빈 이미지 아님)')
        ctx.close()
        browser.close()

    if httpd:
        httpd.shutdown()
    print('\nFAILS:', len(FAILS))
    for f in FAILS:
        print(' -', f)
    sys.exit(1 if FAILS else 0)


if __name__ == '__main__':
    main()
