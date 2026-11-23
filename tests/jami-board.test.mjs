// 자미두수 12궁 사각 명반판 — 사화 · 명주 · 신주 · 칸 배치
// 실행: npm test
//
// 지키려는 것
//  ① 사화(祿權科忌)가 년간 표 그대로 별에 붙는다 — 辛년 = 거문祿 · 태양權 · 문곡科 · 문창忌
//  ② 명주는 명궁 지지, 신주는 태어난 해 지지로 정해진다
//  ③ 명반판은 표준 4×4 배치(상 巳午未申 · 우 酉戌 · 하 寅丑子亥 · 좌 卯辰)로 12칸 + 가운데 1칸을 그린다
//  ④ 공궁은 대궁 차입을, 명궁·신궁은 命·身 배지를, 길성·살성은 칩으로 드러난다
//  ⑤ 세로 12행 표는 더 이상 쓰지 않는다

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeChart } from '../src/engine/saju.js';
import { computeJami } from '../src/engine/jami.js';
import { JAMI_SAHWA, SAHWA_ORDER } from '../src/engine/constants.js';
import { buildReport } from '../src/content/report.js';
import { renderJamiBoard, JAMI_BOARD_POS } from '../src/content/jami-board.js';

const STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
const JAMI_STARS = ['자미', '천기', '태양', '무곡', '천동', '염정', '천부', '태음', '탐랑', '거문', '천상', '천량', '칠살', '파군'];
const LUCKY = ['좌보', '우필', '문창', '문곡', '천괴', '천월', '녹존'];

function jamiOf(input) {
  const c = computeChart(input);
  assert.equal(c.ok, true);
  return computeJami({
    lunarYear: c.lunar.y,
    lunarMonth: c.lunar.m,
    lunarDay: c.lunar.d,
    hourIndex: c.pillars.hour ? Math.floor(((c.corrected.h + 1) % 24) / 2) : null,
    gender: input.gender,
    yearStem: c.yearStem,
  });
}

const SIYEON = { calendar: 'solar', year: 1991, month: 5, day: 7, hour: 18, minute: 22, gender: 'female' };
const J = jamiOf(SIYEON);

test('사화 — 辛未년: 거문 祿 · 태양 權 · 문곡 科 · 문창 忌 (검증 명반과 일치)', () => {
  assert.equal(J.yearGanji, '신미');
  assert.equal(J.yearGanjiHan, '辛未');
  assert.deepEqual(J.sahua, [
    { type: '록', star: '거문' },
    { type: '권', star: '태양' },
    { type: '과', star: '문곡' },
    { type: '기', star: '문창' },
  ]);
  assert.deepEqual(J.sahuaMap, { 거문: '록', 태양: '권', 문곡: '과', 문창: '기' });
  // 사화는 앉은 궁에도 붙는다 — 거문은 천이궁(축), 태양은 재백궁(묘)
  const cheoni = J.palaces.find((p) => p.name === '천이궁');
  assert.deepEqual(cheoni.sahua.map((x) => `${x.star}${x.type}`).sort(), ['거문록', '문곡과', '문창기'].sort());
  const jaebaek = J.palaces.find((p) => p.name === '재백궁');
  assert.deepEqual(jaebaek.sahua, [{ star: '태양', type: '권' }]);
});

test('사화 표 — 열 간(甲乙丙丁戊己庚辛壬癸) 모두 네 별이 서로 다르고 실제 별 이름이다', () => {
  const all = [...JAMI_STARS, ...LUCKY];
  for (const stem of STEMS) {
    const row = JAMI_SAHWA[stem];
    assert.equal(row.length, 4, `${stem}년 사화 4개`);
    assert.equal(new Set(row).size, 4, `${stem}년 사화 별은 서로 달라야 한다`);
    for (const star of row) assert.ok(all.includes(star), `${stem}년 사화 별 ${star}`);
  }
  assert.deepEqual(SAHWA_ORDER, ['록', '권', '과', '기']);
  // 대표 검증: 癸년 = 파군祿 · 거문權 · 태음科 · 탐랑忌
  assert.deepEqual(JAMI_SAHWA['계'], ['파군', '거문', '태음', '탐랑']);
  assert.deepEqual(JAMI_SAHWA['갑'], ['염정', '파군', '무곡', '태양']);
});

