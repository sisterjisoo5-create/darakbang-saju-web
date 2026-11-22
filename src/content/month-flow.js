// 결제일(오늘) 기준 앞뒤 월별 오행 흐름 — 연애 · 재회 · 직업 · 재물 네 리포트가 함께 쓰는 뼈대.
//
// 2026-11-22 시연 님 요청:
//   "인연이 오는 시기를 10년 대운만 보여 주기보다, 결제일 기준 앞뒤 3~6개월로
//    어떤 해 · 무슨 달 · 오행의 어떤 기운으로 어떤 일이 오고 가는지 풀어 달라."
//   → 연애·사랑운뿐 아니라 재회운 · 직업·이직운 · 재물운 네 곳 모두에 같은 창(窓)을 세운다.
//
// 공통 뼈대
//   · 창: 지난 3개월 + 이번 달 + 앞으로 6개월 = 열 달 (서울 오늘 기준 · now 주입 가능)
//   · 달마다: 연·월 + 월건(절기 기준) + 들어오는 오행(월간·월지) + 월간 십성 + 월지 ↔ 내 일지 관계
//   · 리포트마다 그 재료를 자기 언어로 풀어 쓴다(같은 문장을 돌려 쓰지 않는다)
import { seoulNow } from '../engine/clock.js';
import { sipsungOf } from '../engine/saju.js';
import { branchRelation } from '../engine/compat.js';
import { BRANCHES } from '../engine/constants.js';
import { monthPillarWindow, addMonths } from '../engine/month-pillar.js';

/** 지난 3개월 · 이번 달 · 앞으로 6개월 */
export const FLOW_WINDOW = { past: 3, future: 6 };

const HARD = ['충', '형', '파', '원진'];
const SOFT = ['육합', '삼합'];

/** 지지 관계 문구 — 네 리포트가 함께 쓴다 */
const RELATION_LINE = {
  육합: '월지가 내 일지와 육합을 이루고 있어서,',
  삼합: '월지가 내 일지와 삼합을 이루고 있어서,',
  충: '월지가 내 일지와 충으로 부딪히고 있어서,',
  형: '월지가 내 일지와 형으로 서로를 긁고 있어서,',
  파: '월지가 내 일지와 어긋나는 파를 이루고 있어서,',
  원진: '월지가 내 일지와 원진을 이루고 있어서,',
};
const NEUTRAL_RELATIONS = [
  '월지가 내 일지와 붙지도 부딪히지도 않아서,',
  '일지와 이렇다 할 합도 충도 없어서,',
  '일지와는 서로 비켜 가 있어서,',
];

function ohaengPairText(a, b) {
  return a === b ? a : `${a}·${b}`;
}

/** 그 달에 들어오는 오행을 이 사주 기준으로 한 문장 */
export function vibeText(pair, list, chart) {
  const missing = (chart.ohaeng && chart.ohaeng.missing) || [];
  const strongest = chart.ohaeng && chart.ohaeng.strongest;
  if (list.every((o) => missing.includes(o))) return `비어 있던 ${pair} 기운이 채워지는 달이에요.`;
  if (strongest && list.every((o) => o === strongest)) return `${pair} 기운이 유난히 세지는 달이에요.`;
  return `${pair} 기운이 도는 달이에요.`;
}

/**
 * 열 달의 월건 창 — 리포트별 해석은 각자의 flow 함수가 붙인다.
 * @param {object} chart computeChart 결과
 * @param {{now?:Date, past?:number, future?:number}} [options]
 */
export function monthWindow(chart, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const t = seoulNow(now);
  const past = Number.isInteger(options.past) ? options.past : FLOW_WINDOW.past;
  const future = Number.isInteger(options.future) ? options.future : FLOW_WINDOW.future;
  const total = past + 1 + future;
  const start = addMonths(t.year, t.month, -past);
  const pillars = monthPillarWindow(start.year, start.month, total);
  const dayBranchKo = chart.pillars.day.branchKo;

  const months = pillars.map((p, i) => {
    const sipsung = sipsungOf(chart.dayStem, p.stem);
    // branchRelation 은 지지 '이름'으로 비교한다 — 인덱스를 넘기면 늘 null 이 된다
    const relation = branchRelation(BRANCHES[p.branch].ko, dayBranchKo);
    const pair = ohaengPairText(p.stemOhaeng, p.branchOhaeng);
    return {
      ...p,
      // 좁은 폭 표·막대가 쓰는 짧은 이름 — 26.11, 27.01
      short: `${String(p.year).slice(-2)}.${String(p.month).padStart(2, '0')}`,
      phase: i < past ? 'past' : i === past ? 'now' : 'future',
      sipsung,
      relation,
      hard: HARD.includes(relation),
      soft: SOFT.includes(relation),
      ohaengPair: pair,
      ohaengList: [p.stemOhaeng, p.branchOhaeng],
      relLine: RELATION_LINE[relation] || NEUTRAL_RELATIONS[i % NEUTRAL_RELATIONS.length],
      head: vibeText(pair, [p.stemOhaeng, p.branchOhaeng], chart),
    };
  });

  return {
    basis: { year: t.year, month: t.month, day: t.day, label: `${t.year}년 ${t.month}월` },
    past,
    future,
    count: total,
    fromLabel: months[0].label,
    toLabel: months[months.length - 1].label,
    dayBranchKo,
    months,
  };
}

