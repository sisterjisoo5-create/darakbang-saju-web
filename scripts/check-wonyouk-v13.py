# -*- coding: utf-8 -*-
"""원국 4기둥 카드 통일 · 한 줄 요약 검수 (v13)

사용:
    cd darakbang-saju-web
    npm run build
    python3 scripts/check-wonyouk-v13.py            # 로컬 dist
    python3 scripts/check-wonyouk-v13.py --live     # 라이브 GitHub Pages

확인 항목
  · 유료 리포트(#/product/newyear)의 「내 원국 여덟 글자」 —
    표(구분·간지·한자·십성·결)가 사라지고 무료 원국(#/free)과 **같은 4기둥 카드**가 그려진다
  · 기둥마다 맨 아래에 결(천간 색 + 지지 동물 — 하얀 양·검은 뱀·붉은 소·노란 닭)이 있다
  · 무료 원국 카드에도 같은 결이 있고, 두 화면의 .ming 마크업이 **글자 단위로 같다**
  · 보라색 3칸 카드(사주 온도·띠·일주·절기)가 사라지고, 그 세 값이 카드 바로 아래
    핑크 박스 한 줄(25.6°C · 따뜻한 사주 | 양띠 × 붉은 소 | 입하 이후 — 계사월)로 붙는다
  · 375·390·430·1280px 에서 그 한 줄이 **두 줄로 접히지 않고** 넘치지도 않는다(줄바꿈 0 · 넘침 0)
  · 다른 생년월일(긴 띠·일주 이름, 가장 긴 결)에서도 결이 잘리지 않고 한 줄이 유지된다
  · 신년 말고 기본·대운·평생 리포트에서도 같은 카드·한 줄이 쓰인다
  · 콘솔 에러 0 · 가로 스크롤 0
  · (--live) index.html 이 방금 빌드한 JS/CSS 해시를 가리킨다
"""
import http.server
import json
import os
import re
import socketserver
import sys
import threading
import urllib.request

from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DIST = os.path.join(ROOT, 'dist')
SERVE = os.path.join(ROOT, '.tmp-serve')  # 빌드의 base('/darakbang-saju-web/') 그대로 서빙하려고 한 겹 둔다
OUT = os.path.abspath(os.path.join(ROOT, '..', 'downloads'))
PORT = 4245
LIVE_BASE = 'https://sisterjisoo5-create.github.io/darakbang-saju-web/'
CHROME = '/workspace/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell'
LIBS = '/workspace/.cache/sysroot/usr/lib/x86_64-linux-gnu'
LIVE = '--live' in sys.argv
BASE = LIVE_BASE if LIVE else f'http://127.0.0.1:{PORT}/darakbang-saju-web/'

ME = {'calendar': 'solar', 'year': 1991, 'month': 5, 'day': 7, 'hour': 18, 'minute': 22,
      'timeUnknown': False, 'gender': 'female', 'leap': False}
# 가장 긴 이름 조합(원숭이띠 × 푸른 쥐 / 결 '푸른 원숭이'·'푸른 호랑이') — 한 줄·결 잘림 검사용
LONG = {'calendar': 'solar', 'year': 2004, 'month': 12, 'day': 5, 'hour': 4, 'minute': 20,
        'timeUnknown': False, 'gender': 'male', 'leap': False}
SEED = {'profile': ME, 'partner': None, 'bias': None, 'beads': 0, 'orders': [], 'unlocks': {},
        'todayFree': '', 'createdAt': ''}

ME_GYEOL = ['하얀 양', '검은 뱀', '붉은 소', '노란 닭']
ME_LINE = ['25.6°C · 따뜻한 사주', '양띠 × 붉은 소', '입하 이후 — 계사월']
LONG_GYEOL = ['푸른 원숭이', '푸른 돼지', '노란 말', '푸른 호랑이']
SECTIONS = [('newyear', '신년운세'), ('saju', '기본 사주'), ('daewoon', '대운'), ('lifetime', '평생 종합')]

fails = []


def check(cond, msg):
    print(('  ok   ' if cond else '  FAIL ') + msg)
    if not cond:
        fails.append(msg)


def prepare_serve():
    os.makedirs(SERVE, exist_ok=True)
    link = os.path.join(SERVE, 'darakbang-saju-web')
    if os.path.islink(link) or os.path.exists(link):
        if os.path.islink(link) and os.path.realpath(link) == os.path.realpath(DIST):
            return
        os.remove(link)
    os.symlink(DIST, link)


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=SERVE, **kw)

    def log_message(self, *a):
        pass


