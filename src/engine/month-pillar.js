// 월건(月建) 계산 — 달력의 한 달이 어떤 월주(월간·월지)에 놓이는지 절기 기준으로 세운다.
//
//   · 사주의 한 해는 입춘에서 시작해 소한(다음 해 1월)에서 끝난다.
//     그래서 1월은 그 해가 아니라 **전년도 술년의 마지막 달(축월)** 로 계산한다.
//   · 월간은 술년 천간에서 나온다 (갑·기년 → 병인월, 을·경년 → 무인월 …).
//   · 월지는 인월(2월)부터 두 칸씩: 인·묘·진·사·오·미·신·유·술·해·자·축.
//
// 달력 1~12월 ↔ 월지: 1월 축 · 2월 인 · 3월 묘 … 11월 해 · 12월 자.
import { STEMS, BRANCHES } from './constants.js';

/** 인월(2월) 월간의 기준 — 술년 천간 % 5 */
const MONTH_STEM_BASE = [2, 4, 6, 8, 0];

/** 절기 이름 — 인월부터 열두 달 */
export const MONTH_TERMS = ['입춘', '경칩', '청명', '입하', '망종', '소서', '입추', '백로', '한로', '입동', '대설', '소한'];

/** 달력 월 → 술년 안에서의 차례 (0 = 인월, 11 = 축월) */
export function monthOrderOf(month) {
  return month === 1 ? 11 : month - 2;
}

/** 술년 천간 → 인월 월간 */
export function monthStemOfSajuYear(sajuYear, order) {
  const yearStem = ((sajuYear - 4) % 10 + 10) % 10;
  return (MONTH_STEM_BASE[yearStem % 5] + order) % 10;
}

/**
 * 달력 연·월 하나의 월주.
 * @param {number} year 달력 연도
 * @param {number} month 1~12
 */
export function monthPillar(year, month) {
  const m = Math.trunc(Number(month));
  const y = Math.trunc(Number(year));
  const order = monthOrderOf(m);
  const sajuYear = m === 1 ? y - 1 : y;
  const stem = monthStemOfSajuYear(sajuYear, order);
  const branch = (2 + order) % 12;
  return {
    year: y,
    month: m,
    sajuYear,
    order,
    term: MONTH_TERMS[order],
    stem,
    branch,
    ko: `${STEMS[stem].ko}${BRANCHES[branch].ko}`,
    han: `${STEMS[stem].han}${BRANCHES[branch].han}`,
    stemOhaeng: STEMS[stem].ohaeng,
    branchOhaeng: BRANCHES[branch].ohaeng,
    label: `${y}년 ${m}월`,
    key: `${y}-${String(m).padStart(2, '0')}`,
  };
}

/** 연·월을 더한다 (12월 + 1 → 다음 해 1월) */
export function addMonths(year, month, add) {
  const total = year * 12 + (month - 1) + add;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

/**
 * 어느 달부터 몇 달치 월주를 이어서 세운다.
 * @param {number} startYear 시작 연도
 * @param {number} startMonth 시작 월(1~12)
 * @param {number} count 달 수
 */
export function monthPillarWindow(startYear, startMonth, count) {
  const list = [];
  for (let i = 0; i < count; i += 1) {
    const { year, month } = addMonths(startYear, startMonth, i);
    list.push(monthPillar(year, month));
  }
  return list;
}
