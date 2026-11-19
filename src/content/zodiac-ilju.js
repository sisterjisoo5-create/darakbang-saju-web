// 12띠 × 일주 동물 — 겉으로 보이는 띠의 첫인상 × 속마음·연애에서 드러나는 일주 동물의 반전 매력
//
// · 년지(태어난 해) 동물 = 사람들이 처음 보는 얼굴 / 일지(태어난 날) 동물 = 가까워질수록 드러나는 얼굴
// · 두 지지의 관계(같은 동물·육합·삼합·충·형·파·원진·무관)와 오행 관계(상생·같은 기운·상극)를
//   쉬운 연애·매력 언어로 풀어, 12 × 12 = 144 조합이 서로 다른 문장이 되게 조립한다.
// · 모든 문장은 이 파일의 표에서만 나오며, 같은 입력이면 언제나 같은 결과(결정론적)다.

import { BRANCHES, SANGSAENG, SANGGEUK } from '../engine/constants.js';
import { branchRelation, withJosa } from '../engine/compat.js';

/* ────────────────────────────────────────────
   겉으로 보이는 띠 — 년지 동물의 첫인상
   ──────────────────────────────────────────── */
export const YEAR_FACE = {
  자: {
    animal: '쥐',
    face: '야무진 관찰자',
    look: '처음 만나면 말수가 적고 눈이 먼저 움직여요. 상대가 어떤 사람인지 금방 파악하고, 분위기에 맞춰 한 발짝씩 다가가는 사람이에요. 그래서 사람들은 당신을 "영리하고 챙길 줄 아는 사람"으로 기억해요.',
    appeal: '눈치 빠른 관찰과 알뜰한 손길 — 이성이 "이 사람과 있으면 생활이 편해지겠다"고 느끼는 첫인상이에요.',
  },
  축: {
    animal: '소',
    face: '묵직한 신뢰',
    look: '말보다 행동이 먼저 나오는 사람이에요. 처음에는 무뚝뚝해 보이지만, 한 번 약속한 건 조용히 지키고 끝까지 자리를 지켜요. 그래서 시간이 지날수록 "저 사람은 믿을 수 있다"는 말을 듣습니다.',
    appeal: '흔들리지 않는 자리 — 이성이 불안한 날 돌아보게 되는 사람이 바로 이 첫인상의 주인공이에요.',
  },
  인: {
    animal: '호랑이',
    face: '당당한 직진',
    look: '들어서는 순간 공기가 바뀌는 사람이에요. 눈을 피하지 않고, 하고 싶은 말을 정면으로 해요. 사람들은 당신에게 끌리면서도 살짝 긴장해요.',
    appeal: '"이 사람은 나를 심심하게 만들지 않겠다"는 확신 — 첫인상만으로 설렘을 만드는 타입이에요.',
  },
  묘: {
    animal: '토끼',
    face: '다정한 공기',
    look: '목소리가 낮고 말이 부드러워요. 상대의 기분을 먼저 살피고, 불편한 자리를 조용히 정리해 줘요. 처음 만난 사람도 당신 앞에서는 어깨에서 힘이 빠져요.',
    appeal: '곁에 있으면 숨이 편해지는 다정함 — 이성이 "이 사람에게는 약한 모습을 보여도 되겠다"고 느끼는 지점이에요.',
  },
  진: {
    animal: '용',
    face: '큰 스케일',
    look: '사소한 이야기보다 큰 그림을 꺼내는 사람이에요. 야망이 크고 자신감이 있어서, 처음 만난 자리에서도 "이 사람은 뭔가 다르다"는 인상을 남겨요.',
    appeal: '판을 키우는 자신감 — 이성이 당신과 있으면 자기 인생도 조금 커질 것 같다고 상상하게 돼요.',
  },
  사: {
    animal: '뱀',
    face: '은근한 아우라',
    look: '말을 아끼는데 눈은 다 알고 있는 사람이에요. 웃는 얼굴 뒤에 계산이 있고, 그 계산이 사람을 다치게 하지 않아요. 사람들은 당신을 "알 듯 말 듯해서 더 궁금한 사람"으로 기억해요.',
    appeal: '말하지 않아도 흐르는 긴장 — 이성이 먼저 다가와서 알아보고 싶어지는 첫인상이에요.',
  },
  오: {
    animal: '말',
    face: '시원한 에너지',
    look: '빠르고 밝고 솔직해요. 좋으면 좋다, 싫으면 싫다가 얼굴에 다 써 있어서 사람들이 당신 곁에서 답답함을 느끼지 않아요.',
    appeal: '함께 있으면 하루가 빨라지는 활기 — 이성이 "이 사람과 있으면 심심할 틈이 없다"고 느끼는 지점이에요.',
  },
  미: {
    animal: '양',
    face: '포근한 공감',
    look: '남의 서운함을 먼저 알아채는 사람이에요. 따뜻하고 분위기를 부드럽게 만드는 힘이 있어서, 처음 만난 사람도 당신에게 속얘기를 꺼내요.',
    appeal: '나를 알아봐 주는 공감 — 이성이 "이 사람에게는 말해도 되겠다"고 마음을 여는 지점이에요.',
  },
  신: {
    animal: '원숭이',
    face: '재빠른 재치',
    look: '말이 빠르고 임기응변이 좋아요. 어색한 자리도 한마디로 웃기고, 어떤 판에서도 답을 찾아요. 사람들은 당신을 "재미있고 똑똑한 사람"으로 기억해요.',
    appeal: '웃기면서도 똑똑한 대화 — 이성이 "이 사람과는 대화가 끝나지 않겠다"고 느끼는 지점이에요.',
  },
  유: {
    animal: '닭',
    face: '반듯한 기준',
    look: '깔끔하고 정확해요. 옷차림, 말투, 시간 약속 하나까지 흐트러짐이 없고, 손대는 일마다 정돈돼 보여요. 처음 만나면 "관리 잘하는 사람"이라는 인상을 줘요.',
    appeal: '자기 관리를 게을리하지 않는 단정함 — 이성이 안심하고 신뢰를 보내는 첫인상이에요.',
  },
  술: {
    animal: '개',
    face: '한결같은 의리',
    look: '처음엔 조금 거칠어 보여도, 정이 들면 끝까지 가는 사람이에요. 약속을 어기는 사람을 싫어하고, 한 번 편든 사람은 오래 챙겨요.',
    appeal: '배신하지 않을 것 같은 눈빛 — 이성이 "이 사람은 나를 두고 가지 않겠다"고 느끼는 지점이에요.',
  },
  해: {
    animal: '돼지',
    face: '넉넉한 복',
    look: '느긋하고 웃음이 많아요. 크게 따지지 않고 먼저 양보하는데, 이상하게 좋은 사람과 좋은 일이 당신 쪽으로 와요. 사람들은 당신을 "복 많은 사람"이라고 말해요.',
    appeal: '함께 있으면 일이 풀리는 여유 — 이성이 당신 곁에서 긴장을 내려놓는 매력이에요.',
  },
};

