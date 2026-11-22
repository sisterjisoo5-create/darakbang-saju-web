// 상품 정의 — 1구슬 = 990원
// hook: 카드에 두 줄로 들어가는 후킹 문구 (배열 두 개 = 두 줄)
// desc: 카드에 한 줄로 들어가는 상품 설명 (있는 상품만 표기)
// freeTag: '일부는 무료' | '점수는 무료' — 맛보기 성격을 알리는 필 배지
// char: 카드 상단 양피지 메달에 앉는 12간지 캐릭터 (src/config/zodiac.js)
import { yearAnimalKey } from './zodiac.js';

export const BEAD_PRICE = 990;

/* ── 신년 시즌 규칙 (시연 님 지시 2026-11-22) ──────────────────────
   · 11·12·1·2월 — 카드 이름 `{해} 신년 운세`, 1번 자리(=1번 카드).
     11~12월이면 다음 해(2026-11 → 2027), 1~2월이면 그해(2027-02 → 2027).
     메달 캐릭터는 그 해의 12간지 동물(2027 정미년 → 양, 2028 무신년 → 원숭이).
   · 3~10월 — 이름 `일년 운세`(연도 없이), 1번 자리는 정통 사주 해설과 맞교환.
   · 상품 내용(월별 열두 달)은 시즌과 무관하게 결제일 기준으로 움직인다. */
export const NEW_YEAR_MONTHS = [11, 12, 1, 2];

/** 그 달이 신년 시즌인가 (11·12·1·2월) */
export const isNewYearSeason = (month) => NEW_YEAR_MONTHS.includes(Number(month));

/** 신년 카드가 다루는 해 — 11~12월은 다음 해, 1~2월은 그해 */
export const newYearTargetYear = (year, month) =>
  (Number(month) === 11 || Number(month) === 12 ? Number(year) + 1 : Number(year));

/** 상품 카드·리포트 제목 — 신년 시즌 `2027 신년 운세`, 3~10월 `일년 운세` */
export const newYearName = (year, month) =>
  (isNewYearSeason(month) ? `${newYearTargetYear(year, month)} 신년 운세` : '일년 운세');

/** 카드 메달의 12간지 캐릭터 — 신년은 그 해 띠, 일년 운세도 그해 띠를 따른다 */
export const newYearChar = (year, month) =>
  yearAnimalKey(isNewYearSeason(month) ? newYearTargetYear(year, month) : Number(year));

// 구슬의 목적·용도와 구슬로 결제할 수 있는 상품 (PG 심사 요구 사항)
// 구슬 충전 모달 · FAQ · 상품 안내 · 이용약관 제2조·제7조 · 환불규정이 같은 문장을 쓴다.
export const BEAD_PURPOSE =
  '구슬은 사주보는 3층 다락방의 유료 사주 리포트를 열람하기 위한 전용 이용권(1구슬 = 990원)입니다.';
export const BEAD_USABLE_ITEMS = [
  { name: '정통 사주 해설', beads: 1 },
  { name: '1:1 사주 궁합', beads: 1 },
  { name: '최애궁합', beads: 1 },
  { name: '12띠 × 일주동물', beads: 1 },
  { name: '신년 운세', beads: 1 },
  { name: '대운 풀이', beads: 1 },
  { name: '연애운·사랑운', beads: 1 },
  { name: '재회운', beads: 1 },
  { name: '재물운', beads: 1 },
  { name: '자미두수 심층', beads: 1 },
  { name: '직업 · 이직운', beads: 1 },
  { name: '평생 종합 리포트', beads: 10 },
];
export const BEAD_USABLE_LIST = BEAD_USABLE_ITEMS.map((i) => `${i.name}(${i.beads}구슬)`).join(' · ');
export const BEAD_USABLE =
  `구슬로 결제 가능한 상품: ${BEAD_USABLE_LIST} 등 사이트 내 모든 유료 사주 리포트 12종에 사용할 수 있습니다.`;
export const BEAD_VALIDITY = '구슬의 유효기간은 결제일로부터 1년 이내입니다.';

export const BEAD_PACKS = [
  { id: 'bead-1', beads: 1, price: 990, label: '1구슬', note: '리포트 1건 — 사주·궁합·최애궁합·신년·대운·직업 중 1건' },
  { id: 'bead-5', beads: 5, price: 4900, label: '5구슬', note: '1구슬 리포트 5건 · 50원 할인' },
  { id: 'bead-10', beads: 10, price: 9900, label: '10구슬', note: '평생 종합 리포트 1건 또는 1구슬 리포트 10건' },
];

