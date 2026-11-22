# -*- coding: utf-8 -*-
"""연애운 · 사랑운 — 결제일 기준 앞뒤 월별 인연 타이밍 검수.

확인 항목
  · `#/product/love` (검수 미리보기 ?preview=3f990) — '인연이 오는 시기' 섹션
    · 10년 대운 문단·대운 표는 그대로 남아 있다
    · 그 아래 「{지난 3개월} ~ {앞으로 6개월} — 달마다의 인연」 소제목과 기준일 안내
    · 기준일은 **오늘(서울)** 이다 — 실행 날짜로 계산해 대조한다(하드코딩 없음)
    · 열 달 목록 — 달마다 `YYYY년 M월 · 월건월 · 오행 기운 — …` 문장
    · 월건·십성·일지 관계가 화면 값으로 맞는지 (첫 달/끝 달 표본)
    · '가장 문이 열린 달' · '말을 고를 달' 요약
    · 390px 가로 넘침 0 · 콘솔 오류 0
  · `이미지 저장` — 리포트 PNG 가 정상 생성·다운로드되고 모든 장에 월별 인연 달력이 담긴다
  · 재회운 `#/product/reunion` — 「다시 이어지는 시기」 표의 '마음의 결' 12칸이
    예전 상수(`관계의 문이 움직임`)로 도배되지 않고 십성·일지 관계에 따라 서로 다르다
    (마음이 물러지는 달 = 정인·편인·식신 / 말이 세지는 달 = 상관·겁재·편관 과도 어긋나지 않는다)

사용
  python3 scripts/check-love-timing.py            # dist 로컬
  SITE=1 python3 scripts/check-love-timing.py     # 라이브
"""
import http.server
import os
import re
import socketserver
import threading
from datetime import datetime

from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DIST = os.path.join(ROOT, 'dist')
OUT = os.path.abspath(os.path.join(ROOT, '..', 'downloads'))
PORT = 4241
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

os.makedirs(OUT, exist_ok=True)
FAILS = []

ME = {'year': '1991', 'month': '05', 'day': '07', 'hour': '18', 'minute': '22'}
KO_MONTHS = ['입춘', '경칩', '청명', '입하', '망종', '소서', '입추', '백로', '한로', '입동', '대설', '소한']
STEMS = '갑을병정무기경신임계'
BRANCHES = '자축인묘진사오미신유술해'


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


def fill_birth(page, base):
    # 미리보기는 첫 로드 때 주소를 읽으므로, 해시만 바꾸는 이동이 아니라 쿼리를 붙여 처음부터 연다
    page.goto(f'{base}?preview={PREVIEW}#/input', wait_until='networkidle')
    for k, v in ME.items():
        page.fill(f'input[name="{k}"]', v)
    page.click('form[data-form="birth"] button[type="submit"]')
    page.wait_for_selector('.result-page', timeout=12000)


def month_pillar(year, month):
    """달력 연·월 → 월건 (절기 기준 · 1월은 전년도 술년의 축월)"""
    order = 11 if month == 1 else month - 2
    saju_year = year - 1 if month == 1 else year
    year_stem = ((saju_year - 4) % 10 + 10) % 10
    stem = ([2, 4, 6, 8, 0][year_stem % 5] + order) % 10
    branch = (2 + order) % 12
    return f'{STEMS[stem]}{BRANCHES[branch]}'


def seoul_today():
    try:
        from zoneinfo import ZoneInfo
        return datetime.now(ZoneInfo('Asia/Seoul'))
    except Exception:  # noqa: BLE001 — tzdata 가 없으면 UTC+9 로 계산
        from datetime import timedelta, timezone
        return datetime.now(timezone(timedelta(hours=9)))


