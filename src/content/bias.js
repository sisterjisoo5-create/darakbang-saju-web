// 최애궁합 리포트 — 삼주육자로 최애를 먼저 읽고, 우리의 첫 만남을 그리고, 나랑 연애하면?으로 닫는다
// 2026-11-23 시연 님 지시:
//   "1. 최애의 삼주육자(시를 모르면 이게 맞지ㅎ) ➡️ 이런 성격. 한 박스에 풀어쓰기.
//        약간 팬들이 최애의 실제 성격에 대해 공부하는 느낌, 어차피 환상을 심는 행위. 5줄 정도.
//    2. 최애와 찰떡 일주 TOP 3 (내 일주가 겹치면 짚어 주는 거 굿)
//    3. 우리의 첫 만남은? ➡️ 각자의 달의 흐름으로 봄·여름·가을·겨울, 어느 장소, 몇 시경,
//        어느 스토리(거의 웹소설급)로 덕질 설렘 톤.
//    4. 그래서 나랑 연애하면 어떨까? ➡️ 1:1 궁합 카드에 궁합 점수, 내가 최애의 빈틈을 채우는 방식.
//    + 4장 끝에 작은 설렘 박스 3줄(내 앞에서만 보이는 모습 · 직빵인 한 마디 · 데이트 코스)."
// 모든 문장은 computeChart / biasReading / idealIlju / firstMeeting 결과에서만 나온다.
import { ILGAN, JIJI, OHAENG_DETAIL } from './data.js';
import { OHAENG, OHAENG_META, SANGSAENG, SANGGEUK } from '../engine/constants.js';
import { todayFortune } from '../engine/today.js';
import { ILJU_60 } from './ilju-60.js';
import {
  biasReading, biasLucky, synergyMonths, ohaengCompare, fillLines, discordLines, partnerNeeds,
  sixLetterSummary, josa, roleOf, idealIlju, myFit, firstMeeting,
} from '../engine/bias.js';

function tempWord(t) {
  if (t <= 13) return '얼음장처럼 차가운';
  if (t <= 19) return '서늘한';
  if (t <= 25.5) return '온화한';
  if (t <= 31) return '따뜻한';
  return '뜨거운';
}

/** 마음이 먼저 열리는 자리 — 내게 비어 있는 기운 / 최애의 필요한 기운으로 고른다 */
const PLACE = {
  목: '공원, 산책로, 책이 많은 서점',
  화: '공연장, 카페 창가, 무대가 보이는 앞줄',
  토: '익숙한 동네의 단골집, 산과 흙이 있는 곳',
  금: '정돈된 전시장, 조용한 레스토랑, 유리창 너머',
  수: '물가와 강변, 밤의 산책길, 비 오는 날의 창가',
};

/** 최애 일간의 무대 안·밖 — 사람들 앞에서 어떤 사람으로 보이는지 (최애를 3인칭으로 쓴 문장) */
const DAY_SCENE = {
  갑: '무대에 서면 제일 먼저 앞으로 나가는 쪽이에요. 끝까지 책임지는 태도가 사람들 눈에는 “믿음”으로 보입니다.',
  을: '누구에게나 먼저 말을 맞추는 쪽이에요. 무리에서는 없으면 안 되는 사람인데, 정작 자기 속은 잘 꺼내지 않습니다.',
  병: '어두운 자리도 밝히는 사람이에요. 들어오는 순간 공기의 온도가 올라가서, 사람들이 먼저 그쪽을 봅니다.',
  정: '한 사람에게 깊게 빛나는 쪽이에요. 조용한데 오래 남는 온도라, 한 번 마음을 주면 쉽게 돌아서지 않습니다.',
  무: '흔들리지 않는 중심이에요. 옆에서 보면 답답할 만큼 단단한데, 그 단단함에 사람들이 기댑니다.',
  기: '챙기고 정리하는 사람이에요. 무대 밖에서도 사람들과 일정을 조용히 맞춰 놓는 쪽입니다.',
  경: '결단이 빠른 사람이에요. 급한 순간에 제일 먼저 몸이 움직이고, 기준이 칼처럼 서 있습니다.',
  신: '취향이 분명한 사람이에요. 말보다 선택으로 자기 색을 보여 주는 쪽입니다.',
  임: '큰 그림을 보는 사람이에요. 이야기를 나누면 시야가 넓어져서, 사람들이 조언을 구하러 옵니다.',
  계: '섬세한 감각의 사람이에요. 말하지 않아도 분위기를 읽어서, 늘 먼저 알아채는 쪽입니다.',
};

/** 무대 밖(카메라가 꺼진 뒤)의 진짜 기질 — 일간 열 가지 */
const PRIVATE = {
  갑: '카메라가 꺼지면 말수가 확 줄어요. 앞에서 사람들을 챙기느라 다 쓴 힘을, 혼자 조용히 앉아 채우는 사람입니다.',
  을: '밖에서는 누구에게나 다정한데, 문을 닫으면 말없이 창밖을 오래 봐요. 그 조용함을 아는 사람은 몇 명 안 됩니다.',
  병: '제일 밝게 웃던 사람이 집에 돌아오면 불을 다 끄고 앉아 있어요. 밝힌 만큼 혼자 식히는 시간이 필요한 사람입니다.',
  정: '평소엔 예의 바르고 조용한데, 마음이 열린 사람에게는 장난이 많아져요. 그 장난이 “편해졌다”는 신호입니다.',
  무: '결정을 미루는 일이 거의 없어요. 다만 속마음을 말로 꺼내는 데는 서툴러서, 행동으로 먼저 보여 줍니다.',
  기: '밖에서는 다 받아 주는 사람인데, 안에서는 자기 자리와 물건에 까다로워요. 흐트러진 걸 못 견디는 결입니다.',
  경: '앞에서는 단호한데, 혼자 있을 때는 아주 사소한 것도 오래 고민해요. 강한 척이 습관이 된 사람입니다.',
  신: '말수가 확 줄어요. 대신 좋아하는 것 앞에서는 표정이 먼저 풀려서, 팬들은 그 순간을 다 압니다.',
  임: '웃고 떠드는 자리에 있으면서도 머릿속은 딴생각을 하고 있어요. 그래서 갑자기 엉뚱한 말로 사람을 웃깁니다.',
  계: '밖에서는 조용한데, 사람의 기분 변화를 다 읽고 있어요. 말하지 않을 뿐, 다 알고 있는 사람입니다.',
};

/** 일지 열두 가지 — 팬들이 알아챈 사소한 습관 */
const HABIT = {
  자: '잠들기 전에 휴대폰을 내려놓고 천장을 오래 봐요. 그 시간에 그날 들은 말들을 혼자 정리합니다.',
  축: '먹는 것과 입는 것에 유난히 오래 걸려요. 대신 한 번 정한 단골은 몇 년을 갑니다.',
  인: '이른 아침이나 늦은 밤에 혼자 걷는 시간을 꼭 챙겨요. 그 시간에 하루의 순서를 정합니다.',
  묘: '창가 자리를 먼저 찾고, 작은 화분이나 꽃을 자주 들여요. 예민한 만큼 회복도 빠른 사람입니다.',
  진: '남의 부탁을 잘 못 끊어서 일정이 겹쳐 있어요. 그런데 자기 약속은 한 번도 안 어깁니다.',
  사: '대화 중에 상대의 말을 정확히 받아치는 재주가 있어요. 웃으면서도 기억은 다 합니다.',
  오: '좋아하는 일에는 속도가 붙고, 싫은 일에는 하루 만에 흥미를 잃어요. 그 편차가 아주 큽니다.',
  미: '정리는 잘하는데 오래된 물건은 못 버려요. 상자 하나에 옛날이 통째로 들어 있습니다.',
  신: '이동 경로와 시간을 미리 정해 둬요. 갑작스러운 변경을 특히 싫어합니다.',
  유: '옷과 물건의 결을 봐요. 사소한 것에서 기준이 흔들리면 하루 종일 불편해합니다.',
  술: '한 번 정한 사람에게는 끝까지 가요. 대신 배신에는 아주 오래 마음이 닫힙니다.',
  해: '말보다 관찰이 앞서요. 사람들을 다 보고 나서 집에 돌아와 혼자 정리합니다.',
};

