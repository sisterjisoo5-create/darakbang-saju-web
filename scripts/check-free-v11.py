# -*- coding: utf-8 -*-
"""무료 원국 화면 개편 검수 (v11).

확인 항목
  · #/input — 저장된 기록이 없을 때 기본값 = 대한민국 현재 시각(Asia/Seoul), A 영역 새 문구
    · 상단 칩 1개 「가입·결제 없이 30초」(노란 점 유지) · ‘결제 없이 원국 8글자’ 없음
    · 설명 문구는 ‘열립니다.’ 뒤에서 두 줄로 끊김 (390·1280 모두 2줄)
    · 폼 하단 ‘가입 없음 · 결제 없음 · 30초’ 없음, ‘입력값은 이 브라우저에만 저장됩니다’ 한 줄만
    · 하단 ‘지금 저장된 원국 — …’ / ‘저장된 원국 결과 보기’ 바 없음
  · 결과 상단 — 알약 바만 남고 요약 히어로(일간·붉은 소 / 다시 입력·기록 지우기·평생 종합) 삭제
  · 'MYEONG · 원국' 헤더 — 왼쪽 텍스트 묶음(내 여덟 글자·일주 배지·띠×일주·오행 온도) 전부 삭제,
    키커는 가운데 정렬로 유지
  · 크림색 원형 배지 — 4주 카드 위 가운데, 안에는 일주(일지) 동물 일러스트만 (글자 0)
    · 두둥실(float) 모션 유지
    · 테두리 = 일간(천간) 오행 색 (3.5px + 글로우) — 목·화·토·금·수 다섯 색을 실제 생년월일로 확인
  · 배지 바깥 바로 아래 — `띠 × 일주동물`(예: 양띠 × 붉은 소) 금빛 한 줄,
    그 아래 일주 특징 한 줄 (동물 이름·'띠'·콜론 없음)
  · 12동물 중 5종(쥐·소·용·말·돼지)을 실제 생년월일로 바꿔 배지 그림·문구가 따라 바뀌는지
  · '다락방 자니가 읽어주는 오늘의 운세' 카드 삭제
  · 메타 박스 4개 + 크림색 띠 카드 삭제, 4주 카드 다음이 곧바로 '오행 온도'
  · 오행 온도 — 제목은 「오행 온도」만(온도 숫자 없음) + 바로 아래 짧은 설명 한 줄(2안),
    게이지 아래 긴 설명 박스·막대 아래 부족한/강한 기운 박스 삭제, 오른쪽 수치 25.6°C는 유지(한 곳)
  · 12띠 × 일주 동물 — 새 멘트, 「맛보기 더 보기」 삭제, 「1구슬(990원)으로 전체 열기 →」 하나만
    (클릭하면 12띠 상품 결제 모달이 열리고 닫힌다)
  · 콘솔 에러 0 · 390·1280 가로 스크롤 0

사용
  python3 scripts/check-free-v11.py            # dist 로컬
  SITE=1 python3 scripts/check-free-v11.py     # 라이브
"""
import http.server
import os
import re
import socketserver
import threading
from datetime import datetime, timezone, timedelta

from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DIST = os.path.join(ROOT, 'dist')
OUT = os.path.abspath(os.path.join(ROOT, '..', 'downloads'))
PORT = 4208
CHROME = '/workspace/.cache/ms-playwright/chrome-linux64/chrome'
LIBS = '/workspace/.cache/sysroot/usr/lib/x86_64-linux-gnu'
BASE_PATH = '/darakbang-saju-web'
LIVE = os.environ.get('SITE', '').strip()
TAG_PREFIX = 'live-v11-' if LIVE else 'v11-'
LIVE_URL = 'https://sisterjisoo5-create.github.io/darakbang-saju-web/'

os.makedirs(OUT, exist_ok=True)
FAILS = []

ME = {
    'calendar': 'solar', 'year': 1991, 'month': 5, 'day': 7,
    'hour': 18, 'minute': 22, 'timeUnknown': False, 'gender': 'female', 'leap': False,
}
# 1991-05-07 18:22 여 — 신미년 · 계사월 · 정축일 · 기유시 → 일주 동물 '소'
ME_DAY_ANIMAL = '소'
ME_DAY_OHAENG = '화'
ME_DII = '양'
ME_ILJU_ANIMAL = '붉은 소'
ME_DII_LINE = f'{ME_DII}띠 × {ME_ILJU_ANIMAL}'
ME_ILJU_LINE = '묵묵히 쌓아 올리는 신뢰'
# 오행 온도 — 제목 아래 짧은 설명(2안) · 12띠 × 일주 동물 카드 새 멘트
TEMP_SUB = '내 사주의 따뜻한 기운(불·나무)과 서늘한 기운(물·쇠) 비율로 본 타고난 온도'
ZI_HOOK = '이성에게 보이는 나의 반전 모습은? 어필 포인트 3가지, 연애 할 때 내가 조심해야 할 포인트까지'
ZI_CTA = '1구슬(990원)으로 전체 열기 →'
GOLD_RGB = 'rgb(230, 195, 120)'

# 일간 오행별 테두리 색 (components.css 의 .jani-badge__disc[data-ohaeng=…]) · 확인용 생년월일
OHAENG_RING = {
    '목': ('rgb(77, 166, 255)', [1990, 1, 9]),   # 갑술일
    '화': ('rgb(240, 100, 90)', [1990, 1, 1]),   # 병인일
    '토': ('rgb(242, 184, 75)', [1990, 1, 3]),   # 무진일
    '금': ('rgb(232, 238, 247)', [1990, 1, 5]),  # 경오일
    '수': ('rgb(110, 133, 168)', [1990, 1, 7]),  # 임신일
}

