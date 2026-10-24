/* 말랑 내신 · 지원 — 천일문 기본 유닛별 하·중·상 + 고1 모의고사 하루 3문제 (주아 틀을 그대로 쓰고 색만 남색)
   지원 코드(jiwon)로 들어오면 loader.js 가 이 파일을 엽니다. 기록은 서버에 '지원' 이름으로 남아요. */
(() => {
  'use strict';
  const DATA = window.NAESIN, UNITS = DATA.units || [], SYNC = DATA.sync || null, KEY = 'mallang-naesin:v1';
  const HW = DATA.homework || null, TERMS = DATA.terms || { groups: {}, terms: [] }, MOCKS = DATA.mocks || [];
  const $ = (s) => document.querySelector(s), main = $('#main');
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  // 원래 노트의 채점 기준 그대로 (줄임말·문장부호 차이는 같은 답)
  const norm = (s) => String(s).toLowerCase().replace(/[’‘]/g, "'").replace(/won't/g, 'will not').replace(/isn't/g, 'is not').replace(/aren't/g, 'are not').replace(/\bi'm\b/g, 'i am').replace(/'ll\b/g, ' will').replace(/didn't/g, 'did not').replace(/wasn't/g, 'was not').replace(/weren't/g, 'were not').replace(/[.?!,;:]/g, '').replace(/[–—-]/g, '-').replace(/\s+/g, ' ').trim();
  let S = {}; try { S = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
  S.ans = S.ans || {}; S.log = S.log || []; S.del = S.del || {}; S.wd = S.wd || {}; S.mk = S.mk || {};
  function clean() { S.log = S.log.filter((e) => !(S.del || {})['log:' + e.at]);
    for (const k in S.del || {}) if (k.startsWith('mk:') && S.mk && S.mk[k.slice(3)] && (S.mk[k.slice(3)].at || 0) <= S.del[k]) delete S.mk[k.slice(3)];
    for (const k in S.del || {}) if (k.startsWith('wd:') && S.wd && S.wd[k.slice(3)] && (S.wd[k.slice(3)].at || 0) <= S.del[k]) delete S.wd[k.slice(3)]; } // 선생님이 지운 단어 기록·기록장 줄도 되살아나지 않게
  for (const k in S.del) if (S.ans[k] && (S.ans[k].at || 0) <= S.del[k]) delete S.ans[k];
  clean();
  if (!UNITS.find((u) => u.no === S.unit)) S.unit = UNITS.length ? UNITS[UNITS.length - 1].no : 0;
  S.terms = S.terms || {}; S.seen = S.seen || {}; S.wd = S.wd || {};
  const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  if (HW && HW.days.some((d) => d.date >= todayKey())) S.step = 'hw'; // 숙제가 있으면 숙제부터
  if (![2, 3, 4, 'wrong', 'hw', 'sum', 'mock'].includes(S.step)) S.step = 2;
  let pushT = null;
  const save = (local) => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} if (!local) schedule(); };

  document.documentElement.dataset.kid = 'jua'; document.documentElement.dataset.sub = 'jiwon'; // 배치는 주아 화면 그대로, 색만 지원 것
  window.__naesinStarted = true;
  { const bm = document.getElementById('boot-msg'); if (bm) bm.remove(); }
  setTimeout(() => { const s = $('#splash'); if (!s) return; s.style.transition = 'opacity .35s'; s.style.opacity = 0; setTimeout(() => s.remove(), 360); }, 600);
  document.title = '지원 영어';

  // ── 사이드바: 과 → 단계
  $('.brand-name').textContent = '지원 영어';
  $('#lesson-sub').textContent = '천일문 기본 · 고1 모의고사';
  const subj = $('#subj'); if (subj) subj.hidden = true;
  const brand = $('#brand'); brand.removeAttribute('aria-haspopup'); brand.style.cursor = 'pointer';
  brand.addEventListener('click', () => { UI.hwT = null; delete document.documentElement.dataset.navopen; S.step = HW ? 'hw' : 2; save(true); goFx(brand, true); }); // 로고 = 처음 화면(숙제 목록)
  const STEP_NAME = { 2: '하 · 기본', 3: '중 · 응용', 4: '상 · 실전' };
  const SN = (u, st) => ((u && u.stepNames) || {})[st] || STEP_NAME[st], UL = (u) => u.label || `UNIT ${u.no}`, SM = (u, st) => ((u && u.stepMarks) || {})[st] || ['하', '중', '상'][st - 2]; // 심화 유닛은 단계 이름이 따로
  const qs = (u, step) => u.questions.filter((q) => step === 'wrong' ? isWrong(u, q) : q.step === step);
  const rec = (u, q) => S.ans[`${u.no}:${q.id}`];
  const isWrong = (u, q) => { const r = rec(u, q); return r && r.first === false && !r.fixed; };
  const stat = (u, step) => { const list = qs(u, step); return { n: list.length, ok: list.filter((q) => (rec(u, q) || {}).ok).length }; };
  function side() {
    const left = HW ? (HW.days.find((d) => d.date === todayKey()) || { tasks: [] }).tasks.filter((t) => !taskOk(t)).length : 0;
    const wr = wrongAll(), nb = (st, icon, name, tally) => `<button class="nav-item ${S.step === st ? 'is-on' : ''}" data-st="${st}" type="button"><i class="ni">${icon}</i><span class="jua-nt">${name}</span>${tally ? `<span class="tally">${tally}</span>` : ''}</button>`;
    $('#nav').innerHTML = `<div class="jua-quick">${HW ? nb('hw', '✎', '일요일 수업', left) : ''}${MOCKS.length ? nb('mock', '📝', '모의고사', mkLeft() || '') : ''}${nb('sum', '📄', '개념 요약')}${nb('wrong', '✕', '틀린 문제<span class="jua-long"> 다시</span>', wr)}</div>` +
      `<div class="jua-units">${UNITS.slice().sort((x, y) => y.chapter - x.chapter || x.no - y.no).map((u, i, a) => `${!i || a[i - 1].chapter !== u.chapter ? `<div class="jw-ch">CHAPTER ${u.chapter} · ${esc(u.chTitle || '')}</div>` : ''}<div class="jua-unit"><div class="jua-unit-h">${UL(u)} <span class="jw-ut">${esc(u.title)}</span></div><div class="jua-steps">${[2, 3, 4].map((st) => { const s2 = stat(u, st); return `<button class="nav-item ${S.unit === u.no && S.step === st ? 'is-on' : ''}" data-u="${u.no}" data-st="${st}" type="button"><i class="ni">${s2.n && s2.ok === s2.n ? '✓' : SM(u, st)}</i><span class="jua-nt">${SN(u, st)}</span><span class="tally ${s2.n && s2.ok === s2.n ? 'full' : ''}">${s2.n && s2.ok === s2.n ? '✓ ' : ''}${s2.ok}/${s2.n}</span><span class="jua-sbar"><i style="width:${s2.n ? Math.round(s2.ok / s2.n * 100) : 0}%"></i></span></button>`; }).join('')}</div></div>`).join('')}</div>`;
    $('#who-name').textContent = S.who || '지원';
    $('#who-edit').textContent = '로그아웃';
  }
  const wrongAll = () => UNITS.reduce((n, u) => n + qs(u, 'wrong').length, 0) + mkWrong().length;
  $('#nav').addEventListener('click', (e) => { const b = e.target.closest('[data-st]'); if (!b) return; UI.hwT = null; delete document.documentElement.dataset.navopen; if (b.dataset.u) S.unit = +b.dataset.u; S.step = ['wrong', 'hw', 'sum', 'mock'].includes(b.dataset.st) ? b.dataset.st : +b.dataset.st; if (S.step === 'mock') UI.mfrom = null; save(true); goFx(b); });
  // 메뉴 칸을 누르면: 칸이 톡 눌리고 → 위에 분홍 로딩 줄 → 내용이 살짝 떠오르며 나타나고, 폰에서는 내용 있는 곳으로 내려감
  function goFx(btn, top) {
    const key = `${S.unit}:${S.step}`;
    btn.classList.remove('jua-tap'); void btn.offsetWidth; btn.classList.add('jua-tap');
    let bar = document.querySelector('.jua-load'); if (!bar) { bar = document.createElement('div'); bar.className = 'jua-load'; document.body.appendChild(bar); }
    bar.classList.remove('run'); void bar.offsetWidth; bar.classList.add('run');
    setTimeout(() => {
      const jump = UI.wjump; // 단어 게임은 게임 칸으로 바로 내려가니 따로 스크롤하지 않음
      render();
      main.classList.remove('enter'); void main.offsetWidth; main.classList.add('enter');
      const nb = document.querySelector(`#nav [data-st="${S.step}"]${S.step > 1 && S.step < 5 ? `[data-u="${S.unit}"]` : ''}`); if (nb) { nb.classList.add('jua-tap'); }
      if (jump) return;
      if (top) scrollTo({ top: 0, behavior: 'smooth' });
      else if (innerWidth <= 900) { const y = main.getBoundingClientRect().top + scrollY - 8; scrollTo({ top: Math.max(0, y), behavior: 'smooth' }); } else scrollTo(0, 0);
    }, 140);
  }

  // ── 효과: 하트 콘페티 · 딩 소리 · 연속 정답
  let combo = 0, audio = null;
  function ding(ok) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const notes = ok ? [880, 1175, 1568] : [330, 262];
      notes.forEach((f, i) => { const o = audio.createOscillator(), g = audio.createGain(); o.type = 'sine'; o.frequency.value = f; o.connect(g); g.connect(audio.destination); const t = audio.currentTime + i * 0.08; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25); o.start(t); o.stop(t + 0.3); });
    } catch (e) {}
  }
  function hearts(el, n = 16) {
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('span'); p.className = 'jua-heart'; p.textContent = ['✨', '⭐', '💙', '🎯', '👏'][i % 5];
      const a = Math.random() * Math.PI * 2, d = 50 + Math.random() * 90;
      p.style.left = cx + 'px'; p.style.top = cy + 'px'; p.style.setProperty('--dx', Math.cos(a) * d + 'px'); p.style.setProperty('--dy', Math.sin(a) * d - 40 + 'px');
      document.body.appendChild(p); setTimeout(() => p.remove(), 1000);
    }
  }
  function cheer(msg) { const c = document.createElement('div'); c.className = 'cheer jua-cheer'; c.textContent = msg; document.body.appendChild(c); setTimeout(() => c.remove(), 1600); }
  function react(ok, el) {
    ding(ok);
    if (!el) return;
    el.classList.remove('fx-pop', 'fx-shake'); void el.offsetWidth; el.classList.add(ok ? 'fx-pop' : 'fx-shake');
    if (ok) { combo++; hearts(el, combo >= 5 ? 26 : 14); if ([3, 5, 10, 15, 20].includes(combo)) cheer(`🔥 ${combo}연속 정답!`); }
    else combo = 0;
  }

  // ── 숙제
  function check(c) {
    if (c.type === 'step') { const u = UNITS.find((x) => x.no === c.unit), list = u ? qs(u, c.step) : [], done = list.filter((q) => rec(u, q)).length, ok = list.filter((q) => (rec(u, q) || {}).ok).length; return { ok: list.length > 0 && done >= list.length, txt: `${done}/${list.length}문제 풂 · ${ok}개 맞힘` }; }
    if (c.type === 'wrong') { const n = wrongAll(); return { ok: n === 0, txt: n ? `틀린 문제 ${n}개 남음` : '틀린 문제 0개' }; }
    if (c.type === 'termsRead') return { ok: !!S.seen.terms, txt: S.seen.terms ? '다 훑어봤어요' : '아직' };
    if (c.type === 'termsQuiz') { const n = TERMS.terms.filter((t) => (S.terms[t.id] || {}).ok).length; return { ok: n >= TERMS.terms.length, txt: `${n}/${TERMS.terms.length}개 맞힘` }; }
    if (c.type === 'words') { const n = wDone(c.mode); return { ok: WL.length > 0 && n >= WL.length, txt: `${n}/${WL.length}개 외움` }; }
    if (c.type === 'wordsSeen') { const n = wSeenN(c.day); return { ok: WL.length > 0 && n >= WL.length, txt: `${n}/${WL.length}개 봤어요` }; }
    if (c.type === 'mock') { const list = c.keys.map((k) => MKALL().find((x) => x.k === k)).filter(Boolean), done = list.filter((x) => mkRec(x.m.id, x.q.n)).length, ok = list.filter((x) => (mkRec(x.m.id, x.q.n) || {}).ok).length; return { ok: list.length > 0 && done >= list.length, txt: `${done}/${list.length}문제 풂 · ${ok}개 맞힘` }; }
    if (c.type === 'seen') return { ok: !!S.seen[c.key], txt: S.seen[c.key] ? '봤어요' : '아직' };
    return { ok: false, txt: '' };
  }
  const dayOf = (t) => HW.days.find((d) => d.tasks.includes(t));
  const taskOk = (t) => t.checks.every((c) => check(c).ok) && (!t.checks.some((c) => c.type === 'wrong') || ((o) => o.length > 0 && o.every((x) => x.checks.every((c) => check(c).ok)))(dayOf(t).tasks.filter((x) => x !== t)));
  function hwView() {
    const t = todayKey();
    main.innerHTML = `<section class="banner jua-hero"><div><p class="jua-eyebrow">📌 ${esc(HW.dueLabel)}</p><h1>${esc(HW.title)}</h1><p>일요일마다 · 그날 챕터 유닛 하·중·상 + 모의고사 3문제. 틀린 건 다시 맞혀야 끝!</p></div><span class="jua-crown">🎯</span></section><div class="hw-days">` +
      HW.days.map((d) => { const okN = d.tasks.filter(taskOk).length, all = okN === d.tasks.length;
        return `<section class="card hw-day ${all ? 'done' : ''} ${d.date === t ? 'today' : ''}"><div class="hw-day-h"><div><b>${esc(d.label)}</b> <span class="hint">${esc(d.dateLabel)}</span> ${d.date === t ? '<span class="badge ok">오늘</span>' : ''}<div class="hw-goal">${esc(d.goal)}</div></div><div class="hw-ring" style="--p:${Math.round(okN / d.tasks.length * 100)}"><span>${okN}/${d.tasks.length}</span></div></div>
          <div class="hw-tasks">${d.tasks.map((tk, i) => { const ok = taskOk(tk); return `<button class="hw-task ${ok ? 'ok' : ''}" data-day="${d.id}" data-i="${i}" type="button"><span class="hw-box">${ok ? '✓' : i + 1}</span><span class="hw-body"><span class="hw-t">${esc(tk.t)}</span><span class="hw-d">${esc(tk.d)}</span><span class="hw-s">${esc(tk.checks.map((c) => check(c).txt).join(' · '))}</span></span><span class="hw-go">${ok ? '다시 보기' : '하러 가기 ›'}</span></button>`; }).join('')}</div>
          ${all ? '<div class="hw-done"><b>🎯 오늘 수업 문제 끝! 수고했어요</b></div>' : ''}</section>`; }).join('') + '</div>';
    main.querySelectorAll('.hw-task').forEach((b) => (b.onclick = () => hwOpen(HW.days.find((x) => x.id === b.dataset.day).tasks[+b.dataset.i])));
  }
  function hwOpen(tk) {
    { const g = tk.go || {}; UI.hwT = tk; delete document.documentElement.dataset.navopen; if (g.unit) S.unit = g.unit; S.step = g.step; if (g.mfrom) UI.mfrom = g.mfrom; if (g.tmode) UI.tmode = g.tmode; if (g.wmode) { UI.wmode = g.wmode; UI.wjump = 1; } save(true); goFx(document.activeElement && document.activeElement.closest('button') || main, true); }
  }
  // 숙제하는 동안: 큰 메뉴 대신 그날 숙제를 밑줄 탭으로 (폰에서는 메뉴를 접어 둠)
  function hwBar() {
    const on = HW && UI.hwT && S.step !== 'hw'; // 숙제 목록 화면은 평소대로, 숙제 하나에 들어갔을 때만
    if (on) document.documentElement.dataset.hwmode = 1; else { delete document.documentElement.dataset.hwmode; delete document.documentElement.dataset.navopen; }
    if (!on) return;
    const d = UI.hwT ? dayOf(UI.hwT) : HW.days.find((x) => x.date === todayKey()) || HW.days.find((x) => x.date > todayKey());
    const tabs = (d ? d.tasks : []).map((t) => `<button type="button" data-hwt="${d.tasks.indexOf(t)}" class="${UI.hwT === t ? 'on' : ''} ${taskOk(t) ? 'ok' : ''}"><i>${taskOk(t) ? '✓' : d.tasks.indexOf(t) + 1}</i>${esc(t.t.replace(/^[^\w가-힣]+/u, ''))}</button>`).join('');
    const okN = d ? d.tasks.filter(taskOk).length : 0; // 숙제 목록으로는 로고를 눌러 돌아감
    main.insertAdjacentHTML('afterbegin', `${d ? `<div class="hwbar-h"><h1>${esc(d.dateLabel.split(' ')[0])} 일요일 수업</h1><span>${esc(d.goal || '')} · ${okN}/${d.tasks.length} 끝</span></div>` : ''}<nav class="hwbar"><div class="hwbar-tabs">${tabs}</div></nav>`);
    const bar = main.querySelector('.hwbar-tabs'), cur = bar.querySelector('.on'); if (cur) bar.scrollLeft = cur.offsetLeft - 40;
    bar.querySelectorAll('[data-hwt]').forEach((b) => (b.onclick = () => { if (b.dataset.hwt === 'list') { UI.hwT = null; S.step = 'hw'; save(true); render(); scrollTo(0, 0); } else hwOpen(d.tasks[+b.dataset.hwt]); }));
    dragScroll(bar);
  }
  // ── 셔틀 카드: 학원 시험에 나오는 영어 용어·지시문 ↔ 한국말
  const UI = { tmode: 'read', retried: {} };
  function termsView() {
    const tabs = `<div class="seg"><button type="button" data-tm="read" class="${UI.tmode === 'read' ? 'on' : ''}">쭉 훑어보기</button><button type="button" data-tm="quiz" class="${UI.tmode === 'quiz' ? 'on' : ''}">맞추기</button></div>`;
    let html = `<section class="banner jua-hero"><div><p class="jua-eyebrow">🚌 셔틀에서 5분</p><h1>영어로 나와도 당황 금지!</h1><p>negative = 부정문, past continuous = 과거진행형 — 아는 거 영어 이름만 익혀요</p></div><span class="jua-crown">👑</span></section><div class="bar-row">${tabs}</div>`;
    if (UI.tmode === 'read') {
      html += Object.entries(TERMS.groups).map(([g, name]) => `<div class="card jua-sec"><h2>${esc(name)}</h2><div class="jua-terms">${TERMS.terms.filter((x) => x.kind === g).map((x) => `<div class="jua-term"><b>${esc(x.en)}</b><span>${esc(x.ko)}</span>${x.ex ? `<em>${esc(x.ex)}</em>` : ''}</div>`).join('')}</div></div>`).join('') +
        `<div class="sc-foot"><span></span><button class="btn ok" data-tread type="button">${S.seen.terms ? '다 봤어요 ♡' : '다 훑어봤어요 ✓'}</button></div>`;
      main.innerHTML = html;
      main.querySelector('[data-tread]').onclick = (e) => { S.seen.terms = Date.now(); save(); cheer('💖 셔틀 카드 완료!'); hearts(e.target, 20); UI.tmode = 'quiz'; render(); scrollTo(0, 0); };
    } else {
      const left = TERMS.terms.filter((x) => !(S.terms[x.id] || {}).ok), cur = left[0], n = TERMS.terms.length - left.length;
      html += `<div class="card jua-sec"><h2>영어 용어 보고 한국말 고르기 · ${n}/${TERMS.terms.length}</h2>` + (!cur ? '<div class="empty">다 맞혔어요! 이제 영어로 나와도 문제없어 👑</div>' :
        `<div class="mt-q jua-tq">${esc(cur.en)}</div><div class="jua-ops jua-tops">${shuffle([cur, ...shuffle(TERMS.terms.filter((x) => x.id !== cur.id && x.kind === cur.kind)).slice(0, 3)]).map((x) => `<button class="chip jua-op" data-tq="${x.id}" type="button">${esc(x.ko)}</button>`).join('')}</div>`) +
        `<div class="sc-foot"><span></span><button class="link" data-treset type="button">처음부터 다시</button></div></div>`;
      main.innerHTML = html;
      main.querySelectorAll('[data-tq]').forEach((b) => (b.onclick = () => { const ok = b.dataset.tq === cur.id; S.terms[cur.id] = { ok: ok ? 1 : 0, at: Date.now() }; save(); react(ok, b); if (ok) setTimeout(() => { render(); if (!TERMS.terms.some((x) => !(S.terms[x.id] || {}).ok)) cheer('👑 용어 다 맞힘!'); }, 450); }));
      const rs = main.querySelector('[data-treset]'); if (rs) rs.onclick = () => { S.terms = {}; save(); render(); };
    }
    main.querySelectorAll('[data-tm]').forEach((b) => (b.onclick = () => { UI.tmode = b.dataset.tm; render(); }));
  }
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  // ── 한 장 요약: 과별 설명 표만 모아서
  function sumView() {
    const chs = [...new Set(UNITS.map((u) => u.chapter))];
    main.innerHTML = `<section class="banner jua-hero"><div><p class="jua-eyebrow">📄 개념 한 장</p><h1>${chs.map((c) => `CHAPTER ${c}`).join(' · ')} 개념 요약</h1><p>유닛별 표만 쓱 보고 문제로 가요</p></div><span class="jua-crown">🎯</span></section>` +
      UNITS.map((u) => `<div class="jua-lesson">${u.lessons[2] || ''}</div>`).join('') +
      `<div class="sc-foot"><span></span><button class="btn ok" data-sumok type="button">${S.seen.sum ? '봤어요 ✓' : '다 봤어요 ✓'}</button></div>`;
    main.querySelector('[data-sumok]').onclick = (e) => { S.seen.sum = Date.now(); save(); hearts(e.target, 18); cheer('📄 개념 요약 완료!'); };
  }

  // ── 고1 모의고사: 하루 3문제씩. 고른 번호를 채점하고, 틀리면 해석·어구를 펼쳐 볼 수 있음
  const MK = (id) => MOCKS.find((m) => m.id === id);
  const mkRec = (set, n) => S.mk[`${set}:${n}`];
  const mkList = (set, from, to) => ((MK(set) || {}).qs || []).filter((q) => q.n >= from && q.n <= to);
  const mkWrong = () => MOCKS.flatMap((m) => m.qs.filter((q) => { const r = mkRec(m.id, q.n); return r && r.first === false && !r.fixed; }).map((q) => ({ m, q })));
  const mkLeft = () => { if (!HW) return 0; const d = HW.days.find((x) => x.date === todayKey()); if (!d) return 0; return d.tasks.flatMap((t) => t.checks).filter((c) => c.type === 'mock').reduce((n, c) => n + c.keys.filter((k) => !S.mk[k]).length, 0); };
  const NUM = ['①', '②', '③', '④', '⑤'];
  function mkCard(m, q, retry) {
    const k = `${m.id}:${q.n}`, r = retry && !UI.retried['mk:' + k] ? null : mkRec(m.id, q.n);
    const ops = q.choices ? q.choices.map((c, i) => `<button type="button" class="mk-op ${r && +r.v === i + 1 ? (r.ok ? 'right' : 'wrong') : ''} ${r && !r.ok && r.tries > 1 && i + 1 === q.ans ? 'ans' : ''}" data-mop="${i + 1}"><b>${NUM[i]}</b><span>${c}</span></button>`).join('')
      : NUM.map((c, i) => `<button type="button" class="mk-op mk-op-n ${r && +r.v === i + 1 ? (r.ok ? 'right' : 'wrong') : ''}" data-mop="${i + 1}"><b>${c}</b></button>`).join('');
    const fb = !r ? '' : r.ok ? `<div class="jua-fb ok">✓ 정답 ${NUM[q.ans - 1]}</div>` : `<div class="jua-fb no">앗, 다시 골라 봐요.${r.tries > 1 ? ` 정답은 <b>${NUM[q.ans - 1]}</b>` : ' (한 번 더 틀리면 정답이 보여요)'}</div>`;
    const ko = r && (r.ok || r.tries > 1) ? `<details class="mk-ko"><summary>해석 · 어구 보기</summary><p>${esc(q.ko)}</p>${q.note ? `<p class="mk-note">${esc(q.note).replace(/\n/g, '<br>')}</p>` : ''}</details>` : '';
    return `<article class="card jua-sec mk-q ${r && r.ok ? 'done' : ''}" data-mk="${k}"><div class="mk-h"><span class="mk-n">${q.n}</span><div><span class="mk-kind">${esc(q.kind)}</span><div class="mk-head">${q.head}</div></div></div><div class="mk-psg">${q.passage}</div><div class="mk-ops ${q.choices ? '' : 'row'}">${ops}</div>${fb}${ko}</article>`;
  }
  function mkGrade(k, v, el) {
    const i = k.lastIndexOf(':'), set = k.slice(0, i), n = +k.slice(i + 1), q = MK(set).qs.find((x) => x.n === n), ok = +v === q.ans, r = S.mk[k];
    if (S.step === 'wrong') UI.retried['mk:' + k] = 1;
    S.mk[k] = { v: +v, ok: ok ? 1 : 0, first: r ? r.first : ok, fixed: r && r.first === false && ok ? 1 : (r && r.fixed) || 0, tries: ok ? (r ? r.tries || 1 : 1) : ((r && !r.ok ? r.tries || 1 : 0) + 1), at: Date.now() };
    S.log.push({ k: '지원 모의고사', t: `${MK(set).short} ${n}번 ${q.kind}`, ok: ok ? 1 : 0, at: Date.now() }); if (S.log.length > 2000) S.log = S.log.slice(-2000);
    save();
    const y = scrollY; render(); scrollTo(0, y);
    react(ok, main.querySelector(`[data-mk="${k}"]`) || el);
  }
  // 모의고사는 빈칸추론만 — 여러 회차를 한 줄로 이어서 3문제씩
  const MKALL = () => MOCKS.flatMap((m) => m.qs.map((q) => ({ m, q, k: `${m.id}:${q.n}` })));
  function mockView() {
    const all = MKALL(), chunks = []; for (let i = 0; i < all.length; i += 3) chunks.push(all.slice(i, i + 3));
    const first = (all.find((x) => !mkRec(x.m.id, x.q.n)) || all[0]).k, from = UI.mfrom || first;
    const cur = chunks.find((c) => c.some((x) => x.k === from)) || chunks[0];
    const done = all.filter((x) => (mkRec(x.m.id, x.q.n) || {}).ok).length;
    const lab = (c) => c.map((x) => x.q.n).join('·');
    const tabs = `<div class="seg mk-seg">${chunks.map((c, i) => { const ok = c.every((x) => (mkRec(x.m.id, x.q.n) || {}).ok); return `<button type="button" data-mf="${c[0].k}" class="${c === cur ? 'on' : ''}">${ok ? '✓ ' : ''}${i + 1}회 ${lab(c)}</button>`; }).join('')}</div>`;
    main.innerHTML = `<section class="banner jua-hero"><div><p class="jua-eyebrow">📝 일요일마다 3문제</p><h1>고1 모의고사 빈칸추론</h1><div class="jua-prog"><span style="width:${Math.round(done / all.length * 100)}%"></span></div><p>${done} / ${all.length} 맞힘 · ${MOCKS.map((m) => m.short).join(' · ')}</p></div><span class="jua-crown">🎯</span></section><div class="bar-row mk-bar">${tabs}</div>` +
      cur.map((x) => `<p class="mk-src">${esc(x.m.title)}</p>` + mkCard(x.m, x.q)).join('') +
      `<div class="sc-foot"><span></span>${chunks.indexOf(cur) < chunks.length - 1 ? `<button class="btn ok" data-mnext type="button">다음 3문제 →</button>` : ''}</div>`;
    UI.mfrom = cur[0].k;
    main.querySelectorAll('[data-mf]').forEach((b) => (b.onclick = () => { UI.mfrom = b.dataset.mf; render(); }));
    const nx = main.querySelector('[data-mnext]'); if (nx) nx.onclick = () => { UI.mfrom = chunks[chunks.indexOf(cur) + 1][0].k; render(); scrollTo({ top: 0, behavior: 'smooth' }); };
    mkBind();
  }
  function mkBind() { main.querySelectorAll('[data-mk]').forEach((a) => a.querySelectorAll('[data-mop]').forEach((b) => (b.onclick = () => mkGrade(a.dataset.mk, b.dataset.mop, b)))); }
  function _unused() {
  }

  // ── 단어 시험 게임: 틀린 단어는 몇 장 뒤에 또 나오고, 한 번 틀린 단어는 두 번 연달아 맞혀야 외운 걸로
  const WORDS = DATA.words || { words: [] }, WL = WORDS.words, WMODE = { read: '쭉 보기', ko: '뜻 쓰기', en: '영어 쓰기' };
  const WGROUP = { 18: 'Day 18', 19: 'Day 19', 20: 'part ~ come close' };
  const wrec = (m, id) => S.wd[`${m}:${id}`];
  const wGot = (m, id) => { const r = wrec(m, id); return !!r && r.s >= (r.w ? 2 : 1); };
  const wDone = (m) => WL.filter((w) => wGot(m, w.id)).length;
  const wSeenKey = (id, day = todayKey()) => `words:${day}:${id}`, wSeenN = (day = todayKey()) => WL.filter((w) => S.seen[wSeenKey(w.id, day)]).length;
  const wLeft = () => WL.filter((w) => !wGot('ko', w.id) || !wGot('en', w.id)).length; // 뜻·영어 둘 다 외워야 끝
  const hangul = (s) => /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(s);
  // 뜻 채점: 책 뜻을 쉼표·빗금으로 나눠 괄호·물결·띄어쓰기를 빼고, 끝의 '다'·'한'·'는' 같은 꼬리는 달라도 맞음
  const koParts = (ko) => ko.replace(/\((명|동|형|부)\)/g, '').split(/[,/·]/).map((p) => p.replace(/\([^)]*\)/g, '').replace(/[~\s.]/g, '')).filter(Boolean);
  const koStem = (p) => p.replace(/(하다|이다|다|한|는|인|의|은)$/, '');
  function koOk(w, v) { const x = v.replace(/[~\s.,]/g, ''); if (x.length < 1) return false; return koParts(w.ko).some((p) => x.includes(p) || (koStem(p).length >= 2 && x.includes(koStem(p))) || (x.length >= 2 && p.includes(x) && x.length >= p.length - 2)); }
  const enOk = (w, v) => norm(v) === norm(w.en);
  const exHtml = (w, hide) => esc(w.ex).replace(new RegExp(`\\b(${w.en.split(' ')[0].slice(0, Math.max(3, w.en.split(' ')[0].length - 2))}\\w*${w.en.includes(' ') ? ' ' + w.en.split(' ').slice(1).join(' ') : ''})`, 'i'), hide ? '<u class="jw-gap">______</u>' : '<b class="jw-hl">$1</b>');
  function wQueue(m) { UI.wq = { m, q: shuffle(WL.filter((w) => !wGot(m, w.id)).map((w) => w.id)), phase: 'ask', hint: 0 }; }
  function wordsView() {
    const m = UI.wmode in WMODE ? UI.wmode : 'read';
    const tabs = `<div class="seg">${Object.entries(WMODE).map(([k, n]) => `<button type="button" data-wm="${k}" class="${m === k ? 'on' : ''}">${n}${k === 'read' ? '' : ` ${wDone(k)}/${WL.length}`}</button>`).join('')}</div>`;
    let html = `<section class="banner jua-hero"><div><p class="jua-eyebrow">🔤 ${esc(WORDS.when || '')}</p><h1>단어 ${WL.length}개, 내 거 만들기!</h1><p>${esc(WORDS.test || '')}<br>틀린 단어는 또 나와요. 한 번 틀린 건 <b>두 번 연달아</b> 맞혀야 외운 걸로 쳐요 💪</p></div><span class="jua-crown">👑</span></section><div class="bar-row">${tabs}</div>`;
    if (m === 'read') {
      const only = UI.wonly && WL.some((w) => (wrec('ko', w.id) || {}).w || (wrec('en', w.id) || {}).w);
      html += `<div class="bar-row jw-tools"><button class="chip ${UI.whide === 'ko' ? 'on' : ''}" data-wh="ko" type="button">뜻 가리기</button><button class="chip ${UI.whide === 'en' ? 'on' : ''}" data-wh="en" type="button">영어 가리기</button><button class="chip ${UI.wonly ? 'on' : ''}" data-wo type="button">🔁 틀렸던 것만</button><span class="hint">${UI.whide ? '줄을 누르면 답이 보여요' : ''}</span><b class="jw-seen-n">오늘 본 단어 <em data-wseen-n>${wSeenN()}</em>/${WL.length}</b></div>`;
      html += Object.entries(WGROUP).map(([d, name]) => { const list = WL.filter((w) => w.day === +d && (!only || (wrec('ko', w.id) || {}).w || (wrec('en', w.id) || {}).w)); return !list.length ? '' :
        `<div class="card jua-sec"><h2>${esc(name)}</h2><div class="jw-list">${list.map((w) => { const miss = ((wrec('ko', w.id) || {}).w || 0) + ((wrec('en', w.id) || {}).w || 0);
          const sn = !!S.seen[wSeenKey(w.id)];
          return `<div class="jw-row ${UI.whide ? 'hide-' + UI.whide : ''}"><button type="button" class="jw-seen ${sn ? 'on' : ''}" data-wseen="${w.id}">${sn ? '♡ 봤어요' : '봤어요'}</button><b class="jw-en">${esc(w.en)}${miss ? `<i class="jw-miss">🔁${miss}</i>` : ''}</b><span class="jw-ko">${esc(w.ko)}</span><em class="jw-ex"><span class="jw-exen">${exHtml(w)}</span><span class="jw-exgap">${exHtml(w, true)}</span><br><span class="jw-exko">${esc(w.exKo)}</span>${w.extra ? `<br><span class="jw-x">${esc(w.extra)}</span>` : ''}</em></div>`; }).join('')}</div></div>`; }).join('') +
        '';
      main.innerHTML = html;
      main.querySelectorAll('.jw-row[class*="hide-"]').forEach((el) => (el.onclick = () => el.classList.toggle('show'))); // 가린 줄을 누르면 그 줄만 보임
      main.querySelectorAll('[data-wh]').forEach((b) => (b.onclick = () => { UI.whide = UI.whide === b.dataset.wh ? '' : b.dataset.wh; render(); }));
      main.querySelector('[data-wo]').onclick = () => { UI.wonly = !UI.wonly; render(); };
      // 단어마다 「봤어요」 — 누를 때마다 하트·소리, 40개 다 보면 왕관
      main.querySelectorAll('[data-wseen]').forEach((b) => (b.onclick = (e) => {
        e.stopPropagation(); const k = wSeenKey(b.dataset.wseen); if (S.seen[k]) { react(true, b); return; }
        S.seen[k] = Date.now(); save(); b.classList.add('on'); b.textContent = '♡ 봤어요'; react(true, b);
        const n = wSeenN(), el = main.querySelector('[data-wseen-n]'); if (el) el.textContent = n;
        if (n === WL.length) { cheer(`👑 단어 ${WL.length}개 다 봤어요!`); hearts(main.querySelector('.jua-hero') || b, 40); }
        const row = b.closest('.jw-row'), next = row && row.parentElement.querySelector('.jw-row:has(.jw-seen:not(.on))'); if (next && n < WL.length) setTimeout(() => next.scrollIntoView({ block: 'center', behavior: 'smooth' }), 250);
      }));
    } else {
      if (!UI.wq || UI.wq.m !== m) wQueue(m);
      const W = UI.wq, cur = WL.find((w) => w.id === (W.phase === 'wrong' ? W.last : W.q[0])), done = wDone(m);
      html += `<div class="card jua-sec jw-game"><div class="jw-top"><h2>${m === 'ko' ? '영어 보고 뜻 쓰기' : '뜻 보고 영어 쓰기'}</h2><span class="hint">외움 ${done}/${WL.length} · 이번 판 남은 카드 ${W.q.length}</span></div><div class="jua-prog"><span style="width:${Math.round(done / WL.length * 100)}%"></span></div>`;
      if (!cur) html += done === WL.length ? `<div class="empty">👑 ${WL.length}개 다 외웠어요! 공주님 최고 💖</div><div class="sc-foot"><span></span><button class="link" data-wagain type="button">처음부터 한 판 더 (외운 기록은 그대로)</button></div>` : `<div class="sc-foot"><span></span><button class="btn ok" data-wnext type="button">남은 단어 다시 →</button></div>`;
      else {
        const r = wrec(m, cur.id), again = r && r.w && r.s === 1;
        html += `<div class="jw-card">${again ? '<span class="badge">🔁 한 번 더 맞히면 끝!</span>' : r && r.w ? '<span class="badge warn">🔁 틀렸던 단어</span>' : ''}
          <div class="jw-q">${m === 'ko' ? esc(cur.en) : esc(cur.ko)}</div>${m === 'en' ? `<div class="jw-qex">${exHtml(cur, true)}</div>` : ''}`;
        if (W.phase === 'ask') html += `<div class="jua-line"><input class="jua-in" data-win autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${m === 'ko' ? '뜻을 한글로' : '영어로 쓰기'}"><button class="btn sm2" data-wgo type="button">확인</button></div>
          <div class="jw-sub">${m === 'en' ? `<button class="link" data-whint type="button">💡 첫 글자 힌트</button>${W.hint ? `<span class="jw-hint">${esc(cur.en.split('').map((c, i) => c === ' ' ? ' ' : i < W.hint ? c : '_').join(' '))}</span>` : ''}` : ''}<button class="link" data-wpass type="button">모르겠어요</button></div><div class="jw-msg" data-wmsg></div>`;
        else if (W.phase === 'wrong') html += `<div class="jua-fb no">정답은 <b>${esc(m === 'ko' ? cur.ko : cur.en)}</b>${W.v ? ` <span class="hint">(내 답: ${esc(W.v)})</span>` : ''}<br><span class="hint">${exHtml(cur)} — ${esc(cur.exKo)}</span></div>` +
          (m === 'en' ? `<div class="jua-line"><input class="jua-in" data-wcopy autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="✍️ ${esc(cur.en)} 따라 쓰기"><button class="btn sm2" data-wcopygo type="button">썼어요</button></div><div class="jw-msg" data-wmsg>손으로 한 번 따라 써야 다음으로 넘어가요. 이 단어는 조금 뒤에 또 나와요!</div>`
            : `<div class="sc-foot"><button class="link" data-wmine type="button">내 답도 같은 뜻이에요</button><button class="btn ok" data-wnext type="button">다음 →</button></div><div class="jw-msg">이 단어는 조금 뒤에 또 나와요!</div>`);
        html += '</div>';
      }
      html += `</div>`;
      main.innerHTML = html;
      const inp = main.querySelector('[data-win]'), msg = main.querySelector('[data-wmsg]');
      if (inp) {
        setTimeout(() => inp.focus({ preventScroll: true }), 30);
        const go = () => { const v = inp.value.trim(); if (!v) return;
          if (m === 'en' && hangul(v)) { msg.textContent = '한글 자판이에요! 영어로 바꿔서 써요 ⌨️'; return; }
          wAnswer(m, cur, (m === 'ko' ? koOk : enOk)(cur, v), v, inp); };
        inp.onkeydown = (e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); go(); } };
        main.querySelector('[data-wgo]').onclick = go;
        main.querySelector('[data-wpass]').onclick = () => wAnswer(m, cur, false, '', inp);
        const h = main.querySelector('[data-whint]'); if (h) h.onclick = () => { W.hint = Math.min(W.hint + 1, cur.en.length - 1); const v = inp.value; render(); const i2 = main.querySelector('[data-win]'); i2.value = v; };
      }
      const cp = main.querySelector('[data-wcopy]');
      if (cp) { setTimeout(() => cp.focus({ preventScroll: true }), 30);
        const go = () => { if (enOk(cur, cp.value)) { W.phase = 'ask'; W.hint = 0; W.v = ''; render(); } else { cp.classList.remove('fx-shake'); void cp.offsetWidth; cp.classList.add('fx-shake', 'wrong'); } };
        cp.onkeydown = (e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); go(); } }; main.querySelector('[data-wcopygo]').onclick = go; }
      const nx = main.querySelector('[data-wnext]'); if (nx) nx.onclick = () => { if (!W.q.length) wQueue(m); W.phase = 'ask'; W.hint = 0; W.v = ''; render(); };
      const mine = main.querySelector('[data-wmine]'); if (mine) mine.onclick = () => { const r = wrec(m, cur.id); r.w = Math.max(0, r.w - 1); r.s = 1; r.at = Date.now(); S.log.push({ k: '주아 단어', t: `뜻 인정: ${cur.en} = ${W.v}`, ok: 1, at: Date.now() }); save(); const qi = W.q.indexOf(cur.id); if (qi >= 0 && wGot(m, cur.id)) W.q.splice(qi, 1); W.phase = 'ask'; W.v = ''; render(); };
      const ag = main.querySelector('[data-wagain]'); if (ag) ag.onclick = () => { UI.wq = { m, q: shuffle(WL.map((w) => w.id)), phase: 'ask', hint: 0, practice: 1 }; render(); };
    }
    main.querySelectorAll('[data-wm]').forEach((b) => (b.onclick = () => { UI.wmode = b.dataset.wm; UI.wjump = 1; render(); }));
    // 폰에서는 메뉴가 위를 차지하니 게임 칸으로 바로 내려 줌
    if (UI.wjump) { UI.wjump = 0; const g = main.querySelector('.jw-game, .bar-row'); if (g && innerWidth < 640) setTimeout(() => g.scrollIntoView({ block: 'start' }), 0); }
  }
  function wAnswer(m, w, ok, v, el) {
    const W = UI.wq, k = `${m}:${w.id}`, r = S.wd[k] || { s: 0, w: 0 };
    if (ok && W.hint) ok = false; // 힌트 보고 맞힌 건 한 번 더 나옴
    if (ok) r.s++; else { r.s = 0; r.w++; }
    r.at = Date.now(); S.wd[k] = r;
    S.log.push({ k: '주아 단어', t: `${WMODE[m]} ${w.en}`, ok: ok ? 1 : 0, at: Date.now() }); if (S.log.length > 2000) S.log = S.log.slice(-2000);
    save();
    W.q.shift(); W.last = w.id;
    const got = wGot(m, w.id);
    if (!got || (W.practice && !ok)) W.q.splice(Math.min(W.q.length, ok ? 5 : 3), 0, w.id); // 틀리면 3장 뒤, 아직 덜 외웠으면 5장 뒤에 또
    react(ok, el);
    if (ok) { W.hint = 0; setTimeout(() => { render(); if (wDone(m) === WL.length && got) { cheer(`👑 ${WL.length}개 다 외웠다!`); hearts(main.querySelector('.jua-hero') || main, 40); } else if (got && r.w) cheer('💖 틀렸던 단어 정복!'); }, 380); }
    else { W.phase = 'wrong'; W.v = v; setTimeout(render, 380); }
  }

  // ── 화면
  // 탭 줄을 마우스로 끌거나 휠을 굴려도 옆으로 넘어가게 (손가락은 원래 됨)
  function dragScroll(el) {
    let x0 = null, s0 = 0, moved = false;
    el.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; x0 = e.clientX; s0 = el.scrollLeft; moved = false; });
    el.addEventListener('pointermove', (e) => { if (x0 === null) return; const dx = e.clientX - x0; if (Math.abs(dx) > 4) { moved = true; el.scrollLeft = s0 - dx; } });
    ['pointerup', 'pointerleave'].forEach((t) => el.addEventListener(t, () => { x0 = null; })); // 줄이 다시 그려지면 새 줄에 새로 붙음
    el.addEventListener('click', (e) => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
    el.addEventListener('wheel', (e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && el.scrollWidth > el.clientWidth) { e.preventDefault(); el.scrollLeft += e.deltaY; } }, { passive: false });
  }
  // 탭 미끄럼: 선택 표시(밑줄·칸)가 앞에 고른 탭 자리에서 새 탭으로 미끄러져 감
  const INK = {};
  function slideInk(box, key, line) {
    const on = box.querySelector(':scope > button.on'); if (!on) return;
    let ink = box.querySelector(':scope > .ink'); if (!ink) { ink = document.createElement('span'); ink.className = 'ink'; box.prepend(ink); }
    box.classList.add('has-ink');
    const to = { x: on.offsetLeft, y: on.offsetTop, w: on.offsetWidth, h: on.offsetHeight, s: box.scrollLeft }, from = INK[key];
    const set = (p) => { ink.style.transform = `translate(${p.x}px, ${line ? 0 : p.y}px)`; ink.style.width = p.w + 'px'; if (!line) ink.style.height = p.h + 'px'; };
    if (from && (from.x !== to.x || from.y !== to.y || from.w !== to.w)) {
      ink.style.transition = 'none'; set(from); void ink.offsetWidth; ink.style.transition = '';
      requestAnimationFrame(() => set(to));
      if (line && from.s !== to.s) { box.scrollLeft = from.s; box.scrollTo({ left: to.s, behavior: 'smooth' }); }
    } else set(to);
    INK[key] = to;
  }
  function render() { view(); hwBar(); inks(); }
  function inks() { const b = main.querySelector('.hwbar-tabs'); if (b) slideInk(b, 'hwbar', 1); main.querySelectorAll('.seg').forEach((s, i) => slideInk(s, `${S.step}:${i}`)); }
  function view() {
    side();
    if (S.step === 'hw' && HW) { hwView(); return; }
    if (S.step === 'sum') { sumView(); return; }
    if (S.step === 'mock' && MOCKS.length) { mockView(); return; }
    const u = UNITS.find((x) => x.no === S.unit);
    if (!u && S.step !== 'wrong') { main.innerHTML = '<div class="empty">아직 유닛이 없어요.</div>'; return; }
    if (S.step === 'wrong') {
      const groups = UNITS.map((x) => ({ u: x, list: qs(x, 'wrong') })).filter((g) => g.list.length);
      const mw = mkWrong();
      main.innerHTML = `<section class="banner jua-hero"><div><p class="jua-eyebrow">✕ 틀린 문제 다시</p><h1>한 번 더 하면 내 거!</h1><p>처음에 틀렸던 문제예요. 다시 맞히면 여기서 빠져요.</p></div><span class="jua-crown">🎯</span></section>` +
        (groups.length ? groups.map((g) => `<div class="card jua-sec"><h2>${UL(g.u)} · 다시 풀어 보기</h2><ol class="jua-q">${g.list.map((q, i) => qCard(g.u, q, i, true)).join('')}</ol></div>`).join('') : '') +
        mw.map(({ m, q }) => mkCard(m, q, true)).join('') +
        (!groups.length && !mw.length ? '<div class="empty">틀린 문제가 하나도 없어요! 🎯</div>' : '');
      bind(); mkBind(); return;
    }
    const st = stat(u, S.step), pct = st.n ? Math.round(st.ok / st.n * 100) : 0;
    let html = `<section class="banner jua-hero"><div><p class="jua-eyebrow">CHAPTER ${u.chapter} · ${UL(u)} · ${esc(SN(u, S.step))}</p><h1>${esc(u.title)}</h1>
      <div class="jua-prog"><span style="width:${pct}%"></span></div><p>${st.ok} / ${st.n} 맞힘 ${pct === 100 ? '· 이 단계 클리어! 🎯' : ''}</p></div><span class="jua-crown">${SM(u, S.step)}</span></section>`;
    html += S.step === 2 ? `<div class="jua-lesson">${u.lessons[2] || ''}</div>` : `<details class="jua-lesson jw-fold"><summary>UNIT ${u.no} 개념 다시 보기</summary>${u.lessons[2] || ''}</details>`;
    let sec = null, list = [];
    const flush = () => { if (sec !== null) html += `<div class="card jua-sec"><h2>${esc(sec)}</h2><ol class="jua-q">${list.join('')}</ol></div>`; list = []; };
    qs(u, S.step).forEach((q, i) => { if (q.section !== sec) { flush(); sec = q.section; } list.push(qCard(u, q, i)); });
    flush();
    const ui = UNITS.indexOf(u), nu = UNITS[ui + 1];
    const next = S.step < 4 ? `<button class="btn ok" data-next type="button">${SN(u, S.step + 1)} →</button>` : nu ? `<button class="btn ok" data-nextu type="button">${UL(nu)} ${SN(nu, 2)} →</button>` : '';
    main.innerHTML = html + `<div class="sc-foot"><span></span>${next}</div>`;
    const nb = main.querySelector('[data-next]'); if (nb) nb.onclick = () => { S.step++; save(true); goFx(nb, true); };
    const nu2 = main.querySelector('[data-nextu]'); if (nu2) nu2.onclick = () => { S.unit = nu.no; S.step = 2; save(true); goFx(nu2, true); };
    bind();
  }
  function qCard(u, q, i, retry) {
    const k = `${u.no}:${q.id}`, r = retry && !UI.retried[k] ? null : rec(u, q), v = r ? r.v : ''; // 틀린 문제 다시: 빈칸부터 새로
    const box = q.choices ? `<div class="jua-ops">${q.choices.map((c) => `<button type="button" class="chip jua-op ${r && norm(r.v) === norm(c) ? (r.ok ? 'right' : 'wrong') : ''}" data-op="${esc(c)}">${esc(c).replace(/&lt;(\/?)u&gt;/g, '<$1u>')}</button>`).join('')}</div>`
      : `<div class="jua-line"><input class="jua-in ${r ? (r.ok ? 'right' : 'wrong') : ''}" data-in value="${esc(v)}" autocomplete="off" spellcheck="false" placeholder="답을 써 보세요"><button class="btn sm2" data-check type="button">채점</button></div>`;
    const fb = !r ? '' : r.ok ? `<div class="jua-fb ok">✓ 정답! ${esc(q.why)}</div>` : `<div class="jua-fb no">앗, 다시 한번! <details><summary>정답·이유 보기</summary><b>${esc(q.answers[0])}</b> — ${esc(q.why)}</details></div>`;
    return `<li class="jua-li ${r && r.ok ? 'done' : ''}" data-k="${k}"><span class="jua-n">${i + 1}</span><div class="jua-body"><div class="jua-p">${q.prompt}</div>${box}${fb}</div></li>`;
  }
  function grade(k, val, el) {
    if (S.step === 'wrong') UI.retried[k] = 1; // 다시 푼 결과는 그 자리에서 보여 줌
    const [un, id] = k.split(':').map(Number), u = UNITS.find((x) => x.no === un), q = u.questions.find((x) => x.id === id);
    const ok = q.answers.some((a) => norm(a) === norm(val)), r = S.ans[k];
    S.ans[k] = { v: val, ok: ok ? 1 : 0, first: r ? r.first : ok, fixed: r && r.first === false && ok ? 1 : (r && r.fixed) || 0, at: Date.now() };
    S.log.push({ k: '지원 문법', u: un, t: `${UL(u)} ${SN(u, q.step)} ${q.tag || ''}`, ok: ok ? 1 : 0, at: Date.now() }); if (S.log.length > 2000) S.log = S.log.slice(-2000);
    save();
    const y = scrollY, before = stat(u, q.step);
    render(); scrollTo(0, y);
    react(ok, main.querySelector(`[data-k="${k}"]`) || el);
    const after = stat(u, q.step); if (ok && after.n && after.ok === after.n && before.ok < before.n) setTimeout(() => { cheer(`🎯 ${UL(u)} ${SN(u, q.step)} 클리어!`); hearts(main.querySelector('.jua-hero') || main, 40); }, 350);
  }
  function bind() {
    main.querySelectorAll('.jua-li').forEach((li) => {
      const k = li.dataset.k, inp = li.querySelector('[data-in]');
      if (inp) {
        const go = () => { if (inp.value.trim()) grade(k, inp.value, li); };
        inp.onkeydown = (e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); go(); } };
        li.querySelector('[data-check]').onclick = go;
      }
      li.querySelectorAll('[data-op]').forEach((b) => (b.onclick = () => grade(k, b.dataset.op, b)));
    });
  }

  // ── 로그아웃 (서버에 마저 올리고 이 기기에서 지움)
  $('#who-edit').addEventListener('click', async () => {
    const btn = $('#who-edit');
    if (!btn.dataset.sure) { btn.dataset.sure = 1; btn.textContent = '한 번 더 누르면 로그아웃'; setTimeout(() => { delete btn.dataset.sure; btn.textContent = '로그아웃'; }, 3000); return; }
    btn.textContent = '저장 중…'; await syncNow(false);
    if ($('#sync-state').dataset.state !== 'ok') { btn.textContent = '로그아웃'; delete btn.dataset.sure; return; }
    try { localStorage.removeItem(KEY); localStorage.removeItem('mallang-naesin:content'); } catch (e) {}
    location.replace(location.pathname);
  });

  // ── 서버 기록 (기기 여러 대에서 같이)
  function mark(state, txt) { const el = $('#sync-state'); if (el) { el.dataset.state = state; el.textContent = txt; } }
  async function rpc(fn, body) {
    const ac = new AbortController(); setTimeout(() => ac.abort(), 10000);
    const r = await fetch(`${SYNC.url}/rest/v1/rpc/${fn}`, { signal: ac.signal, method: 'POST', headers: { apikey: SYNC.key, Authorization: `Bearer ${SYNC.key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(r.status); const t = await r.text(); return t ? JSON.parse(t) : null;
  }
  function merge(sd) {
    if (!sd) return false; const before = JSON.stringify(S);
    for (const k in sd.ans || {}) if (!S.ans[k] || (sd.ans[k].at || 0) > (S.ans[k].at || 0)) S.ans[k] = sd.ans[k];
    // 선생님이 지운 기록(del: 키 → 지운 시각)은 어느 기기에서도 되살아나지 않게
    S.del = { ...(S.del || {}), ...(sd.del || {}) };
    for (const k in S.del) if (S.ans[k] && (S.ans[k].at || 0) <= S.del[k]) delete S.ans[k];
    clean();
    S.terms = S.terms || {}; for (const k in sd.terms || {}) if (!S.terms[k] || (sd.terms[k].at || 0) > (S.terms[k].at || 0)) S.terms[k] = sd.terms[k];
    S.seen = { ...(sd.seen || {}), ...(S.seen || {}) };
    S.mk = S.mk || {}; for (const k in sd.mk || {}) if (!S.mk[k] || (sd.mk[k].at || 0) > (S.mk[k].at || 0)) S.mk[k] = sd.mk[k];
    S.wd = S.wd || {}; for (const k in sd.wd || {}) if (!S.wd[k] || (sd.wd[k].at || 0) > (S.wd[k].at || 0)) S.wd[k] = sd.wd[k];
    const seen = new Set(S.log.map((e) => `${e.at}|${e.t}`)); S.log = [...S.log, ...(sd.log || []).filter((e) => !seen.has(`${e.at}|${e.t}`))].sort((a, b) => a.at - b.at);
    clean();
    return JSON.stringify(S) !== before;
  }
  let busy = false;
  async function syncNow(redraw) {
    if (!SYNC || !S.syncKey) return; if (busy) { schedule(); return; } busy = true; mark('busy', '☁︎ 맞추는 중…');
    try {
      const changed = merge(await rpc('naesin_get', { p_student: S.who, p_code: S.syncKey }));
      save(true);
      if (changed && redraw && !document.activeElement.matches('input')) { const y = scrollY; render(); scrollTo(0, y); }
      const o = { ...S }; ['unit', 'step', 'syncKey'].forEach((k) => delete o[k]);
      await rpc('naesin_put', { p_student: S.who, p_code: S.syncKey, p_data: o }); mark('ok', '☁︎ 저장됨');
    } catch (e) { mark('err', '☁︎ 연결 안 됨 (이 기기에는 저장됨)'); }
    busy = false;
  }
  function schedule() { if (!SYNC || !S.syncKey) return; clearTimeout(pushT); mark('busy', '☁︎ 저장 중…'); pushT = setTimeout(() => syncNow(false), 1200); }
  setInterval(() => syncNow(true), 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) syncNow(true); });

  render();
  syncNow(true);
})();
