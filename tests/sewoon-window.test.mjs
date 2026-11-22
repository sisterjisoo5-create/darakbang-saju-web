// 결제(열람)일 기준 앞으로 열두 달 — 신년·월별 운세 · 평생 종합 리포트 회귀 테스트.
//
// 2026-11-22 시연 님 지시: "결제 기준 1년으로 하세요. 연 중에 결제한 사람들 배아파서 클레임 들어오겠어요ㅜㅜ"
//   → 2027년 2월~이듬해 1월로 박혀 있던 「월별 흐름 12개」를, 열람한 달부터 열한 달 뒤까지로 바꾼다.
//   · 2026년 11월 열람 → 26.11 ~ 27.10
//   · 2027년 5월 열람  → 27.05 ~ 28.04
import test from 'node:test';
import assert from 'node:assert/strict';

import { computeChart, rollingMonths } from '../src/engine/saju.js';
import { monthPillar, addMonths } from '../src/engine/month-pillar.js';
import { buildReport } from '../src/content/report.js';

const ME = { calendar: 'solar', year: 1991, month: 5, day: 7, hour: 18, minute: 22, gender: 'female', leap: false };
const chart = computeChart(ME);
/** 서울 2026-11-22 21:00 */
const NOW = new Date('2026-11-22T12:00:00Z');
/** 서울 2027-05-15 09:00 */
const MAY = new Date('2027-05-15T00:00:00Z');

const eq = (a, b, msg) => assert.equal(a, b, msg);
const ok = (v, msg) => assert.ok(v, msg);

function sectionsOf(productId, now) {
  const report = buildReport(productId, chart, { now });
  const monthSec = report.sections.find((s) => s.id === 'ny-months');
  const openSec = report.sections.find((s) => s.id === 'ny-open');
  const bar = monthSec.blocks.find((b) => b.t === 'bar');
  const table = monthSec.blocks.find((b) => b.t === 'table');
  const kv = openSec.blocks.find((b) => b.t === 'kv');
  return { report, monthSec, openSec, bar, table, kv };
}

function blockText(sec) {
  return sec.blocks
    .map((b) => {
      if (typeof b.v === 'string') return b.v;
      if (Array.isArray(b.v)) return b.v.flat().join(' ');
      if (Array.isArray(b.rows)) return b.rows.flat().join(' ');
      return '';
    })
    .join(' ');
}

test('열두 달 창 — 결제일이 속한 달부터 연속 12개월 (2026-11 → 26.11~27.10)', () => {
  const sw = rollingMonths(chart.dayStem, { now: NOW });
  eq(sw.count, 12);
  eq(sw.basis.label, '2026년 11월');
  eq(sw.fromLabel, '2026년 11월');
  eq(sw.toLabel, '2027년 10월');
  eq(sw.list.map((m) => m.short).join(' '), '26.11 26.12 27.01 27.02 27.03 27.04 27.05 27.06 27.07 27.08 27.09 27.10');

  // 달마다 월건은 절기 기준 엔진과 같아야 한다 (1월은 전년도 술년의 축월)
  for (const m of sw.list) {
    const p = monthPillar(m.year, m.month);
    eq(m.ko, p.ko, `${m.label} 월건`);
    eq(m.label, `${m.year}년 ${m.month}월`, `${m.short} 이름`);
    ok(m.sipsung, `${m.label} 십성`);
    ok(m.sewoonKo && m.sewoonHan, `${m.label} 세운`);
  }
  // 연도가 넘어가는 1월은 창 안에서 한 번만, 그 달만 yearTurn
  eq(sw.list.filter((m) => m.yearTurn).map((m) => m.short).join(','), '27.01');
});

test('열두 달 창 — 2027년 5월 열람이면 27.05 ~ 28.04', () => {
  const sw = rollingMonths(chart.dayStem, { now: MAY });
  eq(sw.basis.label, '2027년 5월');
  eq(sw.fromShort, '27.05');
  eq(sw.toLabel, '2028년 4월');
  eq(sw.list.length, 12);
  eq(sw.list[11].short, '28.04');
  eq(sw.list[0].ko, monthPillar(2027, 5).ko);
});

