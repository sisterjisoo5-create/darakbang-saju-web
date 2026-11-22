// 연애운 · 사랑운 — 결제일(오늘) 기준 앞뒤 월별 인연 타이밍
//
// 2026-11-22 시연 님 요청:
//   "인연이 오는 시기를 10년 대운만 보여 주기보다, 결제일 기준 앞뒤 3~6개월로
//    어떤 해 · 무슨 달 · 오행의 어떤 기운으로 어떤 인연이 오고 가는지 풀어 달라."
//
// 10년 대운(loveSections 의 lf-when 앞부분)은 그대로 두고, 그 아래에
//   지난 3개월 + 이번 달 + 앞으로 6개월 = 열 달의 월건(月建)을 세워
//   달마다 ① 월건 ② 들어오는 오행 기운 ③ 배우자성(관성/재성) ④ 일지와의 합·충·형·파·원진
//   으로 인연이 어떻게 오고 가는지 일상어로 풀어 준다.
//
// 기준 시각은 clock.js 의 서울 현재 날짜 — 하드코딩하지 않는다(테스트는 now 를 주입).
import { josa } from '../engine/bias.js';
import { monthWindow, composeMonthText } from './month-flow.js';

/** 지난 3개월 · 이번 달 · 앞으로 6개월 */
export const LOVE_WINDOW = { past: 3, future: 6 };

/** 배우자성 — 여자는 관성(정관·편관), 남자는 재성(정재·편재) */
export function spouseStars(gender) {
  return gender === 'male' ? ['정재', '편재'] : ['정관', '편관'];
}

/** 달의 결 — 화면·테스트가 함께 쓰는 이름표 */
export const LOVE_TIERS = {
  open: { title: '인연의 문이 열리는 달', tone: 'open' },
  mixed: { title: '인연이 오지만 흔들리는 달', tone: 'mixed' },
  shake: { title: '관계가 흔들리며 자리를 바꾸는 달', tone: 'hard' },
  rival: { title: '사람은 많지만 겹치는 달', tone: 'hard' },
  guard: { title: '말과 비교가 마음을 긁는 달', tone: 'hard' },
  link: { title: '묵은 인연이 다시 이어지는 달', tone: 'soft' },
  quiet: { title: '마음이 안으로 향하는 달', tone: 'calm' },
  warm: { title: '편안한 자리에서 스며드는 달', tone: 'soft' },
  real: { title: '현실이 사람을 데려오는 달', tone: 'plain' },
  daily: { title: '조용히 흐르는 달', tone: 'plain' },
};

const HARD_RELATIONS = ['충', '형', '파', '원진'];
const SOFT_RELATIONS = ['육합', '삼합'];

const RELATION_LINE = {
  육합: '월지가 내 일지와 육합을 이루고 있어서,',
  삼합: '월지가 내 일지와 삼합을 이루고 있어서,',
  충: '월지가 내 일지와 충으로 부딪히고 있어서,',
  형: '월지가 내 일지와 형으로 서로를 긁고 있어서,',
  파: '월지가 내 일지와 어긋나는 파를 이루고 있어서,',
  원진: '월지가 내 일지와 원진을 이루고 있어서,',
};


/** 달의 결 — 무엇이 먼저 눈에 띄는가 (배우자성 > 일지 충돌 > 십성 성질 > 합) */
function tierOf({ sipsung, relation, isSpouseStar }) {
  const hard = HARD_RELATIONS.includes(relation);
  const soft = SOFT_RELATIONS.includes(relation);
  if (isSpouseStar) return hard ? 'mixed' : 'open';
  if (hard) return 'shake';
  if (sipsung === '겁재') return 'rival';
  if (sipsung === '상관') return 'guard';
  if (soft) return 'link';
  if (sipsung === '정인' || sipsung === '편인') return 'quiet';
  if (sipsung === '식신' || sipsung === '비견') return 'warm';
  if (sipsung === '정재' || sipsung === '편재') return 'real';
  return 'daily';
}

