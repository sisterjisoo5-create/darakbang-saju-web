// 사주 · 자미두수 기본 상수 (천간 · 지지 · 오행 · 십성 · 띠)

export const STEMS = [
  { ko: '갑', han: '甲', ohaeng: '목', yang: true, color: '청', colorAdj: '푸른' },
  { ko: '을', han: '乙', ohaeng: '목', yang: false, color: '청', colorAdj: '푸른' },
  { ko: '병', han: '丙', ohaeng: '화', yang: true, color: '적', colorAdj: '붉은' },
  { ko: '정', han: '丁', ohaeng: '화', yang: false, color: '적', colorAdj: '붉은' },
  { ko: '무', han: '戊', ohaeng: '토', yang: true, color: '황', colorAdj: '노란' },
  { ko: '기', han: '己', ohaeng: '토', yang: false, color: '황', colorAdj: '노란' },
  { ko: '경', han: '庚', ohaeng: '금', yang: true, color: '백', colorAdj: '하얀' },
  { ko: '신', han: '辛', ohaeng: '금', yang: false, color: '백', colorAdj: '하얀' },
  { ko: '임', han: '壬', ohaeng: '수', yang: true, color: '흑', colorAdj: '검은' },
  { ko: '계', han: '癸', ohaeng: '수', yang: false, color: '흑', colorAdj: '검은' },
];

export const BRANCHES = [
  { ko: '자', han: '子', ohaeng: '수', animal: '쥐', yang: true, season: '겨울' },
  { ko: '축', han: '丑', ohaeng: '토', animal: '소', yang: false, season: '겨울' },
  { ko: '인', han: '寅', ohaeng: '목', animal: '호랑이', yang: true, season: '봄' },
  { ko: '묘', han: '卯', ohaeng: '목', animal: '토끼', yang: false, season: '봄' },
  { ko: '진', han: '辰', ohaeng: '토', animal: '용', yang: true, season: '봄' },
  { ko: '사', han: '巳', ohaeng: '화', animal: '뱀', yang: false, season: '여름' },
  { ko: '오', han: '午', ohaeng: '화', animal: '말', yang: true, season: '여름' },
  { ko: '미', han: '未', ohaeng: '토', animal: '양', yang: false, season: '여름' },
  { ko: '신', han: '申', ohaeng: '금', animal: '원숭이', yang: true, season: '가을' },
  { ko: '유', han: '酉', ohaeng: '금', animal: '닭', yang: false, season: '가을' },
  { ko: '술', han: '戌', ohaeng: '토', animal: '개', yang: true, season: '가을' },
  { ko: '해', han: '亥', ohaeng: '수', animal: '돼지', yang: false, season: '겨울' },
];

/** 시지(時支) 한자 ↔ 인덱스 */
export const HOUR_BRANCH_LABEL = ['자시', '축시', '인시', '묘시', '진시', '사시', '오시', '미시', '신시', '유시', '술시', '해시'];

export const OHAENG = ['목', '화', '토', '금', '수'];

export const OHAENG_META = {
  목: { han: '木', hex: '#7BA88B', keyword: '뻗어 나가는 성장', color: '연둣빛', season: '봄', organ: '간·눈' },
  화: { han: '火', hex: '#D08063', keyword: '드러나게 빛나는 열기', color: '붉은빛', season: '여름', organ: '심장·혈액' },
  토: { han: '土', hex: '#C2A05F', keyword: '담아내고 버티는 중심', color: '황금빛', season: '환절기', organ: '위장·근육' },
  금: { han: '金', hex: '#AEB6C2', keyword: '잘라내고 정돈하는 결단', color: '흰빛', season: '가을', organ: '폐·피부' },
  수: { han: '水', hex: '#6E8FC9', keyword: '스며들어 흐르는 지혜', color: '푸른빛', season: '겨울', organ: '콩팥·방광' },
};

/** 오행 상생상극 */
export const SANGSAENG = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' };
export const SANGGEUK = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' };
export const GENERATED_BY = { 화: '목', 토: '화', 금: '토', 수: '금', 목: '수' };

export const SIPSUNG = {
  비견: { ko: '비견', han: '比肩', tag: '나와 같은 기운 · 동료' },
  겁재: { ko: '겁재', han: '劫財', tag: '나와 같은 기운 · 승부' },
  식신: { ko: '식신', han: '食神', tag: '내가 낳는 기운 · 표현' },
  상관: { ko: '상관', han: '傷官', tag: '내가 낳는 기운 · 비판' },
  편재: { ko: '편재', han: '偏財', tag: '내가 다루는 기운 · 유동 재물' },
  정재: { ko: '정재', han: '正財', tag: '내가 다루는 기운 · 고정 재물' },
  편관: { ko: '편관', han: '偏官', tag: '나를 누르는 기운 · 추진' },
  정관: { ko: '정관', han: '正官', tag: '나를 누르는 기운 · 질서' },
  편인: { ko: '편인', han: '偏印', tag: '나를 낳는 기운 · 직관' },
  정인: { ko: '정인', han: '正印', tag: '나를 낳는 기운 · 학습' },
};

export const TTEE_CONFIG = {
  자: '쥐', 축: '소', 인: '호랑이', 묘: '토끼', 진: '용', 사: '뱀',
  오: '말', 미: '양', 신: '원숭이', 유: '닭', 술: '개', 해: '돼지',
};

export const GENDER = { female: '여', male: '남' };

