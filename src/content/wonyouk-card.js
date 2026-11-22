// 원국 4기둥 카드 — 무료 결과(#/free)와 유료 리포트(신년·대운·평생 등)가 **같은 컴포넌트**를 쓴다.
//
//   [년주] [월주] [일주] [시주]
//    신     계     정     기      ← 한글 간지(천간·지지)
//    辛未   癸巳   丁丑   己酉     ← 한자
//    편재   편관   나·일간  식신    ← 십성 배지
//    금·토  수·화  화·토  토·금    ← 오행
//    ────────────────
//    하얀 양 검은 뱀 붉은 소 노란 닭  ← 결(천간 색 + 지지 동물)
//
// 결은 60갑자 이름 그대로 — 엔진이 기둥마다 만들어 두는 `pillar.full`(예: '하얀 양')을 쓴다.
// 두 화면이 이 함수 하나를 함께 쓰므로 카드 생김새·값이 어긋날 수 없다.

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

/** 카드 한 칸에 들어갈 값 — 생시를 모르면 시주는 '시간 미상' */
export function wonyoukCells(chart) {
  const p = chart.pillars;
  const cells = [
    ['년주', p.year, chart.sipsung.year],
    ['월주', p.month, chart.sipsung.month],
    ['일주', p.day, '나 · 일간'],
    ['시주', p.hour, chart.sipsung.hour],
  ];
  return cells.map(([label, pl, ss]) => ({
    label,
    day: label === '일주',
    stem: pl ? pl.stemKo : '—',
    branch: pl ? pl.branchKo : '—',
    han: pl ? pl.han : '시간 미상',
    ss: pl ? ss || '' : '',
    el: pl ? `${pl.stemOhaeng}·${pl.branchOhaeng}` : '',
    gyeol: pl ? pl.full : '',
  }));
}

/** 원국 4기둥 + 결 카드 HTML */
export function wonyoukCardHTML(chart) {
  return `<div class="ming">${wonyoukCells(chart)
    .map(
      (c) => `
      <div class="ming__cell${c.day ? ' ming__cell--day' : ''}">
        <div class="ming__label">${esc(c.label)}</div>
        <div class="ming__stem">${esc(c.stem)}</div>
        <div class="ming__branch">${esc(c.branch)}</div>
        <div class="ming__han">${esc(c.han)}</div>
        ${c.ss ? `<div class="ming__ss">${esc(c.ss)}</div>` : ''}
        ${c.el ? `<div class="ming__el">${esc(c.el)}</div>` : ''}
        ${c.gyeol ? `<div class="ming__gyeol">${esc(c.gyeol)}</div>` : ''}
      </div>`,
    )
    .join('')}</div>`;
}

/**
 * 원국 카드 바로 아래 한 줄 요약 — 사주 온도 · 띠×일주 · 절기.
 * 앞서 세 칸 카드로 따로 놓던 값을 한 줄로 붙인다. 절대 두 줄로 접히지 않는다
 * (`white-space: nowrap` + main.js 의 fitOneLineBars 가 좁은 화면에서 글자를 줄인다).
 */
export function wonyoukLineHTML(items) {
  const list = (items || []).filter(Boolean);
  if (!list.length) return '';
  return `<div class="wy-line"><div class="wy-line__inner">${list
    .map((v) => `<span class="wy-line__item">${esc(v)}</span>`)
    .join('')}</div></div>`;
}
