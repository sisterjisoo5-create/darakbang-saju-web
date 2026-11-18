// 리포트 빌더 — 상품별 섹션 조립
// 블록 타입: p(문단) q(인용) li(목록) kv(표) bar(막대) table(표) score(점수) chips(태그) sub(소제목) jami(자미두수 12궁)

import {
  ILGAN, JIJI, TTI, SIPSUNG_DETAIL, OHAENG_DETAIL, JAMI_STAR_MEANING, DAEWOON_TONE, JAMI_STAR_MEANING as JSM,
} from './data.js';
import { OHAENG, OHAENG_META, SIPSUNG, BRANCHES } from '../engine/constants.js';
import { sipsungOf } from '../engine/saju.js';
import { computeCompat, compatVerdict } from '../engine/compat.js';
import { todayFortune } from '../engine/today.js';
import { productById } from '../config/products.js';
import {
  loveSections, reunionSections, reunionReading, wealthSections, wealthReading,
  destinySections, jamiDeepSections,
} from './report-extra.js';

const deg = (t) => `${t}°C`;

function tempWord(t) {
  if (t <= 13) return '얼음장처럼 차가운';
  if (t <= 19) return '서늘한';
  if (t <= 25.5) return '온화한';
  if (t <= 31) return '따뜻한';
  return '뜨거운';
}

function sipsungCount(chart) {
  const list = [
    chart.sipsung.year, chart.sipsung.month, chart.sipsung.hour,
    chart.sipsung.yearBranch, chart.sipsung.monthBranch, chart.sipsung.dayBranch, chart.sipsung.hourBranch,
  ].filter(Boolean);
  const count = {};
  for (const s of list) count[s] = (count[s] || 0) + 1;
  return count;
}

function sipsungText(key) {
  const c = SIPSUNG[key];
  return c ? `${key}(${c.han}) — ${c.tag}` : key;
}

/** ─── 공통 섹션 ─────────────────────────────── */

export function secWonyouk(chart, { free = true } = {}) {
  const p = chart.pillars;
  const rows = [
    ['년주', p.year.ko, p.year.han, chart.sipsung.year, p.year.full],
    ['월주', p.month.ko, p.month.han, chart.sipsung.month, p.month.full],
    ['일주', p.day.ko, p.day.han, '나(일간)', p.day.full],
    ['시주', p.hour ? p.hour.ko : '시간 미상', p.hour ? p.hour.han : '—', p.hour ? chart.sipsung.hour : '—', p.hour ? p.hour.full : '—'],
  ];
  const il = ILGAN[chart.dayMaster.ko];
  return {
    id: 'wonyouk',
    heading: '내 원국 여덟 글자',
    kicker: 'MYEONG',
    locked: !free,
    freeBlocks: free ? 99 : 0,
    blocks: [
      { t: 'table', head: ['구분', '간지', '한자', '십성', '결'], rows },
      { t: 'kv', v: [['사주 온도', `${deg(chart.ohaeng.temp)} · ${tempWord(chart.ohaeng.temp)} 사주`], ['띠 · 일주', `${chart.dii}띠 × ${chart.iljuAnimal}`], ['태어난 달의 절기', `${chart.monthTerm.ko} 이후 — ${chart.pillars.month.ko}월`]] },
      { t: 'q', v: `일간은 ${chart.dayMaster.ko}(${chart.dayMaster.han}) — ${il.keyword}. ${il.charm}` },
    ],
  };
}

export function secPersonality(chart, { freeBlocks = 1 } = {}) {
  const il = ILGAN[chart.dayMaster.ko];
  const jj = JIJI[chart.pillars.day.branchKo];
  const sc = sipsungCount(chart);
  const top = Object.entries(sc).sort((a, b) => b[1] - a[1])[0];
  return {
    id: 'personality',
    heading: '타고난 성격',
    kicker: 'NATURE',
    locked: true,
    freeBlocks,
    blocks: [
      { t: 'p', v: il.personality[0] },
      { t: 'sub', v: `${chart.dayMaster.ko}일간의 결` },
      { t: 'p', v: il.personality[1] },
      { t: 'p', v: il.personality[2] },
      { t: 'sub', v: `일지 ${chart.pillars.day.branchKo}(${chart.pillars.day.branchHan}) — ${jj.tone}` },
      { t: 'p', v: jj.line },
      { t: 'sub', v: `십성 분포 — ${top ? sipsungText(top[0]) : ''}` },
      { t: 'li', v: Object.entries(sc).map(([k, v]) => `${sipsungText(k)} × ${v}개`).slice(0, 6) },
      { t: 'q', v: `${chart.dayMaster.ko}일간이 놓인 자리는 ${top && SIPSUNG_DETAIL[top[0]] ? SIPSUNG_DETAIL[top[0]].line : '고른 기운'}입니다. ${top && SIPSUNG_DETAIL[top[0]] ? SIPSUNG_DETAIL[top[0]].love : ''}` },
      { t: 'sub', v: `오행으로 보는 기질 — ${chart.ohaeng.strongest} ${chart.ohaeng.count[chart.ohaeng.strongest]}개` },
      { t: 'p', v: OHAENG_DETAIL[chart.ohaeng.strongest].excess },
      chart.ohaeng.missing.length
        ? { t: 'p', v: `${chart.ohaeng.missing.map((o) => OHAENG_DETAIL[o].lack).join(' ')}` }
        : { t: 'p', v: '다섯 기운이 모두 있는 사주예요. 극단으로 치우치지 않는 대신, 스스로 균형을 만들어야 하는 결입니다. 컨디션이 흔들릴 때 어느 기운이 과해졌는지 살펴보면 원인이 보여요.' },
      { t: 'p', v: `그림자: ${il.shadow}` },
      { t: 'chips', v: [`보완이 필요한 기운: ${chart.ohaeng.missing.length ? chart.ohaeng.missing.join(' · ') : '균형 유지'}`, `처방: ${chart.ohaeng.missing.length ? OHAENG_DETAIL[chart.ohaeng.missing[0]].need : OHAENG_DETAIL[chart.ohaeng.strongest].need}`] },
    ],
  };
}

