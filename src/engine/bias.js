// 최애궁합 — 최애(아이돌·배우)와 나의 연인 궁합 계산
// · 최애는 태어난 시간을 모르는 경우가 대부분이라 시주 없이 6글자(년·월·일주)로 계산한다.
//   computeChart 는 timeUnknown 이면 시주를 만들지 않으므로, 여기서는 시주·자미두수를 쓰지 않는다.
// · 점수는 모두 같은 입력이면 같은 값이 나오는 결정론적 계산이다.
import { STEMS, BRANCHES, OHAENG, OHAENG_META, SANGSAENG, SANGGEUK } from './constants.js';
import { computeCompat, branchRelation, stemRelation, withJosa } from './compat.js';
import { monthlyFlow } from './saju.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));

/** 받침에 따라 조사를 붙인다 — josa('차은우', '과', '와') → '차은우와' (compat 의 공용 구현) */
export const josa = withJosa;

/** 일지 관계 — 두 사람의 일지가 만드는 결 */
export const ILJU_REL = {
  육합: { title: '일지 육합', short: '붙어 있는 사이', line: '두 사람의 일지가 육합으로 묶였어요. 생활 리듬이 맞고, 옆에 있으면 이상하게 숨이 편해지는 조합이에요.' },
  삼합: { title: '일지 삼합', short: '같은 방향을 보는 사이', line: '같은 방향으로 힘을 모으는 삼합이에요. 목표가 겹치면 시너지가 크고, 어긋나면 둘 다 답답해져요.' },
  충: { title: '일지 충', short: '정면으로 부딪히는 사이', line: '정면으로 마주 보는 충이에요. 처음엔 강하게 끌리지만, 사소한 습관에서 크게 부딪히는 축입니다.' },
  형: { title: '일지 형', short: '닮은 약점을 아는 사이', line: '같은 실수를 반복하는 형이에요. 서로의 약점을 정확히 아는 사이라, 그걸 무기로 쓰면 오래 못 가요.' },
  원진: { title: '일지 원진', short: '이유 없이 서운한 사이', line: '이유 없이 서운해지는 원진이에요. 설명하지 않고 넘기면 오해가 차곡차곡 쌓입니다.' },
  파: { title: '일지 파', short: '시작은 좋은 사이', line: '시작은 좋은데 마무리가 흐려지는 파예요. 약속을 말이 아니라 기록으로 남기면 오래갑니다.' },
};

/** 연인 궁합 점수 띠 — 같은 점수면 언제나 같은 문장 */
export const BIAS_BANDS = [
  { min: 88, key: 'fate', title: '운명급 케미', short: '사주가 먼저 알고 있던 조합', line: '처음 마주친 순간부터 "왜 이 사람이 낯설지 않지" 싶었을 조합이에요. 닮은 곳에서 편안함이, 다른 곳에서 끌림이 동시에 옵니다.' },
  { min: 80, key: 'spark', title: '설렘 확정 케미', short: '마주치면 하루가 흔들리는 조합', line: '한 번 눈이 마주치면 마음이 오래 남아요. 이 정도로 사주가 닿아 있으면, 좋아하는 마음을 숨기는 쪽이 더 힘들어집니다.' },
  { min: 72, key: 'push', title: '밀당이 되는 케미', short: '끌림과 부딪힘이 번갈아 오는 조합', line: '끌림과 부딪힘이 번갈아 와요. 그 리듬이 지루하지 않게 만드는 힘이지만, 같은 자리에서 두 번 부딪히면 마음이 먼저 지칩니다.' },
  { min: 64, key: 'different', title: '다르게 끌리는 케미', short: '달라서 끌리고 달라서 지치는 조합', line: '닮지 않아서 끌리고, 달라서 지치는 조합이에요. 서로의 속도를 인정하는 순간부터 이 궁합은 훨씬 편해집니다.' },
  { min: 0, key: 'same', title: '닮아서 편한 케미', short: '같은 결이라 편안한 조합', line: '같은 결이라 편안해요. 다만 둘 다 같은 자리에서 식으면 누가 먼저 말을 거는지가 늘 문제가 됩니다.' },
];

export function biasBandOf(score) {
  return BIAS_BANDS.find((b) => score >= b.min) || BIAS_BANDS[BIAS_BANDS.length - 1];
}

