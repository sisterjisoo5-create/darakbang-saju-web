#!/usr/bin/env node
// 환불 고지 검수 — 빌드된 번들(jsdom)에서 결제 모달·구슬 충전 모달·푸터·FAQ·내 다락방·약관을 열어 확인한다
//
//   node scripts/check-refund.mjs          # dist/ (로컬 빌드)
//   node scripts/check-refund.mjs --live   # 라이브 GitHub Pages 번들
//
// 2026-11-22 시연 님 지시 — "결제 오류만 환불 된다고 고지 해놔줘 정 확 하 게"
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';
import { REFUND_NOTICE_PAY, REFUND_NOTICE_BEADS, REFUND_NOTICE_SHORT, REFUND_RULE } from '../src/config/refund.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIVE = process.argv.includes('--live') || process.env.SITE === '1';
const LIVE_URL = 'https://sisterjisoo5-create.github.io/darakbang-saju-web/';

const fails = [];
const check = (cond, msg) => {
  console.log((cond ? '  ok   ' : '  FAIL ') + msg);
  if (!cond) fails.push(msg);
};

async function loadSource() {
  if (!LIVE) {
    const html = readFileSync(path.join(ROOT, 'dist/index.html'), 'utf8');
    const src = (html.match(/assets\/index-[A-Za-z0-9_-]+\.js/) || [])[0];
    const js = readFileSync(path.join(ROOT, 'dist', src), 'utf8');
    return { html, js, url: LIVE_URL };
  }
  const res = await fetch(LIVE_URL);
  const html = await res.text();
  const src = (html.match(/assets\/index-[A-Za-z0-9_-]+\.js/) || [])[0];
  if (!src) throw new Error('라이브 index.html 에서 번들 경로를 찾지 못했습니다');
  const js = await (await fetch(new URL(src, LIVE_URL))).text();
  return { html, js, url: LIVE_URL };
}

const { html, js, url } = await loadSource();
const SEED = {
  profile: { calendar: 'solar', year: 1991, month: 5, day: 7, hour: 18, minute: 22, timeUnknown: false, gender: 'female', leap: false },
  partner: null, bias: null, beads: 0, orders: [], unlocks: {}, todayFree: '', createdAt: '',
};

const vc = new VirtualConsole();
const dom = new JSDOM(html, { url, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
const win = dom.window;
win.matchMedia = win.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
win.scrollTo = () => {};
win.print = () => {};
win.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
if (!win.IntersectionObserver) win.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
win.localStorage.setItem('darakbang.v2', JSON.stringify(SEED));
win.eval(js);
const tick = () => new Promise((r) => setTimeout(r, 30));
await tick();
await tick();
const d = win.document;
const click = async (el) => {
  el.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }));
  await tick();
  await tick();
};

// 1) 홈 — 상품 목록 아래 한 줄 고지
check(d.body.textContent.includes(REFUND_NOTICE_SHORT), '홈 — 상품 그리드 아래 한 줄 고지 노출');

// 2) 결제 모달 — 결제 버튼 바로 위 고지 (홈 첫 카드의 결제 버튼)
await click(d.querySelector('a.pcard'));
await click(d.querySelector('[data-action="open-pay"]'));
let modal = d.querySelector('.modal');
check(!!modal, '결제 모달 열림');
const foot = modal.querySelector('.modal__foot');
check(!!foot.querySelector('.refund-note'), '결제 모달 — refund-note 블록');
const note = foot.querySelector('.refund-note');
check(note.textContent.includes(REFUND_RULE), '결제 모달 — 원칙 문장(환불은 결제 오류만 가능합니다)');
check(note.textContent.includes(REFUND_NOTICE_PAY), '결제 모달 — 고지 본문(단순 변심·내용 불만족·입력 오류 불가 / 결제 오류 100% 환불)');
const payBtn = foot.querySelector('[data-action="submit-pay"]');
check(Boolean(note.compareDocumentPosition(payBtn) & win.Node.DOCUMENT_POSITION_FOLLOWING), '결제 모달 — 고지가 결제 버튼 위에 있다');
const agreeLabel = [...modal.querySelectorAll('.agree label')].map((l) => l.textContent).find((t) => t.includes('환불'));
check(agreeLabel && agreeLabel.includes('결제 오류 외 환불 불가'), '결제 모달 — 동의 항목 문구(결제 오류 외 환불 불가)');
await click(modal.querySelector('.modal__close'));