/** 기준일 안내 — 창의 앞뒤 폭이 리포트마다 달라도 문장이 어긋나지 않게 */
function spanText(w) {
  if (w.past === 0) return w.future === 11 ? '이번 달부터 열두 달' : `이번 달부터 ${w.future + 1}달`;
  return `석 달 전부터 여섯 달 뒤까지`;
}

/** 순위에서 하나 고른다 — 앞으로의 달에서 먼저, 없으면 전체에서 */
export function pickByTier(order, pool, all) {
  // pool 은 tier 가 붙은 달 목록이어야 한다 (원본 월건에는 tier 가 없다)
  for (const tier of order) {
    const hit = pool.find((m) => m.tier === tier);
    if (hit) return hit;
  }
  for (const tier of order) {
    const hit = all.find((m) => m.tier === tier);
    if (hit) return hit;
  }
  return null;
}

/** 달마다의 문장 조립 — `${연·월} · ${월건}월 · ${오행} 기운 — ${머리} ${관계} ${할 일}` */
export function composeMonthText(p, head, action) {
  return `${p.label} · ${p.ko}월 · ${p.ohaengPair} 기운 — ${head} ${p.relLine} ${action}`;
}

/** 리포트 공통 블록 — 소제목 + 기준 안내 + 요약 + 열 달 + 맺는 말 */
export function flowBlocks(flow, { heading }) {
  return [
    { t: 'sub', v: `${flow.fromLabel} ~ ${flow.toLabel} — ${heading}` },
    { t: 'p', v: flow.intro },
    { t: 'kv', v: flow.summary },
    { t: 'li', v: flow.months.map((m) => m.text) },
    { t: 'p', v: flow.closing },
  ];
}

/* ─────────────────────────── 재회운 ─────────────────────────── */

const REUNION_TIERS = {
  open: '연락이 닿는 달',
  mixed: '열렸다 닫히는 달',
  sharp: '말이 세지는 달',
  shut: '문이 닫히는 달',
  wait: '조용히 지나가는 달',
};

const REUNION_ACTION = {
  open: [
    '먼저 보낸 안부가 답으로 돌아오기 쉬운 달이에요. 길게 쓰지 말고 한 줄로 시작하세요 — 용건이 있으면 더 좋습니다.',
    '예전 대화가 떠오르는 달이에요. 그 사람 이름이 문득 나오면 그때 연락해 보세요. 이 달의 답은 대개 따뜻합니다.',
  ],
  mixed: [
    '연락은 닿는데 만나면 어긋나기 쉬운 달이에요. 문자로 안부만 주고받고, 약속은 다음 달로 미루세요.',
    '먼저 연락은 하되 기대는 접어 두세요. 이 달의 답은 늦게 오거나 짧게 옵니다.',
  ],
  sharp: [
    '다시 만나도 대화가 또 부딪히기 쉬워요. 약속을 잡더라도 짧게, 술은 빼고 만나세요.',
    '답을 재촉하면 관계가 한 칸 더 멀어집니다. 이 달에는 확인보다 기다림이 낫습니다.',
  ],
  shut: [
    '연락이 끊긴 채로 두는 편이 나은 달이에요. 이 달에 보낸 메시지는 오해로 읽히기 쉽습니다.',
    '만나면 서운한 말이 먼저 나옵니다. 이 달에는 거리를 두고 내 마음을 먼저 정리하세요.',
  ],
  wait: [
    '연락이 오갈 일이 적은 달이에요. 대신 내 생활의 리듬을 되찾기 좋습니다.',
    '재회를 서두르지 마세요. 이 달에 쌓은 일상이 다음 달 대화의 재료가 됩니다.',
  ],
};

