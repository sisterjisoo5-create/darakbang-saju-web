// ─── 새 운세 섹션 빌더 (연애운 · 재회운 · 재물운 · 자미두수 심층) ───
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

/* ─────────────── 재물운 ─────────────── */
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

/* ─────────────── 직업 · 이직운 ─────────────── */
// 일의 통로 — 어떤 십성이 강한가로 직업 언어를 고른다 (일반인이 바로 알아듣는 말로)
const WORK_GATE = {
  관성: '규칙이 있는 판에서 오래 버티는 힘이 돈이 되는 사주예요. 조직·직책·자격이 당신의 무기입니다.',
  식상: '만들어서 내놓는 힘이 돈이 되는 사주예요. 결과물이 눈에 보이는 일에서 실력이 드러납니다.',
  인성: '배움과 자격, 사람의 소개가 일의 통로예요. 공부에 쓴 시간이 그대로 몸값이 됩니다.',
  재성: '사고파는 자리, 숫자를 다루는 자리에서 일이 풀려요. 사람과 돈이 오가는 현장이 편합니다.',
  비겁: '내 이름을 걸고 서는 일에서 커지는 사주예요. 남이 만든 판에 얹혀 있으면 힘이 죽습니다.',
};

const WORK_FIELD = {
  관성: ['공공·공기업·대기업처럼 규칙이 분명한 조직', '인사·총무·운영·품질처럼 관리하는 자리', '자격증이 필요한 전문직(회계·노무·간호)', '사람을 이끄는 중간 관리자'],
  식상: ['콘텐츠·영상·디자인처럼 만들어 내놓는 일', '기술·개발·제조처럼 손으로 결과를 남기는 일', '요리·공방·클래스처럼 결과물이 바로 보이는 일', '내가 만든 것을 파는 강의·컨설팅'],
  인성: ['교육·연구·기획처럼 파고들어 정리하는 일', '문서·번역·편집처럼 글로 남기는 일', '자격과 자문이 필요한 전문 영역', '배운 것을 가르치는 일(강사·튜터)'],
  재성: ['영업·MD·구매처럼 사고파는 자리', '금융·보험·부동산처럼 숫자를 다루는 일', '유통·물류처럼 흐름을 관리하는 일', '작은 사업·온라인 판매처럼 내가 계산하는 일'],
  비겁: ['1인 사업·프리랜서처럼 내 이름이 걸린 일', '전문직·개인 브랜드', '동업보다 혼자 책임지는 자리', '성과가 내 몫으로 남는 영업'],
};

const WORK_GATE_CAUTION = {
  관성: '규칙이 잦은 조직에서 답답함을 느끼면, 자리를 옮기기보다 맡는 일의 범위를 넓히는 쪽이 먼저예요.',
  식상: '만드는 일이 재미만 있고 값이 안 매겨지면 오래 못 갑니다. 결과물에 가격표를 붙이는 연습이 필요해요.',
  인성: '배움만 쌓고 실행이 늦으면 기회가 지나가요. 공부는 반년, 실행은 반년으로 나눠 두세요.',
  재성: '돈이 오가는 자리는 새는 곳도 큽니다. 손절 기준을 숫자로 정해 두세요.',
  비겁: '혼자 다 짊어지면 몸이 먼저 지쳐요. 사람을 쓰는 일을 미루지 마세요.',
};

const WORK_DAE = {
  정관: '자리가 잡히는 시기 — 승진·시험·직책',
  편관: '압박 속에서 실력이 증명되는 시기 — 몸 관리 필수',
  정재: '고정 수입이 두꺼워지는 시기 — 한 곳에 깊게',
  편재: '돈이 도는 자리로 이동 — 영업·사업',
  식신: '만드는 일이 값이 되는 시기 — 결과물을 쌓기',
  상관: '이름을 알리는 시기 — 다만 말조심',
  정인: '배움·자격이 몸값이 되는 시기',
  편인: '전문성이 깊어지는 시기 — 혼자 파고들기',
  비견: '내 이름으로 서는 시기',
  겁재: '동업·경쟁이 얽히는 시기 — 문서로 남기기',
};

const WORK_TEMP = (t) => {
  if (t <= 13) return '혼자 조용히 파고드는 일에서 집중이 오래 갑니다. 회의가 많은 자리보다 맡은 일을 끝까지 해내는 자리에서 인정받아요.';
  if (t <= 19) return '차분하게 준비하고 마무리하는 힘이 좋아요. 빨리 시키는 자리보다 정확함이 값이 되는 자리에서 빛납니다.';
  if (t <= 25.5) return '사람과 속도에 무리 없이 맞추는 편이에요. 여럿이 맞물려 돌아가는 자리에서 실력이 드러납니다.';
  if (t <= 31) return '먼저 움직여 사람을 끌고 가는 힘이 있어요. 추진이 필요한 자리에서 인정받습니다.';
  return '열과 속도가 강점이에요. 다만 식히는 시간 없이 달리면 탈이 먼저 옵니다. 마감 뒤 회복을 일정에 넣으세요.';
};