/* ────────────────────────────────────────────
   속마음·연애에서 드러나는 반전 매력 — 일지 동물
   ──────────────────────────────────────────── */
export const DAY_HEART = {
  자: {
    animal: '쥐',
    name: '몰래 계산하는 승부사',
    heart: '겉으로는 쿨해 보여도, 마음속엔 상대의 말과 행동을 하나하나 저장해 두는 사람이에요. 연애에서도 손해 보는 선택을 싫어하고, "이 사람이 나를 진짜 아끼는가"를 조용히 시험해요.',
    love: '좋아하면 상대의 생활 패턴을 다 알아 두고 필요한 것만 챙겨 줘요. 다정함이 크게 보이지 않아서 오해받기도 하지만, 그 챙김이 이 사람의 애정 표현이에요.',
    appeal: '아무도 모르게 챙겨 주는 디테일 — 알아차린 사람만 빠져드는 매력이에요.',
  },
  축: {
    animal: '소',
    name: '끝까지 가는 고집',
    heart: '연애를 시작하는 데는 오래 걸리지만, 시작하면 좀처럼 손을 떼지 않아요. 감정을 말로 잘 풀지 않아서 답답해 보이지만, 속으로는 상대와의 앞날을 오래 계산하고 있어요.',
    love: '기념일보다 매일의 약속을 지키는 쪽이에요. 싸우면 먼저 사과를 못 해서 손해를 보는데, 정말 떠날 수 없는 자리에서는 반드시 다시 돌아옵니다.',
    appeal: '느리지만 흔들리지 않는 마음 — 한 번 내 사람이 되면 끝까지 지켜 준다는 확신이에요.',
  },
  인: {
    animal: '호랑이',
    name: '숨기지 못하는 직진',
    heart: '겉보다 속이 더 뜨거워요. 좋아지면 바로 티가 나고, 질투도 숨기지 못한 채 "나 지금 좀 서운해요"가 얼굴에 써 있어요.',
    love: '밀당을 못 하는 게 아니라 안 하는 편이에요. 마음을 숨기다 지치느니 먼저 고백하는 쪽이고, 상대가 흔들리는 모습을 보면 오히려 더 확실하게 밀어붙여요.',
    appeal: '애매하게 굴지 않는 확신 — "이 사람은 나를 좋아한다"를 의심할 틈이 없는 매력이에요.',
  },
  묘: {
    animal: '토끼',
    name: '조용한 눈치꾼',
    heart: '겉은 부드러운데, 속은 상대의 말 한마디를 오래 곱씹는 사람이에요. 좋아하는 사람 앞에서만 유난히 조심스러워지고, 먼저 다가가기보다 상대가 오길 기다려요.',
    love: '연애에서는 다정함이 먼저예요. 다만 서운한 걸 말하지 않고 쌓아 두었다가, 어느 순간 조용히 멀어지는 게 이 사람의 위험한 습관이에요.',
    appeal: '나를 먼저 알아봐 주길 바라는 눈빛 — 그 눈빛을 알아챈 사람은 깊이 빠져들어요.',
  },
  진: {
    animal: '용',
    name: '숨은 자존심',
    heart: '겉은 대범한데, 속은 인정받고 싶은 마음이 아주 커요. 사랑에서도 "나를 제일로 봐 주는가"를 중요하게 여기고, 그게 흔들리면 자존심이 먼저 반응해요.',
    love: '표현이 화려하지는 않지만, 상대를 자랑하고 지켜 주는 데에 진심이에요. 무시당했다고 느끼는 순간 크게 흔들리니, 존중이 확인되면 세상에서 제일 든든한 사람이 돼요.',
    appeal: '자기 사람은 확실하게 띄워 주는 다정함 — 이성이 "이 사람과 있으면 나도 커 보인다"고 느끼는 매력이에요.',
  },
  사: {
    animal: '뱀',
    name: '조용한 열정',
    heart: '겉은 차분한데, 마음에 든 사람 앞에서는 시선이 오래 머물러요. 감정을 드러내지 않으면서도 상대의 관심을 정확히 읽고, 필요한 순간에만 말을 걸어요.',
    love: '연애에서 주도권을 자연스럽게 쥐는 쪽이에요. 질투를 표현하는 방식이 은근해서, 상대는 나중에야 "이 사람이 나를 많이 좋아하고 있었구나"를 알게 돼요.',
    appeal: '알 듯 말 듯 다가오는 집중 — 이성이 먼저 확인하고 싶어지는, 오래 기억에 남는 매력이에요.',
  },
  오: {
    animal: '말',
    name: '멈추기 힘든 열정',
    heart: '속마음이 겉과 크게 다르지 않은 사람이에요. 다르다면 열정이 더 강하다는 정도예요. 한번 빠지면 하루에도 몇 번씩 연락하고, 함께할 일을 먼저 만들어요.',
    love: '답장이 느리거나 반응이 시원찮으면 마음이 먼저 식을까 안달이 나요. 그래서 다정하지만, 상대 입장에서는 가끔 속도가 무서울 수 있어요.',
    appeal: '좋아하면 숨기지 못하는 뜨거움 — 이성이 "이 사람의 마음은 의심할 필요가 없다"고 느끼는 매력이에요.',
  },
  미: {
    animal: '양',
    name: '정 많은 늦인연',
    heart: '정이 많고 잘 잊지 못해요. 끝난 연애도 오래 곱씹고, 지금 곁에 있는 사람이 서운해한 말을 몇 달 뒤에도 기억해요.',
    love: '배려를 먼저 준비하는 쪽이에요. 다만 확인받고 싶은 마음이 커서 "나 먼저 바라봐 줘"라는 말을 못 한 채 서운함으로 쌓일 때가 있어요.',
    appeal: '사소한 것까지 기억하는 정 — 이성이 "이 사람은 나를 오래 좋아하겠다"고 안심하는 매력이에요.',
  },
  신: {
    animal: '원숭이',
    name: '재치 있는 줄다리기',
    heart: '겉은 즐거운 친구 같은데, 속에서는 상대와의 거리를 정교하게 조절해요. 먼저 좋아한다는 걸 모두 보이면서도, 마음의 결정적인 한 칸은 쉽게 내주지 않아요.',
    love: '연애에서 말로 하는 밀당에 능해요. 상대를 웃게 만들다가도 진지한 순간에는 한 발 물러서서, "얘는 진짜 나를 어떻게 생각하지?"라는 의문을 남겨요.',
    appeal: '웃고 있다가도 어느 순간 앞서가는 말재주 — 대화가 지루할 틈 없는 매력이에요.',
  },
  유: {
    animal: '닭',
    name: '완벽주의 연인',
    heart: '겉보다 속이 더 꼼꼼한 사람이에요. 좋아하는 사람의 말투, 습관, 약속 시간 하나까지 기억하고, 그 기준에 어긋나면 서운함을 조용히 쌓아요.',
    love: '표현은 정갈한 편이라 "정성스럽게 좋아한다"는 느낌을 줘요. 대신 완벽을 기대하는 만큼 실망도 정확해서, 그 간격을 말로 풀어 내는 게 연애의 숙제예요.',
    appeal: '세심하게 준비된 다정함 — 이성이 "이 사람은 나를 대충 대하지 않는다"고 느끼는 매력이에요.',
  },
  술: {
    animal: '개',
    name: '한 번이면 끝인 마음',
    heart: '속은 겉보다 훨씬 정직해요. 좋아하는 사람에게는 애정을 아끼지 않고, 싫은 건 끝까지 싫어해요. 뒤끝이 긴 게 아니라 기준이 단단한 거예요.',
    love: '상대를 지키는 일에 서툰 적이 없어요. 다만 의심이 생기면 확인부터 하고, 그 확인이 상대에게는 추궁처럼 느껴질 수 있어요.',
    appeal: '내 사람을 향한 확실한 편들기 — 이성이 "이 사람은 내 편이 되어 줄 것 같다"고 느끼는 매력이에요.',
  },
  해: {
    animal: '돼지',
    name: '다 주고 싶은 마음',
    heart: '속은 겉보다 더 푹신해요. 좋아하는 사람에게 아끼지 않고 다 주고 싶어 하고, 그 마음이 지나쳐 상대를 부담스럽게 할 때도 있어요.',
    love: '연애에서 계산이 느슨해서 손해를 많이 봐요. 그런데도 미움이 오래가지 않아서, 헤어진 뒤에도 상대가 이 사람을 좋게 기억하는 편이에요.',
    appeal: '받은 것보다 더 돌려주는 넉넉함 — 이성이 "이 사람과 함께 있으면 마음이 풍족해진다"고 느끼는 매력이에요.',
  },
};

