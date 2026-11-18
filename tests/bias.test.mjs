// 최애궁합 — 상품 정의 · 6글자(생시 모름) 계산 · 점수 · 5개 섹션 · 무료 맛보기 검증
// 실행: npm test

import test from 'node:test';
import { computeChart } from '../src/engine/saju.js';
import { buildReport } from '../src/content/report.js';
import { biasPreview } from '../src/content/bias.js';
import { biasReading, biasBandOf, synergyMonths, josa } from '../src/engine/bias.js';
import { branchRelation, stemRelation } from '../src/engine/compat.js';
import { PRODUCTS, productById } from '../src/config/products.js';

function eq(actual, expected, msg = '') {
  if (!Object.is(actual, expected)) throw new Error(`${msg} | 기대 ${JSON.stringify(expected)} · 실제 ${JSON.stringify(actual)}`);
}
function ok(cond, msg = '') {
  if (!cond) throw new Error(msg || '조건 불충족');
}
function chartOf(input) {
  const c = computeChart(input);
  eq(c.ok, true, (c.errors || []).join(', '));
  return c;
}

const ME = { calendar: 'solar', year: 1992, month: 10, day: 15, hour: 7, minute: 33, gender: 'female' };
/** 연예인 기본값 — 생시를 모르는 6글자 */
const BIAS_UNKNOWN = { calendar: 'solar', year: 1997, month: 3, day: 30, timeUnknown: true, gender: 'male' };
const BIAS_OTHER = { calendar: 'solar', year: 2004, month: 8, day: 31, timeUnknown: true, gender: 'female' };

function blockText(b) {
  if (b.v == null) return '';
  return typeof b.v === 'string' ? b.v : JSON.stringify(b.v);
}
function reportText(r) {
  return r.sections.map((s) => `${s.heading} ${s.blocks.map(blockText).join(' ')}`).join(' ');
}

test('최애궁합 상품 — 운명의 짝 자리를 대신하고 설명 문구가 정확하다', () => {
  const p = productById('bias');
  ok(p, 'bias 상품이 없다');
  eq(p.name, '최애궁합');
  eq(p.price, 990);
  eq(p.beads, 1);
  eq(p.desc, '최애의 사주와 나의 사주로 보는 우리의 궁합은?');
  eq(p.char, 'horse', '말 캐릭터 유지');
  eq(p.requireBias, true);
  eq(p.badge, 'NEW!');
  eq(p.freeTag, '점수는 무료');
  eq(PRODUCTS.length, 10, '상품은 그대로 열 종');
  ok(!PRODUCTS.some((x) => x.name === '운명의 짝'), '운명의 짝이 남아 있다');
  ok(!productById('destiny'), 'destiny 상품이 남아 있다');
});

test('최애 생시 모름 — 시주 없이 여섯 글자로 계산된다', () => {
  const c = chartOf(BIAS_UNKNOWN);
  eq(c.pillars.hour, null);
  eq(c.charCount, 6);
  eq(c.input.timeUnknown, true);
  ok(c.summary.split('·').length === 3, `요약 ${c.summary}`);
  ok(c.dayMaster && c.dii && c.ohaeng, '일간·띠·오행이 없다');

  const me = chartOf(ME);
  const r = biasReading(me, c);
  ok(r.score >= 0 && r.score <= 100, `점수 ${r.score}`);
  ok(r.ilju.title && r.band.title, '읽기 문장 없음');
});

test('최애궁합 점수 — 결정론적이고 최애가 다르면 값도 달라진다', () => {
  const me = chartOf(ME);
  const a = chartOf(BIAS_UNKNOWN);
  const b = chartOf(BIAS_OTHER);
  const r1 = biasReading(me, a);
  const r2 = biasReading(me, a);
  eq(r1.score, r2.score, '같은 입력 = 같은 점수');
  const r3 = biasReading(me, b);
  ok(r1.score !== r3.score, '최애가 다르면 점수도 달라야 한다');
  eq(r1.band, biasBandOf(r1.score));
  ok(r1.axes.length === 5 && r1.axes.every((x) => x.value >= 0 && x.value <= 100));
});

