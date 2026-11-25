// 屋根裏部屋 JP プレイグラウンド — 計算エンジン（決済・サーバーなし）
//
//   pushChemistry({ me, oshi, oshiName })   推しとの相性診断（日干・日支の噛み合い）
//   otakuType({ chart, answers })           推し活タイプ診断（16タイプ取扱説明書）
//
// 原則
//  · 材料は computeChart が出した三柱（年月日）の八字だけ。占いに無い話は足さない。
//  · 同じ入力ならいつも同じ結果（決定論的）。乱数は使わない。
//  · 人を決めつけない。「〜しがち」「〜な傾向」で、最後は本人に返す。
//  · 画面に出す文字はすべて日本語。韓国語の語彙（干支のハングル読みなど）は混ぜない。

import { STEMS, BRANCHES, SANGSAENG, SANGGEUK } from './constants.js';
import { stemRelation, branchRelation } from './compat.js';
import {
  JP_BRANCH, JP_HASHTAGS, JP_MENTION,
  CHEMI_TYPE, CHEMI_ELEMENT, CHEMI_OTOSHI, CHEMI_OSHI_SECRET, CHEMI_BRANCH, CHEMI_RARITY,
  OTAKU_TYPES, OTAKU_ENTRY, OTAKU_WALLET, OTAKU_LETTERS,
} from '../content/jp.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));
const pad2 = (n) => String(n).padStart(2, '0');

/** 日干の関係ごとの加点 */
const STEM_DELTA = { 합: 26, 상생: 18, 같음: 12, 무관: 2, 극: -6, 충: -16 };
/** 日支の関係ごとの加点 */
const BRANCH_DELTA = { 육합: 16, 삼합: 12, 충: -14, 형: -8, 원진: -6, 파: -4, same: 3, none: 0 };

const JP_REL = {
  육합: '六合', 삼합: '三合', 충: '冲', 형: '刑', 원진: '怨嗔', 파: '破',
  same: '同じ支', none: '並び',
};

/** 五行のハングル名 → 日本語（木火土金水）。画面の文にはハングルを混ぜない */
const JP_EL = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' };

/** 日干の関係 — 日本語の呼び名 */
const JP_STEM_REL = { 합: '合', 상생: '相生', 같음: '比和', 무관: '無縁', 극: '相剋', 충: '冲' };

/** 文の最初の一節だけ — カードに載せる短い版 */
function firstSentence(str) {
  const s = String(str || '');
  const i = s.indexOf('。');
  return i >= 0 ? s.slice(0, i + 1) : s;
}

/** 生年月日 — 画面用（日本語） */
export function jpBirthLabel(chart) {
  if (!chart || !chart.ok) return '';
  const s = chart.solar;
  return `${s.y}年${s.m}月${s.d}日`;
}

/** 三柱（年・月・日）— 画面用。時刻は使わない */
export function jpPillars(chart) {
  return ['year', 'month', 'day'].map((key) => {
    const p = chart.pillars[key];
    const label = key === 'year' ? '年柱' : key === 'month' ? '月柱' : '日柱';
    const br = JP_BRANCH[p.branchKo] || { ja: p.branchHan, read: '' };
    return {
      key,
      label,
      ganji: p.han,
      stem: p.stemHan,
      branch: br.ja,
      read: br.read,
      animal: br.read ? `${br.ja}（${br.read}）` : br.ja,
    };
  });
}

/* ────────────────────────────────────────────
   1) 推しとの相性診断
   ──────────────────────────────────────────── */

/**
 * @param {{me: object, oshi: object, oshiName?: string}} input
 *   me / oshi — computeChart の結果（ok:true）
 */
