// 궁합(두 사람) 계산 — 결정론적 점수 · 근거 문장
import { STEMS, BRANCHES, SANGSAENG, SANGGEUK } from './constants.js';
import { COMPAT_LINE } from '../content/data.js';

const HAP_STEM = { 갑기: 1, 을경: 1, 병신: 1, 정임: 1, 무계: 1 };
const CHUNG_STEM = { 갑경: 1, 을신: 1, 병임: 1, 정계: 1 };

const YUKHAP = ['자축', '인해', '묘술', '진유', '사신', '오미'];
const SAMHAP = ['신자진', '해묘미', '인오술', '사유축'];
const CHUNG = ['자오', '축미', '인신', '묘유', '진술', '사해'];
const HYUNG = ['인사', '사신', '인신', '축술', '미술', '축미', '자묘'];
const WONJIN = ['자미', '축오', '인유', '묘신', '진해', '사술'];
const PA = ['자유', '축진', '인해', '묘오', '사신', '미술'];

/**
 * 두 글자를 하나의 쌍 키로 만든다.
 * 한글을 코드포인트로 정렬하면 '진술'→'술진', '오미'→'미오'처럼 순서가 뒤집혀
 * 합·충 표를 못 찾는 일이 생기므로, 같은 표(천간/지지)에 있으면 그 표의 순서로 정렬한다.
 */
const pairKey = (a, b) => {
  const indexIn = (ch, table) => table.findIndex((x) => x.ko === ch);
  const bi = indexIn(a, BRANCHES);
  const bj = indexIn(b, BRANCHES);
  if (bi >= 0 && bj >= 0) return bi <= bj ? `${a}${b}` : `${b}${a}`;
  const si = indexIn(a, STEMS);
  const sj = indexIn(b, STEMS);
  if (si >= 0 && sj >= 0) return si <= sj ? `${a}${b}` : `${b}${a}`;
  return [a, b].sort().join('');
};

function relationOf(a, b, tables) {
  const k = pairKey(a, b);
  return tables.some((t) => pairKey(t[0], t[1]) === k || t === k || (t.length === 2 && pairKey(t[0], t[1]) === k));
}

function yukhap(a, b) {
  return YUKHAP.some((p) => pairKey(p[0], p[1]) === pairKey(a, b)) ? `육합(${a}${b})` : null;
}
function samhap(a, b) {
  for (const s of SAMHAP) {
    if (s.includes(a) && s.includes(b) && a !== b) return `삼합(${s})`;
  }
  return null;
}
function chung(a, b) {
  return CHUNG.some((p) => pairKey(p[0], p[1]) === pairKey(a, b)) ? `충(${a}${b})` : null;
}
function hyung(a, b) {
  return HYUNG.some((p) => pairKey(p[0], p[1]) === pairKey(a, b)) ? `형(${a}${b})` : null;
}
function wonjin(a, b) {
  return WONJIN.some((p) => pairKey(p[0], p[1]) === pairKey(a, b)) ? `원진(${a}${b})` : null;
}
function pa(a, b) {
  return PA.some((p) => pairKey(p[0], p[1]) === pairKey(a, b)) ? `파(${a}${b})` : null;
}

const clamp = (v, lo = 40, hi = 98) => Math.max(lo, Math.min(hi, Math.round(v)));

/** 받침 유무에 따라 조사를 붙인다 (화가 / 목이) — 엔진·콘텐츠 공용 */
export function withJosa(word, withBatchim, withoutBatchim) {
  const code = word.charCodeAt(word.length - 1);
  const isHangul = code >= 0xac00 && code <= 0xd7a3;
  const hasBatchim = isHangul ? (code - 0xac00) % 28 !== 0 : false;
  return `${word}${hasBatchim ? withBatchim : withoutBatchim}`;
}

/**
 * @param {object} A 첫 번째 명식 (computeChart 결과)
 * @param {object} B 두 번째 명식
 * @param {object} jA, jB 자미두수 결과(없으면 생략)
 */
