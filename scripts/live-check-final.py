# -*- coding: utf-8 -*-
"""라이브 최종 검증 — 모바일 프리뷰 2×2 · 무료 원국(12띠×일주 맛보기 + 명궁·신궁) · 유료 상품/결제 모달."""
import os, time
from playwright.sync_api import sync_playwright

OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'downloads'))
CHROME = '/workspace/.cache/ms-playwright/chrome-linux64/chrome'
LIBS = '/workspace/.cache/sysroot/usr/lib/x86_64-linux-gnu'
LIVE = 'https://sisterjisoo5-create.github.io/darakbang-saju-web/'
BUST = f'?v={int(time.time())}'
NO = "*,*::before,*::after{animation:none!important;transition:none!important}"
PREP = NO + ".site-header{position:static!important}#toast-root{display:none!important}html{scroll-behavior:auto!important}"

os.environ['LD_LIBRARY_PATH'] = LIBS + ':' + os.environ.get('LD_LIBRARY_PATH', '')
os.makedirs(OUT, exist_ok=True)


def ov(pg):
    return pg.evaluate("() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })")


def assets(pg):
    return pg.evaluate("() => [...document.querySelectorAll('script[src],link[rel=stylesheet]')].map(e => e.src || e.href)")


with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--hide-scrollbars'])
    # ── 모바일 ──
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True,
                        reduced_motion='reduce', locale='ko-KR',
                        user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')
    pg = ctx.new_page()
    pg.goto(LIVE + BUST, wait_until='networkidle')
    pg.add_style_tag(content=NO)
    pg.wait_for_timeout(1000)
    print('mobile assets:', assets(pg))
    grid = pg.locator('.grid--4').first
    grid.scroll_into_view_if_needed()
    pg.wait_for_timeout(300)
    print('mobile cols:', pg.evaluate("() => getComputedStyle(document.querySelector('.grid--4')).gridTemplateColumns"),
          'grid h:', round(grid.bounding_box()['height']), 'overflow:', ov(pg))
    grid.screenshot(path=os.path.join(OUT, 'live-final-home-cards-mobile.png'))
    pg.evaluate("() => window.scrollTo(0, 700)")
    pg.wait_for_timeout(250)
    print('mobile sticky top:', pg.evaluate("() => Math.round(document.querySelector('.site-header').getBoundingClientRect().top)"))

    pg.click('form[data-form="birth"] button[type="submit"]')
    pg.wait_for_url('**#/free')
    pg.add_style_tag(content=PREP)
    pg.wait_for_timeout(1600)
    print('free: zi-jami 부처궁 카드 수:', pg.locator('.jami3__item', has_text='부처궁').count(),
          '| 명궁·신궁 카드:', pg.locator('.jami3__item').count(),
          '| 부처궁 잠금 블록:', pg.locator('.jami3__locked').count())
    print('free: 12띠×일주 전체문단 노출?', pg.locator('.zi__p, .zi__appeals').count(), '| 맛보기 카드:', pg.locator('.zi-teaser').count())
    pg.locator('.zi-teaser').first.screenshot(path=os.path.join(OUT, 'live-final-zi-mobile.png'))
    pg.locator('.jami3').first.screenshot(path=os.path.join(OUT, 'live-final-jami-mobile.png'))
    pg.locator('.zi-teaser').first.scroll_into_view_if_needed()
    pg.wait_for_timeout(200)
    pg.screenshot(path=os.path.join(OUT, 'live-final-free-mobile.png'), full_page=True)
    # 맛보기 카드 → 결제 모달 (열기만)
    pg.locator('.zi-teaser button[data-action="open-pay"]').first.click()
    pg.wait_for_selector('.modal', timeout=8000)
    pg.wait_for_timeout(600)
    print('mobile modal:', pg.locator('.modal').inner_text()[:80].replace('\n', ' | '))
    pg.screenshot(path=os.path.join(OUT, 'live-final-modal-mobile.png'))
    pg.locator('.modal button[data-action="close-modal"]').first.click()
    pg.wait_for_timeout(400)
    # 부처궁·12궁 유도 버튼 → 자미두수 심층 상품
    pg.locator('.jami3__locked a').first.click()
    pg.wait_for_url('**#/product/jami')
    pg.wait_for_timeout(1200)
    print('jami product page 부처궁 언급:', '부처궁' in pg.inner_text('body'))
    ctx.close()

    # ── PC ──
    ctx = b.new_context(viewport={'width': 1280, 'height': 900}, device_scale_factor=2, reduced_motion='reduce', locale='ko-KR')
    pg = ctx.new_page()
    pg.goto(LIVE + BUST, wait_until='networkidle')
    pg.add_style_tag(content=NO)
    pg.wait_for_timeout(800)
    pg.locator('.grid--4').first.screenshot(path=os.path.join(OUT, 'live-final-home-cards-desktop.png'))
    pg.click('form[data-form="birth"] button[type="submit"]')
    pg.wait_for_url('**#/free')
    pg.add_style_tag(content=PREP)
    pg.wait_for_timeout(1500)
    print('PC free overflow:', ov(pg))
    pg.screenshot(path=os.path.join(OUT, 'live-final-free-desktop.png'), full_page=True)
    pg.goto(LIVE + BUST + '#/product/zodiac-ilju', wait_until='networkidle')
    pg.add_style_tag(content=PREP)
    pg.wait_for_timeout(1000)
    print('product zodiac-ilju: 제목', pg.locator('.result-head h1').inner_text(), '| 잠금 CTA', pg.locator('.lock-wrap button[data-action="open-pay"]').count())
    pg.screenshot(path=os.path.join(OUT, 'live-final-product-desktop.png'), full_page=True)
    pg.locator('button[data-action="open-pay"][data-pid="zodiac-ilju"]').first.click()
    pg.wait_for_selector('.modal', timeout=8000)
    pg.wait_for_timeout(500)
    print('PC modal:', pg.locator('.modal').inner_text()[:80].replace('\n', ' | '))
    pg.screenshot(path=os.path.join(OUT, 'live-final-modal-desktop.png'))
    ctx.close()
    b.close()
print('done')
