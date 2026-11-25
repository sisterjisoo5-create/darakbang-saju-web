# -*- coding: utf-8 -*-
"""JPプレイグラウンド検収 — #/jp · #/jp/chemistry · #/jp/otaku · #/jp/heavy-love

  python3 scripts/check-jp.py            # dist/ (ローカルビルド)
  SITE=1 python3 scripts/check-jp.py     # ライブ GitHub Pages

確認
  · 韓国本陣の無傷 — ホーム・無料遊び場4種・990円商品がそのまま
  · ヘッダーの小さな 🇯🇵 JP リンク → #/jp
  · JPハブは3種（相性診断・推し活タイプ・重め恋愛）・990円/決済/구슬リンクなし・デスクトップ3列
  · JPハブ右上の「無料遊び場」お遊び自니 — 韓国メインと同じ画像・浮遊モーション・見出しと重ならない・押すと3枚までスクロール
  · 相性診断: 生年月日2つ＋推し名 → 点数・レア度・三柱・3ポイント・注意
  · 推し活タイプ: 生年月日＋3問 → 4文字コード・レシート・財布危険度・取説3行
  · 重め恋愛: 生年月日 → 12動物タイプ・愛の重さ%・表と裏・重めの癖・相性の動物・三柱
  · Xシェア intent に @3F_Zanie・#四柱推命・#推し活 / #重め恋愛診断・#Zanie占い・#/jp URL
  · 画像保存が 1080×1350 PNG（4:5）で落ちてくる
  · モバイル390: 横はみ出し0・ハブは1列
"""
import http.server
import json
import os
import re
import socketserver
import sys
import threading

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DIST = os.path.join(ROOT, 'dist')
OUT = os.path.abspath(os.path.join(ROOT, '..', 'downloads'))
PORT = 4194
CHROME = '/workspace/.cache/ms-playwright/chrome-linux64/chrome'
LIBS = ':'.join([
    '/workspace/tmp/libs2/usr/lib/x86_64-linux-gnu',
    '/workspace/tmp/libs/usr/lib/x86_64-linux-gnu',
    '/workspace/.cache/sysroot/usr/lib/x86_64-linux-gnu',
])
BASE_PATH = '/darakbang-saju-web'
LIVE = bool(os.environ.get('SITE', '').strip()) or ('--live' in sys.argv)
LIVE_BASE = 'https://sisterjisoo5-create.github.io'
TAG = 'live-jp-' if LIVE else 'jp-'

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
BASE = f'{LIVE_BASE}{BASE_PATH}/' if LIVE else f'http://127.0.0.1:{PORT}{BASE_PATH}/'


def settle(page, ms=320):
    page.wait_for_timeout(ms)
    page.wait_for_function("document.fonts.status === 'loaded'")


def goto(page, path):
    page.goto(f'{BASE}#{path}', wait_until='networkidle')
    settle(page)


def shot(page, name, full=False):
    path = os.path.join(OUT, TAG + name)
    page.screenshot(path=path, full_page=full)
    print('   shot', path)


def overflow(page, label):
    r = page.evaluate("""() => {
      const d = document.documentElement;
      const wide = [...document.querySelectorAll('body *')]
        .filter(el => el.getBoundingClientRect().right > d.clientWidth + 2)
        .slice(0, 6).map(el => el.className || el.tagName);
      return { scrollW: d.scrollWidth, clientW: d.clientWidth, wide };
    }""")
    check(r['scrollW'] <= r['clientW'] + 2,
          f'{label} 横はみ出しなし (scrollW {r["scrollW"]} / clientW {r["clientW"]}) {r["wide"]}')
    return r


