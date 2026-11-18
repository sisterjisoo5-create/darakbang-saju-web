# -*- coding: utf-8 -*-
"""한국 음력 테이블 생성기 (1900~2050)

korean_lunar_calendar (한국천문연구원 음양력 데이터 기반)에서 음력 월 시작일을 읽어
JS 번들에 넣을 수 있는 압축 테이블을 만든다.

출력: src/engine/koreanLunar.data.js

형식
  { base: '1900-01-31', years: [ { y, leap, len: [m1..m12, leapLen?] }, ... ] }
  len 은 음력 각 달의 일수(29/30), leap 은 윤달이 낀 '월 번호'(없으면 0)
"""
import json
import os
import datetime
from korean_lunar_calendar import KoreanLunarCalendar as K

START, END = 1900, 2049


def lunar_month_start(y, m, leap=False):
    c = K()
    ok = c.setLunarDate(y, m, 1, leap)
    if not ok:
        return None
    # setLunarDate 는 결과가 유효할 때만 true, 값이 어긋나면 False
    if c.lunarYear != y or c.lunarMonth != m or bool(c.isIntercalation) != leap:
        return None
    return datetime.date(c.solarYear, c.solarMonth, c.solarDay)


def main():
    years = []
    for y in range(START, END + 1):
        starts = []  # (month, leap, date)
        for m in range(1, 13):
            d = lunar_month_start(y, m, False)
            if d is None:
                raise SystemExit(f'lunar month missing: {y}-{m}')
            starts.append((m, False, d))
            ld = lunar_month_start(y, m, True)
            if ld is not None:
                starts.append((m, True, ld))
        starts.sort(key=lambda t: t[2])
        leap_month = 0
        lengths = []
        for i, (m, leap, d) in enumerate(starts):
            nxt = starts[i + 1][2] if i + 1 < len(starts) else None
            if nxt is None:
                # 마지막 달: 다음 해 1월 1일과의 차이로 계산
                nxt = lunar_month_start(y + 1, 1, False)
            lengths.append((nxt - d).days)
            if leap:
                leap_month = m
        if len(lengths) not in (12, 13):
            raise SystemExit(f'unexpected month count {y}: {len(lengths)}')
        years.append({'y': y, 'leap': leap_month, 'len': lengths})

    base = lunar_month_start(START, 1, False)
    payload = {
        'base': base.isoformat(),
        'years': [f"{r['y']}|{r['leap']}|{''.join(str(n) for n in r['len'])}" for r in years],
    }
    out = os.path.join(os.path.dirname(__file__), '..', 'src', 'engine', 'koreanLunar.data.js')
    out = os.path.abspath(out)
    body = (
        '// 자동 생성 파일 — scripts/gen-lunar-table.py (korean_lunar_calendar / KASI 음양력 데이터)\n'
        '// 각 항목: "연도|윤달월(0=없음)|월별 일수" (마지막 자리는 윤달 일수)\n'
        'export const LUNAR_BASE = ' + json.dumps(payload['base']) + ';\n'
        'export const LUNAR_ROWS = [\n'
        + ',\n'.join("  " + json.dumps(r, ensure_ascii=False) for r in payload['years'])
        + ',\n];\n'
        'export const LUNAR_FIRST_YEAR = ' + str(START) + ';\n'
        'export const LUNAR_LAST_YEAR = ' + str(END) + ';\n'
    )
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w', encoding='utf-8') as f:
        f.write(body)
    print('wrote', out, len(body), 'bytes', len(years), 'years, base', payload['base'])


if __name__ == '__main__':
    main()
