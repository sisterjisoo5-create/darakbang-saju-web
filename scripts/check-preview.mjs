#!/usr/bin/env node
// 검수용 비밀 미리보기(?preview=3f990) 검수 — 빌드된 번들을 실제 DOM(jsdom)에서 돌려 확인한다
//
//   node scripts/check-preview.mjs          # dist/ (로컬 빌드)
//   node scripts/check-preview.mjs --live   # 라이브 GitHub Pages 에 올라간 번들
//
// 확인 항목
//  · 일반 방문자 : 배지 없음 · 유료 리포트 12종 모두 잠김 · 결제 버튼 노출 · 코드 힌트 없음
//  · ?preview=3f990 : 배지 표시 · 12종 모두 잠금 없이 공개 · 미리보기 영수증 · 결제 버튼 없음
//  · 잘못된 코드(0000·3f9900·빈 값) : 켜지지 않고 잠김 유지
//  · 같은 탭에서 파라미터 없이 다시 들어와도 저장 표식으로 유지
//  · 무료 결과 화면의 12띠 카드 : 일반 = 결제 버튼 / 미리보기 = 전체 열람 링크
//  · 미리보기 + 생년월일 없음 : 상품 카드가 #/input?next=<id> 로 가고, 입력을 마치면 그 상품이 바로 열린다(결제창 없음)
//  · 미리보기 + 생년월일 있음 : 카드를 누르면 결제창 없이 그 상품이 바로 열린다
//  · 일반 방문자(생년월일 없음/있음) : 카드 주소·입력 후 이동·결제창이 예전 그대로

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const LIVE_URL = 'https://sisterjisoo5-create.github.io/darakbang-saju-web/';
const LIVE = process.argv.includes('--live') || process.env.SITE === '1';

const ME = { calendar: 'solar', year: 1991, month: 5, day: 7, hour: 18, minute: 22, timeUnknown: false, gender: 'female', leap: false };
const PARTNER = { calendar: 'solar', year: 1990, month: 3, day: 12, hour: 9, minute: 10, timeUnknown: false, gender: 'male', leap: false };
const BIAS = { calendar: 'solar', year: 1997, month: 3, day: 30, hour: 12, minute: 0, timeUnknown: true, gender: 'male', leap: false };
const SEED = { profile: ME, partner: PARTNER, bias: { name: '차은우', profile: BIAS }, beads: 0, orders: [], unlocks: {}, todayFree: '', createdAt: '' };
const EMPTY_SEED = { profile: null, partner: null, bias: null, beads: 0, orders: [], unlocks: {}, todayFree: '', createdAt: '' };

const IDS = ['newyear', 'compat', 'zodiac-ilju', 'bias', 'love', 'reunion', 'jami', 'career', 'wealth', 'daewoon', 'saju', 'lifetime'];

const fails = [];
const check = (cond, msg) => {
  console.log((cond ? '  ok   ' : '  FAIL ') + msg);
  if (!cond) fails.push(msg);
};

/* ── 소스: 로컬 dist 또는 라이브 ─────────────────────────────── */
async function loadSource() {
  if (!LIVE) {
    const html = readFileSync(path.join(DIST, 'index.html'), 'utf8');
    const src = (html.match(/assets\/index-[A-Za-z0-9_-]+\.js/) || [])[0];
    const js = readFileSync(path.join(DIST, src), 'utf8');
    const css = readFileSync(path.join(DIST, (html.match(/assets\/index-[A-Za-z0-9_-]+\.css/) || [])[0]), 'utf8');
    return { html, js, css, url: LIVE_URL, label: src };
  }
  const res = await fetch(LIVE_URL);
  const html = await res.text();
  const src = (html.match(/assets\/index-[A-Za-z0-9_-]+\.js/) || [])[0];
  const cssPath = (html.match(/assets\/index-[A-Za-z0-9_-]+\.css/) || [])[0];
  if (!src) throw new Error('라이브 index.html 에서 번들 경로를 찾지 못했습니다');
  const jsRes = await fetch(new URL(src, LIVE_URL));
  const js = await jsRes.text();
  const css = cssPath ? await (await fetch(new URL(cssPath, LIVE_URL))).text() : '';
  return { html, js, css, url: LIVE_URL, label: src, status: res.status };
}

