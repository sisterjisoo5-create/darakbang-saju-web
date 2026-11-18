// 사주보는 3층 다락방 — 앱 엔트리
import './styles/base.css';
import './styles/components.css';

import { computeChart, formatBirthLabel } from './engine/saju.js';
import { computeJami } from './engine/jami.js';
import { todayFortune } from './engine/today.js';
import { OHAENG, OHAENG_META, BRANCHES } from './engine/constants.js';
import { buildReport } from './content/report.js';
import { PRODUCTS, productById, BEAD_PACKS, BEAD_PRICE, won } from './config/products.js';
import { zodiacOf, zodiacByAnimal, zodiacImage, zodiacLabel } from './config/zodiac.js';
import { BUSINESS, BUSINESS_ROWS, businessRowText, pendingBusinessFields } from './config/business.js';
import { TERMS, PRIVACY, REFUND } from './content/legal.js';
import { requestPayment, newPaymentId, isTestMode, PAY_METHODS } from './config/payment.js';
import { asset } from './config/asset.js';

/* ────────────────────────────────────────────
   저장소 (브라우저 localStorage 에만)
   ──────────────────────────────────────────── */
const STORE_KEY = 'darakbang.v2';
const DEFAULT_DATA = {
  profile: null,
  partner: null,
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
  payProduct: null,
  payMethod: 'card',
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

/* 3층 다락방 대표 캐릭터 — 12간지 첫 번째 쥐, 소원을 읽어 주는 '자니' */
const CH_MOUSE = asset('images/mascot-mouse-cut.webp');
const CH_FACE = asset('images/mouse-face-cut.webp');
const CH_ATTIC = asset('images/attic-hero-cut.webp');
const JANI = '다락방의 자니';

/** 띠 동물의 한자(子·丑·寅 …) — 원국 표시용 */
function ttiiHan(chart) {
  const ko = chart.pillars.year.branchKo;
  const b = BRANCHES.find((x) => x.ko === ko);
  return b ? b.han : '';
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
}

function isUnlocked(productId) {
  return Boolean(state.data.unlocks[productId]);
}

function unlockedOrder(productId) {
  const id = state.data.unlocks[productId];
  return state.data.orders.find((o) => o.id === id) || null;
}

/* ────────────────────────────────────────────
   헤더 · 푸터
   ──────────────────────────────────────────── */
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
        <a class="btn btn--primary btn--sm" href="${hasProfile ? '#/free' : '#/#birth'}">${hasProfile ? '내 사주 다시 보기' : '무료로 시작'}</a>
      </div>
    </div>`;
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
      <div class="biz-info">
        ${rows}
      </div>
      <div class="footer__notice">
        ${esc(BUSINESS.serviceName)}은(는) 통신판매중개자가 아닌 통신판매업자로서, 결제는 전자지급결제대행사(${esc(BUSINESS.pgCompany)})를 통해 처리됩니다.
        유료 상품은 디지털 콘텐츠로, 리포트를 열기 전에는 100% 환불되며 열람을 개시한 후에는 환불이 제한됩니다.
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
  const p = profile || { calendar: 'solar', year: 1992, month: 10, day: 15, hour: 7, minute: 33, timeUnknown: false, gender: 'female', leap: false };
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
      <div class="birth-card__note">
        <span>가입 없음 · 결제 없음 · 30초</span>
        <span>입력값은 이 브라우저에만 저장됩니다</span>
      </div>
    </form>`;
}

function featureCards() {
  const items = [
    ['01', '내 원국 여덟 글자', '태어난 순간의 하늘을 여덟 글자로 옮깁니다. 년·월·일·시, 그리고 십성까지.'],
    ['02', '오행 온도계', '목·화·토·금·수 다섯 기운의 개수를 세어 내 사주의 온도를 숫자로 보여드려요.'],
    ['03', '띠 × 일주 동물', '띠와 일주 동물을 겹쳐 성격과 이성에게 어필되는 매력을 풀어냅니다.'],
    ['04', '자미두수 명궁', '같은 사주를 다른 각도에서 보는 지도. 명궁·부처궁·재백궁을 함께 읽어요.'],
  ];
  return `<div class="grid grid--4">${items
    .map(([i, t, d]) => `<div class="card"><div class="card__index">${i}</div><h3>${t}</h3><p>${d}</p></div>`)
    .join('')}</div>`;
}

