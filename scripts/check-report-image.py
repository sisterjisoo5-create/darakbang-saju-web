# -*- coding: utf-8 -*-
"""리포트 이미지 저장 · 자미두수 카드 정렬 · 입력 화면 문구 검수.

확인 항목
  · #/input — 무료 안내가 금빛 한 줄 + 전체풀이 한 줄 (중복 문구 없음), 390·1280 동일
  · 무료 결과 자미두수 카드 — `명궁 (나의 캐릭터)` · `복덕궁 (마음·행복 포인트)` 가 같은 줄
    (궁 이름 오른쪽에 설명, 줄바꿈·겹침 없음) — 375·390·430·1280
  · 리포트 화면 — `리포트 인쇄 · PDF` 없음, `이미지 저장` 있음
  · `이미지 저장` 클릭 → PNG 생성·다운로드(데스크톱), 파일이 비어 있지 않고 카드가 담김
  · 공유 시트(iOS Safari 흉내) — canShare/share 로 PNG File 전달, 사용자가 취소(AbortError)해도 오류 아님

사용
  python3 scripts/check-report-image.py            # dist 로컬
  SITE=1 python3 scripts/check-report-image.py     # 라이브
"""
import http.server
import os
import re
import socketserver
import threading

from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DIST = os.path.join(ROOT, 'dist')
OUT = os.path.abspath(os.path.join(ROOT, '..', 'downloads'))
PORT = 4231
CHROME = '/workspace/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell'
LIBS = ':'.join([
    '/workspace/tmp/libs/usr/lib/x86_64-linux-gnu',
    '/workspace/.cache/sysroot/usr/lib/x86_64-linux-gnu',
])
BASE_PATH = '/darakbang-saju-web'
LIVE = os.environ.get('SITE', '').strip()
LIVE_URL = 'https://sisterjisoo5-create.github.io/darakbang-saju-web/'
TAG = 'live-' if LIVE else ''

os.makedirs(OUT, exist_ok=True)
FAILS = []

LEAD_FREE = '나의 원국•오행온도•12띠×일주동물•자미두수 맛보기 카드가 무료로 열립니다.'
LEAD_REST = '전체풀이는 990원(1구슬), 평생 종합 리포트는 10구슬 입니다.'
ME = {'year': '1991', 'month': '05', 'day': '07', 'hour': '18', 'minute': '22'}


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


