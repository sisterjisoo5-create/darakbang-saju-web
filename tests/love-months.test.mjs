// 연애운 · 사랑운 — 결제일 기준 앞뒤 월별 인연 타이밍 (2026-11-22 시연 님 요청)
//
//   · 월건(月建)은 절기 기준이다 — 1월은 전년도 술년의 축월, 2월이 인월.
//   · 창은 결제일(오늘, 서울) 기준 지난 3개월 + 이번 달 + 앞으로 6개월 = 열 달.
//   · 달마다 배우자성(여자 관성 · 남자 재성)과 일지 합·충·형·파·원진으로 결을 정한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeChart, monthlyFlow, sipsungOf } from '../src/engine/saju.js';
import { branchRelation } from '../src/engine/compat.js';
import { STEMS, BRANCHES } from '../src/engine/constants.js';
import { monthPillar, monthPillarWindow, addMonths, monthOrderOf } from '../src/engine/month-pillar.js';
import { loveMonthTiming, loveMonthLine, spouseStars, LOVE_WINDOW, LOVE_TIERS } from '../src/content/love-months.js';
import { loveSections } from '../src/content/report-extra.js';

const mainJs = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

const ME = { calendar: 'solar', year: 1991, month: 5, day: 7, hour: 18, minute: 22, gender: 'female', leap: false };
/** 이번 달이 2026년 11월인 시점 (서울 21시) */
const NOW = new Date('2026-11-22T12:00:00Z');

test('월건 — 달력 1월은 전년도 술년의 축월, 2월이 인월이다', () => {
  assert.equal(monthOrderOf(1), 11, '1월 = 술년의 열두 번째 달(축월)');
  assert.equal(monthOrderOf(2), 0, '2월 = 인월');
  assert.equal(monthOrderOf(12), 10, '12월 = 자월');

  // 병오년(2026) — 인월 경인, …, 12월 경자, 다음 해 1월 신축
  assert.equal(monthPillar(2026, 2).ko, '경인');
  assert.equal(monthPillar(2026, 11).ko, '기해');
  assert.equal(monthPillar(2026, 12).ko, '경자');
  assert.equal(monthPillar(2027, 1).ko, '신축');
  assert.equal(monthPillar(2027, 1).sajuYear, 2026, '1월은 전년도 술년 소속');
  // 정미년(2027) — 인월 임인
  assert.equal(monthPillar(2027, 2).ko, '임인');
  // 한자·오행도 함께
  assert.equal(monthPillar(2026, 12).han, '庚子');
  assert.equal(monthPillar(2026, 12).stemOhaeng, '금');
  assert.equal(monthPillar(2026, 12).branchOhaeng, '수');
});

test('월건 — 기존 monthlyFlow(절기 12달)와 같은 값이 나온다', () => {
  const flow = monthlyFlow(2026, 0).list;
  for (let m = 2; m <= 12; m += 1) {
    assert.equal(monthPillar(2026, m).ko, flow[m - 2].ko, `2026년 ${m}월 월건`);
  }
  // 소한(1월)은 같은 술년의 마지막 달
  assert.equal(monthPillar(2027, 1).ko, flow[11].ko, '2027년 1월 = 2026년 술년의 축월');
});

test('월건 창 — 연도를 넘어가도 이어서 세운다', () => {
  assert.deepEqual(addMonths(2026, 11, 3), { year: 2027, month: 2 });
  assert.deepEqual(addMonths(2026, 2, -3), { year: 2025, month: 11 });
  const win = monthPillarWindow(2026, 11, 4);
  assert.deepEqual(win.map((m) => m.label), ['2026년 11월', '2026년 12월', '2027년 1월', '2027년 2월']);
  assert.deepEqual(win.map((m) => m.ko), ['기해', '경자', '신축', '임인']);
});