export const PRODUCTS = [
  {
    id: 'newyear',
    /* 기본값은 비시즌 이름 — 화면에 올릴 때 newYearName()이 그 달의 시즌 이름을 입힌다 */
    name: '일년 운세',
    hook: ['밀어붙일 달과 조심할 달,', '결제일부터 열두 달'],
    price: 990,
    beads: 1,
    badge: 'NEW!',
    freeTag: null,
    char: 'sheep', // 표시할 때 그 해 띠로 바뀐다 (newYearChar)
    requirePartner: false,
    features: ['세운 총평', '결제일부터 열두 달 흐름', '주의할 달 3곳', '재물·관계·일 포인트', '월별 실행 문장'],
  },
  {
    id: 'compat',
    name: '1:1 사주 궁합',
    hook: ['우리 사이는 몇 점?', '계속 갈 수 있는 인연일까'],
    price: 990,
    beads: 1,
    badge: null,
    freeTag: '점수는 무료',
    char: 'rabbit',
    requirePartner: true,
    features: ['오행 온도 비교', '궁합 점수 4축', '일간·일지 합충 분석', '자미두수 부처궁 교차', '갈등 지점과 처방'],
  },
  {
    id: 'zodiac-ilju',
    name: '12띠 × 일주동물',
    hook: ['내 띠와 나의 일주동물을 통해 보는', '겉과 속의 반전 매력'],
    price: 990,
    beads: 1,
    badge: 'NEW!',
    freeTag: '일부는 무료',
    char: 'monkey',
    requirePartner: false,
    features: ['내 띠 × 일주 동물 조합', '사람들이 보는 첫인상', '연애에서 드러나는 반전 매력', '이성에게 어필되는 포인트 3', '합·충·상생으로 본 인연의 띠'],
  },
  {
    id: 'bias',
    name: '최애궁합',
    hook: ['최애의 삼주육자부터', '우리의 첫 만남까지'],
    desc: '최애의 삼주육자, 찰떡 일주 TOP 3, 우리의 첫 만남 시나리오, 나랑 연애하면?까지 — 덕질 설렘으로 읽는 연애 궁합',
    price: 990,
    beads: 1,
    badge: 'NEW!',
    freeTag: '점수는 무료',
    char: 'horse',
    requirePartner: false,
    requireBias: true,
    features: ['최애의 삼주육자 읽기', '최애와 찰떡인 일주 TOP 3', '우리의 첫 만남 시나리오', '나랑 연애하면? 궁합 점수', '2026~2027 빛나는 달'],
  },
  {
    id: 'love',
    name: '연애운 · 사랑운',
    hook: ['썸·결혼운,', '내 짝이 언제 오는지'],
    price: 990,
    beads: 1,
    badge: null,
    freeTag: '일부는 무료',
    char: 'rooster',
    requirePartner: false,
    features: ['내 연애 온도', '끌리는 사람과 오래 가는 사람', '인연이 오는 시기', '배우자 자리 읽기', '연애 처방 3가지'],
  },
  {
    id: 'reunion',
    name: '재회운',
    hook: ['헤어진 그 사람,', '다시 만나는 게 정답일까'],
    price: 990,
    beads: 1,
    badge: null,
    freeTag: '점수는 무료',
    char: 'snake',
    requirePartner: false,
    features: ['재회 온도 점수', '헤어진 이유의 구조', '그 사람의 속마음', '다시 이어지는 시기', '정리하는 법'],
  },
  {
    id: 'jami',
    name: '자미두수 심층',
    hook: ['같은 여덟 글자, 다른 각도로', '숨은 내 모습 읽기'],
    desc: '사주가 재료라면, 자미두수는 그 재료가 놓인 자리를 보는 지도예요.',
    price: 990,
    beads: 1,
    badge: null,
    freeTag: '일부는 무료',
    char: 'tiger',
    requirePartner: false,
    features: ['명궁·신궁·오행국', '12궁 전체 읽기', '부처궁(배우자 자리)·자녀궁', '재백궁(돈)·관록궁(일)', '길성 지도와 함정'],
  },
  {
    id: 'career',
    name: '직업 · 이직운',
    hook: ['지금 회사에 남을까,', '옮길까 — 이직운 읽기'],
    price: 990,
    beads: 1,
    badge: 'NEW!',
    freeTag: '일부는 무료',
    char: 'dog',
    requirePartner: false,
    features: ['일의 그릇과 강점', '맞는 일의 판·직업군', '이직 타이밍과 조심할 달', '지금 대운의 일 흐름', '옮길까 남을까 체크리스트'],
  },
  {
    id: 'wealth',
    name: '재물운',
    hook: ['내 사주에 물 들어올 때,', '제대로 노 젓는 법'],
    price: 990,
    beads: 1,
    badge: null,
    freeTag: null,
    char: 'pig',
    requirePartner: false,
    features: ['재물 그릇 점수', '돈이 들어오는 통로', '새는 구멍 찾기', '물 들어오는 시기', '부자 되는 습관 5'],
  },
  {
    id: 'daewoon',
    name: '10년 대운 풀이',
    hook: ['농사처럼 보는 인생의 시간표,', '지금 무슨 계절인지'],
    price: 990,
    beads: 1,
    badge: null,
    freeTag: null,
    char: 'ox',
    requirePartner: false,
    features: ['대운수와 방향', '앞으로 6개 대운 표', '지금 대운의 의미', '청귤 같은 준비의 시기', '10년 실행 캘린더'],
  },
  {
    id: 'saju',
    name: '정통 사주 해설',
    hook: ['여덟 글자로 읽는', '성격과 흐름'],
    price: 990,
    beads: 1,
    badge: '인기',
    freeTag: '일부는 무료',
    char: 'jani',
    requirePartner: false,
    features: ['내 원국 8글자 상세', '성격 3단 분석', '재물 그릇과 새는 곳', '직업 적성과 일하는 방식', '연애 패턴과 배우자상'],
  },
  {
    id: 'lifetime',
    name: '평생 종합 리포트',
    hook: ['태어나서 백발까지,', '다락방의 제일 두꺼운 책'],
    price: 9900,
    beads: 10,
    badge: '추천',
    freeTag: null,
    char: 'dragon',
    requirePartner: false,
    features: ['정통 사주 해설 전체', '성격·재물·일·연애', '자미두수 명궁·부처궁·재백궁', '앞으로 열두 달 월별', '10년 대운 타임라인', '평생 요약 한 장'],
  }
];

