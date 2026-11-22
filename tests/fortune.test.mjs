// 12간지 캐릭터 · 10종 운세 상품 · 새 리포트(연애운/재회운/재물운/최애궁합/자미두수) 검증
// 실행: npm test

import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { computeChart } from '../src/engine/saju.js';
import { computeJami } from '../src/engine/jami.js';
import { buildReport } from '../src/content/report.js';
import { reunionReading, wealthReading, careerReading } from '../src/content/report-extra.js';
import { PRODUCTS, productById, BEAD_PRICE, getProductsForMonth, kstMonth, productsForCurrentMonth } from '../src/config/products.js';
import { ZODIAC, zodiacByAnimal, zodiacByBranch, zodiacOf, zodiacImage, zodiacLabel, yearAnimalKey, iljuLineOf } from '../src/config/zodiac.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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

function blockText(b) {
  if (b.v == null) return '';
  return typeof b.v === 'string' ? b.v : JSON.stringify(b.v);
}

const ME = { calendar: 'solar', year: 1992, month: 10, day: 15, hour: 7, minute: 33, gender: 'female' };
/** 최애궁합용 최애 명식 — 생시를 모르는 6글자 */
const BIAS = { calendar: 'solar', year: 1997, month: 3, day: 30, timeUnknown: true, gender: 'male' };

test('12간지 캐릭터 — 12종이 모두 있고 키가 겹치지 않는다', () => {
  eq(ZODIAC.length, 12);
  eq(new Set(ZODIAC.map((z) => z.key)).size, 12);
  eq(new Set(ZODIAC.map((z) => z.animal)).size, 12);
  eq(new Set(ZODIAC.map((z) => z.branch)).size, 12);
  eq(ZODIAC[0].key, 'jani');
  eq(ZODIAC[0].animal, '쥐');
  eq(ZODIAC[0].name, '자니');
});

test('이름은 자니뿐 — 나머지 11띠는 이름 없이 기본 띠 이름으로만 표기된다', () => {
  for (const z of ZODIAC.slice(1)) {
    eq(z.name, undefined, `${z.animal}띠에 이름이 남아 있음`);
    eq(zodiacLabel(z), `${z.animal}띠`, `${z.animal} 표기`);
    ok(/^[a-z]+$/.test(z.key), `${z.animal} 키가 동물 이름이 아님: ${z.key}`);
  }
  eq(ZODIAC.map((z) => z.key).join(','), 'jani,ox,tiger,rabbit,dragon,snake,horse,sheep,monkey,rooster,dog,pig');
  eq(zodiacLabel(ZODIAC[0]), '자니');
  eq(zodiacLabel(zodiacByAnimal('원숭이')), '원숭이띠');
  eq(zodiacLabel(zodiacByAnimal('말')), '말띠');
  eq(zodiacLabel(zodiacByAnimal('호랑이')), '호랑이띠');
});

test('12간지 캐릭터 — public/images/zodiac/*-cut.webp 가 실제로 존재한다', () => {
  for (const z of ZODIAC) {
    const p = path.join(ROOT, 'public', 'images', 'zodiac', `${z.key}-cut.webp`);
    ok(fs.existsSync(p), `${z.key} 이미지 없음`);
    ok(fs.statSync(p).size > 3000, `${z.key} 이미지가 너무 작음`);
    eq(zodiacImage(z.key), `/images/zodiac/${z.key}-cut.webp`);
  }
});

test('띠 → 캐릭터 연결 — 원숭이띠는 원숭이 캐릭터, 말띠는 말 캐릭터', () => {
  eq(zodiacByAnimal('원숭이').key, 'monkey');
  eq(zodiacByAnimal('말').key, 'horse');
  eq(zodiacByBranch('신').key, 'monkey');
  eq(zodiacByBranch('오').key, 'horse');
  eq(zodiacOf('없는키').key, 'jani'); // 기본값 = 자니
  const c = chartOf(ME);
  eq(c.dii, '원숭이');
  eq(zodiacByAnimal(c.dii).key, 'monkey');
  eq(zodiacLabel(zodiacByAnimal(c.dii)), '원숭이띠');
});

