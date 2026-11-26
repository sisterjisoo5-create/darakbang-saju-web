// 다락방 무료 놀이터 — 계산 엔진 (결제·서버 없음 · 순수 프론트엔드)
//
//   charmReading(chart)  내 사주 매력살(도화·홍염·천을귀인·문창·화개·역마) 판독
//   secretNote({...})    오늘의 일진 + 내 일간으로 만드는 비밀 쪽지
//   readSignal({...})    상대 일주(일간·일지·띠) × 카톡 스타일 찐심·밀당 판독
//
// 원칙
//  · 모든 결과는 이미 계산된 명식(computeChart)의 여덟 글자에서만 나온다 — 추측으로 살을 붙이지 않는다.
//  · 같은 입력이면 언제나 같은 결과(결정론적). 날짜가 바뀌면 쪽지도 바뀐다.
//  · 사람을 단정하지 않는다 — '원래 이런 식으로 표현하는 편'까지만 말한다.

import { STEMS, BRANCHES, OHAENG_META, SANGSAENG, SANGGEUK, GENERATED_BY } from './constants.js';
import { dayIndexFromDate, formatBirthLabel } from './saju.js';
import { seoulNow } from './clock.js';
import { stemRelation, branchRelation, withJosa } from './compat.js';
import { iljuEntry } from '../content/ilju-60.js';
import {
  MONEY_HOLES, MONEY_HOLE_ORDER, MONEY_GRADES, MONEY_BASE_AMOUNT,
} from '../content/playground.js';
import {
  SAL, SAL_ORDER, POSITION_LABEL, POSITION_ROLE,
  NOTE_LINES, AVOID, ANIMAL_LINE,
  STYLE_EVIDENCE, ILGAN_TALK, BRANCH_TALK, SIGNAL_VERDICT,
  HTP_BY_KEY, HTP_ITEMS, HTP_WEIGHT, HTP_READING, HTP_LARGEST, HTP_POSITION,
  HTP_DISTANCE, HTP_MISSING, HTP_PRESENCE, HTP_SCORE_LABEL,
} from '../content/playground.js';

/* ────────────────────────────────────────────
   공통 — 시드 · 삼합 · 육합
   ──────────────────────────────────────────── */

/** 문자열 → 32bit 시드 (today.js 와 같은 방식) */
function seedOf(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** 삼합국 — 도화·역마·화개는 년지·일지의 삼합으로 찾는다 */
const SAMHAP_GROUPS = [
  { members: ['인', '오', '술'], dohwa: '묘', yeokma: '신', hwagae: '술' },
  { members: ['신', '자', '진'], dohwa: '유', yeokma: '인', hwagae: '진' },
  { members: ['사', '유', '축'], dohwa: '오', yeokma: '해', hwagae: '축' },
  { members: ['해', '묘', '미'], dohwa: '자', yeokma: '사', hwagae: '미' },
];
const GROUP_OF = {};
for (const g of SAMHAP_GROUPS) for (const b of g.members) GROUP_OF[b] = g;

/** 육합 — 쪽지의 '행운의 띠'와 판독기의 일지 관계에 쓴다 */
const YUKHAP = {
  자: '축', 축: '자', 인: '해', 해: '인', 묘: '술', 술: '묘',
  진: '유', 유: '진', 사: '신', 신: '사', 오: '미', 미: '오',
};

/** 일간 → 홍염살 · 천을귀인 · 문창성의 지지 */
const HONGYEOM = { 갑: '오', 을: '오', 병: '인', 정: '미', 무: '진', 기: '진', 경: '술', 신: '유', 임: '자', 계: '신' };
const CHEONEUL = {
  갑: ['축', '미'], 무: ['축', '미'], 경: ['축', '미'],
  을: ['자', '신'], 기: ['자', '신'],
  병: ['해', '유'], 정: ['해', '유'],
  임: ['묘', '사'], 계: ['묘', '사'],
  신: ['인', '오'],
};
const MUNCHANG = { 갑: '사', 을: '오', 병: '신', 정: '유', 무: '신', 기: '유', 경: '해', 신: '자', 임: '인', 계: '묘' };

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];
const pad2 = (n) => String(n).padStart(2, '0');
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));
const branchMeta = (ko) => BRANCHES.find((b) => b.ko === ko) || BRANCHES[0];

/** 명식의 네 기둥(시주가 없으면 세 기둥) */
function pillarList(chart) {
  return ['year', 'month', 'day', 'hour']
    .filter((k) => chart.pillars && chart.pillars[k])
    .map((k) => {
      const p = chart.pillars[k];
      return {
        key: k,
        label: POSITION_LABEL[k],
        role: POSITION_ROLE[k],
        branch: p.branchKo,
        branchHan: p.branchHan,
        stem: p.stemKo,
        animal: p.animal,
      };
    });
}

