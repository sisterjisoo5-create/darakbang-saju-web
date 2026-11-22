# -*- coding: utf-8 -*-
"""결제일 기준 앞뒤 월별 오행 흐름 — 연애 · 재회 · 직업 · 재물 네 리포트 검수.

확인 항목
  · 4종 리포트(#/product/{love,reunion,career,wealth}, 검수 미리보기 ?preview=3f990)에
    「{지난 3개월} ~ {앞으로 6개월} — 달마다의 …」 블록이 있다
    · 기준일은 **오늘(서울)** — 실행 날짜로 창을 따로 계산해 대조한다(하드코딩 없음)
    · 열 달 목록 — 달마다 `YYYY년 M월 · 월건월 · 오행 기운 — …` 문장, 풀이가 서로 다르다
    · 요약 3칸(가장 좋은 달 · 조심할 달 · 내 일지)
    · 390px 가로 넘침 0 · 콘솔 오류 0
  · 4종 모두 `이미지 저장` 으로 리포트 PNG 가 실제로 만들어져 내려온다
  · 재회운 — 「다시 이어지는 시기」 12달 표의 '마음의 결' 이 예전 상수(`관계의 문이 움직임`)로
    도배되지 않고, 마음이 물러지는 달(정인·편인·식신)·말이 세지는 달(상관·겁재·편관) 문단과 어긋나지 않는다

사용
  python3 scripts/check-love-timing.py            # dist 로컬
  SITE=1 python3 scripts/check-love-timing.py     # 라이브
"""
import http.server
import os
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
STEMS = '갑을병정무기경신임계'
BRANCHES = '자축인묘진사오미신유술해'

# 상품 id, 섹션 id, 화면 이름, 그 리포트의 언어
PRODUCTS = [
    ('love', 'lf-when', '연애운', ['인연']),
    ('reunion', 'rj-when', '재회운', ['연락', '재회']),
    ('career', 'cr-move', '직업운', ['자리', '면접', '이직', '제안', '회사', '업무']),
    ('wealth', 'wt-tide', '재물운', ['돈', '결제', '계약', '지출']),
]


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

    today = seoul_today()
    start = add_months(today.year, today.month, -3)
    end = add_months(today.year, today.month, 6)
    from_label = f'{start[0]}년 {start[1]}월'
    to_label = f'{end[0]}년 {end[1]}월'
    basis_label = f'{today.year}년 {today.month}월'
    months = [add_months(today.year, today.month, -3 + i) for i in range(10)]

    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=CHROME,
            args=['--no-sandbox', '--font-render-hinting=none'],
            env={**os.environ, 'LD_LIBRARY_PATH': LIBS},
        )

        print(f'[1] 4종 — 결제일({basis_label}) 기준 열 달 흐름')
        for pid, sec_id, name, words in PRODUCTS:
            ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2,
                                      accept_downloads=True)
            page = ctx.new_page()
            errs = []
            page.on('pageerror', lambda e: errs.append(str(e)))
            fill_birth(page, base)
            page.goto(f'{base}?preview={PREVIEW}#/product/{pid}', wait_until='networkidle')
            page.wait_for_selector(f'#sec-{sec_id}', timeout=15000)

            data = page.evaluate("""(secId) => {
              const sec = document.querySelector('#sec-' + secId);
              const subs = [...sec.querySelectorAll('h4')].map((h) => h.textContent.trim());
              const kv = [...sec.querySelectorAll('.kv-grid > div')].map((d) => d.querySelector('dt').textContent.trim());
              const items = [...sec.querySelectorAll('ul li')].map((li) => li.textContent.trim())
                .filter((t) => t.includes(' 기운 — '));
              const intro = [...sec.querySelectorAll('p')].map((p) => p.textContent.trim())
                .find((t) => t.includes('결제일(')) || '';
              return {
                subs, kv, items, intro,
                over: document.documentElement.scrollWidth - window.innerWidth,
              };
            }""", sec_id)

            sub = next((s for s in data['subs'] if '~' in s and '달마다' in s), '')
            check(sub.startswith(f'{from_label} ~ {to_label} —'), f'{name} — 소제목 「{sub}」')
            check(f'결제일({basis_label})' in data['intro'], f'{name} — 기준일이 오늘({basis_label})')
            check(len(data['kv']) == 3, f'{name} — 요약 {len(data["kv"])}칸 {data["kv"]}')
            check(len(data['items']) == 10, f'{name} — 열 달 {len(data["items"])}개')
            for item, (y, m) in zip(data['items'], months):
                ganji = month_pillar(y, m)
                check(item.startswith(f'{y}년 {m}월 · {ganji}월 · ') and ' 기운 — ' in item,
                      f'{name} — {y}년 {m}월 문장 「{item[:26]}…」')
            bodies = {t.split(' 기운 — ')[1] for t in data['items'] if ' 기운 — ' in t}
            check(len(bodies) >= 5, f'{name} — 달마다 다른 풀이 {len(bodies)}가지')
            check(any(any(w in t for w in words) for t in data['items']), f'{name} — 리포트 언어 유지')
            check(data['over'] <= 0, f'{name} — 390px 가로 스크롤 없음({data["over"]}px)')
            check(not errs, f'{name} — 콘솔 오류 없음 {errs[:2]}')

            el = page.locator(f'#sec-{sec_id}')
            el.scroll_into_view_if_needed()
            el.screenshot(path=os.path.join(OUT, f'{TAG}flow-{pid}-390.png'))

            print(f'[2] {name} — 이미지 저장')
            downloads = []
            page.on('download', lambda d: downloads.append(d))
            page.click('[data-action="save-image"]')
            page.wait_for_function('document.querySelectorAll("#toast-root .toast").length > 0', timeout=120000)
            page.wait_for_timeout(14000)
            check(len(downloads) >= 1, f'{name} — PNG {len(downloads)}장')
            for i, d in enumerate(downloads):
                path = os.path.join(OUT, f'{TAG}flow-{pid}-{i + 1}-{d.suggested_filename}')
                d.save_as(path)
                w, h = png_size(path)
                size = os.path.getsize(path)
                check(w == 860 and size > 40000, f'{name} — {i + 1}장 {w}×{h}px · {size // 1024}KB')
            check(not errs, f'{name} — 저장 중 오류 없음 {errs[:2]}')
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
        for label, _ganji, sipsung, note in rows:
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
