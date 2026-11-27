// 오피스 잠금·복호화 로컬 검증 — jsdom 으로 docs/office 를 그대로 띄운다
//   OFFICE_PASSWORD=<오피스 비밀번호> node scripts/check-office-lock.mjs
// 검사: 첫 화면 잠금 → 틀린 비밀번호 차단 → 맞는 비밀번호로 복호화 → 5팀·정산 128,195원 렌더
//      → sessionStorage 키 보관(비밀번호 원문 미저장) → 새로고침 시 자동 해제
// 비밀번호는 코드에 두지 않고 환경변수로만 받는다.
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { JSDOM } from 'jsdom';

const PW = process.env.OFFICE_PASSWORD || '';
if (!PW) { console.error('OFFICE_PASSWORD 환경변수에 오피스 비밀번호를 넘겨 주세요.'); process.exit(1); }
const DIR = new URL('../docs/office/', import.meta.url);
const html = readFileSync(new URL('index.html', DIR), 'utf8');
const appjs = readFileSync(new URL('app.js', DIR), 'utf8');
const enc = readFileSync(new URL('data.enc.json', DIR), 'utf8');

const dom = new JSDOM(html, { url: 'https://example.test/office/', runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom;
Object.defineProperty(window, 'crypto', { value: webcrypto, configurable: true });
window.TextEncoder = TextEncoder;
window.TextDecoder = TextDecoder;
window.fetch = async (url) => {
  const u = String(url);
  if (u.includes('data.enc.json')) return { ok: true, status: 200, jsonasync: 1, json: async () => JSON.parse(enc) };
  if (u.includes('data.json')) return { ok: false, status: 404, json: async () => ({}) };
  throw new Error('unexpected fetch ' + u);
};

const wait = (ms = 60) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const ok = (cond, label, extra = '') => {
  console.log((cond ? '✔' : '✖') + ' ' + label + (extra ? ' — ' + extra : ''));
  if (!cond) fails++;
};

window.eval(appjs);
await wait(120);

const body = window.document.body;
const lock = window.document.getElementById('lockScreen');
ok(body.classList.contains('locked'), '첫 화면이 잠금 상태');
ok(!lock.classList.contains('hidden'), '잠금 화면 표시');
ok(window.document.getElementById('headline').textContent.trim() === '불러오는 중…', '잠금 전에는 데이터가 렌더되지 않음');

// 틀린 비밀번호
const form = window.document.getElementById('lockForm');
const pw = window.document.getElementById('lockPw');
pw.value = '000000';
form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
await wait(900);
ok(body.classList.contains('locked'), '틀린 비밀번호 → 잠금 유지');
ok(/맞지 않습니다/.test(window.document.getElementById('lockMsg').textContent), '틀린 비밀번호 안내 문구', window.document.getElementById('lockMsg').textContent);
ok(window.sessionStorage.getItem('darakbang.office.key') === null, '틀린 비밀번호로는 키가 저장되지 않음');

// 맞는 비밀번호
pw.value = PW;
form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
await wait(1600);
ok(!body.classList.contains('locked'), '맞는 비밀번호 입력 → 잠금 해제');
ok(lock.classList.contains('hidden'), '잠금 화면 숨김');
const headline = window.document.getElementById('headline').textContent;
ok(headline.includes('128,195'), '헤드라인에 통합 순이익 128,195 반영', headline.slice(0, 60));
const chips = [...window.document.querySelectorAll('#roomChips .chip')].map((c) => c.textContent);
const teams = chips.filter((t) => /네이버|조예언니|팝콘언니|3층 다락방|정산팀/.test(t));
ok(teams.length === 5, '팀 5개 칩 렌더', chips.join(' | '));
ok(window.document.getElementById('detailHint').textContent.includes('5팀'), '부서 상세 "전체 5팀"', window.document.getElementById('detailHint').textContent);
const keys = Object.keys(window.sessionStorage);
ok(keys.includes('darakbang.office.key'), 'sessionStorage 에 키 보관', keys.join(','));
ok(!JSON.stringify(window.sessionStorage).includes(PW), 'sessionStorage 에 비밀번호 원문 없음');

// 정산팀 상세 — 128,195원 표시
window.document.querySelector('[data-deptrow="settlement"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(60);
const detail = window.document.getElementById('detailBody').innerHTML;
ok(detail.includes('정산팀') || detail.includes('128,195'), '정산팀 상세 열림');
const statsText = (() => {
  window.document.querySelector('.tab[data-tab="stats"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return window.document.getElementById('revList').textContent + window.document.getElementById('chanGrid').textContent;
})();
ok(statsText.includes('128,195'), '부서현황 탭에 128,195원 표시');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILED`);

// ── 새로고침(같은 탭) 시나리오: sessionStorage 키 재사용
{
  const storedKey = window.sessionStorage.getItem('darakbang.office.key');
  const dom2 = new JSDOM(html, { url: 'https://example.test/office/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w2 = dom2.window;
  Object.defineProperty(w2, 'crypto', { value: webcrypto, configurable: true });
  w2.TextEncoder = TextEncoder; w2.TextDecoder = TextDecoder;
  w2.fetch = async () => ({ ok: true, status: 200, json: async () => JSON.parse(enc) });
  w2.sessionStorage.setItem('darakbang.office.key', storedKey);
  w2.eval(appjs);
  await wait(1500);
  const reloaded = !w2.document.body.classList.contains('locked');
  console.log((reloaded ? '✔' : '✖') + ' 새로고침 — 저장된 키로 비밀번호 없이 자동 해제');
  const hd = w2.document.getElementById('headline').textContent;
  console.log((hd.includes('128,195') ? '✔' : '✖') + ' 새로고침 후 데이터 렌더');
  if (!reloaded) process.exitCode = 1;
}
process.exit((fails === 0 && !process.exitCode) ? 0 : 1);
