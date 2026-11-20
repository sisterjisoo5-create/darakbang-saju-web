// 대한민국 시간(Asia/Seoul) — 기기 시간대와 무관하게 계산한다.
// 입력 화면(#/input)의 기본 생년월일시를 '지금 이 순간'으로 채우는 데 쓴다.
// (해외에서 접속하거나 기기 시간대가 달라도 한국 시간 기준으로 열리도록)

const SEOUL_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/** 대한민국 표준시 기준 { year, month, day, hour, minute, second } */
export function seoulNow(now = new Date()) {
  const parts = {};
  for (const p of SEOUL_FMT.formatToParts(now)) {
    if (p.type !== 'literal') parts[p.type] = p.value;
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/**
 * 입력 화면 기본값 — 저장된 생년월일시 기록이 없을 때 쓰는 값.
 * 고정 날짜가 아니라 접속한 시점의 대한민국 현재 시각을 그대로 채운다.
 */
export function defaultBirthInput(now = new Date()) {
  const t = seoulNow(now);
  return {
    calendar: 'solar',
    year: t.year,
    month: t.month,
    day: t.day,
    hour: t.hour,
    minute: t.minute,
    timeUnknown: false,
    gender: 'female',
    leap: false,
  };
}