// 3) 구슬 충전 모달
await click(d.querySelector('header button[data-action="open-beads"]'));
modal = d.querySelector('.modal');
const bfoot = modal.querySelector('.modal__foot');
check(!!bfoot.querySelector('.refund-note'), '구슬 충전 모달 — refund-note 블록');
const bnote = bfoot.querySelector('.refund-note');
check(bnote.textContent.includes(REFUND_RULE) && bnote.textContent.includes(REFUND_NOTICE_BEADS), '구슬 충전 모달 — 고지 본문(미사용 구슬 변심 환불 불가 / 결제 오류 100% 환불)');
check(bnote.textContent.includes('결제 버튼을 누르면 위 환불 기준에 동의한 것으로 봅니다'), '구슬 충전 모달 — 동의 문구');
check(Boolean(bnote.compareDocumentPosition(bfoot.querySelector('[data-action="buy-beads"]')) & win.Node.DOCUMENT_POSITION_FOLLOWING), '구슬 충전 모달 — 고지가 결제 버튼 위에 있다');
check(modal.querySelector('.bead-info').textContent.includes('단순 변심으로는 환불되지 않으며'), '구슬 충전 모달 — 구슬 안내 문구');
await click(modal.querySelector('.modal__close'));

// 4) 푸터 고지
check(d.querySelector('.footer__notice').textContent.includes(REFUND_NOTICE_SHORT), '푸터 — 환불 고지');

// 5) FAQ — 결제 모달을 닫고도 상품 화면에 머물므로 홈으로 돌아간 뒤 연다
win.location.hash = '#/';
await tick();
await tick();
const faq = [...d.querySelectorAll('.faq__item')];
const faqDebug = faq.length === 0;
const refundFaq = faq.find((f) => ((f.querySelector('.faq__q') || {}).textContent || '').includes('환불되나요')) || faq.find((f) => (f.textContent || '').includes('환불되나요'));
check(!!refundFaq, faqDebug ? 'FAQ — 환불 항목 존재 (FAQ 렌더링이 안 됨: 다른 화면 머무름)' : 'FAQ — 환불 항목 존재');
if (refundFaq) {
  refundFaq.querySelector('.faq__q').dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }));
  await tick();
  await tick();
  const ans = (refundFaq.querySelector('.faq__a') || {}).textContent || '';
  check(ans.includes(REFUND_RULE), 'FAQ — 원칙 문장');
  check(ans.includes('환불 사유가 아니에요'), 'FAQ — 불가 사유');
  check(faq.some((f) => ((f.querySelector('.faq__a') || {}).textContent || '').includes('충전만 하고 쓰지 않은 구슬도 단순 변심으로는 환불되지 않습니다')), 'FAQ — 구슬 잔액 변심 환불 불가');
}

// 6) 내 다락방
win.location.hash = '#/my';
await tick();
await tick();
const notice = [...d.querySelectorAll('.sheet')].find((s) => s.textContent.includes('환불 · 문의'));
check(!!notice && notice.textContent.includes(REFUND_RULE), '내 다락방 — 원칙 문장');
check(!!notice && notice.textContent.includes(REFUND_NOTICE_SHORT), '내 다락방 — 고지 본문');

// 7) 환불규정 · 이용약관 모달
await click(d.querySelector('button[data-doc="refund"]'));
modal = d.querySelector('.modal');
const rtext = modal.textContent;
check(rtext.includes('환불은 결제 오류만 가능합니다'), '환불규정 — 원칙 하이라이트');
check(rtext.includes('중복 결제') && rtext.includes('100% 환불'), '환불규정 — 결제 오류 100% 환불');
check(rtext.includes('사주가 안 맞는다'), '환불규정 — 내용 불만족 불가');
check(rtext.includes('제17조 제3항') && rtext.includes('미성년자'), '환불규정 — 법정 예외(표시·광고 불일치 / 미성년자)');
check(!rtext.includes('부분 환불'), '환불규정 — 부분 환불 문구 없음');
await click(modal.querySelector('.modal__close'));
await click(d.querySelector('button[data-doc="terms"]'));
modal = d.querySelector('.modal');
const ttext = modal.textContent;
check(ttext.includes('결제 오류에 한한 환불'), '이용약관 제8조 — 결제 오류 기준');
check(ttext.includes('⑤ 사용하지 않은 구슬의 잔액 환불'), '이용약관 제8조 — 불가 5종');
check(!ttext.includes('부분 환불'), '이용약관 — 부분 환불 문구 없음');

console.log(fails.length ? `\n실패 ${fails.length}건` : '\n실패 0건');
process.exit(fails.length ? 1 : 0);