function todayTeaserHTML() {
  if (!state.chart) {
    return `
      <div class="today-card">
        <div class="today-card__body">
          <div class="card__index">TODAY</div>
          <h3 style="margin-top:6px">오늘의 다락방 운세</h3>
          <p style="margin-top:6px;font-size:13px;color:var(--text-dim)">생년월일을 넣으면 오늘 하루의 문장이 열립니다. 매일 1회 무료이고, 같은 날에는 같은 문장이 나와요.</p>
          <div style="display:flex;gap:6px;margin-top:12px;flex-wrap:wrap">
            <span class="chip">오늘의 일진 · 생년월일 입력 후</span>
            <span class="chip">행운의 색 · 숫자</span>
            <span class="chip">좋은 시간</span>
          </div>
          <a class="btn btn--ghost btn--sm" href="#/#birth" style="margin-top:14px">생년월일 넣기 →</a>
        </div>
        <div class="today-card__mouse">
          <img src="${CH_MOUSE}" alt="${JANI}" />
          <span class="today-card__mouse-cap">${JANI}</span>
        </div>
      </div>`;
  }
  const f = todayFortune(state.chart);
  return `
    <div class="today-card">
      <div class="today-card__body">
        <div class="card__index">TODAY · ${esc(f.dateLabel)}</div>
        <h3 style="margin-top:6px">오늘의 다락방 운세</h3>
        <p style="margin-top:10px;font-size:14px;color:var(--text)">${esc(f.line)}</p>
        <p style="margin-top:6px;font-size:12.5px;color:var(--text-dim)">${esc(f.notes[0])}</p>
        <div style="display:flex;gap:6px;margin-top:13px;flex-wrap:wrap">
          <span class="chip chip--accent"><span class="dot"></span>오늘의 일진 ${esc(f.ganji)} · ${f.score}점</span>
          <span class="chip">행운의 색 ${esc(f.lucky.color)}</span>
          <span class="chip">행운의 숫자 ${f.lucky.number}</span>
          <span class="chip">좋은 시간 ${esc(f.lucky.time)}</span>
        </div>
      </div>
      <div class="today-card__mouse">
        <img src="${CH_MOUSE}" alt="${JANI}" />
        <span class="today-card__mouse-cap">${JANI}</span>
      </div>
    </div>`;
}

const BADGE_TONE = { '인기': 'rose', '추천': 'gold', 'NEW!': 'blue' };

function productCardHTML(p) {
  const z = zodiacOf(p.char);
  const tone = p.badge ? BADGE_TONE[p.badge] || 'gold' : null;
  return `
      <a class="pcard" href="#/product/${p.id}" aria-label="${esc(p.name)} ${p.beads}구슬 ${won(p.price)}">
        <div class="pcard__chips">
          ${p.badge ? `<span class="pcard__badge pcard__badge--${tone}">${esc(p.badge)}</span>` : '<span></span>'}
          <span class="pcard__beads">${p.beads}구슬</span>
        </div>
        <div class="pcard__medal">
          <img src="${zodiacImage(p.char)}" alt="${esc(zodiacLabel(z))} 캐릭터" />
        </div>
        <div class="pcard__name">${esc(p.name)}</div>
        <div class="pcard__hook">${p.hook.map((l) => esc(l)).join('<br />')}</div>
        <div class="pcard__foot">
          ${p.freeTag
            ? `<span class="pcard__free">${esc(p.freeTag)}</span>`
            : '<span class="pcard__free pcard__free--quiet">맛보기 무료</span>'}
          <span class="pcard__price">${won(p.price)}</span>
        </div>
      </a>`;
}

