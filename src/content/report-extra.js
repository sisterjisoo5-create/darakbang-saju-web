// ─── 새 운세 5종의 섹션 빌더 (연애운 · 재회운 · 부자의 조건 · 운명의 짝 · 자미두수 심층) ───
// 모든 문장은 computeChart / computeJami 결과에서만 나온다. 점수도 같은 입력이면 같은 값.

import { ILGAN, JIJI, TTI, SIPSUNG_DETAIL, OHAENG_DETAIL, JAMI_STAR_MEANING, DAEWOON_TONE } from './data.js';
import { OHAENG, OHAENG_META } from '../engine/constants.js';
import { branchRelation } from '../engine/compat.js';

const clampN = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));

/** 십성 개수 — 천간 3개 + 지지 4개(시간 미상이면 3개) */
function sipsungCount(chart) {
  const list = [
    chart.sipsung.year, chart.sipsung.month, chart.sipsung.hour,
    chart.sipsung.yearBranch, chart.sipsung.monthBranch, chart.sipsung.dayBranch, chart.sipsung.hourBranch,
  ].filter(Boolean);
  const count = {};
  for (const s of list) count[s] = (count[s] || 0) + 1;
  return count;
}

function tempWord(t) {
  if (t <= 13) return '얼음장처럼 차가운';
  if (t <= 19) return '서늘한';
  if (t <= 25.5) return '온화한';
  if (t <= 31) return '따뜻한';
  return '뜨거운';
}

const LUCKY_MEANING = {
  좌보: '옆에서 밀어주는 사람 — 귀인·도움',
  우필: '뒤에서 받쳐주는 사람 — 협력·보좌',
  문창: '배움과 문서의 별 — 시험·공부·계약',
  문곡: '말과 표현의 별 — 언변·예술·설득',
  천괴: '막힌 것을 뚫는 별 — 구원·기회',
  천월: '치료와 위로의 별 — 회복·돌봄',
  녹존: '재물과 안정의 별 — 봉급·복',
  천양: '급한 일을 정면으로 받는 별',
  타라: '막힘과 지체를 만드는 별',
};

const DAE_LOVE = {
  정관: '약속과 형식이 구체해지는 10년 — 결혼·동거 이야기가 나옴',
  편관: '강하게 끌리는 인연 — 속도를 조절해야 오래감',
  정재: '안정된 만남 — 소개·직장·생활 반경에서',
  편재: '만남이 많고 선택이 어려운 10년',
  식신: '편안함이 매력이 되는 10년 — 오래된 인연이 다시 보임',
  상관: '표현이 세져 마찰도 큰 10년 — 말조심',
  정인: '배움·소개·가족의 자리에서 인연',
  편인: '혼자가 편해지는 10년 — 먼저 문을 열어야',
  비견: '내가 먼저 다가가는 10년',
  겁재: '경쟁·삼각관계를 조심할 10년',
};

/** 여자에게 인연의 별은 관성, 남자에게는 재성 (전통 명리 기준) */
function partnerStar(chart) {
  return chart.input.gender === 'male' ? ['정재', '편재'] : ['정관', '편관'];
}

function nowAgeOf(chart) {
  return Math.max(0, new Date().getFullYear() - chart.solarYear);
}

function currentDaewoon(chart) {
  const d = chart.daewoon;
  const age = nowAgeOf(chart);
  const idx = d.list.findIndex((x) => age >= x.fromAge && age <= x.toAge);
  return {
    age,
    cur: d.list[idx >= 0 ? idx : 0],
    next: d.list[(idx >= 0 ? idx : 0) + 1] || null,
  };
}

function buStarsOf(jami) {
  const bu = jami ? jami.bucheoPalace : null;
  if (!bu) return [];
  return bu.empty ? bu.borrowed : bu.main;
}

function starLine(names) {
  return names.map((s) => `${s}(${(JAMI_STAR_MEANING[s] || '').split('.')[0]})`).join(' · ');
}

