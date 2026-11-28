// 만세력(四柱) 계산 엔진
// - 년주: 입춘 기준 / 월주: 24절기 '절' 기준 / 일주: 60갑자 연속 / 시주: 진태양시 보정 + 야자시
// - 검증 케이스 → tests/engine.test.mjs
//   1992-10-15 07:33 여 → 임신 · 경술 · 갑자 · 무진
//   1997-06-17 08:00 남 → 정축 · 병오 · 경인 · 경진

import {
  STEMS, BRANCHES, OHAENG, OHAENG_META, SANGSAENG, SANGGEUK, GENERATED_BY,
  SIPSUNG, TTEE_CONFIG, HOUR_BRANCH_LABEL, NAEUM, NAEUM_NAME,
} from './constants.js';
import { lunarToSolar, solarToLunar, lunarMonthLabel } from './lunarKo.js';
import { lastJieBefore, nextJieAfter, termByName } from './solarTerms.js';
import { seoulNow } from './clock.js';
import { monthPillar, addMonths } from './month-pillar.js';

const DAY_MS = 86400000;
const MIN_MS = 60000;

/** 일주 기준점: 1992-10-15 = 갑자일 (음양력 자료 교차 확인) */
const ANCHOR = { y: 1992, m: 10, d: 15, index: 0 };

/** 일간 → 자시 천간 시작 (갑기일 갑자시, 을경일 병자시 …) */
const HOUR_STEM_BASE = [0, 2, 4, 6, 8];
/** 년간 → 인월 천간 시작 (갑기년 병인월 …) */
const MONTH_STEM_BASE = [2, 4, 6, 8, 0];

const pad2 = (n) => String(n).padStart(2, '0');

function wallMs(y, m, d, h = 0, mi = 0) {
  return Date.UTC(y, m - 1, d, h, mi, 0);
}

/**
 * 한국 표준시(경도) 보정 — 진태양시.
 * 표준 자오선이 135°E일 때 127.5°E 지방시는 30분 늦으므로 -30분.
 * 1908.4~1911.12 · 1954.3.21~1961.8.9 는 표준시가 127.5°E(UTC+8:30)였으므로 보정이 없다.
 * 1987·1988 서머타임(UTC+10) 기간은 -90분.
 */
export function standardTimeOffset(y, m, d) {
  const key = y * 10000 + m * 100 + d;
  if (key >= 19870510 && key <= 19871011) return -90;
  if (key >= 19880508 && key <= 19881009) return -90;
  if (key < 19080401) return 0;
  if (key <= 19111231) return 0;
  if (key <= 19540320) return -30;
  if (key <= 19610809) return 0;
  return -30;
}

export function dayIndexFromDate(y, m, d) {
  const days = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ANCHOR.y, ANCHOR.m - 1, ANCHOR.d)) / DAY_MS);
  return ((days + ANCHOR.index) % 60 + 60) % 60;
}

export function dayIndexToGanji(index) {
  return { stem: ((index % 10) + 10) % 10, branch: ((index % 12) + 12) % 12 };
}

export function sipsungOf(dayStem, targetStem) {
  const d = STEMS[dayStem];
  const t = STEMS[targetStem];
  const samePolarity = d.yang === t.yang;
  if (t.ohaeng === d.ohaeng) return samePolarity ? '비견' : '겁재';
  if (SANGSAENG[d.ohaeng] === t.ohaeng) return samePolarity ? '식신' : '상관';
  if (SANGGEUK[d.ohaeng] === t.ohaeng) return samePolarity ? '편재' : '정재';
  if (SANGGEUK[t.ohaeng] === d.ohaeng) return samePolarity ? '편관' : '정관';
  if (SANGSAENG[t.ohaeng] === d.ohaeng) return samePolarity ? '편인' : '정인';
  return '비견';
}

/** 지지 본기(本氣) 천간 인덱스 */
const BRANCH_MAIN_STEM = [9, 5, 0, 1, 4, 2, 3, 5, 6, 7, 4, 8]; // 자계 축기 인갑 묘을 진무 사병 오정 미기 신경 유신 술무 해임

