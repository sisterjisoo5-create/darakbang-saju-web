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

import { asset } from '../config/asset.js';

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
  charm: {
    kicker: 'DARAKBANG · JP PLAYGROUND / 01',
    title: '私の魅力星（モテ殺）診断',
    name: '魅力星',
  },
  chemistry: {
    kicker: 'DARAKBANG · JP PLAYGROUND / 02',
    title: '推しとの相性診断',
    name: '推しとの相性',
  },
  otaku: {
    kicker: 'DARAKBANG · JP PLAYGROUND / 03',
    title: '推し活タイプ診断',
    name: '推し活タイプ',
  },
  'heavy-love': {
    kicker: 'DARAKBANG · JP PLAYGROUND / 04',
    title: '重め恋愛アニマル診断',
    name: '重め恋愛アニマル',
  },
  omikuji: {
    kicker: 'DARAKBANG · FREE ARCADE / 01',
    title: 'ジャニのおみくじ',
    name: 'おみくじ',
  },
  gacha: {
    kicker: 'DARAKBANG · FREE ARCADE / 02',
    title: '今日の推し活ガチャ',
    name: '推し活ガチャ',
  },
  tarot: {
    kicker: 'DARAKBANG · FREE ARCADE / 03',
    title: '今日の1分ジャニタロット',
    name: 'ジャニタロット',
  },
};

/* 十二支のキャラクター画像。カードを描く前に読み込んでおき、
   間に合わなければ漢字のメダルで描く（どちらでも 1080×1350 は崩れない）。 */
const ART_CACHE = new Map();

export function preloadZodiacArt(key) {
  if (!key || ART_CACHE.has(key)) return;
  ART_CACHE.set(key, null);
  try {
    const img = new Image();
    img.onload = () => ART_CACHE.set(key, img);
    img.onerror = () => ART_CACHE.set(key, null);
    img.src = asset(`images/zodiac/${key}-cut.webp`);
  } catch (e) {
    ART_CACHE.set(key, null);
  }
}

function readyArt(key) {
  const img = ART_CACHE.get(key);
  return img && img.complete && img.naturalWidth > 0 ? img : null;
}

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
   01 魅力星（モテ殺）診断
   ──────────────────────────────────────────── */

function drawCharm(ctx, data) {
  drawCreamPanel(ctx);
  const x = PANEL.x + 56;
  const inner = PANEL.w - 112;
  const right = x + inner;

  text(ctx, '魅力温度（100点満点）', x, PANEL.y + 44, { size: 21, color: MUTED, maxWidth: 320 });
  scoreRing(ctx, right - 96, PANEL.y + 118, 72, data.score ?? 0);

  pill(ctx, `魅力星 ${data.count ?? 0}個`, x, PANEL.y + 92, { size: 20 });

  const name = `「${data.typeName || '星の名札なし'}」`;
  const nameSize = fitLine(ctx, name, inner - 230, 46, { serif: true });
  text(ctx, name, x, PANEL.y + 132, {
    size: nameSize, serif: true, color: INK, maxWidth: inner - 230, maxLines: 1,
  });
  text(ctx, `${data.scoreLabel || ''} ／ ${data.birth || ''} 生まれ`, x, PANEL.y + 200, {
    size: 25, color: INK_SOFT, maxWidth: inner - 230, maxLines: 1,
  });

  hairline(ctx, x, PANEL.y + 246, inner);

  /* 星は最大4つ — 見つかった星から先に並べる */
  let y = PANEL.y + 272;
  for (const it of (data.items || []).slice(0, 4)) {
    text(ctx, `${it.name || ''}（${it.han || ''}）`, x, y, {
      size: 25, weight: 700, color: it.found ? INK : MUTED, maxWidth: inner - 120, maxLines: 1,
    });
    ctx.fillStyle = it.found ? 'rgba(230, 195, 120, 0.85)' : 'rgba(120, 88, 30, 0.12)';
    roundRect(ctx, right - 84, y - 6, 84, 38, 19);
    ctx.fill();
    text(ctx, it.found ? 'あり' : 'なし', right - 42, y + 1, {
      size: 19, weight: 700, color: it.found ? '#20180a' : MUTED, align: 'center', maxWidth: 76,
    });
    text(ctx, it.line || '', x, y + 38, {
      size: 20, color: it.found ? INK_SOFT : MUTED, maxWidth: inner, lineHeight: 1.45, maxLines: 2,
    });
    y += 122;
  }

  text(ctx, data.headline || '', x, PANEL.y + 792, {
    size: 21, color: MUTED, maxWidth: inner, lineHeight: 1.5, maxLines: 3,
  });

  hairline(ctx, x, PANEL.y + 902, inner, 'rgba(120, 88, 30, 0.16)');
  text(ctx, data.timeNote || '三柱（生まれた時間なし）で読みました', x, PANEL.y + 920, {
    size: 17, color: MUTED, maxWidth: inner, maxLines: 1,
  });
}

