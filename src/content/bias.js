// 최애궁합 리포트 — 최애(아이돌·배우)의 6글자와 내 사주를 겹쳐 읽는 연인 궁합
// 모든 문장은 computeChart / biasReading 결과에서만 나온다. 최애 이름은 문장에 자연스럽게 녹인다.
import { ILGAN, JIJI, TTI, OHAENG_DETAIL } from './data.js';
import { OHAENG, OHAENG_META } from '../engine/constants.js';
import { todayFortune } from '../engine/today.js';
import {
  biasReading, biasLucky, synergyMonths, ohaengCompare, fillLines, discordLines,
  sipsungTally, sixLetterSummary, josa,
} from '../engine/bias.js';

function tempWord(t) {
  if (t <= 13) return '얼음장처럼 차가운';
  if (t <= 19) return '서늘한';
  if (t <= 25.5) return '온화한';
  if (t <= 31) return '따뜻한';
  return '뜨거운';
}

/** 마음이 먼저 열리는 자리 — 내게 비어 있는 기운 / 최애의 강한 기운으로 고른다 */
const PLACE = {
  목: '나무와 초록이 있는 곳 — 공원, 산책로, 책이 많은 서점',
  화: '사람이 모이는 자리 — 공연장, 카페 창가, 무대가 보이는 앞줄',
  토: '익숙한 동네의 단골집, 산과 흙이 있는 곳',
  금: '정돈된 전시장, 조용한 레스토랑, 유리창 너머',
  수: '물가와 강변, 밤의 산책길, 비 오는 날의 창가',
};

/** 인연의 별 — 남자에게는 재성, 여자에게는 관성 (전통 명리 기준) */
function partnerStarNames(chart) {
  return chart.input.gender === 'male' ? ['정재', '편재'] : ['정관', '편관'];
}

/**
 * 무료 맛보기 — 최애 이름 & 내 사주 기반 궁합 점수 + "연인이 된다면?" 케미 한 줄 + 일주·오행 요약
 */
export function biasPreview(me, bias, name) {
  const r = biasReading(me, bias);
  const fillText = r.fill.toMe.length
    ? `최애의 ${r.fill.toMe.join('·')}이 내 빈자리를 채워요`
    : r.fill.toThem.length
      ? `내 ${r.fill.toThem.join('·')}이 최애의 빈자리를 채워요`
      : '두 사주에 큰 빈자리가 없어 서로를 있는 그대로 받아들이는 조합이에요';
  return {
    score: r.score,
    band: r.band,
    oneLineLabel: `${josa(name, '과', '와')} 연인이 된다면?`,
    oneLine: `${r.band.title} — ${r.band.short}.`,
    rows: [
      ['일주 케미', `${me.pillars.day.ko} × ${bias.pillars.day.ko} · ${r.ilju.title}`],
      ['오행 케미', `나 ${me.ohaeng.temp}°C ↔ 최애 ${bias.ohaeng.temp}°C (${r.temp.gap}도 차)`],
      ['채워 주는 기운', fillText],
    ],
    chips: [
      `${me.dii}띠 × ${bias.dii}띠`,
      `일간 ${r.stem.kind}`,
      `설렘 ${r.spark}점`,
    ],
  };
}

