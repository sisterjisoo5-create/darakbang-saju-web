// 리포트 이미지 저장 — 버튼·문구·공유/다운로드 분기·캡처 한계 고정 검사
// 화면 렌더·실제 PNG 생성은 scripts/check-report-image.py 가 브라우저로 확인하고,
// 여기서는 마크업·모듈 계약이 깨지지 않는지 지킨다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { safeRatio, fileNameFor, shareFiles, CAPTURE_LIMITS, SAVE_LABEL, SHARE_SAVE_LABEL, BRAND_NAME, pageNumberLabel } from '../src/lib/report-image.js';

const mainJs = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles/components.css', import.meta.url), 'utf8');
const baseCss = readFileSync(new URL('../src/styles/base.css', import.meta.url), 'utf8');
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

function stubNavigator(value) {
  Object.defineProperty(globalThis, 'navigator', { value, configurable: true, writable: true });
}

test('리포트 화면 — 「리포트 인쇄 · PDF」 를 「이미지 저장」 으로 바꿨다', () => {
  assert.ok(!mainJs.includes('리포트 인쇄'), '인쇄 버튼 문구가 남지 않는다');
  assert.ok(!mainJs.includes("data-action=\"print\""), '인쇄 액션이 남지 않는다');
  assert.ok(!mainJs.includes('window.print()'), '인쇄 호출이 남지 않는다');
  assert.ok(mainJs.includes('data-action="save-image"'), '이미지 저장 버튼이 있다');
  assert.equal(SAVE_LABEL, '이미지 저장');
  // 모든 리포트가 같은 productView 를 쓰므로 버튼 자리도 한 곳이다
  assert.equal(mainJs.split('data-action="save-image"').length - 1, 1, '이미지 저장 버튼은 리포트 화면 한 곳');
  assert.ok(mainJs.includes('id="report-capture"'), '캡처 대상이 되는 리포트 카드 영역이 있다');
});

