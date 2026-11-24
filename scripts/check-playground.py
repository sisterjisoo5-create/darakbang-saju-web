# -*- coding: utf-8 -*-
"""다락방 무료 놀이터 4종 검수 — 매력살 · 비밀 쪽지 · 찐심 판독기 · 풍경 심리테스트

  python3 scripts/check-playground.py            # dist/ (로컬 빌드)
  SITE=1 python3 scripts/check-playground.py     # 라이브 GitHub Pages

확인
  · 홈 '자니의 다락방 놀이터' 섹션 · 카드 4장 · 허브 이동
  · 01 매력살: 생년월일 입력 → 실제 원국 4기둥 · 살 6종 · 화개(시지) 판독 · CTA
  · 02 비밀 쪽지: 이름 입력 → 양피지 쪽지 · 행운 색/띠/피할 한 마디 · 복사·공유 버튼
  · 03 찐심 판독: 스타일만으로 판독 → 상대 생일 넣고 재판독(경인일주 표현)
  · 04 풍경: 스티커 추가 · 끌어서 이동 · 크기 변경 → 결과 미리보기 · 두 점수 · 공유
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

    # ① 홈 섹션
    check(page.locator('#play').count() == 1, '홈에 자니의 다락방 놀이터 섹션')
    check(page.locator('#play .play-card').count() == 4, '홈 놀이터 카드 4장')
    titles = page.locator('#play .play-card__title').all_inner_texts()
    check(titles[0] == '내 사주 매력살 뜯어보기' and titles[3] == '자니의 다락방 풍경 심리테스트', '카드 제목 4종 — ' + ' / '.join(titles))
    page.locator('#play').scroll_into_view_if_needed()
    page.wait_for_timeout(250)
    shot(page, 'darakbang-play-home.png')
    overflow(page, 'home')

    # ② 허브
    goto(page, '/play')
    check(page.locator('.play-grid--hub .play-card').count() == 4, '허브 카드 4장')
    shot(page, 'darakbang-play-hub.png')

    # ③ 매력살
    goto(page, '/play/charm')
    check(page.locator('form[data-form="play-charm"]').count() == 1, '매력살 — 생년월일 폼')
    fill_birth(page, 1992, 10, 15, 7, 33)
    page.locator('form[data-form="play-charm"] button[type="submit"]').click()
    settle(page, 500)
    check(page.locator('.play-ming__cell').count() == 4, '매력살 — 원국 4기둥 카드')
    check(page.locator('.sal-card').count() == 6, '매력살 — 살 6종 카드')
    txt = page.locator('.sal-grid').inner_text()
    check('화개살' in txt and '있음' in txt, '매력살 — 화개살 판독 표시')
    check('천을귀인' in txt and '도화살' in txt, '매력살 — 도화·천을귀인 카드')
    check(page.locator('.play-verdict').count() == 1 and page.locator('.play-score').count() == 1, '매력살 — 자니 한 줄 + 매력 온도')
    check(page.locator('.play-cta a[href*="product/love"]').count() == 1, '매력살 — 연애운 CTA')
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
    check(page.locator('[data-action="play-copy"][data-kind="note"]').count() == 1, '쪽지 — 복사 버튼')
    check(page.locator('[data-action="play-share-x"]').count() == 1, '쪽지 — X 공유 버튼')
    check(page.locator('[data-action="play-copy"][data-kind="insta"]').count() == 1, '쪽지 — 인스타용 복사 버튼')
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
    shot(page, 'darakbang-play-signal-style.png', full=True)

    # ⑥ 찐심 판독 — 상대 생일 포함
    page.click('[data-action="play-signal-reset"]')
    settle(page, 300)
    page.check('input[name="useBirth"]')
    check(page.locator('[data-play-birth]').is_visible(), '찐심 — 생일 입력 펼침')
    fill_birth(page, 1997, 6, 17, 8, 0)
    page.locator('form[data-form="play-signal"] button[type="submit"]').click()
    settle(page, 500)
    ilju = page.locator('.signal-ilju').inner_text()
    check('경인일주' in ilju, f'찐심 — 상대 일주 표현 {ilju}')
    check('일간' in page.locator('.signal-card').nth(0).inner_text(), '찐심 — 일간 해석')
    check(page.locator('.signal-evidence li').count() >= 3, '찐심 — 판독 근거 3줄 이상')
    check(page.locator('.play-cta a[href*="product/bias"]').count() == 1, '찐심 — 최애궁합 CTA')
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
    check(page.locator('.htp-score').count() == 2, '풍경 — 휴식·대인 점수 2개')
    check(page.locator('.play-verdict').count() == 1, '풍경 — 자니 판독 한 줄')
    check(page.locator('[data-action="play-copy"][data-kind="scenery"]').count() == 1, '풍경 — 공유 문구 복사')
    check(page.locator('.play-cta a[href*="product/saju"]').count() == 1, '풍경 — 990원 사주 CTA')
    shot(page, 'darakbang-play-scenery-result.png', full=True)
    overflow(page, 'scenery')

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

    page.locator('#play').scroll_into_view_if_needed()
    page.wait_for_timeout(250)
    cols = page.evaluate("""() => {
      const cards = [...document.querySelectorAll('#play .play-card')];
      return new Set(cards.map(c => Math.round(c.getBoundingClientRect().left))).size;
    }""")
    check(cols == 1, f'모바일 — 놀이터 카드 1열 ({cols})')
    shot(page, 'darakbang-play-mobile-home.png')
    overflow(page, 'mobile home')

    goto(page, '/play')
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
    check(page.locator('.sal-card').count() == 6, '모바일 — 매력살 결과 6장')
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