function productsHTML() {
  return `<div class="product-grid">
    ${PRODUCTS.map(productCardHTML).join('')}
  </div>`;
}

function faqHTML() {
  const items = [
    ['정말 990원인가요?', '네. 리포트 1건이 1구슬(990원)입니다. 5구슬은 4,900원, 10구슬은 9,900원이고, 평생 종합 리포트는 10구슬입니다. 무료 맛보기(원국·오행·띠·자미두수 명궁·오늘 운세)는 결제 없이 볼 수 있어요.'],
    ['가입해야 하나요? 회원가입이 없는데 결제 기록은 어떻게 남나요?', '가입이 없습니다. 생년월일시와 주문 기록은 이 브라우저에만 저장되고 서버로 전송되지 않아요. 그래서 브라우저 기록을 지우면 구슬 잔액과 주문 내역도 함께 사라집니다. 보관이 필요하면 결제 후 리포트를 PDF로 인쇄해 두세요.'],
    ['사주가 정확한가요?', '만세력은 입춘과 24절기 시각을 기준으로 계산하고, 시주는 진태양시(-30분)를 보정합니다. 1992년 10월 15일 07시 33분생은 임신·경술·갑자·무진으로 검증되어 있습니다. 음력 변환은 한국천문연구원 음양력 데이터를 사용합니다.'],
    ['풀이가 마음에 안 들면 환불되나요?', '리포트를 열기 전에는 결제일로부터 7일 이내 100% 환불됩니다. "리포트 열기"를 눌러 열람을 개시한 뒤에는 디지털 콘텐츠 특성상 환불이 제한됩니다(전자상거래법 제17조 제2항 제5호). 자세한 내용은 환불규정을 확인해 주세요.'],
    ['상대방 생년월일시가 없으면 궁합은 못 보나요?', '궁합은 상대방의 생년월일시가 필요합니다. 시간을 모르면 정오 기준으로 계산하며, 그 경우 시주와 자미두수 일부는 정확도가 떨어질 수 있다고 안내해 드립니다.'],
    ['사주 결과가 사람마다 왜 다른가요?', '같은 입력에는 항상 같은 결과가 나옵니다. 사람마다 여덟 글자가 다르고, 그 글자들의 관계(합·충·오행 개수)가 다르기 때문에 해석이 달라집니다.'],
  ];
  return `<div class="faq">${items
    .map(
      ([q, a], i) => `
      <div class="faq__item ${state.faqOpen === i ? 'is-open' : ''}">
        <button class="faq__q" data-action="faq" data-i="${i}"><span>${esc(q)}</span><span>+</span></button>
        <div class="faq__a">${esc(a)}</div>
      </div>`,
    )
    .join('')}</div>`;
}