export function computeCompat(A, B, jA = null, jB = null) {
  const stemA = STEMS[A.dayStem].ko;
  const stemB = STEMS[B.dayStem].ko;
  const branchA = BRANCHES[A.dayBranch].ko;
  const branchB = BRANCHES[B.dayBranch].ko;

  const evidence = [];

  // 1) 오행 보완
  const gap = Math.abs(A.ohaeng.temp - B.ohaeng.temp);
  let energy = 100 - gap * 3.2;
  const fill = [];
  for (const o of A.ohaeng.missing) {
    if (B.ohaeng.count[o] >= 2) fill.push(`${B.input.gender === 'male' ? '그' : '그녀'}의 ${o}이 ${A.input.gender === 'male' ? '그' : '그녀'}의 빈자리를 채워요`);
  }
  for (const o of B.ohaeng.missing) {
    if (A.ohaeng.count[o] >= 2) fill.push(`${A.input.gender === 'male' ? '그' : '그녀'}의 ${o}이 반대편 빈자리를 채워요`);
  }
  energy += fill.length * 4;
  energy = clamp(energy, 42, 97);
  if (fill.length) evidence.push(...fill);
  evidence.push(`사주의 온도 ${A.ohaeng.temp}°C · ${B.ohaeng.temp}°C (차이 ${Math.round(gap * 10) / 10}도)`);

  // 2) 천간 관계 (일간)
  let mind = 62;
  const stemKey = pairKey(stemA, stemB);
  if (HAP_STEM[stemKey]) {
    mind += 20;
    evidence.push(`일간 합 — ${stemA}${stemB}${COMPAT_LINE.sum[stemKey] ? '' : ''}`);
  } else if (CHUNG_STEM[stemKey]) {
    mind -= 12;
    evidence.push(`일간 충 — ${stemA}${stemB}, 끌림과 부딪힘이 함께 있어요`);
  } else if (STEMS[A.dayStem].ohaeng === STEMS[B.dayStem].ohaeng) {
    mind += 8;
    evidence.push(`일간이 같은 ${STEMS[A.dayStem].ohaeng} — 말이 잘 통하는 사이`);
  } else if (SANGSAENG[STEMS[A.dayStem].ohaeng] === STEMS[B.dayStem].ohaeng) {
    mind += 10;
    evidence.push(`${withJosa(stemA, '이', '가')} ${withJosa(stemB, '을', '를')} 낳는 상생 — 한쪽이 자연스럽게 힘이 돼요`);
  } else if (SANGGEUK[STEMS[B.dayStem].ohaeng] === STEMS[A.dayStem].ohaeng) {
    mind -= 4;
    evidence.push(`${withJosa(stemB, '이', '가')} ${withJosa(stemA, '을', '를')} 누르는 구조 — 상대의 기준이 나를 조여요`);
  }

  // 3) 자미두수 교차
  if (jA && jB) {
    if (jA.bucheoPalace.branch === jB.myeong) { mind += 6; evidence.push('내 부처궁이 상대 명궁과 겹쳐요 — 배우자 자리에 상대가 들어와 있습니다'); }
    if (jB.bucheoPalace.branch === jA.myeong) { mind += 6; evidence.push('상대의 배우자 자리에 내가 들어와 있어요'); }
    if (jA.myeong === jB.myeong) { mind += 4; evidence.push('명궁이 같은 자리 — 결이 닮아 편한 사이예요'); }
  }
  mind = clamp(mind, 40, 98);

  // 4) 지지 관계 (일지)
  const yh = yukhap(branchA, branchB);
  const sh = samhap(branchA, branchB);
  const ch = chung(branchA, branchB);
  const hy = hyung(branchA, branchB);
  const wj = wonjin(branchA, branchB);
  const paR = pa(branchA, branchB);

  let life = 64;
  let talk = 70;
  if (yh) { life += 12; talk += 4; evidence.push(`일지 ${yh} — 생활 리듬이 붙는 결혼의 결`); }
  if (sh) { life += 9; evidence.push(`일지 ${sh} — 목표가 같은 방향을 봐요`); }
  if (ch) { life -= 12; talk -= 16; evidence.push(`일지 ${ch} — 서로 정면으로 부딪히는 지점`); }
  if (hy) { life -= 5; talk -= 9; evidence.push(`일지 ${hy} — 같은 실수를 반복하는 지점`); }
  if (wj) { mind -= 3; talk -= 7; evidence.push(`일지 ${wj} — 이유 없이 서운해지는 순간`); }
  if (paR) { life -= 4; evidence.push(`일지 ${paR} — 시작은 좋은데 마무리가 흐려요`); }

  // 5) 띠 관계
  const yA = BRANCHES[A.yearBranch].ko;
  const yB = BRANCHES[B.yearBranch].ko;
  if (yukhap(yA, yB)) { life += 4; evidence.push(`띠 ${yA}${yB} 육합 — 집안·가족 사이가 좋아요`); }
  if (samhap(yA, yB)) { life += 3; evidence.push(`띠 ${yA}${yB} 삼합 — 오래 봐도 편해요`); }
  if (chung(yA, yB)) { life -= 4; talk -= 6; evidence.push(`띠 ${yA}${yB} 충 — 명분보다 습관이 부딪쳐요`); }

  life = clamp(life, 42, 97);
  talk = clamp(talk, 38, 95);
  const overall = Math.round((life + mind + energy + talk) / 4);

  return {
    overall,
    axes: [
      { key: 'life', label: '생활 가치관', value: life },
      { key: 'mind', label: '속마음 끌림', value: mind },
      { key: 'energy', label: '오행 보완', value: energy },
      { key: 'talk', label: '갈등 소통', value: talk },
    ],
    evidence,
    stems: { a: stemA, b: stemB },
    branches: { a: branchA, b: branchB },
    tempGap: Math.round(gap * 10) / 10,
  };
}

