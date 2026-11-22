// 검수용 비밀 미리보기(?preview=3f990) 회귀 테스트 — 일반 모드 / 미리보기 모드
// 실행: npm test
//
// 지키려는 것
//  ① 일반 방문자(파라미터·저장 표식 없음)는 12종 유료 리포트가 전부 잠겨 있다 — 기존과 100% 동일
//  ② 주소 뒤 `?preview=3f990` 으로만 켜지고, sessionStorage 로 화면 이동·새로고침 동안 유지된다
//  ③ 잘못된 코드는 켜지지 않고, 이미 켜 둔 표식도 지운다(안전한 쪽으로 실패)
//  ④ 미리보기 중에는 결제 기록과 무관하게 12종이 모두 열리되, 결제·주문 데이터는 건드리지 않는다
//  ⑤ 화면에는 코드 입력 버튼·힌트가 없고, 배지('검수용 미리보기 모드')는 미리보기일 때만 붙는다

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  PREVIEW_PARAM,
  PREVIEW_CODE,
  PREVIEW_STORAGE_KEY,
  PREVIEW_BADGE,
  PREVIEW_BADGE_NOTE,
  isPreviewCode,
  previewParamValue,
  readPreviewFlag,
  writePreviewFlag,
  clearPreviewFlag,
  resolvePreview,
  resolveUnlocked,
} from '../src/config/preview.js';
import { PRODUCTS } from '../src/config/products.js';

/* 테스트용 sessionStorage 대역 */
function fakeStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

test('비밀 코드 · 쿼리 이름 · 저장 키', () => {
  assert.equal(PREVIEW_CODE, '3f990');
  assert.equal(PREVIEW_PARAM, 'preview');
  assert.equal(PREVIEW_STORAGE_KEY, 'darakbang.preview');
  assert.equal(PREVIEW_BADGE, '검수용 미리보기 모드');
  assert.ok(PREVIEW_BADGE_NOTE.length > 0);
});

test('코드 판정은 정확히 일치할 때만 — 대소문자·공백·부분 일치 거부', () => {
  assert.equal(isPreviewCode('3f990'), true);
  for (const bad of ['3F990', ' 3f990', '3f990 ', '3f9900', '3f99', 'preview', '', null, undefined, 3990]) {
    assert.equal(isPreviewCode(bad), false, `${String(bad)} 는 통과하면 안 된다`);
  }
});

test('주소 파싱 — 파라미터 없음 / 빈 값 / 다른 파라미터', () => {
  assert.equal(previewParamValue(''), null);
  assert.equal(previewParamValue('?pay=portone&paymentId=DRK-1'), null);
  assert.equal(previewParamValue('?preview='), '');
  assert.equal(previewParamValue('?preview=3f990'), '3f990');
  assert.equal(previewParamValue('?a=1&preview=3f990&b=2'), '3f990');
  assert.equal(previewParamValue(null), null);
});

test('저장 표식 읽기·쓰기·지우기 — 저장소가 없거나 막혀도 조용히 넘어간다', () => {
  const s = fakeStorage();
  assert.equal(readPreviewFlag(s), '');
  assert.equal(writePreviewFlag(s), true);
  assert.equal(readPreviewFlag(s), PREVIEW_CODE);
  assert.equal(clearPreviewFlag(s), true);
  assert.equal(readPreviewFlag(s), '');
  assert.equal(readPreviewFlag(null), '');
  assert.equal(writePreviewFlag(null), false);
  assert.equal(clearPreviewFlag(null), false);
  const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  assert.equal(readPreviewFlag(broken), '');
  assert.equal(resolvePreview({ search: '?preview=3f990', storage: broken }), true, '저장소가 막혀도 주소로는 켜진다');
});

test('일반 방문자 — 파라미터도 표식도 없으면 미리보기는 꺼져 있다', () => {
  const s = fakeStorage();
  assert.equal(resolvePreview({ search: '', storage: s }), false);
  assert.equal(resolvePreview({ search: '?pay=portone', storage: s }), false);
  assert.equal(s.map.size, 0, '일반 방문의 저장소에 아무것도 쓰지 않는다');
});

