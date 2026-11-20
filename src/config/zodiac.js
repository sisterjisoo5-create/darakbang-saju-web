// 12간지 캐릭터 — 자니를 필두로 한 다락방 친구들
// 이미지: public/images/zodiac/{key}-cut.webp (남색 잉크 · 투명 배경 · 320×320)
// 띠(년지) 동물과 1:1로 이어져, 원국 띠 안내 카드와 상품 카드 메달에 함께 쓰인다.
// 이름을 가진 캐릭터는 대표 캐릭터 '자니'(쥐)뿐이다.
// 나머지 띠는 별명 없이 '원숭이띠'·'말띠'처럼 기본 띠 이름으로만 부른다.
// 키는 동물 이름(ox·tiger·rabbit…)이고, 쥐만 대표 캐릭터 이름 'jani'를 쓴다.
//
// line     — 띠(년지) 키워드. 다른 화면에서 띠를 한 줄로 소개할 때 쓴다.
// iljuLine — 일주(일지) 동물의 특징. 무료 원국 '내 여덟 글자' 헤더에서
//            원형 배지(일주 동물 일러스트) 바로 아래에 동물 이름 없이 한 줄로 찍힌다.

import { asset } from './asset.js';

export const ZODIAC = [
  { key: 'jani', name: '자니', animal: '쥐', branch: '자', order: 1, line: '쟁여두는 재주, 눈치 빠른 첫째', iljuLine: '기회를 빠르게 포착하는 영민함' },
  { key: 'ox', animal: '소', branch: '축', order: 2, line: '묵묵히 쌓아 올리는 신뢰', iljuLine: '묵묵히 쌓아 올리는 신뢰' },
  { key: 'tiger', animal: '호랑이', branch: '인', order: 3, line: '등을 보게 하는 카리스마', iljuLine: '내 편을 위해 기꺼이 앞장서는 듬직한 온기' },
  { key: 'rabbit', animal: '토끼', branch: '묘', order: 4, line: '숨을 고르게 하는 다정함', iljuLine: '섬세한 감각과 유연한 적응력' },
  { key: 'dragon', animal: '용', branch: '진', order: 5, line: '큰일을 벌이는 스케일', iljuLine: '판을 흔드는 스케일과 카리스마' },
  { key: 'snake', animal: '뱀', branch: '사', order: 6, line: '말하지 않아도 장악하는 매혹', iljuLine: '깊은 통찰과 흔들리지 않는 집중력' },
  { key: 'horse', animal: '말', branch: '오', order: 7, line: '함께 있으면 빨라지는 시간', iljuLine: '망설임 없이 앞을 향해 내딛는 자유로움' },
  { key: 'sheep', animal: '양', branch: '미', order: 8, line: '감정을 짚어 주는 공감', iljuLine: '포근하게 감싸주는 온화함' },
  { key: 'monkey', animal: '원숭이', branch: '신', order: 9, line: '어떤 판에서도 답을 찾는 재치', iljuLine: '어떤 상황에서도 답을 찾는 재치와 기지' },
  { key: 'rooster', animal: '닭', branch: '유', order: 10, line: '손대면 정돈되는 기준', iljuLine: '흐트러짐 없는 예리한 성실함' },
  { key: 'dog', animal: '개', branch: '술', order: 11, line: '한번 정하면 끝까지 가는 의리', iljuLine: '한번 정하면 끝까지 가는 의리' },
  { key: 'pig', animal: '돼지', branch: '해', order: 12, line: '곁에 있으면 일이 풀리는 복', iljuLine: '꾸밈없는 진심으로 편안하게 만드는 여유' },
];

const byKey = Object.fromEntries(ZODIAC.map((z) => [z.key, z]));
const byAnimal = Object.fromEntries(ZODIAC.map((z) => [z.animal, z]));
const byBranch = Object.fromEntries(ZODIAC.map((z) => [z.branch, z]));

export const zodiacOf = (key) => byKey[key] || byKey.jani;
export const zodiacByAnimal = (animal) => byAnimal[animal] || byKey.jani;
/** 지지 → 동물. '축' 같은 한글 지지와 0~11 인덱스(사주의 branch 값) 둘 다 받는다. */
export const zodiacByBranch = (branch) => {
  if (typeof branch === 'number' && Number.isFinite(branch)) {
    return ZODIAC[((Math.trunc(branch) % 12) + 12) % 12] || byKey.jani;
  }
  return byBranch[branch] || byKey.jani;
};
export const zodiacImage = (key) => asset(`images/zodiac/${zodiacOf(key).key}-cut.webp`);

/** 일주 특징 한 줄 — 동물 이름 없이 특징만 */
export const iljuLineOf = (branch) => zodiacByBranch(branch).iljuLine;

/** 연도 → 그해 띠 동물 키 (2020 경자년=쥐, 2027 정미년=양, 2028 무신년=원숭이 …) */
export const yearAnimalKey = (year) => {
  const y = Number(year);
  if (!Number.isInteger(y)) return byKey.jani.key;
  return ZODIAC[(((y - 4) % 12) + 12) % 12].key;
};

/** 화면 표기 — 자니만 이름을 쓰고, 나머지 띠는 '원숭이띠' 같은 기본 띠 이름 */
export const zodiacLabel = (z) => z.name || `${z.animal}띠`;

/** 다락방 대표 캐릭터 — 12간지 첫 번째 쥐, 소원을 읽어 주는 자니 */
export const JANI = byKey.jani;
export const JANI_NAME = '다락방의 자니';
