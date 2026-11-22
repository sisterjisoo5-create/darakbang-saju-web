// 오늘의 다락방 운세 — 날짜 + 원국으로 결정되는 하루 운세 (같은 날엔 항상 같은 결과)
import { STEMS, BRANCHES, OHAENG_META, SANGSAENG, SANGGEUK } from './constants.js';
import { dayIndexFromDate } from './saju.js';
import { withJosa } from './compat.js';
import { TODAY_LINE } from '../content/data.js';

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

/** TODAY 라벨 — 원국 없이도 같은 형식으로 오늘 날짜를 보여 준다 */
export function todayDateLabel(now = new Date()) {
  return `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${WEEKDAY[now.getDay()]}요일`;
}

function seedOf(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function todayFortune(chart, now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const idx = dayIndexFromDate(y, m, d);
  const stem = idx % 10;
  const branch = idx % 12;
  const todayStem = STEMS[stem];
  const todayBranch = BRANCHES[branch];
  const my = STEMS[chart.dayStem];

  let score = 68;
  const notes = [];
  if (todayStem.ohaeng === my.ohaeng) {
    score += 8;
    notes.push(`오늘의 ${todayStem.ohaeng} 기운이 당신의 ${withJosa(my.ohaeng, '과', '와')} 같은 결이에요. 내 속도대로 가면 됩니다.`);
  } else if (SANGSAENG[todayStem.ohaeng] === my.ohaeng) {
    score += 14;
    notes.push(`오늘의 ${withJosa(todayStem.ohaeng, '이', '가')} 당신의 ${withJosa(my.ohaeng, '을', '를')} 도와주는 상생의 날이에요. 미뤄둔 일을 꺼내기 좋습니다.`);
  } else if (SANGSAENG[my.ohaeng] === todayStem.ohaeng) {
    score += 6;
    notes.push(`당신이 오늘의 기운을 밀어주는 날이에요. 에너지를 밖으로 쓰면 결과가 보입니다.`);
  } else if (SANGGEUK[todayStem.ohaeng] === my.ohaeng) {
    score -= 8;
    notes.push(`오늘은 ${todayStem.ohaeng}의 기운이 당신의 ${withJosa(my.ohaeng, '을', '를')} 누르는 날이에요. 무리한 결단은 미루세요.`);
  } else {
    score -= 3;
    notes.push(`오늘은 ${withJosa(my.ohaeng, '이', '가')} ${withJosa(todayStem.ohaeng, '을', '를')} 다루는 날이에요. 정리와 마무리에 힘이 실립니다.`);
  }

  if (todayBranch.animal === chart.animal) {
    score += 5;
    notes.push('내 띠의 날이라 익숙한 사람에게 연락이 오기 좋아요.');
  }
  if (todayBranch.ko === chart.pillars.day.branchKo) {
    score += 4;
    notes.push('일지가 같은 날이라 컨디션이 안정적이에요.');
  }

  const seed = seedOf(`${y}-${m}-${d}-${chart.pillars.day.ko}-${chart.dayStem}`);
  const jitter = (seed % 11) - 5;
  score = Math.max(45, Math.min(97, score + jitter));

  const line = TODAY_LINE[seed % TODAY_LINE.length];
  const meta = OHAENG_META[todayBranch.ohaeng];
  const hours = ['07:00~09:00', '09:00~11:00', '11:00~13:00', '15:00~17:00', '17:00~19:00', '21:00~23:00'];

  return {
    dateKey: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    dateLabel: todayDateLabel(now),
    ganji: `${todayStem.ko}${todayBranch.ko}`,
    ganjiHan: `${todayStem.han}${todayBranch.han}`,
    score,
    notes,
    line,
    lucky: {
      color: meta.color,
      number: (seed % 9) + 1,
      time: hours[seed % hours.length],
      keyword: meta.keyword,
    },
  };
}