test('열두 달 창 — 기기 시간대와 무관하게 서울 날짜로 시작한다 (10/31 16:00Z = 11/1 01:00 KST)', () => {
  const sw = rollingMonths(chart.dayStem, { now: new Date('2026-10-31T16:00:00Z') });
  eq(sw.basis.label, '2026년 11월', 'UTC 로는 10월이지만 서울은 이미 11월');
  eq(sw.fromShort, '26.11');
  // 12월에 열람하면 12월부터 다음 해 11월까지
  const dec = rollingMonths(chart.dayStem, { now: new Date('2026-12-15T03:00:00Z') });
  eq(dec.fromShort, '26.12');
  eq(dec.toLabel, '2027년 11월');
});

test('열두 달 창 — 세운이 바뀌는 지점을 묶어 준다 (11월 열람: 병오 3달 → 정미 9달)', () => {
  const sw = rollingMonths(chart.dayStem, { now: NOW });
  eq(sw.groups.map((g) => `${g.ko}(${g.han}) ${g.count}달`).join(' / '), '병오(丙午) 3달 / 정미(丁未) 9달');
  eq(sw.groups[0].from.short, '26.11');
  eq(sw.groups[0].to.short, '27.01');
  eq(sw.groups[1].from.short, '27.02');
  eq(sw.groups[1].to.short, '27.10');
});

test('신년 리포트 — 월별 흐름 12개가 결제일 기준 창을 쓴다', () => {
  const { report, monthSec, openSec, bar, table, kv } = sectionsOf('newyear', NOW);
  eq(report.title, '2027 신년 운세', '2026년 11월 열람 — 시즌 이름');
  ok(report.subtitle.includes('2026년 11월 ~ 2027년 10월'), `부제 ${report.subtitle}`);
  ok(report.summary.includes('결제일(2026년 11월)'), `요약 ${report.summary}`);

  eq(openSec.heading, '앞으로 열두 달의 문');
  const sub = monthSec.blocks.find((b) => b.t === 'sub');
  ok(sub.v.includes('2026년 11월 ~ 2027년 10월'), `소제목 ${sub.v}`);

  // 막대 12개 — 좁은 폭에서도 깨지지 않는 연.월 이름
  eq(bar.v.length, 12);
  eq(bar.v.map((x) => x.label).join(' '), '26.11 26.12 27.01 27.02 27.03 27.04 27.05 27.06 27.07 27.08 27.09 27.10');
  for (const b of bar.v) {
    ok(!b.label.includes('월') && b.label.length === 5, `막대 이름 ${b.label}`);
    ok(b.note.includes('·'), `막대 메모 ${b.note}`);
    ok(b.value >= 45 && b.value <= 95, `${b.label} 온도 ${b.value}`);
  }

  // 표 12행 · 연.월 칸이 창과 같다
  eq(table.rows.length, 12);
  assert.deepEqual(table.head, ['연.월', '월건', '십성', '온도', '한 줄']);
  eq(table.rows.map((r) => r[0]).join(' '), bar.v.map((x) => x.label).join(' '));
  for (const [short, ganji, sipsung, temp, line] of table.rows) {
    ok(short && ganji && sipsung && temp && line, `${short} 빈 칸`);
    eq(ganji, monthPillar(...(short.startsWith('26') ? [2026, Number(short.slice(3))] : [2027, Number(short.slice(3))])).ko, `${short} 월건`);
  }

  // 좋은 달·힘을 빼야 할 달 3곳도 창 안에서 고른다
  eq(kv.v.length, 3);
  const bestRow = kv.v[0][1];
  const worstRow = kv.v[1][1];
  for (const tag of [...bestRow.split(', '), ...worstRow.split(', ')]) {
    ok(/^\d\d\.\d\d\([가-힣]{2}\)$/.test(tag), `요약 달 이름 ${tag}`);
  }
  ok(kv.v[2][1].includes('2026년 11월'), '기준일 칸');

  // 2027년 하드코딩이 남아 있지 않다
  const text = openSec.blocks.concat(monthSec.blocks).map((b) => (typeof b.v === 'string' ? b.v : '')).join(' ');
  ok(!text.includes('2027 정미년'), '옛 제목이 없다');
  ok(!text.includes('2027년은'), '옛 세운 문장이 없다');
  ok(!/2028|2029/.test(text), '창 밖 연도가 없다');
});

