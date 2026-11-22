// 유료 리포트 — 「오늘의 다락방 처방」 섹션 제거 회귀 검사 (2026-11-22 시연 님 지시)
// 990원 리포트 12종 + 평생 종합 리포트 어디에도 TODAY 처방 카드가 남지 않는다.
// 실행: npm test
import test from 'node:test';
import assert from 'node:assert/strict';

import { computeChart } from '../src/engine/saju.js';
import { computeJami } from '../src/engine/jami.js';
import { buildReport } from '../src/content/report.js';
import { PRODUCTS } from '../src/config/products.js';

const ME = { calendar: 'solar', year: 1991, month: 5, day: 7, hour: 18, minute: 22, gender: 'female' };
const PARTNER = { calendar: 'solar', year: 1997, month: 6, day: 17, hour: 8, minute: 0, gender: 'male' };
const BIAS = { calendar: 'solar', year: 1997, month: 3, day: 30, timeUnknown: true, gender: 'male' };

const chart = computeChart(ME);
const partner = computeChart(PARTNER);
const bias = computeChart(BIAS);
const jami = computeJami({
  lunarYear: chart.lunar.y,
  lunarMonth: chart.lunar.m,
  lunarDay: chart.lunar.d,
  hourIndex: Math.floor(((chart.corrected.h + 1) % 24) / 2),
  gender: 'female',
  yearStem: chart.yearStem,
});

const extras = { jami, partner, partnerJami: null, bias, biasName: '차은우', now: new Date('2026-11-22T19:50:00+09:00') };

/** 화면에 그려질 모든 문구 */
function reportText(report) {
  return report.sections
    .map((sec) => [sec.heading, ...sec.blocks.map((b) => (Array.isArray(b.v) ? b.v.flat().join(' ') : b.v || ''))].join(' '))
    .join(' ');
}

test('유료 리포트 12종 + 평생 리포트 — TODAY 처방 섹션이 하나도 없다', () => {
  assert.equal(PRODUCTS.length, 12, '상품 12종');
  for (const product of PRODUCTS) {
    const report = buildReport(product.id, chart, extras);
    assert.ok(report, `${product.id} 리포트가 만들어지지 않는다`);
    assert.ok(!report.sections.some((s) => s.id === 'today'), `${product.id} 에 today 섹션이 남아 있다`);
    const text = reportText(report);
    assert.ok(!text.includes('오늘의 다락방 처방'), `${product.id} 문구에 오늘의 다락방 처방이 남아 있다`);
    assert.ok(!text.includes('오늘의 일진'), `${product.id} 에 오늘의 일진이 남아 있다`);
    // 지난 카드가 사라진 만큼 마지막 섹션은 리포트 고유 내용이어야 한다
    const last = report.sections[report.sections.length - 1];
    assert.notEqual(last.id, 'today', `${product.id} 마지막 섹션`);
  }
});

test('최애궁합 — 오늘 처방(행운 색·숫자) 대신 궁합 내용 네 장으로 끝난다', () => {
  const report = buildReport('bias', chart, extras);
  assert.deepEqual(report.sections.map((s) => s.id), ['bi-ideal', 'bi-top3', 'bi-us', 'bi-long']);
  const text = reportText(report);
  assert.ok(!text.includes('행운의 색'), '행운의 색 카드가 남아 있다');
  assert.ok(!text.includes('행운의 숫자'), '행운의 숫자 카드가 남아 있다');
});

test('처방 문구는 지우지 않고 보관한다 — 무료 원국·앱 위젯용', async () => {
  const report = await import('../src/content/report.js');
  assert.equal(typeof report.secToday, 'function', 'secToday 계산은 보관');
  const today = report.secToday(chart, new Date('2026-11-22T19:50:00+09:00'));
  assert.equal(today.heading, '오늘의 다락방 처방');
  assert.ok(today.blocks.length >= 2);
});
