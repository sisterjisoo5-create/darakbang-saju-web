// PG 결제 연동 어댑터
// ─ PG 키가 비어 있는 동안에는 '테스트 결제' 로 전체 플로우(결제창 → 승인 → 잠금 해제)를 시연한다.
// ─ 실제 오픈 시 아래 KEYS 에 포트원 스토어 ID · 채널 키(또는 토스 클라이언트 키)를 채우면
//   같은 코드가 실제 결제창을 띄운다. (금액은 서버 검증이 필요하므로 verifyPayment 훅을 함께 둔다)

export const PG_PROVIDER = 'portone'; // 'portone' | 'toss' | 'test'

export const KEYS = {
  portone: {
    storeId: '', // 예: 'store-xxxxxxxx'
    channelKey: '', // 예: 'channel-key-xxxxxxxx' (KG이니시스/토스페이먼츠 채널)
    channelKeyKakao: '',
  },
  toss: {
    clientKey: '', // 예: 'test_ck_...' / 'live_ck_...'
  },
};

export const PAY_METHODS = [
  { id: 'card', label: '신용·체크카드', hint: '카드', icon: 'card' },
  { id: 'kakaopay', label: '카카오페이', hint: '간편결제', icon: 'kakao' },
  { id: 'tosspay', label: '토스페이', hint: '간편결제', icon: 'toss' },
];

export function isTestMode() {
  if (PG_PROVIDER === 'test') return true;
  if (PG_PROVIDER === 'portone') return !KEYS.portone.storeId || !KEYS.portone.channelKey;
  if (PG_PROVIDER === 'toss') return !KEYS.toss.clientKey;
  return true;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`스크립트 로드 실패: ${src}`));
    document.head.appendChild(s);
    return undefined;
  });
}

export function newPaymentId(prefix = 'DRK') {
  const r = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${r}`;
}

const METHOD_LABEL = Object.fromEntries(PAY_METHODS.map((m) => [m.id, m.label]));

function testApprove({ paymentId, amount, method, orderName }) {
  // 테스트 결제: 사람이 실제로 결제창을 조작하는 시간(약 1.1초)을 흉내 낸 뒤 승인한다.
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        ok: true,
        mode: 'test',
        paymentId,
        txId: `TEST-${paymentId.slice(-6)}`,
        amount,
        method,
        methodLabel: METHOD_LABEL[method] || '테스트 결제',
        orderName,
        approvedAt: new Date().toISOString(),
      });
    }, 1100);
  });
}

/**
 * 결제 요청
 * @param {object} p { paymentId, orderName, amount, method, buyer: {name, tel, email} }
 */
export async function requestPayment(p) {
  const { paymentId, orderName, amount, method, buyer = {} } = p;

  if (isTestMode()) {
    return testApprove({ paymentId, amount, method, orderName });
  }

  if (PG_PROVIDER === 'portone') {
    await loadScript('https://cdn.portone.io/v2/browser-sdk.js');
    const channelKey = method === 'kakaopay' && KEYS.portone.channelKeyKakao
      ? KEYS.portone.channelKeyKakao
      : KEYS.portone.channelKey;
    const payMethod = method === 'card' ? 'CARD' : 'EASY_PAY';
    const res = await window.PortOne.requestPayment({
      storeId: KEYS.portone.storeId,
      channelKey,
      paymentId,
      orderName,
      totalAmount: amount,
      currency: 'CURRENCY_KRW',
      payMethod,
      easyPay: method === 'kakaopay' ? { easyPayProvider: 'KAKAOPAY' } : (method === 'tosspay' ? { easyPayProvider: 'TOSSPAY' } : undefined),
      customer: {
        fullName: buyer.name || undefined,
        phoneNumber: buyer.tel || undefined,
        email: buyer.email || undefined,
      },
    });
    if (!res || res.code) {
      return { ok: false, mode: 'portone', error: res && res.message ? res.message : '결제가 취소되었습니다.' };
    }
    const verified = await verifyPayment({ paymentId: res.paymentId || paymentId, amount });
    if (!verified.ok) return { ok: false, mode: 'portone', error: verified.error };
    return {
      ok: true,
      mode: 'portone',
      paymentId: res.paymentId || paymentId,
      txId: res.txId || res.paymentId || paymentId,
      amount,
      method,
      methodLabel: METHOD_LABEL[method] || '카드',
      orderName,
      approvedAt: new Date().toISOString(),
    };
  }

  if (PG_PROVIDER === 'toss') {
    await loadScript('https://js.tosspayments.com/v1/payment');
    // 토스는 successUrl/failUrl 로 리다이렉트되므로 서버(정적 배포 시 별도 함수)에서 승인 처리가 필요하다.
    const toss = window.TossPayments(KEYS.toss.clientKey);
    await toss.requestPayment(method === 'card' ? '카드' : '카카오페이', {
      amount,
      orderId: paymentId,
      orderName,
      customerName: buyer.name,
      successUrl: `${location.origin}${location.pathname}?pay=success&orderId=${paymentId}`,
      failUrl: `${location.origin}${location.pathname}?pay=fail&orderId=${paymentId}`,
    });
    return { ok: false, mode: 'toss', pendingRedirect: true, error: '토스 결제는 승인 페이지로 이동합니다.' };
  }

  return { ok: false, error: '결제 수단이 설정되지 않았습니다.' };
}

/**
 * 결제 검증 훅.
 * 실제 운영에서는 서버(예: Vercel API route)에서 포트원 API로 금액·상태를 확인해야 한다.
 *   POST https://api.portone.io/payments/{paymentId}  → status === 'PAID' && amount.total === 요청 금액
 * 지금은 테스트 모드/미설정 상태이므로 클라이언트 통과값을 그대로 신뢰한다(운영 전 반드시 교체).
 */
export async function verifyPayment({ paymentId, amount }) {
  if (isTestMode()) return { ok: true, mode: 'test' };
  // TODO(운영 전): 서버 검증 엔드포인트 호출로 교체
  // const r = await fetch(`/api/verify?paymentId=${paymentId}&amount=${amount}`).then((x) => x.json());
  // return r.ok ? { ok: true } : { ok: false, error: '결제 금액 검증에 실패했습니다.' };
  void paymentId;
  void amount;
  return { ok: false, error: '서버 결제 검증이 아직 연결되지 않았습니다. (src/config/payment.js 의 verifyPayment 참고)' };
}

export const PG_SUMMARY = {
  provider: PG_PROVIDER,
  testMode: isTestMode(),
  label: isTestMode() ? 'PG 테스트 결제 모드' : '실결제 모드',
};