export function secMoney(chart, { freeBlocks = 1 } = {}) {
  const il = ILGAN[chart.dayMaster.ko];
  const sc = sipsungCount(chart);
  const jae = (sc['편재'] || 0) + (sc['정재'] || 0);
  const sik = (sc['식신'] || 0) + (sc['상관'] || 0);
  const bi = (sc['비견'] || 0) + (sc['겁재'] || 0);
  const lack = chart.ohaeng.missing;
  return {
    id: 'money',
    heading: '재물 그릇',
    kicker: 'MONEY',
    locked: true,
    freeBlocks,
    blocks: [
      { t: 'p', v: il.money[0] },
      { t: 'bar', v: OHAENG.map((o) => ({ label: `${o}(${OHAENG_META[o].han})`, value: chart.ohaeng.count[o] || 0, max: 4, note: OHAENG_META[o].keyword })) },
      { t: 'kv', v: [['재성(편재+정재)', `${jae}개`], ['식상(식신+상관)', `${sik}개`], ['비겁(비견+겁재)', `${bi}개`]] },
      { t: 'p', v: `재성이 ${jae}개면 ${jae === 0 ? '스스로 재물을 만들어내는 힘에 비해 재물이 머무는 그릇은 작은 편이에요. 들어오는 길을 의식적으로 만들어야 합니다.' : jae === 1 ? '한 곳에서 새는 구멍을 막는 힘이 좋아요. 크게 벌기보다 안정적으로 모으는 구조가 맞습니다.' : '재물을 다루는 손이 큽니다. 다만 그만큼 새는 곳도 커서, 지출 항목을 나눠두는 것이 중요해요.'}` },
      { t: 'p', v: il.money[1] },
      { t: 'sub', v: '내 사주에서 재물이 새는 지점' },
      { t: 'li', v: [
        lack.includes('토') ? '중심(토)이 비어 있어 충동적인 결제로 새기 쉬워요. 결제 전 하루를 두는 규칙이 약이 됩니다.' : '규칙적인 지출 관리가 잘 되는 편이에요. 고정비 점검만으로도 새는 돈이 막힙니다.',
        bi >= 2 ? '비겁이 강해 사람 때문에 돈이 나가는 구조예요. 보증·대여·동업은 반드시 문서로 남기세요.' : '사람에게 쓰는 돈은 통제가 되는 편이에요.',
        jae >= 2 ? '재성이 많아 기회가 여러 번 오지만, 잘못 고르면 한 번에 크게 잃어요. 손절 기준을 미리 정하세요.' : '한 번 벌면 오래 지키는 결이에요.',
      ] },
      { t: 'q', v: '돈은 "버는 힘"보다 "머무는 그릇"이 먼저예요. 그릇은 습관으로 커집니다.' },
    ],
  };
}

export function secJob(chart, { freeBlocks = 1 } = {}) {
  const il = ILGAN[chart.dayMaster.ko];
  const sc = sipsungCount(chart);
  const gwan = (sc['편관'] || 0) + (sc['정관'] || 0);
  return {
    id: 'job',
    heading: '일과 직업',
    kicker: 'WORK',
    locked: true,
    freeBlocks,
    blocks: [
      { t: 'p', v: il.job[0] },
      { t: 'p', v: il.job[1] },
      { t: 'kv', v: [['관성(편관+정관)', `${gwan}개`], ['일에 강한 결', gwan >= 2 ? '조직·책임·직책' : '자유도·전문성·기획'], ['빛나는 환경', chart.ohaeng.count.화 >= 2 ? '사람 앞, 무대, 전달하는 자리' : '조용히 깊게 파는 자리']] },
      { t: 'sub', v: '이 사주가 돈이 되는 방식' },
      { t: 'li', v: [
        `${chart.dayMaster.ko}일간의 강점인 "${il.keyword}"를 직업 언어로 옮기면, ${il.job[0].split('—')[0].trim()} 쪽이에요.`,
        sc['식신'] || sc['상관'] ? '식상이 있어 "만들어서 내놓는" 일이 재물로 이어져요. 콘텐츠·기술·손재주를 살리세요.' : '식상이 약한 편이라 직접 만드는 일보다 판을 운영하는 자리가 맞아요.',
        sc['정인'] || sc['편인'] ? '인성이 있어 배움이 곧 실력이 됩니다. 자격·공부에 투자한 만큼 돌아와요.' : '배움보다 실행에서 답을 찾는 사람이에요. 일단 시작하세요.',
      ] },
      { t: 'p', v: `경계할 것 — ${chart.dayMaster.ko}일간은 ${chart.ohaeng.count.금 >= 2 ? '기준이 세서 동료를 지치게 할 수 있어요. 말을 고르는 연습이 필요합니다.' : '관계에서 상처받는 걸 두려워해 기회를 미룹니다. 지원하고 실패하는 편이 낫습니다.'}` },
      { t: 'sub', v: '일에서의 재능 — 십성으로 보기' },
      { t: 'li', v: Object.entries(sc).filter(([k]) => ['식신', '상관', '정관', '편관', '정인', '편인', '정재', '편재'].includes(k)).map(([k, v]) => `${k} × ${v} — ${SIPSUNG_DETAIL[k].money}`) },
    ],
  };
}

