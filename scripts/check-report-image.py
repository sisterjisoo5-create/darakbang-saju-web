# -*- coding: utf-8 -*-
"""리포트 이미지 저장 · 자미두수 카드 정렬 · 입력 화면 문구 검수.

확인 항목
  · #/input — 무료 안내가 금빛 한 줄 + 전체풀이 한 줄 (중복 문구 없음), 390·1280 동일
  · 무료 결과 자미두수 카드 — `명궁 (나의 캐릭터)` · `복덕궁 (마음·행복 포인트)` 가 같은 줄
    (궁 이름 오른쪽에 설명, 줄바꿈·겹침 없음) — 375·390·430·1280
  · 리포트 화면 — `리포트 인쇄 · PDF` 없음, `이미지 저장` 있음, TODAY 「오늘의 다락방 처방」 카드 없음
  · `이미지 저장` 클릭 → PNG 생성·다운로드(데스크톱), 파일이 비어 있지 않고 카드가 담김
    · 저장본 장마다 위에 미니 헤더(제목·생년월일시), 아래에 브랜드 + 페이지 번호(`1 / 3` … `3 / 3`)
    · 장은 카드 경계에서만 끊긴다 (카드 중간 잘림 없음 — 카드마다 테두리가 닫혀 있는지 확인)
  · 월별 흐름 막대 — 십성(`정관`·`편관`…)이 행 왼쪽 끝, 월 이름 바로 아래에 정렬 (2026-11-22 지시)
  · 무료 `12띠 × 일주 동물` 카드 — 60일주 팩폭 3가지 · 겉/속 대비 · `공유용 이미지 저장` 버튼
    · 버튼 → 한 장짜리 PNG(860px), 아래 브랜드, 카톡·인스타용
  · 공유 시트(iOS Safari 흉내) — canShare/share 로 PNG File 전달, 사용자가 취소(AbortError)해도 오류 아님

사용
  python3 scripts/check-report-image.py            # dist 로컬
  SITE=1 python3 scripts/check-report-image.py     # 라이브
"""
import http.server
import json
import os
import re
import socketserver
import threading
from datetime import datetime
from zoneinfo import ZoneInfo

from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))


def newyear_title():
    """서울 기준 이번 달의 신년 카드 이름 — 11~12월 `{다음 해} 신년 운세`, 1~2월 `{올해} 신년 운세`, 3~10월 `일년 운세`"""
    now = datetime.now(ZoneInfo('Asia/Seoul'))
    if now.month in (11, 12):
        return f'{now.year + 1} 신년 운세'
    if now.month in (1, 2):
        return f'{now.year} 신년 운세'
    return '일년 운세'


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

