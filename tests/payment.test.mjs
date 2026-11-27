// 결제 설정 · 포트원 V2 토스페이 요청 규격 검증
// 실행: npm test
//
// 2026-11-19 시연 님이 포트원 콘솔에서 토스페이 V2 실연동 채널을 추가한 뒤,
// 실결제창이 서버 없이도(정적 GitHub Pages) 승인 → 리포트 잠금 해제까지 이어지도록 고정한다.
//  ① 스토어 ID · 토스페이 채널 키 · KPN 카드 테스트 채널 키가 실제 값과 일치
//  ② 실결제 모드(isTestMode false) — 토스페이는 실결제, 카드는 KPN 테스트 채널
//  ③ 토스페이·신용·체크카드 선택 가능(카드는 '테스트 결제' 표기), 카카오페이는 '심사 중'
//  ④ 토스페이 요청 규격 — payMethod EASY_PAY + easyPayProvider TOSSPAY + 원화
//     신용·체크카드 요청 규격 — payMethod CARD + channelKeyCard(KPN 테스트 채널)
//  ⑤ 모바일 리디렉션 복귀 파라미터 처리
//  ⑥ 서버 검증이 없는 정적 환경에서 결제창 승인 결과를 통과시키되, paymentId 없이는 승인하지 않음

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  KEYS,
  PG_PROVIDER,
  CURRENCY,
  VERIFY_ENDPOINT,
  PAY_METHODS,
  PENDING_PAY_METHODS,
  TEST_PAY_METHODS,
  isTestMethod,
  TEST_PAY_NOTE,
  DEFAULT_PAY_METHOD,
  isTestMode,
  buildPortOneRequest,
  paymentReturnUrl,
  parsePayRedirect,
  verifyPayment,
  verifyAndApprove,
  newPaymentId,
} from '../src/config/payment.js';

const STORE_ID = 'store-5ad01159-8552-4b67-a6f7-474a40a9fc9a';
const TOSS_CHANNEL = 'channel-key-d1b42578-273f-4a86-9a75-3af09b467930';
const CARD_CHANNEL = 'channel-key-5f03271e-3036-4f5a-87be-eea5ded70237';

test('포트원 실연동 키 — 스토어 ID · 토스페이 V2 채널 키 · KPN 카드 테스트 채널 키', () => {
  assert.equal(PG_PROVIDER, 'portone');
  assert.equal(KEYS.portone.storeId, STORE_ID);
  assert.equal(KEYS.portone.channelKey, TOSS_CHANNEL);
  assert.equal(KEYS.portone.channelKeyCard, CARD_CHANNEL, 'KPN 테스트 채널키(공용 MID merchantest6)가 연결되어 있어야 한다');
});

test('실결제 모드 — 키가 채워져 isTestMode 는 false', () => {
  assert.equal(isTestMode(), false);
});

test('결제 수단 — 토스페이 기본 · 신용·체크카드 테스트 결제 · 카카오페이는 심사 중', () => {
  assert.equal(DEFAULT_PAY_METHOD, 'tosspay');
  assert.deepEqual(PAY_METHODS.map((m) => m.id), ['tosspay', 'card', 'kakaopay']);

  const toss = PAY_METHODS.find((m) => m.id === 'tosspay');
  assert.equal(toss.ready, true);
  assert.equal(toss.test, undefined, '토스페이는 실결제 채널이다');

  const card = PAY_METHODS.find((m) => m.id === 'card');
  assert.equal(card.ready, true, 'KPN 테스트 채널을 연결했으므로 신용·체크카드를 선택할 수 있어야 한다');
  assert.equal(card.note, '테스트 결제', '카드는 실제 청구가 없는 심사용 테스트 결제임을 표시한다');
  assert.equal(card.test, true);
  assert.equal(card.payMethod, 'CARD');
  assert.equal(isTestMethod('card'), true);
  assert.equal(isTestMethod('tosspay'), false);
  assert.deepEqual(TEST_PAY_METHODS.map((m) => m.id), ['card']);
  assert.match(TEST_PAY_NOTE, /청구되지 않/);

  assert.deepEqual(PENDING_PAY_METHODS.map((m) => m.id), ['kakaopay']);
  PENDING_PAY_METHODS.forEach((m) => {
    assert.equal(m.ready, false);
    assert.match(m.note, /심사 중/);
  });
});

test('토스페이 요청 규격 — EASY_PAY · TOSSPAY · 원화 · 스토어/채널 키', () => {
  const redirectUrl = 'https://sisterjisoo5-create.github.io/darakbang-saju-web/?pay=portone';
  const req = buildPortOneRequest({
    paymentId: 'DRK-TEST-001',
    orderName: '정통 사주 해설',
    amount: 990,
    method: 'tosspay',
    redirectUrl,
  });

  assert.equal(req.storeId, STORE_ID);
  assert.equal(req.channelKey, TOSS_CHANNEL);
  assert.equal(req.paymentId, 'DRK-TEST-001');
  assert.equal(req.orderName, '정통 사주 해설');
  assert.equal(req.totalAmount, 990);
  assert.equal(req.currency, CURRENCY);
  assert.equal(req.payMethod, 'EASY_PAY');
  assert.deepEqual(req.easyPay, { easyPayProvider: 'TOSSPAY' });
  assert.equal(req.redirectUrl, redirectUrl);
  assert.equal(req.customer, undefined, '구매자 정보가 없으면 customer 를 보내지 않는다');
});