/** 비어 있거나 가장 얇은 기운 — 그 기운을 가진 사람에게 마음이 먼저 가는 이유 */
const HOLLOW_LINE = {
  목: '자기 일이 아닌데도 “한번 해 볼까” 하는 사람 곁에서 눈이 오래 머뭅니다.',
  화: '좋아해도 티를 잘 못 내는 쪽이라, 먼저 알아봐 주는 사람에게 마음이 갑니다.',
  토: '약속을 지키고 그 자리에 남아 있는 사람을 유난히 귀하게 봅니다.',
  금: '선을 분명히 긋는 사람에게 이상하게 안심합니다. 애매한 사람보다 “여기까지”라고 말해 주는 사람이 편합니다.',
  수: '말없이 곁에 있어 주는 사람에게 오래 마음이 남습니다. 위로의 말보다 같은 자리에 앉아 있는 시간이 필요합니다.',
};

function tempPoint(bias) {
  const t = bias.ohaeng.temp;
  if (t <= 19) return '사주가 차가운 편이라 다정함이 말보다 행동으로 나옵니다. 말수는 적어도 챙길 건 다 챙기는 사람이에요.';
  if (t <= 25.5) return '온도가 온화해서 누구에게나 비슷하게 다정해 보입니다. 그래서 마음을 정한 날의 태도 변화가 팬들에게는 제일 큰 신호예요.';
  return '사주가 뜨거워서 좋으면 바로 티가 납니다. 그만큼 식는 날의 낙차도 크다는 걸, 오래 본 팬들은 압니다.';
}

/** 최애가 끌리는 사람의 결 — 오행별 성격·말투·분위기 (최애에게 필요한 기운으로 고른다) */
const PULL = {
  목: {
    temper: '곧게 자라는 사람 — 자기 기준이 있고, 남이 뭐라 해도 자기 속도로 갑니다.',
    who: '자기 자리에서 조용히 자라나는 사람',
    talk: '“좋았어”를 아끼지 않으면서, 다음에 뭘 해 볼지 같이 그려 주는 말투',
    mood: '아침 햇빛이 드는 서점, 아직 꽃이 피지 않은 화분 같은 공기',
  },
  화: {
    temper: '온도가 먼저 올라가는 사람 — 좋으면 바로 티가 나고, 싫으면 표정에 다 써 있습니다.',
    who: '먼저 웃고 먼저 말을 거는 사람',
    talk: '좋은 걸 보면 소리부터 내는, 감정이 한 박자 늦지 않는 말투',
    mood: '무대 조명이 켜지기 직전의 공연장, 사람이 많은 카페의 창가',
  },
  토: {
    temper: '중심이 무거운 사람 — 급한 일에도 목소리가 변하지 않습니다.',
    who: '말보다 약속으로 안심시키는 사람',
    talk: '한 번 한 말은 지키고, 결정을 미루지 않는 말투',
    mood: '익숙한 동네 단골집, 비 온 뒤 흙 냄새가 나는 산책로',
  },
  금: {
    temper: '정리가 빠른 사람 — 애매한 것을 오래 두지 못합니다.',
    who: '선을 지키고 끝을 정확히 맺는 사람',
    talk: '과장 없이 필요한 말만, 대신 한 번 한 말은 끝까지 하는 말투',
    mood: '정돈된 전시장, 유리창 너머로 보이는 조용한 저녁',
  },
  수: {
    temper: '생각이 깊은 사람 — 말하기 전에 한 번 더 안에서 굴리고 꺼냅니다.',
    who: '서두르지 않고 오래 들어 주는 사람',
    talk: '질문이 많고, 대답을 재촉하지 않는 말투',
    mood: '비 오는 날의 창가, 밤의 강변, 조용한 플레이리스트',
  },
};

/* ────────────────────────────────────────────────
   첫 만남 시나리오 — 계절·장소·시간·한 장면
   ──────────────────────────────────────────────── */
const SEASON = {
  봄: {
    short: '벚꽃이 막 지고 바람에 꽃잎이 흩날리는 때',
    prose: '벚꽃이 막 지고 있었어요. 바람이 불 때마다 꽃잎이 눈처럼 내려서, 지나가는 사람들도 저도 모르게 고개를 들었습니다.',
  },
  여름: {
    short: '해가 길어져 저녁에도 하늘이 한참 남아 있는 때',
    prose: '해가 길어져, 저녁이 와도 하늘이 한참을 남겨 두는 계절이었어요. 공기는 미지근하고, 어디선가 축제의 음악이 끊길 듯 말 듯 흘러나왔습니다.',
  },
  가을: {
    short: '공기가 유리처럼 맑아진 늦가을',
    prose: '공기가 유리처럼 맑은 날이었어요. 낙엽을 밟을 때마다 소리가 또렷해서, 사람들은 저도 모르게 발끝을 조심했습니다.',
  },
  겨울: {
    short: '입김이 하얗게 서는 한겨울',
    prose: '입김이 하얗게 서는 밤이었어요. 손끝은 시린데 이상하게 발걸음은 느려졌고, 골목마다 불빛이 따뜻해 보였습니다.',
  },
};

/** 장소 — 오행·방위를 살린 구체적인 자리. 두 가지 중 하나가 seed 로 정해지고,
 *  그 자리에 맞는 공기(prose)와 순간(moment)이 함께 따라간다. */