/* ─────────────── 연애운 · 사랑운 ─────────────── */
export function loveSections(chart, jami, { freeBlocks = 2 } = {}) {
  const il = ILGAN[chart.dayMaster.ko];
  const jj = JIJI[chart.pillars.day.branchKo];
  const sc = sipsungCount(chart);
  const [s1, s2] = partnerStar(chart);
  const starCount = (sc[s1] || 0) + (sc[s2] || 0);
  const bu = jami ? jami.bucheoPalace : null;
  const buStars = buStarsOf(jami);
  const { cur, next } = currentDaewoon(chart);
  const months = chart.sewoon.list;
  const goodMonths = months.filter((m) => m.sipsung === s1 || m.sipsung === s2);
  const hardMonths = months.filter((m) => m.sipsung === '겁재' || m.sipsung === '상관');
  const loveDaeAll = chart.daewoon.list.filter((x) => x.sipsung === s1 || x.sipsung === s2);
  const loveDae = loveDaeAll.filter((x) => x.toAge >= cur.fromAge);
  const loveDaePast = loveDaeAll.filter((x) => x.toAge < cur.fromAge);
  const temp = chart.ohaeng.temp;
  const strongest = chart.ohaeng.strongest;
  const missing = chart.ohaeng.missing;
  const curTone = DAEWOON_TONE[cur.sipsung] || DAEWOON_TONE.비견;

  const loveLines = [];
  if (starCount >= 2) loveLines.push(`인연의 별(${s1}·${s2})이 ${starCount}개예요. 사람이 끊이지 않는 사주지만, 고르는 기준이 없으면 좋은 인연도 스쳐 갑니다.`);
  else if (starCount === 1) loveLines.push(`인연의 별이 1개예요. 넓게 만나기보다 한 사람에게 오래 집중하는 쪽입니다. 그 집중이 무기가 돼요.`);
  else loveLines.push('인연의 별이 비어 있어요. 스스로 문을 열기 전에는 인연이 잘 보이지 않는 사주입니다. 소개·모임·동호회처럼 만날 자리를 먼저 만들어야 해요.');
  if (sc['식신'] || sc['상관']) loveLines.push('식상이 있어 표현이 자연스러워요. 좋아하는 마음을 숨기지 못하는 편이라 상대도 빨리 알아차립니다.');
  if (sc['정인'] || sc['편인']) loveLines.push('인성이 있어 혼자 있는 시간이 꼭 필요해요. 그 필요를 말로 설명하지 않으면 상대는 서운함으로 읽습니다.');
  if (sc['비견'] || sc['겁재']) loveLines.push('비겁이 있어 자존심이 관계의 걸림돌이 돼요. 맞서는 대신 한 발 먼저 물러서는 쪽이 오래 갑니다.');

  return [
    {
      id: 'lf-heart',
      heading: '내 연애 온도',
      kicker: 'HEART',
      locked: true,
      freeBlocks,
      blocks: [
        { t: 'kv', v: [
          ['일간', `${chart.dayMaster.ko}(${chart.dayMaster.han}) · ${il.keyword}`],
          ['일지', `${chart.pillars.day.branchKo}(${chart.pillars.day.branchHan}) · ${jj.tone}`],
          ['사주 온도', `${temp}°C · ${tempWord(temp)} 편`],
          ['배우자 자리', bu ? `${bu.branchKo}(${bu.branchHan}) 자리 · ${buStars.join(' · ') || '공궁'}` : '시간 미상으로 계산 제외'],
        ] },
        { t: 'p', v: `${il.love[0]}` },
        { t: 'p', v: `사주 온도 ${temp}°C는 ${tempWord(temp)} 쪽이에요. ${chart.ohaeng.count.화 >= 2 ? '화가 강해 감정이 먼저 올라와요. 좋아하는 마음도 빨리 뜨거워지고 빨리 식습니다.' : chart.ohaeng.count.화 === 0 ? '화가 비어 있어 좋아해도 티가 잘 안 나요. 상대는 당신의 마음을 반쯤만 읽습니다.' : '화와 수의 균형이 무난해, 감정의 온도가 급하게 출렁이지는 않아요.'}` },
        { t: 'bar', v: OHAENG.map((o) => ({ label: `${o}(${OHAENG_META[o].han})`, value: chart.ohaeng.count[o] || 0, max: 5, note: OHAENG_META[o].keyword })) },
        { t: 'p', v: il.love[1] },
      ],
    },
    {
      id: 'lf-pattern',
      heading: '끌리는 사람, 오래 가는 사람',
      kicker: 'PATTERN',
      locked: true,
      freeBlocks: 1,
      blocks: [
        { t: 'sub', v: `일지 ${chart.pillars.day.branchKo} — ${jj.tone}` },
        { t: 'p', v: jj.line },
        { t: 'p', v: `당신에게 강하게 끌리는 쪽은 ${strongest} 기운이 넘치는 사람이에요. ${OHAENG_DETAIL[strongest].excess.split('.')[0]}. 그 사람과 있으면 처음엔 뜨겁지만, 같은 기운끼리 부딪히면 둘 다 지칩니다.` },
        { t: 'p', v: missing.length
          ? `오래 가는 사람은 반대예요. 당신에게 없는 ${missing.join('·')} 기운을 가진 사람 — ${missing.map((o) => OHAENG_DETAIL[o].need).join(' / ')} 같은 결을 가진 사람이 마음을 편하게 만듭니다.`
          : '오행이 고르게 있어 어느 쪽과도 시작할 수 있는 사주예요. 대신 상대의 온도에 끌려가지 않으려면 내 기준을 먼저 세워야 합니다.' },
        { t: 'chips', v: [
          `인연의 별 ${s1}·${s2} × ${starCount}`,
          `끌림: ${strongest} 과다`,
          `안정: ${missing.length ? missing.join('·') : '균형'}`,
        ] },
      ],
    },
    {
      id: 'lf-when',
      heading: '인연이 오는 시기',
      kicker: 'TIMING',
      locked: true,
      freeBlocks: 1,
      blocks: [
        { t: 'p', v: `지금은 ${cur.ko}(${cur.han}) 대운 ${cur.fromAge}~${cur.toAge}세 — ${curTone.title}이에요. ${DAE_LOVE[cur.sipsung] || '관계의 판이 조용히 바뀌는 10년'}입니다.` },
        { t: 'table', head: ['대운', '나이', '십성', '연애 흐름'], rows: chart.daewoon.list.slice(0, 6).map((x) => [`${x.ko}(${x.han})`, `${x.fromAge}~${x.toAge}세`, x.sipsung, DAE_LOVE[x.sipsung] || '—']) },
        { t: 'p', v: loveDae.length
          ? `앞으로 인연의 별이 들어오는 대운은 ${loveDae.map((x) => `${x.fromAge}~${x.toAge}세(${x.ko})`).join(', ')}예요. 이 시기에는 만남 자체가 많아지고, 선택의 순간이 옵니다.`
          : loveDaePast.length
            ? `인연의 별이 들어온 대운은 ${loveDaePast.map((x) => `${x.fromAge}~${x.toAge}세(${x.ko})`).join(', ')}로 이미 지났어요. 남은 대운에는 그 별이 크게 들어오지 않으니, 운보다 내가 만드는 자리가 중요합니다.`
            : '인연의 별이 대운에 크게 들어오지 않는 사주예요. 그래서 운보다 내가 만드는 자리가 중요합니다. 일·취미·배움의 판에서 사람을 만나세요.' },
        { t: 'p', v: `${chart.sewoon.yearKo}년에는 ${goodMonths.length ? `${goodMonths.map((m) => m.monthLabel).join(', ')}에 인연의 문이 열려요.` : '인연의 별이 도드라지는 달이 적어요. 새로 만나기보다 이미 아는 사람에게 마음을 여는 해입니다.'} ${hardMonths.length ? `반대로 ${hardMonths.map((m) => m.monthLabel).join(', ')}은 말이 세지고 비교가 많아지는 달 — 고백과 확인은 이 달을 피하세요.` : ''}` },
        { t: 'q', v: '인연은 찾아오는 게 아니라, 내가 나가 있는 자리에서 만납니다.' },
      ],
    },
    {
      id: 'lf-bu',
      heading: '배우자 자리 — 어떤 사람이 앉아 있나',
      kicker: 'SPOUSE',
      locked: true,
      freeBlocks: 1,
      blocks: [
        { t: 'p', v: bu
          ? `자미두수 부처궁은 ${bu.branchKo}(${bu.branchHan}) 자리, ${buStars.length ? `${starLine(buStars)}이 앉아 있어요.` : '비어 있어 맞은편 기운을 빌려 씁니다.'} ${buStars.length ? JAMI_STAR_MEANING[buStars[0]] : '배우자의 형태를 스스로 정하는 사주라, 내가 어떤 사람에게 문을 여는지가 곧 배우자상이 됩니다.'}`
          : '시간을 몰라 자미두수는 계산하지 않았어요. 시간을 넣으면 배우자 자리까지 읽어 드립니다.' },
        { t: 'li', v: [
          buStars.length ? `${buStars[0]}의 결 — ${JAMI_STAR_MEANING[buStars[0]]}` : '공궁 — 상대의 조건보다 내 삶의 형태가 먼저 정해집니다.',
          `띠로 보는 인연 — ${TTI[chart.dii].charm}`,
          '이 사람과 맞는지 볼 때는 첫인상보다 "대화가 끝난 뒤의 피로감"을 보세요.',
        ] },
      ],
    },
    {
      id: 'lf-guide',
      heading: '연애 처방 세 가지',
      kicker: 'GUIDE',
      locked: true,
      freeBlocks: 1,
      blocks: [
        { t: 'li', v: [
          chart.ohaeng.count.화 === 0 ? '좋아하면 말로 하세요. 이 사주는 티가 안 나서, 표현하지 않으면 없는 것과 같아요.' : '감정이 올라온 날의 고백과 이별 통보는 하루 미루세요. 이 사주의 화는 식는 데 시간이 걸리지 않습니다.',
          sc['정인'] || sc['편인'] ? '혼자 있는 시간을 달라고 미리 말해 두세요. 설명 없는 침묵은 이 사주에게 가장 큰 오해를 만듭니다.' : '상대의 사정을 상상하지 말고 물어보세요. 이 사주는 눈치가 빨라서 혼자 결론을 내리기 쉽습니다.',
          `지금 대운(${cur.ko})에서는 ${curTone.up} 그 리듬에 사람을 얹으면 관계가 자연스럽게 자랍니다.`,
        ] },
        { t: 'q', v: '사랑은 온도가 아니라 방향이에요. 같은 곳을 보고 있는지가 먼저입니다.' },
      ],
    },
  ];
}