test('일주 특징 한 줄 — 12동물 모두 정해진 문구 그대로, 동물 이름은 들지 않는다', () => {
  const WANT = {
    쥐: '기회를 빠르게 포착하는 영민함',
    소: '묵묵히 쌓아 올리는 신뢰',
    호랑이: '내 편을 위해 기꺼이 앞장서는 듬직한 온기',
    토끼: '섬세한 감각과 유연한 적응력',
    용: '판을 흔드는 스케일과 카리스마',
    뱀: '깊은 통찰과 흔들리지 않는 집중력',
    말: '망설임 없이 앞을 향해 내딛는 자유로움',
    양: '포근하게 감싸주는 온화함',
    원숭이: '어떤 상황에서도 답을 찾는 재치와 기지',
    닭: '흐트러짐 없는 예리한 성실함',
    개: '한번 정하면 끝까지 가는 의리',
    돼지: '꾸밈없는 진심으로 편안하게 만드는 여유',
  };
  eq(Object.keys(WANT).length, 12);
  for (const z of ZODIAC) {
    eq(z.iljuLine, WANT[z.animal], `${z.animal} 일주 특징`);
    ok(!z.iljuLine.includes(z.animal), `${z.animal} 특징에 동물 이름이 들어감: ${z.iljuLine}`);
    ok(!z.iljuLine.includes('띠') && !z.iljuLine.includes(':'), `${z.animal} 특징에 띠 표기·콜론이 들어감`);
    eq(iljuLineOf(z.branch), WANT[z.animal], `${z.branch} 지지 → 일주 특징`);
  }
  // 12문구가 서로 겹치지 않는다
  eq(new Set(ZODIAC.map((z) => z.iljuLine)).size, 12);
});

test('원국 원형 배지 — 일주(일지) 동물은 년지 띠와 상관없이 일주 지지만 본다', () => {
  // 1991-05-07 18:22 여 — 신미년 · 계사월 · 정축일 · 기유시
  const c = chartOf({ calendar: 'solar', year: 1991, month: 5, day: 7, hour: 18, minute: 22, gender: 'female' });
  eq(c.dii, '양');
  eq(c.pillars.day.branchKo, '축');
  eq(c.pillars.day.animal, '소');
  const dayZ = zodiacByBranch(c.pillars.day.branch);
  eq(dayZ.key, 'ox');
  eq(dayZ.animal, '소');
  eq(dayZ.iljuLine, '묵묵히 쌓아 올리는 신뢰');
  eq(zodiacImage(dayZ.key), '/images/zodiac/ox-cut.webp');
  // 지지 인덱스(0~11)와 한글 지지가 같은 동물로 이어진다
  for (const z of ZODIAC) {
    eq(zodiacByBranch(z.branch).key, z.key);
    eq(zodiacByBranch(z.order - 1).key, z.key);
  }
  eq(zodiacByBranch(12).key, 'jani'); // 자시로 한 바퀴
  // 일주 동물이 바뀌면 배지 그림도 바뀐다 (쥐 일주 = 자니)
  const rat = chartOf({ calendar: 'solar', year: 2020, month: 2, day: 3, hour: 10, minute: 0, gender: 'male' });
  eq(rat.pillars.day.branchKo, '자');
  eq(zodiacByBranch(rat.pillars.day.branch).key, 'jani');
});

test('운세 상품 12종 — 가격·구슬·후킹 문구·캐릭터가 규칙에 맞다', () => {
  eq(PRODUCTS.length, 12);
  eq(new Set(PRODUCTS.map((p) => p.id)).size, 12);
  const badgeOk = new Set([null, '인기', '추천', 'NEW!']);
  const freeOk = new Set([null, '일부는 무료', '점수는 무료']);
  for (const p of PRODUCTS) {
    eq(p.beads * BEAD_PRICE, p.price, `${p.id} 구슬·금액 불일치`);
    ok(Array.isArray(p.hook) && p.hook.length >= 2 && p.hook.length <= 3, `${p.id} 후킹 두 줄(또는 세 줄) 필요`);
    ok(p.hook.every((l) => l.length > 0 && l.length <= 20), `${p.id} 후킹 길이`);
    ok(badgeOk.has(p.badge), `${p.id} 배지 값`);
    ok(freeOk.has(p.freeTag), `${p.id} 무료 배지 값`);
    ok(ZODIAC.some((z) => z.key === p.char), `${p.id} 캐릭터 키`);
    ok(p.features.length >= 3, `${p.id} 특징 개수`);
  }
  eq(productById('saju').beads, 1);
  eq(productById('lifetime').beads, 10);
  eq(productById('lifetime').price, 9900);
  eq(productById('reunion').freeTag, '점수는 무료');
  eq(productById('compat').requirePartner, true);
  eq(productById('newyear').badge, 'NEW!');
});

