// 사업자 정보 — 통신판매업 신고번호 반영 검증
// 실행: npm test
//
// 2026-11-26 시연 님이 영등포구청에서 받은 통신판매업 신고증(제 2026-서울영등포-2615 호)을
// 푸터 사업자 정보에 반영했다. 다시 '신고 진행 예정' 같은 placeholder 로 돌아가지 않도록 고정한다.
//   ① 신고번호는 신고증 원문 그대로 (연도-지역-일련번호)
//   ② 필수 사업자 정보에 미입력 항목이 없다 (푸터에 '입력 필요'가 뜨지 않는다)
//   ③ 일본어 푸터도 같은 번호를 보여 준다 — 한글이 섞인 번호를 숫자만으로 판별하지 않는다

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { BUSINESS, pendingBusinessFields, BUSINESS_ROWS, businessRowText } from '../src/config/business.js';

const mainSource = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const jpFooter = mainSource.slice(mainSource.indexOf('function jpFooterHTML'), mainSource.indexOf('/* ────────────────────────────────────────────\n   홈'));

test('통신판매업 신고번호 — 신고증 원문 그대로 반영', () => {
  assert.equal(BUSINESS.mailOrderNumber, '제 2026-서울영등포-2615 호');
  assert.match(BUSINESS.mailOrderNumber, /^제 \d{4}-[가-힣]+-\d+ 호$/, '연도-지역-일련번호 형식이어야 한다');
  assert.doesNotMatch(BUSINESS.mailOrderNumber, /예정|입력 필요|미정/);
});

test('사업자 정보 — 필수 항목이 모두 채워져 푸터에 "입력 필요"가 없다', () => {
  assert.deepEqual(pendingBusinessFields(), []);
  const row = BUSINESS_ROWS.find((r) => r.key === 'mailOrderNumber');
  assert.equal(businessRowText(row), '제 2026-서울영등포-2615 호');
  assert.ok(!mainSource.includes('신고 진행 예정'));
});

test('일본어 푸터 — 한글 포함 신고번호도 "届出準備中"으로 떨어지지 않는다', () => {
  assert.ok(jpFooter.includes('通信販売業届出番号'), 'JP 푸터에 신고번호 행이 있어야 한다');
  assert.ok(!/\^\[\\d-\]\+\$/.test(jpFooter), '숫자만 통과시키는 판별로 되돌리면 한글 번호가 届出準備中 이 된다');
  assert.ok(jpFooter.includes('BUSINESS.mailOrderNumber'), 'JP 푸터는 BUSINESS.mailOrderNumber 를 그대로 읽어야 한다');
});
