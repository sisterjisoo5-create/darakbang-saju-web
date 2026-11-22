// 최애궁합 리포트 — '최애가 끌리는 사주'에서 시작해 '나랑 연애하면?'으로 이어지는 연애 궁합
// 2026-11-23 시연 님 지시: "최애궁합 카드의 주된 내용은 나랑 최애랑 궁합보는 거지만
//   '내 최애가 뭘 좋아할까'라는 시선으로 시작해서 '나랑 연애하면 궁합은?'으로 990카드 내용 수정."
//   → 1장 최애의 이상형 코드 · 2장 최애와 찰떡인 일주 TOP 3 · 3장 그래서 나랑 연애하면? · 4장 오래 가는 법
// 모든 문장은 computeChart / biasReading / idealIlju 결과에서만 나온다. 최애 이름은 문장에 자연스럽게 녹인다.
import { ILGAN, JIJI, OHAENG_DETAIL } from './data.js';
import { OHAENG, OHAENG_META, SANGSAENG } from '../engine/constants.js';
import { todayFortune } from '../engine/today.js';
import { ILJU_60 } from './ilju-60.js';
import {
  biasReading, biasLucky, synergyMonths, ohaengCompare, fillLines, discordLines, partnerNeeds,
  sixLetterSummary, josa, roleOf, idealIlju, myFit,
} from '../engine/bias.js';

function tempWord(t) {
  if (t <= 13) return '얼음장처럼 차가운';
  if (t <= 19) return '서늘한';
  if (t <= 25.5) return '온화한';
  if (t <= 31) return '따뜻한';
  return '뜨거운';
}

/** 마음이 먼저 열리는 자리 — 내게 비어 있는 기운 / 최애의 필요한 기운으로 고른다 */
const PLACE = {
  목: '공원, 산책로, 책이 많은 서점',
  화: '공연장, 카페 창가, 무대가 보이는 앞줄',
  토: '익숙한 동네의 단골집, 산과 흙이 있는 곳',
  금: '정돈된 전시장, 조용한 레스토랑, 유리창 너머',
  수: '물가와 강변, 밤의 산책길, 비 오는 날의 창가',
};

/** 최애 일간의 무대 안·밖 — 사람들 앞에서 어떤 사람으로 보이는지 (최애를 3인칭으로 쓴 문장) */
const DAY_SCENE = {
  갑: '무대에 서면 제일 먼저 앞으로 나가는 쪽이에요. 끝까지 책임지는 태도가 사람들 눈에는 "믿음"으로 보입니다.',
  을: '누구에게나 먼저 말을 맞추는 쪽이에요. 무리에서는 없으면 안 되는 사람인데, 정작 자기 속은 잘 꺼내지 않습니다.',
  병: '어두운 자리도 밝히는 사람이에요. 들어오는 순간 공기의 온도가 올라가서, 사람들이 먼저 그쪽을 봅니다.',
  정: '한 사람에게 깊게 빛나는 쪽이에요. 조용한데 오래 남는 온도라, 한 번 마음을 주면 쉽게 돌아서지 않습니다.',
  무: '흔들리지 않는 중심이에요. 옆에서 보면 답답할 만큼 단단한데, 그 단단함에 사람들이 기댑니다.',
  기: '챙기고 정리하는 사람이에요. 무대 밖에서도 사람들과 일정을 조용히 맞춰 놓는 쪽입니다.',
  경: '결단이 빠른 사람이에요. 급한 순간에 제일 먼저 몸이 움직이고, 기준이 칼처럼 서 있습니다.',
  신: '취향이 분명한 사람이에요. 말보다 선택으로 자기 색을 보여 주는 쪽입니다.',
  임: '큰 그림을 보는 사람이에요. 이야기를 나누면 시야가 넓어져서, 사람들이 조언을 구하러 옵니다.',
  계: '섬세한 감각의 사람이에요. 말하지 않아도 분위기를 읽어서, 늘 먼저 알아채는 쪽입니다.',
};

