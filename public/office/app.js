/* 3층 다락방 AI 오피스 — 현황판 렌더러 (data.json 하나로 동작) */
(function () {
  'use strict';

  var DATA = null;
  var state = { tab: 'map', room: 'dept', view: 'clay', wt: 'todo', mroom: 'all', team: 'all', dept: null };

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };
  var stLabel = { run: '가동', ok: '완료', wait: '결재·대기' };
  var stClass = { run: 'run', ok: 'ok', wait: 'wait' };

  function fmt(n) {
    if (typeof n !== 'number') return n;
    return n.toLocaleString('ko-KR');
  }

  function mention(t) {
    return esc(t).replace(/@([가-힣A-Za-z0-9_]+)/g, '<span class="mention">@$1</span>');
  }

  /* ---------------- 시계 ---------------- */
  function tick() {
    var d = new Date();
    var hh = String(d.getHours()).padStart(2, '0');
    var mm = String(d.getMinutes()).padStart(2, '0');
    var ss = String(d.getSeconds()).padStart(2, '0');
    $('clock').textContent = hh + ':' + mm + ':' + ss;
  }

  /* ---------------- 공통 ---------------- */
  function deptById(id) {
    var list = (DATA && DATA.departments) || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function statusTag(s) {
    var k = stClass[s] || 'run';
    return '<span class="st ' + k + '">' + (stLabel[s] || s) + '</span>';
  }

  /* ---------------- 탭 ---------------- */
  function showTab(name) {
    state.tab = name;
    var tabs = document.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) {
      var on = tabs[i].getAttribute('data-tab') === name;
      tabs[i].classList.toggle('on', on);
    }
    var panes = document.querySelectorAll('.pane');
    for (var j = 0; j < panes.length; j++) {
      panes[j].classList.toggle('on', panes[j].id === 'pane-' + name);
    }
    if (history.replaceState) history.replaceState(null, '', '#' + name);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------------- 오피스 맵 ---------------- */
  function renderMap() {
    var d = DATA;
    var st = d.stats || {};
    $('headline').textContent = d.headline || '';
    $('heroTitle').textContent = '대표 지휘실 · ' + ((d.ceo && d.ceo.name) || '');
    $('heroNote').textContent = (d.ceo && d.ceo.note) || '';
    $('heroBadge').textContent = '봇 ' + (st.bots || 0) + '명';
    $('mapStat').textContent = '방 ' + (st.rooms || 0) + ' · 봇 ' + (st.bots || 0);
    $('hotAp').textContent = '결재 ' + (st.approvals || 0);
    $('hotMeet').textContent = String(((d.meeting || []).filter(function (m) { return m.room === 'hall'; })).length);

    var deptBtn = document.querySelector('.hot-dept');
    if (deptBtn) {
      deptBtn.querySelector('span').innerHTML = '<span class="hi" aria-hidden="true">💼</span> 부서 ' + (d.departments || []).length + '팀';
      deptBtn.querySelector('em').textContent = (d.departments || []).map(function (x) { return x.short || x.name; }).join('·');
    }

    renderChips();
    renderPlan();
    renderQuick();
    renderDetail();
  }

  function renderChips() {
    var rooms = [
      { id: 'dept', icon: '💼', name: '부서 전체' },
      { id: 'ceo', icon: '👑', name: '대표 지휘실' },
      { id: 'meet', icon: '🏛️', name: '대회의실' },
      { id: 'lounge', icon: '☕', name: '라운지' }
    ];
    var html = rooms.map(function (r) {
      return '<button class="chip' + (state.room === r.id ? ' on' : '') + '" type="button" data-roomchip="' + r.id + '">' + r.icon + ' ' + esc(r.name) + '</button>';
    }).join('');
    (DATA.departments || []).forEach(function (dp) {
      html += '<button class="chip' + (state.room === dp.id ? ' on' : '') + '" type="button" data-roomchip="' + dp.id + '"><i class="' + (stClass[dp.status] || 'run') + '"></i>' + esc(dp.icon + ' ' + (dp.short || dp.name)) + '</button>';
    });
    $('roomChips').innerHTML = html;
  }

  function renderPlan() {
    var html = '';
    html += '<button class="zone ceo" type="button" data-roomchip="ceo"><span class="zn">👑 대표 지휘실</span><span class="zp">' +
      esc(DATA.ceo && DATA.ceo.note ? DATA.ceo.note : '결재 대기') + '</span></button>';
    html += '<button class="zone meet" type="button" data-roomchip="meet"><span class="zn">🏛️ 대회의실</span><span class="zp">회의·논의 ' +
      ((DATA.meeting || []).filter(function (m) { return m.room === 'hall'; }).length) + '건</span></button>';
    var depts = DATA.departments || [];
    depts.forEach(function (dp, i) {
      var wide = (depts.length % 2 === 1 && i === depts.length - 1) ? ' wide' : '';
      html += '<button class="zone' + wide + (state.room === dp.id ? ' on' : '') + '" type="button" data-roomchip="' + dp.id + '">' +
        '<span class="zn">' + esc(dp.icon + ' ' + dp.name) + '</span>' +
        '<span class="zp">' + esc(dp.bubble || '') + '</span>' +
        '<span class="zbar"><i style="width:' + (dp.progress || 0) + '%"></i></span></button>';
    });
    var loungeMsg = ((DATA.meeting || []).filter(function (m) { return m.room === 'lounge'; }).pop() || {}).text || '팀 소식·공지';
    html += '<button class="zone lounge" type="button" data-roomchip="lounge"><span class="zn">☕ 라운지</span><span class="zp">' +
      esc(loungeMsg.slice(0, 42)) + '</span></button>';
    $('plan').innerHTML = html;
  }

  function renderQuick() {
    var items = [];
    (DATA.departments || []).forEach(function (dp) {
      (dp.tasks || []).forEach(function (t) {
        if (t.at && (t.state === 'run' || t.state === 'wait')) items.push({ at: t.at, text: t.text, team: dp.short || dp.name, state: t.state });
      });
      (dp.queue || []).forEach(function (q) { items.push({ at: q.t, text: q.text, team: dp.short || dp.name, state: 'wait' }); });
    });
    items = items.filter(function (it) { return /^\d{1,2}:\d{2}$/.test(String(it.at)); });
    items.sort(function (a, b) { return String(a.at).localeCompare(String(b.at)); });
    items = items.slice(0, 10);
    $('quickCnt').textContent = String(items.length);
    if (!items.length) { $('quickBody').innerHTML = '<div class="empty">오늘 남은 처리가 없습니다.</div>'; return; }
    var html = '<ul class="tasks">';
    items.forEach(function (it) {
      var cls = it.state === 'run' ? 'run' : 'wait';
      html += '<li class="' + cls + '"><i></i><span><b style="font-variant-numeric:tabular-nums;color:var(--wood)">' + esc(it.at) + '</b> ' +
        esc(it.text) + ' <span style="color:var(--muted2)">· ' + esc(it.team) + '</span></span></li>';
    });
    html += '</ul>';
    $('quickBody').innerHTML = html;
  }

  function deptDetail(dp) {
    var html = '<div class="dt-hd"><span class="nm">' + esc(dp.icon + ' ' + dp.name) + '</span>' + statusTag(dp.status) +
      '<span class="dt-time">' + esc(dp.updated || '') + '</span></div>';
    html += '<div class="chips">' + (dp.channels || []).map(function (c) { return '<span>' + esc(c) + '</span>'; }).join('') + '</div>';
    html += '<div class="bar ' + (stClass[dp.status] || '') + '"><i style="width:' + (dp.progress || 0) + '%"></i></div>';
    html += '<div class="pct"><span>진행률</span><span>' + (dp.progress || 0) + '%</span></div>';
    if ((dp.tasks || []).length) {
      html += '<ul class="tasks">' + dp.tasks.map(function (t) {
        return '<li class="' + (t.state || 'run') + '"><i></i><span>' + esc(t.text) + '</span></li>';
      }).join('') + '</ul>';
    }
    if ((dp.queue || []).length) {
      html += '<div class="note" style="border-top:1px dashed var(--line);margin-top:12px"><b style="color:var(--wood)">예약 큐</b><br>' +
        dp.queue.map(function (q) { return '<b style="font-variant-numeric:tabular-nums">' + esc(q.t) + '</b> ' + esc(q.text); }).join('<br>') + '</div>';
    }
    if ((dp.links || []).length) {
      html += '<div class="links">' + dp.links.map(function (l) { return '<a href="' + esc(l.href) + '" target="_blank" rel="noopener">' + esc(l.text) + '</a>'; }).join('') + '</div>';
    }
    if (dp.note) html += '<p class="note">' + esc(dp.note) + '</p>';
    return html;
  }

  function renderDetail() {
    var body = $('detailBody');
    var r = state.room;

    if (r === 'dept' || !r) {
      $('detailTitle').textContent = '📋 부서 상세';
      $('detailHint').textContent = '전체 ' + (DATA.departments || []).length + '팀';
      var html = '<div class="dt-hd"><span class="nm">오피스 전체</span>' + statusTag('run') + '</div>' +
        '<div class="chips"><span>' + (DATA.stats.teams || 0) + '팀</span><span>봇 ' + (DATA.stats.bots || 0) + '명</span><span>결재 ' + (DATA.stats.approvals || 0) + '건</span></div>';
      html += (DATA.departments || []).map(function (dp) {
        return '<button class="dept-row" type="button" data-deptrow="' + dp.id + '">' +
          '<span class="ic">' + esc(dp.icon) + '</span>' +
          '<span><span class="nm">' + esc(dp.name) + '</span><span class="bb">' + esc(dp.bubble || '') + '</span></span>' +
          '<span class="pc">' + (dp.progress || 0) + '%</span></button>';
      }).join('');
      html += '<p class="note">팀을 누르면 상세가 열립니다.</p>';
      body.innerHTML = html;
      return;
    }

    if (r === 'ceo') {
      $('detailTitle').textContent = '👑 대표 결재함';
      $('detailHint').textContent = '결재 ' + ((DATA.approvals || []).length) + '건';
      var ap = DATA.approvals || [];
      body.innerHTML = '<div class="dt-hd"><span class="nm">' + esc(DATA.ceo.name) + ' 대표</span>' + statusTag(ap.length ? 'wait' : 'ok') + '</div>' +
        '<p class="note" style="margin-top:8px;border:0;padding:0">' + esc(DATA.ceo.bubble || '') + '</p>' +
        (ap.length ? ap.map(function (a) {
          return '<div class="ap' + (a.urgent ? ' urgent' : '') + '" style="margin-top:9px"><span class="ico">' + esc(a.icon) + '</span>' +
            '<div><h3>' + esc(a.title) + (a.urgent ? '<span class="dday">급함</span>' : '') + '</h3>' +
            '<p class="sub">' + esc(a.team + ' · ' + a.meta) + '</p>' +
            '<div class="opts">' + (a.options || []).map(function (o, i) { return '<span' + (i === 0 ? '' : ' class="q"') + '>' + esc(o) + '</span>'; }).join('') + '</div></div></div>';
        }).join('') : '<div class="empty">대기 중인 결재가 없습니다.</div>') +
        '<div class="links"><a href="#" data-goto="work">작업실에서 전체 보기</a></div>';
      return;
    }

    if (r === 'meet') {
      $('detailTitle').textContent = '🏛️ 대회의실';
      var hall = (DATA.meeting || []).filter(function (m) { return m.room === 'hall'; });
      $('detailHint').textContent = hall.length + '건';
      body.innerHTML = '<div class="dt-hd"><span class="nm">오늘의 대회의실</span>' + statusTag('run') + '</div>' +
        (hall.length ? '<ul class="tasks">' + hall.map(function (m) {
          return '<li class="run"><i></i><span><b style="color:var(--wood);font-variant-numeric:tabular-nums">' + esc(m.t) + '</b> ' + esc(m.name || m.team) + ' — ' + esc(m.text) + '</span></li>';
        }).join('') + '</ul>' : '<div class="empty">오늘 회의 기록이 없습니다.</div>') +
        '<div class="links"><a href="#" data-goto="meet">회의실 전체 보기</a></div>';
      return;
    }

    if (r === 'lounge') {
      $('detailTitle').textContent = '☕ 라운지';
      var lounge = (DATA.meeting || []).filter(function (m) { return m.room === 'lounge'; });
      $('detailHint').textContent = lounge.length + '건';
      body.innerHTML = '<div class="dt-hd"><span class="nm">가벼운 이야기·공지</span>' + statusTag('ok') + '</div>' +
        (lounge.length ? '<ul class="tasks">' + lounge.map(function (m) {
          return '<li class="done"><i></i><span><b style="color:var(--wood);font-variant-numeric:tabular-nums">' + esc(m.t) + '</b> ' + esc(m.name || m.team) + ' — ' + esc(m.text) + '</span></li>';
        }).join('') + '</ul>' : '<div class="empty">라운지 소식이 없습니다.</div>');
      return;
    }

    var dp = deptById(r);
    if (!dp) { body.innerHTML = '<div class="empty">부서를 찾을 수 없습니다.</div>'; return; }
    $('detailTitle').textContent = '📋 ' + (dp.short || dp.name);
    $('detailHint').textContent = (dp.progress || 0) + '%';
    body.innerHTML = deptDetail(dp);
  }

  /* ---------------- 회의실 ---------------- */
  function renderMeet() {
    var all = DATA.meeting || [];
    $('meetCnt').textContent = all.length + '건';

    var roomChips = [
      { id: 'all', label: '전체' }, { id: 'hall', label: '🏛️ 대회의실' }, { id: 'ceo', label: '👑 지휘실' },
      { id: 'lounge', label: '☕ 라운지' }, { id: 'team', label: '💼 부서별' }
    ];
    $('roomTabs').innerHTML = roomChips.map(function (c) {
      return '<button class="chip' + (state.mroom === c.id ? ' on' : '') + '" type="button" data-mroom="' + c.id + '">' + esc(c.label) + '</button>';
    }).join('');

    var teams = [{ id: 'all', label: '@all' }];
    (DATA.departments || []).forEach(function (dp) { teams.push({ id: dp.id, label: '@' + (dp.handle || dp.short || dp.name) }); });
    $('mentionChips').innerHTML = teams.map(function (t) {
      return '<button class="mchip' + (state.team === t.id ? ' on' : '') + '" type="button" data-team="' + t.id + '">' + esc(t.label) + '</button>';
    }).join('');

    var list = all.filter(function (m) {
      if (state.mroom === 'team') { if (m.room === 'hall' || m.room === 'ceo' || m.room === 'lounge') return false; }
      else if (state.mroom !== 'all' && m.room !== state.mroom) return false;
      if (state.team !== 'all' && m.dept !== state.team && !(m.teamAll)) return false;
      return true;
    });

    if (!list.length) { $('feed').innerHTML = '<div class="empty">이 방에는 아직 보고가 없습니다.</div>'; return; }
    $('feed').innerHTML = list.map(function (m) {
      var sec = m.room === 'hall' || m.room === 'ceo';
      return '<div class="msg' + (sec ? ' sec' : '') + '">' +
        '<span class="av">' + esc(m.icon || '💬') + '</span>' +
        '<div><div class="mhead"><b>' + esc(m.name || '') + '</b>' +
        (m.role ? '<span class="role">' + esc(m.role) + '</span>' : '') +
        (m.dept ? '<span class="role">' + esc(m.roomLabel || '') + '</span>' : '') +
        '<time>' + esc(m.t) + '</time></div>' +
        '<div class="bubble">' + mention(m.text) + '</div></div></div>';
    }).join('');
  }

  /* ---------------- 작업실 ---------------- */
  function renderWork() {
    var ap = DATA.approvals || [];
    var done = DATA.completed || [];
    $('apCnt').textContent = ap.length + '건';
    $('apN').textContent = String(ap.length);
    $('doneN').textContent = String(done.reduce(function (n, g) { return n + (g.items || []).length; }, 0));

    var html = '';
    if (state.wt === 'todo') {
      html = ap.length ? ap.map(function (a) {
        return '<div class="ap' + (a.urgent ? ' urgent' : '') + '"><span class="ico">' + esc(a.icon) + '</span>' +
          '<div><h3>' + esc(a.title) + (a.urgent ? '<span class="dday">급함</span>' : '') + '</h3>' +
          '<p class="sub">' + esc(a.team) + ' · ' + esc(a.meta) + '</p>' +
          '<div class="opts">' + (a.options || []).map(function (o, i) { return '<span' + (i === 0 ? '' : ' class="q"') + '>' + esc(o) + '</span>'; }).join('') + '</div>' +
          (a.note ? '<p class="sub" style="margin-top:6px">' + esc(a.note) + '</p>' : '') + '</div></div>';
      }).join('') : '<div class="empty">대기 중인 결재가 없습니다.</div>';
    } else {
      html = done.length ? done.map(function (g) {
        return '<div class="team"><h3>' + esc(g.icon + ' ' + g.team) + '<span class="ok">' + (g.items || []).length + '건</span></h3><ul>' +
          (g.items || []).map(function (it) { return '<li>' + esc(it) + '</li>'; }).join('') + '</ul></div>';
      }).join('') : '<div class="empty">처리 기록이 없습니다.</div>';
    }
    $('workList').innerHTML = html;

    var depts = DATA.departments || [];
    $('deptN').textContent = depts.length + '팀';
    $('board').innerHTML = depts.map(function (dp) {      var tasks = dp.tasks || [], queue = dp.queue || [];
      var run = tasks.filter(function (t) { return t.state === 'run'; });
      var wait = tasks.filter(function (t) { return t.state === 'wait'; });
      var d = tasks.filter(function (t) { return t.state === 'done'; });
      function grp(title, cls, arr, timed) {
        if (!arr.length) return '';
        return '<div class="grp"><h4><span class="k ' + cls + '">' + title + '</span></h4><ul>' +
          arr.map(function (t) {
            return '<li>' + (timed ? '<span class="t">' + esc(t.t) + '</span>' : '') + '<span>' + esc(t.text) + '</span></li>';
          }).join('') + '</ul></div>';
      }
      return '<details class="deptcard"' + (dp.id === 'naver' ? ' open' : '') + '><summary>' +
        '<span class="ic">' + esc(dp.icon) + '</span>' +
        '<span><span class="nm">' + esc(dp.name) + '</span><span class="sub">' + esc(dp.bubble || '') + '</span></span>' +
        '<span class="arrow"></span></summary><div class="body">' +
        grp('진행 중', 'run', run) + grp('대기·확인', 'queue', wait) + grp('완료', 'done', d) +
        (queue.length ? '<div class="grp"><h4><span class="k queue">예약 큐</span></h4><ul>' +
          queue.map(function (q) { return '<li><span class="t">' + esc(q.t) + '</span><span>' + esc(q.text) + '</span></li>'; }).join('') + '</ul></div>' : '') +
        '</div></details>';
    }).join('');
  }

  /* ---------------- 부서현황 ---------------- */
  function renderStats() {
    var chans = DATA.channels || [];
    $('statsAt').textContent = (DATA.stats_at || DATA.updated || '').replace('T', ' ').slice(5, 16);
    var max = 1;
    chans.forEach(function (c) { if (typeof c.last === 'number' && c.last > max) max = c.last; });

    $('chanGrid').innerHTML = chans.map(function (c) {
      var delta = '';
      if (typeof c.last === 'number' && typeof c.prev === 'number') {
        if (c.prev === 0 && c.last > 0) delta = '<span class="delta up">신규 ' + fmt(c.last) + '</span>';
        else if (c.prev === 0) delta = '<span class="delta flat">변동 없음</span>';
        else {
          var p = ((c.last - c.prev) / c.prev) * 100;
          var cls = p > 0.5 ? 'up' : (p < -0.5 ? 'dn' : 'flat');
          delta = '<span class="delta ' + cls + '">' + (p > 0 ? '+' : '') + p.toFixed(1) + '%</span>';
        }
      }
      var w = typeof c.last === 'number' ? Math.max(4, Math.round(Math.sqrt(c.last / max) * 100)) : 4;
      return '<div class="chan"><div class="top"><span>' + esc(c.icon || '📊') + '</span><span class="nm">' + esc(c.name) + '</span>' +
        (c.tag ? '<span class="tg">' + esc(c.tag) + '</span>' : '') + '<span class="st">' + statusTag(c.status) + '</span></div>' +
        '<div class="nums"><span class="big">' + (typeof c.last === 'number' ? fmt(c.last) : esc(c.last)) +
        '<small>' + esc(c.unit || '') + '</small></span>' + delta + '</div>' +
        '<div class="track"><i style="width:' + w + '%"></i></div>' +
        '<div class="cap"><span>' + esc(c.at || '') + '</span><span>' + esc(c.prevLabel || (typeof c.prev === 'number' ? '직전 ' + fmt(c.prev) : '')) + '</span></div>' +
        '<p class="note" style="margin-top:8px;padding-top:7px">' + esc(c.note || '') + '</p></div>';
    }).join('');

    var rev = DATA.revenue || [];
    $('revCnt').textContent = rev.length + '개';
    $('revList').innerHTML = rev.map(function (r) {
      return '<div class="revrow"><span class="ic">' + esc(r.icon) + '</span>' +
        '<span><span class="nm">' + esc(r.name) + '</span><span class="note2">' + esc(r.note) + '</span></span>' +
        '<span class="v">' + esc(r.value) + '</span></div>';
    }).join('');
  }

  /* ---------------- 메모 ---------------- */
  function renderMemo() {
    var m = DATA.memo || {};
    $('memoPrinciples').innerHTML = (m.principles || []).map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('');
    $('memoBounds').innerHTML = (m.boundaries || []).map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('');
    $('changelog').innerHTML = (m.changelog || []).map(function (c) {
      return '<div class="row"><time>' + esc(c.t) + '</time><span><span class="v">' + esc(c.v) + '</span>' + esc(c.text) + '</span></div>';
    }).join('');
    $('logList').innerHTML = (DATA.logs || []).map(function (l) {
      return '<div><time>' + esc(l.t) + '</time><span>' + esc(l.text) + '</span></div>';
    }).join('');
  }

  /* ---------------- 이벤트 ---------------- */
  function renderAll() {
    if (!DATA) return;
    renderMap(); renderMeet(); renderWork(); renderStats(); renderMemo();
    $('stamp').textContent = '기준 ' + String(DATA.updated || '').replace('T', ' ').slice(0, 16);
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-tab],[data-view],[data-room],[data-roomchip],[data-deptrow],[data-wtab],[data-mroom],[data-team],[data-goto]') : null;
    if (!t) return;

    if (t.hasAttribute('data-tab')) { showTab(t.getAttribute('data-tab')); return; }

    if (t.hasAttribute('data-view')) {
      state.view = t.getAttribute('data-view');
      document.querySelectorAll('#viewSeg button').forEach(function (b) {
        var on = b.getAttribute('data-view') === state.view;
        b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      $('clayView').classList.toggle('hidden', state.view !== 'clay');
      $('pixelView').classList.toggle('hidden', state.view !== 'pixel');
      return;
    }

    if (t.hasAttribute('data-room') || t.hasAttribute('data-roomchip')) {
      state.room = t.getAttribute('data-room') || t.getAttribute('data-roomchip');
      document.querySelectorAll('.hot').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-room') === state.room); });
      renderChips(); renderPlan(); renderDetail();
      if (window.innerWidth < 940) {
        var p = $('detailPanel'); if (p) p.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    if (t.hasAttribute('data-deptrow')) {
      state.room = t.getAttribute('data-deptrow');
      renderChips(); renderPlan(); renderDetail();
      return;
    }

    if (t.hasAttribute('data-wtab')) {
      state.wt = t.getAttribute('data-wtab');
      document.querySelectorAll('#workSeg button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-wtab') === state.wt); });
      renderWork();
      return;
    }

    if (t.hasAttribute('data-mroom')) { state.mroom = t.getAttribute('data-mroom'); renderMeet(); return; }
    if (t.hasAttribute('data-team')) { state.team = t.getAttribute('data-team'); renderMeet(); return; }
    if (t.hasAttribute('data-goto')) { e.preventDefault(); showTab(t.getAttribute('data-goto')); return; }
  });

  /* ---------------- 시작 ---------------- */
  function load() {
    return fetch('./data.json?ts=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) {
        DATA = d;
        $('errBox').innerHTML = '';
        renderAll();
      })
      .catch(function (err) {
        $('errBox').innerHTML = '<div class="err">data.json을 불러오지 못했습니다 (' + esc(err.message) + '). 잠시 후 자동으로 다시 시도합니다.</div>';
      });
  }

  tick();
  setInterval(tick, 1000);
  load();
  setInterval(load, 5 * 60 * 1000);

  var hash = (location.hash || '').replace('#', '');
  if (['map', 'meet', 'work', 'stats', 'memo'].indexOf(hash) >= 0) {
    setTimeout(function () { showTab(hash); }, 0);
  }
})();
