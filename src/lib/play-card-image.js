// 다락방 무료 놀이터 — 결과 카드 PNG (Canvas 2D)
//
// 화면을 캡처하지 않고, 결과 값만으로 1080×1350 카드를 캔버스에 직접 그린다.
//   · 다크 네이비 바탕 + 크림 카드 + 샴페인 골드 — 사이트와 같은 밤의 다락방 결
//   · 아래쪽에 @3f.zanie · 사주보는 3층 다락방 워터마크
//
// 왜 캡처(html-to-image)가 아니라 캔버스인가
//   · iOS 사파리는 '누른 순간'의 제스처 안에서만 공유 시트를 연다.
//     캔버스 그리기는 동기라서 그림 → 파일 → navigator.share 를 한 번의 클릭 안에서 끝낼 수 있다.
//   · 결과 카드는 길이가 제각각이라 화면 캡처로는 잘리기 쉽다 — 카드 한 장으로 고정해 그린다.

const W = 1080;
const H = 1350;
const PAD = 56;
const PANEL = { x: PAD, y: 246, w: W - PAD * 2, h: 980 };
const FOOT_Y = 1290;

const NAVY_DEEP = '#0a1020';
const NAVY = '#111b32';
const CREAM = '#f8f1e2';
const CREAM_DIM = '#e7dcc4';
const GOLD = '#e6c378';
const GOLD_SOFT = 'rgba(230, 195, 120, 0.42)';
const INK = '#1b2440';
const INK_SOFT = '#4a4f5f';
const MUTED = '#6b6250';
const ROSE = '#8a3b2c';

const SERIF = "'Darakbang Serif', 'Noto Serif KR', '나눔명조', serif";
const SANS = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, 'Apple SD Gothic Neo', sans-serif";

const KIND_META = {
  charm: { no: '01', label: 'CHARM · 매력살', title: '내 사주 매력살 뜯어보기', name: '매력살' },
  note: { no: '02', label: 'LETTER · 비밀 쪽지', title: '자니의 다락방 비밀 쪽지', name: '비밀 쪽지' },
  signal: { no: '03', label: 'SIGNAL · 찐심 판독', title: '일주 기반 찐심·밀당 판독기', name: '찐심 판독' },
  scenery: { no: '04', label: 'SCENERY · 풍경', title: '자니의 다락방 풍경 심리테스트', name: '풍경' },
};

/* ────────────────────────────────────────────
   그리기 도구
   ──────────────────────────────────────────── */

