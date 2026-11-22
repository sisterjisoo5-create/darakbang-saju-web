// 월별 표의 문구가 한 가지로 도배되지 않는지 — 2026-11-22 시연 님 지적 회귀 테스트.
//
//   재회운 「다시 이어지는 시기」 표의 '마음의 결' 열이 12달 내내 같은 문구로 찍혔다.
//   원인: 문구가 아니라 문구의 존재 여부(`DAE_LOVE[십성] ? 'A' : 'B'`)를 물어 늘 참이 된 것.
//   여기서는 ① 재회운 표가 달마다 다른 결을 내는지, ② 모든 리포트의 문구 열이 상수로 떨어지지 않는지 본다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeChart } from '../src/engine/saju.js';
import { buildReport } from '../src/content/report.js';
import { reunionMonthNote } from '../src/content/month-notes.js';

const mainJs = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const extraJs = readFileSync(new URL('../src/content/report-extra.js', import.meta.url), 'utf8');

const ME = { calendar: 'solar', year: 1991, month: 5, day: 7, hour: 18, minute: 22, gender: 'female', leap: false };
const PARTNER = { calendar: 'solar', year: 1990, month: 3, day: 12, hour: 9, minute: 0, gender: 'male', leap: false };
const BIAS = { calendar: 'solar', year: 1997, month: 7, day: 30, hour: 12, minute: 0, gender: 'male', leap: false };

const chart = computeChart(ME);
const partner = computeChart(PARTNER);
const bias = computeChart(BIAS);
const NOW = new Date('2026-11-22T12:00:00Z');

/** 마음이 물러지는 달 / 말이 세지는 달 — 재회운 위 문단이 쓰는 기준 */
const SOFT = ['정인', '편인', '식신'];
const SHARP = ['상관', '겁재', '편관'];

const products = ['saju', 'newyear', 'love', 'reunion', 'jami', 'career', 'wealth', 'daewoon', 'lifetime', 'compat', 'bias', 'zodiac-ilju'];
const extras = { partner, bias, biasName: '차은우', now: NOW };

function tablesOf(productId) {
  const report = buildReport(productId, chart, extras);
  const out = [];
  for (const sec of report.sections || []) {
    for (const b of sec.blocks || []) {
      if (b.t === 'table' && Array.isArray(b.rows)) out.push({ sec, table: b });
    }
  }
  return out;
}

test('재회운 — 마음의 결이 12달 내내 같은 문구로 도배되지 않는다', () => {
  const report = buildReport('reunion', chart, extras);
  const sec = report.sections.find((s) => s.id === 'rj-when');
  assert.ok(sec, '다시 이어지는 시기 섹션');
  const table = sec.blocks.find((b) => b.t === 'table');
  assert.ok(table, '월별 표');
  assert.equal(table.head[3], '마음의 결');
  assert.equal(table.rows.length, 12, '12달');

  const notes = table.rows.map((r) => r[3]);
  assert.ok(notes.every((n) => n && n.length >= 4), `빈 칸 없음 ${notes}`);
  assert.ok(!notes.includes('관계의 문이 움직임'), '예전 기본값이 남아 있지 않다');
  const uniq = new Set(notes);
  assert.ok(uniq.size >= 8, `달마다 다른 결 ${uniq.size}가지 — ${[...uniq].join(' / ')}`);
});

test('재회운 — 마음이 물러지는 달·말이 세지는 달 문단과 표가 어긋나지 않는다', () => {
  const report = buildReport('reunion', chart, extras);
  const sec = report.sections.find((s) => s.id === 'rj-when');
  const table = sec.blocks.find((b) => b.t === 'table');
  const softPhrases = new Set(['툭 치면 답이 오는 달', '한밤중에 생각나는 달', '밥 한 끼로 말 트는 달']);
  const sharpPhrases = new Set(['말이 칼이 되는 달', '자존심이 먼저 나서는 달', '재촉하면 멀어지는 달']);

  for (const [label, ganji, sipsung, note] of table.rows) {
    if (SOFT.includes(sipsung)) assert.ok(softPhrases.has(note), `${label}(${sipsung}) → ${note}`);
    if (SHARP.includes(sipsung)) assert.ok(sharpPhrases.has(note), `${label}(${sipsung}) → ${note}`);
  }
  // 문단에 나온 달 이름이 표에도 그대로 있다
  const softMonths = chart.sewoon.list.filter((m) => SOFT.includes(m.sipsung)).map((m) => m.monthLabel);
  const text = sec.blocks.filter((b) => b.t === 'p').map((b) => b.v).join(' ');
  for (const mm of softMonths) assert.ok(text.includes(mm), `문단에 ${mm}`);
});

