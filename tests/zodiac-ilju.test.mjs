// 12띠 × 일주 동물 — 144 조합 풀이 검증
// 실행: npm test
import test from 'node:test';
import assert from 'node:assert/strict';

import { computeChart } from '../src/engine/saju.js';
import { BRANCHES } from '../src/engine/constants.js';
import {
  zodiacIljuReading,
  allZodiacIljuReadings,
  relationKeyOf,
  elementKeyOf,
  YEAR_FACE,
  DAY_HEART,
  PAIR_RELATION,
} from '../src/content/zodiac-ilju.js';

const ALL = allZodiacIljuReadings();
const REL_KEYS = new Set(Object.keys(PAIR_RELATION));

test('12띠 × 12일주 = 144 조합이 모두 만들어진다', () => {
  assert.equal(ALL.length, 144);
  assert.equal(ALL.filter((r) => r).length, 144);
});

test('모든 조합에 제목·헤드라인·문단·매력 포인트가 빈칸 없이 들어 있다', () => {
  for (const r of ALL) {
    assert.ok(r.title.includes('띠 × '), r.title);
    assert.ok(r.headline.startsWith('겉은 '), r.headline);
    assert.ok(r.paragraphs.first.length > 40, r.title);
    assert.ok(r.paragraphs.reversal.length > 40, r.title);
    assert.ok(r.paragraphs.together.length > 40, r.title);
    assert.ok(r.oneLine.length > 30, r.title);
    assert.equal(r.appeals.length, 3);
    for (const a of r.appeals) assert.ok(a.length > 15, `${r.title} · ${a}`);
    assert.ok(r.tip.length > 15, r.title);
    assert.ok(r.relation.line.length > 30, r.title);
    assert.ok(r.element.line.length > 20, r.title);
  }
});

test('144 조합의 헤드라인·한 줄 요약·관계 문단이 서로 겹치지 않는다', () => {
  assert.equal(new Set(ALL.map((r) => r.headline)).size, 144);
  assert.equal(new Set(ALL.map((r) => r.oneLine)).size, 144);
  assert.equal(new Set(ALL.map((r) => r.paragraphs.together)).size, 144);
});

test('년지 겉모습 12종 · 일지 반전 매력 12종이 각각 12번씩 나온다', () => {
  assert.equal(Object.keys(YEAR_FACE).length, 12);
  assert.equal(Object.keys(DAY_HEART).length, 12);
  const first = new Map();
  for (const r of ALL) first.set(r.paragraphs.first, (first.get(r.paragraphs.first) || 0) + 1);
  assert.equal(first.size, 12);
  for (const n of first.values()) assert.equal(n, 12);
});

test('지지 관계 — 같은 동물·육합·삼합·충·원진을 명리 표대로 잡는다', () => {
  assert.equal(relationKeyOf('자', '자'), 'same');
  assert.equal(relationKeyOf('축', '축'), 'same');
  assert.equal(relationKeyOf('자', '축'), '육합');
  assert.equal(relationKeyOf('오', '미'), '육합');
  assert.equal(relationKeyOf('신', '자'), '삼합');
  assert.equal(relationKeyOf('인', '오'), '삼합');
  assert.equal(relationKeyOf('자', '오'), '충');
  assert.equal(relationKeyOf('묘', '유'), '충');
  assert.equal(relationKeyOf('자', '묘'), '형');
  assert.equal(relationKeyOf('자', '미'), '원진');
  assert.equal(relationKeyOf('자', '유'), '파');
  assert.equal(relationKeyOf('진', '술'), '충');
  assert.equal(relationKeyOf(0, 1), '육합'); // 인덱스로도 같은 결과
});

test('오행 관계 — 상생·상극·같은 기운을 지지 오행으로 가른다', () => {
  assert.equal(elementKeyOf('신', '자'), '상생'); // 금 → 수
  assert.equal(elementKeyOf('자', '인'), '상생'); // 수 → 목
  assert.equal(elementKeyOf('인', '오'), '상생'); // 목 → 화
  assert.equal(elementKeyOf('자', '자'), '같음');
  assert.equal(elementKeyOf('진', '술'), '같음'); // 토 · 토
  assert.equal(elementKeyOf('자', '오'), '상극'); // 수 ↔ 화
  assert.equal(elementKeyOf('묘', '유'), '상극'); // 목 ↔ 금
});

test('관계 키는 정해진 8종 안에서만 나오고, 모든 종류가 실제로 쓰인다', () => {
  const used = new Set(ALL.map((r) => r.relation.key));
  for (const k of used) assert.ok(REL_KEYS.has(k), k);
  assert.deepEqual([...used].sort(), [...REL_KEYS].sort());
});