/** 1) 우리의 첫인상 & 설렘 포인트 */
function firstImpression(me, bias, name, r, { freeBlocks = 2 } = {}) {
  const bIl = ILGAN[bias.dayMaster.ko];
  const mIl = ILGAN[me.dayMaster.ko];
  const bp = bias.pillars;
  const placeMine = PLACE[me.ohaeng.missing[0] || me.ohaeng.strongest];
  const placeTheirs = PLACE[bias.ohaeng.missing[0] || bias.ohaeng.strongest];
  const six = sixLetterSummary(bias);
  return {
    id: 'bi-first',
    heading: '아이돌·배우와 연인이 된다면? 우리의 첫인상 & 설렘 포인트',
    kicker: 'FIRST SIGHT',
    locked: true,
    freeBlocks,
    blocks: [
      { t: 'kv', v: [
        ['최애', `${name} · ${bp.day.ko}일주 · ${bias.dii}띠`],
        ['나', `${me.pillars.day.ko}일주 · ${me.dii}띠`],
        ['일지 케미', `${me.pillars.day.ko} × ${bp.day.ko} · ${r.ilju.title}`],
        ['사주 온도', `${me.ohaeng.temp}°C ↔ ${bias.ohaeng.temp}°C (${r.temp.gap}도 차)`],
      ] },
      { t: 'p', v: six.hourKnown
        ? `${name}의 여덟 글자는 ${six.pillars}. 시주까지 넣어 읽었으니 더 촘촘하게 볼 수 있어요.`
        : `${name}의 여섯 글자는 ${six.pillars}. 태어난 시간이 공개되지 않은 연예인이라 시주를 빼고 년·월·일주로만 읽었어요. 그래도 궁합의 뼈대인 일간·일지·띠·오행은 여섯 글자 안에 다 들어 있습니다.` },
      { t: 'p', v: `${josa(name, '은', '는')} ${bIl.keyword} — ${bIl.charm} 그래서 ${josa(name, '이', '가')} 사람에게 마음을 여는 순간은 대개 "잘 보여 주려는 순간"이 아니라, 힘을 빼고 있는 순간이에요.` },
      { t: 'p', v: `만약 ${josa(name, '과', '와')} 처음 마주친다면, 그 장면은 ${placeMine}에서 시작될 가능성이 커요. 내 사주는 그런 자리에서 마음이 먼저 열리고, ${name}의 사주는 ${placeTheirs}에서 긴장을 풀어요. 두 장소가 겹치는 하루가 이 궁합의 첫 장면입니다.` },
      { t: 'sub', v: '설렘 포인트 셋' },
      { t: 'li', v: [
        `${josa(name, '이', '가')} 먼저 흔들리는 지점 — ${bIl.love[0]}`,
        `내가 먼저 끌리는 지점 — ${mIl.charm}`,
        `${r.ilju.title} — ${r.ilju.line}`,
      ] },
      { t: 'p', v: r.temp.gap >= 7
        ? `다만 온도 차가 ${r.temp.gap}도예요. ${tempWord(me.ohaeng.temp)} 나와 ${tempWord(bias.ohaeng.temp)} ${josa(name, '은', '는')} 같은 장면을 서로 다른 속도로 느껴요. 첫인상에서 이 속도 차이를 설명하지 않으면, 한 사람은 "설렜다"고 기억하고 다른 사람은 "좀 어색했다"고 기억할 수 있어요.`
        : `온도 차가 ${r.temp.gap}도로 크지 않아, 첫 만남의 공기가 서로에게 낯설지 않을 거예요. 대신 그 편안함이 "그냥 좋은 사람"에서 멈추지 않도록, 두 번째 만남을 내가 먼저 만들어야 합니다.` },
      { t: 'q', v: `${name}의 무대는 짧아도 첫인상은 오래 남아요. 오늘의 인상이 다음 만남의 자리를 만듭니다.` },
    ],
  };
}