test('연애 월별 인연 — 결제일 기준 지난 3개월 + 이번 달 + 앞으로 6개월', () => {
  const chart = computeChart(ME);
  const t = loveMonthTiming(chart, { now: NOW });
  assert.equal(LOVE_WINDOW.past, 3);
  assert.equal(LOVE_WINDOW.future, 6);
  assert.equal(t.count, 10, '열 달');
  assert.equal(t.basis.label, '2026년 11월', '기준 = 서울 오늘');
  assert.equal(t.fromLabel, '2026년 8월');
  assert.equal(t.toLabel, '2027년 5월');
  assert.deepEqual(t.months.map((m) => m.label), [
    '2026년 8월', '2026년 9월', '2026년 10월', '2026년 11월', '2026년 12월',
    '2027년 1월', '2027년 2월', '2027년 3월', '2027년 4월', '2027년 5월',
  ]);
  assert.equal(t.months.filter((m) => m.phase === 'past').length, 3);
  assert.equal(t.months.filter((m) => m.phase === 'now').length, 1);
  assert.equal(t.months[3].phase, 'now', '이번 달');
  assert.equal(t.months.filter((m) => m.phase === 'future').length, 6);
});

test('연애 월별 인연 — 기준일이 바뀌면 창도 따라 움직인다 (하드코딩 없음)', () => {
  const chart = computeChart(ME);
  const a = loveMonthTiming(chart, { now: new Date('2027-03-02T03:00:00Z') });
  assert.equal(a.basis.label, '2027년 3월', '서울 기준 3월 2일 12시');
  assert.equal(a.fromLabel, '2026년 12월');
  assert.equal(a.toLabel, '2027년 9월');
  const b = loveMonthTiming(chart, { now: new Date('2026-12-31T16:30:00Z') });
  assert.equal(b.basis.label, '2027년 1월', 'UTC 12/31 16:30 = 서울 1/1 01:30');
});

test('연애 월별 인연 — 월건·오행·십성·일지 관계가 실제 계산값과 같다', () => {
  const chart = computeChart(ME);
  const t = loveMonthTiming(chart, { now: NOW });
  const spouse = spouseStars('female');
  assert.deepEqual(spouse, ['정관', '편관'], '여자의 인연의 별은 관성');
  assert.deepEqual(spouseStars('male'), ['정재', '편재'], '남자의 인연의 별은 재성');

  for (const m of t.months) {
    const p = monthPillar(m.year, m.month);
    assert.equal(m.ko, p.ko, `${m.label} 월건`);
    assert.equal(m.sipsung, sipsungOf(chart.dayStem, p.stem), `${m.label} 월간 십성`);
    assert.equal(m.relation, branchRelation(BRANCHES[p.branch].ko, chart.pillars.day.branchKo), `${m.label} 일지 관계`);
    assert.equal(m.isSpouseStar, spouse.includes(m.sipsung), `${m.label} 배우자성 여부`);
    // 오행 기운 표기
    const pair = p.stemOhaeng === p.branchOhaeng ? p.stemOhaeng : `${p.stemOhaeng}·${p.branchOhaeng}`;
    assert.equal(m.ohaengPair, pair);
    assert.ok(m.text.includes(`${p.label} · ${p.ko}월 · ${pair} 기운`), `문장 머리: ${m.text}`);
    assert.ok(LOVE_TIERS[m.tier], `${m.label} 결 이름`);
    assert.ok(m.title && m.title.endsWith('달'), `${m.label} 달 이름 「${m.title}」`);
    assert.ok(m.text.length > 60, `${m.label} 풀이 길이 ${m.text.length}`);
  }
});