/** 결마다 한 문장 — 무엇을 하면 되는지까지 적는다 */
const ACTION = {
  open: [
    '새로운 만남이 생기거나, 마음에 두고 있던 사람과 대화가 한 칸 가까워집니다. 이 달의 약속은 미루지 마세요.',
    '먼저 말을 거는 쪽이 이깁니다. 소개·모임에서 눈에 들어온 사람에게 이 달 안에 인사를 건네 보세요.',
  ],
  mixed: [
    '새 사람이 들어오는 문은 열리는데 말이 세지면 그 인연도 같이 흔들립니다. 고백은 이 달 끝으로 미루고 대화부터 쌓으세요.',
    '끌림은 분명한데 확인하려 들면 어긋납니다. 상대의 말보다 행동을 보고, 판단은 다음 달로 넘기세요.',
  ],
  shake: [
    '연락이 뜸해지고 사소한 말에 다투기 쉽습니다. 이 달의 이별 통보는 대개 후회로 돌아오니 하루만 미뤄 두세요.',
    '오해가 생기면 그 자리에서 풀지 말고 하루 뒤에 만나 이야기하세요. 감정이 올라온 밤의 메시지는 보내지 마세요.',
  ],
  rival: [
    '소개 자리마다 비슷한 사람이 겹쳐 마음이 갈라집니다. 마음에 드는 사람이 생기면 친한 사람에게 먼저 말해 두세요.',
    '친구와 같은 사람을 마음에 두기 쉬운 달이에요. 비교보다 내가 편한 사람을 고르세요.',
  ],
  guard: [
    '답을 재촉하거나 상대를 고쳐 주려 하면 관계가 식습니다. 마음을 정리하기보다 말을 고르는 달로 쓰세요.',
    '농담이 지적이 되기 쉬운 달이에요. 말하기 전에 한 번만 더 생각하고, 잘한 점을 먼저 말해 보세요.',
  ],
  link: [
    '오래 끊겼던 연락이 닿거나 아는 사람의 소개로 만남이 이뤄집니다. 먼저 안부를 물어보세요.',
    '잊고 있던 사람이 떠오르는 달이에요. 그 이름이 떠오르면 그때 연락해 보세요 — 이 달에는 답이 옵니다.',
  ],
  quiet: [
    '새로 만나기보다 혼자 정리하는 시간이 필요한 달입니다. 다만 마음을 닫아 두면 다음 달 인연이 문 앞에서 돌아갑니다.',
    '생각이 많아지는 달이라 혼자 결론을 내리기 쉬워요. 마음이 정리되면 그때 밖으로 나오세요.',
  ],
  warm: [
    '모임·취미·동호회 같은 편한 자리에서 대화가 자연스럽게 이어집니다. 설렘보다 편안함을 기준으로 보세요.',
    '웃는 얼굴이 그대로 매력이 되는 달이에요. 소개받은 자리에서 한 번 더 만나 보세요.',
  ],
  real: [
    '일·거래·약속으로 만나는 사람 중에 오래 갈 인연이 섞여 있습니다. 첫인상보다 약속을 지키는지 보세요.',
    '생활 반경이 넓어지는 달이라 자연스러운 만남이 생깁니다. 소개보다 함께 하는 일에서 인연을 찾으세요.',
  ],
  daily: [
    '크게 오르내리지 않는 달이라 운이 사람을 데려다주지는 않습니다. 내가 나가 있는 자리에서 인연이 시작됩니다.',
    '조용한 달이에요. 대신 미뤄 둔 연락을 정리하고, 다음 달에 만날 사람을 미리 정해 두면 좋습니다.',
  ],
};

/** 일지와 아무 합도 충도 없는 달 — 같은 말이 열 번 반복되지 않게 돌려 쓴다 */
const NEUTRAL_RELATIONS = [
  '월지가 내 일지와 붙지도 부딪히지도 않아서,',
  '일지와 이렇다 할 합도 충도 없어서,',
  '일지와는 서로 비켜 가 있어서,',
];


function ohaengPairText(stemO, branchO) {
  return stemO === branchO ? stemO : `${stemO}·${branchO}`;
}

function vibeText(pairOhaeng, ohaengList, chart) {
  const missing = (chart.ohaeng && chart.ohaeng.missing) || [];
  const strongest = chart.ohaeng && chart.ohaeng.strongest;
  if (ohaengList.every((o) => missing.includes(o))) return `비어 있던 ${pairOhaeng} 기운이 채워지는 달이에요.`;
  if (strongest && ohaengList.every((o) => o === strongest)) return `${pairOhaeng} 기운이 유난히 세지는 달이에요.`;
  return `${pairOhaeng} 기운이 도는 달이에요.`;
}