test('원화 통화 코드 — 포트원 V2 결제창 규격값', () => {
  assert.match(CURRENCY, /^(CURRENCY_)?KRW$/);
});

test('신용·체크카드 요청 규격 — CARD · KPN 테스트 채널 키 · easyPay 없음', () => {
  const req = buildPortOneRequest({
    paymentId: 'DRK-CARD-001',
    orderName: '정통 사주 해설',
    amount: 990,
    method: 'card',
    buyer: { name: '정시연', tel: '010-0000-0000' },
  });

  assert.equal(req.storeId, STORE_ID);
  assert.equal(req.channelKey, CARD_CHANNEL);
  assert.equal(req.payMethod, 'CARD');
  assert.equal(req.easyPay, undefined, '카드 결제에는 easyPay 를 붙이지 않는다');
  assert.equal(req.totalAmount, 990);
  assert.equal(req.currency, CURRENCY);
  assert.deepEqual(req.customer, { fullName: '정시연', phoneNumber: '010-0000-0000' });
});

test('심사 중인 카카오페이로는 결제창을 열지 않는다', () => {
  assert.throws(
    () => buildPortOneRequest({ paymentId: 'DRK-2', orderName: '정통 사주 해설', amount: 990, method: 'kakaopay' }),
    /준비 중/,
  );
});

test('구매자 정보는 있는 항목만 customer 로 전달', () => {
  const req = buildPortOneRequest({
    paymentId: 'DRK-3',
    orderName: '구슬 5구슬 충전',
    amount: 4900,
    method: 'tosspay',
    buyer: { name: '정시연', tel: '', email: 'a@b.co' },
  });
  assert.deepEqual(req.customer, { fullName: '정시연', email: 'a@b.co' });
});

test('복귀 주소 — 결제 파라미터를 받을 수 있는 같은 주소(해시 제거)', () => {
  const url = paymentReturnUrl('https://sisterjisoo5-create.github.io/darakbang-saju-web/#/product/saju');
  assert.equal(url, 'https://sisterjisoo5-create.github.io/darakbang-saju-web/?pay=portone');
});

test('리디렉션 복귀 파라미터 파싱 — 성공 / 취소 / 무관한 방문', () => {
  const ok = parsePayRedirect('?pay=portone&paymentId=DRK-ABC&txId=TX-1');
  assert.equal(ok.paymentId, 'DRK-ABC');
  assert.equal(ok.txId, 'TX-1');
  assert.equal(ok.code, '');

  const cancel = parsePayRedirect('?pay=portone&paymentId=DRK-ABC&code=FAIL&message=사용자가%20결제를%20취소하였습니다&pgCode=9000');
  assert.equal(cancel.code, 'FAIL');
  assert.equal(cancel.message, '사용자가 결제를 취소하였습니다');
  assert.equal(cancel.pgCode, '9000');

  assert.equal(parsePayRedirect(''), null);
  assert.equal(parsePayRedirect('?pay=portone'), null);
});

test('정적 배포 승인 — 서버 검증이 없어도 결제창 승인 결과를 통과', async () => {
  assert.equal(VERIFY_ENDPOINT, '');
  const r = await verifyPayment({ paymentId: 'DRK-OK', amount: 990 });
  assert.equal(r.ok, true);
  assert.equal(r.mode, 'static');
});

test('승인 — paymentId 가 없으면 통과시키지 않는다', async () => {
  const r = await verifyPayment({ paymentId: '', amount: 990 });
  assert.equal(r.ok, false);
});

test('승인 결과 → 주문 표기(토스페이 · 신용·체크카드)', async () => {
  const r = await verifyAndApprove({ paymentId: 'DRK-OK', txId: 'TX-9', amount: 990, method: 'tosspay', orderName: '정통 사주 해설' });
  assert.equal(r.ok, true);
  assert.equal(r.txId, 'TX-9');
  assert.equal(r.methodLabel, '토스페이');
  assert.equal(r.amount, 990);

  const c = await verifyAndApprove({ paymentId: 'DRK-CARD', txId: 'TX-10', amount: 990, method: 'card', orderName: '정통 사주 해설' });
  assert.equal(c.ok, true);
  assert.equal(c.methodLabel, '신용·체크카드');
});

test('주문번호는 매번 새로 채번된다', () => {
  const ids = new Set(Array.from({ length: 30 }, () => newPaymentId('DRK')));
  assert.equal(ids.size, 30);
  [...ids].forEach((id) => assert.match(id, /^DRK-[A-Z0-9]+-[A-Z0-9]{6}$/));
});