def serve():
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(('127.0.0.1', PORT), Handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


PROBE = """() => {
  const sec = document.querySelector('#sec-wonyouk');
  if (!sec) return { section: false };
  const ming = sec.querySelector('.ming');
  const cells = ming ? [...ming.children].map((c) => {
    const r = c.getBoundingClientRect();
    const g = c.querySelector('.ming__gyeol');
    return {
      label: (c.querySelector('.ming__label') || {}).textContent || '',
      stem: (c.querySelector('.ming__stem') || {}).textContent || '',
      branch: (c.querySelector('.ming__branch') || {}).textContent || '',
      han: (c.querySelector('.ming__han') || {}).textContent || '',
      ss: (c.querySelector('.ming__ss') || {}).textContent || '',
      el: (c.querySelector('.ming__el') || {}).textContent || '',
      gyeol: g ? g.textContent.trim() : '',
      gyeolOverflow: g ? g.scrollWidth - g.clientWidth : 0,
      w: Math.round(r.width),
    };
  }) : [];
  const line = sec.querySelector('.wy-line');
  const inner = line ? line.querySelector('.wy-line__inner') : null;
  const items = line ? [...line.querySelectorAll('.wy-line__item')] : [];
  const tops = items.map((e) => Math.round(e.getBoundingClientRect().top));
  const cs = line ? getComputedStyle(line) : null;
  return {
    section: true,
    tableCount: sec.querySelectorAll('table').length,
    kvCount: sec.querySelectorAll('.kv-grid').length,
    mingCount: sec.querySelectorAll('.ming').length,
    mingHTML: ming ? ming.outerHTML : '',
    mingW: ming ? Math.round(ming.getBoundingClientRect().width) : 0,
    cells,
    line: line ? {
      exists: true,
      items: items.map((e) => e.textContent.trim()),
      rows: new Set(tops).size,
      barH: Math.round(line.getBoundingClientRect().height),
      barOverflow: line.scrollWidth - line.clientWidth,
      innerOverflow: inner ? Math.round(inner.scrollWidth) - Math.round(inner.clientWidth) : 0,
      fontSize: cs.fontSize,
      whiteSpace: cs.whiteSpace,
      barW: Math.round(line.getBoundingClientRect().width),
    } : { exists: false },
    sheetText: sec.innerText.replace(/\\s+/g, ' ').trim(),
    docOverflow: document.documentElement.scrollWidth - window.innerWidth,
  };
}"""

FREE_PROBE = """() => {
  const ming = document.querySelector('.ming');
  if (!ming) return { ming: false };
  return {
    ming: true,
    mingHTML: ming.outerHTML,
    gyeol: [...ming.querySelectorAll('.ming__gyeol')].map((g) => g.textContent.trim()),
    gyeolOverflow: [...ming.querySelectorAll('.ming__gyeol')].map((g) => g.scrollWidth - g.clientWidth),
    lineCount: document.querySelectorAll('.wy-line').length,
    docOverflow: document.documentElement.scrollWidth - window.innerWidth,
  };
}"""


def open_product(browser, width, height, pid, seed=None):
    ctx = browser.new_context(viewport={'width': width, 'height': height}, device_scale_factor=2, reduced_motion='reduce')
    ctx.add_init_script("try{localStorage.setItem('darakbang.v2', %s)}catch(e){}"
                        % repr(json.dumps(seed or SEED)))
    page = ctx.new_page()
    logs = []
    page.on('console', lambda m: logs.append(f'{m.type}: {m.text}') if m.type == 'error' else None)
    page.on('pageerror', lambda e: logs.append(f'pageerror: {e}'))
    path = '#/free' if pid == 'free' else f'#/product/{pid}'
    page.goto(f"{BASE}?preview=3f990{path}", wait_until='networkidle')
    try:
        page.wait_for_function("document.fonts.status === 'loaded'", timeout=8000)
    except Exception:
        pass
    page.wait_for_timeout(500)
    return ctx, page, logs


def main():
    if not LIVE:
        prepare_serve()
        httpd = serve()
    else:
        httpd = None
    os.makedirs(OUT, exist_ok=True)
    env = dict(os.environ)
    env['LD_LIBRARY_PATH'] = LIBS + ':' + env.get('LD_LIBRARY_PATH', '')
    tag = 'live-v13' if LIVE else 'v13'

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--hide-scrollbars'], env=env)

        print('[1] 신년운세 「내 원국 여덟 글자」 — 4기둥 카드 + 결 + 한 줄 요약')
        for w, h in [(1280, 900), (430, 932), (390, 844), (375, 812)]:
            ctx, page, logs = open_product(browser, w, h, 'newyear')
            r = page.evaluate(PROBE)
            label = f'{w}px'
            check(r.get('section'), f'{label} — #sec-wonyouk 가 있다')
            if r.get('section'):
                check(r['tableCount'] == 0, f'{label} — 표(table) 없음 (실제 {r["tableCount"]})')
                check(r['kvCount'] == 0, f'{label} — 보라색 3칸 kv 카드 없음 (실제 {r["kvCount"]})')
                check(r['mingCount'] == 1, f'{label} — 4기둥 카드 1개')
                check(len(r['cells']) == 4, f'{label} — 칸 4개 (년주·월주·일주·시주)')
                check([c['label'] for c in r['cells']] == ['년주', '월주', '일주', '시주'],
                      f'{label} — 칸 이름 순서 {[c["label"] for c in r["cells"]]}')
                check([c['stem'] for c in r['cells']] == ['신', '계', '정', '기'],
                      f'{label} — 한글 천간 {[c["stem"] for c in r["cells"]]}')
                check([c['branch'] for c in r['cells']] == ['미', '사', '축', '유'],
                      f'{label} — 한글 지지 {[c["branch"] for c in r["cells"]]}')
                check([c['han'] for c in r['cells']] == ['辛未', '癸巳', '丁丑', '己酉'],
                      f'{label} — 한자 {[c["han"] for c in r["cells"]]}')
                check([c['ss'] for c in r['cells']] == ['편재', '편관', '나 · 일간', '식신'],
                      f'{label} — 십성 배지 {[c["ss"] for c in r["cells"]]}')
                check([c['el'] for c in r['cells']] == ['금·토', '수·화', '화·토', '토·금'],
                      f'{label} — 오행 {[c["el"] for c in r["cells"]]}')
                check([c['gyeol'] for c in r['cells']] == ME_GYEOL,
                      f'{label} — 결 {[c["gyeol"] for c in r["cells"]]}')
                check(all(c['gyeolOverflow'] <= 1 for c in r['cells']), f'{label} — 결 잘림 없음')

                line = r['line']
                check(line['exists'], f'{label} — 한 줄 요약(핑크 박스) 있음')
                if line['exists']:
                    check(line['items'] == ME_LINE, f'{label} — 한 줄 값 {line["items"]}')
                    check(line['rows'] == 1, f'{label} — 글자 줄 수 1 (실제 {line["rows"]})')
                    check(line['barOverflow'] <= 0 and line['innerOverflow'] <= 0,
                          f'{label} — 넘침 0 (가로 {line["barOverflow"]} · 안쪽 {line["innerOverflow"]})')
                    check(line['barH'] <= 40, f'{label} — 박스 높이 한 줄 {line["barH"]}px')
                    print(f'  ..   {label} — 글자 {line["fontSize"]} · 박스 폭 {line["barW"]}px · 줄 수 {line["rows"]}')
                check(r['docOverflow'] <= 0, f'{label} — 가로 스크롤 0 (실제 {r["docOverflow"]})')
                check('사주 온도' not in r['sheetText'], f'{label} — 옛 「사주 온도」 꼬리표 없음')
            check(not logs, f'{label} — 콘솔 에러 0 {logs[:3]}')
            sec = page.query_selector('#sec-wonyouk')
            if sec:
                sec.scroll_into_view_if_needed()
                page.wait_for_timeout(250)
                sec.screenshot(path=os.path.join(OUT, f'{tag}-newyear-{w}.png'))
            page.screenshot(path=os.path.join(OUT, f'{tag}-newyear-full-{w}.png'), full_page=True)
            ctx.close()

        print('[2] 무료 원국(#/free)과 같은 카드인가 — 마크업 완전 일치')
        ctx, page, logs = open_product(browser, 390, 844, 'free')
        free = page.evaluate(FREE_PROBE)
        check(free.get('ming'), '390px — 무료 원국 카드 있음')
        check(free.get('gyeol') == ME_GYEOL, f'390px — 무료 카드에도 결 {free.get("gyeol")}')
        check(all(x <= 1 for x in free.get('gyeolOverflow', [99])), '390px — 무료 카드 결 잘림 없음')
        check(free.get('lineCount') == 0, '390px — 무료 화면에는 한 줄 요약을 겹쳐 넣지 않는다')
        check(free.get('docOverflow', 0) <= 0, '390px — 무료 화면 가로 스크롤 0')
        page.query_selector('.ming').screenshot(path=os.path.join(OUT, f'{tag}-free-390.png'))
        free_html = free.get('mingHTML', '')
        ctx.close()

        ctx, page, _ = open_product(browser, 390, 844, 'newyear')
        paid_html = page.evaluate(PROBE)['mingHTML']
        ctx.close()
        check(bool(free_html) and free_html == paid_html,
              '무료 원국 카드와 신년 카드가 같은 마크업(글자·클래스·순서 전부)')
        if free_html != paid_html:
            i = next((i for i, (a, b) in enumerate(zip(free_html, paid_html)) if a != b), min(len(free_html), len(paid_html)))
            print('  ..   첫 차이 위치', i, '\n  free:', free_html[max(0, i - 80):i + 80], '\n  paid:', paid_html[max(0, i - 80):i + 80])

        print('[3] 가장 긴 이름 조합 — 결 잘림·한 줄 유지 (375px)')
        ctx, page, logs = open_product(browser, 375, 812, 'newyear', seed={**SEED, 'profile': LONG})
        r = page.evaluate(PROBE)
        check(r.get('section'), '375px — 긴 이름 리포트 섹션 있음')
        if r.get('section'):
            check([c['gyeol'] for c in r['cells']] == LONG_GYEOL, f'375px — 결 {[c["gyeol"] for c in r["cells"]]}')
            check(all(c['gyeolOverflow'] <= 1 for c in r['cells']), f'375px — 긴 결 잘림 없음 {[c["gyeolOverflow"] for c in r["cells"]]}')
            line = r['line']
            check(line['rows'] == 1 and line['barOverflow'] <= 0 and line['innerOverflow'] <= 0,
                  f'375px — 긴 값도 한 줄·넘침 0 (줄 {line["rows"]} · {line["barOverflow"]}/{line["innerOverflow"]})')
            print(f'  ..   375px — 글자 {line["fontSize"]} · 값 {line["items"]}')
            check(not logs, f'375px — 콘솔 에러 0 {logs[:3]}')
            page.query_selector('#sec-wonyouk').screenshot(path=os.path.join(OUT, f'{tag}-newyear-long-375.png'))
        ctx.close()

        print('[4] 다른 리포트도 같은 카드·한 줄 (390px)')
        for pid, name in SECTIONS[1:]:
            ctx, page, logs = open_product(browser, 390, 844, pid)
            r = page.evaluate(PROBE)
            ok = bool(r.get('section')) and r['tableCount'] == 0 and len(r['cells']) == 4 \
                and [c['gyeol'] for c in r['cells']] == ME_GYEOL and r['line']['exists'] \
                and r['line']['items'] == ME_LINE and r['line']['rows'] == 1
            check(ok, f'{name}({pid}) — 4기둥·결·한 줄 요약 동일')
            check(not logs, f'{name}({pid}) — 콘솔 에러 0 {logs[:2]}')
            ctx.close()

        browser.close()

    if LIVE:
        print('[5] 라이브 index.html 이 방금 빌드한 해시를 가리키는가')
        with open(os.path.join(DIST, 'index.html'), encoding='utf-8') as f:
            built = f.read()
        assets = re.findall(r'assets/index-[A-Za-z0-9_]+\.(?:js|css)', built)
        html = urllib.request.urlopen(LIVE_BASE + '?cb=' + str(os.getpid()), timeout=20).read().decode('utf-8')
        for a in assets:
            check(a in html, f'라이브 index.html 에 {a} 포함')
        check(len(assets) == 2, f'빌드 자산 2개(js·css) 확인 {assets}')

    if httpd:
        httpd.shutdown()

    print()
    if fails:
        print(f'실패 {len(fails)}건')
        for f in fails:
            print(' -', f)
        sys.exit(1)
    print('전부 통과 · 스크린샷 downloads/%s-*.png' % tag)


if __name__ == '__main__':
    main()