/* ────────────────────────────────────────────
   년지 × 일지의 관계 — 명리학 근거를 연애 언어로
   ──────────────────────────────────────────── */
export const PAIR_RELATION = {
  same: {
    label: '같은 동물 — 겉과 속이 한 몸',
    short: '보는 그대로의 사람',
    line: (y, d) => `년지와 일지가 똑같이 ${withJosa(d, '이에요', '예요')}. 사람들이 보는 첫인상과 연애에서 드러나는 속마음이 같은 방향을 가리켜서, "보는 그대로의 사람"이라는 인상을 줍니다. 대신 속이 그대로 드러나는 만큼, 기분이 나쁜 날에는 숨길 데가 없어요.`,
    tip: '숨길 필요는 없지만, 감정이 그대로 나가는 순간을 하루만 미뤄 보세요. 그 하루가 관계의 온도를 지켜 줍니다.',
    appeal: '첫인상과 진심이 같은 사람이라는 안도감 — 이성이 당신을 의심할 이유를 찾지 못해요.',
  },
  육합: {
    label: '육합 — 겉과 속이 붙어 있는 사이',
    short: '친해질수록 짙어지는 사람',
    line: (y, d) => `${y}의 겉과 ${d}의 속이 육합으로 붙어 있어요. 처음에는 차분해 보이다가, 친해지는 순간부터 애정 표현이 자연스럽게 나와요. 상대는 "이 사람이 이렇게 다정했어?" 하고 한 번 놀라게 됩니다.`,
    tip: '끌림이 자연스러운 조합이에요. 다만 편해진 뒤에도 서로의 기본 예의를 잃지 않는 게 오래 가는 비결이에요.',
    appeal: '친해질수록 짙어지는 다정함 — 시간이 갈수록 매력이 올라가는 타입이에요.',
  },
  삼합: {
    label: '삼합 — 같은 방향을 보는 사이',
    short: '같은 쪽을 보는 사람',
    line: (y, d) => `${withJosa(y, '과', '와')} ${withJosa(d, '이', '가')} 같은 방향으로 힘을 모으는 삼합이에요. 겉으로는 부드럽게 보여도, 마음에 든 사람에게는 목표를 향해 곧장 가요. 연애에서 "이 사람과는 같은 쪽을 보고 있다"는 감각을 줍니다.`,
    tip: '같은 방향을 보는 만큼, 서로의 목표가 어긋나는 순간을 일찍 이야기해 두면 오래 갑니다.',
    appeal: '함께 앞으로 나아갈 수 있다는 기대 — 이성이 당신을 "동료이자 연인"으로 느끼는 매력이에요.',
  },
  충: {
    label: '충 — 겉과 속이 정면으로 마주 보는 사이',
    short: '알수록 새로워지는 사람',
    line: (y, d) => `${y}의 겉과 ${d}의 속이 정면으로 마주 보는 충이에요. 그래서 첫인상과 연애 태도가 눈에 띄게 달라요. 사람들은 당신을 "알고 보니 전혀 다른 사람"이라고 말하고, 그 반전이 강한 끌림이 됩니다.`,
    tip: '반전이 큰 만큼, 상대가 오해하지 않도록 "나 원래 이런 사람이야"를 한 번은 말해 주세요.',
    appeal: '알면 알수록 새로워지는 반전 — 이성이 "더 알고 싶다"고 다시 다가오게 만드는 매력이에요.',
  },
  형: {
    label: '형 — 닮은 결을 가진 사이',
    short: '말하지 않아도 아는 사람',
    line: (y, d) => `${withJosa(y, '과', '와')} ${withJosa(d, '이', '가')} 같은 결을 닮은 형이에요. 겉과 속이 비슷한 약점을 공유해서, 상대의 서운함을 누구보다 빨리 알아채요. 그런데 그 서운함을 서로 비슷한 방식으로 삭여서 문제가 되기도 해요.`,
    tip: '서로를 너무 잘 알기 때문에 말을 아끼게 돼요. "알아서 하겠지" 대신 한 번 더 말해 주는 게 이 조합의 약이에요.',
    appeal: '말하지 않아도 알아주는 눈치 — 이성이 "이 사람은 나를 이해한다"고 느끼는 매력이에요.',
  },
  파: {
    label: '파 — 시작과 끝의 온도가 다른 사이',
    short: '깊어질수록 진해지는 사람',
    line: (y, d) => `${y}의 겉과 ${d}의 속이 파로 얽혀 있어요. 시작은 부드러운데, 마음이 깊어질수록 표현이 달라져서 상대가 "처음과 다른데?" 하고 느끼게 돼요. 그 차이가 오해가 아니라 애정이 깊어진 신호라는 걸 알아채면 좋아요.`,
    tip: '관계의 시작과 지금을 비교해 서운해하기보다, 지금의 표현 방식을 한 번 이야기해 보세요.',
    appeal: '깊어질수록 진해지는 마음 — 이성이 "이 사람은 나에게 점점 솔직해진다"고 느끼는 매력이에요.',
  },
  원진: {
    label: '원진 — 이유 없이 서운해지는 사이',
    short: '작은 변화를 알아채는 사람',
    line: (y, d) => `${y}의 겉과 ${d}의 속이 원진으로 얽혀 있어요. 설명하기 어려운 서운함이 종종 올라와서, 상대는 "왜 서운한지 모르겠다"고 느껴요. 반대로 그만큼 상대의 작은 변화를 민감하게 알아차리는 사람이기도 해요.`,
    tip: '서운함의 이유를 스스로 먼저 찾아 한 문장으로 말해 보세요. 그 한 문장이 원진을 애정으로 바꿔요.',
    appeal: '상대의 작은 변화를 알아채는 섬세함 — 이성이 "이 사람은 나를 자세히 본다"고 느끼는 매력이에요.',
  },
  무관: {
    label: '무관 — 서로 간섭하지 않는 사이',
    short: '조용히 자기 색을 지키는 사람',
    line: (y, d) => `${y}의 겉과 ${d}의 속이 서로 부딪히지 않는 무관 관계예요. 겉은 부드럽고 속은 자기 색이 분명해서, 가까운 사람만 아는 조용한 고집이 있어요. 처음엔 무던해 보이지만, 친해지면 "이 사람 이런 면이 있었어?"라는 말을 듣습니다.`,
    tip: '간섭하지 않는 편안함이 장점이에요. 다만 관심을 표현하지 않으면 무관심으로 보일 수 있으니 한 번씩 먼저 말을 걸어 주세요.',
    appeal: '조용히 자기 색을 지키는 단단함 — 이성이 "이 사람은 흔들리지 않는다"고 느끼는 매력이에요.',
  },
};