/* ── DOM 부팅 ────────────────────────────────────────────────── */
function boot(source, url, sessionSeed = null, seed = SEED) {
  const errs = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errs.push(String((e && e.message) || e)));
  const dom = new JSDOM(source.html, { url, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
  const { window } = dom;
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  window.scrollTo = () => {};
  window.print = () => {};
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  if (!window.IntersectionObserver) window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.localStorage.setItem('darakbang.v2', JSON.stringify(seed));
  if (sessionSeed != null) window.sessionStorage.setItem('darakbang.preview', sessionSeed);
  window.eval(source.js);
  return { window, errs };
}

function state(win) {
  const d = win.document;
  const body = d.body.textContent || '';
  const strip = d.querySelector('.preview-strip');
  const receipt = d.querySelector('.preview-receipt');
  return {
    strip: strip ? strip.textContent.replace(/\s+/g, ' ').trim() : null,
    locked: d.querySelectorAll('.lock-wrap').length + d.querySelectorAll('.lock-band').length,
    sheets: d.querySelectorAll('.sheet.rp').length,
    receipt: receipt ? receipt.textContent.replace(/\s+/g, ' ').trim() : null,
    paid: body.includes('결제 완료'),
    hint: body.includes('3f990') || body.includes('미리보기 코드'),
    payButtons: d.querySelectorAll('[data-action="open-pay"]').length,
    previewInputs: [...d.querySelectorAll('input')].filter((i) => /preview/i.test(`${i.name} ${i.placeholder} ${i.id}`)).length,
  };
}

const tick = () => new Promise((r) => setTimeout(r, 10));
async function visit(win, hash) {
  win.location.hash = hash;
  await tick();
  await tick();
}

/* 생년월일 폼 제출 — 실제 방문자처럼 submit 이벤트로 보낸다(기본값은 오늘 날짜로 채워져 있다) */
async function submitBirth(win) {
  const form = win.document.querySelector('form[data-form="birth"]');
  if (!form) return false;
  form.dispatchEvent(new win.Event('submit', { bubbles: true, cancelable: true }));
  await tick();
  await tick();
  return true;
}

/* 상품 카드/버튼 클릭 — 해시 라우터는 클릭으로만 움직인다 */
async function clickEl(win, el) {
  el.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }));
  await tick();
  await tick();
}

