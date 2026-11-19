// PG 결제 연동 어댑터 — 포트원 V2 · 토스페이 실연동
// ─ 실연동 채널: 포트원 V2 `tosspay_v2` (토스페이 / MID IMPTsister01)
// ─ 신용·체크카드(KPN)와 카카오페이는 PG 심사 중 → 화면에서 '심사 중'으로 구분하고 선택할 수 없다.
// ─ 서버가 없는 정적 배포(GitHub Pages)이므로, 결제창이 오류 없이 돌려준 승인 결과를 그대로 통과시킨다.
//   (서버 검증을 붙일 때는 VERIFY_ENDPOINT 만 채우면 된다)

export const PG_PROVIDER = 'portone'; // 'portone' | 'toss' | 'test'

export const KEYS = {
  portone: {
    storeId: 'store-5ad01159-8552-4b67-a6f7-474a40a9fc9a',
    // 토스페이 V2 채널 키 (MID IMPTsister01)
    channelKey: 'channel-key-d1b42578-273f-4a86-9a75-3af09b467930',
    // 아래 두 채널은 심사 완료 후 콘솔에서 발급 → 값 입력 + PAY_METHODS 의 ready 를 true 로 바꾼다.
    channelKeyKakao: '',
    channelKeyCard: '',
  },
  toss: {
    clientKey: '', // 예: 'test_ck_...' / 'live_ck_...'
  },
};

// 서버 결제 검증 엔드포인트 (예: '/api/verify'). 정적 GitHub Pages 배포에서는 비워 둔다.
export const VERIFY_ENDPOINT = '';

export const PORTONE_SDK_URL = 'https://cdn.portone.io/v2/browser-sdk.js';
// 포트원 V2 결제창 원화 통화 코드
export const CURRENCY = 'CURRENCY_KRW';

// ready: 실연동 완료 → 선택 가능 / ready:false → PG 심사 중 (선택 불가)
export const PAY_METHODS = [
  {
    id: 'tosspay',
    label: '토스페이',
    hint: '간편결제',
    icon: 'toss',
    ready: true,
    payMethod: 'EASY_PAY',
    easyPayProvider: 'TOSSPAY',
  },
  {
    id: 'card',
    label: '신용·체크카드',
    hint: '카드',
    icon: 'card',
    ready: false,
    note: '심사 중',
    payMethod: 'CARD',
  },
  {
    id: 'kakaopay',
    label: '카카오페이',
    hint: '간편결제',
    icon: 'kakao',
    ready: false,
    note: '심사 중',
    payMethod: 'EASY_PAY',
    easyPayProvider: 'KAKAOPAY',
  },
];

export const DEFAULT_PAY_METHOD = 'tosspay';
export const PENDING_PAY_METHODS = PAY_METHODS.filter((m) => !m.ready);

export const payMethodById = (id) => PAY_METHODS.find((m) => m.id === id) || null;

export function isTestMode() {
  if (PG_PROVIDER === 'test') return true;
  if (PG_PROVIDER === 'portone') return !KEYS.portone.storeId || !KEYS.portone.channelKey;
  if (PG_PROVIDER === 'toss') return !KEYS.toss.clientKey;
  return true;
}

function channelKeyFor(method) {
  if (!method) return '';
  if (method.id === 'kakaopay' && KEYS.portone.channelKeyKakao) return KEYS.portone.channelKeyKakao;
  if (method.id === 'card' && KEYS.portone.channelKeyCard) return KEYS.portone.channelKeyCard;
  return KEYS.portone.channelKey;
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

/* ────────────────────────────────────────────
   포트원 V2 결제 요청 규격
   ──────────────────────────────────────────── */

/**
 * PortOne.requestPayment 에 넘길 요청 객체를 만든다. (순수 함수 — 테스트 대상)
 * 토스페이: payMethod 'EASY_PAY' + easyPay.easyPayProvider 'TOSSPAY'
 */
export function buildPortOneRequest({ paymentId, orderName, amount, method = DEFAULT_PAY_METHOD, buyer = {}, redirectUrl } = {}) {
  const m = typeof method === 'string' ? payMethodById(method) : method;
  if (!m) throw new Error('결제 수단을 선택해 주세요.');
  if (!m.ready) throw new Error(`${m.label}은(는) 지금 준비 중이에요. 토스페이로 결제해 주세요.`);
  if (!paymentId) throw new Error('주문번호가 없습니다.');
  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) throw new Error('결제 금액이 올바르지 않습니다.');

  const req = {
    storeId: KEYS.portone.storeId,
    channelKey: channelKeyFor(m),
    paymentId,
    orderName,
    totalAmount: Number(amount),
    currency: CURRENCY,
    payMethod: m.payMethod,
  };
  if (m.easyPayProvider) req.easyPay = { easyPayProvider: m.easyPayProvider };

  const customer = {};
  if (buyer && buyer.name) customer.fullName = buyer.name;
  if (buyer && buyer.tel) customer.phoneNumber = buyer.tel;
  if (buyer && buyer.email) customer.email = buyer.email;
  if (Object.keys(customer).length) req.customer = customer;

  // 모바일은 대부분 리디렉션 방식 → 복귀 주소가 없으면 결제 결과를 받을 수 없다.
  if (redirectUrl) req.redirectUrl = redirectUrl;

  return req;
}

