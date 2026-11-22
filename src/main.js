// 사주보는 3층 다락방 — 앱 엔트리
import './styles/base.css';
import './styles/components.css';

import { computeChart, formatBirthLabel } from './engine/saju.js';
import { computeJami } from './engine/jami.js';
import { todayFortune, todayDateLabel } from './engine/today.js';
import { OHAENG, OHAENG_META, BRANCHES } from './engine/constants.js';
import { buildReport } from './content/report.js';
import { renderJamiBoard } from './content/jami-board.js';
import { wonyoukCardHTML, wonyoukLineHTML } from './content/wonyouk-card.js';
import { withJosa } from './engine/compat.js';
import { PRODUCTS, productById, productsForCurrentMonth, BEAD_PACKS, BEAD_PRICE, BEAD_PURPOSE, BEAD_USABLE, BEAD_USABLE_LIST, BEAD_VALIDITY, won } from './config/products.js';
import { zodiacOf, zodiacByAnimal, zodiacByBranch, zodiacImage, zodiacLabel } from './config/zodiac.js';
import { zodiacIljuReading } from './content/zodiac-ilju.js';
import { REFUND_RULE, REFUND_NOTICE_PAY, REFUND_NOTICE_BEADS, REFUND_NOTICE_SHORT, REFUND_CONSENT_LINE } from './config/refund.js';
import { BUSINESS, BUSINESS_ROWS, businessRowText, pendingBusinessFields } from './config/business.js';
import { TERMS, PRIVACY, REFUND } from './content/legal.js';
import {
  requestPayment,
  newPaymentId,
  isTestMode,
  PAY_METHODS,
  PENDING_PAY_METHODS,
  DEFAULT_PAY_METHOD,
  payMethodById,
  paymentReturnUrl,
  parsePayRedirect,
  savePendingPayment,
  loadPendingPayment,
  clearPendingPayment,
  verifyAndApprove,
} from './config/payment.js';
import { asset } from './config/asset.js';
import { KB_ESCROW } from './config/escrow.js';
import { defaultBirthInput } from './engine/clock.js';
import { PREVIEW_BADGE, PREVIEW_BADGE_NOTE, resolvePreview, resolveUnlocked, writePreviewFlag, previewInputHref, previewNextProduct } from './config/preview.js';
import { saveReportImages, shareFiles, downloadImages, imagesToFiles, SAVING_LABEL, SAVE_LABEL, SAVE_HINT } from './lib/report-image.js';
import { REPLAY_LABEL, replayProductId } from './lib/order-replay.js';

/* ────────────────────────────────────────────
   저장소 (브라우저 localStorage 에만)
   ──────────────────────────────────────────── */
const STORE_KEY = 'darakbang.v2';
const DEFAULT_DATA = {
  profile: null,
  partner: null,
  bias: null,
  beads: 0,
  orders: [],
  unlocks: {},
  todayFree: '',
  createdAt: '',
};

function loadData() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { ...DEFAULT_DATA };
    return { ...DEFAULT_DATA, ...JSON.parse(raw) };
  } catch (e) {
    return { ...DEFAULT_DATA };
  }
}

const state = {
  data: loadData(),
  chart: null,
  jami: null,
  partnerChart: null,
  partnerJami: null,
  biasChart: null,
  biasEdit: false,
  payProduct: null,
  payMethod: DEFAULT_PAY_METHOD,
  agree: { terms: false, privacy: false, refund: false },
  payState: 'idle', // idle | processing | done | error
  payResult: null,
  justUnlocked: null,
  modal: null,
  faqOpen: 0,
};

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state.data));
  } catch (e) {
    /* 저장 실패(시크릿 모드 등)는 조용히 넘어간다 */
  }
}

/* ────────────────────────────────────────────
   유틸
   ──────────────────────────────────────────── */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad2 = (n) => String(n).padStart(2, '0');
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

function toast(msg, ms = 2600) {
  const root = $('#toast-root');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .3s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 320);
  }, ms);
}

/* ────────────────────────────────────────────
   검수용 비밀 미리보기 (?preview=3f990)
   · 주소 뒤에 코드를 붙여 들어온 탭에서만 켜지고, sessionStorage 로 화면 이동·새로고침 동안 유지된다
   · 일반 방문자에게는 아무 표시도 남지 않는다 — 결제창도 잠금도 기존 그대로
   ──────────────────────────────────────────── */
const previewStore = (() => {
  try {
    return window.sessionStorage || null;
  } catch (e) {
    return null; // 시크릿 모드 등 저장소를 못 쓰면 주소 파라미터가 있는 동안만 동작
  }
})();
const preview = { active: false };

function initPreview() {
  preview.active = resolvePreview({ search: location.search, hash: location.hash, storage: previewStore });
  if (preview.active) writePreviewFlag(previewStore);
}

/* 3층 다락방 대표 캐릭터 — 12간지 첫 번째 쥐, 소원을 읽어 주는 '자니' */
const CH_MOUSE = asset('images/mascot-mouse-cut.webp');
const CH_FACE = asset('images/mouse-face-cut.webp');
/* 3층 다락방 별밤 아치 창가 — 히어로 자니 카드 */
const CH_ATTIC = asset('images/attic-hero-cut.webp');
/* 오늘의 운세 카드 01 구역 — 망토 자니 */
const CH_JANI = zodiacImage('jani');
const JANI = '다락방의 자니';
const TODAY_TITLE = '다락방 자니가 읽어주는 오늘의 운세';

/* KB에스크로 이체 인증마크 — KB국민은행 구매안전서비스에 등록된 판매자 확인 팝업 */
function openKBEscrowMark() {
  const popup = window.open(KB_ESCROW.url, KB_ESCROW.popupName, KB_ESCROW.popupFeatures);
  if (!popup) {
    toast('팝업이 차단되어 인증마크를 열지 못했어요. 브라우저의 팝업 차단을 해제한 뒤 다시 눌러 주세요.');
    return;
  }
  try {
    popup.opener = null;
  } catch (e) {
    /* 다른 출처 창이면 opener 접근만 막힌다 */
  }
}

/* ────────────────────────────────────────────
   계산 (프로필 → 명식 + 자미두수)
   ──────────────────────────────────────────── */
function buildFromProfile(profile) {
  if (!profile) return null;
  const chart = computeChart(profile);
  if (!chart.ok) return { chart, jami: null };
  const hourIndex = chart.pillars.hour ? Math.floor(((chart.corrected.h + 1) % 24) / 2) : null;
  const jami = computeJami({
    lunarYear: chart.lunar ? chart.lunar.y : chart.solar.y,
    lunarMonth: chart.lunar ? chart.lunar.m : 1,
    lunarDay: chart.lunar ? chart.lunar.d : 1,
    hourIndex,
    gender: profile.gender,
    yearStem: chart.yearStem,
  });
  return { chart, jami };
}

function syncCharts() {
  const mine = buildFromProfile(state.data.profile);
  state.chart = mine && mine.chart.ok ? mine.chart : null;
  state.jami = mine && mine.chart.ok ? mine.jami : null;
  state.partnerChart = null;
  state.partnerJami = null;
  if (state.data.partner) {
    const p = buildFromProfile(state.data.partner);
    if (p && p.chart.ok) {
      state.partnerChart = p.chart;
      state.partnerJami = p.jami;
    }
  }
  state.biasChart = null;
  if (state.data.bias && state.data.bias.profile) {
    const b = buildFromProfile(state.data.bias.profile);
    if (b && b.chart.ok) state.biasChart = b.chart;
  }
}

function isUnlocked(productId) {
  /* 미리보기 중에는 결제 기록이 없어도 열린다 (일반 방문자는 unlocks 만 본다) */
  return resolveUnlocked({ previewActive: preview.active, unlocks: state.data.unlocks, productId }).unlocked;
}

/* 990원 상품으로 가는 주소.
   일반 방문자는 늘 `#/product/<id>` 그대로 — 화면·동선이 기존과 완전히 같다.
   미리보기에서 아직 생년월일이 없으면 입력 화면으로 곧장 보내고(#/input?next=<id>),
   입력을 마치면 그 상품 리포트가 바로 열린다. 생년월일이 이미 있으면 곧장 리포트다. */
function productHref(productId) {
  if (preview.active && !state.chart) return previewInputHref(productId);
  return `#/product/${productId}`;
}

/* 지금 해시가 가리키는 「입력하면 열 상품」 — 미리보기가 아니면 늘 null */
function nextProductFromHash() {
  if (!preview.active) return null;
  const id = previewNextProduct(location.hash);
  return id ? productById(id) : null;
}

function unlockedOrder(productId) {
  const id = state.data.unlocks[productId];
  return state.data.orders.find((o) => o.id === id) || null;
}

/* ────────────────────────────────────────────
   헤더 · 푸터
   ──────────────────────────────────────────── */
/* 미리보기 중에만 붙는 얇은 배지 — 일반 방문자에게는 빈 문자열이라 화면이 완전히 같다 */
function previewStripHTML() {
  if (!preview.active) return '';
  return `
      <div class="preview-strip"><span class="preview-strip__dot"></span><b>${esc(PREVIEW_BADGE)}</b><span>${esc(PREVIEW_BADGE_NOTE)}</span></div>`;
}

function headerHTML() {
  const beads = state.data.beads;
  const hasProfile = !!state.data.profile;
  return `
    <div class="wrap site-header__inner">
      <a class="brand" href="#/">
        <span class="brand__mark"><img src="${CH_FACE}" alt="" /></span>
        <span class="brand__text">
          <span class="brand__name">사주보는 3층 다락방</span>
          <span class="brand__sub">DARAKBANG · SAJU</span>
        </span>
      </a>
      <nav class="nav">
        <a href="#/free">무료 맛보기</a>
        <a href="#/#products">990원 상품</a>
        <a href="#/#how">이용 안내</a>
        <a href="#/my">내 다락방</a>
      </nav>
      <div class="header-actions">
        <button class="btn btn--quiet btn--sm" data-action="open-beads"><span class="bead-dot"></span>구슬 ${beads}</button>
        <a class="btn btn--primary btn--sm" href="${hasProfile ? '#/free' : '#/input'}">${hasProfile ? '내 사주 다시 보기' : '무료로 시작'}</a>
      </div>
    </div>${previewStripHTML()}`;
}

function footerHTML() {
  const pending = pendingBusinessFields();
  const rows = BUSINESS_ROWS.map((r) => {
    const v = String(BUSINESS[r.key] || '').trim();
    const text = v || BUSINESS.pendingText;
    return `<div><b>${esc(r.label)}</b><span class="${v ? '' : 'pending'}">${esc(text)}</span></div>`;
  }).join('');
  return `
    <div class="wrap">
      <div class="footer__top">
        <div class="footer__brand">
          <div class="brand">
            <span class="brand__mark"><img src="${CH_FACE}" alt="" /></span>
            <span class="brand__text">
              <span class="brand__name">사주보는 3층 다락방</span>
              <span class="brand__sub">DARAKBANG · SAJU</span>
            </span>
          </div>
          <p>다락방 작은 불빛 아래에서, 만세력과 자미두수로 여덟 글자를 읽어드립니다. 사주는 정해진 답이 아니라 나를 이해하는 지도입니다.</p>
        </div>
        <div class="footer__links">
          <button data-action="legal" data-doc="terms">이용약관</button>
          <button data-action="legal" data-doc="privacy" class="is-strong">개인정보처리방침</button>
          <button data-action="legal" data-doc="refund">환불규정</button>
          <button data-action="open-beads">구슬 충전</button>
          <button data-action="clear-all">기록 지우기</button>
        </div>
      </div>
      <div class="footer__escrow">
        <button type="button" class="footer__escrow-btn" data-action="kb-escrow" aria-label="${esc(KB_ESCROW.imageAlt)} — KB국민은행 판매자 확인정보 열기">
          <img src="${KB_ESCROW.image}" alt="${esc(KB_ESCROW.imageAlt)}" width="60" height="60" decoding="async" onerror="this.onerror=null;this.src='${KB_ESCROW.imageFallback}';" />
        </button>
        <p class="footer__escrow-text">
          <b>${esc(KB_ESCROW.title)}</b> ${esc(KB_ESCROW.caption)}
          <span>${esc(KB_ESCROW.description)}</span>
        </p>
      </div>
      <div class="biz-info">
        ${rows}
      </div>
      <div class="footer__notice">
        ${esc(BUSINESS.serviceName)}은(는) 통신판매중개자가 아닌 통신판매업자로서, 결제는 전자지급결제대행사(${esc(BUSINESS.pgCompany)})를 통해 처리됩니다.
        ${esc(REFUND_NOTICE_SHORT)}
        사주 풀이는 전통 명리학에 근거한 참고·오락용 콘텐츠이며, 의료·법률·투자 등 전문적 판단을 대체하지 않습니다.
        ${pending.length ? `<br />※ PG 심사 제출 전 <b>${pending.map((p) => p.label).join(' · ')}</b> 항목을 <code>src/config/business.js</code>에 입력해야 합니다.` : ''}
      </div>
      <div class="footer__copy">
        <span>© ${new Date().getFullYear()} ${esc(BUSINESS.serviceName)}. All rights reserved.</span>
        <span>가입 없음 · 입력값은 내 브라우저에만 저장</span>
      </div>
    </div>`;
}

/* ────────────────────────────────────────────
   홈
   ──────────────────────────────────────────── */