test('?preview=3f990 으로 켜지고, 표식이 남아 화면 이동·새로고침 뒤에도 유지된다', () => {
  const s = fakeStorage();
  assert.equal(resolvePreview({ search: '?preview=3f990', storage: s }), true);
  assert.equal(readPreviewFlag(s), PREVIEW_CODE);
  // 해시 라우팅으로 화면만 옮겨 주소에 남은 파라미터가 다시 전달되지 않는 경우
  assert.equal(resolvePreview({ search: '?pay=portone', storage: s }), true);
  assert.equal(resolvePreview({ search: '', storage: s }), true);
});

test('잘못된 코드 — 켜지지 않고, 남아 있던 표식도 지운다', () => {
  const s = fakeStorage({ [PREVIEW_STORAGE_KEY]: PREVIEW_CODE });
  assert.equal(resolvePreview({ search: '?preview=0000', storage: s }), false);
  assert.equal(readPreviewFlag(s), '', '잘못된 코드 뒤에는 표식이 남지 않는다');
  assert.equal(resolvePreview({ search: '', storage: s }), false);

  const empty = fakeStorage({ [PREVIEW_STORAGE_KEY]: PREVIEW_CODE });
  assert.equal(resolvePreview({ search: '?preview=', storage: empty }), false);
  assert.equal(readPreviewFlag(empty), '');
});

test('상품 12종 — 일반 모드는 전부 잠김, 미리보기는 전부 열림, 유료 열람은 그 상품만', () => {
  assert.equal(PRODUCTS.length, 12, '유료 리포트는 12종');

  for (const p of PRODUCTS) {
    assert.deepEqual(resolveUnlocked({ unlocks: {}, productId: p.id }), { unlocked: false, via: 'locked' }, `${p.id} 는 일반 모드에서 잠겨 있어야 한다`);
    assert.deepEqual(resolveUnlocked({ previewActive: true, unlocks: {}, productId: p.id }), { unlocked: true, via: 'preview' });
  }

  const paid = { saju: 'DRK-1' };
  assert.deepEqual(resolveUnlocked({ unlocks: paid, productId: 'saju' }), { unlocked: true, via: 'paid' });
  assert.deepEqual(resolveUnlocked({ unlocks: paid, productId: 'love' }), { unlocked: false, via: 'locked' });
  // 미리보기가 꺼지면 유료 열람 기록만 남는다
  assert.deepEqual(resolveUnlocked({ previewActive: false, unlocks: paid, productId: 'saju' }), { unlocked: true, via: 'paid' });
});

test('미리보기는 결제·주문 데이터를 건드리지 않는다', () => {
  const unlocks = { saju: 'DRK-1' };
  const snapshot = JSON.stringify(unlocks);
  for (const p of PRODUCTS) resolveUnlocked({ previewActive: true, unlocks, productId: p.id });
  assert.equal(JSON.stringify(unlocks), snapshot);
});

test('main.js — 배지는 미리보기일 때만, 코드 입력·힌트 같은 노출은 없다', () => {
  const src = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

  // 배지 — preview.active 가 아닐 때 빈 문자열을 돌려주는 함수 하나로만 들어간다
  assert.match(src, /function previewStripHTML\(\) \{\s*if \(!preview\.active\) return '';/);
  assert.match(src, /<div class="preview-strip">/);
  assert.ok(src.includes('</div>${previewStripHTML()}'), '헤더에만 배지를 붙인다');

  // 잠금 판정은 미리보기 여부를 인자로 넘겨 기존 unlocks 판정을 그대로 쓴다
  assert.match(src, /resolveUnlocked\(\{ previewActive: preview\.active, unlocks: state\.data\.unlocks, productId \}\)/);

  // 표식은 sessionStorage (탭을 닫으면 사라진다) — localStorage 아님
  assert.match(src, /window\.sessionStorage/);
  assert.equal(/localStorage\.(getItem|setItem)\(PREVIEW_STORAGE_KEY/.test(src), false);

  // 화면에 코드 입력칸·안내 링크·버튼을 두지 않는다
  assert.equal(/data-action="preview/.test(src), false);
  assert.equal(/미리보기 코드|코드 입력|preview code/i.test(src), false);
  assert.equal(/href="[^"]*preview=/.test(src), false);
});