/** 최애가 끌리는 사람의 결 — 오행별 성격·말투·분위기 (최애에게 필요한 기운으로 고른다) */
const PULL = {
  목: {
    temper: '곧게 자라는 사람 — 자기 기준이 있고, 남이 뭐라 해도 자기 속도로 갑니다.',
    who: '자기 자리에서 조용히 자라나는 사람',
    talk: '"좋았어"를 아끼지 않으면서, 다음에 뭘 해 볼지 같이 그려 주는 말투',
    mood: '아침 햇빛이 드는 서점, 아직 꽃이 피지 않은 화분 같은 공기',
  },
  화: {
    temper: '온도가 먼저 올라가는 사람 — 좋으면 바로 티가 나고, 싫으면 표정에 다 써 있습니다.',
    who: '먼저 웃고 먼저 말을 거는 사람',
    talk: '좋은 걸 보면 소리부터 내는, 감정이 한 박자 늦지 않는 말투',
    mood: '무대 조명이 켜지기 직전의 공연장, 사람이 많은 카페의 창가',
  },
  토: {
    temper: '중심이 무거운 사람 — 급한 일에도 목소리가 변하지 않습니다.',
    who: '말보다 약속으로 안심시키는 사람',
    talk: '한 번 한 말은 지키고, 결정을 미루지 않는 말투',
    mood: '익숙한 동네 단골집, 비 온 뒤 흙 냄새가 나는 산책로',
  },
  금: {
    temper: '정리가 빠른 사람 — 애매한 것을 오래 두지 못합니다.',
    who: '선을 지키고 끝을 정확히 맺는 사람',
    talk: '과장 없이 필요한 말만, 대신 한 번 한 말은 끝까지 하는 말투',
    mood: '정돈된 전시장, 유리창 너머로 보이는 조용한 저녁',
  },
  수: {
    temper: '생각이 깊은 사람 — 말하기 전에 한 번 더 안에서 굴리고 꺼냅니다.',
    who: '서두르지 않고 오래 들어 주는 사람',
    talk: '질문이 많고, 대답을 재촉하지 않는 말투',
    mood: '비 오는 날의 창가, 밤의 강변, 조용한 플레이리스트',
  },
};

/** '신(辛)' 처럼 괄호로 끝나는 표기에 조사를 붙일 때 — 받침은 한글 글자로 판단한다 */
const tailOf = (core, withB, withoutB) => josa(core, withB, withoutB).slice(core.length);

/** 인연의 별 — 남자에게는 재성, 여자에게는 관성 (전통 명리 기준) */
function partnerStarNames(chart) {
  return chart.input.gender === 'male' ? ['정재', '편재'] : ['정관', '편관'];
}

/** 서로 채워 주는 기운이 없을 때 — 무엇이 비어 있고 내가 무엇으로 서는지 정확히 쓴다 */
function fillFallback(me, bias, need) {
  const mine = me.ohaeng.count[need.primary] || 0;
  const second = me.ohaeng.count[need.secondary] || 0;
  if (mine === 0 && second >= 1) {
    const primaryLabel = `${need.primary}(${OHAENG_META[need.primary].han})`;
    const secondLabel = `${need.secondary}(${OHAENG_META[need.secondary].han})`;
    return `최애의 가장 목마른 ${primaryLabel}${tailOf(need.primary, '은', '는')} 내게 없어요. 대신 ${secondLabel}${tailOf(need.secondary, '을', '를')} ${second}개 가진 사람이라, 최애가 그쪽으로 지칠 때 내가 먼저 알아챕니다.`;
  }
  if (mine === 0 && second === 0) {
    const myStrong = me.ohaeng.strongest;
    const theirStrong = bias.ohaeng.strongest;
    const balances = SANGGEUK[myStrong] === theirStrong || SANGGEUK[theirStrong] === myStrong;
    return balances
      ? `최애가 필요한 ${need.primary}·${need.secondary}를 내가 많이 갖고 있진 않아요. 대신 내 ${myStrong} 기운이 최애의 ${theirStrong} 기운을 눌러 균형을 잡아 줍니다.`
      : `최애가 필요한 ${need.primary}·${need.secondary}를 내가 많이 갖고 있진 않아요. 그래서 이 궁합은 채워 주는 관계보다, 서로의 빈칸을 같이 배우는 관계에 가깝습니다.`;
  }
  return `최애에게 필요한 ${need.primary}(${OHAENG_META[need.primary].han})${tailOf(need.primary, '을', '를')} 나는 ${mine}개 갖고 있어요. 많지는 않지만, 그 하나가 이 궁합에서는 가장 자주 쓰이는 온도입니다.`;
}

/** 십성 묶음의 표준 이름 — 화면에는 이 말로 쓴다(품음 같은 새 말을 만들지 않는다) */
const GROUP_TERM = { 동료: '비겁', 표현: '식상', 벌이: '재성', 책임: '관성', 품음: '인성' };

/** 오행 목록을 '목·수' 처럼 잇는다 */
const joinOhaeng = (list) => list.join('·');