function birthFormHTML(profile) {
  /* 저장된 기록이 없으면 고정 날짜 대신 대한민국 현재 시각(Asia/Seoul)으로 채운다 */
  const p = profile || defaultBirthInput();
  return `
    <form class="birth-card" data-form="birth" id="birth" data-calendar="${p.calendar}" data-gender="${p.gender}">
      <div class="birth-card__row" style="margin-bottom:10px">
        <div class="seg" data-seg="calendar">
          <button type="button" data-action="seg" data-seg-value="solar" class="${p.calendar === 'solar' ? 'is-on' : ''}">양력</button>
          <button type="button" data-action="seg" data-seg-value="lunar" class="${p.calendar === 'lunar' ? 'is-on' : ''}">음력</button>
        </div>
        <label class="toggle-line" data-leap-wrap style="${p.calendar === 'lunar' ? '' : 'display:none'}">
          <input type="checkbox" name="leap" ${p.leap ? 'checked' : ''} /> 윤달
        </label>
        <div class="seg" data-seg="gender" style="margin-left:auto">
          <button type="button" data-action="seg" data-seg-value="female" class="${p.gender === 'female' ? 'is-on' : ''}">여성</button>
          <button type="button" data-action="seg" data-seg-value="male" class="${p.gender === 'male' ? 'is-on' : ''}">남성</button>
        </div>
      </div>
      <div class="birth-card__row">
        <div class="field">
          <label>태어난 해</label>
          <input type="number" name="year" min="1900" max="2049" value="${p.year}" placeholder="1992" inputmode="numeric" />
        </div>
        <div class="field">
          <label>월</label>
          <input type="number" name="month" min="1" max="12" value="${pad2(p.month)}" inputmode="numeric" />
        </div>
        <div class="field">
          <label>일</label>
          <input type="number" name="day" min="1" max="31" value="${pad2(p.day)}" inputmode="numeric" />
        </div>
      </div>
      <div class="birth-card__row row--time">
        <div class="field">
          <label>시</label>
          <input type="number" name="hour" min="0" max="23" value="${pad2(p.hour)}" placeholder="0~23" inputmode="numeric" />
        </div>
        <div class="field">
          <label>분</label>
          <input type="number" name="minute" min="0" max="59" value="${pad2(p.minute)}" inputmode="numeric" />
        </div>
        <label class="toggle-line" style="flex:2 1 180px;align-self:flex-end;padding-bottom:10px"><input type="checkbox" name="timeUnknown" ${p.timeUnknown ? 'checked' : ''} /> 태어난 시간을 몰라요</label>
      </div>
      <button class="btn btn--primary btn--block" type="submit" style="margin-top:14px">무료로 내 원국 보기 <span style="opacity:.6">→</span></button>
      <div class="birth-card__note birth-card__note--single">
        <span>입력값은 이 브라우저에만 저장됩니다</span>
      </div>
    </form>`;
}

function todayTeaserHTML() {
  const f = state.chart ? todayFortune(state.chart) : null;
  const dateLabel = f ? f.dateLabel : todayDateLabel();
  const chips = f
    ? `
            <span class="chip chip--accent"><span class="dot"></span>오늘의 일진 ${esc(f.ganji)} · ${f.score}점</span>
            <span class="chip">행운의 색 ${esc(f.lucky.color)}</span>
            <span class="chip">행운의 숫자 ${f.lucky.number}</span>
            <span class="chip">좋은 시간 ${esc(f.lucky.time)}</span>`
    : `
            <span class="chip">오늘의 일진 · 입력 후</span>
            <span class="chip">행운의 색 · 숫자</span>
            <span class="chip">좋은 시간</span>`;
  const text = f
    ? `
            <p class="today-card__line">${esc(f.line)}</p>
            <p class="today-card__note">${esc(f.notes[0])}</p>`
    : `
            <p class="today-card__line">생년월일을 넣으면 오늘 하루의 문장이 열립니다. 매일 1회 무료이고, 같은 날에는 같은 문장이 나와요.</p>
            <a class="btn btn--ghost btn--sm today-card__cta" href="#/input">생년월일 넣기 →</a>`;
  return `
    <div class="today-card">
      <div class="today-card__grid">
        <div class="today-card__media">
          <img src="${CH_JANI}" alt="오늘의 운세를 읽어 주는 다락방의 자니" loading="lazy" decoding="async" />
        </div>
        <div class="today-card__chips">${chips}
        </div>
        <div class="today-card__text">
          <div class="card__index">TODAY · ${esc(dateLabel)}</div>
          <h3>${TODAY_TITLE}</h3>${text}
        </div>
      </div>
    </div>`;
}

const BADGE_TONE = { '인기': 'rose', '추천': 'gold', 'NEW!': 'blue' };

function productCardHTML(p, seasonal = false) {
  const z = zodiacOf(p.char);
  const tone = p.badge ? BADGE_TONE[p.badge] || 'gold' : null;
  return `
      <a class="pcard${seasonal ? ' pcard--season' : ''}" href="${productHref(p.id)}" aria-label="${esc(p.name)} ${p.beads}구슬 ${won(p.price)}">
        <div class="pcard__chips">
          ${p.badge ? `<span class="pcard__badge pcard__badge--${tone}">${esc(p.badge)}</span>` : '<span></span>'}
          <span class="pcard__beads">${p.beads}구슬</span>
        </div>
        <div class="pcard__medal">
          <img src="${zodiacImage(p.char)}" alt="${esc(zodiacLabel(z))} 캐릭터" data-char="${z.key}" />
        </div>
        <div class="pcard__name">${esc(p.name)}</div>
        <div class="pcard__hook">${p.hook.map((l) => esc(l)).join('<br />')}</div>
        ${p.desc ? `<div class="pcard__desc">${esc(p.desc)}</div>` : ''}
        <div class="pcard__foot">
          ${p.freeTag
            ? `<span class="pcard__free">${esc(p.freeTag)}</span>`
            : '<span class="pcard__free pcard__free--quiet">맛보기 무료</span>'}
          <span class="pcard__price">${won(p.price)}</span>
        </div>
      </a>`;
}

function productsHTML() {
  /* 11~2월에는 신년 카드가 1번 — 그 카드만 별과 같은 리듬으로 은은하게 반짝인다 */
  const list = productsForCurrentMonth();
  return `<div class="product-grid">
    ${list.map((p, i) => productCardHTML(p, i === 0 && p.id === 'newyear')).join('')}
  </div>
  <p class="product-note">${esc(REFUND_NOTICE_SHORT)}</p>`;
}

/* 자니 일러스트(public/images/attic-hero-cut.webp, 1100×1100)에서 픽셀 실측한 별·달·촛불 자리.
   좌표는 그림과 같은 0~100 좌표계(%), 크기 계수, 애니메이션 시작 지연(초) 순서다.
   · 창문 밖 좌·우 별 4개, 창문 안쪽 별 6개, 좌우 여백 별 3개, 창문 안 초승달, 책상 위 촛불 불꽃 */
const JANI_STARS = [
  [22.5, 22.2, 1.0, 0],
  [15.3, 30.1, 1.0, 0.9],
  [78.3, 24.8, 1.0, 0.45],
  [84.9, 31.6, 0.7, 1.5],
  [44.8, 22.6, 0.9, 0.25],
  [36.4, 29.1, 0.85, 1.8],
  [43.3, 32.2, 0.7, 1.1],
  [55.2, 22.6, 0.62, 2.2],
  [31.4, 36.0, 0.6, 2.6],
  [69.1, 38.3, 0.8, 0.65],
  [7.0, 62.1, 0.8, 1.35],
  [92.8, 65.9, 0.85, 0.15],
  [82.6, 70.0, 0.65, 2.0],
];
const JANI_MOON = [61.3, 30.4]; /* 창문 안 초승달 */
const JANI_FLAME = [24.5, 69.4]; /* 책상 위 촛불 불꽃 */

/* 그림 안쪽 빛 — 그림 뒤에만 빛을 얹어 선화(자니 얼굴·윤곽)는 그대로 둔다.
   그림의 크림 여백과 별·불꽃 안쪽 여백으로 빛이 비쳐 올라온다. */
function janiGlowHTML() {
  const stars = (cls, base) => JANI_STARS.map(([x, y, s, d]) =>
    `<circle class="jani-glow__${cls}" cx="${x}" cy="${y}" r="${(base * s).toFixed(2)}" style="--d:${d}s" />`).join('');
  const [mx, my] = JANI_MOON;
  const [fx, fy] = JANI_FLAME;
  return `
            <svg class="jani-glow" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
              <defs>
                <radialGradient id="jgStarHalo">
                  <stop offset="0%" stop-color="#fff6dd" stop-opacity="0.85" />
                  <stop offset="42%" stop-color="#f4d093" stop-opacity="0.46" />
                  <stop offset="100%" stop-color="#e0a94f" stop-opacity="0" />
                </radialGradient>
                <radialGradient id="jgStarCore">
                  <stop offset="0%" stop-color="#fffdf4" stop-opacity="1" />
                  <stop offset="55%" stop-color="#f7dca8" stop-opacity="0.62" />
                  <stop offset="100%" stop-color="#edc178" stop-opacity="0" />
                </radialGradient>
                <radialGradient id="jgMoonHalo">
                  <stop offset="0%" stop-color="#fffaea" stop-opacity="0.7" />
                  <stop offset="46%" stop-color="#f0dcae" stop-opacity="0.36" />
                  <stop offset="100%" stop-color="#d9c088" stop-opacity="0" />
                </radialGradient>
                <radialGradient id="jgMoonCore">
                  <stop offset="0%" stop-color="#fffdf6" stop-opacity="0.85" />
                  <stop offset="60%" stop-color="#f3e2b4" stop-opacity="0.4" />
                  <stop offset="100%" stop-color="#d9c088" stop-opacity="0" />
                </radialGradient>
                <radialGradient id="jgFlameHalo">
                  <stop offset="0%" stop-color="#ffd396" stop-opacity="0.85" />
                  <stop offset="45%" stop-color="#f09a41" stop-opacity="0.5" />
                  <stop offset="100%" stop-color="#e07a2c" stop-opacity="0" />
                </radialGradient>
                <radialGradient id="jgFlameCore">
                  <stop offset="0%" stop-color="#fff6da" stop-opacity="1" />
                  <stop offset="55%" stop-color="#ffbd63" stop-opacity="0.8" />
                  <stop offset="100%" stop-color="#f79233" stop-opacity="0" />
                </radialGradient>
              </defs>
              <g fill="url(#jgStarHalo)">${stars('halo', 5.1)}</g>
              <g fill="url(#jgStarCore)">${stars('core', 2.5)}</g>
              <ellipse class="jani-glow__moon" cx="${mx}" cy="${my}" rx="8.4" ry="9.6" fill="url(#jgMoonHalo)" />
              <ellipse class="jani-glow__moon-core" cx="${mx + 0.4}" cy="${my - 0.3}" rx="5.2" ry="6.0" fill="url(#jgMoonCore)" />
              <ellipse class="jani-glow__flame" cx="${fx}" cy="${fy}" rx="4.8" ry="6.4" fill="url(#jgFlameHalo)" />
              <ellipse class="jani-glow__flame-core" cx="${fx}" cy="${fy + 0.4}" rx="2.2" ry="3.1" fill="url(#jgFlameCore)" />
            </svg>`;
}

/* 별 중심의 작은 반짝임 — 별 안쪽 여백만 살짝 밝히는 정도로만 얹는다 */
function janiGlintHTML() {
  return `
            <svg class="jani-glow jani-glow--glint" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
              <defs>
                <radialGradient id="jgStarSpark">
                  <stop offset="0%" stop-color="#fffef8" stop-opacity="0.95" />
                  <stop offset="55%" stop-color="#fbe7bb" stop-opacity="0.5" />
                  <stop offset="100%" stop-color="#f3d79c" stop-opacity="0" />
                </radialGradient>
              </defs>
              <g fill="url(#jgStarSpark)">${JANI_STARS.map(([x, y, s, d]) =>
                `<circle class="jani-glow__spark" cx="${x}" cy="${y}" r="${(1.5 * s).toFixed(2)}" style="--d:${d}s" />`).join('')}</g>
            </svg>`;
}

/* 첫 화면 자니 카드 — 카드를 누르면 생년월일시 입력 화면(#/input)이 열린다 */
function heroCardHTML() {
  return `
        <div class="hero__visual">
          <a class="jani-card" href="#/input" aria-label="무료로 내 원국 보기 — 생년월일시 입력">
            <span class="jani-card__badge jani-card__badge--visitors"><span class="dot"></span>오늘 <strong>1,456명</strong> 다녀감</span>
            <span class="jani-card__badge jani-card__badge--verified">절기 기준 만세력 <strong>검증</strong></span>
            <figure class="jani-card__figure">
              ${janiGlowHTML()}
              <img src="${CH_ATTIC}" alt="별이 뜨는 다락방 창가에서 여덟 글자를 읽는 자니" />
              ${janiGlintHTML()}
            </figure>
            <span class="jani-card__bar">무료로 내 원국 보기 <b>→</b></span>
            <span class="jani-card__note">가입 없음 · 결제 없음 · 30초 · 입력값은 내 브라우저에만</span>
          </a>
        </div>`;
}

/* 생년월일시 입력 화면 — 첫 화면의 자니 카드·노란 바에서 들어온다.
   미리보기에서 `#/input?next=<id>` 로 들어오면 입력을 마친 뒤 그 990원 상품이 바로 열린다. */
function inputView() {
  const next = nextProductFromHash();
  return `
    <section class="input-page">
      <div class="wrap-narrow">
        <div class="input-page__head">
          <span class="input-page__jani"><img src="${CH_JANI}" alt="다락방의 자니" /></span>
          <div class="input-page__copy">
            <div class="hero__eyebrow">
              <span class="chip chip--accent"><span class="dot"></span>가입·결제 없이 30초</span>
            </div>
            <h1>결제 없이 먼저 확인하세요.</h1>
          </div>
        </div>
        <p class="input-page__lead"><span class="input-page__lead-free">나의 원국 · 오행 온도 · 12띠 × 일주동물 · 자미두수 맛보기 카드가 무료로 열립니다.</span><br />전체 풀이는 990원(1구슬), 평생 종합 리포트는 10구슬입니다.</p>
        ${
          next
            ? `<p class="input-page__next" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:14px 0 0;padding:11px 14px;border-radius:12px;border:1px solid rgba(230,195,120,.38);background:rgba(230,195,120,.08);font-size:12.5px;color:var(--text-dim)">
                <b style="color:var(--ink)">${esc(next.name)}</b> 리포트로 이어집니다 · 생년월일시만 넣으면 결제창 없이 바로 열려요
              </p>`
            : ''
        }
        ${birthFormHTML(state.data.profile)}
      </div>
    </section>`;
}

