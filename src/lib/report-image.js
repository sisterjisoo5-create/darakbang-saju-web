// 리포트 카드 → PNG 이미지 저장
//   · 모바일(iOS Safari · Android Chrome): Web Share API 로 공유 시트를 열어 사진첩에 저장
//   · 데스크톱·미지원 브라우저: <a download> 로 PNG 파일 다운로드
//   · 공유가 막힌 환경(제스처 만료 등): 미리보기 모달에서 다시 저장할 수 있게 넘긴다
//
// html-to-image 를 번들에 넣어 쓴다 — CDN 을 쓰지 않으므로 CSP·CORS·오프라인에서도 그대로 동작한다.
// html-to-image 는 브라우저가 실제로 그린 결과를 SVG foreignObject 로 복제해 캡처하므로
// 자미두수 명반판(SVG·표·배지)·CSS 그라디언트·웹폰트가 화면 그대로 이미지에 담긴다.
//
// 저장본은 "화면을 잘라낸 캡처"가 아니라 한 장 한 장이 완성된 결과지로 보이게 만든다(2026-11-22 시연 님 지시).
//   · 모든 장 위에 미니 헤더 — 리포트 제목 + 생년월일시
//   · 모든 장 아래에 브랜딩(사주보는 3층 다락방) + 페이지 번호(1 / 3)
//   · 쪽은 반드시 카드 경계에서 끊고, 여백·테두리를 넉넉하고 고르게 둔다
import { toPng } from 'html-to-image';

export const SAVE_LABEL = '이미지 저장';
/** 「이미지 저장」 옆 한 줄 — 저장해야 하는 이유(브라우저를 바꾸면 기록이 사라진다) */
export const SAVE_HINT = '저장해 두면 브라우저를 바꿔도 사라지지 않아요';
export const SAVING_LABEL = '저장 중…';
export const SHARE_SAVE_LABEL = '공유용 이미지 저장';
export const BRAND_NAME = '사주보는 3층 다락방';

/** 캡처 카드 폭 — 모바일 카드와 같은 폭(390~430px)으로 맞춰 어디서 만들어도 같은 그림이 나온다 */
const CARD_WIDTH = 430;
/** 고해상도(scale 2) — 아이폰 Retina 에서도 글자가 뭉개지지 않는다 */
const PIXEL_RATIO = 2;
/** 캔버스 한 변 한계 — 넘으면 iOS Safari 가 빈 이미지를 낸다.
 *  iOS 18 미만 4,096px · iOS 18 이상 8,192px 이므로 핸드폰은 4,000px 로 잡는다. */
const MAX_SIDE_MOBILE = 4000;
const MAX_SIDE_DESKTOP = 7800;
/** 캔버스 면적 한계 — iOS Safari 상한(약 16.7M px)보다 낮게 잡는다 */
const MAX_AREA = 15000000;
/** 한 장에 담는 최대 높이(CSS px) — 넘으면 카드 경계에서 다음 장으로 넘긴다.
 *  핸드폰(iOS Safari·Android)은 캔버스 한계에 걸리지 않게 짧게, PC 는 한 장으로 길게 담는다. */
const MAX_PAGE_HEIGHT_MOBILE = 1900;
const MAX_PAGE_HEIGHT_DESKTOP = 3800;
const BACKGROUND = '#0b1020';
const HOST_ID = 'report-capture-host';

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ESCAPES[c]);

function isMobileBrowser() {
  if (typeof navigator === 'undefined') return false;
  if (isIOS()) return true;
  return /Android/i.test(navigator.userAgent || '');
}

function isIOS() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ 는 데스크톱 UA 로 오지만 터치가 있다
  return /Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1;
}

function captureHost() {
  let host = document.getElementById(HOST_ID);
  if (!host) {
    host = document.createElement('div');
    host.id = HOST_ID;
    host.className = 'capture-host';
    host.setAttribute('aria-hidden', 'true');
    document.body.appendChild(host);
  }
  host.style.width = `${CARD_WIDTH}px`;
  return host;
}