/** 오행 관계 — 상생·같은 기운·상극 */
export const ELEMENT_RELATION = {
  상생: {
    label: '오행 상생',
    line: (yOhaeng, dOhaeng) => `년지의 ${yOhaeng} 기운이 일지의 ${dOhaeng} 기운을 자연스럽게 밀어 주는 상생이에요. 사람을 대하는 방식이 상대를 편하게 만들고, 이성이 당신 곁에서 "왠지 잘될 것 같다"는 감각을 느끼게 해요.`,
  },
  상극: {
    label: '오행 상극',
    line: (yOhaeng, dOhaeng) => `년지의 ${yOhaeng} 기운이 일지의 ${dOhaeng} 기운을 누르는 상극이에요. 앞에서 보이는 모습과 속에서 원하는 것이 달라서, 스스로도 "내가 왜 이랬지" 싶은 순간이 있어요. 그 간극이 사람에게는 묘한 매력으로 비쳐요.`,
  },
  같음: {
    label: '같은 오행',
    line: (yOhaeng) => `년지와 일지가 같은 ${yOhaeng} 기운으로 묶여 있어요. 겉과 속의 색이 같아서 취향이 분명하고, 좋아하는 것과 싫어하는 것이 사람에게도 그대로 드러나요.`,
  },
};

