# -*- coding: utf-8 -*-
"""메인 히어로 재배치(자니 카드 최상단 → 헤드라인, 노란 바 아래 한 줄 확장, 설명 문구 → 입력 화면) 검수.

산출물 (workspace/downloads)
  darakbang-v7-desktop-hero.png      첫 화면 히어로 (자니 카드 + 노란 바)
  darakbang-v7-desktop-input.png     노란 바 클릭 → 생년월일시 입력 화면
  darakbang-v7-desktop-result.png    입력 후 결과 화면 (오늘의 운세 모션 자니 카드 포함)
  darakbang-v7-desktop-today.png     결과 화면의 오늘의 운세 카드
  darakbang-v7-desktop-products.png  12개 상품 카드
  darakbang-v7-desktop-faq.png       FAQ 첫 항목(구슬 안내)
  darakbang-v7-desktop-career.png    직업 · 이직운 리포트
  darakbang-v7-mobile-*.png          위와 같은 흐름의 모바일(390)
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
PORT = 4191
CHROME = '/workspace/.cache/ms-playwright/chrome-linux64/chrome'
LIBS = '/workspace/.cache/sysroot/usr/lib/x86_64-linux-gnu'
BASE_PATH = '/darakbang-saju-web'
LIVE = os.environ.get('SITE', '').strip()
TAG_PREFIX = 'live-' if LIVE else ''

os.makedirs(OUT, exist_ok=True)
FAILS = []


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
PREP = NO_ANIM + ".site-header{position:static!important}#toast-root{display:none!important}html{scroll-behavior:auto!important}"


def settle(page, ms=500):
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
    print(f'[{label}] scrollWidth={r["scrollW"]} clientWidth={r["clientW"]} overflow={r["wide"]}')
    return r


def shot(page, name, full=False):
    path = os.path.join(OUT, TAG_PREFIX + name)
    page.screenshot(path=path, full_page=full)
    print('   shot', path)
    return path


def clip(page, selector, name, pad=(30, 30)):
    el = page.locator(selector).first
    el.scroll_into_view_if_needed()
    page.wait_for_timeout(250)
    b = el.bounding_box()
    page.screenshot(path=os.path.join(OUT, TAG_PREFIX + name), clip={
        'x': max(0, b['x'] - pad[0]), 'y': max(0, b['y'] - pad[1]),
        'width': min(page.viewport_size['width'] - max(0, b['x'] - pad[0]), b['width'] + pad[0] * 2),
        'height': b['height'] + pad[1] * 2,
    })
    print('   shot', os.path.join(OUT, TAG_PREFIX + name))


def run(browser, tag, viewport, mobile=False):
    print(f'=== {tag} ===')
    if mobile:
        ctx = browser.new_context(viewport=viewport, device_scale_factor=2, is_mobile=True, has_touch=True,
                                  reduced_motion='reduce', locale='ko-KR',
                                  user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')
    else:
        ctx = browser.new_context(viewport=viewport, device_scale_factor=2, reduced_motion='reduce', locale='ko-KR')
    page = ctx.new_page()
    base = LIVE if LIVE else f'http://127.0.0.1:{PORT}{BASE_PATH}/'
    page.goto(base, wait_until='networkidle')
    page.add_style_tag(content=NO_ANIM)
    settle(page)

    # ① 히어로
    overflow(page, f'{tag} home')
    h1 = page.locator('.hero h1').inner_text().replace('\n', ' ')
    check('당신의 여덟 글자' in h1, f'히어로 헤드라인 — {h1}')
    check(page.locator('.hero__lead').count() == 0 and page.locator('.hero__marks').count() == 0,
          '히어로 설명 문단·배지 2개가 첫 화면에서 삭제됨')
    note = page.locator('.jani-card__note').inner_text().strip()
    check('가입 없음' in note and '결제 없음' in note and '30초' in note and '입력값은 내 브라우저에만' in note,
          '노란 바 아래 한 줄 — ' + note)
    order = page.evaluate("""() => {
      const card = document.querySelector('.jani-card').getBoundingClientRect();
      const head = document.querySelector('.hero h1').getBoundingClientRect();
      return { cardTop: Math.round(card.top), headTop: Math.round(head.top), stacked: Math.abs(card.left - head.left) < 200 };
    }""")
    print('   order:', order)
    if viewport['width'] <= 1000:
        check(order['cardTop'] < order['headTop'], '모바일: 자니 카드가 헤드라인보다 위')
        first = page.evaluate("""() => {
          const vh = window.innerHeight;
          const bar = document.querySelector('.jani-card__bar').getBoundingClientRect();
          const note = document.querySelector('.jani-card__note').getBoundingClientRect();
          return { vh, barBottom: Math.round(bar.bottom), noteBottom: Math.round(note.bottom) };
        }""")
        print('   fold:', first)
        check(first['noteBottom'] <= first['vh'], '모바일 첫 화면에 노란 바와 안내 문구가 다 들어온다')
    check(page.locator('.jani-card').count() == 1, '자니 카드가 히어로에 있다')
    check(page.locator('.jani-card__bar').inner_text().startswith('무료로 내 원국 보기'),
          '노란 바 문구 — ' + page.locator('.jani-card__bar').inner_text().strip())
    check('1,456' in page.locator('.jani-card__badge--visitors').inner_text(), '오늘 1,456명 배지')
    check('절기 기준 만세력' in page.locator('.jani-card__badge--verified').inner_text(), '만세력 검증 배지')
    check(page.locator('form[data-form="birth"]').count() == 0, '첫 화면에는 생년월일시 폼이 펼쳐져 있지 않다')
    check(page.locator('.hero .today-card').count() == 0, '첫 화면에 오늘의 운세 카드가 없다')
    shot(page, f'darakbang-v7-{tag}-hero.png')
    page.locator('.jani-card').screenshot(path=os.path.join(OUT, TAG_PREFIX + f'darakbang-v7-{tag}-hero-card.png'))

    # ② 노란 바 클릭 → 입력 화면
    page.locator('.jani-card__bar').click()
    page.wait_for_url('**#/input')
    settle(page, 400)
    check(page.locator('.input-page form[data-form="birth"]').count() == 1, '노란 바 클릭 → 생년월일시 입력 화면')
    desc = page.locator('.input-page__desc').inner_text().replace('\n', ' ')
    check('생년월일시만 넣으면 원국 8글자와 오행 온도가 바로 열립니다' in desc and '가입도, 저장도 없습니다' in desc,
          '입력 화면 상단 설명 문구 — ' + desc)
    dpos = page.evaluate("""() => {
      const d = document.querySelector('.input-page__desc').getBoundingClientRect();
      const t = document.querySelector('.input-page__copy h1').getBoundingClientRect();
      const f = document.querySelector('.input-page form').getBoundingClientRect();
      return { title: Math.round(t.top), desc: Math.round(d.top), form: Math.round(f.top) };
    }""")
    print('   input order:', dpos)
    check(dpos['title'] < dpos['desc'] < dpos['form'], '설명 문구가 제목 아래·입력 폼 위')
    overflow(page, f'{tag} input')
    shot(page, f'darakbang-v7-{tag}-input.png')
    page.goto(base, wait_until='networkidle')
    settle(page, 300)
    page.locator('.jani-card__figure img').click()
    page.wait_for_url('**#/input')
    page.wait_for_selector('.input-page form[data-form="birth"]', timeout=5000)
    check(page.locator('.input-page form[data-form="birth"]').count() == 1, '자니 이미지 카드 클릭 → 입력 화면')

    # ③ 입력 → 결과 화면(오늘의 운세 카드)
    page.fill('form[data-form="birth"] input[name="year"]', '1992')
    page.fill('form[data-form="birth"] input[name="month"]', '10')
    page.fill('form[data-form="birth"] input[name="day"]', '15')
    page.fill('form[data-form="birth"] input[name="hour"]', '7')
    page.fill('form[data-form="birth"] input[name="minute"]', '33')
    page.locator('form[data-form="birth"] button[type="submit"]').click()
    page.wait_for_url('**#/free')
    settle(page, 900)
    page.add_style_tag(content=PREP)
    check(page.locator('.today-card').count() == 1, '결과 화면에 오늘의 운세 카드가 있다')
    check(page.locator('.today-card h3').inner_text().strip() == '다락방 자니가 읽어주는 오늘의 운세', '오늘의 운세 제목')
    tsrc = page.locator('.today-card__media img').get_attribute('src') or ''
    check('zodiac/jani-cut' in tsrc, f'오늘의 운세 이미지가 망토 자니 — {tsrc}')
    page.emulate_media(reduced_motion='no-preference')
    anim = page.evaluate("""() => {
      document.querySelectorAll('style').forEach(st => { if (st.textContent.includes('animation:none')) st.remove(); });
      const el = document.querySelector('.today-card__media');
      const cs = getComputedStyle(el);
      return cs.animationName + ' ' + cs.animationDuration;
    }""")
    check(anim.startswith('float'), f'오늘의 운세 자니 둥실 모션 — {anim}')
    page.emulate_media(reduced_motion='reduce')
    page.add_style_tag(content=PREP)
    overflow(page, f'{tag} result')
    page.evaluate('window.scrollTo(0, 0)')
    page.wait_for_timeout(300)
    shot(page, f'darakbang-v7-{tag}-result-top.png')
    clip(page, '.today-block', f'darakbang-v7-{tag}-today.png', pad=(16, 16))

    # ④ 12개 상품
    page.goto(base + '#/#products', wait_until='networkidle')
    settle(page, 400)
    page.goto(base, wait_until='networkidle')
    settle(page, 300)
    page.locator('#products').scroll_into_view_if_needed()
    page.wait_for_timeout(400)
    h2 = page.locator('#products h2').inner_text()
    check(h2.strip() == '다락방의 운세 열두 가지', f'상품 섹션 제목 — {h2}')
    names = page.locator('.pcard__name').all_inner_texts()
    print('   products:', names)
    check(len(names) == 12, f'상품 카드 {len(names)}개')
    check('직업 · 이직운' in names, '직업 · 이직운 카드')
    check(page.locator('.bead-guide').count() == 0, '상품 위 구슬 안내 박스가 사라졌다')
    geo = page.evaluate("""() => {
      const cards = [...document.querySelectorAll('.pcard')];
      const idx = (n) => cards.findIndex(c => c.querySelector('.pcard__name').textContent.trim() === n);
      const rect = (n) => { const r = cards[idx(n)].getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; };
      return { tiger: idx('자미두수 심층'), ox: idx('10년 대운 풀이'), tigerR: rect('자미두수 심층'), oxR: rect('10년 대운 풀이') };
    }""")
    print('   grid:', geo)
    same_row = abs(geo['tigerR'][1] - geo['oxR'][1]) < 4
    check(not same_row, '호랑이(자미두수)·소(대운) 카드가 같은 줄에 붙어 있지 않다')
    page.evaluate('window.scrollTo(0, 0)')
    page.wait_for_timeout(200)
    section = page.locator('#products')
    section.screenshot(path=os.path.join(OUT, TAG_PREFIX + f'darakbang-v7-{tag}-products.png'))
    print('   shot products')
    page.locator('.product-grid').screenshot(path=os.path.join(OUT, TAG_PREFIX + f'darakbang-v7-{tag}-grid.png'))

    # ⑤ FAQ 구슬 안내
    faq = page.locator('.faq__item').first
    faq.scroll_into_view_if_needed()
    page.wait_for_timeout(300)
    q = faq.locator('.faq__q').inner_text()
    a = faq.locator('.faq__a').inner_text()
    print('   FAQ#1:', q)
    check('구슬 안내' in q, 'FAQ 첫 항목이 구슬 안내')
    check('전용 이용권(1구슬 = 990원)' in a, 'FAQ에 구슬 목적')
    check('12종' in a and '직업 · 이직운(1구슬)' in a, 'FAQ에 결제 가능 12종')
    check('유효기간은 결제일로부터 1년 이내' in a, 'FAQ에 유효기간')
    clip(page, '.faq__item', f'darakbang-v7-{tag}-faq.png', pad=(10, 14))

    # ⑥ 직업 · 이직운 리포트
    page.goto(base + '#/product/career', wait_until='networkidle')
    settle(page, 700)
    page.add_style_tag(content=PREP)
    title = page.locator('.result-head h1').inner_text()
    check(title.strip() == '직업 · 이직운', f'직업 리포트 제목 — {title}')
    secs = page.locator('.sheet.rp .sheet__title').all_inner_texts()
    print('   career sections:', secs)
    check(len(secs) >= 5, f'직업 리포트 섹션 {len(secs)}장')
    overflow(page, f'{tag} career')
    page.evaluate('window.scrollTo(0, 0)')
    page.wait_for_timeout(300)
    shot(page, f'darakbang-v7-{tag}-career-top.png')
    page.locator('.sheet.rp').first.scroll_into_view_if_needed()
    page.wait_for_timeout(300)
    shot(page, f'darakbang-v7-{tag}-career-section.png')
    ctx.close()


def main():
    if not LIVE:
        serve()
    env = dict(os.environ)
    env['LD_LIBRARY_PATH'] = LIBS + ':' + env.get('LD_LIBRARY_PATH', '')
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--hide-scrollbars'], env=env)
        run(browser, 'desktop', {'width': 1280, 'height': 900})
        run(browser, 'mobile', {'width': 390, 'height': 844}, mobile=True)
        browser.close()
    print('\nFAILS:', json.dumps(FAILS, ensure_ascii=False, indent=1) if FAILS else 'none')
    sys.exit(1 if FAILS else 0)


if __name__ == '__main__':
    main()
