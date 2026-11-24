// 다락방 무료 놀이터 — 매력살 · 비밀 쪽지 · 찐심·밀당 판독기
import test from 'node:test';
import assert from 'node:assert/strict';

import { computeChart } from '../src/engine/saju.js';
import { charmReading, secretNote, readSignal } from '../src/engine/playground.js';
import { GENERATED_BY, OHAENG_META, BRANCHES } from '../src/engine/constants.js';

/* 검증 케이스 (tests/engine.test.mjs 와 같은 명식)
   1992-10-15 07:33 여 → 임신 · 경술 · 갑자 · 무진
   1997-06-17 08:00 남 → 정축 · 병오 · 경인 · 경진 */
const ME = { calendar: 'solar', year: 1992, month: 10, day: 15, hour: 7, minute: 33, timeUnknown: false, gender: 'female', leap: false };
const OTHER = { calendar: 'solar', year: 1997, month: 6, day: 17, hour: 8, minute: 0, timeUnknown: false, gender: 'male', leap: false };

const me = computeChart(ME);
const other = computeChart(OTHER);

test('매력살 — 갑자일 · 신자진 원국은 화개가 시지에 앉는다', () => {
  const r = charmReading(me);
  assert.equal(r.count, 1);
  assert.equal(r.foundKeys[0], 'hwagae');
  assert.equal(r.items.find((i) => i.key === 'hwagae').where[0].key, 'hour');
  /* 신자진 → 화개 진(辰). 시주 무진의 지지가 진 */
  assert.equal(r.items.find((i) => i.key === 'hwagae').where[0].branch, '진');
  assert.equal(r.score, 50);
});

test('매력살 — 정축년 · 경인일 원국은 도화(월지)·화개(년지)·천을귀인(년지)', () => {
  const r = charmReading(other);
  const keys = r.foundKeys.sort();
  assert.deepEqual(keys, ['cheoneul', 'dohwa', 'hwagae']);
  const dohwa = r.items.find((i) => i.key === 'dohwa');
  assert.deepEqual(dohwa.where.map((w) => w.key), ['month']);
  /* 인오술 → 도화 묘, 사유축 → 도화 오. 월지가 오(午) */
  assert.equal(dohwa.where[0].branch, '오');
  /* 경금 일간의 천을귀인은 축·미 — 년지 축 */
  const cheoneul = r.items.find((i) => i.key === 'cheoneul');
  assert.deepEqual(cheoneul.where.map((w) => w.branch), ['축']);
  /* 자니의 우선순위 1위는 도화 */
  assert.equal(r.top.key, 'dohwa');
});

test('매력살 — 없는 살도 이유와 함께 문장이 남는다', () => {
  const r = charmReading(me);
  const hong = r.items.find((i) => i.key === 'hongyeom');
  assert.equal(hong.found, false);
  assert.ok(hong.none.length > 10);
  assert.ok(r.points.length >= 2);
  assert.ok(r.headline.includes('매력살'));
});

test('매력살 — 명식이 없으면 null', () => {
  assert.equal(charmReading(null), null);
  assert.equal(charmReading({ ok: false }), null);
});

test('비밀 쪽지 — 같은 날·같은 이름이면 언제나 같은 쪽지', () => {
  const now = new Date('2026-11-24T10:00:00+09:00');
  const a = secretNote({ now, name: '자니', chart: me });
  const b = secretNote({ now, name: '자니', chart: me });
  assert.equal(a.shareText, b.shareText);
  assert.equal(a.color, b.color);
  assert.equal(a.ganji, b.ganji);
  assert.equal(a.shortDate, '2026.11.24 (화)');
  assert.ok(a.shareText.includes('@3f.zanie'));
  assert.ok(a.instaText.includes('@3f.zanie'));
});

test('비밀 쪽지 — 행운의 색은 내 일간을 도와주는 오행, 띠는 오늘 삼합국 안에서 나온다', () => {
  const now = new Date('2026-11-24T10:00:00+09:00');
  const n = secretNote({ now, name: '', chart: me });
  const el = GENERATED_BY[me.dayMaster.ohaeng];
  assert.equal(n.colorEl, el);
  assert.equal(n.color, OHAENG_META[el].color);
  /* 2026-11-24 일진 == 임인(壬寅) — 인(寅)의 삼합국은 인오술 */
  assert.equal(n.ganji, '임인');
  assert.ok(['오', '술'].includes(n.animalBranch));
  assert.equal(n.animal, BRANCHES.find((b) => b.ko === n.animalBranch).animal);
});

test('비밀 쪽지 — 날짜가 바뀌면 쪽지도 바뀐다', () => {
  const a = secretNote({ now: new Date('2026-11-24T10:00:00+09:00'), chart: me });
  const b = secretNote({ now: new Date('2026-11-25T10:00:00+09:00'), chart: me });
  assert.notEqual(a.ganji, b.ganji);
});

test('비밀 쪽지 — 생년월일이 없어도 오늘 일진만으로 만들어진다', () => {
  const n = secretNote({ now: new Date('2026-11-24T10:00:00+09:00') });
  assert.equal(n.hasChart, false);
  assert.ok(n.color);
  assert.ok(n.animalLine.includes('띠'));
  assert.ok(n.avoidPhrase);
});

