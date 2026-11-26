# -*- coding: utf-8 -*-
"""다락방 무료 놀이터 05 — 사주 '돈 새는 구멍' 영수증 검수

  python3 scripts/check-receipt.py            # dist/ (로컬 빌드)
  SITE=1 python3 scripts/check-receipt.py     # 라이브 GitHub Pages

확인
  · 허브 5장 — 05 '돈 새는 구멍' 카드가 #/play/receipt 로 연결
  · 생년월일 입력 → 영수증 렌더(톱니 종이 · 항목 4개 · 비율 합계 100% · 금액 열)
  · 월 누수 지수 / 탕진 경보 등급 / 자니 팩폭 / 돈 지키는 처방 / 바코드 / @3F_Zanie
  · 항목 비율은 만세력으로 계산돼 사람마다 다르다(같은 사람이면 늘 같다)
  · '영수증 이미지 저장' → 1080×1350 PNG · 'X에 자랑하기' → 1순위·% 들어간 intent URL
  · 990원 재물운·대운 CTA · 미리보기(?preview=3f990)에서도 그대로 열린다
  · 모바일 390: 가로 넘침 0 · 허브 1열 · 글자 잘림 없음
"""
import http.server
import json
import os
import socketserver
import struct
import sys
import threading
from urllib.parse import unquote

from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DIST = os.path.join(ROOT, 'dist')
OUT = os.path.abspath(os.path.join(ROOT, '..', 'downloads'))
PORT = 4195
CHROME = '/workspace/.cache/ms-playwright/chrome-linux64/chrome'
LIBS = ':'.join([
    '/workspace/tmp/libs2/usr/lib/x86_64-linux-gnu',
    '/workspace/tmp/libs/usr/lib/x86_64-linux-gnu',
    '/workspace/.cache/sysroot/usr/lib/x86_64-linux-gnu',
])
BASE_PATH = '/darakbang-saju-web'
LIVE = bool(os.environ.get('SITE', '').strip()) or ('--live' in sys.argv)
LIVE_BASE = 'https://sisterjisoo5-create.github.io'
TAG = 'live-' if LIVE else ''

os.makedirs(OUT, exist_ok=True)
FAILS = []
ERRORS = []


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


NO_ANIM = "*,*::before,*::after{animation:none!important;transition:none!important}"


def settle(page, ms=350):
    page.wait_for_timeout(ms)
    page.wait_for_function("document.fonts.status === 'loaded'")


def overflow(page, label):
    r = page.evaluate("""() => {
      const d = document.documentElement;
      const wide = [...document.querySelectorAll('body *')]
        .filter(el => el.getBoundingClientRect().right > d.clientWidth + 2)
        .slice(0, 5).map(el => el.className || el.tagName);
      return { scrollW: d.scrollWidth, clientW: d.clientWidth, wide };
    }""")
    check(r['scrollW'] <= r['clientW'] + 2, f'{label} 가로 넘침 없음 (scrollW {r["scrollW"]} / clientW {r["clientW"]}) {r["wide"]}')
    return r


def shot(page, name, full=False):
    path = os.path.join(OUT, TAG + name)
    page.screenshot(path=path, full_page=full)
    print('   shot', path)


def goto(page, hash_path):
    page.goto(f'{LIVE_BASE}{BASE_PATH}/#{hash_path}' if LIVE else f'http://127.0.0.1:{PORT}{BASE_PATH}/#{hash_path}',
              wait_until='networkidle')
    settle(page)


def fill_birth(page, y, m, d, h, mi):
    page.fill('input[name="year"]', str(y))
    page.fill('input[name="month"]', str(m).zfill(2))
    page.fill('input[name="day"]', str(d).zfill(2))
    cb = page.locator('input[name="timeUnknown"]').first
    if cb.is_checked():
        cb.uncheck()
    page.fill('input[name="hour"]', str(h).zfill(2))
    page.fill('input[name="minute"]', str(mi).zfill(2))