/** 2) 최애가 끌리는 연애 스타일 vs 나의 매력 포인트 */
function loveStyle(me, bias, name, r, { freeBlocks = 1 } = {}) {
  const bIl = ILGAN[bias.dayMaster.ko];
  const mIl = ILGAN[me.dayMaster.ko];
  const bJj = JIJI[bias.pillars.day.branchKo];
  const mJj = JIJI[me.pillars.day.branchKo];
  const sc = sipsungTally(bias);
  const [s1, s2] = partnerStarNames(bias);
  const starCount = (sc[s1] || 0) + (sc[s2] || 0);
  const starLine = starCount >= 2
    ? `${s1}·${josa(s2, '이', '가')} ${starCount}개라 사람이 끊이지 않는 사주예요. 그래서 ${name}에게는 "특별한 한 사람"보다 "편안하게 오래 있는 사람"이 더 어렵게 다가옵니다.`
    : starCount === 1
      ? `${s1}·${josa(s2, '이', '가')} 1개라 넓게 만나기보다 한 사람에게 오래 집중하는 쪽이에요. 그 집중이 ${name}의 무기입니다.`
      : `${s1}·${josa(s2, '이', '가')} 비어 있어 스스로 문을 열기 전에는 인연이 잘 보이지 않는 사주예요. 먼저 다가가는 쪽이 ${name}이고, 그 사람에게는 오래 기다리는 쪽이 남습니다.`;
  const reach = r.fill.toThem.length
    ? `최애에게 없는 ${r.fill.toThem.join('·')}을 내가 갖고 있어요. ${r.fill.toThem.map((o) => OHAENG_DETAIL[o].need).join(' / ')} 같은 결이 ${name}에게는 신기하게 편안함으로 읽힙니다.`
    : `최애에게 뚜렷하게 빈 기운이 없어요. 그래서 "없는 걸 채워 주는 사람"보다 "같은 결로 오래 버티는 사람"이 ${name}에게는 오래 남습니다.`;
  const miss = r.ilju.rel === '충' || r.ilju.rel === '형' || r.temp.gap >= 7
    ? '속도가 아쉬워요. 마음이 식는 타이밍이 서로 달라서, 내가 식은 뒤에 상대가 데워지는 일이 생겨요.'
    : '자극이 아쉬워요. 너무 편안해서 "설렘"이라는 단어가 잘 나오지 않아요. 가끔은 낯선 데이트를 만들어야 합니다.';
  return {
    id: 'bi-style',
    heading: `최애가 실제로 끌리는 연애 스타일 vs 나의 매력 포인트`,
    kicker: 'LOVE STYLE',
    locked: true,
    freeBlocks,
    blocks: [
      { t: 'sub', v: `${name}의 연애 스타일 — ${bias.dayMaster.ko}일간 ${bJj.tone}` },
      { t: 'p', v: bIl.love[0] },
      { t: 'p', v: bIl.love[1] },
      { t: 'li', v: [
        `일지 ${bias.pillars.day.branchKo} — ${bJj.line}`,
        `그림자 — ${bIl.shadow}`,
        `인연의 별 — ${starLine}`,
      ] },
      { t: 'sub', v: '나의 매력 포인트' },
      { t: 'p', v: `${mIl.keyword} — ${mIl.charm}` },
      { t: 'p', v: mIl.love[0] },
      { t: 'li', v: [
        `일지 ${me.pillars.day.branchKo} — ${mJj.line}`,
        `${josa(me.ohaeng.strongest, '이', '가')} 가장 강한 사주 — ${OHAENG_DETAIL[me.ohaeng.strongest].excess}`,
        `띠로 보는 매력 — ${TTI[me.dii].charm}`,
      ] },
      { t: 'kv', v: [
        ['최애가 끌리는 결', `${bIl.keyword} · ${bJj.tone}`],
        ['내가 닿는 지점', reach],
        ['아쉬운 지점', miss],
      ] },
      { t: 'q', v: `${name}의 이상형은 목록이 아니라 온도예요. 나는 그 온도에 몇 도쯤 닿아 있는 사람인지가 이 궁합의 답입니다.` },
    ],
  };
}