def png_size(path):
    with open(path, 'rb') as f:
        head = f.read(33)
    assert head[:8] == b'\x89PNG\r\n\x1a\n', 'PNG 시그니처가 아니다'
    w = int.from_bytes(head[16:20], 'big')
    h = int.from_bytes(head[20:24], 'big')
    return w, h


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

        # ── 1. 입력 화면 문구 ─────────────────────────────
        print('[1] 입력 화면 — 무료 안내 한 줄')
        for w, h in [(390, 844), (1280, 900)]:
            ctx = browser.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2)
            page = ctx.new_page()
            page.goto(base + '#/input', wait_until='networkidle')
            lead = page.locator('.input-page__lead')
            check(lead.count() == 1, f'{w}px — 안내 문단 1개')
            text = lead.inner_text()
            check(LEAD_FREE in text, f'{w}px — 금빛 무료 안내 문구')
            check(LEAD_REST in text, f'{w}px — 전체풀이 안내 문구')
            check('4가지의 맛보기' not in text, f'{w}px — 중복 문구 없음')
            color = page.eval_on_selector('.input-page__lead-free', 'el => getComputedStyle(el).color')
            check(color == 'rgb(230, 195, 120)', f'{w}px — 무료 안내가 금빛({color})')
            page.screenshot(path=os.path.join(OUT, f'{TAG}img-check-input-{w}.png'), full_page=False)
            ctx.close()

        # ── 2. 자미두수 카드 정렬 ──────────────────────────
        print('[2] 무료 결과 — 자미두수 카드 명궁/복덕궁 한 줄 정렬')
        for w, h in [(375, 812), (390, 844), (430, 932), (1280, 900)]:
            ctx = browser.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2)
            page = ctx.new_page()
            page.goto(base + '#/input', wait_until='networkidle')
            fill_birth(page)
            page.wait_for_selector('.jami3__item', timeout=8000)
            for label, desc in [('명궁', '(나의 캐릭터)'), ('복덕궁', '(마음·행복 포인트)')]:
                item = page.locator('.jami3__item').filter(has_text=label).first
                box = item.locator('.jami3__head').bounding_box()
                name = item.locator('.jami3__head b').bounding_box()
                d = item.locator('.jami3__head .jami3__desc').bounding_box()
                same_row = abs((name['y'] + name['height'] / 2) - (d['y'] + d['height'] / 2)) <= 6
                to_right = d['x'] >= name['x'] + name['width'] - 1
                inside = (d['x'] + d['width']) <= (box['x'] + box['width'] + 1)
                check(same_row, f'{w}px — {label} 설명이 같은 줄 (Δy={abs(name["y"] + name["height"] / 2 - d["y"] - d["height"] / 2):.1f}px)')
                check(to_right, f'{w}px — {label} 설명이 궁 이름 오른쪽')
                check(inside, f'{w}px — {label} 설명이 카드 안에 들어옴')
                check(desc in item.inner_text(), f'{w}px — {label} 문구 유지')
            # 가로 스크롤 없음
            over = page.evaluate('document.documentElement.scrollWidth - window.innerWidth')
            check(over <= 0, f'{w}px — 가로 스크롤 없음({over}px)')
            if w in (390, 1280):
                page.locator('.jami3').first.screenshot(path=os.path.join(OUT, f'{TAG}img-check-jami-{w}.png'))
            ctx.close()

        # ── 3. 리포트 이미지 저장 (데스크톱 = 다운로드) ────────
        print('[3] 리포트 — 이미지 저장 버튼 · PNG 다운로드')
        ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2,
                                  accept_downloads=True)
        page = ctx.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(base + '?preview=3f990#/input?next=newyear', wait_until='networkidle')
        fill_birth(page)
        page.wait_for_selector('#report-capture', timeout=10000)
        body = page.inner_text('body')
        check('리포트 인쇄' not in body and 'PDF' not in body.split('자주 묻는')[0], '리포트 화면에 「리포트 인쇄 · PDF」 없음')
        save_btn = page.locator('[data-action="save-image"]')
        check(save_btn.count() >= 1, '「이미지 저장」 버튼 있음')
        check(save_btn.first.inner_text().strip() == '이미지 저장', '버튼 문구 = 이미지 저장')

        downloads = []
        page.on('download', lambda d: downloads.append(d))
        save_btn.first.click()
        # 저장 중 표시 → 완료 토스트
        page.wait_for_timeout(350)
        check(save_btn.first.get_attribute('aria-busy') == 'true', '누른 뒤 「저장 중」 상태 표시')
        page.wait_for_function('document.querySelectorAll("#toast-root .toast").length > 0', timeout=60000)
        toasts = ' '.join(page.locator('#toast-root .toast').all_inner_texts())
        check('이미지' in toasts or '저장' in toasts, f'완료 토스트: {toasts.strip()[:50]}')
        page.wait_for_timeout(20000)
        check(len(downloads) >= 1, f'PNG 다운로드 {len(downloads)}장')
        for i, download in enumerate(downloads):
            path = os.path.join(OUT, f'{TAG}report-{download.suggested_filename}')
            download.save_as(path)
            w, h = png_size(path)
            size = os.path.getsize(path)
            check(w == 860, f'{i+1}장 가로 {w}px (430px × 2배)')
            check(400 <= h <= 12100, f'{i+1}장 세로 {h}px (한 장 상한 안)')
            check(size > 60000, f'{i+1}장 용량 {size // 1024}KB (빈 이미지 아님)')
            check(download.suggested_filename.startswith('다락방 ') and download.suggested_filename.endswith('.png'),
                  f'{i+1}장 파일명 {download.suggested_filename}')
            print(f'  file {path} ({w}x{h}, {size // 1024}KB)')


        check(not errors, f'콘솔·페이지 오류 없음 {errors[:2]}')
        ctx.close()

        # ── 4. iOS Safari 흉내 — 공유 시트 · 취소 처리 ────────
        print('[4] 모바일 공유 시트 — PNG File 전달 · 취소는 오류 아님')
        ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2,
                                  user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')
        page = ctx.new_page()
        page.add_init_script("""
          window.__shared = null;
          navigator.canShare = (data) => !!(data && data.files && data.files.length);
          navigator.share = (data) => {
            window.__shared = {
              count: data.files ? data.files.length : 0,
              names: data.files ? [...data.files].map((f) => f.name) : [],
              types: data.files ? [...data.files].map((f) => f.type) : [],
              sizes: data.files ? [...data.files].map((f) => f.size) : [],
            };
            const err = new Error('cancel');
            err.name = 'AbortError';
            return Promise.reject(err);
          };
        """)
        page.goto(base + '?preview=3f990#/input?next=newyear', wait_until='networkidle')
        fill_birth(page)
        page.wait_for_selector('#report-capture', timeout=10000)
        page.click('[data-action="save-image"]')
        page.wait_for_function('window.__shared !== null', timeout=90000)
        shared = page.evaluate('window.__shared')
        check(shared['count'] >= 1, f'공유 파일 {shared["count"]}장')
        check(all(t == 'image/png' for t in shared['types']), f'PNG 파일 형식 {shared["types"]}')
        check(all(s > 20000 for s in shared['sizes']), f'파일 크기 {shared["sizes"]}')
        check(all(n.endswith('.png') for n in shared['names']), f'파일 이름 {shared["names"]}')
        # AbortError(사용자 취소)는 오류 토스트로 이어지지 않는다
        page.wait_for_timeout(800)
        toasts = ' '.join(page.locator('#toast-root .toast').all_inner_texts())
        check('만들지 못했' not in toasts, '취소(AbortError)를 오류로 처리하지 않음')
        check('취소' in toasts or '이미지' in toasts, f'취소 안내 토스트: {toasts.strip()[:60]}')
        modal = page.locator('[data-action="save-image-share"]').count()
        check(modal == 0, '취소 후 미리보기 모달을 띄우지 않음')
        ctx.close()

        browser.close()
    if httpd:
        httpd.shutdown()

    print()
    if FAILS:
        print(f'실패 {len(FAILS)}건')
        for f in FAILS:
            print('  -', f)
        raise SystemExit(1)
    print('전부 통과')


if __name__ == '__main__':
    main()