/**
 * 무료 맛보기 — 점수 + "최애가 끌리는 결"과 "내 자리" 요약
 * (990원 리포트가 '최애의 이상형 → 나와의 궁합' 순서로 열린다는 것을 맛보기에서 먼저 보여 준다)
 */
export function biasPreview(me, bias, name) {
  const r = biasReading(me, bias);
  const ideal = idealIlju(bias, me);
  const need = ideal.need;
  const top1 = ideal.top[0];
  const mine = ideal.mine;
  return {
    score: r.score,
    band: r.band,
    oneLineLabel: `${josa(name, '과', '와')} 연인이 된다면?`,
    oneLine: `${r.band.title} — ${r.band.short}.`,
    rows: [
      ['최애가 끌리는 결', `${need.primary}(${OHAENG_META[need.primary].han}) — ${OHAENG_META[need.primary].keyword}`],
      ['찰떡인 일주', top1 ? `1위 ${top1.ilju} · 나머지 둘은 리포트에서` : '리포트에서'],
      ['내 자리', mine && mine.rank
        ? `내 일주 ${josa(mine.ilju, '은', '는')} 60일주 중 ${mine.rank}위${mine.inTop ? ' — TOP 3 안!' : ''}`
        : `내 일주가 최애와 같아요 — 같은 결끼리`],
      ['오행 케미', `나 ${me.ohaeng.temp}°C ↔ 최애 ${bias.ohaeng.temp}°C (${r.temp.gap}도 차)`],
    ],
    chips: [
      `${me.dii}띠 × ${bias.dii}띠`,
      `일간 ${r.stem.kind}`,
      `설렘 ${r.spark}점`,
    ],
  };
}

/** 1) 최애가 끌리는 사주 · 이상형 코드 — 최애의 기운을 먼저 읽는다 */
function idealCode(me, bias, name, ideal, { freeBlocks = 2 } = {}) {
  const six = sixLetterSummary(bias);
  const bIl = ILGAN[bias.dayMaster.ko];
  const bJj = JIJI[bias.pillars.day.branchKo];
  const need = ideal.need;
  const role = roleOf(bias);
  const strongCount = bias.ohaeng.count[bias.ohaeng.strongest] || 0;
  const missingText = need.missing.length
    ? `${joinOhaeng(need.missing)} 비어 있음`
    : '다섯 기운 다 있음';
  const balanceLine = [
    `${bias.ohaeng.strongest}(${OHAENG_META[bias.ohaeng.strongest].han}) 기운이 ${strongCount}개로 가장 두껍습니다. ${OHAENG_META[bias.ohaeng.strongest].keyword} 쪽으로 이미 충분한 사람이에요.`,
    need.missing.length
      ? `반대로 ${josa(joinOhaeng(need.missing), '은', '는')} 한 글자도 없습니다. 그래서 ${josa(name, '은', '는')} ${need.primary} 기운을 타고난 사람 앞에서 유난히 눈이 갑니다.`
      : `가장 얇은 기운은 ${need.primary}(${OHAENG_META[need.primary].han}) 하나입니다. 다섯 기운이 다 있지만, 그 한 칸이 비어 보이는 사람에게 마음이 먼저 갑니다.`,
  ].join(' ');
  const pull = PULL[need.primary];
  const members = role.members.join('·');
  return {
    id: 'bi-ideal',
    heading: `최애가 끌리는 사주 · ${name}의 이상형 코드`,
    kicker: 'IDEAL CODE',
    locked: true,
    freeBlocks,
    blocks: [
      { t: 'kv', v: [
        ['최애', `${name} · ${bias.pillars.day.ko}일주 · ${bias.dii}띠`],
        ['일간', `${bias.dayMaster.ko}(${bias.dayMaster.han}) — ${bIl.keyword}`],
        ['사주 온도', `${bias.ohaeng.temp}°C · ${bias.ohaeng.label}`],
        ['기운의 균형', `${bias.ohaeng.strongest} ${strongCount}개 · ${missingText}`],
      ] },
      { t: 'p', v: `${name}의 ${six.hourKnown ? '여덟' : '여섯'} 글자는 ${six.pillars}. 중심에는 ${bias.dayMaster.ko}(${bias.dayMaster.han}) 일간이 서 있어요. ${DAY_SCENE[bias.dayMaster.ko] || bIl.keyword}` },
      { t: 'p', v: `이 여섯 글자에서 ${GROUP_TERM[role.group]}(${members}) 쪽 기운이 가장 많아요. ${role.line}` },
      { t: 'p', v: balanceLine },
      { t: 'sub', v: `그래서 ${josa(name, '이', '가')} 무장해제되는 사람` },
      { t: 'li', v: [
        `기운 — ${need.primary}(${OHAENG_META[need.primary].han}) ${OHAENG_META[need.primary].keyword}. ${pull.temper}`,
        `성격 — ${pull.who}`,
        `말투 — ${pull.talk}`,
        `분위기 — ${pull.mood}`,
      ] },
      { t: 'p', v: `일지 ${bias.pillars.day.branchKo}(${bias.pillars.day.branchHan})의 결은 '${bJj.tone}'이에요. ${bJj.line} 그래서 ${josa(name, '은', '는')} 힘을 뺀 자리에서 더 매력적입니다.` },
      { t: 'p', v: `그러니 ${josa(name, '이', '가')} 끌리는 사람은 ${josa(name, '을', '를')} 완벽하게 채워 주는 사람이 아니라, ${need.primary}의 결로 ${josa(name, '을', '를')} 편하게 만드는 사람입니다. 얼굴보다 온도, 스펙보다 말투예요.` },
      { t: 'q', v: `${name}의 이상형은 목록이 아니라 온도예요. 그 온도를 타고난 일주가 다음 장에 있습니다.` },
    ],
  };
}

