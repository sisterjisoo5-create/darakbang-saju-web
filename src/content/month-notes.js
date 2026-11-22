// 달마다의 '마음의 결' 한 줄 — 표의 문구가 한 가지로 도배되지 않게, 십성과 일지 관계로 결을 가른다.
//
// 2026-11-22 시연 님 지적:
//   재회운 「다시 이어지는 시기」 표의 '마음의 결' 열이 12달 내내 `관계의 문이 움직임` 하나로만 나왔다.
//   원인은 코드가 문구가 아니라 **문구가 있는지**(`DAE_LOVE[m.sipsung] ? … : …`)를 물어
//   늘 참이 되어 첫 값만 찍힌 것 — 그 자리를 이 함수로 대체한다.
//
// 규칙
//   ① 위 문단의 '마음이 물러지는 달'(정인·편인·식신)과 '말이 세지는 달'(상관·겁재·편관)은
//      그 결을 그대로 이어받는다 — 표와 설명이 어긋나지 않게.
//   ② 나머지 십성은 월지와 내 일지의 관계(육합·삼합·충·형·파·원진)로 결을 정한다.
//   ③ 관계도 없으면 십성 성질 그대로.
import { BRANCHES } from '../engine/constants.js';
import { branchRelation } from '../engine/compat.js';

/** 마음이 물러지는 달 — 연락이 예전의 문을 두드리는 쪽 */
const SOFT_NOTE = {
  정인: '툭 치면 답이 오는 달',
  편인: '한밤중에 생각나는 달',
  식신: '밥 한 끼로 말 트는 달',
};

/** 말이 세지고 자존심이 올라오는 달 — 다시 만나면 대화가 또 부딪히는 쪽 */
const SHARP_NOTE = {
  상관: '말이 칼이 되는 달',
  겁재: '자존심이 먼저 나서는 달',
  편관: '재촉하면 멀어지는 달',
};

/** 관계가 잡히지 않는 달 — 십성 성질 그대로 */
const PLAIN_NOTE = {
  비견: '내가 먼저 정리하는 달',
  정관: '용건으로 만나는 달',
  편재: '바깥일로 마주치는 달',
  정재: '생활 접점에서 스치는 달',
};

/** 월지 ↔ 내 일지 관계가 결을 정하는 달 */
const RELATION_NOTE = {
  육합: '손잡으면 풀리는 달',
  삼합: '같은 방향을 보는 달',
  충: '만나면 또 부딪히는 달',
  형: '같은 말로 또 다투는 달',
  파: '약속이 어긋나는 달',
  원진: '이유 없이 서운한 달',
};

/**
 * 재회운 표의 '마음의 결' 한 칸.
 * @param {{sipsung:string, branch:number}} month chart.sewoon.list 의 한 달
 * @param {object} chart computeChart 결과 (일지 이름만 쓴다)
 */
export function reunionMonthNote(month, chart) {
  const s = month && month.sipsung;
  if (SOFT_NOTE[s] || SHARP_NOTE[s]) return SOFT_NOTE[s] || SHARP_NOTE[s];
  const dayBranchKo = chart && chart.pillars && chart.pillars.day && chart.pillars.day.branchKo;
  if (dayBranchKo && month && Number.isInteger(month.branch)) {
    const rel = branchRelation(BRANCHES[month.branch].ko, dayBranchKo);
    if (rel && RELATION_NOTE[rel]) return RELATION_NOTE[rel];
  }
  return PLAIN_NOTE[s] || '조용히 지나가는 달';
}
