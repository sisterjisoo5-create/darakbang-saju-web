// 미결제(잠금) 공개 정책 회귀 테스트 — 2026-11-23 시연 님 지시
// 실행: npm test
//
// 지키려는 것
//  ① 12종 유료 상품 + 평생 종합 리포트 전부, 미결제 상태에서
//     첫 카드(인덱스 0)만 맛보기 1~2블록 — 표·리스트·막대·12궁 차트·점수·박스는 통째로 내보내지 않는다
//  ② 두 번째 카드부터는 제목만 남고 본문(visible)은 무조건 0블록
//  ③ freeBlocks가 비어 있는(null/undefined) 섹션이 있어도 99개로 통째로 열리지 않는다 (닫히는 쪽으로 실패)
//  ④ 결제 후(unlocked)에는 모든 카드의 모든 블록이 그대로 남아 있다 — 잠금이 본문을 지우지 않는다

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeChart } from '../src/engine/saju.js';
import { computeJami } from '../src/engine/jami.js';
import { buildReport } from '../src/content/report.js';
import { PRODUCTS } from '../src/config/products.js';
import { zodiacIljuSections } from '../src/content/zodiac-ilju.js';
import {
  MAX_PREVIEW_BLOCKS,
  PREVIEW_BLOCK_TYPES,
  previewBlockCount,
  splitLockedSection,
  isSectionLocked,
  lockSections,
} from '../src/content/lock-policy.js';

const BULK_TYPES = ['li', 'kv', 'bar', 'table', 'score', 'jami', 'box'];

/** 서로 다른 명식 다섯 개 — 계산 갈래(시간 미상·시주 있음·역행 대운 등)를 함께 지난다 */
const CHARTS = [
  { calendar: 'solar', year: 1992, month: 10, day: 15, hour: 7, minute: 33, gender: 'female' },
  { calendar: 'solar', year: 1985, month: 12, day: 31, hour: 23, minute: 10, gender: 'female' },
  { calendar: 'solar', year: 2000, month: 1, day: 1, hour: 0, minute: 30, gender: 'male' },
  { calendar: 'solar', year: 1976, month: 6, day: 5, hour: 14, minute: 0, gender: 'female' },
  { calendar: 'solar', year: 1997, month: 3, day: 30, timeUnknown: true, gender: 'male' },
];
const PARTNER = { calendar: 'solar', year: 1990, month: 5, day: 2, hour: 11, minute: 10, gender: 'male' };
const BIAS = { calendar: 'solar', year: 2004, month: 8, day: 31, timeUnknown: true, gender: 'female' };

function chartOf(input) {
  const c = computeChart(input);
  assert.ok(c.ok, (c.errors || []).join(', '));
  return c;
}
function jamiOf(c, gender = 'female') {
  return computeJami({
    lunarYear: c.lunar.y,
    lunarMonth: c.lunar.m,
    lunarDay: c.lunar.d,
    hourIndex: c.pillars.hour ? Math.floor(((c.corrected.h + 1) % 24) / 2) : null,
    gender,
    yearStem: c.yearStem,
  });
}

const PAID_PRODUCTS = PRODUCTS.map((p) => p.id);
const partnerChart = chartOf(PARTNER);
const biasChart = chartOf(BIAS);

/** 한 명식으로 상품 하나의 리포트를 만든다 — 상대·최애·자미두수 입력도 함께 넣는다 */
function reportFor(id, chart, { jami } = {}) {
  return buildReport(id, chart, {
    jami: jami || jamiOf(chart, chart.input.gender === 'male' ? 'male' : 'female'),
    partner: partnerChart,
    partnerJami: jamiOf(partnerChart, 'male'),
    bias: biasChart,
    biasName: '테스트',
    now: new Date('2026-11-23T10:00:00+09:00'),
  });
}

test('상품 목록 — 12종 유료 상품 전부를 전수 점검 대상으로 잡는다', () => {
  assert.equal(PAID_PRODUCTS.length, 12);
  for (const id of ['saju', 'compat', 'bias', 'zodiac-ilju', 'newyear', 'daewoon', 'love', 'reunion', 'wealth', 'jami', 'career', 'lifetime']) {
    assert.ok(PAID_PRODUCTS.includes(id), `${id} 상품이 없다`);
  }
});

