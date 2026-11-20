# -*- coding: utf-8 -*-
"""무료 원국 화면 개편 검수 (v10).

확인 항목
  · #/input — 저장된 기록이 없을 때 기본값 = 대한민국 현재 시각(Asia/Seoul), A 영역 새 문구
  · 결과 상단 — 알약 바만 남고 요약 히어로(일간·붉은 소 / 다시 입력·기록 지우기·평생 종합) 삭제
  · '내 여덟 글자' 헤더 — 일주 동물 강조 · '양띠 × … · 유시' · 오행 온도 요약(바로 아랫줄)
    · 자니 원형 배지(두둥실 모션) + 띠 키워드가 배지 안쪽 하단에 잘리지 않고 들어감
  · '다락방 자니가 읽어주는 오늘의 운세' 카드 삭제
  · 메타 박스 4개 + 크림색 띠 카드 삭제, 4주 카드 다음이 곧바로 '오행 온도'
  · 콘솔 에러 0 · 390·1280 가로 스크롤 0

사용
  python3 scripts/check-free-v10.py            # dist 로컬
  SITE=1 python3 scripts/check-free-v10.py     # 라이브
"""
import http.server
import json
import os
import re
import socketserver
import threading
from datetime import datetime, timezone, timedelta

from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DIST = os.path.join(ROOT, 'dist')
OUT = os.path.abspath(os.path.join(ROOT, '..', 'downloads'))
PORT = 4207
CHROME = '/workspace/.cache/ms-playwright/chrome-linux64/chrome'
LIBS = '/workspace/.cache/sysroot/usr/lib/x86_64-linux-gnu'
BASE_PATH = '/darakbang-saju-web'
LIVE = os.environ.get('SITE', '').strip()
TAG_PREFIX = 'live-v10-' if LIVE else 'v10-'
LIVE_URL = 'https://sisterjisoo5-create.github.io/darakbang-saju-web/'

os.makedirs(OUT, exist_ok=True)
FAILS = []

ME = {
    'calendar': 'solar', 'year': 1991, 'month': 5, 'day': 7,
    'hour': 18, 'minute': 22, 'timeUnknown': False, 'gender': 'female', 'leap': False,
}

A_TITLE = '결제 없이 먼저 확인하세요.'
A_BODY = '나의 원국•오행온도•4가지의 맛보기 카드가 무료로 열립니다. 전체풀이는 990원(1구슬), 평생 종합 리포트는 10구슬 입니다.'


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


def kst_now():
    return datetime.now(timezone(timedelta(hours=9)))


def settle(page, ms=650):
    page.wait_for_timeout(ms)
    page.wait_for_function("document.fonts.status === 'loaded'")


def watch_console(page, bag):
    page.on('console', lambda m: bag.append(m.text) if m.type == 'error' else None)
    page.on('pageerror', lambda e: bag.append(str(e)))