test('연애 월별 인연 — 배우자성 달은 문이 열리고, 일지 충·형 달은 흔들린다', () => {
  const chart = computeChart(ME);
  const t = loveMonthTiming(chart, { now: NOW });
  const spouse = spouseStars('female');
  for (const m of t.months) {
    const hard = ['충', '형', '파', '원진'].includes(m.relation);
    if (spouse.includes(m.sipsung)) {
      assert.equal(m.tier, hard ? 'mixed' : 'open', `${m.label} 배우자성 달`);
      assert.ok(m.text.includes('인연의 별'), `${m.label} 인연의 별 문장`);
    } else if (hard) {
      assert.equal(m.tier, 'shake', `${m.label} 일지 ${m.relation} 달`);
    }
  }
  // 열 달 안에 인연의 문이 열리는 달이 최소 한 번은 있어야 문장이 성립한다
  assert.ok(t.openMonths.length >= 1, '인연의 별이 들어오는 달이 있다');
  assert.ok(t.best && t.months.includes(t.best), '가장 열린 달');
  assert.ok(t.worst && t.months.includes(t.worst), '말을 고를 달');
});

test('연애 월별 인연 — 짧은 한 줄(loveMonthLine)도 기준일·창·열린 달을 담는다', () => {
  const chart = computeChart(ME);
  const line = loveMonthLine(loveMonthTiming(chart, { now: NOW }));
  assert.ok(line.includes('2026년 11월 기준'), line);
  assert.ok(line.includes('2026년 8월부터 2027년 5월까지'), line);
  assert.ok(line.includes('인연의 별'), line);
});

test('연애운 섹션 — 10년 대운 표는 그대로 두고 그 아래에 월별 인연 달력이 붙는다', () => {
  const chart = computeChart(ME);
  const sections = loveSections(chart, null, { now: NOW });
  const when = sections.find((s) => s.id === 'lf-when');
  assert.ok(when, '인연이 오는 시기 섹션');
  const texts = when.blocks.map((b) => (typeof b.v === 'string' ? b.v : ''));

  // ① 기존 10년 대운 흐름 유지
  assert.ok(texts.some((v) => v.includes('대운')), '대운 문단 유지');
  assert.ok(when.blocks.some((b) => b.t === 'table' && b.head[0] === '대운'), '대운 표 유지');

  // ② 결제일 기준 앞뒤 월별 인연
  const sub = when.blocks.find((b) => b.t === 'sub' && b.v.includes('2026년 8월 ~ 2027년 5월'));
  assert.ok(sub, '월별 인연 소제목');
  const intro = when.blocks.find((b) => b.t === 'p' && b.v.includes('결제일(2026년 11월)'));
  assert.ok(intro, '기준일 안내 문단');
  const list = when.blocks.find((b) => b.t === 'li' && b.v.length === 10);
  assert.ok(list, '열 달 목록');
  assert.equal(list.v.filter((x) => x.includes('기운 —')).length, 10, '달마다 기운 표기');
  const kv = when.blocks.find((b) => b.t === 'kv' && b.v.some(([k]) => k === '가장 문이 열린 달'));
  assert.ok(kv, '가장 열린 달 · 말을 고를 달 요약');

  // ③ 순서 — 대운 표 다음에 월별 달력
  const iTable = when.blocks.findIndex((b) => b.t === 'table');
  const iSub = when.blocks.findIndex((b) => b === sub);
  assert.ok(iTable < iSub, '대운 표 → 월별 인연 순서');
});

test('연애운 화면 — 월별 인연 블록이 캡처·인쇄에서도 쓰는 블록 타입만 쓴다', () => {
  // 렌더러가 아는 타입만: p · q · li · kv · sub · table · bar · chips (main.js renderBlock)
  const chart = computeChart(ME);
  const known = new Set(['p', 'q', 'li', 'kv', 'bar', 'table', 'score', 'chips', 'sub', 'jami', 'ming', 'oneline']);
  for (const sec of loveSections(chart, null, { now: NOW })) {
    for (const b of sec.blocks) assert.ok(known.has(b.t), `블록 타입 ${b.t}`);
  }
  assert.ok(mainJs.includes("case 'kv'"), 'kv 렌더러');
});