function pillar(stem, branch, lab) {
  const s = STEMS[stem];
  const b = BRANCHES[branch];
  return {
    label: lab,
    stem,
    branch,
    stemKo: s.ko,
    branchKo: b.ko,
    han: `${s.han}${b.han}`,
    ko: `${s.ko}${b.ko}`,
    stemOhaeng: s.ohaeng,
    branchOhaeng: b.ohaeng,
    stemHan: s.han,
    branchHan: b.han,
    animal: b.animal,
    color: s.color,
    full: `${s.colorAdj} ${b.animal}`,
  };
}

/** 오행 개수 · 온도 */
export function ohaengProfile(chars) {
  const count = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const c of chars) count[c] = (count[c] || 0) + 1;
  const score = count.화 * 1.0 + count.목 * 0.5 + count.토 * 0.2 - count.수 * 1.0 - count.금 * 0.6;
  const temp = Math.max(6, Math.min(38, 25 + score * 1.6));
  const missing = OHAENG.filter((o) => count[o] === 0);
  const strongest = OHAENG.reduce((a, b) => (count[b] > count[a] ? b : a), '목');
  let label;
  if (temp <= 13) label = '얼음장';
  else if (temp <= 19) label = '서늘';
  else if (temp <= 25.5) label = '온화';
  else if (temp <= 31) label = '따뜻';
  else label = '뜨거운';
  return { count, score: Math.round(score * 10) / 10, temp: Math.round(temp * 10) / 10, missing, strongest, label };
}

/** 대운 */
export function computeDaewoon(chart) {
  const { yearStem, yearBranch, monthStem, monthBranch, gender, birthMs } = chart;
  const yang = STEMS[yearStem].yang;
  const forward = (yang && gender === 'male') || (!yang && gender === 'female');
  let diffMs;
  if (forward) {
    const next = nextJieAfter(birthMs, new Date(birthMs).getUTCFullYear());
    diffMs = next ? next.ms - birthMs : 30 * DAY_MS;
  } else {
    const prev = lastJieBefore(birthMs, new Date(birthMs).getUTCFullYear());
    diffMs = prev ? birthMs - prev.ms : 30 * DAY_MS;
  }
  const days = diffMs / DAY_MS;
  const totalMonths = Math.max(1, Math.round(days * 4)); // 3일 = 1년 = 12개월 → 1일 = 4개월
  const startAge = Math.floor(totalMonths / 12);
  const startRemain = totalMonths % 12;
  const list = [];
  for (let i = 0; i < 8; i += 1) {
    const step = forward ? i + 1 : -(i + 1);
    const s = ((monthStem + step) % 10 + 10) % 10;
    const b = ((monthBranch + step) % 12 + 12) % 12;
    const fromAge = startAge + i * 10;
    list.push({
      order: i + 1,
      stem: s,
      branch: b,
      stemKo: STEMS[s].ko,
      branchKo: BRANCHES[b].ko,
      ko: `${STEMS[s].ko}${BRANCHES[b].ko}`,
      han: `${STEMS[s].han}${BRANCHES[b].han}`,
      fromAge,
      toAge: fromAge + 9,
      fromYear: chart.solarYear + fromAge,
      toYear: chart.solarYear + fromAge + 9,
      sipsung: sipsungOf(chart.dayStem, s),
    });
  }
  return { forward, startAge, startRemain, daysToJie: Math.round(days * 10) / 10, list };
}