# 일주(일지)가 바뀌면 배지 그림·문구가 따라 바뀌는지 — 엔진으로 확인한 표본 날짜
SAMPLES = [
    ({'calendar': 'solar', 'year': 2024, 'month': 1, 'day': 1, 'hour': 10, 'minute': 0,
      'timeUnknown': False, 'gender': 'female'}, '자', '쥐', 'jani', '기회를 빠르게 포착하는 영민함'),
    ({'calendar': 'solar', 'year': 2024, 'month': 1, 'day': 2, 'hour': 10, 'minute': 0,
      'timeUnknown': False, 'gender': 'female'}, '축', '소', 'ox', '묵묵히 쌓아 올리는 신뢰'),
    ({'calendar': 'solar', 'year': 2024, 'month': 1, 'day': 5, 'hour': 10, 'minute': 0,
      'timeUnknown': False, 'gender': 'female'}, '진', '용', 'dragon', '판을 흔드는 스케일과 카리스마'),
    ({'calendar': 'solar', 'year': 2024, 'month': 1, 'day': 7, 'hour': 10, 'minute': 0,
      'timeUnknown': False, 'gender': 'female'}, '오', '말', 'horse', '망설임 없이 앞을 향해 내딛는 자유로움'),
    ({'calendar': 'solar', 'year': 2024, 'month': 1, 'day': 12, 'hour': 10, 'minute': 0,
      'timeUnknown': False, 'gender': 'female'}, '해', '돼지', 'pig', '꾸밈없는 진심으로 편안하게 만드는 여유'),
]

A_TITLE = '결제 없이 먼저 확인하세요.'
A_CHIP = '가입·결제 없이 30초'
A_LEAD_1 = '나의 원국•오행온도•4가지의 맛보기 카드가 무료로 열립니다.'
A_LEAD_2 = '전체풀이는 990원(1구슬), 평생 종합 리포트는 10구슬 입니다.'
A_NOTE = '입력값은 이 브라우저에만 저장됩니다'
A_OLD_NOTE = '가입 없음 · 결제 없음 · 30초'


def check(cond, msg):
    print(('  ok   ' if cond else '  FAIL ') + msg)
    if not cond:
        FAILS.append(msg)


def rgb_of(text):
    return [int(n) for n in re.findall(r'\d+', text)[:3]]


def contrast_with(text_rgb, bg=(14, 22, 41)):
    """테두리 색이 어두운 남색 배경 위에서 얼마나 도드라지는지 (WCAG 대비)"""
    def lum(c):
        ch = [(x / 255 / 12.92) if x / 255 <= 0.03928 else (((x / 255) + 0.055) / 1.055) ** 2.4 for x in c]
        return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
    a, b = sorted([lum(rgb_of(text_rgb)), lum(bg)])
    return (b + 0.05) / (a + 0.05)


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