export function reunionFlow(chart, options = {}) {
  const w = monthWindow(chart, options);
  const months = w.months.map((m, i) => {
    const softStar = ['정인', '편인', '식신'].includes(m.sipsung);
    const sharpStar = ['상관', '겁재', '편관'].includes(m.sipsung);
    // 마음이 물러지는 십성이라도 일지와 부딪히면(충·형·파·원진) '열렸다 닫히는 달'로 따로 본다
    const tier = softStar ? (m.hard ? 'mixed' : 'open')
      : sharpStar ? 'sharp'
        : m.soft ? 'open'
          : m.hard ? 'shut' : 'wait';
    return {
      ...m,
      tier,
      title: REUNION_TIERS[tier],
      text: composeMonthText(m, m.head, REUNION_ACTION[tier][i % 2]),
    };
  });
  const ahead = months.filter((m) => m.phase !== 'past');
  const best = pickByTier(['open', 'mixed', 'wait', 'sharp', 'shut'], ahead, months);
  const worst = pickByTier(['shut', 'sharp', 'mixed', 'wait', 'open'], ahead.filter((m) => m.tier !== 'open'), months);
  return {
    ...w,
    months,
    best,
    worst,
    heading: '달마다의 연락',
    intro: `결제일(${w.basis.label})을 기준으로 ${spanText(w)}의 월건(月建)을 세워 봤어요. ${w.past ? '지난 달은 그때 어떤 연락이 오갔는지 떠올려 보고, ' : ''}앞으로의 달은 그 달에 맞춰 움직이면 됩니다.`,
    summary: [
      ['연락이 닿는 달', best ? `${best.label}(${best.ko}월)` : '—'],
      ['말을 아낄 달', worst ? `${worst.label}(${worst.ko}월)` : '—'],
      ['내 일지', w.dayBranchKo],
    ],
    closing: worst
      ? `재회는 감정이 아니라 타이밍에서 갈립니다. ${best ? `${best.label}에는 먼저 안부를,` : ''} ${worst.label}에는 한 걸음 물러나세요.`
      : `재회는 감정이 아니라 타이밍에서 갈립니다. 열 달 중에 문이 열리는 달을 골라 움직이세요.`,
  };
}

/* ─────────────────────────── 직업 · 이직운 ─────────────────────────── */

const CAREER_TIERS = {
  offer: '제안·면접이 붙는 달',
  move: '자리가 움직이는 달',
  build: '실력을 쌓는 달',
  risk: '사표를 미룰 달',
  hold: '정리하며 버티는 달',
};

const CAREER_ACTION = {
  offer: [
    '관성(자리·조직)이 월간으로 들어오는 달이에요. 이력서를 넣고 면접을 잡기에 가장 좋은 때 — 서류는 이 달 첫 주에 내세요.',
    '직함·조건 이야기가 오가기 좋은 달이에요. 연봉 협상이 있다면 이 달에 꺼내고, 말로만 듣지 말고 문서로 남기세요.',
  ],
  move: [
    '자리가 부드럽게 옮겨지는 달이에요. 사내 이동·부서 변경 제안이 오면 흔쾌히 대화부터 시작하세요.',
    '사람을 통해 기회가 들어오는 달이에요. 오래 연락이 없던 전 직장·동료에게 안부를 겸해 소식을 물어보세요.',
  ],
  build: [
    '배우고 정리하는 쪽이 이득인 달이에요. 자격증·포트폴리오를 이 달에 마무리하세요.',
    '당장 옮기기보다 실력을 쌓는 달이에요. 지난 성과를 숫자로 정리해 두면 다음 달 제안이 쉬워집니다.',
  ],
  risk: [
    '회사의 방식이 유난히 답답하게 느껴지는 달이에요. 이 달의 사표는 대개 후회가 됩니다 — 조건으로 판단하세요.',
    '말이 세지고 비교가 많아지는 달이에요. 상사에게 할 말은 하루 묵혔다가, 문서로 정리해서 전하세요.',
  ],
  hold: [
    '크게 오르내리지 않는 달이라 자리를 지키는 게 이득입니다. 미뤄 둔 업무를 정리하며 다음 제안을 준비하세요.',
    '일이 조용히 흐르는 달이에요. 이력서를 고치고, 다음 달에 움직일 곳을 미리 정해 두면 좋습니다.',
  ],
};

export function careerFlow(chart, options = {}) {
  const w = monthWindow(chart, options);
  const months = w.months.map((m, i) => {
    const gwan = ['정관', '편관'].includes(m.sipsung);
    const inSeong = ['정인', '편인'].includes(m.sipsung);
    const tier = m.sipsung === '상관' || (m.hard && !gwan) ? 'risk' : gwan ? 'offer' : m.soft || m.sipsung === '편재' ? 'move' : inSeong || m.sipsung === '식신' ? 'build' : 'hold';
    return {
      ...m,
      tier,
      title: CAREER_TIERS[tier],
      text: composeMonthText(m, m.head, CAREER_ACTION[tier][i % 2]),
    };
  });
  const ahead = months.filter((m) => m.phase !== 'past');
  const best = pickByTier(['offer', 'move', 'build', 'hold', 'risk'], ahead, months);
  const worst = pickByTier(['risk', 'hold', 'build', 'move', 'offer'], ahead.filter((m) => m.tier !== 'offer'), months);
  return {
    ...w,
    months,
    best,
    worst,
    heading: '달마다의 일',
    intro: `결제일(${w.basis.label})을 기준으로 ${spanText(w)}의 월건으로 면접·제안·이동의 문을 세워 봤어요. 서류는 좋은 달의 앞 한 달에 준비해 두면 훨씬 수월합니다.`,
    summary: [
      ['제안이 붙는 달', best ? `${best.label}(${best.ko}월)` : '—'],
      ['사표를 미룰 달', worst ? `${worst.label}(${worst.ko}월)` : '—'],
      ['내 일지', w.dayBranchKo],
    ],
    closing: `이직은 감정이 아니라 조건에서 결정하세요. ${best ? `${best.label}에 움직이고,` : ''} ${worst ? `${worst.label}에는 결정을 하루 미루면 손해가 줄어듭니다.` : '좋은 달에 움직이면 손해가 줄어듭니다.'}`,
  };
}