const PLACE_SCENE = {
  목: [
    {
      name: '동쪽 골목 끝, 나무가 우거진 공원',
      prose: '나무 사이로 빛이 조각조각 떨어져서, 걷는 사람마다 얼굴에 다른 그림자가 앉았어요.',
      moment: '바람이 한 번 크게 불어 나뭇가지가 한꺼번에 흔들렸어요. 그걸 피하려고 고개를 숙였다가, 몇 걸음 앞에서 눈이 마주쳤습니다.',
    },
    {
      name: '동쪽 큰길에서 한 블록, 가로수가 터널을 만드는 산책로',
      prose: '가로수가 위를 다 덮어서, 차 소리는 멀고 발소리만 가까운 길이었어요.',
      moment: '앞사람이 떨어뜨린 작은 것이 굴러와 내 발끝에 멈췄어요. 고개를 들자, 돌아보던 그 사람과 눈이 마주쳤습니다.',
    },
  ],
  화: [
    {
      name: '남쪽 거리, 사람들로 북적이는 축제의 끝자락',
      prose: '사람들 웃음소리와 음악이 겹쳐서, 말을 하려면 한 걸음 가까이 가야 하는 곳이었어요.',
      moment: '무대 조명이 크게 번쩍이고 박수가 터진 순간, 사람들 틈에서 그 사람이 눈에 들어왔어요.',
    },
    {
      name: '남쪽 큰길, 창가가 넓은 카페',
      prose: '창가 자리만 등이 낮아서, 앉으면 거리 전체가 유리 너머로 내려다보였어요.',
      moment: '잔을 내려놓는 소리에 고개를 들었더니, 옆자리에서 같은 창밖을 보던 그 사람과 눈이 마주쳤습니다.',
    },
  ],
  토: [
    {
      name: '오래된 동네의 조용한 독립서점',
      prose: '책장 사이가 조용해서, 누가 발끝을 끌어도 다 들리는 곳이었어요.',
      moment: '책장을 넘기는 소리가 유난히 크게 들린 순간, 저쪽 서가에서도 똑같이 책장을 넘기던 손이 멈췄어요.',
    },
    {
      name: '계단 많은 골목 위, 책 냄새가 배어 있는 오래된 도서관',
      prose: '오래된 나무 책상에서 먼지 냄새가 났고, 창으로 들어온 빛이 책등 위에 누워 있었어요.',
      moment: '같은 책을 두 손으로 집어 든 순간이었어요. 저쪽 끝에서도 같은 책이 뽑혀 나오면서, 시선이 마주쳤습니다.',
    },
  ],
  금: [
    {
      name: '서쪽 지하철역 앞, 유리로 된 모던한 미술관',
      prose: '벽마다 조명이 낮게 떨어져서, 작품보다 그 앞에 선 사람이 먼저 눈에 들어왔어요.',
      moment: '작품 앞에 걸음을 멈춘 사람이 하나뿐이었어요. 조명이 그 어깨에만 떨어져서, 나는 작품을 보러 온 걸 잊고 그쪽을 봤습니다.',
    },
    {
      name: '서쪽 번화가에서 한 블록 비껴 선, 조명이 낮은 갤러리',
      prose: '작은 방 하나가 통째로 한 작품을 위해 비워져 있었어요.',
      moment: '그 방을 나서려는데, 들어오려던 사람과 문 앞에서 멈췄어요. 서로 비켜 주다가 웃음이 먼저 나왔습니다.',
    },
  ],
  수: [
    {
      name: '북쪽 강변, 비가 막 그친 저녁의 산책로',
      prose: '물 위로 바람이 지나가고, 발밑에서 젖은 돌이 조금씩 소리를 냈어요.',
      moment: '바람에 물 위 불빛이 한 번 흔들렸어요. 그 흔들림에 고개를 들었더니, 몇 걸음 앞에 그 사람이 서 있었습니다.',
    },
    {
      name: '북쪽 골목 안쪽, 창가에 물잔을 두는 작은 바',
      prose: '창가 유리잔에 불빛이 맺혀서, 손끝보다 잔이 먼저 따뜻해 보였어요.',
      moment: '창밖에 비가 막 그쳤어요. 물잔 위로 불빛이 흔들리는 걸 같이 보고 있던 그 사람과, 눈이 마주쳤습니다.',
    },
  ],
};

const PLACE_SHORT = {
  목: '동쪽 나무길',
  화: '남쪽 축제 거리',
  토: '동네 독립서점',
  금: '서쪽 미술관',
  수: '북쪽 강변',
};



/** 그 순간의 첫인상 — 일간 열 가지 */
const FIRST_LOOK = {
  갑: '멀리서도 어깨가 곧게 서 있어서 눈에 띄었어요. 서 있는 자세부터가 “여기 내 자리”라는 사람이었습니다.',
  을: '사람들 사이에 섞여 있는데도 시선이 간 건, 웃는 얼굴이 먼저 도착해 있어서였어요.',
  병: '그 사람이 있는 쪽만 공기가 한 톤 밝았어요. 말을 걸기 전부터 이미 눈에 들어오는 사람이었습니다.',
  정: '한 사람만 보고 있는 눈빛이었어요. 그 눈빛이 이쪽으로 옮겨 오는 데 한참 걸렸는데, 그 한참이 이상하게 오래 남았습니다.',
  무: '표정이 거의 변하지 않는데도 자꾸 보게 됐어요. 흔들리지 않는 사람에게만 나오는 조용한 무게가 있었습니다.',
  기: '손에 뭘 챙겨 든 것 없이도 주변을 다 정리하고 있는 사람 같았어요. 서 있는 자리만 봐도 그게 보였습니다.',
  경: '걸음이 빠르고 방향이 분명했어요. 그 앞에 서면 나도 모르게 길을 비켜 주게 되는 사람이었습니다.',
  신: '옷 한 벌, 손에 든 잔 하나까지 다 골라서 쓴 사람이라는 게 한눈에 보였어요.',
  임: '멀리 보는 사람 특유의 느린 눈매였어요. 이쪽을 보는데도 어딘가 더 먼 곳을 같이 보는 것 같았습니다.',
  계: '조용한데 존재감이 있었어요. 말을 하지 않는데도, 지금 누가 어떤 기분인지 다 알고 있는 얼굴이었습니다.',
};

/** 최애의 첫마디 — 장소 변형마다 하나씩, 계절과 상관없이 읽히는 말 */
const FIRST_LINE = {
  목: [
    '“지금 바람, 좋네요. …저는 이 시간에 자주 걸어요.”',
    '“여기 앉아도 돼요? 이 자리에서만 책이 잘 읽혀서요.”',
  ],
  화: [
    '“지금 이거, 같이 봐요. 혼자 보기 아깝잖아요.”',
    '“여기 사람 많죠. 저쪽으로 빠져요, 제가 아는 자리 있어요.”',
  ],
  토: [
    '“이 책, 서가에 한 권뿐이에요. 제가 먼저 봤는데… 같이 볼래요?”',
    '“이 책, 여기서 처음 봤어요. …혹시 읽어 보셨어요?”',
  ],
  금: [
    '“저 작품, 보고 있었어요? 저는 저 모서리 때문에 왔어요.”',
    '“이 방, 좋죠. 저는 이 시간에만 와요.”',
  ],
  수: [
    '“비 그치고 나면 여기 물빛이 제일 예뻐요. …오늘 와서 다행이에요.”',
    '“이 자리, 원래 조용해요. …오늘은 좀 더 조용하네요.”',
  ],
};

/** 내가 그 순간에 보인 방식 — 내 일간 열 가지 */
const MY_MOMENT = {
  갑: '나는 한 박자 늦게 대답했어요. 대신 고개를 숙이지 않고 정면으로 봤습니다. 그게 내 방식이었어요.',
  을: '나는 먼저 웃고 그다음에 말했어요. 그 사람도 따라 웃었고, 그 웃음이 대화의 첫 문장이 됐습니다.',
  병: '나는 좋으면 티가 먼저 나는 사람이에요. “네.” 한마디였는데 목소리가 기뻐서, 그 사람도 눈을 조금 크게 떴어요.',
  정: '나는 대답 대신 한 발 더 가까이 섰어요. 말보다 그 거리가 먼저 전해졌는지, 그 사람은 물러서지 않았습니다.',
  무: '나는 이상하게 마음이 놓였어요. 그래서 서두르지 않고 그 사람 이야기를 끝까지 들었습니다.',
  기: '나는 먼저 자리를 정리했어요. 옆자리를 비켜 주고, 물잔을 조금 밀어 두고. 그 작은 것들이 내 말이었습니다.',
  경: '나는 망설이지 않고 먼저 말을 꺼냈어요. 나중에 생각해 보면 그 한마디가 전부였습니다.',
  신: '나는 마음에 들면 티를 숨기지 않아요. “그거 좋은데요.” 그 한마디에 그 사람이 처음으로 크게 웃었습니다.',
  임: '나는 엉뚱한 말을 먼저 던지는 편이에요. 그 말에 그 사람이 웃으면서, 첫 대화가 생각보다 길어졌습니다.',
  계: '나는 그 사람이 무슨 말을 하려는지 먼저 알아챘어요. 대신 재촉하지 않고 기다렸습니다. 그 침묵이 제일 좋았다고, 나중에 들었습니다.',
};