/* ────────────────────────────────────────────
   1) 내 사주 매력살 뜯어보기
   ──────────────────────────────────────────── */

/** 살 하나가 원국 어느 자리에 앉았는지 — target 지지 → 기준(년지·일지) 목록 */
function targetsOf(key, chart) {
  if (key === 'dohwa' || key === 'yeokma' || key === 'hwagae') {
    const out = new Map();
    for (const base of [chart.pillars.year.branchKo, chart.pillars.day.branchKo]) {
      const g = GROUP_OF[base];
      if (!g) continue;
      const target = g[key];
      if (!out.has(target)) out.set(target, []);
      out.get(target).push(base);
    }
    return out;
  }
  const stem = chart.dayMaster.ko;
  if (key === 'hongyeom') return new Map([[HONGYEOM[stem], null]].filter(([t]) => t));
  if (key === 'cheoneul') return new Map((CHEONEUL[stem] || []).map((t) => [t, null]));
  if (key === 'munchang') return new Map([[MUNCHANG[stem], null]].filter(([t]) => t));
  return new Map();
}

/**
 * 매력살이 원국 어느 기둥에 앉았는지 — 판별 계산만.
 * 한국어 판독(charmReading)과 일본어 판독(engine/jp.js charmJp)이 이 계산을 함께 쓴다.
 * 문장은 각자의 문장표에서만 입히고, 살을 찾는 규칙(삼합·일간 표)은 여기 한 곳에만 둔다.
 * @param {object} chart computeChart 결과
 * @returns {{key:string, found:boolean, where:{key:string, branch:string, animal:string}[], bases:string[]}[]|null}
 */
export function charmPositions(chart) {
  if (!chart || !chart.ok) return null;
  const pillars = pillarList(chart);
  return SAL_ORDER.map((key) => {
    const targets = targetsOf(key, chart);
    const where = [];
    const bases = new Set();
    for (const p of pillars) {
      if (!targets.has(p.branch)) continue;
      where.push({ key: p.key, branch: p.branch, animal: p.animal });
      const b = targets.get(p.branch);
      if (b) b.forEach((x) => bases.add(x));
    }
    return { key, found: where.length > 0, where, bases: [...bases] };
  });
}

/**
 * 매력살 판독
 * @param {object} chart computeChart 결과
 */
export function charmReading(chart) {
  if (!chart || !chart.ok) return null;
  const pillars = pillarList(chart);

  const items = charmPositions(chart).map((pos) => {
    const meta = SAL[pos.key];
    const where = pos.where.map((w) => ({
      key: w.key,
      label: (pillars.find((p) => p.key === w.key) || {}).label || '',
      role: (pillars.find((p) => p.key === w.key) || {}).role || '',
      branch: w.branch,
      animal: w.animal,
    }));
    const flavors = where.map((w) => meta.where[w.key]).filter(Boolean);
    return {
      key: pos.key,
      name: meta.name,
      han: meta.han,
      tag: meta.tag,
      base: meta.base,
      line: meta.line,
      none: meta.none,
      /* 화면용 한 줄 — 무료에서는 이름과 이 한 줄까지만 */
      short: meta.short || meta.line,
      noneShort: meta.noneShort || meta.none,
      found: pos.found,
      where,
      whereText: where.map((w) => `${w.label}(${w.role})`).join(' · '),
      flavors,
      basisText: pos.bases.length ? `${pos.bases.join('·')} 기준` : meta.base,
    };
  });

  const found = items.filter((i) => i.found);
  /* 자니의 우선순위 — 도화가 제일 먼저 눈에 들어오고, 역마가 마지막 */
  const PRIORITY = { dohwa: 6, hongyeom: 5, cheoneul: 4, munchang: 3, hwagae: 2, yeokma: 1 };
  const top = found.slice().sort((a, b) => PRIORITY[b.key] - PRIORITY[a.key] || SAL_ORDER.indexOf(a.key) - SAL_ORDER.indexOf(b.key))[0] || null;
  const inDay = found.filter((i) => i.where.some((w) => w.key === 'day'));

  const score = clamp(40 + found.length * 10 + (inDay.length ? 8 : 0), 45, 96);
  const scoreLabel = score >= 85 ? '치명적인 편' : score >= 72 ? '눈에 띄는 편' : score >= 60 ? '은근한 편' : '천천히 배는 편';

  let headline;
  if (!found.length) {
    headline = '매력살은 0개야. 근데 이게 중요해 — 없는 게 아니라, 네 매력은 살 이름표 없이 네 얼굴에서 그냥 나오는 타입이야.';
  } else if (found.length <= 2) {
    headline = `원국에 매력살 ${found.length}개. 자니가 보기엔 ${top.name}가 제일 세게 일하고 있어.`;
  } else {
    headline = `매력살 ${found.length}개. 이건 좀 반칙인데 — 사람들이 네한테 자꾸 기웃거리는 데는 이유가 있어.`;
  }

  const closing = top
    ? `자니 결론: ${top.name}는 ‘${top.tag}’ 쪽으로 쓰여요. 숨기려고 애쓰지 마 — 숨길수록 티 나.`
    : '자니 결론: 살 이름표가 없어도 네 매력은 네 말투와 웃는 모양에서 나와. 그게 제일 안 없어지는 거야.';

  const points = found.length
    ? [...found.slice(0, 2).map((i) => `${i.name} · ${i.whereText} — ${i.flavors[0] || i.line}`), closing]
    : [
        '네 매력은 ‘한 번에 확’이 아니라 ‘오래 봐야 아는’ 쪽이에요. 처음엔 무던해 보이고, 두세 번 만나야 사람이 붙어요.',
        '살이 없어서 비어 있는 게 아니라, 자리가 비어 있어서 누가 들어오면 오래 머물러요.',
        closing,
      ];

  return {
    dayStem: chart.dayMaster.ko,
    dayOhaeng: chart.dayMaster.ohaeng,
    pillars,
    items,
    found,
    foundKeys: found.map((i) => i.key),
    count: found.length,
    top,
    score,
    scoreLabel,
    headline,
    points,
    appeal: top
      ? `${top.tag} 매력 — ${top.whereText}에서 먼저 드러나요.`
      : '한 번에 확 아니라, 오래 봐야 아는 매력 — 그게 네 쪽이에요.',
  };
}