/** TOP 3 일주 한 줄 이유 — 계산에 실제로 쓰인 근거만, 읽히는 문장으로 옮긴다 */
function iljuReason(row, bias, need, name, rank = 1) {
  const their = bias.pillars.day;
  const theirBranch = `${their.branchKo}(${their.branchHan})`;
  const stemLabel = `${row.stemKo}(${row.han[0]})`;
  const branchLabel = `${row.branchKo}(${row.han[1]})`;
  const label = (m) => (m === 'primary'
    ? `${need.primary}(${OHAENG_META[need.primary].han})`
    : `${need.secondary}(${OHAENG_META[need.secondary].han})`);
  const needWord = need.primaryFrom === 'missing' ? '비어 있는' : '가장 얇은';
  const stemMatch = row.match.stem;
  const branchMatch = row.match.branch;

  // ① 최애에게 필요한 기운을 내주는 자리 — 일간과 일지가 함께 채우면 그걸 먼저 말한다
  // 두 기운을 다 채우는 경우, 2위 문장은 어순을 바꿔 세 줄이 같은 틀로 읽히지 않게 한다
  const needSentence = stemMatch && branchMatch
    ? (rank === 2
      ? `일지 ${branchLabel}의 ${label(branchMatch)}, 일간 ${stemLabel}의 ${label(stemMatch)} — 필요한 두 기운을 한 사람이 다 갖고 태어났어요`
      : `일간 ${stemLabel}의 ${label(stemMatch)}, 일지 ${branchLabel}의 ${label(branchMatch)} — 최애에게 필요한 두 기운을 한 사람이 다 갖고 태어났어요`)
    : stemMatch
      ? `일간 ${stemLabel}${tailOf(row.stemKo, '은', '는')} 최애에게 ${needWord} ${label(stemMatch)} 기운을 지고 태어났어요`
      : branchMatch
        ? `일지 ${branchLabel}${tailOf(row.branchKo, '이', '가')} 최애에게 ${needWord} ${label(branchMatch)} 기운을 지고 태어났어요`
        : '';

  // ② 일지 관계 — 생활에서 부딪히는지 붙는지
  const branchSentence = row.match.branchRel === '육합'
    ? `일지 ${branchLabel}${tailOf(row.branchKo, '이', '가')} 최애의 일지 ${theirBranch}${tailOf(their.branchKo, '과', '와')} 육합 — 생활 리듬이 저절로 맞아요`
    : row.match.branchRel === '삼합'
      ? `일지 ${branchLabel}${tailOf(row.branchKo, '이', '가')} 최애의 일지 ${theirBranch}${tailOf(their.branchKo, '과', '와')} 삼합 — 같은 방향을 보는 사이입니다`
      : row.match.branchRel === '충'
        ? '일지는 충이라 생활 습관에서 부딪히지만, 그 부딪힘이 설렘으로 남는 자리예요'
        : (row.match.branchRel === '원진' || row.match.branchRel === '형' || row.match.branchRel === '파')
          ? `일지가 ${row.match.branchRel} — 서운함이 쌓이기 쉬운데, 그만큼 서로를 쉽게 놓지 못해요`
          : '';

  // ③ 일간 관계 — 말이 통하는지, 끌리는지
  const stemSentence = row.match.stemKind === '합'
    ? `일간 ${their.stemKo}와 천간합이라 말이 통하고, 처음 만나도 어색하지 않은 자리예요`
    : row.match.stemKind === '상생'
      ? (SANGSAENG[row.stemOhaeng] === bias.dayMaster.ohaeng
        ? '일간이 최애를 낳아 주는 자리 — 최애가 지칠 때 힘이 되어 주는 쪽이에요'
        : '최애가 그 사람을 낳아 주는 자리 — 곁에 있으면 편하게 기대는 쪽이에요')
      : row.match.stemKind === '충'
        ? '일간은 정면으로 부딪히는 충 — 처음엔 세게 끌리지만, 그만큼 오래 기억되는 자리예요'
        : row.match.stemKind === '극'
          ? '일간이 서로를 누르는 자리 — 끌리는데 숨이 조금 막히는 사이입니다'
          : '';

  // ④ 온도 — 최애의 뜨겁고 서늘한 정도를 맞춰 주는지
  const tempSentence = row.match.temp === 'cool'
    ? '뜨거운 최애의 사주 옆에서 온도를 한 칸 낮춰 주는 사람이에요'
    : row.match.temp === 'warm'
      ? '서늘한 최애의 사주 옆에서 온도를 한 칸 올려 주는 사람이에요'
      : '';

  // 일지 하나가 필요 기운과 관계를 동시에 만들면, 두 문장으로 쪼개지 않고 한 문장에 붙인다
  const branchOnly = !stemMatch && branchMatch && branchSentence && row.match.branchRel;
  const combined = branchOnly
    ? `일지 ${branchLabel}${tailOf(row.branchKo, '이', '가')} 최애의 일지 ${theirBranch}${tailOf(their.branchKo, '과', '와')} ${row.match.branchRel}이면서, 최애에게 ${needWord} ${label(branchMatch)} 기운을 함께 내줘요`
    : '';
  const first = combined || needSentence || branchSentence || stemSentence || tempSentence;
  const second = (combined ? [stemSentence, tempSentence] : [branchSentence, stemSentence, tempSentence])
    .find((x) => x && x !== first) || '';

  const tails = [
    ` ${josa(name, '이', '가')} 먼저 말을 걸어도 이상하지 않은 자리입니다.`,
    ` ${josa(name, '이', '가')} 두 번째 만남에서 이 사람을 기억할 가능성이 큽니다.`,
    ' 처음엔 조용하지만, 같이 있을수록 편해지는 자리예요.',
  ];
  const head = [first, second].filter(Boolean).join('. ')
    || `일간과 일지가 서로 비켜 있어 부딪힘이 적은 자리예요. ${josa(name, '의', '의')} 결을 방해하지 않는 사람입니다`;
  return `${head}.${tails[(rank - 1) % tails.length]}`;
}

