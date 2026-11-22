# -*- coding: utf-8 -*-
"""최애궁합 개편 검수 — 1장 삼주육자 → 2장 찰떡 일주 TOP 3 → 3장 우리의 첫 만남 → 4장 연애 궁합
  · 맨 위 요약 카드 없이 리포트가 바로 1장 삼주육자로 시작한다(이미지 저장 바는 유지)
  · 1장 성격 박스는 다섯 줄, 3장 첫 만남은 계절·장소·시간 + 한 장면, 4장 끝은 설렘 요약 네 줄
  · 4장 설렘 요약 — 해설 없는 한 줄 · 실제 멘트 세 개 · 데이트 세 곳 · 소재/하의/컬러 나열
  · 리포트 어디에도 팬·덕질·무대·카메라 앞·최애 프레임이 없다(연애 몰입 톤)
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

        # ── 1. 첫 화면 — 상단 요약 카드 없이 1장 삼주육자부터 ─────────────
        print('[1] 최애궁합 — 리포트 첫 화면')
        for w, h in [(375, 812), (390, 844), (1280, 900)]:
            ctx = browser.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2)
            page = ctx.new_page()
            page.goto(base + '?preview=3f990#/input?next=bias', wait_until='networkidle')
            fill_birth(page)
            fill_bias(page)
            page.wait_for_selector('#report-capture', timeout=15000)
            info = page.evaluate('''() => {
              const root = document.querySelector('#report-capture');
              const first = root.querySelector('.rp .sheet__title');
              return {
                previewCard: !!root.querySelector('.bias-preview'),
                firstCard: first ? first.innerText : '',
                saveBar: !!root.querySelector('[data-action=\"save-image\"]'),
                firstChapter: root.innerText.indexOf('삼주육자'),
                beforeFirst: root.innerText.slice(0, Math.max(0, root.innerText.indexOf('삼주육자'))),
              };
            }''')
            check(not info['previewCard'], f'{w}px — 맨 위 요약 카드가 없다')
            check('삼주육자' in info['firstCard'], f'{w}px — 첫 카드가 삼주육자 ({info["firstCard"]})')
            check(info['firstChapter'] >= 0, f'{w}px — 삼주육자 문구가 있다')
            check('그리고 나' not in info['beforeFirst'], f'{w}px — 삼주육자 앞에 “최애의 삼주육자, 그리고 나” 카드가 없다')
            check('연인이 된다면' not in info['beforeFirst'], f'{w}px — 삼주육자 앞에 맛보기 점수 카드가 없다')
            check(info['saveBar'], f'{w}px — 이미지 저장 상단 바는 남아 있다')
            over = page.evaluate('document.documentElement.scrollWidth - window.innerWidth')
            check(over <= 0, f'{w}px — 가로 스크롤 없음({over}px)')
            if w in (390, 1280):
                page.locator('#sec-bi-six').screenshot(path=os.path.join(OUT, f'{TAG}first-card-{w}.png'))
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
        heads = ['삼주육자', '찰떡인 일주 TOP 3', '우리의 첫 만남은', '그래서 나랑 연애하면']
        pos = [report.find(x) for x in heads]
        check(all(x >= 0 for x in pos), f'네 장 제목이 다 있다 {pos}')
        check(pos == sorted(pos), '장 순서가 삼주육자 → TOP 3 → 첫 만남 → 연애 궁합')
        check('가까운 사람만 아는 다섯 줄' in report and '단둘이 있을 때' in report, '1장에 성격 다섯 줄 박스')
        check('사람들 앞 —' in report and '사소한 습관 —' in report and '마음결 —' in report, '1장 박스는 사람들 앞·단둘이·습관·마음결·가까운 사람 기준')
        check('[1위]' in report and '[2위]' in report and '[3위]' in report, 'TOP 3 세 자리')
        check('어! 내 일주' in report or '60일주 중' in report, '내 일주 자리 안내')
        check('그날의 기운' in report and '한 장면' in report, '3장 첫 만남의 4요소 + 한 장면')
        check('설렘 포인트 셋' in report, '연애 궁합 설렘 포인트')
        check('빈틈을 채우는 방식' in report, '내가 채우는 빈틈')
        check('엇박자' in report and '빛나는 달' in report, '엇박자·빛나는 달')
        check('설렘 요약' in report and '내게 듣고 싶은 말' in report, '4장 끝 설렘 요약 네 줄')
        check(report.count('“') >= 6, f'설렘 요약에 실제 멘트 인용문이 여러 개 ({report.count("“")}개)')
        check('우리 둘이 잘 어울리는 커플룩' in report, '4장 넷째 줄은 커플룩')
        check('데이트룩' not in report, '옛 데이트룩 문구가 남아 있지 않다')
        check('소재 —' in report and '하의 —' in report and '컬러 —' in report and '아이템 —' in report, '커플룩은 소재·하의·컬러·아이템 나열')
        check('3장의 그 자리' in report, '데이트 첫 곳은 3장에서 뽑힌 장소')
        check('한 사람은' not in report and '다른 한 사람은' not in report, '커플룩에 한 사람/다른 한 사람 문장이 없다')
        check('인생네컷' not in report and '최애 프레임' not in report, '인생네컷·최애 프레임 문구가 없다')
        check('직빵' not in report, '옛 직빵인 한 마디 문구가 남아 있지 않다')
        # 연애 몰입 톤 — 관객 자리로 되돌리는 말이 리포트 안에 없다
        check('덕질' not in report, '덕질 문구가 없다')
        check('무대' not in report, '무대 위/밖 문구가 없다')
        check('카메라 앞' not in report, '카메라 앞 문구가 없다')
        check('팬' not in report.replace('팬츠', ''), '팬 문구가 없다')
        check('오늘의 다락방 처방' not in report, 'TODAY 처방은 빠져 있다')
        check(not errors, f'자바스크립트 오류 없음 {errors[:1]}')
        if not LIVE:
            for sid in ['bi-six', 'bi-top3', 'bi-first', 'bi-us']:
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
        check('삼주육자' in body, '잠금 상태에서도 첫 장 제목')
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
        check('사소한 습관 —' not in visible, '성격 박스는 잠금 뒤(흐림)에만 있다')
        check('사소한 습관 —' in blurred, '잠금 뒤 블록이 흐림 처리로 이어진다')
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
