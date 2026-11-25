// 屋根裏部屋 無料アーケード — 計算エンジン（決済・サーバーなし）
//
//   drawOmikuji({ seed, date })          ジャニのおみくじ
//   spinGacha({ seed, date })            今日の推し活ガチャ
//   drawTarot({ seed, pick, date })      今日の1分ジャニタロット
//
// 原則
//  · 生年月日を使わない。ボタンひとつで、その場で結果が出る。
//  · seed が同じなら同じ結果（決定論的）。画面は毎回ちがう seed を渡す。
//  · 出す文字はすべて日本語。韓国語の語彙は混ぜない。
//  · 課金・商品・決済の話は出さない。X へのシェアとフォローだけ。

import {
  JP_PLAY_TAGS,
  OMIKUJI_RANKS, OMIKUJI_FIELDS, OMIKUJI_LINES, OMIKUJI_COLORS, OMIKUJI_ITEMS, OMIKUJI_ADVICE,
  GACHA_GRADES, GACHA_PRIZES, GACHA_FIELDS, GACHA_LINES, GACHA_ACTIONS,
  TAROT_CARDS, TAROT_FIELDS,
} from '../content/jp-play.js';
import { jpShareText } from './jp.js';

export const TAROT_PICK_COUNT = 5;

const WEEK_JA = ['日', '月', '火', '水', '木', '金', '土'];

/** 「11月25日（水）」— 画面とカードに出す今日の日付 */
export function jpArcadeToday(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return jpArcadeToday(new Date());
  return `${d.getMonth() + 1}月${d.getDate()}日（${WEEK_JA[d.getDay()]}）`;
}

/* ────────────────────────────────────────────
   乱数 — 同じ seed なら同じ結果
   ──────────────────────────────────────────── */