/** 2027년(정미년) 월별 흐름 — 절기 기준 */
export function monthlyFlow(year = 2027, dayStem = 0) {
  const yearStem = ((year - 4) % 10 + 10) % 10;
  const yearBranch = ((year - 4) % 12 + 12) % 12;
  const list = [];
  for (let b = 0; b < 12; b += 1) {
    const branch = (2 + b) % 12; // 인월부터
    const stem = (MONTH_STEM_BASE[yearStem % 5] + b) % 10;
    const termName = ['입춘', '경칩', '청명', '입하', '망종', '소서', '입추', '백로', '한로', '입동', '대설', '소한'][b];
    const t = termByName(termName, b === 11 ? year + 1 : year);
    list.push({
      order: b + 1,
      term: termName,
      start: t ? `${t.m}.${t.d}` : '',
      stem,
      branch,
      ko: `${STEMS[stem].ko}${BRANCHES[branch].ko}`,
      branchKo: BRANCHES[branch].ko,
      sipsung: sipsungOf(dayStem, stem),
      monthLabel: `${t ? t.m : b + 2}월`,
    });
  }
  return {
    year, yearStem, yearBranch,
    yearKo: `${STEMS[yearStem].ko}${BRANCHES[yearBranch].ko}`,
    yearHan: `${STEMS[yearStem].han}${BRANCHES[yearBranch].han}`,
    list,
  };
}

/**
 * 결제(열람)일 기준 앞으로 열두 달 — 이번 달부터 연속 열두 달의 월건.
 *
 *   · 2026-11-22 시연 님 지시: "결제 기준 1년으로 하세요. 연 중에 결제한 사람들
 *     배아파서 클레임 들어오겠어요ㅜㅜ" — 한 해(2027년 2월~2028년 1월)를 미리 박아 두던
 *     표를, 열람한 날이 속한 달부터 열한 달 뒤까지로 바꾼다.
 *   · 11월에 열람 → 2026년 11월 ~ 2027년 10월 / 5월에 열람 → 2027년 5월 ~ 2028년 4월.
 *   · 월건은 절기 기준(`month-pillar.js`)이고, 세운은 그 달의 사주년(입춘 기준)으로 잡는다.
 *     그래서 1월은 전년도 술년의 축월 — 세운도 전년도로 계산된다.
 * @param {number} dayStem 일간 (십성 계산)
 * @param {{now?: Date, count?: number}} [options]
 */
export function rollingMonths(dayStem, { now = new Date(), count = 12 } = {}) {
  const t = seoulNow(now);
  const list = [];
  for (let i = 0; i < count; i += 1) {
    const { year, month } = addMonths(t.year, t.month, i);
    const p = monthPillar(year, month);
    const term = termByName(p.term, p.sajuYear);
    const ys = ((p.sajuYear - 4) % 10 + 10) % 10;
    const yb = ((p.sajuYear - 4) % 12 + 12) % 12;
    list.push({
      ...p,
      index: i,
      short: `${String(year).slice(-2)}.${pad2(month)}`,
      label: `${year}년 ${month}월`,
      monthLabel: `${month}월`,
      start: term ? `${term.m}.${term.d}` : '',
      sipsung: sipsungOf(dayStem, p.stem),
      sewoonYear: p.sajuYear,
      sewoonKo: `${STEMS[ys].ko}${BRANCHES[yb].ko}`,
      sewoonHan: `${STEMS[ys].han}${BRANCHES[yb].han}`,
      yearTurn: month === 1,
    });
  }

  /* 세운이 바뀌는 지점끼리 묶는다 — 11월~1월은 전년도 세운, 2월부터 새 세운 */
  const groups = [];
  for (const m of list) {
    const g = groups[groups.length - 1];
    if (g && g.sewoonYear === m.sewoonYear) {
      g.count += 1;
      g.to = m;
    } else {
      groups.push({ sewoonYear: m.sewoonYear, ko: m.sewoonKo, han: m.sewoonHan, count: 1, from: m, to: m });
    }
  }

  const first = list[0];
  const last = list[list.length - 1];
  return {
    basis: { year: t.year, month: t.month, day: t.day, label: `${t.year}년 ${t.month}월` },
    count,
    list,
    groups,
    fromLabel: first.label,
    toLabel: last.label,
    fromShort: first.short,
    toShort: last.short,
  };
}

/** 이미 계산한 명식에 '오늘 기준 열두 달'만 새로 씌운다 (결제·열람 시점의 창).
 *  창이 이미 이번 달과 같으면 명식 객체를 그대로 돌려준다 — 원국 카드가 같은 chart 를 들고 있게. */
export function withRollingMonths(chart, now = new Date()) {
  const t = seoulNow(now);
  const sw = chart.sewoon;
  if (sw && sw.basis && sw.basis.year === t.year && sw.basis.month === t.month) return chart;
  return { ...chart, sewoon: rollingMonths(chart.dayStem, { now }) };
}

