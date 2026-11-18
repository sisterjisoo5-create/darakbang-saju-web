// 24절기 (한국 만세력의 월 경계) — 검증된 라이브러리(lunar-javascript)의 절기 시각을 사용한다.
// 절기 시각은 '한국 표준시 벽시계' 값으로 다루고, 비교는 Date.UTC 로 만든 동일 기준 ms 로 한다.

import LunarJs from 'lunar-javascript';

const { Lunar } = LunarJs;

const ZH_NAMES = [
  '冬至', '小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种',
  '夏至', '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪',
];

/** 한자 → { ko, type, branch } */
const TERM_META = {
  小寒: { ko: '소한', type: '절', branch: 1 },
  立春: { ko: '입춘', type: '절', branch: 2 },
  惊蛰: { ko: '경칩', type: '절', branch: 3 },
  清明: { ko: '청명', type: '절', branch: 4 },
  立夏: { ko: '입하', type: '절', branch: 5 },
  芒种: { ko: '망종', type: '절', branch: 6 },
  小暑: { ko: '소서', type: '절', branch: 7 },
  立秋: { ko: '입추', type: '절', branch: 8 },
  白露: { ko: '백로', type: '절', branch: 9 },
  寒露: { ko: '한로', type: '절', branch: 10 },
  立冬: { ko: '입동', type: '절', branch: 11 },
  大雪: { ko: '대설', type: '절', branch: 0 },
  大寒: { ko: '대한', type: '중기' },
  雨水: { ko: '우수', type: '중기' },
  春分: { ko: '춘분', type: '중기' },
  谷雨: { ko: '곡우', type: '중기' },
  小满: { ko: '소만', type: '중기' },
  夏至: { ko: '하지', type: '중기' },
  大暑: { ko: '대서', type: '중기' },
  处暑: { ko: '처서', type: '중기' },
  秋分: { ko: '추분', type: '중기' },
  霜降: { ko: '상강', type: '중기' },
  小雪: { ko: '소설', type: '중기' },
  冬至: { ko: '동지', type: '중기' },
};

const cache = new Map();

function wallMs(y, m, d, h, mi, s) {
  return Date.UTC(y, m - 1, d, h, mi, s || 0);
}

/** 해당 연도 전후 3년치 절기를 합쳐 정렬해 돌려준다. */
export function termsForYear(year) {
  if (cache.has(year)) return cache.get(year);
  const map = new Map();
  for (const y of [year - 1, year, year + 1]) {
    const lunar = Lunar.fromYmd(y, 6, 1);
    const table = lunar.getJieQiTable();
    for (const zh of ZH_NAMES) {
      const solar = table[zh];
      if (!solar || typeof solar.getYear !== 'function') continue;
      const ms = wallMs(solar.getYear(), solar.getMonth(), solar.getDay(), solar.getHour(), solar.getMinute(), solar.getSecond());
      const meta = TERM_META[zh];
      const key = `${meta.ko}-${ms}`;
      if (!map.has(key)) {
        map.set(key, {
          zh,
          ko: meta.ko,
          type: meta.type,
          branch: meta.branch,
          ms,
          y: solar.getYear(),
          m: solar.getMonth(),
          d: solar.getDay(),
          h: solar.getHour(),
          mi: solar.getMinute(),
        });
      }
    }
  }
  const list = [...map.values()].sort((a, b) => a.ms - b.ms);
  cache.set(year, list);
  return list;
}

/** birth(ms) 이전의 가장 가까운 절(節) — 월 경계 */
export function lastJieBefore(ms, year) {
  const list = termsForYear(year).filter((t) => t.type === '절' && t.ms <= ms);
  return list.length ? list[list.length - 1] : null;
}

export function nextJieAfter(ms, year) {
  const list = termsForYear(year).filter((t) => t.type === '절' && t.ms > ms);
  return list.length ? list[0] : null;
}

export function termByName(name, year) {
  const list = termsForYear(year).filter((t) => t.ko === name);
  if (!list.length) return null;
  // 생일 연도에 가장 가까운 것을 고른다
  const target = wallMs(year, 7, 1, 0, 0, 0);
  return list.reduce((best, t) => (Math.abs(t.ms - target) < Math.abs(best.ms - target) ? t : best), list[0]);
}

export function formatTermDate(t) {
  if (!t) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${t.y}.${pad(t.m)}.${pad(t.d)} ${pad(t.h)}:${pad(t.mi)}`;
}