def main():
    httpd = serve()
    base = LIVE_URL if LIVE else f'http://127.0.0.1:{PORT}{BASE_PATH}/'
    print(f'검수 대상: {base}')
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=CHROME,
            env={**os.environ, 'LD_LIBRARY_PATH': LIBS},
        )

        # ── A. 입력 화면 — 기본값 = 대한민국 현재 시각, 새 문구 ──────────────
        for w, h, tag in [(390, 844, 'm'), (1280, 900, 'd')]:
            ctx = browser.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2)
            page = ctx.new_page()
            errs = []
            watch_console(page, errs)
            page.goto(base + '#/input', wait_until='networkidle')
            settle(page)
            got = page.evaluate("""() => {
              const v = (n) => { const el = document.querySelector(`form[data-form="birth"] input[name="${n}"]`);
                                 return el ? el.value : null; };
              const lead = document.querySelector('.input-page__lead');
              return {
                year: v('year'), month: v('month'), day: v('day'), hour: v('hour'), minute: v('minute'),
                h1: document.querySelector('.input-page__copy h1')?.textContent.trim(),
                lead: lead?.textContent.trim(),
                oldTitle: document.body.textContent.includes('생년월일시만 알려주세요'),
                oldBody: document.body.textContent.includes('생년월일시만 넣으면'),
                scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth,
              };
            }""")
            now = kst_now()
            print(f'  [입력 {w}px] 기본값 {got["year"]}-{got["month"]}-{got["day"]} {got["hour"]}:{got["minute"]}'
                  f' / 지금(KST) {now:%Y-%m-%d %H:%M}')
            check(int(got['year']) == now.year, f'[{w}] 기본 연도 = 대한민국 올해 ({got["year"]})')
            check(int(got['month']) == now.month, f'[{w}] 기본 월 ({got["month"]})')
            check(int(got['day']) == now.day, f'[{w}] 기본 일 ({got["day"]})')
            dh = (int(got['hour']) * 60 + int(got['minute'])) - (now.hour * 60 + now.minute)
            check(abs(dh) <= 3, f'[{w}] 기본 시·분 = 지금 KST 시각 ({got["hour"]}:{got["minute"]}, 차이 {dh}분)')
            check(got['h1'] == A_TITLE, f'[{w}] A 제목 「{A_TITLE}」')
            check(got['lead'] == A_BODY, f'[{w}] A 본문 문구 일치')
            check(not got['oldTitle'] and not got['oldBody'], f'[{w}] 기존 제목·중복 문단 제거')
            check(got['scrollW'] <= got['clientW'] + 1, f'[{w}] 가로 스크롤 없음')
            check(not errs, f'[{w}] 콘솔 에러 0건 {errs[:2]}')
            page.screenshot(path=os.path.join(OUT, f'{TAG_PREFIX}input-{w}.png'))
            ctx.close()

        # ── B. 무료 원국 결과 화면 ───────────────────────────────────────────
        for w, h, tag in [(390, 844, 'm'), (1280, 900, 'd')]:
            ctx = browser.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2)
            page = ctx.new_page()
            errs = []
            watch_console(page, errs)
            page.goto(base + '#/input', wait_until='networkidle')
            page.evaluate("""(me) => localStorage.setItem('darakbang.v2', JSON.stringify({profile: me, orders: [], unlocks: {}}))""", ME)
            page.goto(base + '#/free', wait_until='networkidle')
            # 해시만 바뀌면 문서가 다시 읽히지 않으니, 저장 후 새로고침으로 앱 상태를 다시 만든다
            page.reload(wait_until='networkidle')
            settle(page, 900)

            info = page.evaluate("""() => {
              const R = (el) => el ? el.getBoundingClientRect() : null;
              const head = document.querySelector('.result-topbar');
              const firstSheet = document.querySelector('.result-page .sheet');
              const ming = document.querySelector('.ming');
              const disc = document.querySelector('.jani-badge__disc');
              const kw = document.querySelector('.jani-badge__keyword');
              const img = document.querySelector('.jani-badge__img');
              const ilju = document.querySelector('.myeong-head__ilju');
              const line = document.querySelector('.myeong-head__line');
              const temp = document.querySelector('.myeong-head__temp');
              const t = document.body.innerText;
              const d = document.documentElement;
              return {
                topbar: !!head,
                topbarText: head ? head.innerText.replace(/\\s+/g, ' ').trim() : '',
                oldHero: !!document.querySelector('.result-head'),
                headButtons: [...document.querySelectorAll('.result-topbar [data-action], .result-topbar .btn')].length,
                oldH1: t.includes('정일간'),
                todayCard: !!document.querySelector('.today-card'),
                todayText: t.includes('다락방 자니가 읽어주는 오늘의 운세'),
                kvGrid: firstSheet ? firstSheet.querySelectorAll('.kv-grid').length : -1,
                guideCard: !!document.querySelector('.guide-card'),
                metaLabels: ['태어난 달의 절기', '진태양시 보정'].filter((s) => t.includes(s)),
                stampOld: !!document.querySelector('.sheet__head--myeong .sheet__stamp'),
                afterMing: ming && ming.nextElementSibling ? ming.nextElementSibling.tagName + ':' + ming.nextElementSibling.textContent.trim() : null,
                titles: [...document.querySelectorAll('.result-page .sheet__title')].map((e) => e.textContent.trim()),
                ilju: ilju ? ilju.textContent.replace(/\\s+/g, ' ').trim() : null,
                iljuRect: ilju ? { x: +R(ilju).x.toFixed(1), y: +R(ilju).y.toFixed(1), w: +R(ilju).width.toFixed(1), h: +R(ilju).height.toFixed(1) } : null,
                line: line ? line.textContent.trim() : null,
                temp: temp ? temp.textContent.replace(/\\s+/g, ' ').trim() : null,
                lineRect: line ? { top: +R(line).top.toFixed(1), bottom: +R(line).bottom.toFixed(1) } : null,
                tempRect: temp ? { top: +R(temp).top.toFixed(1), bottom: +R(temp).bottom.toFixed(1) } : null,
                disc: disc ? { w: +R(disc).width.toFixed(1), h: +R(disc).height.toFixed(1), top: +R(disc).top.toFixed(1),
                               anim: getComputedStyle(disc).animationName, dur: getComputedStyle(disc).animationDuration } : null,
                kw: kw ? { text: kw.textContent.trim(), x: +R(kw).x.toFixed(1), y: +R(kw).y.toFixed(1),
                           w: +R(kw).width.toFixed(1), h: +R(kw).height.toFixed(1),
                           font: getComputedStyle(kw).fontSize, clipW: kw.scrollWidth - kw.clientWidth,
                           clipH: kw.scrollHeight - kw.clientHeight,
                           lines: Math.round(R(kw).height / parseFloat(getComputedStyle(kw).lineHeight)) } : null,
                discRect: disc ? { x: +R(disc).x.toFixed(1), y: +R(disc).y.toFixed(1),
                                   r: +R(disc).right.toFixed(1), b: +R(disc).bottom.toFixed(1) } : null,
                imgRect: img ? { y: +R(img).top.toFixed(1), b: +R(img).bottom.toFixed(1) } : null,
                scrollW: d.scrollWidth, clientW: d.clientWidth,
                again: (() => { const a = document.querySelector('.result-foot__again a'); return a ? a.getAttribute('href') : null; })(),
                clearAll: [...document.querySelectorAll('.result-page [data-action="clear-all"], .site-footer [data-action="clear-all"]')].length,
                lifetimeCta: [...document.querySelectorAll('.result-page a[href="#/product/lifetime"]')].length,
                headerAgain: !!document.querySelector('.site-header a[href="#/free"]'),
              };
            }""")

            print(f'\n  [결과 {w}px] 상단 알약: {info["topbarText"]}')
            check(info['topbar'] and '무료 맛보기' in info['topbarText'] and '양력' in info['topbarText'],
                  f'[{w}] 상단 알약 바 유지 (무료 맛보기 · 양력 …)')
            check(not info['oldHero'], f'[{w}] 요약 히어로 박스 삭제 (.result-head 없음)')
            check(not info['oldH1'], f'[{w}] 헤더의 "정일간 · 붉은 소" 삭제')
            check(info['headButtons'] == 0, f'[{w}] 상단 다시 입력/기록 지우기/평생 종합 버튼 삭제')
            check(not info['stampOld'], f'[{w}] "3층 다락방" 원형 스탬프 교체')
            check(info['titles'] and info['titles'].count('내 여덟 글자') == 1, f'[{w}] 내 여덟 글자 제목 유지')
            check(info['ilju'] and '붉은 소' in info['ilju'], f'[{w}] 일주 동물 강조 배지 ({info["ilju"]})')
            check(info['line'] and '양띠 × 붉은 소' in info['line'] and '유시' in info['line'],
                  f'[{w}] "양띠 × 붉은 소 · 유시" 줄 유지 ({info["line"]})')
            check(info['temp'] and '따뜻' in info['temp'] and '25.6' in info['temp'], f'[{w}] 오행 온도 요약 ({info["temp"]})')
            check(info['lineRect'] and info['tempRect'] and info['tempRect']['top'] >= info['lineRect']['bottom'] - 0.5,
                  f'[{w}] 온도 요약이 "양띠 × …" 바로 아랫줄 (line bottom {info["lineRect"]} → temp top {info["tempRect"]})')
            check(not info['todayCard'] and not info['todayText'], f'[{w}] "다락방 자니가 읽어주는 오늘의 운세" 카드 삭제')
            check(info['kvGrid'] == 0, f'[{w}] 첫 시트의 메타 박스(kv-grid) 삭제')
            check(not info['guideCard'] and not info['metaLabels'], f'[{w}] 크림색 띠 카드·절기/진태양시 메타 삭제')
            check(info['afterMing'] and info['afterMing'].startswith('H3:오행 온도'),
                  f'[{w}] 4주 카드 다음 곧바로 오행 온도 ({info["afterMing"]})')

            d = info['disc']; kwr = info['kw']
            check(d and d['anim'] == 'float', f'[{w}] 자니 배지 float 애니메이션 ({d and d["anim"]} {d and d["dur"]})')
            check(kwr and '감정을 짚어 주는 공감' in kwr['text'], f'[{w}] 띠 키워드 표시 ({kwr and kwr["text"]})')
            inside = (kwr and info['discRect'] and kwr['x'] >= info['discRect']['x'] - 0.5
                      and kwr['x'] + kwr['w'] <= info['discRect']['r'] + 0.5
                      and kwr['y'] + kwr['h'] <= info['discRect']['b'] + 0.5)
            check(bool(inside), f'[{w}] 키워드가 원 안쪽 하단에 들어감 '
                                f'(kw {kwr and kwr["x"]},{kwr and kwr["y"]},{kwr and kwr["w"]}×{kwr and kwr["h"]} / disc {info["discRect"]})')
            check(kwr and kwr['clipW'] <= 0 and kwr['clipH'] <= 0, f'[{w}] 키워드 잘림 없음 (clip {kwr and (kwr["clipW"], kwr["clipH"])})')
            check(kwr and float(kwr['font'].replace('px', '')) >= 9, f'[{w}] 키워드 글자 크기 {kwr and kwr["font"]} (≥9px)')
            check(kwr and kwr['lines'] <= 3, f'[{w}] 키워드 줄 수 {kwr and kwr["lines"]} (≤3)')
            check(info['imgRect'] and kwr and info['imgRect']['b'] <= kwr['y'] + 0.5,
                  f'[{w}] 자니 그림과 키워드 겹치지 않음 (img bottom {info["imgRect"] and info["imgRect"]["b"]} / kw top {kwr and kwr["y"]})')
            check(info['scrollW'] <= info['clientW'] + 1, f'[{w}] 가로 스크롤 없음')
            check(info['again'] == '#/input', f'[{w}] 하단 ‘생년월일시 다시 입력’ 경로 유지 ({info["again"]})')
            check(info['clearAll'] >= 1, f'[{w}] ‘기록 지우기’ 경로 유지 ({info["clearAll"]}곳)')
            check(info['lifetimeCta'] >= 1, f'[{w}] ‘평생 종합’ 경로 유지 ({info["lifetimeCta"]}곳)')
            check(info['headerAgain'], f'[{w}] 헤더 ‘내 사주 다시 보기’ 유지')
            check(not errs, f'[{w}] 콘솔 에러 0건 {errs[:2]}')

            # 12띠 키워드 모두 배지 안에서 잘리지 않고 자니를 가리지 않는지
            all_lines = re.findall(r"line: '([^']+)'", open(os.path.join(ROOT, 'src/config/zodiac.js'), encoding='utf-8').read())
            fits = page.evaluate("""(texts) => {
              const kw = document.querySelector('.jani-badge__keyword');
              const disc = document.querySelector('.jani-badge__disc');
              const img = document.querySelector('.jani-badge__img');
              const keep = kw.textContent;
              const out = [];
              for (const t of texts) {
                kw.textContent = t;
                const k = kw.getBoundingClientRect(), d = disc.getBoundingClientRect(), i = img.getBoundingClientRect();
                out.push({ text: t,
                  lines: Math.round(k.height / parseFloat(getComputedStyle(kw).lineHeight)),
                  clip: kw.scrollWidth - kw.clientWidth,
                  corners: [[k.left, k.top], [k.right, k.top], [k.left, k.bottom], [k.right, k.bottom]].map(([x, y]) =>
                    +Math.hypot(x - (d.left + d.width / 2), y - (d.top + d.height / 2)).toFixed(1)),
                  r: +(d.width / 2).toFixed(1),
                  overImg: k.top < i.bottom - 0.5,
                  h: +k.height.toFixed(1) });
              }
              kw.textContent = keep;
              return out;
            }""", all_lines)
            bad = [f for f in fits if f['clip'] > 0 or max(f['corners']) > f['r'] or f['overImg']]
            print(f'  [12띠 키워드 {w}px] ' + ', '.join(f"{f['text']}={f['lines']}줄(모서리 {max(f['corners'])}/{f['r']})" for f in fits))
            check(len(all_lines) == 12 and not bad, f'[{w}] 12띠 키워드 모두 원 안쪽·자니 비겹침 [{[(f["text"], max(f["corners"]), f["r"], f["overImg"]) for f in bad]}]')

            # 두둥실 모션 — 시간차를 두고 배지 위치가 실제로 달라지는지
            if not info['disc']:
                ctx.close()
                continue
            p1 = page.evaluate("() => document.querySelector('.jani-badge__disc').getBoundingClientRect().top")
            page.wait_for_timeout(1300)
            p2 = page.evaluate("() => document.querySelector('.jani-badge__disc').getBoundingClientRect().top")
            p3 = page.evaluate("() => document.querySelector('.jani-badge__disc').getBoundingClientRect().top")
            page.wait_for_timeout(900)
            p4 = page.evaluate("() => document.querySelector('.jani-badge__disc').getBoundingClientRect().top")
            moved = max(abs(p2 - p1), abs(p4 - p3))
            check(moved > 1.0, f'[{w}] 배지가 실제로 위아래로 움직임 (Δ{p1:.1f}→{p2:.1f}, {p3:.1f}→{p4:.1f})')

            # 오늘의 운세 카드가 있던 자리에 자미두수 시트가 바로 이어지는지 · 배지 스크린샷
            page.screenshot(path=os.path.join(OUT, f'{TAG_PREFIX}free-{w}.png'), full_page=True)
            el = page.query_selector('.jani-badge')
            if el:
                el.screenshot(path=os.path.join(OUT, f'{TAG_PREFIX}badge-{w}.png'))
            el = page.query_selector('.sheet__head--myeong')
            if el:
                el.screenshot(path=os.path.join(OUT, f'{TAG_PREFIX}head-{w}.png'))
            ctx.close()

        # ── C. 저장된 기록이 있으면 그 값을 그대로 (현재 시각으로 덮어쓰지 않음) ──
        ctx = browser.new_context(viewport={'width': 390, 'height': 844})
        page = ctx.new_page()
        errs = []
        watch_console(page, errs)
        page.goto(base + '#/input', wait_until='networkidle')
        page.evaluate("""(me) => localStorage.setItem('darakbang.v2', JSON.stringify({profile: me}))""", ME)
        page.reload(wait_until='networkidle')
        settle(page)
        saved = page.evaluate("""() => {
          const v = (n) => document.querySelector(`form[data-form="birth"] input[name="${n}"]`).value;
          return [v('year'), v('month'), v('day'), v('hour'), v('minute')].join('-');
        }""")
        check(saved == '1991-05-07-18-22', f'[저장값] 저장된 생년월일시 유지 ({saved})')
        check(not errs, f'[저장값] 콘솔 에러 0건 {errs[:2]}')
        ctx.close()

        browser.close()


main()
print()
if FAILS:
    print(f'FAILED {len(FAILS)}건')
    for f in FAILS:
        print('  - ' + f)
else:
    print('ALL PASS')