/** 일의 그릇 · 이직 온도 — 같은 명식이면 언제나 같은 값 */
export function careerReading(chart, jami) {
  const sc = sipsungCount(chart);
  const gwan = (sc['편관'] || 0) + (sc['정관'] || 0);
  const sik = (sc['식신'] || 0) + (sc['상관'] || 0);
  const inCount = (sc['정인'] || 0) + (sc['편인'] || 0);
  const bi = (sc['비견'] || 0) + (sc['겁재'] || 0);
  const jae = (sc['편재'] || 0) + (sc['정재'] || 0);
  const fit = clampN(46 + gwan * 8 + sik * 6 + inCount * 5 + jae * 3 - Math.max(0, bi - 2) * 4, 30, 96);
  const band = fit >= 82
    ? { title: '판을 고를 수 있는 사주', line: '일이 안 풀리는 게 아니라 판이 안 맞았을 때 크게 흔들리는 사주예요. 자리를 고르는 눈이 곧 실력입니다.' }
    : fit >= 68
      ? { title: '쌓아서 자리를 만드는 사주', line: '한 번에 크게 뛰기보다 한 곳에서 깊어질 때 값이 오르는 사주예요. 3년을 채우면 다음 문이 열립니다.' }
      : fit >= 54
        ? { title: '환경이 실력을 결정하는 사주', line: '내 힘만으로 밀어붙이기보다 좋은 사람과 좋은 판을 만나야 커지는 사주예요. 옮길 때 사람을 먼저 보세요.' }
        : { title: '내 이름으로 서야 풀리는 사주', line: '조직의 문법이 몸에 안 맞는 사주예요. 작게라도 내 이름이 걸린 일을 만들어야 힘이 살아납니다.' };
  const gate = gwan >= 2 ? '관성' : sik >= 2 ? '식상' : inCount >= 2 ? '인성' : jae >= 2 ? '재성' : bi >= 2 ? '비겁' : '관성';
  const { cur, next } = currentDaewoon(chart);
  const months = chart.sewoon.list;
  const goodMonths = months.filter((m) => ['정관', '편관', '정인'].includes(m.sipsung));
  const hardMonths = months.filter((m) => ['상관', '겁재', '편인'].includes(m.sipsung));
  const gwanDaeAll = chart.daewoon.list.filter((x) => ['정관', '편관'].includes(x.sipsung));
  const gwanDae = gwanDaeAll.filter((x) => x.toAge >= cur.fromAge);
  const curGwan = ['정관', '편관'].includes(cur.sipsung);
  const curSik = ['식신', '상관'].includes(cur.sipsung);
  const move = clampN(
    44 + (curGwan ? 12 : 0) + (curSik ? 6 : 0) + gwan * 5 + (sc['상관'] || 0) * 3 + goodMonths.length * 2 - (sc['정인'] || 0) * 2,
    25, 95,
  );
  const moveBand = move >= 78
    ? { title: '지금 옮겨도 되는 사주', line: '문이 열려 있는 시기예요. 다만 뛰기 전에 다음 자리를 정하고 움직이세요.' }
    : move >= 64
      ? { title: '준비하고 옮기는 사주', line: '옮기는 힘은 있지만 지금은 조건을 맞추는 시기예요. 반년 안에 움직이려면 서류와 실적을 지금 정리하세요.' }
      : move >= 50
        ? { title: '자리를 지키며 힘을 기르는 사주', line: '지금 옮기면 같은 문제를 다른 회사에서 다시 만나요. 이 자리에서 하나를 끝내는 편이 낫습니다.' }
        : { title: '지금은 옮기지 않는 사주', line: '문이 닫힌 게 아니라 내 안을 채우는 때예요. 몸과 실력을 채우고 다음 문을 보세요.' };
  const gwanrok = jami ? jami.gwanrokPalace : null;
  const gwanrokStars = gwanrok ? (gwanrok.empty ? gwanrok.borrowed : gwanrok.main) : [];
  return {
    fit, band, gate, gwan, sik, inCount, bi, jae, cur, next, move, moveBand,
    goodMonths, hardMonths, gwanDae, gwanDaeAll, curGwan, gwanrok, gwanrokStars,
  };
}

