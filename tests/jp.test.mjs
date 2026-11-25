// JPプレイグラウンド — 推しとの相性診断 · 推し活タイプ診断
// 実際の描画・共有は scripts/check-jp.py がブラウザで確かめ、
// ここでは計算の決定性・日本語コピー・非決済・Xシェアの契約が崩れないように守る。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeChart } from '../src/engine/saju.js';
import { pushChemistry, otakuType, jpShareText, buildXIntent, tweetWeight } from '../src/engine/jp.js';
import { JP_IMAGE } from '../src/lib/jp-card-image.js';
import { OTAKU_TYPES, JP_HASHTAGS, JP_MENTION } from '../src/content/jp.js';

const mainJs = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const cardJs = readFileSync(new URL('../src/lib/jp-card-image.js', import.meta.url), 'utf8');
const engineJs = readFileSync(new URL('../src/engine/jp.js', import.meta.url), 'utf8');
const contentJs = readFileSync(new URL('../src/content/jp.js', import.meta.url), 'utf8');

const chartOf = (y, m, d) => computeChart({
  calendar: 'solar', year: y, month: m, day: d,
  hour: 12, minute: 0, timeUnknown: true, gender: 'female', leap: false,
});

const ME = chartOf(1992, 10, 15);   // 갑자일 (S)
const OSHI = chartOf(1997, 6, 17);  // 경인일 (S)
const YIN = chartOf(1991, 5, 7);    // 정축일 (M)

const hasHangul = (s) => /[\uac00-\ud7a3]/.test(String(s));

/* ────────────────────────────────────────────
   相性診断
   ──────────────────────────────────────────── */

test('相性診断 — 同じ入力なら何度でも同じ結果', () => {
  const a = pushChemistry({ me: ME, oshi: OSHI, oshiName: 'テスト推し' });
  const b = pushChemistry({ me: ME, oshi: OSHI, oshiName: 'テスト推し' });
  assert.deepEqual(a, b);
  assert.equal(a.score, b.score);
});

test('相性診断 — 点数は32〜98、レア度は「上位X%のレア相性」', () => {
  const pairs = [[ME, OSHI], [ME, YIN], [OSHI, YIN], [YIN, ME]];
  for (const [me, oshi] of pairs) {
    const r = pushChemistry({ me, oshi, oshiName: '推し' });
    assert.ok(r.ok);
    assert.ok(r.score >= 32 && r.score <= 98, `score ${r.score}`);
    assert.match(r.rarity.label, /^上位[\d.]+%のレア相性$/);
    assert.ok(r.points.length === 3, '惹かれ方・落ちる瞬間・反則の3つ');
    for (const p of r.points) {
      assert.ok(p.label && p.value && p.short, `point ${p.key}`);
      assert.ok(p.short.length <= p.value.length, 'カード用は短い');
    }
    assert.ok(r.caution.length > 6, '気をつける距離感');
    assert.ok(r.advice.length > 6, '距離感のヒント');
    assert.ok(r.headline.includes(r.type.name));
  }
});

test('相性診断 — 三柱は漢字の干支で、画面に韓国語（ハングル）を出さない', () => {
  const r = pushChemistry({ me: ME, oshi: OSHI, oshiName: 'テスト推し' });
  assert.equal(r.me.pillars.length, 3);
  assert.equal(r.me.pillars[2].label, '日柱');
  assert.match(r.me.pillars[2].ganji, /^[\u4e00-\u9fff]{2}$/);
  assert.ok(!hasHangul(JSON.stringify(r)), `ハングルが混ざっている: ${JSON.stringify(r).match(/[\uac00-\ud7a3]+/)}`);
  assert.equal(r.me.birth, '1992年10月15日');
});

test('相性診断 — 名無しは「推し」、名前に20字上限', () => {
  assert.equal(pushChemistry({ me: ME, oshi: OSHI, oshiName: '' }).oshiName, '推し');
  const long = pushChemistry({ me: ME, oshi: OSHI, oshiName: 'あ'.repeat(30) });
  assert.equal(long.oshiName.length, 20);
});

test('相性診断 — 名式が無ければ null（落ちない）', () => {
  assert.equal(pushChemistry({ me: null, oshi: OSHI }), null);
  assert.equal(pushChemistry({ me: ME, oshi: { ok: false } }), null);
  assert.equal(pushChemistry(), null);
});

/* ────────────────────────────────────────────
   推し活タイプ診断
   ──────────────────────────────────────────── */

