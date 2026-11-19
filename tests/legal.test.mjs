// 약관 · 환불규정 · 운영시간 · 구슬 문구 검증
// 실행: npm test
//
// 2026-11-19 시연 님이 직접 짚어 준 4가지 수정이 다시 되돌아가지 않도록 고정한다.
//   ① 오기입으로 인한 무료 재열람 불가 ② 고객센터 운영시간 10:00~15:00
//   ③ 결제수단에서 네이버페이 제외 ④ 제10조 — 궁합·최애궁합과 충돌하지 않는 문구
//
// 2026-11-19 토스페이 가맹점 심사 반려 사유 3건도 같은 방식으로 고정한다.
//   ⑤ 무형 상품 제공·유효기간은 결제일로부터 1년 이내 (5년 표기 금지)
//   ⑥ 구슬의 목적·용도와 구슬로 결제 가능한 상품 명시
//   ⑦ 7일 청약철회 · 묶음 구슬 부분 환불 · 무형 서비스의 제공(배송) 방법·기간

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { TERMS, PRIVACY, REFUND } from '../src/content/legal.js';
import { BUSINESS } from '../src/config/business.js';
import { PAY_METHODS } from '../src/config/payment.js';
import { BEAD_PURPOSE, BEAD_USABLE, BEAD_USABLE_LIST, BEAD_USABLE_ITEMS, BEAD_PACKS, BEAD_PRICE } from '../src/config/products.js';

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
  assert.deepEqual(PAY_METHODS.map((m) => m.id), ['tosspay', 'card', 'kakaopay'], '실연동된 토스페이가 먼저, 심사 중인 카드·카카오페이가 뒤');
  assert.equal(PAY_METHODS[0].ready, true, '첫 결제 수단(토스페이)은 바로 선택 가능해야 한다');
  assert.deepEqual(PAY_METHODS.filter((m) => m.ready).map((m) => m.id), ['tosspay'], 'PG 심사 중인 수단은 선택 불가');
  assert.equal(PAY_METHODS.some((m) => m.label.includes('네이버')), false);
});

test('이용약관 제10조 — 궁합·최애궁합 이용과 충돌하지 않는 문구', () => {
  const text = section(TERMS, '이용자의 의무').body.join('\n');
  assert.match(text, /1\. 이용자는 타인의 비공개 개인정보를 부정한 목적으로 도용·침해하거나, 서비스 결과를 상업적으로 무단 복제·배포·판매해서는 안 됩니다\./);
  assert.match(text, /3\. 이용자는 서비스 이용 과정에서 알게 된 타인의 비공개 정보를 부정한 목적으로 침해·악용해서는 안 됩니다\./);
  assert.doesNotMatch(text, /타인의 생년월일시 등 개인정보를 무단으로 입력/);
});

/* ── 토스페이 반려 사유 3건 (2026-11-19) ───────────────────────── */

test('① 유효기간 — 5년 표기 없이 모두 결제일로부터 1년 이내', () => {
  assert.equal(allText.includes('5년간'), false, '법적 고지문에 5년간 표기가 남아 있으면 안 된다');
  // 상품 유효기간·열람기간에 5년 표기는 금지한다. (개인정보처리방침의 결제기록 5년 보관은 전자상거래법상 의무라 유지)
  assert.equal(body(TERMS).includes('5년'), false, '이용약관에 상품 유효기간 5년 표기가 남아 있으면 안 된다');
  assert.equal(body(REFUND).includes('5년'), false, '환불규정에 상품 유효기간 5년 표기가 남아 있으면 안 된다');
  assert.match(body(PRIVACY), /기록 5년/, '결제기록 5년 보관(전자상거래법)은 그대로 둔다');
  assert.match(section(TERMS, '제5조').body.join('\n'), /결제 즉시 제공되며, 열람 가능 기간 및 구슬 유효기간은 결제일로부터 1년 이내입니다/);
  assert.match(section(TERMS, '결제').body.join('\n'), /구슬의 유효기간은 결제일로부터 1년 이내/);
  assert.match(section(REFUND, '기본 원칙').body.join('\n'), /리포트 열람 가능 기간과 구슬 유효기간은 모두 결제일로부터 1년 이내/);
  assert.match(section(REFUND, '처리 기간').body.join('\n'), /반환된 구슬의 유효기간은 결제일로부터 1년 이내/);
});

test('② 구슬의 목적·용도 — 약관 제2조·제7조와 환불규정에 명시', () => {
  assert.equal(BEAD_PURPOSE, '구슬은 사주보는 3층 다락방의 유료 사주 리포트를 열람하기 위한 전용 이용권(1구슬 = 990원)입니다.');
  assert.ok(section(TERMS, '제2조').body.join('\n').includes(BEAD_PURPOSE));
  assert.ok(section(TERMS, '결제').body.join('\n').includes(BEAD_PURPOSE));
  assert.ok(section(REFUND, '구슬의 목적').body.join('\n').includes(BEAD_PURPOSE));
  assert.equal(BEAD_PRICE, 990);
});

