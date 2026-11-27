#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""3층 다락방 AI 오피스 — 부서 4팀 → 5팀 개편(💰 정산팀 신설).

시연 님 지시(2026-11-27):
  "부서 4팀중에 3층 다락방에서 따로 떼서 정산팀을 만들어. 3층 다락방에서 일어난 매출,
   수수료 떼고 순이익 계산하는 팀"
  + 추가 지시: "오피스 정산팀은 나중에 네이버블로그나 티스토리에서 생기는 이익도 함께 보고해"

정산팀은 ① 3층 다락방 매출 - PG 수수료 = 순이익, ② 네이버(애드포스트·크리에이터샵),
③ 티스토리(조예언니·팝콘언니 애드센스) 수익까지 통합 집계·보고한다.
수치는 실측/확인분만 쓰고 확인되지 않은 것은 '미확인'으로 둔다.
public/office/data.json 을 다시 쓴다.
"""
import json, io, shutil

P = 'public/office/data.json'
d = json.load(open(P, encoding='utf-8'))

NEW_ID = 'settlement'
NEW_NAME = '정산팀'

# ---------- 1. 부서 추가 ----------
settlement = {
    'id': NEW_ID,
    'name': NEW_NAME,
    'short': NEW_NAME,
    'handle': '정산팀',
    'icon': '💰',
    'room': NEW_ID,
    'channels': [
        '3층 다락방 순이익', '네이버 애드포스트', '크리에이터샵 cityescape', '티스토리 애드센스',
    ],
    'bubble': '전 채널 수익 0원 · 산식 세팅',
    'status': 'wait',
    'progress': 30,
    'updated': '15:40',
    'tasks': [
        {'text': '3층 다락방: 정산 대상 매출 확인분 0원 — 정식 오픈 전(11-20 토스페이 990원 테스트 1건은 취소)', 'state': 'wait', 'at': '오픈'},
        {'text': 'PG 수수료 공제·순이익 산식 세팅 — 포트원·토스페이 계약 수수료율 확인 후 확정', 'state': 'wait', 'at': '확인'},
        {'text': '결제 채널별 정산 주기 구분 — 토스페이만 오픈, 카드(KPN)·카카오페이는 열리면 추가', 'state': 'run'},
        {'text': '네이버 애드포스트 11/26 수익 0원 · 미디어 검수 미확인(46/50편)', 'state': 'wait', 'at': '확인'},
        {'text': '크리에이터샵 cityescape 최근 30일 클릭 4 · 주문 0 · 정산 0원', 'state': 'wait'},
        {'text': '티스토리 애드센스 조예언니 $0.00(재심사) · 팝콘언니 $0.00(준비 중)', 'state': 'wait', 'at': '심사'},
        {'text': '전 채널 수익 통합 표(매출·수수료·순이익 3줄) 양식 확정 · 09:00 리포트에 반영', 'state': 'run'},
    ],
    'queue': [
        {'t': '09:00', 'text': '전 채널 수익 통합 집계 — 다락방·애드포스트·애드센스·크리에이터샵'},
        {'t': '확인', 'text': 'PG 수수료율·부가세 처리 기준 확정 → 순이익 산식 고정'},
        {'t': '오픈', 'text': '정식 오픈 후 첫 매출 발생 시 채널별 정산 마감'},
    ],
    'links': [],
    'note': ('3층 다락방 매출에서 PG·토스페이 수수료를 떼고 순이익을 내는 팀. '
             '네이버(애드포스트·크리에이터샵)와 티스토리(조예언니·팝콘언니 애드센스) 수익까지 합쳐 보고한다. '
             '실측·확인분만 쓰고, 포트원 결제내역은 시연 님이 직접 관리하므로 미확인분은 미확인으로 표기한다.'),
}

d['departments'] = [x for x in d['departments'] if x['id'] != NEW_ID] + [settlement]

# ---------- 2. 3층 다락방: 매출·수수료 항목 분리 ----------
darak = next(x for x in d['departments'] if x['id'] == 'darakbang')
darak['bubble'] = 'X 1,529뷰 · 정식 오픈 대기'
darak['tasks'] = [
    t for t in darak['tasks']
    if not t['text'].startswith('결제: 토스페이만 오픈')
]
darak['queue'] = [
    {'t': 'KPN', 'text': '결제 연동 — 심사 통과 → 카드 결제창 연결 → 카카오페이 재접수'}
    if q.get('t') == 'KPN' else q
    for q in darak['queue']
]
darak['note'] = ('이미지·글귀는 AI 소스 뺀 형태로 전달하고 시연 님이 직접 업로드. 자니 단독 사진은 X에 올리지 않는다. '
                 '매출·수수료·순이익은 정산팀이 집계하고, 이 팀은 콘텐츠·SNS·웹 운영·상품·자동화에 집중한다.')

# 대회의실 09:20 보고 — 매출·정산 언급은 정산팀으로 넘긴다
for m in d['meeting']:
    if m.get('room') == 'hall' and m.get('t') == '09:20':
        m['text'] = ('@all X는 12건 합계 1,529뷰(인용 956뷰), 인스타 게시물 11개이고 반응은 아직 미확인이에요. '
                     '신고증은 푸터에 반영 끝났고 09:00 실측 리포트도 오늘부터 정기 가동합니다. '
                     '매출·수수료·순이익 쪽은 이번에 새로 만든 정산팀이 맡아서 봅니다.')

# ---------- 3. stats ----------
d['stats']['teams'] = len(d['departments'])          # 5
d['stats']['rooms'] = 3 + len(d['departments'])      # 8
d['stats']['bots'] = 13                              # 정산팀장 1명 추가

# ---------- 4. 수익 패널: 통합 순이익 행 추가 ----------
d['revenue'] = [r for r in d['revenue'] if r['name'] != '정산 통합 순이익']
d['revenue'].append({
    'icon': '💰',
    'name': '정산 통합 순이익',
    'value': '0원 (확인분)',
    'state': 'wait',
    'note': ('다락방 매출 확인분 0원 − PG 수수료(수수료율 확인 전) · 애드포스트 0원 · 애드센스 $0.00 · '
             '크리에이터샵 0원 · 포트원 콘솔 미확인분 제외'),
})

# ---------- 5. 회의실 ----------
M = d['meeting']
M = [m for m in M if m.get('room') != NEW_ID and m.get('dept') != NEW_ID]
settle_leader = {
    'room': 'hall', 'dept': NEW_ID, 'roomLabel': '대회의실', 'icon': '💰',
    'name': '정산팀장', 'role': '팀장', 't': '09:18',
    'text': ('@all 정산팀 신설 보고드립니다. 3층 다락방 매출에서 PG·토스페이 수수료를 떼고 순이익을 내는 게 기본이고, '
             '네이버 애드포스트·크리에이터샵과 티스토리 애드센스 수익까지 합쳐서 봅니다. '
             '지금 확인된 수익은 다락방 0원(정식 오픈 전·테스트 990원 1건 취소), 애드포스트 0원, 애드센스 $0.00, 크리에이터샵 0원입니다. '
             '수수료율과 순이익 산식은 포트원·토스페이 계약 조건을 확인해 고정하고, 09:00 리포트에 채널별 매출·수수료·순이익으로 올리겠습니다.'),
}
idx = next(i for i, m in enumerate(M) if m.get('room') == 'hall' and m.get('t') == '09:20')
M.insert(idx, settle_leader)

M.extend([
    {
        'room': NEW_ID, 'dept': NEW_ID, 'roomLabel': '정산팀 책상', 'icon': '💰',
        'name': '정산팀', 'role': '부서', 't': '09:22',
        'text': ('@정산팀 첫 장부 정리했습니다. 다락방은 정식 오픈 전이라 매출 0원, 결제는 토스페이만 열려 있어요. '
                 '990원 결제 1건이면 매출 990원에서 PG 수수료와 부가세를 빼고 남는 게 순이익인데, '
                 '수수료율은 계약서 확인 전이라 아직 비워 뒀습니다.'),
    },
    {
        'room': NEW_ID, 'dept': NEW_ID, 'roomLabel': '정산팀 책상', 'icon': '🧾',
        'name': '수익 담당', 'role': '담당', 't': '11:20',
        'text': ('@정산팀 애드포스트 11/26 0원, 애드센스는 조예언니 재심사·팝콘언니 준비 중이라 $0.00, '
                 '크리에이터샵은 30일 클릭 4·주문 0입니다. 네 채널 다 수익이 없어서 통합 순이익도 0원으로 잡아 뒀어요.'),
    },
])
d['meeting'] = M

# ---------- 6. 처리 완료 ----------
for g in d['completed']:
    if g['team'] == NEW_NAME:
        g['items'] = [i for i in g['items'] if not i.startswith('정산팀 신설')]
d['completed'] = [g for g in d['completed'] if g['team'] != NEW_NAME]
d['completed'].append({
    'team': NEW_NAME, 'icon': '💰',
    'items': [
        '정산팀 신설 — 3층 다락방 매출·PG 수수료·순이익을 분리해 전담(11-27)',
        '수익 범위 확장 — 네이버 애드포스트·크리에이터샵, 티스토리 애드센스까지 통합 집계',
        '전 채널 확인분 수익 0원: 다락방 오픈 전·애드포스트 0원·애드센스 $0.00·크리에이터샵 0원',
    ],
})

# ---------- 7. 로그 ----------
d['logs'] = [l for l in d['logs'] if not l['text'].startswith('정산팀 ·')]
d['logs'].insert(0, {'t': '09:22', 'text': '정산팀 · 신설 — 다락방 순이익 + 네이버·티스토리 수익 통합 집계 시작'})
d['logs'].insert(0, {'t': '15:40', 'text': '정산팀 · 5팀 체제 반영 — 매출·수수료·순이익 산식 세팅(수수료율 확인 전)'})

# ---------- 8. 대표 메모 · 장부 원칙 ----------
principle = '수익·수수료·순이익은 정산팀이 전 채널 통합 집계(다락방 순이익 + 애드포스트·애드센스·크리에이터샵).'
d['memo']['principles'] = [p for p in d['memo']['principles'] if p != principle]
d['memo']['principles'].append(principle)
d['memo']['changelog'] = [c for c in d['memo']['changelog'] if '정산팀' not in c['text']]
d['memo']['changelog'].insert(0, {
    't': '11-27', 'v': '오피스',
    'text': '부서 4팀 → 5팀 — 💰 정산팀 신설(다락방 순이익 + 네이버·티스토리 수익 통합)',
})

# ---------- 9. 헤드라인 ----------
d['headline'] = ('부서 5팀 체제 — 💰 정산팀 신설(전 채널 수익·수수료·순이익 통합) · 네이버 214뷰·체류 3분 8초 역대 최고 · '
                 '조예언니 17뷰(+89%) · 애드센스 재심사 보강 검토 · KPN 심사 대기')
d['updated'] = '2026-11-27T15:45:00+09:00'

json.dump(d, io.open(P, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
open(P, 'a', encoding='utf-8').write('\n')
shutil.copyfile(P, 'docs/office/data.json')

print('teams', len(d['departments']), 'rooms', d['stats']['rooms'], 'bots', d['stats']['bots'],
      'approvals', len(d['approvals']), 'completed groups', len(d['completed']),
      'meeting', len(d['meeting']), 'revenue rows', len(d['revenue']))
print('depts', [x['id'] for x in d['departments']])