/** 헤어질 때 — 두 사람 일지의 관계가 남기는 여운 */
const AFTER = {
  육합: '헤어질 때 그 사람은 “또 봐요” 대신 “여기, 자주 와요?”라고 물었어요. 주소를 묻는 것보다 오래 남는 질문이었습니다.',
  삼합: '같은 방향으로 걸어 나오는 몇 분 동안 말이 끊기지 않았어요. 두 사람이 같은 걸 좋아한다는 게 그렇게 티가 나는 법이더군요.',
  충: '대화는 자꾸 부딪혔어요. 그런데 그 부딪힘이 이상하게 웃겼고, 돌아서서도 그 말이 계속 생각났습니다.',
  원진: '그날은 이유 없이 서운한 채로 헤어졌어요. 그런데 그 서운함이 오히려 그 사람을 잊지 못하게 만들었습니다.',
  형: '둘 다 비슷한 데서 실수했고, 둘 다 그걸 알아챘어요. 그날 이후로 우리는 서로의 약점을 먼저 알아보는 사이가 됐습니다.',
  파: '약속은 없이 헤어졌어요. 다만 그 사람이 돌아보며 한 번 웃었고, 나는 그 웃음을 다음 만남의 근거로 삼았습니다.',
};

/** 설렘 요약 — 내 앞에서만 보이는 모습 (최애의 사주 온도로 고른다) */
const HIDDEN_FACE = {
  cool: '남들 앞에서는 서늘하고 말수 적은 사람인데, 내 앞에서만 쓸데없는 얘기까지 다 꺼내요. 오늘 뭐 먹었는지, 길에서 본 강아지가 어땠는지까지. 그 수다가 마음을 놓았다는 신호예요.',
  mild: '사람들 앞에서는 누구에게나 비슷하게 다정한데, 내 앞에서만 장난이 한 단계 과해져요. 그 장난이 이 사람의 진짜 표정입니다.',
  hot: '무대 위에서는 온도가 확 올라가 먼저 웃고 먼저 말하는데, 내 앞에서는 이상하게 말수가 줄어요. 그 조용한 얼굴은 다른 사람에게 잘 안 보여 줍니다.',
};

/** 최애한테 직빵인 한 마디 — 최애가 목마른 기운별 */
const SWEET_WORD = {
  목: '“네가 하는 일, 나는 몇 년 뒤에도 보고 있을 것 같아.” — 자라는 사람에게는 칭찬보다 이 말이 오래 남아요.',
  화: '“오늘 진짜 멋있었어. 말 안 해도 표정에 다 써 있더라.” — 온도가 먼저 오르는 사람은, 알아챈 사람에게 약해요.',
  토: '“네가 있어서 이 자리가 편했어.” — 버티는 사람에게는 이 한마디가 오래 갑니다.',
  금: '“그 판단, 나는 믿어. 네가 그러면 나도 그래.” — 기준이 칼 같은 사람은, 신뢰를 기다리고 있어요.',
  수: '“말 안 해도 알아. 오늘은 그냥 쉬어.” — 안에서 오래 굴리는 사람에게는 이 말이 제일 깊이 들어가요.',
};

const DATE_PLACE = {
  목: '나무가 많은 공원, 화분 가득한 카페',
  화: '노을이 보이는 창가, 촛불 켜진 작은 바',
  토: '오래된 서점, 흙냄새 나는 산책로',
  금: '미술관, 정돈된 전시 공간',
  수: '강변 산책로, 비 오는 날의 조용한 바',
};

/** 데이트룩 — 데이트 장소의 오행(색·질감·분위기)에 맞춘 한 줄 코디 */
const DATE_LOOK = {
  목: '부드러운 크림 니트에 세이지 그린 아우터, 은은한 우드 향',
  화: '오프화이트 셔츠에 코랄 립, 가벼운 실크 스카프',
  토: '메이지 터틀넥에 카멜 코트, 매트한 가죽 가방',
  금: '아이보리 블라우스에 실버 액세서리, 정돈된 슬랙스',
  수: '딥네이비 니트에 블랙 코트, 물광 나는 스킨',
};

/** 시진 열두 개 — 첫 만남의 시각과 그때의 공기 */
const HOUR_SLOTS = [
  { clock: '밤 11시 40분', short: '밤 11시 40분', light: '막차가 끊긴 뒤의 조용한 불빛', arrive: '가게 불이 하나둘 꺼지는 시간이라 골목이 유난히 조용했어요.' },
  { clock: '새벽 1시 20분', short: '새벽 1시 20분', light: '간판 불빛만 남은 거리', arrive: '사람이 거의 없어서 발소리만 또렷했어요.' },
  { clock: '새벽 4시', short: '새벽 4시', light: '해 뜨기 전 가장 어두운 하늘', arrive: '누구도 나를 보지 않는 시간이라 이상하게 마음이 가벼웠어요.' },
  { clock: '아침 6시 10분', short: '아침 6시 10분', light: '첫차가 서는 시간의 푸른 빛', arrive: '아직 세상이 다 깨어나지 않은 시간이었어요.' },
  { clock: '아침 8시 15분', short: '아침 8시 15분', light: '햇살이 막 길 위로 내려앉는 시간', arrive: '아침 공기가 아직 차가워서, 손을 주머니에 넣고 걸었어요.' },
  { clock: '오전 10시 반', short: '오전 10시 반', light: '햇빛이 유리창에 비스듬히 드는 시간', arrive: '창가 자리만 빛이 남아 있어서 자연히 그쪽으로 걸었어요.' },
  { clock: '낮 12시 20분', short: '낮 12시 20분', light: '사람들이 가장 밝은 시간', arrive: '점심시간의 소란함이 오히려 나를 편하게 했어요.' },
  { clock: '오후 2시', short: '오후 2시', light: '점심이 지나 조용해진 오후', arrive: '한산한 시간이라 안쪽 자리가 텅 비어 있었어요.' },
  { clock: '오후 4시 반', short: '오후 4시 반', light: '노을이 막 들기 시작하는 시간', arrive: '빛이 금빛으로 기울기 시작했어요.' },
  { clock: '저녁 6시 반', short: '저녁 6시 반', light: '해가 지고 불이 켜지는 시간', arrive: '해가 지고 가게 불이 하나둘 켜졌어요.' },
  { clock: '밤 8시 40분', short: '밤 8시 40분', light: '거리가 가장 반짝이는 시간', arrive: '사람들의 웃음소리가 골목마다 번지는 시간이었어요.' },
  { clock: '밤 10시 15분', short: '밤 10시 15분', light: '막차를 앞둔 시간', arrive: '막차 시간을 몇 번이고 확인했지만 발걸음은 자꾸 느려졌어요.' },
];

/** '신(辛)' 처럼 괄호로 끝나는 표기에 조사를 붙일 때 — 받침은 한글 글자로 판단한다 */
const tailOf = (core, withB, withoutB) => josa(core, withB, withoutB).slice(core.length);

/** 인연의 별 — 남자에게는 재성, 여자에게는 관성 (전통 명리 기준) */
function partnerStarNames(chart) {
  return chart.input.gender === 'male' ? ['정재', '편재'] : ['정관', '편관'];
}

/** 서로 채워 주는 기운이 없을 때 — 무엇이 비어 있고 내가 무엇으로 서는지 정확히 쓴다 */
function fillFallback(me, bias, need) {
  const mine = me.ohaeng.count[need.primary] || 0;
  const second = me.ohaeng.count[need.secondary] || 0;
  if (mine === 0 && second >= 1) {
    const primaryLabel = `${need.primary}(${OHAENG_META[need.primary].han})`;
    const secondLabel = `${need.secondary}(${OHAENG_META[need.secondary].han})`;
    return `최애의 가장 목마른 ${primaryLabel}${tailOf(need.primary, '은', '는')} 내게 없어요. 대신 ${secondLabel}${tailOf(need.secondary, '을', '를')} ${second}개 가진 사람이라, 최애가 그쪽으로 지칠 때 내가 먼저 알아챕니다.`;
  }
  if (mine === 0 && second === 0) {
    const myStrong = me.ohaeng.strongest;
    const theirStrong = bias.ohaeng.strongest;
    const balances = SANGGEUK[myStrong] === theirStrong || SANGGEUK[theirStrong] === myStrong;
    return balances
      ? `최애가 필요한 ${need.primary}·${need.secondary}를 내가 많이 갖고 있진 않아요. 대신 내 ${myStrong} 기운이 최애의 ${theirStrong} 기운을 눌러 균형을 잡아 줍니다.`
      : `최애가 필요한 ${need.primary}·${need.secondary}를 내가 많이 갖고 있진 않아요. 그래서 이 궁합은 채워 주는 관계보다, 서로의 빈칸을 같이 배우는 관계에 가깝습니다.`;
  }
  return `최애에게 필요한 ${need.primary}(${OHAENG_META[need.primary].han})${tailOf(need.primary, '을', '를')} 나는 ${mine}개 갖고 있어요. 많지는 않지만, 그 하나가 이 궁합에서는 가장 자주 쓰이는 온도입니다.`;
}

