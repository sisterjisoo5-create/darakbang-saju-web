// 60갑자 일주 — 팩폭 + 공감 소개글 검증
// 2026-11-22 시연 님 지시: 무료 「12띠 × 일주 동물」 카드를 공유용 밈으로 보강.
// 실행: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { ILJU_60, ILJU_KEYS, iljuEntry } from '../src/content/ilju-60.js';
import { STEMS, BRANCHES } from '../src/engine/constants.js';
import { computeChart } from '../src/engine/saju.js';
import { zodiacIljuReading } from '../src/content/zodiac-ilju.js';

const mainJs = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles/components.css', import.meta.url), 'utf8');

/** 60갑자 순서 — 갑자, 을축, 병인 … 계해 */
const GANJI_60 = Array.from({ length: 60 }, (_, i) => `${STEMS[i % 10].ko}${BRANCHES[i % 12].ko}`);

test('60일주 — 60갑자 순서 그대로 60개가 모두 있다', () => {
  assert.equal(ILJU_KEYS.length, 60, `일주 ${ILJU_KEYS.length}개`);
  assert.deepEqual([...ILJU_KEYS].sort(), [...GANJI_60].sort(), '60갑자와 정확히 같은 목록');
  assert.equal(new Set(ILJU_KEYS).size, 60, '중복 키 없음');
});

test('60일주 — 별명·캐치프레이즈·찔리는 특징 3가지·겉과 속이 빈칸 없이 들어 있다', () => {
  for (const key of GANJI_60) {
    const e = ILJU_60[key];
    assert.ok(e, `${key} 일주가 없다`);
    assert.ok(e.nick.length >= 3 && e.nick.length <= 16, `${key} 별명 길이 ${e.nick}`);
    assert.ok(e.call.length >= 10, `${key} 캐치프레이즈 ${e.call}`);
    assert.equal(e.poke.length, 3, `${key} 특징 ${e.poke.length}가지`);
    for (const line of e.poke) {
      assert.ok(line.length >= 18, `${key} 특징이 너무 짧다: ${line}`);
      assert.ok(!/[<>]/.test(line), `${key} 태그 문자 금지: ${line}`);
    }
    assert.ok(e.seen.length >= 6, `${key} 남이 보는 나 ${e.seen}`);
    assert.ok(e.real.length >= 6, `${key} 진짜 나 ${e.real}`);
    assert.notEqual(e.seen, e.real, `${key} 겉과 속이 같다`);
  }
});

test('60일주 — 문장이 서로 겹치지 않는다 (같은 말 복붙 금지)', () => {
  const nick = new Set();
  const call = new Set();
  const poke = new Set();
  const seen = new Set();
  const real = new Set();
  for (const key of GANJI_60) {
    const e = ILJU_60[key];
    assert.ok(!nick.has(e.nick), `${key} 별명 중복: ${e.nick}`);
    assert.ok(!call.has(e.call), `${key} 캐치프레이즈 중복: ${e.call}`);
    nick.add(e.nick);
    call.add(e.call);
    for (const line of e.poke) {
      assert.ok(!poke.has(line), `${key} 특징 중복: ${line}`);
      poke.add(line);
    }
    assert.ok(!seen.has(e.seen), `${key} 남이 보는 나 중복: ${e.seen}`);
    assert.ok(!real.has(e.real), `${key} 진짜 나 중복: ${e.real}`);
    seen.add(e.seen);
    real.add(e.real);
  }
});

test('60일주 — 점잖은 설명이 아니라 팩폭·공감 톤이다', () => {
  const text = GANJI_60.map((k) => [ILJU_60[k].call, ...ILJU_60[k].poke, ILJU_60[k].seen, ILJU_60[k].real].join(' ')).join(' ');
  // 일상어·구어 결 (존댓말 + 생활 장면)
  for (const word of ['해요', '거예요', '있어요', '는데', '카톡', '약속', '사람']) {
    assert.ok(text.includes(word), `구어 표현이 없다: ${word}`);
  }
  // 옛 카드의 점잖은 소개 문구가 그대로 남아 있지 않다
  assert.ok(!text.includes('이성이 \"이 사람과 있으면'), '옛 점잖은 문구가 일주 소개에 남아 있다');
});

test('60일주 — 실제 명식의 일주가 그 사람의 소개글로 연결된다', () => {
  const chart = computeChart({ calendar: 'solar', year: 1991, month: 5, day: 7, hour: 18, minute: 22, gender: 'female' });
  assert.equal(chart.pillars.day.ko, '정축');
  const r = zodiacIljuReading(chart);
  assert.ok(r.ilju, '일주 소개글이 붙지 않았다');
  assert.equal(r.ilju.ko, '정축');
  assert.equal(r.ilju.han, '丁丑');
  assert.equal(r.ilju.nick, '외양간의 촛불');
  assert.equal(r.ilju.poke.length, 3);
  assert.equal(ILJU_60['정축'].seen, r.ilju.seen);
});