function faqHTML() {
  const items = [
    ['구슬 안내 — 구슬이 뭔가요? 어떤 상품에 쓸 수 있나요?',
      [
        `${BEAD_PURPOSE} 아래 상품을 열 때만 구슬이 차감되며, 현금으로 교환되거나 다른 용도로 쓰이지 않습니다.`,
        `${BEAD_USABLE} 리포트를 열 때 해당 구슬이 차감되고, 결제한 구슬은 이 브라우저에 보관됩니다.`,
        `${BEAD_VALIDITY} 사용하지 않은 구슬도 단순 변심으로는 환불되지 않으며, 중복 결제·구슬 오충전 같은 결제 오류로 잘못 충전된 경우에만 환불됩니다.`,
      ].join('\n')],
    ['정말 990원인가요?', `네. 리포트 1건이 1구슬(990원)입니다. 5구슬은 4,900원, 10구슬은 9,900원이고, 평생 종합 리포트는 10구슬입니다. 무료 맛보기(원국·오행·띠·자미두수 명궁·오늘 운세)는 결제 없이 볼 수 있어요. ${BEAD_VALIDITY}`],
    ['가입해야 하나요? 회원가입이 없는데 결제 기록은 어떻게 남나요?', '가입이 없습니다. 생년월일시와 주문 기록은 이 브라우저에만 저장되고 서버로 전송되지 않아요. 그래서 브라우저 기록을 지우면 구슬 잔액과 주문 내역도 함께 사라집니다. 보관이 필요하면 결제 후 리포트 화면의 「이미지 저장」으로 사진첩에 담아 두세요.'],
    ['사주가 정확한가요?', '만세력은 입춘과 24절기 시각을 기준으로 계산하고, 시주는 진태양시(-30분)를 보정합니다. 1992년 10월 15일 07시 33분생은 임신·경술·갑자·무진으로 검증되어 있습니다. 음력 변환은 한국천문연구원 음양력 데이터를 사용합니다.'],
    ['풀이가 마음에 안 들면 환불되나요?', `${REFUND_RULE} 결제가 끝나면 바로 열리는 디지털 콘텐츠라서 단순 변심이나 "사주가 안 맞는다"는 내용 불만족, 생년월일시 오기입은 환불 사유가 아니에요. 중복 결제·시스템 오류로 리포트가 열리지 않은 경우처럼 결제 오류가 확인되면 결제 금액 전액을 100% 환불해 드립니다. 자세한 내용은 환불규정을 확인해 주세요.`],
    ['배송은 어떻게 오나요? 배송비가 있나요?', '모든 상품은 실물 배송이 없는 디지털 콘텐츠입니다. 결제가 완료되면 웹사이트 화면에서 바로 열람되고(제공 기간: 결제 즉시), 배송비는 무료입니다. 리포트 열람 가능 기간과 구슬 유효기간은 결제일로부터 1년 이내이며, 우편·택배로 오는 물건은 없어요.'],
    ['묶음 구슬을 쓰다가 그만두면 남은 구슬도 환불되나요?', `아니요. 충전만 하고 쓰지 않은 구슬도 단순 변심으로는 환불되지 않습니다. 중복 결제·구슬 오충전처럼 결제 오류로 잘못 충전된 구슬만 결제 금액 전액을 100% 환불해 드립니다.`],
    ['상대방 생년월일시가 없으면 궁합은 못 보나요?', '궁합은 상대방의 생년월일시가 필요합니다. 시간을 모르면 정오 기준으로 계산하며, 그 경우 시주와 자미두수 일부는 정확도가 떨어질 수 있다고 안내해 드립니다.'],
    ['사주 결과가 사람마다 왜 다른가요?', '같은 입력에는 항상 같은 결과가 나옵니다. 사람마다 여덟 글자가 다르고, 그 글자들의 관계(합·충·오행 개수)가 다르기 때문에 해석이 달라집니다.'],
  ];
  return `<div class="faq">${items
    .map(
      ([q, a], i) => `
      <div class="faq__item ${state.faqOpen === i ? 'is-open' : ''}">
        <button class="faq__q" data-action="faq" data-i="${i}"><span>${esc(q)}</span><span>+</span></button>
        <div class="faq__a">${a.split('\n').map((line) => `<p>${esc(line)}</p>`).join('')}</div>
      </div>`,
    )
    .join('')}</div>`;
}

function homeView() {
  return `
    <section class="hero">
      <div class="wrap hero__grid">
        <div class="hero__form">
          ${heroCardHTML()}
        </div>
        <div class="hero__copy">
          <div class="hero__eyebrow">
            <span class="chip chip--accent"><span class="dot"></span>만세력 · 자미두수 계산</span>
            <span class="chip">990원부터</span>
          </div>
          <h1>다락방 작은 불빛 아래,<br /><em>당신의 여덟 글자</em>를<br />읽어드릴게요</h1>
        </div>
      </div>
    </section>

    <section class="section section--tight" id="products">
      <div class="wrap">
        <div class="section__head">
          <div>
            <div class="section__kicker">990원 · 1구슬</div>
            <h2>다락방의 운세 열두 가지</h2>
            <p class="section__desc">주제별로 골라 보세요. 모두 맛보기는 무료이고, 점수와 일부 풀이는 결제 없이 열립니다. 전체 풀이는 990원(1구슬), 평생 종합 리포트만 10구슬입니다.</p>
          </div>
        </div>
        ${productsHTML()}
      </div>
    </section>

    <section class="section" id="how">
      <div class="wrap">
        <div class="section__head">
          <div>
            <div class="section__kicker">WHY DARAKBANG</div>
            <h2>다락방은 이렇게 다릅니다</h2>
          </div>
        </div>
        <div class="trust">
          <div class="trust__item"><div class="trust__icon">✦</div><div><b>가입도, 서버 저장도 없습니다</b><p>생년월일시는 이 브라우저에만 저장됩니다. 기록 지우기를 누르면 흔적 없이 사라져요.</p></div></div>
          <div class="trust__item"><div class="trust__icon">☾</div><div><b>절기 기준 만세력</b><p>입춘·24절기 시각과 진태양시 보정으로 년·월·시를 계산합니다. 음력은 한국천문연구원 데이터.</p></div></div>
          <div class="trust__item"><div class="trust__icon">❖</div><div><b>1초 만에 잠금 해제</b><p>맛보기로 읽다가 마음에 들면 990원. 결제가 끝나면 리포트가 바로 열립니다.</p></div></div>
        </div>
      </div>
    </section>

    <section class="section section--tight">
      <div class="wrap-narrow">
        <div class="section__head"><div><div class="section__kicker">FAQ</div><h2>자주 묻는 것들</h2></div></div>
        ${faqHTML()}
      </div>
    </section>
  `;
}

/* ────────────────────────────────────────────
   결과 블록 렌더러
   ──────────────────────────────────────────── */
