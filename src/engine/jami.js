// 자미두수(紫微斗數) — 명궁 · 신궁 · 12궁 · 14주성 배치
// 음력 생년월일시 기준. 같은 입력이면 언제나 같은 결과(결정론적).
// 검증: 1992-10-15 07:33 여(음 9/20 진시) → 명궁 午(천동·태음), 부처궁 辰(공궁), 재백궁 寅(공궁)
//       1997-06-17 08:00 남(음 5/13 진시) → 명궁 寅(자미·천부), 부처궁 子(파군), 재백궁 戌(무곡)

import { BRANCHES, STEMS, NAEUM, NAEUM_NAME, OHAENG_GUK, GUK_NAME, JAMI_PALACES } from './constants.js';

const MONTH_STEM_BASE = [2, 4, 6, 8, 0];

function ganjiIndex(stem, branch) {
  for (let i = 0; i < 60; i += 1) {
    if (i % 10 === stem && i % 12 === branch) return i;
  }
  return 0;
}

function stemForBranch(yearStem, branch) {
  const order = ((branch - 2) % 12 + 12) % 12;
  return (MONTH_STEM_BASE[yearStem % 5] + order) % 10;
}

/** 자미성 위치: 五行局과 음력 일 */
export function ziweiIndexByGuk(guk, day) {
  const q = Math.ceil(day / guk);
  const borrow = (guk - (day % guk)) % guk; // 借數
  let idx = (2 + (q - 1)) % 12; // 寅宮에서 商數만큼
  if (borrow > 0) idx = ((idx + (borrow % 2 === 0 ? borrow : -borrow)) % 12 + 12) % 12;
  return idx;
}

const LUCKY_YEAR_STEM = {
  kui: [1, 0, 11, 11, 1, 0, 1, 6, 3, 3], // 천괴: 갑무경 축, 을기 자, 병정 해, 신 오, 임계 묘
  yue: [7, 8, 9, 9, 7, 8, 7, 2, 5, 5], // 천월
  nok: [2, 3, 5, 6, 5, 6, 8, 9, 11, 0], // 녹존
};

/**
 * @param {object} p
 *  lunarYear, lunarMonth, lunarDay, hourIndex(0=자시, null=모름), gender, yearStem
 */
export function computeJami({ lunarYear, lunarMonth, lunarDay, hourIndex, gender, yearStem, timeUnknown }) {
  const hi = hourIndex == null ? 0 : hourIndex;
  const unknown = hourIndex == null;
  const month = lunarMonth;
  const day = lunarDay;

  // 1) 명궁 · 신궁
  const myeong = ((2 + (month - 1) - hi) % 12 + 12) % 12;
  const sin = ((2 + (month - 1) + hi) % 12 + 12) % 12;

  // 2) 오행국 — 명궁 간지의 납음
  const mStem = stemForBranch(yearStem, myeong);
  const gi = ganjiIndex(mStem, myeong);
  const naeum = NAEUM[gi];
  const guk = OHAENG_GUK[naeum];

  // 3) 자미성 · 14주성
  const ziwei = ziweiIndexByGuk(guk, day);
  const stars = {};
  const put = (name, idx, group = 'main') => {
    const b = ((idx % 12) + 12) % 12;
    (stars[b] = stars[b] || []).push({ name, group });
  };
  put('자미', ziwei);
  put('천기', ziwei - 1);
  put('태양', ziwei - 3);
  put('무곡', ziwei - 4);
  put('천동', ziwei - 5);
  put('염정', ziwei - 8);
  const tianfu = ((4 - ziwei) % 12 + 12) % 12;
  put('천부', tianfu);
  put('태음', tianfu + 1);
  put('탐랑', tianfu + 2);
  put('거문', tianfu + 3);
  put('천상', tianfu + 4);
  put('천량', tianfu + 5);
  put('칠살', tianfu + 6);
  put('파군', tianfu + 10);

  // 4) 길성 · 보좌성
  put('문창', 10 - hi, 'lucky');
  put('문곡', 4 + hi, 'lucky');
  put('좌보', 4 + (month - 1), 'lucky');
  put('우필', 10 - (month - 1), 'lucky');
  put('천괴', LUCKY_YEAR_STEM.kui[yearStem], 'lucky');
  put('천월', LUCKY_YEAR_STEM.yue[yearStem], 'lucky');
  const nok = LUCKY_YEAR_STEM.nok[yearStem];
  put('녹존', nok, 'lucky');
  put('천양', nok + 1, 'sha');
  put('타라', nok - 1, 'sha');

  // 5) 12궁
  const palaces = JAMI_PALACES.map((name, i) => {
    const branch = ((myeong - i) % 12 + 12) % 12;
    const list = stars[branch] || [];
    const opposite = (branch + 6) % 12;
    const main = list.filter((s) => s.group === 'main').map((s) => s.name);
    const lucky = list.filter((s) => s.group === 'lucky').map((s) => s.name);
    const sha = list.filter((s) => s.group === 'sha').map((s) => s.name);
    const borrowed = main.length === 0 ? (stars[opposite] || []).filter((s) => s.group === 'main').map((s) => s.name) : [];
    return {
      name,
      branch,
      branchKo: BRANCHES[branch].ko,
      branchHan: BRANCHES[branch].han,
      stem: stemForBranch(yearStem, branch),
      main,
      lucky,
      sha,
      empty: main.length === 0,
      borrowed,
      isMyeong: branch === myeong,
      isSin: branch === sin,
    };
  });

  const byName = (n) => palaces.find((p) => p.name === n);

  return {
    myeong,
    sin,
    myeongBranch: BRANCHES[myeong].ko,
    sinBranch: BRANCHES[sin].ko,
    myeongPalace: byName('명궁'),
    bucheoPalace: byName('부처궁'),
    jaebaekPalace: byName('재백궁'),
    gwanrokPalace: byName('관록궁'),
    jeoniPalace: byName('천이궁'),
    bokdeokPalace: byName('복덕궁'),
    guk,
    gukName: GUK_NAME[guk],
    naeum,
    naeumName: NAEUM_NAME[gi],
    myeongGanji: `${STEMS[mStem].ko}${BRANCHES[myeong].ko}`,
    myeongGanjiHan: `${STEMS[mStem].han}${BRANCHES[myeong].han}`,
    ziweiBranch: BRANCHES[ziwei].ko,
    palaces,
    starMap: stars,
    timeUnknown: !!unknown,
  };
}

/** 궁의 주성을 사람이 읽는 문장으로 */
export function describePalace(p) {
  if (!p) return '';
  const lucky = p.lucky.filter((s) => ['좌보', '우필', '문창', '문곡', '천괴', '천월', '녹존'].includes(s));
  if (!p.empty) {
    return `${p.branchKo}(${p.branchHan}) 자리 · ${p.main.join(' · ')}${lucky.length ? ` + ${lucky.join(' · ')}` : ''}`;
  }
  return `${p.branchKo}(${p.branchHan}) 자리 · 비어 있음 — 맞은편 ${BRANCHES[(p.branch + 6) % 12].ko}의 ${p.borrowed.join(' · ') || '기운'}을 빌려 씁니다`;
}
