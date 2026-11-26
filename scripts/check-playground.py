# -*- coding: utf-8 -*-
"""다락방 무료 놀이터 5종 검수 — 매력살 · 비밀 쪽지 · 찐심 판독기 · 풍경 심리테스트 · 돈 새는 구멍 영수증

  python3 scripts/check-playground.py            # dist/ (로컬 빌드)
  SITE=1 python3 scripts/check-playground.py     # 라이브 GitHub Pages

확인
  · 홈은 중복 놀이터 섹션 없이 히어로 → 990원 상품 섹션으로 바로 이어짐 · 허브 이동
  · 히어로 오른쪽 위 '오락하는 자니' 무료 놀이터 버튼(두둥실 애니메이션)
  · 라우트 이동은 늘 화면 맨 위(scrollY 0) — 놀이터 카드를 눌러도 에스크로 부근으로 내려가지 않는다
  · 01 매력살: 생년월일 입력 → 실제 원국 4기둥 · 핵심 살 4종만 · 990원 잠금 안내 · CTA
  · 02 비밀 쪽지: 이름 입력 → 양피지 쪽지 · 행운 색/띠(중복 접두사 없음)/피할 한 마디 · 숨긴 인용 박스
  · 03 찐심 판독: 점수 → 자니 처방 → 990원 CTA → 이미지 저장·카톡 공유 순서 · 일주 상세·판독 근거 없음
  · 04 풍경: 스티커 추가 · 끌어서 이동 · 크기 변경 → 통합 스티커 목록 · 자미두수 CTA · 공유
  · 05 돈 새는 구멍 영수증은 scripts/check-receipt.py 가 따로 깊게 본다
  · 놀이터 4종 — '이미지로 저장' 이 1080×1350 PNG 를 내려받고, '카카오톡으로 공유' 가 링크·문구를 복사
  · 모바일 390: 가로 넘침 0 · 놀이터 카드 1열 · 풍경 무대 정사각 · 탭 선택 + 방향 이동
"""
import http.server
import json
import os
import socketserver
import sys
import threading

from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DIST = os.path.join(ROOT, 'dist')
OUT = os.path.abspath(os.path.join(ROOT, '..', 'downloads'))
PORT = 4193
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