/* ────────────────────────────────────────────
   계산
   ──────────────────────────────────────────── */
/** 조사만 돌려준다 — josa('쥐','가','이') → '가' */
const josa = (word, withBatchim, withoutBatchim) => withJosa(word, withBatchim, withoutBatchim).slice(String(word).length);

const branchIndex = (v) => {
  if (typeof v === 'number' && v >= 0 && v < 12) return v;
  const i = BRANCHES.findIndex((b) => b.ko === v || b.han === v);
  return i >= 0 ? i : null;
};

/** 두 지지(인덱스 또는 한글)의 관계 키 — 같은 동물이면 'same' */
export function relationKeyOf(yBranch, dBranch) {
  const yi = branchIndex(yBranch);
  const di = branchIndex(dBranch);
  if (yi == null || di == null) return null;
  if (yi === di) return 'same';
  return branchRelation(BRANCHES[yi].ko, BRANCHES[di].ko) || '무관';
}

/** 두 지지의 오행 관계 키 — 상생·상극·같음 */
export function elementKeyOf(yBranch, dBranch) {
  const yi = branchIndex(yBranch);
  const di = branchIndex(dBranch);
  if (yi == null || di == null) return null;
  const a = BRANCHES[yi].ohaeng;
  const b = BRANCHES[di].ohaeng;
  if (a === b) return '같음';
  if (SANGSAENG[a] === b || SANGSAENG[b] === a) return '상생';
  if (SANGGEUK[a] === b || SANGGEUK[b] === a) return '상극';
  return '같음';
}