/** 십성 묶음의 표준 이름 — 화면에는 이 말로 쓴다(품음 같은 새 말을 만들지 않는다) */
const GROUP_TERM = { 동료: '비겁', 표현: '식상', 벌이: '재성', 책임: '관성', 품음: '인성' };

/** 오행 목록을 '목·수' 처럼 잇는다 */
const joinOhaeng = (list) => list.join('·');

/**
 * 무료 맛보기 — 점수 + 새 4장의 앞머리(삼주육자 · 찰떡 1위 · 첫 만남 · 내 자리)
 * (990원 리포트가 '삼주육자 → 찰떡 일주 → 첫 만남 → 연애 궁합' 순서로 열린다는 것을 먼저 보여 준다)
 */
export function biasPreview(me, bias, name) {
  const r = biasReading(me, bias);
  const ideal = idealIlju(bias, me);
  const fm = firstMeeting(me, bias);
  const six = sixLetterSummary(bias);
  const top1 = ideal.top[0];
  const mine = ideal.mine;
  const nick = top1 && ILJU_60[top1.ilju] ? ILJU_60[top1.ilju].nick : '';
  return {
    score: r.score,
    band: r.band,
    oneLineLabel: `${josa(name, '과', '와')} 연인이 된다면?`,
    oneLine: `${r.band.title} — ${r.band.short}.`,
    rows: [
      [six.hourKnown ? '최애의 여덟 글자' : '최애의 삼주육자', `${six.pillars} — ${bias.dayMaster.ko}(${bias.dayMaster.han}) 일간`],
      ['찰떡인 일주', top1 ? `1위 ${top1.ilju}${nick ? ` (${nick})` : ''} · 나머지 둘은 리포트에서` : '리포트에서'],
      ['우리 첫 만남', `${fm.season.key} · ${PLACE_SHORT[fm.place.ohaeng]} · ${HOUR_SLOTS[fm.hour.branch].short}`],
      ['내 자리', mine && mine.rank
        ? `내 일주 ${josa(mine.ilju, '은', '는')} 60일주 중 ${mine.rank}위${mine.inTop ? ' — TOP 3 안!' : ''}`
        : `내 일주가 최애와 같아요 — 같은 결끼리`],
    ],
    chips: [
      `${me.dii}띠 × ${bias.dii}띠`,
      `일간 ${r.stem.kind}`,
      `설렘 ${r.spark}점`,
    ],
  };
}

/** 1장) 최애의 삼주육자 — 여섯 글자로 읽는 진짜 성격 (팬이 몰래 공부하는 느낌) */
function sixPillars(me, bias, name, ideal, { freeBlocks = 2 } = {}) {
  const six = sixLetterSummary(bias);
  const p = bias.pillars;
  const bIl = ILGAN[bias.dayMaster.ko];
  const bJj = JIJI[p.day.branchKo];
  const need = ideal.need;
  const role = roleOf(bias);
  const strongCount = bias.ohaeng.count[bias.ohaeng.strongest] || 0;
  const missingText = need.missing.length
    ? `${joinOhaeng(need.missing)} 비어 있음`
    : '다섯 기운 다 있음';
  const thinWord = need.primaryFrom === 'missing'
    ? `${need.primary}(${OHAENG_META[need.primary].han}) 기운이 여섯 글자에 아예 없어요`
    : `${need.primary}(${OHAENG_META[need.primary].han}) 기운이 여섯 글자에서 가장 얇아요`;
  const members = role.members.join('·');
  const threePillars = `${p.year.ko}(${p.year.han}) · ${p.month.ko}(${p.month.han}) · ${p.day.ko}(${p.day.han})`;

  return {
    id: 'bi-six',
    heading: `${name}의 삼주육자`,
    kicker: 'SIX LETTERS',
    locked: true,
    freeBlocks,
    blocks: [
      { t: 'p', v: `팬이라면 한 번쯤 궁금했을 거예요. 카메라 앞의 그 사람과, 불 꺼진 뒤의 그 사람이 같은 사람인지. 여섯 글자는 그 질문에 답하는 가장 오래된 방법입니다.` },
      { t: 'kv', v: [
        ['삼주육자', threePillars],
        ['일간', `${bias.dayMaster.ko}(${bias.dayMaster.han}) — ${bIl.keyword}`],
        ['띠 · 사주 온도', `${bias.dii}띠 · ${bias.ohaeng.temp}°C (${bias.ohaeng.label})`],
        ['기운의 균형', `${bias.ohaeng.strongest} ${strongCount}개 · ${missingText}`],
      ] },
      { t: 'p', v: six.hourKnown
        ? `${name}는 태어난 시간까지 알려져 있어 여덟 글자로 읽을 수 있어요. 그중에서도 성격의 뼈대는 연·월·일 세 기둥 — 삼주육자에서 거의 다 나옵니다. 이 여섯 글자만 읽어도 무대 위의 얼굴과 무대 밖의 기질이 같이 보여요.`
        : `${name}의 생시는 공개되지 않았죠. 그래서 우리는 연·월·일 세 기둥, 여섯 글자로 읽어요. 시주 한 칸이 비어 있다고 성격이 비는 건 아니에요 — 이 여섯 글자에 무대 위의 얼굴과 무대 밖의 기질이 같이 들어 있습니다.` },
      { t: 'p', v: `여섯 글자에서는 ${GROUP_TERM[role.group]}(${members}) 쪽 기운이 가장 많아요. ${role.line}` },
      { t: 'box', list: true, title: `${name}의 진짜 성격 — 팬만 아는 다섯 줄`, v: [
        `무대 위 — ${DAY_SCENE[bias.dayMaster.ko] || bIl.keyword}`,
        `무대 밖 — ${PRIVATE[bias.dayMaster.ko]}`,
        `습관 — ${HABIT[p.day.branchKo]}`,
        `마음결 — ${thinWord}. ${HOLLOW_LINE[need.primary]}`,
        `팬만 아는 포인트 — ${tempPoint(bias)}`,
      ] },
      { t: 'p', v: `일지 ${p.day.branchKo}(${p.day.branchHan})의 결은 ‘${bJj.tone}’이에요. ${bJj.line}` },
      { t: 'q', v: `무대 위의 얼굴은 여섯 글자의 한 면일 뿐이에요. 나머지 다섯 면은 이제부터 팬만 아는 이야기입니다.` },
    ],
  };
}

