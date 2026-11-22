# -*- coding: utf-8 -*-
"""신년·월별 운세 · 평생 종합 리포트 — 결제(열람)일 기준 '앞으로 열두 달' 검수.

확인 항목
  · #/product/{newyear,lifetime} (검수 미리보기 ?preview=3f990)
    · 제목이 연도를 박지 않는다 — `앞으로 열두 달 운세`
    · 「월별 흐름 12개」 막대 12개 — 이름이 `26.11` 꼴(연.월)이고, 첫 달은 **오늘(서울)이 속한 달**
    · 표 12행 — `연.월` 칸이 막대와 같고, 월건은 절기 기준 엔진과 일치
    · 소제목이 `{오늘} ~ {열한 달 뒤}` · 요약 3칸(가장 좋은 달·힘을 빼야 할 달·기준일)
    · 2027년 하드코딩(`2027 정미년`, `2027년은`) 없음
    · 375·390px 가로 넘침 0 · 콘솔 오류 0
  · 두 리포트 모두 `이미지 저장` → PNG(860px) 실제 생성

사용
  python3 scripts/check-sewoon-window.py            # dist 로컬
  SITE=1 python3 scripts/check-sewoon-window.py     # 라이브
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
PORT = 4243
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
REPORTS = [
    ('newyear', '앞으로 열두 달 운세'),
    ('lifetime', '평생 종합 리포트'),
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
    months = [add_months(today.year, today.month, i) for i in range(12)]
    shorts = [f'{str(y)[2:]}.{m:02d}' for y, m in months]
    from_label = f'{today.year}년 {today.month}월'
    to_label = f'{months[-1][0]}년 {months[-1][1]}월'
    basis_label = from_label

    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=CHROME,
            args=['--no-sandbox', '--font-render-hinting=none'],
            env={**os.environ, 'LD_LIBRARY_PATH': LIBS},
        )

        print(f'[1] 열두 달 창 — 결제일({basis_label}) 기준 {shorts[0]} ~ {shorts[-1]}')
        for pid, screen_title in REPORTS:
            for width in (375, 390):
                ctx = browser.new_context(viewport={'width': width, 'height': 844}, device_scale_factor=2)
                page = ctx.new_page()
                errs = []
                page.on('pageerror', lambda e: errs.append(str(e)))
                fill_birth(page, base)
                page.goto(f'{base}?preview={PREVIEW}#/product/{pid}', wait_until='networkidle')
                page.wait_for_selector('#sec-ny-months', timeout=20000)

                data = page.evaluate("""() => {
                  const head = document.querySelector('.result-head h1');
                  const sec = document.querySelector('#sec-ny-months');
                  const sub = sec.querySelector('h4');
                  const table = sec.querySelector('table');
                  const open = document.querySelector('#sec-ny-open');
                  const kv = [...open.querySelectorAll('.kv-grid > div')].map((d) => [
                    d.querySelector('dt').textContent.trim(),
                    d.querySelector('dd').textContent.trim(),
                  ]);
                  const bars = [...sec.querySelectorAll('.bar-row')].map((r) => ({
                    label: r.querySelector('.bar-row__label').textContent.trim(),
                    note: r.querySelector('.bar-row__note') ? r.querySelector('.bar-row__note').textContent.trim() : '',
                  }));
                  const rows = [...table.querySelectorAll('tbody tr')].map((tr) =>
                    [...tr.querySelectorAll('td')].map((td) => td.textContent.trim()));
                  return {
                    title: head ? head.textContent.trim() : '',
                    sub: sub ? sub.textContent.trim() : '',
                    heads: [...table.querySelectorAll('th')].map((th) => th.textContent.trim()),
                    bars, rows, kv,
                    openText: open.innerText,
                    over: document.documentElement.scrollWidth - window.innerWidth,
                  };
                }""")

                tag = f'{screen_title} {width}px'
                check(data['over'] <= 0, f'{tag} — 가로 스크롤 없음({data["over"]}px)')
                check(not errs, f'{tag} — 콘솔 오류 없음 {errs[:2]}')
                if pid == 'newyear':
                    check(data['title'] == screen_title, f'{tag} — 제목 「{data["title"]}」')
                check(data['sub'].startswith(f'{from_label} ~ {to_label}'), f'{tag} — 소제목 「{data["sub"]}」')
                check([b['label'] for b in data['bars']] == shorts,
                      f'{tag} — 막대 {len(data["bars"])}개 {[b["label"] for b in data["bars"]][:3]}…')
                check(all(b['note'] for b in data['bars']), f'{tag} — 막대 메모(월건·십성) 있음')
                check(data['heads'][:3] == ['연.월', '월건', '십성'], f'{tag} — 표 머리 {data["heads"]}')
                check(len(data['rows']) == 12, f'{tag} — 표 {len(data["rows"])}행')
                check([r[0] for r in data['rows']] == shorts, f'{tag} — 표의 달 = 막대의 달')
                bad = []
                for row, (y, m) in zip(data['rows'], months):
                    if row[1] != month_pillar(y, m):
                        bad.append(f'{row[0]} {row[1]}≠{month_pillar(y, m)}')
                    if not all(row):
                        bad.append(f'{row[0]} 빈 칸')
                check(not bad, f'{tag} — 월건·빈 칸 {bad[:3]}')
                check(len(data['kv']) == 3, f'{tag} — 요약 {len(data["kv"])}칸 {data["kv"]}')
                check(basis_label in (data['kv'][-1][1] if data['kv'] else ''), f'{tag} — 기준일 칸')
                check('2027 정미년' not in data['openText'] and '2027년은' not in data['openText'],
                      f'{tag} — 2027년 하드코딩 없음')
                if width == 390:
                    el = page.locator('#sec-ny-months')
                    el.scroll_into_view_if_needed()
                    el.screenshot(path=os.path.join(OUT, f'{TAG}sewoon-{pid}-390.png'))
                ctx.close()

        print('[2] 이미지 저장 — 신년 · 평생 모두 PNG')
        for pid, screen_title in REPORTS:
            ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2,
                                      accept_downloads=True)
            page = ctx.new_page()
            errs = []
            page.on('pageerror', lambda e: errs.append(str(e)))
            fill_birth(page, base)
            page.goto(f'{base}?preview={PREVIEW}#/product/{pid}', wait_until='networkidle')
            page.wait_for_selector('#sec-ny-months', timeout=20000)
            downloads = []
            page.on('download', lambda d: downloads.append(d))
            page.click('[data-action="save-image"]', timeout=15000)
            page.wait_for_function('document.querySelectorAll("#toast-root .toast").length > 0', timeout=180000)
            page.wait_for_timeout(20000)
            check(len(downloads) >= 1, f'{screen_title} — PNG {len(downloads)}장')
            for i, d in enumerate(downloads[:3]):
                path = os.path.join(OUT, f'{TAG}sewoon-{pid}-{i + 1}-{d.suggested_filename}')
                d.save_as(path)
                w, h = png_size(path)
                size = os.path.getsize(path)
                check(w == 860 and size > 40000, f'{screen_title} — {i + 1}장 {w}×{h}px · {size // 1024}KB')
            check(not errs, f'{screen_title} — 저장 중 오류 없음 {errs[:2]}')
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