test('전 상품 · 전 명식 — 첫 카드 맛보기만, 두 번째 카드부터 visible 0블록', () => {
  for (const input of CHARTS) {
    const chart = chartOf(input);
    for (const id of PAID_PRODUCTS) {
      const r = reportFor(id, chart);
      assert.ok(r, `${id} 리포트 없음`);
      assert.ok(Array.isArray(r.sections) && r.sections.length > 0, `${id} 섹션 없음`);
      r.sections.forEach((sec, index) => {
        assert.ok(Number.isInteger(sec.freeBlocks), `${id}/${sec.id} freeBlocks 누락 — ${sec.freeBlocks}`);
        assert.ok(sec.blocks.length > 0, `${id}/${sec.id} 블록 없음`);
        const { visible, hidden, freeCount } = splitLockedSection(sec, index);
        assert.equal(freeCount, sec.freeBlocks, `${id}/${sec.id} 정책과 값이 다르다`);
        if (index === 0) {
          assert.ok(visible.length <= MAX_PREVIEW_BLOCKS, `${id}/${sec.id} 첫 카드 공개 ${visible.length}블록`);
          for (const b of visible) {
            assert.ok(PREVIEW_BLOCK_TYPES.has(b.t), `${id}/${sec.id} 첫 카드에 통째 블록(${b.t}) 노출`);
            assert.ok(!BULK_TYPES.includes(b.t), `${id}/${sec.id} 첫 카드에 ${b.t} 노출`);
          }
          // 맛보기는 언제나 카드의 앞에서부터 — 중간 블록만 튀어나오지 않는다
          assert.deepEqual(visible, sec.blocks.slice(0, visible.length), `${id}/${sec.id} 맛보기 순서`);
        } else {
          assert.equal(visible.length, 0, `${id}/${sec.id} 두 번째 카드에 본문 ${visible.length}블록 노출`);
          assert.equal(sec.freeBlocks, 0, `${id}/${sec.id} freeBlocks`);
          assert.equal(hidden.length, sec.blocks.length, `${id}/${sec.id} 가려진 블록 수`);
          assert.equal(isSectionLocked(sec, index), true, `${id}/${sec.id} 잠금 표시 없음`);
        }
      });
    }
  }
});

test('평생 종합 리포트 — 15장 전부, 2장부터 잠긴다', () => {
  const chart = chartOf(CHARTS[0]);
  const r = reportFor('lifetime', chart);
  assert.ok(r.sections.length >= 15, `섹션 ${r.sections.length}`);
  assert.equal(r.sections[0].id, 'wonyouk');
  assert.equal(r.sections[0].freeBlocks, 2, '원국 카드 맛보기 두 블록');
  for (const sec of r.sections.slice(1)) {
    assert.equal(splitLockedSection(sec, r.sections.indexOf(sec)).visible.length, 0, `${sec.id}`);
  }
});

test('원국 카드 — 맛보기는 원국 그림 + 한 줄까지, 인용문부터는 잠근다', () => {
  const chart = chartOf(CHARTS[0]);
  for (const id of ['saju', 'newyear', 'daewoon', 'lifetime']) {
    const r = reportFor(id, chart);
    const first = r.sections[0];
    assert.equal(first.id, 'wonyouk', `${id} 첫 카드`);
    assert.equal(first.freeBlocks, 2, `${id} 원국 맛보기`);
    assert.deepEqual(splitLockedSection(first, 0).visible.map((b) => b.t), ['ming', 'oneline'], `${id} 원국 공개 블록`);
  }
});

test('자미두수 — 12궁 명반판(jami)과 12행 표가 미결제에 노출되지 않는다', () => {
  const chart = chartOf(CHARTS[0]);
  for (const id of ['jami', 'lifetime']) {
    const r = reportFor(id, chart);
    const jamiSecs = r.sections.filter((s) => s.blocks.some((b) => b.t === 'jami'));
    assert.ok(jamiSecs.length > 0, `${id} 자미두수 카드 없음`);
    for (const sec of jamiSecs) {
      const index = r.sections.indexOf(sec);
      const { visible } = splitLockedSection(sec, index);
      assert.equal(visible.some((b) => b.t === 'jami'), false, `${id}/${sec.id} 12궁 차트 노출`);
      if (index > 0) assert.equal(visible.length, 0, `${id}/${sec.id} 자미두수 본문 노출`);
    }
  }
});