export function secLove(chart, jami, { freeBlocks = 1 } = {}) {
  const il = ILGAN[chart.dayMaster.ko];
  const bu = jami ? jami.bucheoPalace : null;
  const buStars = bu ? (bu.empty ? bu.borrowed : bu.main) : [];
  const buText = buStars.map((s) => `${s}(${JSM[s].split('.')[0]})`).join(' · ');
  return {
    id: 'love',
    heading: '연애와 배우자',
    kicker: 'LOVE',
    locked: true,
    freeBlocks,
    blocks: [
      { t: 'p', v: il.love[0] },
      { t: 'p', v: il.love[1] },
      bu ? { t: 'sub', v: `자미두수 부처궁 — ${bu.branchKo}(${bu.branchHan}) 자리` } : { t: 'sub', v: '배우자 자리' },
      bu ? { t: 'p', v: `${bu.empty ? `부처궁이 비어 있어 맞은편 ${BRANCHES[(bu.branch + 6) % 12].ko}의 기운을 빌려옵니다. ` : ''}${buText ? `${buText}의 결이 배우자 자리에 앉아요. ` : ''}${buStars.length ? JSM[buStars[0]] : '배우자 자리가 비어 있는 사주는 관계의 형태를 스스로 정하는 힘이 큽니다.'}` } : null,
      { t: 'p', v: `그래서 당신에게 맞는 사람은 ${chart.ohaeng.missing.length ? `당신에게 없는 ${chart.ohaeng.missing.join('·')} 기운을 가진 사람` : '당신의 온도를 이해하는 사람'}이에요. ${chart.ohaeng.missing.length ? `${chart.ohaeng.missing.join('·')}이 강한 사람과 만나면 마음이 편안해지고, 반대로 같은 기운만 많은 사람과는 편하지만 설렘이 오래가지 않아요.` : ''}` },
      { t: 'q', v: '배우자 자리는 "어떤 사람이 오는가"가 아니라 "내가 어떤 사람에게 문을 여는가"를 보여주는 자리예요.' },
    ].filter(Boolean),
  };
}

export function secToday(chart, now) {
  const f = todayFortune(chart, now);
  return {
    id: 'today',
    heading: '오늘의 다락방 처방',
    kicker: 'TODAY',
    locked: false,
    freeBlocks: 99,
    blocks: [
      { t: 'kv', v: [['오늘의 일진', `${f.ganji}(${f.ganjiHan}) · ${f.dateLabel}`], ['오늘의 온도', `${f.score}점`], ['행운의 색 · 숫자', `${f.lucky.color} · ${f.lucky.number}`], ['좋은 시간', f.lucky.time]] },
      { t: 'p', v: f.line },
      { t: 'li', v: f.notes },
    ],
  };
}

export function secJami(chart, jami, { freeBlocks = 1 } = {}) {
  if (!jami) return null;
  const m = jami.myeongPalace;
  const jae = jami.jaebaekPalace;
  const gwan = jami.gwanrokPalace;
  const stars = (p) => (p.empty ? p.borrowed.map((s) => `${s}(빌려옴)`) : p.main).join(' · ');
  return {
    id: 'jami',
    heading: '자미두수 — 명궁 · 부처궁 · 재백궁',
    kicker: 'ZIWEI',
    locked: true,
    freeBlocks,
    blocks: [
      { t: 'kv', v: [['명궁', `${jami.myeongGanji}(${jami.myeongGanjiHan}) · ${jami.gukName}`], ['신궁', `${jami.sinBranch} 자리`], ['자미성 자리', `${jami.ziweiBranch}`]] },
      { t: 'jami', palaces: jami.palaces, myeong: jami.myeong, sin: jami.sin },
      { t: 'sub', v: `명궁 — ${jami.myeongBranch} 자리` },
      { t: 'p', v: `${stars(m)}. ${m.main.length ? JSM[m.main[0]] : m.borrowed.length ? JSM[m.borrowed[0]] : ''}` },
      { t: 'sub', v: `재백궁 — ${jae.branchKo} 자리 (돈을 대하는 방식)` },
      { t: 'p', v: `${stars(jae) || '비어 있음'}. ${jae.main.length ? JSM[jae.main[0]] : '맞은편 기운을 빌려 쓰는 자리라, 재물은 스스로 만드는 쪽에 가깝습니다.'}` },
      { t: 'sub', v: `관록궁 — ${gwan.branchKo} 자리 (일의 방식)` },
      { t: 'p', v: `${stars(gwan) || '비어 있음'}. ${gwan.main.length ? JSM[gwan.main[0]] : ''}` },
      { t: 'q', v: '자미두수는 같은 사주를 다른 각도에서 보는 지도예요. 명궁은 나, 부처궁은 관계, 재백궁은 돈을 다루는 손입니다.' },
    ],
  };
}