function hashText(text) {
  let h = 2166136261;
  for (const ch of String(text)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRand(seed, salt = '') {
  const n = Number.isFinite(seed) ? Math.floor(Math.abs(seed)) : Date.now();
  return mulberry32(hashText(`${salt}:${n}`));
}

const pickOne = (rand, list) => list[Math.floor(rand() * list.length) % list.length];

function pickWeighted(rand, list) {
  const total = list.reduce((sum, it) => sum + (it.weight || 0), 0);
  let r = rand() * total;
  for (const it of list) {
    r -= it.weight || 0;
    if (r < 0) return it;
  }
  return list[list.length - 1];
}

/** ★★★★☆ — 画面とカードの両方で使う */
export function jpStars(value, max = 5) {
  const n = Math.max(0, Math.min(max, Math.round(Number(value) || 0)));
  return '★'.repeat(n) + '☆'.repeat(max - n);
}

const STAR_TIER = { high: 4, mid: 3, low: 2 };

function rollStars(rand, tier, key) {
  const base = STAR_TIER[tier] ?? 3;
  const delta = [-1, 0, 0, 1][Math.floor(rand() * 4)] || 0;
  const value = key === 'total' && tier === 'high' ? 5 : base + delta;
  return Math.max(1, Math.min(5, value));
}

/* ────────────────────────────────────────────
   1) ジャニのおみくじ
   ──────────────────────────────────────────── */

/**
 * @param {{seed?: number, date?: Date}} opts
 * @returns {object|null}
 */
export function drawOmikuji({ seed, date = new Date() } = {}) {
  const rand = makeRand(seed, 'omikuji');
  const rank = pickWeighted(rand, OMIKUJI_RANKS);
  const tier = rank.tier;

  const fortunes = OMIKUJI_FIELDS.map((f) => {
    const stars = rollStars(rand, tier, f.key);
    /* 星の数と本文の温度を合わせる（2つ星なのに強気な文、を避ける） */
    const bucket = stars >= 4 ? 'high' : stars === 3 ? 'mid' : 'low';
    const line = pickOne(rand, OMIKUJI_LINES[f.key][bucket]);
    return { key: f.key, label: f.label, stars, starsText: jpStars(stars), line };
  });

  const color = pickOne(rand, OMIKUJI_COLORS);
  const item = pickOne(rand, OMIKUJI_ITEMS);
  const advice = pickOne(rand, OMIKUJI_ADVICE);
  const dateLabel = jpArcadeToday(date);

  const shareLines = [
    '⛩️ ジャニのおみくじ',
    `${dateLabel}は「${rank.label}」`,
    `推し活運 ${fortunes[1].starsText}`,
    `ラッキーカラー：${color.name}／アイテム：${item.name}`,
  ];

  return {
    ok: true,
    kind: 'omikuji',
    dateLabel,
    rank: { key: rank.key, label: rank.label, read: rank.read, tier: rank.tier, line: rank.line },
    headline: `${dateLabel}の運勢は「${rank.label}」。${rank.line}`,
    fortunes,
    lucky: { color: { name: color.name, hex: color.hex, line: color.line }, item: { name: item.name, line: item.line } },
    advice,
    share: {
      lines: shareLines,
      text: jpShareText(shareLines, JP_PLAY_TAGS.omikuji),
      path: '#/jp/play/omikuji',
      tags: JP_PLAY_TAGS.omikuji,
    },
  };
}

/* ────────────────────────────────────────────
   2) 今日の推し活ガチャ
   ──────────────────────────────────────────── */

export function spinGacha({ seed, date = new Date() } = {}) {
  const rand = makeRand(seed, 'gacha');
  const grade = pickWeighted(rand, GACHA_GRADES);
  const tier = grade.key === 'ssr' ? 'high' : grade.key === 'sr' ? 'mid' : 'low';

  const fortunes = GACHA_FIELDS.map((f) => {
    const stars = rollStars(rand, tier, f.key);
    const bucket = stars >= 4 ? 'high' : stars === 3 ? 'mid' : 'low';
    const line = pickOne(rand, GACHA_LINES[f.key][bucket]);
    return { key: f.key, label: f.label, stars, starsText: jpStars(stars), line };
  });

  const prize = pickOne(rand, GACHA_PRIZES[grade.key]);
  const action = pickOne(rand, GACHA_ACTIONS[grade.key]);
  const dateLabel = jpArcadeToday(date);

  const shareLines = [
    '🎰 今日の推し活ガチャ',
    `${dateLabel}の結果は ${grade.label}「${grade.name}」`,
    `ごほうび：${prize}`,
    `チケット運 ${fortunes[0].starsText}／グッズ運 ${fortunes[1].starsText}`,
  ];

  return {
    ok: true,
    kind: 'gacha',
    dateLabel,
    grade: { key: grade.key, label: grade.label, name: grade.name, stars: grade.stars, line: grade.line },
    headline: `${grade.label}「${grade.name}」。${grade.line}`,
    prize,
    fortunes,
    action,
    rates: GACHA_GRADES.map((g) => ({ label: g.label, percent: g.weight })),
    share: {
      lines: shareLines,
      text: jpShareText(shareLines, JP_PLAY_TAGS.gacha),
      path: '#/jp/play/gacha',
      tags: JP_PLAY_TAGS.gacha,
    },
  };
}

/* ────────────────────────────────────────────
   3) 今日の1分ジャニタロット
   ──────────────────────────────────────────── */

export function drawTarot({ seed, pick = 0, date = new Date() } = {}) {
  const index = Math.max(0, Math.min(TAROT_PICK_COUNT - 1, Math.floor(Number(pick) || 0)));
  const rand = makeRand(seed, `tarot:${index}`);
  const card = TAROT_CARDS[Math.floor(rand() * TAROT_CARDS.length) % TAROT_CARDS.length];
  const dateLabel = jpArcadeToday(date);

  const shareLines = [
    '🔮 今日の1分ジャニタロット',
    `${dateLabel}のカードは「${card.name}」（${card.keyword}）`,
    card.message,
  ];

  return {
    ok: true,
    kind: 'tarot',
    dateLabel,
    pick: index,
    pickCount: TAROT_PICK_COUNT,
    card: {
      no: card.no, num: card.num, name: card.name, en: card.en, keyword: card.keyword,
    },
    message: card.message,
    readings: TAROT_FIELDS.map((f) => ({ key: f.key, label: f.label, text: card[f.key] })),
    lucky: {
      color: card.lucky.color,
      item: card.lucky.item,
      point: card.lucky.point,
    },
    share: {
      lines: shareLines,
      text: jpShareText(shareLines, JP_PLAY_TAGS.tarot),
      path: '#/jp/play/tarot',
      tags: JP_PLAY_TAGS.tarot,
    },
  };
}