/** 2) 최애와 찰떡인 일주 TOP 3 — 필요 오행·합·조후로 고른 세 일주 */
function topIlju(me, bias, name, ideal, { freeBlocks = 3 } = {}) {
  const need = ideal.need;
  const mine = ideal.mine;
  const rankWord = ['1위', '2위', '3위'];
  const blocks = [
    { t: 'p', v: `최애의 여섯 글자에 필요한 ${need.primary}·${need.secondary} 기운과 사주 온도 ${bias.ohaeng.temp}°C, 일간·일지의 합을 60일주에 하나씩 대입해 봤어요. ${josa(name, '이', '가')} 유난히 무장해제되는 일주 셋입니다.` },
  ];
  ideal.top.forEach((row, i) => {
    const nick = ILJU_60[row.ilju] ? ILJU_60[row.ilju].nick : '';
    blocks.push({ t: 'sub', v: `[${rankWord[i] || `${i + 1}위`}] ${row.ilju}(${row.han})${nick ? ` — ${nick}` : ''}` });
    blocks.push({ t: 'p', v: iljuReason(row, bias, need, name, i + 1) });
  });
  if (mine) {
    if (mine.sameAsBias) {
      blocks.push({ t: 'p', v: `내 일주가 최애와 같은 ${mine.ilju}일주예요. 같은 결끼리는 끌림보다 편안함이 먼저 와서 이 목록에서는 뺐습니다. 대신 다음 장에서 내 여섯 글자 전체로 다시 볼게요.` });
    } else if (mine.inTop) {
      const rank = ideal.top.findIndex((row) => row.ilju === mine.ilju) + 1;
      blocks.push({ t: 'p', v: `어! 내 일주 ${josa(mine.ilju, '이', '가')} ${rankWord[rank - 1]}에 있어요. 최애가 끌리는 자리에 내 기본 결이 딱 들어갔습니다. 이건 시작부터 한 칸 앞서 있는 셈이에요.` });
    } else {
      blocks.push({ t: 'p', v: `내 일주 ${josa(mine.ilju, '은', '는')} 이 기준으로 60일주 중 ${mine.rank}위예요. 일주 하나로는 앞자리가 아니지만, 궁합은 여섯 글자로 읽습니다. 다음 장에서 내 사주 전체로 다시 볼게요.` });
    }
  }
  blocks.push({ t: 'q', v: `일주는 사람의 기본 결이고, 궁합은 그 위에 얹히는 여섯 글자의 대화예요.` });
  return {
    id: 'bi-top3',
    heading: `${josa(name, '과', '와')} 찰떡인 일주 TOP 3`,
    kicker: 'TOP 3',
    locked: true,
    freeBlocks,
    blocks,
  };
}