const REL_SPARK = { 육합: 22, 삼합: 16, 충: 15, 원진: 8, 형: 4, 파: 3 };
const STEM_SPARK = { 합: 15, 상생: 9, 같음: 5, 극: -4, 무관: 0 };

/** 최애가 없는 기운을 내가 채우는지 / 내 빈자리를 최애가 채우는지 */
function fillOf(me, bias) {
  const toMe = me.ohaeng.missing.filter((o) => (bias.ohaeng.count[o] || 0) >= 2);
  const toThem = bias.ohaeng.missing.filter((o) => (me.ohaeng.count[o] || 0) >= 2);
  return { toMe, toThem };
}

/**
 * 최애궁합 핵심 계산
 * @param {object} me computeChart(내 사주)
 * @param {object} bias computeChart(최애 사주) — 시주가 없어도 된다
 */
export function biasReading(me, bias) {
  const c = computeCompat(me, bias);
  const ax = Object.fromEntries(c.axes.map((a) => [a.key, a.value]));
  const mineDay = me.pillars.day;
  const theirDay = bias.pillars.day;
  const rel = branchRelation(mineDay.branchKo, theirDay.branchKo);
  const relInfo = ILJU_REL[rel] || { title: '일지 무관', short: '서로 간섭하지 않는 사이', line: '두 일지가 서로 간섭하지 않아요. 편안하지만, 설렘을 만들려면 한 사람이 먼저 나서야 합니다.' };
  const stem = stemRelation(me.dayStem, bias.dayStem);
  const gap = Math.round(Math.abs(me.ohaeng.temp - bias.ohaeng.temp) * 10) / 10;
  const fill = fillOf(me, bias);

  const spark = clamp(
    56 + (REL_SPARK[rel] || 2) + (STEM_SPARK[stem.kind] || 0) + (gap <= 3 ? 6 : gap <= 7 ? 2 : -4) + fill.toMe.length * 3,
    35,
    97,
  );
  // 연인 궁합은 '끌림'의 무게를 조금 더 싣는다. 네 축은 1:1 사주 궁합과 같은 엔진에서 나온다.
  const score = clamp(spark * 0.3 + ax.mind * 0.25 + ax.energy * 0.2 + ax.talk * 0.15 + ax.life * 0.1, 30, 98);
  const band = biasBandOf(score);

  return {
    compat: c,
    score,
    band,
    spark,
    axes: [
      { key: 'spark', label: '설렘', value: spark },
      { key: 'mind', label: '속마음 끌림', value: ax.mind },
      { key: 'energy', label: '오행 케미', value: ax.energy },
      { key: 'talk', label: '대화 케미', value: ax.talk },
      { key: 'life', label: '오래 가는 힘', value: ax.life },
    ],
    ilju: {
      mine: mineDay.ko,
      theirs: theirDay.ko,
      rel,
      title: relInfo.title,
      short: relInfo.short,
      line: relInfo.line,
    },
    stem,
    temp: { mine: me.ohaeng.temp, theirs: bias.ohaeng.temp, gap },
    fill,
  };
}

const MY_MONTH_BONUS = { 식신: 8, 정재: 8, 정관: 7, 정인: 6, 편재: 6, 비견: 1, 겁재: -4, 상관: -3, 편관: -5, 편인: -2 };
const REL_MONTH_BONUS = { 육합: 9, 삼합: 7, 원진: -4, 파: -3, 형: -5, 충: -9 };

/** 월별 한 줄 — 두 사람의 십성이 겹쳐서 만드는 말 */
const MONTH_LINE = {
  식신: '마음이 느슨해지고 표현이 자연스러워지는 달',
  상관: '말이 세지고 비교가 많아지는 달',
  편재: '바깥으로 크게 도는 달',
  정재: '생활이 단단해지고 약속이 지켜지는 달',
  편관: '압박이 세지만 실력이 증명되는 달',
  정관: '관계의 이름이 분명해지는 달',
  편인: '혼자만의 시간이 간절해지는 달',
  정인: '배움과 소식이 들어오는 달',
  비견: '내가 먼저 나서게 되는 달',
  겁재: '사람과 마음이 얽히는 달',
};

/**
 * 2026~2027 두 사람의 시너지가 빛나는 달
 * monthlyFlow(Y)는 Y년 입춘부터 이듬해 소한까지 12개월을 돌려주므로, 두 해를 이어 붙이면
 * 2026년 2월 ~ 2028년 1월의 흐름이 된다.
 */
