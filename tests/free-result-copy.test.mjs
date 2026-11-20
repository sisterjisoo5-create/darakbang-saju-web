// 무료 원국 결과 화면 문구 — 오행 온도 섹션(제목·짧은 설명) · 12띠 × 일주 동물 카드(멘트·버튼) 고정 검사
// 화면 렌더 결과는 scripts/check-free-v11.py 가 브라우저로 확인하고, 여기서는 원본 마크업이 새 사양인지 지킨다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mainJs = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles/components.css', import.meta.url), 'utf8');

const TEMP_SUB = '내 사주의 따뜻한 기운(불·나무)과 서늘한 기운(물·쇠) 비율로 본 타고난 온도';
const ZI_HOOK = '이성에게 보이는 나의 반전 모습은? 어필 포인트 3가지, 연애 할 때 내가 조심해야 할 포인트까지';

const ziBlock = () => {
  const start = mainJs.indexOf('function zodiacIljuHTML');
  const end = mainJs.indexOf('/** 자미두수 슬림 카드');
  assert.ok(start > 0 && end > start, 'zodiacIljuHTML 블록을 찾을 수 있다');
  return mainJs.slice(start, end);
};

test('오행 온도 — 제목은 숫자 없이 「오행 온도」만 남는다', () => {
  assert.match(mainJs, /<h3>오행 온도<\/h3>/);
  assert.ok(!mainJs.includes('오행 온도 ${chart.ohaeng.temp}°C'), '제목에 온도 수치가 붙지 않는다');
  // 오른쪽 수치(온도 게이지)는 그대로 남는다
  assert.ok(mainJs.includes("${chart.ohaeng.temp}°C<small>${chart.ohaeng.label}</small>"));
});

test('오행 온도 — 제목 아래 짧은 설명 한 줄이 들어간다', () => {
  assert.ok(mainJs.includes(`class="temp-sub">${TEMP_SUB}</p>`), '짧은 설명(2안) 문구가 그대로 들어간다');
  assert.match(css, /\.temp-sub\s*\{[^}]*font-size:\s*12\.5px/);
  // 제목 → 설명 → 게이지 순서
  const iTitle = mainJs.indexOf('<h3>오행 온도</h3>');
  const iSub = mainJs.indexOf('class="temp-sub"');
  const iScale = mainJs.indexOf('${tempScaleHTML(chart)}');
  assert.ok(iTitle < iSub && iSub < iScale, '제목 → 짧은 설명 → 온도 게이지 순서');
});

test('오행 온도 — 긴 설명 박스와 부족한/강한 기운 안내 박스를 지웠다', () => {
  assert.ok(!mainJs.includes('temp-note'), '긴 설명 박스 마크업과 클래스가 남지 않는다');
  assert.ok(!css.includes('.temp-note'), '긴 설명 박스 CSS 도 남지 않는다');
  for (const gone of [
    '이 온도는',
    '부족한 오행을 알려주는 숫자가',
    '6°C~38°C 기질 온도',
    '이 기운이 비어 있는 사주예요',
    '가장 강한 기운은',
    '다섯 기운이 모두 있는 사주예요',
  ]) {
    assert.ok(!mainJs.includes(gone), `삭제 문구가 남지 않는다: ${gone}`);
  }
  // 막대 그래프는 그대로 남는다
  assert.ok(mainJs.includes('${ohaengBarsHTML(chart)}'));
});

test('12띠 × 일주 동물 — 카드 멘트를 새 문구로 교체했다', () => {
  const zi = ziBlock();
  assert.ok(zi.includes(`class="zi-teaser__hook">${ZI_HOOK}</p>`), '새 멘트가 그대로 들어간다');
  assert.ok(!zi.includes('그런데 이 조합'), '옛 멘트가 남지 않는다');
  assert.ok(!zi.includes('연애에서 조심할 한 가지까지'), '옛 멘트가 남지 않는다');
  // 겉·속 한 줄과 결제 안내는 유지
  assert.ok(zi.includes('class="zi-teaser__line"'));
  assert.ok(zi.includes('결제 후 1초 만에 열리고'));
});

test('12띠 × 일주 동물 — 카드 한 줄에서 「{띠} × {일주동물} 일주 —」 접두사를 지웠다', () => {
  const zi = ziBlock();
  const i = zi.indexOf('class="zi-teaser__line"');
  const line = zi.slice(i, zi.indexOf('</p>', i) + 4);
  assert.ok(line.length > 4, '한 줄 블록을 찾을 수 있다');
  assert.ok(!line.includes('${esc(zi.title)}'), 'title(띠 × 일주동물) 접두사를 쓰지 않는다');
  assert.ok(!/띠 × [^<]*일주 —/.test(line), `띠 × 일주동물 — 접두사가 남지 않는다: ${line}`);
  // 콤보 한 줄 요약만 깔끔히 노출 — 「겉은 …, 속은 ….」
  assert.equal(
    line,
    'class="zi-teaser__line">겉은 <b>${esc(zi.year.face)}</b>, 속은 <b>${esc(zi.day.name)}</b>.</p>',
    `겉·속 요약만 남는다: ${line}`,
  );
});

test('12띠 × 일주 동물 — 「맛보기 더 보기」 없이 990원 결제 버튼 하나만', () => {
  const zi = ziBlock();
  assert.ok(!zi.includes('맛보기 더 보기'), '맛보기 더 보기 버튼이 없다');
  assert.ok(!mainJs.includes('맛보기 더 보기'), '다른 곳에도 맛보기 더 보기 링크가 없다');
  assert.equal((zi.match(/data-action="open-pay"/g) || []).length, 1, '결제 버튼은 하나');
  assert.ok(zi.includes(`data-action="open-pay" data-pid="\${product.id}">1구슬(990원)으로 전체 열기 →</button>`));
  // 카드 안 버튼/링크는 결제 버튼 1개뿐 (남은 유령 링크·핸들러 없음)
  const cta = zi.slice(zi.indexOf('zi-teaser__cta'), zi.indexOf('zi-teaser__note'));
  assert.equal((cta.match(/<(button|a)\b/g) || []).length, 1, 'CTA 영역에 버튼 하나만');
  assert.ok(!cta.includes('btn--ghost'), '유령 버튼 스타일이 남지 않는다');
  assert.ok(!css.includes('.zi-teaser__hook b'), '쓰지 않는 멘트 강조 CSS 를 지웠다');
});