/* ────────────────────────────────────────────
   2) 자니의 다락방 비밀 쪽지
   ──────────────────────────────────────────── */

/** 오늘 일진 천간과 내 일간의 관계 */
function relationOf(todayStem, myStem) {
  if (myStem == null) return 'none';
  const a = STEMS[todayStem];
  const b = STEMS[myStem];
  if (a.ohaeng === b.ohaeng) return 'same';
  if (SANGSAENG[a.ohaeng] === b.ohaeng) return 'support';
  if (SANGSAENG[b.ohaeng] === a.ohaeng) return 'drain';
  if (SANGGEUK[a.ohaeng] === b.ohaeng) return 'press';
  if (SANGGEUK[b.ohaeng] === a.ohaeng) return 'control';
  return 'none';
}

const RELATION_TEXT = {
  support: '오늘 일진이 내 일간을 도와주는 날',
  same: '오늘 일진이 내 일간과 같은 결인 날',
  drain: '오늘 내 기운이 밖으로 나가는 날',
  press: '오늘 일진이 내 일간을 누르는 날',
  control: '오늘 내가 일진을 다루는 날',
  none: '오늘 일진과 내 일간이 비켜 있는 날',
};

/**
 * 오늘의 비밀 쪽지 — 날짜 + (선택) 이름 + (선택) 내 명식
 * @param {{now?: Date, name?: string, chart?: object}} [opts]
 */
