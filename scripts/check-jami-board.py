# -*- coding: utf-8 -*-
"""자미두수 12궁 사각 명반판 검수 — 로컬 dist 또는 라이브 GitHub Pages

사용:
    cd darakbang-saju-web
    npm run build
    python3 scripts/check-jami-board.py            # 로컬 dist
    python3 scripts/check-jami-board.py --live     # 라이브 GitHub Pages

확인 항목
  · 12궁 전체 읽기(#sec-jm-palaces)에 4×4 사각 명반판이 있고, 세로 12행 표는 사라졌다
  · 칸 12개 + 가운데 기본정보 1개, 배치가 표준(상 巳午未申 · 우 酉戌 · 하 寅丑子亥 · 좌 卯辰)
  · 명궁·신궁 칸이 골드 강조로 구분된다
  · 390·375·430 모바일과 1280 데스크톱에서 가로 넘침·칸 안 잘림·글자 겹침이 없다
  · 무료 맛보기(잠금) 화면과 평생 리포트(secJami)에서도 같은 명반판이 쓰인다
"""
import http.server
import os
import socketserver
import sys
import threading

from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DIST = os.path.join(ROOT, 'dist')
SERVE = os.path.join(ROOT, '..', '.tmp-serve')  # base '/darakbang-saju-web/' 그대로 서빙
OUT = os.path.abspath(os.path.join(ROOT, '..', 'downloads'))
PORT = 4183
LIVE_URL = 'https://sisterjisoo5-create.github.io/darakbang-saju-web/?preview=3f990'
CHROME = '/workspace/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell'
LIBS = '/workspace/.cache/sysroot/usr/lib/x86_64-linux-gnu'
LIVE = '--live' in sys.argv
BASE = LIVE_URL if LIVE else f'http://127.0.0.1:{PORT}/darakbang-saju-web/?preview=3f990'

ME = {"calendar": "solar", "year": 1991, "month": 5, "day": 7, "hour": 18, "minute": 22,
      "timeUnknown": False, "gender": "female", "leap": False}
SEED = {"profile": ME, "partner": None, "bias": None, "beads": 0, "orders": [], "unlocks": {},
        "todayFree": "", "createdAt": ""}

fails = []