/** 2027 신년운세 */
function sewoonSections(chart, { freeBlocks = 2 } = {}) {
  const sw = chart.sewoon;
  const dayEl = OHAENG[0];
  void dayEl;
  const scores = sw.list.map((m) => {
    let s = 62;
    const key = m.sipsung;
    const bonus = { 식신: 8, 정재: 10, 정관: 8, 정인: 7, 편재: 5, 비견: 2, 겁재: -3, 상관: -4, 편관: -6, 편인: -2 }[key] || 0;
    s += bonus;
    if (m.branch === chart.dayBranch) s += 5;
    if (m.branch === (chart.dayBranch + 6) % 12) s -= 8;
    if (m.branch === chart.yearBranch) s += 4;
    s += ((m.order * 7 + chart.dayStem * 3) % 7) - 3;
    return { ...m, score: Math.max(45, Math.min(95, s)) };
  });
  const worst = [...scores].sort((a, b) => a.score - b.score).slice(0, 3);
  const best = [...scores].sort((a, b) => b.score - a.score).slice(0, 3);
  return [
    {
      id: 'ny-open',
      heading: '2027 정미년 — 한 해의 문',
      kicker: '2027',
      locked: true,
      freeBlocks,
      blocks: [
        { t: 'p', v: `2027년은 ${sw.yearKo}(${sw.yearHan})년입니다. 당신의 일간 ${chart.dayMaster.ko}에게 올해의 간지 ${sw.yearKo.slice(0, 1)}은 ${sipsungText(sipsungOf(chart.dayStem, sw.yearStem))}의 결로 들어옵니다.` },
        { t: 'p', v: `신년운세는 "무슨 일이 일어난다"를 맞히는 것이 아니라, 어느 달에 문이 열리고 어느 달에 힘을 빼야 하는지를 알려주는 지도예요. ${chart.ohaeng.label} 사주에 2027년은 ${chart.ohaeng.count.화 >= 2 ? '이미 뜨거운 온도에 불이 더해지는 해' : '부족했던 온기를 채우는 해'}입니다.` },
        { t: 'kv', v: [['올해 가장 좋은 달', best.map((b) => `${b.monthLabel}(${b.ko})`).join(', ')], ['힘을 빼야 할 달', worst.map((b) => `${b.monthLabel}(${b.ko})`).join(', ')]] },
        { t: 'p', v: `가장 좋은 달은 ${best[0].monthLabel}이에요. 이 달에는 미뤄둔 결정을 미루지 마세요. 반대로 ${worst[0].monthLabel}은 새 일을 벌이기보다 정리하는 달로 쓰면 손해가 적습니다.` },
      ],
    },
    {
      id: 'ny-months',
      heading: '월별 흐름 12개',
      kicker: 'MONTHLY',
      locked: true,
      freeBlocks: 1,
      blocks: [
        { t: 'bar', v: scores.map((m) => ({ label: `${m.monthLabel} ${m.ko}`, value: m.score, max: 100, note: m.sipsung })) },
        { t: 'table', head: ['월', '월건', '십성', '온도', '한 줄'], rows: scores.map((m) => [m.monthLabel, m.ko, m.sipsung, `${m.score}`, monthLine(m)]) },
      ],
    },
    {
      id: 'ny-caution',
      heading: '주의할 달 3곳',
      kicker: 'CAUTION',
      locked: true,
      freeBlocks: 1,
      blocks: [
        { t: 'li', v: worst.map((w) => `${w.monthLabel}(${w.ko}) — ${cautionLine(w, chart)}`) },
        { t: 'p', v: '이 달들은 "안 좋은 달"이 아니라 "에너지가 밖으로 새기 쉬운 달"이에요. 큰 결제, 큰 말, 큰 결심을 이 달에 몰아두지 않으면 오히려 해가 됩니다.' },
      ],
    },
    {
      id: 'ny-points',
      heading: '재물 · 관계 · 일',
      kicker: 'POINT',
      locked: true,
      freeBlocks: 2,
      blocks: [
        { t: 'sub', v: '재물' },
        { t: 'p', v: `${chart.ohaeng.count.금 >= 2 ? '금이 강한 사주라 2027년에는 지출 결단이 빨라져요. 좋은 결단이지만, 감정이 올라온 날의 결제는 피하세요.' : '2027년의 재물은 새는 곳을 막는 데서 옵니다. 구독·고정비를 한 번 정리하면 체감이 큽니다.'}` },
        { t: 'sub', v: '관계' },
        { t: 'p', v: `${chart.ohaeng.count.화 === 0 ? '화가 비어 있는 사주에게 2027년은 사람의 온기가 절실해지는 해예요. 먼저 연락하는 쪽이 되어 보세요.' : '관계의 온도가 올라가는 해예요. 감정이 앞서는 순간을 조심하면 관계가 깊어집니다.'}` },
        { t: 'sub', v: '일' },
        { t: 'p', v: `일에서는 ${best[0].monthLabel}~${best[1].monthLabel} 사이에 제안·지원·발표를 배치하세요. 준비는 ${worst[0].monthLabel}에 하고, 실행은 좋은 달에 하는 것이 이 사주의 리듬입니다.` },
      ],
    },
  ];
}