test('최애궁합 리포트 — 요구한 5개 섹션과 최애 이름이 본문에 녹아 있다', () => {
  const me = chartOf(ME);
  const bias = chartOf(BIAS_UNKNOWN);
  const r = buildReport('bias', me, { bias, biasName: '차은우', now: new Date('2026-11-18T09:00:00+09:00') });
  ok(r && r.sections.length === 5, `섹션 ${r && r.sections.length}`);
  eq(r.sections.map((s) => s.id).join(','), 'bi-first,bi-style,bi-ohaeng,bi-when,bi-today');

  const heads = [
    '아이돌·배우와 연인이 된다면? 우리의 첫인상 & 설렘 포인트',
    '최애가 실제로 끌리는 연애 스타일 vs 나의 매력 포인트',
    '서로 채워주는 오행 케미 & 조심할 엇박자',
    '2026~2027 두 사람의 시너지가 가장 빛나는 달',
    '오늘의 다락방 처방',
  ];
  heads.forEach((h, i) => ok(r.sections[i].heading.includes(h), `${i + 1}번 제목 → ${r.sections[i].heading}`));

  for (const sec of r.sections) {
    ok(sec.blocks.length >= 4, `${sec.id} 블록 부족`);
    ok(Number.isInteger(sec.freeBlocks) && sec.freeBlocks > 0, `${sec.id} 무료 블록`);
  }
  const text = reportText(r);
  const nameHits = (text.match(/차은우/g) || []).length;
  ok(nameHits >= 6, `이름 노출 ${nameHits}회`);
  ok(text.includes('2026년') && text.includes('2027년'), '2026~2027 달 표기');
});

test('무료 맛보기 — 점수·연인이 된다면 한 줄·일주/오행 요약이 열려 있다', () => {
  const me = chartOf(ME);
  const bias = chartOf(BIAS_UNKNOWN);
  const p = biasPreview(me, bias, '차은우');
  ok(p.score >= 0 && p.score <= 100);
  ok(p.band.title.length > 0);
  ok(p.oneLineLabel === '차은우와 연인이 된다면?', p.oneLineLabel);
  ok(p.oneLine.includes(p.band.title), p.oneLine);
  eq(p.rows.length, 3);
  ok(p.rows[0][1].includes('×'), '일주 케미 요약');
  ok(p.rows[1][1].includes('°C'), '오행 케미 요약');
  const r = buildReport('bias', me, { bias, biasName: '차은우' });
  eq(r.preview.score, p.score);
  ok(r.summary.includes(`${p.score}점`), r.summary);
});

test('최애 생시를 알면 여덟 글자로도 계산된다', () => {
  const me = chartOf(ME);
  const bias = chartOf({ calendar: 'solar', year: 1997, month: 3, day: 30, hour: 9, minute: 0, timeUnknown: false, gender: 'male' });
  ok(bias.pillars.hour, '시주가 있어야 한다');
  eq(bias.charCount, 8);
  const r = buildReport('bias', me, { bias, biasName: '차은우' });
  ok(reportText(r).includes('여덟 글자는'), '여덟 글자 안내');
  ok(r.preview.score >= 0 && r.preview.score <= 100);
});

test('최애 정보가 없으면 리포트 대신 입력이 필요하다고 알린다', () => {
  const me = chartOf(ME);
  const r = buildReport('bias', me, {});
  eq(r.needBias, true);
  eq(r.sections.length, 0);
});

test('2026~2027 시너지 — 스물네 달의 점수가 모두 범위 안이고 1위가 가장 빛나는 달', () => {
  const me = chartOf(ME);
  const bias = chartOf(BIAS_UNKNOWN);
  const syn = synergyMonths(me, bias);
  eq(syn.months.length, 24);
  ok(syn.months.every((m) => m.score >= 45 && m.score <= 96), '점수 범위');
  eq(syn.peak, syn.best[0]);
  ok(syn.best[0].score >= syn.best[1].score && syn.best[1].score >= syn.best[2].score);
  const labels = syn.months.map((m) => m.label);
  ok(labels.includes('2026년 5월') && labels.includes('2027년 12월'), '2026·2027 라벨');
  ok(new Set(labels).size === 24, '달 라벨 중복');
});

test('합충 표 — 진술 충 · 오미 육합 · 을경 일간 합을 잡아낸다', () => {
  eq(branchRelation('진', '술'), '충');
  eq(branchRelation('오', '미'), '육합');
  eq(branchRelation('자', '축'), '육합');
  eq(branchRelation('사', '해'), '충');
  eq(branchRelation('미', '술'), '형');
  const names = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
  eq(stemRelation(names.indexOf('을'), names.indexOf('경')).kind, '합');
  eq(stemRelation(names.indexOf('갑'), names.indexOf('기')).kind, '합');
  eq(stemRelation(names.indexOf('무'), names.indexOf('계')).kind, '합');
  eq(stemRelation(names.indexOf('병'), names.indexOf('신')).kind, '합');
  eq(stemRelation(names.indexOf('정'), names.indexOf('계')).kind, '충');
  eq(stemRelation(names.indexOf('갑'), names.indexOf('경')).kind, '충');
});

test('이름 조사 — 받침에 따라 와/과가 갈린다', () => {
  eq(josa('차은우', '과', '와'), '차은우와');
  eq(josa('장원영', '과', '와'), '장원영과');
  eq(josa('아이유', '과', '와'), '아이유와');
});