LEAD_FREE = '나의 원국 · 오행 온도 · 12띠 × 일주동물 · 자미두수 맛보기 카드가 무료로 열립니다.'
LEAD_REST = '전체 풀이는 990원(1구슬), 평생 종합 리포트는 10구슬입니다.'
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
        report = page.inner_text('#report-capture')
        check('오늘의 다락방 처방' not in report, '리포트에 TODAY 「오늘의 다락방 처방」 카드 없음')
        check('오늘의 일진' not in report, '리포트에 오늘의 일진 카드 없음')
        check('TODAY' not in report, '리포트에 TODAY 키커 없음')
        # 저장본 페이지 뼈대를 훔쳐본다 — 캡처하는 동안 화면 밖 host 의 장 머리·꼬리를 계속 읽는다
        page.evaluate("""() => {
          window.__caps = [];
          setInterval(() => {
            const host = document.getElementById('report-capture-host');
            if (!host) return;
            const t = host.querySelector('.capture-page__title');
            const m = host.querySelector('.capture-page__meta');
            const b = host.querySelector('.capture-page__brand');
            const n = host.querySelector('.capture-page__num');
            const sig = [t && t.textContent, m && m.textContent, b && b.textContent, n && n.textContent].join('|');
            if (sig !== '|||' && !window.__caps.includes(sig)) window.__caps.push(sig);
          }, 100);
        }""")
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

        caps = page.evaluate('window.__caps') or []
        pages = [c.split('|') for c in caps]
        check(len(pages) >= 1, f'저장본 장 뼈대를 확인했다 ({len(caps)}가지)')
        for parts in pages:
            title, meta, brand, num = (parts + ['', '', '', ''])[:4]
            check(title.strip() == newyear_title(), f'장 머리 제목 「{title}」')
            check('1991' in meta and '양력' in meta, f'장 머리 생년월일시 「{meta}」')
            check(brand.strip() == '사주보는 3층 다락방', f'장 꼬리 브랜드 「{brand}」')
            if len(downloads) == 1:
                check(num.strip() == '', '한 장짜리 저장본에는 페이지 번호를 넣지 않는다')
            else:
                check(re.fullmatch(rf'\d+ / {len(downloads)}', num.strip()) is not None,
                      f'페이지 번호 「{num.strip()}」 → n / {len(downloads)} 꼴')

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
            Promise.all([...data.files].map((f) => createImageBitmap(f)
              .then((b) => [b.width, b.height]).catch(() => null)))
              .then((dims) => { window.__dims = dims; });
            const err = new Error('cancel');
            err.name = 'AbortError';
            return Promise.reject(err);
          };
        """)
        page.goto(base + '?preview=3f990#/input?next=newyear', wait_until='networkidle')
        fill_birth(page)
        page.wait_for_selector('#report-capture', timeout=10000)
        page.evaluate("""() => {
          window.__nums = [];
          setInterval(() => {
            const host = document.getElementById('report-capture-host');
            const n = host && host.querySelector('.capture-page__num');
            if (n && !window.__nums.includes(n.textContent.trim())) window.__nums.push(n.textContent.trim());
          }, 100);
        }""")
        page.click('[data-action="save-image"]')
        page.wait_for_function('window.__shared !== null', timeout=90000)
        shared = page.evaluate('window.__shared')
        check(shared['count'] >= 1, f'공유 파일 {shared["count"]}장')
        check(all(t == 'image/png' for t in shared['types']), f'PNG 파일 형식 {shared["types"]}')
        check(all(s > 20000 for s in shared['sizes']), f'파일 크기 {shared["sizes"]}')
        check(all(n.endswith('.png') for n in shared['names']), f'파일 이름 {shared["names"]}')
        page.wait_for_function('window.__dims && window.__dims.length > 0', timeout=30000)
        dims = page.evaluate('window.__dims')
        check(all(d and d[0] == 860 for d in dims), f'핸드폰 이미지 가로 {[d[0] for d in dims if d]}px (2배)')
        check(all(d and d[1] <= 3800 for d in dims), f'핸드폰 이미지 세로 {[d[1] for d in dims if d]}px (iOS 캔버스 한계 안)')
        nums = page.evaluate('window.__nums') or []
        want = [f'{i} / {shared["count"]}' for i in range(1, shared['count'] + 1)]
        check(sorted(nums) == want, f'핸드폰 저장본 페이지 번호 {nums} (기대 {want})')
        # AbortError(사용자 취소)는 오류 토스트로 이어지지 않는다
        page.wait_for_timeout(800)
        toasts = ' '.join(page.locator('#toast-root .toast').all_inner_texts())
        check('만들지 못했' not in toasts, '취소(AbortError)를 오류로 처리하지 않음')
        check('취소' in toasts or '이미지' in toasts, f'취소 안내 토스트: {toasts.strip()[:60]}')
        modal = page.locator('[data-action="save-image-share"]').count()
        check(modal == 0, '취소 후 미리보기 모달을 띄우지 않음')
        ctx.close()

        # ── 5. 공유가 막힌 환경 — 미리보기 모달에서 다시 저장 ──────
        print('[5] 공유 차단(NotAllowedError) — 미리보기 모달로 안전 폴백')
        ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2,
                                  user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')
        page = ctx.new_page()
        page.add_init_script("""
          navigator.canShare = (data) => !!(data && data.files && data.files.length);
          navigator.share = () => Promise.reject(Object.assign(new Error('denied'), { name: 'NotAllowedError' }));
        """)
        page.goto(base + '?preview=3f990#/input?next=newyear', wait_until='networkidle')
        fill_birth(page)
        page.wait_for_selector('#report-capture', timeout=10000)
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.click('[data-action="save-image"]')
        page.wait_for_selector('.img-preview img', timeout=90000)
        shown = page.evaluate('[...document.querySelectorAll(".img-preview img")].map(i => [i.naturalWidth, i.naturalHeight])')
        check(len(shown) >= 1, f'미리보기 이미지 {len(shown)}장')
        check(all(w >= 800 and hh > 600 for w, hh in shown), f'미리보기 해상도 {shown}')
        check(page.locator('[data-action="save-image-share"]').count() == 1, '공유 창 다시 열기 버튼')
        check(page.locator('[data-action="save-image-download"]').count() == 1, 'PNG 내려받기 버튼')
        check(not errors, f'폴백 중 페이지 오류 없음 {errors[:2]}')
        page.screenshot(path=os.path.join(OUT, f'{TAG}img-check-modal-390.png'))
        ctx.close()

        # ── 6. 월별 흐름 막대 — 십성이 행 왼쪽 끝에 가지런히 ────────
        print('[6] 월별 흐름 12개 — 십성(정관·편관…) 왼쪽 정렬')
        for w, h in [(390, 844), (1280, 900)]:
            ctx = browser.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2)
            page = ctx.new_page()
            errs = []
            page.on('pageerror', lambda e: errs.append(str(e)))
            page.goto(base + '?preview=3f990#/input?next=newyear', wait_until='networkidle')
            fill_birth(page)
            page.wait_for_selector('#sec-ny-months', timeout=10000)
            rows = page.evaluate("""() => {
              const sec = document.querySelector('#sec-ny-months');
              const box = (el) => { const b = el.getBoundingClientRect();
                return { x: b.x, y: b.y, w: b.width, h: b.height, b: b.bottom }; };
              return [...sec.querySelectorAll('.bar-row')].map((row) => {
                const label = row.querySelector('.bar-row__label');
                const note = row.querySelector('.bar-row__note');
                const track = row.querySelector('.bar-row__track');
                if (!label || !note || !track) return null;
                return { label: label.textContent.trim(), note: note.textContent.trim(),
                         L: box(label), N: box(note), T: box(track), R: box(row) };
              }).filter(Boolean);
            }""")
            check(len(rows) == 12, f'{w}px — 막대 12개 ({len(rows)})')
            bad_x = [r for r in rows if abs(r['N']['x'] - r['L']['x']) > 2]
            check(not bad_x, f'{w}px — 십성이 월 이름과 같은 왼쪽 선 (어긋난 행 {len(bad_x)}개)')
            bad_y = [r for r in rows if r['N']['y'] < r['L']['b'] - 2]
            check(not bad_y, f'{w}px — 십성이 월 이름 바로 아래 (위로 뜬 행 {len(bad_y)}개)')
            floating = [r for r in rows if r['N']['x'] >= r['T']['x'] - 1]
            check(not floating, f'{w}px — 십성이 막대 시작점에 떠 있지 않다 (떠 있는 행 {len(floating)}개)')
            ten = {'정관', '편관', '정인', '편인', '겁재', '비견', '상관', '식신', '정재', '편재'}
            # 메모는 '월건 · 십성' (예: 기해 · 식신) — 십성 이름이 뒤에 온다
            check(all(r['note'].split(' · ')[-1] in ten for r in rows),
                  f'{w}px — 월건·십성 {sorted({r["note"] for r in rows})}')
            check(all(r['N']['x'] + r['N']['w'] <= r['R']['x'] + r['R']['w'] + 1 for r in rows), f'{w}px — 십성이 행 안에 들어옴')
            check(not errs, f'{w}px — 오류 없음 {errs[:2]}')
            if w == 390:
                sec = page.locator('#sec-ny-months')
                sec.scroll_into_view_if_needed()
                sec.screenshot(path=os.path.join(OUT, f'{TAG}img-check-monthly-390.png'))
            ctx.close()

        # ── 7. 무료 12띠 × 일주 동물 — 팩폭 카드 + 공유용 이미지 저장 ────
        print('[7] 무료 12띠 × 일주 동물 — 60일주 팩폭 · 공유용 이미지 저장')
        ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2,
                                  accept_downloads=True)
        page = ctx.new_page()
        errs = []
        page.on('pageerror', lambda e: errs.append(str(e)))
        page.goto(base + '#/input', wait_until='networkidle')
        fill_birth(page)
        page.wait_for_selector('#zodiac-share', timeout=10000)
        card = page.locator('#zodiac-share')
        check(card.count() == 1, '무료 카드가 한 곳에 있다')
        block = page.evaluate("""() => {
          const c = document.querySelector('#zodiac-share');
          const q = (s) => c.querySelector(s);
          return {
            nick: q('.zi-ilju__nick')?.textContent.trim(),
            call: q('.zi-ilju__call')?.textContent.trim(),
            poke: [...c.querySelectorAll('.zi-ilju__poke li')].map((li) => li.textContent.trim()),
            seen: q('.zi-ilju__vs div:first-child b')?.textContent.trim(),
            real: q('.zi-ilju__vs div:last-child b')?.textContent.trim(),
            ganji: q('.zi-ilju__ganji')?.textContent.trim(),
            button: c.querySelector('[data-action="save-zodiac"]')?.textContent.trim(),
            hint: q('.zi-card__hint')?.textContent.trim(),
            over: document.documentElement.scrollWidth - window.innerWidth,
          };
        }""")
        check(block['nick'] and len(block['nick']) >= 5, f'별명 「{block["nick"]}」')
        check(block['call'] and len(block['call']) >= 10, f'캐치프레이즈 「{block["call"]}」')
        check(len(block['poke']) == 3, f'찔리는 특징 {len(block["poke"])}가지')
        check(all(len(x) >= 18 for x in block['poke']), f'특징 문장 길이 {[len(x) for x in block["poke"]]}')
        check(block['seen'] and block['real'] and block['seen'] != block['real'],
              f'남이 보는 나 「{block["seen"]}」 / 진짜 나 「{block["real"]}」')
        check('일주' in (block['ganji'] or ''), f'간지 줄 「{block["ganji"]}」')
        check(block['button'] == '공유용 이미지 저장', f'버튼 「{block["button"]}」')
        check('다락방' in (block['hint'] or ''), f'브랜딩 안내 「{block["hint"]}」')
        check(block['over'] <= 0, f'가로 스크롤 없음({block["over"]}px)')
        card.screenshot(path=os.path.join(OUT, f'{TAG}img-check-zodiac-card-390.png'))

        page.evaluate("""() => {
          window.__zcap = [];
          setInterval(() => {
            const host = document.getElementById('report-capture-host');
            if (!host || !host.querySelector('.capture-page')) return;
            const t = host.querySelector('.capture-page__title');
            const b = host.querySelector('.capture-page__brand');
            const n = host.querySelector('.capture-page__num');
            const txt = host.innerText || '';
            const sig = JSON.stringify([t && t.textContent, b && b.textContent, n ? n.textContent : '',
                                        txt.includes('1구슬'), txt.includes('이성에게 보이는 나의 반전')]);
            if (!window.__zcap.includes(sig)) window.__zcap.push(sig);
          }, 100);
        }""")
        downloads2 = []
        page.on('download', lambda d: downloads2.append(d))
        page.click('[data-action="save-zodiac"]')
        page.wait_for_function('document.querySelectorAll("#toast-root .toast").length > 0', timeout=90000)
        page.wait_for_timeout(12000)
        check(len(downloads2) == 1, f'공유용 PNG {len(downloads2)}장 (한 장)')
        for d in downloads2:
            path = os.path.join(OUT, f'{TAG}zodiac-{d.suggested_filename}')
            d.save_as(path)
            zw, zh = png_size(path)
            zsize = os.path.getsize(path)
            check(zw == 860, f'공유 이미지 가로 {zw}px')
            check(800 <= zh <= 2600, f'공유 이미지 세로 {zh}px (한 장짜리 카드)')
            check(zsize > 40000, f'공유 이미지 용량 {zsize // 1024}KB')
            check(d.suggested_filename == '다락방 12띠 × 일주 동물.png', f'공유 파일명 {d.suggested_filename}')
            print(f'  file {path} ({zw}x{zh}, {zsize // 1024}KB)')
        caps2 = [json.loads(x) for x in (page.evaluate('window.__zcap') or [])]
        check(len(caps2) >= 1, f'공유 저장본 뼈대를 확인했다 ({len(caps2)}가지)')
        for t, b, n, paid, hook in caps2:
            check((t or '').strip() == '12띠 × 일주 동물', f'공유 저장본 제목 「{t}」')
            check((b or '').strip() == '사주보는 3층 다락방', f'공유 저장본 브랜드 「{b}」')
            check((n or '') == '', '한 장짜리 공유본에는 페이지 번호를 넣지 않는다')
            check(paid is False, '공유 저장본에 결제 버튼(1구슬)이 없다')
            check(hook is False, '공유 저장본에 결제 유도 문구가 없다')
        check(not errs, f'공유 저장 중 오류 없음 {errs[:2]}')
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
