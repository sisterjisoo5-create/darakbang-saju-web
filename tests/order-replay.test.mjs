// 내 다락방 [다시 보기] · 리포트 상단 액션 바([이미지 저장] + 안내 한 줄) 고정 검사
// 실제 화면·레이아웃은 scripts/check-report-bar.py 가 375·390px 브라우저로 확인하고,
// 여기서는 마크업·문구·예외 처리 계약이 깨지지 않는지 지킨다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { replayProductId, replayHref, REPLAY_LABEL } from '../src/lib/order-replay.js';
import { SAVE_LABEL, SAVE_HINT } from '../src/lib/report-image.js';
import { PRODUCTS } from '../src/config/products.js';

const mainJs = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles/components.css', import.meta.url), 'utf8');

const order = (productId) => ({ id: 'p1', txId: 'TX1', productId, name: '연애운', amount: 990, at: '2026-11-22T10:00:00.000Z' });

test('다시 보기 — 리포트 주문은 그 상품 화면으로 돌아간다', () => {
  for (const p of PRODUCTS) {
    assert.equal(replayProductId(order(p.id)), p.id, `${p.name} 주문`);
    assert.equal(replayHref(order(p.id)), `#/product/${p.id}`);
  }
  assert.equal(REPLAY_LABEL, '다시 보기');
});

test('다시 보기 — 구슬 충전·옛 주문·사라진 상품은 버튼을 달지 않는다', () => {
  assert.equal(replayProductId(order('beads')), '', '구슬 충전은 리포트가 아니다');
  assert.equal(replayProductId({ id: 'old', amount: 990 }), '', 'productId 가 없는 옛 주문');
  assert.equal(replayProductId(order('gone-product')), '', '상품 목록에 없는 id');
  assert.equal(replayProductId(order('')), '');
  assert.equal(replayProductId(null), '');
  assert.equal(replayProductId(undefined), '');
  assert.equal(replayHref(order('beads')), '');
});

test('다시 보기 — 내 다락방 주문 줄에만, 템플릿 주소를 그대로 쓴다', () => {
  assert.ok(mainJs.includes("import { REPLAY_LABEL, replayProductId } from './lib/order-replay.js';"));
  const row = mainJs.slice(mainJs.indexOf('class="order-row"'), mainJs.indexOf('class="order-row"') + 700);
  assert.ok(row.includes('${replay ?'), '리포트 주문일 때만 버튼');
  assert.ok(row.includes('class="btn btn--ghost order-row__replay"'), '주문 줄 버튼 클래스');
  assert.ok(row.includes('href="#/product/${replay}"'), '상품 리포트 주소');
  assert.ok(row.includes('${REPLAY_LABEL}'), '문구는 상수에서');
});

test('리포트 상단 — 「무료 결과로」는 사라지고 [이미지 저장] + 안내 한 줄만 남는다', () => {
  assert.ok(!mainJs.includes('무료 결과로'), '무료 결과로 버튼·문구가 남지 않는다');
  assert.ok(mainJs.includes('class="report-bar" data-capture-skip'), '상단 액션 바');
  assert.equal(SAVE_LABEL, '이미지 저장');
  assert.equal(SAVE_HINT, '저장해 두면 브라우저를 바꿔도 사라지지 않아요');

  const bar = mainJs.slice(mainJs.indexOf('class="report-bar"'), mainJs.indexOf('class="report-bar"') + 900);
  const btn = bar.indexOf('data-action="save-image"');
  const hint = bar.indexOf('report-bar__hint');
  assert.ok(btn > 0 && hint > btn, '이미지 저장 버튼 오른쪽에 안내 문구');
  assert.ok(bar.includes('${esc(SAVE_HINT)}'), '안내 문구는 상수에서');
  assert.ok(bar.indexOf('data-action="open-pay"') > 0, '잠금 상태에서는 결제 버튼');
});

test('리포트 상단 — 안내와 버튼이 좁은 화면에서도 한 줄에 붙어 있고 넘치지 않는다', () => {
  assert.match(css, /\.report-bar \{ display: flex; align-items: center;[^}]*flex-wrap: wrap;/);
  assert.match(css, /\.report-bar__hint \{ flex: 1 1 auto; min-width: 0;/);
  assert.match(css, /@media \(max-width: 560px\) \{[\s\S]*?\.report-bar \{ flex: 1 1 100%; \}[\s\S]*?\.report-bar__hint \{ flex: 1 1 0;/);
});

test('내 다락방 주문 줄 — 두 줄 배치로 주문번호가 길어도 넘치지 않는다', () => {
  assert.match(css, /\.order-row \{ display: flex; flex-direction: column;/);
  assert.match(css, /\.order-row__top \{ display: flex; align-items: baseline; justify-content: space-between;/);
  assert.match(css, /\.order-row__bottom \{ display: flex; align-items: center; justify-content: space-between;/);
  assert.match(css, /\.order-row__meta \{[^}]*overflow-wrap: anywhere;/);
  assert.match(css, /\.order-row__amount \{ white-space: nowrap;/);
  assert.match(css, /\.order-row__replay \{ flex: 0 0 auto;/);
});
