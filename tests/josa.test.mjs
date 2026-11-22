// 받침 조사(이/가 · 은/는 · 을/를 · 과/와 · 으로/로 · 이에요/예요 · 이라/라 · 이고/고) 회귀 검사
// 2026-11-23 시연 님 지시: "화이" 같은 조사 오타를 코드베이스 전체에서 전수 점검.
// · withJosa 단위 검사
// · 궁합 채워 주는 기운 — 오행 5개(목이·화가·토가·금이·수가)
// · 오늘의 운세 — 열흘 × 오행 5개
// · 유료 리포트 12종 · 최애궁합 · 자미두수 — 실제 출력 문장 전체
// 실행: npm test
import test from 'node:test';
import assert from 'node:assert/strict';

import { computeChart } from '../src/engine/saju.js';
import { computeJami } from '../src/engine/jami.js';
import { computeCompat, withJosa, compatVerdict } from '../src/engine/compat.js';
import { todayFortune } from '../src/engine/today.js';
import { describePalace } from '../src/engine/jami.js';
import { ILJU_REL } from '../src/engine/bias.js';
import { buildReport } from '../src/content/report.js';
import { OHAENG, SIPSUNG, STEMS, BRANCHES } from '../src/engine/constants.js';
import { JAMI_STAR_MEANING } from '../src/content/data.js';

/* ── 받침 판정 · 조사 검사기 ─────────────────────────────── */
const kindOf = (ch) => {
  const code = ch.codePointAt(0);
  if (code < 0xac00 || code > 0xd7a3) return null;
  const t = (code - 0xac00) % 28;
  return t === 0 ? 'none' : t === 8 ? 'rieul' : 'other';
};

/** [받침 있을 때, 받침 없을 때] */
const PAIRS = [
  ['이', '가'], ['은', '는'], ['을', '를'], ['과', '와'],
  ['으로', '로'], ['이에요', '예요'], ['이라', '라'], ['이고', '고'],
];

/**
 * 문장 안에서 words 뒤에 붙은 조사가 받침과 어긋나면 찾아낸다.
 * 예: '화' + '이' → '화이' (받침 없는데 이) → 오류.
 */
function badJosa(text, words) {
  const bad = [];
  for (const w of words) {
    let from = 0;
    for (;;) {
      const i = text.indexOf(w, from);
      if (i < 0) break;
      from = i + w.length;
      const rest = text.slice(i + w.length);
      const kind = kindOf(w[w.length - 1]);
      if (!kind) continue;
      for (const [withB, withoutB] of PAIRS) {
        let hits = null;
        if (rest.startsWith(withB)) hits = { josa: withB, want: 'other' };
        else if (rest.startsWith(withoutB)) hits = { josa: withoutB, want: 'none' };
        if (!hits) continue;
        // '로'는 받침이 없거나 ㄹ일 때, '으로'는 그 밖의 받침일 때
        const ok = hits.want === 'none'
          ? (kind === 'none' || (withB === '으로' && kind === 'rieul'))
          : kind !== 'none';
        if (!ok) bad.push(`'${w}${hits.josa}'`);
        break;
      }
    }
  }
  return bad;
}

/* ── 1. withJosa 단위 ─────────────────────────────────── */
test('withJosa — 받침에 따라 이/가·을/를·은/는·과/와가 갈린다', () => {
  assert.equal(withJosa('목', '이', '가'), '목이');
  assert.equal(withJosa('화', '이', '가'), '화가');
  assert.equal(withJosa('토', '이', '가'), '토가');
  assert.equal(withJosa('금', '이', '가'), '금이');
  assert.equal(withJosa('수', '이', '가'), '수가');

  assert.equal(withJosa('목', '을', '를'), '목을');
  assert.equal(withJosa('화', '을', '를'), '화를');
  assert.equal(withJosa('금', '은', '는'), '금은');
  assert.equal(withJosa('수', '은', '는'), '수는');
  assert.equal(withJosa('목', '과', '와'), '목과');
  assert.equal(withJosa('화', '과', '와'), '화와');

  assert.equal(withJosa('산책', '으로', '로'), '산책으로');
  assert.equal(withJosa('연습', '으로', '로'), '연습으로');
  assert.equal(withJosa('물', '으로', '로'), '물로');       // ㄹ 받침은 '로'
  assert.equal(withJosa('사주', '으로', '로'), '사주로');
  assert.equal(withJosa('정관', '이에요', '예요'), '정관이에요');
  assert.equal(withJosa('겁재', '이에요', '예요'), '겁재예요');
  assert.equal(withJosa('일지 파', '이라', '라'), '일지 파라');
  assert.equal(withJosa('일지 충', '이라', '라'), '일지 충이라');
  assert.equal(withJosa('차은우', '과', '와'), '차은우와');
  assert.equal(withJosa('장원영', '과', '와'), '장원영과');
});