function renderBlock(b) {
  switch (b.t) {
    case 'p':
      return `<p>${esc(b.v)}</p>`;
    case 'q':
      return `<blockquote>${esc(b.v)}</blockquote>`;
    case 'sub':
      return `<h4>${esc(b.v)}</h4>`;
    case 'li':
      return `<ul>${b.v.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
    case 'kv':
      return `<dl class="kv-grid">${b.v.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
    case 'bar':
      return `<div class="bars">${b.v
        .map((x) => {
          const pct = Math.max(4, Math.round((x.value / (x.max || 100)) * 100));
          const color = x.color || (OHAENG_META[x.label[0]] ? OHAENG_META[x.label[0]].hex : '#0e2f76');
          return `<div class="bar-row"><div class="bar-row__label">${esc(x.label)}</div>
            <div class="bar-row__track"><div class="bar-row__fill" style="width:${pct}%;background:${color}"></div></div>
            <div class="bar-row__val">${esc(x.value)}${x.max === 4 ? '개' : x.max === 6 ? '' : '점'}</div>
            ${x.note ? `<div class="bar-row__note">${esc(x.note)}</div>` : ''}</div>`;
        })
        .join('')}</div>`;
    case 'table':
      return `<table><thead><tr>${b.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
        <tbody>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    case 'score':
      return `<div class="score-block"><div class="score-ring" style="--p:${b.value}%"><span>${b.value}</span></div>
        <div class="score-block__text"><b>${esc(b.label)}</b><p>${esc(b.note)}</p></div></div>`;
    case 'chips':
      return `<div style="display:flex;gap:6px;flex-wrap:wrap;margin:10px 0">${b.v.map((x) => `<span class="tag">${esc(x)}</span>`).join('')}</div>`;
    case 'jami':
      return renderJamiBoard(b.jami || b);
    case 'ming':
      return wonyoukCardHTML(b.chart);
    case 'oneline':
      return wonyoukLineHTML(b.v);
    default:
      return '';
  }
}

function renderSection(sec, { unlocked, product, cta = true }) {
  const freeCount = sec.freeBlocks == null ? 99 : sec.freeBlocks;
  const visible = sec.blocks.slice(0, freeCount);
  const hidden = sec.blocks.slice(freeCount);
  const lockNeeded = !unlocked && hidden.length > 0;
  const visibleHTML = visible.map(renderBlock).join('');
  if (!lockNeeded && !unlocked) {
    return visibleHTML;
  }
  if (unlocked) {
    return `<div class="${state.justUnlocked === product.id ? 'unlock-anim' : ''}">${sec.blocks.map(renderBlock).join('')}</div>`;
  }
  if (!cta) {
    return `
      ${visibleHTML}
      <div class="lock-band">
        <span class="lock-band__text">이 장은 결제 후 이어집니다 · ${product.beads}구슬</span>
        <button class="btn btn--ghost btn--sm" data-action="open-pay" data-pid="${product.id}">잠금 해제</button>
      </div>`;
  }
  return `
    ${visibleHTML}
    <div class="lock-wrap">
      <div class="lock-blur">${hidden.slice(0, 4).map(renderBlock).join('')}</div>
      <div class="lock-cta">
        <span class="lock-cta__badge">✦ 여기서부터 잠겨 있어요</span>
        <b>${esc(product.name)} 전체 풀이</b>
        <p>${product.beads}구슬 · ${won(product.price)} · 결제 후 1초 만에 열립니다</p>
        <button class="btn btn--primary btn--sm" data-action="open-pay" data-pid="${product.id}">${product.beads}구슬로 전체 열기 →</button>
        <p class="lock-cta__note">구슬은 유료 사주 리포트 열람 전용 이용권(1구슬 = 990원)이며, 결제일로부터 1년 이내에 사용할 수 있습니다. ${esc(REFUND_RULE)}</p>
      </div>
    </div>`;
}

/* ────────────────────────────────────────────
   무료 결과 화면
   ──────────────────────────────────────────── */
/* 무료 원국(#/free)과 유료 리포트가 함께 쓰는 4기둥+결 카드 — src/content/wonyouk-card.js */
const mingTableHTML = (chart) => wonyoukCardHTML(chart);

function ohaengBarsHTML(chart) {
  const max = Math.max(4, ...OHAENG.map((o) => chart.ohaeng.count[o] || 0));
  return `<div class="bars">${OHAENG.map((o) => {
    const v = chart.ohaeng.count[o] || 0;
    return `<div class="bar-row"><div class="bar-row__label">${o} ${OHAENG_META[o].han}</div>
      <div class="bar-row__track"><div class="bar-row__fill" style="width:${v === 0 ? 0 : Math.max(8, (v / max) * 100)}%;background:${OHAENG_META[o].hex}"></div></div>
      <div class="bar-row__val">${v}개</div></div>`;
  }).join('')}</div>`;
}

function tempScaleHTML(chart) {
  const pct = Math.min(96, Math.max(3, ((chart.ohaeng.temp - 6) / 32) * 100));
  return `<div class="temp-scale">
    <div class="temp-scale__bar"><div class="temp-scale__pin" style="left:${pct}%"></div></div>
    <div class="temp-scale__num">${chart.ohaeng.temp}°C<small>${chart.ohaeng.label}</small></div>
  </div>
  <div class="temp-legend"><span>6°C · 차분하고 서늘</span><span>25°C · 온화</span><span>38°C · 뜨겁고 직진</span></div>`;
}

/** 12띠 × 일주 동물 — 무료 카드. 60일주 팩폭 소개글 + 공유용 이미지 저장 (전체 풀이는 990원 상품) */
function zodiacIljuHTML(chart) {
  const zi = zodiacIljuReading(chart);
  if (!zi) return '';
  const product = productById('zodiac-ilju');
  const dayAnimal = zi.day.animal;
  const ij = zi.ilju;
  const pokeHTML = ij
    ? `<ul class="zi-ilju__poke">${ij.poke.map((line) => `<li>${esc(line)}</li>`).join('')}</ul>`
    : '';
  return `
          <h3>12띠 × 일주 동물</h3>
          <div class="zi-teaser zi-card" id="zodiac-share" data-capture-card>
            <div class="zi-teaser__pair">
              <span class="zi-teaser__face">
                <span class="zi-teaser__badge"><img src="${zodiacImage(zodiacByAnimal(zi.year.animal).key)}" alt="${esc(zi.year.animal)} 캐릭터" /></span>
                <i>겉 · ${esc(zi.year.animal)}띠</i>
              </span>
              <span class="zi-teaser__x">×</span>
              <span class="zi-teaser__face zi-teaser__face--day">
                <span class="zi-teaser__badge"><img src="${zodiacImage(zodiacByAnimal(dayAnimal).key)}" alt="${esc(dayAnimal)} 캐릭터" /></span>
                <i>속 · ${esc(dayAnimal)} 일주</i>
              </span>
              <span class="zi-teaser__q">?</span>
            </div>
            <p class="zi-teaser__line">겉은 <b>${esc(zi.year.face)}</b>, 속은 <b>${esc(zi.day.name)}</b>.</p>
            ${
              ij
                ? `<div class="zi-ilju">
              <p class="zi-ilju__ganji">${esc(ij.ko)}(${esc(ij.han)}) 일주 · ${esc(zi.title)}</p>
              <p class="zi-ilju__nick">「${esc(ij.nick)}」</p>
              <p class="zi-ilju__call">${esc(ij.call)}</p>
              <div class="zi-ilju__label">찔리는 내 특징 셋</div>
              ${pokeHTML}
              <div class="zi-ilju__vs">
                <div><span>남이 보는 나</span><b>${esc(ij.seen)}</b></div>
                <div><span>진짜 나</span><b>${esc(ij.real)}</b></div>
              </div>
            </div>`
                : ''
            }
            <div class="zi-card__actions" data-capture-skip>
              <button class="btn btn--ghost btn--sm" data-action="save-zodiac">공유용 이미지 저장</button>
              <span class="zi-card__hint">카톡·인스타에 올릴 한 장 — 아래에 다락방 이름이 작게 들어가요</span>
            </div>
            <p class="zi-teaser__hook" data-capture-skip>이성에게 보이는 나의 반전 모습은? 어필 포인트 3가지, 연애할 때 내가 조심해야 할 포인트까지</p>
            <div class="zi-teaser__cta" data-capture-skip>
              ${
                preview.active
                  ? `<a class="btn btn--primary btn--sm" href="#/product/${product.id}">전체 열람 보기</a>`
                  : `<button class="btn btn--primary btn--sm" data-action="open-pay" data-pid="${product.id}">1구슬(990원)으로 전체 열기 →</button>`
              }
            </div>
            <p class="zi-teaser__note" data-capture-skip>${preview.active ? '검수용 미리보기 — 결제 없이 전체가 열려 있어요.' : '결제 후 1초 만에 열리고, 구슬 유효기간은 결제일로부터 1년 이내예요.'}</p>
          </div>`;
}

/** 자미두수 슬림 카드 — 무료는 명궁·복덕궁만 (신궁은 유료 심층 리포트에서) */
function BOKDEOK_LINE(star) {
  const map = {
    자미: '존중받고 제 자리에서 인정받을 때 마음이 가장 편안해져요.',
    천기: '머리 쓰는 취미와 정리된 계획이 마음의 안정을 줘요.',
    태양: '바깥에서 빛나고 사람들에게 알아봐 줄 때 가장 즐거워요.',
    무곡: '결과가 쌓이고 돈이 굴러가는 게 보일 때 마음이 든든해요.',
    천동: '아무 계획 없는 여유와 맛있는 한 끼가 제일 큰 행복이에요.',
    염정: '새로운 자극과 취미, 애정 표현이 마음을 살려요.',
    천부: '모아 둔 것이 채워지고 안정된 하루가 이어질 때 편안해요.',
    태음: '조용한 집과 정리된 공간에서 마음이 쉬어요.',
    탐랑: '좋아하는 사람과 즐거운 자리에 있으면 활력이 돌아요.',
    거문: '좋아하는 책·이야기로 생각에 잠길 때 마음이 편해져요.',
    천상: '이미지가 반짝이고 사람들과 화기애애할 때 기분이 좋아져요.',
    천량: '누군가를 챙겨 주고 의논 상대가 되어줄 때 보람을 느껴요.',
    칠살: '목표를 이겨낼 때의 짜릿함이 행복이에요. 혼자만의 시간도 꼭 필요해요.',
    파군: '지루한 건 견디기 어려워요. 새로 시작하는 일마다 즐거움을 느껴요.',
  };
  return map[star] || '';
}

function jamiSlimHTML(jami) {
  if (!jami) return '';
  const mp = jami.myeongPalace;
  const myeongStars = mp.main.length ? mp.main : mp.borrowed;
  const bk = jami.bokdeokPalace;
  const bkStars = bk.main.length ? bk.main : bk.borrowed;
  const branchHan = (ko) => (BRANCHES.find((b) => b.ko === ko) || {}).han || '';
  const starLine = (stars) => (stars.length && JAMI_LINE(stars[0])) || '주성이 비어 있어 곁의 기운을 받아 자기 색을 만드는 자리예요.';
  const bokLine = (stars) => (stars.length && BOKDEOK_LINE(stars[0])) || '주성이 비어 있어 대궁의 기운을 빌려 씁니다. 마음의 온도가 상황에 따라 크게 달라지는 편이에요.';

  return `
          <div class="sheet__head">
            <div>
              <div class="sheet__kicker">ZIWEI · 자미두수</div>
              <div class="sheet__title">명궁 ${esc(jami.myeongBranch)} 자리<small>${esc(jami.myeongGanji)} · ${esc(jami.gukName)} · 복덕궁 ${esc(bk.branchKo)}</small></div>
            </div>
            <div class="sheet__stamp">두<br />자리</div>
          </div>
          <div class="jami3">
            <div class="jami3__item jami3__item--main">
              <div class="jami3__head"><b>명궁</b><span class="jami3__desc">(나의 캐릭터)</span></div>
              <div class="jami3__stars">${esc(myeongStars.join(' · ') || '공궁')} <em>${esc(mp.branchKo)}(${esc(mp.branchHan)}) 자리${mp.main.length ? '' : ' · 빌려옴'}</em></div>
              <p>${esc(starLine(myeongStars))}</p>
            </div>
            <div class="jami3__item">
              <div class="jami3__head"><b>복덕궁</b><span class="jami3__desc">(마음·행복 포인트)</span></div>
              <div class="jami3__stars">${esc(bkStars.join(' · ') || '공궁')} <em>${esc(bk.branchKo)}(${esc(bk.branchHan)}) 자리${bk.main.length ? '' : ' · 빌려옴'}</em></div>
              <p>${esc(bokLine(bkStars))}</p>
            </div>
          </div>
          <div class="jami3__locked">
            <div class="jami3__locked-head">
              <b>부처궁(배우자 자리) · 12궁 전체 지도</b>
              <span>무료 카드에서는 명궁·복덕궁까지만 보여 드려요.</span>
            </div>
            <p>배우자가 들어오는 자리와 12궁 전체, 재백궁·관록궁·대운까지는 <b>자미두수 심층</b> 리포트에서 이어집니다. 같은 사주를 다른 판으로 한 번 더 읽는 자리예요.</p>
            <a class="btn btn--primary btn--sm" href="#/product/jami">자미두수 심층 · 1구슬(990원)으로 열기 →</a>
          </div>`;
}

function resultView() {
  if (!state.chart) {
    return `<section class="result-page"><div class="wrap-narrow"><div class="sheet" style="text-align:center"><h2 class="sheet__title">아직 생년월일이 없어요</h2><p style="margin:12px 0 18px;color:var(--text-dim)">생년월일시를 넣으면 무료 맛보기가 바로 열립니다.</p><a class="btn btn--primary" href="#/input">생년월일 넣기</a></div></div></section>`;
  }
  const chart = state.chart;
  const jami = state.jami;
  /* 원형 배지 = 일주(일지) 동물 — 년지 띠가 아니라 내 일주의 동물 하나만 */
  const dayZ = zodiacByBranch(chart.pillars.day.branch);

  return `
    <section class="result-page">
      <div class="wrap">
        <div class="result-topbar">
          <span class="chip chip--accent">무료 맛보기</span>
          <span class="chip">${esc(formatBirthLabel(chart))}</span>
        </div>

        <div class="sheet">
          <div class="sheet__head sheet__head--myeong">
            <div class="sheet__kicker">MYEONG · 원국</div>
            <div class="jani-badge">
              <span class="jani-badge__disc" data-ohaeng="${esc(chart.dayMaster.ohaeng)}">
                <img class="jani-badge__img" src="${zodiacImage(dayZ.key)}" alt="${esc(dayZ.animal)} 일주 동물" decoding="async" />
              </span>
            </div>
            <p class="myeong-dii-line">${esc(chart.dii)}띠 × ${esc(chart.iljuAnimal)}</p>
            <p class="myeong-ilju-line">${esc(dayZ.iljuLine)}</p>
          </div>

          ${mingTableHTML(chart)}

          <h3>오행 온도</h3>
          <p class="temp-sub">내 사주의 따뜻한 기운(불·나무)과 서늘한 기운(물·쇠) 비율로 본 타고난 온도</p>
          ${tempScaleHTML(chart)}
          ${ohaengBarsHTML(chart)}
${zodiacIljuHTML(chart)}
        </div>

        <!-- 오늘의 운세 카드는 무료 원국 화면에서 제거 — 최애궁합 화면에서 다시 쓴다 -->

        ${jami ? `<div class="sheet">${jamiSlimHTML(jami)}
        </div>` : ''}

        <div class="upsell">
          ${PRODUCTS.filter((p) => p.id !== 'lifetime')
            .slice(0, 6)
            .map((base) => {
              /* 신년 카드는 그 달의 시즌 이름·띠로 (11~2월 `2027 신년 운세`, 3~10월 `일년 운세`) */
              const p = productById(base.id);
              const z = zodiacOf(p.char);
              return `<a class="upsell__card" href="${productHref(p.id)}">
              <span class="upsell__medal"><img src="${zodiacImage(p.char)}" alt="" /></span>
              <div><b>${esc(p.name)}</b><p>${esc(p.hook.join(' '))}</p></div>
              <span class="btn btn--ghost btn--sm">${p.beads}구슬</span>
            </a>`;
            })
            .join('')}
        </div>
        <div style="text-align:center;margin-top:26px">
          <a class="btn btn--primary" href="#/product/lifetime">평생 종합 리포트 · 10구슬(9,900원) 열기 →</a>
          <p style="font-size:12px;color:var(--text-mute);margin-top:10px">무료 결과는 여기까지예요. 유료 리포트는 맛보기 후 잠금 해제 방식입니다.</p>
          <p class="result-foot__again"><a href="#/input">생년월일시 다시 입력</a> · <button type="button" data-action="clear-all">기록 지우기</button></p>
        </div>
      </div>
    </section>`;
}

function JAMI_LINE(star) {
  const map = {
    자미: '중심을 잡고 사람을 이끄는 힘이 있어요. 자존심이 상할 때 크게 흔들립니다.',
    천기: '머리가 빠르고 계획적이에요. 생각이 많아 결정을 미루는 결이 있습니다.',
    태양: '밝고 바깥으로 뻗어요. 인정과 명예를 향한 마음이 큽니다.',
    무곡: '말보다 결과로 재물을 만들어요. 융통성이 아쉬울 때가 있습니다.',
    천동: '사람을 편하게 만들고 복이 따르는 자리예요. 편안함에 머물기 쉽습니다.',
    염정: '추진력과 매력이 함께 있어요. 감정 기복을 다스리면 큰 힘이 됩니다.',
    천부: '모으고 관리하는 힘이 있어요. 안정을 중시하지만 변화에는 느립니다.',
    태음: '섬세하고 감성적이며 정리에 강해요. 감정을 안으로 삭이는 결이 있습니다.',
    탐랑: '사람을 끌어당기는 매력이 있어요. 하고 싶은 것에 대한 집착이 있습니다.',
    거문: '따져보는 힘이 좋아요. 말로 사람을 얻기도 잃기도 합니다.',
    천상: '조율과 중재에 능하고 이미지가 좋아요. 결정을 미루기도 합니다.',
    천량: '노련하고 책임감이 강해요. 고집이 세고 손해를 감수합니다.',
    칠살: '위기에서 강하고 결단이 빨라요. 혼자 짊어지는 고독이 있습니다.',
    파군: '낡은 것을 부수고 새로 시작하는 힘이 있어요. 정리하는 방식이 급합니다.',
  };
  return map[star] || '';
}

/* ────────────────────────────────────────────
   상품(리포트) 화면
   ──────────────────────────────────────────── */
function partnerFormHTML(partner) {
  const p = partner || { calendar: 'solar', year: 1997, month: 6, day: 17, hour: 8, minute: 0, timeUnknown: false, gender: 'male', leap: false };
  return `
    <form class="birth-card" data-form="partner" style="max-width:560px" data-calendar="${p.calendar}" data-gender="${p.gender}">
      <div class="birth-card__row" style="margin-bottom:10px">
        <div class="seg" data-seg="calendar">
          <button type="button" data-action="seg" data-seg-value="solar" class="${p.calendar === 'solar' ? 'is-on' : ''}">양력</button>
          <button type="button" data-action="seg" data-seg-value="lunar" class="${p.calendar === 'lunar' ? 'is-on' : ''}">음력</button>
        </div>
        <div class="seg" data-seg="gender" style="margin-left:auto">
          <button type="button" data-action="seg" data-seg-value="female" class="${p.gender === 'female' ? 'is-on' : ''}">여성</button>
          <button type="button" data-action="seg" data-seg-value="male" class="${p.gender === 'male' ? 'is-on' : ''}">남성</button>
        </div>
      </div>
      <div class="birth-card__row">
        <div class="field"><label>태어난 해</label><input type="number" name="year" min="1900" max="2049" value="${p.year}" inputmode="numeric" /></div>
        <div class="field"><label>월</label><input type="number" name="month" min="1" max="12" value="${p.month}" inputmode="numeric" /></div>
        <div class="field"><label>일</label><input type="number" name="day" min="1" max="31" value="${p.day}" inputmode="numeric" /></div>
      </div>
      <div class="birth-card__row row--time">
        <div class="field"><label>시</label><input type="number" name="hour" min="0" max="23" value="${pad2(p.hour)}" inputmode="numeric" /></div>
        <div class="field"><label>분</label><input type="number" name="minute" min="0" max="59" value="${pad2(p.minute)}" inputmode="numeric" /></div>
        <label class="toggle-line" style="flex:2 1 180px;align-self:flex-end;padding-bottom:10px"><input type="checkbox" name="timeUnknown" ${p.timeUnknown ? 'checked' : ''} /> 상대방 시간을 몰라요</label>
      </div>
      <button class="btn btn--primary btn--block" type="submit" style="margin-top:14px">궁합 맛보기 보기 →</button>
    </form>`;
}

/* ────────────────────────────────────────────
   최애궁합 — 최애 정보 입력 · 무료 맛보기
   ──────────────────────────────────────────── */
function biasBirthLabel(chart) {
  if (!chart) return '';
  const s = chart.solar;
  const t = chart.input.timeUnknown ? '시간 모름' : `${pad2(chart.input.hour)}:${pad2(chart.input.minute)}`;
  return `${chart.input.calendar === 'lunar' ? '음력 ' : ''}${s.y}.${pad2(s.m)}.${pad2(s.d)} ${t}`;
}

function biasFormHTML(saved) {
  const p = (saved && saved.profile) || { calendar: 'solar', year: 1995, month: 1, day: 1, hour: 12, minute: 0, timeUnknown: true, gender: 'male', leap: false };
  const name = saved ? saved.name : '';
  return `
    <form class="birth-card" data-form="bias" style="max-width:560px" data-calendar="${p.calendar}" data-gender="${p.gender}">
      <div class="field" style="margin-bottom:10px">
        <label>최애 이름 (아이돌·배우)</label>
        <input type="text" name="biasName" maxlength="20" value="${esc(name)}" placeholder="예: 차은우, 장원영" autocomplete="off" />
      </div>
      <div class="birth-card__row" style="margin-bottom:10px">
        <div class="seg" data-seg="calendar">
          <button type="button" data-action="seg" data-seg-value="solar" class="${p.calendar === 'solar' ? 'is-on' : ''}">양력</button>
          <button type="button" data-action="seg" data-seg-value="lunar" class="${p.calendar === 'lunar' ? 'is-on' : ''}">음력</button>
        </div>
        <label class="toggle-line" data-leap-wrap style="${p.calendar === 'lunar' ? '' : 'display:none'}">
          <input type="checkbox" name="leap" ${p.leap ? 'checked' : ''} /> 윤달
        </label>
        <div class="seg" data-seg="gender" style="margin-left:auto">
          <button type="button" data-action="seg" data-seg-value="female" class="${p.gender === 'female' ? 'is-on' : ''}">여성</button>
          <button type="button" data-action="seg" data-seg-value="male" class="${p.gender === 'male' ? 'is-on' : ''}">남성</button>
        </div>
      </div>
      <div class="birth-card__row">
        <div class="field"><label>태어난 해</label><input type="number" name="year" min="1900" max="2049" value="${p.year}" placeholder="1997" inputmode="numeric" /></div>
        <div class="field"><label>월</label><input type="number" name="month" min="1" max="12" value="${pad2(p.month)}" inputmode="numeric" /></div>
        <div class="field"><label>일</label><input type="number" name="day" min="1" max="31" value="${pad2(p.day)}" inputmode="numeric" /></div>
      </div>
      <div class="birth-card__row row--time">
        <div class="field"><label>시</label><input type="number" name="hour" min="0" max="23" value="${pad2(p.hour)}" inputmode="numeric" /></div>
        <div class="field"><label>분</label><input type="number" name="minute" min="0" max="59" value="${pad2(p.minute)}" inputmode="numeric" /></div>
        <label class="toggle-line" style="flex:2 1 180px;align-self:flex-end;padding-bottom:10px"><input type="checkbox" name="timeUnknown" ${p.timeUnknown ? 'checked' : ''} /> 태어난 시간을 몰라요 (생년월일 삼주 기준)</label>
      </div>
      <button class="btn btn--primary btn--block" type="submit" style="margin-top:14px">최애 궁합 보기 →</button>
      <div class="birth-card__note">
        <span>시간을 몰라도 연·월·일주 6글자로 계산</span>
        <span>최애 정보도 이 브라우저에만 저장됩니다</span>
      </div>
    </form>`;
}

function biasPreviewHTML(preview, name) {
  return `
    <div class="sheet bias-preview">
      <div class="sheet__head">
        <div>
          <div class="sheet__kicker">FREE · 무료 맛보기</div>
          <div class="sheet__title">최애 궁합 점수<small>${esc(name)} × 나의 사주</small></div>
        </div>
        <div class="sheet__stamp">무료<br />궁합</div>
      </div>
      ${renderBlock({ t: 'score', value: preview.score, label: preview.band.title, note: preview.band.line })}
      <p style="margin-top:14px;font-size:14px;color:var(--ink)"><b>${esc(preview.oneLineLabel)}</b> ${esc(preview.oneLine)}</p>
      <dl class="kv-grid">
        ${preview.rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      </dl>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">${preview.chips.map((c) => `<span class="tag">${esc(c)}</span>`).join('')}</div>
    </div>`;
}

function biasFormView(product) {
  const saved = state.data.bias;
  const editing = Boolean(saved && state.biasEdit);
  return `
    <section class="result-page">
      <div class="wrap">
        <div class="result-head">
          <div>
            <div class="result-head__meta"><span class="chip chip--accent">최애궁합</span><span class="chip">${esc(formatBirthLabel(state.chart))}</span></div>
            <h1>${editing ? '최애 정보를 바꿀까요?' : '최애의 사주를 알려주세요'}</h1>
            <p>아이돌·배우의 사주와 내 사주를 겹쳐 연인 궁합을 읽습니다. 태어난 시간을 몰라도 괜찮아요 — 연·월·일주 6글자로 계산합니다.</p>
          </div>
        </div>
        <div class="sheet">
          <div class="sheet__head">
            <div><div class="sheet__kicker">BIAS</div><div class="sheet__title">최애 정보</div></div>
            <div class="sheet__stamp">6글자<br />궁합</div>
          </div>
          ${biasFormHTML(saved)}
          <p style="margin-top:14px;font-size:12.5px;color:var(--text-mute)">연예인은 생시가 공개되지 않은 경우가 대부분이라, ‘태어난 시간을 몰라요’가 기본 선택입니다. 알면 넣어 주세요 — 시주까지 반영해 조금 더 자세히 읽어 드립니다.</p>
          ${editing ? '<div style="margin-top:10px"><button class="btn btn--quiet btn--sm" data-action="cancel-bias-edit">그대로 둘게요</button></div>' : ''}
        </div>
      </div>
    </section>`;
}

function productView(id) {
  const product = productById(id);
  if (!product) return `<section class="result-page"><div class="wrap-narrow"><div class="sheet">상품을 찾을 수 없습니다.</div></div></section>`;
  if (!state.chart) {
    /* 미리보기에서는 결제창 대신 「생년월일 넣고 바로 열기」 — 입력을 마치면 이 상품 리포트가 바로 열린다.
       일반 방문자는 예전 그대로 #/input 으로 가고, 입력을 마치면 무료 결과가 열린다. */
    return `<section class="result-page"><div class="wrap-narrow"><div class="sheet" style="text-align:center"><h2 class="sheet__title">먼저 내 생년월일시가 필요해요</h2><p style="margin:12px 0 18px;color:var(--text-dim)">30초면 끝납니다. ${esc(withJosa(product.name, '은', '는'))} 내 원국 위에 올려 읽습니다.</p><a class="btn btn--primary" href="${preview.active ? previewInputHref(product.id) : '#/input'}">${preview.active ? `${esc(product.name)} 바로 열기 →` : '생년월일 넣기'}</a>${preview.active ? '<p style="margin-top:10px;font-size:12px;color:var(--text-mute)">검수용 미리보기 — 생년월일시만 넣으면 결제창 없이 바로 열려요.</p>' : ''}</div></div></section>`;
  }
  if (product.requirePartner && !state.partnerChart) {
    return `
      <section class="result-page">
        <div class="wrap">
          <div class="result-head">
            <div>
              <div class="result-head__meta"><span class="chip chip--accent">1:1 사주 궁합</span><span class="chip">${esc(formatBirthLabel(state.chart))}</span></div>
              <h1>상대방의 여덟 글자를 알려주세요</h1>
              <p>궁합은 두 사람의 온도와 합·충을 겹쳐 읽습니다. 시간을 몰라도 괜찮아요.</p>
            </div>
          </div>
          <div class="sheet">
            <div class="sheet__head">
              <div><div class="sheet__kicker">PARTNER</div><div class="sheet__title">상대방 생년월일시</div></div>
              <div class="sheet__stamp">1:1<br />궁합</div>
            </div>
            ${partnerFormHTML(state.data.partner)}
            <p style="margin-top:14px;font-size:12.5px;color:var(--text-mute)">상대방의 생년월일시도 이 브라우저에만 저장됩니다. 저장을 원치 않으면 결과를 본 뒤 “기록 지우기”를 눌러 주세요.</p>
          </div>
        </div>
      </section>`;
  }

  if (product.requireBias && (!state.biasChart || state.biasEdit)) {
    return biasFormView(product);
  }

  const unlocked = isUnlocked(product.id);
  const order = unlockedOrder(product.id);
  const report = buildReport(product.id, state.chart, {
    jami: state.jami,
    partner: state.partnerChart,
    partnerJami: state.partnerJami,
    bias: state.biasChart,
    biasName: state.data.bias ? state.data.bias.name : '',
    now: new Date(),
  });
  if (!report || report.needPartner || report.needBias) return '';

  let ctaUsed = unlocked;
  const secHTML = report.sections
    .map((sec) => {
      const isLocked = !unlocked && sec.blocks.length > (sec.freeBlocks == null ? 99 : sec.freeBlocks);
      const cta = isLocked && !ctaUsed;
      if (cta) ctaUsed = true;
      return `
      <div class="sheet rp" id="sec-${sec.id}">
        <div class="sheet__head">
          <div>
            <div class="sheet__kicker">${esc(sec.kicker || '')}</div>
            <div class="sheet__title">${esc(sec.heading)}</div>
          </div>
          <div class="sheet__stamp">3층<br />다락방</div>
        </div>
        ${renderSection(sec, { unlocked, product, cta })}
      </div>`;
    })
    .join('');

  return `
    <section class="result-page">
      <div class="wrap" id="report-capture">
        <div class="result-head" data-capture-skip>
          <div>
            <div class="result-head__meta">
              <span class="chip chip--accent">${esc(product.name)}</span>
              <span class="chip">${esc(formatBirthLabel(state.chart))}</span>
              ${product.requireBias && state.data.bias ? `<span class="chip">최애 ${esc(state.data.bias.name)} · ${esc(biasBirthLabel(state.biasChart))}</span>` : ''}
              ${unlocked ? `<span class="chip chip--ok">${preview.active ? '검수 미리보기 열람' : '✓ 열람 중'}</span>` : `<span class="chip">맛보기 공개 · ${product.beads}구슬</span>`}
            </div>
            <h1>${esc(report.title)}</h1>
            <p>${esc(report.subtitle)}</p>
          </div>
          <div class="report-bar" data-capture-skip>
            ${
              unlocked
                ? `<button class="btn btn--ghost btn--sm" data-action="save-image">${SAVE_LABEL}</button>
                   <span class="report-bar__hint">${esc(SAVE_HINT)}</span>`
                : `<button class="btn btn--primary btn--sm" data-action="open-pay" data-pid="${product.id}">${product.beads}구슬로 전체 열기</button>`
            }
            ${product.requireBias ? '<span class="report-bar__break" aria-hidden="true"></span><button class="btn btn--quiet btn--sm report-bar__extra" data-action="edit-bias">최애 정보 바꾸기</button>' : ''}
          </div>
        </div>

        ${
          unlocked && preview.active
            ? `<div class="sheet preview-receipt" data-capture-skip style="padding:15px 20px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap">
                <div style="display:flex;align-items:center;gap:10px">
                  <span class="mouse-badge"><img src="${CH_FACE}" alt="" /></span>
                  <div style="font-size:12px;color:var(--text-dim)"><b style="color:var(--ink)">${esc(PREVIEW_BADGE)}</b> · ${esc(product.name)} 전체 열람 · 결제 없이 검수 중인 화면입니다</div>
                </div>
                <div style="font-size:11px;color:var(--text-mute)">실제 결제·주문 기록 없음</div>
              </div>`
            : unlocked
            ? `<div class="sheet" data-capture-skip style="padding:15px 20px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap">
                <div style="display:flex;align-items:center;gap:10px">
                  <span class="mouse-badge"><img src="${CH_FACE}" alt="" /></span>
                  <div style="font-size:12px;color:var(--text-dim)"><b style="color:var(--ink)">결제 완료</b> · ${esc(order ? order.name : product.name)} · ${order ? won(order.amount) : won(product.price)} · ${esc(order ? order.method : '')} · ${order ? new Date(order.at).toLocaleString('ko-KR') : ''}</div>
                </div>
                <div style="font-size:11px;color:var(--text-mute)">승인번호 ${esc(order ? order.txId : '')}</div>
              </div>`
            : `<div class="sheet" style="padding:15px 20px">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap">
                  <div style="display:flex;align-items:center;gap:10px;font-size:12.5px;color:var(--text-dim)">
                    <span class="mouse-badge"><img src="${CH_FACE}" alt="" /></span>
                    <b style="color:var(--ink)">${esc(report.summary)}</b>
                  </div>
                  <div style="font-size:11.5px;color:var(--text-mute)">${product.beads}구슬 · ${won(product.price)}</div>
                </div>
              </div>`
        }

        ${report.preview ? biasPreviewHTML(report.preview, state.data.bias ? state.data.bias.name : '최애') : ''}

        ${secHTML}

        <div class="report-actions" data-capture-skip>
          ${
            unlocked
              ? `<a class="btn btn--ghost" href="#/my">${preview.active ? '내 다락방 보기' : '내 다락방에서 영수증 보기'}</a>`
              : `<button class="btn btn--primary" data-action="open-pay" data-pid="${product.id}">${product.beads}구슬(${won(product.price)})로 전체 열기 →</button>`
          }
        </div>
      </div>
    </section>`;
}

/* ────────────────────────────────────────────
   내 다락방
   ──────────────────────────────────────────── */
function myView() {
  const d = state.data;
  const orders = d.orders;
  const profileText = state.chart ? formatBirthLabel(state.chart) : '아직 입력한 생년월일이 없습니다';
  return `
    <section class="result-page">
      <div class="wrap">
        <div class="result-head">
          <div>
            <div class="result-head__meta"><span class="chip chip--accent">내 다락방</span><span class="chip">가입 없음 · 이 브라우저에만</span></div>
            <h1>내 기록과 구슬</h1>
            <p>입력값과 주문 내역은 이 브라우저에만 저장됩니다. 기록 지우기를 누르면 모두 사라져요.</p>
          </div>
        </div>
        <div class="my-grid">
          <div class="sheet">
            <div class="sheet__head"><div><div class="sheet__kicker">PROFILE</div><div class="sheet__title">내 사주 정보</div></div><div class="sheet__stamp">${d.beads}<br />구슬</div></div>
            <dl class="kv-grid">
              <div><dt>생년월일시</dt><dd>${esc(profileText)}</dd></div>
              <div><dt>원국</dt><dd>${state.chart ? esc(state.chart.summary) : '—'}</dd></div>
              <div><dt>띠 · 일주</dt><dd>${state.chart ? `${esc(state.chart.dii)}띠 · ${esc(state.chart.iljuAnimal)}` : '—'}</dd></div>
              <div><dt>보유 구슬</dt><dd>${d.beads}구슬 (${won(d.beads * BEAD_PRICE)})</dd></div>
            </dl>
          <p style="font-size:11.5px;color:var(--text-mute);margin-top:8px">구슬은 유료 사주 리포트 열람 전용 이용권이며, 유효기간은 결제일로부터 1년 이내입니다.</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
              <a class="btn btn--ghost btn--sm" href="#/free">무료 결과 보기</a>
              <button class="btn btn--primary btn--sm" data-action="open-beads">구슬 충전</button>
              <button class="btn btn--quiet btn--sm" data-action="clear-all">기록 지우기</button>
            </div>
          </div>
          <div class="sheet">
            <div class="sheet__head"><div><div class="sheet__kicker">ORDERS</div><div class="sheet__title">주문 내역</div></div><div class="sheet__stamp">${orders.length}<br />건</div></div>
            ${
              orders.length
                ? orders
                    .map((o) => {
                      const replay = replayProductId(o);
                      return `<div class="order-row">
                        <div class="order-row__top">
                          <b>${esc(o.name)}</b>
                          <b class="order-row__amount">${won(o.amount)}</b>
                        </div>
                        <div class="order-row__bottom">
                          <span class="order-row__meta">${new Date(o.at).toLocaleString('ko-KR')} · ${esc(o.method)} · ${esc(o.txId)}</span>
                          ${replay ? `<a class="btn btn--ghost order-row__replay" href="#/product/${replay}">${REPLAY_LABEL}</a>` : ''}
                        </div>
                      </div>`;
                    })
                    .join('')
                : '<div class="empty-note">아직 주문이 없어요. 무료 맛보기부터 시작해 보세요.</div>'
            }
          </div>
        </div>
        <div class="sheet" style="margin-top:16px">
          <div class="sheet__head"><div><div class="sheet__kicker">NOTICE</div><div class="sheet__title">환불 · 문의</div></div></div>
          <div class="refund-note">
            <b>${esc(REFUND_RULE)}</b>
            <span>${esc(REFUND_NOTICE_SHORT)}</span>
            <span>결제 오류로 환불을 요청하실 때는 주문번호·승인번호와 함께 ${esc(BUSINESS.email || '고객센터 이메일')} · ${esc(BUSINESS.phone || '')}로 보내주세요.</span>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
            <button class="btn btn--quiet btn--sm" data-action="legal" data-doc="refund">환불규정 보기</button>
            <button class="btn btn--quiet btn--sm" data-action="legal" data-doc="terms">이용약관</button>
            <button class="btn btn--quiet btn--sm" data-action="legal" data-doc="privacy">개인정보처리방침</button>
          </div>
        </div>
      </div>
    </section>`;
}

/* ────────────────────────────────────────────
   모달
   ──────────────────────────────────────────── */
function legalBody(doc) {
  return doc.sections
    .map((s) => `<h3 style="font-family:var(--serif);font-size:15.5px;color:var(--ink);margin:18px 0 7px">${esc(s.heading)}</h3>${s.body.map((p) => `<p style="font-size:13px;color:var(--text-dim);line-height:1.85;margin-bottom:7px">${esc(p)}</p>`).join('')}`)
    .join('');
}

function fillTokens(text) {
  return String(text)
    .replaceAll('{상호}', BUSINESS.companyName || BUSINESS.serviceName)
    .replaceAll('{대표자}', BUSINESS.representative || BUSINESS.pendingText)
    .replaceAll('{이메일}', BUSINESS.email || BUSINESS.pendingText)
    .replaceAll('{전화}', BUSINESS.phone || BUSINESS.pendingText)
    .replaceAll('{운영시간}', BUSINESS.hours)
    .replaceAll('{PG사}', BUSINESS.pgCompany);
}

function modalShell({ title, subtitle = '', body, foot, wide = false }) {
  return `
    <div class="modal-backdrop" data-backdrop="1">
      <div class="modal ${wide ? 'modal--wide' : ''}" role="dialog" aria-modal="true">
        <div class="modal__head">
          <div><div class="modal__title">${title}</div>${subtitle ? `<div class="modal__sub">${subtitle}</div>` : ''}</div>
          <button class="modal__close" data-action="close-modal" aria-label="닫기">✕</button>
        </div>
        <div class="modal__body">${body}</div>
        ${foot ? `<div class="modal__foot">${foot}</div>` : ''}
      </div>
    </div>`;
}

function renderModal() {
  const root = $('#modal-root');
  if (!state.modal) {
    root.innerHTML = '';
    return;
  }
  if (state.modal.type === 'legal') {
    const doc = state.modal.doc;
    root.innerHTML = modalShell({
      title: `<span style="font-family:var(--serif)">${esc(doc.title)}</span>`,
      subtitle: `시행일 ${esc(doc.updated)} · ${esc(BUSINESS.serviceName)}`,
      wide: true,
      body: `${doc.highlight ? `<div class="pay-test-note"><span>${esc(doc.highlight)}</span></div>` : ''}<div style="max-height:58vh;overflow:auto;padding-right:6px">${fillTokens(legalBody(doc))}</div>`,
      foot: `<button class="btn btn--ghost btn--block" data-action="close-modal">닫기</button>`,
    });
    return;
  }

  if (state.modal.type === 'beads') {
    root.innerHTML = modalShell({
      title: '구슬 충전',
      subtitle: '유료 사주 리포트 열람 전용 이용권 · 1구슬 = 990원',
      body: `
        <div class="bead-info">
          <p><b>구슬이란?</b> ${esc(BEAD_PURPOSE)}</p>
          <p><b>구슬로 결제 가능한 상품</b><br />${esc(BEAD_USABLE_LIST)} 등 사이트 내 모든 유료 사주 리포트(연애운·재회운·재물운·자미두수 심층 포함).</p>
          <p class="bead-info__valid">${esc(BEAD_VALIDITY)} 사용하지 않은 구슬도 단순 변심으로는 환불되지 않으며, 중복 결제·구슬 오충전 같은 결제 오류에 한해서만 환불됩니다.</p>
        </div>
        <div class="pay-methods pay-methods--stack">
          ${BEAD_PACKS.map(
            (b) => `<button class="pay-method ${state.modal.pack === b.id ? 'is-on' : ''}" data-action="pick-pack" data-pack="${b.id}">
              <span class="pay-method__dot"></span>
              <span style="flex:1;text-align:left"><b style="color:var(--ink)">${esc(b.label)}</b> <span style="color:var(--text-mute);font-size:11px">· ${esc(b.note)}</span></span>
              <span style="color:var(--ink-2);font-weight:600">${won(b.price)}</span>
            </button>`,
          ).join('')}
        </div>
        <div class="pay-test-note"><span><b>TIP</b> · 구슬은 여러 리포트를 열 때 씁니다. 한 건만 볼 거라면 리포트 화면에서 바로 결제해도 같은 금액이에요.</span></div>`,
      foot: `
        <div class="refund-note">
          <b>${esc(REFUND_RULE)}</b>
          <span>${esc(REFUND_NOTICE_BEADS)}</span>
          <span>${esc(REFUND_CONSENT_LINE)}</span>
        </div>
        <button class="btn btn--primary btn--block" data-action="buy-beads">${won((BEAD_PACKS.find((b) => b.id === state.modal.pack) || BEAD_PACKS[0]).price)} 결제하고 충전</button>
        <button class="btn btn--quiet btn--block" data-action="close-modal">다음에 할게요</button>`,
    });
    return;
  }

  if (state.modal.type === 'report-image') {
    const images = state.modal.images || [];
    root.innerHTML = modalShell({
      title: '이미지 저장',
      subtitle: images.length > 1 ? `리포트를 ${images.length}장의 이미지로 담았어요` : '리포트를 PNG 한 장으로 담았어요',
      wide: true,
      body: `<div class="img-preview">${images.map((i) => `<img src="${i.url}" alt="${esc(i.name)}" />`).join('')}</div>
        <p class="img-preview__note">아이폰에서는 이미지를 길게 눌러 「사진에 추가」를 고르면 사진첩에 저장됩니다. 아래 「공유 창 열기」로 한 번에 저장할 수도 있어요.</p>`,
      foot: `
        <button class="btn btn--primary btn--block" data-action="save-image-share">공유 창 열기 — 사진첩 저장</button>
        <button class="btn btn--quiet btn--block" data-action="save-image-download">PNG 파일로 내려받기</button>
        <button class="btn btn--quiet btn--block" data-action="close-modal">닫기</button>`,
    });
    return;
  }

  if (state.modal.type === 'confirm') {
    root.innerHTML = modalShell({
      title: state.modal.title,
      subtitle: state.modal.subtitle || '',
      body: `<p style="font-size:13.5px;color:var(--text-dim);line-height:1.8">${esc(state.modal.message)}</p>`,
      foot: `<button class="btn btn--primary btn--block" data-action="confirm-yes">${esc(state.modal.yes)}</button>
             <button class="btn btn--quiet btn--block" data-action="close-modal">취소</button>`,
    });
    return;
  }

  if (state.modal.type === 'pay') {
    const product = state.modal.product;
    const useBeads = state.data.beads >= product.beads;
    const agreed = state.agree.terms && state.agree.privacy && state.agree.refund;

    if (state.payState === 'processing') {
      root.innerHTML = modalShell({
        title: '결제 진행 중',
        subtitle: isTestMode() ? 'PG 테스트 결제 모드' : '실결제',
        body: `<div class="paying">
          <div class="paying__mouse"><img src="${CH_MOUSE}" alt="${JANI}" /></div>
          <p><b>${esc(product.name)}</b><br />${won(product.price)} 승인을 확인하고 있어요</p>
        </div>`,
      });
      return;
    }
    if (state.payState === 'done' && state.payResult) {
      const o = state.payResult;
      const isBeads = o.productId === 'beads';
      root.innerHTML = modalShell({
        title: isBeads ? '충전이 완료됐어요' : '결제가 완료됐어요',
        subtitle: isBeads ? `보유 ${state.data.beads}구슬` : '리포트 잠금이 해제됩니다',
        body: `
          <div class="done-view">
            <div class="done-view__mark"><img src="${CH_FACE}" alt="${JANI}" /><span>✓</span></div>
            <h3>${esc(product.name)}</h3>
            <p>${isBeads ? '이제 원하는 리포트를 구슬로 열 수 있어요.' : '1초 만에 전체 풀이가 열립니다.'}</p>
            <div class="receipt">
              <div><span>주문번호</span><b>${esc(o.id)}</b></div>
              <div><span>상품</span><b>${esc(o.name)}</b></div>
              <div><span>결제금액</span><b>${won(o.amount)}</b></div>
              <div><span>결제수단</span><b>${esc(o.method)}</b></div>
              <div><span>승인시각</span><b>${new Date(o.at).toLocaleString('ko-KR')}</b></div>
              <div><span>승인번호</span><b>${esc(o.txId)}</b></div>
            </div>
            <p style="font-size:11.5px;color:var(--text-mute)">${isTestMode() ? '테스트 결제입니다. 실제 금액은 청구되지 않았습니다.' : '영수증은 내 다락방에서 다시 볼 수 있습니다.'}</p>
          </div>`,
        foot: `<button class="btn btn--primary btn--block" data-action="close-and-open">${isBeads ? '확인' : '리포트 열기 →'}</button>`,
      });
      return;
    }
    if (state.payState === 'error') {
      root.innerHTML = modalShell({
        title: '결제가 완료되지 않았어요',
        subtitle: '다시 시도해 주세요',
        body: `<p style="font-size:13px;color:var(--rose);line-height:1.8">${esc(state.payError || '결제가 취소되었습니다.')}</p>
          <p style="font-size:11.5px;color:var(--text-mute);line-height:1.75;margin-top:10px">결제가 승인된 뒤 이 화면이 보인다면 중복 결제·오류 결제에 해당할 수 있어요. 주문번호와 함께 ${esc(BUSINESS.email || '고객센터 이메일')}로 알려주시면 확인 후 전액 환불해 드립니다.</p>`,
        foot: `<button class="btn btn--primary btn--block" data-action="retry-pay">다시 결제하기</button>
               <button class="btn btn--quiet btn--block" data-action="close-modal">닫기</button>`,
      });
      return;
    }

    root.innerHTML = modalShell({
      title: esc(product.name),
      subtitle: `${product.beads}구슬 · ${won(product.price)}`,
      body: `
        <div class="pay-summary">
          <div class="pay-summary__row"><span>상품</span><b>${esc(product.name)}</b></div>
          <div class="pay-summary__row"><span>구슬</span><b>${product.beads}구슬</b></div>
          ${state.data.beads ? `<div class="pay-summary__row"><span>보유 구슬</span><b>${state.data.beads}구슬</b></div>` : ''}
          <div class="pay-summary__total"><span>결제 금액</span><b>${won(product.price)}</b></div>
        </div>
        <div class="pay-test-note">
          <span>${isTestMode()
            ? '<b>TEST</b> · 지금은 <b>PG 테스트 결제 모드</b>입니다. 실제 금액은 청구되지 않고, 결제 → 승인 → 잠금 해제까지 실제와 동일하게 진행됩니다.'
            : '<b>실결제</b> · 결제 금액이 실제로 청구됩니다. 결제 정보는 결제대행사(토스페이) 화면에서 입력하며, 다락방은 카드번호를 저장하지 않습니다.'}</span>
        </div>
        ${
          useBeads
            ? `<button class="btn btn--ghost btn--block" data-action="pay-beads" style="margin-bottom:10px">보유 구슬 ${product.beads}개로 열기 (결제 없음)</button>
               <div style="text-align:center;font-size:11.5px;color:var(--text-mute);margin-bottom:12px">또는 ${esc((payMethodById(DEFAULT_PAY_METHOD) || {}).label || '토스페이')}로 결제</div>`
            : ''
        }
        <div class="pay-methods">
          ${PAY_METHODS.map(
            (m) => `<button class="pay-method ${state.payMethod === m.id ? 'is-on' : ''} ${m.ready ? '' : 'is-off'}" data-action="pay-method" data-method="${m.id}" ${m.ready ? '' : 'disabled aria-disabled="true"'}>
              <span class="pay-method__dot"></span><span>${esc(m.label)}</span>${m.ready ? '' : `<span class="pay-method__badge">${esc(m.note || '준비 중')}</span>`}
            </button>`,
          ).join('')}
        </div>
        ${PENDING_PAY_METHODS.length ? `<p class="pay-method__note">지금은 ${esc((payMethodById(DEFAULT_PAY_METHOD) || {}).label || '토스페이')}로만 결제할 수 있어요. ${PENDING_PAY_METHODS.map((m) => esc(m.label)).join('·')}는 PG 심사 중입니다.</p>` : ''}
        <div class="agree">
          <label class="agree__all"><input type="checkbox" data-action="agree-all" ${agreed ? 'checked' : ''} /> 전체 동의</label>
          <label><input type="checkbox" data-action="agree" data-key="terms" ${state.agree.terms ? 'checked' : ''} /> <span>[필수] 이용약관 동의</span></label>
          <label><input type="checkbox" data-action="agree" data-key="privacy" ${state.agree.privacy ? 'checked' : ''} /> <span>[필수] 개인정보 수집·이용 동의</span></label>
          <label><input type="checkbox" data-action="agree" data-key="refund" ${state.agree.refund ? 'checked' : ''} /> <span>[필수] 결제 오류 외 환불 불가 — 디지털 콘텐츠 환불규정 확인 <button type="button" data-action="legal" data-doc="refund">보기</button></span></label>
        </div>
`,
      foot: `<div class="refund-note">
               <b>${esc(REFUND_RULE)}</b>
               <span>${esc(REFUND_NOTICE_PAY)}</span>
             </div>
             <button class="btn btn--primary btn--block" data-action="submit-pay" ${agreed ? '' : 'disabled'}>${won(product.price)} 결제하기</button>
             <button class="btn btn--quiet btn--block" data-action="close-modal">취소</button>`,
    });
  }
}

function openModal(obj) {
  /* 미리보기 중에는 결제·충전 창을 아예 띄우지 않는다 — 어느 동선으로 들어와도 결제창이 뜨지 않는 것의 마지막 잠금장치 */
  if (preview.active && obj && (obj.type === 'pay' || obj.type === 'beads')) {
    toast(`${PREVIEW_BADGE}에서는 결제창이 열리지 않아요. 상품 카드나 「바로 열기」로 들어가면 결제 없이 열립니다.`, 3600);
    return;
  }
  state.modal = obj;
  renderModal();
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  state.modal = null;
  state.payState = 'idle';
  state.payResult = null;
  renderModal();
  document.body.style.overflow = '';
}

/* ────────────────────────────────────────────
   결제 실행
   ──────────────────────────────────────────── */
async function runPayment(product) {
  state.payState = 'processing';
  state.payError = null;
  renderModal();
  const paymentId = newPaymentId('DRK');
  const picked = payMethodById(state.payMethod);
  const method = picked && picked.ready ? picked.id : DEFAULT_PAY_METHOD;
  // 모바일은 결제창에서 리디렉션으로 빠졌다가 돌아온다 → 무엇을 결제했는지 남긴다.
  savePendingPayment({
    paymentId,
    kind: 'product',
    productId: product.id,
    orderName: product.name,
    amount: product.price,
    method,
    at: new Date().toISOString(),
  });
  let res;
  try {
    res = await requestPayment({
      paymentId,
      orderName: product.name,
      amount: product.price,
      method,
      buyer: {},
      redirectUrl: paymentReturnUrl(),
    });
  } catch (e) {
    res = { ok: false, error: e && e.message ? e.message : '결제 중 오류가 발생했습니다.' };
  }
  clearPendingPayment();
  if (!res.ok) {
    state.payState = 'error';
    state.payError = res.error;
    renderModal();
    return;
  }
  const order = {
    id: res.paymentId,
    txId: res.txId,
    productId: product.id,
    name: product.name,
    amount: res.amount,
    method: res.methodLabel,
    mode: res.mode,
    at: res.approvedAt,
  };
  state.data.orders.unshift(order);
  state.data.unlocks[product.id] = order.id;
  save();
  state.payResult = order;
  state.payState = 'done';
  state.justUnlocked = product.id;
  renderModal();
}

function payWithBeads(product) {
  if (state.data.beads < product.beads) return;
  state.data.beads -= product.beads;
  const order = {
    id: newPaymentId('BEAD'),
    txId: `BEAD-${Date.now().toString(36).toUpperCase().slice(-6)}`,
    productId: product.id,
    name: product.name,
    amount: 0,
    method: `구슬 ${product.beads}개`,
    mode: 'bead',
    at: new Date().toISOString(),
  };
  state.data.orders.unshift(order);
  state.data.unlocks[product.id] = order.id;
  save();
  state.payResult = order;
  state.payState = 'done';
  state.justUnlocked = product.id;
  renderModal();
  toast('구슬로 열었어요. 리포트가 열립니다.');
}

/* ────────────────────────────────────────────
   모바일 리디렉션 복귀 — 결제창에서 돌아온 결제를 마무리한다
   ──────────────────────────────────────────── */
async function resumePaymentReturn() {
  const r = parsePayRedirect();
  if (!r) return;

  const pending = loadPendingPayment();
  clearPendingPayment();

  let product = null;
  if (pending && pending.kind === 'beads') {
    product = { id: 'beads', name: pending.orderName || '구슬 충전', price: pending.amount, beads: 0 };
  } else if (pending && pending.productId) {
    product = productById(pending.productId);
  }

  // 주소창의 결제 파라미터는 바로 지우고, 결제했던 화면으로 돌려놓는다.
  const target = product && product.id !== 'beads' ? `#/product/${product.id}` : '#/';
  try {
    if (history.replaceState) history.replaceState(null, '', `${location.pathname}${target}`);
  } catch (e) {
    /* 무시 */
  }
  render();

  if (!pending || !product) {
    if (r.code) toast(r.message || '결제가 취소되었어요. 다시 시도해 주세요.');
    return;
  }

  state.payMethod = pending.method || DEFAULT_PAY_METHOD;
  startModalAfterRedirect(product);

  if (r.code) {
    state.payState = 'error';
    state.payError = r.message || r.pgMessage || '결제가 취소되었습니다.';
    renderModal();
    return;
  }

  state.payState = 'processing';
  renderModal();
  const res = await verifyAndApprove({
    paymentId: r.paymentId || pending.paymentId,
    txId: r.txId,
    amount: pending.amount,
    method: pending.method,
    orderName: pending.orderName,
  });
  if (!res.ok) {
    state.payState = 'error';
    state.payError = res.error;
    renderModal();
    return;
  }

  const order = {
    id: res.paymentId,
    txId: res.txId,
    productId: product.id,
    name: product.name,
    amount: res.amount,
    method: res.methodLabel,
    mode: res.mode,
    at: res.approvedAt,
  };
  state.data.orders.unshift(order);
  if (product.id === 'beads') state.data.beads += Number(pending.beads || 0);
  else state.data.unlocks[product.id] = order.id;
  save();
  state.payResult = order;
  state.payState = 'done';
  state.justUnlocked = product.id;
  state.agree = { terms: true, privacy: true, refund: true };
  renderModal();
  toast(product.id === 'beads' ? '구슬 충전이 완료됐어요.' : '결제가 완료됐어요. 리포트가 열립니다.');
}

function startModalAfterRedirect(product) {
  /* 미리보기 중에는 결제 복귀 창도 띄우지 않는다 */
  if (preview.active) {
    state.modal = null;
    renderModal();
    document.body.style.overflow = '';
    return;
  }
  state.modal = { type: 'pay', product };
  renderModal();
  document.body.style.overflow = 'hidden';
}

/* ────────────────────────────────────────────
   이벤트
   ──────────────────────────────────────────── */
function readBirthForm(form) {
  const fd = new FormData(form);
  const calendar = form.dataset.calendar || 'solar';
  const gender = form.dataset.gender || 'female';
  const timeUnknown = !!fd.get('timeUnknown');
  const profile = {
    calendar,
    year: Number(fd.get('year')),
    month: Number(fd.get('month')),
    day: Number(fd.get('day')),
    hour: timeUnknown ? 12 : Number(fd.get('hour') || 0),
    minute: timeUnknown ? 0 : Number(fd.get('minute') || 0),
    timeUnknown,
    gender,
    leap: !!fd.get('leap'),
  };
  return profile;
}

function handleBirthSubmit(form) {
  const profile = readBirthForm(form);
  const test = computeChart(profile);
  if (!test.ok) {
    toast(test.errors[0] || '입력값을 확인해 주세요.');
    return;
  }
  state.data.profile = profile;
  state.data.createdAt = state.data.createdAt || new Date().toISOString();
  save();
  syncCharts();
  /* 미리보기에서 「990원 상품 → 생년월일 → 바로 보기」로 들어온 경우에는 그 상품 리포트로 이어진다 */
  const next = nextProductFromHash();
  location.hash = next ? `#/product/${next.id}` : '#/free';
  setTimeout(() => toast(`${test.dayMaster.ko}일간 · ${test.summary}`, 3200), 200);
}

function handlePartnerSubmit(form) {
  const profile = readBirthForm(form);
  const test = computeChart(profile);
  if (!test.ok) {
    toast(test.errors[0] || '입력값을 확인해 주세요.');
    return;
  }
  state.data.partner = profile;
  save();
  syncCharts();
  render();
  toast('궁합 맛보기가 열렸어요.');
}

function handleBiasSubmit(form) {
  const fd = new FormData(form);
  const name = String(fd.get('biasName') || '').trim().replace(/\s+/g, ' ').slice(0, 20);
  if (!name) {
    toast('최애 이름을 적어 주세요.');
    return;
  }
  const profile = readBirthForm(form);
  const test = computeChart(profile);
  if (!test.ok) {
    toast(test.errors[0] || '입력값을 확인해 주세요.');
    return;
  }
  state.data.bias = { name, profile };
  state.biasEdit = false;
  save();
  syncCharts();
  render();
  toast(`${name}의 여섯 글자로 궁합을 계산했어요.`, 3200);
}

document.addEventListener('submit', (e) => {
  const form = e.target.closest('form[data-form]');
  if (!form) return;
  e.preventDefault();
  if (form.dataset.form === 'birth') handleBirthSubmit(form);
  if (form.dataset.form === 'partner') handlePartnerSubmit(form);
  if (form.dataset.form === 'bias') handleBiasSubmit(form);
});

document.addEventListener('change', (e) => {
  const t = e.target;
  const form = t.closest('form[data-form]');
  if (form && t.name === 'timeUnknown') {
    const on = t.checked;
    $$('input[name="hour"], input[name="minute"]', form).forEach((i) => {
      i.disabled = on;
      i.style.opacity = on ? '0.45' : '1';
    });
  }
  if (t.dataset && t.dataset.action === 'agree') {
    state.agree[t.dataset.key] = t.checked;
    renderModal();
  }
  if (t.dataset && t.dataset.action === 'agree-all') {
    const v = t.checked;
    state.agree = { terms: v, privacy: v, refund: v };
    renderModal();
  }
});

/* ────────────────────────────────────────────
   리포트 이미지 저장 — 핸드폰은 사진첩(공유 시트), PC 는 PNG 파일
   ──────────────────────────────────────────── */
const IMAGE_TOAST = {
  shared: '이미지를 만들었어요. 공유 창에서 「이미지 저장」을 고르면 사진첩에 담깁니다.',
  downloaded: '리포트를 PNG 이미지로 저장했어요.',
  canceled: '이미지 저장을 취소했어요.',
};

/** 무료 「12띠 × 일주 동물」 카드 — 한 장짜리 공유 이미지 (카톡·인스타용) */
async function saveZodiacShareFlow(btn) {
  if (state.savingImage) return;
  const card = document.getElementById('zodiac-share');
  if (!card) return;
  const title = '12띠 × 일주 동물';
  const baseName = '다락방 12띠 × 일주 동물';
  const meta = state.chart ? formatBirthLabel(state.chart) : '';
  const label = btn.textContent;
  state.savingImage = true;
  btn.setAttribute('aria-busy', 'true');
  btn.textContent = SAVING_LABEL;
  setTimeout(() => {
    if (state.savingImage) toast('공유할 카드를 이미지로 담고 있어요…', 1600);
  }, 260);
  try {
    const res = await saveReportImages({ baseName, title, meta, cards: [card] });
    if (res.mode === 'shared') toast(IMAGE_TOAST.shared, 3800);
    else if (res.mode === 'downloaded') toast(IMAGE_TOAST.downloaded, 3000);
    else if (res.mode === 'canceled') toast(IMAGE_TOAST.canceled, 2200);
    else openImagePreviewModal(res.images, title);
  } catch (err) {
    console.error('[zodiac-share]', err);
    toast('이미지를 만들지 못했어요. 잠시 뒤 다시 눌러 주세요.', 3800);
  } finally {
    state.savingImage = false;
    btn.removeAttribute('aria-busy');
    btn.textContent = label;
  }
}

async function saveReportImageFlow(btn) {
  if (state.savingImage) return;
  const root = $('#report-capture');
  if (!root) return;
  const title = ((root.querySelector('.result-head h1') || {}).textContent || '다락방 사주 리포트').trim();
  const baseName = `다락방 ${title}`;
  const meta = state.chart ? formatBirthLabel(state.chart) : '';
  const label = btn.textContent;
  state.savingImage = true;
  btn.setAttribute('aria-busy', 'true');
  btn.textContent = SAVING_LABEL;
  setTimeout(() => {
    if (state.savingImage) toast('리포트를 이미지로 담고 있어요…', 1600);
  }, 260);
  try {
    const res = await saveReportImages({ reportRoot: root, baseName, title, meta });
    if (res.mode === 'shared') toast(IMAGE_TOAST.shared, 3800);
    else if (res.mode === 'downloaded') toast(IMAGE_TOAST.downloaded, 3000);
    else if (res.mode === 'canceled') toast(IMAGE_TOAST.canceled, 2200);
    else openImagePreviewModal(res.images, title);
  } catch (err) {
    console.error('[report-image]', err);
    toast('이미지를 만들지 못했어요. 잠시 뒤 다시 눌러 주세요.', 3800);
  } finally {
    state.savingImage = false;
    btn.removeAttribute('aria-busy');
    btn.textContent = label;
  }
}

/** 공유가 막힌 환경의 안전망 — 만든 이미지를 보여 주고, 누를 때 공유 시트를 다시 연다 */
function openImagePreviewModal(images, title) {
  const modal = { type: 'report-image', images, title, files: null };
  openModal(modal);
  imagesToFiles(images)
    .then((files) => {
      if (state.modal && state.modal.type === 'report-image') state.modal.files = files;
    })
    .catch(() => {});
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-action]');
  if (!t) {
    if (e.target.matches('.modal-backdrop')) closeModal();
    return;
  }
  const a = t.dataset.action;

  if (a === 'seg') {
    const seg = t.closest('.seg');
    const form = t.closest('form');
    if (!seg || !form) return;
    const key = seg.dataset.seg;
    form.dataset[key === 'calendar' ? 'calendar' : 'gender'] = t.dataset.segValue;
    $$('button', seg).forEach((b) => b.classList.toggle('is-on', b === t));
    if (key === 'calendar') {
      const leapWrap = $('[data-leap-wrap]', form);
      if (leapWrap) leapWrap.style.display = t.dataset.segValue === 'lunar' ? '' : 'none';
    }
    return;
  }

  if (a === 'faq') {
    const i = Number(t.dataset.i);
    state.faqOpen = state.faqOpen === i ? -1 : i;
    const item = t.closest('.faq__item');
    const open = state.faqOpen === i;
    item.classList.toggle('is-open', open);
    return;
  }

  if (a === 'legal') {
    e.preventDefault();
    e.stopPropagation();
    const doc = { terms: TERMS, privacy: PRIVACY, refund: REFUND }[t.dataset.doc];
    if (doc) openModal({ type: 'legal', doc });
    return;
  }

  if (a === 'kb-escrow') {
    e.preventDefault();
    openKBEscrowMark();
    return;
  }

  if (a === 'open-beads') {
    if (preview.active) {
      toast(`${PREVIEW_BADGE}에서는 구슬 충전 창이 열리지 않아요. 상품 카드에서 결제 없이 바로 보실 수 있습니다.`, 3600);
      return;
    }
    openModal({ type: 'beads', pack: 'bead-1' });
    return;
  }

  if (a === 'pick-pack') {
    state.modal.pack = t.dataset.pack;
    renderModal();
    return;
  }

  if (a === 'buy-beads') {
    if (preview.active) {
      toast(`${PREVIEW_BADGE}에서는 결제가 열리지 않아요.`, 3200);
      return;
    }
    const pack = BEAD_PACKS.find((b) => b.id === state.modal.pack) || BEAD_PACKS[0];
    // 구슬 충전도 같은 PG 어댑터를 탄다
    (async () => {
      state.payState = 'processing';
      const fakeProduct = { id: 'beads', name: `${pack.label} 충전`, price: pack.price, beads: 0 };
      state.modal = { type: 'pay', product: fakeProduct };
      const picked = payMethodById(state.payMethod);
      const method = picked && picked.ready ? picked.id : DEFAULT_PAY_METHOD;
      state.payMethod = method;
      renderModal();
      const paymentId = newPaymentId('BDS');
      savePendingPayment({
        paymentId,
        kind: 'beads',
        packId: pack.id,
        beads: pack.beads,
        orderName: `${pack.label} 충전`,
        amount: pack.price,
        method,
        at: new Date().toISOString(),
      });
      const res = await requestPayment({
        paymentId,
        orderName: `${pack.label} 충전`,
        amount: pack.price,
        method,
        redirectUrl: paymentReturnUrl(),
      }).catch((e) => ({ ok: false, error: (e && e.message) || '결제 중 오류가 발생했습니다.' }));
      clearPendingPayment();
      if (!res.ok) {
        state.payState = 'error';
        state.payError = res.error;
        renderModal();
        return;
      }
      state.data.beads += pack.beads;
      const order = {
        id: res.paymentId, txId: res.txId, productId: 'beads', name: `${pack.label} 충전`,
        amount: res.amount, method: res.methodLabel, mode: res.mode, at: res.approvedAt,
      };
      state.data.orders.unshift(order);
      save();
      state.payResult = order;
      state.payState = 'done';
      renderModal();
      render();
      toast(`${pack.label} 충전 완료 · 보유 ${state.data.beads}구슬`);
    })();
    return;
  }

  if (a === 'open-pay') {
    const product = productById(t.dataset.pid);
    if (!product) return;
    /* 미리보기 — 결제 대신 그 상품을 바로 연다 (생년월일이 없으면 입력을 거쳐 바로 이어진다) */
    if (preview.active) {
      const href = productHref(product.id);
      if (location.hash === href) render();
      else location.hash = href;
      return;
    }
    if (isUnlocked(product.id)) {
      toast('이미 열려 있는 리포트예요.');
      return;
    }
    state.agree = { terms: false, privacy: false, refund: false };
    state.payState = 'idle';
    openModal({ type: 'pay', product });
    return;
  }

  if (a === 'pay-method') {
    const m = payMethodById(t.dataset.method);
    if (!m) return;
    if (!m.ready) {
      toast(`${m.label}는 지금 PG 심사 중이에요. 토스페이로 결제해 주세요.`);
      return;
    }
    state.payMethod = m.id;
    renderModal();
    return;
  }

  if (a === 'submit-pay') {
    if (preview.active) {
      toast(`${PREVIEW_BADGE}에서는 결제가 열리지 않아요.`, 3200);
      return;
    }
    if (!(state.agree.terms && state.agree.privacy && state.agree.refund)) {
      toast('약관에 모두 동의해 주세요.');
      return;
    }
    if (!state.modal || state.modal.type !== 'pay') return;
    runPayment(state.modal.product);
    return;
  }

  if (a === 'retry-pay') {
    state.payState = 'idle';
    renderModal();
    return;
  }

  if (a === 'pay-beads') {
    payWithBeads(state.modal.product);
    return;
  }

  if (a === 'close-and-open') {
    const pid = state.modal.product.id;
    closeModal();
    if (pid === 'beads') {
      render();
      toast('구슬이 충전됐어요.');
      return;
    }
    if (location.hash === `#/product/${pid}`) render();
    else location.hash = `#/product/${pid}`;
    setTimeout(() => {
      const el = document.getElementById('sec-personality') || document.querySelector('.sheet');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 260);
    return;
  }

  if (a === 'close-modal') {
    closeModal();
    return;
  }

  if (a === 'edit-bias') {
    state.biasEdit = true;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  if (a === 'cancel-bias-edit') {
    state.biasEdit = false;
    render();
    return;
  }

  if (a === 'clear-all') {
    openModal({
      type: 'confirm',
      title: '기록을 지울까요?',
      subtitle: '이 브라우저에 저장된 모든 것',
      message: '생년월일시, 상대방 정보, 주문 내역, 보유 구슬이 모두 삭제됩니다. 삭제된 기록은 복구할 수 없습니다.',
      yes: '모두 지우기',
    });
    return;
  }

  if (a === 'confirm-yes') {
    localStorage.removeItem(STORE_KEY);
    state.data = { ...DEFAULT_DATA, orders: [], unlocks: {} };
    state.chart = null;
    state.jami = null;
    state.partnerChart = null;
    state.biasChart = null;
    state.biasEdit = false;
    closeModal();
    render();
    toast('기록을 모두 지웠어요.');
    return;
  }

  if (a === 'save-image') {
    saveReportImageFlow(t);
    return;
  }

  if (a === 'save-zodiac') {
    saveZodiacShareFlow(t);
    return;
  }

  if (a === 'save-image-share') {
    const files = state.modal && state.modal.files;
    if (!files || !files.length) {
      toast('이미지를 준비하고 있어요. 잠시 뒤 다시 눌러 주세요.', 2400);
      return;
    }
    shareFiles(files, state.modal.title || '다락방 사주 리포트').then((r) => {
      if (r === 'shared') toast(IMAGE_TOAST.shared, 3600);
      else if (r === 'canceled') toast(IMAGE_TOAST.canceled, 2000);
      else toast('공유 창을 열 수 없어요. 위 이미지를 길게 눌러 사진에 저장해 주세요.', 3800);
    });
    return;
  }

  if (a === 'save-image-download') {
    downloadImages((state.modal && state.modal.images) || []);
    toast(IMAGE_TOAST.downloaded, 2600);
    return;
  }
});

/* ────────────────────────────────────────────
   라우터
   ──────────────────────────────────────────── */
function route() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const path = hash.split('?')[0];
  if (path.startsWith('/product/')) return { name: 'product', id: path.split('/')[2] };
  if (path === '/free') return { name: 'free' };
  if (path === '/input') return { name: 'input' };
  if (path === '/my') return { name: 'my' };
  return { name: 'home', anchor: path.replace('/', '') };
}

/**
 * 원국 카드 아래 한 줄 요약(.wy-line)을 화면 폭에 맞춘다.
 * 한 줄 고정(white-space: nowrap)이라 좁은 화면에서 넘칠 수 있으므로, 넘칠 때만 글자를 줄여
 * 375px 에서도 두 줄로 접히거나 잘리지 않게 한다 (최소 8.5px, 그래도 넘치면 말줄임).
 */
function fitOneLineBars() {
  $$('.wy-line').forEach((bar) => {
    const inner = bar.querySelector('.wy-line__inner');
    if (!inner) return;
    const style = getComputedStyle(bar);
    const start = parseFloat(style.fontSize) || 11;
    const room = bar.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0);
    if (!room) return;
    let size = start;
    inner.style.fontSize = `${size}px`;
    let guard = 0;
    while (inner.scrollWidth > room && size > 8.5 && guard < 14) {
      size = Math.max(8.5, size - 0.5);
      inner.style.fontSize = `${size}px`;
      guard += 1;
    }
  });
}

function render() {
  syncCharts();
  $('#site-header').innerHTML = headerHTML();
  $('#site-footer').innerHTML = footerHTML();
  const r = route();
  const view = $('#view');
  if (r.name === 'product') view.innerHTML = productView(r.id);
  else if (r.name === 'free') view.innerHTML = resultView();
  else if (r.name === 'input') view.innerHTML = inputView();
  else if (r.name === 'my') view.innerHTML = myView();
  else view.innerHTML = homeView();

  // 시간 모름 체크 상태를 초기 반영
  $$('form[data-form]').forEach((form) => {
    const cb = form.querySelector('input[name="timeUnknown"]');
    if (cb && cb.checked) {
      $$('input[name="hour"], input[name="minute"]', form).forEach((i) => {
        i.disabled = true;
        i.style.opacity = '0.45';
      });
    }
  });

  fitOneLineBars();

  if (state.justUnlocked && r.name === 'product' && r.id === state.justUnlocked) {
    setTimeout(() => { state.justUnlocked = null; }, 1400);
  } else if (r.name !== 'product') {
    state.justUnlocked = null;
  }
}

window.addEventListener('resize', fitOneLineBars);

window.addEventListener('hashchange', () => {
  render();
  const hash = location.hash;
  if (hash.includes('#')) {
    const id = hash.split('#').pop();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
});

initPreview();
syncCharts();
render();
resumePaymentReturn();