/** 캡처에 넣지 않는 것 — 누르는 것들(버튼·링크·폼)과 영수증·조작 바 */
function isSkipped(el) {
  if (!el || el.nodeType !== 1) return false;
  if (el.hasAttribute('data-capture-skip')) return true;
  const tag = el.tagName;
  if (tag === 'BUTTON' || tag === 'FORM' || tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return true;
  if (tag === 'A' && el.classList.contains('btn')) return true;
  return false;
}

function stripSkipped(root) {
  root.querySelectorAll('[data-capture-skip]').forEach((n) => n.remove());
  root.querySelectorAll('button, form, input, select, textarea, a.btn').forEach((n) => n.remove());
  return root;
}

/** 캡처용 카드 하나 — 누르는 것들을 빼고, 화면 쪽 id 와 중복되지 않게 id 를 지운다 */
function prepareCard(node) {
  const card = stripSkipped(node.cloneNode(true));
  card.removeAttribute('id');
  card.removeAttribute('data-capture-card');
  card.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
  return card;
}

/** 페이지 안의 이미지가 모두 로드될 때까지 기다린다 (높이·그림이 어긋나지 않게) */
function waitForImages(page) {
  const pending = [...page.querySelectorAll('img')]
    .filter((img) => !img.complete)
    .map(
      (img) =>
        new Promise((resolve) => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
        }),
    );
  if (!pending.length) return Promise.resolve();
  // 이미지가 영영 오지 않아도 캡처는 진행한다
  return Promise.race([Promise.all(pending), new Promise((r) => setTimeout(r, 2500))]);
}

/**
 * 한 장을 PNG 로 굽는다.
 * Safari 는 (1) 캔버스가 한계를 넘으면 빈 값(`data:,`)을 돌려주고
 * (2) 첫 호출에서 일부만 그리는 일이 있어, 비어 있으면 배율을 낮춰 다시 굽는다.
 */
async function capturePage(page, { width, height, ratio }) {
  const shoot = (r) =>
    toPng(page, {
      pixelRatio: r,
      backgroundColor: BACKGROUND,
      width,
      height,
      cacheBust: true,
      filter: (node) => !isSkipped(node),
    });
  const blank = (url) => !url || url === 'data:,' || url.length < 5000;

  let r = ratio;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const url = await shoot(r);
    if (!blank(url)) return url;
    await new Promise((res) => setTimeout(res, 200));
    r = Math.max(1, Math.min(r, 1.6) * 0.8); // 한계를 넘었을 수 있으니 낮춰서 다시
  }
  throw new Error('capture failed');
}

/** 2배로 키웠을 때 캔버스 한계를 넘지 않는 배율 */
export function safeRatio(width, height, maxSide = MAX_SIDE_DESKTOP) {
  const bySide = Math.min(maxSide / Math.max(1, width), maxSide / Math.max(1, height));
  const byArea = Math.sqrt(MAX_AREA / Math.max(1, width * height));
  return Math.max(1, Math.min(PIXEL_RATIO, bySide, byArea));
}

/** 페이지 번호 — 여러 장일 때만 `1 / 2` 꼴로 적는다 (한 장짜리는 생략) */
export function pageNumberLabel(pageNo, total) {
  const n = Math.max(1, Math.trunc(Number(pageNo) || 1));
  const t = Math.max(0, Math.trunc(Number(total) || 0));
  return t > 1 ? `${n} / ${t}` : '';
}

export function fileNameFor(baseName, index, total) {
  const safe = String(baseName || '다락방 리포트')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
  return total > 1 ? `${safe}-${index + 1}.png` : `${safe}.png`;
}

