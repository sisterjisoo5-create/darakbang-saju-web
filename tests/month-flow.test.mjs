// 결제일 기준 앞뒤 월별 오행 흐름 — 연애 · 재회 · 직업 · 재물 네 리포트 공통 회귀 테스트.
//
// 2026-11-22 시연 님 지시: 인연뿐 아니라 재회·이직·재물도 "어떤 해 · 무슨 달 · 어떤 오행 기운으로
//   무엇이 오고 가는지" 결제일 기준 앞뒤 3~6개월(열 달)로 풀어 달라.
import test from 'node:test';
import assert from 'node:assert/strict';

import { computeChart } from '../src/engine/saju.js';
import { buildReport } from '../src/content/report.js';
import { monthPillar, addMonths } from '../src/engine/month-pillar.js';
import { monthWindow, FLOW_WINDOW, composeMonthText } from '../src/content/month-flow.js';
import { reunionFlow, careerFlow, wealthFlow } from '../src/content/month-flow.js';
import { loveMonthTiming } from '../src/content/love-months.js';

const ME = { calendar: 'solar', year: 1991, month: 5, day: 7, hour: 18, minute: 22, gender: 'female', leap: false };
const chart = computeChart(ME);
const NOW = new Date('2026-11-22T12:00:00Z');

/** 네 리포트에서 열 달짜리 목록을 꺼낸다 */
function flowOf(productId, now = NOW) {
  const report = buildReport(productId, chart, { now });
  for (const sec of report.sections) {
    for (const b of sec.blocks) {
      if (b.t === 'li' && b.v.length === 10 && b.v.every((x) => x.includes(' 기운 — '))) {
        return { sec, items: b.v, blocks: sec.blocks };
      }
    }
  }
  return null;
}

const DOMAINS = [
  { pid: 'love', heading: '인연', words: ['인연'] },
  { pid: 'reunion', heading: '연락', words: ['연락', '재회'] },
  { pid: 'career', heading: '일', words: ['자리', '면접', '이직', '제안', '업무', '회사'] },
  { pid: 'wealth', heading: '돈', words: ['돈', '결제', '계약', '지출', '정산'] },
];

test('월 창 — 네 리포트가 같은 뼈대(지난 3개월 + 이번 달 + 앞 6개월)를 쓴다', () => {
  assert.deepEqual(FLOW_WINDOW, { past: 3, future: 6 });
  const w = monthWindow(chart, { now: NOW });
  assert.equal(w.count, 10);
  assert.equal(w.basis.label, '2026년 11월');
  assert.equal(w.fromLabel, '2026년 8월');
  assert.equal(w.toLabel, '2027년 5월');
  assert.deepEqual(w.months.map((m) => m.phase), ['past', 'past', 'past', 'now', 'future', 'future', 'future', 'future', 'future', 'future']);
  for (const m of w.months) {
    const p = monthPillar(m.year, m.month);
    assert.equal(m.ko, p.ko, `${m.label} 월건`);
    assert.equal(m.head.includes(`${m.ohaengPair} 기운`), true, `${m.label} 오행 기운 문장`);
    assert.ok(m.sipsung && m.relLine, `${m.label} 십성·관계 문구`);
  }
});

test('네 리포트 — 열 달짜리 월별 흐름이 모두 있고, 달마다 문장이 다르다', () => {
  for (const d of DOMAINS) {
    const f = flowOf(d.pid);
    assert.ok(f, `${d.pid} 월별 흐름 블록`);
    assert.equal(f.items.length, 10, `${d.pid} 열 달`);
    const months = Array.from({ length: 10 }, (_, i) => addMonths(2026, 11, -3 + i));
    f.items.forEach((text, i) => {
      const { year: y, month: m } = months[i];
      const ganji = monthPillar(y, m).ko;
      assert.ok(text.startsWith(`${y}년 ${m}월 · ${ganji}월 · `), `${d.pid} ${y}년 ${m}월 머리 「${text.slice(0, 24)}」`);
    });
    // 달 이름 말고 '풀이' 자체가 서로 달라야 한다
    const bodies = f.items.map((t) => t.split(' 기운 — ')[1]);
    assert.ok(new Set(bodies).size >= 5, `${d.pid} 풀이 ${new Set(bodies).size}가지`);
    // 그 리포트의 언어로 쓰였는지
    assert.ok(f.items.some((t) => d.words.some((w) => t.includes(w))), `${d.pid} 리포트 언어`);
    assert.ok(!f.items.some((t) => t.includes('관계의 문이 움직임')), `${d.pid} 옛 상수 없음`);
  }
});