/** TOP 3 일주 한 줄 이유 — 계산에 실제로 쓰인 근거만, 읽히는 문장으로 옮긴다 */
function iljuReason(row, bias, need, name, rank = 1) {
  const their = bias.pillars.day;
  const theirBranch = `${their.branchKo}(${their.branchHan})`;
  const stemLabel = `${row.stemKo}(${row.han[0]})`;
  const branchLabel = `${row.branchKo}(${row.han[1]})`;
  const label = (m) => (m === 'primary'
    ? `${need.primary}(${OHAENG_META[need.primary].han})`
    : `${need.secondary}(${OHAENG_META[need.secondary].han})`);
  const needWord = need.primaryFrom === 'missing' ? '비어 있는' : '가장 얇은';
  const stemMatch = row.match.stem;
  const branchMatch = row.match.branch;

  // ① 최애에게 필요한 기운을 내주는 자리 — 일간과 일지가 함께 채우면 그걸 먼저 말한다
  // 두 기운을 다 채우는 경우, 2위 문장은 어순을 바꿔 세 줄이 같은 틀로 읽히지 않게 한다
  const needSentence = stemMatch && branchMatch
    ? (rank === 2
      ? `일지 ${branchLabel}의 ${label(branchMatch)}, 일간 ${stemLabel}의 ${label(stemMatch)} — 필요한 두 기운을 한 사람이 다 갖고 태어났어요`
      : `일간 ${stemLabel}의 ${label(stemMatch)}, 일지 ${branchLabel}의 ${label(branchMatch)} — 최애에게 필요한 두 기운을 한 사람이 다 갖고 태어났어요`)
    : stemMatch
      ? `일간 ${stemLabel}${tailOf(row.stemKo, '은', '는')} 최애에게 ${needWord} ${label(stemMatch)} 기운을 지고 태어났어요`
      : branchMatch
        ? `일지 ${branchLabel}${tailOf(row.branchKo, '이', '가')} 최애에게 ${needWord} ${label(branchMatch)} 기운을 지고 태어났어요`
        : '';

  // ② 일지 관계 — 생활에서 부딪히는지 붙는지
  const branchSentence = row.match.branchRel === '육합'
    ? `일지 ${branchLabel}${tailOf(row.branchKo, '이', '가')} 최애의 일지 ${theirBranch}${tailOf(their.branchKo, '과', '와')} 육합 — 생활 리듬이 저절로 맞아요`
    : row.match.branchRel === '삼합'
      ? `일지 ${branchLabel}${tailOf(row.branchKo, '이', '가')} 최애의 일지 ${theirBranch}${tailOf(their.branchKo, '과', '와')} 삼합 — 같은 방향을 보는 사이입니다`
      : row.match.branchRel === '충'
        ? '일지는 충이라 생활 습관에서 부딪히지만, 그 부딪힘이 설렘으로 남는 자리예요'
        : (row.match.branchRel === '원진' || row.match.branchRel === '형' || row.match.branchRel === '파')
          ? `일지가 ${row.match.branchRel} — 서운함이 쌓이기 쉬운데, 그만큼 서로를 쉽게 놓지 못해요`
          : '';

  // ③ 일간 관계 — 말이 통하는지, 끌리는지
  const stemSentence = row.match.stemKind === '합'
    ? `일간 ${their.stemKo}와 천간합이라 말이 통하고, 처음 만나도 어색하지 않은 자리예요`
    : row.match.stemKind === '상생'
      ? (SANGSAENG[row.stemOhaeng] === bias.dayMaster.ohaeng
        ? '일간이 최애를 낳아 주는 자리 — 최애가 지칠 때 힘이 되어 주는 쪽이에요'
        : '최애가 그 사람을 낳아 주는 자리 — 곁에 있으면 편하게 기대는 쪽이에요')
      : row.match.stemKind === '충'
        ? '일간은 정면으로 부딪히는 충 — 처음엔 세게 끌리지만, 그만큼 오래 기억되는 자리예요'
        : row.match.stemKind === '극'
          ? '일간이 서로를 누르는 자리 — 끌리는데 숨이 조금 막히는 사이입니다'
          : '';

  // ④ 온도 — 최애의 뜨겁고 서늘한 정도를 맞춰 주는지
  const tempSentence = row.match.temp === 'cool'
    ? '뜨거운 최애의 사주 옆에서 온도를 한 칸 낮춰 주는 사람이에요'
    : row.match.temp === 'warm'
      ? '서늘한 최애의 사주 옆에서 온도를 한 칸 올려 주는 사람이에요'
      : '';

  // 일지 하나가 필요 기운과 관계를 동시에 만들면, 두 문장으로 쪼개지 않고 한 문장에 붙인다
  const branchOnly = !stemMatch && branchMatch && branchSentence && row.match.branchRel;
  const combined = branchOnly
    ? `일지 ${branchLabel}${tailOf(row.branchKo, '이', '가')} 최애의 일지 ${theirBranch}${tailOf(their.branchKo, '과', '와')} ${row.match.branchRel}이면서, 최애에게 ${needWord} ${label(branchMatch)} 기운을 함께 내줘요`
    : '';
  const first = combined || needSentence || branchSentence || stemSentence || tempSentence;
  const second = (combined ? [stemSentence, tempSentence] : [branchSentence, stemSentence, tempSentence])
    .find((x) => x && x !== first) || '';

  const tails = [
    ` ${josa(name, '이', '가')} 먼저 말을 걸어도 이상하지 않은 자리입니다.`,
    ` ${josa(name, '이', '가')} 두 번째 만남에서 이 사람을 기억할 가능성이 큽니다.`,
    ' 처음엔 조용하지만, 같이 있을수록 편해지는 자리예요.',
  ];
  const head = [first, second].filter(Boolean).join('. ')
    || `일간과 일지가 서로 비켜 있어 부딪힘이 적은 자리예요. ${josa(name, '의', '의')} 결을 방해하지 않는 사람입니다`;
  return `${head}.${tails[(rank - 1) % tails.length]}`;
}

/** 2장) 최애와 찰떡인 일주 TOP 3 — 이상형 포인트 + 필요 오행·합·조후로 고른 세 일주 */
function topIlju(me, bias, name, ideal, { freeBlocks = 4 } = {}) {
  const need = ideal.need;
  const mine = ideal.mine;
  const rankWord = ['1위', '2위', '3위'];
  const pull = PULL[need.primary];
  const needLine = need.primaryFrom === 'missing'
    ? `최애에게 ${need.primary}(${OHAENG_META[need.primary].han}) 기운이 아예 없어요`
    : `최애에게 ${need.primary}(${OHAENG_META[need.primary].han}) 기운이 가장 얇아요`;
  const blocks = [
    { t: 'p', v: `${needLine}. 그다음으로 목마른 기운은 ${need.secondary}(${OHAENG_META[need.secondary].han}), 사주 온도는 ${bias.ohaeng.temp}°C예요. 이 세 가지와 일간·일지의 합을 60일주에 하나씩 대입해 봤습니다.` },
    { t: 'sub', v: `${josa(name, '이', '가')} 끌리는 이상형 포인트` },
    { t: 'li', v: [
      `기운 — ${need.primary}(${OHAENG_META[need.primary].han}) ${OHAENG_META[need.primary].keyword}. ${pull.temper}`,
      `성격 — ${pull.who}`,
      `말투 — ${pull.talk}`,
      `분위기 — ${pull.mood}`,
    ] },
  ];
  ideal.top.forEach((row, i) => {
    const nick = ILJU_60[row.ilju] ? ILJU_60[row.ilju].nick : '';
    blocks.push({ t: 'sub', v: `[${rankWord[i] || `${i + 1}위`}] ${row.ilju}(${row.han})${nick ? ` — ${nick}` : ''}` });
    blocks.push({ t: 'p', v: `${iljuReason(row, bias, need, name, i + 1)}` });
  });
  if (mine) {
    if (mine.sameAsBias) {
      blocks.push({ t: 'p', v: `내 일주가 최애와 같은 ${mine.ilju}일주예요. 같은 결끼리는 끌림보다 편안함이 먼저 와서 이 목록에서는 뺐습니다. 대신 다음 장의 첫 만남에서 내 여섯 글자 전체로 다시 볼게요.` });
    } else if (mine.inTop) {
      const rank = ideal.top.findIndex((row) => row.ilju === mine.ilju) + 1;
      blocks.push({ t: 'p', v: `어! 내 일주 ${josa(mine.ilju, '이', '가')} ${rankWord[rank - 1]}에 있어요. 최애가 끌리는 자리에 내 기본 결이 딱 들어갔습니다. 이건 시작부터 한 칸 앞서 있는 셈이에요.` });
    } else {
      blocks.push({ t: 'p', v: `내 일주 ${josa(mine.ilju, '은', '는')} 이 기준으로 60일주 중 ${mine.rank}위예요. 일주 하나로는 앞자리가 아니지만, 궁합은 여섯 글자로 읽습니다. 다음 장에서 내 사주 전체로 다시 볼게요.` });
    }
  }
  blocks.push({ t: 'q', v: `일주는 사람의 기본 결이고, 궁합은 그 위에 얹히는 여섯 글자의 대화예요.` });
  return {
    id: 'bi-top3',
    heading: `${josa(name, '과', '와')} 찰떡인 일주 TOP 3`,
    kicker: 'TOP 3',
    locked: true,
    freeBlocks,
    blocks,
  };
}

