// 검수용 비밀 미리보기 — 통신판매업 신고·PG 심사 전에 990원 유료 리포트 12종을
// 결제 없이 열어 보고 검수하기 위한 모드.
//
//   켜는 법 : 주소 뒤에 `?preview=3f990`            (화면에는 어떤 버튼·힌트도 두지 않는다)
//   유지    : sessionStorage — 같은 탭에서 화면을 옮기거나 새로고침해도 유지되고, 탭을 닫으면 사라진다
//   일반 방문자 : 파라미터도 저장값도 없으면 이 모듈은 아무 일도 하지 않는다
//                (결제창·잠금 화면은 기존과 완전히 동일)
//
// 정식 오픈 때 걷어내는 법 (이 모듈 하나에 모아 두었다)
//   ① 이 파일 삭제
//   ② src/main.js 에서 `preview` import 줄, previewStore·preview·initPreview() 정의,
//      headerHTML 안의 `${previewStripHTML()}`, productView 의 `preview.active` 분기,
//      productHref()·nextProductFromHash(), handleBirthSubmit 의 next 분기,
//      openModal 의 미리보기 가드와 open-beads·buy-beads·open-pay·submit-pay 의 `preview.active` 분기 삭제
//   ③ src/styles/base.css 의 `── 미리보기 배지` 블록 삭제
//   ④ tests/preview.test.mjs 삭제
//   결제·잠금 로직 자체는 손대지 않았으므로 위 4곳만 지우면 원래 사이트로 돌아온다.

/** 주소 쿼리 이름 — `?preview=3f990` */
export const PREVIEW_PARAM = 'preview';

/** 비밀 코드 — 이 값과 정확히 같을 때만(대소문자 구분) 미리보기가 켜진다 */
export const PREVIEW_CODE = '3f990';

/** 유지 표식 키 (sessionStorage) */
export const PREVIEW_STORAGE_KEY = 'darakbang.preview';

/** 미리보기가 켜져 있을 때만 상단에 붙는 작은 배지 */
export const PREVIEW_BADGE = '검수용 미리보기 모드';
export const PREVIEW_BADGE_NOTE = '결제 없이 열람 중';

export function isPreviewCode(value) {
  return typeof value === 'string' && value === PREVIEW_CODE;
}

/** 주소의 ?preview= 값 — 파라미터가 없으면 null, 값이 비어 있으면 '' */
export function previewParamValue(search) {
  try {
    const q = new URLSearchParams(search == null ? '' : search);
    return q.has(PREVIEW_PARAM) ? q.get(PREVIEW_PARAM) : null;
  } catch (e) {
    return null;
  }
}

/**
 * 해시 라우트 안쪽의 쿼리 문자열 — `#/input?next=saju` → `?next=saju`.
 * 라우터는 `#` 뒤의 `?` 앞까지만 경로로 읽으므로(`route()`), 해시에 붙은 값은 여기서 따로 읽는다.
 */
export function hashSearch(hash) {
  const s = String(hash == null ? '' : hash);
  const i = s.indexOf('?');
  return i === -1 ? '' : s.slice(i);
}

/** 생년월일 입력을 거쳐 열 상품 id 를 담는 해시 쿼리 이름 — `#/input?next=<id>` */
export const PREVIEW_NEXT_PARAM = 'next';

/** 미리보기에서 「생년월일 넣고 바로 열기」로 넘길 주소 */
export function previewInputHref(productId) {
  return `#/input?${PREVIEW_NEXT_PARAM}=${encodeURIComponent(String(productId == null ? '' : productId))}`;
}

/** 해시에서 이어 열 상품 id — 없으면 '' (일반 방문자는 이 값을 쓰지 않는다) */
export function previewNextProduct(hash) {
  try {
    const q = new URLSearchParams(hashSearch(hash));
    return String(q.get(PREVIEW_NEXT_PARAM) || '').trim();
  } catch (e) {
    return '';
  }
}

/** 저장된 표식 — 없거나 저장소를 못 쓰면 '' */
export function readPreviewFlag(storage) {
  try {
    if (!storage || typeof storage.getItem !== 'function') return '';
    return storage.getItem(PREVIEW_STORAGE_KEY) || '';
  } catch (e) {
    return '';
  }
}

export function writePreviewFlag(storage, value = PREVIEW_CODE) {
  try {
    if (!storage || typeof storage.setItem !== 'function') return false;
    storage.setItem(PREVIEW_STORAGE_KEY, value);
    return true;
  } catch (e) {
    return false;
  }
}

export function clearPreviewFlag(storage) {
  try {
    if (!storage || typeof storage.removeItem !== 'function') return false;
    storage.removeItem(PREVIEW_STORAGE_KEY);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 이번 화면에서 미리보기가 켜지는지 판정한다.
 *  · 주소에 ?preview 가 있으면 그 값이 결정한다 — 맞으면 켬, 틀리면 끄고 저장 표식도 지운다(안전한 쪽으로 실패)
 *  · `?preview=3f990#/result` 처럼 쿼리 뒤에 해시가 붙은 경우와,
 *    `#/input?preview=3f990` 처럼 해시 안쪽에만 붙은 경우를 모두 읽는다
 *    (해시 안쪽 값은 `?` 뒤가 라우터 경로에 들어가지 않도록 따로 파싱한다)
 *  · 둘 다 없으면 저장 표식을 따른다 — 페이지 이동·새로고침 뒤에도 유지
 *  · 우선순위: 주소창 쿼리 > 해시 안쪽 쿼리 > 저장 표식 (앞의 값이 틀리면 뒤를 보지 않고 끈다)
 */
export function resolvePreview({ search = '', hash = '', storage = null } = {}) {
  const inSearch = previewParamValue(search);
  const raw = inSearch !== null ? inSearch : previewParamValue(hashSearch(hash));
  if (raw !== null) {
    if (isPreviewCode(raw)) {
      writePreviewFlag(storage, PREVIEW_CODE);
      return true;
    }
    clearPreviewFlag(storage);
    return false;
  }
  return isPreviewCode(readPreviewFlag(storage));
}

/**
 * 상품 잠금 판정 — 미리보기 중이면 결제 기록과 무관하게 모두 열린다.
 * 반환: { unlocked, via: 'preview' | 'paid' | 'locked' }
 */
export function resolveUnlocked({ previewActive = false, unlocks = null, productId = '' } = {}) {
  if (previewActive) return { unlocked: true, via: 'preview' };
  const orderId = unlocks && productId ? unlocks[productId] : '';
  return orderId ? { unlocked: true, via: 'paid' } : { unlocked: false, via: 'locked' };
}