test('직업 · 이직운 카드 — 8번째 상품(개 캐릭터 · 990원 · 1구슬)', () => {
  const p = productById('career');
  ok(p, 'career 상품이 없다');
  eq(p.name, '직업 · 이직운');
  eq(p.price, 990);
  eq(p.beads, 1);
  eq(p.char, 'dog');
  eq(p.requirePartner, false);
  eq(p.freeTag, '일부는 무료');
  ok(p.hook.length === 2 && p.hook.join(' ').includes('이직'), '후킹에 이직 키워드가 없다');
  eq(PRODUCTS.findIndex((x) => x.id === 'career'), 7, '직업 카드는 8번째(index 7)');
  eq(PRODUCTS[PRODUCTS.length - 1].id, 'lifetime', '평생 종합 리포트가 마지막 카드');
});

test('상품 배열 순서 — 신년 → 궁합 → 띠일주 → 최애궁합 → 연애 → 재회 → 자미 → 직업 → 재물 → 대운 → 사주 → 평생', () => {
  eq(PRODUCTS.map((p) => p.id).join(','),
    'newyear,compat,zodiac-ilju,bias,love,reunion,jami,career,wealth,daewoon,saju,lifetime');
  // 모바일 2열 짝꿍: 신년+궁합 / 띠일주+최애궁합 / 연애+재회 / 자미+직업 / 재물+대운 / 사주+평생
  eq(PRODUCTS.findIndex((p) => p.id === 'jami'), 6, '자미두수는 7번째(index 6)');
  eq(PRODUCTS.findIndex((p) => p.id === 'daewoon'), 9, '10년 대운은 10번째(index 9)');
});

test('달력 기준 카드 순서 — 11~2월은 신년이 1번·정통 사주가 11번, 3~10월은 그 반대', () => {
  const middle = (list) => list.filter((_, i) => i !== 0 && i !== 10).map((p) => p.id).join(',');
  const baseMiddle = PRODUCTS.filter((_, i) => i !== 0 && i !== 10).map((p) => p.id).join(',');

  for (const m of [11, 12, 1, 2]) {
    const list = getProductsForMonth(m);
    eq(list.length, 12, `${m}월 카드 수`);
    eq(list[0].id, 'newyear', `${m}월 1번 카드는 신년운세`);
    eq(list[10].id, 'saju', `${m}월 11번 카드는 정통 사주`);
    eq(middle(list), baseMiddle, `${m}월 나머지 카드 순서 유지`);
    eq(new Set(list.map((p) => p.id)).size, 12, `${m}월 중복 없음`);
  }
  for (const m of [3, 4, 5, 6, 7, 8, 9, 10]) {
    const list = getProductsForMonth(m);
    eq(list.length, 12, `${m}월 카드 수`);
    eq(list[0].id, 'saju', `${m}월 1번 카드는 정통 사주`);
    eq(list[10].id, 'newyear', `${m}월 11번 카드는 신년운세`);
    eq(middle(list), baseMiddle, `${m}월 나머지 카드 순서 유지`);
    eq(new Set(list.map((p) => p.id)).size, 12, `${m}월 중복 없음`);
  }
  // 잘못된 값은 기본 순서를 그대로 돌려준다
  eq(getProductsForMonth(0), PRODUCTS, '0월은 기본 순서');
  eq(getProductsForMonth(13), PRODUCTS, '13월은 기본 순서');
  eq(getProductsForMonth(undefined), PRODUCTS, '값 없음은 기본 순서');
});