test('推し活タイプ — コードは4文字、16通りすべてに取扱説明書がある', () => {
  const codes = new Set();
  for (const chart of [ME, YIN]) {
    for (const q1 of ['T', 'Q']) {
      for (const q2 of ['K', 'J']) {
        for (const q3 of ['F', 'H']) {
          const r = otakuType({ chart, answers: { q1, q2, q3 } });
          assert.match(r.code, /^[SM][TQ][KJ][FH]$/, `code ${r.code}`);
          assert.equal(r.code[0], chart.dayMaster.yang ? 'S' : 'M');
          codes.add(r.code);
        }
      }
    }
  }
  assert.equal(codes.size, 16, '16タイプすべて到達できる');
  assert.deepEqual(Object.keys(OTAKU_TYPES).sort(), [...codes].sort());
  for (const [code, t] of Object.entries(OTAKU_TYPES)) {
    assert.ok(t.name && t.catch, `${code} 名前・キャッチ`);
    assert.equal(t.manual.length, 3, `${code} 取扱説明書は3行`);
    assert.ok(t.friend && t.caution, `${code} オタ友・注意`);
  }
});

test('推し活タイプ — 財布の危険度は26〜99で、回答でちゃんと変わる', () => {
  const spend = otakuType({ chart: ME, answers: { q1: 'T', q2: 'K', q3: 'F' } });
  const save = otakuType({ chart: ME, answers: { q1: 'Q', q2: 'J', q3: 'H' } });
  assert.ok(spend.wallet.value >= 26 && spend.wallet.value <= 99);
  assert.ok(save.wallet.value < spend.wallet.value, '課金→手間で下がる');
  assert.ok(spend.wallet.label && spend.wallet.note);
  assert.match(spend.wallet.label, /^(即死級|危険|注意報|セーブ上手)$/);
});

test('推し活タイプ — 結果にハングルを出さない・成分は五行5つ', () => {
  const r = otakuType({ chart: OSHI, answers: { q1: 'Q', q2: 'J', q3: 'H' } });
  assert.ok(!hasHangul(JSON.stringify(r)), `ハングル: ${JSON.stringify(r).match(/[\uac00-\ud7a3]+/)}`);
  assert.equal(r.elements.length, 5);
  assert.deepEqual(r.elements.map((e) => e.label), ['木', '火', '土', '金', '水']);
  assert.equal(r.letters.length, 4);
  assert.equal(otakuType({ chart: { ok: false } }), null);
});

/* ────────────────────────────────────────────
   Xシェア
   ──────────────────────────────────────────── */

test('Xシェア — @3F_Zanie と言語ハッシュタグ・ページURLが自動で入る', () => {
  const r = pushChemistry({ me: ME, oshi: OSHI, oshiName: 'テスト推し' });
  const text = jpShareText(r.share.lines);
  for (const tag of JP_HASHTAGS) assert.ok(text.includes(tag), tag);
  assert.ok(text.includes(JP_MENTION));
  assert.ok(tweetWeight(text) + 23 <= 280, `重すぎる: ${tweetWeight(text)}`);

  const url = 'https://example.github.io/darakbang-saju-web/#/jp/chemistry';
  const intent = buildXIntent(text, url);
  assert.ok(intent.startsWith('https://twitter.com/intent/tweet?text='));
  assert.ok(intent.includes(encodeURIComponent('#四柱推命')));
  assert.ok(intent.includes(encodeURIComponent('@3F_Zanie')));
  assert.ok(intent.includes(`url=${encodeURIComponent(url)}`));
  assert.ok(intent.includes(encodeURIComponent('#/jp/chemistry')));
});

test('Xシェア — 推し活タイプも280字に収まる', () => {
  const r = otakuType({ chart: ME, answers: { q1: 'T', q2: 'K', q3: 'F' } });
  const text = jpShareText(r.share.lines);
  assert.ok(text.includes(r.code));
  assert.ok(tweetWeight(text) + 23 <= 280, `重すぎる: ${tweetWeight(text)}`);
  assert.equal(r.share.path, '#/jp/otaku');
});

/* ────────────────────────────────────────────
   画面 · 非決済 · 2種だけ
   ──────────────────────────────────────────── */