/** 두 지지 사이의 관계 — '육합' · '삼합' · '충' · '형' · '원진' · '파' · null
 *  재회운·연애운처럼 상대 명식 없이 '내 지지 ↔ 내 배우자궁'을 볼 때도 쓴다. */
export function branchRelation(a, b) {
  if (!a || !b) return null;
  for (const [kind, fn] of [['육합', yukhap], ['삼합', samhap], ['충', chung], ['형', hyung], ['원진', wonjin], ['파', pa]]) {
    const r = fn(a, b);
    if (r) return kind;
  }
  return null;
}

/** 일간 두 글자의 관계 — 최애궁합·연애 해석에서 함께 쓴다 */
export function stemRelation(aStem, bStem) {
  const a = STEMS[aStem];
  const b = STEMS[bStem];
  const k = pairKey(a.ko, b.ko);
  if (HAP_STEM[k]) return { kind: '합', label: `일간 합 — ${a.ko}${b.ko}` };
  if (CHUNG_STEM[k]) return { kind: '충', label: `일간 충 — ${a.ko}${b.ko}` };
  if (a.ohaeng === b.ohaeng) return { kind: '같음', label: `일간이 같은 ${a.ohaeng} — 쓰는 언어가 같아요` };
  if (SANGSAENG[a.ohaeng] === b.ohaeng) return { kind: '상생', label: `${a.ko} → ${b.ko} 상생 — 한쪽이 자연스럽게 힘이 됩니다` };
  if (SANGSAENG[b.ohaeng] === a.ohaeng) return { kind: '상생', label: `${b.ko} → ${a.ko} 상생 — 한쪽이 자연스럽게 힘이 됩니다` };
  if (SANGGEUK[a.ohaeng] === b.ohaeng) return { kind: '극', label: `${a.ko} → ${b.ko} 상극 — 상대의 기운이 나를 조여요` };
  if (SANGGEUK[b.ohaeng] === a.ohaeng) return { kind: '극', label: `${b.ko} → ${a.ko} 상극 — 상대의 기운이 나를 조여요` };
  return { kind: '무관', label: '일간이 서로 비켜 있어요' };
}

export function compatVerdict(score) {
  if (score >= 88) return { title: '결이 거의 같은 사람', line: '서로의 빈자리를 정확히 채우는 사이예요. 다만 너무 편해서 노력을 아끼면 그 온도가 식어요.' };
  if (score >= 80) return { title: '끌림이 분명한 사이', line: '끌림이 있고, 생활도 어느 정도 맞아요. 갈등이 생기는 지점만 미리 알아두면 오래갑니다.' };
  if (score >= 70) return { title: '노력이 값을 하는 사이', line: '기본은 좋아요. 다만 서로 다른 온도를 이해하는 데 시간이 걸립니다. 그 시간을 아까워하지 마세요.' };
  if (score >= 60) return { title: '다른 점이 많은 사이', line: '끌리지만 지치는 지점이 분명해요. 규칙을 정해두면 훨씬 편해집니다.' };
  return { title: '서로를 많이 닮은 사람', line: '비슷해서 편하지만, 같은 자리에서 같이 무너지기도 해요. 한 사람은 판 밖에 있어야 해요.' };
}