export function secretNote({ now = new Date(), name = '', chart = null } = {}) {
  const t = seoulNow(now);
  const idx = dayIndexFromDate(t.year, t.month, t.day);
  const todayStem = STEMS[idx % 10];
  const todayBranch = BRANCHES[idx % 12];
  const nick = String(name || '').trim().slice(0, 16);
  const seed = seedOf(`${t.year}-${pad2(t.month)}-${pad2(t.day)}|${nick}`);

  /* 행운의 색 — 내 일간을 도와주는 오행 (없으면 오늘 일진의 오행) */
  const myOhaeng = chart && chart.ok ? chart.dayMaster.ohaeng : null;
  const luckyEl = myOhaeng ? GENERATED_BY[myOhaeng] : todayStem.ohaeng;
  const colorMeta = OHAENG_META[luckyEl];
  const colorReason = myOhaeng
    ? `내 일간 ${chart.dayMaster.ko}(${myOhaeng})${withJosa(myOhaeng, '을', '를')} 도와주는 ${luckyEl} 기운`
    : `오늘 일진 ${todayStem.ko}${todayBranch.ko}의 ${todayStem.ohaeng} 기운`;

  /* 행운의 띠 — 오늘 일진과 같은 삼합국에서 하루마다 바뀐다.
     내 일지와 육합인 띠가 후보에 있으면 그 띠를 먼저 고른다. */
  const group = GROUP_OF[todayBranch.ko] || SAMHAP_GROUPS[0];
  const candidates = group.members.filter((b) => b !== todayBranch.ko);
  let luckyBranch = candidates[seed % candidates.length] || candidates[0];
  if (chart && chart.ok) {
    const partner = YUKHAP[chart.pillars.day.branchKo];
    if (candidates.includes(partner)) luckyBranch = partner;
  }
  const luckyMeta = branchMeta(luckyBranch);

  /* 피해야 할 한 마디 — 오늘 일진과 내 일간의 관계로 고른다 */
  const rel = relationOf(idx % 10, chart && chart.ok ? chart.dayStem : null);
  const avoidList = AVOID[rel] || AVOID.none;
  const avoid = avoidList[seed % avoidList.length];

  const line = NOTE_LINES[seed % NOTE_LINES.length];
  const dateLabel = `${t.year}년 ${t.month}월 ${t.day}일 ${WEEKDAY[new Date(Date.UTC(t.year, t.month - 1, t.day)).getUTCDay()]}요일`;
  const shortDate = `${t.year}.${pad2(t.month)}.${pad2(t.day)} (${WEEKDAY[new Date(Date.UTC(t.year, t.month - 1, t.day)).getUTCDay()]})`;
  const ganji = `${todayStem.ko}${todayBranch.ko}`;
  const ganjiHan = `${todayStem.han}${todayBranch.han}`;

  const tail = '@3f.zanie · 사주보는 3층 다락방';
  const shareText = [
    `🍀 자니의 다락방 비밀 쪽지 · ${shortDate}`,
    `오늘의 일진 ${ganji}(${ganjiHan})`,
    '',
    `행운의 색 — ${colorMeta.color}`,
    `행운의 띠 — ${luckyMeta.animal}띠`,
    `피할 한 마디 — ${avoid.phrase}`,
    '',
    `“${line}”`,
    '',
    tail,
  ].join('\n');

  const instaText = [
    `🍀 오늘의 다락방 비밀 쪽지 ${shortDate}`,
    `행운 색 · ${colorMeta.color}`,
    `행운 띠 · ${luckyMeta.animal}띠`,
    `피할 말 · ${avoid.phrase}`,
    `자니 왈: “${line}”`,
    '',
    '@3f.zanie #사주보는3층다락방 #자니쪽지 #오늘의운세',
  ].join('\n');

  return {
    dateLabel,
    shortDate,
    ganji,
    ganjiHan,
    nick,
    color: colorMeta.color,
    colorHex: colorMeta.hex,
    colorEl: luckyEl,
    colorReason,
    animal: luckyMeta.animal,
    animalBranch: luckyBranch,
    /* 띠 이름은 위 줄에 이미 크게 보이니, 문장 앞머리의 '개띠 — ' 중복은 덜어낸다 (2026-11-24) */
    animalLine: String(ANIMAL_LINE[luckyBranch] || '').replace(/^[가-힣]+띠\s*—\s*/, ''),
    avoidPhrase: avoid.phrase,
    avoidWhy: avoid.why,
    relation: rel,
    relationText: RELATION_TEXT[rel],
    line,
    shareText,
    instaText,
    hasChart: Boolean(chart && chart.ok),
  };
}

/* ────────────────────────────────────────────
   3) 일주 기반 찐심·밀당 판독기
   ──────────────────────────────────────────── */

const STYLE_DELTA = {
  speed: { fast: 14, mid: 0, slow: -14 },
  length: { long: 9, mid: 2, short: -7 },
  emoji: { many: 8, some: 2, none: -6 },
};
const STEM_KIND_DELTA = { 합: 12, 상생: 8, 같음: 5, 무관: 0, 극: -7, 충: -10 };
const BRANCH_KIND_DELTA = { 육합: 9, 삼합: 6, 충: -9, 형: -5, 원진: -5, 파: -4 };

/** 마지막 톡 한 줄에서 읽는 신호 */
function textSignals(raw) {
  const out = { delta: 0, notes: [] };
  const text = String(raw || '').trim();
  if (!text) return out;
  const len = text.replace(/\s/g, '').length;
  if (len >= 25) { out.delta += 4; out.notes.push('마지막 톡이 길어요 — 설명하고 싶은 마음이 남아 있어요.'); }
  else if (len <= 6) { out.delta -= 3; out.notes.push('마지막 톡이 아주 짧아요 — 대화를 접으려는 신호일 수도 있어요.'); }
  if (/[?？]/.test(text)) { out.delta += 3; out.notes.push('질문이 들어 있어요 — 관심이 없으면 묻지 않아요.'); }
  if (/(ㅋ|ㅎ){2,}/.test(text)) { out.delta += 2; }
  if (/(바빠|바쁘|나중에|이따|끝나고)/.test(text)) { out.delta -= 5; out.notes.push('“바빠·나중에”가 나왔어요 — 오늘은 대화를 미루는 쪽이에요.'); }
  if (/^(ㅇㅇ|응|넵|네|굿|오케이|ㅇㅋ)[.!\s]*$/.test(text)) { out.delta -= 5; out.notes.push('단답 하나로 끝났어요 — 더 말하고 싶은 게 없는 상태예요.'); }
  return out;
}

/**
 * 찐심·밀당 판독
 * @param {object} opts
 *   partner: 상대 명식(computeChart) 또는 null
 *   myChart: 내 명식(computeChart) 또는 null
 *   style: { speed, length, emoji }
 *   text: 마지막으로 온 톡 (선택)
 */