test('최애궁합 — TOP 3 리스트·첫 만남·연애 궁합 3장이 통째로 열리지 않는다', () => {
  const chart = chartOf(CHARTS[0]);
  const r = reportFor('bias', chart);
  r.sections.forEach((sec, index) => {
    const { visible } = splitLockedSection(sec, index);
    assert.equal(visible.some((b) => b.t === 'li'), false, `${sec.id} 리스트 노출`);
    assert.equal(visible.some((b) => b.t === 'box'), false, `${sec.id} 박스 노출`);
    assert.equal(visible.some((b) => b.t === 'kv'), false, `${sec.id} 표 노출`);
  });
});

test('신년·대운 — 월별 12개 표와 대운 표가 미결제에 노출되지 않는다', () => {
  const chart = chartOf(CHARTS[0]);
  for (const id of ['newyear', 'daewoon']) {
    const r = reportFor(id, chart);
    for (const [index, sec] of r.sections.entries()) {
      const { visible } = splitLockedSection(sec, index);
      assert.equal(visible.some((b) => b.t === 'table' || b.t === 'bar'), false, `${id}/${sec.id} 표·막대 노출`);
    }
  }
});

test('freeBlocks가 빠진 섹션은 99로 열리지 않는다 — 정책은 닫히는 쪽으로 실패', () => {
  const bare = { id: 'x', heading: 'x', blocks: [{ t: 'p', v: '한 줄' }, { t: 'table', head: ['a'], rows: [[1]] }, { t: 'p', v: '둘' }] };
  assert.equal(previewBlockCount(bare.blocks, undefined), 1, '앞의 글 한 줄까지만');
  assert.equal(splitLockedSection(bare, 0).visible.length, 1);
  assert.equal(splitLockedSection({ ...bare, freeBlocks: undefined }, 1).visible.length, 0, '두 번째 카드는 0');
  assert.equal(splitLockedSection({ ...bare, freeBlocks: 99 }, 1).visible.length, 0, '99도 두 번째 카드는 0');
  // 첫 카드라도 표·리스트·차트가 먼저 오면 0블록에서 멈춘다
  const bulkFirst = { id: 'y', blocks: [{ t: 'kv', v: [['a', 'b']] }, { t: 'p', v: '글' }], freeBlocks: 2 };
  assert.equal(splitLockedSection(bulkFirst, 0).visible.length, 0);
  const tableSecond = { id: 'z', blocks: [{ t: 'p', v: '글' }, { t: 'table', head: ['a'], rows: [[1]] }], freeBlocks: 2 };
  assert.equal(splitLockedSection(tableSecond, 0).visible.length, 1, '표 앞에서 멈춘다');
  // 정책을 입혀도 블록은 지우지 않는다 (결제 후 전부 보여야 한다)
  const trimmed = lockSections([bare])[0];
  assert.equal(trimmed.blocks.length, 3, '잠금이 본문을 지우면 안 된다');
});

test('미결제 잠금이 본문을 지우지 않는다 — 모든 카드의 블록이 결제 후에도 그대로', () => {
  const chart = chartOf(CHARTS[0]);
  for (const id of PAID_PRODUCTS) {
    const r = reportFor(id, chart);
    const total = r.sections.reduce((n, s) => n + s.blocks.length, 0);
    const shown = r.sections.reduce((n, s, i) => n + splitLockedSection(s, i).visible.length, 0);
    assert.ok(total > shown, `${id} 잠긴 블록이 없다`);
    assert.equal(r.sections.every((s) => Array.isArray(s.blocks) && s.blocks.length > 0), true);
  }
});

test('12띠 × 일주동물 — 144조합 모두 두 번째 카드부터 0블록', () => {
  const branches = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  let combos = 0;
  for (const yearBranch of branches) {
    for (const dayBranch of branches) {
      const secs = lockSections(zodiacIljuSections({ yearBranch, dayBranch }, { freeBlocks: 2 }));
      assert.equal(secs.length, 3);
      combos += 1;
      secs.forEach((sec, index) => {
        const { visible } = splitLockedSection(sec, index);
        if (index === 0) {
          assert.ok(visible.length <= 2, `첫 카드 ${visible.length}`);
          assert.equal(visible.some((b) => b.t === 'kv'), false, '첫 카드 표 노출');
        } else {
          assert.equal(visible.length, 0, `조합 ${yearBranch}/${dayBranch} ${sec.id} 노출`);
        }
      });
    }
  }
  assert.equal(combos, 144);
});