def receipt_state(page):
    return page.evaluate("""() => {
      const el = document.querySelector('.money-receipt');
      if (!el) return null;
      const items = [...el.querySelectorAll('.money-receipt__item')].map(li => ({
        name: li.querySelector('.money-receipt__name').innerText.trim(),
        pct: parseInt(li.querySelector('.money-receipt__pct').innerText, 10),
        amt: li.querySelector('.money-receipt__amt').innerText.trim(),
        bar: li.querySelector('.money-receipt__bar i').style.width,
      }));
      return {
        items,
        text: el.innerText,
        sum: items.reduce((a, i) => a + i.pct, 0),
        barcode: !!el.querySelector('.money-receipt__barcode'),
        tear: el.querySelectorAll('.money-receipt__tear').length,
      };
    }""")


def run_desktop(browser):
    print('=== desktop 1280 ===')
    ctx = browser.new_context(viewport={'width': 1280, 'height': 900}, device_scale_factor=2,
                              reduced_motion='reduce', locale='ko-KR')
    page = ctx.new_page()
    page.on('pageerror', lambda e: ERRORS.append(str(e)))
    page.on('console', lambda m: ERRORS.append(m.text) if m.type == 'error' else None)

    # ① 허브 — 5장, 05 카드
    goto(page, '/play')
    cards = page.locator('.play-grid--hub .play-card')
    check(cards.count() == 5, f'허브 카드 5장 {cards.count()}')
    last = cards.nth(4)
    check(last.get_attribute('href') == '#/play/receipt', '05 카드 → #/play/receipt')
    check('돈 새는 구멍' in last.inner_text(), '05 카드 제목에 돈 새는 구멍')
    check('영수증' in last.inner_text(), '05 카드에 영수증 문구')
    shot(page, 'darakbang-receipt-hub.png')

    # ② 입력 화면
    goto(page, '/play/receipt')
    check(page.locator('form[data-form="play-receipt"]').count() == 1, '영수증 — 생년월일 폼')
    check(page.locator('.money-receipt').count() == 0, '입력 전에는 영수증 없음')
    shot(page, 'darakbang-receipt-form.png', full=True)
    overflow(page, 'receipt form')

    # ③ 결과 — 영수증 렌더
    fill_birth(page, 1991, 5, 7, 18, 22)
    page.locator('form[data-form="play-receipt"] button[type="submit"]').click()
    settle(page, 600)
    st = receipt_state(page)
    check(st is not None, '영수증 카드 렌더')
    check(len(st['items']) == 4, f'항목 4개 {len(st["items"])}')
    check(st['sum'] == 100, f'비율 합계 100% ({st["sum"]})')
    check(all(i['pct'] >= 9 for i in st['items']), f'항목마다 9% 이상 {[i["pct"] for i in st["items"]]}')
    check(st['items'][0]['pct'] == max(i['pct'] for i in st['items']), '1순위가 가장 큰 비율')
    check(all('%' in i['bar'] for i in st['items']), f'항목별 % 바 {[i["bar"] for i in st["items"]]}')
    check(all(i['amt'].startswith('₩') for i in st['items']), f'금액 표기 {[i["amt"] for i in st["items"]]}')
    check(st['tear'] == 2, '위아래 톱니 절취선')
    check(st['barcode'], '바코드 장식')
    txt = st['text']
    for word in ['3F DARAKBANG', '합계', '100%', '월 누수 지수', '탕진 경보', "JANI'S CALL", '돈 지키는 처방',
                 '@3F_Zanie', '사주보는 3층 다락방', '결제수단 · 내 통장']:
        check(word in txt, f'영수증 — {word}')
    check('일주' in txt and '띠' in txt, '영수증 — 일주·띠')
    check(page.locator('.money-receipt__index-grade').inner_text().strip() != '', '탕진 경보 등급 문구')
    # 명리 용어는 고객 화면에 없다
    check(not any(w in txt for w in ['재성', '관성', '비겁', '식상', '인성', '편관', '정관']), '영수증 — 명리 용어 없음')

    # ④ CTA · 공유 버튼
    check(page.locator('.play-cta a[href*="product/wealth"]').count() == 1, '재물운 990원 CTA')
    check(page.locator('.play-cta a[href*="product/daewoon"]').count() == 1, '10년 대운 990원 CTA')
    check(page.locator('.play-cta a[href*="product/newyear"]').count() == 1, '일년 운세 990원 CTA')
    check(page.locator('[data-action="play-save-image"][data-kind="receipt"]').count() == 1, '영수증 이미지 저장 버튼')
    check(page.locator('[data-action="play-share-x"][data-kind="receipt"]').count() == 1, 'X 공유 버튼')
    check(page.locator('[data-action="play-kakao-share"][data-kind="receipt"]').count() == 1, '카카오톡 공유 버튼')
    check(page.locator('script[src*="cdn"]').count() == 0, 'CDN 스크립트 없음')
    shot(page, 'darakbang-receipt-result.png', full=True)
    overflow(page, 'receipt result')

    # ⑤ X 공유 intent — 1순위 · % · 태그 · 페이지 URL
    page.evaluate("""() => {
      window.__xurl = null;
      window.open = (u) => { window.__xurl = u; return { opener: null }; };
    }""")
    page.click('[data-action="play-share-x"][data-kind="receipt"]')
    page.wait_for_timeout(300)
    xurl = page.evaluate('window.__xurl') or ''
    check('twitter.com/intent/tweet' in xurl, f'X 글쓰기 창 열기 {xurl[:60]}')
    check(unquote(xurl.split('text=')[1].split('&')[0]).find(st['items'][0]['name']) >= 0,
          'X 문구에 1순위 항목 이름')
    check(f"{st['items'][0]['pct']}%" in unquote(xurl), 'X 문구에 1순위 %')
    check(unquote(xurl).count('@3F_Zanie') >= 1, 'X 문구에 @3F_Zanie')
    check('#돈새는구멍' in unquote(xurl), 'X 해시태그')
    check('url=' in xurl and 'play%2Freceipt' in xurl, f'X 문구에 페이지 주소 {xurl[-60:]}')

    # ⑥ 이미지 저장 — 1080×1350 PNG
    with page.expect_download() as dl:
        page.click('[data-action="play-save-image"][data-kind="receipt"]')
    path = os.path.join(OUT, TAG + 'darakbang-receipt-card.png')
    dl.value.save_as(path)
    blob = open(path, 'rb').read()
    check(blob[:8] == b'\x89PNG\r\n\x1a\n', '이미지 저장 — PNG 파일')
    w, h = struct.unpack('>II', blob[16:24])
    check((w, h) == (1080, 1350), f'이미지 저장 — 1080×1350 ({w}×{h})')
    check(len(blob) > 60000, f'이미지 저장 — 내용 있음 {len(blob)} bytes')
    check('영수증' in dl.value.suggested_filename, f'파일 이름 {dl.value.suggested_filename}')

    # ⑦ 카톡 공유
    page.click('[data-action="play-kakao-share"][data-kind="receipt"]')
    page.wait_for_timeout(500)
    toasts = page.locator('.toast').all_inner_texts()
    check(any('카카오톡' in t or '공유 창' in t for t in toasts) or page.evaluate('typeof navigator.share === "function"'),
          f'카카오톡 공유 — 공유 시트 또는 복사 안내 {toasts}')

    # ⑧ 같은 사주 = 같은 영수증 (새로고침해도 1순위 동일)
    first = st['items'][0]['name'], st['items'][0]['pct']
    goto(page, '/play/receipt')
    st2 = receipt_state(page)
    check(st2 is not None and (st2['items'][0]['name'], st2['items'][0]['pct']) == first,
          f'같은 생년월일이면 같은 1순위 {first} → {(st2 or {}).get("items", [{}])[0]}')

    # ⑨ 미리보기 게이트에서도 열린다 (?preview=3f990 — 주소창 쿼리 형태로 새로 연다)
    base = f'{LIVE_BASE}{BASE_PATH}/' if LIVE else f'http://127.0.0.1:{PORT}{BASE_PATH}/'
    page.goto(f'{base}?preview=3f990#/play/receipt', wait_until='networkidle')
    settle(page)
    st3 = receipt_state(page)
    check(st3 is not None and len(st3['items']) == 4, '미리보기(?preview=3f990)에서도 영수증')
    check(page.locator('.preview-strip').count() == 1, '미리보기 배지 표시')

    # ⑩ 다른 생일 → 다른 1순위(사람마다 다르게 계산된다)
    goto(page, '/input')
    fill_birth(page, 1988, 3, 3, 12, 0)
    page.check('input[name="timeUnknown"]')
    page.locator('form[data-form="birth"] button[type="submit"]').click()
    settle(page, 500)
    goto(page, '/play/receipt')
    st4 = receipt_state(page)
    check(st4 is not None, '시간 모르는 생일도 영수증')
    check((st4['items'][0]['name'], st4['items'][0]['pct']) != first,
          f'다른 사주는 다른 1순위 {st4["items"][0]}')

    ctx.close()


