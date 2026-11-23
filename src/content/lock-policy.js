// 미결제(잠금) 공개 정책 — 2026-11-23 시연 님 지시
//   · 첫 번째 카드(인덱스 0)만 맛보기 1~2블록
//   · 두 번째 카드부터는 제목(kicker + heading)만, 본문은 0블록
//   · 결제 완료(unlocked) 상태는 이 정책과 무관하게 모든 블록을 그대로 보여 준다
//
// 이전에는 각 빌더의 freeBlocks(1~4, 원국은 99)만 보고 잘랐기 때문에
// { t: 'li' }·{ t: 'table' }·{ t: 'jami' }가 한 블록에 통째로 들어 있는 카드가
// 미결제 상태에서 전부 노출됐다. 이제 자르는 규칙은 이 파일 하나가 정한다.

/** 맛보기로 내보내도 되는 블록 — 한 줄 글·소제목·짧은 태그·원국 카드뿐 */
export const PREVIEW_BLOCK_TYPES = new Set(['p', 'q', 'sub', 'oneline', 'chips', 'ming']);

/** 첫 카드에 보여 줄 수 있는 최대 블록 수 */
export const MAX_PREVIEW_BLOCKS = 2;

/** 첫 카드 맛보기 블록 수 — 앞에서부터 맛보기 블록이 이어지는 동안만, 최대 2개.
 *  표·리스트·막대·12궁 차트·점수 같은 통째 블록을 만나면 거기서 멈춘다. */
export function previewBlockCount(blocks = [], freeBlocks = MAX_PREVIEW_BLOCKS) {
  const cap = Math.min(Number.isFinite(freeBlocks) ? freeBlocks : 0, MAX_PREVIEW_BLOCKS);
  let n = 0;
  while (n < cap && n < blocks.length) {
    if (!PREVIEW_BLOCK_TYPES.has(blocks[n].t)) break;
    n += 1;
  }
  return n;
}

/** 섹션의 미결제 공개 블록 수 — 인덱스 0만 맛보기, 그 뒤는 무조건 0 */
export function freeBlocksFor(section, index = 0) {
  if (!section) return 0;
  if (index !== 0) return 0;
  return previewBlockCount(section.blocks || [], section.freeBlocks);
}

/** 미결제 상태에서 섹션 하나를 visible(공개) / hidden(가림)으로 가른다 */
export function splitLockedSection(section, index = 0) {
  const blocks = (section && section.blocks) || [];
  const free = freeBlocksFor(section, index);
  return { freeCount: free, visible: blocks.slice(0, free), hidden: blocks.slice(free) };
}

/** 빌더가 만든 섹션 목록에 정책을 입힌다 — 빌드 단계에서 freeBlocks를 실제 공개 수로 확정 */
export function lockSections(sections = []) {
  return sections.map((section, index) => ({ ...section, freeBlocks: freeBlocksFor(section, index) }));
}

/** 미결제 상태에서 이 섹션이 가려지는가 (= 뒤에 숨길 블록이 있는가) */
export function isSectionLocked(section, index = 0) {
  const blocks = (section && section.blocks) || [];
  return blocks.length > freeBlocksFor(section, index);
}