test('신년 리포트 — 2027년 5월에 열람하면 27.05 ~ 28.04가 나온다', () => {
  const { report, bar, table } = sectionsOf('newyear', MAY);
  ok(report.subtitle.includes('2027년 5월 ~ 2028년 4월'), `부제 ${report.subtitle}`);
  eq(bar.v[0].label, '27.05');
  eq(bar.v[11].label, '28.04');
  eq(table.rows[0][0], '27.05');
  eq(table.rows[11][0], '28.04');
});

test('평생 종합 리포트 — 같은 월별 흐름 12개를 한 권 안에 담는다', () => {
  const { report, bar, table } = sectionsOf('lifetime', NOW);
  eq(bar.v.length, 12);
  eq(bar.v[0].label, '26.11');
  eq(bar.v[11].label, '27.10');
  eq(table.rows.length, 12);
  const ids = report.sections.map((s) => s.id);
  ok(ids.includes('ny-open') && ids.includes('ny-months'), `섹션 ${ids.join(',')}`);
  const text = blockText(report.sections.find((s) => s.id === 'ny-points'));
  ok(text.length > 100, '재물·관계·일 문단이 있다');
  ok(!text.includes('2027년은') && !text.includes('2027 정미년'), '해를 박은 옛 문장이 없다');
});

test('재물·관계·일 — 달 이름이 모두 창 안에 있고, 비어 있지 않다', () => {
  const { report } = sectionsOf('newyear', NOW);
  const points = report.sections.find((s) => s.id === 'ny-points');
  const body = blockText(points);
  const tags = body.match(/\d\d\.\d\d\([가-힣]{2}\)/g) || [];
  ok(tags.length >= 3, `달 이름 ${tags.length}개 — ${body.slice(0, 80)}`);
  const shorts = new Set(rollingMonths(chart.dayStem, { now: NOW }).list.map((m) => m.short));
  for (const t of tags) ok(shorts.has(t.slice(0, 5)), `창 밖 달 ${t}`);
  ok(!/undefined|NaN|\[object/.test(body), '자리표시자 없음');
});

test('재회운 — 표와 흐름이 같은 창(결제일부터 열두 달)을 쓴다', () => {
  const report = buildReport('reunion', chart, { now: NOW });
  const sec = report.sections.find((s) => s.id === 'rj-when');
  const table = sec.blocks.find((b) => b.t === 'table');
  const list = sec.blocks.find((b) => b.t === 'li' && b.v.length === 12 && b.v.every((x) => x.includes(' 기운 — ')));
  ok(list, '열두 달 흐름 목록');
  eq(table.rows.length, 12, '표 12행');
  const sw = rollingMonths(chart.dayStem, { now: NOW });
  eq(table.rows.map((r) => r[0]).join(' '), sw.list.map((m) => m.short).join(' '), '표의 달 = 결제일 기준 열두 달');
  for (const [i, text] of list.v.entries()) {
    ok(text.startsWith(`${sw.list[i].label} · `), `${sw.list[i].label} 문장 「${text.slice(0, 20)}」`);
  }
  const sub = sec.blocks.find((b) => b.t === 'sub');
  ok(sub.v.includes('2026년 11월 ~ 2027년 10월'), `소제목 ${sub.v}`);
  // 지난 달을 권하지 않는다 — 표에 past 가 없다
  ok(!table.rows.some((r) => r[0].startsWith('26.08') || r[0].startsWith('26.09')), '지난 달이 표에 없다');
});
