#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""3층 다락방 AI 오피스 — 부서 6팀 → 4팀 통합(X·인스타 + 다락방·사주 + 자동화·모니터링)
   및 X 헤더 배너 2안 결재 완료 처리. public/office/data.json 을 다시 쓴다."""
import json, io

P = 'public/office/data.json'
d = json.load(open(P, encoding='utf-8'))

NEW_ID = 'darakbang'
NEW_NAME = '3층 다락방'

# ---------- 1. 부서 목록 ----------
depts = d['departments']
sns = next(x for x in depts if x['id'] == 'sns')
darak = next(x for x in depts if x['id'] == 'darak')
ops = next(x for x in depts if x['id'] == 'ops')

merged = {
    'id': NEW_ID,
    'name': NEW_NAME,
    'short': NEW_NAME,
    'handle': '3층다락방',
    'icon': '🔮',
    'room': NEW_ID,
    'channels': [
        '@3F_Zanie', '@3f.zanie', '990원 웹', 'GA4 G-4JBS150V27', '당근 사주', '자동화·모니터링',
    ],
    'bubble': 'X 1,529뷰 · KPN 심사 대기',
    'status': 'run',
    'progress': 90,
    'updated': '14:39',
    'tasks': [
        {'text': 'X 11/26 12건 합계 1,529뷰 · 인용 956뷰', 'state': 'done'},
        {'text': 'X 헤더 배너 2안(윙크 자니) 선택 → 프로필 적용 완료', 'state': 'done'},
        {'text': '인스타 게시물 11 · 팔로워 1 · 팔로잉 18', 'state': 'done'},
        {'text': '통신판매업 신고증 → 푸터 반영 완료(제 2026-서울영등포-2615 호)', 'state': 'done'},
        {'text': '결제: 토스페이만 오픈 · 카드(KPN)·카카오페이 \'심사 중\' 잠금', 'state': 'wait', 'at': '심사'},
        {'text': 'GA4 접속자·유입경로 집계 중', 'state': 'run', 'at': '09:00'},
        {'text': '무료 놀이터 4종 · 990원 12종 · 9,900원 평생 종합 라이브', 'state': 'done'},
        {'text': '09:00 「일일 채널 실측 리포트」 정기 가동 · 07:40 청춘 X 모니터링 정상', 'state': 'done'},
        {'text': '싸이월드 사진복구 재오픈 점검(월·목 11:00) — 11/26 HTTP 500 지속', 'state': 'wait', 'at': '확인'},
        {'text': '등록 액션 10종 정상 · 네이버·티스토리 자동 발행 슬롯 유지', 'state': 'run'},
    ],
    'queue': [
        {'t': '15:30', 'text': 'X 소통 2회차'},
        {'t': '20:30', 'text': 'X 소통 3회차'},
        {'t': '05:00', 'text': '내일 하루치 5타임 멘트·인포그래픽'},
        {'t': 'KPN', 'text': '심사 통과 → 카드 결제창 연동 → 카카오페이 재접수'},
        {'t': '오픈', 'text': '정식 오픈(?preview=3f990 해제) → 저장소 Private+Cloudflare 전환'},
    ],
    'links': [
        {'text': 'X @3F_Zanie', 'href': 'https://x.com/3F_Zanie'},
        {'text': '인스타 @3f.zanie', 'href': 'https://www.instagram.com/3f.zanie/'},
        {'text': '다락방 열기', 'href': 'https://sisterjisoo5-create.github.io/darakbang-saju-web/'},
    ],
    'note': '이미지·글귀는 AI 소스 뺀 형태로 전달하고 시연 님이 직접 업로드. 자니 단독 사진은 X에 올리지 않는다. 웹 결제·자동화·모니터링도 이 팀이 함께 본다.',
}

new_depts = []
for x in depts:
    if x['id'] in ('sns', 'darak', 'ops'):
        if not any(y['id'] == NEW_ID for y in new_depts):
            new_depts.append(merged)
    else:
        new_depts.append(x)
d['departments'] = new_depts

# ---------- 2. stats · 대표 ----------
d['stats']['teams'] = len(new_depts)          # 4
d['stats']['rooms'] = 3 + len(new_depts)      # 대표 지휘실·대회의실·라운지 + 부서 4
d['stats']['bots'] = 12                       # 통합으로 중복 팀장 2명 정리
d['stats_at'] = d['stats_at']

# ---------- 3. 결재함: X 헤더 배너 → 처리 완료 ----------
keep = []
for a in d['approvals']:
    if a['id'] == 'xheader':
        continue
    if a['team'] in ('X·인스타팀', '3층 다락방·사주팀', '자동화·모니터링팀'):
        a['team'] = NEW_NAME
    keep.append(a)
d['approvals'] = keep
d['stats']['approvals'] = len(keep)
d['ceo']['bubble'] = '결재 %d건 대기' % len(keep)
d['ceo']['note'] = '애드센스 재심사 보강안 · 5만 원 PDF 문구 — 결재 %d건 대기' % len(keep)

# ---------- 4. 처리 완료: 3팀 → 1팀 ----------
groups = []
merged_items = []
for g in d['completed']:
    if g['team'] in ('X·인스타팀', '3층 다락방·사주팀', '자동화·모니터링팀'):
        if g['team'] == 'X·인스타팀':
            merged_items.extend(g['items'][:2])
            merged_items.append('X 헤더 배너 2안(윙크 자니) 선택 → X 프로필 적용 완료 14:39')
            merged_items.extend(g['items'][2:])
        else:
            merged_items.extend(g['items'])
        if not any(x['team'] == NEW_NAME for x in groups):
            groups.append({'team': NEW_NAME, 'icon': '🔮', 'items': merged_items})
        continue
    groups.append(g)
d['completed'] = groups

# ---------- 5. 로그 ----------
relabel = {'X·인스타팀': NEW_NAME, 'SNS팀': NEW_NAME, '다락방팀': NEW_NAME, '자동화팀': NEW_NAME, '3층 다락방·사주팀': NEW_NAME}
for lg in d['logs']:
    for old, new in relabel.items():
        lg['text'] = lg['text'].replace(old + ' ·', new + ' ·')
d['logs'].insert(0, {'t': '14:39', 'text': '%s · X 헤더 배너 2안(윙크 자니) 선택 → 프로필 적용 완료 · 결재 처리' % NEW_NAME})

# ---------- 6. 회의실 ----------
M = d['meeting']
new_meeting = []
hall_merged_done = False
for m in M:
    if m.get('dept') in ('sns', 'darak', 'ops'):
        m['dept'] = NEW_ID
        if m.get('room') in ('sns', 'darak', 'ops'):
            m['room'] = NEW_ID
            m['roomLabel'] = NEW_NAME + ' 책상'
        if m.get('name') in ('SNS팀장', '다락방팀장', '자동화팀장') and m.get('room') == 'hall':
            if hall_merged_done:
                continue
            hall_merged_done = True
            m['name'] = NEW_NAME + '팀장'
            m['t'] = '09:20'
            m['text'] = ('@all X는 12건 합계 1,529뷰(인용 956뷰), 인스타 게시물 11개이고 반응은 아직 미확인이에요. '
                         '신고증은 푸터에 반영 끝났고 결제는 토스페이만 열려 있습니다 — 카드·카카오페이는 KPN 심사가 끝나야 열 수 있어요. '
                         '09:00 실측 리포트도 오늘부터 정기 가동합니다.')
    new_meeting.append(m)
# 라운지 '인스타 담당' 은 위에서 dept만 바뀜 → 이름 유지
d['meeting'] = new_meeting

# ---------- 7. 헤드라인 · 메모 ----------
d['headline'] = ('부서 4팀 통합 · X 헤더 2안(윙크 자니) 적용 완료 — 네이버 214뷰·체류 3분 8초 역대 최고 · '
                 '조예언니 17뷰(+89%) · 애드센스 재심사 보강 검토 · KPN 심사 대기')
d['updated'] = '2026-11-27T14:39:00+09:00'
d['memo']['changelog'].insert(0, {'t': '11-27', 'v': '오피스',
    'text': '부서 6팀 → 4팀 통합(X·인스타·다락방·자동화 → 3층 다락방) · X 헤더 2안 결재 완료'})

json.dump(d, io.open(P, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
open(P, 'a', encoding='utf-8').write('\n')
print('teams', len(d['departments']), 'rooms', d['stats']['rooms'], 'bots', d['stats']['bots'],
      'approvals', len(d['approvals']), 'completed groups', len(d['completed']), 'meeting', len(d['meeting']))