function monthLine(m) {
  const map = {
    식신: '편안하게 결과가 나오는 달', 상관: '말과 재주가 빛나지만 마찰도 있는 달',
    편재: '돈이 크게 도는 달', 정재: '성실함이 남는 달',
    편관: '압박이 있지만 실력이 증명되는 달', 정관: '자리가 잡히는 달',
    편인: '혼자 깊어지는 달', 정인: '배움과 도움이 오는 달',
    비견: '내 힘으로 서는 달', 겁재: '경쟁과 비교가 많은 달',
  };
  return map[m.sipsung] || '흐름을 정리하는 달';
}

function cautionLine(m, chart) {
  if (m.branch === (chart.dayBranch + 6) % 12) return '일지와 충하는 달이에요. 가까운 사람과의 말다툼, 계약 변경을 조심하세요.';
  if (m.sipsung === '편관') return '압박이 커지는 달이에요. 몸의 신호를 먼저 확인하고 무리한 약속을 줄이세요.';
  if (m.sipsung === '상관') return '말이 세지는 달이에요. 맞는 말도 한 번 더 부드럽게.';
  if (m.sipsung === '겁재') return '사람과 돈이 얽히는 달이에요. 보증과 대여는 피하세요.';
  return '에너지가 안쪽으로 도는 달이에요. 새 일을 벌이기보다 정리와 점검에 쓰세요.';
}