export function pushChemistry({ me, oshi, oshiName = '' } = {}) {
  if (!me || !me.ok || !oshi || !oshi.ok) return null;

  const name = String(oshiName || '').trim().slice(0, 20) || '推し';
  const myStem = me.dayMaster.ko;
  const oshiStem = oshi.dayMaster.ko;
  const myEl = me.dayMaster.ohaeng;
  const oshiEl = oshi.dayMaster.ohaeng;

  const stemRel = stemRelation(oshi.dayStem, me.dayStem);
  const myBranch = me.pillars.day.branchKo;
  const oshiBranch = oshi.pillars.day.branchKo;
  const branchKind = myBranch === oshiBranch ? 'same' : (branchRelation(myBranch, oshiBranch) || 'none');

  /* 点数 — 日干・日支の関係が主、五行の補い合いと同日柱を少し足す */
  let score = 58;
  score += STEM_DELTA[stemRel.kind] != null ? STEM_DELTA[stemRel.kind] : 0;
  score += BRANCH_DELTA[branchKind] || 0;

  const fills = [];
  for (const el of me.ohaeng.missing) {
    if ((oshi.ohaeng.count[el] || 0) >= 2) {
      score += 5;
      fills.push(`あなたに足りない${JP_EL[el]}を、推しが2つ以上持っている`);
    }
  }
  for (const el of oshi.ohaeng.missing) {
    if ((me.ohaeng.count[el] || 0) >= 2) {
      score += 3;
      fills.push(`推しに足りない${JP_EL[el]}を、あなたが持っている`);
    }
  }
  if (me.pillars.day.ko === oshi.pillars.day.ko) score += 6;
  score = clamp(score, 32, 98);

  const rarity = CHEMI_RARITY.find((b) => score >= b.min) || CHEMI_RARITY[CHEMI_RARITY.length - 1];
  const type = CHEMI_TYPE[stemRel.kind] || CHEMI_TYPE.무관;
  const el = CHEMI_ELEMENT[`${myEl}${oshiEl}`] || CHEMI_ELEMENT.목목;
  const branchLine = CHEMI_BRANCH[branchKind] || CHEMI_BRANCH.none;

  const points = [
    { key: 'pull', label: 'ふたりの惹かれ方', value: el.pull, short: firstSentence(el.pull) },
    { key: 'otoshi', label: '推しが落ちる瞬間', value: CHEMI_OTOSHI[myStem] || '', short: firstSentence(CHEMI_OTOSHI[myStem]) },
    { key: 'secret', label: '推しのここが反則', value: CHEMI_OSHI_SECRET[oshiStem] || '', short: firstSentence(CHEMI_OSHI_SECRET[oshiStem]) },
  ].filter((p) => p.value);

  const headline = `「${name}」との相性は「${type.name}」。${type.hook}`;

  const shareLines = [
    '🪄 推しとの相性診断',
    `「${name}」×わたし＝「${type.name}」`,
    `相性温度 ${score}／100・${`上位${rarity.percent}%のレア相性`}`,
  ];

  return {
    ok: true,
    score,
    rarity: { percent: rarity.percent, label: `上位${rarity.percent}%のレア相性` },
    type: { name: type.name, hook: type.hook },
    headline,
    oshiName: name,
    points,
    caution: el.friction,
    advice: el.advice,
    fills,
    relation: {
      stemKind: JP_STEM_REL[stemRel.kind] || '無縁',
      stemLabel: `${STEMS[me.dayStem].han} × ${STEMS[oshi.dayStem].han}`,
      branchKind: JP_REL[branchKind] || '並び',
      branchTag: JP_REL[branchKind] || '並び',
      branchLine,
    },
    me: {
      label: 'あなた',
      birth: jpBirthLabel(me),
      pillars: jpPillars(me),
      dayStemHan: STEMS[me.dayStem].han,
      dayBranch: JP_BRANCH[myBranch].ja,
      ohaeng: JP_EL[myEl],
    },
    oshi: {
      label: name,
      birth: jpBirthLabel(oshi),
      pillars: jpPillars(oshi),
      dayStemHan: STEMS[oshi.dayStem].han,
      dayBranch: JP_BRANCH[oshiBranch].ja,
      ohaeng: JP_EL[oshiEl],
    },
    share: {
      lines: shareLines,
      path: '#/jp/chemistry',
    },
  };
}

/* ────────────────────────────────────────────
   2) 推し活タイプ診断
   ──────────────────────────────────────────── */

const OHAENG_JP = [
  { key: '목', han: '木', label: '木' },
  { key: '화', han: '火', label: '火' },
  { key: '토', han: '土', label: '土' },
  { key: '금', han: '金', label: '金' },
  { key: '수', han: '水', label: '水' },
];