def hero_text_overlap(page, arcade_sel):
    """ヒーローの文字（見出し・リード・チップ）と自니ボタンが実際に重なっているか。
    ブロック要素の箱ではなく、文字の行(Range.getClientRects)で見る。"""
    return page.evaluate("""(sel) => {
      const a = document.querySelector(sel).getBoundingClientRect();
      const hits = [];
      for (const q of ['.jp-hero__badge', '.jp-hero h1', '.jp-hero p', '.jp-chips']) {
        const el = document.querySelector(q);
        if (!el) continue;
        const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let n;
        while ((n = w.nextNode())) {
          if (!n.textContent.trim()) continue;
          const r = document.createRange();
          r.selectNodeContents(n);
          for (const b of r.getClientRects()) {
            const ow = Math.min(a.right, b.right) - Math.max(a.left, b.left);
            const oh = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
            if (ow > 0 && oh > 0) hits.push(q + ' ' + Math.round(ow) + 'x' + Math.round(oh));
          }
        }
      }
      return hits;
    }""", arcade_sel)


def no_commerce(page, label):
    text = page.locator('body').inner_text()
    for bad in ['990', '구슬', '결제', '원 상품']:
        check(bad not in text, f'{label} に「{bad}」が無い')


def fill_date(page, prefix, y, m, d):
    page.fill(f'input[name="{prefix}Year"]', str(y))
    page.fill(f'input[name="{prefix}Month"]', str(m))
    page.fill(f'input[name="{prefix}Day"]', str(d))


def stub_window_open(page):
    page.evaluate("""() => {
      window.__jpOpened = null;
      window.open = (u) => { window.__jpOpened = u; return { opener: null }; };
    }""")


def check_png(path, label):
    check(os.path.exists(path), f'{label} PNG が保存された')
    if not os.path.exists(path):
        return
    im = Image.open(path)
    check(im.size == (1080, 1350), f'{label} は 1080×1350（4:5）— 実際 {im.size}')
    colors = im.convert('RGB').getcolors(maxcolors=200000)
    check(colors is not None and len(colors) > 40, f'{label} が単色でない（{len(colors) if colors else 0} 色）')