export function careerSections(chart, jami, { freeBlocks = 2 } = {}) {
  const il = ILGAN[chart.dayMaster.ko];
  const jj = JIJI[chart.pillars.day.branchKo];
  const c = careerReading(chart, jami);
  const curTone = DAEWOON_TONE[c.cur.sipsung] || DAEWOON_TONE.비견;
  const temp = chart.ohaeng.temp;
  const gwanrokText = c.gwanrok
    ? `자미두수 관록궁(일의 자리)은 ${c.gwanrok.branchKo}(${c.gwanrok.branchHan}) 자리이고, ${c.gwanrokStars.length ? `${starLine(c.gwanrokStars)}이 앉아 있어요. ${JAMI_STAR_MEANING[c.gwanrokStars[0]]}` : '비어 있어 맞은편 기운을 빌려 씁니다. 일의 형태를 스스로 정하는 사주예요.'}`
    : '태어난 시간을 몰라 자미두수 관록궁은 계산하지 않았어요. 시간을 넣으면 일의 자리까지 12칸으로 한 번 더 읽어 드립니다.';

  return [
    {
      id: 'cr-vessel',
      heading: '일의 그릇',
      kicker: 'WORK',
      locked: true,
      freeBlocks,
      blocks: [
        { t: 'score', value: c.fit, label: c.band.title, note: c.band.line },
        { t: 'kv', v: [
          ['일간', `${chart.dayMaster.ko}(${chart.dayMaster.han}) · ${il.keyword}`],
          ['일지', `${chart.pillars.day.branchKo}(${chart.pillars.day.branchHan}) · ${jj.tone}`],
          ['관성(편관+정관)', `${c.gwan}개 — 조직·직책의 힘`],
          ['식상(식신+상관)', `${c.sik}개 — 만들어 내놓는 힘`],
          ['인성(정인+편인)', `${c.inCount}개 — 배움·자격의 힘`],
          ['지금 대운', `${c.cur.ko}(${c.cur.han}) · ${c.cur.sipsung}`],
        ] },
        { t: 'p', v: il.job[0] },
        { t: 'bar', v: OHAENG.map((o) => ({ label: `${o}(${OHAENG_META[o].han})`, value: chart.ohaeng.count[o] || 0, max: 4, note: OHAENG_META[o].keyword })) },
        { t: 'p', v: `사주 온도 ${temp}°C(${tempWord(temp)})는 일하는 방식에도 그대로 나와요. ${WORK_TEMP(temp)}` },
        { t: 'p', v: il.job[1] },
      ],
    },
    {
      id: 'cr-field',
      heading: '어떤 판이 맞나',
      kicker: 'FIELD',
      locked: true,
      freeBlocks: 1,
      blocks: [
        { t: 'p', v: `이 사주의 일의 통로는 ${c.gate}이에요. ${WORK_GATE[c.gate]}` },
        { t: 'li', v: WORK_FIELD[c.gate] },
        { t: 'p', v: `조심할 것 — ${WORK_GATE_CAUTION[c.gate]}` },
        { t: 'sub', v: '자미두수로 보는 일의 자리' },
        { t: 'p', v: gwanrokText },
        { t: 'chips', v: [`${il.keyword}`, `일의 통로: ${c.gate}`, `일의 그릇 ${c.fit}점`] },
      ],
    },
    {
      id: 'cr-now',
      heading: '지금 회사에서의 내 자리',
      kicker: 'NOW',
      locked: true,
      freeBlocks: 1,
      blocks: [
        { t: 'kv', v: [
          ['현재 대운', `${c.cur.ko}(${c.cur.han}) · ${c.cur.fromAge}~${c.cur.toAge}세`],
          ['다음 대운', c.next ? `${c.next.ko}(${c.next.han}) · ${c.next.fromAge}세부터` : '—'],
          ['앞으로 관성 대운', c.gwanDae.length ? c.gwanDae.map((x) => `${x.fromAge}~${x.toAge}세(${x.ko})`).join(', ') : '뚜렷하게 오지 않음'],
          ['대운 방향', chart.daewoon.forward ? '순행' : '역행'],
        ] },
        { t: 'sub', v: `${c.cur.ko} · ${curTone.title}` },
        { t: 'p', v: `${curTone.up} ${curTone.down}` },
        { t: 'p', v: `지금 대운이 일간 ${chart.dayMaster.ko}에게 들어오는 결은 ${c.cur.sipsung}이에요. ${SIPSUNG_DETAIL[c.cur.sipsung] ? SIPSUNG_DETAIL[c.cur.sipsung].money : ''}` },
        { t: 'p', v: c.gwan >= 2
          ? '관성이 두 개 이상이라 조직의 규칙을 이해하는 힘이 좋아요. 그래서 회사 안에서 자리를 잡는 데 강합니다. 대신 규칙이 맞지 않는 조직에서는 닷새 만에 지칩니다.'
          : '관성이 많지 않은 사주예요. 회사 안에서 \"자리\"보다 \"일\"로 인정받는 쪽이 맞습니다. 직급보다 맡은 일의 이름을 키우세요.' },
      ],
    },
    {
      id: 'cr-move',
      heading: '이직 타이밍',
      kicker: 'TIMING',
      locked: true,
      freeBlocks: 1,
      blocks: [
        { t: 'score', value: c.move, label: c.moveBand.title, note: c.moveBand.line },
        { t: 'p', v: `지금은 ${c.cur.ko}(${c.cur.han}) 대운 ${c.cur.fromAge}~${c.cur.toAge}세 — ${c.curGwan ? '관성의 대운이라 조직과 자격이 힘을 받는 시기예요. 이직보다 승진·이동 같은 \"자리\"의 변화가 잘 붙습니다.' : c.cur.sipsung === '상관' ? '상관의 대운이라 지금 회사의 방식이 유난히 답답하게 느껴지는 시기예요. 감정으로 사표를 쓰지 말고 조건으로 판단하세요.' : `${curTone.title}이에요. 이 시기의 변화는 \"옮기는 것\"보다 \"무엇을 할 것인가\"에서 갈립니다.`}` },
        { t: 'p', v: c.goodMonths.length
          ? `${chart.sewoon.yearKo}년에는 ${c.goodMonths.map((m) => m.monthLabel).join(', ')}에 면접·제안·발표가 잘 붙어요. 서류를 넣는 시점은 그 달의 앞 한 달이 좋습니다.`
          : `${chart.sewoon.yearKo}년에는 자리 변화가 크게 도드라지는 달이 적어요. 이 해는 포트폴리오와 실적을 쌓고, 다음 해 초에 움직이는 편이 낫습니다.` },
        { t: 'p', v: c.hardMonths.length
          ? `반대로 ${c.hardMonths.map((m) => m.monthLabel).join(', ')}은 말이 세지고 비교가 많아지는 달이에요. 이 달에 사표를 쓰거나 연봉 협상을 하면 손해가 남습니다.`
          : '올해는 크게 부딪히는 달이 적어요. 다만 결정을 미루는 사이에 좋은 자리가 지나갈 수 있습니다.' },
        { t: 'table', head: ['대운', '나이', '십성', '일의 결'], rows: chart.daewoon.list.slice(0, 6).map((x) => [`${x.ko}(${x.han})`, `${x.fromAge}~${x.toAge}세`, x.sipsung, WORK_DAE[x.sipsung] || '판을 정리하는 시기']) },
      ],
    },
    {
      id: 'cr-decide',
      heading: '옮길까, 남을까 — 체크리스트',
      kicker: 'DECIDE',
      locked: true,
      freeBlocks: 1,
      blocks: [
        { t: 'li', v: [
          c.move >= 70 ? '지금은 문이 열린 쪽이에요. \"지금 회사에서 1년 더 배울 것이 있는가\"에 답이 없다면 움직이세요.' : '지금은 문이 반쯤 닫힌 쪽이에요. 옮기고 싶은 이유를 세 줄로 적어 보세요. 그중 두 줄이 사람 때문이라면 회사를 바꿔도 반복됩니다.',
          c.gwan >= 2 ? '관성이 강한 사주는 \"자리\"가 곧 실력이에요. 같은 일이라면 직급·권한이 있는 쪽을 고르세요.' : '직급보다 일의 이름이 중요해요. 명함에 적힐 일의 이름을 먼저 확인하세요.',
          c.jae >= 2 ? '재성이 있어 연봉 협상에서 밀리지 않는 편이에요. 숫자를 먼저 말하는 쪽이 유리합니다.' : '연봉은 한 번에 크게 올리기보다, 3년 뒤 조건을 문서로 남기는 쪽이 이 사주에 맞아요.',
          c.inCount >= 2 ? '인성이 있어 배우는 자리가 값이 됩니다. 교육·자격 지원이 있는 회사를 조건에 넣으세요.' : '배움보다 실전에서 늡니다. 작은 회사라도 직접 해보는 자리가 유리해요.',
          '옮기기 전에 \"이 회사에서 끝낼 수 있는 것 하나\"를 정해서 끝내세요. 미완의 일은 다음 회사에서도 같은 모양으로 따라옵니다.',
        ] },
        { t: 'p', v: `일은 사주가 정해 주지 않아요. 다만 어느 판에서 힘이 나고 어느 판에서 지치는지는 여덟 글자가 말해 줍니다. ${c.band.title} — ${c.moveBand.title}이 지금의 답이에요.` },
        { t: 'q', v: '좋은 이직은 도망이 아니라, 내가 힘을 낼 수 있는 판으로 옮기는 일이에요.' },
      ],
    },
  ];
}
