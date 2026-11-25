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
import { charmPositions } from './playground.js';
import {
  JP_BRANCH, JP_HASHTAGS, JP_HASHTAGS_HEAVY, JP_HASHTAGS_CHARM, JP_MENTION,
  SAL_JP, JP_SAL_POS, CHARM_LEVELS_JP,
  CHEMI_TYPE, CHEMI_ELEMENT, CHEMI_OTOSHI, CHEMI_OSHI_SECRET, CHEMI_BRANCH, CHEMI_RARITY,
  OTAKU_TYPES, OTAKU_ENTRY, OTAKU_WALLET, OTAKU_LETTERS,
  HEAVY_ANIMALS, HEAVY_LEVELS, HEAVY_DRIVER, HEAVY_MATCH, HEAVY_SAME,
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
   0) 魅力星（モテ殺）診断
     判定は韓国本陣 #/play/charm と同じ charmPositions（三合・日干の表）。
     ここではその判定に日本語の読みを着せ、点数の境目と優先順位も本陣と同じに置く。
     無料・非決済 — 課金の話は入れない。
   ──────────────────────────────────────────── */

/** ジャニが見る順番 — モテ星が先、風の星が最後（本陣と同じ） */
const CHARM_PRIORITY = { dohwa: 6, hongyeom: 5, cheoneul: 4, munchang: 3, hwagae: 2, yeokma: 1 };

/**
 * @param {{chart: object}} input computeChart の結果（ok:true）
 */
export function charmJp({ chart } = {}) {
  const pos = charmPositions(chart);
  if (!pos) return null;

  const items = pos.map((p) => {
    const meta = SAL_JP[p.key];
    const where = p.where.map((w) => {
      const at = JP_SAL_POS[w.key] || { label: '', role: '' };
      return { key: w.key, label: at.label, role: at.role };
    });
    const flavors = p.where.map((w) => meta.where[w.key]).filter(Boolean);
    return {
      key: p.key,
      name: meta.name,
      han: meta.han,
      full: `${meta.name}（${meta.han}）`,
      tag: meta.tag,
      found: p.found,
      where,
      whereText: where.map((w) => `${w.label}（${w.role}）`).join(' · '),
      flavors,
      flavor: flavors[0] || (p.found ? meta.line : meta.none),
      line: p.found ? meta.line : meta.none,
      short: meta.short,
      noneShort: meta.noneShort,
    };
  });

  const found = items.filter((i) => i.found);
  const top = found.slice().sort((a, b) =>
    CHARM_PRIORITY[b.key] - CHARM_PRIORITY[a.key] || pos.findIndex((x) => x.key === a.key) - pos.findIndex((x) => x.key === b.key))[0] || null;

  /* 魅力温度 — 星の数と、日柱（いちばん近い席）に座ったかで上げる */
  const inDay = found.filter((i) => i.where.some((w) => w.key === 'day'));
  const score = clamp(40 + found.length * 10 + (inDay.length ? 8 : 0), 45, 96);
  const level = CHARM_LEVELS_JP.find((l) => score >= l.min) || CHARM_LEVELS_JP[CHARM_LEVELS_JP.length - 1];

  let headline;
  if (!found.length) {
    headline = '魅力星は0個。でも、ここが大事 — ないんじゃなくて、あなたの魅力は星の名札なしで、あなたの顔からそのまま出ているタイプ。';
  } else if (found.length <= 2) {
    headline = `原局に魅力星${found.length}個。ジャニが見るに、${top.name}がいちばん強く働いている。`;
  } else {
    headline = `魅力星${found.length}個。これはちょっと反則 — 人があなたをチラチラ見てしまうのには、理由がある。`;
  }

  const closing = top
    ? `ジャニの結論：${top.name}は「${top.tag}」方向で使われます。隠そうとしないで — 隠すほど、ばれる。`
    : 'ジャニの結論：星の名札がなくても、あなたの魅力は話し方と笑い方から出ています。それが、いちばん消えないもの。';

  const points = found.length
    ? [...found.slice(0, 2).map((i) => `${i.full} · ${i.whereText} — ${i.flavor}`), closing]
    : [
        'あなたの魅力は「一気にドン」ではなく「長く見てわかる」ほう。最初はふつうに見えて、二、三回会うと人が離れなくなる。',
        '星が無くて空いているのではなく、席が空いているから、入ってきた人が長く居つく。',
        closing,
      ];

  return {
    ok: true,
    birth: jpBirthLabel(chart),
    pillars: jpPillars(chart),
    dayStemHan: STEMS[chart.dayStem].han,
    dayOhaeng: JP_EL[chart.dayMaster.ohaeng],
    items,
    found,
    foundKeys: found.map((i) => i.key),
    count: found.length,
    top: top
      ? { key: top.key, name: top.name, full: top.full, tag: top.tag, whereText: top.whereText }
      : null,
    score,
    scoreLabel: level.label,
    headline,
    points,
    appeal: top
      ? `${top.tag}魅力 — ${top.whereText}から先ににじみます。`
      : '一気にではなく、長く見てわかる魅力 — それがあなたの側。',
    share: {
      lines: [
        '✨ 魅力星（モテ殺）診断',
        `魅力星 ${found.length}個・魅力温度 ${score}／100`,
        top ? `いちばん強いのは「${top.name}」` : '魅力は星の名札なしで出るタイプ',
      ],
      path: '#/jp/charm',
      tags: JP_HASHTAGS_CHARM,
    },
  };
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
   3) 重め恋愛アニマル診断
     表＝年支の動物（人から見えるあなた）／裏＝日支の動物（ふたりのときのあなた）
     重さ（%）＝動物の下地＋日干＋十神（印·官·劫·傷）＋年支と日支の関係
   ──────────────────────────────────────────── */

