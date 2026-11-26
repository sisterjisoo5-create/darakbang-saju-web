// 링크 미리보기(OG / X 카드) 썸네일 검증
// 실행: npm test
//
// 2026-11-26 — X·카카오톡에 주소를 붙였을 때 썸네일이 안 뜨던 문제를 고쳤다.
// 원인은 og:image 가 서브경로를 모르는 상대경로(/images/...)였던 것과 twitter:* 태그 누락.
// 다시 조용히 깨지지 않도록 다음을 고정한다.
//   ① og:image · og:url · twitter:image 는 GitHub Pages 절대 URL (base 경로 포함)
//   ② og:image:width/height 가 실제 파일 크기(1200×630)와 같다
//   ③ twitter:card 는 summary_large_image, 제목·설명·이미지가 모두 있다
//   ④ 썸네일 파일이 JPEG 이고 EXIF · ICC · C2PA 메타데이터가 0건이다

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const SITE = 'https://sisterjisoo5-create.github.io/darakbang-saju-web/';
const OG_IMAGE = `${SITE}images/og-cover.jpg`;

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const viteConfig = readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8');
const imagePath = new URL('../public/images/og-cover.jpg', import.meta.url);

/** <meta property="og:x" content="..."> / <meta name="twitter:x" content="..."> */
function meta(attr, key) {
  const re = new RegExp(`<meta\\s+${attr}="${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s+content="([^"]*)"`, 'i');
  const m = html.match(re);
  return m ? m[1] : null;
}

const og = (key) => meta('property', `og:${key}`);
const twitter = (key) => meta('name', `twitter:${key}`);

/** JPEG SOF 마커에서 실제 픽셀 크기 읽기 */
function jpegSize(buf) {
  let i = 2;
  while (i < buf.length - 1) {
    if (buf[i] !== 0xff) { i += 1; continue; }
    const marker = buf[i + 1];
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  return null;
}

test('og:image · og:url — GitHub Pages 절대 URL 이어야 한다', () => {
  assert.equal(og('url'), SITE, 'og:url 은 사이트 절대 주소');
  assert.equal(og('image'), OG_IMAGE, 'og:image 는 https 절대 URL 이어야 X·카카오가 읽는다');
  assert.match(og('image'), /^https:\/\/[^/]+\/darakbang-saju-web\/images\/og-cover\.jpg$/);
  assert.doesNotMatch(og('image'), /^\/(?!\/)/, '상대경로(/images/...)로 되돌리면 서브경로에서 404');
  assert.equal(og('image:type'), 'image/jpeg');
  assert.ok((og('image:alt') || '').length > 5, '이미지 대체 텍스트가 있어야 한다');
});

test('og:image:width · height — 실제 파일 크기와 같다', () => {
  assert.equal(og('image:width'), '1200');
  assert.equal(og('image:height'), '630');
});

test('twitter 카드 — summary_large_image 와 제목·설명·이미지', () => {
  assert.equal(twitter('card'), 'summary_large_image');
  assert.equal(twitter('title'), '사주보는 3층 다락방 — 990원 온라인 사주');
  assert.equal(
    twitter('description'),
    '무료로 내 원국 8글자와 오행 온도를 보고, 마음에 들면 990원에 전체 풀이를 열어보세요.',
  );
  assert.equal(twitter('image'), OG_IMAGE);
});

test('vite base 와 og 절대 URL 의 경로가 같다', () => {
  const base = viteConfig.match(/base:\s*'([^']+)'/)?.[1];
  assert.equal(base, '/darakbang-saju-web/', 'base 경로가 바뀌면 og:image 도 함께 바꿔야 한다');
  assert.ok(OG_IMAGE.includes(base), 'og:image 경로에 base 가 들어 있어야 한다');
});

test('썸네일 파일 — 1200×630 JPEG, 메타데이터 0건', () => {
  assert.ok(existsSync(imagePath), 'public/images/og-cover.jpg 가 있어야 한다');
  const buf = readFileSync(imagePath);
  assert.equal(buf[0], 0xff, 'JPEG 시그니처');
  assert.equal(buf[1], 0xd8, 'JPEG 시그니처');

  const size = jpegSize(buf);
  assert.deepEqual(size, { width: 1200, height: 630 }, 'X 대형 카드 규격 1.91:1');
  assert.equal(size.width / size.height, 1200 / 630);

  assert.ok(!buf.includes(Buffer.from('Exif')), 'EXIF 메타데이터가 없어야 한다');
  assert.ok(!buf.includes(Buffer.from('ICC_PROFILE')), 'ICC 프로파일이 없어야 한다');
  assert.ok(!buf.includes(Buffer.from('jumb')), 'C2PA(JUMBF) 메타데이터가 없어야 한다');
  assert.ok(!buf.includes(Buffer.from('c2pa')), 'C2PA 메타데이터가 없어야 한다');
  assert.ok(buf.length > 20 * 1024, '빈 이미지가 아니다');
});