/* ─────────────────────────── 재물운 ─────────────────────────── */

const WEALTH_TIERS = {
  inflow: '수입이 들어오는 달',
  contract: '계약·문서를 볼 달',
  leak: '새는 달 — 큰 결제 금지',
  share: '사람과 돈이 얽히는 달',
  hold: '지키는 달',
};

const WEALTH_ACTION = {
  inflow: [
    '재성이 월간으로 들어오는 달이에요. 미뤄 둔 청구·정산·부수입을 이 달에 챙기면 실제로 들어옵니다.',
    '들어오는 물이 있는 달이라 매출·급여·정산 확인에 좋습니다. 받을 돈은 이 달에 정리하세요.',
  ],
  contract: [
    '문서가 힘을 받는 달이에요. 계약서·약관을 이 달에 다시 읽고, 조건이 애매한 조항은 서면으로 확정하세요.',
    '재물의 규칙을 정하기 좋은 달입니다. 고정비·구독을 정리하고, 큰 계약은 이 달에 검토만 해 두세요.',
  ],
  leak: [
    '지출이 새기 쉬운 달이에요. 큰 결제와 보증은 다음 달로 미루세요.',
    '감정이 올라온 날의 결제가 후회로 남는 달이에요. 장바구니에 담고 하루 재우는 규칙을 지키세요.',
  ],
  share: [
    '사람 때문에 돈이 나가는 달이에요. 대여·보증·동업은 반드시 문서로 남기세요.',
    '모임·경조사로 지출이 몰리는 달이에요. 쓸 돈을 미리 정해 두면 새는 느낌이 줄어듭니다.',
  ],
  hold: [
    '크게 들어오지도 나가지도 않는 달이라 지키는 쪽이 이득입니다. 저축·자동이체를 점검하세요.',
    '조용한 달이에요. 투자보다 현금 흐름을 정리하고, 다음 달 쓸 돈을 미리 떼어 두면 좋습니다.',
  ],
};

export function wealthFlow(chart, options = {}) {
  const w = monthWindow(chart, options);
  const months = w.months.map((m, i) => {
    const jae = ['정재', '편재'].includes(m.sipsung);
    const bi = ['비견', '겁재'].includes(m.sipsung);
    const tier = jae ? 'inflow' : m.sipsung === '상관' || m.hard ? 'leak' : m.sipsung === '정관' ? 'contract' : bi ? 'share' : 'hold';
    return {
      ...m,
      tier,
      title: WEALTH_TIERS[tier],
      text: composeMonthText(m, m.head, WEALTH_ACTION[tier][i % 2]),
    };
  });
  const ahead = months.filter((m) => m.phase !== 'past');
  const best = pickByTier(['inflow', 'contract', 'hold', 'share', 'leak'], ahead, months);
  const worst = pickByTier(['leak', 'share', 'hold', 'contract', 'inflow'], ahead.filter((m) => m.tier !== 'inflow'), months);
  return {
    ...w,
    months,
    best,
    worst,
    heading: '달마다의 돈',
    intro: `결제일(${w.basis.label})을 기준으로 ${spanText(w)}의 월건으로 들어오는 돈과 새는 돈을 세어 봤어요. 큰 결제는 좋은 달로, 계약 검토는 문서의 달로 옮기면 손해가 줄어듭니다.`,
    summary: [
      ['돈이 들어오는 달', best ? `${best.label}(${best.ko}월)` : '—'],
      ['큰 결제를 피할 달', worst ? `${worst.label}(${worst.ko}월)` : '—'],
      ['내 일지', w.dayBranchKo],
    ],
    closing: `돈은 버는 힘보다 머무는 그릇이 먼저예요. ${best ? `${best.label}에 들어온 돈을,` : '들어온 돈을'} ${worst ? `${worst.label}에 지키면` : '다음 달에 지키면'} 그릇이 커집니다.`,
  };
}