function homeView() {
  const hasProfile = !!state.data.profile;
  const visitors = 1200 + (Math.floor(Date.now() / 86400000) % 380);
  return `
    <section class="hero">
      <div class="wrap hero__grid">
        <div>
          <div class="hero__eyebrow">
            <span class="chip chip--accent"><span class="dot"></span>가입 없이 30초</span>
            <span class="chip">만세력 · 자미두수 계산</span>
            <span class="chip">990원부터</span>
          </div>
          <h1>다락방 작은 불빛 아래,<br /><em>당신의 여덟 글자</em>를 읽어드릴게요</h1>
          <p class="hero__lead">
            생년월일시만 넣으면 원국 8글자와 오행 온도가 바로 열립니다.
            마음에 들면 990원에 전체 풀이를 한 번에. 가입도, 저장도 없습니다.
          </p>
          ${birthFormHTML(state.data.profile)}
        </div>
        <div class="hero__visual">
          <figure class="attic-figure">
            <img src="${CH_ATTIC}" alt="3층 다락방 — 별밤 아치 창가에서 책을 읽는 자니" />
            <figcaption class="attic-caption">다락방의 밤 · 별이 뜨는 창</figcaption>
          </figure>
          <span class="float-chip float-chip--a"><span class="dot"></span>오늘 <strong>${visitors.toLocaleString('ko-KR')}명</strong> 다녀감</span>
          <span class="float-chip float-chip--b">절기 기준 만세력 <strong>검증</strong></span>
          <span class="float-chip float-chip--c"><strong>990원</strong>부터 · 1구슬</span>
          <span class="hero__star hero__star--1" aria-hidden="true"></span>
          <span class="hero__star hero__star--2" aria-hidden="true"></span>
          <span class="hero__star hero__star--3" aria-hidden="true"></span>
        </div>
      </div>
    </section>

    <section class="section section--tight" id="how">
      <div class="wrap">
        <div class="section__head">
          <div>
            <div class="section__kicker">FREE PREVIEW</div>
            <h2>결제 없이 먼저 확인하세요</h2>
            <p class="section__desc">네 가지는 무료입니다. 생년월일시를 넣는 순간, 당신의 사주가 화면에 펼쳐집니다.</p>
          </div>
          ${hasProfile ? '<a class="btn btn--ghost btn--sm" href="#/free">내 무료 결과 보기</a>' : ''}
        </div>
        ${featureCards()}
      </div>
    </section>

    <section class="section section--tight">
      <div class="wrap">${todayTeaserHTML()}</div>
    </section>

    <section class="section" id="products">
      <div class="wrap">
        <div class="section__head">
          <div>
            <div class="section__kicker">990원 · 1구슬</div>
            <h2>다락방의 운세 열 가지</h2>
            <p class="section__desc">주제별로 골라 보세요. 모두 맛보기는 무료이고, 점수와 일부 풀이는 결제 없이 열립니다. 전체 풀이는 990원(1구슬), 평생 종합 리포트만 10구슬입니다.</p>
          </div>
        </div>
        ${productsHTML()}
      </div>
    </section>

    <section class="section">
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
          const color = OHAENG_META[x.label[0]] ? OHAENG_META[x.label[0]].hex : '#0e2f76';
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
      return renderJamiGrid(b);
    default:
      return '';
  }
}

const BRANCH_ORDER = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]; // 자 ~ 해

function renderJamiGrid(b) {
  const byBranch = [...b.palaces].sort((x, y) => BRANCH_ORDER.indexOf(x.branch) - BRANCH_ORDER.indexOf(y.branch));
  return `<div class="jami-grid">${byBranch
    .map((p) => {
      const stars = p.empty ? `<em>공궁</em> ${p.borrowed.join('·')}` : `${p.main.join('·')}${p.lucky.length ? ` <em>${p.lucky.slice(0, 2).join('·')}</em>` : ''}`;
      return `<div class="jami-cell ${p.isMyeong ? 'is-myeong' : ''} ${p.isSin ? 'is-sin' : ''} ${p.empty ? 'is-empty' : ''}">
        <div class="jami-cell__top"><span>${esc(p.name)}</span><span class="jami-cell__branch">${esc(p.branchKo)}</span></div>
        <div class="jami-cell__stars">${stars}</div>
      </div>`;
    })
    .join('')}</div>`;
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
      </div>
    </div>`;
}

/* ────────────────────────────────────────────
   무료 결과 화면
   ──────────────────────────────────────────── */