/** 상품 하나 — 신년 카드는 그 달(now)의 시즌 이름·띠로 채워 돌려준다 */
export const productById = (id, now = new Date()) => {
  const p = PRODUCTS.find((x) => x.id === id);
  if (!p || p.id !== 'newyear') return p;
  return { ...p, name: newYearName(kstYear(now), kstMonth(now)), char: newYearChar(kstYear(now), kstMonth(now)) };
};
export const won = (n) => `${n.toLocaleString('ko-KR')}원`;
export const beadLabel = (n) => `${n}구슬`;

/* ── 달력에 따라 바뀌는 카드 순서 ──────────────────────────
   11~2월(연말·연초) — 1번 카드 = 신년 운세, 마지막 줄 왼쪽 = 정통 사주 해설
   3~10월           — 1번 카드 = 정통 사주 해설, 마지막 줄 왼쪽 = 일년 운세
   두 카드는 서로 자리만 맞바꾸고, 나머지 카드의 순서는 어느 달에도 같다. */
export const NEWYEAR_FIRST_MONTHS = NEW_YEAR_MONTHS;

/** 달에 맞는 카드 순서 (시즌 이름·캐릭터는 입히지 않은 원본 순서) */
const orderedForMonth = (m) => {
  const newyearFirst = isNewYearSeason(m);
  const baseIsNewyearFirst = PRODUCTS[0].id === 'newyear';
  if (newyearFirst === baseIsNewyearFirst) return PRODUCTS;
  const out = [...PRODUCTS];
  const iNew = out.findIndex((p) => p.id === 'newyear');
  const iSaju = out.findIndex((p) => p.id === 'saju');
  if (iNew < 0 || iSaju < 0) return PRODUCTS;
  [out[iNew], out[iSaju]] = [out[iSaju], out[iNew]];
  return out;
};

/** 그 달의 카드 목록 — 순서 + 신년 카드의 시즌 이름·띠 (해는 now에서) */
export const getProductsForMonth = (month, now = new Date()) => {
  const m = Number(month);
  if (!Number.isInteger(m) || m < 1 || m > 12) return PRODUCTS;
  const year = kstYear(now);
  return orderedForMonth(m).map((p) =>
    (p.id === 'newyear' ? { ...p, name: newYearName(year, m), char: newYearChar(year, m) } : p));
};

/** 한국 시간(KST) 기준 이번 해 */
export const kstYear = (now = new Date()) => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric' }).formatToParts(now);
    const year = parts.find((p) => p.type === 'year');
    if (year) return Number(year.value);
  } catch (e) {
    /* Intl 시간대를 못 쓰는 환경은 기기 시간으로 대신한다 */
  }
  return now.getFullYear();
};

/** 한국 시간(KST) 기준 이번 달 1~12 */
export const kstMonth = (now = new Date()) => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', month: 'numeric' }).formatToParts(now);
    const month = parts.find((p) => p.type === 'month');
    if (month) return Number(month.value);
  } catch (e) {
    /* Intl 시간대를 못 쓰는 환경은 기기 시간으로 대신한다 */
  }
  return now.getMonth() + 1;
};

/** 지금(KST) 달에 맞는 상품 카드 순서 + 시즌 이름·캐릭터 */
export const productsForCurrentMonth = (now = new Date()) => getProductsForMonth(kstMonth(now), now);

/** 지금(KST)의 신년 시즌 상태 — 테스트·검수에서 한 번에 확인한다 */
export const newYearSeasonOf = (now = new Date()) => {
  const year = kstYear(now);
  const month = kstMonth(now);
  return {
    year,
    month,
    season: isNewYearSeason(month),
    targetYear: newYearTargetYear(year, month),
    name: newYearName(year, month),
    char: newYearChar(year, month),
  };
};