/* ─────────────── 재회운 ─────────────── */
export function reunionReading(chart, jami) {
  const sc = sipsungCount(chart);
  const inCount = (sc['정인'] || 0) + (sc['편인'] || 0);
  const water = chart.ohaeng.count.수 || 0;
  const fire = chart.ohaeng.count.화 || 0;
  const bu = jami ? jami.bucheoPalace : null;
  const rel = bu ? branchRelation(chart.pillars.day.branchKo, bu.branchKo) : null;
  const { cur } = currentDaewoon(chart);
  const inDae = cur.sipsung === '정인' || cur.sipsung === '편인';
  const inYear = chart.sewoon.list.some((m) => m.sipsung === '정인' || m.sipsung === '편인');

  const longing = clampN(42 + inCount * 10 + water * 5 + fire * 2, 20, 97);
  const bond = clampN(
    46 + (bu && bu.branch === chart.dayBranch ? 16 : 0) +
      (rel === '육합' ? 14 : rel === '삼합' ? 9 : rel === '충' ? 5 : rel === '원진' ? -5 : 0) + inCount * 3,
    22, 96,
  );
  const timing = clampN(48 + (inDae ? 12 : 0) + inCount * 4 + (inYear ? 6 : 0), 25, 95);
  const score = clampN(longing * 0.4 + bond * 0.35 + timing * 0.25, 30, 95);
  const band = score >= 78
    ? { title: '끈이 아직 살아 있는 사주', line: '마음의 정리가 덜 된 쪽은 당신일 수 있어요. 이 사주는 잊는 데 오래 걸리고, 그 시간이 인연의 끈을 붙잡고 있습니다.' }
    : score >= 66
      ? { title: '미련이 오래 남는 사주', line: '기억을 곱씹는 힘이 강해요. 다시 만나고 싶은 마음과 상처를 피하려는 마음이 동시에 움직이는 상태입니다.' }
      : score >= 52
        ? { title: '정리가 필요한 사주', line: '끈은 이미 느슨해졌어요. 지금 남아 있는 건 그 사람이 아니라 그때의 나를 아끼는 마음일 가능성이 큽니다.' }
        : { title: '이미 문을 닫은 사주', line: '이 사주는 끝을 알면 빨리 정리하는 쪽이에요. 다만 정리한 척하면서 혼자 오래 곱씹는 결이 있습니다.' };
  return { score, longing, bond, timing, rel, bu, buStars: buStarsOf(jami), cur, band, inCount };
}