export function readSignal({ partner = null, myChart = null, style = {}, text = '' } = {}) {
  const s = {
    speed: STYLE_EVIDENCE.speed[style.speed] ? style.speed : 'mid',
    length: STYLE_EVIDENCE.length[style.length] ? style.length : 'mid',
    emoji: STYLE_EVIDENCE.emoji[style.emoji] ? style.emoji : 'some',
  };

  let score = 50;
  const evidence = [];
  score += STYLE_DELTA.speed[s.speed];
  evidence.push(STYLE_EVIDENCE.speed[s.speed]);
  score += STYLE_DELTA.length[s.length];
  evidence.push(STYLE_EVIDENCE.length[s.length]);
  score += STYLE_DELTA.emoji[s.emoji];
  evidence.push(STYLE_EVIDENCE.emoji[s.emoji]);

  const txt = textSignals(text);
  score += txt.delta;
  evidence.push(...txt.notes);

  const partnerOk = Boolean(partner && partner.ok);
  const meOk = Boolean(myChart && myChart.ok);
  let expression = null;
  let partnerSal = null;
  let caution = '';

  if (partnerOk) {
    const pStem = partner.dayMaster.ko;
    const pBranch = partner.pillars.day.branchKo;
    const il = ILGAN_TALK[pStem];
    const entry = iljuEntry(partner.pillars.day.ko);
    partnerSal = charmReading(partner);
    const expressive = partnerSal.foundKeys.includes('dohwa') || partnerSal.foundKeys.includes('hongyeom');

    expression = {
      stem: pStem,
      ohaeng: partner.dayMaster.ohaeng,
      iljuKo: partner.pillars.day.ko,
      iljuHan: partner.pillars.day.han,
      animal: partner.pillars.day.animal,
      nick: entry ? entry.nick : '',
      call: entry ? entry.call : '',
      title: il.title,
      line: il.line,
      tell: il.tell,
      branchLine: BRANCH_TALK[pBranch] || '',
      expressive,
    };

    if (expressive) {
      score += 6;
      evidence.push('원국에 도화·홍염이 있어요 — 이 일주는 원래 표현이 화끈한 쪽이에요.');
    }

    if (meOk) {
      /* stemRelation 은 천간 인덱스를 받는다 (일간 ko 이름이 아니라) */
      const stemRel = stemRelation(partner.dayStem, myChart.dayStem);
      score += STEM_KIND_DELTA[stemRel.kind] != null ? STEM_KIND_DELTA[stemRel.kind] : 0;
      evidence.push(`일간 ${pStem} ↔ 내 일간 ${myChart.dayMaster.ko} — ${stemRel.label}`);

      const branchKind = branchRelation(pBranch, myChart.pillars.day.branchKo);
      score += branchKind ? BRANCH_KIND_DELTA[branchKind] || 0 : 0;
      evidence.push(
        branchKind
          ? `일지 ${pBranch} ↔ 내 일지 ${myChart.pillars.day.branchKo} — ${branchKind} 관계`
          : `일지 ${pBranch} ↔ 내 일지 ${myChart.pillars.day.branchKo} — 서로 비켜 있는 관계`,
      );

      const yearKind = branchRelation(partner.pillars.year.branchKo, myChart.pillars.year.branchKo);
      score += yearKind ? (BRANCH_KIND_DELTA[yearKind] > 0 ? 3 : -2) : 0;

      if (stemRel.kind === '충' || branchKind === '충') {
        caution = '사주로는 끌림과 부딪힘이 같이 있어요. 지금 톡 온도만 보고 단정하지 말고, 만나서 말투를 보세요.';
      } else if (expressive && score < 62) {
        caution = '이 일주는 원래 표현이 화려한 쪽이라, 톡이 짧아졌다는 게 더 분명한 신호예요.';
      }
    } else {
      caution = '내 생년월일까지 넣으면 일간·일지가 어떻게 맞물리는지까지 겹쳐 볼 수 있어요.';
    }
  }

  const finalScore = clamp(score, 12, 96);
  const verdictKey = ['hot', 'push', 'check', 'cold'].find((k) => finalScore >= SIGNAL_VERDICT[k].min) || 'cold';
  const meta = SIGNAL_VERDICT[verdictKey];

  const shareText = [
    `🔍 일주 기반 찐심·밀당 판독기`,
    `상대 온도 ${finalScore}점 · ${meta.label}`,
    expression ? `“${expression.nick || expression.iljuKo + '일주'} — ${expression.title}”` : '',
    '',
    '@3f.zanie #사주보는3층다락방',
  ].filter(Boolean).join('\n');

  return {
    score: finalScore,
    verdict: {
      key: verdictKey,
      label: meta.label,
      title: meta.title,
      body: meta.body,
      tip: meta.tip,
    },
    evidence: evidence.slice(0, 6),
    expression,
    partnerSal,
    partnerBirthLabel: partnerOk ? formatBirthLabel(partner) : '',
    missingPartner: !partnerOk,
    missingMe: !meOk,
    style: s,
    caution,
    shareText,
  };
}