/**
 * 12띠 × 일주 동물 풀이
 * @param {object} chart computeChart 결과 (yearBranch · dayBranch 또는 pillars 사용)
 */
export function zodiacIljuReading(chart) {
  if (!chart) return null;
  const yi = branchIndex(chart.yearBranch != null ? chart.yearBranch : chart.pillars?.year?.branchKo);
  const di = branchIndex(chart.dayBranch != null ? chart.dayBranch : chart.pillars?.day?.branchKo);
  if (yi == null || di == null) return null;

  const yBranch = BRANCHES[yi];
  const dBranch = BRANCHES[di];
  const y = { branch: yBranch.ko, branchHan: yBranch.han, ohaeng: yBranch.ohaeng, ...YEAR_FACE[yBranch.ko] };
  const d = { branch: dBranch.ko, branchHan: dBranch.han, ohaeng: dBranch.ohaeng, ...DAY_HEART[dBranch.ko] };

  const relKey = relationKeyOf(yi, di);
  const rel = PAIR_RELATION[relKey];
  const elKey = elementKeyOf(yi, di);
  const el = ELEMENT_RELATION[elKey];
  const relLine = rel.line(y.animal, d.animal);
  const elLine = el.line(y.ohaeng, d.ohaeng);

  return {
    year: y,
    day: d,
    relation: { key: relKey, label: rel.label, short: rel.short, line: relLine, tip: rel.tip, appeal: rel.appeal },
    element: { key: elKey, label: el.label, line: elLine },
    title: `${y.animal}띠 × ${d.animal} 일주`,
    subtitle: `년지 ${y.branch}(${y.branchHan}) · 일지 ${d.branch}(${d.branchHan})`,
    headline: `겉은 ${y.face}, 속은 ${d.name}`,
    chips: [`${y.animal}띠 첫인상`, `${d.animal} 일주 반전 매력`, rel.label.split(' — ')[0]],
    paragraphs: {
      first: y.look,
      reversal: `${d.heart} ${d.love}`,
      together: `${relLine} ${elLine}`,
    },
    appeals: [y.appeal, d.appeal, rel.appeal],
    tip: rel.tip,
    oneLine: `사람들은 당신을 '${y.face}'${josa(y.face, '으로', '로')} 기억하지만, 사랑 앞에서는 '${d.name}' — ${rel.short}이에요.`,
  };
}