test('네 리포트 — 같은 달이라도 리포트마다 다른 이야기를 한다', () => {
  const texts = {};
  for (const d of DOMAINS) texts[d.pid] = flowOf(d.pid).items;
  for (let i = 0; i < 10; i += 1) {
    const month = texts.love[i].split(' — ')[0];
    const bodies = new Set(DOMAINS.map((d) => texts[d.pid][i].split(' 기운 — ')[1]));
    assert.equal(bodies.size, DOMAINS.length, `${month} 네 리포트 문장이 서로 달라야 한다`);
  }
});

test('네 리포트 — 기준일이 바뀌면 창도 따라 움직인다', () => {
  const other = new Date('2027-03-02T03:00:00Z'); // 서울 3월 2일 12시
  for (const d of DOMAINS) {
    const f = flowOf(d.pid, other);
    assert.ok(f.items[0].startsWith('2026년 12월'), `${d.pid} 시작 달`);
    assert.ok(f.items[9].startsWith('2027년 9월'), `${d.pid} 끝 달`);
  }
});

test('네 리포트 — 요약(가장 좋은 달·조심할 달)은 지난 달을 권하지 않는다', () => {
  const flows = { love: loveMonthTiming(chart, { now: NOW }) };
  flows.reunion = reunionFlow(chart, { now: NOW });
  flows.career = careerFlow(chart, { now: NOW });
  flows.wealth = wealthFlow(chart, { now: NOW });
  for (const [name, f] of Object.entries(flows)) {
    assert.ok(f.best, `${name} 가장 좋은 달`);
    assert.ok(f.worst, `${name} 조심할 달`);
    assert.notEqual(f.best.phase, 'past', `${name} best ${f.best.label}`);
    assert.notEqual(f.worst.phase, 'past', `${name} worst ${f.worst.label}`);
  }
});

test('네 리포트 — 요약 카드와 기준 안내가 화면 블록으로 들어간다', () => {
  for (const d of DOMAINS) {
    const f = flowOf(d.pid);
    const sub = f.blocks.find((b) => b.t === 'sub' && b.v.includes('2026년 8월 ~ 2027년 5월'));
    assert.ok(sub, `${d.pid} 소제목`);
    const intro = f.blocks.find((b) => b.t === 'p' && b.v.includes('결제일(2026년 11월)'));
    assert.ok(intro, `${d.pid} 기준일 안내`);
    const kv = f.blocks.find((b) => b.t === 'kv' && b.v.length === 3);
    assert.ok(kv, `${d.pid} 요약 3칸`);
  }
});

test('모든 달 문장 — 연·월·월건·오행·관계·할 일이 한 줄에 다 있다', () => {
  const m = monthWindow(chart, { now: NOW }).months[5]; // 2027년 1월 · 신축월
  const text = composeMonthText({ ...m, relLine: '월지가 내 일지와 육합을 이루고 있어서,' }, '금·수 기운이 도는 달이에요.', '미뤄 둔 일을 정리하세요.');
  assert.equal(text, `2027년 1월 · 신축월 · 금·토 기운 — 금·수 기운이 도는 달이에요. 월지가 내 일지와 육합을 이루고 있어서, 미뤄 둔 일을 정리하세요.`);
});
