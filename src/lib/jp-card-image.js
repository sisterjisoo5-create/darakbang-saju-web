// 屋根裏部屋 JP プレイグラウンド — 結果カード PNG（Canvas 2D · 1080×1350）
//
// 画面キャプチャではなく、結果の値だけからカードを一枚に描く。
//   · 濃紺の夜空 + クリームのカード + シャンパンゴールド — 韓国本陣と同じ「夜の屋根裏部屋」
//   · 日本語は端末のゴシック体で描く（Webフォントを増やさない）— ヒラギノ / Yu / Noto / IPA
//   · 下端に X: @3F_Zanie と「3階の屋根裏部屋の占い」を必ず入れる（スクショがそのまま宣伝になる）
//
// 文字切れ対策
//   · wrapLines は一文字ずつ測る（日本語は空白で折れない）
//   · 各ブロックは maxLines を決め、はみ出す分は「…」で止める。行の高さは固定。

const W = 1080;
const H = 1350;
const PAD = 56;
const PANEL = { x: PAD, y: 246, w: W - PAD * 2, h: 980 };
const FOOT_Y = 1290;

const NAVY_DEEP = '#0a1020';
const CREAM = '#f8f1e2';
const CREAM_DIM = '#e7dcc4';
const GOLD = '#e6c378';
const GOLD_SOFT = 'rgba(230, 195, 120, 0.42)';
const INK = '#1b2440';
const INK_SOFT = '#4a4f5f';
const MUTED = '#6b6250';
const ROSE = '#8a3b2c';

const JP_SANS = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "YuGothic", "Meiryo", "Noto Sans CJK JP", "Noto Sans JP", "IPAGothic", sans-serif';
const JP_SERIF = '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif CJK JP", "IPAMincho", "IPAPGothic", serif';

const KIND_META = {
  chemistry: {
    kicker: 'DARAKBANG · JP PLAYGROUND / 01',
    title: '推しとの相性診断',
    name: '推しとの相性',
  },
  otaku: {
    kicker: 'DARAKBANG · JP PLAYGROUND / 02',
    title: '推し活タイプ診断',
    name: '推し活タイプ',
  },
};

/* ────────────────────────────────────────────
   描画の道具
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
  ctx.font = `${weight} ${size}px ${serif ? JP_SERIF : JP_SANS}`;
}

export function wrapLines(ctx, text, maxWidth) {
  /* 行頭に来てはいけない文字 — 句読点・閉じ括弧は前の行にぶら下げる（日本語の禁則） */
  const NO_LINE_START = '。、，．,.」』）)！？!?…ーぁぃぅぇぉっゃゅょゎ';
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
        if (NO_LINE_START.includes(ch)) {
          line = next;
          continue;
        }
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