/* ────────────────────────────────────────────
   02 推しとの相性診断
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
   03 推し活タイプ診断
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
   04 重め恋愛アニマル診断
   ──────────────────────────────────────────── */

/** クリームの丸メダル — 中に十二支の絵、無ければ漢字 */
function animalMedal(ctx, cx, cy, r, { img, han } = {}) {
  const g = ctx.createRadialGradient(cx, cy - r * 0.35, r * 0.2, cx, cy, r);
  g.addColorStop(0, '#fdf7ea');
  g.addColorStop(0.62, '#f2e9d5');
  g.addColorStop(1, '#e2d4b6');
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(230, 195, 120, 0.85)';
  ctx.lineWidth = 2.4;
  ctx.stroke();

  const art = readyArt(img);
  if (art) {
    const d = r * 1.62;
    ctx.drawImage(art, cx - d / 2, cy - d / 2, d, d);
  } else {
    setFont(ctx, Math.round(r * 0.86), { serif: true });
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(han || '', cx, cy + 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
  }
}

function drawHeavyLove(ctx, data) {
  drawCreamPanel(ctx);
  const x = PANEL.x + 56;
  const inner = PANEL.w - 112;
  const right = x + inner;
  const y0 = PANEL.y;

  /* 上段 — 愛の重さと、動物のメダル＋タイプ名 */
  text(ctx, '愛の重さ（100%満タン）', x, y0 + 40, { size: 20, color: MUTED, maxWidth: 380 });
  scoreRing(ctx, right - 92, y0 + 108, 68, data.weight || 0);

  animalMedal(ctx, x + 78, y0 + 172, 76, { img: data.img, han: data.han });

  text(ctx, `${data.yearJa || ''}のあなた`, x + 178, y0 + 96, { size: 20, color: MUTED, maxWidth: inner - 300, maxLines: 1 });
  const nameSize = fitLine(ctx, data.typeName || '', inner - 200, 42, { serif: true, weight: 600 });
  text(ctx, data.typeName || '', x + 178, y0 + 124, {
    size: nameSize, serif: true, weight: 600, color: INK, maxWidth: inner - 200, maxLines: 1,
  });
  text(ctx, data.catch || '', x + 178, y0 + 186, {
    size: 21, color: INK_SOFT, maxWidth: inner - 200, lineHeight: 1.5, maxLines: 2,
  });

  /* 重さのバー */
  const barY = y0 + 296;
  ctx.fillStyle = 'rgba(120, 88, 30, 0.14)';
  roundRect(ctx, x, barY, inner, 12, 6);
  ctx.fill();
  const fillW = Math.max(18, (inner * Math.max(0, Math.min(100, data.weight || 0))) / 100);
  const bg = ctx.createLinearGradient(x, barY, x + fillW, barY);
  bg.addColorStop(0, '#c9a961');
  bg.addColorStop(0.65, '#e2775c');
  bg.addColorStop(1, '#d1503a');
  ctx.fillStyle = bg;
  roundRect(ctx, x, barY, fillW, 12, 6);
  ctx.fill();
  text(ctx, `${data.weight || 0}%・${data.level || ''}`, x, barY + 24, { size: 20, color: ROSE, weight: 700, maxWidth: inner, maxLines: 1 });

  /* 表と裏 */
  const gapY = y0 + 376;
  ctx.fillStyle = 'rgba(230, 195, 120, 0.18)';
  roundRect(ctx, x - 6, gapY, inner + 12, 134, 16);
  ctx.fill();
  const px1 = pill(ctx, `表 ${data.surface || ''}`, x + 16, gapY + 36, { size: 20, bg: '#f1dfb4', fg: '#3a2c10' });
  pill(ctx, `裏 ${data.innerWord || ''}${data.innerAnimal || ''}`, px1 + 10, gapY + 36, { size: 20, bg: 'rgba(138, 59, 44, 0.16)', fg: ROSE });
  text(ctx, data.gapShort || '', x + 16, gapY + 70, {
    size: 23, color: INK, maxWidth: inner - 32, lineHeight: 1.55, maxLines: 2,
  });

  /* 重めの癖 — 行数に合わせて下のブロックを積む（癖が2つの日は少し下から） */
  let y = y0 + 512 + Math.max(0, 3 - (data.habits || []).length) * 34;
  text(ctx, '重めの癖', x, y, { size: 19, color: '#8a7440', maxWidth: inner });
  y += 30;
  for (const line of (data.habits || []).slice(0, 3)) {
    y = text(ctx, line, x, y, { size: 21, color: INK, maxWidth: inner, lineHeight: 1.45, maxLines: 1 }) + 12;
  }

  /* 相性 */
  hairline(ctx, x, y + 4, inner);
  y += 26;
  text(ctx, '相性のいい動物', x, y, { size: 19, color: '#8a7440', maxWidth: inner });
  y += 30;
  text(ctx, data.matchBest || '', x, y, { size: 24, color: INK, weight: 600, maxWidth: inner, maxLines: 1 });
  y += 34;
  text(ctx, data.matchWatch || '', x, y, { size: 19, color: MUTED, maxWidth: inner, maxLines: 1 });

  /* 沼るところ・トリセツ */
  y += 34;
  text(ctx, 'ここが沼る', x, y, { size: 18, color: '#8a7440', maxWidth: inner });
  y += 26;
  text(ctx, data.charm || '', x, y, { size: 20, color: INK_SOFT, maxWidth: inner, lineHeight: 1.45, maxLines: 1 });
  y += 32;
  text(ctx, '重さのトリセツ', x, y, { size: 18, color: '#8a7440', maxWidth: inner });
  y += 26;
  text(ctx, data.care || '', x, y, { size: 20, color: INK_SOFT, maxWidth: inner, lineHeight: 1.45, maxLines: 1 });
}

/* ────────────────────────────────────────────
   無料アーケード — おみくじ・ガチャ・タロット
   Ａ) 神籤。位を大きく、4つの運とラッキーものを一枚に
   ──────────────────────────────────────────── */

function drawFortuneRows(ctx, fortunes, x, y, inner, rowH = 92) {
  let cy = y;
  (fortunes || []).forEach((f, i) => {
    text(ctx, f.label || '', x, cy, { size: 20, color: MUTED, maxWidth: 260, maxLines: 1 });
    text(ctx, f.starsText || '', x + inner, cy - 2, {
      size: 24, color: '#b58a35', maxWidth: 220, maxLines: 1, align: 'right',
    });
    cy = text(ctx, f.line || '', x, cy + 28, { size: 21, color: INK, maxWidth: inner, lineHeight: 1.45, maxLines: 2 }) + 10;
    cy = Math.max(cy, y + rowH * (i + 1));
  });
  return cy;
}

function drawOmikuji(ctx, data) {
  drawCreamPanel(ctx);
  const x = PANEL.x + 56;
  const inner = PANEL.w - 112;
  const cx = PANEL.x + PANEL.w / 2;

  text(ctx, `${data.dateLabel || ''} の運勢`, cx, PANEL.y + 34, {
    size: 21, color: MUTED, maxWidth: inner, maxLines: 1, align: 'center',
  });
  text(ctx, data.rank || '吉', cx, PANEL.y + 66, {
    size: 104, serif: true, weight: 600, color: INK, maxWidth: inner, maxLines: 1, align: 'center',
  });
  text(ctx, data.rankRead || '', cx, PANEL.y + 190, {
    size: 20, color: MUTED, maxWidth: inner, maxLines: 1, align: 'center',
  });
  text(ctx, data.rankLine || '', cx, PANEL.y + 224, {
    size: 22, color: INK_SOFT, maxWidth: inner - 40, lineHeight: 1.5, maxLines: 2, align: 'center',
  });

  hairline(ctx, x, PANEL.y + 308, inner);

  drawFortuneRows(ctx, data.fortunes, x, PANEL.y + 330, inner, 92);

  /* ラッキーカラーとアイテム */
  const luckyY = PANEL.y + 720;
  ctx.fillStyle = 'rgba(230, 195, 120, 0.16)';
  roundRect(ctx, x - 8, luckyY, inner + 16, 150, 16);
  ctx.fill();

  const col = data.luckyColor || {};
  ctx.beginPath();
  ctx.arc(x + 26, luckyY + 40, 17, 0, Math.PI * 2);
  ctx.fillStyle = col.hex || GOLD;
  ctx.fill();
  ctx.strokeStyle = 'rgba(27, 36, 64, 0.28)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  text(ctx, 'ラッキーカラー', x + 56, luckyY + 24, { size: 18, color: MUTED, maxWidth: 240, maxLines: 1 });
  text(ctx, col.name || '', x + 210, luckyY + 20, { size: 24, serif: true, weight: 600, color: INK, maxWidth: inner - 230, maxLines: 1 });
  text(ctx, col.line || '', x + 56, luckyY + 58, { size: 19, color: INK_SOFT, maxWidth: inner - 80, lineHeight: 1.4, maxLines: 1 });

  const item = data.luckyItem || {};
  text(ctx, 'ラッキーアイテム', x + 24, luckyY + 98, { size: 18, color: MUTED, maxWidth: 240, maxLines: 1 });
  text(ctx, item.name || '', x + 210, luckyY + 94, { size: 23, serif: true, weight: 600, color: INK, maxWidth: inner - 230, maxLines: 1 });
  text(ctx, item.line || '', x + 56, luckyY + 126, { size: 18, color: INK_SOFT, maxWidth: inner - 80, lineHeight: 1.4, maxLines: 1 });

  text(ctx, '今日のひとこと', x, PANEL.y + 902, { size: 18, color: '#8a7440', maxWidth: inner, maxLines: 1 });
  text(ctx, data.advice || '', x, PANEL.y + 928, { size: 21, color: INK, maxWidth: inner, lineHeight: 1.45, maxLines: 2 });
}

/* B) ガチャ。レア度を大きく、ごほうびと3つの運 */
function drawGacha(ctx, data) {
  drawCreamPanel(ctx);
  const x = PANEL.x + 56;
  const inner = PANEL.w - 112;
  const cx = PANEL.x + PANEL.w / 2;
  const grade = data.grade || {};
  const tone = grade.key === 'ssr' ? '#b58a35' : grade.key === 'sr' ? '#8a5b86' : '#5b6f8c';

  text(ctx, `${data.dateLabel || ''} · 今日の結果`, cx, PANEL.y + 34, {
    size: 21, color: MUTED, maxWidth: inner, maxLines: 1, align: 'center',
  });

  /* レア度の後光 */
  const glow = ctx.createRadialGradient(cx, PANEL.y + 190, 10, cx, PANEL.y + 190, 300);
  glow.addColorStop(0, grade.key === 'ssr' ? 'rgba(230, 195, 120, 0.55)' : 'rgba(230, 195, 120, 0.22)');
  glow.addColorStop(1, 'rgba(230, 195, 120, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(PANEL.x, PANEL.y + 60, PANEL.w, 320);

  text(ctx, grade.label || 'R', cx, PANEL.y + 70, {
    size: 132, serif: true, weight: 700, color: tone, maxWidth: inner, maxLines: 1, align: 'center',
  });
  text(ctx, grade.starsText || '★★★☆☆', cx, PANEL.y + 216, {
    size: 30, color: '#b58a35', maxWidth: inner, maxLines: 1, align: 'center',
  });
  text(ctx, `「${grade.name || ''}」`, cx, PANEL.y + 258, {
    size: 42, serif: true, weight: 600, color: INK, maxWidth: inner, maxLines: 1, align: 'center',
  });
  text(ctx, grade.line || '', cx, PANEL.y + 316, {
    size: 21, color: INK_SOFT, maxWidth: inner - 40, lineHeight: 1.5, maxLines: 2, align: 'center',
  });

  /* ごほうび */
  const prizeY = PANEL.y + 400;
  ctx.fillStyle = 'rgba(230, 195, 120, 0.2)';
  roundRect(ctx, x - 8, prizeY, inner + 16, 92, 14);
  ctx.fill();
  text(ctx, 'ごほうび', x + 24, prizeY + 16, { size: 18, color: MUTED, maxWidth: 220, maxLines: 1 });
  text(ctx, data.prize || '', x + 24, prizeY + 44, { size: 26, serif: true, weight: 600, color: INK, maxWidth: inner - 48, maxLines: 1 });

  hairline(ctx, x, PANEL.y + 520, inner);
  drawFortuneRows(ctx, data.fortunes, x, PANEL.y + 542, inner, 92);

  text(ctx, '今日の推し活アクション', x, PANEL.y + 848, { size: 18, color: '#8a7440', maxWidth: inner, maxLines: 1 });
  text(ctx, data.action || '', x, PANEL.y + 874, { size: 22, color: INK, lineHeight: 1.45, maxWidth: inner, maxLines: 2 });
  text(ctx, '排出率 SSR 6% / SR 24% / R 70%', x, PANEL.y + 946, { size: 17, color: MUTED, maxWidth: inner, maxLines: 1 });
}

/* C) タロット。伏せたカードを一枚めくった絵 */
function drawTarot(ctx, data) {
  drawCreamPanel(ctx);
  const x = PANEL.x + 56;
  const inner = PANEL.w - 112;
  const cx = PANEL.x + PANEL.w / 2;
  const card = data.card || {};

  text(ctx, `${data.dateLabel || ''} · 今日のカード`, cx, PANEL.y + 30, {
    size: 20, color: MUTED, maxWidth: inner, maxLines: 1, align: 'center',
  });

  /* カード本体 */
  const cw = 300;
  const ch = 400;
  const cardX = cx - cw / 2;
  const cardY = PANEL.y + 62;
  const cg = ctx.createLinearGradient(cardX, cardY, cardX + cw, cardY + ch);
  cg.addColorStop(0, '#141c33');
  cg.addColorStop(1, '#0b1224');
  ctx.fillStyle = cg;
  roundRect(ctx, cardX, cardY, cw, ch, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(230, 195, 120, 0.72)';
  ctx.lineWidth = 2.4;
  roundRect(ctx, cardX + 10, cardY + 10, cw - 20, ch - 20, 12);
  ctx.stroke();

  text(ctx, card.num || '', cx, cardY + 26, { size: 24, color: 'rgba(230, 195, 120, 0.9)', maxWidth: cw - 40, maxLines: 1, align: 'center' });
  text(ctx, card.name || '', cx, cardY + 118, { size: 56, serif: true, weight: 600, color: CREAM, maxWidth: cw - 50, maxLines: 1, align: 'center' });
  text(ctx, card.en || '', cx, cardY + 196, { size: 17, color: 'rgba(244, 220, 171, 0.8)', maxWidth: cw - 40, maxLines: 1, align: 'center' });
  text(ctx, card.keyword || '', cx, cardY + 300, { size: 20, color: 'rgba(248, 241, 226, 0.92)', maxWidth: cw - 50, maxLines: 2, align: 'center', lineHeight: 1.4 });

  text(ctx, data.message || '', cx, PANEL.y + 486, {
    size: 23, serif: true, color: INK, maxWidth: inner - 20, lineHeight: 1.55, maxLines: 2, align: 'center',
  });

  hairline(ctx, x, PANEL.y + 566, inner);

  let y = PANEL.y + 588;
  for (const r of data.readings || []) {
    text(ctx, r.label || '', x, y, { size: 18, color: '#8a7440', maxWidth: 260, maxLines: 1 });
    y = text(ctx, r.text || '', x, y + 26, { size: 21, color: INK, maxWidth: inner, lineHeight: 1.45, maxLines: 2 }) + 12;
  }

  const luckyY = PANEL.y + 796;
  ctx.fillStyle = 'rgba(230, 195, 120, 0.16)';
  roundRect(ctx, x - 8, luckyY, inner + 16, 128, 14);
  ctx.fill();
  const luck = data.lucky || {};
  text(ctx, 'ラッキーカラー', x + 22, luckyY + 16, { size: 17, color: MUTED, maxWidth: 220, maxLines: 1 });
  text(ctx, luck.color || '', x + 190, luckyY + 14, { size: 21, serif: true, weight: 600, color: INK, maxWidth: 260, maxLines: 1 });
  text(ctx, 'ラッキーアイテム', x + 22, luckyY + 52, { size: 17, color: MUTED, maxWidth: 220, maxLines: 1 });
  text(ctx, luck.item || '', x + 190, luckyY + 50, { size: 21, serif: true, weight: 600, color: INK, maxWidth: inner - 220, maxLines: 1 });
  text(ctx, '今日の合図', x + 22, luckyY + 88, { size: 17, color: MUTED, maxWidth: 220, maxLines: 1 });
  text(ctx, luck.point || '', x + 190, luckyY + 86, { size: 20, color: INK_SOFT, maxWidth: inner - 220, maxLines: 1 });
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

  drawNight(ctx, `${kind}${data.code || ''}${data.score || ''}${data.oshiName || ''}${data.typeName || ''}${data.weight || ''}${data.seed || ''}`);
  drawHeader(ctx, kind);
  if (kind === 'charm') drawCharm(ctx, data);
  else if (kind === 'otaku') drawOtaku(ctx, data);
  else if (kind === 'heavy-love') drawHeavyLove(ctx, data);
  else if (kind === 'omikuji') drawOmikuji(ctx, data);
  else if (kind === 'gacha') drawGacha(ctx, data);
  else if (kind === 'tarot') drawTarot(ctx, data);
  else drawChemistry(ctx, data);
  drawFooter(ctx);

  const suffix = data.code ? ` ${data.code}` : data.score ? ` ${data.score}` : data.rank ? ` ${data.rank}` : data.grade ? ` ${data.grade.label || ''}` : data.card ? ` ${data.card.name || ''}` : data.weight ? ` ${data.weight}%` : '';
  return {
    url: canvas.toDataURL('image/png'),
    name: `屋根裏部屋 ${meta.name}${suffix}.png`,
    title: `${meta.title} — 3階の屋根裏部屋の占い`,
    width: W,
    height: H,
  };
}
