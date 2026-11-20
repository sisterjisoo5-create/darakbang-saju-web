// 입력 화면 기본값 — 대한민국 현재 시각(Asia/Seoul)
// 실행: npm test
//
// 검증 기준 (plan.md)
//   · 저장된 기록이 없을 때 #/input 의 년·월·일·시·분은 고정 날짜가 아니라
//     접속한 시점의 대한민국 현재 시각으로 채워진다.
//   · 기기 시간대(로컬 TZ)가 무엇이든 Asia/Seoul 기준으로 계산한다.

import test from 'node:test';
import assert from 'node:assert';

import { seoulNow, defaultBirthInput } from '../src/engine/clock.js';
import { computeChart } from '../src/engine/saju.js';

function eq(actual, expected, msg = '') {
  if (!Object.is(actual, expected)) {
    throw new Error(`${msg} | 기대 ${JSON.stringify(expected)} · 실제 ${JSON.stringify(actual)}`);
  }
}

test('seoulNow — UTC 12:34 는 한국 시간 21:34', () => {
  const t = seoulNow(new Date('2026-11-20T12:34:00Z'));
  eq(t.year, 2026, '년');
  eq(t.month, 11, '월');
  eq(t.day, 20, '일');
  eq(t.hour, 21, '시');
  eq(t.minute, 34, '분');
});

test('seoulNow — 한국 시간 자정 경계는 날짜가 하루 넘어간다', () => {
  const t = seoulNow(new Date('2026-12-31T15:30:00Z')); // KST 2027-01-01 00:30
  eq(t.year, 2027, '년');
  eq(t.month, 1, '월');
  eq(t.day, 1, '일');
  eq(t.hour, 0, '시(0~23)');
  eq(t.minute, 30, '분');
});

test('seoulNow — 자정은 24가 아니라 0시', () => {
  const t = seoulNow(new Date('2026-07-01T15:00:00Z')); // KST 2026-07-02 00:00
  eq(t.hour, 0, '시');
});

test('defaultBirthInput — 기기 시간대와 무관하게 한국 현재 시각으로 채운다', () => {
  const now = new Date('2026-05-07T03:05:00Z'); // KST 2026-05-07 12:05
  const p = defaultBirthInput(now);
  eq(p.calendar, 'solar', '양력');
  eq(p.year, 2026, '년');
  eq(p.month, 5, '월');
  eq(p.day, 7, '일');
  eq(p.hour, 12, '시');
  eq(p.minute, 5, '분');
  eq(p.gender, 'female', '성별 기본값');
  eq(p.timeUnknown, false, '시간 모름 아님');
});

test('defaultBirthInput — 고정 날짜(1992-10-15 07:33)가 아니다', () => {
  const p = defaultBirthInput(new Date('2026-11-20T12:00:00Z'));
  assert.notStrictEqual(`${p.year}-${p.month}-${p.day}`, '1992-10-15');
  eq(p.hour, 21, '한국 시간 21시');
});

test('defaultBirthInput — 그대로 만세력 계산에 들어간다', () => {
  const p = defaultBirthInput(new Date('2026-11-20T12:34:00Z'));
  const c = computeChart(p);
  eq(c.ok, true, (c.errors || []).join(', '));
  eq(c.solar.y, 2026, '양력 년');
  eq(c.solar.m, 11, '양력 월');
  eq(c.solar.d, 20, '양력 일');
  eq(c.input.hour, 21, '입력 시');
});

test('defaultBirthInput — 로컬 TZ 를 바꿔도 같은 한국 시각', () => {
  const prev = process.env.TZ;
  const now = new Date('2026-11-20T12:34:00Z');
  const a = defaultBirthInput(now);
  process.env.TZ = 'America/New_York';
  const b = defaultBirthInput(now);
  process.env.TZ = 'UTC';
  const c = defaultBirthInput(now);
  if (prev === undefined) delete process.env.TZ;
  else process.env.TZ = prev;
  for (const p of [b, c]) {
    eq(p.hour, a.hour, '시');
    eq(p.day, a.day, '일');
  }
  eq(a.hour, 21, '한국 시간 21시');
});
