// 리포트 카드 → PNG 이미지 저장
//   · 모바일(iOS Safari · Android Chrome): Web Share API 로 공유 시트를 열어 사진첩에 저장
//   · 데스크톱·미지원 브라우저: <a download> 로 PNG 파일 다운로드
//   · 공유가 막힌 환경(제스처 만료 등): 미리보기 모달에서 다시 저장할 수 있게 넘긴다
//
// html-to-image 를 번들에 넣어 쓴다 — CDN 을 쓰지 않으므로 CSP·CORS·오프라인에서도 그대로 동작한다.
// html-to-image 는 브라우저가 실제로 그린 결과를 SVG foreignObject 로 복제해 캡처하므로
// 자미두수 명반판(SVG·표·배지)·CSS 그라디언트·웹폰트가 화면 그대로 이미지에 담긴다.
import { toPng } from 'html-to-image';

export const SAVE_LABEL = '이미지 저장';
export const SAVING_LABEL = '저장 중...';

/** 캡처 카드 폭 — 모바일 카드와 같은 폭(390~430px)으로 맞춰 어디서 만들어도 같은 그림이 나온다 */
const CARD_WIDTH = 430;
/** 고해상도(scale 2) — 아이폰 Retina 에서도 글자가 뭉개지지 않는다 */
const PIXEL_RATIO = 2;
/** 캔버스 한 변 한계 (2배 기준 3900 CSS px) — iOS Safari 가 넘으면 빈 이미지를 낸다 */
const MAX_SIDE = 7800;
/** 캔버스 면적 한계 — iOS Safari 상한(약 16.7M px)보다 낮게 잡는다 */
const MAX_AREA = 15000000;
/** 한 장에 담는 최대 높이(CSS px) — 길면 카드 경계에서 여러 장으로 나눈다.
 *  핸드폰(iOS Safari·Android)은 캔버스 한계에 걸리지 않게 짧게, PC 는 한 장으로 길게 담는다. */
const MAX_PAGE_HEIGHT_MOBILE = 2400;
const MAX_PAGE_HEIGHT_DESKTOP = 3800;
const BACKGROUND = '#0b1020';
const HOST_ID = 'report-capture-host';

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
  root.removeAttribute('id');
  root.classList.add('capture-content');
  return root;
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

/** 2배로 키웠을 때 캔버스 한계를 넘지 않는 배율 */
export function safeRatio(width, height) {
  const bySide = Math.min(MAX_SIDE / Math.max(1, width), MAX_SIDE / Math.max(1, height));
  const byArea = Math.sqrt(MAX_AREA / Math.max(1, width * height));
  return Math.max(1, Math.min(PIXEL_RATIO, bySide, byArea));
}

export function fileNameFor(baseName, index, total) {
  const safe = String(baseName || '다락방 리포트')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
  return total > 1 ? `${safe}-${index + 1}.png` : `${safe}.png`;
}

/**
 * 리포트를 PNG dataURL 로 만든다.
 * 리포트가 길면 카드 경계에서 여러 장으로 나눈다 (카드가 중간에서 잘리지 않는다).
 * @returns {Promise<Array<{url:string,name:string,width:number,height:number,ratio:number}>>}
 */
export async function buildReportImages(reportRoot, baseName = '다락방 리포트') {
  if (!reportRoot) throw new Error('capture target missing');
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      /* 폰트 준비 실패는 무시 — 시스템 폰트로 그린다 */
    }
  }

  const host = captureHost();
  const pageLimit = isMobileBrowser() ? MAX_PAGE_HEIGHT_MOBILE : MAX_PAGE_HEIGHT_DESKTOP;
  const cards = [...stripSkipped(reportRoot.cloneNode(true)).children];
  if (!cards.length) throw new Error('capture target empty');

  const images = [];
  let index = 0;

  // 카드를 하나씩 얹어 보고, 한 장이 넘칠 때 직전 카드에서 끊는다
  while (index < cards.length) {
    const page = document.createElement('div');
    page.className = 'capture-page';
    host.innerHTML = '';
    host.appendChild(page);

    let taken = 0;
    while (index + taken < cards.length) {
      const node = cards[index + taken].cloneNode(true);
      page.appendChild(node);
      if (taken > 0 && page.offsetHeight > pageLimit) {
        page.removeChild(node);
        break;
      }
      taken += 1;
    }
    if (taken === 0) {
      // 한 카드가 한 장보다 커도 통째로 담는다 (넘치면 배율로 줄인다)
      page.appendChild(cards[index].cloneNode(true));
      taken = 1;
    }

    await waitForImages(page);
    void page.offsetHeight;

    const width = page.offsetWidth || CARD_WIDTH;
    const height = page.offsetHeight;
    const ratio = safeRatio(width, height);
    const url = await toPng(page, {
      pixelRatio: ratio,
      backgroundColor: BACKGROUND,
      width,
      height,
      cacheBust: true,
      filter: (node) => !isSkipped(node),
    });
    images.push({ url, name: '', width, height, ratio });
    index += taken;
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
export async function saveReportImages({ reportRoot, baseName, title }) {
  const images = await buildReportImages(reportRoot, baseName);
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

export const CAPTURE_LIMITS = { CARD_WIDTH, PIXEL_RATIO, MAX_SIDE, MAX_AREA, MAX_PAGE_HEIGHT_MOBILE, MAX_PAGE_HEIGHT_DESKTOP };