export function reunionSections(chart, jami, { freeBlocks = 2 } = {}) {
  const il = ILGAN[chart.dayMaster.ko];
  const jj = JIJI[chart.pillars.day.branchKo];
  const sc = sipsungCount(chart);
  const r = reunionReading(chart, jami);
  const months = chart.sewoon.list;
  const softMonths = months.filter((m) => m.sipsung === '정인' || m.sipsung === '편인' || m.sipsung === '식신');
  const sharpMonths = months.filter((m) => m.sipsung === '상관' || m.sipsung === '겁재' || m.sipsung === '편관');

  return [
    {
      id: 'rj-temp',
      heading: '재회 온도',
      kicker: 'TEMPERATURE',
      locked: true,
      freeBlocks,
      blocks: [
        { t: 'score', value: r.score, label: r.band.title, note: r.band.line },
        { t: 'bar', v: [
          { label: '그리움', value: r.longing, max: 100, note: `인성 ${r.inCount}개 · 수 ${chart.ohaeng.count.수 || 0}개` },
          { label: '인연의 끈', value: r.bond, max: 100, note: r.rel ? `일지 ↔ 부처궁 ${r.rel}` : '일지와 부처궁이 비켜 있음' },
          { label: '이어질 시기', value: r.timing, max: 100, note: `지금 ${r.cur.ko} 대운` },
        ] },
        { t: 'kv', v: [
          ['일지', `${chart.pillars.day.branchKo}(${chart.pillars.day.branchHan}) · ${jj.tone}`],
          ['부처궁', r.bu ? `${r.bu.branchKo} 자리 · ${r.buStars.join(' · ') || '공궁'}` : '—'],
          ['지금 대운', `${r.cur.ko}(${r.cur.han}) · ${r.cur.sipsung}`],
          ['재회 온도', `${r.score}점 / 100`],
        ] },
        { t: 'p', v: '재회운은 상대의 사주 없이 내 여덟 글자만으로 읽습니다. 그래서 "그 사람이 돌아온다"를 맞히는 표가 아니라, 내가 아직 그 사람에게 묶여 있는지, 다시 만나면 무엇이 반복될지를 보는 지도예요. 상대의 생년월일시를 넣으면 1:1 사주 궁합에서 두 사람의 실제 온도를 따로 볼 수 있습니다.' },
      ],
    },
    {
      id: 'rj-why',
      heading: '헤어진 이유의 구조',
      kicker: 'STRUCTURE',
      locked: true,
      freeBlocks: 1,
      blocks: [
        { t: 'p', v: `${chart.dayMaster.ko}일간은 '${il.keyword}'의 결이에요. ${il.shadow}` },
        { t: 'sub', v: `일지 ${chart.pillars.day.branchKo} — ${jj.tone}` },
        { t: 'p', v: jj.line },
        { t: 'li', v: [
          chart.ohaeng.missing.includes('화') ? '감정을 말하지 않고 쌓아 두는 결이에요. 상대는 어느 날 갑자기 끝난 줄 알지만, 당신은 오래전부터 지쳐 있었어요.' : '감정이 올라오면 그 자리에서 다 말하는 편이에요. 그 말이 상대에게는 통보처럼 들렸을 수 있습니다.',
          sc['비견'] || sc['겁재'] ? '자존심이 남아 있어 "먼저 연락하는 것"을 지는 것처럼 느껴요. 그 자존심이 관계의 마지막 문을 닫았을 수 있습니다.' : '상대에게 맞춰 주다가 어느 순간 사라지는 방식으로 끝났을 수 있어요. 그 방식은 상대에게 설명이 없었습니다.',
          chart.ohaeng.count.금 >= 2 ? '금이 강해 한번 끊으면 깔끔하게 정리하는 편이에요. 그래서 더 아픈 건 정리되지 않은 쪽입니다.' : '끊는 결단이 느린 사주예요. 그래서 이별 후에도 마음의 정리가 오래 걸립니다.',
        ] },
      ],
    },
    {
      id: 'rj-them',
      heading: '그 사람의 속마음',
      kicker: 'INSIDE',
      locked: true,
      freeBlocks: 1,
      blocks: [
        { t: 'p', v: r.bu && r.buStars.length
          ? `그 사람을 직접 보지 않고 읽을 수 있는 건, 당신의 부처궁 ${r.bu.branchKo} 자리에 앉은 ${starLine(r.buStars)}의 결이에요. ${JAMI_STAR_MEANING[r.buStars[0]]}`
          : '배우자 자리가 비어 있어 상대의 모습이 한 가지로 정해지지 않아요. 대신 당신이 어떤 사람에게 마음을 열었는지가 그 사람의 모습을 말해 줍니다.' },
        { t: 'p', v: `그 사람이 당신을 기억하는 방식은 ${chart.ohaeng.count.수 >= 2 ? '조용하고 오래 남는 기억' : '장면과 말로 남는 기억'}이에요. ${r.rel === '충' ? '충의 관계는 서로에게 강하게 남습니다. 잊으려 해도 자주 떠오르는 건 정상이에요.' : r.rel ? `${r.rel}의 관계는 편하게 지워지지 않아요. 그 끈이 아직 남아 있다는 뜻입니다.` : '두 자리가 서로 비켜 있어, 상대는 당신을 "좋은 사람"으로 기억하되 다시 붙잡을 이유는 찾지 못한 상태예요.'}` },
        { t: 'q', v: '상대의 마음은 추측할 수 없지만, 내가 아직 그 자리에 서 있는지는 알 수 있어요.' },
      ],
    },
    {
      id: 'rj-when',
      heading: '다시 이어지는 시기',
      kicker: 'TIMING',
      locked: true,
      freeBlocks: 1,
      blocks: [
        { t: 'p', v: `지금은 ${r.cur.ko}(${r.cur.han}) 대운 — ${(DAEWOON_TONE[r.cur.sipsung] || DAEWOON_TONE.비견).title}이에요. ${r.cur.sipsung === '정인' || r.cur.sipsung === '편인' ? '인성의 대운은 그리움이 길게 남는 계절입니다. 이 시기에 연락은 잘 되지만, 다시 만나면 예전 방식이 반복되기 쉬워요.' : '지금 대운은 앞으로 나아가는 기운이 강해요. 그래서 붙잡기보다 정리하고 새로 서는 쪽이 몸에 맞는 계절입니다.'}` },
        { t: 'p', v: softMonths.length
          ? `${chart.sewoon.yearKo}년에는 ${softMonths.map((m) => m.monthLabel).join(', ')}에 마음이 물러지는 달이 와요. 이 달의 연락은 예전의 문을 다시 두드립니다.`
          : `${chart.sewoon.yearKo}년에는 마음이 물러지는 달이 많지 않아요. 연락을 결심한다면 감정이 아니라 용건으로 시작하세요.` },
        { t: 'p', v: sharpMonths.length
          ? `반대로 ${sharpMonths.map((m) => m.monthLabel).join(', ')}은 말이 세지고 자존심이 올라오는 달이에요. 이 달에 다시 만나면 대화가 또 싸움이 됩니다.`
          : '올해는 크게 부딪히는 달이 적어요. 대화를 다시 시작하기엔 나쁘지 않은 환경입니다.' },
        { t: 'table', head: ['월', '월건', '십성', '마음의 결'], rows: months.map((m) => [m.monthLabel, m.ko, m.sipsung, DAE_LOVE[m.sipsung] ? '관계의 문이 움직임' : '지나가는 달']) },
      ],
    },
    {
      id: 'rj-answer',
      heading: '그래서, 다시 만나는 게 정답일까',
      kicker: 'ANSWER',
      locked: true,
      freeBlocks: 1,
      blocks: [
        { t: 'p', v: r.score >= 66
          ? '이 사주는 한 번 마음을 준 사람을 오래 기억해요. 그래서 재회가 나쁜 선택은 아닙니다. 다만 같은 이유로 또 끝나지 않으려면, 시작 전에 "그때 우리가 피했던 대화"를 먼저 꺼내야 해요.'
          : '지금 이 사주의 결은 앞으로 가는 쪽이에요. 재회를 결론으로 두기보다, 그 사람에게서 배운 것을 다음 인연에서 반복하지 않는 것이 이 사주에 맞는 정답입니다.' },
        { t: 'li', v: [
          '다시 만나고 싶은 이유가 "그 사람"인지 "그때의 나"인지 구분해 보세요. 이 사주는 후자에 오래 머무는 편이에요.',
          '연락은 감정이 아니라 용건으로 시작하세요. 이 사주의 감정 표현은 상대에게 통보처럼 들립니다.',
          '한 번 만나서 확인하고, 두 번째는 미루세요. 이 사주는 빠른 결정에 후회가 오래 남습니다.',
        ] },
        { t: 'q', v: '재회의 답은 상대가 아니라, 같은 이유로 다시 다치지 않을 준비에 있어요.' },
      ],
    },
    {
      id: 'rj-close',
      heading: '정리하는 법',
      kicker: 'CLOSE',
      locked: true,
      freeBlocks: 1,
      blocks: [
        { t: 'li', v: [
          `몸으로 정리하기 — ${chart.ohaeng.count.수 >= 2 ? '잠과 물, 조용한 산책' : '햇빛과 걷기, 몸을 데우는 일'}로 먼저 채우세요. 이 사주는 몸이 지치면 마음이 더 붙잡습니다.`,
          '기록을 남기세요. 이 사주는 기억을 곱씹는 힘이 강해서, 적어 두면 머릿속이 한 번 비워집니다.',
          '연락을 지우지 말고 보관함으로 옮기세요. 완전히 지우는 결단이 오히려 미련을 키웁니다.',
        ] },
        { t: 'p', v: `이별은 ${chart.ohaeng.count.토 >= 2 ? '시간이 약이 아니라 사람이 약인 사주' : '시간이 지나야 흐려지는 사주'}예요. 억지로 잊으려 하지 말고, 다른 자리를 채우세요.` },
      ],
    },
  ];
}

