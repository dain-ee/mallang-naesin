/* 말랑 내신 · 주아 영어 문법 — Grammar Stage Plus 과별 노트를 말랑 내신 틀에서 (러블리 핑크 테마)
   주아 코드(jua1113)로 들어오면 loader.js 가 app.js 대신 이 파일을 엽니다. 기록은 서버에 '주아' 이름으로 남아요. */
(() => {
  'use strict';
  const DATA = window.NAESIN, UNITS = DATA.units || [], SYNC = DATA.sync || null, KEY = 'mallang-naesin:v1';
  const HW = DATA.homework || null, TERMS = DATA.terms || { groups: {}, terms: [] };
  const $ = (s) => document.querySelector(s), main = $('#main');
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  // 원래 노트의 채점 기준 그대로 (줄임말·문장부호 차이는 같은 답)
  const norm = (s) => String(s).toLowerCase().replace(/[’‘]/g, "'").replace(/won't/g, 'will not').replace(/isn't/g, 'is not').replace(/aren't/g, 'are not').replace(/\bi'm\b/g, 'i am').replace(/'ll\b/g, ' will').replace(/didn't/g, 'did not').replace(/wasn't/g, 'was not').replace(/weren't/g, 'were not').replace(/[.?!]/g, '').replace(/\s+/g, ' ').trim();
  let S = {}; try { S = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
  S.ans = S.ans || {}; S.log = S.log || []; S.del = S.del || {}; S.wd = S.wd || {}; S.rd = S.rd || {};
  // 2026-10-10: 예전 노트에서 옮겨 온 기록은 쓰지 않기로 함(선생님 결정) — 오늘부터 새로
  function clean() { for (const k in S.ans) if (S.ans[k].from === '노트') delete S.ans[k]; S.log = S.log.filter((e) => !/노트 기록 옮김/.test(e.t || '') && !(S.del || {})['log:' + e.at]);
    for (const k in S.del || {}) if (k.startsWith('wd:') && S.wd && S.wd[k.slice(3)] && (S.wd[k.slice(3)].at || 0) <= S.del[k]) delete S.wd[k.slice(3)]; } // 선생님이 지운 단어 기록·기록장 줄도 되살아나지 않게
  for (const k in S.del) if (S.ans[k] && (S.ans[k].at || 0) <= S.del[k]) delete S.ans[k];
  clean();
  if (!UNITS.find((u) => u.no === S.unit)) S.unit = UNITS.length ? UNITS[UNITS.length - 1].no : 0;
  S.terms = S.terms || {}; S.seen = S.seen || {}; S.wd = S.wd || {};
  const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  if (HW && HW.days.some((d) => d.date >= todayKey())) S.step = 'hw'; // 숙제가 있으면 숙제부터
  if (![2, 3, 4, 'wrong', 'hw', 'terms', 'sum', 'words', 'read'].includes(S.step)) S.step = 2;
  let pushT = null;
  const save = (local) => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} if (!local) schedule(); };

  document.documentElement.dataset.kid = 'jua';
  window.__naesinStarted = true;
  { const bm = document.getElementById('boot-msg'); if (bm) bm.remove(); }
  setTimeout(() => { const s = $('#splash'); if (!s) return; s.style.transition = 'opacity .35s'; s.style.opacity = 0; setTimeout(() => s.remove(), 360); }, 600);
  document.title = '주아 영어 💗';

  // ── 사이드바: 과 → 단계
  $('.brand-name').textContent = '주아 영어';
  $('#lesson-sub').textContent = 'Grammar Stage Plus 2 · Benchmark Reading 5.3';
  const subj = $('#subj'); if (subj) subj.hidden = true;
  const brand = $('#brand'); brand.removeAttribute('aria-haspopup'); brand.style.cursor = 'pointer';
  brand.addEventListener('click', () => { UI.hwT = null; delete document.documentElement.dataset.navopen; S.step = HW ? 'hw' : 2; save(true); goFx(brand, true); }); // 로고 = 처음 화면(숙제 목록)
  const STEP_NAME = { 2: '배우기', 3: '실전 문제', 4: '책 덮고 확인' };
  const qs = (u, step) => u.questions.filter((q) => step === 'wrong' ? isWrong(u, q) : q.step === step);
  const rec = (u, q) => S.ans[`${u.no}:${q.id}`];
  const isWrong = (u, q) => { const r = rec(u, q); return r && r.first === false && !r.fixed; };
  const stat = (u, step) => { const list = qs(u, step); return { n: list.length, ok: list.filter((q) => (rec(u, q) || {}).ok).length }; };
  function side() {
    const left = HW ? (HW.days.find((d) => d.date === todayKey()) || { tasks: [] }).tasks.filter((t) => !taskOk(t)).length : 0;
    const wr = wrongAll(), nb = (st, icon, name, tally) => `<button class="nav-item ${S.step === st ? 'is-on' : ''}" data-st="${st}" type="button"><i class="ni">${icon}</i><span class="jua-nt">${name}</span>${tally ? `<span class="tally">${tally}</span>` : ''}</button>`;
    // 책 기준으로 묶음 (2026-10-17 선생님: 9과·10과가 아니라 책별로) — 📗 문법책 · 📘 리딩책
    const gram = `<div class="jua-book"><div class="jua-book-h">📗 Grammar Stage Plus 2</div><div class="jua-units">${UNITS.slice().reverse().map((u) => `<div class="jua-unit"><div class="jua-unit-h">Unit ${u.no} <span class="jua-unit-t">${esc((u.title.split(' · ')[1] || '').replace(/\s*\(.*$/, ''))}</span></div><div class="jua-steps">${[2, 3, 4].map((st) => { const s2 = stat(u, st); return `<button class="nav-item ${S.unit === u.no && S.step === st ? 'is-on' : ''}" data-u="${u.no}" data-st="${st}" type="button"><i class="ni">${s2.n && s2.ok === s2.n ? '♡' : st - 1}</i><span class="jua-nt">${STEP_NAME[st]}</span><span class="tally ${s2.n && s2.ok === s2.n ? 'full' : ''}">${s2.n && s2.ok === s2.n ? '♡ ' : ''}${s2.ok}/${s2.n}</span><span class="jua-sbar"><i style="width:${s2.n ? Math.round(s2.ok / s2.n * 100) : 0}%"></i></span></button>`; }).join('')}</div></div>`).join('')}</div>
      <div class="jua-quick jua-book-x">${nb('wrong', '✕', '틀린 문제<span class="jua-long"> 다시</span>', wr)}${nb('sum', '📄', '한 장 요약')}${nb('terms', '🚌', '셔틀 카드')}</div></div>`;
    const read = READS.length ? `<div class="jua-book"><div class="jua-book-h">📘 Benchmark Reading 5.3</div>${readNav()}</div>` : '';
    const etc = (DATA.words || {}).words ? `<div class="jua-book"><div class="jua-book-h">🔤 지난 단어 시험</div><div class="jua-quick jua-book-x">${nb('words', '🔤', 'Day 18·19 단어', wLeft() || '')}</div></div>` : '';
    $('#nav').innerHTML = `<div class="jua-quick">${HW ? nb('hw', '✎', '숙제', left) : ''}</div>` + read + gram + etc;
    $('#who-name').textContent = S.who || '주아';
    $('#who-edit').textContent = '로그아웃';
  }
  const wrongAll = () => UNITS.reduce((n, u) => n + qs(u, 'wrong').length, 0);
  $('#nav').addEventListener('click', (e) => { const b = e.target.closest('[data-st]'); if (!b) return; UI.hwT = null; delete document.documentElement.dataset.navopen; if (b.dataset.u) S.unit = +b.dataset.u; S.step = ['wrong', 'hw', 'terms', 'sum', 'words', 'read'].includes(b.dataset.st) ? b.dataset.st : +b.dataset.st; if (b.dataset.rm) { UI.rmode = b.dataset.rm; RQ.q = null; } save(true); goFx(b); });
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
      const nb = document.querySelector(`#nav [data-st="${S.step}"]${S.step > 1 && S.step < 5 ? `[data-u="${S.unit}"]` : S.step === 'read' ? `[data-rm="${UI.rmode}"]` : ''}`); if (nb) { nb.classList.add('jua-tap'); }
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
      const p = document.createElement('span'); p.className = 'jua-heart'; p.textContent = ['💗', '💖', '✨', '🎀', '⭐'][i % 5];
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
    if (ok) { combo++; hearts(el, combo >= 5 ? 26 : 14); if ([3, 5, 10, 15, 20].includes(combo)) cheer(`👑 ${combo}연속 정답! 공주님 최고`); }
    else combo = 0;
  }

  // ── 숙제
  function check(c) {
    if (c.type === 'step') { const u = UNITS.find((x) => x.no === c.unit), list = u ? qs(u, c.step).filter((q) => !c.secs || c.secs.includes(q.section.split(' ')[0])) : [], done = list.filter((q) => rec(u, q)).length, ok = list.filter((q) => (rec(u, q) || {}).ok).length; return { ok: list.length > 0 && done >= list.length, txt: `${done}/${list.length}문제 풂 · ${ok}개 맞힘` }; }
    if (c.type === 'wrong') { const n = wrongAll(); return { ok: n === 0, txt: n ? `틀린 문제 ${n}개 남음` : '틀린 문제 0개' }; }
    if (c.type === 'termsRead') return { ok: !!S.seen.terms, txt: S.seen.terms ? '다 훑어봤어요' : '아직' };
    if (c.type === 'termsQuiz') { const n = TERMS.terms.filter((t) => (S.terms[t.id] || {}).ok).length; return { ok: n >= TERMS.terms.length, txt: `${n}/${TERMS.terms.length}개 맞힘` }; }
    if (c.type === 'words') { const L = c.reading ? RD.words : WL0, n = L.filter((w) => wGot(c.mode, w.id)).length; return { ok: L.length > 0 && n >= L.length, txt: `${n}/${L.length}개 외움` }; }
    if (c.type === 'wordsSeen') { const L = c.reading ? RD.words : WL0, n = L.filter((w) => S.seen[wSeenKey(w.id, c.day)]).length; return { ok: L.length > 0 && n >= L.length, txt: `${n}/${L.length}개 봤어요` }; }
    if (c.type === 'rpick' || c.type === 'rwrite') { const L = rSents(c.page), n = L.filter((x) => rOk(c.type === 'rpick' ? 'pick' : 'wr', x.id)).length; return { ok: L.length > 0 && n >= L.length, txt: `${n}/${L.length}문장` }; }
    if (c.type === 'rread') { const ok = (c.pages || [16, 17, 18]).every((pg) => S.rd[`r${RD.unit}:read:${pg}`]); return { ok, txt: ok ? '다 읽었어요' : '아직' }; }
    if (c.type === 'rquiz') { const L = RD.questions.filter((x) => !c.secs || c.secs.some((p) => x.id.startsWith(p))), n = L.filter((x) => (S.rd[`r${RD.unit}:q:${x.id}`] || {}).ok).length; return { ok: L.length > 0 && n >= L.length, txt: `${n}/${L.length}문제 맞힘` }; }
    if (c.type === 'seen') return { ok: !!S.seen[c.key], txt: S.seen[c.key] ? '봤어요' : '아직' };
    return { ok: false, txt: '' };
  }
  const dayOf = (t) => HW.days.find((d) => d.tasks.includes(t));
  const taskOk = (t) => t.checks.every((c) => check(c).ok) && (!t.checks.some((c) => c.type === 'wrong') || ((o) => o.length > 0 && o.every((x) => x.checks.every((c) => check(c).ok)))(dayOf(t).tasks.filter((x) => x !== t)));
  function hwView() {
    const t = todayKey(), BK = HW.books || {};
    if (!HW.days.some((d) => d.id === UI.hwOpen)) UI.hwOpen = (HW.days.find((d) => d.date === t) || HW.days.find((d) => d.date > t) || HW.days[HW.days.length - 1] || {}).id;
    main.innerHTML = `<section class="banner jua-hero"><div><p class="jua-eyebrow">🎀 ${esc(HW.dueLabel)}까지</p><h1>${esc(HW.title)}</h1><p>하루치씩 차근차근! 다 하면 왕관이 반짝여요 👑</p></div><span class="jua-crown">👑</span></section><div class="jua-hw-list">` +
      HW.days.map((d) => { const okN = d.tasks.filter(taskOk).length, all = okN === d.tasks.length, open = d.id === UI.hwOpen, books = [...new Set(d.tasks.map((x) => x.book).filter(Boolean))];
        const groups = []; d.tasks.forEach((tk, i) => { let g = groups[groups.length - 1]; if (!g || g.b !== tk.book) groups.push((g = { b: tk.book, items: [] })); g.items.push([tk, i]); });
        return `<section class="card hw-day ${open ? 'open' : ''} ${all ? 'done' : ''} ${d.date === t ? 'today' : ''}" data-day="${d.id}"><button class="hw-day-h hw-tog" data-tog="${d.id}" type="button"><div><b>${esc(d.label)}</b> ${d.date === t ? '<span class="badge ok">오늘</span>' : ''}${!all && d.date < t ? '<span class="badge err">밀린 숙제</span>' : ''}<div class="hw-goal">${esc(d.goal)}</div><div class="hw-subs">${books.map((b) => `<span class="hw-sub jb-${b}">${esc(BK[b] || b)}</span>`).join('')}<span class="hw-cnt">${d.tasks.length}개</span></div></div><div class="hw-ring" style="--p:${Math.round(okN / d.tasks.length * 100)}"><span>${okN}/${d.tasks.length}</span></div></button>
          <div class="hw-acc"><div class="hw-acc-in"><div class="hw-tasks">${groups.map((g) => `${g.b ? `<div class="hw-grp"><span class="hw-sub jb-${g.b}">${esc(BK[g.b] || g.b)}</span></div>` : ''}${g.items.map(([tk, i]) => { const ok = taskOk(tk); return `<button class="hw-task ${ok ? 'ok' : ''}" data-day="${d.id}" data-i="${i}" type="button"><span class="hw-box">${ok ? '♡' : i + 1}</span><span class="hw-body"><span class="hw-t">${esc(tk.t)}</span><span class="hw-d">${esc(tk.d)}</span><span class="hw-s">${esc(tk.checks.map((c) => check(c).txt).join(' · '))}</span></span><span class="hw-go">${ok ? '다시 보기' : '하러 가기 ›'}</span></button>`; }).join('')}`).join('')}</div>
          ${all ? '<div class="hw-done"><b>👑 오늘 숙제 끝! 최고야 💖</b></div>' : ''}</div></div></section>`; }).join('') + '</div>';
    main.querySelectorAll('.hw-task').forEach((b) => (b.onclick = () => hwOpen(HW.days.find((x) => x.id === b.dataset.day).tasks[+b.dataset.i])));
    // 언제나 하루만 펼침 — 다른 날을 누르면 스르륵 바뀜 (윤건 숙제와 같은 방식)
    main.querySelectorAll('[data-tog]').forEach((b) => (b.onclick = () => { const card = b.closest('.hw-day'); if (card.classList.contains('open')) return; UI.hwOpen = b.dataset.tog;
      main.querySelectorAll('.hw-day.open').forEach((c) => c.classList.remove('open')); card.classList.add('open');
      setTimeout(() => { const r = card.getBoundingClientRect(); if (r.top < 0 || r.top > innerHeight * 0.6) card.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 380); }));
  }
  function hwOpen(tk) {
    { const g = tk.go || {}; UI.hwT = tk; delete document.documentElement.dataset.navopen; if (g.unit) S.unit = g.unit; S.step = g.step; if (g.tmode) UI.tmode = g.tmode; if (g.wmode) { UI.wmode = g.wmode; UI.wjump = 1; } UI.hall = 0; if (g.rmode) { UI.rmode = g.rmode; UI.rpage = g.rpage || 'all'; RQ.q = null; } save(true); goFx(document.activeElement && document.activeElement.closest('button') || main, true); }
  }
  // 숙제하는 동안: 큰 메뉴 대신 그날 숙제를 밑줄 탭으로 (폰에서는 메뉴를 접어 둠)
  function hwBar() {
    const on = HW && UI.hwT && S.step !== 'hw'; // 숙제 목록 화면은 평소대로, 숙제 하나에 들어갔을 때만
    if (on) document.documentElement.dataset.hwmode = 1; else { delete document.documentElement.dataset.hwmode; delete document.documentElement.dataset.navopen; }
    if (!on) return;
    const d = UI.hwT ? dayOf(UI.hwT) : HW.days.find((x) => x.date === todayKey()) || HW.days.find((x) => x.date > todayKey());
    const tabs = (d ? d.tasks : []).map((t) => `<button type="button" data-hwt="${d.tasks.indexOf(t)}" class="${UI.hwT === t ? 'on' : ''} ${taskOk(t) ? 'ok' : ''}"><i>${taskOk(t) ? '♡' : d.tasks.indexOf(t) + 1}</i>${esc(t.t.replace(/^[^\w가-힣]+/u, ''))}</button>`).join('');
    const okN = d ? d.tasks.filter(taskOk).length : 0; // 숙제 목록으로는 로고를 눌러 돌아감
    main.insertAdjacentHTML('afterbegin', `${d ? `<div class="hwbar-h"><h1>${esc(d.label.length === 1 ? d.label + '요일' : d.label)} 숙제</h1><span>${esc(d.dateLabel || '')} · ${okN}/${d.tasks.length} 끝</span></div>` : ''}<nav class="hwbar"><div class="hwbar-tabs">${tabs}</div></nav>`);
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
    main.innerHTML = `<section class="banner jua-hero"><div><p class="jua-eyebrow">📄 시험 직전 한 장</p><h1>Grammar Stage Plus 2 · Unit ${UNITS.map((u) => u.no).join('·')} 한 장 요약</h1><p>표만 쓱 보고 가요</p></div><span class="jua-crown">👑</span></section>` +
      UNITS.map((u) => `<div class="jua-lesson">${u.lessons[2] || ''}</div>`).join('') +
      `<div class="sc-foot"><span></span><button class="btn ok" data-sumok type="button">${S.seen.sum ? '봤어요 ♡' : '다 봤어요 ✓'}</button></div>`;
    main.querySelector('[data-sumok]').onclick = (e) => { S.seen.sum = Date.now(); save(); hearts(e.target, 18); cheer('💖 한 장 요약 완료!'); };
  }

  // ── 단어 시험 게임: 틀린 단어는 몇 장 뒤에 또 나오고, 한 번 틀린 단어는 두 번 연달아 맞혀야 외운 걸로
  let WORDS = DATA.words || { words: [] }, WL = WORDS.words; const WMODE = { read: '쭉 보기', ko: '뜻 쓰기', en: '영어 쓰기' };
  let WGROUP = { 18: 'Day 18', 19: 'Day 19', 20: 'part ~ come close' };
  const WORDS0 = WORDS, WL0 = WL, WGROUP0 = WGROUP; // 리딩 단어를 볼 때만 잠깐 리딩 단어장으로 바꿔 끼움
  const wrec = (m, id) => S.wd[`${m}:${id}`];
  const wGot = (m, id) => { const r = wrec(m, id); return !!r && r.s >= (r.w ? 2 : 1); };
  const wDone = (m) => WL.filter((w) => wGot(m, w.id)).length;
  const wSeenKey = (id, day = todayKey()) => `words:${day}:${id}`, wSeenN = (day = todayKey()) => WL.filter((w) => S.seen[wSeenKey(w.id, day)]).length;
  const wLeft = () => WL0.filter((w) => !wGot('ko', w.id) || !wGot('en', w.id)).length; // 뜻·영어 둘 다 외워야 끝
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
          return `<div class="jw-row ${UI.whide ? 'hide-' + UI.whide : ''}"><button type="button" class="jw-seen ${sn ? 'on' : ''}" data-wseen="${w.id}">${sn ? '♡ 봤어요' : '봤어요'}</button><b class="jw-en">${esc(w.en)}${miss ? `<i class="jw-miss">🔁${miss}</i>` : ''}</b><span class="jw-ko">${esc(w.ko)}${w.def ? `<small class="jw-def">${esc(w.def)}</small>` : ''}</span><em class="jw-ex"><span class="jw-exen">${exHtml(w)}</span><span class="jw-exgap">${exHtml(w, true)}</span><br><span class="jw-exko">${esc(w.exKo)}</span>${w.extra ? `<br><span class="jw-x">${esc(w.extra)}</span>` : ''}</em></div>`; }).join('')}</div></div>`; }).join('') +
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

  // ── 리딩 (Benchmark Reading 5.3) — 해석이 제일 중요 (2026-10-17 선생님): 단어 → 끊어 읽기 → 해석 고르기 → 해석 쓰기 → 교과서 문제
  const READS = DATA.reading || [], RD = READS[READS.length - 1] || { unit: 0, sentences: [], words: [], questions: [] };
  const RMODE = { words: ['🔤', '단어'], chunk: ['✂️', '끊어 읽기'], pick: ['🎯', '해석 고르기'], write: ['✍️', '해석 쓰기'], quiz: ['📝', '교과서 문제'] };
  UI.rmode = UI.rmode in RMODE ? UI.rmode : 'chunk'; UI.rpage = UI.rpage || 'all';
  const RQ = { q: null };
  const rk = (kind, id) => `r${RD.unit}:${kind}:${id}`;
  const rOk = (kind, id) => (S.rd[rk(kind, id)] || {}).ok;
  const rSents = (pg) => RD.sentences.filter((x) => !pg || pg === 'all' || x.page === +pg);
  const rPages = () => [...new Set(RD.sentences.map((x) => x.page))];
  function rStat(m) {
    if (m === 'words') { const n = RD.words.filter((w) => wGot('ko', w.id) && wGot('en', w.id)).length; return [n, RD.words.length]; }
    if (m === 'chunk') return [rPages().filter((pg) => S.rd[rk('read', pg)]).length, rPages().length];
    if (m === 'pick' || m === 'write') return [RD.sentences.filter((x) => rOk(m === 'pick' ? 'pick' : 'wr', x.id)).length, RD.sentences.length];
    return [RD.questions.filter((x) => rOk('q', x.id)).length, RD.questions.length];
  }
  function readNav() {
    if (!READS.length) return '';
    return `<div class="jua-units jua-read-nav"><div class="jua-unit"><div class="jua-unit-h">Unit ${RD.unit} <span class="jua-unit-t">${esc(RD.title)}</span></div><div class="jua-steps">${Object.entries(RMODE).map(([m, [ic, nm]]) => { const [a, b] = rStat(m), full = b && a === b;
      return `<button class="nav-item ${S.step === 'read' && UI.rmode === m ? 'is-on' : ''}" data-st="read" data-rm="${m}" type="button"><i class="ni">${full ? '♡' : ic}</i><span class="jua-nt">${nm}</span><span class="tally ${full ? 'full' : ''}">${full ? '♡ ' : ''}${a}/${b}</span><span class="jua-sbar"><i style="width:${b ? Math.round(a / b * 100) : 0}%"></i></span></button>`; }).join('')}</div></div></div>`;
  }
  // 고르기 선택지는 문장마다 순서를 고정 (다시 열어도 같은 자리)
  const seeded = (arr, seed) => { let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0; const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { h = (h * 1103515245 + 12345) >>> 0; const j = h % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const chunkHtml = (x, hideKo) => `<div class="rd-chunks ${hideKo ? 'hide-ko' : ''}">${x.chunks.map(([en, ko], i) => `<span class="rd-ch" data-ch><b>${esc(en)}</b><small>${esc(ko)}</small></span>${i < x.chunks.length - 1 ? '<i class="rd-sl">/</i>' : ''}`).join('')}</div>`;
  function readView() {
    const m = UI.rmode, pg = UI.rpage;
    let html = `<section class="banner jua-hero rd-hero"><div><p class="jua-eyebrow">📖 ${esc(RD.book)} · Unit ${RD.unit} · ${esc(RD.subject || '')} · ${esc(RD.pages || '')}</p><h1>${esc(RD.title)}</h1><p><b>Big Idea</b> ${esc(RD.big)}<br><span class="rd-bigko">${esc(RD.bigKo)}</span></p></div><span class="jua-crown">👑</span></section>`;
    html += `<div class="bar-row"><div class="seg">${Object.entries(RMODE).map(([k, [ic, nm]]) => `<button type="button" data-rmode="${k}" class="${m === k ? 'on' : ''}">${ic} ${nm}</button>`).join('')}</div></div>`;
    if (m !== 'quiz') html += `<div class="bar-row rd-pages"><span class="hint">쪽</span>${['all', ...rPages()].map((p) => `<button class="chip ${String(pg) === String(p) ? 'on' : ''}" data-rpg="${p}" type="button">${p === 'all' ? '전체' : p + '쪽'}</button>`).join('')}</div>`;
    if (m === 'chunk') html += readChunk(); else if (m === 'pick' || m === 'write') html += readCard(m); else html += readQuiz();
    main.innerHTML = html;
    main.querySelectorAll('[data-rmode]').forEach((b) => (b.onclick = () => { UI.rmode = b.dataset.rmode; RQ.q = null; save(true); render(); }));
    main.querySelectorAll('[data-rpg]').forEach((b) => (b.onclick = () => { UI.rpage = b.dataset.rpg; RQ.q = null; render(); }));
    if (m === 'chunk') bindChunk(); else if (m === 'pick' || m === 'write') bindCard(m); else bindRQuiz();
  }
  // ✂️ 끊어 읽기: 영어 덩어리 밑에 우리말 — 가리고 떠올려 본 뒤 눌러서 확인
  function readChunk() {
    const hide = UI.rhide !== false, pages = UI.rpage === 'all' ? rPages() : [+UI.rpage];
    let h = `<div class="bar-row jw-tools"><button class="chip ${hide ? 'on' : ''}" data-rhide type="button">${hide ? '🙈 우리말 가림 · 덩어리를 누르면 보여요' : '👀 우리말 보이는 중'}</button><span class="hint">빗금(/)마다 끊어서 앞에서부터 차례로 이해해요</span></div>`;
    pages.forEach((p) => {
      const L = rSents(p); let para = null;
      h += `<div class="card jua-sec rd-page"><h2>${p}쪽${p === RD.sentences[0].page ? ` · Focus: ${esc(RD.focus)}` : ''}</h2>`;
      L.forEach((x) => { if (x.para !== para) { if (para !== null) h += '</div>'; para = x.para; h += '<div class="rd-para">'; }
        h += `<div class="rd-sent" data-sid="${x.id}">${chunkHtml(x, hide)}<button class="link rd-full" data-full type="button">전체 해석 보기</button><div class="rd-ko" hidden>${esc(x.ko)}${x.tip ? `<div class="rd-tip">💡 ${esc(x.tip)}</div>` : ''}</div></div>`; });
      if (para !== null) h += '</div>';
      const done = S.rd[rk('read', p)];
      h += `<div class="sc-foot"><span></span><button class="btn ok" data-rread="${p}" type="button">${done ? `${p}쪽 다 읽었어요 ♡` : `${p}쪽 끊어 읽기 끝 ✓`}</button></div></div>`;
    });
    return h;
  }
  function bindChunk() {
    main.querySelector('[data-rhide]').onclick = () => { UI.rhide = !(UI.rhide !== false); render(); };
    main.querySelectorAll('.hide-ko [data-ch]').forEach((c) => (c.onclick = () => c.classList.toggle('show')));
    main.querySelectorAll('[data-full]').forEach((b) => (b.onclick = () => { const k = b.nextElementSibling; k.hidden = !k.hidden; b.textContent = k.hidden ? '전체 해석 보기' : '해석 접기'; }));
    main.querySelectorAll('[data-rread]').forEach((b) => (b.onclick = () => { const p = b.dataset.rread; if (!S.rd[rk('read', p)]) { S.rd[rk('read', p)] = { ok: 1, at: Date.now() }; S.log.push({ k: '주아 리딩', t: `Unit ${RD.unit} ${p}쪽 끊어 읽기`, ok: 1, at: Date.now() }); save(); }
      react(true, b); hearts(b, 24); cheer(`📖 ${p}쪽 끊어 읽기 완료!`); setTimeout(() => { const y = scrollY; render(); scrollTo(0, y); }, 400); }));
  }
  // 🎯 해석 고르기 · ✍️ 해석 쓰기: 한 문장씩 카드. 틀리거나 「다시」면 조금 뒤에 또 나옴
  function rQueue(m) { const kind = m === 'pick' ? 'pick' : 'wr'; RQ.q = rSents(UI.rpage).filter((x) => !rOk(kind, x.id)).map((x) => x.id); RQ.m = m; RQ.phase = 'ask'; RQ.pg = UI.rpage; }
  function readCard(m) {
    if (!RQ.q || RQ.m !== m || RQ.pg !== UI.rpage) rQueue(m);
    const kind = m === 'pick' ? 'pick' : 'wr', L = rSents(UI.rpage), n = L.filter((x) => rOk(kind, x.id)).length;
    let h = `<div class="card jua-sec jw-game rd-game"><div class="jw-top"><h2>${m === 'pick' ? '알맞은 해석 고르기' : '내가 직접 해석하기'}</h2><span class="hint">${n}/${L.length}문장 · 남은 카드 ${RQ.q.length}</span></div><div class="jua-prog"><span style="width:${L.length ? Math.round(n / L.length * 100) : 0}%"></span></div>`;
    const cur = RD.sentences.find((x) => x.id === (RQ.phase === 'ask' ? RQ.q[0] : RQ.last));
    if (!cur) return h + (n === L.length ? `<div class="empty">👑 ${L.length}문장 다 했어요! 해석 공주님 💖</div><div class="sc-foot"><span></span><button class="link" data-ragain type="button">처음부터 한 번 더 (기록은 그대로)</button></div>` : `<div class="sc-foot"><span></span><button class="btn ok" data-rnext type="button">남은 문장 다시 →</button></div>`) + '</div>';
    const r = S.rd[rk(kind, cur.id)];
    h += `<div class="jw-card rd-card">${r && r.first === 0 ? '<span class="badge warn">🔁 틀렸던 문장</span>' : ''}<div class="rd-where">${cur.page}쪽</div><div class="rd-en">${esc(cur.en)}</div>`;
    if (m === 'pick') {
      const ops = seeded([cur.ko, ...cur.wrong], cur.id);
      if (RQ.phase === 'ask') h += `<div class="rd-ops">${ops.map((o, i) => `<button class="rd-op" data-rop="${i}" type="button"><i>${'①②③'[i]}</i>${esc(o)}</button>`).join('')}</div><div class="jw-sub"><button class="link" data-rhint type="button">✂️ 끊어서 보기</button></div><div class="rd-hintbox" hidden>${chunkHtml(cur, false)}</div>`;
      else h += `<div class="rd-ops">${ops.map((o, i) => `<div class="rd-op ${o === cur.ko ? 'right' : i === RQ.pick ? 'wrong' : 'dim'}"><i>${'①②③'[i]}</i>${esc(o)}</div>`).join('')}</div>${RQ.ok ? '' : `<div class="jua-fb no">정답은 ${'①②③'[ops.indexOf(cur.ko)]}번! 덩어리로 다시 봐요</div>`}${chunkHtml(cur, false)}${cur.tip ? `<div class="rd-tip">💡 ${esc(cur.tip)}</div>` : ''}<div class="sc-foot"><span>${RQ.ok ? '' : '<span class="hint">이 문장은 조금 뒤에 또 나와요</span>'}</span><button class="btn ok" data-rnext type="button">다음 →</button></div>`;
    } else {
      if (RQ.phase === 'ask') h += `<textarea class="jua-in rd-ta" data-rta rows="3" placeholder="우리말로 해석해 써 보세요 (Enter = 확인)">${esc((r && r.v) || '')}</textarea><div class="jw-sub"><button class="link" data-rhint type="button">✂️ 끊어 읽기 힌트</button><button class="btn sm2" data-rshow type="button">해석 확인</button></div><div class="rd-hintbox" hidden>${chunkHtml(cur, true)}</div>`;
      else h += `<div class="rd-mine"><span class="hint">내 해석</span><br>${esc(RQ.v || '(안 씀)')}</div><div class="rd-model"><span class="hint">모범 해석</span><br><b>${esc(cur.ko)}</b></div>${chunkHtml(cur, false)}${cur.tip ? `<div class="rd-tip">💡 ${esc(cur.tip)}</div>` : ''}
        <div class="rd-self"><button class="btn ok" data-rself="1" type="button">💖 뜻이 맞았어요</button><button class="btn" data-rself="0" type="button">🔁 다시 볼래요</button></div>`;
    }
    return h + '</div></div>';
  }
  function rRecord(kind, cur, ok, v) {
    const k = rk(kind, cur.id), r = S.rd[k];
    S.rd[k] = { ok: ok ? 1 : 0, first: r ? r.first : ok ? 1 : 0, at: Date.now(), ...(v != null ? { v } : {}) };
    S.log.push({ k: '주아 리딩', t: `Unit ${RD.unit} ${kind === 'pick' ? '해석 고르기' : '해석 쓰기'} ${cur.id}`, ok: ok ? 1 : 0, at: Date.now() }); if (S.log.length > 2000) S.log = S.log.slice(-2000);
    save(); RQ.q.shift(); RQ.last = cur.id; if (!ok) RQ.q.splice(Math.min(RQ.q.length, 3), 0, cur.id); // 틀린 문장은 3장 뒤에 또
  }
  function bindCard(m) {
    const cur = RD.sentences.find((x) => x.id === (RQ.phase === 'ask' ? (RQ.q || [])[0] : RQ.last));
    const hb = main.querySelector('[data-rhint]'); if (hb) hb.onclick = () => { const box = main.querySelector('.rd-hintbox'); box.hidden = !box.hidden; box.querySelectorAll('.hide-ko [data-ch]').forEach((c) => (c.onclick = () => c.classList.toggle('show'))); };
    main.querySelectorAll('[data-rop]').forEach((b) => (b.onclick = () => {
      const ops = seeded([cur.ko, ...cur.wrong], cur.id), i = +b.dataset.rop, ok = ops[i] === cur.ko;
      rRecord('pick', cur, ok); RQ.phase = 'show'; RQ.pick = i; RQ.ok = ok; react(ok, b);
      const done = rSents(UI.rpage).every((x) => rOk('pick', x.id));
      setTimeout(() => { render(); if (ok && done) { cheer('👑 해석 고르기 다 맞혔어요!'); hearts(main.querySelector('.jua-hero') || main, 40); } }, 380);
    }));
    const ta = main.querySelector('[data-rta]');
    if (ta) { setTimeout(() => ta.focus({ preventScroll: true }), 30);
      const show = () => { RQ.v = ta.value.trim(); RQ.phase = 'show'; RQ.last = cur.id; render(); };
      ta.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); show(); } };
      main.querySelector('[data-rshow]').onclick = show; }
    main.querySelectorAll('[data-rself]').forEach((b) => (b.onclick = () => { const ok = b.dataset.rself === '1'; rRecord('wr', cur, ok, RQ.v || ''); RQ.phase = 'ask'; RQ.v = ''; react(ok, b);
      const done = rSents(UI.rpage).every((x) => rOk('wr', x.id)); setTimeout(() => { render(); if (ok && done) { cheer('👑 해석 쓰기 끝!'); hearts(main.querySelector('.jua-hero') || main, 40); } }, 380); }));
    const nx = main.querySelector('[data-rnext]'); if (nx) nx.onclick = () => { if (!RQ.q.length) rQueue(m); RQ.phase = 'ask'; render(); };
    const ag = main.querySelector('[data-ragain]'); if (ag) ag.onclick = () => { RQ.q = shuffle(rSents(UI.rpage).map((x) => x.id)); RQ.phase = 'ask'; RQ.m = m; RQ.pg = UI.rpage; render(); };
  }
  // 📝 교과서 문제 (19~21쪽 + 본문 Check)
  function readQuiz() {
    let h = '', sec = null, list = [], i = 0;
    const flush = () => { if (sec !== null) h += `<div class="card jua-sec"><h2>${esc(sec)}</h2>${sec.includes('보기') ? `<div class="rd-bank">${[...new Set(RD.questions.filter((x) => x.sec === sec).flatMap((x) => x.choices || []))].map((w) => `<span>${esc(w)}</span>`).join('')}</div>` : ''}<ol class="jua-q">${list.join('')}</ol></div>`; list = []; };
    RD.questions.forEach((q) => { if (q.sec !== sec) { flush(); sec = q.sec; i = 0; }
      const k = rk('q', q.id), r = S.rd[k], v = r ? r.v : '';
      const box = q.choices && !q.sec.includes('보기') ? `<div class="jua-ops ${q.choices.length > 2 ? 'rd-col' : ''}">${q.choices.map((c, j) => `<button type="button" class="chip jua-op ${r && norm(r.v) === norm(c) ? (r.ok ? 'right' : 'wrong') : ''}" data-rq="${q.id}" data-v="${esc(c)}">${q.choices.length > 2 ? `<i>${'ⓐⓑⓒⓓ'[j]}</i> ` : ''}${esc(c)}</button>`).join('')}</div>`
        : `<div class="jua-line"><input class="jua-in ${r ? (r.ok ? 'right' : 'wrong') : ''}" data-rqin="${q.id}" value="${esc(v)}" autocomplete="off" spellcheck="false" placeholder="${q.kind === 'blank' ? '빈칸에 들어갈 말' : '영어로 답 쓰기'}"><button class="btn sm2" data-rqgo="${q.id}" type="button">채점</button></div>`;
      const fb = !r ? '' : r.ok ? `<div class="jua-fb ok">💖 정답! ${esc(q.why)}${q.model ? `<br><span class="hint">모범 답: ${esc(q.model)}</span>` : ''}</div>` : `<div class="jua-fb no">앗, 다시 한번! <details><summary>정답·이유 보기</summary><b>${esc(q.model || q.answers[0])}</b> — ${esc(q.why)}</details></div>`;
      list.push(`<li class="jua-li ${r && r.ok ? 'done' : ''}" data-rk="${q.id}"><span class="jua-n">${++i}</span><div class="jua-body"><div class="jua-p">${esc(q.prompt)}</div>${box}${fb}</div></li>`); });
    flush();
    return h;
  }
  function rGrade(id, val, el) {
    const q = RD.questions.find((x) => x.id === id), nv = norm(val);
    const ok = q.kind === 'keys' ? q.answers.some((a) => nv.includes(norm(a))) : q.answers.some((a) => norm(a) === nv);
    const k = rk('q', id), r = S.rd[k];
    S.rd[k] = { v: val, ok: ok ? 1 : 0, first: r ? r.first : ok ? 1 : 0, at: Date.now() };
    S.log.push({ k: '주아 리딩', t: `Unit ${RD.unit} 문제 ${id}`, ok: ok ? 1 : 0, at: Date.now() }); save();
    const y = scrollY; render(); scrollTo(0, y); react(ok, main.querySelector(`[data-rk="${id}"]`) || el);
    if (ok && RD.questions.every((x) => rOk('q', x.id))) setTimeout(() => { cheer('👑 교과서 문제 다 맞혔어요!'); hearts(main.querySelector('.jua-hero') || main, 40); }, 350);
  }
  function bindRQuiz() {
    main.querySelectorAll('[data-rq]').forEach((b) => (b.onclick = () => rGrade(b.dataset.rq, b.dataset.v, b)));
    main.querySelectorAll('[data-rqin]').forEach((inp) => { const go = () => { if (inp.value.trim()) rGrade(inp.dataset.rqin, inp.value, inp); };
      inp.onkeydown = (e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); go(); } }; main.querySelector(`[data-rqgo="${inp.dataset.rqin}"]`).onclick = go; });
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
    if (S.step === 'terms') { termsView(); return; }
    if (S.step === 'sum') { sumView(); return; }
    if (S.step === 'read' && UI.rmode === 'words') { WORDS = { when: `${RD.book} · Unit ${RD.unit} ${RD.title}`, test: '교과서 Key Words + More Words + 본문 해석에 꼭 필요한 말' }; WL = RD.words; WGROUP = RD.groups; } else { WORDS = WORDS0; WL = WL0; WGROUP = WGROUP0; }
    if (S.step === 'words' || (S.step === 'read' && UI.rmode === 'words')) { wordsView(); return; }
    if (S.step === 'read') { readView(); return; }
    const u = UNITS.find((x) => x.no === S.unit);
    if (!u) { main.innerHTML = '<div class="empty">아직 문법 노트가 없어요.</div>'; return; }
    if (S.step === 'wrong') {
      const groups = UNITS.map((x) => ({ u: x, list: qs(x, 'wrong') })).filter((g) => g.list.length);
      main.innerHTML = `<section class="banner jua-hero"><div><p class="jua-eyebrow">🎀 틀린 문제 다시</p><h1>한 번 더 하면 내 거!</h1><p>처음에 틀렸던 문제예요. 다시 맞히면 여기서 빠져요.</p></div><span class="jua-crown">👑</span></section>` +
        (groups.length ? groups.map((g) => `<div class="card jua-sec"><h2>Unit ${g.u.no} · 다시 풀어 보기</h2><ol class="jua-q">${g.list.map((q, i) => qCard(g.u, q, i, true)).join('')}</ol></div>`).join('') : '<div class="empty">틀린 문제가 하나도 없어요! 💖</div>');
      bind(); return;
    }
    // 숙제로 들어왔으면 그날 할 부분(A·B 등)만 보여 줌 — 화면 문제 수 = 숙제 문제 수
    const hg = UI.hwT && UI.hwT.go || {}, hs = !UI.hall && hg.secs && hg.unit === u.no && hg.step === S.step ? hg.secs : null;
    const qlist = qs(u, S.step).filter((q) => !hs || hs.includes(q.section.split(' ')[0]));
    const st = hs ? { n: qlist.length, ok: qlist.filter((q) => (rec(u, q) || {}).ok).length } : stat(u, S.step), pct = st.n ? Math.round(st.ok / st.n * 100) : 0;
    let html = `<section class="banner jua-hero"><div><p class="jua-eyebrow">📗 Grammar Stage Plus 2 · Unit ${u.no} · ${esc((u.steps[S.step] || STEP_NAME[S.step]).replace(/\d+과 /, ''))}</p><h1>${esc(u.title)}</h1>
      <div class="jua-prog"><span style="width:${pct}%"></span></div><p>${st.ok} / ${st.n} 맞힘 ${pct === 100 ? '· 이 단계 클리어! 👑' : ''}</p></div><span class="jua-crown">👑</span></section>`;
    if (hs) html += `<div class="hw-banner">📌 오늘 숙제는 ${esc(hs.join('·'))}만 · ${qlist.length}문제 <button class="link" data-hall type="button">전체 보기</button></div>`;
    html += `<div class="jua-lesson">${u.lessons[S.step] || ''}</div>`; // 노트에 있던 설명 그대로 (주아 노트 원본)
    let sec = null, list = [];
    const flush = () => { if (sec !== null) html += `<div class="card jua-sec"><h2>${esc(sec)}</h2><ol class="jua-q">${list.join('')}</ol></div>`; list = []; };
    qlist.forEach((q, i) => { if (q.section !== sec) { flush(); sec = q.section; } list.push(qCard(u, q, i)); });
    flush();
    const next = S.step < 4 && !hs ? `<button class="btn ok" data-next type="button">${STEP_NAME[S.step + 1]} →</button>` : '';
    main.innerHTML = html + `<div class="sc-foot"><span></span>${next}</div>`;
    const ha = main.querySelector('[data-hall]'); if (ha) ha.onclick = () => { UI.hall = 1; render(); };
    const nb = main.querySelector('[data-next]'); if (nb) nb.onclick = () => { S.step++; save(true); render(); scrollTo(0, 0); };
    bind();
  }
  function qCard(u, q, i, retry) {
    const k = `${u.no}:${q.id}`, r = retry && !UI.retried[k] ? null : rec(u, q), v = r ? r.v : ''; // 틀린 문제 다시: 빈칸부터 새로
    const box = q.choices ? `<div class="jua-ops">${q.choices.map((c) => `<button type="button" class="chip jua-op ${r && norm(r.v) === norm(c) ? (r.ok ? 'right' : 'wrong') : ''}" data-op="${esc(c)}">${esc(c)}</button>`).join('')}</div>`
      : `<div class="jua-line"><input class="jua-in ${r ? (r.ok ? 'right' : 'wrong') : ''}" data-in value="${esc(v)}" autocomplete="off" spellcheck="false" placeholder="답을 써 보세요"><button class="btn sm2" data-check type="button">채점</button></div>`;
    const fb = !r ? '' : r.ok ? `<div class="jua-fb ok">💖 정답! ${esc(q.why)}</div>` : `<div class="jua-fb no">앗, 다시 한번! <details><summary>정답·이유 보기</summary><b>${esc(q.answers[0])}</b> — ${esc(q.why)}</details></div>`;
    return `<li class="jua-li ${r && r.ok ? 'done' : ''}" data-k="${k}"><span class="jua-n">${i + 1}</span><div class="jua-body"><div class="jua-p">${q.prompt}</div>${box}${fb}</div></li>`;
  }
  function grade(k, val, el) {
    if (S.step === 'wrong') UI.retried[k] = 1; // 다시 푼 결과는 그 자리에서 보여 줌
    const [un, id] = k.split(':').map(Number), u = UNITS.find((x) => x.no === un), q = u.questions.find((x) => x.id === id);
    const ok = q.answers.some((a) => norm(a) === norm(val)), r = S.ans[k];
    S.ans[k] = { v: val, ok: ok ? 1 : 0, first: r ? r.first : ok, fixed: r && r.first === false && ok ? 1 : (r && r.fixed) || 0, at: Date.now() };
    S.log.push({ k: '주아 문법', u: un, t: `${un}과 ${q.tag || ''}`, ok: ok ? 1 : 0, at: Date.now() }); if (S.log.length > 2000) S.log = S.log.slice(-2000);
    save();
    const y = scrollY, before = stat(u, q.step);
    render(); scrollTo(0, y);
    react(ok, main.querySelector(`[data-k="${k}"]`) || el);
    const after = stat(u, q.step); if (ok && after.n && after.ok === after.n && before.ok < before.n) setTimeout(() => { cheer(`👑 ${STEP_NAME[q.step]} 클리어!`); hearts(main.querySelector('.jua-hero') || main, 40); }, 350);
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
    S.rd = S.rd || {}; for (const k in sd.rd || {}) if (!S.rd[k] || (sd.rd[k].at || 0) > (S.rd[k].at || 0)) S.rd[k] = sd.rd[k];
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
