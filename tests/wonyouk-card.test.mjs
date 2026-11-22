// 원국 4기둥 카드 통일 · 한 줄 요약 — 회귀 테스트
// 신년운세 카드에서 표(구분·간지·한자·십성·결)와 보라색 3칸 카드를 걷어내고,
// 무료 원국(#/free)과 **같은 4기둥 카드 + 결**을 쓰고 사주 온도·띠×일주·절기를 한 줄로 붙인다.
// 실행: npm test

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeChart } from '../src/engine/saju.js';
import { buildReport } from '../src/content/report.js';
import { wonyoukCardHTML, wonyoukCells, wonyoukLineHTML } from '../src/content/wonyouk-card.js';

const ME = { calendar: 'solar', year: 1991, month: 5, day: 7, hour: 18, minute: 22,
  timeUnknown: false, gender: 'female', leap: false };
const NO_HOUR = { calendar: 'solar', year: 1992, month: 10, day: 15, timeUnknown: true, gender: 'female' };

function chartOf(input) {
  const c = computeChart(input);
  assert.equal(c.ok, true, (c.errors || []).join(', '));
  return c;
}

function wonyoukSection(productId) {
  const chart = chartOf(ME);
  const report = buildReport(productId, chart, {});
  return { chart, section: report.sections.find((s) => s.id === 'wonyouk') };
}

test('원국 카드 — 년주·월주·일주·시주 4칸이고 결은 천간 색 + 지지 동물이다', () => {
  const chart = chartOf(ME);
  const cells = wonyoukCells(chart);
  assert.deepEqual(cells.map((c) => c.label), ['년주', '월주', '일주', '시주']);
  assert.deepEqual(cells.map((c) => c.stem), ['신', '계', '정', '기']);
  assert.deepEqual(cells.map((c) => c.branch), ['미', '사', '축', '유']);
  assert.deepEqual(cells.map((c) => c.han), ['辛未', '癸巳', '丁丑', '己酉']);
  assert.deepEqual(cells.map((c) => c.ss), ['편재', '편관', '나 · 일간', '식신']);
  assert.deepEqual(cells.map((c) => c.el), ['금·토', '수·화', '화·토', '토·금']);
  assert.deepEqual(cells.map((c) => c.gyeol), ['하얀 양', '검은 뱀', '붉은 소', '노란 닭']);
  assert.equal(cells.filter((c) => c.day).length, 1, '일주 칸만 강조');
});

test('원국 카드 HTML — 결이 기둥 맨 아래에 붙고 일주 칸만 골드 강조다', () => {
  const html = wonyoukCardHTML(chartOf(ME));
  assert.equal((html.match(/class="ming__cell/g) || []).length, 4);
  assert.equal((html.match(/ming__cell--day/g) || []).length, 1);
  assert.equal((html.match(/class="ming__gyeol"/g) || []).length, 4, '기둥마다 결');
  for (const g of ['하얀 양', '검은 뱀', '붉은 소', '노란 닭']) {
    assert.ok(html.includes(`<div class="ming__gyeol">${g}</div>`), `결 ${g}`);
  }
  // 결은 오행(.ming__el) 다음, 칸 맨 아래
  assert.ok(html.indexOf('ming__el') < html.indexOf('ming__gyeol'), '결은 오행 아래');
});

test('생시를 모르면 시주 칸은 시간 미상이고 결을 만들지 않는다', () => {
  const cells = wonyoukCells(chartOf(NO_HOUR));
  assert.equal(cells[3].han, '시간 미상');
  assert.equal(cells[3].gyeol, '');
  const html = wonyoukCardHTML(chartOf(NO_HOUR));
  assert.equal((html.match(/class="ming__gyeol"/g) || []).length, 3);
});

test('신년운세 「내 원국 여덟 글자」 — 표·kv 카드 대신 4기둥 카드와 한 줄 요약만 쓴다', () => {
  const { section } = wonyoukSection('newyear');
  assert.ok(section, '원국 섹션이 있다');
  assert.equal(section.blocks.some((b) => b.t === 'table'), false, '표를 쓰지 않는다');
  assert.equal(section.blocks.some((b) => b.t === 'kv'), false, '3칸 kv 카드를 쓰지 않는다');
  assert.equal(section.blocks[0].t, 'ming', '첫 블록은 4기둥 카드');
  assert.equal(section.blocks[1].t, 'oneline', '바로 아래 한 줄 요약');
  assert.deepEqual(section.blocks[1].v, [
    '25.6°C · 따뜻한 사주',
    '양띠 × 붉은 소',
    '입하 이후 — 계사월',
  ]);
  assert.equal(section.blocks[2].t, 'q', '일간 인용은 그대로');
  assert.ok(section.blocks[2].v.includes('일간은 정(丁)'), section.blocks[2].v);
});

test('한 줄 요약 HTML — 값 셋이 한 줄(구분선)로 붙고 <br>·줄바꿈이 없다', () => {
  const html = wonyoukLineHTML(['25.6°C · 따뜻한 사주', '양띠 × 붉은 소', '입하 이후 — 계사월']);
  assert.ok(html.startsWith('<div class="wy-line">'), html.slice(0, 40));
  assert.equal((html.match(/class="wy-line__item"/g) || []).length, 3);
  assert.equal(html.includes('<br'), false);
  assert.ok(html.includes('25.6°C · 따뜻한 사주'));
  assert.ok(html.includes('입하 이후 — 계사월'));
  assert.equal(wonyoukLineHTML([]), '', '값이 없으면 그리지 않는다');
});

test('기본·신년·대운·평생 리포트가 모두 같은 4기둥 카드 + 한 줄 요약을 쓴다', () => {
  for (const id of ['saju', 'newyear', 'daewoon', 'lifetime']) {
    const { section } = wonyoukSection(id);
    assert.ok(section, `${id} — 원국 섹션`);
    assert.equal(section.blocks[0].t, 'ming', `${id} — 4기둥 카드`);
    assert.equal(section.blocks[1].t, 'oneline', `${id} — 한 줄 요약`);
    assert.equal(section.blocks.some((b) => b.t === 'table' || b.t === 'kv'), false, `${id} — 표·kv 없음`);
    assert.deepEqual(section.blocks[1].v, ['25.6°C · 따뜻한 사주', '양띠 × 붉은 소', '입하 이후 — 계사월']);
  }
});

test('무료 원국과 유료 리포트는 한 함수로 그린다 — 같은 사주면 마크업이 같다', () => {
  const chart = chartOf(ME);
  const free = wonyoukCardHTML(chart);
  const paid = buildReport('newyear', chart, {}).sections.find((s) => s.id === 'wonyouk').blocks[0].chart;
  assert.equal(paid, chart, '리포트 블록은 같은 chart 를 들고 있다');
  assert.equal(wonyoukCardHTML(paid), free);
  assert.ok(free.includes('나 · 일간'), '십성 표기 통일(나 · 일간)');
});