export function synergyMonths(me, bias, years = [2026, 2027]) {
  const months = [];
  // 절기 월은 입춘부터 시작하므로, 앞 해의 소한(1월)까지 함께 계산해 1월~12월 달력을 만든다.
  const from = Math.min(...years) - 1;
  const to = Math.max(...years);
  for (let year = from; year <= to; year += 1) {
    const mineflow = monthlyFlow(year, me.dayStem);
    const theirflow = monthlyFlow(year, bias.dayStem);
    mineflow.list.forEach((m, i) => {
      const t = theirflow.list[i];
      let s = 58;
      s += MY_MONTH_BONUS[m.sipsung] || 0;
      s += Math.round((MY_MONTH_BONUS[t.sipsung] || 0) * 0.7);
      const r1 = branchRelation(m.branchKo, me.pillars.day.branchKo);
      const r2 = branchRelation(m.branchKo, bias.pillars.day.branchKo);
      s += REL_MONTH_BONUS[r1] || 0;
      s += Math.round((REL_MONTH_BONUS[r2] || 0) * 0.8);
      if ((MY_MONTH_BONUS[m.sipsung] || 0) >= 6 && (MY_MONTH_BONUS[t.sipsung] || 0) >= 6) s += 6;
      const score = clamp(s, 45, 96);
      const yearOfTerm = m.order === 12 ? year + 1 : year;
      if (yearOfTerm < Math.min(...years) || yearOfTerm > Math.max(...years)) return;
      const monthNum = Number(m.monthLabel.replace('월', ''));
      const tags = [];
      if (r1 === '육합' || r1 === '삼합') tags.push('내 일지와 합');
      if (r2 === '육합' || r2 === '삼합') tags.push('최애 일지와 합');
      if (r1 === '충' || r2 === '충') tags.push('충의 달');
      months.push({
        year: yearOfTerm,
        month: monthNum,
        label: `${yearOfTerm}년 ${monthNum}월`,
        short: `${String(yearOfTerm).slice(2)}.${String(monthNum).padStart(2, '0')}`,
        ganji: m.ko,
        mySipsung: m.sipsung,
        theirSipsung: t.sipsung,
        score,
        line: MONTH_LINE[m.sipsung] || '흐름이 정리되는 달',
        note: tags.join(' · '),
      });
    });
  }
  const ranked = [...months].sort((a, b) => b.score - a.score || a.year - b.year || a.month - b.month);
  return {
    months,
    best: ranked.slice(0, 3),
    next: ranked.slice(3, 5),
    caution: [...ranked].reverse().slice(0, 3),
    peak: ranked[0],
  };
}

const LUCKY_TIPS = [
  '오늘은 최애의 사진 한 장을 남겨 두세요. 이 궁합은 "기록"이 인연을 불러오는 사주예요.',
  '최애의 이름을 소리 내어 한 번 불러 보세요. 목소리로 꺼낸 이름이 그날의 기운을 데워 줍니다.',
  '오늘은 최애와 같은 색을 하나 몸에 걸쳐 보세요. 눈에 보이는 색이 마음의 방향을 먼저 정해 줍니다.',
  '최애가 웃는 영상을 하나 보고 시작하세요. 이 궁합의 설렘은 "먼저 웃는 쪽"에서 커집니다.',
  '오늘은 최애에게 하고 싶은 말을 한 줄 적어 두세요. 말해 보지 않은 문장은 마음에 오래 남아요.',
  '최애의 노래를 한 곡만 듣고 하루를 시작하세요. 귀에 남은 가락이 하루의 온도를 올려 줍니다.',
  '오늘은 최애의 오래된 사진을 찾아보세요. 이 궁합은 "처음 알던 때"를 다시 보면 힘이 살아납니다.',
];