/** 3) 서로 채워주는 오행 케미 & 조심할 엇박자 */
function ohaengChemi(me, bias, name, r, { freeBlocks = 1 } = {}) {
  const fills = fillLines(me, bias, r.fill);
  const discords = discordLines(me, bias, r);
  return {
    id: 'bi-ohaeng',
    heading: '서로 채워주는 오행 케미 & 조심할 엇박자',
    kicker: 'ELEMENT',
    locked: true,
    freeBlocks,
    blocks: [
      { t: 'bar', v: OHAENG.map((o) => ({
        label: `${o}(${OHAENG_META[o].han})`,
        value: me.ohaeng.count[o] || 0,
        max: 6,
        note: `나 ${me.ohaeng.count[o] || 0} · 최애 ${bias.ohaeng.count[o] || 0}`,
      })) },
      { t: 'p', v: `내 사주는 ${me.ohaeng.label} ${me.ohaeng.temp}°C, ${name}의 사주는 ${bias.ohaeng.label} ${bias.ohaeng.temp}°C. 두 사주를 겹쳐 놓으면 상대에게 없는 기운이 내 쪽에, 내게 없는 기운이 상대 쪽에 놓이는 자리가 보여요.` },
      { t: 'li', v: fills.length ? fills : ['두 사람 다 오행이 고르게 갖춰져 있어요. 채워 주는 관계보다 "같이 쓰는" 관계에 가깝습니다.'] },
      { t: 'table', head: ['오행', '나', '최애', '차이', '읽기'], rows: ohaengCompare(me, bias).map((x) => [`${x.ohaeng}(${OHAENG_META[x.ohaeng].han})`, `${x.mine}개`, `${x.theirs}개`, x.diff === 0 ? '0' : `${x.diff > 0 ? '+' : ''}${x.diff}`, x.note]) },
      { t: 'sub', v: '조심할 엇박자' },
      { t: 'li', v: discords },
      { t: 'sub', v: '다락방 처방' },
      { t: 'li', v: [
        `내게 없는 ${me.ohaeng.missing[0] ? josa(me.ohaeng.missing[0], '을', '를') : '기운을'} ${josa(name, '과', '와')} 함께하는 시간에 넣어 보세요. ${me.ohaeng.missing[0] ? OHAENG_DETAIL[me.ohaeng.missing[0]].need : '지금의 균형을 유지하는 것'}이 이 궁합의 접착제가 됩니다.`,
        r.fill.toThem.length ? `반대로 ${name}에게 없는 ${r.fill.toThem.join('·')}은 내가 이미 가진 기운이에요. 그 기운을 "자랑"하지 않고 "곁에 있는 것"으로 보여 주세요.` : '서로 빈자리가 크지 않아, 채워 주려 애쓰기보다 같이 하는 일을 하나 만드는 편이 오래갑니다.',
        r.temp.gap >= 7 ? `온도 차 ${r.temp.gap}도를 없애려 하지 마세요. 대신 "오늘은 내가 먼저 데울게"라고 말해 두는 규칙 하나면 충분합니다.` : '온도가 비슷한 만큼, 둘 다 지칠 때를 알려 줄 신호를 정해 두세요. 말하지 않으면 아무도 모릅니다.',
      ] },
      { t: 'q', v: '오행은 사람을 재는 자가 아니라, 왜 이 사람 앞에서 내가 이러는지를 설명하는 온도계예요.' },
    ],
  };
}