def run_desktop(browser):
    print('=== desktop 1280 ===')
    ctx = browser.new_context(viewport={'width': 1280, 'height': 900}, device_scale_factor=2,
                              reduced_motion='reduce', locale='ja-JP', accept_downloads=True)
    page = ctx.new_page()
    page.on('pageerror', lambda e: ERRORS.append(str(e)))
    page.on('console', lambda m: ERRORS.append(m.text) if m.type == 'error' else None)

    # ① 韓国本陣はそのまま
    page.goto(BASE, wait_until='networkidle')
    page.add_style_tag(content=NO_ANIM)
    settle(page)
    home = page.locator('#view').inner_text()
    check('사주보는 3층 다락방' in page.locator('.brand').first.inner_text(), '韓国ホームのブランド名そのまま')
    check(page.locator('#products .pcard, #products a[href*="#/product/"]').count() >= 1, '990円商品セクション表示')
    check(page.locator('.nav a[href="#/play"]').count() == 1, 'ヘッダー「무료 놀이터」リンク維持')
    check('오늘의 운세' in home or '무료' in home, '韓国ホーム本文そのまま')
    overflow(page, '韓国ホーム')

    # JPリンク
    jp = page.locator('.jp-link').first
    check(jp.count() == 1, 'ヘッダーに 🇯🇵 JP リンク')
    check(jp.get_attribute('href') == '#/jp', 'JPリンク → #/jp')
    jp.click()
    settle(page, 420)
    check(page.url.endswith('#/jp'), f'JPリンクで #/jp へ ({page.url})')

    # ② JPハブ
    check(page.locator('.jp-page').count() == 1, 'JPハブが描画される')
    h1 = page.locator('.jp-hero h1').inner_text()
    check('推し活' in h1, f'JPハブ見出しが日本語 ({h1})')
    cards = page.locator('.jp-grid .jp-card')
    check(cards.count() == 3, f'JPハブは3種 (実際 {cards.count()})')
    titles = [cards.nth(i).locator('.jp-card__title').inner_text() for i in range(cards.count())]
    check(titles == ['推しとの相性診断', '推し活タイプ診断', '重め恋愛アニマル診断'], f'3種のタイトル {titles}')
    boxes = [cards.nth(i).bounding_box() for i in range(cards.count())]
    check(max(b['y'] for b in boxes) - min(b['y'] for b in boxes) < 12, 'デスクトップは3列（横に並ぶ）')
    check(boxes[0]['x'] < boxes[1]['x'] < boxes[2]['x'], 'カードの並びは左から01·02·03')
    check(page.locator('.jp-card[href="#/jp/chemistry"]').count() == 1, '相性診断カード')
    check(page.locator('.jp-card[href="#/jp/otaku"]').count() == 1, '推し活タイプカード')
    check(page.locator('.jp-card[href="#/jp/heavy-love"]').count() == 1, '重め恋愛カード')
    check(page.locator('.nav--jp a[href="#/jp/chemistry"]').count() == 1, 'JPヘッダー内ナビ')
    check(page.locator('.nav--jp a[href="#/jp/heavy-love"]').count() == 1, 'JPヘッダーに重め恋愛')
    check(page.locator('.header-actions a[href="https://x.com/3F_Zanie"]').count() == 1, 'JPヘッダーに @3F_Zanie')
    check('990' not in page.locator('.site-header').inner_text(), 'JPヘッダーに価格なし')

    # 右上の「無料遊び場」お遊び自니 — 韓国メインと同じ画像・同じ浮遊モーション
    arc = page.locator('.jp-hero .jani-arcade--jp')
    check(arc.count() == 1, 'JPハブのヒーローに遊び場の自니')
    check(arc.get_attribute('href') == '#/jp/chemistry', '自니ボタン → 最初の遊び (#/jp/chemistry)')
    check('無料遊び場' in arc.inner_text(), 'バッジは「無料遊び場」')
    check(arc.get_attribute('aria-label') and '無料遊び場' in arc.get_attribute('aria-label'), '自니ボタンに日本語の読み上げ名')
    check(page.locator('.jp-hero .jani-arcade--jp img').count() == 1, 'お遊び自니の画像')
    src = page.locator('.jp-hero .jani-arcade--jp img').get_attribute('src') or ''
    check('zanie-arcade-float' in src, f'韓国メインと同じ画像 ({src})')
    has_float = page.evaluate("""() => {
      for (const sheet of document.styleSheets) {
        try { for (const rule of sheet.cssRules) { if (rule.cssText && rule.cssText.includes('janiArcadeFloat')) return true; } } catch (e) {}
      }
      return false;
    }""")
    check(has_float, '自니がふわふわ浮く(janiArcadeFloat)アニメーション')
    hero = page.locator('.jp-hero').bounding_box()
    abox = arc.bounding_box()
    check(abox['x'] > hero['x'] + hero['width'] * 0.6 and abox['y'] < hero['y'] + hero['height'] * 0.4,
          '自니はヒーローカードの右上')
    check(abox['x'] >= hero['x'] and abox['x'] + abox['width'] <= hero['x'] + hero['width'] + 1
          and abox['y'] >= hero['y'] and abox['y'] + abox['height'] <= hero['y'] + hero['height'] + 1,
          '自니はカードの外にはみ出さない')
    check(hero_text_overlap(page, '.jp-hero .jani-arcade--jp') == [],
          f'見出し・リードの文字と重ならない {hero_text_overlap(page, ".jp-hero .jani-arcade--jp")}')
    shot(page, 'darakbang-jp-hero-arcade.png')

    # 自니を押すと下の3つの遊びカードまでスクロール（ページは #/jp のまま）
    page.evaluate('window.scrollTo(0, 0)')
    page.wait_for_timeout(150)
    arc.click()
    settle(page, 700)
    check(page.url.endswith('#/jp'), f'自니を押してもページは #/jp のまま ({page.url})')
    grid_top = page.evaluate("Math.round(document.querySelector('#jp-games').getBoundingClientRect().top)")
    check(-2 <= grid_top <= 40, f'3つの遊びカードまでスクロール (grid top {grid_top})')
    check(page.locator('.jp-grid .jp-card').count() == 3, 'スクロール先に3つの遊びカード')

    no_commerce(page, 'JPハブ')
    follow = page.locator('.jp-follow a[href="https://x.com/3F_Zanie"]')
    check(follow.count() == 1, 'ハブに @3F_Zanie フォローボタン')
    shot(page, 'darakbang-jp-hub.png', full=True)
    overflow(page, 'JPハブ')

    # ③ 相性診断
    goto(page, '/jp/chemistry')
    check(page.locator('form[data-form="jp-chemistry"]').count() == 1, '相性診断フォーム')
    fill_date(page, 'me', 1992, 10, 15)
    page.fill('input[name="oshiName"]', 'テスト推し')
    fill_date(page, 'oshi', 1988, 10, 1)
    page.locator('form[data-form="jp-chemistry"] button[type="submit"]').click()
    settle(page, 600)
    check(page.locator('#jp-result').count() == 1, '相性診断の結果が出る')
    score = page.locator('#jp-result .score-ring span').inner_text()
    check(re.fullmatch(r'\d{2,3}', score) and 32 <= int(score) <= 98, f'相性温度 {score}')
    rarity = page.locator('#jp-result .jp-rarity').inner_text()
    check(re.search(r'上位[\d.]+%のレア相性', rarity), f'レア度 {rarity}')
    check(page.locator('#jp-result .jp-point').count() == 3, '推しが落ちるポイント3つ')
    check(page.locator('#jp-result .jp-person').count() == 2, 'あなたと推しの三柱')
    check(page.locator('#jp-result .jp-ming__cell').count() == 6, '三柱×2人＝6セル')
    check('京' not in page.locator('#jp-result').inner_text(), '不要な文字なし')
    check(page.locator('#jp-result .jp-box').count() == 2, '気をつける距離感・ヒント')
    check(page.locator('#jp-result [data-action="jp-save-image"]').count() == 1, '画像を保存ボタン')
    check(page.locator('#jp-result [data-action="jp-x-share"]').count() == 1, 'Xでシェアボタン')
    check(page.locator('#jp-result .jp-follow-btn').get_attribute('href') == 'https://x.com/3F_Zanie', '@3F_Zanie フォロー')
    no_commerce(page, '相性診断の結果')
    shot(page, 'darakbang-jp-chemistry.png', full=True)
    overflow(page, '相性診断の結果')

    # Xシェア intent
    stub_window_open(page)
    page.locator('#jp-result [data-action="jp-x-share"]').click()
    settle(page, 250)
    opened = page.evaluate('window.__jpOpened')
    check(bool(opened) and opened.startswith('https://twitter.com/intent/tweet?text='), 'X intent が開く')
    if opened:
        check('%403F_Zanie' in opened, '@3F_Zanie が自動で入る')
        check('%23%E5%9B%9B%E6%9F%B1%E6%8E%A8%E5%91%BD' in opened, '#四柱推命')
        check('%23%E6%8E%A8%E3%81%97%E6%B4%BB' in opened, '#推し活')
        check('Zanie' in opened and '%E5%8D%A0%E3%81%84' in opened, '#Zanie占い')
        check('%23%2Fjp%2Fchemistry' in opened, '#/jp/chemistry URL')
        check('url=' in opened, 'URL パラメータ')

    # 画像保存
    with page.expect_download(timeout=15000) as dl:
        page.locator('#jp-result [data-action="jp-save-image"]').click()
    path = os.path.join(OUT, TAG + 'chemistry-card.png')
    dl.value.save_as(path)
    check_png(path, '相性診断カード')

    # ④ 推し活タイプ
    goto(page, '/jp/otaku')
    check(page.locator('form[data-form="jp-otaku"]').count() == 1, '推し活タイプフォーム')
    fill_date(page, 'me', 1991, 5, 7)
    page.locator('[data-playseg="q1"] button[data-value="Q"]').click()
    page.locator('[data-playseg="q2"] button[data-value="J"]').click()
    page.locator('[data-playseg="q3"] button[data-value="H"]').click()
    page.locator('form[data-form="jp-otaku"] button[type="submit"]').click()
    settle(page, 600)
    check(page.locator('#jp-result').count() == 1, '推し活タイプの結果が出る')
    code = page.locator('#jp-result .jp-code').inner_text().strip()
    check(re.fullmatch(r'[SM][TQ][KJ][FH]', code), f'4文字コード {code}')
    check(page.locator('#jp-result .jp-receipt').count() == 1, 'レシート風の取扱説明書')
    rows = page.locator('#jp-result .jp-receipt__row').count()
    check(rows >= 6, f'レシート行 {rows}')
    wallet = page.locator('#jp-result .jp-wallet__bar .jp-wallet__fill').get_attribute('style')
    check('width' in wallet, f'財布の危険度バー {wallet}')
    check(page.locator('#jp-result .jp-manual li').count() == 3, '取扱説明書3行')
    check(page.locator('#jp-result .jp-box').count() == 3, '入口・オタ友・取扱注意')
    no_commerce(page, '推し活タイプの結果')
    shot(page, 'darakbang-jp-otaku.png', full=True)
    overflow(page, '推し活タイプの結果')

    stub_window_open(page)
    page.locator('#jp-result [data-action="jp-x-share"]').click()
    settle(page, 250)
    opened = page.evaluate('window.__jpOpened')
    check(bool(opened) and '%23%2Fjp%2Fotaku' in opened and '%403F_Zanie' in opened, '推し活タイプの X intent')

    with page.expect_download(timeout=15000) as dl:
        page.locator('#jp-result [data-action="jp-save-image"]').click()
    path = os.path.join(OUT, TAG + 'otaku-card.png')
    dl.value.save_as(path)
    check_png(path, '推し活タイプカード')

    # ⑤ 重め恋愛アニマル診断
    goto(page, '/jp/heavy-love')
    check(page.locator('form[data-form="jp-heavy-love"]').count() == 1, '重め恋愛フォーム')
    check(page.locator('form[data-form="jp-heavy-love"] input[name="oshiName"]').count() == 0, '入力は生年月日だけ')
    fill_date(page, 'me', 1991, 5, 7)
    page.locator('form[data-form="jp-heavy-love"] button[type="submit"]').click()
    settle(page, 700)
    R = '#jp-result'
    check(page.locator(R).count() == 1, '重め恋愛の結果が出る')
    check(page.locator(f'{R} .jp-love-head').count() == 1, '動物タイプの見出し')
    name = page.locator(f'{R} .jp-love-head__name').inner_text()
    check(name.startswith('「') and name.endswith('」') and len(name) > 3, f'12動物タイプ名 {name}')
    check(page.locator(f'{R} .jp-love-art').count() == 2, '表と裏の動物イラスト2枚')
    arts = page.locator(f'{R} .jp-love-art img')
    check(arts.count() == 2 and all(arts.nth(i).get_attribute('src') for i in range(2)), 'イラストのsrc')
    weight = page.locator(f'{R} .jp-weight__head b').inner_text()
    check(re.fullmatch(r'\d{1,3}%', weight) and 42 <= int(weight[:-1]) <= 99, f'愛の重さ {weight}')
    level = page.locator(f'{R} .jp-weight__level').inner_text().strip()
    check(level in ['無限重', 'ヘビー級', 'かなり重め', '重め', 'ふつう寄り', '軽やか寄り'], f'重さレベル {level}')
    fill = page.locator(f'{R} .jp-weight__fill').get_attribute('style')
    check('width' in fill, f'重さゲージ {fill}')
    check(page.locator(f'{R} .jp-weight__driver').count() == 1, '重さの正体')
    check(page.locator(f'{R} .jp-gap__row').count() == 2, '表と裏の行')
    gap_badges = page.locator(f'{R} .jp-gap__badge')
    check([gap_badges.nth(i).inner_text().strip() for i in range(2)] == ['表', '裏'], '表・裏バッジ')
    headline = page.locator(f'{R} .jp-headline').inner_text()
    check('表' in headline and '裏' in headline, f'ギャップ一行 {headline}')
    habits = page.locator(f'{R} .jp-manual li').count()
    check(habits >= 2, f'重めの癖 {habits}')
    check(page.locator(f'{R} .jp-match__row').count() == 2, '相性のいい動物2匹')
    check(page.locator(f'{R} .jp-match__watch').count() == 1, '重すぎ注意の動物')
    check(page.locator(f'{R} .jp-box').count() >= 2, 'ここが沼る・重さのトリセツ')
    check(page.locator(f'{R} .jp-person .jp-ming__cell').count() == 3, '三柱3セル')
    check(page.locator(f'{R} [data-action="jp-save-image"]').count() == 1, '画像を保存ボタン')
    check(page.locator(f'{R} [data-action="jp-x-share"]').count() == 1, 'Xでシェアボタン')
    check(page.locator(f'{R} .jp-follow-btn').get_attribute('href') == 'https://x.com/3F_Zanie', '@3F_Zanie フォロー')
    body = page.locator('body').inner_text()
    for bad in ['990', '구슬', '결제']:
        check(bad not in body, f'重め恋愛に「{bad}」が無い')
    shot(page, 'darakbang-jp-heavy-love.png', full=True)
    overflow(page, '重め恋愛の結果')

    stub_window_open(page)
    page.locator(f'{R} [data-action="jp-x-share"]').click()
    settle(page, 250)
    opened = page.evaluate('window.__jpOpened')
    check(bool(opened) and opened.startswith('https://twitter.com/intent/tweet?text='), '重め恋愛の X intent が開く')
    if opened:
        check('%403F_Zanie' in opened, '重め恋愛に @3F_Zanie')
        check('%23%E5%9B%9B%E6%9F%B1%E6%8E%A8%E5%91%BD' in opened, '重め恋愛に #四柱推命')
        check('%23%E9%87%8D%E3%82%81%E6%81%8B%E6%84%9B%E8%A8%BA%E6%96%AD' in opened, '重め恋愛に #重め恋愛診断')
        check('Zanie' in opened and '%E5%8D%A0%E3%81%84' in opened, '重め恋愛に #Zanie占い')
        check('%23%2Fjp%2Fheavy-love' in opened, '重め恋愛の #/jp/heavy-love URL')
        check('%23%E6%8E%A8%E3%81%97%E6%B4%BB' not in opened, '重め恋愛に #推し活 は付けない')
        check('url=' in opened, '重め恋愛の URL パラメータ')

    with page.expect_download(timeout=15000) as dl:
        page.locator(f'{R} [data-action="jp-save-image"]').click()
    path = os.path.join(OUT, TAG + 'heavy-love-card.png')
    dl.value.save_as(path)
    check_png(path, '重め恋愛カード')

    # ⑥ 韓国の無料遊び場は4種のまま
    goto(page, '/play')
    check(page.locator('.play-grid--hub .play-card').count() == 4, '韓国무료놀이터 4種そのまま')
    check(page.locator('.jp-page').count() == 0, '韓国놀이터에 JPスタイルが漏れない')

    ctx.close()