/** 60갑자 납음 오행 (자미두수 오행국 산출용) */
export const NAEUM = [
  '금', '금', '화', '화', '목', '목', '토', '토', '금', '금',
  '화', '화', '수', '수', '토', '토', '금', '금', '목', '목',
  '수', '수', '토', '토', '화', '화', '목', '목', '수', '수',
  '금', '금', '화', '화', '목', '목', '토', '토', '금', '금',
  '화', '화', '수', '수', '토', '토', '금', '금', '목', '목',
  '수', '수', '토', '토', '화', '화', '목', '목', '수', '수',
];

export const NAEUM_NAME = [
  '해중금', '해중금', '노중화', '노중화', '대림목', '대림목', '노방토', '노방토', '검봉금', '검봉금',
  '산두화', '산두화', '간하수', '간하수', '성두토', '성두토', '백랍금', '백랍금', '양류목', '양류목',
  '천중수', '천중수', '옥상토', '옥상토', '벽력화', '벽력화', '송백목', '송백목', '장류수', '장류수',
  '사중금', '사중금', '산하화', '산하화', '평지목', '평지목', '벽상토', '벽상토', '금박금', '금박금',
  '복등화', '복등화', '천하수', '천하수', '대역토', '대역토', '채천금', '채천금', '상자목', '상자목',
  '대계수', '대계수', '사중토', '사중토', '천상화', '천상화', '석류목', '석류목', '대해수', '대해수',
];

/** 명궁 간지의 납음 오행 → 자미두수 오행국 */
export const OHAENG_GUK = { 수: 2, 목: 3, 금: 4, 토: 5, 화: 6 };
export const GUK_NAME = { 2: '수이국', 3: '목삼국', 4: '금사국', 5: '토오국', 6: '화육국' };
export const GUK_HAN = { 2: '水二局', 3: '木三局', 4: '金四局', 5: '土五局', 6: '火六局' };
export const GUK_ELEM = { 2: '수', 3: '목', 4: '금', 5: '토', 6: '화' };

/** 자미두수 12궁 (명궁부터 지지 역방향으로 배치) */
export const JAMI_PALACES = [
  '명궁', '형제궁', '부처궁', '자녀궁', '재백궁', '질액궁',
  '천이궁', '노복궁', '관록궁', '전택궁', '복덕궁', '부모궁',
];

export const JAMI_STARS = ['자미', '천기', '태양', '무곡', '천동', '염정', '천부', '태음', '탐랑', '거문', '천상', '천량', '칠살', '파군'];

export const JAMI_LUCKY = ['좌보', '우필', '문창', '문곡', '천괴', '천월', '녹존', '천양', '타라'];

/** 사화(四化) — 해마다 바뀌는 별의 네 가지 변화. 값은 년간(年干) 기준. */
export const SAHWA_TYPE = {
  록: { han: '祿', label: '록', mean: '이득·재물이 붙는 자리' },
  권: { han: '權', label: '권', mean: '힘·주도권이 붙는 자리' },
  과: { han: '科', label: '과', mean: '이름·명예가 붙는 자리' },
  기: { han: '忌', label: '기', mean: '걸림·집착이 붙는 자리' },
};

/** 년간별 사화 — [록, 권, 과, 기] */
export const JAMI_SAHWA = {
  갑: ['염정', '파군', '무곡', '태양'],
  을: ['천기', '천량', '자미', '태음'],
  병: ['천동', '천기', '문창', '염정'],
  정: ['태음', '천동', '천기', '거문'],
  무: ['탐랑', '태음', '우필', '천기'],
  기: ['무곡', '탐랑', '천량', '문곡'],
  경: ['태양', '무곡', '태음', '천동'],
  신: ['거문', '태양', '문곡', '문창'],
  임: ['천량', '자미', '좌보', '무곡'],
  계: ['파군', '거문', '태음', '탐랑'],
};

/** 명주(命主) — 명궁이 앉은 지지로 정해진다 */
export const JAMI_MYEONGJU = ['탐랑', '거문', '녹존', '문곡', '염정', '무곡', '파군', '무곡', '염정', '문곡', '녹존', '거문'];

/** 신주(身主) — 태어난 해의 지지로 정해진다 */
export const JAMI_SINJU = ['화성', '천상', '천량', '천동', '문창', '천기', '화성', '천상', '천량', '천동', '문창', '천기'];

/** 12궁이 맡은 생활 영역 — 명반 칸에 붙는 짧은 키워드 */
export const JAMI_PALACE_ROLE = {
  명궁: '나',
  형제궁: '형제·친구',
  부처궁: '배우자·인연',
  자녀궁: '자녀·창작',
  재백궁: '재물·돈그릇',
  질액궁: '건강·몸',
  천이궁: '이동·바깥',
  노복궁: '사람·인연',
  관록궁: '일·직업',
  전택궁: '집·재산',
  복덕궁: '마음·향유',
  부모궁: '부모·윗사람',
};

/** 사화 표기 순서 */
export const SAHWA_ORDER = ['록', '권', '과', '기'];

export const BRANCH_HAN = BRANCHES.map((b) => b.han);
export const STEM_HAN = STEMS.map((s) => s.han);

export function stemOf(index) {
  return STEMS[((index % 10) + 10) % 10];
}
export function branchOf(index) {
  return BRANCHES[((index % 12) + 12) % 12];
}
export function ganjiName(stemIndex, branchIndex) {
  return `${stemOf(stemIndex).ko}${branchOf(branchIndex).ko}`;
}
export function ganjiHan(stemIndex, branchIndex) {
  return `${stemOf(stemIndex).han}${branchOf(branchIndex).han}`;
}
