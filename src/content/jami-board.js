// 자미두수 12궁 명반 — 표준 4×4 사각 판
//   상단 巳 · 午 · 未 · 申 / 우측 酉 · 戌 / 하단 寅 · 丑 · 子 · 亥 / 좌측 卯 · 辰
//   가운데 2×2 칸에 기본 정보(오행국 · 명궁 · 신궁 · 명주 · 신주 · 사화 요약)
// 다락방의 밤하늘 다크 톤에 맞춘 카드형 칸. 12궁 전체 읽기가 나오는 모든 곳에서 이 하나를 쓴다.
import { SAHWA_TYPE, JAMI_PALACE_ROLE, BRANCH_HAN } from '../engine/constants.js';
import { withJosa } from '../engine/compat.js';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** 지지 인덱스 → [행, 열] (1부터) */
export const JAMI_BOARD_POS = {
  5: [1, 1], 6: [1, 2], 7: [1, 3], 8: [1, 4],
  4: [2, 1], 9: [2, 4],
  3: [3, 1], 10: [3, 4],
  2: [4, 1], 1: [4, 2], 0: [4, 3], 11: [4, 4],
};

function hwBadge(type) {
  const t = SAHWA_TYPE[type];
  return t ? `<i class="jb-hw jb-hw--${type}">${t.han}</i>` : '';
}

export function renderJamiBoard(jami) {
  if (!jami || !Array.isArray(jami.palaces) || !jami.palaces.length) return '';
  const hwMap = jami.sahuaMap || {};
  const byBranch = (i) => jami.palaces.find((p) => p.branch === i);
  const myeong = jami.myeongPalace || jami.palaces.find((p) => p.isMyeong) || null;

  const cells = jami.palaces
    .map((p) => {
      const [row, col] = JAMI_BOARD_POS[p.branch] || [1, 1];
      const opp = byBranch((p.branch + 6) % 12);
      const marks = `${p.isMyeong ? '<i class="jb-mark jb-mark--myeong">命</i>' : ''}${p.isSin ? '<i class="jb-mark jb-mark--sin">身</i>' : ''}`;
      const stars = p.empty
        ? '<span class="jb-void">空宮</span>'
        : p.main.map((s) => `<span class="jb-star">${esc(s)}${hwBadge(hwMap[s])}</span>`).join('');
      const gil = p.lucky.map((s) => `<span class="jb-chip jb-chip--gil">${esc(s)}${hwBadge(hwMap[s])}</span>`).join('');
      const sa = p.sha.map((s) => `<span class="jb-chip jb-chip--sa">${esc(s)}${hwBadge(hwMap[s])}</span>`).join('');
      const borrow = p.empty
        ? `<div class="jb-borrow">대궁 ${esc(opp ? opp.branchKo : '')}${p.borrowed.length ? ` · ${esc(p.borrowed.join('·'))}` : ''} 빌려옴</div>`
        : '';
      const cls = `jb-cell${p.isMyeong ? ' is-myeong' : ''}${p.isSin ? ' is-sin' : ''}${p.empty ? ' is-empty' : ''}`;
      return `<div class="${cls}" style="grid-row:${row};grid-column:${col}">
        <div class="jb-top"><span class="jb-name">${esc(p.name)}${marks}</span><span class="jb-branch">${esc(p.branchHan || BRANCH_HAN[p.branch] || '')}</span></div>
        <div class="jb-role">${esc(JAMI_PALACE_ROLE[p.name] || '')}</div>
        <div class="jb-stars">${stars}</div>
        ${borrow}
        <div class="jb-chips">${gil}${sa}</div>
      </div>`;
    })
    .join('');

  const sahua = (jami.sahua || [])
    .map((x) => {
      const pal = jami.palaces.find((p) => p.sahua && p.sahua.some((s) => s.star === x.star));
      return `<span class="jb-sw">${hwBadge(x.type)}${esc(x.star)}${pal ? `<em>${esc(pal.name.replace('궁', ''))}</em>` : ''}</span>`;
    })
    .join('');

  const emptyPalaces = jami.palaces.filter((p) => p.empty);
  const sinPalace = jami.palaces.find((p) => p.isSin);
  const note = myeong
    ? myeong.empty
      ? `명궁 ${esc(myeong.branchHan || '')} 공궁 · ${esc((byBranch((myeong.branch + 6) % 12) || {}).branchHan || '')} ${esc(myeong.borrowed.join('·') || '기운')} 차입`
      : `명궁 ${esc(myeong.branchHan || '')}에 ${esc(withJosa(myeong.main.join('·'), '이', '가'))} 앉았습니다`
    : '';
  const emptyLine = emptyPalaces.length > 1 ? ` · 공궁 ${emptyPalaces.length}` : '';

  return `<div class="jboard" role="group" aria-label="자미두수 12궁 명반">
    ${cells}
    <div class="jb-core" style="grid-row:2 / 4;grid-column:2 / 4">
      <div class="jb-core__k">기 본 정 보</div>
      <div class="jb-core__guk">${esc(jami.gukName || '')}<i>${esc(jami.gukHan || '')}</i></div>
      <div class="jb-core__rows">
        <div><span>명궁</span><b>${esc(jami.myeongGanji || '')}</b></div>
        <div><span>신궁</span><b>${esc(jami.sinBranch || '')}</b><em>${esc(sinPalace ? sinPalace.name : '')}</em></div>
        <div><span>명주</span><b>${esc(jami.myeongju || '')}</b></div>
        <div><span>신주</span><b>${esc(jami.sinju || '')}</b></div>
      </div>
      ${sahua ? `<div class="jb-core__sahwa"><span class="jb-core__sahwa-t">사화 · ${esc(jami.yearGanji || '')}년</span><div class="jb-core__sahwa-list">${sahua}</div></div>` : ''}
      ${note ? `<div class="jb-core__note">${note}${emptyLine}</div>` : ''}
    </div>
  </div>`;
}
