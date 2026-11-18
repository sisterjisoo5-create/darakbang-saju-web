// 12간지 캐릭터 — 자니를 필두로 한 다락방 친구들
// 이미지: public/images/zodiac/{key}-cut.webp (남색 잉크 · 투명 배경 · 320×320)
// 띠(년지) 동물과 1:1로 이어져, 원국 띠 안내 카드와 상품 카드 메달에 함께 쓰인다.
// 이름을 가진 캐릭터는 대표 캐릭터 '자니'(쥐)뿐이다.
// 나머지 띠는 별명 없이 '원숭이띠'·'말띠'처럼 기본 띠 이름으로만 부른다.

import { asset } from './asset.js';

export const ZODIAC = [
  { key: 'jani', name: '자니', animal: '쥐', branch: '자', order: 1, line: '쟁여두는 재주, 눈치 빠른 첫째' },
  { key: 'uni', animal: '소', branch: '축', order: 2, line: '묵묵히 쌓아 올리는 신뢰' },
  { key: 'honi', animal: '호랑이', branch: '인', order: 3, line: '등을 보게 하는 카리스마' },
  { key: 'toni', animal: '토끼', branch: '묘', order: 4, line: '숨을 고르게 하는 다정함' },
  { key: 'yongi', animal: '용', branch: '진', order: 5, line: '큰일을 벌이는 스케일' },
  { key: 'sani', animal: '뱀', branch: '사', order: 6, line: '말하지 않아도 장악하는 매혹' },
  { key: 'mani', animal: '말', branch: '오', order: 7, line: '함께 있으면 빨라지는 시간' },
  { key: 'yangni', animal: '양', branch: '미', order: 8, line: '감정을 짚어 주는 공감' },
  { key: 'woni', animal: '원숭이', branch: '신', order: 9, line: '어떤 판에서도 답을 찾는 재치' },
  { key: 'dakni', animal: '닭', branch: '유', order: 10, line: '손대면 정돈되는 기준' },
  { key: 'gaeni', animal: '개', branch: '술', order: 11, line: '한번 정하면 끝까지 가는 의리' },
  { key: 'dweni', animal: '돼지', branch: '해', order: 12, line: '곁에 있으면 일이 풀리는 복' },
];

const byKey = Object.fromEntries(ZODIAC.map((z) => [z.key, z]));
const byAnimal = Object.fromEntries(ZODIAC.map((z) => [z.animal, z]));
const byBranch = Object.fromEntries(ZODIAC.map((z) => [z.branch, z]));

export const zodiacOf = (key) => byKey[key] || byKey.jani;
export const zodiacByAnimal = (animal) => byAnimal[animal] || byKey.jani;
export const zodiacByBranch = (branch) => byBranch[branch] || byKey.jani;
export const zodiacImage = (key) => asset(`images/zodiac/${zodiacOf(key).key}-cut.webp`);

/** 화면 표기 — 자니만 이름을 쓰고, 나머지 띠는 '원숭이띠' 같은 기본 띠 이름 */
export const zodiacLabel = (z) => z.name || `${z.animal}띠`;

/** 다락방 대표 캐릭터 — 12간지 첫 번째 쥐, 소원을 읽어 주는 자니 */
export const JANI = byKey.jani;
export const JANI_NAME = '다락방의 자니';
