// 신년 시즌 상품 카드 — 이름·자리·12간지 자동 전환 회귀 테스트.
//
// 2026-11-22 시연 님 정정 지시:
//   "`[2027 신년 운세]` 매년 11~2월 1번 카드 자리 배치. 해당연도 숫자와 12간지로 캐릭터 변경.
//    3~10월 `[2027 신년 운세]` → `[일년 운세]`로 이름 변경 후 정통사주와 자리 교환."
//
// · 서울 기준 11·12·1·2월 = 신년 시즌 → 1번 카드 `{해} 신년 운세` + 그 해 띠
// · 서울 기준 3~10월 = 비시즌     → 1번 카드 정통 사주 해설, 정통 자리에 `일년 운세`
// · 리포트 본문의 월별 열두 달은 그대로 결제일 기준으로 움직인다 (rollingMonths)
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PRODUCTS, productsForCurrentMonth, productById,
  newYearSeasonOf, newYearTargetYear, newYearName, newYearChar, isNewYearSeason,
} from '../src/config/products.js';
import { buildReport } from '../src/content/report.js';
import { computeChart } from '../src/engine/saju.js';

const ME = { calendar: 'solar', year: 1991, month: 5, day: 7, hour: 18, minute: 22, gender: 'female', leap: false };
const chart = computeChart(ME);

const eq = (a, b, msg) => assert.equal(a, b, msg);
const ok = (v, msg) => assert.ok(v, msg);
const idAt = (list, i) => list[i].id;

/** 카드 12개의 id 순서 — 두 시즌 모두 이 뼈대에서 신년·정통만 자리를 바꾼다 */
const BASE = PRODUCTS.map((p) => p.id);

test('신년 시즌 판정 — 서울 기준 11·12·1·2월만 시즌', () => {
  for (const m of [11, 12, 1, 2]) ok(isNewYearSeason(m), `${m}월은 신년 시즌`);
  for (const m of [3, 4, 5, 6, 7, 8, 9, 10]) ok(!isNewYearSeason(m), `${m}월은 비시즌`);
  // 11~12월은 다음 해, 1~2월은 그해
  eq(newYearTargetYear(2026, 11), 2027, '2026-11 → 2027');
  eq(newYearTargetYear(2026, 12), 2027, '2026-12 → 2027');
  eq(newYearTargetYear(2027, 1), 2027, '2027-01 → 2027');
  eq(newYearTargetYear(2027, 2), 2027, '2027-02 → 2027');
  eq(newYearTargetYear(2027, 11), 2028, '2027-11 → 2028');
});

test('이름 규칙 — 시즌은 `{해} 신년 운세`, 3~10월은 `일년 운세`', () => {
  eq(newYearName(2026, 11), '2027 신년 운세');
  eq(newYearName(2027, 2), '2027 신년 운세');
  eq(newYearName(2027, 5), '일년 운세');
  eq(newYearName(2027, 10), '일년 운세');
  eq(newYearName(2027, 11), '2028 신년 운세');
  // 캐릭터는 그 해 띠 (2027 정미년 양, 2028 무신년 원숭이)
  eq(newYearChar(2027, 2), 'sheep');
  eq(newYearChar(2027, 11), 'monkey');
  eq(newYearChar(2027, 5), 'sheep', '일년 운세도 그해(2027) 띠를 따른다');
});

test('2026년 11월(신년 시즌) — 1번 `2027 신년 운세`(양), 정통 사주는 마지막 줄 왼쪽', () => {
  const now = new Date('2026-11-22T12:00:00Z'); // 서울 11/22 21:00
  const s = newYearSeasonOf(now);
  eq(s.month, 11);
  eq(s.season, true);
  eq(s.name, '2027 신년 운세');
  eq(s.char, 'sheep');

  const list = productsForCurrentMonth(now);
  eq(list.length, 12);
  eq(idAt(list, 0), 'newyear');
  eq(list[0].name, '2027 신년 운세', '1번 카드 이름');
  eq(list[0].char, 'sheep', '1번 카드 캐릭터(양)');
  eq(idAt(list, 10), 'saju', '정통 사주는 신년 카드가 있던 자리(마지막 줄 왼쪽)');
  eq(list[10].name, '정통 사주 해설');
  eq(list[10].char, 'jani');
  eq(idAt(list, 11), 'lifetime', '평생 종합 리포트는 그대로 마지막');
  // 나머지 카드 순서는 같다
  eq(list.filter((p) => !['newyear', 'saju'].includes(p.id)).map((p) => p.id).join(','),
    BASE.filter((id) => !['newyear', 'saju'].includes(id)).join(','));
});