/** 日干ごとの重さの下地 — 線を引く庚は軽く、こまやかな己は重い */
const HEAVY_STEM = { 갑: 1, 을: 3, 병: -2, 정: 3, 무: 2, 기: 5, 경: -3, 신: 4, 임: -2, 계: 2 };

/** 十二支の六合 · 三合 · 冲（年支の動物から相性の動物を出す） */
const HEAVY_YUKHAP = { 자: '축', 축: '자', 인: '해', 해: '인', 묘: '술', 술: '묘', 진: '유', 유: '진', 사: '신', 신: '사', 오: '미', 미: '오' };
const HEAVY_SAMHAP = [
  { ko: '신자진', members: ['신', '자', '진'] },
  { ko: '해묘미', members: ['해', '묘', '미'] },
  { ko: '인오술', members: ['인', '오', '술'] },
  { ko: '사유축', members: ['사', '유', '축'] },
];
const HEAVY_CHUNG = { 자: '오', 오: '자', 축: '미', 미: '축', 인: '신', 신: '인', 묘: '유', 유: '묘', 진: '술', 술: '진', 사: '해', 해: '사' };

/** 十神の並び — 同じ数なら、この順で「重さの正体」にする */
const HEAVY_DRIVER_ORDER = ['편인', '정인', '편관', '정관', '겁재', '상관', '식신', '비견', '편재', '정재'];

/** 支の二文字を十二支の順で並べる（六合·三合·冲の表引き用） */
function branchPair(a, b) {
  const ia = BRANCHES.findIndex((x) => x.ko === a);
  const ib = BRANCHES.findIndex((x) => x.ko === b);
  return ia <= ib ? `${a}${b}` : `${b}${a}`;
}

/** 画面に出す分だけを抜き出す（ハングルの支キーは返さない） */
function heavyFace(a) {
  return {
    han: a.han,
    animal: a.animal,
    yearJa: a.yearJa,
    name: a.name,
    catch: a.catch,
    surfaceWord: a.surfaceWord,
    look: a.look,
    innerWord: a.innerWord,
    inner: a.inner,
    charm: a.charm,
    care: a.care,
    img: a.img,
  };
}

/**
 * @param {{chart: object}} input  computeChart の結果（ok:true・三柱）
 */
