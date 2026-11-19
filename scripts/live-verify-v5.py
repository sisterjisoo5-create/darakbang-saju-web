# -*- coding: utf-8 -*-
"""라이브 검증 — GitHub Pages 의 무료 원국 개편(02 카드 · 12띠×일주 · 슬림 자미두수)을
PC(1280) / 모바일(390) 에서 실제로 열어 스크린샷을 남기고, 새 번들·가로 넘침을 확인한다.

산출물 (workspace/downloads)
  live-v5-desktop-full.png / live-v5-mobile-full.png
  live-v5-home-02.png / live-v5-zi.png / live-v5-jami.png / live-v5-temp.png
  live-v5-mobile-zi.png / live-v5-mobile-jami.png
"""
import os
import time
from playwright.sync_api import sync_playwright

OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'downloads'))
CHROME = '/workspace/.cache/ms-playwright/chrome-linux64/chrome'
LIBS = '/workspace/.cache/sysroot/usr/lib/x86_64-linux-gnu'
LIVE = 'https://sisterjisoo5-create.github.io/darakbang-saju-web/'
BUST = f'?v={int(time.time())}'
NO_ANIM = "*,*::before,*::after{animation:none!important;transition:none!important}"
PREP = NO_ANIM + ".site-header{position:static!important}#toast-root{display:none!important}.report-actions{display:none!important}html{scroll-behavior:auto!important}"

os.makedirs(OUT, exist_ok=True)


def settle(page, ms=500):
    page.wait_for_timeout(ms)
    page.wait_for_function("document.fonts.status === 'loaded'")


def assets(page):
    return page.evaluate("() => [...document.querySelectorAll('script[src],link[rel=stylesheet]')].map(e => e.src || e.href)")


def overflow(page):
    return page.evaluate("""() => {
      const d = document.documentElement;
      const wide = [...document.querySelectorAll('body *')]
        .filter(el => el.getBoundingClientRect().right > d.clientWidth + 2)
        .slice(0, 5).map(el => el.className || el.tagName);
      return { scrollW: d.scrollWidth, clientW: d.clientWidth, wide };
    }""")


def open_free(page):
    page.goto(LIVE + BUST, wait_until='networkidle')
    page.add_style_tag(content=NO_ANIM)
    settle(page)
    page.screenshot(path=os.path.join(OUT, 'live-v5-home.png'), full_page=False)
    page.locator('.grid--4').first.screenshot(path=os.path.join(OUT, 'live-v5-home-02.png'))
    page.click('form[data-form="birth"] button[type="submit"]')
    page.wait_for_url('**#/free')
    settle(page, 900)
    page.add_style_tag(content=PREP)
    page.wait_for_timeout(1500)


def clip_shot(page, locator, name, pad_top, pad_bottom, width_pad=0):
    locator.scroll_into_view_if_needed()
    page.wait_for_timeout(250)
    b = locator.bounding_box()
    page.screenshot(path=os.path.join(OUT, name), clip={
        'x': max(0, b['x'] - width_pad), 'y': max(0, b['y'] - pad_top),
        'width': min(page.viewport_size['width'], b['width'] + width_pad * 2),
        'height': b['height'] + pad_top + pad_bottom,
    })


def main():
    env = dict(os.environ)
    env['LD_LIBRARY_PATH'] = LIBS + ':' + env.get('LD_LIBRARY_PATH', '')
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--hide-scrollbars'], env=env)

        # ── PC ──
        ctx = browser.new_context(viewport={'width': 1280, 'height': 900}, device_scale_factor=2,
                                  reduced_motion='reduce', locale='ko-KR')
        page = ctx.new_page()
        open_free(page)
        print('PC assets:', assets(page))
        print('PC overflow:', overflow(page))
        print('PC notice block present:', page.locator('h3', has_text='오늘의 다락방 처방').count())
        page.screenshot(path=os.path.join(OUT, 'live-v5-desktop-full.png'), full_page=True)
        clip_shot(page, page.locator('.temp-note').first, 'live-v5-temp.png', 180, 40, 20)
        clip_shot(page, page.locator('.zi-teaser').first, 'live-v5-zi.png', 110, 60, 10)
        clip_shot(page, page.locator('.jami3').first, 'live-v5-jami.png', 130, 220, 30)

        # ── 모바일 ──
        m = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2,
                                is_mobile=True, has_touch=True, reduced_motion='reduce', locale='ko-KR',
                                user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')
        mp = m.new_page()
        open_free(mp)
        print('Mobile overflow:', overflow(mp))
        mp.screenshot(path=os.path.join(OUT, 'live-v5-mobile-full.png'), full_page=True)
        clip_shot(mp, mp.locator('.zi-teaser').first, 'live-v5-mobile-zi.png', 100, 60, 0)
        clip_shot(mp, mp.locator('.jami3').first, 'live-v5-mobile-jami.png', 120, 240, 0)

        browser.close()
    print('done')


if __name__ == '__main__':
    main()