def check(cond, msg):
    print(('  ok   ' if cond else '  FAIL ') + msg)
    if not cond:
        fails.append(msg)


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
  const board = document.querySelector('#sec-jm-palaces .jboard');
  if (!board) return { board: false };
  const cells = [...board.querySelectorAll('.jb-cell')].map((c) => {
    const r = c.getBoundingClientRect();
    const cs = getComputedStyle(c);
    return {
      name: (c.querySelector('.jb-name') || {}).textContent || '',
      branch: (c.querySelector('.jb-branch') || {}).textContent || '',
      row: cs.gridRowStart + '/' + cs.gridColumnStart,
      col: parseInt(cs.gridColumnStart, 10),
      x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
      overX: c.scrollWidth - c.clientWidth, overY: c.scrollHeight - c.clientHeight,
      myeong: c.classList.contains('is-myeong'), sin: c.classList.contains('is-sin'),
      border: cs.borderTopColor,
    };
  });
  const core = board.querySelector('.jb-core').getBoundingClientRect();
  const cellsW = [...board.querySelectorAll('.jb-cell')].map((c) => Math.round(c.getBoundingClientRect().width));
  const tableCount = document.querySelectorAll('#sec-jm-palaces table').length;
  const sheet = document.querySelector('#sec-jm-palaces .rp, #sec-jm-palaces').getBoundingClientRect();
  return {
    board: true,
    nCells: cells.length,
    nCore: board.querySelectorAll('.jb-core').length,
    gridCols: getComputedStyle(board).gridTemplateColumns.split(' ').length,
    cells,
    cellsW,
    core: { x: Math.round(core.x), y: Math.round(core.y), w: Math.round(core.width), h: Math.round(core.height) },
    tableCount,
    docOverflow: document.documentElement.scrollWidth - window.innerWidth,
    boardW: Math.round(board.getBoundingClientRect().width),
    sheetW: Math.round(sheet.width),
    boardH: Math.round(board.getBoundingClientRect().height),
    coreText: (board.querySelector('.jb-core') || {}).innerText || '',
    svgFree: true,
  };
}"""


def audit(page, label, shot_prefix):
    r = page.evaluate(PROBE)
    check(r.get('board') is True, f'{label} — 12궁 명반판 존재')
    if not r.get('board'):
        return r
    check(r['nCells'] == 12, f'{label} — 궁 칸 12개 ({r["nCells"]})')
    check(r['nCore'] == 1, f'{label} — 가운데 기본정보 1개')
    check(r['gridCols'] == 4, f'{label} — 4열 그리드 ({r["gridCols"]}열)')
    check(r['tableCount'] == 0, f'{label} — 세로 12행 표 없음')
    check(r['docOverflow'] <= 0, f'{label} — 페이지 가로 넘침 없음 ({r["docOverflow"]}px)')
    check(r['boardW'] <= r['sheetW'] + 1, f'{label} — 명반판이 카드 폭 안 ({r["boardW"]}/{r["sheetW"]})')
    over = [c for c in r['cells'] if c['overX'] > 0 or c['overY'] > 0]
    check(not over, f'{label} — 칸 안 잘림·넘침 없음 ' + (', '.join(f'{c["name"]}({c["overX"]}x{c["overY"]})' for c in over) if over else ''))
    widths = sorted({c['w'] for c in r['cells']})
    check(len(widths) <= 2 and widths[-1] - widths[0] <= 2, f'{label} — 12칸 폭 균일 {widths}')
    rows = {}
    for c in r['cells']:
        rows.setdefault(round(c['y'] / 10), []).append(c)
    # 배치: 상단 4 · 중간 2 · 중간 2 · 하단 4
    tops = sorted({round(c['y']) for c in r['cells']})
    check(len(tops) == 4, f'{label} — 4행 배치 ({len(tops)}행)')
    if len(tops) == 4:
        count_by_row = [len([c for c in r['cells'] if round(c['y']) == t]) for t in tops]
        check(count_by_row == [4, 2, 2, 4], f'{label} — 행별 칸 수 {count_by_row}')
        by_pos = {}
        for c in r['cells']:
            by_pos[(min(range(4), key=lambda i: abs(tops[i] - round(c['y']))), c['col'] - 1)] = c['branch']
        want = {(0, 0): '巳', (0, 1): '午', (0, 2): '未', (0, 3): '申',
                (1, 0): '辰', (1, 3): '酉', (2, 0): '卯', (2, 3): '戌',
                (3, 0): '寅', (3, 1): '丑', (3, 2): '子', (3, 3): '亥'}
        got = {k: by_pos.get(k) for k in want}
        check(got == want, f'{label} — 표준 배치(상 巳午未申·우 酉戌·하 寅丑子亥·좌 卯辰) {got if got != want else ""}')
    myeong = [c for c in r['cells'] if c['myeong']]
    sin = [c for c in r['cells'] if c['sin']]
    check(len(myeong) == 1, f'{label} — 명궁 칸 1개')
    check(len(sin) == 1, f'{label} — 신궁 칸 1개')
    if myeong:
        check('230, 195, 120' in myeong[0]['border'] or 'rgba' in myeong[0]['border'], f'{label} — 명궁 골드 테두리 ({myeong[0]["border"]})')
    check('금사국' in r['coreText'] and '명궁' in r['coreText'] and '신궁' in r['coreText'], f'{label} — 가운데 기본정보에 오행국·명궁·신궁')
    check('명주' in r['coreText'] and '신주' in r['coreText'], f'{label} — 가운데에 명주·신주')
    check('祿' in r['coreText'] and '忌' in r['coreText'], f'{label} — 가운데 사화 요약')
    print(f'  ..   {label} — 명반판 {r["boardW"]}×{r["boardH"]}px · 칸 폭 {widths}')
    page.locator('#sec-jm-palaces').screenshot(path=os.path.join(OUT, f'{shot_prefix}-board.png'))
    return r


def main():
    if not LIVE:
        serve()
    os.makedirs(OUT, exist_ok=True)
    env = dict(os.environ)
    env['LD_LIBRARY_PATH'] = LIBS + ':' + env.get('LD_LIBRARY_PATH', '')

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--hide-scrollbars'], env=env)
        seeded = "try{localStorage.setItem('darakbang.v2', %s)}catch(e){}" % repr(
            __import__('json').dumps(SEED))

        for w, h, tag in [(1280, 800, 'desktop'), (430, 932, 'm430'), (390, 844, 'm390'), (375, 812, 'm375')]:
            ctx = browser.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, reduced_motion='reduce')
            ctx.add_init_script(seeded)
            page = ctx.new_page()
            page.goto(BASE + '#/product/jami', wait_until='networkidle')
            page.wait_for_function("document.fonts.status === 'loaded'")
            page.wait_for_timeout(400)
            page.add_style_tag(content='*,*::before,*::after{animation:none!important;transition:none!important}'
                                       '.site-header{position:static!important}.report-actions{display:none!important}')
            page.wait_for_timeout(150)
            print(f'\n── {tag} ({w}×{h}) — 자미두수 리포트 (미리보기 전체 열람)')
            audit(page, tag, f'darakbang-jami-{tag}')
            page.locator('#sec-jm-palaces .jboard').screenshot(path=os.path.join(OUT, f'darakbang-jami-{tag}-grid.png'))
            page.screenshot(path=os.path.join(OUT, f'darakbang-jami-{tag}-page.png'), full_page=True)
            ctx.close()

        # 무료 맛보기(잠금) 화면에서도 같은 명반판
        print('\n── 390 모바일 — 무료 맛보기(잠금) 화면')
        ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, reduced_motion='reduce')
        ctx.add_init_script(seeded)
        page = ctx.new_page()
        page.goto(f'http://127.0.0.1:{PORT}/darakbang-saju-web/#/product/jami' if not LIVE else LIVE_URL.replace('?preview=3f990', '') + '#/product/jami',
                  wait_until='networkidle')
        page.wait_for_timeout(500)
        n = page.evaluate("() => document.querySelectorAll('#sec-jm-palaces .jboard').length")
        table = page.evaluate("() => document.querySelectorAll('#sec-jm-palaces table').length")
        lock = page.evaluate("() => document.querySelectorAll('#sec-jm-palaces .lock-wrap, #sec-jm-palaces .lock-band').length")
        check(n == 1, f'무료 맛보기 — 명반판 1개 ({n})')
        check(table == 0, f'무료 맛보기 — 세로 표 없음 ({table})')
        check(lock >= 1, f'무료 맛보기 — 나머지 장은 잠김 ({lock})')
        page.locator('#sec-jm-palaces').screenshot(path=os.path.join(OUT, 'darakbang-jami-free-board.png'))
        ctx.close()

        # 평생 리포트의 자미두수 장(secJami)도 같은 명반판
        print('\n── 1280 — 평생 종합 리포트 · 자미두수 장')
        ctx = browser.new_context(viewport={'width': 1280, 'height': 800}, device_scale_factor=2, reduced_motion='reduce')
        ctx.add_init_script(seeded)
        page = ctx.new_page()
        page.goto((LIVE_URL if LIVE else f'http://127.0.0.1:{PORT}/darakbang-saju-web/?preview=3f990') + '#/product/lifetime', wait_until='networkidle')
        page.wait_for_timeout(600)
        r = page.evaluate("""() => {
            const sec = document.querySelector('#sec-jami');
            if (!sec) return { sec: false };
            const b = sec.querySelector('.jboard');
            return { sec: true, board: !!b, cells: b ? b.querySelectorAll('.jb-cell').length : 0,
                     table: sec.querySelectorAll('table').length,
                     over: b ? [...b.querySelectorAll('.jb-cell')].filter(c => c.scrollWidth > c.clientWidth + 1 || c.scrollHeight > c.clientHeight + 1).length : -1 };
        }""")
        check(r.get('sec') is True, '평생 리포트 — 자미두수 장 존재')
        check(r.get('board') is True and r.get('cells') == 12, f'평생 리포트 — 명반판 12칸 ({r.get("cells")})')
        check(r.get('over') == 0, f'평생 리포트 — 칸 안 넘침 없음 ({r.get("over")})')
        if r.get('board'):
            page.locator('#sec-jami').screenshot(path=os.path.join(OUT, 'darakbang-jami-lifetime-board.png'))
        ctx.close()

        browser.close()

    print(f'\n실패 {len(fails)}건')
    for f in fails:
        print('  - ' + f)
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main())