/**
 * @param {{chart: object, answers: {q1?:string,q2?:string,q3?:string}}} input
 */
export function otakuType({ chart, answers = {} } = {}) {
  if (!chart || !chart.ok) return null;

  const pick = (v, allowed, fallback) => (allowed.includes(v) ? v : fallback);
  const q1 = pick(answers.q1, ['T', 'Q'], 'T');
  const q2 = pick(answers.q2, ['K', 'J'], 'K');
  const q3 = pick(answers.q3, ['F', 'H'], 'F');
  const first = chart.dayMaster.yang ? 'S' : 'M';
  const code = `${first}${q1}${q2}${q3}`;
  const type = OTAKU_TYPES[code] || OTAKU_TYPES.MQKH;

  /* 財布の危険度 — 財星（偏財・正財）の数 + 回答 + 陽の日干 */
  const sipsung = chart.sipsung || {};
  const wealth = Object.values(sipsung).filter((v) => v === '편재' || v === '정재').length;
  const danger = clamp(
    40 + wealth * 8 + (q2 === 'K' ? 26 : 4) + (chart.dayMaster.yang ? 4 : 0) + (q1 === 'T' ? 3 : 0) + (q3 === 'F' ? 4 : 0),
    26,
    99,
  );
  const wallet = danger >= 85 ? OTAKU_WALLET.high : danger >= 70 ? OTAKU_WALLET.mid : danger >= 55 ? OTAKU_WALLET.low : OTAKU_WALLET.safe;

  const elements = OHAENG_JP.map((o) => ({ label: o.label, count: chart.ohaeng.count[o.key] || 0 }));
  const entry = OTAKU_ENTRY[chart.dayMaster.ko] || OTAKU_ENTRY.갑;
  const letters = [
    { ch: code[0], label: code[0] === 'S' ? OTAKU_LETTERS.S : OTAKU_LETTERS.M },
    { ch: code[1], label: code[1] === 'T' ? OTAKU_LETTERS.T : OTAKU_LETTERS.Q },
    { ch: code[2], label: code[2] === 'K' ? OTAKU_LETTERS.K : OTAKU_LETTERS.J },
    { ch: code[3], label: code[3] === 'F' ? OTAKU_LETTERS.F : OTAKU_LETTERS.H },
  ];

  const shareLines = [
    '🧾 推し活タイプ診断',
    `${code}「${type.name}」／財布の危険度 ${danger}%`,
    type.catch,
  ];

  return {
    ok: true,
    code,
    letters,
    type: { name: type.name, catch: type.catch },
    name: type.name,
    catch: type.catch,
    manual: type.manual,
    friend: type.friend,
    caution: type.caution,
    entry,
    wallet: { value: danger, label: wallet.label, note: wallet.note },
    birth: jpBirthLabel(chart),
    pillars: jpPillars(chart),
    dayStemHan: STEMS[chart.dayStem].han,
    dayOhaeng: (OHAENG_JP.find((o) => o.key === chart.dayMaster.ohaeng) || OHAENG_JP[0]).han,
    dayBranchHan: BRANCHES[chart.dayBranch].han,
    dayBranch: JP_BRANCH[chart.pillars.day.branchKo].ja,
    elements,
    share: {
      lines: shareLines,
      path: '#/jp/otaku',
    },
  };
}

/* ────────────────────────────────────────────
   X シェア
   ──────────────────────────────────────────── */

/** X の加重文字数（CJK は 2、ASCII は 1）— 280 を超えないための目安 */
export function tweetWeight(text) {
  let w = 0;
  for (const ch of String(text || '')) {
    w += ch.codePointAt(0) <= 0x7f ? 1 : 2;
  }
  return w;
}

/** 本文 + ハッシュタグ + @3F_Zanie。結果画面の「Xでシェア」がそのまま使う */
export function jpShareText(lines) {
  return [...(lines || []), '', JP_HASHTAGS.join(' '), JP_MENTION].join('\n');
}

/** intent/tweet — 本文とページURLを別パラメータで渡す（URLは23字換算で数えられる） */
export function buildXIntent(text, pageUrl) {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(pageUrl)}`;
}