/** 한 장의 뼈대 — 위 미니 헤더(제목·생년월일시) + 가운데 카드 + 아래 브랜딩·페이지 번호 */
function makePage({ title, meta, pageNo, total }) {
  const page = document.createElement('div');
  page.className = 'capture-page';

  const head = document.createElement('div');
  head.className = 'capture-page__head';
  head.innerHTML =
    `<div class="capture-page__title">${esc(title)}</div>` +
    (meta ? `<div class="capture-page__meta">${esc(meta)}</div>` : '');

  const body = document.createElement('div');
  body.className = 'capture-page__body';

  const foot = document.createElement('div');
  foot.className = 'capture-page__foot';
  const num = pageNumberLabel(pageNo, total);
  foot.innerHTML =
    `<span class="capture-page__brand">${esc(BRAND_NAME)}</span>` +
    (num ? `<span class="capture-page__num">${num}</span>` : '');

  page.append(head, body, foot);
  return { page, body };
}

/**
 * 리포트를 PNG dataURL 로 만든다.
 * 리포트가 길면 카드 경계에서 여러 장으로 나눈다 (카드가 중간에서 잘리지 않는다).
 * @param {Element} reportRoot 캡처할 리포트 영역
 * @param {string} baseName 파일 이름 앞부분
 * @param {{title?:string, meta?:string, cards?:Element[]}} [options]
 *   title — 모든 장 위 미니 헤더의 리포트 제목
 *   meta  — 미니 헤더 두 번째 줄(생년월일시)
 *   cards — 카드로 나눌 요소를 직접 지정 (무료 카드 한 장 공유용)
 * @returns {Promise<Array<{url:string,name:string,width:number,height:number,ratio:number}>>}
 */
export async function buildReportImages(reportRoot, baseName = '다락방 리포트', options = {}) {
  const explicit = Array.isArray(options.cards) ? options.cards.filter(Boolean) : [];
  if (!reportRoot && !explicit.length) throw new Error('capture target missing');
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      /* 폰트 준비 실패는 무시 — 시스템 폰트로 그린다 */
    }
  }

  const host = captureHost();
  const mobile = isMobileBrowser();
  const pageLimit = mobile ? MAX_PAGE_HEIGHT_MOBILE : MAX_PAGE_HEIGHT_DESKTOP;
  const maxSide = mobile ? MAX_SIDE_MOBILE : MAX_SIDE_DESKTOP;

  const title = String(options.title || '').trim();
  const meta = String(options.meta || '').trim();
  const cardNodes = explicit.length
    ? explicit.map(prepareCard)
    : [...stripSkipped(reportRoot.cloneNode(true)).children].map(prepareCard);
  if (!cardNodes.length) throw new Error('capture target empty');

  // 1단계 — 카드를 몇 장씩 담을지 정한다. 헤더·푸터·여백까지 포함한 높이로 잰다.
  const groups = [];
  const measure = makePage({ title, meta, pageNo: 9, total: 9 });
  host.innerHTML = '';
  host.appendChild(measure.page);
  let index = 0;
  while (index < cardNodes.length) {
    let taken = 0;
    while (index + taken < cardNodes.length) {
      measure.body.appendChild(cardNodes[index + taken].cloneNode(true));
      if (taken > 0 && measure.page.offsetHeight > pageLimit) {
        measure.body.removeChild(measure.body.lastChild);
        break;
      }
      taken += 1;
    }
    if (taken === 0) {
      // 한 카드가 한 장보다 커도 통째로 담는다 (반으로 잘리느니 배율을 낮춘다)
      measure.body.appendChild(cardNodes[index].cloneNode(true));
      taken = 1;
    }
    groups.push(cardNodes.slice(index, index + taken));
    index += taken;
    measure.body.innerHTML = '';
    void measure.page.offsetHeight;
  }
  host.innerHTML = '';

  // 2단계 — 정해진 묶음대로 한 장씩 굽는다 (페이지 번호는 전체 장수를 알고 난 뒤에 적는다)
  const images = [];
  for (let g = 0; g < groups.length; g += 1) {
    const { page, body } = makePage({ title, meta, pageNo: g + 1, total: groups.length });
    host.innerHTML = '';
    host.appendChild(page);
    groups[g].forEach((node) => body.appendChild(node.cloneNode(true)));

    await waitForImages(page);
    void page.offsetHeight;

    const width = page.offsetWidth || CARD_WIDTH;
    const height = page.offsetHeight;
    const ratio = safeRatio(width, height, maxSide);
    const url = await capturePage(page, { width, height, ratio });
    images.push({ url, name: '', width, height, ratio });
  }

  images.forEach((image, i) => {
    image.name = fileNameFor(baseName, i, images.length);
  });

  host.innerHTML = '';
  return images;
}