test('withJosa — 한글이 아닌 글자로 끝나면 받침 없음으로 본다', () => {
  assert.equal(withJosa('3', '이', '가'), '3가');
  assert.equal(withJosa('(정관)', '이', '가'), '(정관)가');
});

/* ── 2. 궁합 — 채워 주는 기운 문장 ───────────────────────── */
function chartOf({ dayStem = 0, dayBranch = 0, yearBranch = 0, gender = 'female', missing = [], count = {}, temp = 22 } = {}) {
  const counts = {};
  for (const o of OHAENG) counts[o] = count[o] || 0;
  return {
    input: { gender },
    dayStem,
    dayBranch,
    yearBranch,
    ohaeng: { missing, count: counts, temp, strongest: OHAENG[0], label: '온화' },
    pillars: { day: { branchKo: BRANCHES[dayBranch].ko } },
    animal: BRANCHES[yearBranch].animal,
  };
}

test('궁합 — 오행 5개가 채워 주는 기운 문장에서 목이·화가·토가·금이·수가로 나온다', () => {
  const want = { 목: '목이', 화: '화가', 토: '토가', 금: '금이', 수: '수가' };
  for (const o of OHAENG) {
    // A에게 o가 비어 있고, B에게 o가 두 개 이상 → B의 o가 A의 빈자리를 채운다
    const A = chartOf({ missing: [o], gender: 'female' });
    const B = chartOf({ count: { [o]: 2 }, gender: 'male', missing: [] });
    const a = computeCompat(A, B);
    const b = computeCompat(B, A);
    const text = [...a.evidence, ...b.evidence].join(' | ');
    assert.ok(text.includes(want[o]), `${o}: '${want[o]}' 문장이 있어야 한다 — ${text}`);
    const wrong = badJosa(text, [o]);
    assert.deepEqual(wrong, [], `${o}: 조사가 어긋난 문장이 있다 — ${wrong.join(', ')}`);
  }
  // 다섯 오행이 한 문장에 다 들어오는지 (전수 점검)
  const all = [];
  for (const o of OHAENG) {
    all.push(...computeCompat(chartOf({ missing: [o] }), chartOf({ count: { [o]: 3 } })).evidence);
  }
  const joined = all.join(' ');
  for (const o of OHAENG) assert.ok(joined.includes(want[o]), `${want[o]} 누락`);
  for (const wrong of ['화이 ', '토이 ', '수이 ', '무이 ', '계이 ']) {
    assert.ok(!joined.includes(wrong), `'${wrong}' 같은 조사 오타가 남아 있다`);
  }
});

/* ── 3. 오늘의 운세 — 열흘 × 오행 5개 ─────────────────────── */
test('오늘의 운세 — 열흘 × 오행 5개 문장의 조사가 모두 받침과 맞는다', () => {
  const seen = new Set();
  for (let d = 0; d < 10; d += 1) {
    const now = new Date(Date.UTC(2026, 10, 20 + d, 3, 0)); // 11-20~11-29 KST 정오 무렵
    for (let stem = 0; stem < 10; stem += 1) {
      const chart = chartOf({ dayStem: stem, dayBranch: stem % 12, yearBranch: stem % 12 });
      const f = todayFortune(chart, now);
      const text = f.notes.join(' | ');
      const bad = badJosa(text, OHAENG);
      assert.deepEqual(bad, [], `${now.toISOString()} ${STEMS[stem].ko}일간: ${bad.join(', ')} — ${text}`);
      for (const o of OHAENG) {
        for (const j of ['이', '가', '을', '를', '과', '와']) {
          if (text.includes(`${o}${j} `)) seen.add(`${o}${j}`);
        }
      }
    }
  }
  // 다섯 오행의 '이/가' 형태가 실제로 나오는지 (문장이 모두 동작하는지)
  for (const want of ['목이', '화가', '토가', '금이', '수가']) {
    assert.ok(seen.has(want), `오늘의 운세에 '${want}' 형태가 나와야 한다 — 본 것: ${[...seen].join(' ')}`);
  }
});

/* ── 4. 자미두수 궁 설명 ─────────────────────────────────── */
test('자미두수 — 빈 궁의 빌려 쓰는 별 이름 뒤 조사가 받침을 따른다', () => {
  const base = { branchKo: '미', branchHan: '未', branch: 7, main: [], lucky: [], empty: true };
  for (const star of Object.keys(JAMI_STAR_MEANING)) {
    const line = describePalace({ ...base, borrowed: [star] });
    assert.deepEqual(badJosa(line, [star, '기운']), [], `${star}: ${line}`);
  }
  // 받침 없는 별은 '를', 받침 있는 별은 '을'
  assert.match(describePalace({ ...base, borrowed: ['천기'] }), /천기를 빌려 씁니다/);
  assert.match(describePalace({ ...base, borrowed: ['태양'] }), /태양을 빌려 씁니다/);
  assert.match(describePalace({ ...base, borrowed: [] }), /기운을 빌려 씁니다/);
});

