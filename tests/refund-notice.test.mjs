// "환불은 결제 오류만" 고지 회귀 테스트 — 2026-11-22 시연 님 지시
// 실행: npm test
//
// 지키려는 것
//  ① 원칙 문장은 config/refund.js 한 곳에서 나온다 (결제 모달 · 구슬 충전 모달 · 상품 · 푸터 · 내 다락방 · FAQ)
//  ② 결제 모달 · 구슬 충전 모달은 결제 버튼 **바로 위**에 고지한다
//  ③ 단순 변심·내용 불만족·입력 오류 환불, 미사용 구슬 잔액 환불 문구가 화면 어디에도 남지 않는다
//  ④ 약관 제8조와 환불규정은 같은 기준(결제 오류 4종 · 불가 5종 · 법정 예외 2종)을 쓴다

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  REFUND_RULE,
  REFUND_NOTICE_PAY,
  REFUND_NOTICE_BEADS,
  REFUND_NOTICE_SHORT,
  REFUND_CONSENT_LINE,
  REFUND_ERROR_GROUNDS,
  REFUND_NO_GROUNDS,
  REFUND_STATUTORY_GROUNDS,
} from '../src/config/refund.js';
import { TERMS, REFUND } from '../src/content/legal.js';

const src = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const legalSrc = readFileSync(new URL('../src/content/legal.js', import.meta.url), 'utf8');
const cssSrc = readFileSync(new URL('../src/styles/base.css', import.meta.url), 'utf8');

const body = (doc) => doc.sections.map((s) => s.body.join('\n')).join('\n');
const section = (doc, needle) => doc.sections.find((s) => s.heading.includes(needle));

test('① 원칙 문장 — "환불은 결제 오류만"', () => {
  assert.equal(REFUND_RULE, '환불은 결제 오류만 가능합니다.');
  for (const s of [REFUND_NOTICE_PAY, REFUND_NOTICE_BEADS, REFUND_NOTICE_SHORT]) {
    assert.ok(s.includes('결제 오류'), `고지문에 "결제 오류"가 없다: ${s}`);
    assert.ok(s.includes('단순 변심'), `고지문에 "단순 변심" 불가가 없다: ${s}`);
    assert.ok(!s.includes('열람 전'), `열람 전 환불로 읽히는 문구가 있다: ${s}`);
  }
  assert.match(REFUND_NOTICE_PAY, /입력 오류/);
  assert.match(REFUND_NOTICE_PAY, /내용 불만족/);
  assert.match(REFUND_NOTICE_PAY, /100% 환불/);
  assert.match(REFUND_NOTICE_BEADS, /사용하지 않음/);
  assert.ok(REFUND_CONSENT_LINE.includes('동의'));
});

test('① 결제 오류 4종 · 불가 5종 · 법정 예외 2종', () => {
  assert.equal(REFUND_ERROR_GROUNDS.length, 4);
  assert.ok(REFUND_ERROR_GROUNDS.some((g) => g.startsWith('중복 결제')));
  assert.ok(REFUND_ERROR_GROUNDS.some((g) => g.startsWith('오결제')));
  assert.ok(REFUND_ERROR_GROUNDS.some((g) => g.includes('시스템 오류로 미제공')));
  assert.ok(REFUND_ERROR_GROUNDS.some((g) => g.startsWith('구슬 오충전')));

  assert.equal(REFUND_NO_GROUNDS.length, 5);
  for (const k of ['단순 변심', '내용 불만족', '입력 오류', '재열람', '미사용 구슬']) {
    assert.ok(REFUND_NO_GROUNDS.some((g) => g.startsWith(k)), `${k} 불가 사유가 없다`);
  }

  assert.equal(REFUND_STATUTORY_GROUNDS.length, 2);
  assert.ok(REFUND_STATUTORY_GROUNDS.some((g) => g.includes('표시·광고한 내용과 다르게 이행')));
  assert.ok(REFUND_STATUTORY_GROUNDS.some((g) => g.includes('미성년자')));
});

test('② 결제 모달 — 고지가 결제 버튼 바로 위에 있다', () => {
  const pay = src.slice(src.indexOf("if (state.modal.type === 'pay')"));
  const foot = pay.slice(pay.indexOf('foot: `'), pay.indexOf('다시 결제하기') > pay.indexOf('foot: `') ? undefined : undefined);
  assert.ok(foot.includes('class="refund-note"'), '결제 버튼 영역에 환불 고지 블록이 없다');
  assert.ok(foot.indexOf('REFUND_NOTICE_PAY') < foot.indexOf('data-action="submit-pay"'), '고지는 결제 버튼보다 위에 있어야 한다');
  assert.ok(foot.includes('REFUND_RULE'), '원칙 문장이 없다');
  // 동의 체크 문구도 결제 오류 기준을 가리킨다
  assert.match(src, /\[필수\] 결제 오류 외 환불 불가 — 디지털 콘텐츠 환불규정 확인/);
});

test('② 구슬 충전 모달 — 같은 고지 + 동의 문구', () => {
  const beads = src.slice(src.indexOf('function renderModal'), src.indexOf("if (state.modal.type === 'confirm')"));
  assert.ok(beads.includes('class="refund-note"'), '구슬 충전 모달에 환불 고지 블록이 없다');
  assert.ok(beads.indexOf('REFUND_NOTICE_BEADS') < beads.indexOf('data-action="buy-beads"'), '고지는 충전 버튼보다 위에 있어야 한다');
  assert.ok(beads.includes('REFUND_CONSENT_LINE'));
  assert.match(beads, /결제 오류에 한해서만 환불됩니다/);
});

