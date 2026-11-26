// 무료 놀이터 결과 공유 — 이미지 카드 · 카카오톡 · 스크롤 최상단 고정 검사
// 실제 그림·공유 시트는 scripts/check-playground.py 가 브라우저로 확인하고,
// 여기서는 문구·계약·구조가 다시 무너지지 않는지 지킨다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { renderPlayCard, PLAY_KIND_META, PLAY_IMAGE } from '../src/lib/play-card-image.js';
import { secretNote } from '../src/engine/playground.js';

const mainJs = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const cardJs = readFileSync(new URL('../src/lib/play-card-image.js', import.meta.url), 'utf8');
const contentJs = readFileSync(new URL('../src/content/playground.js', import.meta.url), 'utf8');
const engineJs = readFileSync(new URL('../src/engine/playground.js', import.meta.url), 'utf8');

test('놀이터 4종 결과 — 이미지로 저장 · 카카오톡으로 공유 버튼을 모두 붙인다', () => {
  assert.equal(mainJs.split('playShareHTML(').length - 1, 5, '공유 버튼 묶음은 4종 + 함수 정의 1곳');
  for (const kind of ['charm', 'note', 'signal', 'scenery']) {
    assert.ok(mainJs.includes(`playShareHTML('${kind}')`), `${kind} 결과에 공유 버튼`);
  }
  assert.ok(mainJs.includes("data-action=\"play-save-image\""));
  assert.ok(mainJs.includes("data-action=\"play-kakao-share\""));
  assert.ok(mainJs.includes('이미지로 저장'), '이미지로 저장 문구');
  assert.ok(mainJs.includes('카카오톡으로 공유'), '카카오톡 공유 문구');
});

test('이미지 카드 — 캔버스로 1080×1350 다락방 카드를 그리고 워터마크를 넣는다', () => {
  assert.equal(typeof renderPlayCard, 'function');
  assert.equal(PLAY_IMAGE.width, 1080);
  assert.equal(PLAY_IMAGE.height, 1350);
  assert.equal(cardJs.split('createElement(\'canvas\')').length - 1, 1, '캔버스로 직접 그린다');
  assert.ok(cardJs.includes('@3f.zanie · 사주보는 3층 다락방'), '이미지 하단 워터마크');
  assert.ok(cardJs.includes('#0a1020') || cardJs.includes('NAVY_DEEP'), '다크 네이비 바탕');
  assert.ok(cardJs.includes("'#fdf7ea'") || cardJs.includes('CREAM'), '크림 카드');
  for (const kind of ['charm', 'note', 'signal', 'scenery', 'receipt']) {
    assert.ok(PLAY_KIND_META[kind], `${kind} 카드 메타`);
  }
  assert.ok(cardJs.includes("'@3F_Zanie'"), '영수증 카드에 @3F_Zanie 표기');
  assert.ok(cardJs.includes('사주보는 3층 다락방'), '영수증 카드에 브랜드 표기');
});

test("05 돈 새는 구멍 영수증 — 허브 카드·라우트·이미지·X 공유·990원 CTA", () => {
  /* 허브 05 카드와 전용 라우트 */
  assert.ok(mainJs.includes("no: '05', href: '#/play/receipt'"));
  assert.ok(mainJs.includes("path === '/play/receipt'") && mainJs.includes("name: 'play-receipt'"));
  assert.ok(mainJs.includes("r.name === 'play-receipt'") && mainJs.includes('receiptView()'));
  assert.ok(mainJs.includes("form: 'play-receipt'") && mainJs.includes("form.dataset.form === 'play-receipt'"));
  /* 이미지 · X · 카톡 */
  assert.ok(mainJs.includes("data-action=\"play-save-image\" data-kind=\"receipt\""));
  assert.ok(mainJs.includes("data-action=\"play-share-x\" data-kind=\"receipt\""));
  assert.ok(mainJs.includes("data-action=\"play-kakao-share\" data-kind=\"receipt\""));
  assert.ok(mainJs.includes("if (kind === 'receipt')"), '복사·카드 데이터 분기');
  /* 990원 전환 — 재물운·대운 */
  assert.ok(mainJs.includes("productHref('wealth')"), '재물운 990원 CTA');
  assert.ok(mainJs.includes("productHref('daewoon')"), '대운 990원 CTA');
  /* 공유 버튼 묶음은 기존 4종과 분리된 함수 — 4종 화면이 변하지 않는다 */
  assert.ok(!mainJs.includes("playShareHTML('receipt')"));
  /* 영수증 블록은 결제 영수증(.receipt)과 겹치지 않는 이름을 쓴다 */
  assert.ok(!/<div class="receipt"/.test(mainJs), '결제 영수증 클래스와 분리');
  assert.ok(/class="money-receipt"/.test(mainJs));
});

