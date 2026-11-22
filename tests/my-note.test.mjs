// 내 다락방(#/my) 머리 안내 문구 — 2026-11-23 시연 님 요청
// 「내 기록과 구슬」 아래에 기록 지우기 전 이미지 저장 안내를 한 문장으로 짧게 붙인다.
// 화면 렌더(겹침·넘침)는 scripts/check-my-note.py 가 390px 브라우저로 확인한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mainJs = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

const MY_NOTE = '이 브라우저에만 저장되니, 기록을 지우기 전에 주문한 카드를 이미지로 저장해 두세요.';

const myHead = () => {
  const start = mainJs.indexOf('<h1>내 기록과 구슬</h1>');
  assert.ok(start > 0, '내 다락방 제목이 있다');
  return mainJs.slice(start, start + 700);
};

test('내 다락방 — 안내는 기록 지우기 전 이미지 저장까지 담은 한 문장이다', () => {
  const head = myHead();
  assert.ok(head.includes(MY_NOTE), '한 문장 안내 문구가 그대로 들어간다');
  assert.ok(!head.includes('기록 지우기를 누르면 모두 사라져요'), '예전 두 문장 안내는 남지 않는다');
});

test('내 다락방 — 안내 문단은 제목 아래 한 곳뿐이다 (겹치는 문단 없음)', () => {
  const head = myHead();
  const ps = head.match(/<p>/g) || [];
  assert.equal(ps.length, 1, `제목 아래 안내 문단 ${ps.length}개 (하나여야 한다)`);
  // 한 문장이라 모바일 390px 에서 두 줄 안쪽으로 들어간다
  assert.ok(MY_NOTE.length <= 50, `문장 길이 ${MY_NOTE.length}자 (짧게)`);
});