export function heavyLoveType({ chart } = {}) {
  if (!chart || !chart.ok) return null;

  const yearKo = chart.pillars.year.branchKo;
  const dayKo = chart.pillars.day.branchKo;
  const face = HEAVY_ANIMALS[yearKo] || HEAVY_ANIMALS.자;
  const innerFace = HEAVY_ANIMALS[dayKo] || HEAVY_ANIMALS.자;
  const same = yearKo === dayKo;

  /* 愛の重さ — 動物の下地 + 日干 + 十神 + 年支と日支の関係 */
  const sipsung = chart.sipsung || {};
  const list = ['year', 'month', 'yearBranch', 'monthBranch', 'dayBranch']
    .map((k) => sipsung[k])
    .filter(Boolean);
  const count = (names) => list.filter((v) => names.includes(v)).length;
  const relation = same ? 'same' : (branchRelation(yearKo, dayKo) || 'none');

  let value = 56 + face.base + Math.round(innerFace.base * 0.45) + (HEAVY_STEM[chart.dayMaster.ko] || 0);
  value += (count(['정인', '편인']) * 4) + (count(['편관']) * 3) + (count(['정관', '겁재', '상관']) * 2) + count(['식신']) * 1;
  value += relation === 'same' ? 5 : relation === '육합' ? 2 : relation === '충' ? -3 : 0;
  /* 77% を中心に少しだけ開く — 同じ年でも日柱で 60〜95 に散るように */
  value = clamp(77 + Math.round((value - 77) * 1.2), 42, 99);

  const level = HEAVY_LEVELS.find((l) => value >= l.min) || HEAVY_LEVELS[HEAVY_LEVELS.length - 1];

  /* 重さの正体 — いちばん数が多い十神。同数なら並び順 */
  let driverKey = '정인';
  let best = 0;
  for (const key of HEAVY_DRIVER_ORDER) {
    const n = list.filter((v) => v === key).length;
    const score = n * (HEAVY_DRIVER[key] ? HEAVY_DRIVER[key].weight : 1);
    if (n > 0 && score > best) {
      best = score;
      driverKey = key;
    }
  }
  const driver = HEAVY_DRIVER[driverKey] || HEAVY_DRIVER.정인;

  /* 相性 — 六合の動物と、三合のもう一匹。冲は「重すぎ注意」 */
  const hapKo = HEAVY_YUKHAP[yearKo];
  const hapAnimal = HEAVY_ANIMALS[hapKo] || face;
  const group = HEAVY_SAMHAP.find((g) => g.members.includes(yearKo)) || { ko: '신자진', members: ['신', '자', '진'] };
  const samKo = group.members.find((b) => b !== yearKo && b !== hapKo) || group.members.find((b) => b !== yearKo) || hapKo;
  const samAnimal = HEAVY_ANIMALS[samKo] || face;
  const chungKo = HEAVY_CHUNG[yearKo];
  const chungAnimal = HEAVY_ANIMALS[chungKo] || face;

  const bestMatches = [
    {
      animal: hapAnimal.animal, han: hapAnimal.han, yearJa: hapAnimal.yearJa,
      img: hapAnimal.img, kind: '六合',
      reason: HEAVY_MATCH.yukhap[branchPair(yearKo, hapKo)] || HEAVY_MATCH.yukhap.자축,
    },
    {
      animal: samAnimal.animal, han: samAnimal.han, yearJa: samAnimal.yearJa,
      img: samAnimal.img, kind: '三合',
      reason: HEAVY_MATCH.samhap[group.ko] || '三合。同じ方向を見ているので、急かさなくても進む。',
    },
  ];

  const habits = same
    ? [face.habits[0], face.habits[1]]
    : [face.habits[0], face.habits[1], innerFace.habits[0]];

  const gapShort = same
    ? HEAVY_SAME.short(face.animal)
    : `表は${face.surfaceWord}な${face.animal}のくせに、裏は${innerFace.innerWord}${innerFace.animal}。`;

  const shareLines = [
    '🐾 重め恋愛アニマル診断',
    `「${face.name}」／愛の重さ ${value}%・${level.label}`,
    gapShort,
  ];

  return {
    ok: true,
    birth: jpBirthLabel(chart),
    pillars: jpPillars(chart),
    animal: heavyFace(face),
    innerAnimal: {
      han: innerFace.han, animal: innerFace.animal, yearJa: innerFace.yearJa,
      name: innerFace.name, innerWord: innerFace.innerWord, inner: innerFace.inner,
      habits: innerFace.habits.slice(), img: innerFace.img,
    },
    same,
    sameNote: same ? HEAVY_SAME.note : '',
    gap: { short: gapShort, surface: face.look, inner: innerFace.inner },
    weight: { value, level: level.label, note: level.note },
    driver: { label: driver.label, note: driver.note },
    habits,
    charm: face.charm,
    care: face.care,
    match: {
      best: bestMatches,
      watch: {
        animal: chungAnimal.animal, han: chungAnimal.han, yearJa: chungAnimal.yearJa,
        img: chungAnimal.img,
        reason: HEAVY_MATCH.chung[branchPair(yearKo, chungKo)] || '冲。好きの向きが逆になりやすい。',
      },
    },
    share: {
      lines: shareLines,
      path: '#/jp/heavy-love',
      tags: JP_HASHTAGS_HEAVY,
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
export function jpShareText(lines, tags = JP_HASHTAGS) {
  return [...(lines || []), '', (tags && tags.length ? tags : JP_HASHTAGS).join(' '), JP_MENTION].join('\n');
}

/** intent/tweet — 本文とページURLを別パラメータで渡す（URLは23字換算で数えられる） */
export function buildXIntent(text, pageUrl) {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(pageUrl)}`;
}