/** 대운 섹션 */
function daewoonSections(chart, { freeBlocks = 2 } = {}) {
  const d = chart.daewoon;
  const nowAge = 2026 - chart.solarYear;
  const current = d.list.find((x) => nowAge >= x.fromAge && nowAge <= x.toAge) || d.list[0];
  const tone = DAEWOON_TONE[current.sipsung] || DAEWOON_TONE.비견;
  return [
    {
      id: 'dw-open',
      heading: '대운의 방향과 시작',
      kicker: 'DAEWOON',
      locked: true,
      freeBlocks,
      blocks: [
        { t: 'p', v: `대운은 10년마다 바뀌는 큰 계절이에요. ${chart.input.gender === 'male' ? '남' : '여'}자 · ${chart.pillars.year.ko}년생인 당신의 대운은 ${d.forward ? '앞으로 흐르는 순행' : '뒤로 흐르는 역행'}이고, ${d.startAge}세${d.startRemain ? ` ${d.startRemain}개월` : ''}에 첫 대운이 열렸습니다.` },
        { t: 'p', v: `대운수는 태어난 때와 절기 사이의 거리로 정해져요. 그래서 사람마다 10년의 시작점이 조금씩 다릅니다. 당신은 ${d.daysToJie}일 → ${d.startAge}세로 계산되었습니다.` },
        { t: 'kv', v: [['지금 나이', `만 ${nowAge}세`], ['현재 대운', `${current.ko}(${current.han}) · ${current.fromAge}~${current.toAge}세`], ['다음 대운', `${d.list[current.order] ? d.list[current.order].ko : '—'} · ${d.list[current.order] ? `${d.list[current.order].fromAge}세부터` : ''}`]] },
      ],
    },
    {
      id: 'dw-table',
      heading: '앞으로의 대운 표',
      kicker: 'TIMELINE',
      locked: true,
      freeBlocks: 1,
      blocks: [
        { t: 'table', head: ['대운', '간지', '나이', '연도', '십성'], rows: d.list.map((x) => [`${x.order}번째`, `${x.ko}(${x.han})`, `${x.fromAge}~${x.toAge}세`, `${x.fromYear}~${x.toYear}`, x.sipsung]) },
        { t: 'bar', v: d.list.map((x) => ({ label: `${x.ko} ${x.fromAge}세`, value: x.sipsung === current.sipsung ? 88 : 60 + ((x.order * 13 + chart.dayStem * 7) % 25), max: 100, note: x.sipsung })) },
      ],
    },
    {
      id: 'dw-now',
      heading: '지금 이 대운의 의미',
      kicker: 'NOW',
      locked: true,
      freeBlocks: 1,
      blocks: [
        { t: 'sub', v: `${current.ko} · ${tone.title}` },
        { t: 'p', v: `${tone.up} ${tone.down}` },
        { t: 'p', v: `당신의 대운 ${current.ko}은 일간 ${chart.dayMaster.ko}에게 ${current.sipsung}의 결로 들어옵니다. ${SIPSUNG_DETAIL[current.sipsung] ? SIPSUNG_DETAIL[current.sipsung].money : ''}` },
        { t: 'p', v: `이 10년의 숙제는 "${current.sipsung === '편관' || current.sipsung === '정관' ? '버티는 힘' : current.sipsung === '편재' || current.sipsung === '정재' ? '그릇을 키우는 일' : current.sipsung === '식신' || current.sipsung === '상관' ? '내 것을 내놓는 일' : '내 중심을 세우는 일'}"이에요.` },
      ],
    },
    {
      id: 'dw-farm',
      heading: '농사 시간표 · 청귤의 비유',
      kicker: 'SEASON',
      locked: true,
      freeBlocks,
      blocks: [
        { t: 'p', v: '대운은 농사와 닮았어요. 씨를 뿌리는 해, 김을 매는 해, 거두는 해가 따로 있습니다. 지금 당신이 심는 일이 바로 다음 계절에 열매가 됩니다.' },
        { t: 'p', v: '청귤도 처음엔 시고 작아요. 그런데 나무가 겨울을 견디고 봄을 세 번 지나면, 같은 열매가 다른 맛이 됩니다. 지금의 노력이 안 익어 보이는 건 게으른 게 아니라 계절이 아직 덜 왔기 때문이에요.' },
        { t: 'li', v: [
          `${current.fromAge}세~${current.toAge}세: ${tone.title} — 씨를 뿌리는 시기`,
          `${d.list[current.order] ? `${d.list[current.order].fromAge}세~${d.list[current.order].toAge}세: ${d.list[current.order].ko} — 김을 매는 시기` : '다음 대운: 김을 매는 시기'}`,
          `${d.list[current.order + 1] ? `${d.list[current.order + 1].fromAge}세~${d.list[current.order + 1].toAge}세: ${d.list[current.order + 1].ko} — 거두는 시기` : '그다음 대운: 거두는 시기'}`,
        ] },
        { t: 'q', v: '계절을 앞당길 수는 없어요. 다만 준비를 게을리하면 거둘 때가 와도 거둘 것이 없습니다.' },
      ],
    },
    {
      id: 'dw-calendar',
      heading: '10년 실행 캘린더',
      kicker: 'PLAN',
      locked: true,
      freeBlocks,
      blocks: [
        { t: 'li', v: [
          '1년 차 — 손에 익은 일 하나를 "돈이 되는 형태"로 바꾸기 (기록·정리·가격 붙이기)',
          '2~3년 차 — 그 일에 이름 붙이기. 대외 활동 1회 이상',
          '4~5년 차 — 사람을 붙이기. 혼자 하던 일을 나눠 맡기기',
          '6~7년 차 — 수입원을 두 개로 만들기',
          '8~9년 차 — 몸을 회복하는 해로 정하기. 성장보다 회복',
          '10년 차 — 정리와 문서화. 다음 계절의 씨앗 고르기',
        ] },
        { t: 'p', v: `이 캘린더는 ${current.ko} 대운의 성격(${tone.title})에 맞춰 조정한 것이에요. 대운이 바뀌면 같은 계획도 순서가 달라집니다.` },
      ],
    },
  ];
}