/** 3) 그래서 나랑 연애하면 어떨까? — 최애가 끌리는 조건을 내 사주가 어떻게 채우는지 */
function usChemi(me, bias, name, r, ideal, { freeBlocks = 2 } = {}) {
  const mIl = ILGAN[me.dayMaster.ko];
  const need = ideal.need;
  const fit = myFit(me, bias, need);
  const placeMine = PLACE[me.ohaeng.missing[0] || me.ohaeng.strongest];
  const placeTheirs = PLACE[need.primary];
  const fitLine = fit.primary >= 1
    ? `내 여섯 글자에는 ${josa(need.primary, '이', '가')} ${fit.primary}개 있어요. 최애에게 ${need.primaryFrom === 'missing' ? '비어 있는 쪽' : '가장 얇은 쪽'}을 내가 이미 갖고 태어난 셈입니다.`
    : fit.secondary >= 1
      ? `최애의 첫 번째 자리인 ${josa(need.primary, '은', '는')} 내게 없고, 대신 두 번째 자리인 ${josa(need.secondary, '을', '를')} ${fit.secondary}개 갖고 있어요. 그 한 칸이 이 궁합의 접점입니다.`
      : `내 사주에 ${josa(need.primary, '은', '는')} ${fit.primary}개로 많지 않아요. ${fit.balance
        ? `대신 내 ${me.ohaeng.strongest} 기운이 최애의 넘치는 ${josa(bias.ohaeng.strongest, '을', '를')} 눌러 균형을 잡아 줍니다.`
        : '그래서 이 궁합은 채워 주는 관계보다, 같이 배우는 관계에 가깝습니다.'}`;
  const fills = fillLines(me, bias, r.fill);
  return {
    id: 'bi-us',
    heading: '그래서 나랑 연애하면 어떨까?',
    kicker: 'YOU & ME',
    locked: true,
    freeBlocks,
    blocks: [
      { t: 'score', value: r.score, label: r.band.title, note: r.band.line },
      { t: 'p', v: `최애가 끌리는 결로 다시 놓고 봤어요 — ${need.primary}(${OHAENG_META[need.primary].han}) ${OHAENG_META[need.primary].keyword}. ${fitLine}` },
      { t: 'kv', v: [
        ['일지 케미', `${me.pillars.day.ko} × ${bias.pillars.day.ko} · ${r.ilju.title}`],
        ['일간 케미', r.stem.label],
        ['사주 온도', `${me.ohaeng.temp}°C ↔ ${bias.ohaeng.temp}°C (${r.temp.gap}도 차)`],
        ['설렘 지수', `${r.spark}점`],
      ] },
      { t: 'sub', v: '설렘 포인트 셋' },
      { t: 'li', v: [
        `${r.ilju.title} — ${r.ilju.line}`,
        `내 매력이 닿는 곳 — ${mIl.charm}`,
        placeMine === placeTheirs
          ? `만나는 자리 — 두 사람 다 ${placeMine} 같은 자리에서 마음이 풀려요. 첫 만남도 그런 곳이면 대화가 오래 갑니다.`
          : `만나는 자리 — 내 사주는 ${placeMine} 같은 자리에서 마음이 먼저 열리고, 최애는 ${placeTheirs} 같은 자리에서 긴장을 풉니다. 두 장소가 겹치는 하루가 이 궁합의 첫 장면이에요.`,
      ] },
      { t: 'p', v: r.temp.gap >= 7
        ? `온도 차가 ${r.temp.gap}도예요. ${tempWord(me.ohaeng.temp)} 나와 ${tempWord(bias.ohaeng.temp)} ${josa(name, '은', '는')} 같은 장면을 다른 속도로 느낍니다. 그 차이를 말하지 않으면 한 사람은 "설렜다"고 기억하고, 다른 사람은 "좀 어색했다"고 기억할 수 있어요.`
        : `온도 차가 ${r.temp.gap}도로 크지 않아, ${josa(name, '과', '와')} 있으면 공기가 낯설지 않을 거예요. 대신 그 편안함이 "그냥 좋은 사람"에서 멈추지 않도록, 두 번째 만남은 내가 먼저 만들어야 합니다.` },
      { t: 'sub', v: '내가 최애의 빈틈을 채우는 방식' },
      { t: 'li', v: fills.length ? fills : [fillFallback(me, bias, need)] },
      { t: 'q', v: `${name}의 이상형은 목록이 아니라 온도예요. 나는 그 온도에 몇 도쯤 닿아 있는 사람인지가 이 궁합의 답입니다.` },
    ],
  };
}

