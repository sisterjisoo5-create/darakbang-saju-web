// 만세력 · 자미두수 엔진 자동 테스트
// 실행: npm test
//
// 검증 기준 (plan.md)
//   1992-10-15 07:33 여 → 임신 · 경술 · 갑자 · 무진
//   1997-06-17 08:00 남 → 정축 · 병오 · 경인 · 경진

import test from 'node:test';
import assert from 'node:assert';
import LunarJs from 'lunar-javascript';

import { computeChart, dayIndexFromDate, standardTimeOffset } from '../src/engine/saju.js';
import { computeJami } from '../src/engine/jami.js';
import { solarToLunar, lunarToSolar } from '../src/engine/lunarKo.js';

const { Solar } = LunarJs;
// node:test 의 assert diff 가 이 환경에서 문자열을 잘못 보고하는 경우가 있어,
// 비교는 직접 Object.is / JSON 비교로 하고 실패 시에만 Error 를 던진다.
function eq(actual, expected, msg = '') {
  if (!Object.is(actual, expected)) {
    throw new Error(`${msg} | 기대 ${JSON.stringify(expected)} · 실제 ${JSON.stringify(actual)}`);
  }
}
function deep(actual, expected, msg = '') {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${msg} | 기대 ${b} · 실제 ${a}`);
}

function chartOf(input) {
  const c = computeChart(input);
  eq(c.ok, true, (c.errors || []).join(', '));
  return c;
}

function jamiOf(c, gender) {
  return computeJami({
    lunarYear: c.lunar.y,
    lunarMonth: c.lunar.m,
    lunarDay: c.lunar.d,
    hourIndex: c.pillars.hour ? Math.floor(((c.corrected.h + 1) % 24) / 2) : null,
    gender,
    yearStem: c.yearStem,
  });
}

test('검증 케이스 1 — 1992-10-15 07:33 여 → 임신 · 경술 · 갑자 · 무진', () => {
  const c = chartOf({ calendar: 'solar', year: 1992, month: 10, day: 15, hour: 7, minute: 33, gender: 'female' });
  eq(c.summary, '임신 · 경술 · 갑자 · 무진');
  deep(c.ohaeng.count, { 목: 1, 화: 0, 토: 3, 금: 2, 수: 2 });
  eq(c.lunar.y, 1992);
  eq(c.lunar.m, 9);
  eq(c.lunar.d, 20);
  eq(c.hourLabel, '진시');
  eq(c.dii, '원숭이');
  eq(c.iljuAnimal, '푸른 쥐');
});

test('검증 케이스 2 — 1997-06-17 08:00 남 → 정축 · 병오 · 경인 · 경진', () => {
  const c = chartOf({ calendar: 'solar', year: 1997, month: 6, day: 17, hour: 8, minute: 0, gender: 'male' });
  eq(c.summary, '정축 · 병오 · 경인 · 경진');
  deep(c.ohaeng.count, { 목: 1, 화: 3, 토: 2, 금: 2, 수: 0 });
  eq(c.lunar.m, 5);
  eq(c.lunar.d, 13);
  eq(c.hourLabel, '진시');
  eq(c.dii, '소');
  eq(c.iljuAnimal, '하얀 호랑이');
});

test('일주 60갑자 — lunar-javascript 교차 검증 (1900~2049년 750건)', () => {
  let checked = 0;
  const stems = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
  const branches = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
  const hanToKo = {
    甲: '갑', 乙: '을', 丙: '병', 丁: '정', 戊: '무', 己: '기', 庚: '경', 辛: '신', 壬: '임', 癸: '계',
    子: '자', 丑: '축', 寅: '인', 卯: '묘', 辰: '진', 巳: '사', 午: '오', 未: '미', 申: '신', 酉: '유', 戌: '술', 亥: '해',
  };
  for (let y = 1900; y <= 2049; y += 1) {
    for (const [m, d] of [[1, 5], [3, 21], [6, 17], [10, 15], [12, 31]]) {
      const mine = dayIndexFromDate(y, m, d);
      const expected = `${stems[mine % 10]}${branches[mine % 12]}`;
      const loro = Solar.fromYmd(y, m, d).getLunar().getDayInGanZhi()
        .split('').map((ch) => hanToKo[ch] || ch).join('');
      eq(expected, loro, `${y}-${m}-${d} 일주`);
      checked += 1;
    }
  }
  eq(checked, 750);
});

test('년주·월주 — lunar-javascript 의 절기 기준 간지와 표본 전부 일치', () => {
  let n = 0;
  const hanToKo = {
    甲: '갑', 乙: '을', 丙: '병', 丁: '정', 戊: '무', 己: '기', 庚: '경', 辛: '신', 壬: '임', 癸: '계',
    子: '자', 丑: '축', 寅: '인', 卯: '묘', 辰: '진', 巳: '사', 午: '오', 未: '미', 申: '신', 酉: '유', 戌: '술', 亥: '해',
  };
  const ko = (s) => s.split('').map((ch) => hanToKo[ch] || ch).join('');
  for (let y = 1950; y <= 2049; y += 2) {
    for (const [m, d, h] of [[2, 4, 12], [5, 20, 9], [8, 8, 22], [11, 22, 3]]) {
      const c = chartOf({ calendar: 'solar', year: y, month: m, day: d, hour: h, minute: 0, gender: 'female' });
      const lunar = Solar.fromYmdHms(c.corrected.y, c.corrected.m, c.corrected.d, c.corrected.h, c.corrected.mi, 0).getLunar();
      const expect = `${ko(lunar.getYearInGanZhiExact())}${ko(lunar.getMonthInGanZhiExact())}`;
      eq(`${c.pillars.year.ko}${c.pillars.month.ko}`, expect, `${y}-${m}-${d} ${h}시`);
      n += 1;
    }
  }
  assert.ok(n >= 200, `비교 건수 ${n}`);
});

test('진태양시 보정 — 표준시 연혁', () => {
  eq(standardTimeOffset(1992, 10, 15), -30);
  eq(standardTimeOffset(1961, 8, 9), 0);
  eq(standardTimeOffset(1961, 8, 10), -30);
  eq(standardTimeOffset(1940, 3, 1), -30);
  eq(standardTimeOffset(1987, 7, 1), -90);
});

test('음력 → 양력 · 양력 → 음력 왕복', () => {
  for (const [y, m, d] of [[1992, 9, 20], [1997, 5, 13], [1900, 1, 1], [2049, 12, 1], [1988, 1, 1]]) {
    const s = lunarToSolar(y, m, d, false);
    assert.ok(s, `${y}-${m}-${d} 변환`);
    const back = solarToLunar(s.y, s.m, s.d);
    deep({ y: back.y, m: back.m, d: back.d }, { y, m, d });
  }
});

test('자미두수 — 1992-10-15 07:33 여: 명궁 午(천동·태음) · 부처궁 辰 공궁 · 재백궁 寅 공궁', () => {
  const c = chartOf({ calendar: 'solar', year: 1992, month: 10, day: 15, hour: 7, minute: 33, gender: 'female' });
  const j = jamiOf(c, 'female');
  eq(j.myeongBranch, '오');
  deep(j.myeongPalace.main.slice().sort(), ['천동', '태음'].sort());
  eq(j.gukName, '수이국');
  eq(j.ziweiBranch, '해');
  eq(j.bucheoPalace.branchKo, '진');
  eq(j.bucheoPalace.empty, true);
  deep(j.bucheoPalace.borrowed.slice().sort(), ['천량', '천기'].sort());
  eq(j.jaebaekPalace.branchKo, '인');
  deep(j.jaebaekPalace.borrowed.slice().sort(), ['거문', '태양'].sort());
  eq(j.sinBranch, '인');
  assert.ok(j.myeongPalace.lucky.includes('문창'));
});

test('자미두수 — 1997-06-17 08:00 남: 명궁 寅(자미·천부) · 부처궁 子(파군) · 재백궁 戌(무곡)', () => {
  const c = chartOf({ calendar: 'solar', year: 1997, month: 6, day: 17, hour: 8, minute: 0, gender: 'male' });
  const j = jamiOf(c, 'male');
  eq(j.myeongBranch, '인');
  deep(j.myeongPalace.main.slice().sort(), ['자미', '천부'].sort());
  eq(j.gukName, '금사국');
  eq(j.bucheoPalace.branchKo, '자');
  deep(j.bucheoPalace.main, ['파군']);
  eq(j.jaebaekPalace.branchKo, '술');
  deep(j.jaebaekPalace.main, ['무곡']);
  eq(j.gwanrokPalace.branchKo, '오');
  assert.ok(j.gwanrokPalace.main.includes('염정'));
  assert.ok(j.gwanrokPalace.main.includes('천상'));
  assert.ok(j.gwanrokPalace.lucky.includes('우필'));
  assert.ok(j.gwanrokPalace.lucky.includes('문창'));
  assert.ok(j.gwanrokPalace.lucky.includes('녹존'));
  eq(j.sinBranch, '술');
});

test('같은 입력 → 항상 같은 결과 (결정론)', () => {
  const input = { calendar: 'solar', year: 1991, month: 5, day: 7, hour: 20, minute: 0, gender: 'female' };
  const a = chartOf(input);
  const b = chartOf(input);
  eq(JSON.stringify(a.pillars), JSON.stringify(b.pillars));
  eq(a.daewoon.list[0].ko, b.daewoon.list[0].ko);
  eq(a.ohaeng.temp, b.ohaeng.temp);
});

test('시간 모름 — 시주 없이 원국 3주만 계산', () => {
  const c = chartOf({ calendar: 'solar', year: 1990, month: 1, day: 14, timeUnknown: true, gender: 'male' });
  eq(c.pillars.hour, null);
  eq(c.charCount, 6);
  eq(c.summary.split(' · ').length, 3);
});

test('음력 입력 — 1992년 9월 20일 = 1992-10-15', () => {
  const c = chartOf({ calendar: 'lunar', year: 1992, month: 9, day: 20, hour: 7, minute: 33, gender: 'female' });
  eq(`${c.solar.y}-${c.solar.m}-${c.solar.d}`, '1992-10-15');
  eq(c.summary, '임신 · 경술 · 갑자 · 무진');
});

test('대운 — 임신년 여자는 역행, 정미(22~31) → 병오(32~41)', () => {
  const c = chartOf({ calendar: 'solar', year: 1992, month: 10, day: 15, hour: 7, minute: 33, gender: 'female' });
  eq(c.daewoon.forward, false);
  eq(c.daewoon.startAge, 2);
  const joengmi = c.daewoon.list.find((d) => d.ko === '정미');
  const byeongo = c.daewoon.list.find((d) => d.ko === '병오');
  eq(joengmi && joengmi.fromAge, 22);
  eq(byeongo && byeongo.fromAge, 32);
});

test('월별 창 — 고정된 해가 아니라 열람한 달부터 열두 달', () => {
  const base = { calendar: 'solar', year: 1992, month: 10, day: 15, hour: 7, minute: 33, gender: 'female' };
  // 2027년 2월에 열람 → 2월(임인월)부터 이듬해 1월까지
  const feb = computeChart(base, { now: new Date('2027-02-10T03:00:00Z') });
  eq(feb.sewoon.basis.label, '2027년 2월');
  eq(feb.sewoon.fromLabel, '2027년 2월');
  eq(feb.sewoon.toLabel, '2028년 1월');
  eq(feb.sewoon.list.length, 12);
  eq(feb.sewoon.list[0].ko, '임인'); // 2027년 정월 = 임인월
  // 오늘(하드코딩 없음)로 만든 창도 언제나 열두 달
  const now = chartOf(base);
  eq(now.sewoon.list.length, 12);
});

test('범위 밖 입력은 친절한 오류', () => {
  const c = computeChart({ calendar: 'solar', year: 1800, month: 1, day: 1, gender: 'female' });
  eq(c.ok, false);
  assert.ok(c.errors.length > 0);
});