/** 궁합 섹션 */
function compatSections(chart, partner, jamiA, jamiB, { freeBlocks = 1 } = {}) {
  const c = computeCompat(chart, partner, jamiA, jamiB);
  const v = compatVerdict(c.overall);
  return [
    {
      id: 'cp-temp',
      heading: '두 사람의 사주 온도',
      kicker: 'TEMPERATURE',
      locked: true,
      freeBlocks,
      blocks: [
        { t: 'kv', v: [
          ['나', `${chart.pillars.day.ko} · ${deg(chart.ohaeng.temp)} (${tempWord(chart.ohaeng.temp)})`],
          ['상대', `${partner.pillars.day.ko} · ${deg(partner.ohaeng.temp)} (${tempWord(partner.ohaeng.temp)})`],
          ['온도 차', `${c.tempGap}도`],
        ] },
        { t: 'bar', v: OHAENG.map((o) => ({ label: o, value: chart.ohaeng.count[o] || 0, max: 6, note: `나 ${chart.ohaeng.count[o] || 0} · 상대 ${partner.ohaeng.count[o] || 0}` })) },
        { t: 'p', v: `두 사람의 온도 차이는 ${c.tempGap}도예요. ${c.tempGap <= 3 ? '온도가 비슷해 함께 있을 때 리듬이 편해요. 다만 둘 다 같은 자리에서 식으면 누가 불을 지필지가 문제가 됩니다.' : c.tempGap <= 7 ? '한 사람이 다른 사람의 온도를 채워주는 관계예요. 서로의 계절이 다르다는 걸 인정하면 오히려 오래갑니다.' : '온도 차가 커서 초반에 강하게 끌리지만, 생활에서 체감 차이가 큽니다. 서로의 속도를 존중하는 규칙이 필요해요.'}` },
      ],
    },
    {
      id: 'cp-score',
      heading: '궁합 점수',
      kicker: 'SCORE',
      locked: true,
      freeBlocks: 1,
      blocks: [
        { t: 'score', value: c.overall, label: v.title, note: v.line },
        { t: 'bar', v: c.axes.map((a) => ({ label: a.label, value: a.value, max: 100, note: '' })) },
        { t: 'p', v: `네 축의 평균이 ${c.overall}점이에요. 점수는 "좋다/나쁘다"가 아니라 "어디를 손보면 좋아지는지"를 보는 지표입니다.` },
      ],
    },
    {
      id: 'cp-relations',
      heading: '합과 충 — 무엇이 끌고 무엇이 부딪히는가',
      kicker: 'EVIDENCE',
      locked: true,
      freeBlocks,
      blocks: [
        { t: 'li', v: c.evidence },
        { t: 'table', head: ['구분', '나', '상대'], rows: [['일간', `${c.stems.a}`, `${c.stems.b}`], ['일지', `${c.branches.a}`, `${c.branches.b}`], ['사주 온도', `${chart.ohaeng.temp}°C`, `${partner.ohaeng.temp}°C`]] },
        { t: 'p', v: `${c.evidence.some((e) => e.includes('충')) ? '충이 있는 관계는 편하지 않지만, 그 긴장이 관계를 오래 살아 있게 만들기도 해요. 문제는 충이 아니라 충을 다루는 방식입니다.' : '큰 충이 없는 관계예요. 편안함이 강점이고, 그 편안함에 기대어 노력을 멈추는 것이 유일한 위험입니다.'}` },
      ],
    },
    {
      id: 'cp-mind',
      heading: '속마음 — 상대는 나를 어떻게 보고 있는가',
      kicker: 'INSIDE',
      locked: true,
      freeBlocks,
      blocks: [
        { t: 'p', v: `${partner.pillars.day.ko} 일간의 시선으로 보면, ${chart.pillars.day.ko} 일간인 당신은 ${ILGAN[partner.dayMaster.ko].love[0]}` },
        { t: 'p', v: `자미두수로 보면 ${jamiA && jamiB ? (jamiA.bucheoPalace.branch === jamiB.myeong ? '내 배우자 자리에 상대가 들어와 있어요. 상대는 나를 "가족 같은 사람"으로 먼저 느낍니다.' : jamiB.bucheoPalace.branch === jamiA.myeong ? '상대의 배우자 자리에 내가 들어와 있어요. 상대는 나를 보며 미래를 상상합니다.' : '두 사람의 배우자 자리가 서로 비켜 있어요. 그래서 끌림은 있지만 "이 사람이다"라는 확신은 시간이 필요합니다.') : '배우자 자리 비교는 상대의 생년월일시가 모두 입력되어야 계산됩니다.'}` },
        { t: 'q', v: '상대의 말이 아니라 상대의 사주를 보면, 그가 왜 그렇게 말했는지가 보입니다.' },
      ],
    },
    {
      id: 'cp-guide',
      heading: '이 관계를 오래 가게 하는 3가지',
      kicker: 'GUIDE',
      locked: true,
      freeBlocks,
      blocks: [
        { t: 'li', v: [
          c.axes.find((a) => a.key === 'talk' && a.value < 65) ? '말이 부딪히는 지점이 있어요. 화가 난 날에는 결론을 말하지 않는 규칙을 만드세요.' : '대화가 잘 통하는 편이에요. 그 통함을 당연하게 여기지 말고 한 달에 한 번은 깊은 대화를 예약하세요.',
          c.axes.find((a) => a.key === 'energy' && a.value < 70) ? '서로의 온도가 달라요. 한 사람이 추우면 다른 사람이 먼저 손을 내미는 역할을 정해두세요.' : '서로의 온도를 잘 채워줘요. 함께하는 취미 하나를 정해두면 관계가 단단해집니다.',
          '돈과 시간을 함께 쓰는 자리를 정해두세요. 애매한 것이 관계를 가장 많이 상하게 합니다.',
        ] },
      ],
    },
  ];
}