test('reunionMonthNote — 십성·일지 관계로 결이 갈린다', () => {
  const months = chart.sewoon.list;
  const notes = months.map((m) => reunionMonthNote(m, chart));
  assert.equal(notes.filter(Boolean).length, 12);
  assert.ok(new Set(notes).size >= 8, `${new Set(notes).size}가지`);

  // 정인·편인·식신 → 마음이 물러지는 결
  for (const m of months.filter((x) => SOFT.includes(x.sipsung))) {
    assert.match(reunionMonthNote(m, chart), /답이 오는|생각나는|말 트는/, `${m.monthLabel} ${m.sipsung}`);
  }
  // 상관·겁재·편관 → 말이 세지는 결
  for (const m of months.filter((x) => SHARP.includes(x.sipsung))) {
    assert.match(reunionMonthNote(m, chart), /칼이 되는|자존심|재촉하면/, `${m.monthLabel} ${m.sipsung}`);
  }
  // 일지와 충·형·파·원진인 중립 십성 달은 관계 문구를 쓴다
  const hard = months.find((m) => !SOFT.includes(m.sipsung) && !SHARP.includes(m.sipsung) &&
    ['충', '형', '파', '원진'].includes(require_relation(m, chart)));
  if (hard) assert.match(reunionMonthNote(hard, chart), /부딪히는|다투는|어긋나는|서운한/, `${hard.monthLabel}`);
});

/** 테스트 안에서만 쓰는 지지 관계 계산 (엔진과 같은 표를 쓴다) */
function require_relation(month, c) {
  // branchRelation 은 지지 '이름'으로 비교한다
  const names = '자축인묘진사오미신유술해';
  const ko = names[month.branch];
  const dayKo = c.pillars.day.branchKo;
  const pairs = {
    충: [['자', '오'], ['축', '미'], ['인', '신'], ['묘', '유'], ['진', '술'], ['사', '해']],
    육합: [['자', '축'], ['인', '해'], ['묘', '술'], ['진', '유'], ['사', '신'], ['오', '미']],
    파: [['자', '유'], ['축', '진'], ['인', '해'], ['묘', '오'], ['사', '신'], ['미', '술']],
    형: [['인', '사'], ['사', '신'], ['신', '인'], ['축', '술'], ['술', '미'], ['미', '축'], ['자', '묘'], ['묘', '자']],
    원진: [['자', '미'], ['축', '오'], ['인', '유'], ['묘', '신'], ['진', '해'], ['사', '술']],
  };
  for (const [kind, list] of Object.entries(pairs)) {
    if (list.some(([a, b]) => (a === ko && b === dayKo) || (a === dayKo && b === ko))) return kind;
  }
  const samhap = [['신', '자', '진'], ['해', '묘', '미'], ['인', '오', '술'], ['사', '유', '축']];
  if (samhap.some((g) => g.includes(ko) && g.includes(dayKo) && ko !== dayKo)) return '삼합';
  return null;
}

test('모든 리포트 — 문구 열이 상수 하나로 떨어지지 않는다', () => {
  const phraseHeads = ['마음의 결', '한 줄', '연애 흐름', '재물의 결', '일의 결', '읽기', '의미'];
  const checked = [];
  for (const pid of products) {
    let tables;
    try {
      tables = tablesOf(pid);
    } catch (e) {
      assert.fail(`${pid} 리포트를 만들지 못했다: ${e.message}`);
    }
    for (const { sec, table } of tables) {
      const head = table.head[table.head.length - 1];
      if (!phraseHeads.includes(head)) continue;
      const col = table.rows.map((r) => r[r.length - 1]);
      const uniq = new Set(col);
      checked.push(`${pid}/${sec.id}/${head}: ${uniq.size}가지`);
      const need = Math.min(3, Math.max(2, Math.floor(table.rows.length / 3)));
      assert.ok(
        uniq.size >= need,
        `${pid} · ${sec.heading} · ${head} 열이 ${uniq.size}가지뿐 (${[...uniq].join(' / ')})`,
      );
    }
  }
  assert.ok(checked.length >= 8, `검사한 문구 열 ${checked.length}개\n${checked.join('\n')}`);
});

test('모든 리포트 — 월별 표의 달 칸이 비지 않고 12달이 모두 있다', () => {
  for (const pid of products) {
    for (const { table } of tablesOf(pid)) {
      if (table.head[0] !== '월') continue;
      assert.ok(table.rows.length >= 10, `${pid} 월별 표 ${table.rows.length}행`);
      for (const row of table.rows) {
        assert.ok(row[0] && row[1] && row[2], `${pid} 빈 칸 ${row}`);
      }
    }
  }
});

test('재회운 표 원인 — 문구가 아니라 존재 여부를 묻던 코드가 남아 있지 않다', () => {
  assert.ok(!extraJs.includes("DAE_LOVE[m.sipsung] ? '관계의 문이 움직임'"), '예전 상수 매핑이 사라졌다');
  assert.ok(!mainJs.includes('관계의 문이 움직임'), '화면 코드에도 남지 않았다');
  assert.ok(extraJs.includes('reunionMonthNote(m, chart)'), '표가 달별 문구 함수를 쓴다');
});
