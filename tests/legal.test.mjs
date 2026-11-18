// 약관 · 환불규정 · 운영시간 문구 검증
// 실행: npm test
//
// 2026-11-19 시연 님이 직접 짚어 준 4가지 수정이 다시 되돌아가지 않도록 고정한다.
//   ① 오기입으로 인한 무료 재열람 불가 ② 고객센터 운영시간 10:00~15:00
//   ③ 결제수단에서 네이버페이 제외 ④ 제10조 — 궁합·최애궁합과 충돌하지 않는 문구

import test from 'node:test';
import assert from 'node:assert/strict';

import { TERMS, PRIVACY, REFUND } from '../src/content/legal.js';
import { BUSINESS } from '../src/config/business.js';
import { PAY_METHODS } from '../src/config/payment.js';

const body = (doc) => doc.sections.map((s) => s.body.join('\n')).join('\n');
const section = (doc, needle) => doc.sections.find((s) => s.heading.includes(needle));
const allText = [body(TERMS), body(PRIVACY), body(REFUND)].join('\n');

test('환불규정 — 오기입(단순 착오)은 환불·무료 재열람 불가로 명시', () => {
  const s = section(REFUND, '예외');
  assert.ok(s, '환불규정 4조(예외) 항목이 있어야 한다');
  const text = s.body.join('\n');
  assert.match(text, /입력 정보 오기입\(단순 착오\)으로 인한 환불 및 무료 재열람은 불가/);
  assert.doesNotMatch(allText, /추가 결제 없이 다시 열람/, '무료 재열람 허용 문구가 남아 있으면 안 된다');
});

test('환불규정 — 하자·표시광고 불일치 시 전액 환불·재발급은 유지', () => {
  const text = section(REFUND, '예외').body.join('\n');
  assert.match(text, /표시·광고한 것과 명백히 다르거나, 오류로 인해 리포트가 정상 표시되지 않은 경우에는 열람 후에도 전액 환불 또는 재발급/);
});

test('고객센터 운영시간 — 평일 10:00~15:00 (점심시간 12:30~13:30)', () => {
  assert.equal(BUSINESS.hours, '평일 10:00~15:00 (점심시간 12:30~13:30)');
  assert.equal(allText.includes('17:00'), false, '법적 고지문에 17:00 표기가 남아 있으면 안 된다');
  assert.equal(allText.includes('18:00'), false, '법적 고지문에 18:00 표기가 남아 있으면 안 된다');
  assert.ok(allText.includes('{운영시간}'), '개인정보처리방침·환불규정은 운영시간 토큰으로 표시한다');
});

test('이용약관 제7조 — 결제수단은 신용·체크카드, 카카오페이, 토스페이', () => {
  const text = section(TERMS, '결제').body.join('\n');
  assert.match(text, /결제 수단은 신용·체크카드, 카카오페이, 토스페이이며/);
  assert.equal(allText.includes('네이버페이'), false, '약관·방침에 네이버페이 표기가 남아 있으면 안 된다');
  assert.deepEqual(PAY_METHODS.map((m) => m.id), ['card', 'kakaopay', 'tosspay']);
  assert.equal(PAY_METHODS.some((m) => m.label.includes('네이버')), false);
});

test('이용약관 제10조 — 궁합·최애궁합 이용과 충돌하지 않는 문구', () => {
  const text = section(TERMS, '이용자의 의무').body.join('\n');
  assert.match(text, /1\. 이용자는 타인의 비공개 개인정보를 부정한 목적으로 도용·침해하거나, 서비스 결과를 상업적으로 무단 복제·배포·판매해서는 안 됩니다\./);
  assert.match(text, /3\. 이용자는 서비스 이용 과정에서 알게 된 타인의 비공개 정보를 부정한 목적으로 침해·악용해서는 안 됩니다\./);
  assert.doesNotMatch(text, /타인의 생년월일시 등 개인정보를 무단으로 입력/);
});