test('60일주 — 60일을 돌면 60개 일주가 하나씩 다 나온다', () => {
  const seen = new Set();
  for (let d = 0; d < 60; d += 1) {
    const date = new Date(Date.UTC(2026, 0, 1 + d));
    const chart = computeChart({
      calendar: 'solar',
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: 12,
      minute: 0,
      gender: 'female',
    });
    const r = zodiacIljuReading(chart);
    assert.ok(r.ilju, `${chart.pillars.day.ko} 일주의 소개글이 없다`);
    seen.add(r.ilju.ko);
  }
  assert.equal(seen.size, 60, `60일 동안 나온 일주 ${seen.size}종`);
});

test('무료 카드 — 60일주 팩폭 블록 + 공유용 이미지 저장 버튼이 있다', () => {
  const start = mainJs.indexOf('function zodiacIljuHTML');
  const end = mainJs.indexOf('/** 자미두수 슬림 카드');
  assert.ok(start > 0 && end > start, 'zodiacIljuHTML 블록을 찾을 수 있다');
  const block = mainJs.slice(start, end);

  assert.ok(block.includes('id="zodiac-share"'), '공유 캡처 대상 카드');
  assert.ok(block.includes('zi-ilju__nick'), '별명 자리');
  assert.ok(block.includes('zi-ilju__call'), '캐치프레이즈 자리');
  assert.ok(block.includes('zi-ilju__poke'), '찔리는 특징 목록');
  assert.ok(block.includes('남이 보는 나') && block.includes('진짜 나'), '겉과 속 대비');
  assert.ok(block.includes('data-action="save-zodiac"'), '공유용 이미지 저장 버튼');
  assert.ok(block.includes('공유용 이미지 저장'), '버튼 문구');
  assert.ok(block.includes('다락방 이름이 작게 들어가요'), '브랜딩 안내');
  // 결제 유도·버튼은 이미지에 담지 않는다
  assert.match(block, /class="zi-teaser__hook" data-capture-skip/, '결제 유도 문구는 캡처 제외');
  assert.match(block, /class="zi-teaser__cta" data-capture-skip/, '결제 버튼 줄은 캡처 제외');
  assert.match(block, /class="zi-card__actions" data-capture-skip/, '저장 버튼 줄은 캡처 제외');

  // 화면 스타일
  assert.match(css, /\.zi-ilju__nick\s*\{[^}]*font-family:\s*var\(--serif\)/);
  assert.match(css, /\.zi-ilju__poke li::before\s*\{/);
  assert.match(css, /\.zi-ilju__vs\s*\{[^}]*grid-template-columns:\s*1fr 1fr/);
});

test('12띠 × 일주 동물 — 캐릭터는 크림색 원형 배지 위에 얹힌다 (남색 배경에 묻히지 않게)', () => {
  const start = mainJs.indexOf('function zodiacIljuHTML');
  const end = mainJs.indexOf('/** 자미두수 슬림 카드');
  const block = mainJs.slice(start, end);

  // 마크업 — 두 캐릭터 모두 배지 감싸개 안에 들어간다
  assert.equal((block.match(/class="zi-teaser__badge"/g) || []).length, 2, '겉·속 캐릭터 둘 다 배지 안에');
  assert.equal((block.match(/zi-teaser__badge"><img /g) || []).length, 2, '배지 바로 안이 캐릭터 이미지');

  // 스타일 — 크림색 원형 + 금빛 테두리, 그림자를 그림에 직접 주지 않는다
  assert.match(css, /\.zi-teaser__badge\s*\{[^}]*border-radius:\s*50%/);
  assert.match(css, /\.zi-teaser__badge\s*\{[^}]*background:\s*radial-gradient/);
  assert.match(css, /\.zi-teaser__badge\s*\{[^}]*#f6ecd6/);
  assert.match(css, /\.zi-teaser__badge img\s*\{[^}]*object-fit:\s*contain/);
  assert.ok(!/\.zi-teaser__face img\s*\{[^}]*drop-shadow/.test(css), '크림 배지 위에서는 검은 그림자를 쓰지 않는다');
});

test('iljuEntry — 없는 간지는 null', () => {
  assert.equal(iljuEntry('없는주'), null);
  assert.equal(iljuEntry(''), null);
  assert.equal(iljuEntry(undefined), null);
});