function seedOf(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** 최애 궁합 행운 색·숫자·시간·팁 — 날짜가 같으면 같은 값 */
export function biasLucky(me, bias, now = new Date()) {
  const key = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  const seed = seedOf(`${key}-${me.pillars.day.ko}-${bias.pillars.day.ko}`);
  const need = me.ohaeng.missing[0] || bias.ohaeng.missing[0] || bias.ohaeng.strongest;
  const meta = OHAENG_META[need];
  const hours = ['07:00~09:00', '09:00~11:00', '11:00~13:00', '15:00~17:00', '17:00~19:00', '21:00~23:00'];
  return {
    dateKey: key,
    ohaeng: need,
    color: meta.color,
    colorHex: meta.hex,
    colorWhy: `${me.ohaeng.missing[0] ? '내게 비어 있는' : '두 사람에게 모자란'} ${josa(need, '을', '를')} 채우는 색이에요`,
    number: (seed % 9) + 1,
    time: hours[seed % hours.length],
    tip: LUCKY_TIPS[seed % LUCKY_TIPS.length],
  };
}

/** 오행 비교 표 — 나 / 최애 / 차이 */
export function ohaengCompare(me, bias) {
  return OHAENG.map((o) => {
    const a = me.ohaeng.count[o] || 0;
    const b = bias.ohaeng.count[o] || 0;
    const diff = a - b;
    const note = a === 0 && b === 0
      ? '둘 다 비어 있는 기운 — 함께 채우면 좋아요'
      : a === 0
        ? '내가 비어 있고 최애가 가진 기운'
        : b === 0
          ? '최애가 비어 있고 내가 가진 기운'
          : Math.abs(diff) >= 2
            ? `한쪽에 ${Math.abs(diff)}개 더 많아요`
            : '비슷하게 나눠 가진 기운';
    return { ohaeng: o, mine: a, theirs: b, diff, note };
  });
}

/** 두 사람이 서로에게 채워 주는 문장 재료 */
export function fillLines(me, bias, fill) {
  const lines = [];
  for (const o of fill.toMe) {
    lines.push(`최애의 ${o}(${OHAENG_META[o].han}) 기운이 내 사주의 빈자리를 채워요 — ${OHAENG_META[o].keyword}`);
  }
  for (const o of fill.toThem) {
    lines.push(`내 ${o}(${OHAENG_META[o].han}) 기운이 최애의 빈자리를 채워요 — ${OHAENG_META[o].keyword}`);
  }
  return lines;
}

/** 같은 기운끼리 부딪히는 지점 · 온도차 · 일지 관계에서 오는 엇박자 */
export function discordLines(me, bias, reading) {
  const lines = [];
  const sameStrong = me.ohaeng.strongest === bias.ohaeng.strongest;
  if (sameStrong) {
    lines.push(`두 사람 모두 ${josa(me.ohaeng.strongest, '이', '가')} 가장 강해요. 같은 기운끼리 만나면 처음엔 "나를 알아주는 사람"처럼 느껴지지만, 자존심이 부딪히면 양보가 어려워요.`);
  }
  if (reading.temp.gap >= 7) {
    lines.push(`사주 온도가 ${reading.temp.gap}도 차이 나요. 한 사람은 빨리 데워지고 한 사람은 천천히 식어서, "왜 이렇게 다르지"가 서운함으로 번지기 쉬워요.`);
  } else {
    lines.push(`사주 온도 차이는 ${reading.temp.gap}도로 크지 않아요. 대신 둘 다 같은 속도라, 서로가 지칠 때를 알아채는 사람이 없어질 수 있어요.`);
  }
  if (reading.ilju.rel === '충' || reading.ilju.rel === '형') {
    lines.push(`${josa(reading.ilju.title, '이라', '라')} 사소한 습관에서 부딪혀요. 큰 싸움보다 "또 그 습관"이 반복되는 게 위험합니다.`);
  } else if (reading.ilju.rel === '원진' || reading.ilju.rel === '파') {
    lines.push(`${josa(reading.ilju.title, '이라', '라')} 이유를 설명하지 않으면 서운함이 쌓여요. 짐작하지 말고 물어보는 쪽이 이 궁합에 맞습니다.`);
  } else {
    lines.push('일지가 서로 크게 부딪히지 않아요. 그래서 갈등이 없다고 방심하는 순간, 대화가 끊긴 채로 멀어질 수 있습니다.');
  }
  const meLack = me.ohaeng.count.화 || 0;
  const biasLack = bias.ohaeng.count.화 || 0;
  if (meLack === 0 && biasLack === 0) lines.push('두 사람 모두 화(火)가 비어 있어요. 좋아하는 마음을 표현하지 않으면 없는 것과 같아져요.');
  else if (meLack >= 2 && biasLack >= 2) lines.push('두 사람 모두 화(火)가 강해요. 감정이 올라오는 속도가 비슷해서, 한 번 불붙으면 둘 다 못 말립니다.');
  return lines;
}

/** 십성 개수 — 시주가 없으므로 천간 3 + 지지 3 */
export function sipsungTally(chart) {
  const list = [
    chart.sipsung.year, chart.sipsung.month,
    chart.sipsung.yearBranch, chart.sipsung.monthBranch, chart.sipsung.dayBranch,
  ].filter(Boolean);
  const count = {};
  for (const s of list) count[s] = (count[s] || 0) + 1;
  return count;
}

/* ────────────────────────────────────────────────────────────────
   최애의 삼주육자 · 찰떡 일주 TOP 3 · 우리의 첫 만남 · 나랑 연애하면?
   2026-11-23 시연 님 지시: "최애궁합 카드의 주된 내용은 나랑 최애랑 궁합보는 거지만
   '내 최애가 뭘 좋아할까'라는 시선으로 시작해서 '나랑 연애하면 궁합은?' 으로"
   · 여섯 글자(시주 없음)만으로도 최애의 필요한 기운을 계산한다.
   · 60일주를 하나씩 최애의 필요 기운·온도·일간합·일지합에 대입해 점수를 낸다(결정론).
   ──────────────────────────────────────────────────────────────── */

/**
 * 최애에게 필요한 기운
 *   ① 비어 있는 오행(0개)을 먼저 본다 ② 없으면 가장 얇은 오행
 *   ③ 두 번째는 남은 빈 오행, 없으면 과한 기운을 눌러 주는 오행(상극)
 */
export function partnerNeeds(bias) {
  const count = bias.ohaeng.count;
  const missing = [...bias.ohaeng.missing];
  const weakest = [...OHAENG].sort((a, b) => (count[a] || 0) - (count[b] || 0))[0];
  const primary = missing[0] || weakest;
  const balance = SANGGEUK[bias.ohaeng.strongest];
  const secondary = missing.find((o) => o !== primary)
    || (balance !== primary ? balance : [...OHAENG].sort((a, b) => (count[a] || 0) - (count[b] || 0)).find((o) => o !== primary));
  return {
    primary,
    secondary,
    missing,
    weakest,
    strong: bias.ohaeng.strongest,
    balance,
    /** primary 를 '비어 있어서' 고른 건지 '얇아서' 고른 건지 */
    primaryFrom: missing.length ? 'missing' : 'weak',
  };
}

const SIPSUNG_GROUP = {
  비견: '동료', 겁재: '동료',
  식신: '표현', 상관: '표현',
  편재: '벌이', 정재: '벌이',
  편관: '책임', 정관: '책임',
  편인: '품음', 정인: '품음',
};

const GROUP_MEMBERS = {
  동료: ['비견', '겁재'],
  표현: ['식신', '상관'],
  벌이: ['편재', '정재'],
  책임: ['편관', '정관'],
  품음: ['편인', '정인'],
};

const ROLE_LINE = {
  동료: '무리 안에서 자기 자리를 스스로 만드는 역할이에요. 남이 짜 둔 판보다, 같이 시작한 판에서 힘이 나요.',
  표현: '감정과 재능을 밖으로 꺼내 보여 주는 역할이에요. 무대와 카메라 앞에서 본래의 온도가 나옵니다.',
  벌이: '판을 키우고 사람을 움직이는 역할이에요. 기회와 숫자를 읽는 눈이 빨라요.',
  책임: '기준을 세우고 끝까지 지키는 역할이에요. 약속을 가볍게 넘기는 쪽을 가장 못 견뎌요.',
  품음: '배우고 정리해 사람들에게 나눠 주는 역할이에요. 혼자 있는 시간에 채워서, 그걸 다시 베풀어요.',
};

/** 최애가 여섯 글자에서 가장 많이 맡는 역할 — 십성 묶음으로 본다 */
export function roleOf(bias) {
  const tally = sipsungTally(bias);
  const byGroup = {};
  for (const [sipsung, n] of Object.entries(tally)) {
    const g = SIPSUNG_GROUP[sipsung];
    if (g) byGroup[g] = (byGroup[g] || 0) + n;
  }
  const order = ['표현', '책임', '벌이', '품음', '동료'];
  const group = order.reduce((best, g) => ((byGroup[g] || 0) > (byGroup[best] || 0) ? g : best), '동료');
  return {
    group,
    count: byGroup[group] || 0,
    members: GROUP_MEMBERS[group],
    line: ROLE_LINE[group],
  };
}

const BRANCH_SPARK = { 육합: 18, 삼합: 14, 충: 2, 원진: -8, 형: -10, 파: -6 };

/**
 * 최애와 찰떡인 일주 TOP N
 * 60일주(일간 × 일지)를 최애의 필요 기운·온도·일간 관계·일지 관계에 대입해 점수를 낸다.
 * · 최애와 같은 일주는 '끌리는 사람' 목록에서 뺀다(같은 결끼리는 끌림보다 편안함이 먼저다).
 * · TOP N 은 일간이 서로 다른 일주로 고른다 — 같은 일간 셋이 나오면 목록이 지루해진다.
 * @returns {{need:object, top:Array, list:Array, mine:{ilju:string,rank:number|null,inTop:boolean}|null}}
 */
export function idealIlju(bias, me = null, limit = 3) {
  const need = partnerNeeds(bias);
  const temp = bias.ohaeng.temp;
  const hot = temp >= 28;
  const cold = temp <= 20;
  const own = `${bias.pillars.day.ko}`;
  const theirBranch = bias.pillars.day.branchKo;
  const theirOhaeng = bias.dayMaster.ohaeng || STEMS[bias.dayStem].ohaeng;
  const rows = [];

  for (let order = 0; order < 60; order += 1) {
    const stem = order % 10;
    const branch = order % 12;
    const stemKo = STEMS[stem].ko;
    const branchKo = BRANCHES[branch].ko;
    const ilju = `${stemKo}${branchKo}`;
    if (ilju === own) continue;
    const sO = STEMS[stem].ohaeng;
    const bO = BRANCHES[branch].ohaeng;

    let score = 50;
    const match = { stem: null, branch: null, temp: null, stemKind: null, branchRel: null, double: false };

    if (sO === need.primary) { score += 16; match.stem = 'primary'; }
    else if (sO === need.secondary) { score += 11; match.stem = 'secondary'; }
    if (bO === need.primary) { score += 13; match.branch = 'primary'; }
    else if (bO === need.secondary) { score += 9; match.branch = 'secondary'; }
    if (match.stem === 'primary' && match.branch === 'primary') { score += 4; match.double = true; }

    if (hot && (sO === '수' || bO === '수')) { score += 9; match.temp = 'cool'; }
    else if (hot && (sO === '금' || bO === '금')) { score += 5; match.temp = 'cool'; }
    if (cold && (sO === '화' || bO === '화')) { score += 9; match.temp = 'warm'; }
    else if (cold && (sO === '목' || bO === '목')) { score += 5; match.temp = 'warm'; }

    const st = stemRelation(stem, bias.dayStem);
    match.stemKind = st.kind;
    if (st.kind === '합') score += 16;
    else if (st.kind === '상생') score += SANGSAENG[sO] === theirOhaeng ? 12 : 6;
    else if (st.kind === '같음') score += 6;
    else if (st.kind === '충') score += -8;
    else if (st.kind === '극') score += SANGGEUK[sO] === theirOhaeng ? -6 : -3;

    const rel = branchRelation(branchKo, theirBranch);
    match.branchRel = rel;
    score += BRANCH_SPARK[rel] || 0;

    rows.push({
      order, stem, branch, stemKo, branchKo, ilju,
      han: `${STEMS[stem].han}${BRANCHES[branch].han}`,
      stemOhaeng: sO,
      branchOhaeng: bO,
      score: clamp(score, 1, 98),
      match,
    });
  }

  rows.sort((a, b) => b.score - a.score || a.order - b.order);
  const list = rows.map((row, i) => ({ ...row, rank: i + 1 }));

  const top = [];
  const usedStems = new Set();
  const usedBranches = new Set();
  // ① 일간·일지가 모두 겹치지 않게 ② 그래도 모자라면 일지만 겹치는 것을 허용
  for (const strict of [true, false]) {
    for (const row of list) {
      if (top.length >= limit) break;
      if (top.includes(row)) continue;
      if (usedStems.has(row.stem)) continue;
      if (strict && usedBranches.has(row.branch)) continue;
      usedStems.add(row.stem);
      usedBranches.add(row.branch);
      top.push(row);
    }
    if (top.length >= limit) break;
  }
  top.sort((a, b) => b.score - a.score || a.order - b.order);

  let mine = null;
  if (me) {
    const ilju = `${me.pillars.day.ko}`;
    const found = list.find((row) => row.ilju === ilju);
    mine = {
      ilju,
      rank: found ? found.rank : null,
      inTop: top.some((row) => row.ilju === ilju),
      sameAsBias: ilju === own,
    };
  }

  return { need, top, list, mine };
}

/**
 * 내 사주가 최애의 필요 기운을 어떻게 갖고 있는지
 * @returns {{primary:number, secondary:number, fills:boolean, balance:boolean}}
 */
export function myFit(me, bias, need) {
  const prim = me.ohaeng.count[need.primary] || 0;
  const sec = me.ohaeng.count[need.secondary] || 0;
  const mineStrong = me.ohaeng.strongest;
  return {
    primary: prim,
    secondary: sec,
    fills: prim >= 1 || sec >= 1,
    balance: SANGGEUK[mineStrong] === bias.ohaeng.strongest || SANGGEUK[bias.ohaeng.strongest] === mineStrong,
  };
}

/* ────────────────────────────────────────────────────────────────
   우리의 첫 만남 — 계절 · 장소(오행·방위) · 시간대를 두 사주로 고른다
   2026-11-23 시연 님 지시: "최애와 유저의 각자 달의 흐름으로 봄·여름·가을·겨울 중
   어느 계절, 어느 장소, 몇 시경, 어느 스토리(거의 웹소설급)인지"
   · 같은 두 사주면 언제나 같은 장면이 나온다(결정론).
   · 문장은 content/bias.js 가 만들고, 여기서는 고른 자리(계절·오행·시진)만 돌려준다.
   ──────────────────────────────────────────────────────────────── */

/** 계절 ↔ 오행 — 봄 목 · 여름 화 · 가을 금 · 겨울 수 (토는 환절기라 계절로 쓰지 않는다) */
export const SEASON_OHAENG = { 봄: '목', 여름: '화', 가을: '금', 겨울: '수' };
export const SEASON_ORDER = ['봄', '여름', '가을', '겨울'];
/** 오행의 방위 — 첫 만남 장소를 고를 때 쓴다 */
export const PLACE_DIRECTION = { 목: '동쪽', 화: '남쪽', 토: '동네 안쪽', 금: '서쪽', 수: '북쪽' };

function weakestOf(chart) {
  return [...OHAENG].sort((a, b) => (chart.ohaeng.count[a] || 0) - (chart.ohaeng.count[b] || 0))[0];
}

/**
 * 두 사주가 처음 마주치는 자리 — 계절 · 장소 오행 · 시진
 * @param {object} me 내 명식
 * @param {object} bias 최애 명식 (시주 없어도 됨)
 * @returns {{season:object, place:object, hour:object, mySeason:string, theirSeason:string, seed:number}}
 */
export function firstMeeting(me, bias) {
  const need = partnerNeeds(bias);
  const seed = seedOf(`${me.pillars.year.ko}${me.pillars.month.ko}${me.pillars.day.ko}|${bias.pillars.year.ko}${bias.pillars.month.ko}${bias.pillars.day.ko}`);
  const myBranch = me.pillars.month.branchKo;
  const theirBranch = bias.pillars.month.branchKo;
  const mySeason = BRANCHES[me.pillars.month.branch].season;
  const theirSeason = BRANCHES[bias.pillars.month.branch].season;
  const myThin = me.ohaeng.missing[0] || weakestOf(me);

  // ① 계절 — 두 사주의 기운 + 각자의 월지 계절 + 서로에게 필요한 기운에 점수를 준다
  const seasons = SEASON_ORDER.map((key, order) => {
    const o = SEASON_OHAENG[key];
    const mine = me.ohaeng.count[o] || 0;
    const theirs = bias.ohaeng.count[o] || 0;
    let s = mine * 1.2 + theirs * 1.4;
    if (need.primary === o) s += 3.2;
    if (need.secondary === o) s += 1.8;
    if (myThin === o) s += 2.4;
    if (me.ohaeng.strongest === o) s += 1.1;
    if (bias.ohaeng.strongest === o) s += 1.1;
    if (mySeason === key) s += 2.2;
    if (theirSeason === key) s += 2.2;
    return {
      key, ohaeng: o, order, mine, theirs,
      score: Math.round(s * 10) / 10,
      mineSeason: mySeason === key,
      theirSeason: theirSeason === key,
    };
  });
  const bestScore = Math.max(...seasons.map((x) => x.score));
  const tied = seasons.filter((x) => x.score === bestScore);
  const season = tied.length > 1 ? tied[seed % tied.length] : seasons.find((x) => x.score === bestScore);

  // ② 장소 — 최애에게 목마른 기운의 자리. 내가 그 기운을 하나도 안 갖고 있고
  //    두 번째 기운을 두 개 이상 갖고 있으면, 내가 들고 갈 수 있는 기운의 자리로 바꾼다.
  const sums = OHAENG.map((o) => ({
    o,
    sum: (me.ohaeng.count[o] || 0) + (bias.ohaeng.count[o] || 0),
    mine: me.ohaeng.count[o] || 0,
    theirs: bias.ohaeng.count[o] || 0,
  }));
  const I_BRING = (me.ohaeng.count[need.primary] || 0) === 0 && (me.ohaeng.count[need.secondary] || 0) >= 2;
  const placeOhaeng = I_BRING ? need.secondary : need.primary;
  const placeRow = sums.find((x) => x.o === placeOhaeng);

  // ③ 시간 — 두 사람의 일지에 가장 부드럽게 걸리는 시진. 늦은 오후~밤을 먼저 본다
  //    (첫 만남이 새벽 3시에 열리는 일이 없도록, 시각 자체에도 무게를 둔다)
  const HOUR_REL = { 육합: 5, 삼합: 4 };
  const EVENING = [9, 1, 2, 4, 3, 6, 7, 8, 12, 11, 10, 11];
  // 장소마다 문을 여는 시간이 다르다 — 미술관이 밤 10시에, 서점이 새벽 4시에 열려 있으면 안 된다
  const OPEN_HOURS = {
    목: [5, 6, 7, 8, 9, 10, 11],      // 09~23시 (공원·산책로)
    화: [5, 6, 7, 8, 9, 10, 11],      // 09~23시 (축제·카페)
    토: [5, 6, 7, 8, 9, 10],          // 09~21시 (서점·도서관)
    금: [5, 6, 7, 8],                 // 09~19시 (미술관·갤러리)
    수: [8, 9, 10, 11, 0],            // 15~01시 (강변·바)
  };
  const relOf = (rel) => HOUR_REL[rel] || (rel === '파' || rel === '원진' || rel === '형' || rel === '충' ? 0 : 2);
  const hours = OPEN_HOURS[placeOhaeng].map((branch) => {
    const b = BRANCHES[branch];
    const withBias = branchRelation(b.ko, bias.pillars.day.branchKo);
    const withMe = branchRelation(b.ko, me.pillars.day.branchKo);
    return {
      branch,
      ko: b.ko,
      ohaeng: b.ohaeng,
      rel: withBias,
      score: relOf(withBias) * 2 + relOf(withMe) + EVENING[branch],
    };
  });
  // 점수 상위 셋 중에서 두 사주로 만든 seed 가 하나를 고른다 — 같은 사주면 늘 같은 시각
  const ranked = [...hours].sort((a, b) => b.score - a.score || a.branch - b.branch);
  const hour = ranked[seed % Math.min(3, ranked.length)];

  return {
    seed,
    mySeason,
    theirSeason,
    myMonthBranch: myBranch,
    theirMonthBranch: theirBranch,
    season,
    place: {
      ohaeng: placeOhaeng,
      direction: PLACE_DIRECTION[placeOhaeng],
      mine: placeRow.mine,
      theirs: placeRow.theirs,
      sum: placeRow.sum,
      variant: (seed >>> 5) % 2,
      sharedThin: placeRow.mine === 0 && placeRow.theirs === 0,
    },
    hour: { branch: hour.branch, ko: hour.ko, ohaeng: hour.ohaeng, rel: hour.rel, variant: (seed >>> 7) % 2 },
  };
}

/** 연예인 생시를 몰라도 되는 6글자 요약 — 년·월·일주 + 일간·띠·오행 */
export function sixLetterSummary(chart) {
  const p = chart.pillars;
  return {
    pillars: `${p.year.ko} · ${p.month.ko} · ${p.day.ko}${p.hour ? ` · ${p.hour.ko}` : ''}`,
    dayMaster: `${chart.dayMaster.ko}(${chart.dayMaster.han})`,
    animal: `${chart.dii}띠`,
    ilju: chart.iljuAnimal,
    temp: chart.ohaeng.temp,
    letterCount: p.hour ? 8 : 6,
    hourKnown: Boolean(p.hour),
  };
}

export { OHAENG, OHAENG_META, SANGSAENG, SANGGEUK, STEMS, BRANCHES };