def run_mobile(browser):
    print('=== mobile 390 ===')
    ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2,
                              is_mobile=True, has_touch=True, reduced_motion='reduce', locale='ja-JP',
                              accept_downloads=True)
    page = ctx.new_page()
    page.on('pageerror', lambda e: ERRORS.append(str(e)))

    page.goto(BASE, wait_until='networkidle')
    page.add_style_tag(content=NO_ANIM)
    settle(page)
    jp = page.locator('.jp-link')
    check(jp.count() == 1, 'モバイルでも JPリンク')
    check(jp.is_visible(), 'モバイルで JPリンクが見える')
    overflow(page, 'モバイル韓国ホーム')
    shot(page, 'darakbang-jp-link-mobile.png')

    goto(page, '/jp')
    cards = page.locator('.jp-grid .jp-card')
    check(cards.count() == 3, 'モバイルハブ 3枚')
    boxes = [cards.nth(i).bounding_box() for i in range(3)]
    check(boxes[0]['y'] + 10 < boxes[1]['y'] < boxes[2]['y'], 'モバイルは1列（縦に並ぶ）')
    marc = page.locator('.jp-hero .jani-arcade--jp')
    check(marc.count() == 1 and marc.is_visible(), 'モバイルでも右上の遊び場自니')
    check('無料遊び場' in marc.inner_text(), 'モバイルのバッジも「無料遊び場」')
    mhero = page.locator('.jp-hero').bounding_box()
    mbox = marc.bounding_box()
    check(mbox['x'] > mhero['x'] + mhero['width'] * 0.55 and mbox['y'] < mhero['y'] + mhero['height'] * 0.4,
          f'モバイルでもヒーロー右上 ({mbox["x"]:.0f},{mbox["y"]:.0f})')
    check(mbox['x'] >= mhero['x'] and mbox['x'] + mbox['width'] <= mhero['x'] + mhero['width'] + 1,
          'モバイルでカードの外にはみ出さない')
    check(hero_text_overlap(page, '.jp-hero .jani-arcade--jp') == [],
          f'モバイルで見出しと重ならない {hero_text_overlap(page, ".jp-hero .jani-arcade--jp")}')
    overflow(page, 'モバイルJPハブ')
    shot(page, 'darakbang-jp-hub-mobile.png', full=True)

    goto(page, '/jp/chemistry')
    fill_date(page, 'me', 1992, 10, 15)
    page.fill('input[name="oshiName"]', 'テスト推し')
    fill_date(page, 'oshi', 1988, 10, 1)
    page.locator('form[data-form="jp-chemistry"] button[type="submit"]').click()
    settle(page, 600)
    check(page.locator('#jp-result').count() == 1, 'モバイル相性診断の結果')
    overflow(page, 'モバイル相性診断')
    shot(page, 'darakbang-jp-chemistry-mobile.png', full=True)

    goto(page, '/jp/otaku')
    fill_date(page, 'me', 1991, 5, 7)
    page.locator('[data-playseg="q1"] button[data-value="T"]').click()
    page.locator('[data-playseg="q2"] button[data-value="K"]').click()
    page.locator('[data-playseg="q3"] button[data-value="F"]').click()
    page.locator('form[data-form="jp-otaku"] button[type="submit"]').click()
    settle(page, 600)
    check(page.locator('#jp-result').count() == 1, 'モバイル推し活タイプの結果')
    overflow(page, 'モバイル推し活タイプ')
    shot(page, 'darakbang-jp-otaku-mobile.png', full=True)

    goto(page, '/jp/heavy-love')
    fill_date(page, 'me', 2000, 1, 1)
    page.locator('form[data-form="jp-heavy-love"] button[type="submit"]').click()
    settle(page, 700)
    check(page.locator('#jp-result').count() == 1, 'モバイル重め恋愛の結果')
    check(page.locator('#jp-result .jp-love-art img').count() == 2, 'モバイルでも表と裏のイラスト')
    overflow(page, 'モバイル重め恋愛')
    shot(page, 'darakbang-jp-heavy-love-mobile.png', full=True)

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
    check(not real_errors, f'コンソールエラーなし {real_errors[:3]}')
    print('\nFAILS:', json.dumps(FAILS, ensure_ascii=False, indent=1) if FAILS else 'none')
    sys.exit(1 if FAILS else 0)


if __name__ == '__main__':
    main()