/* ─────────────── 부자의 조건 (재물운) ─────────────── */
export function wealthReading(chart) {
  const sc = sipsungCount(chart);
  const jae = (sc['편재'] || 0) + (sc['정재'] || 0);
  const sik = (sc['식신'] || 0) + (sc['상관'] || 0);
  const bi = (sc['비견'] || 0) + (sc['겁재'] || 0);
  const inCount = (sc['정인'] || 0) + (sc['편인'] || 0);
  const missing = chart.ohaeng.missing.length;
  const vessel = clampN(44 + jae * 10 + sik * 6 + Math.min(inCount, 2) * 3 - bi * 3 - missing * 3, 30, 96);
  const band = vessel >= 82
    ? { title: '그릇이 큰 사주', line: '돈이 드나드는 폭이 커요. 문제는 벌이가 아니라 지출의 구조입니다.' }
    : vessel >= 68
      ? { title: '쌓아서 키우는 그릇', line: '한 번에 크게 벌기보다 쌓아서 불리는 쪽이 맞아요. 시간이 당신의 편입니다.' }
      : vessel >= 54
        ? { title: '통로를 만들어야 하는 그릇', line: '재물이 머무는 자리가 좁아요. 버는 힘보다 새는 곳을 막는 게 먼저입니다.' }
        : { title: '손에 쥐는 연습이 필요한 그릇', line: '돈이 들어와도 머물지 않는 사주예요. 쥐는 습관을 만드는 것이 첫 단추입니다.' };
  const gate = jae >= 2 ? '재성' : sik >= 2 ? '식상' : inCount >= 2 ? '인성' : bi >= 2 ? '비겁' : '관성';
  return { jae, sik, bi, inCount, missing, vessel, band, gate };
}

export function wealthSections(chart, jami, { freeBlocks = 2 } = {}) {
  const il = ILGAN[chart.dayMaster.ko];
  const sc = sipsungCount(chart);
  const w = wealthReading(chart);
  const months = chart.sewoon.list;
  const moneyMonths = months.filter((m) => ['편재', '정재', '식신', '정관'].includes(m.sipsung));
  const leakMonths = months.filter((m) => ['겁재', '상관', '편인'].includes(m.sipsung));
  const { cur } = currentDaewoon(chart);
  const jaeDaeAll = chart.daewoon.list.filter((x) => ['편재', '정재'].includes(x.sipsung));
  const jaeDae = jaeDaeAll.filter((x) => x.toAge >= cur.fromAge);
  const jaeDaePast = jaeDaeAll.filter((x) => x.toAge < cur.fromAge);
  const gateText = {
    재성: '돈이 직접 들어오는 통로가 열려 있어요. 거래·영업·판매처럼 사람과 돈이 오가는 자리에서 재물이 붙습니다.',
    식상: '만들어서 내놓는 힘이 돈이 돼요. 콘텐츠·기술·손재주·요리처럼 결과물이 있는 일이 통로입니다.',
    인성: '배움과 자격, 사람의 소개가 재물의 통로예요. 공부에 쓴 시간이 곧 몫이 됩니다.',
    비겁: '내 이름으로 서는 일, 즉 1인 사업·전문직에서 재물이 붙어요. 대신 동업과 보증은 계산서를 남기세요.',
    관성: '조직·직책·자격이 재물의 통로예요. 규칙 안에서 오래 쌓는 방식이 맞습니다.',
  }[w.gate];

  return [
    {
      id: 'wt-vessel',
      heading: '재물 그릇',
      kicker: 'VESSEL',
      locked: true,
      freeBlocks,
      blocks: [
        { t: 'score', value: w.vessel, label: w.band.title, note: w.band.line },
        { t: 'kv', v: [
          ['재성(편재+정재)', `${w.jae}개`],
          ['식상(식신+상관)', `${w.sik}개`],
          ['비겁(비견+겁재)', `${w.bi}개`],
          ['비어 있는 기운', w.missing ? chart.ohaeng.missing.join(' · ') : '없음 (균형)'],
        ] },
        { t: 'p', v: il.money[0] },
        { t: 'bar', v: OHAENG.map((o) => ({ label: `${o}(${OHAENG_META[o].han})`, value: chart.ohaeng.count[o] || 0, max: 4, note: OHAENG_META[o].keyword })) },
        { t: 'p', v: il.money[1] },
      ],
    },
    {
      id: 'wt-gate',
      heading: '돈이 들어오는 통로',
      kicker: 'GATE',
      locked: true,
      freeBlocks: 1,
      blocks: [
        { t: 'p', v: `이 사주의 재물 통로는 ${w.gate}이에요. ${gateText}` },
        { t: 'li', v: Object.entries(sc)
          .filter(([k]) => ['식신', '상관', '정재', '편재', '정관', '편관', '정인', '편인', '비견', '겁재'].includes(k))
          .map(([k, v]) => `${k} × ${v} — ${SIPSUNG_DETAIL[k].money}`) },
        { t: 'p', v: `통로가 하나면 그 하나가 막힐 때 전부 멈춰요. 이 사주는 ${w.gate === '재성' ? '벌이는 좋지만 버는 곳이 하나로 몰려 있는지 확인해 보세요' : '통로를 하나 더 만들면 재물이 훨씬 안정됩니다'}.` },
      ],
    },
    {
      id: 'wt-leak',
      heading: '새는 구멍',
      kicker: 'LEAK',
      locked: true,
      freeBlocks: 1,
      blocks: [
        { t: 'li', v: [
          chart.ohaeng.missing.includes('토') ? '중심(토)이 비어 있어 충동 결제로 새기 쉬워요. 결제 전 하루를 두는 규칙이 약이 됩니다.' : '고정비 통제는 잘 되는 편이에요. 구독·보험·통신비를 한 번 정리하면 체감이 큽니다.',
          w.bi >= 2 ? '비겁이 강해 사람 때문에 돈이 나가는 구조예요. 보증·대여·동업은 반드시 문서로 남기세요.' : '사람에게 쓰는 돈은 통제가 되는 편이에요.',
          w.jae >= 2 ? '재성이 많아 기회가 여러 번 오지만, 잘못 고르면 한 번에 크게 잃어요. 손절 기준을 미리 정하세요.' : '한 번 모으면 오래 지키는 결이에요.',
          chart.ohaeng.missing.length ? `${chart.ohaeng.missing.join('·')}이 비어 있어 그 기운이 과해지는 달에 지출이 몰립니다. ${OHAENG_DETAIL[chart.ohaeng.missing[0]].need}로 그 기운을 다스리세요.` : '다섯 기운이 고르게 있어 급격한 지출 폭은 크지 않아요.',
        ] },
        { t: 'q', v: '돈은 "버는 힘"보다 "머무는 그릇"이 먼저예요. 그릇은 습관으로 커집니다.' },
      ],
    },
    {
      id: 'wt-tide',
      heading: '물 들어올 때 노 젓기',
      kicker: 'TIDE',
      locked: true,
      freeBlocks: 1,
      blocks: [
        { t: 'p', v: jaeDae.length
          ? `앞으로 재성 대운이 ${jaeDae.map((x) => `${x.fromAge}~${x.toAge}세(${x.ko})`).join(', ')}에 와요. 이 10년은 들어오는 물이 큰 시기 — 그때 벌어서 그때 지키는 연습을 해야 남습니다.`
          : jaeDaePast.length
            ? `재성 대운은 ${jaeDaePast.map((x) => `${x.fromAge}~${x.toAge}세(${x.ko})`).join(', ')}로 이미 지나갔어요. 지금은 큰 물이 아니라 매달 들어오는 물로 그릇을 키우는 시기입니다. 대운보다 해마다 오는 세운을 보세요.`
            : '재성 대운이 뚜렷하게 오지 않는 사주예요. 그래서 운을 기다리기보다 통로를 미리 만들어 두는 쪽이 맞습니다.' },
        { t: 'table', head: ['대운', '나이', '십성', '재물의 결'], rows: chart.daewoon.list.slice(0, 6).map((x) => [`${x.ko}(${x.han})`, `${x.fromAge}~${x.toAge}세`, x.sipsung, ['편재', '정재'].includes(x.sipsung) ? '물이 들어오는 시기 — 벌고 지키기' : x.sipsung === '비견' || x.sipsung === '겁재' ? '나눠 쓰는 시기 — 문서로 남기기' : '통로를 넓히는 시기']) },
        { t: 'p', v: `${chart.sewoon.yearKo}년은 ${moneyMonths.length ? `${moneyMonths.map((m) => m.monthLabel).join(', ')}에 재물의 문이 열려요.` : '재물의 문이 크게 열리는 달이 적어요. 지출 구조를 손보는 해로 쓰세요.'} ${leakMonths.length ? `${leakMonths.map((m) => m.monthLabel).join(', ')}은 새는 달이니 큰 결제를 미루세요.` : ''}` },
      ],
    },
    {
      id: 'wt-habit',
      heading: '부자 되는 습관 다섯',
      kicker: 'HABIT',
      locked: true,
      freeBlocks: 1,
      blocks: [
        { t: 'li', v: [
          `수입의 ${w.bi >= 2 ? '30' : '20'}%를 먼저 떼어 두세요. 이 사주는 남는 돈을 모으는 방식이 안 통합니다.`,
          '큰 결제 전 하루, 결정을 미루세요. 이 사주의 결단은 빠르고 후회가 깁니다.',
          '돈이 되는 일에 이름을 붙이세요. 애매한 재능은 값이 매겨지지 않습니다.',
          w.jae >= 2 ? '기회가 여러 번 오니 손절 기준을 숫자로 정해 두세요.' : '한 번 모으면 오래 가니, 모으는 자동화(적립·분리 계좌)가 잘 맞습니다.',
          '사람에게 쓰는 돈은 예산을 정해서 쓰세요. 이 사주는 관계에서 새는 돈이 가장 아깝습니다.',
        ] },
        { t: 'q', v: '부자는 큰돈을 번 사람이 아니라, 큰돈이 머무는 사람이에요.' },
      ],
    },
  ];
}