/**
 * 사주 계산 메인
 * @param {object} input
 *   calendar: 'solar' | 'lunar'
 *   year, month, day, hour, minute
 *   timeUnknown: boolean (시간 모름)
 *   gender: 'female' | 'male'
 *   leap: 음력 윤달 여부
 *   trueSolar: 진태양시 보정 사용 (기본 true)
 *   yajasi: 23시 이후를 다음 날 일주로 (기본 true)
 */
export function computeChart(input, { now = new Date() } = {}) {
  const {
    calendar = 'solar', year, month, day, hour = 12, minute = 0,
    timeUnknown = false, gender = 'female', leap = false,
    trueSolar = true, yajasi = true,
  } = input;

  const errors = [];
  if (!Number.isInteger(year) || year < 1900 || year > 2049) errors.push('출생 연도는 1900년~2049년까지 계산할 수 있어요.');
  if (!Number.isInteger(month) || month < 1 || month > 12) errors.push('월을 다시 확인해 주세요.');
  if (!Number.isInteger(day) || day < 1 || day > 31) errors.push('일을 다시 확인해 주세요.');
  if (errors.length) return { ok: false, errors };

  let solarDate;
  let lunarDate = null;
  if (calendar === 'lunar') {
    solarDate = lunarToSolar(year, month, day, leap);
    if (!solarDate) return { ok: false, errors: ['음력 날짜를 찾을 수 없어요. 윤달 여부와 일자를 확인해 주세요.'] };
    lunarDate = { y: year, m: month, d: day, leap: !!leap };
  } else {
    solarDate = { y: year, m: month, d: day };
    const conv = solarToLunar(year, month, day);
    if (conv) lunarDate = conv;
  }

  const hh = timeUnknown ? 12 : hour;
  const mm = timeUnknown ? 0 : minute;
  const rawMs = wallMs(solarDate.y, solarDate.m, solarDate.d, hh, mm);
  const offset = trueSolar ? standardTimeOffset(solarDate.y, solarDate.m, solarDate.d) : 0;
  const birthMs = rawMs + offset * MIN_MS;

  const cd = new Date(birthMs);
  const corrected = {
    y: cd.getUTCFullYear(), m: cd.getUTCMonth() + 1, d: cd.getUTCDate(),
    h: cd.getUTCHours(), mi: cd.getUTCMinutes(),
  };

  // 1) 년주 — 입춘 기준
  let sajuYear = corrected.y;
  const lichun = termByName('입춘', corrected.y);
  if (lichun && birthMs < lichun.ms) sajuYear = corrected.y - 1;
  const yearStem = ((sajuYear - 4) % 10 + 10) % 10;
  const yearBranch = ((sajuYear - 4) % 12 + 12) % 12;

  // 2) 월주 — 절(節) 기준
  let jie = lastJieBefore(birthMs, corrected.y);
  if (!jie) jie = termByName('소한', corrected.y);
  const monthBranch = jie.branch;
  const monthOrder = ((monthBranch - 2) % 12 + 12) % 12;
  const monthStem = (MONTH_STEM_BASE[yearStem % 5] + monthOrder) % 10;

  // 3) 일주
  let dayBase = corrected;
  let yajasiApplied = false;
  if (yajasi && !timeUnknown && corrected.h >= 23) {
    const nd = new Date(birthMs + DAY_MS);
    dayBase = { y: nd.getUTCFullYear(), m: nd.getUTCMonth() + 1, d: nd.getUTCDate() };
    yajasiApplied = true;
  }
  const dIndex = dayIndexFromDate(dayBase.y, dayBase.m, dayBase.d);
  const dayStem = dIndex % 10;
  const dayBranch = dIndex % 12;

  // 4) 시주
  let hourStem = null;
  let hourBranch = null;
  if (!timeUnknown) {
    hourBranch = Math.floor(((corrected.h + 1) % 24) / 2);
    hourStem = (HOUR_STEM_BASE[dayStem % 5] + hourBranch) % 10;
  }

  const pillars = {
    year: pillar(yearStem, yearBranch, '년주'),
    month: pillar(monthStem, monthBranch, '월주'),
    day: pillar(dayStem, dayBranch, '일주'),
    hour: hourStem === null ? null : pillar(hourStem, hourBranch, '시주'),
  };

  const chars = [
    STEMS[yearStem].ohaeng, BRANCHES[yearBranch].ohaeng,
    STEMS[monthStem].ohaeng, BRANCHES[monthBranch].ohaeng,
    STEMS[dayStem].ohaeng, BRANCHES[dayBranch].ohaeng,
  ];
  if (pillars.hour) chars.push(STEMS[hourStem].ohaeng, BRANCHES[hourBranch].ohaeng);
  const ohaeng = ohaengProfile(chars);

  const sipsung = {
    year: sipsungOf(dayStem, yearStem),
    month: sipsungOf(dayStem, monthStem),
    hour: hourStem === null ? null : sipsungOf(dayStem, hourStem),
    yearBranch: sipsungOf(dayStem, BRANCH_MAIN_STEM[yearBranch]),
    monthBranch: sipsungOf(dayStem, BRANCH_MAIN_STEM[monthBranch]),
    dayBranch: sipsungOf(dayStem, BRANCH_MAIN_STEM[dayBranch]),
    hourBranch: hourBranch === null ? null : sipsungOf(dayStem, BRANCH_MAIN_STEM[hourBranch]),
  };

  const chart = {
    ok: true,
    errors: [],
    input: { calendar, year, month, day, hour, minute, timeUnknown, gender, leap, trueSolar, yajasi },
    solar: { ...solarDate },
    lunar: lunarDate,
    corrected,
    correctionMinutes: offset,
    yajasiApplied,
    birthMs,
    solarYear: solarDate.y,
    yearStem, yearBranch, monthStem, monthBranch, dayStem, dayBranch,
    pillars,
    ohaeng,
    sipsung,
    dayMaster: {
      stem: dayStem,
      ko: STEMS[dayStem].ko,
      han: STEMS[dayStem].han,
      ohaeng: STEMS[dayStem].ohaeng,
      yang: STEMS[dayStem].yang,
    },
    dii: BRANCHES[yearBranch].animal,
    animal: BRANCHES[yearBranch].animal,
    iljuAnimal: `${STEMS[dayStem].colorAdj} ${BRANCHES[dayBranch].animal}`,
    hourLabel: hourBranch === null ? '시간 미상' : HOUR_BRANCH_LABEL[hourBranch],
    monthTerm: { ko: jie.ko, y: jie.y, m: jie.m, d: jie.d, h: jie.h, mi: jie.mi },
    charCount: chars.length,
  };

  chart.daewoon = computeDaewoon(chart);
  chart.sewoon = rollingMonths(dayStem, { now });
  chart.summary = `${pillars.year.ko} · ${pillars.month.ko} · ${pillars.day.ko}${pillars.hour ? ` · ${pillars.hour.ko}` : ''}`;
  return chart;
}

export function formatBirthLabel(chart) {
  const s = chart.solar;
  const t = chart.input.timeUnknown ? '시간 모름' : `${pad2(chart.input.hour)}:${pad2(chart.input.minute)}`;
  const l = chart.lunar;
  const lunarTxt = l ? `음력 ${l.y}.${pad2(l.m)}.${pad2(l.d)}${l.leap ? ' (윤달)' : ''}` : '';
  return `양력 ${s.y}.${pad2(s.m)}.${pad2(s.d)} ${t} · ${chart.input.gender === 'male' ? '남' : '여'}${lunarTxt ? ` · ${lunarTxt}` : ''}`;
}

export function ganjiOfYear(y) {
  return {
    stem: ((y - 4) % 10 + 10) % 10,
    branch: ((y - 4) % 12 + 12) % 12,
  };
}

export { OHAENG, OHAENG_META, SIPSUNG, NAEUM, NAEUM_NAME, STEMS, BRANCHES, GENERATED_BY, SANGSAENG, SANGGEUK };
