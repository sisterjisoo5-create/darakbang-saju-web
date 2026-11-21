// KB에스크로 이체 인증마크 — 푸터 적용 · 팝업 규격 검증
// 실행: npm test
//
// 2026-11-21 시연 님이 전달한 인증마크 원문(script + form GET + img)을 푸터에 옮기면서
// 다시 어긋나지 않도록 고정한다.
//   ① KB가 준 page · cc · mHValue 세 값과 팝업 규격(648×604, KB_AUTHMARK)이 원문 그대로
//   ② 클릭 주소는 form GET 제출과 같은 쿼리스트링 (cc 의 ':' 는 %3A 로 인코딩)
//   ③ HTTPS 페이지 혼합 콘텐츠 차단을 피하려고 인증마크 그림은 같은 도메인에서 서빙
//   ④ 푸터에 인증마크 버튼(data-action="kb-escrow")과 클릭 핸들러가 실제로 연결됨

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

import { KB_ESCROW } from '../src/config/escrow.js';

const mainSource = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const baseCss = readFileSync(new URL('../src/styles/base.css', import.meta.url), 'utf8');
const footerHTML = mainSource.slice(mainSource.indexOf('function footerHTML()'), mainSource.indexOf('/* ────────────────────────────────────────────\n   홈'));

test('KB에스크로 — KB가 준 page · cc · mHValue 원문 유지', () => {
  assert.equal(KB_ESCROW.page, 'C021590');
  assert.equal(KB_ESCROW.cc, 'b034066:b035526');
  assert.equal(KB_ESCROW.mHValue, 'edffe2acc81d38a3f21565ab738aa15a');
});

test('KB에스크로 — 클릭 주소는 form GET 제출과 같은 쿼리스트링', () => {
  assert.equal(
    KB_ESCROW.url,
    'https://okbfex.kbstar.com/quics?page=C021590&cc=b034066%3Ab035526&mHValue=edffe2acc81d38a3f21565ab738aa15a',
  );
  assert.match(KB_ESCROW.url, /^https:\/\//, '팝업 주소는 https 여야 한다');
});

test('KB에스크로 — 팝업 창 이름 · 크기(648×604)는 KB 안내 그대로', () => {
  assert.equal(KB_ESCROW.popupName, 'KB_AUTHMARK');
  assert.match(KB_ESCROW.popupFeatures, /width=648/);
  assert.match(KB_ESCROW.popupFeatures, /height=604/);
});

test('KB에스크로 — 인증마크 그림은 같은 도메인에서 서빙(혼합 콘텐츠 차단 회피)', () => {
  assert.match(KB_ESCROW.image, /images\/kb-escrow-mark\.gif$/);
  assert.ok(!/^https?:/.test(KB_ESCROW.image), '로컬 경로여야 한다');
  assert.ok(statSync(new URL('../public/images/kb-escrow-mark.gif', import.meta.url)).size > 0);
  /* 3차 폴백은 KB 원본 https 주소 — http 는 혼합 콘텐츠로 차단된다 */
  assert.match(KB_ESCROW.imageFallback, /^https:\/\/img1\.kbstar\.com\/img\/escrow\/escrowcmark\.gif$/);
});

test('KB에스크로 — 이미지 원문자에 http://img1.kbstar.com 을 남기지 않는다', () => {
  assert.ok(!mainSource.includes('http://img1.kbstar.com'), 'http 이미지 주소가 남아 있으면 HTTPS 페이지에서 차단된다');
});

test('KB에스크로 — 푸터에 인증마크 버튼이 있고 사업자 정보와 함께 놓인다', () => {
  assert.ok(footerHTML.includes('class="footer__escrow"'), '푸터에 인증마크 블록이 있어야 한다');
  assert.ok(footerHTML.includes('data-action="kb-escrow"'), '인증마크는 클릭 가능한 버튼이어야 한다');
  assert.ok(footerHTML.includes('${KB_ESCROW.image}'), '푸터 이미지는 KB_ESCROW.image 를 써야 한다');
  assert.ok(footerHTML.includes('alt="${esc(KB_ESCROW.imageAlt)}"'), '인증마크 대체 텍스트가 있어야 한다');
  assert.ok(footerHTML.includes('biz-info'), '사업자 정보 블록과 같은 푸터에 함께 있어야 한다');
  /* 인증마크 블록은 사업자 정보 바로 위에 온다 */
  assert.ok(footerHTML.indexOf('footer__escrow') < footerHTML.indexOf('class="biz-info"'));
});

test('KB에스크로 — 클릭하면 KB_AUTHMARK 창을 연다', () => {
  assert.match(mainSource, /if \(a === 'kb-escrow'\) \{[\s\S]*?openKBEscrowMark\(\);/, 'data-action="kb-escrow" 핸들러가 연결되어야 한다');
  assert.match(mainSource, /window\.open\(KB_ESCROW\.url, KB_ESCROW\.popupName, KB_ESCROW\.popupFeatures\)/);
});

test('KB에스크로 — 푸터 스타일이 있고 모바일 규칙을 가진다', () => {
  assert.match(baseCss, /\.footer__escrow \{/);
  assert.match(baseCss, /\.footer__escrow-btn \{/);
  assert.match(baseCss, /@media \(max-width: 560px\) \{\s*\.footer__escrow \{/, '모바일에서 인증마크 크기·간격을 줄이는 규칙이 있어야 한다');
});