/* ─────────────── 운명의 짝 ─────────────── */
export function destinySections(chart, jami, { freeBlocks = 2 } = {}) {
  const il = ILGAN[chart.dayMaster.ko];
  const jj = JIJI[chart.pillars.day.branchKo];
  const bu = jami ? jami.bucheoPalace : null;
  const buStars = buStarsOf(jami);
  const missing = chart.ohaeng.missing;
  const strongest = chart.ohaeng.strongest;
  const { cur, next } = currentDaewoon(chart);
  const [s1, s2] = partnerStar(chart);
  const loveDaeAll = chart.daewoon.list.filter((x) => x.sipsung === s1 || x.sipsung === s2);
  const loveDae = loveDaeAll.filter((x) => x.toAge >= cur.fromAge);
  const loveDaePast = loveDaeAll.filter((x) => x.toAge < cur.fromAge);
  const place = {
    목: '공원·산책로·도서관처럼 나무와 초록이 있는 곳',
    화: '사람이 모이는 자리·공연장·카페의 창가',
    토: '산·흙·온천, 익숙한 동네의 단골집',
    금: '정리된 사무실·전시장·조용한 레스토랑',
    수: '물가·강변·밤의 산책길·조용한 바',
  };

  return [
    {
      id: 'ds-face',
      heading: '사주가 부르는 상대',
      kicker: 'FACE',
      locked: true,
      freeBlocks,
      blocks: [
        { t: 'kv', v: [
          ['내 일간', `${chart.dayMaster.ko}(${chart.dayMaster.han}) · ${il.keyword}`],
          ['배우자 자리', bu ? `${bu.branchKo}(${bu.branchHan}) · ${buStars.join(' · ') || '공궁'}` : '—'],
          ['내게 없는 기운', missing.length ? missing.join(' · ') : '없음 (균형)'],
          ['지금 대운', `${cur.ko}(${cur.han}) · ${cur.sipsung}`],
        ] },
        { t: 'p', v: il.love[0] },
        { t: 'p', v: missing.length
          ? `당신이 편안해지는 사람은 ${missing.join('·')} 기운을 가진 쪽이에요. ${missing.map((o) => OHAENG_DETAIL[o].need).join(' / ')} 같은 결을 가진 사람 — 말로 설명하기 어렵지만 "옆에 있으면 숨이 편한" 사람입니다.`
          : '오행이 고르게 있어 특정 기운에 끌리기보다, 대화의 리듬이 맞는 사람에게 마음이 갑니다.' },
        { t: 'bar', v: OHAENG.map((o) => ({ label: `${o}`, value: chart.ohaeng.count[o] || 0, max: 5, note: OHAENG_META[o].keyword })) },
      ],
    },
    {
      id: 'ds-temper',
      heading: '그 사람의 온도와 성격',
      kicker: 'TEMPER',
      locked: true,
      freeBlocks: 1,
      blocks: [
        { t: 'p', v: buStars.length
          ? `부처궁 ${bu.branchKo} 자리에 앉은 ${starLine(buStars)} — ${JAMI_STAR_MEANING[buStars[0]]} 이런 결이 배우자 자리에 앉는다는 건, 당신이 그 사람의 "역할"에 끌린다는 뜻이에요.`
          : '배우자 자리가 비어 있는 사주는 상대의 모습이 하나로 정해지지 않습니다. 대신 내가 어떤 삶을 살고 있는지가 그 사람의 조건을 만듭니다.' },
        { t: 'sub', v: `일지 ${chart.pillars.day.branchKo} — ${jj.tone}` },
        { t: 'p', v: jj.line },
        { t: 'p', v: `당신의 사주 온도는 ${chart.ohaeng.temp}°C. ${chart.ohaeng.temp <= 19 ? '차가운 편이라 따뜻한 사람의 온도가 약이 됩니다.' : chart.ohaeng.temp >= 28 ? '뜨거운 편이라 차분한 사람과 있어야 오래갑니다.' : '온화한 편이라 온도가 비슷한 사람과 편안하게 오래 갑니다.'}` },
        { t: 'chips', v: [`강한 기운 ${strongest}`, missing.length ? `필요한 기운 ${missing.join('·')}` : '균형형', `부처궁 ${bu ? bu.branchKo : '—'}`] },
      ],
    },
    {
      id: 'ds-where',
      heading: '어디서, 어떻게 만나나',
      kicker: 'PLACE',
      locked: true,
      freeBlocks: 1,
      blocks: [
        { t: 'p', v: `이 사주는 ${missing.length ? `${missing[0]} 기운` : '균형'}이 채워지는 자리에서 인연을 만나요. ${missing.length ? place[missing[0]] : '일과 취미가 겹치는 자리'}에서 눈이 마주칠 확률이 높습니다.` },
        { t: 'li', v: [
          `만나는 방식 — ${chart.ohaeng.count.금 >= 2 ? '정리된 자리, 소개와 모임을 통해' : '일상의 반복 속에서 천천히'}`,
          `첫 대화의 결 — ${chart.ohaeng.count.수 >= 2 ? '조용하고 깊은 대화. 말수가 적어도 오래 이야기하는 쪽' : '가볍고 웃긴 대화. 그 안에서 진심이 새어 나오는 쪽'}`,
          `주의 — ${chart.ohaeng.count.화 >= 3 ? '첫 만남의 열기에 결정하지 말고 세 번은 만나 보세요.' : '마음이 식기 전에 한 번은 먼저 표현하세요.'}`,
        ] },
      ],
    },
    {
      id: 'ds-when',
      heading: '인연이 오는 시기',
      kicker: 'TIMING',
      locked: true,
      freeBlocks: 1,
      blocks: [
        { t: 'p', v: loveDae.length
          ? `인연의 별(${s1}·${s2})이 들어오는 대운은 ${loveDae.map((x) => `${x.fromAge}~${x.toAge}세(${x.ko})`).join(', ')}예요. 이 시기에 만난 사람은 오래 갑니다.`
          : '남은 대운에 인연의 별이 크게 들어오지는 않아요. 그래서 인연은 "우연"보다 "내가 만든 자리"에서 옵니다.' },
        { t: 'p', v: `지금은 ${cur.ko} 대운 — ${(DAEWOON_TONE[cur.sipsung] || DAEWOON_TONE.비견).up}${next ? ` 다음은 ${next.ko}(${next.sipsung}) 대운, ${next.fromAge}세부터예요.` : ''}` },
        { t: 'p', v: `${chart.sewoon.yearKo}년에는 ${chart.sewoon.list.filter((m) => m.sipsung === s1 || m.sipsung === s2).map((m) => m.monthLabel).join(', ') || '뚜렷한 달이 적고'} 쪽이 인연의 문이 열리는 달입니다.` },
      ],
    },
    {
      id: 'ds-sign',
      heading: '이런 인연이 맞아',
      kicker: 'SIGN',
      locked: true,
      freeBlocks: 1,
      blocks: [
        { t: 'li', v: [
          '대화가 끝난 뒤 피로하지 않은 사람 — 이 사주에게 가장 정확한 신호예요.',
          `${missing.length ? `${missing.join('·')}을 가진 사람` : '온도가 비슷한 사람'}이 편안합니다. 같은 기운만 많은 사람은 처음엔 뜨겁지만 오래가기 어려워요.`,
          '내 시간을 존중해 주는 사람. 이 사주는 혼자 있는 시간이 줄면 마음이 먼저 지칩니다.',
          '말보다 약속을 지키는 사람. 이 사주는 말의 온도보다 반복을 믿습니다.',
        ] },
        { t: 'q', v: `운명의 짝은 "정해진 사람"이 아니라, 당신이 반복해서 선택하는 사람이에요. ${TTI[chart.dii].charm}` },
      ],
    },
  ];
}