function roundRect(ctx, x, y, w, h, r) {
  const rr = Array.isArray(r) ? r : [r, r, r, r];
  const [tl, tr, br, bl] = rr;
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.arcTo(x + w, y, x + w, y + tr, tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
  ctx.lineTo(x + bl, y + h);
  ctx.arcTo(x, y + h, x, y + h - bl, bl);
  ctx.lineTo(x, y + tl);
  ctx.arcTo(x, y, x + tl, y, tl);
  ctx.closePath();
}

function setFont(ctx, size, { serif = false, weight = 400 } = {}) {
  ctx.font = `${weight} ${size}px ${serif ? SERIF : SANS}`;
}

/** 한 글자씩 재어 줄을 나눈다 (한글은 띄어쓰기만으로는 넘칠 수 있어서) */
export function wrapLines(ctx, text, maxWidth) {
  const out = [];
  const paragraphs = String(text == null ? '' : text).split('\n');
  for (const para of paragraphs) {
    if (!para) {
      out.push('');
      continue;
    }
    let line = '';
    for (const ch of para) {
      const next = line + ch;
      if (ctx.measureText(next).width > maxWidth && line) {
        out.push(line.replace(/\s+$/, ''));
        line = ch === ' ' ? '' : ch;
      } else {
        line = next;
      }
    }
    if (line) out.push(line.replace(/\s+$/, ''));
  }
  return out;
}

/**
 * 글을 그리고 다음 y 를 돌려준다. maxLines 를 넘으면 말줄임.
 */
function text(ctx, str, x, y, opts = {}) {
  const {
    size = 28, serif = false, weight = 400, color = INK,
    maxWidth = W - PAD * 2 - 96, lineHeight = 1.55, maxLines = 99, align = 'left',
  } = opts;
  setFont(ctx, size, { serif, weight });
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  let lines = wrapLines(ctx, str, maxWidth);
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\s+$/, '')}…`;
  }
  const lh = Math.round(size * lineHeight);
  lines.forEach((line, i) => ctx.fillText(line, x, y + i * lh));
  return y + lines.length * lh;
}

function hairline(ctx, x, y, w, color = 'rgba(120, 88, 30, 0.22)') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 7]);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();
  ctx.restore();
}

function starPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const angle = (-Math.PI / 2) + (i * Math.PI) / 4;
    const rad = i % 2 === 0 ? r : r * 0.34;
    const px = cx + Math.cos(angle) * rad;
    const py = cy + Math.sin(angle) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function seedRandom(seed) {
  let s = Math.abs(seed) || 7;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** 밤하늘 바탕 — 네이비 그라디언트 · 금빛 별 · 위아래 테두리 */
function drawNight(ctx, seedText) {
  const g = ctx.createLinearGradient(0, 0, W * 0.6, H);
  g.addColorStop(0, '#0b1224');
  g.addColorStop(0.55, NAVY_DEEP);
  g.addColorStop(1, '#0d172b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W * 0.82, 120, 0, W * 0.82, 120, 620);
  glow.addColorStop(0, 'rgba(230, 195, 120, 0.16)');
  glow.addColorStop(0.55, 'rgba(230, 195, 120, 0.05)');
  glow.addColorStop(1, 'rgba(230, 195, 120, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const rand = seedRandom(String(seedText).split('').reduce((a, c) => a + c.charCodeAt(0), 3));
  ctx.fillStyle = 'rgba(248, 241, 226, 0.62)';
  for (let i = 0; i < 46; i += 1) {
    const x = 40 + rand() * (W - 80);
    const y = 30 + rand() * 210;
    ctx.globalAlpha = 0.18 + rand() * 0.55;
    ctx.beginPath();
    ctx.arc(x, y, 0.9 + rand() * 1.7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(230, 195, 120, 0.75)';
  starPath(ctx, W - 168, 92, 14);
  ctx.fill();
  starPath(ctx, W - 96, 150, 8);
  ctx.fill();

  ctx.strokeStyle = GOLD_SOFT;
  ctx.lineWidth = 2;
  roundRect(ctx, 24, 24, W - 48, H - 48, 34);
  ctx.stroke();
}

function drawHeader(ctx, kind) {
  const meta = KIND_META[kind];
  text(ctx, `DARAKBANG · FREE PLAY ${meta.no}`, PAD + 8, 72, {
    size: 22, color: 'rgba(230, 195, 120, 0.9)', maxWidth: W - 200,
  });
  text(ctx, meta.title, PAD + 8, 108, {
    size: 52, serif: true, color: CREAM, maxWidth: W - 200, lineHeight: 1.3,
  });
}

function drawFooter(ctx) {
  ctx.textAlign = 'center';
  setFont(ctx, 26, { weight: 600 });
  ctx.fillStyle = 'rgba(244, 220, 171, 0.92)';
  ctx.fillText('@3f.zanie · 사주보는 3층 다락방', W / 2, FOOT_Y - 46);
  setFont(ctx, 19);
  ctx.fillStyle = 'rgba(154, 160, 180, 0.75)';
  ctx.fillText('무료 놀이터 · 재미로 보는 사주', W / 2, FOOT_Y - 8);
  ctx.textAlign = 'left';
}

function drawCreamPanel(ctx) {
  const g = ctx.createLinearGradient(PANEL.x, PANEL.y, PANEL.x + PANEL.w, PANEL.y + PANEL.h);
  g.addColorStop(0, '#fdf7ea');
  g.addColorStop(0.6, CREAM);
  g.addColorStop(1, CREAM_DIM);
  ctx.fillStyle = g;
  roundRect(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h, 28);
  ctx.fill();
  ctx.strokeStyle = 'rgba(230, 195, 120, 0.75)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(120, 88, 30, 0.18)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([7, 8]);
  roundRect(ctx, PANEL.x + 16, PANEL.y + 16, PANEL.w - 32, PANEL.h - 32, 20);
  ctx.stroke();
  ctx.setLineDash([]);
}

function pill(ctx, label, x, y, { bg = GOLD, fg = '#20180a', size = 21 } = {}) {
  setFont(ctx, size, { weight: 700 });
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(label).width + 30;
  ctx.fillStyle = bg;
  roundRect(ctx, x, y - size * 0.95, w, size * 1.9, size);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textAlign = 'left';
  ctx.fillText(label, x + 15, y + 1);
  ctx.textBaseline = 'top';
  return x + w;
}

function scoreRing(ctx, cx, cy, r, value, color = GOLD) {
  ctx.save();
  ctx.lineWidth = 14;
  ctx.strokeStyle = 'rgba(230, 195, 120, 0.18)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * Math.max(0, Math.min(100, value))) / 100);
  ctx.stroke();
  ctx.restore();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  setFont(ctx, 58, { serif: true });
  ctx.fillStyle = INK;
  ctx.fillText(String(value), cx, cy + 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
}

/* ────────────────────────────────────────────
   01 매력살
   ──────────────────────────────────────────── */

function drawCharm(ctx, data) {
  drawCreamPanel(ctx);
  const x = PANEL.x + 56;
  const inner = PANEL.w - 112;

  text(ctx, 'CHARM · 매력 온도', x, PANEL.y + 52, {
    size: 21, color: MUTED, maxWidth: inner,
  });
  scoreRing(ctx, x + 84, PANEL.y + 172, 66, data.score);
  text(ctx, `${data.scoreLabel}`, x + 186, PANEL.y + 118, {
    size: 52, serif: true, color: INK, maxWidth: inner - 186, lineHeight: 1.25, maxLines: 1,
  });
  text(ctx, data.appeal || '', x + 186, PANEL.y + 186, {
    size: 25, color: INK_SOFT, maxWidth: inner - 186, lineHeight: 1.5, maxLines: 2,
  });

  hairline(ctx, x, PANEL.y + 282, inner);

  const sals = data.sals || [];
  let y = PANEL.y + 314;
  for (const sal of sals.slice(0, 4)) {
    text(ctx, sal.name, x, y, { size: 34, serif: true, color: INK, maxWidth: inner - 150, maxLines: 1 });
    pill(ctx, sal.found ? '있음' : '없음', x + inner - 108, y + 8, {
      bg: sal.found ? GOLD : 'rgba(120, 88, 30, 0.1)',
      fg: sal.found ? '#20180a' : MUTED,
      size: 19,
    });
    text(ctx, sal.line, x, y + 48, { size: 24, color: sal.found ? INK_SOFT : '#8a8272', maxWidth: inner, lineHeight: 1.5, maxLines: 2 });
    y += 122;
  }

  ctx.fillStyle = 'rgba(230, 195, 120, 0.18)';
  roundRect(ctx, x - 8, PANEL.y + 786, inner + 16, 132, 18);
  ctx.fill();
  text(ctx, data.headline || '', x + 20, PANEL.y + 812, {
    size: 28, serif: true, color: INK, maxWidth: inner - 40, lineHeight: 1.6, maxLines: 3,
  });
}

/* ────────────────────────────────────────────
   02 비밀 쪽지
   ──────────────────────────────────────────── */

function drawNote(ctx, data) {
  drawCreamPanel(ctx);
  const x = PANEL.x + 58;
  const inner = PANEL.w - 116;

  text(ctx, '다락방 비밀 쪽지', x, PANEL.y + 54, { size: 24, serif: true, color: '#6f5a2c', maxWidth: inner - 220, maxLines: 1 });
  ctx.textAlign = 'right';
  text(ctx, data.shortDate || '', x + inner, PANEL.y + 60, { size: 21, color: MUTED, maxWidth: 220, align: 'right' });
  ctx.textAlign = 'left';

  text(ctx, data.nick ? `${data.nick}에게` : '오늘의 너에게', x, PANEL.y + 108, { size: 44, serif: true, color: INK, maxWidth: inner, maxLines: 1 });
  text(ctx, `다락방의 자니가 · 오늘의 일진 ${data.ganji || ''} · ${data.relationText || ''}`, x, PANEL.y + 168, {
    size: 22, color: MUTED, maxWidth: inner, lineHeight: 1.5, maxLines: 2,
  });

  hairline(ctx, x, PANEL.y + 232, inner);

  /* 행운의 색 */
  let y = PANEL.y + 264;
  text(ctx, '행운의 색', x, y, { size: 20, color: '#8a7440', maxWidth: inner });
  ctx.save();
  ctx.fillStyle = data.colorHex || GOLD;
  ctx.beginPath();
  ctx.arc(x + 18, y + 66, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(27, 36, 64, 0.16)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
  text(ctx, data.color || '', x + 48, y + 40, { size: 40, serif: true, color: INK, maxWidth: inner - 48, maxLines: 1 });
  text(ctx, data.colorReason || '', x, y + 100, { size: 23, color: INK_SOFT, maxWidth: inner, lineHeight: 1.5, maxLines: 2 });

  hairline(ctx, x, PANEL.y + 424, inner);

  /* 행운의 띠 */
  y = PANEL.y + 452;
  text(ctx, '행운의 띠', x, y, { size: 20, color: '#8a7440', maxWidth: inner });
  text(ctx, `${data.animal || ''}띠`, x, y + 36, { size: 40, serif: true, color: INK, maxWidth: inner, maxLines: 1 });
  text(ctx, data.animalLine || '', x, y + 98, { size: 23, color: INK_SOFT, maxWidth: inner, lineHeight: 1.5, maxLines: 2 });

  hairline(ctx, x, PANEL.y + 588, inner);

  /* 피해야 할 한 마디 */
  y = PANEL.y + 616;
  text(ctx, '피해야 할 한 마디', x, y, { size: 20, color: '#8a7440', maxWidth: inner });
  text(ctx, data.avoidPhrase || '', x, y + 38, { size: 38, serif: true, color: ROSE, maxWidth: inner, lineHeight: 1.45, maxLines: 2 });
  text(ctx, data.avoidWhy || '', x, y + 134, { size: 23, color: INK_SOFT, maxWidth: inner, lineHeight: 1.5, maxLines: 3 });

  /* 도장 — 화면과 같은 '자니 드림' */
  const sx = x + inner - 74;
  const sy = PANEL.y + PANEL.h - 150;
  ctx.save();
  ctx.strokeStyle = 'rgba(150, 60, 40, 0.45)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(sx, sy, 50, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(150, 60, 40, 0.72)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  setFont(ctx, 22, { serif: true });
  ctx.fillText('자니', sx, sy - 13);
  ctx.fillText('드림', sx, sy + 14);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.restore();
}

/* ────────────────────────────────────────────
   03 찐심 판독
   ──────────────────────────────────────────── */

function drawSignal(ctx, data) {
  drawCreamPanel(ctx);
  const x = PANEL.x + 56;
  const inner = PANEL.w - 112;
  const v = data.verdict || {};

  scoreRing(ctx, x + 104, PANEL.y + 170, 86, data.score);
  ctx.textAlign = 'center';
  text(ctx, '상대 마음 온도', x + 104, PANEL.y + 268, { size: 21, color: MUTED, maxWidth: 220, align: 'center' });
  ctx.textAlign = 'left';

  text(ctx, v.label || '', x + 232, PANEL.y + 78, { size: 62, serif: true, color: ROSE, maxWidth: inner - 232, maxLines: 1 });
  text(ctx, v.title || '', x + 232, PANEL.y + 156, {
    size: 30, serif: true, color: INK, maxWidth: inner - 232, lineHeight: 1.5, maxLines: 3,
  });
  text(ctx, v.body || '', x + 232, PANEL.y + 300, {
    size: 23, color: INK_SOFT, maxWidth: inner - 232, lineHeight: 1.55, maxLines: 4,
  });

  hairline(ctx, x, PANEL.y + 404, inner);

  ctx.fillStyle = 'rgba(230, 195, 120, 0.2)';
  roundRect(ctx, x - 6, PANEL.y + 434, inner + 12, 250, 20);
  ctx.fill();
  text(ctx, '자니 처방', x + 26, PANEL.y + 462, { size: 21, color: '#8a7440', maxWidth: inner - 52 });
  text(ctx, v.tip || '', x + 26, PANEL.y + 500, {
    size: 29, serif: true, color: INK, maxWidth: inner - 52, lineHeight: 1.62, maxLines: 3,
  });

  text(ctx, '더 깊은 상대 속마음 · 재회 시기 · 궁합은 990원 리포트에서', x, PANEL.y + 726, {
    size: 22, color: MUTED, maxWidth: inner, maxLines: 2,
  });
  if (data.partnerLabel) {
    text(ctx, `상대 ${data.partnerLabel}`, x, PANEL.y + 800, { size: 21, color: '#8a7440', maxWidth: inner, maxLines: 1 });
  }
}

/* ────────────────────────────────────────────
   04 풍경 — 스티커 선화
   ──────────────────────────────────────────── */

const STAGE = { x: PANEL.x + 52, y: PANEL.y + 46, w: PANEL.w - 104, h: 480 };

function stickerArt(ctx, key, cx, cy, size) {
  const s = size;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = GOLD;
  ctx.fillStyle = 'rgba(230, 195, 120, 0.1)';
  ctx.lineWidth = Math.max(2, s * 0.045);

  switch (key) {
    case 'house': {
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.5, cy - s * 0.12);
      ctx.lineTo(cx, cy - s * 0.5);
      ctx.lineTo(cx + s * 0.5, cy - s * 0.12);
      ctx.stroke();
      ctx.beginPath();
      ctx.rect(cx - s * 0.36, cy - s * 0.12, s * 0.72, s * 0.5);
      ctx.fill();
      ctx.stroke();
      ctx.strokeRect(cx - s * 0.1, cy + s * 0.12, s * 0.2, s * 0.26);
      break;
    }
    case 'tree': {
      ctx.beginPath();
      ctx.moveTo(cx, cy + s * 0.44);
      ctx.lineTo(cx, cy + s * 0.02);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy - s * 0.14, s * 0.26, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx - s * 0.22, cy + s * 0.02, s * 0.16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + s * 0.22, cy + s * 0.02, s * 0.17, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'person': {
      ctx.beginPath();
      ctx.arc(cx, cy - s * 0.32, s * 0.14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.18);
      ctx.lineTo(cx, cy + s * 0.1);
      ctx.moveTo(cx, cy - s * 0.06);
      ctx.lineTo(cx - s * 0.2, cy + s * 0.1);
      ctx.moveTo(cx, cy - s * 0.06);
      ctx.lineTo(cx + s * 0.2, cy + s * 0.1);
      ctx.moveTo(cx, cy + s * 0.1);
      ctx.lineTo(cx - s * 0.16, cy + s * 0.44);
      ctx.moveTo(cx, cy + s * 0.1);
      ctx.lineTo(cx + s * 0.16, cy + s * 0.44);
      ctx.stroke();
      break;
    }
    case 'jani': {
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(248, 241, 226, 0.92)';
      ctx.fill();
      ctx.lineWidth = Math.max(2.5, s * 0.05);
      ctx.stroke();
      ctx.fillStyle = '#1b2440';
      ctx.beginPath();
      ctx.arc(cx - s * 0.13, cy - s * 0.04, s * 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + s * 0.11, cy - s * 0.04, s * 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1b2440';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx - s * 0.01, cy + s * 0.08, s * 0.07, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      break;
    }
    case 'fence': {
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.5, cy - s * 0.08);
      ctx.lineTo(cx + s * 0.5, cy - s * 0.08);
      ctx.moveTo(cx - s * 0.5, cy + s * 0.22);
      ctx.lineTo(cx + s * 0.5, cy + s * 0.22);
      for (let i = -2; i <= 2; i += 1) {
        ctx.moveTo(cx + i * s * 0.2, cy - s * 0.3);
        ctx.lineTo(cx + i * s * 0.2, cy + s * 0.42);
      }
      ctx.stroke();
      break;
    }
    case 'sun': {
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      for (let i = 0; i < 8; i += 1) {
        const a = (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * s * 0.28, cy + Math.sin(a) * s * 0.28);
        ctx.lineTo(cx + Math.cos(a) * s * 0.4, cy + Math.sin(a) * s * 0.4);
        ctx.stroke();
      }
      break;
    }
    case 'moon': {
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.3, Math.PI * 0.35, Math.PI * 1.65, false);
      ctx.arc(cx + s * 0.14, cy, s * 0.26, Math.PI * 1.55, Math.PI * 0.45, true);
      ctx.closePath();
      ctx.fillStyle = 'rgba(230, 195, 120, 0.85)';
      ctx.fill();
      break;
    }
    case 'cloud': {
      ctx.beginPath();
      ctx.arc(cx - s * 0.22, cy + s * 0.02, s * 0.16, 0, Math.PI * 2);
      ctx.arc(cx, cy - s * 0.08, s * 0.2, 0, Math.PI * 2);
      ctx.arc(cx + s * 0.24, cy + s * 0.02, s * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'flower': {
      ctx.beginPath();
      ctx.moveTo(cx, cy + s * 0.46);
      ctx.lineTo(cx, cy + s * 0.04);
      ctx.strokeStyle = '#7BA88B';
      ctx.stroke();
      for (let i = 0; i < 5; i += 1) {
        const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * s * 0.17, cy - s * 0.06 + Math.sin(a) * s * 0.17, s * 0.12, 0, Math.PI * 2);
        ctx.strokeStyle = GOLD;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(cx, cy - s * 0.06, s * 0.07, 0, Math.PI * 2);
      ctx.fillStyle = GOLD;
      ctx.fill();
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

const SIZE_W = { big: 0.3, mid: 0.21, small: 0.13 };

function drawStage(ctx, items) {
  const g = ctx.createLinearGradient(STAGE.x, STAGE.y, STAGE.x, STAGE.y + STAGE.h);
  g.addColorStop(0, '#060b18');
  g.addColorStop(0.6, '#0b1428');
  g.addColorStop(1, '#101d33');
  ctx.fillStyle = g;
  roundRect(ctx, STAGE.x, STAGE.y, STAGE.w, STAGE.h, 22);
  ctx.fill();
  ctx.strokeStyle = 'rgba(230, 195, 120, 0.34)';
  ctx.lineWidth = 2;
  ctx.stroke();

  const rand = seedRandom(items.length * 17 + 5);
  ctx.fillStyle = 'rgba(248, 241, 226, 0.7)';
  for (let i = 0; i < 34; i += 1) {
    ctx.beginPath();
    ctx.arc(STAGE.x + 20 + rand() * (STAGE.w - 40), STAGE.y + 16 + rand() * (STAGE.h - 60), 1 + rand() * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  /* 바닥 */
  ctx.fillStyle = 'rgba(230, 195, 120, 0.07)';
  ctx.fillRect(STAGE.x, STAGE.y + STAGE.h * 0.76, STAGE.w, STAGE.h * 0.24);
  ctx.strokeStyle = 'rgba(230, 195, 120, 0.22)';
  ctx.setLineDash([7, 8]);
  ctx.beginPath();
  ctx.moveTo(STAGE.x, STAGE.y + STAGE.h * 0.76);
  ctx.lineTo(STAGE.x + STAGE.w, STAGE.y + STAGE.h * 0.76);
  ctx.stroke();
  ctx.setLineDash([]);

  const sorted = [...items].sort((a, b) => (a.size === b.size ? 0 : (SIZE_W[b.size] || 0) - (SIZE_W[a.size] || 0)));
  ctx.save();
  roundRect(ctx, STAGE.x, STAGE.y, STAGE.w, STAGE.h, 22);
  ctx.clip();
  for (const it of sorted) {
    const cx = STAGE.x + (Math.max(0, Math.min(100, it.x)) / 100) * STAGE.w;
    const cy = STAGE.y + (Math.max(0, Math.min(100, it.y)) / 100) * STAGE.h;
    /* 무대가 가로로 길어 크기는 높이에 맞춰 잡는다 — 화면(정사각)과 같은 비율로 보이게 */
    stickerArt(ctx, it.key, cx, cy, STAGE.h * (SIZE_W[it.size] || SIZE_W.mid));
  }
  ctx.restore();
}

function drawScenery(ctx, data) {
  drawCreamPanel(ctx);
  const x = PANEL.x + 52;
  const inner = PANEL.w - 104;

  drawStage(ctx, data.items || []);

  let y = STAGE.y + STAGE.h + 34;
  text(ctx, data.headline || '', x, y, { size: 32, serif: true, color: INK, maxWidth: inner, lineHeight: 1.45, maxLines: 2 });
  y += 88;
  text(ctx, `제일 큰 것 · ${(data.largest && data.largest.name) || ''} · 스티커 ${data.count || 0}개`, x, y, {
    size: 21, color: MUTED, maxWidth: inner, maxLines: 1,
  });

  /* 놓은 스티커를 한 목록에 — 3열로 접어 카드 안에 다 들어오게 */
  const list = (data.readings || []).slice(0, 9);
  const cols = 3;
  const colW = inner / cols;
  const baseY = y + 44;
  list.forEach((it, i) => {
    const col = i % cols;
    const line = Math.floor(i / cols);
    text(ctx, `${it.name} · ${it.role}`, x + col * colW, baseY + line * 58, {
      size: 19, color: INK, maxWidth: colW - 14, maxLines: 1,
    });
  });
}

/* ────────────────────────────────────────────
   카드 만들기
   ──────────────────────────────────────────── */

export const PLAY_IMAGE = { width: W, height: H };

/**
 * 결과 카드 한 장을 PNG dataURL 로 그린다 (동기).
 * @param {'charm'|'note'|'signal'|'scenery'} kind
 * @param {object} data 화면과 같은 계산 결과 값
 * @returns {{url:string,name:string,title:string,width:number,height:number}}
 */
export function renderPlayCard(kind, data = {}) {
  const meta = KIND_META[kind] || KIND_META.charm;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');

  drawNight(ctx, `${kind}${data.score || ''}${data.shortDate || ''}`);
  drawHeader(ctx, kind);
  if (kind === 'charm') drawCharm(ctx, data);
  else if (kind === 'note') drawNote(ctx, data);
  else if (kind === 'signal') drawSignal(ctx, data);
  else drawScenery(ctx, data);
  drawFooter(ctx);

  const stamp = data.shortDate ? String(data.shortDate).replace(/[^\d]/g, '').slice(0, 8) : '';
  return {
    url: canvas.toDataURL('image/png'),
    name: `다락방 ${meta.name}${stamp ? ` ${stamp}` : ''}.png`,
    title: `자니의 ${meta.name} — 사주보는 3층 다락방`,
    width: W,
    height: H,
  };
}

/** dataURL → 공유용 File (동기) */
export function playCardFile(card) {
  try {
    const bin = atob(String(card.url).split(',')[1] || '');
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'image/png' });
    if (typeof File === 'function') return new File([blob], card.name, { type: 'image/png' });
    blob.name = card.name;
    return blob;
  } catch (e) {
    return null;
  }
}

/** <a download> 로 바로 내려받기 */
export function downloadPlayCard(card) {
  const a = document.createElement('a');
  a.href = card.url;
  a.download = card.name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export { KIND_META as PLAY_KIND_META };