function mingTableHTML(chart) {
  const p = chart.pillars;
  const cells = [
    ['년주', p.year, chart.sipsung.year],
    ['월주', p.month, chart.sipsung.month],
    ['일주', p.day, chart.sipsung.hour === undefined ? '' : '나'],
    ['시주', p.hour, p.hour ? chart.sipsung.hour : ''],
  ];
  return `<div class="ming">${cells
    .map(
      ([label, pl, ss]) => `
      <div class="ming__cell ${label === '일주' ? 'ming__cell--day' : ''}">
        <div class="ming__label">${label}</div>
        <div class="ming__stem">${pl ? esc(pl.stemKo) : '—'}</div>
        <div class="ming__branch">${pl ? esc(pl.branchKo) : '—'}</div>
        <div class="ming__han">${pl ? esc(pl.han) : '시간 미상'}</div>
        ${pl ? `<div class="ming__ss">${label === '일주' ? '나 · 일간' : esc(ss || '')}</div><div class="ming__el">${esc(pl.stemOhaeng)} · ${esc(pl.branchOhaeng)}</div>` : ''}
      </div>`,
    )
    .join('')}</div>`;
}

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
  </div>`;
}

function resultView() {
  if (!state.chart) {
    return `<section class="result-page"><div class="wrap-narrow"><div class="sheet" style="text-align:center"><h2 class="sheet__title">아직 생년월일이 없어요</h2><p style="margin:12px 0 18px;color:var(--text-dim)">생년월일시를 넣으면 무료 맛보기가 바로 열립니다.</p><a class="btn btn--primary" href="#/#birth">생년월일 넣기</a></div></div></section>`;
  }
  const chart = state.chart;
  const jami = state.jami;
  const f = todayFortune(chart);
  const il = chart.iljuAnimal;
  const buStars = jami ? (jami.bucheoPalace.empty ? jami.bucheoPalace.borrowed : jami.bucheoPalace.main) : [];
  const zt = zodiacByAnimal(chart.dii);

  return `
    <section class="result-page">
      <div class="wrap">
        <div class="result-head">
          <div>
            <div class="result-head__meta">
              <span class="chip chip--accent">무료 맛보기</span>
              <span class="chip">${esc(formatBirthLabel(chart))}</span>
            </div>
            <h1>${esc(chart.dayMaster.ko)}일간 · ${esc(il)}</h1>
            <p>${esc(chart.summary)} — ${esc(chart.ohaeng.label)} ${chart.ohaeng.temp}°C 사주</p>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <a class="btn btn--quiet btn--sm" href="#/#birth">다시 입력</a>
            <button class="btn btn--quiet btn--sm" data-action="clear-all">기록 지우기</button>
            <button class="btn btn--primary btn--sm" data-action="open-pay" data-pid="lifetime">평생 종합 9,900원</button>
          </div>
        </div>

        <div class="sheet">
          <div class="sheet__head">
            <div>
              <div class="sheet__kicker">MYEONG · 원국</div>
              <div class="sheet__title">내 여덟 글자<small>${esc(chart.dii)}띠 × ${esc(il)} · ${esc(chart.hourLabel)}</small></div>
            </div>
            <div class="sheet__stamp">3층<br />다락방</div>
          </div>

          <div class="hero-mini">
            <div>
              ${mingTableHTML(chart)}
              <dl class="kv-grid">
                <div><dt>일간</dt><dd>${esc(chart.dayMaster.ko)}(${esc(chart.dayMaster.han)}) · ${esc(chart.dayMaster.ohaeng)}</dd></div>
                <div><dt>태어난 달의 절기</dt><dd>${esc(chart.monthTerm.ko)} 이후</dd></div>
                <div><dt>진태양시 보정</dt><dd>${chart.correctionMinutes}분 ${chart.yajasiApplied ? '· 야자시' : ''}</dd></div>
                <div><dt>음력</dt><dd>${chart.lunar ? `${chart.lunar.y}.${pad2(chart.lunar.m)}.${pad2(chart.lunar.d)}${chart.lunar.leap ? ' 윤달' : ''}` : '—'}</dd></div>
              </dl>
            </div>
            <div class="guide-card">
              <span class="guide-card__seal" title="띠 동물">${esc(ttiiHan(chart))}</span>
              <img class="guide-card__mouse" src="${zodiacImage(zt.key)}" alt="${esc(chart.dii)}띠 캐릭터" />
              <b>${esc(chart.dii)}띠${zt.name ? ` · ${esc(zt.name)}` : ''}</b>
              <span>12간지 ${zt.order}번째 · ${esc(zt.line)}<br />${esc(chart.hourLabel)}에 문을 연 원국</span>
            </div>
          </div>

          <h3>오행 온도 ${chart.ohaeng.temp}°C</h3>
          ${tempScaleHTML(chart)}
          ${ohaengBarsHTML(chart)}
          <p style="font-size:13px;color:var(--text-dim)">
            ${chart.ohaeng.missing.length ? `${chart.ohaeng.missing.join('·')}이 비어 있는 사주예요. 그 기운을 채워주는 사람·공간·습관이 당신의 약이 됩니다.` : '다섯 기운이 모두 있는 사주예요. 균형이 좋은 대신 강한 한 방향이 없어, 선택의 순간에 스스로 중심을 세워야 합니다.'}
            가장 강한 기운은 <b>${chart.ohaeng.strongest}</b>입니다.
          </p>

          <h3>오늘의 다락방 처방</h3>
          <dl class="kv-grid">
            <div><dt>오늘의 일진</dt><dd>${esc(f.ganji)} · ${f.score}점</dd></div>
            <div><dt>행운의 색</dt><dd>${esc(f.lucky.color)}</dd></div>
            <div><dt>행운의 숫자</dt><dd>${f.lucky.number}</dd></div>
            <div><dt>좋은 시간</dt><dd>${esc(f.lucky.time)}</dd></div>
          </dl>
          <p><b>${esc(f.line)}</b></p>
          <p style="font-size:13px">${esc(f.notes[0] || '')}</p>
        </div>

        ${
          jami
            ? `<div class="sheet">
          <div class="sheet__head">
            <div>
              <div class="sheet__kicker">ZIWEI · 자미두수</div>
              <div class="sheet__title">명궁 ${esc(jami.myeongBranch)} 자리<small>${esc(jami.myeongGanji)} · ${esc(jami.gukName)} · 신궁 ${esc(jami.sinBranch)}</small></div>
            </div>
            <div class="sheet__stamp">12궁<br />지도</div>
          </div>
          ${renderJamiGrid({ palaces: jami.palaces, myeong: jami.myeong, sin: jami.sin })}
          <dl class="kv-grid">
            <div><dt>명궁</dt><dd>${esc(jami.myeongPalace.main.join(' · ') || `${jami.myeongPalace.borrowed.join(' · ')} (빌려옴)`)}</dd></div>
            <div><dt>부처궁</dt><dd>${esc(jami.bucheoPalace.branchKo)} · ${esc(buStars.join(' · ') || '공궁')}</dd></div>
            <div><dt>재백궁</dt><dd>${esc(jami.jaebaekPalace.branchKo)} · ${esc((jami.jaebaekPalace.main.length ? jami.jaebaekPalace.main : jami.jaebaekPalace.borrowed).join(' · ') || '공궁')}</dd></div>
          </dl>
          <p style="font-size:13.5px;color:var(--text-dim)">${esc(jami.myeongPalace.main.length ? JAMI_LINE(jami.myeongPalace.main[0]) : '명궁이 비어 있는 사주는 주변의 기운을 받아 자기 색을 만드는 사람입니다.')}</p>
        </div>`
            : ''
        }

        <div class="upsell">
          ${PRODUCTS.filter((p) => p.id !== 'lifetime')
            .slice(0, 6)
            .map((p) => {
              const z = zodiacOf(p.char);
              return `<a class="upsell__card" href="#/product/${p.id}">
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

function productView(id) {
  const product = productById(id);
  if (!product) return `<section class="result-page"><div class="wrap-narrow"><div class="sheet">상품을 찾을 수 없습니다.</div></div></section>`;
  if (!state.chart) {
    return `<section class="result-page"><div class="wrap-narrow"><div class="sheet" style="text-align:center"><h2 class="sheet__title">먼저 내 생년월일시가 필요해요</h2><p style="margin:12px 0 18px;color:var(--text-dim)">30초면 끝납니다. ${esc(product.name)}는 내 원국 위에 올려 읽습니다.</p><a class="btn btn--primary" href="#/#birth">생년월일 넣기</a></div></div></section>`;
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

  const unlocked = isUnlocked(product.id);
  const order = unlockedOrder(product.id);
  const report = buildReport(product.id, state.chart, {
    jami: state.jami,
    partner: state.partnerChart,
    partnerJami: state.partnerJami,
    now: new Date(),
  });
  if (!report || report.needPartner) return '';

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
      <div class="wrap">
        <div class="result-head">
          <div>
            <div class="result-head__meta">
              <span class="chip chip--accent">${esc(product.name)}</span>
              <span class="chip">${esc(formatBirthLabel(state.chart))}</span>
              ${unlocked ? '<span class="chip chip--ok">✓ 열람 중</span>' : `<span class="chip">맛보기 공개 · ${product.beads}구슬</span>`}
            </div>
            <h1>${esc(report.title)}</h1>
            <p>${esc(report.subtitle)}</p>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <a class="btn btn--quiet btn--sm" href="#/free">무료 결과로</a>
            ${
              unlocked
                ? '<button class="btn btn--ghost btn--sm" data-action="print">리포트 인쇄 · PDF</button>'
                : `<button class="btn btn--primary btn--sm" data-action="open-pay" data-pid="${product.id}">${product.beads}구슬로 전체 열기</button>`
            }
          </div>
        </div>

        ${
          unlocked
            ? `<div class="sheet" style="padding:15px 20px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap">
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

        ${secHTML}

        <div class="report-actions">
          ${
            unlocked
              ? `<a class="btn btn--ghost" href="#/my">내 다락방에서 영수증 보기</a>`
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
                    .map(
                      (o) => `<div class="order-row">
                        <div><b>${esc(o.name)}</b><br /><span>${new Date(o.at).toLocaleString('ko-KR')} · ${esc(o.method)}</span></div>
                        <div style="text-align:right"><b>${won(o.amount)}</b><br /><span>${esc(o.txId)}</span></div>
                      </div>`,
                    )
                    .join('')
                : '<div class="empty-note">아직 주문이 없어요. 무료 맛보기부터 시작해 보세요.</div>'
            }
          </div>
        </div>
        <div class="sheet" style="margin-top:16px">
          <div class="sheet__head"><div><div class="sheet__kicker">NOTICE</div><div class="sheet__title">환불 · 문의</div></div></div>
          <p style="font-size:13px;color:var(--text-dim)">리포트를 열기 전에는 결제일로부터 7일 이내 100% 환불됩니다. 열람을 개시한 뒤에는 디지털 콘텐츠 특성상 환불이 제한됩니다. 환불 요청은 ${esc(BUSINESS.email || '고객센터 이메일')}로 주문번호와 함께 보내주세요.</p>
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
      subtitle: '1구슬 = 990원 · 리포트 1건',
      body: `
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
        <button class="btn btn--primary btn--block" data-action="buy-beads">${won((BEAD_PACKS.find((b) => b.id === state.modal.pack) || BEAD_PACKS[0]).price)} 결제하고 충전</button>
        <button class="btn btn--quiet btn--block" data-action="close-modal">다음에 할게요</button>`,
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
        body: `<p style="font-size:13px;color:var(--rose);line-height:1.8">${esc(state.payError || '결제가 취소되었습니다.')}</p>`,
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
            : '카드 정보는 결제대행사 페이지에서 입력합니다. 다락방은 카드번호를 저장하지 않습니다.'}</span>
        </div>
        ${
          useBeads
            ? `<button class="btn btn--ghost btn--block" data-action="pay-beads" style="margin-bottom:10px">보유 구슬 ${product.beads}개로 열기 (결제 없음)</button>
               <div style="text-align:center;font-size:11.5px;color:var(--text-mute);margin-bottom:12px">또는 카드로 결제</div>`
            : ''
        }
        <div class="pay-methods">
          ${PAY_METHODS.map(
            (m) => `<button class="pay-method ${state.payMethod === m.id ? 'is-on' : ''}" data-action="pay-method" data-method="${m.id}">
              <span class="pay-method__dot"></span><span>${esc(m.label)}</span>
            </button>`,
          ).join('')}
        </div>
        <div class="agree">
          <label class="agree__all"><input type="checkbox" data-action="agree-all" ${agreed ? 'checked' : ''} /> 전체 동의</label>
          <label><input type="checkbox" data-action="agree" data-key="terms" ${state.agree.terms ? 'checked' : ''} /> <span>[필수] 이용약관 동의</span></label>
          <label><input type="checkbox" data-action="agree" data-key="privacy" ${state.agree.privacy ? 'checked' : ''} /> <span>[필수] 개인정보 수집·이용 동의</span></label>
          <label><input type="checkbox" data-action="agree" data-key="refund" ${state.agree.refund ? 'checked' : ''} /> <span>[필수] 디지털 콘텐츠 환불규정 확인 <button type="button" data-action="legal" data-doc="refund">보기</button></span></label>
        </div>
`,
      foot: `<button class="btn btn--primary btn--block" data-action="submit-pay" ${agreed ? '' : 'disabled'}>${won(product.price)} 결제하기</button>
             <button class="btn btn--quiet btn--block" data-action="close-modal">취소</button>`,
    });
  }
}

function openModal(obj) {
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
  let res;
  try {
    res = await requestPayment({
      paymentId,
      orderName: product.name,
      amount: product.price,
      method: state.payMethod,
      buyer: {},
    });
  } catch (e) {
    res = { ok: false, error: e && e.message ? e.message : '결제 중 오류가 발생했습니다.' };
  }
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
  location.hash = '#/free';
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

document.addEventListener('submit', (e) => {
  const form = e.target.closest('form[data-form]');
  if (!form) return;
  e.preventDefault();
  if (form.dataset.form === 'birth') handleBirthSubmit(form);
  if (form.dataset.form === 'partner') handlePartnerSubmit(form);
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

  if (a === 'open-beads') {
    openModal({ type: 'beads', pack: 'bead-1' });
    return;
  }

  if (a === 'pick-pack') {
    state.modal.pack = t.dataset.pack;
    renderModal();
    return;
  }

  if (a === 'buy-beads') {
    const pack = BEAD_PACKS.find((b) => b.id === state.modal.pack) || BEAD_PACKS[0];
    // 구슬 충전도 같은 PG 어댑터를 탄다
    (async () => {
      state.payState = 'processing';
      const fakeProduct = { id: 'beads', name: `${pack.label} 충전`, price: pack.price, beads: 0 };
      state.modal = { type: 'pay', product: fakeProduct };
      state.payMethod = state.payMethod || 'card';
      renderModal();
      const res = await requestPayment({
        paymentId: newPaymentId('BDS'),
        orderName: `${pack.label} 충전`,
        amount: pack.price,
        method: state.payMethod,
      });
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
    state.payMethod = t.dataset.method;
    renderModal();
    return;
  }

  if (a === 'submit-pay') {
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
    closeModal();
    render();
    toast('기록을 모두 지웠어요.');
    return;
  }

  if (a === 'print') {
    window.print();
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
  if (path === '/my') return { name: 'my' };
  return { name: 'home', anchor: path.replace('/', '') };
}

function render() {
  syncCharts();
  $('#site-header').innerHTML = headerHTML();
  $('#site-footer').innerHTML = footerHTML();
  const r = route();
  const view = $('#view');
  if (r.name === 'product') view.innerHTML = productView(r.id);
  else if (r.name === 'free') view.innerHTML = resultView();
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

  if (state.justUnlocked && r.name === 'product' && r.id === state.justUnlocked) {
    setTimeout(() => { state.justUnlocked = null; }, 1400);
  } else if (r.name !== 'product') {
    state.justUnlocked = null;
  }
}

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

syncCharts();
render();