/** 4) 2026~2027 두 사람의 시너지가 가장 빛나는 달 */
function bestMonths(me, bias, name, { freeBlocks = 1 } = {}) {
  const syn = synergyMonths(me, bias);
  const { best, caution, peak } = syn;
  const pick = [...best, ...caution.slice(0, 2)];
  const months2027 = syn.months.filter((m) => m.year === 2027);
  return {
    id: 'bi-when',
    heading: '2026~2027 두 사람의 시너지가 가장 빛나는 달',
    kicker: 'TIMING',
    locked: true,
    freeBlocks,
    blocks: [
      { t: 'kv', v: [
        ['가장 빛나는 달', `${peak.label} · ${peak.score}점`],
        ['그다음 달', `${best[1].label} · ${best[1].score}점`],
        ['세 번째 달', `${best[2].label} · ${best[2].score}점`],
        ['숨 고를 달', `${caution[0].label} · ${caution[0].score}점`],
      ] },
      { t: 'p', v: `2026년 1월부터 2027년 12월까지 스물네 달을, 나와 ${name}의 월건(月建)으로 겹쳐 봤어요. 두 사람의 십성이 같은 방향을 가리키고, 월지가 우리 일지와 합을 이루는 달에 시너지가 올라갑니다.` },
      { t: 'table', head: ['달', '월건', '시너지', '읽기'], rows: pick.map((m) => [m.label, `${m.ganji} · ${m.mySipsung}/${m.theirSipsung}`, `${m.score}점`, `${m.line}${m.note ? ` (${m.note})` : ''}`]) },
      { t: 'sub', v: '2027년 달별 시너지' },
      { t: 'bar', v: months2027.map((m) => ({ label: `${m.month}월`, value: m.score, max: 100, note: m.ganji, color: m.score >= 80 ? '#E6C378' : m.score >= 65 ? '#6E8FC9' : '#5C6579' })) },
      { t: 'p', v: `가장 빛나는 달은 ${peak.label}이에요. ${peak.line}. 이 달에는 ${name}의 소식이든, 내 쪽의 좋은 일이든 "먼저 반응하는 쪽"이 되어 보세요. 이 궁합은 반응이 오갈 때 온도가 올라갑니다.` },
      { t: 'li', v: [
        `${peak.label} — ${peak.line}. 이 달에는 ${josa(name, '과', '와')} 관련된 것을 하나 시작하세요. 새 작품을 기다리든, 같은 취미를 시작하든, 그 달에 시작한 일이 오래 남습니다.`,
        `${best[1].label} — ${best[1].line}. 감정보다 용건으로 말하기 좋은 달이라, 응원 메시지나 짧은 후기처럼 부담 없는 접점이 잘 붙습니다.`,
        `${best[2].label} — ${best[2].line}. 좋은 기운을 관계에만 쓰지 말고, 그 기쁨을 함께 나눠 주세요.`,
        `${caution[0].label} — ${caution[0].line}. 이 달에는 결론을 미루고, 마음이 앞서는 말을 하루만 묵혀 두세요.`,
      ] },
      { t: 'q', v: '시너지는 큰 사건이 아니라, 같은 달에 같은 방향을 본 기억으로 남습니다.' },
    ],
  };
}

/** 5) 오늘의 다락방 처방 — 최애 궁합 행운 색·숫자·팁 */
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
        `색 — 오늘은 ${lucky.color}이 들어간 물건을 하나 곁에 두세요. ${lucky.ohaeng}의 기운을 눈으로 먼저 채우는 방식이에요.`,
        `숫자 — 오늘의 행운 숫자는 ${lucky.number}. 사진을 고르거나, ${lucky.number}번째로 마음에 남는 장면을 하나 기록해 보세요.`,
        `시간 — ${lucky.time}에는 ${name}의 이름을 한 번 불러 보세요. 소리로 꺼낸 이름이 오늘의 기운을 데웁니다.`,
      ] },
      { t: 'p', v: `오늘 나의 흐름은 ${f.score}점이에요. ${f.notes[0] || ''}` },
      { t: 'q', v: '좋아하는 마음은 숨겨도 기운으로 남아요. 오늘은 그 기운을 한 번만 밖으로 꺼내 보세요.' },
    ],
  };
}

/**
 * 최애궁합 섹션 5장
 * @param {object} me 내 명식
 * @param {object} bias 최애 명식 (시주 없어도 됨)
 * @param {string} biasName 최애 이름
 * @param {object} reading biasReading 결과 (없으면 다시 계산)
 */
export function biasSections(me, bias, biasName, now = new Date(), { freeBlocks = 2 } = {}) {
  const r = biasReading(me, bias);
  return [
    firstImpression(me, bias, biasName, r, { freeBlocks }),
    loveStyle(me, bias, biasName, r, { freeBlocks: Math.max(1, freeBlocks - 1) }),
    ohaengChemi(me, bias, biasName, r, { freeBlocks: Math.max(1, freeBlocks - 1) }),
    bestMonths(me, bias, biasName, { freeBlocks: Math.max(1, freeBlocks - 1) }),
    todayForTwo(me, bias, biasName, now),
  ];
}