async function main() {
  const source = await loadSource();
  console.log(`검수 대상: ${LIVE ? '라이브 ' : '로컬 dist '}${source.label}${source.status ? ` (HTTP ${source.status})` : ''}\n`);

  if (LIVE) console.log(`  ok   라이브 index.html 이 번들 ${source.label} 을 가리킨다`);
  check(source.css.includes('.preview-strip'), 'CSS 에 미리보기 배지 스타일 포함');
  check(source.js.includes('3f990'), '번들에 비밀 코드 포함');

  console.log('\n── 일반 방문자 (파라미터 없음)');
  {
    const { window, errs } = boot(source, source.url);
    await tick();
    let s = state(window);
    check(s.strip === null, '홈 — 미리보기 배지 없음');
    check(!s.hint, '홈 — 코드·preview 힌트 노출 없음');
    for (const id of IDS) {
      await visit(window, `#/product/${id}`);
      s = state(window);
      check(s.strip === null, `${id} — 배지 없음`);
      check(s.locked > 0, `${id} — 잠김 유지 (lock ${s.locked}곳)`);
      check(s.receipt === null && !s.paid, `${id} — 미리보기 영수증·결제 완료 없음`);
      check(s.payButtons > 0, `${id} — 결제 버튼 노출 (${s.payButtons})`);
      check(s.previewInputs === 0, `${id} — 코드 입력칸 없음`);
    }
    await visit(window, '#/free');
    s = state(window);
    check(s.payButtons === 1, `무료 결과 — 12띠 결제 버튼 1개`);
    check(!errs.length, `런타임 에러 0 ${errs.slice(0, 2)}`);
    window.close();
  }

  console.log('\n── ?preview=3f990 미리보기');
  {
    const { window, errs } = boot(source, `${source.url}?preview=3f990`);
    await tick();
    let s = state(window);
    check(s.strip !== null && s.strip.includes('검수용 미리보기 모드'), `홈 — 배지 「${s.strip}」`);
    check(!s.hint, '홈 — 코드 힌트 노출 없음');
    for (const id of IDS) {
      await visit(window, `#/product/${id}`);
      s = state(window);
      check(s.strip !== null, `${id} — 배지 유지`);
      check(s.locked === 0, `${id} — 잠금 없이 전체 공개 (lock ${s.locked}곳)`);
      check(s.sheets >= 2, `${id} — 리포트 장 ${s.sheets}개 렌더`);
      check(s.receipt !== null && s.receipt.includes('검수용 미리보기 모드'), `${id} — 미리보기 영수증`);
      check(!s.paid, `${id} — 「결제 완료」 없음`);
      check(s.payButtons === 0, `${id} — 결제 버튼 없음`);
    }
    await visit(window, '#/free');
    s = state(window);
    const zi = window.document.querySelector('.zi-teaser__cta a');
    check(s.payButtons === 0, '무료 결과 — 결제 버튼 0');
    check(zi && zi.getAttribute('href') === '#/product/zodiac-ilju', '무료 결과 — 12띠는 전체 열람 링크');
    check(!errs.length, `런타임 에러 0 ${errs.slice(0, 2)}`);
    window.close();
  }

  console.log('\n── 잘못된 코드 — 켜지지 않음');
  for (const bad of ['0000', '3f9900', '', '3F990']) {
    const { window } = boot(source, `${source.url}?preview=${bad}`);
    await tick();
    await visit(window, '#/product/saju');
    const s = state(window);
    check(s.strip === null && s.locked > 0, `?preview=${bad || '(빈 값)'} — 꺼짐·잠김 유지`);
    window.close();
  }

  console.log('\n── 유지 — 같은 탭에서 파라미터 없이 다시 들어온 경우');
  {
    const { window } = boot(source, `${source.url}#/product/saju`, '3f990');
    await tick();
    await visit(window, '#/product/wealth');
    const s = state(window);
    check(s.strip !== null && s.locked === 0, '저장 표식(sessionStorage)으로 유지');
    window.close();
  }

  console.log('\n── 미리보기 + 생년월일 없음 — 카드 → 입력 → 그 상품 바로 열람');
  {
    const { window, errs } = boot(source, `${source.url}?preview=3f990`, null, EMPTY_SEED);
    await tick();
    const d = window.document;
    const cards = [...d.querySelectorAll('.pcard')];
    check(cards.length === 12, `홈 — 상품 카드 ${cards.length}장`);
    const allNext = cards.every((a) => a.getAttribute('href') === `#/input?next=${a.getAttribute('href').split('next=')[1]}`);
    check(allNext, '홈 — 카드 주소가 모두 #/input?next=<id>');
    check(cards.some((a) => a.getAttribute('href') === '#/input?next=saju'), '홈 — 정통 사주 해설 카드가 #/input?next=saju');

    await clickEl(window, d.querySelector('.pcard[href="#/input?next=saju"]'));
    check(window.location.hash === '#/input?next=saju', `카드 클릭 → 입력 화면 (${window.location.hash})`);
    check(d.querySelector('#modal-root').innerHTML.trim() === '', '카드 클릭 — 결제창 없음');
    check(!!d.querySelector('.input-page__next'), '입력 화면 — 「리포트로 이어집니다」 안내');
    check(/정통 사주 해설/.test((d.querySelector('.input-page__next') || {}).textContent || ''), '안내에 상품 이름');

    const ok = await submitBirth(window);
    check(ok, '생년월일 폼 제출');
    check(window.location.hash === '#/product/saju', `입력 완료 → 그 상품 리포트 (${window.location.hash})`);
    const s = state(window);
    check(s.strip !== null, '그 상품 — 미리보기 배지 유지');
    check(s.locked === 0 && s.payButtons === 0, '그 상품 — 잠금·결제 버튼 없음');
    check(s.receipt !== null && s.receipt.includes('검수용 미리보기 모드'), '그 상품 — 미리보기 영수증');

    await visit(window, '#/product/wealth');
    const s2 = state(window);
    check(s2.locked === 0 && s2.payButtons === 0, '두 번째 상품 — 생년월일이 있으므로 즉시 열람');
    check(!errs.length, `런타임 에러 0 ${errs.slice(0, 2)}`);
    window.close();
  }

  console.log('\n── 미리보기 + 생년월일 있음 — 카드 클릭 → 즉시 열람');
  {
    const { window } = boot(source, `${source.url}?preview=3f990`);
    await tick();
    const d = window.document;
    const card = d.querySelector('.pcard[href="#/product/saju"]');
    check(!!card, '홈 — 카드가 #/product/saju (입력 화면을 거치지 않는다)');
    await clickEl(window, card);
    const s = state(window);
    check(window.location.hash === '#/product/saju', '카드 클릭 → 바로 그 상품');
    check(s.locked === 0 && s.payButtons === 0, '결제창 없이 전체 열람');
    check(s.receipt !== null, '미리보기 영수증');
    window.close();
  }

  console.log('\n── 일반 방문자 — 생년월일 없음/있음 모두 예전 그대로');
  {
    const { window } = boot(source, source.url, null, EMPTY_SEED);
    await tick();
    const d = window.document;
    const card = d.querySelector('.pcard[href="#/product/saju"]');
    check(!!card, '홈(생년월일 없음) — 카드가 예전처럼 #/product/saju');
    await clickEl(window, card);
    const s = state(window);
    check(s.strip === null, '배지 없음');
    check(/먼저 내 생년월일시가 필요해요/.test(d.querySelector('#view').textContent), '「생년월일 필요」 안내 유지');
    check(!!d.querySelector('#view a[href="#/input"]'), '「생년월일 넣기」 링크 유지 (next 파라미터 없음)');
    await visit(window, '#/input');
    await submitBirth(window);
    check(window.location.hash === '#/free', `입력 완료 → 무료 결과 (${window.location.hash})`);
    window.close();
  }
  {
    const { window } = boot(source, source.url);
    await tick();
    const d = window.document;
    await clickEl(window, d.querySelector('.pcard[href="#/product/saju"]'));
    const s = state(window);
    check(s.locked > 0, '일반 방문자(생년월일 있음) — 잠금 유지');
    check(s.payButtons > 0, '일반 방문자 — 결제 버튼 노출');
    await clickEl(window, d.querySelector('#view [data-action="open-pay"]'));
    const modal = d.querySelector('#modal-root').textContent || '';
    check(/결제하기/.test(modal) && /990/.test(modal), '결제 버튼 클릭 → 토스페이 결제창(결제하기) 열림');
    window.close();
  }

  console.log(`\n실패 ${fails.length}건`);
  fails.forEach((f) => console.log('  - ' + f));
  process.exit(fails.length ? 1 : 0);
}

main().catch((e) => {
  console.error('검수 중 오류:', e);
  process.exit(2);
});