test('② 화면 곳곳 — 푸터 · 상품 목록 · 내 다락방 · FAQ', () => {
  // 푸터 법적 고지
  assert.ok(src.includes('${esc(REFUND_NOTICE_SHORT)}'), '푸터에 짧은 고지가 없다');
  // 상품 목록 아래 한 줄
  assert.match(src, /<p class="product-note">\$\{esc\(REFUND_NOTICE_SHORT\)\}<\/p>/);
  // 내 다락방 환불 · 문의
  assert.ok(src.includes('<b>${esc(REFUND_RULE)}</b>'));
  assert.match(src, /결제 오류로 환불을 요청하실 때는 주문번호·승인번호와 함께/);
  // FAQ — 결제 오류만, 미사용 구슬도 변심 환불 불가
  const faq = src.slice(src.indexOf('function faqHTML'), src.indexOf('function homeView'));
  assert.match(faq, /단순 변심이나 "사주가 안 맞는다"는 내용 불만족, 생년월일시 오기입은 환불 사유가 아니에요/);
  assert.match(faq, /충전만 하고 쓰지 않은 구슬도 단순 변심으로는 환불되지 않습니다/);
  // 상품 잠금 CTA
  assert.match(src, /1년 이내에 사용할 수 있습니다\. \$\{esc\(REFUND_RULE\)\}/);
  // 결제 오류 화면 안내
  assert.match(src, /결제가 승인된 뒤 이 화면이 보인다면 중복 결제·오류 결제에 해당할 수 있어요/);
});

test('③ 옛 환불 문구가 남아 있지 않다', () => {
  const all = [src, legalSrc].join('\n');
  const banned = [
    /열람하기 전에는 결제일로부터 7일 이내에 청약철회/,
    /리포트를 열기 전에는 결제일로부터 7일 이내 100% 환불/,
    /부분 환불받을 수 있/,
    /다회차·묶음 이용권\(5구슬·10구슬\)의 부분 환불/,
    /열람을 개시한 뒤에는 디지털 콘텐츠 특성상 환불이 제한/,
    /리포트를 열기 전에는 100% 환불/,
  ];
  for (const r of banned) assert.doesNotMatch(all, r, `옛 문구가 남아 있다: ${r}`);
  assert.doesNotMatch(body(REFUND), /부분 환불/);
  assert.doesNotMatch(body(TERMS), /부분 환불/);
});

test('④ 약관 제8조 — 결제 오류 기준으로 통일', () => {
  const t8 = section(TERMS, '청약철회').body.join('\n');
  assert.match(t8, /결제 오류에 한한 환불/);
  assert.match(t8, /① 중복 결제/);
  assert.match(t8, /④ 승인 금액·수량과 실제 충전된 구슬 수량이 다른 경우/);
  assert.match(t8, /⑤ 사용하지 않은 구슬의 잔액 환불/);
  assert.match(t8, /제17조 제3항/);
  assert.match(t8, /제17조 제2항 제5호/);
  assert.match(t8, /\{전화\}/);
});

test('④ 환불규정 — 원칙 · 환불되는 경우 · 불가 · 법정 예외 · 처리 · 구슬 · 문의', () => {
  assert.equal(REFUND.updated, '2026년 11월 22일');
  assert.match(REFUND.highlight, /환불은 결제 오류만 가능합니다/);
  assert.ok(section(REFUND, '기본 원칙'), '기본 원칙 항목이 없다');
  assert.ok(section(REFUND, '환불되는 경우'), '환불되는 경우 항목이 없다');
  assert.ok(section(REFUND, '환불되지 않는 경우'), '환불되지 않는 경우 항목이 없다');
  assert.ok(section(REFUND, '법정 예외'), '법정 예외 항목이 없다');
  assert.ok(section(REFUND, '처리 기간'), '처리 기간 항목이 없다');
  assert.ok(section(REFUND, '구슬의 목적'), '구슬 목적 항목이 없다');
  assert.ok(section(REFUND, '문의'), '문의 항목이 없다');

  const r1 = section(REFUND, '기본 원칙').body.join('\n');
  assert.match(r1, /열람 여부"가 아니라 "결제 오류 여부/);
  assert.match(r1, /결제일로부터 1년 이내/);

  // 환불되는 경우 — 결제 오류 목록 그대로
  const r2 = section(REFUND, '환불되는 경우').body.join('\n');
  for (const g of REFUND_ERROR_GROUNDS) assert.ok(r2.includes(g), `환불규정에 "${g}"가 없다`);
  // 불가 사유 목록 그대로
  const r3 = section(REFUND, '환불되지 않는 경우').body.join('\n');
  for (const g of REFUND_NO_GROUNDS) assert.ok(r3.includes(g), `환불규정에 "${g}"가 없다`);
});

test('④ 이용약관 시행일 · 환불규정 시행일', () => {
  assert.equal(TERMS.updated, '2026년 11월 22일');
  assert.match(TERMS.sections[TERMS.sections.length - 1].body.join(' '), /2026년 11월 22일부터 시행/);
});

test('④ 화면 스타일 — 고지 블록이 눈에 띄게 그려진다', () => {
  assert.match(cssSrc, /\.refund-note \{/);
  assert.match(cssSrc, /\.refund-note b \{[^}]*display: block/);
  assert.match(cssSrc, /\.product-note \{/);
});