/* ─────────────── 자미두수 심층 ─────────────── */
export function jamiDeepSections(chart, jami, { freeBlocks = 2 } = {}) {
  if (!jami) return [];
  const m = jami.myeongPalace;
  const sinPalace = jami.palaces.find((p) => p.isSin);
  const stars = (p) => (p ? (p.empty ? p.borrowed.map((s) => `${s}(빌려옴)`) : p.main).join(' · ') || '비어 있음' : '—');
  const luckyRows = jami.palaces
    .filter((p) => p.lucky.length)
    .map((p) => [p.name, p.branchKo, p.lucky.join(' · '), p.lucky.map((s) => LUCKY_MEANING[s] || '').join(' / ')]);
  const shaRows = jami.palaces.filter((p) => p.sha.length).map((p) => [p.name, p.branchKo, p.sha.join(' · '), p.sha.map((s) => LUCKY_MEANING[s] || '').join(' / ')]);
  const emptyPalaces = jami.palaces.filter((p) => p.empty).map((p) => p.name);

  return [
    {
      id: 'jm-myeong',
      heading: '명궁 · 신궁 · 오행국',
      kicker: 'ZIWEI',
      locked: true,
      freeBlocks,
      blocks: [
        { t: 'kv', v: [
          ['명궁', `${jami.myeongGanji}(${jami.myeongGanjiHan}) · ${jami.gukName}`],
          ['신궁', `${jami.sinBranch} 자리 · ${sinPalace ? sinPalace.name : ''}`],
          ['자미성', `${jami.ziweiBranch} 자리`],
          ['납음', `${jami.naeumName}(${jami.naeum})`],
        ] },
        { t: 'jami', palaces: jami.palaces, myeong: jami.myeong, sin: jami.sin },
        { t: 'p', v: `${stars(m)} — ${m.main.length ? JAMI_STAR_MEANING[m.main[0]] : m.borrowed.length ? JAMI_STAR_MEANING[m.borrowed[0]] : '명궁이 비어 있어 주변의 기운으로 자기 색을 만드는 사주입니다.'}` },
        { t: 'p', v: `명궁은 "내가 어떤 사람인가", 신궁은 "내가 어디에 마음을 두는가"를 봅니다. 명궁 ${jami.myeongBranch} · 신궁 ${jami.sinBranch} — 두 자리가 ${jami.myeong === jami.sin ? '같아서 생각과 행동이 일치하는 편이에요. 대신 고집이 방향을 바꾸기 어렵습니다.' : '달라서 겉으로 보이는 나와 속의 내가 다릅니다. 그 차이를 아는 것이 이 지도를 읽는 이유예요.'}` },
      ],
    },
    {
      id: 'jm-palaces',
      heading: '12궁 전체 읽기',
      kicker: 'TWELVE',
      locked: true,
      freeBlocks: 1,
      blocks: [
        { t: 'table', head: ['궁', '지지', '주성', '길성'], rows: jami.palaces.map((p) => [p.name, `${p.branchKo}(${p.branchHan})`, p.empty ? `공궁 → ${p.borrowed.join('·') || '—'}` : p.main.join(' · '), p.lucky.join(' · ') || '—']) },
        { t: 'p', v: '자미두수는 사주와 다른 각도에서 같은 사람을 봅니다. 사주가 "재료"라면 자미두수는 "배치"예요. 재료가 같아도 어디에 놓이느냐에 따라 삶의 모양이 달라집니다.' },
        { t: 'q', v: '명궁은 나, 부처궁은 관계, 재백궁은 돈을 다루는 손, 관록궁은 일하는 방식입니다.' },
      ],
    },
    {
      id: 'jm-love',
      heading: '부처궁 · 자녀궁 — 사람과의 자리',
      kicker: 'RELATION',
      locked: true,
      freeBlocks: 1,
      blocks: [
        { t: 'sub', v: `부처궁 — ${jami.bucheoPalace.branchKo}(${jami.bucheoPalace.branchHan})` },
        { t: 'p', v: `${stars(jami.bucheoPalace)}. ${jami.bucheoPalace.main.length ? JAMI_STAR_MEANING[jami.bucheoPalace.main[0]] : '공궁은 배우자의 형태를 스스로 정한다는 뜻이에요. 조건보다 내 삶의 형태가 먼저입니다.'}` },
        { t: 'sub', v: `자녀궁 — ${(jami.palaces.find((p) => p.name === '자녀궁') || {}).branchKo || '—'}` },
        { t: 'p', v: `${stars(jami.palaces.find((p) => p.name === '자녀궁'))}. 자녀궁은 자식뿐 아니라 "내가 낳아 기르는 모든 것" — 프로젝트·작품·후배까지 봅니다.` },
      ],
    },
    {
      id: 'jm-money',
      heading: '재백궁 · 관록궁 — 돈과 일',
      kicker: 'WORK',
      locked: true,
      freeBlocks: 1,
      blocks: [
        { t: 'sub', v: `재백궁 — ${jami.jaebaekPalace.branchKo}(${jami.jaebaekPalace.branchHan})` },
        { t: 'p', v: `${stars(jami.jaebaekPalace)}. ${jami.jaebaekPalace.main.length ? JAMI_STAR_MEANING[jami.jaebaekPalace.main[0]] : '재물을 쥐는 자리가 비어 있어, 돈은 스스로 만드는 쪽에 가깝습니다.'}` },
        { t: 'sub', v: `관록궁 — ${jami.gwanrokPalace.branchKo}(${jami.gwanrokPalace.branchHan})` },
        { t: 'p', v: `${stars(jami.gwanrokPalace)}. ${jami.gwanrokPalace.main.length ? JAMI_STAR_MEANING[jami.gwanrokPalace.main[0]] : '일의 자리가 비어 있어 직업의 형태를 스스로 정하는 사주입니다.'}` },
        { t: 'p', v: `사주에서 재물은 ${(sipsungCount(chart)['정재'] || 0) + (sipsungCount(chart)['편재'] || 0)}개의 재성으로 봤어요. 자미두수 재백궁까지 함께 보면 "버는 힘"과 "쥐는 손"을 따로 볼 수 있습니다.` },
      ],
    },
    {
      id: 'jm-lucky',
      heading: '길성 지도',
      kicker: 'LUCKY',
      locked: true,
      freeBlocks: 1,
      blocks: luckyRows.length
        ? [{ t: 'table', head: ['궁', '지지', '길성', '의미'], rows: luckyRows }]
        : [{ t: 'p', v: '길성이 두드러지게 앉은 자리가 없어요. 대신 주성의 힘으로 살아가는 사주입니다. 스스로 만드는 쪽이 이 사주에 맞습니다.' }],
    },
    {
      id: 'jm-trap',
      heading: '함정과 처방',
      kicker: 'TRAP',
      locked: true,
      freeBlocks: 1,
      blocks: [
        { t: 'li', v: [
          emptyPalaces.length ? `공궁인 자리 — ${emptyPalaces.join(' · ')}. 비어 있는 궁은 "없는 것"이 아니라 "맞은편에서 빌려 쓰는 것"이에요. 그 영역에서 남의 도움이 큰 힘이 됩니다.` : '12궁에 모두 주성이 앉아 있어 스스로 판을 짜는 힘이 좋은 사주예요.',
          shaRows.length ? `살성 자리 — ${shaRows.map((r) => `${r[0]}(${r[2]})`).join(', ')}. 급하게 밀어붙이면 그 자리에서 막힙니다. 한 박자 늦추는 것이 처방이에요.` : '두드러진 살성이 없어 큰 막힘 없이 흐르는 편이에요.',
          `명궁 ${jami.myeongBranch}의 결을 살리려면 ${jami.myeongPalace.main.length ? JAMI_STAR_MEANING[jami.myeongPalace.main[0]].split('.')[1] || '그 기운을 매일 한 번씩 쓰는 연습' : '주변의 좋은 기운을 빌려 쓰는 연습'}이 필요합니다.`,
        ] },
        { t: 'q', v: '자미두수는 미래를 맞히는 도구가 아니라, 내 배치를 아는 지도예요. 같은 자리에서도 어디로 걷느냐가 다릅니다.' },
      ],
    },
  ];
}