test('조사와 문장부호가 깨지지 않는다 — 자리표시자·undefined·중복 조사 없음', () => {
  const texts = ALL.flatMap((r) => [
    r.title, r.headline, r.oneLine, r.tip, r.relation.line, r.element.line,
    r.paragraphs.first, r.paragraphs.reversal, r.paragraphs.together,
    ...r.appeals,
  ]);
  for (const t of texts) {
    assert.ok(!t.includes('undefined'), t);
    assert.ok(!t.includes('{'), t);
    assert.ok(!t.includes('=>'), t);
    assert.ok(!/이이에요|예예요|가가 |를를 |을을 /.test(t), t);
    const quotes = (t.match(/'/g) || []).length;
    assert.equal(quotes % 2, 0, t);
  }
  // 받침에 따른 서술격 조사
  assert.match(ALL[0].paragraphs.together, /쥐예요/);
  assert.match(ALL[13].paragraphs.together, /소예요/);
  assert.match(ALL[26].paragraphs.together, /호랑이예요/);
  assert.match(ALL[91].oneLine, /'[^']+'으로 기억하지만|'[^']+'로 기억하지만/);
});

test('실제 원국 — 1992-10-15 07:33 여(임신년 갑자일)는 원숭이띠 × 쥐 일주', () => {
  const chart = computeChart({ calendar: 'solar', year: 1992, month: 10, day: 15, hour: 7, minute: 33, gender: 'female' });
  assert.equal(chart.ok, true);
  const r = zodiacIljuReading(chart);
  assert.equal(r.title, '원숭이띠 × 쥐 일주');
  assert.equal(r.year.animal, '원숭이');
  assert.equal(r.day.animal, '쥐');
  assert.equal(r.relation.key, '삼합'); // 신 · 자
  assert.equal(r.element.key, '상생'); // 금 → 수
  assert.match(r.headline, /겉은 재빠른 재치, 속은 몰래 계산하는 승부사/);
});

test('같은 입력이면 언제나 같은 문장 — 결정론적', () => {
  const a = zodiacIljuReading({ yearBranch: 8, dayBranch: 0 });
  const b = zodiacIljuReading({ yearBranch: 8, dayBranch: 0 });
  assert.deepEqual(a, b);
});

test('입력이 없거나 지지가 이상하면 null', () => {
  assert.equal(zodiacIljuReading(null), null);
  assert.equal(zodiacIljuReading({}), null);
  assert.equal(relationKeyOf('없음', '자'), null);
  assert.equal(elementKeyOf(99, 0), null);
});

test('12띠·12일주 동물 이름이 지지 표와 일치한다', () => {
  for (const b of BRANCHES) {
    assert.equal(YEAR_FACE[b.ko].animal, b.animal);
    assert.equal(DAY_HEART[b.ko].animal, b.animal);
  }
});

/* ── 유료 상품(990원 · 1구슬) 연결 ───────────────── */
test('12띠 × 일주동물은 990원 1구슬 상품으로 등록되어 있다', async () => {
  const { PRODUCTS, productById, BEAD_PRICE, BEAD_USABLE_ITEMS } = await import('../src/config/products.js');
  const p = productById('zodiac-ilju');
  assert.ok(p, '상품이 없다');
  assert.equal(p.name, '12띠 × 일주동물');
  assert.equal(p.beads, 1);
  assert.equal(p.price, 990);
  assert.equal(p.beads * BEAD_PRICE, p.price);
  assert.equal(p.requirePartner, false);
  assert.equal(p.char, 'monkey', '카드 이미지는 원숭이 캐릭터여야 한다');
  assert.deepEqual(p.hook, ['내 띠와 나의 일주동물을 통해 보는', '겉과 속의 반전 매력']);
  assert.equal(p.desc, undefined, '카드 문구는 hook 두 줄로만 — desc 없이');
  assert.ok(PRODUCTS.some((x) => x.id === 'zodiac-ilju'));
  assert.ok(BEAD_USABLE_ITEMS.some((i) => i.name === '12띠 × 일주동물' && i.beads === 1), '구슬 사용 상품 목록에 없다');
});

test('유료 리포트 — 두 얼굴·관계·매력 포인트 3장이 맛보기와 함께 만들어진다', async () => {
  const { buildReport } = await import('../src/content/report.js');
  const { zodiacIljuSections, partnerBranchesOf } = await import('../src/content/zodiac-ilju.js');
  const chart = computeChart({ calendar: 'solar', year: 1992, month: 10, day: 15, hour: 7, minute: 33, gender: 'female' });

  const r = buildReport('zodiac-ilju', chart, {});
  assert.ok(r, '리포트가 없다');
  assert.equal(r.title, '원숭이띠 × 쥐 일주');
  assert.equal(r.sections.length, 3);
  assert.deepEqual(r.sections.map((s) => s.id), ['zi-face', 'zi-rel', 'zi-charm']);

  const [face, rel, charm] = r.sections;
  assert.equal(face.freeBlocks, 2);
  assert.ok(face.blocks.length > face.freeBlocks, '잠금 블록이 있어야 한다');
  const reverse = face.blocks.map((b) => b.v).join(' ');
  assert.ok(reverse.includes('몰래 계산하는 승부사'), '반전 매력이 리포트에 없다');

  const rows = rel.blocks.find((b) => b.t === 'table').rows;
  assert.equal(rows.length, 2);
  assert.ok(rows[0][1].includes('뱀띠') && rows[1][1].includes('소띠'), rows.map((x) => x[1]).join(' / '));

  const appeals = charm.blocks.find((b) => b.t === 'li').v;
  assert.equal(appeals.length, 3);
  assert.ok(charm.blocks.some((b) => b.t === 'q' && b.v.length > 10), '연애 팁이 없다');

  // 맛보기로 보이는 블록이 최소 2개 (결제 전 빈 화면이 아니어야 한다)
  const visible = r.sections.reduce((n, s) => n + Math.min(s.freeBlocks, s.blocks.length), 0);
  assert.ok(visible >= 2, `무료 블록 ${visible}`);

  // 144조합 모두 리포트 섹션이 만들어진다
  for (const rr of ALL) {
    const secs = zodiacIljuSections({ yearBranch: BRANCHES.findIndex((b) => b.ko === rr.year.branch), dayBranch: BRANCHES.findIndex((b) => b.ko === rr.day.branch) }, { freeBlocks: 2 });
    assert.equal(secs.length, 3, rr.title);
    for (const sec of secs) assert.ok(sec.blocks.length > 0 && sec.freeBlocks > 0, rr.title);
  }

  const pb = partnerBranchesOf('자');
  assert.equal(pb.yukhap.animal, '소');
  assert.deepEqual(pb.samhap.map((b) => b.animal).sort(), ['용', '원숭이'].sort());
});
