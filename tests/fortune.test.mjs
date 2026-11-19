// 12간지 캐릭터 · 10종 운세 상품 · 새 리포트(연애운/재회운/재물운/최애궁합/자미두수) 검증
// 실행: npm test

import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { computeChart } from '../src/engine/saju.js';
import { computeJami } from '../src/engine/jami.js';
import { buildReport } from '../src/content/report.js';
import { reunionReading, wealthReading } from '../src/content/report-extra.js';
import { PRODUCTS, productById, BEAD_PRICE } from '../src/config/products.js';
import { ZODIAC, zodiacByAnimal, zodiacByBranch, zodiacOf, zodiacImage, zodiacLabel } from '../src/config/zodiac.js';

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

test('운세 상품 11종 — 가격·구슬·후킹 문구·캐릭터가 규칙에 맞다', () => {
  eq(PRODUCTS.length, 11);
  eq(new Set(PRODUCTS.map((p) => p.id)).size, 11);
  const badgeOk = new Set([null, '인기', '추천', 'NEW!']);
  const freeOk = new Set([null, '일부는 무료', '점수는 무료']);
  for (const p of PRODUCTS) {
    eq(p.beads * BEAD_PRICE, p.price, `${p.id} 구슬·금액 불일치`);
    ok(Array.isArray(p.hook) && p.hook.length === 2, `${p.id} 후킹 두 줄 필요`);
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
