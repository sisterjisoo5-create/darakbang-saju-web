// 최애궁합 — 상품 정의 · 6글자(생시 모름) 계산 · 점수 · 4장 구성 · 무료 맛보기 검증
// 2026-11-23 개편: '최애의 삼주육자 → 찰떡 일주 TOP 3 → 우리의 첫 만남 → 나랑 연애하면?' 순서
// 실행: npm test

import test from 'node:test';
import { computeChart } from '../src/engine/saju.js';
import { buildReport } from '../src/content/report.js';
import {
  biasReading, biasBandOf, synergyMonths, josa, partnerNeeds, roleOf, idealIlju, myFit, firstMeeting,
  SEASON_OHAENG, SEASON_ORDER, PLACE_DIRECTION,
} from '../src/engine/bias.js';
import { branchRelation, stemRelation } from '../src/engine/compat.js';
import { PRODUCTS, productById } from '../src/config/products.js';
import { OHAENG, STEMS, BRANCHES } from '../src/engine/constants.js';

function eq(actual, expected, msg = '') {
  if (!Object.is(actual, expected)) throw new Error(`${msg} | 기대 ${JSON.stringify(expected)} · 실제 ${JSON.stringify(actual)}`);
}
function ok(cond, msg = '') {
  if (!cond) throw new Error(msg || '조건 불충분');
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
  ok(p.desc.includes('삼주육자'), `상품 설명이 삼주육자로 시작한다 — ${p.desc}`);
  ok(p.desc.includes('첫 만남'), `상품 설명이 첫 만남 시나리오를 담는다 — ${p.desc}`);
  ok(p.desc.includes('연애'), `상품 설명이 연애 궁합을 담는다 — ${p.desc}`);
  eq(p.char, 'horse', '말 캐릭터 유지');
  eq(p.requireBias, true);
  eq(p.badge, 'NEW!');
  eq(p.freeTag, '점수는 무료');
  eq(PRODUCTS.length, 12, '상품은 열두 종');
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

test('최애궁합 리포트 — 4장이 삼주육자 → TOP 3 → 첫 만남 → 연애 궁합 순서로 놓인다', () => {
  const me = chartOf(ME);
  const bias = chartOf(BIAS_UNKNOWN);
  const r = buildReport('bias', me, { bias, biasName: '차은우', now: new Date('2026-11-18T09:00:00+09:00') });
  ok(r && r.sections.length === 4, `섹션 ${r && r.sections.length}`);
  eq(r.sections.map((s) => s.id).join(','), 'bi-six,bi-top3,bi-first,bi-us');

  const heads = [
    ['삼주육자'],
    ['찰떡인 일주 TOP 3'],
    ['우리의 첫 만남은'],
    ['그래서 나랑 연애하면'],
  ];
  heads.forEach((parts, i) => parts.forEach((h) => ok(r.sections[i].heading.includes(h), `${i + 1}번 제목 → ${r.sections[i].heading}`)));

  for (const sec of r.sections) {
    ok(sec.blocks.length >= (sec.id === 'bi-first' ? 4 : 7), `${sec.id} 블록 부족(${sec.blocks.length})`);
    ok(Number.isInteger(sec.freeBlocks) && sec.freeBlocks > 0, `${sec.id} 무료 블록`);
  }
  const text = reportText(r);
  const nameHits = (text.match(/차은우/g) || []).length;
  ok(nameHits >= 8, `이름 노출 ${nameHits}회`);
  ok(text.includes('2026년') && text.includes('2027년'), '2026~2027 달 표기');

  // 1장 — 삼주육자를 짚고, 한 박스에 진짜 성격 다섯 줄
  const first = r.sections[0].blocks.map(blockText).join(' ');
  ok(first.includes('삼주육자'), '1장에 삼주육자 요약이 없다');
  ok(first.includes('사주 온도'), '1장에 사주 온도가 없다');
  const sixBox = r.sections[0].blocks.find((b) => b.t === 'box');
  ok(sixBox, '1장 성격 박스가 없다');
  eq(sixBox.v.length, 5, '1장 박스는 다섯 줄');
  ok(sixBox.v.join(' ').includes('무대 밖'), '1장 박스에 무대 밖 기질이 없다');
  ok(sixBox.v.join(' ').includes('무대 위'), '1장 박스에 무대 위 모습이 없다');

  // 3장 — 계절·장소·시간대가 모두 있고, 이야기가 한 박스에
  const kv = r.sections[2].blocks.find((b) => b.t === 'kv');
  eq(kv.v.length, 4, '3장 kv 네 칸');
  eq(kv.v.map(([k]) => k).join(','), '계절,장소,시간,그날의 기운');
  const scene = r.sections[2].blocks.find((b) => b.t === 'box');
  ok(scene && scene.v.length === 3, '3장 한 장면 박스');
  ok(scene.v.join(' ').length > 400, '3장 장면이 한 페이지 분량');

  // 4장 — 점수·빈틈·엇박자·빛나는 달 + 설렘 요약 네 줄
  const us = r.sections[3].blocks;
  ok(us.some((b) => b.t === 'score'), '4장에 궁합 점수가 없다');
  ok(us.map(blockText).join(' ').includes('빈틈을 채우는 방식'), '4장에 빈틈 채우는 방식이 없다');
  ok(us.map(blockText).join(' ').includes('빛나는 달'), '4장에 빛나는 달이 없다');
  const sweet = us.find((b) => b.t === 'box');
  ok(sweet && sweet.rows && sweet.rows.length === 4, '4장 설렘 요약은 네 줄');
  eq(sweet.rows.map(([k]) => k).join(','), '내 앞에서만 보이는 모습,최애한테 직빵인 한 마디,둘이 잘 맞는 데이트,우리 둘이 잘 어울리는 커플룩');
});

test('최애궁합 리포트 — 맨 위 요약 카드 없이 1장 삼주육자부터 열린다', () => {
  const me = chartOf(ME);
  const bias = chartOf(BIAS_UNKNOWN);
  const r = buildReport('bias', me, { bias, biasName: '차은우' });
  eq(r.preview, undefined, '상단 맛보기 카드 데이터가 남아 있다');
  eq(r.sections[0].id, 'bi-six', '첫 장은 삼주육자');
  eq(r.sections[0].heading, '차은우의 삼주육자', '첫 카드 제목은 최애의 삼주육자');
  ok(r.summary.includes('점'), '결제 바에 쓰는 한 줄 요약은 남긴다');
});

test('커플룩 — 한 사람 코디가 아니라 둘이 같이 입는 시밀러 룩이다', () => {
  const me = chartOf(ME);
  const lookOf = (bias) => {
    const r = buildReport('bias', me, { bias, biasName: '차은우' });
    return r.sections[3].blocks.find((b) => b.t === 'box').rows[3];
  };
  const [label, look] = lookOf(chartOf(BIAS_UNKNOWN));
  eq(label, '우리 둘이 잘 어울리는 커플룩');
  ok(look.includes('한 사람은') && look.includes('다른 한 사람은'), `두 사람이 다 보이지 않는 문구 — ${look}`);
  ok(look.includes('인생네컷'), '인생네컷 투샷 감성이 없다');
  ok(!/(여성|남성|여자|남자|그녀|코랄 립|블라우스)/.test(look), `한 사람 성별 코디로 읽힌다 — ${look}`);
  ok(/(니트|셔츠|가죽자켓|롱코트|울 자켓|가디건)/.test(look), '소재·아이템이 구체적이지 않다');
  ok(/(슬랙스|청바지|데님|부츠컷|와이드|바지|팬츠)/.test(look), '실루엣이 구체적이지 않다');
  ok(look.includes('포인트는') && /(올리브 그린|코랄 레드|카멜 브라운|실버 그레이|딥 네이비)/.test(look), '색 포인트가 없다');

  // 같은 두 사주 = 같은 벌, 다른 최애를 여럿 넣으면 벌도 갈린다
  eq(lookOf(chartOf(BIAS_UNKNOWN))[1], look, '같은 두 사주면 같은 커플룩');
  const looks = new Set();
  for (let y = 1988; y <= 1999; y += 1) {
    for (const [m, d] of [[2, 11], [6, 23], [10, 7]]) {
      const [, text] = lookOf(chartOf({ calendar: 'solar', year: y, month: m, day: d, timeUnknown: true, gender: 'male' }));
      ok(!text.includes('undefined') && !text.includes('object'), `빈 문구 — ${text}`);
      looks.add(text);
    }
  }
  ok(looks.size >= 4, `커플룩 종류가 너무 적다 (${looks.size}가지)`);
});

test('최애의 필요 기운 — 비어 있는 오행이 먼저, 다 있으면 가장 얇은 오행', () => {
  const me = chartOf(ME);
  const bias = chartOf(BIAS_UNKNOWN);
  const need = partnerNeeds(bias);
  ok(OHAENG.includes(need.primary) && OHAENG.includes(need.secondary));
  ok(need.primary !== need.secondary, '두 기운은 서로 다르다');
  if (bias.ohaeng.missing.length) {
    ok(bias.ohaeng.missing.includes(need.primary), '비어 있는 오행을 먼저 고른다');
    eq(need.primaryFrom, 'missing');
  } else {
    eq(need.primaryFrom, 'weak');
    const min = Math.min(...OHAENG.map((o) => bias.ohaeng.count[o] || 0));
    eq(bias.ohaeng.count[need.primary] || 0, min, '가장 얇은 오행을 고른다');
  }
  const fit = myFit(me, bias, need);
  ok(fit.primary >= 0 && fit.secondary >= 0);
  ok(typeof fit.fills === 'boolean' && typeof fit.balance === 'boolean');
});

test('최애의 역할 — 십성 묶음에서 가장 많은 쪽을 고른다', () => {
  const bias = chartOf(BIAS_UNKNOWN);
  const role = roleOf(bias);
  ok(['표현', '책임', '벌이', '품음', '동료'].includes(role.group), role.group);
  ok(role.members.length === 2, '묶음은 십성 두 개');
  ok(role.count >= 1, `개수 ${role.count}`);
  ok(role.line.length > 10, '역할 설명');
});

test('찰떡 일주 TOP 3 — 60일주에서 결정론적으로 셋을 고르고 일간이 겹치지 않는다', () => {
  const me = chartOf(ME);
  const bias = chartOf(BIAS_UNKNOWN);
  const a = idealIlju(bias, me);
  const b = idealIlju(bias, me);
  eq(a.top.map((x) => x.ilju).join(','), b.top.map((x) => x.ilju).join(','), '같은 입력 = 같은 TOP 3');
  eq(a.top.length, 3);
  eq(new Set(a.top.map((x) => x.stem)).size, 3, '일간은 서로 다르다');
  eq(new Set(a.top.map((x) => x.branch)).size, 3, '일지는 서로 다르다');
  for (const row of a.top) {
    ok(!row.ilju.includes(bias.pillars.day.ko), '최애와 같은 일주는 넣지 않는다');
    ok(row.score >= 60, `${row.ilju} 점수 ${row.score}`);
    ok(row.han.length === 2, '한자 표기');
  }
  ok(a.list.length === 59, `후보 ${a.list.length} — 최애 일주 하나를 뺀 59개`);
  ok(a.list.every((row, i) => i === 0 || a.list[i - 1].score >= row.score), '점수 내림차순');
  // 내 일주 자리
  ok(a.mine && a.mine.ilju === me.pillars.day.ko);
  if (!a.mine.sameAsBias) ok(a.mine.rank >= 1 && a.mine.rank <= 59, `내 순위 ${a.mine.rank}`);
});

test('찰떡 일주 TOP 3 — 필요한 오행을 가진 일주가 위로 올라온다', () => {
  const bias = chartOf({ calendar: 'solar', year: 1993, month: 12, day: 4, timeUnknown: true, gender: 'male' });
  const need = partnerNeeds(bias);
  const ideal = idealIlju(bias, null);
  const top3 = ideal.top;
  const fills = top3.filter((row) => row.match.stem || row.match.branch).length;
  ok(fills >= 2, `TOP 3 중 필요 오행을 채우는 일주 ${fills}개`);
  ok(top3.some((row) => row.stemOhaeng === need.primary || row.branchOhaeng === need.primary), '가장 필요한 오행을 가진 일주가 들어 있다');
});

test('찰떡 일주 TOP 3 — 내 일주가 들어가면 「어! 내 일주」 재미 포인트가 나온다', () => {
  const me = chartOf(ME);
  let found = null;
  for (let y = 1988; y <= 2002 && !found; y += 1) {
    for (const [m, d] of [[1, 9], [3, 21], [5, 14], [7, 2], [9, 18], [11, 30]]) {
      const bias = chartOf({ calendar: 'solar', year: y, month: m, day: d, timeUnknown: true, gender: 'male' });
      const ideal = idealIlju(bias, me);
      if (ideal.mine.inTop) { found = { bias, ideal }; break; }
    }
  }
  ok(found, '내 일주가 TOP 3에 드는 최애를 찾지 못했다');
  const r = buildReport('bias', me, { bias: found.bias, biasName: '차은우' });
  const text = reportText(r);
  ok(text.includes('어! 내 일주'), 'TOP 3에 들면 재미 포인트를 보여 준다');
  ok(text.includes(found.ideal.mine.ilju), '내 일주 이름');
});


test('우리의 첫 만남 — 계절·장소·시간이 두 사주로 결정되고, 다른 최애면 장면도 달라진다', () => {
  const me = chartOf(ME);
  const a = chartOf(BIAS_UNKNOWN);
  const b = chartOf(BIAS_OTHER);
  const f1 = firstMeeting(me, a);
  const f2 = firstMeeting(me, a);
  eq(JSON.stringify(f1), JSON.stringify(f2), '같은 두 사주 = 같은 장면');
  ok(SEASON_ORDER.includes(f1.season.key), `계절 ${f1.season.key}`);
  eq(SEASON_OHAENG[f1.season.key], f1.season.ohaeng, '계절과 오행이 짝을 이룬다');
  ok(OHAENG.includes(f1.place.ohaeng), `장소 오행 ${f1.place.ohaeng}`);
  eq(PLACE_DIRECTION[f1.place.ohaeng], f1.place.direction, '오행과 방위가 짝을 이룬다');
  ok(f1.hour.branch >= 0 && f1.hour.branch < 12, `시진 ${f1.hour.branch}`);
  ok(f1.place.variant === 0 || f1.place.variant === 1, '장소 문구는 두 가지 중 하나');
  ok(f1.hour.variant === 0 || f1.hour.variant === 1, '첫마디는 두 가지 중 하나');
  const f3 = firstMeeting(me, b);
  ok(
    f1.season.key !== f3.season.key || f1.place.ohaeng !== f3.place.ohaeng || f1.hour.branch !== f3.hour.branch,
    '최애가 다르면 계절·장소·시간 중 하나는 달라진다',
  );
  // 첫 만남은 늦은 오후~밤에 열린다 — 새벽 1~5시 시진(축·인)은 고르지 않는다
  for (const bias of [a, b, chartOf({ calendar: 'solar', year: 1990, month: 9, day: 5, timeUnknown: true, gender: 'female' })]) {
    const f = firstMeeting(me, bias);
    ok(![1, 2].includes(f.hour.branch), `새벽 시진이 뽑혔다 — ${f.hour.ko}`);
  }
});

test('첫 만남 리포트 — 계절·장소·시간이 카드 안에 한글로 들어간다', () => {
  const me = chartOf(ME);
  const bias = chartOf(BIAS_UNKNOWN);
  const r = buildReport('bias', me, { bias, biasName: '차은우' });
  const fm = firstMeeting(me, bias);
  const kv = r.sections[2].blocks.find((b) => b.t === 'kv');
  const all = kv.v.map(([, v]) => v).join(' ');
  ok(all.includes(fm.season.key), '계절 표기');
  ok(kv.v[1][1].includes(fm.place.direction), '방위 표기');
  ok(kv.v[2][1].includes('시') || kv.v[2][1].includes('분'), '시각 표기');
  ok(all.includes('기운'), '그날의 기운 표기');
  ok(!r.sections[2].blocks.some((b) => b.t === 'table'), '첫 만남 장에는 표를 두지 않는다');
});

test('설렘 요약 — 네 줄이 최애의 필요 기운·사주 온도에 따라 달라진다', () => {
  const me = chartOf(ME);
  const rowsOf = (bias) => {
    const r = buildReport('bias', me, { bias, biasName: '차은우' });
    return r.sections[3].blocks.find((b) => b.t === 'box').rows;
  };
  const a = rowsOf(chartOf(BIAS_UNKNOWN));
  eq(a.length, 4);
  ok(a[1][1].includes('“'), '직빵인 한 마디는 인용문');
  ok(a[3][1].includes('포인트는'), '커플룩은 오행 색 포인트를 짚는다');
  const b = rowsOf(chartOf({ calendar: 'solar', year: 1988, month: 12, day: 1, timeUnknown: true, gender: 'male' }));
  ok(a[3][1] !== b[3][1] || a[0][1] !== b[0][1], '최애가 다르면 설렘 요약도 달라진다');
});

test('최애 생시를 알면 여덟 글자로도 계산된다', () => {
  const me = chartOf(ME);
  const bias = chartOf({ calendar: 'solar', year: 1997, month: 3, day: 30, hour: 9, minute: 0, timeUnknown: false, gender: 'male' });
  ok(bias.pillars.hour, '시주가 있어야 한다');
  eq(bias.charCount, 8);
  const r = buildReport('bias', me, { bias, biasName: '차은우' });
  ok(reportText(r).includes('여덟'), '여덟 글자 안내');
  eq(r.sections[0].heading, '차은우의 삼주육자');
  ok(reportText(r).includes(bias.pillars.day.ko), '시주가 있어도 일주는 그대로 읽는다');
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

test('60일주 후보 — 일간·일지 조합이 60갑자와 같다', () => {
  const bias = chartOf(BIAS_UNKNOWN);
  const ideal = idealIlju(bias, null);
  for (const row of ideal.list.concat(ideal.top)) {
    eq(row.stemKo, STEMS[row.stem].ko);
    eq(row.branchKo, BRANCHES[row.branch].ko);
    eq(row.ilju, `${STEMS[row.stem].ko}${BRANCHES[row.branch].ko}`);
  }
});