/** 3장) 우리의 첫 만남은? — 두 사주의 월지 계절과 필요 오행으로 고른 웹소설급 한 장면 */
function firstMeetingChapter(me, bias, name, r, ideal, { freeBlocks = 2 } = {}) {
  const fm = firstMeeting(me, bias);
  const need = ideal.need;
  const s = fm.season;
  const p = fm.place;
  const h = fm.hour;
  const spot = PLACE_SCENE[p.ohaeng][p.variant];
  const placeText = spot.name;
  const time = HOUR_SLOTS[h.branch];
  const stem = bias.dayMaster.ko;

  const seasonWhy = s.mineSeason && s.theirSeason
    ? `두 사람 다 그 계절에 태어난 셈이라, 그 공기가 서로 낯설지 않습니다.`
    : s.mineSeason
      ? `내가 태어난 계절이라, 내 쪽이 먼저 그 자리에 서 있는 장면이에요.`
      : s.theirSeason
        ? `${name}의 월지가 그 계절이라, 최애 쪽이 먼저 그 자리에 서 있는 장면입니다.`
        : `두 사주에서 그 계절의 기운이 가장 두껍게 올라온 자리예요.`;
  const placeWhy = p.sharedThin
    ? '두 사람 모두 비어 있던 기운이 채워지는 자리'
    : p.mine === 0
      ? '최애가 목마른 기운을 내가 들고 가는 자리'
      : p.theirs === 0
        ? '최애에게 비어 있는 기운을 내가 가진 자리'
        : '최애가 목마른 기운이 이미 있는 자리';
  const gapLine = r.temp.gap >= 7
    ? `나는 ${tempWord(me.ohaeng.temp)} 사람이고, 그 사람은 ${tempWord(bias.ohaeng.temp)} 사람이었어요. 그래서 더 자꾸 보게 됐습니다.`
    : '';

  return {
    id: 'bi-first',
    heading: '우리의 첫 만남은?',
    kicker: 'FIRST MEETING',
    locked: true,
    freeBlocks,
    blocks: [
      { t: 'p', v: `내 월지 ${fm.myMonthBranch} — ${fm.mySeason}, ${josa(name, '의', '의')} 월지 ${fm.theirMonthBranch} — ${fm.theirSeason}. 여기에 서로에게 필요한 ${need.primary}(${OHAENG_META[need.primary].han})·${need.secondary}(${OHAENG_META[need.secondary].han}) 기운을 겹쳐 보니, 두 사람의 첫 장면이 ${josa(s.key, '으로', '로')} 잡혔습니다. ${seasonWhy}` },
      { t: 'kv', v: [
        ['계절', `${s.key} — ${SEASON[s.key].short}`],
        ['장소', `${placeText} (${p.direction} 방향)`],
        ['시간', `${time.clock} — ${time.light}`],
        ['그날의 기운', `${s.ohaeng}(${OHAENG_META[s.ohaeng].han})의 계절 · ${p.ohaeng}(${OHAENG_META[p.ohaeng].han})의 자리 — ${placeWhy}`],
      ] },
      { t: 'box', tone: 'scene', title: `${s.key}의 ${PLACE_SHORT[p.ohaeng]} — 한 장면`, v: [
        `${SEASON[s.key].prose} 나는 ${time.clock} 무렵 ${placeText}에 도착했어요. ${time.arrive} ${spot.prose}`,
        `${spot.moment} 그 사람은 ${josa(name, '이었어요', '였어요')}. ${[FIRST_LOOK[stem], gapLine, FIRST_LINE[p.ohaeng][h.variant]].filter(Boolean).join(' ')}`,
        `목소리가 생각보다 낮았어요. ${MY_MOMENT[me.dayMaster.ko]} ${AFTER[r.ilju.rel] || '그날은 스쳐 지나가는 사람처럼 헤어졌어요. 그런데 다음 주 같은 시간, 같은 자리에 그 사람이 또 있었습니다.'}`,
      ] },
      { t: 'q', v: `이 장면이 진짜 일어날지는 아무도 모르죠. 다만 이 사주 조합이라면 — 적어도 내가 먼저 알아볼 사람이라는 것만은 확실해요.` },
    ],
  };
}