async function toFile(image) {
  const res = await fetch(image.url);
  const blob = await res.blob();
  if (typeof File === 'function') return new File([blob], image.name, { type: 'image/png' });
  blob.name = image.name;
  return blob;
}

/** dataURL 을 공유·저장에 쓰는 File 로 바꾼다 */
export async function imagesToFiles(images) {
  return Promise.all((images || []).map(toFile));
}

function canShareFiles(files) {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) return false;
  try {
    return navigator.canShare({ files });
  } catch {
    return false;
  }
}

/**
 * 공유 시트로 넘긴다.
 * @returns {Promise<'shared'|'canceled'|'blocked'|'unsupported'>}
 *   canceled  = 사용자가 공유를 닫았다 (오류 아님)
 *   blocked   = 제스처가 만료됐거나 브라우저가 막았다 (미리보기 모달에서 다시 시도)
 */
export async function shareFiles(files, title = '다락방 사주 리포트') {
  if (!files || !files.length) return 'unsupported';
  if (!canShareFiles(files)) return 'unsupported';
  try {
    await navigator.share({ files, title });
    return 'shared';
  } catch (err) {
    if (err && err.name === 'AbortError') return 'canceled';
    if (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) return 'blocked';
    return 'unsupported';
  }
}

/** 이미지 배열을 바로 공유 시트로 넘긴다 */
export async function shareImages(images, title = '다락방 사주 리포트') {
  if (!images || !images.length) return 'unsupported';
  return shareFiles(await imagesToFiles(images), title);
}

/** <a download> 로 PNG 파일을 내려받는다 (데스크톱 폴백) */
export function downloadImages(images) {
  images.forEach((image, i) => {
    setTimeout(() => {
      const a = document.createElement('a');
      a.href = image.url;
      a.download = image.name;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }, i * 350);
  });
}

/**
 * 이미지 저장 한 번에 — 만들고, 공유(모바일) 또는 다운로드(PC)로 넘긴다.
 * @returns {Promise<{mode:'shared'|'canceled'|'downloaded'|'preview', images:Array, count:number}>}
 */
export async function saveReportImages({ reportRoot, baseName, title, meta, cards }) {
  const images = await buildReportImages(reportRoot, baseName, { title, meta, cards });
  if (!images.length) throw new Error('nothing to capture');

  const share = await shareImages(images, title);
  if (share === 'shared') return { mode: 'shared', images, count: images.length };
  if (share === 'canceled') return { mode: 'canceled', images, count: images.length };
  if (share === 'blocked') return { mode: 'preview', images, count: images.length };

  // 공유를 지원하지 않는 환경 — iOS 에서는 <a download> 가 사진첩에 담기지 않으므로 미리보기를 연다
  if (isIOS()) return { mode: 'preview', images, count: images.length };
  downloadImages(images);
  return { mode: 'downloaded', images, count: images.length };
}

export const CAPTURE_LIMITS = { CARD_WIDTH, PIXEL_RATIO, MAX_SIDE_MOBILE, MAX_SIDE_DESKTOP, MAX_AREA, MAX_PAGE_HEIGHT_MOBILE, MAX_PAGE_HEIGHT_DESKTOP };
