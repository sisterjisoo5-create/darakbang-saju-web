// 한국 음력 ↔ 양력 변환 (1900~2049)
// 표 데이터: 한국천문연구원 음양력 데이터를 담은 korean_lunar_calendar 패키지에서 생성
// (scripts/gen-lunar-table.py → koreanLunar.data.js)

import { LUNAR_BASE, LUNAR_ROWS, LUNAR_FIRST_YEAR, LUNAR_LAST_YEAR } from './koreanLunar.data.js';

const DAY = 86400000;

function monthList(row) {
  const list = [];
  let idx = 0;
  for (let m = 1; m <= 12; m += 1) {
    list.push({ m, leap: false, len: row.len[idx] });
    idx += 1;
    if (row.leap === m) {
      list.push({ m, leap: true, len: row.len[idx] });
      idx += 1;
    }
  }
  return list;
}

const YEARS = LUNAR_ROWS.map((line) => {
  const [y, leap, len] = line.split('|');
  // 길이는 두 자리(29/30) 연속 표기 → 2글자씩 끊어 읽는다
  const row = { y: Number(y), leap: Number(leap), len: (len.match(/.{2}/g) || []).map(Number) };
  row.months = monthList(row);
  row.total = row.months.reduce((a, b) => a + b.len, 0);
  return row;
});

const BY_YEAR = new Map(YEARS.map((r) => [r.y, r]));
const BASE_UTC = Date.UTC(1900, 0, 31); // 음력 1900-01-01

const CUM = []; // 각 해 1월 1일까지의 누적 일수
(() => {
  let sum = 0;
  for (const r of YEARS) {
    CUM.push(sum);
    sum += r.total;
  }
})();

export const LUNAR_RANGE = { from: LUNAR_FIRST_YEAR, to: LUNAR_LAST_YEAR };

export function lunarToSolar(y, m, d, isLeapMonth = false) {
  const row = BY_YEAR.get(y);
  if (!row) return null;
  if (m < 1 || m > 12) return null;
  const months = row.months.filter((x) => x.m === m);
  const target = isLeapMonth ? months.find((x) => x.leap) : months.find((x) => !x.leap);
  if (!target) return null;
  if (d < 1 || d > target.len) return null;
  let offset = CUM[y - LUNAR_FIRST_YEAR];
  for (const mo of row.months) {
    if (mo === target) break;
    offset += mo.len;
  }
  offset += d - 1;
  const dt = new Date(BASE_UTC + offset * DAY);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

export function solarToLunar(y, m, d) {
  const t = Date.UTC(y, m - 1, d);
  if (Number.isNaN(t)) return null;
  const diff = Math.round((t - BASE_UTC) / DAY);
  if (diff < 0) return null;
  let yi = 0;
  while (yi < YEARS.length - 1 && diff >= CUM[yi + 1]) yi += 1;
  if (diff >= CUM[yi] + YEARS[yi].total) return null;
  let rest = diff - CUM[yi];
  const row = YEARS[yi];
  for (const mo of row.months) {
    if (rest < mo.len) return { y: row.y, m: mo.m, d: rest + 1, leap: mo.leap };
    rest -= mo.len;
  }
  return null;
}

export function lunarMonthCount(y) {
  const row = BY_YEAR.get(y);
  return row ? row.months.length : 0;
}

export function hasLeapMonth(y, m) {
  const row = BY_YEAR.get(y);
  if (!row) return false;
  return row.months.some((x) => x.m === m && x.leap);
}

export function lunarMonthLength(y, m, isLeapMonth = false) {
  const row = BY_YEAR.get(y);
  if (!row) return 29;
  const target = row.months.find((x) => x.m === m && x.leap === isLeapMonth);
  return target ? target.len : 29;
}

/** 음력 월 표기: 1992년 윤4월 → '윤4월' */
export function lunarMonthLabel(m, isLeapMonth) {
  return `${isLeapMonth ? '윤' : ''}${m}월`;
}