def open_free(page, base, profile):
    page.goto(base + '#/input', wait_until='networkidle')
    page.evaluate(
        """(me) => localStorage.setItem('darakbang.v2', JSON.stringify({profile: me, orders: [], unlocks: {}}))""",
        profile,
    )
    page.goto(base + '#/free', wait_until='networkidle')
    # 해시만 바뀌면 문서가 다시 읽히지 않으니, 저장 후 새로고침으로 앱 상태를 다시 만든다
    page.reload(wait_until='networkidle')
    settle(page, 900)


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
              const form = document.querySelector('form[data-form="birth"]');
              const note = form ? form.querySelector('.birth-card__note') : null;
              const lcs = lead ? getComputedStyle(lead) : null;
              const boxes = (el) => { if (!el) return null; const r = el.getBoundingClientRect();
                return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
                         r: +r.right.toFixed(1), b: +r.bottom.toFixed(1) }; };
              return {
                year: v('year'), month: v('month'), day: v('day'), hour: v('hour'), minute: v('minute'),
                h1: document.querySelector('.input-page__copy h1')?.textContent.trim(),
                lead: lead?.textContent.replace(/\\s+/g, ' ').trim(),
                leadLines: lead ? lead.innerText.split('\\n').map((s) => s.trim()).filter(Boolean) : null,
                leadBrs: lead ? lead.querySelectorAll('br').length : -1,
                leadLinesVisual: lead ? Math.round(boxes(lead).h / parseFloat(lcs.lineHeight)) : null,
                chips: [...document.querySelectorAll('.input-page__head .hero__eyebrow .chip')].map((c) => ({
                  text: c.innerText.replace(/\\s+/g, ' ').trim(),
                  accent: c.classList.contains('chip--accent'),
                  dot: !!c.querySelector('.dot'),
                })),
                oldChip: document.body.textContent.includes('결제 없이 원국 8글자'),
                noteSpans: note ? [...note.querySelectorAll('span')].map((s) => s.innerText.trim()) : null,
                noteText: note ? note.innerText.replace(/\\s+/g, ' ').trim() : null,
                oldNote: document.body.textContent.includes('가입 없음 · 결제 없음 · 30초'),
                noteBox: boxes(note), formBox: boxes(form), btnBox: boxes(form ? form.querySelector('button[type="submit"]') : null),
                noteClip: note ? note.scrollWidth - note.clientWidth : null,
                oldTitle: document.body.textContent.includes('생년월일시만 알려주세요'),
                oldBody: document.body.textContent.includes('생년월일시만 넣으면'),
                footBar: !!document.querySelector('.input-page__foot'),
                footText: document.body.textContent.includes('지금 저장된 원국')
                          || document.body.textContent.includes('저장된 원국 결과 보기'),
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
            # 상단 칩 1개 — 「가입·결제 없이 30초」, 노란 점 유지
            chips = got['chips'] or []
            check(len(chips) == 1, f'[{w}] 상단 칩 1개 ({len(chips)}개: {[c["text"] for c in chips]})')
            check(bool(chips) and chips[0]['text'] == A_CHIP,
                  f'[{w}] 칩 문구 「{A_CHIP}」 ({chips[0]["text"] if chips else None!r})')
            check(bool(chips) and chips[0]['accent'] and chips[0]['dot'],
                  f'[{w}] 칩 금빛 강조·노란 점 유지 {chips[0] if chips else None}')
            check(not got['oldChip'], f'[{w}] 「결제 없이 원국 8글자」 칩 없음')
            # 설명 문구 — ‘열립니다.’ 뒤에서 두 줄
            check(got['leadLines'] == [A_LEAD_1, A_LEAD_2],
                  f'[{w}] 설명 두 줄 = {got["leadLines"]}')
            check(got['leadLinesVisual'] == 2,
                  f'[{w}] 설명이 실제로 2줄 (줄 수 {got["leadLinesVisual"]})')
            # 폼 하단 — ‘가입 없음 · 결제 없음 · 30초’ 삭제, 안내 한 줄만
            check(got['noteSpans'] == [A_NOTE], f'[{w}] 폼 하단 안내 한 줄 = {got["noteSpans"]}')
            check(not got['oldNote'], f'[{w}] 「{A_OLD_NOTE}」 문구 없음')
            nb, fb, bb = got['noteBox'], got['formBox'], got['btnBox']
            check(nb and bb and nb['y'] >= bb['b'] - 1, f'[{w}] 안내가 버튼 아래 (버튼 하단 {bb and bb["b"]} → 안내 상단 {nb and nb["y"]})')
            check(nb and fb and 10 <= nb['x'] - fb['x'] <= 26 and fb['r'] - nb['r'] >= 10,
                  f'[{w}] 안내가 카드 안쪽 여백에 맞춰 왼쪽 정렬 (왼 {nb and round(nb["x"] - fb["x"], 1)}px / 오른 여백 {nb and round(fb["r"] - nb["r"], 1)}px)')
            check(got['noteClip'] is not None and got['noteClip'] <= 0, f'[{w}] 안내 문구 잘림 없음 (clip {got["noteClip"]})')
            check(not got['oldTitle'] and not got['oldBody'], f'[{w}] 기존 제목·중복 문단 제거')
            check(not got['footBar'] and not got['footText'], f'[{w}] 하단 ‘지금 저장된 원국’ 바 없음')
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
            open_free(page, base, ME)

            info = page.evaluate("""() => {
              const R = (el) => el ? el.getBoundingClientRect() : null;
              const B = (el) => el ? { x: +R(el).x.toFixed(1), y: +R(el).y.toFixed(1),
                                       r: +R(el).right.toFixed(1), b: +R(el).bottom.toFixed(1),
                                       w: +R(el).width.toFixed(1), h: +R(el).height.toFixed(1),
                                       cx: +(R(el).left + R(el).width / 2).toFixed(1),
                                       cy: +(R(el).top + R(el).height / 2).toFixed(1) } : null;
              const head = document.querySelector('.result-topbar');
              const sheet = document.querySelector('.result-page .sheet');
              const hd = document.querySelector('.sheet__head--myeong');
              const kicker = document.querySelector('.sheet__head--myeong .sheet__kicker');
              const disc = document.querySelector('.jani-badge__disc');
              const img = document.querySelector('.jani-badge__img');
              const line = document.querySelector('.myeong-ilju-line');
              const dii = document.querySelector('.myeong-dii-line');
              const ming = document.querySelector('.ming');
              const t = document.body.innerText;
              const d = document.documentElement;
              const cs = disc ? getComputedStyle(disc) : null;
              const N = (s) => String(s).split(String.fromCharCode(10)).map((x) => x.trim()).filter(Boolean).join(' ');
              return {
                topbarText: head ? head.innerText.replace(/\\s+/g, ' ').trim() : '',
                topbarButtons: [...document.querySelectorAll('.result-topbar [data-action], .result-topbar .btn')].length,
                oldHero: !!document.querySelector('.result-head'),
                oldH1: t.includes('정일간'),
                todayCard: !!document.querySelector('.today-card'),
                todayText: t.includes('다락방 자니가 읽어주는 오늘의 운세'),
                sheetKv: sheet ? sheet.querySelectorAll('.kv-grid').length : -1,
                guideCard: !!document.querySelector('.guide-card'),
                metaLabels: ['태어난 달의 절기', '진태양시 보정'].filter((s) => t.includes(s)),
                oldBlock: {
                  myeongHead: !!document.querySelector('.myeong-head'),
                  title: !!document.querySelector('.sheet__head--myeong .sheet__title'),
                  iljuBadge: !!document.querySelector('.myeong-head__ilju'),
                  keyword: !!document.querySelector('.jani-badge__keyword'),
                  stamp: !!document.querySelector('.sheet__head--myeong .sheet__stamp'),
                },
                headText: hd ? hd.innerText.replace(/\\s+/g, ' ').trim() : null,
                bodyHasIljuBadge: t.includes('일주 붉은 소'),
                bodyHasMixLine: t.includes('양띠 × 붉은 소'),
                bodyHasMixLineCount: (t.match(/양띠 × 붉은 소/g) || []).length,
                bodyHasTempSum: t.includes('따뜻 25.6°C 사주'),
                bodyHasTitle: t.includes('내 여덟 글자'),
                kickerText: kicker ? kicker.innerText.trim() : null,
                kicker: B(kicker), disc: B(disc), img: B(img), line: B(line), dii: B(dii),
                diiText: dii ? dii.innerText.trim() : null,
                diiColor: dii ? getComputedStyle(dii).color : null,
                diiFont: dii ? parseFloat(getComputedStyle(dii).fontSize) : null,
                ringOhaeng: disc ? disc.getAttribute('data-ohaeng') : null,
                ringWidth: disc ? parseFloat(getComputedStyle(disc).borderTopWidth) : null,
                ringColor: disc ? getComputedStyle(disc).borderTopColor : null,
                ringShadow: disc ? getComputedStyle(disc).boxShadow : null,
                sheet: B(sheet), ming: B(ming),
                discAnim: cs ? cs.animationName : null,
                discDur: cs ? cs.animationDuration : null,
                discText: disc ? disc.innerText.replace(/\\s+/g, '') : null,
                discImgs: disc ? disc.querySelectorAll('img').length : -1,
                imgSrc: img ? img.getAttribute('src') : null,
                imgAlt: img ? img.getAttribute('alt') : null,
                imgComplete: img ? img.complete && img.naturalWidth > 0 : false,
                lineText: line ? line.innerText.trim() : null,
                lineFont: line ? getComputedStyle(line).fontSize : null,
                lineLines: line ? Math.round(R(line).height / parseFloat(getComputedStyle(line).lineHeight)) : null,
                lineClip: line ? line.scrollWidth - line.clientWidth : null,
                afterMing: ming && ming.nextElementSibling ? ming.nextElementSibling.tagName + ':' + ming.nextElementSibling.textContent.trim() : null,
                h3s: [...document.querySelectorAll('.result-page .sheet h3')].map((h) => N(h.textContent)),
                tempH3: (() => { const h = [...document.querySelectorAll('.result-page .sheet h3')].find((x) => x.textContent.includes('오행 온도')); return h ? N(h.textContent) : null; })(),
                tempH3Box: B([...document.querySelectorAll('.result-page .sheet h3')].find((x) => x.textContent.includes('오행 온도'))),
                tempSub: (() => { const el = document.querySelector('.temp-sub'); return el ? N(el.innerText) : null; })(),
                tempSubBox: B(document.querySelector('.temp-sub')),
                tempScaleBox: B(document.querySelector('.temp-scale')),
                tempBarsBox: B(document.querySelector('.bars')),
                tempNote: !!document.querySelector('.temp-note'),
                tempNoteText: ['이 온도는', '부족한 오행을 알려주는 숫자가', '6°C~38°C 기질 온도', '이 기운이 비어 있는 사주예요', '가장 강한 기운은', '균형이 좋은 대신'].filter((s) => t.includes(s)),
                tempNum: (() => { const el = document.querySelector('.temp-scale__num'); return el ? N(el.innerText) : null; })(),
                tempDegreeCount: t.split('25.6°C').length - 1,
                tempSubFont: (() => { const el = document.querySelector('.temp-sub'); return el ? parseFloat(getComputedStyle(el).fontSize) : null; })(),
                tempSubClip: (() => { const el = document.querySelector('.temp-sub'); return el ? el.scrollWidth - el.clientWidth : null; })(),
                ziSection: (() => { const h = [...document.querySelectorAll('.result-page .sheet h3')].find((x) => x.textContent.includes('12띠')); return h ? N(h.textContent) : null; })(),
                ziHook: (() => { const el = document.querySelector('.zi-teaser__hook'); return el ? N(el.innerText) : null; })(),
                ziHookClip: (() => { const el = document.querySelector('.zi-teaser__hook'); return el ? el.scrollWidth - el.clientWidth : null; })(),
                ziGhost: t.includes('맛보기 더 보기'),
                ziCtaKids: [...document.querySelectorAll('.zi-teaser__cta > *')].map((el) => N(el.textContent)),
                ziCtaPayPid: (() => { const el = document.querySelector('.zi-teaser__cta [data-action="open-pay"]'); return el ? el.getAttribute('data-pid') : null; })(),
                ziNote: (() => { const el = document.querySelector('.zi-teaser__note'); return el ? N(el.innerText) : null; })(),
                scrollW: d.scrollWidth, clientW: d.clientWidth,
                again: (() => { const a = document.querySelector('.result-foot__again a'); return a ? a.getAttribute('href') : null; })(),
                clearAll: [...document.querySelectorAll('.result-page [data-action="clear-all"], .site-footer [data-action="clear-all"]')].length,
                lifetimeCta: [...document.querySelectorAll('.result-page a[href="#/product/lifetime"]')].length,
                headerAgain: !!document.querySelector('.site-header a[href="#/free"]'),
              };
            }""")

            print(f'\n  [결과 {w}px] 상단 알약: {info["topbarText"]}')
            print(f'  [결과 {w}px] 헤더 문구: {info["headText"]!r}')
            check('무료 맛보기' in info['topbarText'] and '양력' in info['topbarText'],
                  f'[{w}] 상단 알약 바 유지 (무료 맛보기 · 양력 …)')
            check(not info['oldHero'], f'[{w}] 요약 히어로 박스 삭제 (.result-head 없음)')
            check(not info['oldH1'], f'[{w}] 헤더의 "정일간 · 붉은 소" 삭제')
            check(info['topbarButtons'] == 0, f'[{w}] 상단 다시 입력/기록 지우기/평생 종합 버튼 삭제')

            # 1. 보라색 박스(왼쪽 텍스트 묶음) 전체 삭제
            ob = info['oldBlock']
            check(not ob['myeongHead'] and not ob['title'] and not ob['iljuBadge'],
                  f'[{w}] 왼쪽 텍스트 묶음 삭제 (.myeong-head·내 여덟 글자·일주 배지) {ob}')
            check(not info['bodyHasTitle'], f'[{w}] "내 여덟 글자" 제목 삭제')
            check(not info['bodyHasIljuBadge'] and not info['bodyHasTempSum'],
                  f'[{w}] "일주 붉은 소"·"따뜻 25.6°C 사주" 삭제')
            check(info['bodyHasMixLine'] and info['bodyHasMixLineCount'] == 1,
                  f'[{w}] "{ME_DII_LINE}" 한 줄 노출 ({info["bodyHasMixLineCount"]}곳)')
            check(not ob['stamp'], f'[{w}] "3층 다락방" 원형 스탬프 없음')
            check(info['kickerText'] == 'MYEONG · 원국', f'[{w}] 키커 "MYEONG · 원국" 유지 ({info["kickerText"]})')
            check(info['headText'] == f'MYEONG · 원국 {ME_DII_LINE} {ME_ILJU_LINE}',
                  f'[{w}] 헤더 순서 = 키커 → 띠×일주 → 일주 특징 ({info["headText"]!r})')

            # 2. 원형 배지 — 가운데 정렬, 안에는 일주 동물 일러스트만, 테두리는 일간 오행 색
            d, im, ln, kk, sh = info['disc'], info['img'], info['line'], info['kicker'], info['sheet']
            check(bool(d) and bool(sh), f'[{w}] 원형 배지 존재')
            check(d and abs(d['cx'] - sh['cx']) <= 6, f'[{w}] 배지가 카드 가로 가운데 (배지 cx {d and d["cx"]} / 카드 cx {sh and sh["cx"]})')
            check(kk and abs(kk['cx'] - sh['cx']) <= 6, f'[{w}] 키커도 가로 가운데 (키커 cx {kk and kk["cx"]})')
            check(d and 110 <= d['w'] <= 140 and abs(d['w'] - d['h']) <= 0.5, f'[{w}] 배지 원형 크기 {d and (d["w"], d["h"])}')
            check(info['ringOhaeng'] == ME_DAY_OHAENG,
                  f'[{w}] 1991-05-07 정축 일간 → 오행 {ME_DAY_OHAENG} ({info["ringOhaeng"]})')
            ring_rgb = OHAENG_RING[ME_DAY_OHAENG][0]
            check(info['ringColor'] == ring_rgb,
                  f'[{w}] 배지 테두리 = {ME_DAY_OHAENG} 색 {ring_rgb} ({info["ringColor"]})')
            check(info['ringWidth'] and 3.0 <= info['ringWidth'] <= 4.2,
                  f'[{w}] 테두리 굵기 3.5px 내외 ({info["ringWidth"]}px)')
            check(bool(info['ringShadow']) and info['ringShadow'] != 'none',
                  f'[{w}] 테두리 글로우(box-shadow) 있음 ({info["ringShadow"][:60]})')
            check(info['discAnim'] == 'float', f'[{w}] 두둥실(float) 모션 유지 ({info["discAnim"]} {info["discDur"]})')
            check(info['discText'] == '', f'[{w}] 동그라미 안에 글자 0 (innerText {info["discText"]!r})')
            check(not ob['keyword'], f'[{w}] 배지 안 띠 키워드 삭제')
            check(info['discImgs'] == 1, f'[{w}] 배지 안 그림 1장 ({info["discImgs"]})')
            check(bool(im) and im['cx'] is not None and abs(im['cx'] - d['cx']) <= 2 and abs(im['cy'] - d['cy']) <= 2,
                  f'[{w}] 일러스트가 원 한가운데 (img {im and (im["cx"], im["cy"])} / disc {d and (d["cx"], d["cy"])})')
            check(im and im['w'] <= d['w'] - 10 and im['x'] >= d['x'] and im['r'] <= d['r'],
                  f'[{w}] 일러스트가 원 안쪽 (img {im and (im["w"], im["h"])} / disc {d and d["w"]})')
            check(info['imgComplete'], f'[{w}] 일러스트 로드 완료 ({info["imgSrc"]})')
            check(bool(info['imgSrc']) and info['imgSrc'].endswith('/ox-cut.webp'),
                  f'[{w}] 1991-05-07 정축 → 소 일러스트 ({info["imgSrc"]})')
            check(info['imgAlt'] and ME_DAY_ANIMAL in info['imgAlt'], f'[{w}] 그림 대체 텍스트에 소 ({info["imgAlt"]})')

            # 3. 배지 바깥 바로 아래 — 띠 × 일주동물 → 일주 특징 한 줄
            di, dt = info['dii'], info['diiText']
            check(dt == ME_DII_LINE, f'[{w}] 띠×일주 문구 「{ME_DII_LINE}」 ({dt!r})')
            check(bool(di) and bool(d), f'[{w}] 띠×일주 줄 존재')
            check(di and d and di['y'] >= d['b'] - 1, f'[{w}] 띠×일주 줄이 배지 바깥 아래 (disc bottom {d and d["b"]} → dii top {di and di["y"]})')
            check(di and ln and di['b'] <= ln['y'] + 0.5, f'[{w}] 띠×일주 줄이 일주 특징 위 (dii bottom {di and di["b"]} → line top {ln and ln["y"]})')
            check(di and d and abs(di['cx'] - d['cx']) <= 4, f'[{w}] 띠×일주 줄이 배지와 같은 가운데 축 (dii cx {di and di["cx"]} / disc cx {d and d["cx"]})')
            check(info['diiColor'] == GOLD_RGB, f'[{w}] 띠×일주 줄은 금빛 {GOLD_RGB} ({info["diiColor"]})')
            check(info['diiFont'] and info['lineFont'] and info['diiFont'] < float(str(info['lineFont']).rstrip('px')),
                  f'[{w}] 띠×일주 줄이 일주 특징보다 작음 ({info["diiFont"]}px < {info["lineFont"]})')
            check(info['lineText'] == ME_ILJU_LINE, f'[{w}] 일주 특징 문구 「{ME_ILJU_LINE}」 ({info["lineText"]!r})')
            check(ln and abs(ln['cx'] - d['cx']) <= 4, f'[{w}] 특징 문구가 배지와 같은 가운데 축 (line cx {ln and ln["cx"]} / disc cx {d and d["cx"]})')
            check(ln and ln['y'] >= d['b'] - 4, f'[{w}] 특징 문구가 배지 바깥 아래 (disc bottom {d and d["b"]} → line top {ln and ln["y"]})')
            check(ln and info['ming'] and ln['b'] <= info['ming']['y'] + 0.5,
                  f'[{w}] 특징 문구가 4주 카드 위 (line bottom {ln and ln["b"]} / ming top {info["ming"] and info["ming"]["y"]})')
            check(info['lineText'] and not any(a in info['lineText'] for a in ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지']),
                  f'[{w}] 특징 문구에 동물 이름 없음 ({info["lineText"]!r})')
            check(info['lineText'] and '띠' not in info['lineText'] and ':' not in info['lineText'] and '：' not in info['lineText'],
                  f'[{w}] 특징 문구에 "띠 :" 같은 머리말 없음')
            check(info['lineLines'] is not None and info['lineLines'] <= 2, f'[{w}] 특징 문구 {info["lineLines"]}줄 (≤2)')
            check(info['lineClip'] is not None and info['lineClip'] <= 0, f'[{w}] 특징 문구 잘림 없음 (clip {info["lineClip"]})')

            # 나머지 화면 구성
            check(not info['todayCard'] and not info['todayText'], f'[{w}] "다락방 자니가 읽어주는 오늘의 운세" 카드 삭제')
            check(info['sheetKv'] == 0, f'[{w}] 첫 시트의 메타 박스(kv-grid) 삭제')
            check(not info['guideCard'] and not info['metaLabels'], f'[{w}] 크림색 띠 카드·절기/진태양시 메타 삭제')
            check(info['afterMing'] == 'H3:오행 온도',
                  f'[{w}] 4주 카드 다음 곧바로 오행 온도, 제목에 온도 수치 없음 ({info["afterMing"]})')

            # 3-1. 오행 온도 — 제목「오행 온도」만 + 짧은 설명 한 줄, 긴 설명·부족한 기운 박스 삭제
            print(f'  [오행 온도 {w}] 제목 {info["tempH3"]!r} / 설명 {info["tempSub"]!r} / 수치 {info["tempNum"]!r}')
            check(info['tempH3'] == '오행 온도', f'[{w}] 제목 = 「오행 온도」 온도 숫자 제거 ({info["tempH3"]!r})')
            check(not re.search(r'\d', info['tempH3'] or ''), f'[{w}] 제목에 숫자 없음 ({info["tempH3"]!r})')
            check(info['tempNum'] and '25.6°C' in info['tempNum'], f'[{w}] 오른쪽 수치 25.6°C 유지 ({info["tempNum"]!r})')
            check(info['tempDegreeCount'] == 1, f'[{w}] 화면에 25.6°C는 한 곳만 ({info["tempDegreeCount"]}곳)')
            check(info['tempSub'] == TEMP_SUB, f'[{w}] 짧은 설명 한 줄 = 「{TEMP_SUB}」 ({info["tempSub"]!r})')
            th, ts, tsc = info['tempH3Box'], info['tempSubBox'], info['tempScaleBox']
            check(bool(ts) and bool(th) and ts['y'] >= th['b'] - 1,
                  f'[{w}] 설명이 제목 바로 아래 (제목 bottom {th and th["b"]} → 설명 top {ts and ts["y"]})')
            check(bool(ts) and bool(tsc) and ts['b'] <= tsc['y'] + 1,
                  f'[{w}] 설명이 온도 게이지 위 (설명 bottom {ts and ts["b"]} → 게이지 top {tsc and tsc["y"]})')
            check(info['tempSubFont'] and info['tempSubFont'] <= 13.5,
                  f'[{w}] 설명 글자 크기 {info["tempSubFont"]}px (제목보다 작은 보조 문구)')
            check(info['tempSubClip'] is not None and info['tempSubClip'] <= 0,
                  f'[{w}] 설명 잘림 없음 (clip {info["tempSubClip"]})')
            check(not info['tempNote'], f'[{w}] 게이지 아래 긴 설명 박스(.temp-note) 삭제')
            check(not info['tempNoteText'], f'[{w}] 긴 설명·부족한 기운 안내 문구 전부 삭제 {info["tempNoteText"]}')

            # 3-2. 12띠 × 일주 동물 — 새 멘트, ‘맛보기 더 보기’ 삭제, 990원 결제 버튼만
            print(f'  [12띠 카드 {w}] 멘트 {info["ziHook"]!r} / 버튼 {info["ziCtaKids"]}')
            check(info['ziSection'] and '12띠' in info['ziSection'], f'[{w}] 「12띠 × 일주 동물」 제목 유지 ({info["ziSection"]!r})')
            check(info['ziHook'] == ZI_HOOK, f'[{w}] 카드 멘트 교체 ({info["ziHook"]!r})')
            check(info['ziHookClip'] is not None and info['ziHookClip'] <= 0,
                  f'[{w}] 카드 멘트 잘림 없음 (clip {info["ziHookClip"]})')
            check(not info['ziGhost'], f'[{w}] 「맛보기 더 보기」 버튼 없음')
            check(info['ziCtaKids'] == [ZI_CTA], f'[{w}] 카드 버튼은 「{ZI_CTA}」 하나만 {info["ziCtaKids"]}')
            check(info['ziCtaPayPid'] == 'zodiac-ilju',
                  f'[{w}] 결제 버튼이 12띠 상품(zodiac-ilju) 결제창을 연다 ({info["ziCtaPayPid"]})')
            check(info['ziNote'] and '결제 후 1초' in info['ziNote'], f'[{w}] 안내 문구 유지 ({info["ziNote"]!r})')

            check(info['scrollW'] <= info['clientW'] + 1, f'[{w}] 가로 스크롤 없음')
            check(info['again'] == '#/input', f'[{w}] 하단 ‘생년월일시 다시 입력’ 경로 유지 ({info["again"]})')
            check(info['clearAll'] >= 1, f'[{w}] ‘기록 지우기’ 경로 유지 ({info["clearAll"]}곳)')
            check(info['lifetimeCta'] >= 1, f'[{w}] ‘평생 종합’ 경로 유지 ({info["lifetimeCta"]}곳)')
            check(info['headerAgain'], f'[{w}] 헤더 ‘내 사주 다시 보기’ 유지')
            check(not errs, f'[{w}] 콘솔 에러 0건 {errs[:2]}')

            # 3-3. 「1구슬(990원)으로 전체 열기 →」 실제 동작 — 12띠 상품 결제 모달
            btn = page.query_selector('.zi-teaser__cta [data-action="open-pay"]')
            check(bool(btn), f'[{w}] 카드 결제 버튼 클릭 가능')
            if btn:
                btn.scroll_into_view_if_needed()
                btn.click()
                page.wait_for_timeout(300)
                modal = page.evaluate("""() => {
                  const m = document.querySelector('#modal-root .modal');
                  if (!m) return null;
                  const ti = m.querySelector('.modal__title');
                  return { title: ti ? ti.textContent.trim() : null,
                           body: m.innerText.slice(0, 120) };
                }""")
                check(bool(modal) and '12띠' in (modal['title'] or ''),
                      f'[{w}] 결제 모달 열림 · 상품 {modal and modal["title"]!r}')
                close_btn = page.query_selector('#modal-root [data-action="close-modal"]')
                if close_btn:
                    close_btn.click()
                    page.wait_for_timeout(250)
                closed = page.evaluate("() => !document.querySelector('#modal-root .modal')")
                check(closed, f'[{w}] 결제 모달 닫힘 · 원국 화면 유지')
                check(not errs, f'[{w}] 결제 모달 여닫기 콘솔 에러 0건 {errs[:2]}')

            # 두둥실 모션 — 시간차를 두고 배지 위치가 실제로 달라지는지
            if d:
                p1 = page.evaluate("() => document.querySelector('.jani-badge__disc').getBoundingClientRect().top")
                page.wait_for_timeout(1300)
                p2 = page.evaluate("() => document.querySelector('.jani-badge__disc').getBoundingClientRect().top")
                p3 = page.evaluate("() => document.querySelector('.jani-badge__disc').getBoundingClientRect().top")
                page.wait_for_timeout(900)
                p4 = page.evaluate("() => document.querySelector('.jani-badge__disc').getBoundingClientRect().top")
                moved = max(abs(p2 - p1), abs(p4 - p3))
                check(moved > 1.0, f'[{w}] 배지가 실제로 위아래로 움직임 (Δ{p1:.1f}→{p2:.1f}, {p3:.1f}→{p4:.1f})')

            page.screenshot(path=os.path.join(OUT, f'{TAG_PREFIX}free-{w}.png'), full_page=True)
            el = page.query_selector('.sheet__head--myeong')
            if el:
                el.screenshot(path=os.path.join(OUT, f'{TAG_PREFIX}head-{w}.png'))
            el = page.query_selector('.jani-badge')
            if el:
                el.screenshot(path=os.path.join(OUT, f'{TAG_PREFIX}badge-{w}.png'))
            ctx.close()

        # ── C. 일주 동물이 바뀌면 배지 그림·문구도 바뀐다 (5표본) ─────────────
        ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
        page = ctx.new_page()
        errs = []
        watch_console(page, errs)
        for prof, branch, animal, key, want in SAMPLES:
            open_free(page, base, prof)
            got = page.evaluate("""() => {
              const img = document.querySelector('.jani-badge__img');
              const disc = document.querySelector('.jani-badge__disc');
              const line = document.querySelector('.myeong-ilju-line');
              const lr = line ? line.getBoundingClientRect() : null;
              const dr = disc ? disc.getBoundingClientRect() : null;
              return {
                src: img ? img.getAttribute('src') : null,
                txt: disc ? disc.innerText.replace(/\\s+/g, '') : null,
                loaded: img ? (img.complete && img.naturalWidth > 0) : false,
                line: line ? line.innerText.trim() : null,
                below: !!(lr && dr && lr.top >= dr.bottom - 4),
                dayKol: (document.querySelector('.ming__cell--day .ming__branch') || {}).textContent || null,
              };
            }""")
            print(f'  [일주 {animal}] {prof["year"]}-{prof["month"]:02d}-{prof["day"]:02d} · {got["dayKol"]} → {got["src"]} / {got["line"]}')
            check(got['src'] and got['src'].endswith(f'/{key}-cut.webp'), f'[{animal} 일주] 배지 그림 = {key} ({got["src"]})')
            check(got['loaded'], f'[{animal} 일주] 그림 로드 완료')
            check(got['txt'] == '', f'[{animal} 일주] 동그라미 안 글자 0 ({got["txt"]!r})')
            check(got['line'] == want, f'[{animal} 일주] 특징 문구 = 「{want}」 ({got["line"]!r})')
            check(got['below'], f'[{animal} 일주] 문구가 배지 바깥 아래')
        # 12동물 문구가 config 의 iljuLine 과 1:1인지 (엔진 표와 대조)
        cfg = open(os.path.join(ROOT, 'src/config/zodiac.js'), encoding='utf-8').read()
        pairs = re.findall(r"animal: '([^']+)', branch: '[^']+', order: [0-9]+, line: '[^']+', iljuLine: '([^']+)'", cfg)
        check(len(pairs) == 12, f'zodiac.js 일주 특징 12종 ({len(pairs)})')
        bad = [f'{a}:{l}' for a, l in pairs if l.strip() != l or any(n in l for n in [a])]
        check(not bad, f'12동물 일주 특징에 동물 이름·앞뒤 공백 없음 {bad}')
        check(not errs, f'[일주 표본] 콘솔 에러 0건 {errs[:2]}')
        ctx.close()

        # ── D. 일간 오행 5색 — 배지 테두리가 내 오행 색으로 바뀐다 ────────────
        ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
        page = ctx.new_page()
        errs = []
        watch_console(page, errs)
        rings = []
        for ohaeng, (want_rgb, (y, mo, d)) in OHAENG_RING.items():
            prof = {'calendar': 'solar', 'year': y, 'month': mo, 'day': d,
                    'hour': 10, 'minute': 0, 'timeUnknown': False, 'gender': 'female'}
            open_free(page, base, prof)
            got = page.evaluate("""() => {
              const disc = document.querySelector('.jani-badge__disc');
              const dii = document.querySelector('.myeong-dii-line');
              if (!disc) return null;
              const cs = getComputedStyle(disc);
              return {
                ohaeng: disc.getAttribute('data-ohaeng'),
                width: parseFloat(cs.borderTopWidth),
                color: cs.borderTopColor,
                shadow: cs.boxShadow,
                dii: dii ? dii.innerText.trim() : null,
              };
            }""")
            if not got:
                check(False, f'[{ohaeng}] 배지 미발견')
                continue
            rings.append(got['color'])
            print(f'  [오행 {ohaeng}] {y}-{mo:02d}-{d:02d} → 테두리 {got["color"]} / {got["width"]}px / 띠×일주 {got["dii"]!r}')
            check(got['ohaeng'] == ohaeng, f'[{ohaeng}] 배지 data-ohaeng = {got["ohaeng"]}')
            check(got['color'] == want_rgb, f'[{ohaeng}] 테두리 색 {want_rgb} ({got["color"]})')
            check(got['width'] and 3.0 <= got['width'] <= 4.2, f'[{ohaeng}] 테두리 굵기 {got["width"]}px (3.5 내외)')
            check(contrast_with(got['color']) >= 3.0,
                  f'[{ohaeng}] 남색 배경 대비 {contrast_with(got["color"]):.1f}:1 (≥3)')
            check(bool(got['shadow']) and got['shadow'] != 'none', f'[{ohaeng}] 글로우 있음')
            check(got['dii'] and got['dii'].startswith('뱀띠 × '), f'[{ohaeng}] 띠×일주 줄 = {got["dii"]!r}')
        check(len(set(rings)) == 5, f'다섯 오행 테두리 색이 모두 다름 {rings}')
        check(not errs, f'[오행 5색] 콘솔 에러 0건 {errs[:2]}')
        ctx.close()

        # ── E. 저장된 기록이 있으면 그 값을 그대로 (현재 시각으로 덮어쓰지 않음) ──
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
        foot = page.evaluate("""() => ({
          bar: !!document.querySelector('.input-page__foot'),
          text: document.body.textContent.includes('지금 저장된 원국')
                || document.body.textContent.includes('저장된 원국 결과 보기'),
        })""")
        check(not foot['bar'] and not foot['text'], f'[저장값] 저장된 원국이 있어도 하단 바 없음 {foot}')
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