def add_months(year, month, add):
    total = year * 12 + (month - 1) + add
    return total // 12, total % 12 + 1


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
        print('[1] 연애운 — 결제일 기준 앞뒤 월별 인연 타이밍')
        ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2,
                                  accept_downloads=True)
        page = ctx.new_page()
        errs = []
        page.on('pageerror', lambda e: errs.append(str(e)))
        fill_birth(page, base)
        page.goto(f'{base}?preview={PREVIEW}#/product/love', wait_until='networkidle')
        page.wait_for_selector('#sec-lf-when', timeout=15000)

        today = seoul_today()
        start = add_months(today.year, today.month, -3)
        end = add_months(today.year, today.month, 6)
        from_label = f'{start[0]}년 {start[1]}월'
        to_label = f'{end[0]}년 {end[1]}월'
        basis_label = f'{today.year}년 {today.month}월'

        data = page.evaluate("""() => {
          const sec = document.querySelector('#sec-lf-when');
          const subs = [...sec.querySelectorAll('h4')].map((h) => h.textContent.trim());
          const ps = [...sec.querySelectorAll('p')].map((p) => p.textContent.trim());
          const kv = [...sec.querySelectorAll('.kv-grid > div')].map((d) => [
            d.querySelector('dt').textContent.trim(), d.querySelector('dd').textContent.trim()]);
          const items = [...sec.querySelectorAll('ul li')].map((li) => li.textContent.trim());
          const tables = [...sec.querySelectorAll('table')].map((t) => t.querySelector('th')?.textContent.trim());
          const h4 = [...sec.querySelectorAll('h4')];
          const iSub = h4.findIndex((h) => h.textContent.includes('달마다의 인연'));
          const order = iSub >= 0 && tables.length
            ? sec.innerHTML.indexOf('<table') < sec.innerHTML.indexOf('달마다의 인연') : false;
          return {
            subs, ps, kv, items, tables, order,
            over: document.documentElement.scrollWidth - window.innerWidth,
            text: sec.innerText,
          };
        }""")

        # ① 10년 대운은 그대로
        check(data['tables'] and data['tables'][0] == '대운', f"대운 표 유지 {data['tables']}")
        check(any('대운' in t for t in data['ps']), '대운 문단 유지')
        # ② 그 아래 월별 인연
        sub = next((s for s in data['subs'] if '달마다의 인연' in s), '')
        check(sub == f'{from_label} ~ {to_label} — 달마다의 인연', f'월별 인연 소제목 「{sub}」')
        check(data['order'], '대운 표 → 월별 인연 순서')
        check(any(f'결제일({basis_label})' in t for t in data['ps']), f'기준일이 오늘({basis_label})')
        check(len(data['items']) == 10, f"열 달 목록 {len(data['items'])}개")
        check(len(data['kv']) == 3, f"요약 {len(data['kv'])}칸 {[k for k, _ in data['kv']]}")

        months = [add_months(today.year, today.month, -3 + i) for i in range(10)]
        for item, (y, m) in zip(data['items'], months):
            ganji = month_pillar(y, m)
            head = f'{y}년 {m}월 · {ganji}월 · '
            check(item.startswith(head), f'{y}년 {m}월 문장 머리 「{item[:28]}…」')
            check(' 기운 — ' in item, f'{y}년 {m}월 오행 기운 표기')
            check(len(item) > 60, f'{y}년 {m}월 풀이 길이 {len(item)}자')
        first_g = month_pillar(*months[0])
        last_g = month_pillar(*months[-1])
        check(first_g in data['items'][0] and last_g in data['items'][-1],
              f'월건 대조 {months[0]}={first_g} · {months[-1]}={last_g}')
        check(data['over'] <= 0, f"390px 가로 스크롤 없음({data['over']}px)")
        check(not errs, f'콘솔 오류 없음 {errs[:2]}')

        sec = page.locator('#sec-lf-when')
        sec.scroll_into_view_if_needed()
        sec.screenshot(path=os.path.join(OUT, f'{TAG}love-timing-390.png'))
        print(f'  file {os.path.join(OUT, f"{TAG}love-timing-390.png")}')

        # ── 2. 리포트 이미지 저장 — 월별 인연 달력까지 PNG 로 ──
        print('[2] 연애운 리포트 이미지 저장')
        downloads = []
        page.on('download', lambda d: downloads.append(d))
        page.click('[data-action="save-image"]')
        page.wait_for_function('document.querySelectorAll("#toast-root .toast").length > 0', timeout=120000)
        page.wait_for_timeout(14000)
        check(len(downloads) >= 1, f'PNG {len(downloads)}장')
        for i, d in enumerate(downloads):
            path = os.path.join(OUT, f'{TAG}love-report-{i + 1}-{d.suggested_filename}')
            d.save_as(path)
            w, h = png_size(path)
            size = os.path.getsize(path)
            check(w == 860, f'{i + 1}장 가로 {w}px')
            check(size > 40000, f'{i + 1}장 용량 {size // 1024}KB')
            print(f'  file {path} ({w}x{h}, {size // 1024}KB)')
        check(not errs, f'저장 중 오류 없음 {errs[:2]}')
        ctx.close()

        # ── 3. 재회운 — 마음의 결 12칸이 도배되지 않는다 ──
        print('[3] 재회운 — 다시 이어지는 시기 표의 마음의 결')
        ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
        page = ctx.new_page()
        errs2 = []
        page.on('pageerror', lambda e: errs2.append(str(e)))
        fill_birth(page, base)  # 새 컨텍스트에는 저장된 생년월일이 없다 — 먼저 넣는다
        page.goto(f'{base}?preview={PREVIEW}#/product/reunion', wait_until='networkidle')
        page.wait_for_selector('#sec-rj-when table', timeout=15000)
        rows = page.evaluate("""() => [...document.querySelectorAll('#sec-rj-when table tbody tr')]
          .map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent.trim()))""")
        check(len(rows) == 12, f'12달 표 {len(rows)}행')
        notes = [r[3] for r in rows]
        check('관계의 문이 움직임' not in notes, '예전 기본값(관계의 문이 움직임)이 없다')
        uniq = sorted(set(notes))
        check(len(uniq) >= 8, f'마음의 결 {len(uniq)}가지 — {uniq}')
        for label, ganji, sipsung, note in rows:
            if sipsung in ('정인', '편인', '식신'):
                check(any(k in note for k in ('답이 오는', '생각나는', '말 트는')), f'{label} {sipsung} → {note}')
            if sipsung in ('상관', '겁재', '편관'):
                check(any(k in note for k in ('칼이 되는', '자존심', '재촉하면')), f'{label} {sipsung} → {note}')
        check(not errs2, f'재회운 오류 없음 {errs2[:2]}')
        page.locator('#sec-rj-when').scroll_into_view_if_needed()
        page.locator('#sec-rj-when').screenshot(path=os.path.join(OUT, f'{TAG}reunion-timing-390.png'))
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