def run_mobile(browser):
    print('=== mobile 390 ===')
    ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2,
                              is_mobile=True, has_touch=True, reduced_motion='reduce', locale='ko-KR',
                              user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')
    page = ctx.new_page()
    page.on('pageerror', lambda e: ERRORS.append(str(e)))
    page.on('console', lambda m: ERRORS.append(m.text) if m.type == 'error' else None)

    goto(page, '/play')
    cols = page.evaluate("""() => {
      const cards = [...document.querySelectorAll('.play-grid--hub .play-card')];
      return { n: cards.length, cols: new Set(cards.map(c => Math.round(c.getBoundingClientRect().left))).size };
    }""")
    check(cols['n'] == 5 and cols['cols'] == 1, f'모바일 — 허브 5장 1열 ({cols})')
    overflow(page, 'mobile hub')

    goto(page, '/play/receipt')
    check(page.locator('form[data-form="play-receipt"]').count() == 1, '모바일 — 영수증 입력 폼')
    shot(page, 'darakbang-receipt-mobile-form.png')
    overflow(page, 'mobile receipt form')

    fill_birth(page, 1991, 5, 7, 18, 22)
    page.locator('form[data-form="play-receipt"] button[type="submit"]').click()
    settle(page, 600)
    st = receipt_state(page)
    check(st is not None and len(st['items']) == 4, '모바일 — 영수증 4항목')
    check(st['sum'] == 100, f'모바일 — 합계 100% ({st["sum"] if st else None})')
    page.evaluate('window.scrollTo(0, 0)')
    page.wait_for_timeout(200)
    shot(page, 'darakbang-receipt-mobile.png', full=True)
    overflow(page, 'mobile receipt')
    # 글자가 잘리지 않는지 — 말줄임(…) 없이 항목 이름이 다 보인다
    names = page.locator('.money-receipt__name').all_inner_texts()
    check(all('…' not in n for n in names), f'모바일 — 항목 이름 잘림 없음 {names}')
    widths = page.evaluate("""() => [...document.querySelectorAll('.money-receipt__item')].map(li => {
      const box = li.getBoundingClientRect();
      const name = li.querySelector('.money-receipt__name').getBoundingClientRect();
      return name.width <= box.width + 1;
    })""")
    check(all(widths), '모바일 — 항목 이름이 영수증 안에 들어온다')

    # 모바일(아이폰 UA)에서는 다운로드가 아니라 미리보기 모달로 연다 — 길게 눌러 사진첩 저장
    page.tap('[data-action="play-save-image"][data-kind="receipt"]')
    page.wait_for_timeout(700)
    modal = page.locator('.modal').count()
    img = page.evaluate("""() => {
      const el = document.querySelector('.img-preview img');
      return el ? { w: el.naturalWidth, h: el.naturalHeight } : null;
    }""")
    check(modal > 0 and img is not None, f'모바일 — 아이폰은 미리보기로 열어 길게 저장 (modal {modal})')
    check(img is None or (img['w'], img['h']) == (1080, 1350), f'모바일 — 미리보기 이미지 1080×1350 {img}')

    ctx.close()


def main():
    if not LIVE:
        serve()
    env = dict(os.environ)
    env['LD_LIBRARY_PATH'] = LIBS + ':' + env.get('LD_LIBRARY_PATH', '')
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--hide-scrollbars'], env=env)
        run_desktop(browser)
        run_mobile(browser)
        browser.close()
    real_errors = [e for e in ERRORS if 'favicon' not in e.lower()]
    check(not real_errors, f'콘솔 오류 없음 {real_errors[:3]}')
    print('\nFAILS:', json.dumps(FAILS, ensure_ascii=False, indent=1) if FAILS else 'none')
    sys.exit(1 if FAILS else 0)


if __name__ == '__main__':
    main()