test('② 구슬로 결제 가능한 상품 — 6종 리포트와 "모든 유료 리포트" 명시', () => {
  for (const item of ['정통 사주 해설(1구슬)', '1:1 사주 궁합(1구슬)', '최애궁합(1구슬)', '신년운세(1구슬)', '대운 풀이(1구슬)', '평생 종합 리포트(10구슬)']) {
    assert.ok(BEAD_USABLE_LIST.includes(item), `사용 가능 상품 목록에 ${item} 이 있어야 한다`);
  }
  assert.match(BEAD_USABLE, /^구슬로 결제 가능한 상품: /);
  assert.match(BEAD_USABLE, /등 사이트 내 모든 유료 사주 리포트/);
  assert.ok(section(TERMS, '결제').body.join('\n').includes(BEAD_USABLE_LIST));
  assert.ok(section(REFUND, '구슬의 목적').body.join('\n').includes(BEAD_USABLE_LIST));
});

test('② 묶음 상품(5구슬·10구슬) 설명에 사용 가능 리포트가 드러난다', () => {
  const five = BEAD_PACKS.find((b) => b.id === 'bead-5');
  const ten = BEAD_PACKS.find((b) => b.id === 'bead-10');
  assert.equal(five.price, 4900);
  assert.equal(ten.price, 9900);
  assert.match(five.note, /1구슬 리포트 5건/);
  assert.match(ten.note, /평생 종합 리포트 1건/);
  assert.match(ten.note, /1구슬 리포트 10건/);
});

test('② 화면 — 구슬 충전 모달 · FAQ에 같은 안내가 들어간다 (상품 위 큰 박스는 FAQ로 이동)', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /class="bead-info"/, '구슬 충전 모달에 구슬 안내 블록이 있어야 한다');
  assert.doesNotMatch(main, /class="bead-guide"/, '상품 목록 위 구슬 안내 박스는 없어야 한다(하단 FAQ로 이동)');
  assert.match(main, /구슬이 뭔가요\? 어떤 상품에 쓸 수 있나요\?/, 'FAQ에 구슬 목적·사용 상품 항목이 있어야 한다');
  assert.match(main, /BEAD_USABLE_LIST/, '모달·FAQ가 사용 가능 상품 목록을 그대로 써야 한다');
  // FAQ 첫 항목이 구슬의 목적·12종 상품·유효기간을 모두 담는다 (토스페이 심사 요건 유지)
  const faq = main.slice(main.indexOf('function faqHTML'), main.indexOf('function homeView'));
  assert.match(faq, /BEAD_PURPOSE/, 'FAQ에 구슬 목적이 없다');
  assert.match(faq, /BEAD_USABLE\b/, 'FAQ에 사용 가능 상품 안내가 없다');
  assert.match(faq, /BEAD_VALIDITY/, 'FAQ에 구슬 유효기간이 없다');
  assert.match(faq, /구슬 안내/, 'FAQ 항목 이름이 구슬 안내여야 한다');
});

test('② 구슬로 결제 가능한 상품 12종 — 직업 · 이직운 포함', () => {
  assert.equal(BEAD_USABLE_ITEMS.length, 12);
  assert.ok(BEAD_USABLE_ITEMS.some((i) => i.name === '직업 · 이직운' && i.beads === 1), '직업 · 이직운이 없다');
  assert.ok(BEAD_USABLE_LIST.includes('직업 · 이직운(1구슬)'));
  assert.match(BEAD_USABLE, /12종/);
});

test('③ 청약철회 7일 · 묶음 구슬 부분 환불 · 제공(배송) 방법·기간', () => {
  const t8 = section(TERMS, '청약철회').body.join('\n');
  assert.match(t8, /결제일로부터 7일 이내에 청약철회\(전액 환불\)/);
  assert.match(t8, /다회차·묶음 이용권\(5구슬·10구슬\)의 부분 환불/);
  assert.match(t8, /남은 미사용 구슬/);
  assert.match(t8, /1구슬 정가\(990원\)/);

  const t5 = section(TERMS, '제5조').body.join('\n');
  assert.match(t5, /제공\(배송\) 방법/);
  assert.match(t5, /제공\(배송\) 기간/);
  assert.match(t5, /배송비: 무료\(0원\)/);

  const r3 = section(REFUND, '부분 환불').body.join('\n');
  assert.match(r3, /5구슬\(4,900원\)·10구슬\(9,900원\)/);
  assert.match(r3, /9,900원 − 2,970원 = 6,930원/);
  assert.match(section(REFUND, '열람 개시').body.join('\n'), /위 3항에 따라 부분 환불/);
});