/** 결제 완료 후 돌아올 주소 — 쿼리 파라미터(paymentId·code·txId…)는 포트원이 붙인다. */
export function paymentReturnUrl(href) {
  const base = href || (typeof location !== 'undefined' ? `${location.origin}${location.pathname}` : '');
  if (!base) return '';
  const u = new URL(base);
  u.hash = '';
  u.search = '';
  u.searchParams.set('pay', PG_PROVIDER);
  return u.toString();
}

/** 리디렉션 복귀 쿼리 파싱 — 결제와 무관한 방문이면 null */
export function parsePayRedirect(search) {
  const raw = search == null ? (typeof location !== 'undefined' ? location.search : '') : search;
  const q = new URLSearchParams(raw || '');
  const paymentId = q.get('paymentId') || '';
  const code = q.get('code') || '';
  if (!paymentId && !code) return null;
  return {
    paymentId,
    txId: q.get('txId') || '',
    code,
    message: q.get('message') || '',
    pgCode: q.get('pgCode') || '',
    pgMessage: q.get('pgMessage') || '',
  };
}

/* ────────────────────────────────────────────
   모바일 리디렉션 대비 — 진행 중인 결제를 브라우저에 남긴다
   ──────────────────────────────────────────── */
const PENDING_KEY = 'darakbang.pay.pending';

export function savePendingPayment(p) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(PENDING_KEY, JSON.stringify(p));
  } catch (e) {
    /* 저장 실패는 조용히 넘어간다 */
  }
}

export function loadPendingPayment() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function clearPendingPayment() {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(PENDING_KEY);
  } catch (e) {
    /* 무시 */
  }
}

/* ────────────────────────────────────────────
   승인
   ──────────────────────────────────────────── */

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
 * 결제 검증.
 * 서버(VERIFY_ENDPOINT)가 설정된 경우 그 응답을 따르고,
 * 정적 배포에서는 결제창이 오류 코드 없이 돌려준 승인 결과를 승인으로 처리한다.
 */
export async function verifyPayment({ paymentId, amount }) {
  if (!paymentId) return { ok: false, error: '결제 ID가 없어 승인을 확인하지 못했습니다.' };

  if (VERIFY_ENDPOINT) {
    try {
      const url = `${VERIFY_ENDPOINT}?paymentId=${encodeURIComponent(paymentId)}&amount=${encodeURIComponent(amount)}`;
      const r = await fetch(url).then((x) => x.json());
      if (r && r.ok) return { ok: true, mode: 'server' };
      return { ok: false, error: (r && r.error) || '결제 금액 검증에 실패했습니다.' };
    } catch (e) {
      return { ok: false, error: '결제 검증 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.' };
    }
  }

  // 정적 배포: 서버 검증 없이 결제창 승인 결과를 신뢰한다.
  // (추후 서버 검증을 붙이면 위 VERIFY_ENDPOINT 분기에서 금액·상태를 확인하게 된다)
  return { ok: true, mode: 'static' };
}

/** 결제창/리디렉션 복귀에서 받은 paymentId 를 검증하고 주문 결과로 바꾼다. */
export async function verifyAndApprove({ paymentId, txId, amount, method, orderName }) {
  const verified = await verifyPayment({ paymentId, amount });
  if (!verified.ok) return { ok: false, mode: 'portone', error: verified.error };
  return {
    ok: true,
    mode: 'portone',
    paymentId,
    txId: txId || paymentId,
    amount,
    method,
    methodLabel: METHOD_LABEL[method] || '토스페이',
    orderName,
    approvedAt: new Date().toISOString(),
    verify: verified.mode,
  };
}

/**
 * 결제 요청
 * @param {object} p { paymentId, orderName, amount, method, buyer: {name, tel, email}, redirectUrl }
 */
export async function requestPayment(p) {
  const { paymentId, orderName, amount, method = DEFAULT_PAY_METHOD, buyer = {}, redirectUrl } = p;

  if (isTestMode()) {
    return testApprove({ paymentId, amount, method, orderName });
  }

  if (PG_PROVIDER === 'portone') {
    let req;
    try {
      req = buildPortOneRequest({ paymentId, orderName, amount, method, buyer, redirectUrl });
    } catch (e) {
      return { ok: false, mode: 'portone', error: e.message };
    }

    try {
      await loadScript(PORTONE_SDK_URL);
    } catch (e) {
      return { ok: false, mode: 'portone', error: '결제 모듈을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' };
    }
    if (!window.PortOne || typeof window.PortOne.requestPayment !== 'function') {
      return { ok: false, mode: 'portone', error: '결제 모듈(PortOne)을 찾을 수 없어요. 새로고침 후 다시 시도해 주세요.' };
    }

    let res;
    try {
      res = await window.PortOne.requestPayment(req);
    } catch (e) {
      // 결제창이 열리기 전 오류(파라미터·네트워크)는 throw 된다.
      return { ok: false, mode: 'portone', code: e && e.code, error: (e && e.message) || '결제창을 열지 못했어요.' };
    }
    if (!res) return { ok: false, mode: 'portone', error: '결제 결과를 받지 못했어요. 다시 시도해 주세요.' };
    if (res.code) {
      return { ok: false, mode: 'portone', code: res.code, error: res.message || '결제가 취소되었습니다.' };
    }

    return verifyAndApprove({
      paymentId: res.paymentId || paymentId,
      txId: res.txId,
      amount,
      method,
      orderName,
    });
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

export const PG_SUMMARY = {
  provider: PG_PROVIDER,
  testMode: isTestMode(),
  label: isTestMode() ? 'PG 테스트 결제 모드' : '실결제 모드',
};
