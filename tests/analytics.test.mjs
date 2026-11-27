// GA4 애널리틱스 검증
// 실행: npm test
//
// 2026-11-27 — 일일 방문자 수·페이지뷰·유입경로를 보려고 구글 애널리틱스 4(GA4)를 붙였다.
// 이 앱은 `#/...` 해시 라우팅 SPA 라서 GA4 기본 동작만으로는 화면 전환이 페이지뷰로 잡히지 않는다.
// 다시 조용히 깨지지 않도록 다음을 고정한다.
//   ① index.html <head> 에 표준 gtag.js 스니펫이 있고 측정 ID 가 실제 G- 코드다(플레이스홀더 금지)
//   ② gtag config 는 send_page_view: false — 자동 페이지뷰를 꺼서 중복 집계를 막는다
//   ③ src/main.js 의 trackPageView() 가 page_path 에 경로+해시를 담아 보낸다
//   ④ 첫 렌더와 hashchange 마다 trackPageView() 를 부른다 (화면 전환 1회 = 페이지뷰 1회)
//   ⑤ GitHub Pages 가 서빙하는 docs/index.html 에도 같은 측정 ID 가 들어가 있다

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const docsHtml = readFileSync(new URL('../docs/index.html', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

/** gtag.js 로더의 측정 ID (?id=G-...) */
function loaderId(source) {
  const m = source.match(/googletagmanager\.com\/gtag\/js\?id=(G-[A-Z0-9]+)/);
  return m ? m[1] : null;
}

/** gtag('config', 'G-...') 의 측정 ID */
function configId(source) {
  const m = source.match(/gtag\(\s*'config'\s*,\s*'(G-[A-Z0-9]+)'/);
  return m ? m[1] : null;
}

test('index.html — gtag.js 로더와 config 가 같은 실제 측정 ID 를 쓴다', () => {
  const load = loaderId(html);
  const conf = configId(html);
  assert.ok(load, 'gtag.js 로더 스크립트가 없습니다');
  assert.ok(conf, "gtag('config', ...) 호출이 없습니다");
  assert.equal(load, conf, '로더와 config 의 측정 ID 가 다릅니다');
  assert.match(load, /^G-[A-Z0-9]{6,}$/);
  assert.doesNotMatch(load, /XXXXXXXXXX|YOUR_|PLACEHOLDER/, '측정 ID 가 아직 플레이스홀더입니다');
});

test('index.html — 스니펫은 <head> 안, dataLayer 초기화 + js/config 순서', () => {
  const head = html.slice(0, html.indexOf('</head>'));
  const body = html.slice(html.indexOf('<body'));
  assert.match(head, /window\.dataLayer = window\.dataLayer \|\| \[\]/);
  assert.match(head, /gtag\('js', new Date\(\)\)/);
  assert.match(head, /googletagmanager\.com\/gtag\/js\?id=/);
  assert.doesNotMatch(body, /googletagmanager\.com\/gtag\/js\?id=/, '스니펫이 <head> 밖에 있습니다');
  const jsAt = head.indexOf("gtag('js'");
  const cfgAt = head.indexOf("gtag('config'");
  assert.ok(jsAt > 0 && cfgAt > jsAt, 'js → config 순서가 아닙니다');
});

test('index.html — 자동 page_view 는 끈다 (send_page_view: false)', () => {
  assert.match(html, /gtag\('config',\s*'G-[A-Z0-9]+',\s*\{\s*send_page_view:\s*false\s*\}\)/);
});

test('src/main.js — trackPageView() 가 경로+해시를 page_path 로 보낸다', () => {
  assert.match(main, /function trackPageView\(\)/);
  assert.match(main, /typeof window\.gtag !== 'function'/);
  assert.match(main, /window\.gtag\('event', 'page_view'/);
  assert.match(main, /page_path: `\$\{location\.pathname\}\$\{location\.hash\}`/);
});

test('src/main.js — 첫 렌더와 hashchange 마다 페이지뷰 1회', () => {
  // hashchange 핸들러: render() 직후 trackPageView()
  assert.match(main, /window\.addEventListener\('hashchange', \(\) => \{\s*render\(\);\s*trackPageView\(\);/);
  // 최초 진입: render() → scrollPageTop() → trackPageView()
  assert.match(main, /initPreview\(\);\s*syncCharts\(\);\s*render\(\);\s*scrollPageTop\(\);\s*trackPageView\(\);/);
  // 중복 방지 — trackPageView 호출은 위 두 곳뿐이어야 한다
  const calls = main.match(/(?<!function )trackPageView\(\);/g) || [];
  assert.equal(calls.length, 2, `trackPageView() 호출이 ${calls.length}곳입니다 (2곳이어야 함)`);
});

test('docs/index.html — 라이브 번들에도 같은 측정 ID 가 들어가 있다', () => {
  const load = loaderId(docsHtml);
  assert.ok(load, 'docs/index.html 에 gtag 스니펫이 없습니다 (npm run build 후 docs 로 복사 필요)');
  assert.equal(load, loaderId(html), 'docs 와 index.html 의 측정 ID 가 다릅니다');
});