function text(ctx, str, x, y, opts = {}) {
  const {
    size = 28, serif = false, weight = 400, color = INK,
    maxWidth = W - PAD * 2 - 112, lineHeight = 1.55, maxLines = 99, align = 'left',
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

/** 一行だけに収まるよう文字を詰める（見出し用） */
function fitLine(ctx, str, maxWidth, size, { serif = false, weight = 400 } = {}) {
  let s = size;
  setFont(ctx, s, { serif, weight });
  while (ctx.measureText(str).width > maxWidth && s > 18) {
    s -= 2;
    setFont(ctx, s, { serif, weight });
  }
  return s;
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
  text(ctx, meta.kicker, PAD + 8, 66, {
    size: 20, color: 'rgba(230, 195, 120, 0.9)', maxWidth: W - 200,
  });
  const size = fitLine(ctx, meta.title, W - PAD * 2 - 16, 52, { serif: true });
  text(ctx, meta.title, PAD + 8, 102, {
    size, serif: true, color: CREAM, maxWidth: W - PAD * 2 - 16, lineHeight: 1.3, maxLines: 1,
  });
}

function drawFooter(ctx) {
  ctx.textAlign = 'center';
  setFont(ctx, 27, { weight: 600 });
  ctx.fillStyle = 'rgba(244, 220, 171, 0.95)';
  ctx.fillText('X: @3F_Zanie', W / 2, FOOT_Y - 52);
  setFont(ctx, 19);
  ctx.fillStyle = 'rgba(154, 160, 180, 0.8)';
  ctx.fillText('3階の屋根裏部屋の占い · 無料・エンタメ占い', W / 2, FOOT_Y - 10);
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
  ctx.strokeStyle = 'rgba(230, 195, 120, 0.2)';
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
  setFont(ctx, 54, { serif: true });
  ctx.fillStyle = INK;
  ctx.fillText(String(value), cx, cy + 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
}

/* ────────────────────────────────────────────
   01 推しとの相性診断
   ──────────────────────────────────────────── */

function drawChemistry(ctx, data) {
  drawCreamPanel(ctx);
  const x = PANEL.x + 56;
  const inner = PANEL.w - 112;
  const right = x + inner;

  text(ctx, '相性温度（100点満点）', x, PANEL.y + 44, { size: 21, color: MUTED, maxWidth: 300 });
  scoreRing(ctx, right - 96, PANEL.y + 118, 72, data.score ?? 0);

  pill(ctx, data.rarity || '上位41%のレア相性', x, PANEL.y + 92, { size: 20 });

  const nameSize = fitLine(ctx, `「${data.typeName || ''}」`, inner - 230, 46, { serif: true });
  text(ctx, `「${data.typeName || ''}」`, x, PANEL.y + 132, {
    size: nameSize, serif: true, color: INK, maxWidth: inner - 230, maxLines: 1,
  });
  text(ctx, `${data.oshiName || '推し'} × あなた`, x, PANEL.y + 200, {
    size: 26, color: INK_SOFT, maxWidth: inner - 230, maxLines: 1,
  });

  hairline(ctx, x, PANEL.y + 246, inner);

  /* 日支の関係 — 隠れ相性 */
  ctx.fillStyle = 'rgba(230, 195, 120, 0.18)';
  roundRect(ctx, x - 6, PANEL.y + 262, inner + 12, 92, 16);
  ctx.fill();
  text(ctx, `隠れ相性 · 日支${data.branchTag || ''}`, x + 20, PANEL.y + 278, { size: 19, color: '#8a7440', maxWidth: inner - 40 });
  text(ctx, data.branchLine || '', x + 20, PANEL.y + 306, {
    size: 22, color: INK, maxWidth: inner - 40, lineHeight: 1.45, maxLines: 1,
  });

  /* 3つのポイント */
  let y = PANEL.y + 382;
  for (const p of (data.points || []).slice(0, 3)) {
    text(ctx, p.label, x, y, { size: 18, color: '#8a7440', maxWidth: inner });
    text(ctx, p.short || p.value, x, y + 28, {
      size: 23, color: INK, maxWidth: inner, lineHeight: 1.5, maxLines: 2,
    });
    y += 112;
  }

  /* 気をつける距離感 */
  ctx.fillStyle = 'rgba(138, 59, 44, 0.08)';
  roundRect(ctx, x - 6, PANEL.y + 724, inner + 12, 124, 16);
  ctx.fill();
  text(ctx, '気をつける距離感', x + 20, PANEL.y + 740, { size: 18, color: ROSE, maxWidth: inner - 40 });
  text(ctx, data.caution || '', x + 20, PANEL.y + 768, {
    size: 22, color: INK_SOFT, maxWidth: inner - 40, lineHeight: 1.5, maxLines: 2,
  });

  text(ctx, data.advice || '', x, PANEL.y + 868, {
    size: 21, color: MUTED, maxWidth: inner, lineHeight: 1.5, maxLines: 2,
  });
}

/* ────────────────────────────────────────────
   02 推し活タイプ診断
   ──────────────────────────────────────────── */

function drawReceipt(ctx, data) {
  const x = PANEL.x + 56;
  const inner = PANEL.w - 112;
  const top = PANEL.y + 300;
  const h = 286;
  ctx.save();
  ctx.fillStyle = 'rgba(120, 88, 30, 0.06)';
  roundRect(ctx, x, top, inner, h, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120, 88, 30, 0.28)';
  ctx.lineWidth = 1.6;
  ctx.setLineDash([7, 6]);
  roundRect(ctx, x, top, inner, h, 10);
  ctx.stroke();
  ctx.setLineDash([]);

  const l = x + 26;
  const r = x + inner - 26;
  let y = top + 22;
  ctx.textBaseline = 'top';
  text(ctx, '屋根裏部屋ストア', l, y, { size: 20, weight: 700, color: INK, maxWidth: 400 });
  text(ctx, 'レジ #0315', r, y, { size: 18, color: MUTED, maxWidth: 220, align: 'right' });
  y += 36;
  ctx.strokeStyle = 'rgba(120, 88, 30, 0.22)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.moveTo(l, y);
  ctx.lineTo(r, y);
  ctx.stroke();
  ctx.setLineDash([]);

  y += 16;
  text(ctx, `日干 ${data.dayStem || ''}（${data.dayOhaeng || ''}）・日支 ${data.dayBranch || ''}`, l, y, { size: 20, color: INK_SOFT, maxWidth: inner - 52, maxLines: 1 });
  y += 38;
  text(ctx, `成分　${(data.elements || []).map((e) => `${e.label}${e.count}`).join('  ')}`, l, y, { size: 20, color: INK_SOFT, maxWidth: inner - 52, maxLines: 1 });
  y += 38;
  text(ctx, '推しへの熱量　∞（永久保存）', l, y, { size: 20, color: INK_SOFT, maxWidth: inner - 52, maxLines: 1 });
  y += 38;
  text(ctx, '財布の危険度', l, y, { size: 20, color: INK_SOFT, maxWidth: 300 });
  text(ctx, `${data.walletValue ?? 0}%・${data.walletLabel || ''}`, r, y, { size: 22, weight: 700, color: ROSE, maxWidth: 360, align: 'right' });
  y += 40;
  ctx.strokeStyle = 'rgba(120, 88, 30, 0.22)';
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.moveTo(l, y);
  ctx.lineTo(r, y);
  ctx.stroke();
  ctx.setLineDash([]);
  y += 14;
  text(ctx, `お会計　${data.code || ''}「${data.typeName || ''}」`, l, y, { size: 21, weight: 700, color: INK, maxWidth: inner - 52, maxLines: 1 });
  ctx.restore();
}

function drawOtaku(ctx, data) {
  drawCreamPanel(ctx);
  const x = PANEL.x + 56;
  const inner = PANEL.w - 112;

  text(ctx, 'TYPE CODE', x, PANEL.y + 44, { size: 19, color: '#8a7440', maxWidth: 400 });
  text(ctx, data.code || 'MQKH', x, PANEL.y + 70, {
    size: 96, serif: true, color: INK, maxWidth: inner, maxLines: 1,
  });
  text(ctx, data.typeName || '', x, PANEL.y + 184, {
    size: 40, serif: true, color: INK, maxWidth: inner, maxLines: 1,
  });
  text(ctx, data.catch || '', x, PANEL.y + 240, {
    size: 22, color: INK_SOFT, maxWidth: inner, lineHeight: 1.5, maxLines: 2,
  });

  drawReceipt(ctx, data);

  let y = PANEL.y + 618;
  text(ctx, '取扱説明書', x, y, { size: 19, color: '#8a7440', maxWidth: inner });
  y += 34;
  for (const line of (data.manual || []).slice(0, 3)) {
    text(ctx, line, x, y, { size: 21, color: INK, maxWidth: inner, lineHeight: 1.45, maxLines: 2 });
    y += 82;
  }

  text(ctx, data.friend || '', x, PANEL.y + 900, {
    size: 20, color: MUTED, maxWidth: inner, lineHeight: 1.45, maxLines: 2,
  });
}

/* ────────────────────────────────────────────
   カード生成
   ──────────────────────────────────────────── */

export const JP_IMAGE = { width: W, height: H };

/**
 * @param {'chemistry'|'otaku'} kind
 * @param {object} data 画面と同じ計算結果（画面用の値だけ）
 */
export function renderJpCard(kind, data = {}) {
  const meta = KIND_META[kind] || KIND_META.chemistry;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');

  drawNight(ctx, `${kind}${data.code || ''}${data.score || ''}${data.oshiName || ''}`);
  drawHeader(ctx, kind);
  if (kind === 'otaku') drawOtaku(ctx, data);
  else drawChemistry(ctx, data);
  drawFooter(ctx);

  return {
    url: canvas.toDataURL('image/png'),
    name: `屋根裏部屋 ${meta.name}${data.code ? ` ${data.code}` : data.score ? ` ${data.score}` : ''}.png`,
    title: `${meta.title} — 3階の屋根裏部屋の占い`,
    width: W,
    height: H,
  };
}