test('명주 · 신주 — 명궁 지지와 태어난 해 지지로 정해진다 (未 명궁 → 무곡 · 未년 → 천상)', () => {
  assert.equal(J.myeongBranch, '미');
  assert.equal(J.myeongju, '무곡');
  assert.equal(J.sinju, '천상');
  // 1997 정축년 · 명궁 寅 → 명주 녹존 · 신주 천량
  const j97 = jamiOf({ calendar: 'solar', year: 1997, month: 6, day: 17, hour: 8, minute: 0, gender: 'male' });
  assert.equal(j97.myeongBranch, '인');
  assert.equal(j97.myeongju, '녹존');
  assert.equal(j97.yearGanji, '정축');
  assert.equal(j97.sinju, '천상'); // 丑년 → 天相
  // 1992 임신년 · 명궁 午 → 명주 파군 · 신주 천량
  const j92 = jamiOf({ calendar: 'solar', year: 1992, month: 10, day: 15, hour: 7, minute: 33, gender: 'female' });
  assert.equal(j92.myeongju, '파군');
  assert.equal(j92.yearGanji, '임신');
  assert.equal(j92.sinju, '천량'); // 申년 → 天梁
});

test('명반판 — 12칸 + 가운데 1칸, 4×4 표준 배치', () => {
  const html = renderJamiBoard(J);
  assert.equal((html.match(/class="jb-cell/g) || []).length, 12, '궁 칸 12개');
  assert.equal((html.match(/class="jb-core"/g) || []).length, 1, '가운데 기본정보 1개');
  assert.equal(html.includes('<table'), false, '세로 표를 쓰지 않는다');

  // 지지 → 자리: 상 巳午未申 / 우 酉戌 / 하 寅丑子亥 / 좌 卯辰
  const want = {
    사: [1, 1], 오: [1, 2], 미: [1, 3], 신: [1, 4],
    진: [2, 1], 유: [2, 4],
    묘: [3, 1], 술: [3, 4],
    인: [4, 1], 축: [4, 2], 자: [4, 3], 해: [4, 4],
  };
  const order = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
  for (const [ko, [row, col]] of Object.entries(want)) {
    assert.deepEqual(JAMI_BOARD_POS[order.indexOf(ko)], [row, col], `${ko} 자리`);
  }
  // 실제 HTML — 지지 한자와 grid-row/column 이 짝을 이룬다
  for (const p of J.palaces) {
    const [row, col] = JAMI_BOARD_POS[p.branch];
    const tag = `<div class="jb-cell[^"]*" style="grid-row:${row};grid-column:${col}">`;
    const block = html.slice(html.search(new RegExp(tag)));
    const cell = block.slice(0, block.indexOf('</div></div>'));
    assert.ok(cell.includes(`<span class="jb-branch">${p.branchHan}</span>`), `${p.name} 칸에 지지 ${p.branchHan}`);
    assert.ok(cell.includes(`<span class="jb-name">${p.name}`), `${p.name} 칸에 궁 이름`);
  }
  // 가운데는 2행~4행 · 2열~4열을 차지한다
  assert.ok(html.includes('class="jb-core" style="grid-row:2 / 4;grid-column:2 / 4"'));
});

/* 칸 하나의 HTML 조각 — grid-row/column 으로 찾는다 */
function cellOf(html, row, col) {
  const hit = html.split('<div class="jb-cell').slice(1)
    .find((c) => c.includes(`style="grid-row:${row};grid-column:${col}"`));
  assert.ok(hit, `${row}행 ${col}열 칸`);
  return hit;
}

test('명반판 — 명궁·신궁 배지, 공궁 차입, 사화 배지, 길성·살성 칩, 가운데 기본정보', () => {
  const html = renderJamiBoard(J);
  const myeong = cellOf(html, 1, 3);
  assert.ok(myeong.includes('is-myeong'), '명궁 칸 강조');
  assert.ok(myeong.includes('jb-mark--myeong">命'), '명궁 命 배지');
  assert.ok(myeong.includes('空宮'), '공궁 표시');
  assert.ok(myeong.includes('대궁 축 · 천동·거문 빌려옴'), '대궁 차입 안내');
  assert.ok(myeong.includes('jb-role">나<'), '생활 키워드');

  const sinCell = cellOf(html, 4, 2);
  assert.ok(sinCell.includes('is-sin') && sinCell.includes('jb-mark--sin">身'), '신궁 身 배지');

  // 사화 배지 — 천이궁(축) 거문 祿 / 재백궁(묘) 태양 權 / 문창 忌 · 문곡 科
  assert.ok(html.includes('<span class="jb-star">거문<i class="jb-hw jb-hw--록">祿</i></span>'));
  assert.ok(html.includes('<span class="jb-star">태양<i class="jb-hw jb-hw--권">權</i></span>'));
  assert.ok(html.includes('문창<i class="jb-hw jb-hw--기">忌</i>'));
  assert.ok(html.includes('문곡<i class="jb-hw jb-hw--과">科</i>'));

  // 길성·살성 칩
  assert.ok(html.includes('<span class="jb-chip jb-chip--gil">좌보</span>'));
  assert.ok(html.includes('<span class="jb-chip jb-chip--sa">타라</span>'));

  // 가운데 기본정보
  for (const s of ['기 본 정 보', '금사국', '金四局', '명궁', '을미', '신궁', '천이궁', '명주', '무곡', '신주', '천상', '사화 · 신미년']) {
    assert.ok(html.includes(s), `가운데에 ${s}`);
  }
  assert.ok(html.includes('명궁 未 공궁 · 丑 천동·거문 차입'), '가운데 공궁 안내');
});

test('명반판 — 자미두수 리포트의 12궁 전체 읽기와 평생 리포트 자미두수 장이 같은 판을 쓴다', () => {
  const jami = buildReport('jami', computeChart(SIYEON), { jami: J });
  const twelve = jami.sections.find((s) => s.id === 'jm-palaces');
  assert.ok(twelve, '12궁 전체 읽기 장이 있다');
  assert.equal(twelve.blocks[0].t, 'jami', '첫 블록이 명반판');
  assert.equal(twelve.blocks.some((b) => b.t === 'table'), false, '세로 12행 표 없음');
  assert.equal(twelve.freeBlocks, 0, '미결제 상태에서는 12궁 명반판도 가려야 한다');
  const html = renderJamiBoard(twelve.blocks[0].jami);
  assert.equal((html.match(/class="jb-cell/g) || []).length, 12);

  const life = buildReport('lifetime', computeChart(SIYEON), { jami: J, now: new Date('2026-11-22T15:00:00+09:00') });
  const sec = life.sections.find((s) => s.id === 'jami');
  assert.ok(sec, '평생 리포트에 자미두수 장');
  assert.equal(sec.blocks[1].t, 'jami', '자미두수 장도 명반판 컴포넌트');
});

test('명반판 — 명궁에 주성이 있으면 공궁 문구 없이 주성 이름을 남긴다', () => {
  const j97 = jamiOf({ calendar: 'solar', year: 1997, month: 6, day: 17, hour: 8, minute: 0, gender: 'male' });
  const html = renderJamiBoard(j97);
  assert.ok(html.includes('명궁 寅에 '), '명궁 주성 안내');
  assert.equal(html.includes('차입'), false, '명궁이 비어 있지 않으면 차입 문구 없음');
});