/* ── 5. 일지 관계 제목 + 이라/라 ───────────────────────────── */
test('일지 관계 제목 뒤 이라/라 — 받침 없는 파는 라, 나머지는 이라', () => {
  for (const info of Object.values(ILJU_REL)) {
    const kind = kindOf(info.title[info.title.length - 1]);
    const expect = kind === 'none' ? '라' : '이라';
    assert.equal(withJosa(info.title, '이라', '라'), `${info.title}${expect}`, info.title);
  }
  assert.equal(withJosa(ILJU_REL.파.title, '이라', '라'), '일지 파라');
  assert.equal(withJosa(ILJU_REL.충.title, '이라', '라'), '일지 충이라');
});

/* ── 6. 유료 리포트 12종 전체 문장 ────────────────────────── */
const ME = { calendar: 'solar', year: 1991, month: 5, day: 7, hour: 18, minute: 22, gender: 'female' };
const PARTNER = { calendar: 'solar', year: 1997, month: 6, day: 17, hour: 8, minute: 0, gender: 'male' };
const BIAS = { calendar: 'solar', year: 1997, month: 3, day: 30, timeUnknown: true, gender: 'male' };

const chart = computeChart(ME);
const partner = computeChart(PARTNER);
const biasChart = computeChart(BIAS);
const jami = computeJami({
  lunarYear: chart.lunar.y,
  lunarMonth: chart.lunar.m,
  lunarDay: chart.lunar.d,
  hourIndex: Math.floor(((chart.corrected.h + 1) % 24) / 2),
  gender: 'female',
  yearStem: chart.yearStem,
});
const extras = { jami, partner, partnerJami: null, bias: biasChart, biasName: '차은우', now: new Date('2026-11-23T09:00:00+09:00') };

const reportText = (report) => report.sections
  .map((sec) => [sec.heading, ...sec.blocks.map((b) => (Array.isArray(b.v) ? b.v.flat().join(' ') : b.v || ''))].join(' '))
  .join(' ');

/** 리포트에서 실제로 쓰는 낱말들 — 이 뒤에 붙은 조사를 본다
 *  (한 글자 천간·지지는 '사이'·'기이' 같은 낱말과 겹쳐 오탐이 나므로 두 글자 이상만 본다) */
const GANJI = [];
for (let i = 0; i < 60; i += 1) GANJI.push(`${STEMS[i % 10].ko}${BRANCHES[i % 12].ko}`);
const WORDS = [
  ...OHAENG,
  ...Object.keys(SIPSUNG),
  ...GANJI,
  ...Object.values(ILJU_REL).map((r) => r.title),
];

test('유료 리포트 12종 — 나온 문장의 조사가 받침과 어긋나지 않는다', () => {
  for (const product of ['saju', 'compat', 'bias', 'zodiac-ilju', 'newyear', 'love', 'reunion', 'wealth', 'career', 'daewoon', 'jami', 'lifetime']) {
    const report = buildReport(product, chart, extras);
    const text = reportText(report);
    assert.ok(text.length > 200, `${product}: 문장이 비어 있다`);
    const bad = badJosa(text, WORDS);
    assert.deepEqual(bad, [], `${product}: 조사가 어긋난 곳 — ${bad.slice(0, 8).join(', ')}`);
  }
});

test('최애궁합 — 최애 이름이 받침 있는 이름과 없는 이름 모두에서 조사가 맞는다', () => {
  for (const name of ['차은우', '장원영', '아이유', '공유']) {
    const report = buildReport('bias', chart, { ...extras, biasName: name });
    const text = reportText(report);
    assert.deepEqual(badJosa(text, WORDS), [], `${name}: 조사 오류`);
    // 이름 뒤 조사는 이름 받침을 따른다
    const kind = kindOf(name[name.length - 1]);
    const withB = kind === 'none' ? '가' : '이';
    const withoutB = kind === 'none' ? '이' : '가';
    assert.ok(text.includes(`${name}${withB}`) || text.includes(`${name}에게`) || text.includes(`${name}의`), `${name}: 이름 조사 확인`);
    assert.ok(!text.includes(`${name}${withoutB} `), `${name}: '${name}${withoutB}' 오타`);
  }
});

test('궁합 판정 문구도 조사가 어긋나지 않는다', () => {
  for (let s = 0; s <= 100; s += 1) {
    const v = compatVerdict(s);
    assert.deepEqual(badJosa(`${v.title} ${v.line}`, WORDS), [], `${s}점`);
  }
});