def run_desktop(browser):
    print('=== desktop 1280 ===')
    ctx = browser.new_context(viewport={'width': 1280, 'height': 900}, device_scale_factor=2,
                              reduced_motion='reduce', locale='ko-KR')
    page = ctx.new_page()
    page.on('pageerror', lambda e: ERRORS.append(str(e)))
    page.on('console', lambda m: ERRORS.append(m.text) if m.type == 'error' else None)

    base = f'{LIVE_BASE}{BASE_PATH}/' if LIVE else f'http://127.0.0.1:{PORT}{BASE_PATH}/'
    page.goto(base, wait_until='networkidle')
    page.add_style_tag(content=NO_ANIM)
    settle(page)

    # ① 홈 — 중복 놀이터 섹션 없음 · 히어로 다음은 상품 섹션
    check(page.locator('#play').count() == 0, '홈에 중복 놀이터 섹션 없음')
    check(page.locator('.play-grid').count() == 0, '홈에 놀이터 카드 그리드 없음')
    home_text = page.locator('#view').inner_text()
    check('놀이터 전체 보기' not in home_text, '홈에 "놀이터 전체 보기" 버튼 없음')
    nxt = page.evaluate("""() => { const h = document.querySelector('.hero'); return h && h.nextElementSibling ? (h.nextElementSibling.id || h.nextElementSibling.className) : null; }""")
    check(nxt == 'products', f'히어로 바로 다음이 990원 상품 섹션 ({nxt})')
    check(page.locator('#products .product-card, #products a[href*="#/product/"]').count() >= 1, '상품 카드 정상 표시')
    check(page.locator('.nav a[href="#/play"]').count() == 1, '헤더에 무료 놀이터 링크 유지')

    # 히어로 오른쪽 위 — 오락하는 자니
    arcade = page.locator('.jani-arcade')
    check(arcade.count() == 1, "히어로 '오락하는 자니' 버튼")
    check(arcade.get_attribute('href') == '#/play', '오락하는 자니 버튼 → #/play')
    check('무료 놀이터' in arcade.inner_text(), "버튼에 '무료 놀이터' 배지")
    check(page.locator('.jani-arcade img').count() == 1, '오락하는 자니 이미지')
    has_float = page.evaluate("""() => {
      for (const sheet of document.styleSheets) {
        try { for (const rule of sheet.cssRules) { if (rule.cssText && rule.cssText.includes('janiArcadeFloat')) return true; } } catch (e) {}
      }
      return false;
    }""")
    check(has_float, '자니가 두둥실 떠 있는 애니메이션(janiArcadeFloat) 정의')
    hero = page.locator('.jani-card').bounding_box()
    abox = arcade.bounding_box()
    check(abox['x'] > hero['x'] + hero['width'] * 0.55 and abox['y'] < hero['y'] + hero['height'] * 0.35, '자니 버튼은 히어로 카드 오른쪽 위')

    page.evaluate('window.scrollTo(0, 0)')
    page.wait_for_timeout(250)
    shot(page, 'darakbang-play-home.png')
    page.evaluate('window.scrollTo(0, document.querySelector("#products").offsetTop - 40)')
    page.wait_for_timeout(250)
    shot(page, 'darakbang-home-products.png')
    overflow(page, 'home')

    # 라우트 이동 = 화면 맨 위 (에스크로 인증마크 부근으로 내려가던 버그)
    page.goto(base, wait_until='networkidle')
    page.add_style_tag(content=NO_ANIM)
    settle(page)
    page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
    page.wait_for_timeout(200)
    page.locator('.jani-arcade').click()
    settle(page, 500)
    check(page.evaluate('window.scrollY') == 0, f'오락하는 자니 버튼으로 이동하면 맨 위 (scrollY {page.evaluate("window.scrollY")})')
    check(page.locator('.play-grid--hub .play-card').count() == 5, '히어로 버튼 → 허브 카드 5장')
    page.goto(base, wait_until='networkidle')
    page.add_style_tag(content=NO_ANIM)
    settle(page)
    page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
    page.wait_for_timeout(150)
    page.click('.nav a[href="#/play"]')
    settle(page, 400)
    check(page.evaluate('window.scrollY') == 0, f'헤더 놀이터 링크도 맨 위 (scrollY {page.evaluate("window.scrollY")})')

    # ② 허브
    goto(page, '/play')
    check(page.locator('.play-grid--hub .play-card').count() == 5, '허브 카드 5장')
    shot(page, 'darakbang-play-hub.png')

    # ③ 매력살
    goto(page, '/play/charm')
    check(page.locator('form[data-form="play-charm"]').count() == 1, '매력살 — 생년월일 폼')
    fill_birth(page, 1991, 5, 7, 18, 22)
    page.locator('form[data-form="play-charm"] button[type="submit"]').click()
    settle(page, 500)
    check(page.locator('.play-ming__cell').count() == 4, '매력살 — 원국 4기둥 카드')
    check(page.locator('.sal-card').count() == 4, '매력살 — 핵심 살 4종 카드만')
    txt = page.locator('.sal-grid').inner_text()
    check(all(n in txt for n in ['도화살', '홍염살', '천을귀인', '역마살']), '매력살 — 도화·홍염·천을귀인·역마 4종')
    check('문창성' not in txt and '화개살' not in txt, '매력살 — 문창·화개는 화면에서 덜어낸다')
    check('있음' in txt, '매력살 — 찾은 살 표시')
    check(page.locator('.play-verdict').count() == 1 and page.locator('.play-score').count() == 1, '매력살 — 자니 한 줄 + 매력 온도')
    check(page.locator('.play-lock').count() == 1 and '언제 연애' in page.locator('.play-lock').inner_text(), '매력살 — 990원 잠금 안내')
    check(page.locator('.play-points').count() == 0, '매력살 — 긴 포인트 목록 없음(간결화)')
    check(page.locator('.play-cta a[href*="product/love"]').count() == 1, '매력살 — 연애운 CTA')
    check(page.locator('.play-cta a[href*="product/saju"]').count() == 1 and page.locator('.play-cta a[href*="product/compat"]').count() == 1, '매력살 — 정통사주·궁합 CTA')
    shot(page, 'darakbang-play-charm.png', full=True)
    overflow(page, 'charm')

    # ④ 비밀 쪽지
    goto(page, '/play/note')
    page.fill('input[name="noteName"]', '자니')
    page.locator('form[data-form="play-note"] button[type="submit"]').click()
    settle(page, 400)
    check(page.locator('.note-paper').count() == 1, '쪽지 — 양피지 카드')
    note = page.locator('.note-paper').inner_text()
    for word in ['행운의 색', '행운의 띠', '피해야 할 한 마디', '오늘의 일진']:
        check(word in note, f'쪽지 — {word}')
    import re as _re
    dup = _re.findall(r'(?m)^[가-힣]+띠\s*—', note)
    check(not dup, f'쪽지 — 띠 이름 앞머리 중복 없음 {dup}')
    check('이 띠' in note, '쪽지 — 행운의 띠 문장 유지')
    check(page.locator('.note-paper__line').count() == 0, '쪽지 — 인용 박스(자니 드림) 비노출')
    check(page.locator('.note-paper__seal').count() == 0, '쪽지 — 자니 드림 도장 비노출')
    check(page.locator('[data-action="play-copy"]').count() == 0 and page.locator('[data-action="play-share-x"]').count() == 0, '쪽지 — 텍스트 복사·X 버튼 정리')
    check(page.locator('[data-action="play-save-image"][data-kind="note"]').count() == 1, '쪽지 — 이미지로 저장 버튼')
    check(page.locator('[data-action="play-kakao-share"][data-kind="note"]').count() == 1, '쪽지 — 카카오톡 공유 버튼')
    shot(page, 'darakbang-play-note.png', full=True)
    overflow(page, 'note')

    # ⑤ 찐심 판독 — 스타일만
    goto(page, '/play/signal')
    page.click('[data-playseg="speed"] button[data-value="fast"]')
    page.click('[data-playseg="length"] button[data-value="long"]')
    page.click('[data-playseg="emoji"] button[data-value="many"]')
    page.fill('textarea[name="lastText"]', '오늘 뭐 해? ㅋㅋ')
    page.locator('form[data-form="play-signal"] button[type="submit"]').click()
    settle(page, 400)
    head = page.locator('.signal-head__verdict').inner_text()
    check(head in ['찐 호감', '밀당 중', '아직 재는 중', '맘 뜬 거'], f'찐심 — 판정 문구 {head}')
    check(page.locator('.signal-miss').count() == 1, '찐심 — 생일 없이 판독 안내')
    check(page.locator('.signal-evidence').count() == 0 and page.locator('.signal-ilju').count() == 0, '찐심 — 일주 상세·판독 근거 박스 삭제')
    check(page.locator('[data-action="play-save-image"][data-kind="signal"]').count() == 1, '찐심 — 이미지로 저장 버튼')
    check(page.locator('[data-action="play-kakao-share"][data-kind="signal"]').count() == 1, '찐심 — 카카오톡 공유 버튼')
    shot(page, 'darakbang-play-signal-style.png', full=True)

    # ⑥ 찐심 판독 — 상대 생일 포함 · 결과 순서
    page.click('[data-action="play-signal-reset"]')
    settle(page, 300)
    page.check('input[name="useBirth"]')
    check(page.locator('[data-play-birth]').is_visible(), '찐심 — 생일 입력 펼침')
    fill_birth(page, 1997, 6, 17, 8, 0)
    page.locator('form[data-form="play-signal"] button[type="submit"]').click()
    settle(page, 500)
    check(page.locator('.signal-ilju, .signal-evidence, .signal-tell').count() == 0, '찐심 — 과다 공개(일주·근거·상대 원국) 없음')
    order = page.evaluate("""() => [...document.querySelectorAll('#signal-result .signal-head, #signal-result .signal-tip, #signal-result .play-cta, #signal-result .play-share')].map(e => e.className)""")
    check(len(order) == 4 and 'signal-head' in order[0] and 'signal-tip' in order[1] and 'play-cta' in order[2] and 'play-share' in order[3], f'찐심 — 점수→처방→990원 CTA→공유 순서 {order}')
    check('자니 처방' in page.locator('.signal-tip').inner_text(), '찐심 — 자니 처방 문구')
    check(page.locator('.play-cta a[href*="product/bias"]').count() == 1, '찐심 — 최애궁합 CTA')
    check(page.locator('.play-cta a[href*="product/reunion"]').count() == 1 and page.locator('.play-cta a[href*="product/love"]').count() == 1, '찐심 — 재회운·연애운 CTA')
    shot(page, 'darakbang-play-signal.png', full=True)
    overflow(page, 'signal')

    # ⑦ 풍경 심리테스트
    goto(page, '/play/scenery')
    for key in ['house', 'tree', 'person', 'moon', 'fence']:
        page.click(f'[data-action="htp-add"][data-key="{key}"]')
        page.wait_for_timeout(80)
    check(page.locator('.htp-sticker').count() == 5, '풍경 — 스티커 5개 배치')
    check(page.locator('.htp-pick.is-on').count() == 5, '풍경 — 팔레트 선택 표시 5개')
    shot(page, 'darakbang-play-scenery-canvas.png')

    before = page.evaluate("""() => document.querySelector('[data-htp-sticker][data-key="tree"]').style.left""")
    box = page.locator('[data-htp-sticker][data-key="tree"]').bounding_box()
    page.mouse.move(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
    page.mouse.down()
    page.mouse.move(box['x'] + box['width'] / 2 - 140, box['y'] + box['height'] / 2 + 60, steps=10)
    page.mouse.up()
    page.wait_for_timeout(150)
    after = page.evaluate("""() => document.querySelector('[data-htp-sticker][data-key="tree"]').style.left""")
    check(before != after, f'풍경 — 끌어서 이동 ({before} → {after})')

    page.click('[data-action="htp-size"][data-size="big"]')
    page.wait_for_timeout(120)
    width = page.evaluate("""() => document.querySelector('[data-htp-sticker][data-key="tree"]').style.width""")
    check(width == '30%', f'풍경 — 크게 변경 {width}')

    page.click('[data-action="htp-analyze"]')
    settle(page, 500)
    check(page.locator('.htp-preview').count() == 1, '풍경 — 완성 미리보기')
    check(page.locator('.htp-scores').count() == 0 and page.locator('.signal-card').count() == 0, '풍경 — 휴식·대인·자니가 본 풍경 박스 삭제')
    check('함께 놓인 것들' not in page.locator('#view').inner_text(), '풍경 — 별도 함께 놓인 것들 박스 없음')
    check(page.locator('.play-page .result-head p').count() == 0, '풍경 — 제목 아래 중복 문단 삭제')
    names = page.locator('.htp-list__name').all_inner_texts()
    check(len(names) == 5, f'풍경 — 놓은 스티커 5개가 통합 목록에 {len(names)}개')
    base_names = [n.replace('가장 큼', '').strip() for n in names]
    check(len(set(base_names)) == len(base_names), f'풍경 — 목록 중복 없음 {base_names}')
    check(set(['집', '나무', '사람', '달', '울타리']).issubset(set(base_names)), f'풍경 — 집·나무·사람·달·울타리 {base_names}')
    check(page.locator('.play-verdict').count() == 1, '풍경 — 자니 판독 한 줄')
    check(page.locator('.play-cta a[href*="product/jami"]').count() == 1, '풍경 — 자미두수 990원 CTA')
    check(page.locator('.play-cta a[href*="product/saju"]').count() == 1 and page.locator('.play-cta a[href*="product/love"]').count() == 1, '풍경 — 정통사주·연애운 CTA')
    check(page.locator('[data-action="play-save-image"][data-kind="scenery"]').count() == 1, '풍경 — 이미지로 저장 버튼')
    check(page.locator('[data-action="play-kakao-share"][data-kind="scenery"]').count() == 1, '풍경 — 카카오톡 공유 버튼')
    shot(page, 'darakbang-play-scenery-result.png', full=True)
    overflow(page, 'scenery')

    # ⑦-b 이미지로 저장 — 1080×1350 PNG 다운로드 / 카카오톡은 링크·문구 복사
    import struct
    with page.expect_download() as dl:
        page.click('[data-action="play-save-image"][data-kind="scenery"]')
    path = os.path.join(OUT, TAG + 'darakbang-play-card-scenery.png')
    dl.value.save_as(path)
    with open(path, 'rb') as fh:
        blob = fh.read()
    check(blob[:8] == b'\x89PNG\r\n\x1a\n', '이미지 저장 — PNG 파일')
    w, h = struct.unpack('>II', blob[16:24])
    check((w, h) == (1080, 1350), f'이미지 저장 — 카드 크기 {w}×{h}')
    check(len(blob) > 60000, f'이미지 저장 — 내용 있음 {len(blob)} bytes')
    page.click('[data-action="play-kakao-share"][data-kind="scenery"]')
    page.wait_for_timeout(500)
    toasts = page.locator('.toast').all_inner_texts()
    check(any('카카오톡' in t or '공유 창' in t for t in toasts) or page.evaluate('typeof navigator.share === "function"'), f'카카오톡 공유 — 공유 시트 또는 복사 안내 {toasts}')

    # ⑧ 기존 흐름 회귀 — 입력 폼·무료 결과·헤더 메뉴가 예전 그대로
    goto(page, '/input')
    check(page.locator('form[data-form="birth"]').count() == 1, '기존 입력 폼(data-form=birth) 유지')
    check(page.locator('.nav a').count() == 5, '헤더 메뉴 5개 (무료 놀이터 추가)')
    fill_birth(page, 1992, 10, 15, 7, 33)
    page.locator('form[data-form="birth"] button[type="submit"]').click()
    settle(page, 500)
    check('#/free' in page.url, '기존 입력 → 무료 결과(#/free) 이동')
    check(page.locator('.ming__cell').count() == 4, '기존 무료 원국 4기둥 유지')

    ctx.close()


def run_mobile(browser):
    print('=== mobile 390 ===')
    ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2,
                              is_mobile=True, has_touch=True, reduced_motion='reduce', locale='ko-KR',
                              user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')
    page = ctx.new_page()
    page.on('pageerror', lambda e: ERRORS.append(str(e)))
    page.on('console', lambda m: ERRORS.append(m.text) if m.type == 'error' else None)

    base = f'{LIVE_BASE}{BASE_PATH}/' if LIVE else f'http://127.0.0.1:{PORT}{BASE_PATH}/'
    page.goto(base, wait_until='networkidle')
    page.add_style_tag(content=NO_ANIM)
    settle(page)

    check(page.locator('#play').count() == 0 and page.locator('.play-grid').count() == 0, '모바일 — 홈에 중복 놀이터 섹션 없음')
    shot(page, 'darakbang-play-mobile-home.png')
    page.evaluate('window.scrollTo(0, document.querySelector("#products").offsetTop - 40)')
    page.wait_for_timeout(250)
    shot(page, 'darakbang-home-mobile-products.png')
    overflow(page, 'mobile home')

    goto(page, '/play')
    cols = page.evaluate("""() => {
      const cards = [...document.querySelectorAll('.play-grid--hub .play-card')];
      return { n: cards.length, cols: new Set(cards.map(c => Math.round(c.getBoundingClientRect().left))).size };
    }""")
    check(cols['n'] == 5 and cols['cols'] == 1, f"모바일 — 허브 카드 5장 1열 ({cols})")
    shot(page, 'darakbang-play-mobile-hub.png')
    overflow(page, 'mobile hub')

    goto(page, '/play/charm')
    check(page.locator('form[data-form="play-charm"]').count() == 1, '모바일 — 매력살 입력 폼')
    page.evaluate('window.scrollTo(0, 0)')
    page.wait_for_timeout(200)
    shot(page, 'darakbang-play-mobile-charm-form.png')
    overflow(page, 'mobile charm form')

    fill_birth(page, 1991, 5, 7, 18, 22)
    page.locator('form[data-form="play-charm"] button[type="submit"]').click()
    settle(page, 500)
    check(page.locator('.sal-card').count() == 4, '모바일 — 매력살 결과 4장(핵심 4종)')
    page.evaluate('window.scrollTo(0, 0)')
    page.wait_for_timeout(200)
    shot(page, 'darakbang-play-mobile-charm.png')
    overflow(page, 'mobile charm')

    goto(page, '/play/scenery')
    for key in ['house', 'tree', 'person']:
        page.click(f'[data-action="htp-add"][data-key="{key}"]')
        page.wait_for_timeout(120)
    page.locator('[data-htp-stage]').scroll_into_view_if_needed()
    page.wait_for_timeout(200)
    ratio = page.evaluate("""() => {
      const r = document.querySelector('.htp-stage').getBoundingClientRect();
      return Math.round((r.width / r.height) * 100) / 100;
    }""")
    check(abs(ratio - 1) < 0.05, f'모바일 — 풍경 무대 정사각 (비율 {ratio})')

    # 탭으로 선택 → 방향 버튼으로 이동 (터치 기기에서도 확실한 조작)
    page.tap('[data-htp-sticker][data-key="person"]')
    page.wait_for_timeout(150)
    check(page.locator('.htp-controls__name').count() == 1, '모바일 — 탭 선택 후 조절 바')
    before = page.evaluate("""() => document.querySelector('[data-htp-sticker][data-key="person"]').style.left""")
    page.tap('[data-action="htp-move"][data-dir="left"]')
    page.wait_for_timeout(120)
    after = page.evaluate("""() => document.querySelector('[data-htp-sticker][data-key="person"]').style.left""")
    check(before != after, f'모바일 — 방향 버튼 이동 ({before} → {after})')
    page.tap('[data-action="htp-size"][data-size="big"]')
    page.wait_for_timeout(120)
    w = page.evaluate("""() => document.querySelector('[data-htp-sticker][data-key="person"]').style.width""")
    check(w == '30%', f'모바일 — 크기 변경 {w}')
    shot(page, 'darakbang-play-mobile-scenery.png')
    overflow(page, 'mobile scenery')

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