/** 4장) 그래서 나랑 연애하면 어떨까? — 점수·설렘·빈틈·엇박자·빛나는 달 + 설렘 요약 3줄 */
function usChemi(me, bias, name, r, ideal, { freeBlocks = 2 } = {}) {
  const mIl = ILGAN[me.dayMaster.ko];
  const need = ideal.need;
  const fit = myFit(me, bias, need);
  const fm = firstMeeting(me, bias);
  const placeMine = PLACE[me.ohaeng.missing[0] || me.ohaeng.strongest];
  const placeTheirs = PLACE[need.primary];
  const fitLine = fit.primary >= 1
    ? `내 여섯 글자에는 ${josa(need.primary, '이', '가')} ${fit.primary}개 있어요. 최애에게 ${need.primaryFrom === 'missing' ? '비어 있는 쪽' : '가장 얇은 쪽'}을 내가 이미 갖고 태어난 셈입니다.`
    : fit.secondary >= 1
      ? `최애의 첫 번째 자리인 ${need.primary}(${OHAENG_META[need.primary].han})${tailOf(need.primary, '은', '는')} 내게 없고, 대신 두 번째 자리인 ${need.secondary}(${OHAENG_META[need.secondary].han})${tailOf(need.secondary, '을', '를')} ${fit.secondary}개 갖고 있어요. 그 한 칸이 이 궁합의 접점입니다.`
      : `내 사주에 ${need.primary}(${OHAENG_META[need.primary].han})${tailOf(need.primary, '은', '는')} ${fit.primary}개로 많지 않아요. ${fit.balance
        ? `대신 내 ${me.ohaeng.strongest} 기운이 최애의 넘치는 ${josa(bias.ohaeng.strongest, '을', '를')} 눌러 균형을 잡아 줍니다.`
        : '그래서 이 궁합은 채워 주는 관계보다, 같이 배우는 관계에 가깝습니다.'}`;
  const fills = fillLines(me, bias, r.fill);
  const syn = synergyMonths(me, bias);
  const { best, caution, peak } = syn;
  const pick = [...best, ...caution.slice(0, 2)].sort((a, b) => b.score - a.score);
  const discords = discordLines(me, bias, r);
  const miss = r.temp.gap >= 7
    ? '속도가 아쉬워요. 마음이 식는 타이밍이 서로 달라서, 내가 식은 뒤에 상대가 데워지는 일이 생겨요.'
    : null;

  // 설렘 요약 3줄 — 사주 온도·필요 기운·조후로 고른다
  const hidden = HIDDEN_FACE[bias.ohaeng.temp <= 21 ? 'cool' : bias.ohaeng.temp >= 26 ? 'hot' : 'mild'];
  const avgTemp = (me.ohaeng.temp + bias.ohaeng.temp) / 2;
  const courseHead = avgTemp <= 21.5
    ? '사람 적은 독립서점에서 시작해 조용한 밤 산책으로'
    : avgTemp >= 26.5
      ? '축제나 공연을 먼저 보고, 끝나고 늦은 카페에서 그날 얘기를 정리하는 순서로'
      : '한 사람이 좋아하는 조용한 곳에서 시작해, 다른 사람이 좋아하는 밝은 곳으로 올라가는 코스로';
  const course = `${courseHead}. 중간에 ${DATE_PLACE[fm.place.ohaeng]} 같은 자리를 끼워 두면 두 사람 온도가 같이 올라가요.`;
  const look = `${DATE_LOOK[fm.place.ohaeng]}. 포인트는 ${OHAENG_META[need.primary].color} 하나 — 최애에게 목마른 ${need.primary}(${OHAENG_META[need.primary].han}) 기운을 옷에 얹는 셈이에요.`;

  return {
    id: 'bi-us',
    heading: '그래서 나랑 연애하면 어떨까?',
    kicker: 'YOU & ME',
    locked: true,
    freeBlocks,
    blocks: [
      { t: 'score', value: r.score, label: r.band.title, note: r.band.line },
      { t: 'p', v: `최애가 끌리는 결로 다시 놓고 봤어요 — ${need.primary}(${OHAENG_META[need.primary].han}) ${OHAENG_META[need.primary].keyword}. ${fitLine}` },
      { t: 'kv', v: [
        ['일지 케미', `${me.pillars.day.ko} × ${bias.pillars.day.ko} · ${r.ilju.title}`],
        ['일간 케미', r.stem.label],
        ['사주 온도', `${me.ohaeng.temp}°C ↔ ${bias.ohaeng.temp}°C (${r.temp.gap}도 차)`],
        ['설렘 지수', `${r.spark}점`],
      ] },
      { t: 'sub', v: '설렘 포인트 셋' },
      { t: 'li', v: [
        `${r.ilju.title} — ${r.ilju.line}`,
        `내 매력이 닿는 곳 — ${mIl.charm}`,
        placeMine === placeTheirs
          ? `첫 만남의 자리 — 두 사람 다 ${placeMine} 같은 곳에서 마음이 풀려요. 그런 곳에서 마주치면 대화가 오래 갑니다.`
          : `첫 만남의 자리 — 내 사주는 ${placeMine} 같은 곳에서 마음이 먼저 열리고, 최애는 ${placeTheirs} 같은 곳에서 긴장을 풉니다. 두 장소가 겹치는 하루가 이 궁합의 첫 장면이에요.`,
      ] },
      { t: 'sub', v: '내가 최애의 빈틈을 채우는 방식' },
      { t: 'li', v: fills.length ? fills : [fillFallback(me, bias, need)] },
      { t: 'sub', v: '오행 케미 — 나 · 최애' },
      { t: 'table', head: ['오행', '나 · 최애', '읽기'], rows: ohaengCompare(me, bias).map((x) => [`${x.ohaeng}(${OHAENG_META[x.ohaeng].han})`, `나 ${x.mine} · 최애 ${x.theirs}`, x.note]) },
      { t: 'sub', v: '조심할 엇박자' },
      { t: 'li', v: miss ? [miss, ...discords] : discords },
      { t: 'sub', v: '두 사람이 빛나는 달 (2026~2027)' },
      { t: 'kv', v: [
        ['가장 빛나는 달', `${peak.label} · ${peak.score}점`],
        ['그다음 달', `${best[1].label} · ${best[1].score}점`],
        ['세 번째 달', `${best[2].label} · ${best[2].score}점`],
        ['숨 고를 달', `${caution[0].label} · ${caution[0].score}점`],
      ] },
      { t: 'table', head: ['달', '월건', '읽기'], rows: pick.map((m) => [`${m.label} · ${m.score}점`, `${m.ganji} · ${m.mySipsung}/${m.theirSipsung}`, `${m.line}${m.note ? ` (${m.note})` : ''}`]) },
      { t: 'p', v: `가장 빛나는 달은 ${peak.label}이에요. ${peak.line}. 이 달에는 ${name}의 소식이든 내 쪽의 좋은 일이든 “먼저 반응하는 쪽”이 되어 보세요. 이 궁합은 반응이 오갈 때 온도가 올라갑니다.` },
      { t: 'box', tone: 'warm', title: '설렘 요약 — 이 넷만 기억해요', rows: [
        ['내 앞에서만 보이는 모습', hidden],
        ['최애한테 직빵인 한 마디', SWEET_WORD[need.primary]],
        ['둘이 잘 맞는 데이트', course],
        ['오늘 입으면 찰떡인 데이트룩', look],
      ] },
      { t: 'q', v: `${name}의 이상형은 목록이 아니라 온도예요. 나는 그 온도에 몇 도쯤 닿아 있는 사람인지가 이 궁합의 답입니다.` },
    ],
  };
}

/** 오늘의 다락방 처방 — 최애 궁합 행운 색·숫자·팁
 *  2026-11-22 시연 님 지시로 유료 리포트 다섯 장에서 뺐다. (무료 원국·앱에서 따로 쓰실 예정)
 *  계산·문구는 지우지 않고 여기에 보관한다. */
function todayForTwo(me, bias, name, now = new Date()) {
  const f = todayFortune(me, now);
  const lucky = biasLucky(me, bias, now);
  return {
    id: 'bi-today',
    heading: '오늘의 다락방 처방 — 최애 궁합 행운 색·숫자·팁',
    kicker: 'TODAY',
    locked: true,
    freeBlocks: 1,
    blocks: [
      { t: 'kv', v: [
        ['오늘의 일진', `${f.ganji}(${f.ganjiHan}) · ${f.dateLabel}`],
        ['행운의 색', `${lucky.color} — ${lucky.colorWhy}`],
        ['행운의 숫자', `${lucky.number}`],
        ['좋은 시간', lucky.time],
      ] },
      { t: 'p', v: lucky.tip },
      { t: 'li', v: [
        `색 — 오늘은 ${josa(lucky.color, '이', '가')} 들어간 물건을 하나 곁에 두세요. ${lucky.ohaeng}의 기운을 눈으로 먼저 채우는 방식이에요.`,
        `숫자 — 오늘의 행운 숫자는 ${lucky.number}. 사진을 고르거나, ${lucky.number}번째로 마음에 남는 장면을 하나 기록해 보세요.`,
        `시간 — ${lucky.time}에는 ${name}의 이름을 한 번 불러 보세요. 소리로 꺼낸 이름이 오늘의 기운을 데웁니다.`,
      ] },
      { t: 'p', v: `오늘 나의 흐름은 ${f.score}점이에요. ${f.notes[0] || ''}` },
      { t: 'q', v: '좋아하는 마음은 숨겨도 기운으로 남아요. 오늘은 그 기운을 한 번만 밖으로 꺼내 보세요.' },
    ],
  };
}

/**
 * 최애궁합 섹션 4장 — ① 삼주육자 ② 찰떡 일주 TOP 3 ③ 우리의 첫 만남은? ④ 그래서 나랑 연애하면?
 * @param {object} me 내 명식
 * @param {object} bias 최애 명식 (시주 없어도 됨)
 * @param {string} biasName 최애 이름
 * @param {object} now 이번 달 기준 (월 흐름은 2026~2027 고정)
 */
export function biasSections(me, bias, biasName, now = new Date(), { freeBlocks = 2 } = {}) {
  const r = biasReading(me, bias);
  const ideal = idealIlju(bias, me);
  return [
    sixPillars(me, bias, biasName, ideal, { freeBlocks }),
    topIlju(me, bias, biasName, ideal, { freeBlocks: Math.max(4, freeBlocks + 2) }),
    firstMeetingChapter(me, bias, biasName, r, ideal, { freeBlocks: Math.max(2, freeBlocks) }),
    usChemi(me, bias, biasName, r, ideal, { freeBlocks: Math.max(1, freeBlocks) }),
  ];
}