const jpBlock = (() => {
  const start = mainJs.indexOf('const JP_GAMES');
  const end = mainJs.indexOf('   라우터');
  assert.ok(start > 0 && end > start, 'JPブロックが見つかる');
  return mainJs.slice(start, end);
})();
const jpBlockNoComments = jpBlock.replace(/\/\*[\s\S]*?\*\//g, '');

test('JPハブ — 2種だけ（相性診断・推し活タイプ）、重め恋愛は無い', () => {
  assert.equal((jpBlock.match(/href: '#\/jp\//g) || []).length, 2, 'JP_GAMES は2件');
  assert.ok(jpBlock.includes("href: '#/jp/chemistry'"));
  assert.ok(jpBlock.includes("href: '#/jp/otaku'"));
  assert.ok(!/heavy-love/.test(mainJs), '重め恋愛アニマル診断は実装しない');
  assert.ok(!/zodiac\/.*heavy/.test(cardJs));
});

test('JP画面 — 990円・決済・구슬・업셀 링크를 넣지 않는다', () => {
  for (const bad of ['990', 'productHref', 'requestPayment', 'open-beads', '구슬', '결제']) {
    assert.ok(!jpBlockNoComments.includes(bad), `JPブロックに ${bad} が混ざっている`);
  }
  assert.ok(jpBlock.includes('jp-x-share'), 'Xシェア');
  assert.ok(jpBlock.includes('jp-save-image'), '画像保存');
  assert.ok(jpBlock.includes('https://x.com/3F_Zanie'), '@3F_Zanie フォロー');
  assert.ok(jpBlock.includes('jp-follow-btn'), 'フォローボタン');
});

test('JPルート — ハブ・相性・推し活タイプがルーターに繋がる', () => {
  assert.ok(mainJs.includes("if (path === '/jp') return { name: 'jp' };"));
  assert.ok(mainJs.includes("if (path === '/jp/chemistry') return { name: 'jp-chemistry' };"));
  assert.ok(mainJs.includes("if (path === '/jp/otaku') return { name: 'jp-otaku' };"));
  assert.ok(mainJs.includes("r.name === 'jp-chemistry'"));
  assert.ok(mainJs.includes("r.name === 'jp-otaku'"));
  for (const form of ['jp-chemistry', 'jp-otaku']) {
    assert.ok(mainJs.includes(`form.dataset.form === '${form}'`), `${form} submit`);
  }
});

test('JPヘッダー — 韓国画面には小さな 🇯🇵 JP リンク、JP画面は日本語ヘッダー', () => {
  assert.ok(mainJs.includes('class="jp-link" href="#/jp"'), '한국 화면 JP 링크');
  assert.ok(mainJs.includes('if (isJpPath()) return jpHeaderHTML();'));
  assert.ok(mainJs.includes('jpFooterHTML()'));
  assert.ok(mainJs.includes('function isJpPath()'));
  /* JP 헤더에는 990원 상품·구슬 링크가 없다 */
  const header = mainJs.slice(mainJs.indexOf('function jpHeaderHTML'), mainJs.indexOf('function jpFooterHTML'));
  assert.ok(!header.includes('990'), 'JP헤더 가격 링크 없음');
  assert.ok(!header.includes('open-beads'), 'JP헤더 구슬 없음');
});

/* ────────────────────────────────────────────
   画像カード
   ──────────────────────────────────────────── */

test('画像カード — 1080×1350（4:5）・日本語フォント・@3F_Zanie 透かし', () => {
  assert.equal(JP_IMAGE.width, 1080);
  assert.equal(JP_IMAGE.height, 1350);
  assert.equal(cardJs.split("createElement('canvas')").length - 1, 1, 'キャンバスで描く');
  assert.ok(cardJs.includes('@3F_Zanie'), 'X アカウントの透かし');
  assert.ok(cardJs.includes('3階の屋根裏部屋の占い'));
  assert.ok(cardJs.includes('Hiragino Sans'), '日本語フォント');
  assert.ok(cardJs.includes('Hiragino Mincho ProN'));
  assert.ok(!cardJs.includes('사주보는 3층 다락방'), 'JPカードに韓国語ブランドを入れない');
  for (const kind of ['chemistry', 'otaku']) {
    assert.ok(cardJs.includes(`${kind}:`), `${kind} カードメタ`);
  }
  /* 描画は値だけを使い、画面キャプチャに依存しない */
  assert.ok(!cardJs.includes('html-to-image'));
  assert.ok(engineJs.includes('share'));
  assert.ok(contentJs.includes('#Zanie占い'));
});