/* ────────────────────────────────────────────
   4) 다락방 풍경 심리테스트 — HTP(집·나무·사람) 배치형
   ──────────────────────────────────────────── */

/** 두 점 사이 거리 (무대는 4:3 — 세로를 0.75로 줄여 실제 비율에 가깝게) */
function distanceOf(a, b) {
  const dx = (a.x - b.x) / 100;
  const dy = ((a.y - b.y) / 100) * 0.75;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 풍경 배치 판독
 * @param {Array<{key:string,x:number,y:number,size:'big'|'mid'|'small'}>} placed
 */
export function readScenery(placed = []) {
  const items = (Array.isArray(placed) ? placed : [])
    .filter((p) => p && HTP_BY_KEY[p.key])
    .map((p) => ({
      key: p.key,
      x: Math.max(0, Math.min(100, Number(p.x) || 50)),
      y: Math.max(0, Math.min(100, Number(p.y) || 50)),
      size: HTP_WEIGHT[p.size] ? p.size : 'mid',
      meta: HTP_BY_KEY[p.key],
    }));
  if (items.length < 2) return null;

  const byKey = Object.fromEntries(items.map((i) => [i.key, i]));
  const largest = items
    .slice()
    .sort((a, b) => HTP_WEIGHT[b.size] - HTP_WEIGHT[a.size] || a.meta.order - b.meta.order)[0];

  /* 자리 — 한가운데 / 구석 / 가장자리 / 위 / 아래 */
  const centerZone = largest.x >= 32 && largest.x <= 68 && largest.y >= 30 && largest.y <= 72;
  let positionKey = 'edge';
  if (centerZone) positionKey = 'center';
  else if ((largest.x < 30 || largest.x > 70) && (largest.y < 30 || largest.y > 72)) positionKey = 'corner';
  else if (largest.y < 30) positionKey = 'top';
  else if (largest.y > 72) positionKey = 'bottom';

  /* 집·나무·사람의 거리 */
  const trio = ['house', 'tree', 'person'].filter((k) => byKey[k]);
  let distanceKey = '';
  if (trio.length >= 2) {
    let max = 0;
    for (let i = 0; i < trio.length; i += 1) {
      for (let j = i + 1; j < trio.length; j += 1) {
        max = Math.max(max, distanceOf(byKey[trio[i]], byKey[trio[j]]));
      }
    }
    distanceKey = max < 0.38 ? 'near' : max > 0.62 ? 'far' : 'mid';
  }

  /* 넣지 않은 요소 — 사람 → 나무 → 집 순서로 두 개까지 */
  const missing = ['person', 'tree', 'house'].filter((k) => !byKey[k]).slice(0, 2).map((k) => HTP_MISSING[k]);

  /* 크기별 해석 — 가장 큰 요소가 맨 앞, 놓은 스티커는 하나도 빠짐없이 한 번씩 */
  const readings = items
    .slice()
    .sort((a, b) => (b.key === largest.key ? 1 : 0) - (a.key === largest.key ? 1 : 0) || a.meta.order - b.meta.order)
    .map((i) => ({
      key: i.key,
      name: i.meta.name,
      role: i.meta.role,
      isLargest: i.key === largest.key,
      line: HTP_READING[i.key][i.size],
      /* 목록에서는 첫 문장만 — 스크롤을 줄이기 위한 한 줄 요약 */
      short: String(HTP_READING[i.key][i.size]).split('. ')[0],
    }));

  /* 함께 놓였을 때만 읽는 것들 */
  const presence = [];
  if (byKey.fence) presence.push(HTP_PRESENCE.fence);
  if (byKey.sun && byKey.moon) presence.push(HTP_PRESENCE.both);
  else if (byKey.sun) presence.push(HTP_PRESENCE.sun);
  else if (byKey.moon) presence.push(HTP_PRESENCE.moon);
  if (byKey.cloud) presence.push(HTP_PRESENCE.cloud);
  if (byKey.flower) presence.push(HTP_PRESENCE.flower);

  /* 휴식 필요도 · 대인 온도 */
  let rest = 38;
  if (positionKey === 'corner') rest += 16;
  if (positionKey === 'edge') rest += 8;
  if (byKey.fence) rest += 10;
  if (byKey.cloud) rest += 10;
  if (byKey.moon) rest += 8;
  if (byKey.sun) rest -= 12;
  if (byKey.flower) rest -= 5;
  if (largest.key === 'tree') rest += 4;
  rest = clamp(rest, 12, 94);

  let social = 48;
  if (byKey.person) social += byKey.person.size === 'big' ? 18 : byKey.person.size === 'small' ? 4 : 12;
  if (byKey.flower) social += 7;
  if (byKey.jani) social += 3;
  if (byKey.fence) social -= 13;
  if (byKey.cloud) social -= 5;
  if (positionKey === 'center') social += 6;
  if (positionKey === 'corner') social -= 7;
  social = clamp(social, 12, 94);

  const restLabel = rest >= 72 ? HTP_SCORE_LABEL.rest.high : rest >= 55 ? HTP_SCORE_LABEL.rest.mid : HTP_SCORE_LABEL.rest.low;
  const socialLabel = social >= 68 ? HTP_SCORE_LABEL.social.high : social >= 48 ? HTP_SCORE_LABEL.social.mid : HTP_SCORE_LABEL.social.low;

  const headline = HTP_LARGEST[largest.key];
  const shareText = [
    '🌙 자니의 다락방 풍경 심리테스트',
    `제일 큰 것 · ${largest.meta.name} (${HTP_POSITION[positionKey].split(' — ')[0].replace('가장 큰 요소가 ', '')})`,
    `휴식 필요도 ${rest} · 대인 온도 ${social}`,
    `“${headline}”`,
    '',
    '@3f.zanie #사주보는3층다락방 #다락방풍경',
  ].join('\n');

  return {
    count: items.length,
    items,
    largest: { key: largest.key, name: largest.meta.name, size: largest.size },
    headline,
    positionKey,
    positionLine: HTP_POSITION[positionKey],
    distanceKey,
    distanceLine: distanceKey ? HTP_DISTANCE[distanceKey] : '',
    readings,
    presence,
    missing,
    rest: { value: rest, label: restLabel },
    social: { value: social, label: socialLabel },
    shareText,
  };
}

/* ────────────────────────────────────────────
   5) 사주 '돈 새는 구멍' 영수증
   ──────────────────────────────────────────── */

/** 십성 개수 — 일간(나)은 빼고, 나머지 천간과 지지 본기까지 센다 */
function sipsungTally(chart) {
  const list = [
    chart.sipsung.year, chart.sipsung.month, chart.sipsung.hour,
    chart.sipsung.yearBranch, chart.sipsung.monthBranch, chart.sipsung.dayBranch, chart.sipsung.hourBranch,
  ].filter(Boolean);
  const count = {};
  for (const s of list) count[s] = (count[s] || 0) + 1;
  return count;
}

/**
 * 몫을 정수 퍼센트로 나눈다 — 합계는 반드시 100, 항목마다 최소 minEach.
 * 큰 항목이 더 도드라지도록 가중치에 1.4제곱을 준 뒤 나누고, 반올림 오차는 맨 위 항목에서 맞춘다.
 */
function splitShares(weights, minEach = 9) {
  const pow = weights.map((w) => Math.pow(Math.max(0.01, w), 1.4));
  let shares = pow.slice();
  /* 하한에 걸린 몫은 고정하고, 나머지를 다시 나눠 합계 100에 수렴시킨다 */
  for (let pass = 0; pass < 8; pass += 1) {
    const sum = shares.reduce((a, b) => a + b, 0);
    if (!sum) break;
    shares = shares.map((s) => (s / sum) * 100);
    const under = shares.map((s) => s < minEach);
    if (!under.some(Boolean)) break;
    const fixedSum = shares.reduce((a, s, i) => a + (under[i] ? minEach : 0), 0);
    const freeSum = shares.reduce((a, s, i) => a + (under[i] ? 0 : s), 0);
    if (!freeSum) break;
    const room = 100 - fixedSum;
    shares = shares.map((s, i) => (under[i] ? minEach : (s / freeSum) * room));
  }

  const out = shares.map((s) => Math.max(minEach, Math.round(s)));
  let diff = 100 - out.reduce((a, b) => a + b, 0);
  let guard = 0;
  while (diff !== 0 && guard < 200) {
    /* 남는 몫은 맨 위 항목에, 모자란 몫은 제일 큰 항목에서 한 번씩 깎는다 */
    const idx = out.reduce((m, v, k) => (v > out[m] ? k : m), 0);
    if (diff < 0) {
      if (out[idx] <= minEach) break;
      out[idx] -= 1;
      diff += 1;
    } else {
      out[0] += 1;
      diff -= 1;
    }
    guard += 1;
  }
  return out;
}

/**
 * 사주 '돈 새는 구멍' 영수증
 *
 *   원국의 오행 개수와 십성 분포만으로 여섯 개의 '새는 구멍' 무게를 매기고,
 *   무게가 큰 네 개만 골라 합계 100%로 나눈다. 같은 명식이면 언제나 같은 영수증이다.
 *   고객 화면에는 명리 용어를 쓰지 않는다 — 항목 이름·문장은 content/playground.js 의 구어체 표에서만 나온다.
 *
 * @param {object} chart computeChart 결과
 * @param {{now?: Date}} [opts]
 * @returns {object|null}
 */
export function moneyLeak(chart, { now = new Date() } = {}) {
  if (!chart || !chart.ok) return null;
  const c = sipsungTally(chart);
  const oh = chart.ohaeng.count || {};
  const n = (key) => c[key] || 0;
  const jae = n('편재') + n('정재');

  /* 여섯 구멍의 무게 — 십성 분포가 주된 근거, 오행은 기울기만 살짝 보정한다 */
  const weights = {
    hukung: 0.9 + n('겁재') * 2.4 + n('비견') * 1.1,
    stress: 0.8 + n('편관') * 2.2 + n('정관') * 1.3,
    late: 0.9 + n('식신') * 2.4 + (oh['수'] || 0) * 0.35,
    flex: 0.9 + n('상관') * 2.4 + (oh['화'] || 0) * 0.35,
    chase: 0.8 + n('편재') * 2.6 + n('정재') * 0.7,
    sub: 0.8 + n('편인') * 1.9 + n('정인') * 1.5,
  };

  const ranked = MONEY_HOLE_ORDER
    .map((key) => ({ key, weight: weights[key] }))
    .sort((a, b) => b.weight - a.weight || MONEY_HOLE_ORDER.indexOf(a.key) - MONEY_HOLE_ORDER.indexOf(b.key))
    .slice(0, 4);

  const shares = splitShares(ranked.map((r) => r.weight));
  const holes = ranked.map((r, i) => {
    const meta = MONEY_HOLES[r.key];
    return {
      key: r.key,
      rank: i + 1,
      name: meta.name,
      short: meta.short,
      tag: meta.tag,
      line: meta.line,
      why: r.key === 'chase' && jae === 0 ? meta.whyEmpty || meta.why : meta.why,
      fix: meta.fix,
      roast: meta.roast,
      percent: shares[i],
      amount: Math.round((MONEY_BASE_AMOUNT * shares[i]) / 100),
    };
  });

  const top = holes[0];

  /* 월 누수 지수 — 한 곳에 몰릴수록, 충동·즉흥 쪽 기운이 셀수록 올라간다 */
  const index = clamp(
    44
      + (top.percent - 25) * 1.15
      + (n('겁재') + n('편관') + n('상관')) * 2
      + (jae === 0 ? 9 : 0)
      + ((oh['화'] || 0) >= 3 ? 5 : 0)
      + (chart.ohaeng.missing.includes('토') ? 4 : 0)
      - (n('정재') >= 2 ? 5 : 0),
    31,
    96,
  );
  const step = [85, 75, 64, 52].findIndex((min) => index >= min);
  const grade = MONEY_GRADES[step === -1 ? 1 : [5, 4, 3, 2][step]];

  /* 영수증 번호·날짜 — 번호는 명식에서만 나오므로 같은 사주면 같은 번호 */
  const t = seoulNow(now);
  const wd = WEEKDAY[new Date(Date.UTC(t.year, t.month - 1, t.day)).getUTCDay()];
  const shortDate = `${t.year}.${pad2(t.month)}.${pad2(t.day)}`;
  const no = `3F-${String(1000 + (seedOf(`${chart.summary}|${chart.solar.y}-${chart.solar.m}`) % 9000))}`;

  const shareText = [
    "🧾 내 사주 '돈 새는 구멍' 영수증",
    `1위 — ${top.name} ${top.percent}%`,
    `2위 — ${holes[1].name} ${holes[1].percent}%`,
    `월 누수 지수 ${index} · 탕진 경보 ${grade.step}단계 (${grade.label})`,
    '',
    '너는 어디서 제일 새? 생일만 넣으면 10초야.',
    '@3F_Zanie #돈새는구멍 #사주보는3층다락방',
  ].join('\n');

  const instaText = [
    "🧾 내 사주 '돈 새는 구멍' 영수증 · " + shortDate,
    `1위 ${top.short} ${top.percent}%`,
    `2위 ${holes[1].short} ${holes[1].percent}% · 3위 ${holes[2].short} ${holes[2].percent}%`,
    `월 누수 지수 ${index}/100 (${grade.step}단계 ${grade.label})`,
    `자니 왈: “${top.roast}”`,
    '',
    '@3f.zanie #사주보는3층다락방 #돈새는구멍',
  ].join('\n');

  return {
    hasChart: true,
    shortDate,
    dateLabel: `${shortDate} (${wd})`,
    no,
    ilju: chart.pillars.day.ko,
    iljuAnimal: chart.iljuAnimal,
    animal: chart.animal,
    dayStem: chart.dayMaster.ko,
    dayOhaeng: chart.dayMaster.ohaeng,
    holes,
    top,
    total: 100,
    base: MONEY_BASE_AMOUNT,
    leak: { index, step: grade.step, label: grade.label, headline: grade.headline },
    jani: top.roast,
    fix: top.fix,
    why: top.why,
    shareText,
    instaText,
  };
}