test('이미지 저장 — 누르는 것들(버튼·영수증·조작 바)은 캡처에서 뺀다', () => {
  const skips = mainJs.split('data-capture-skip').length - 1;
  assert.ok(skips >= 3, `캡처 제외 표시가 ${skips}곳 (버튼 묶음·영수증·하단 조작 바)`);
  assert.match(mainJs, /<div class="report-actions" data-capture-skip>/);
  // 미리보기 영수증(검수 모드)·결제 영수증은 이미지에 담지 않는다
  assert.match(mainJs, /class="sheet preview-receipt" data-capture-skip/);
  assert.match(mainJs, /<div class="sheet" data-capture-skip style="padding:15px 20px/);
});

test('이미지 저장 — html-to-image 를 번들 의존성으로 쓴다 (CDN 없음)', () => {
  assert.ok(pkg.dependencies['html-to-image'], 'html-to-image 가 dependencies 에 있다');
  const lib = readFileSync(new URL('../src/lib/report-image.js', import.meta.url), 'utf8');
  assert.match(lib, /import \{ toPng \} from 'html-to-image'/);
  assert.ok(!/https?:\/\/[^\s'"]*html-to-image/.test(lib + mainJs), 'CDN 주소로 불러오지 않는다');
  assert.ok(!/cdn\.jsdelivr|unpkg\.com|cdnjs/.test(mainJs + lib), '외부 CDN 스크립트가 없다');
  assert.match(lib, /pixelRatio:/, '고해상도 배율을 넘긴다');
  assert.match(lib, /blank\(url\)/, '빈 이미지(사파리)면 배율을 낮춰 다시 굽는다');
});

test('이미지 저장 — 모바일은 공유 시트, PC 는 PNG 다운로드', () => {
  const lib = readFileSync(new URL('../src/lib/report-image.js', import.meta.url), 'utf8');
  assert.match(lib, /navigator\.canShare\(\{ files \}\)/, 'canShare 로 파일 공유 가능 여부를 본다');
  assert.match(lib, /navigator\.share\(\{ files, title \}\)/, '공유 시트를 연다');
  assert.match(lib, /err\.name === 'AbortError'\) return 'canceled'/, '공유 취소는 오류로 보지 않는다');
  assert.match(lib, /a\.download = image\.name/, 'PC 는 download 로 저장한다');
  assert.match(lib, /mode: 'preview'/, '공유가 막히면 미리보기로 넘긴다');
  // 토스트 문구
  assert.match(mainJs, /이미지를 만들었어요/);
  assert.match(mainJs, /SAVING_LABEL/);
  assert.match(mainJs, /aria-busy/);
});

test('이미지 저장 — 캔버스 한계 안에서 자르고 배율을 낮춘다', () => {
  assert.equal(safeRatio(430, 1200), 2, '보통 리포트는 2배');
  assert.ok(safeRatio(430, 5500) < 2, '긴 리포트는 배율을 낮춘다');
  assert.ok(safeRatio(2000, 9000) < 1.5, '아주 큰 캔버스는 더 낮춘다');
  assert.ok(safeRatio(430, 1900, CAPTURE_LIMITS.MAX_SIDE_MOBILE) === 2, '핸드폰 한 장은 2배 유지');
  assert.ok(CAPTURE_LIMITS.MAX_PAGE_HEIGHT_MOBILE * 2 <= CAPTURE_LIMITS.MAX_SIDE_MOBILE, '2배로 키워도 iOS 4,096px 아래');
  assert.ok(CAPTURE_LIMITS.MAX_PAGE_HEIGHT_MOBILE * 430 * 4 <= CAPTURE_LIMITS.MAX_AREA, '핸드폰 한 장은 면적 한계 안');
  assert.ok(CAPTURE_LIMITS.MAX_SIDE_MOBILE < CAPTURE_LIMITS.MAX_SIDE_DESKTOP, 'PC 는 더 큰 캔버스');
  assert.ok(CAPTURE_LIMITS.MAX_PAGE_HEIGHT_MOBILE < CAPTURE_LIMITS.MAX_PAGE_HEIGHT_DESKTOP, 'PC 는 한 장에 더 길게 담는다');
  for (const [h, side] of [
    [CAPTURE_LIMITS.MAX_PAGE_HEIGHT_MOBILE, CAPTURE_LIMITS.MAX_SIDE_MOBILE],
    [CAPTURE_LIMITS.MAX_PAGE_HEIGHT_DESKTOP, CAPTURE_LIMITS.MAX_SIDE_DESKTOP],
  ]) {
    assert.ok(h * CAPTURE_LIMITS.PIXEL_RATIO <= side, `한 장(${h}px)은 2배로 키워도 캔버스 한 변 안`);
  }
  assert.equal(fileNameFor('다락방 2027 정미년 신년운세', 0, 1), '다락방 2027 정미년 신년운세.png');
  assert.equal(fileNameFor('다락방 2027 정미년 신년운세', 1, 3), '다락방 2027 정미년 신년운세-2.png');
  assert.equal(fileNameFor('a/b:c*?', 0, 1), 'a b c.png');
});

test('이미지 저장 — 공유 결과를 상태로 구분한다 (취소·차단·미지원)', async () => {
  const files = [{ name: 'x.png', type: 'image/png', size: 10 }];
  // 지원하지 않는 브라우저 (navigator.share 없음)
  stubNavigator({});
  assert.equal(await shareFiles(files), 'unsupported');

  // 사용자가 공유 창을 닫음 → 취소 (오류 아님)
  stubNavigator({
    canShare: () => true,
    share: () => Promise.reject(Object.assign(new Error('cancel'), { name: 'AbortError' })),
  });
  assert.equal(await shareFiles(files), 'canceled');

  // 제스처 만료·권한 거부 → 미리보기로
  stubNavigator({
    canShare: () => true,
    share: () => Promise.reject(Object.assign(new Error('denied'), { name: 'NotAllowedError' })),
  });
  assert.equal(await shareFiles(files), 'blocked');

  // 정상 공유
  let shared = null;
  stubNavigator({
    canShare: () => true,
    share: (data) => {
      shared = data;
      return Promise.resolve();
    },
  });
  assert.equal(await shareFiles(files, '다락방'), 'shared');
  assert.deepEqual(shared.files, files);
  assert.equal(shared.title, '다락방');
});

test('입력 화면 — 무료 안내는 금빛 한 줄 + 전체풀이 한 줄만 남는다', () => {
  assert.ok(mainJs.includes('나의 원국 · 오행 온도 · 12띠 × 일주동물 · 자미두수 맛보기 카드가 무료로 열립니다.'), '금빛 무료 안내 문구');
  assert.ok(!mainJs.includes('4가지의 맛보기'), '중복 문구가 남지 않는다');
  assert.ok(mainJs.includes('전체 풀이는 990원(1구슬), 평생 종합 리포트는 10구슬입니다.'), '전체 풀이 안내는 유지');
  assert.match(baseCss, /\.input-page__lead-free\s*\{[^}]*color:\s*var\(--gold\)/, '무료 안내는 금빛');
  // 안내 문단은 한 곳(입력 화면)에서만 나온다
  assert.equal(mainJs.split('input-page__lead').length - 1, 2, '안내 문단은 p 1개 + span 1개');
});

test('자미두수 카드 — 명궁·복덕궁 설명이 궁 이름과 같은 줄에 온다', () => {
  assert.match(mainJs, /<div class="jami3__head"><b>명궁<\/b><span class="jami3__desc">\(나의 캐릭터\)<\/span><\/div>/);
  assert.match(mainJs, /<div class="jami3__head"><b>복덕궁<\/b><span class="jami3__desc">\(마음·행복 포인트\)<\/span><\/div>/);
  assert.match(css, /\.jami3__head\s*\{[^}]*flex-direction:\s*row/, '궁 이름과 설명을 가로로');
  assert.match(css, /\.jami3__desc\s*\{[^}]*display:\s*inline/, '설명은 인라인 (줄바꿈 없음)');
  assert.ok(!/\.jami3__desc\s*\{[^}]*display:\s*block/.test(css), '예전 세로 배치가 남지 않는다');
});

test('이미지 저장 — 장마다 미니 헤더(제목·생년월일시)와 푸터(브랜드·페이지 번호)가 들어간다', () => {
  const lib = readFileSync(new URL('../src/lib/report-image.js', import.meta.url), 'utf8');
  assert.equal(BRAND_NAME, '사주보는 3층 다락방');
  // 미니 헤더 — 리포트 제목 + 생년월일시
  assert.match(lib, /class="capture-page__title"/);
  assert.match(lib, /class="capture-page__meta"/);
  // 푸터 — 브랜드 + `1 / 3`
  assert.match(lib, /capture-page__brand">\$\{esc\(BRAND_NAME\)\}/);
  assert.equal(pageNumberLabel(1, 2), '1 / 2', '`1 / 2`');
  assert.equal(pageNumberLabel(2, 2), '2 / 2', '`2 / 2`');
  assert.equal(pageNumberLabel(1, 3), '1 / 3');
  assert.equal(pageNumberLabel(3, 7), '3 / 7');
  assert.equal(pageNumberLabel(1, 1), '', '한 장짜리는 페이지 번호를 생략');
  assert.equal(pageNumberLabel(1, 0), '');
  assert.match(lib, /return t > 1 \? `\$\{n\} \/ \$\{t\}` : '';/, '번호 형식은 `n / N`');
  // 리포트 화면에서는 제목·생년월일시를 캡처에 넘긴다
  assert.match(mainJs, /const meta = state\.chart \? formatBirthLabel\(state\.chart\) : '';/);
  assert.match(mainJs, /saveReportImages\(\{ reportRoot: root, baseName, title, meta \}\)/);
  // 큰 웹 상단 머리(제목·칩·버튼)는 저장본에 넣지 않는다 — 미니 헤더가 그 자리를 대신한다
  assert.match(mainJs, /<div class="result-head" data-capture-skip>/);
  // 스타일
  assert.match(css, /\.capture-page__head\s*\{[^}]*border-bottom/);
  assert.match(css, /\.capture-page__foot\s*\{[^}]*justify-content:\s*space-between/);
  assert.match(css, /\.capture-page__body\s*\{[^}]*gap:\s*16px/);
});

test('이미지 저장 — 쪽은 카드 경계에서만 끊고, 카드가 잘리지 않는다', () => {
  const lib = readFileSync(new URL('../src/lib/report-image.js', import.meta.url), 'utf8');
  // 1단계에서 카드를 얹어 보며 나눌 자리를 정하고, 2단계에서 그 묶음대로 굽는다
  assert.match(lib, /const groups = \[\];/);
  assert.match(lib, /groups\.push\(cardNodes\.slice\(index, index \+ taken\)\)/);
  assert.match(lib, /groups\[g\]\.forEach\(\(node\) => body\.appendChild\(node\.cloneNode\(true\)\)\)/);
  // 한 카드가 한 장보다 커도 반으로 자르지 않고 통째로 담는다
  assert.match(lib, /\/\/ 한 카드가 한 장보다 커도 통째로 담는다/);
  // 페이지 뼈대는 헤더 → 카드 묶음 → 푸터 순서
  assert.match(lib, /page\.append\(head, body, foot\)/);
});

test('공유용 이미지 — 무료 「12띠 × 일주 동물」 카드 한 장을 같은 방식으로 담는다', () => {
  const lib = readFileSync(new URL('../src/lib/report-image.js', import.meta.url), 'utf8');
  assert.match(lib, /options\.cards/, '카드를 직접 지정할 수 있다');
  assert.match(mainJs, /async function saveZodiacShareFlow\(btn\)/);
  assert.match(mainJs, /saveReportImages\(\{ baseName, title, meta, cards: \[card\] \}\)/);
  assert.match(mainJs, /data-action="save-zodiac"/);
  assert.equal(SHARE_SAVE_LABEL, '공유용 이미지 저장');
  // 파일 이름은 「다락방 12띠 × 일주 동물.png」
  assert.equal(fileNameFor('다락방 12띠 × 일주 동물', 0, 1), '다락방 12띠 × 일주 동물.png');
});

test('이미지 캡처 — 폰 카드(430px) 모양으로 화면 밖에서 그린다', () => {
  assert.match(css, /\.capture-host\s*\{[^}]*position:\s*fixed/);
  assert.match(css, /\.capture-page\s*\{[^}]*padding:\s*26px 18px 22px/, '여백은 넉넉하게(26·18·22)');
  assert.match(css, /\.capture-page \.sheet\s*\{[^}]*padding:\s*20px 16px/, 'PC 에서도 폰 카드 여백');
  assert.match(css, /\.capture-page \.jboard\s*\{/, '자미두수 명반판도 폰 크기로');
  assert.match(css, /\.img-preview img\s*\{/, '공유가 막힐 때 미리보기 카드');
});