test('찐심 판독 — 카톡 스타일이 전부 뜨거우면 찐 호감 쪽, 전부 차가우면 맘 뜬 거 쪽', () => {
  const hot = readSignal({ style: { speed: 'fast', length: 'long', emoji: 'many' } });
  const cold = readSignal({ style: { speed: 'slow', length: 'short', emoji: 'none' } });
  assert.ok(hot.score > cold.score);
  assert.equal(hot.verdict.key, 'hot');
  assert.equal(cold.verdict.key, 'cold');
  assert.equal(hot.expression, null);
  assert.equal(hot.missingPartner, true);
});

test('찐심 판독 — 상대 일주가 원래 맘을 어떻게 표현하는지 일간·일지·띠로 읽는다', () => {
  const r = readSignal({
    partner: other,
    myChart: me,
    style: { speed: 'mid', length: 'mid', emoji: 'some' },
  });
  assert.ok(r.expression);
  assert.equal(r.expression.iljuKo, '경인');
  assert.equal(r.expression.stem, '경');
  assert.ok(r.expression.title.length > 2);
  assert.ok(r.expression.branchLine.includes('호랑이'));
  assert.ok(r.evidence.some((e) => e.includes('일간 경')));
  assert.ok(r.evidence.some((e) => e.includes('일지 인')));
  assert.ok(r.partnerBirthLabel.includes('1997'));
  assert.equal(r.missingMe, false);
});

test('찐심 판독 — 같은 입력이면 같은 점수', () => {
  const opts = { partner: other, myChart: me, style: { speed: 'fast', length: 'long', emoji: 'many' }, text: '오늘 뭐 해? ㅋㅋ' };
  assert.equal(readSignal(opts).score, readSignal(opts).score);
});

test('찐심 판독 — 단답·미루는 말은 온도를 낮춘다', () => {
  const base = readSignal({ style: { speed: 'fast', length: 'mid', emoji: 'some' } });
  const short = readSignal({ style: { speed: 'fast', length: 'mid', emoji: 'some' }, text: 'ㅇㅇ' });
  const busy = readSignal({ style: { speed: 'fast', length: 'mid', emoji: 'some' }, text: '나 지금 바빠서 나중에' });
  assert.ok(short.score < base.score);
  assert.ok(busy.score < base.score);
});

/* ── 4) 풍경 심리테스트 (HTP 배치) ───────────────────────── */

import { readScenery } from '../src/engine/playground.js';

test('풍경 — 스티커가 두 개 미만이면 결과가 없다', () => {
  assert.equal(readScenery([]), null);
  assert.equal(readScenery([{ key: 'house', x: 30, y: 70, size: 'mid' }]), null);
});

test('풍경 — 가장 크게 놓은 요소와 자리를 읽는다', () => {
  const r = readScenery([
    { key: 'house', x: 30, y: 70, size: 'mid' },
    { key: 'tree', x: 50, y: 50, size: 'big' },
    { key: 'person', x: 70, y: 72, size: 'small' },
  ]);
  assert.equal(r.largest.key, 'tree');
  assert.equal(r.positionKey, 'center');
  assert.ok(r.headline.includes('나무'));
  assert.ok(r.positionLine.includes('한가운데'));
  /* 집·나무·사람이 한 점에 모이지도, 완전히 흩어지지도 않았다 (거리 판정) */
  assert.equal(r.distanceKey, 'mid');
  assert.equal(r.readings.length, 3);
  assert.equal(r.readings[0].key, 'tree');
});

test('풍경 — 구석에 큰 요소를 두면 휴식 필요도가 올라간다', () => {
  const center = readScenery([
    { key: 'house', x: 50, y: 52, size: 'big' },
    { key: 'tree', x: 60, y: 60, size: 'mid' },
  ]);
  const corner = readScenery([
    { key: 'house', x: 12, y: 14, size: 'big' },
    { key: 'tree', x: 22, y: 24, size: 'mid' },
  ]);
  assert.equal(corner.positionKey, 'corner');
  assert.ok(corner.rest.value > center.rest.value);
  assert.ok(corner.social.value < center.social.value);
});

test('풍경 — 울타리·해·달·구름·꽃의 의미와 사람을 비운 자리를 함께 읽는다', () => {
  const r = readScenery([
    { key: 'house', x: 40, y: 70, size: 'mid' },
    { key: 'tree', x: 60, y: 68, size: 'mid' },
    { key: 'fence', x: 50, y: 88, size: 'mid' },
    { key: 'moon', x: 16, y: 14, size: 'big' },
    { key: 'cloud', x: 50, y: 12, size: 'small' },
    { key: 'flower', x: 82, y: 80, size: 'small' },
  ]);
  assert.equal(r.presence.length, 4); /* 울타리 · 달 · 구름 · 꽃 */
  assert.ok(r.presence.some((p) => p.includes('울타리')));
  assert.ok(r.missing.some((m) => m.includes('사람')));
  assert.ok(r.rest.value >= 55);
  assert.ok(r.shareText.includes('@3f.zanie'));
  assert.ok(r.shareText.includes('휴식 필요도'));
});

test('풍경 — 같은 배치면 언제나 같은 판독', () => {
  const placed = [
    { key: 'person', x: 50, y: 40, size: 'big' },
    { key: 'sun', x: 84, y: 14, size: 'mid' },
  ];
  assert.equal(readScenery(placed).shareText, readScenery(placed).shareText);
  assert.equal(readScenery(placed).social.value, readScenery(placed).social.value);
});