/** 4) 오래 가는 두 사람 — 오행 케미·엇박자·빛나는 달 */
function longRun(me, bias, name, r, { freeBlocks = 2 } = {}) {
  const need = partnerNeeds(bias);
  const syn = synergyMonths(me, bias);
  const { best, caution, peak } = syn;
  const pick = [...best, ...caution.slice(0, 2)].sort((a, b) => b.score - a.score);
  const fills = fillLines(me, bias, r.fill);
  const discords = discordLines(me, bias, r);
  // 온도가 비슷한 경우는 discordLines 가 이미 짚으므로, 간격이 벌어졌을 때만 속도를 더한다
  const miss = r.temp.gap >= 7
    ? '속도가 아쉬워요. 마음이 식는 타이밍이 서로 달라서, 내가 식은 뒤에 상대가 데워지는 일이 생겨요.'
    : null;
  return {
    id: 'bi-long',
    heading: '오래 가려면 — 엇박자와 빛나는 달',
    kicker: 'LONG RUN',
    locked: true,
    freeBlocks,
    blocks: [
      { t: 'bar', v: OHAENG.map((o) => ({
        label: `${o}(${OHAENG_META[o].han})`,
        value: me.ohaeng.count[o] || 0,
        max: 6,
        note: `나 ${me.ohaeng.count[o] || 0} · 최애 ${bias.ohaeng.count[o] || 0}`,
      })) },
      { t: 'p', v: `내 사주는 ${tempWord(me.ohaeng.temp)} ${me.ohaeng.temp}°C, ${name}의 사주는 ${tempWord(bias.ohaeng.temp)} ${bias.ohaeng.temp}°C. 두 사주를 겹쳐 놓으면 상대에게 없는 기운이 내 쪽에, 내게 없는 기운이 상대 쪽에 놓이는 자리가 보여요.` },
      { t: 'li', v: fills.length ? fills : [fillFallback(me, bias, need)] },
      { t: 'table', head: ['오행', '나 · 최애', '읽기'], rows: ohaengCompare(me, bias).map((x) => [`${x.ohaeng}(${OHAENG_META[x.ohaeng].han})`, `나 ${x.mine} · 최애 ${x.theirs}`, x.note]) },
      { t: 'sub', v: '조심할 엇박자' },
      { t: 'li', v: miss ? [miss, ...discords] : discords },
      { t: 'sub', v: '다락방 처방' },
      { t: 'li', v: [
        `내게 없는 ${me.ohaeng.missing[0] ? josa(me.ohaeng.missing[0], '을', '를') : '기운을'} ${josa(name, '과', '와')} 함께하는 시간에 넣어 보세요. ${josa(me.ohaeng.missing[0] ? OHAENG_DETAIL[me.ohaeng.missing[0]].need : '지금의 균형을 유지하는 것', '이', '가')} 이 궁합의 접착제가 됩니다.`,
        r.fill.toThem.length ? `반대로 ${name}에게 없는 ${josa(r.fill.toThem.join('·'), '은', '는')} 내가 이미 가진 기운이에요. 그 기운을 "자랑"하지 않고 "곁에 있는 것"으로 보여 주세요.` : '서로 빈자리가 크지 않아, 채워 주려 애쓰기보다 같이 하는 일을 하나 만드는 편이 오래갑니다.',
        r.temp.gap >= 7 ? `온도 차 ${r.temp.gap}도를 없애려 하지 마세요. 대신 "오늘은 내가 먼저 데울게"라고 말해 두는 규칙 하나면 충분합니다.` : '온도가 비슷한 만큼, 둘 다 지칠 때를 알려 줄 신호를 정해 두세요. 말하지 않으면 아무도 모릅니다.',
      ] },
      { t: 'sub', v: '두 사람이 빛나는 달 (2026~2027)' },
      { t: 'kv', v: [
        ['가장 빛나는 달', `${peak.label} · ${peak.score}점`],
        ['그다음 달', `${best[1].label} · ${best[1].score}점`],
        ['세 번째 달', `${best[2].label} · ${best[2].score}점`],
        ['숨 고를 달', `${caution[0].label} · ${caution[0].score}점`],
      ] },
      { t: 'table', head: ['달', '월건', '읽기'], rows: pick.map((m) => [`${m.label} · ${m.score}점`, `${m.ganji} · ${m.mySipsung}/${m.theirSipsung}`, `${m.line}${m.note ? ` (${m.note})` : ''}`]) },
      { t: 'p', v: `가장 빛나는 달은 ${peak.label}이에요. ${peak.line}. 이 달에는 ${name}의 소식이든, 내 쪽의 좋은 일이든 "먼저 반응하는 쪽"이 되어 보세요. 이 궁합은 반응이 오갈 때 온도가 올라갑니다.` },
      { t: 'q', v: '시너지는 큰 사건이 아니라, 같은 달에 같은 방향을 본 기억으로 남습니다.' },
    ],
  };
}