/** 상품별 리포트 조립 */
export function buildReport(productId, chart, extras = {}) {
  const product = productById(productId);
  const jami = extras.jami || null;
  const now = extras.now || new Date();
  const il = ILGAN[chart.dayMaster.ko];

  if (!product) return null;

  if (productId === 'saju') {
    return {
      product,
      title: `${chart.dayMaster.ko}일간 · ${chart.iljuAnimal}`,
      subtitle: `${chart.summary} — ${tempWord(chart.ohaeng.temp)} ${chart.ohaeng.temp}°C 사주`,
      summary: `${il.keyword}. ${il.charm}`,
      sections: [
        secWonyouk(chart, { free: true }),
        secPersonality(chart, { freeBlocks: 1 }),
        secMoney(chart, { freeBlocks: 1 }),
        secJob(chart, { freeBlocks: 1 }),
        secLove(chart, jami, { freeBlocks: 1 }),
        secToday(chart, now),
      ],
    };
  }

  if (productId === 'compat') {
    const partner = extras.partner;
    if (!partner) return { product, needPartner: true, title: '궁합', subtitle: '상대방의 생년월일시가 필요해요', sections: [] };
    return {
      product,
      title: `${chart.pillars.day.ko} × ${partner.pillars.day.ko}`,
      subtitle: `${chart.iljuAnimal} · ${partner.iljuAnimal} — 두 사람의 온도`,
      summary: compatVerdict(computeCompat(chart, partner, jami, extras.partnerJami).overall).line,
      sections: compatSections(chart, partner, jami, extras.partnerJami, { freeBlocks: 1 }),
    };
  }

  if (productId === 'newyear') {
    return {
      product,
      title: '2027 정미년 신년운세',
      subtitle: `${chart.pillars.day.ko}일간 · ${chart.dii}띠의 한 해 흐름`,
      summary: '2027년은 정미(丁未)년. 어느 달에 문이 열리고, 어느 달에 힘을 빼야 하는지 담았습니다.',
      sections: [
        secWonyouk(chart, { free: true }),
        ...sewoonSections(chart, { freeBlocks: 2 }),
        secToday(chart, now),
      ],
    };
  }

  if (productId === 'daewoon') {
    return {
      product,
      title: '10년 대운 풀이',
      subtitle: `${chart.daewoon.forward ? '순행' : '역행'} · ${chart.daewoon.startAge}세 시작`,
      summary: '인생의 계절을 농사로 읽습니다. 지금이 심는 시기인지, 거두는 시기인지.',
      sections: [
        secWonyouk(chart, { free: true }),
        ...daewoonSections(chart, { freeBlocks: 2 }),
        secToday(chart, now),
      ],
    };
  }

  if (productId === 'lifetime') {
    return {
      product,
      title: '평생 종합 리포트',
      subtitle: `${chart.summary} · ${chart.dii}띠 ${chart.iljuAnimal}`,
      summary: `${il.keyword} — 성격·재물·일·연애·자미두수·신년·대운을 한 권에 담았습니다.`,
      sections: [
        secWonyouk(chart, { free: true }),
        secPersonality(chart, { freeBlocks: 1 }),
        secMoney(chart, { freeBlocks: 1 }),
        secJob(chart, { freeBlocks: 1 }),
        secLove(chart, jami, { freeBlocks: 1 }),
        secJami(chart, jami, { freeBlocks: 1 }),
        ...sewoonSections(chart, { freeBlocks: 1 }),
        ...daewoonSections(chart, { freeBlocks: 1 }),
        secToday(chart, now),
      ].filter(Boolean),
    };
  }

  if (productId === 'love') {
    return {
      product,
      title: '연애운 · 사랑운',
      subtitle: `${chart.pillars.day.ko}일간 · ${chart.dii}띠의 사랑 지도`,
      summary: `${il.love[0].split('.')[0]}. 인연의 별이 언제 들어오는지 담았습니다.`,
      sections: [...loveSections(chart, jami, { freeBlocks: 2 }), secToday(chart, now)],
    };
  }

  if (productId === 'reunion') {
    const r = reunionReading(chart, jami);
    return {
      product,
      title: '재회운',
      subtitle: `${chart.pillars.day.ko}일간 · ${chart.dii}띠 — 헤어진 그 사람과의 거리`,
      summary: `재회 온도 ${r.score}점 · ${r.band.title}`,
      sections: reunionSections(chart, jami, { freeBlocks: 2 }),
    };
  }

  if (productId === 'wealth') {
    const w = wealthReading(chart);
    return {
      product,
      title: '재물운',
      subtitle: `${chart.pillars.day.ko}일간 · 재물 그릇 ${w.vessel}점`,
      summary: `${w.band.title} — ${il.money[0].split('.')[0]}.`,
      sections: [...wealthSections(chart, jami, { freeBlocks: 2 }), secToday(chart, now)],
    };
  }

  if (productId === 'destiny') {
    return {
      product,
      title: '운명의 짝',
      subtitle: `${chart.pillars.day.ko}일간이 부르는 인연의 모양`,
      summary: `${chart.ohaeng.missing.length ? `당신에게 없는 ${chart.ohaeng.missing.join('·')}을 가진 사람` : '당신의 온도를 이해하는 사람'} — 어떤 인연이 맞는지 담았습니다.`,
      sections: [...destinySections(chart, jami, { freeBlocks: 2 }), secToday(chart, now)],
    };
  }

  if (productId === 'jami') {
    if (!jami) {
      return { product, needTime: true, title: '자미두수 심층', subtitle: '태어난 시간이 있어야 12궁을 그립니다', sections: [] };
    }
    return {
      product,
      title: '자미두수 심층',
      subtitle: `명궁 ${jami.myeongBranch} · 신궁 ${jami.sinBranch} · ${jami.gukName}`,
      summary: `사주로 풀리지 않던 것을 12궁의 배치로 다시 읽습니다.`,
      sections: jamiDeepSections(chart, jami, { freeBlocks: 2 }),
    };
  }

  return null;
}

export function ohaengNeedFor(chart) {
  const weak = [...OHAENG].sort((a, b) => (chart.ohaeng.count[a] || 0) - (chart.ohaeng.count[b] || 0))[0];
  return { ohaeng: weak, text: OHAENG_DETAIL[weak].need };
}

export { TTI, OHAENG_DETAIL };