test('신년 카드 캐릭터 — 그 해 띠 동물을 따라가고, 나머지 11개 카드 동물은 고정', () => {
  eq(yearAnimalKey(2020), 'jani', '2020 경자년 = 쥐');
  eq(yearAnimalKey(1996), 'jani', '1996 병자년 = 쥐');
  eq(yearAnimalKey(2027), 'sheep', '2027 정미년 = 양');
  eq(yearAnimalKey(2028), 'monkey', '2028 무신년 = 원숭이');
  eq(yearAnimalKey(2029), 'rooster', '2029 기유년 = 닭');
  eq(yearAnimalKey(2032), 'jani', '2032 임자년 = 쥐');

  // 2026년 11월(서울) — 신년 시즌, 대상 해 2027 정미년 = 양
  const NOV = new Date('2026-11-22T12:00:00Z');
  const ny = productById('newyear', NOV);
  eq(ny.char, 'sheep', '2027 신년 카드는 양');
  eq(ny.name, '2027 신년 운세', '시즌에는 해를 붙인 이름');
  eq(zodiacOf(ny.char).animal, '양', '메달 라벨은 양띠');
  eq(productById('love').char, 'rooster', '연애운은 닭으로 옮겨 간다');

  // 신년 카드를 뺀 11개 카드의 동물은 어느 해에도 그대로다
  const fixed = PRODUCTS.filter((p) => p.id !== 'newyear').map((p) => p.char);
  eq(new Set(fixed).size, 11, `나머지 11개 카드 동물이 모두 다르다 — ${fixed.join(',')}`);
  eq(new Set('jani,ox,tiger,rabbit,dragon,snake,horse,sheep,monkey,rooster,dog,pig'.split(',')).size, 12);
});

test('KST 기준 이번 달 — UTC 날짜가 달라도 한국 시간으로 월을 정한다', () => {
  eq(kstMonth(new Date('2026-11-20T00:30:00+09:00')), 11, '11월');
  eq(kstMonth(new Date('2026-12-31T16:00:00Z')), 1, '12/31 16:00Z = 1/1 01:00 KST → 1월');
  eq(kstMonth(new Date('2026-03-31T15:30:00Z')), 4, '3/31 15:30Z = 4/1 00:30 KST → 4월');
  eq(kstMonth(new Date('2026-02-28T15:00:00Z')), 3, '2/28 15:00Z = 3/1 00:00 KST → 3월');
  // 현재 달 순서는 같은 달의 getProductsForMonth 와 같다 (이름·띠까지 같은 달 기준)
  const now = new Date('2026-11-20T08:47:00+09:00');
  eq(productsForCurrentMonth(now).map((p) => p.id).join(','), getProductsForMonth(11, now).map((p) => p.id).join(','));
  eq(productsForCurrentMonth(now)[0].name, '2027 신년 운세');
  const march = new Date('2026-03-02T09:00:00+09:00');
  eq(productsForCurrentMonth(march)[0].id, 'saju', '3월에는 1번 카드가 정통 사주');
  eq(productsForCurrentMonth(march)[10].id, 'newyear', '3월에는 정통 사주 자리로 물러난 카드가 일년 운세');
  eq(productsForCurrentMonth(march)[10].name, '일년 운세');
});

test('상품 배열 — 자미두수(호랑이)와 10년 대운(소)이 2열·4열 그리드에서 붙지 않는다', () => {
  const idx = (id) => PRODUCTS.findIndex((p) => p.id === id);
  const tiger = idx('jami');
  const ox = idx('daewoon');
  ok(tiger >= 0 && ox >= 0, '두 상품이 있다');
  // 모바일 2열 — 같은 줄(index/2)에 있으면 나란히 붙는다
  ok(Math.floor(tiger / 2) !== Math.floor(ox / 2), '2열 그리드에서 같은 줄이다');
  ok(Math.abs(tiger - ox) > 1, '카드가 바로 옆이다');
  // 데스크톱 4열 — 같은 줄(index/4)에 있으면 한 줄에 나란히 보인다
  ok(Math.floor(tiger / 4) !== Math.floor(ox / 4), '4열 그리드에서 같은 줄이다');
  eq(PRODUCTS.length, 12);
});

test('자미두수 심층 카드 — 어려운 용어 없이 쉬운 설명을 붙인다', () => {
  const p = productById('jami');
  ok(p.hook.join(' ').includes('여덟 글자'), '후킹이 사주와의 연결을 설명하지 않는다');
  ok(!p.hook.join(' ').includes('명궁'), '후킹에 명궁 같은 용어가 남아 있다');
  eq(p.hook.join(' '), '같은 여덟 글자, 다른 각도로 숨은 내 모습 읽기', '카드 문구는 두 줄 그대로');
  eq(p.desc, undefined, '보라색 박스 설명은 삭제 — 카드 문구는 hook 두 줄로만');
});