/**
 * 월별 인연 타이밍 — 결제일(오늘) 기준 지난 3개월 ~ 앞으로 6개월.
 * @param {object} chart computeChart 결과
 * @param {{now?: Date, past?: number, future?: number}} [options]
 *        now — 기준 시각(기본: 서울 현재 시각). 테스트는 고정 날짜를 넣는다.
 */
export function loveMonthTiming(chart, options = {}) {
  const spouse = spouseStars(chart.input && chart.input.gender);
  const dayBranchKo = chart.pillars.day.branchKo;
  // 열 달 창(월건·오행·십성·일지 관계)은 네 리포트가 함께 쓰는 month-flow 의 monthWindow 하나로
  const w = monthWindow(chart, options);

  const months = w.months.map((m, i) => {
    const isSpouseStar = spouse.includes(m.sipsung);
    const tier = tierOf({ sipsung: m.sipsung, relation: m.relation, isSpouseStar });
    const head = isSpouseStar
      ? `${m.ohaengPair} 기운 위로 인연의 별 ${josa(m.sipsung, '이', '가')} 월간에 들어오는 달이에요.`
      : vibeText(m.ohaengPair, m.ohaengList, chart);
    return {
      ...m,
      isSpouseStar,
      spouseStar: spouse.join('·'),
      tier,
      title: LOVE_TIERS[tier].title,
      tone: LOVE_TIERS[tier].tone,
      text: composeMonthText(m, head, ACTION[tier][i % ACTION[tier].length]),
      short: `${m.label}(${m.ko}월) — ${LOVE_TIERS[tier].title}`,
    };
  });

  const rankBest = ['open', 'mixed', 'link', 'warm', 'real', 'daily', 'quiet', 'guard', 'rival', 'shake'];
  const rankWorst = ['shake', 'guard', 'rival', 'mixed', 'quiet'];
  const pick = (order, from) => {
    for (const tier of order) {
      const hit = from.find((m) => m.tier === tier);
      if (hit) return hit;
    }
    return null;
  };
  // 지난 달을 「가장 문이 열린 달」로 권하면 이미 지나간 달에 약속을 잡으라는 말이 된다
  //   → 이번 달과 앞으로의 달에서 먼저 고르고, 거기 없을 때만 지난 달까지 본다
  const pool = months.filter((m) => m.phase !== 'past');
  const best = pick(rankBest, pool) || pick(rankBest, months);
  const worst = pick(rankWorst, pool.filter((m) => m.tier !== 'open' && m.tier !== 'mixed')) ||
    pick(rankWorst, pool) ||
    pick(rankWorst, months);

  const HARD_TONES = ['hard', 'mixed'];
  const worstIsHard = worst ? HARD_TONES.includes(worst.tone) : false;

  return {
    basis: w.basis,
    worstLabel: worstIsHard ? '말을 고를 달' : '힘을 빼야 할 달',
    worstAdvice: worstIsHard ? '말을 고르세요' : '무리하지 마세요',
    past: w.past,
    future: w.future,
    count: w.count,
    fromLabel: w.fromLabel,
    toLabel: w.toLabel,
    spouseStars: spouse,
    dayBranchKo,
    months,
    best,
    worst,
    openMonths: months.filter((m) => m.tier === 'open' || m.tier === 'mixed'),
  };
}

/** 한 줄 요약 — 평생 종합 리포트처럼 짧게만 보여 주는 자리에 쓴다 */
export function loveMonthLine(timing) {
  const t = timing;
  if (!t || !t.months.length) return '';
  const head = `${t.basis.label} 기준 ${t.fromLabel}부터 ${t.toLabel}까지 열 달을 월건으로 보면,`;
  const open = t.openMonths.filter((m) => m.tier === 'open');
  const mid = `${open.length ? `${open.map((m) => m.label).join(', ')}에 인연의 별이 월간으로 들어옵니다.` : '배우자성이 월간으로 또렷하게 들어오는 달은 없어요.'}`;
  const best = t.best ? ` 가장 문이 열린 달은 ${t.best.label}(${t.best.ko}월)이고,` : '';
  const worst = t.worst ? `${t.worst.label}(${t.worst.ko}월)은 ${LOVE_TIERS[t.worst.tier].title}이라 ${t.worstAdvice || '무리하지 마세요'}.` : '';
  return `${head} ${mid}${best} ${worst}`.replace(/\s+/g, ' ').trim();
}