/** 12 × 12 조합 전체 — 테스트·검수용 */
export function allZodiacIljuReadings() {
  const out = [];
  for (let i = 0; i < 12; i += 1) {
    for (let j = 0; j < 12; j += 1) {
      out.push(zodiacIljuReading({ yearBranch: i, dayBranch: j }));
    }
  }
  return out;
}

/* ────────────────────────────────────────────
   유료 리포트(990원 · 1구슬) 섹션
   ──────────────────────────────────────────── */
const YUKHAP_PAIR = { 자: '축', 축: '자', 인: '해', 해: '인', 묘: '술', 술: '묘', 진: '유', 유: '진', 사: '신', 신: '사', 오: '미', 미: '오' };
const SAMHAP_GROUPS = [['신', '자', '진'], ['해', '묘', '미'], ['인', '오', '술'], ['사', '유', '축']];

/** 한 지지와 육합·삼합으로 이어지는 띠 — 인연의 상대를 찾는 표 */
export function partnerBranchesOf(branch) {
  const idx = branchIndex(branch);
  if (idx == null) return { yukhap: null, samhap: [] };
  const ko = BRANCHES[idx].ko;
  const yukhapIdx = branchIndex(YUKHAP_PAIR[ko]);
  const group = SAMHAP_GROUPS.find((g) => g.includes(ko)) || [];
  const samhap = group.filter((b) => b !== ko).map((b) => BRANCHES[branchIndex(b)]);
  return {
    yukhap: yukhapIdx == null ? null : BRANCHES[yukhapIdx],
    samhap,
  };
}