test('새 리포트 5종 — 사주·자미두수 결과로 섹션이 만들어진다', () => {
  const c = chartOf(ME);
  const j = jamiOf(c, 'female');
  const bias = chartOf(BIAS);
  for (const id of ['love', 'reunion', 'wealth', 'bias', 'jami']) {
    const r = buildReport(id, c, { jami: j, bias, biasName: '차은우', now: new Date('2026-11-18T09:00:00+09:00') });
    ok(r && r.sections && r.sections.length >= 4, `${id} 섹션 부족`);
    ok(r.title && r.subtitle, `${id} 제목`);
    for (const sec of r.sections) {
      ok(sec.blocks && sec.blocks.length > 0, `${sec.id} 블록 없음`);
      ok(Number.isInteger(sec.freeBlocks) && sec.freeBlocks > 0, `${sec.id} 무료 블록 필요`);
    }
  }
});

test('재회운 — 점수는 같은 입력에 항상 같고 0~100 안에 있다', () => {
  const c = chartOf(ME);
  const j = jamiOf(c, 'female');
  const a = reunionReading(c, j);
  const b = reunionReading(c, j);
  eq(a.score, b.score);
  ok(a.score >= 30 && a.score <= 95, `재회 점수 ${a.score}`);
  ok(a.longing >= 20 && a.longing <= 97);
  ok(a.band.title.length > 0);
  const r = buildReport('reunion', c, { jami: j });
  ok(r.summary.includes(`${a.score}점`), '리포트 요약에 점수 반영');
});

test('재물운 — 재물 그릇 점수 범위와 통로 판정', () => {
  const c = chartOf(ME);
  const w = wealthReading(c);
  ok(w.vessel >= 30 && w.vessel <= 96, `그릇 ${w.vessel}`);
  ok(['재성', '식상', '인성', '비겁', '관성'].includes(w.gate));
  ok(w.jae + w.sik + w.bi >= 0);
  const r = buildReport('wealth', c, {});
  ok(r.subtitle.includes(`${w.vessel}점`));
});

test('무료 맛보기 — 잠금 전에 보이는 블록이 비어 있지 않다', () => {
  const c = chartOf(ME);
  const j = jamiOf(c, 'female');
  const bias = chartOf(BIAS);
  for (const id of ['love', 'reunion', 'wealth', 'bias', 'jami', 'saju', 'lifetime', 'newyear', 'daewoon']) {
    const r = buildReport(id, c, { jami: j, bias, biasName: '차은우' });
    const visible = r.sections.reduce((n, s) => n + Math.min(s.freeBlocks, s.blocks.length), 0);
    ok(visible >= 2, `${id} 무료로 보이는 블록 ${visible}`);
  }
});

test('직업 · 이직운 — 일의 그릇·이직 온도는 같은 입력에 항상 같고, 5장으로 만들어진다', () => {
  const c = chartOf(ME);
  const j = jamiOf(c, 'female');
  const a = careerReading(c, j);
  const b = careerReading(c, j);
  eq(a.fit, b.fit);
  eq(a.move, b.move);
  ok(a.fit >= 30 && a.fit <= 96, `일의 그릇 ${a.fit}`);
  ok(a.move >= 25 && a.move <= 95, `이직 온도 ${a.move}`);
  ok(['관성', '식상', '인성', '재성', '비겁'].includes(a.gate), `통로 ${a.gate}`);
  ok(a.band.title.length > 0 && a.moveBand.title.length > 0);

  const r = buildReport('career', c, { jami: j, now: new Date('2026-11-20T08:00:00+09:00') });
  ok(r, '직업 리포트가 없다');
  eq(r.title, '직업 · 이직운');
  eq(r.sections.length, 5, '일의 그릇·판·지금·타이밍·체크리스트');
  eq(r.sections.map((s) => s.id).join(','), 'cr-vessel,cr-field,cr-now,cr-move,cr-decide');
  ok(r.summary.includes(`${a.fit}점`) && r.summary.includes(`${a.move}점`), `요약 ${r.summary}`);
  const text = r.sections.map((s) => s.blocks.map(blockText).join(' ')).join(' ');
  ok(text.includes('이직'), '이직 이야기가 없다');
  ok(text.includes(a.band.title), '일의 그릇 판정이 본문에 없다');
  ok(text.includes('관록궁') || text.includes('자미두수'), '자미두수 관록궁 언급이 없다');
  // 시주가 없어도(시간 미상) 리포트가 만들어진다
  const noHour = chartOf({ calendar: 'solar', year: 1997, month: 3, day: 30, timeUnknown: true, gender: 'male' });
  const r2 = buildReport('career', noHour, {});
  ok(r2 && r2.sections.length >= 5, '시간 미상에서 직업 리포트가 비었다');
});