test('이미지 저장 — iOS 공유 시트(파일) → 다운로드/미리보기 순서', () => {
  assert.ok(mainJs.includes('navigator.canShare({ files: [file] })'), '파일 공유 지원 확인');
  assert.ok(mainJs.includes('navigator\n      .share({ files: [file]'), '파일을 공유 시트로 넘긴다');
  assert.ok(mainJs.includes('openImagePreviewModal(images, card.title)'), '아이폰은 미리보기(길게 눌러 저장)');
  assert.ok(mainJs.includes('downloadPlayCard(card)'), '데스크톱은 다운로드');
});

test('비밀 쪽지 — 띠 이름 중복 접두사를 지우고 인용 박스는 주석으로 감춘다', () => {
  const n = secretNote({ now: new Date('2026-11-24T10:00:00+09:00') });
  assert.ok(!/^[가-힣]+띠\s*—/.test(n.animalLine), `앞머리 중복 없음: ${n.animalLine}`);
  assert.ok(n.animalLine.includes('띠'), '행운의 띠 문장은 남는다');
  assert.match(engineJs, /replace\(\/\^\[가-힣\]\+띠\\s\*—\\s\*\/, ''\)/);
  assert.match(mainJs, /<!--\s*\n\s*<p class="note-paper__line">/);
  assert.match(mainJs, /<span class="note-paper__seal">/);
});

test('매력살 — 화면에는 핵심 4종만, 나머지는 990원으로 넘긴다', () => {
  assert.match(mainJs, /const SAL_CORE = \['dohwa', 'hongyeom', 'cheoneul', 'yeokma'\]/);
  assert.ok(mainJs.includes('r.items.filter((it) => SAL_CORE.includes(it.key))'));
  assert.ok(!mainJs.includes('자니가 콕 집은 포인트'), '긴 포인트 목록은 뺀다');
  for (const key of ['dohwa', 'hongyeom', 'cheoneul', 'munchang', 'hwagae', 'yeokma']) {
    assert.ok(contentJs.includes(`${key}: {`), `${key} 판독 데이터 유지`);
  }
  assert.ok(mainJs.includes('언제 연애·재물로 터지는지'), '990원 잠금 안내');
});

test('찐심 판독 — 일주 상세·판독 근거 없이 점수 → 처방 → CTA → 공유 순서', () => {
  assert.ok(!mainJs.includes('signal-grid'), '일주·근거 2단 박스 제거');
  assert.ok(!mainJs.includes('signal-evidence'), '판독 근거 리스트 제거');
  assert.ok(!mainJs.includes('signal-ilju'), '일주 상세 제거');
  const result = mainJs.slice(mainJs.indexOf('function signalResultHTML'), mainJs.indexOf('function signalView'));
  const order = ['signal-head', 'signal-tip', 'play-cta', "playShareHTML('signal')"].map((k) => result.indexOf(k));
  assert.ok(order.every((v) => v > 0), `네 블록이 모두 있다: ${order}`);
  assert.deepEqual(order, [...order].sort((a, b) => a - b), '점수 → 처방 → CTA → 공유 순서');
});

test('풍경 — 휴식·대인 점수와 함께 놓인 것들 박스를 빼고 통합 목록 하나로', () => {
  assert.ok(!mainJs.includes('htp-scores'), '휴식·대인 블록 삭제');
  assert.ok(!mainJs.includes('자니가 본 풍경'), '자니가 본 풍경 블록 삭제');
  assert.ok(!mainJs.includes('함께 놓인 것들'), '별도 함께 놓인 것들 삭제');
  assert.ok(mainJs.includes('class="htp-list"'), '통합 스티커 목록');
  assert.match(mainJs, /res\.readings\.map\(/);
  assert.ok(mainJs.includes("productHref('jami')"), '자미두수 990원 CTA');
  assert.ok(!mainJs.includes('.slice(0, 5)'), '목록은 놓은 스티커를 모두 담는다');
});

test('라우트 이동은 언제나 화면 맨 위 — 해시 앵커 판정을 두 번째 # 으로', () => {
  const fn = mainJs.slice(mainJs.indexOf("window.addEventListener('hashchange'"));
  assert.ok(fn.includes("location.hash.indexOf('#', 1)"), '앵커는 두 번째 # 뒤에서만 찾는다');
  assert.ok(fn.includes('scrollPageTop()'), '라우트 이동은 scrollPageTop');
  assert.ok(mainJs.includes("history.scrollRestoration = 'manual'"), '브라우저 스크롤 복원을 끈다');
});