/** 오늘의 다락방 처방 — 최애 궁합 행운 색·숫자·팁
 *  2026-11-22 시연 님 지시로 유료 리포트 다섯 장에서 뺐다. (무료 원국·앱에서 따로 쓰실 예정)
 *  계산·문구는 지우지 않고 여기에 보관한다. */
function todayForTwo(me, bias, name, now = new Date()) {
  const f = todayFortune(me, now);
  const lucky = biasLucky(me, bias, now);
  return {
    id: 'bi-today',
    heading: '오늘의 다락방 처방 — 최애 궁합 행운 색·숫자·팁',
    kicker: 'TODAY',
    locked: true,
    freeBlocks: 1,
    blocks: [
      { t: 'kv', v: [
        ['오늘의 일진', `${f.ganji}(${f.ganjiHan}) · ${f.dateLabel}`],
        ['행운의 색', `${lucky.color} — ${lucky.colorWhy}`],
        ['행운의 숫자', `${lucky.number}`],
        ['좋은 시간', lucky.time],
      ] },
      { t: 'p', v: lucky.tip },
      { t: 'li', v: [
        `색 — 오늘은 ${josa(lucky.color, '이', '가')} 들어간 물건을 하나 곁에 두세요. ${lucky.ohaeng}의 기운을 눈으로 먼저 채우는 방식이에요.`,
        `숫자 — 오늘의 행운 숫자는 ${lucky.number}. 사진을 고르거나, ${lucky.number}번째로 마음에 남는 장면을 하나 기록해 보세요.`,
        `시간 — ${lucky.time}에는 ${name}의 이름을 한 번 불러 보세요. 소리로 꺼낸 이름이 오늘의 기운을 데웁니다.`,
      ] },
      { t: 'p', v: `오늘 나의 흐름은 ${f.score}점이에요. ${f.notes[0] || ''}` },
      { t: 'q', v: '좋아하는 마음은 숨겨도 기운으로 남아요. 오늘은 그 기운을 한 번만 밖으로 꺼내 보세요.' },
    ],
  };
}

/**
 * 최애궁합 섹션 4장 — ① 최애의 이상형 코드 ② 찰떡 일주 TOP 3 ③ 나랑 연애하면? ④ 오래 가는 법
 * @param {object} me 내 명식
 * @param {object} bias 최애 명식 (시주 없어도 됨)
 * @param {string} biasName 최애 이름
 * @param {object} reading biasReading 결과 (없으면 다시 계산)
 */
export function biasSections(me, bias, biasName, now = new Date(), { freeBlocks = 2 } = {}) {
  const r = biasReading(me, bias);
  const ideal = idealIlju(bias, me);
  return [
    idealCode(me, bias, biasName, ideal, { freeBlocks }),
    topIlju(me, bias, biasName, ideal, { freeBlocks: Math.max(3, freeBlocks + 1) }),
    usChemi(me, bias, biasName, r, ideal, { freeBlocks: Math.max(1, freeBlocks) }),
    longRun(me, bias, biasName, r, { freeBlocks: Math.max(1, freeBlocks) }),
  ];
}