test('2027년 2월 — 여전히 신년 시즌, 1번 `2027 신년 운세`', () => {
  const now = new Date('2027-02-10T10:00:00+09:00');
  const list = productsForCurrentMonth(now);
  eq(idAt(list, 0), 'newyear');
  eq(list[0].name, '2027 신년 운세');
  eq(list[0].char, 'sheep');
  eq(idAt(list, 10), 'saju');
  eq(idAt(list, 11), 'lifetime');
});

test('2027년 5월(비시즌) — 1번 정통 사주, 정통 자리에 `일년 운세`(연도 없음)', () => {
  const now = new Date('2027-05-15T00:00:00Z'); // 서울 5/15 09:00
  const s = newYearSeasonOf(now);
  eq(s.season, false);
  eq(s.name, '일년 운세');
  eq(s.char, 'sheep', '2027년의 띠는 양');

  const list = productsForCurrentMonth(now);
  eq(idAt(list, 0), 'saju', '1번 카드는 정통 사주 해설');
  eq(list[0].name, '정통 사주 해설');
  eq(list[0].char, 'jani');
  eq(idAt(list, 10), 'newyear', '신년 카드는 정통 사주 자리로');
  eq(list[10].name, '일년 운세', '연도를 붙이지 않는다');
  eq(list[10].char, 'sheep');
  eq(idAt(list, 11), 'lifetime');
});

test('2027년 11월 — 다음 해 `2028 신년 운세` + 원숭이', () => {
  const now = new Date('2027-11-20T12:00:00Z');
  const list = productsForCurrentMonth(now);
  eq(idAt(list, 0), 'newyear');
  eq(list[0].name, '2028 신년 운세');
  eq(list[0].char, 'monkey', '2028 무신년 = 원숭이');
  eq(idAt(list, 10), 'saju');
});

test('해가 바뀌는 경계 — 서울 날짜로 12/31 16:00Z는 1월 신년 시즌, 2/28 15:00Z는 3월 비시즌', () => {
  const jan = productsForCurrentMonth(new Date('2026-12-31T16:00:00Z')); // 서울 2027-01-01 01:00
  eq(jan[0].id, 'newyear');
  eq(jan[0].name, '2027 신년 운세');

  const mar = productsForCurrentMonth(new Date('2027-02-28T15:00:00Z')); // 서울 2027-03-01 00:00
  eq(mar[0].id, 'saju');
  eq(mar[10].name, '일년 운세');
});

test('리포트 제목도 같은 이름 — 카드와 리포트가 어긋나지 않는다', () => {
  const nov = buildReport('newyear', chart, { now: new Date('2026-11-22T12:00:00Z') });
  eq(nov.title, '2027 신년 운세');

  const feb = buildReport('newyear', chart, { now: new Date('2027-02-10T10:00:00+09:00') });
  eq(feb.title, '2027 신년 운세');

  const may = buildReport('newyear', chart, { now: new Date('2027-05-15T00:00:00Z') });
  eq(may.title, '일년 운세');
  // 본문의 월별 열두 달은 시즌과 무관하게 결제일 기준 그대로 (27.05 ~ 28.04)
  ok(may.subtitle.includes('2027년 5월 ~ 2028년 4월'), `부제 ${may.subtitle}`);
  const monthSec = may.sections.find((s) => s.id === 'ny-months');
  const bar = monthSec.blocks.find((b) => b.t === 'bar');
  eq(bar.v.length, 12);
  eq(bar.v[0].label, '27.05');
  eq(bar.v[11].label, '28.04');

  const next = buildReport('newyear', chart, { now: new Date('2027-11-20T12:00:00Z') });
  eq(next.title, '2028 신년 운세');
});

test('상품 상세·결제 이름도 시즌 이름을 쓴다 (productById)', () => {
  eq(productById('newyear', new Date('2026-11-22T12:00:00Z')).name, '2027 신년 운세');
  eq(productById('newyear', new Date('2027-05-15T00:00:00Z')).name, '일년 운세');
  eq(productById('saju').name, '정통 사주 해설', '다른 상품 이름은 그대로');
  eq(productById('nope'), undefined);
});
