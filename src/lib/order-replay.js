// 내 다락방 주문 내역 → 「다시 보기」
//   · 990원 리포트 주문은 그 상품 화면(#/product/<id>)으로 그대로 돌아간다 — 이미 열어 둔 기록이라 다시 결제하지 않는다
//   · 구슬 충전(productId 'beads')처럼 리포트가 아닌 주문, 상품 id 가 없는 옛 주문은 되볼 화면이 없으므로 버튼을 달지 않는다
//   · 사라진 상품 id 도 같은 이유로 제외한다
import { productById } from '../config/products.js';

export const REPLAY_LABEL = '다시 보기';

/** 리포트 주문이면 그 상품 id, 아니면 빈 문자열 */
export function replayProductId(order) {
  if (!order || typeof order !== 'object') return '';
  const id = String(order.productId || '');
  if (!id || id === 'beads') return '';
  const product = productById(id);
  return product ? product.id : '';
}

/** 다시 보기 주소 — 리포트 주문이 아니면 빈 문자열 */
export function replayHref(order) {
  const id = replayProductId(order);
  return id ? `#/product/${id}` : '';
}