/**
 * 12띠 × 일주 매력 리포트 — 유료 섹션 3장
 * 1) 겉과 속 두 얼굴 (kv + 첫인상 + 반전 매력 + 한 줄)   — 앞 2블록은 맛보기
 * 2) 관계와 인연 (합·충·상생 + 잘 맞는 띠 표)
 * 3) 매력 포인트 3 + 연애 사용법
 */
export function zodiacIljuSections(chart, { freeBlocks = 2 } = {}) {
  const r = zodiacIljuReading(chart);
  if (!r) return [];
  const yb = BRANCHES[branchIndex(chart.yearBranch != null ? chart.yearBranch : chart.pillars?.year?.branchKo)];
  const db = BRANCHES[branchIndex(chart.dayBranch != null ? chart.dayBranch : chart.pillars?.day?.branchKo)];
  const yp = partnerBranchesOf(yb.ko);
  const dp = partnerBranchesOf(db.ko);
  const animalList = (p) => [p.yukhap, ...p.samhap].filter(Boolean).map((b) => `${b.animal}띠`).join(' · ');

  return [
    {
      id: 'zi-face',
      heading: `${r.year.animal}띠의 겉모습 × ${r.day.animal} 일주의 속마음`,
      kicker: 'TWO FACES',
      locked: true,
      freeBlocks,
      blocks: [
        { t: 'kv', v: [
          ['겉 · 년지', `${yb.ko}(${yb.han}) ${r.year.animal} — ${r.year.face}`],
          ['속 · 일지', `${db.ko}(${db.han}) ${r.day.animal} — ${r.day.name}`],
          ['두 동물의 관계', r.relation.label],
          ['오행 관계', `${r.element.label} · ${yb.ohaeng} ↔ ${db.ohaeng}`],
        ] },
        { t: 'p', v: `사람들이 먼저 보는 얼굴은 '${r.year.face}'${josa(r.year.face, '이에요', '예요')}. ${r.paragraphs.first}` },
        { t: 'p', v: `그런데 가까워지면 다른 얼굴이 나옵니다. ${r.paragraphs.reversal}` },
        { t: 'q', v: r.oneLine },
      ],
    },
    {
      id: 'zi-rel',
      heading: `${r.relation.label.split(' — ')[0]} · ${r.element.label}로 본 우리 사이`,
      kicker: 'RELATION',
      locked: true,
      freeBlocks: 1,
      blocks: [
        { t: 'chips', v: ['두 동물의 합·충', '오행 상생·상극', '잘 맞는 인연의 띠'] },
        { t: 'p', v: r.paragraphs.together },
        { t: 'table', head: ['구분', '잘 맞는 띠', '이유'], rows: [
          ['겉(년지) 인연', animalList(yp), `${yb.animal}띠와 육합·삼합으로 이어지는 띠예요. 처음 만나도 말이 통하는 상대입니다.`],
          ['속(일지) 인연', animalList(dp), `${db.animal} 일주와 육합·삼합으로 이어지는 띠예요. 가까워질수록 편안해지는 조합입니다.`],
        ] },
      ],
    },
    {
      id: 'zi-charm',
      heading: '이성에게 어필되는 매력 포인트',
      kicker: 'CHARM',
      locked: true,
      freeBlocks: 1,
      blocks: [
        { t: 'chips', v: ['이성 어필 포인트 3', '연애에서 조심할 한 가지'] },
        { t: 'li', v: r.appeals },
        { t: 'sub', v: '연애에서 조심할 한 가지' },
        { t: 'q', v: r.tip },
      ],
    },
  ];
}
