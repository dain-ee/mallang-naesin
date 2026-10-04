/* 말랑 내신 — 중2 동아(윤정미) 5~8과 내신 대비.
   서버 없이 index.html 만 열면 돕니다. 기록은 이 브라우저의 localStorage 에 남습니다.
   데이터는 data/data.js 의 window.NAESIN 입니다. */

(() => {
  'use strict';

  const DATA = window.NAESIN || { lessons: [] };
  { const bm = document.getElementById('boot-msg'); if (bm) bm.remove(); } // 웹 버전의 '불러오는 중' 안내
  const LESSONS = DATA.lessons;
  const EXAMS = DATA.exams || [];
  const HW = DATA.homework || null; // 선생님이 낸 요일별 숙제 // 기출비 등에서 받은 실제 시험지 (문항마다 lesson 표시)
  // 문제 키 → 문제. 'ex:시험지:번호' 는 기출 시험지, '과:번호' 는 직접 만든 문제.
  function qByKey(k) {
    const p = k.split(':');
    if (p[0] === 'ex') { const e = EXAMS.find((x) => x.id === p[1]) || EXAMS[+p[1]], q = e && e.questions[+p[2]]; return q ? { q, key: k, no: q.lesson, src: e.title } : null; }
    const L = LESSONS.find((l) => l.no === +p[0]); return L && L.questions[+p[1]] ? { q: L.questions[+p[1]], key: k, no: L.no } : null;
  }
  const KEY = 'mallang-naesin:v1';

  // ───────── 기록 ─────────
  const S = Object.assign(
    { who: '윤건', lesson: LESSONS[0] ? LESSONS[0].no : 5, tab: 'home', mem: {}, known: {}, qa: {}, wrong: {} },
    read()
  );
  function read() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
  let saveFailed = false;
  function save(local) { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { if (!saveFailed) { saveFailed = true; setTimeout(storageWarn, 0); } } if (!local && typeof schedulePush === 'function') schedulePush(); }
  // 기록을 못 남기는 브라우저(카톡 안 브라우저·시크릿 창 등)면 맨 위에 알려 줍니다.
  function storageWarn(force) {
    if (document.getElementById('store-warn')) return;
    const kakao = /KAKAOTALK/i.test(navigator.userAgent);
    if (!force && !saveFailed && !kakao) return;
    const d = document.createElement('div'); d.id = 'store-warn'; d.className = 'store-warn';
    d.textContent = kakao ? '⚠️ 카톡 안에서 열면 기록이 사라질 수 있어요. 오른쪽 위 ⋮ → 「다른 브라우저로 열기」(사파리·크롬)로 열어 주세요.'
      : '⚠️ 이 브라우저는 기록을 저장하지 못해요. 사파리나 크롬에서 열어 주세요 (시크릿 창 X).';
    document.body.prepend(d);
  }
  try { localStorage.setItem(KEY + ':t', '1'); if (localStorage.getItem(KEY + ':t') !== '1') throw 0; localStorage.removeItem(KEY + ':t'); } catch { saveFailed = true; }
  setTimeout(() => storageWarn(saveFailed), 0);

  // 화면마다 잠깐 쓰는 상태 — 저장하지 않습니다.
  const UI = { redo: {}, words: 'ws', comm: 'ws', grammar: 'ws', read: 'note', rpart: 0, coreOnly: true, drill: 'read', onlyKey: false, onlyTodo: false,
               card: 0, cardFlip: false, cardDir: 'en', test: null, quiz: null, quizCat: '전체', quizScope: EXAMS.length ? 'exam' : 'one', examSet: EXAMS.length ? EXAMS[0].id : 'all', revealed: {} };

  const $ = (s, r = document) => r.querySelector(s);
  const main = $('#main');
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // 지문에는 밑줄·굵게만 허용합니다.
  const rich = (s) => esc(s).replace(/&lt;(\/?)(u|b)&gt;/g, '<$1$2>');
  const lesson = () => LESSONS.find((l) => l.no === S.lesson) || LESSONS[0];
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 1600);
  }

  // ───────── 기록 · 반응 ─────────
  // 푼 것은 S.log 에 하나씩 쌓습니다(날짜·과·갈래·맞힘). 기록 탭이 이걸 그대로 보여 줍니다.
  function logEv(kind, ok, total, label) {
    S.log = S.log || [];
    S.log.push({ at: Date.now(), l: S.lesson, k: kind, ok, n: total, t: String(label || '').slice(0, 80) });
    if (S.log.length > 5000) S.log = S.log.slice(-5000);
    save();
  }
  let combo = 0, pendingFx = null;
  // 맞히면 팡 · 틀리면 흔들림 · 연속 정답이면 응원
  function react(ok, el) {
    if (ok) {
      combo++;
      if (el) { pop(el); burst(el, combo >= 5 ? 26 : 14); }
      if ([3, 5, 10, 15, 20, 30].includes(combo)) cheer(`🔥 ${combo}연속 정답!`);
    } else {
      combo = 0;
      if (el) shake(el);
    }
  }
  const replay = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 600); };
  const pop = (el) => replay(el, 'fx-pop');
  const shake = (el) => replay(el, 'fx-shake');
  function burst(el, n = 14) {
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const colors = ['#4f7cff', '#8aa8ff', '#ffb547', '#2ecc8f', '#ff6f91', '#a78bfa'];
    for (let i = 0; i < n; i++) {
      const d = document.createElement('i'); d.className = 'cf';
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.5, dist = 50 + Math.random() * 70;
      d.style.cssText = `left:${cx}px;top:${cy}px;background:${colors[i % colors.length]};--dx:${Math.cos(a) * dist}px;--dy:${Math.sin(a) * dist - 30}px;--rot:${Math.random() * 540}deg`;
      document.body.appendChild(d); setTimeout(() => d.remove(), 900);
    }
  }
  function cheer(msg) {
    const c = document.createElement('div'); c.className = 'cheer'; c.textContent = msg;
    document.body.appendChild(c); setTimeout(() => c.remove(), 1500);
  }
  // 다시 그린 뒤에 반응을 붙일 때 — render() 끝에서 처리합니다.
  const fxAfter = (ok, sel) => { pendingFx = { ok, sel }; };

  // 시드 섞기 — 같은 문장은 늘 같은 순서로 섞여야 다시 볼 때 덜 헷갈립니다.
  function seeded(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296; }
  function shuffle(arr, seed) { const a = arr.slice(); const r = seed ? seeded(seed) : Math.random; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  const norm = (s) => String(s).toLowerCase().replace(/[’‘`]/g, "'").replace(/[“”]/g, '"').replace(/[^a-z0-9'가-힣 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  // 빈칸 채점 — 정답이 여럿일 수 있는 자리를 받아 줍니다.
  //  · "that/which" 처럼 / 로 적힌 정답은 아무거나
  //  · 관계대명사 that·which·who·whom 은 서로 바꿔 써도 정답 (사람/사물 구분은 문장이 알려 주므로
  //    which↔who 처럼 명백히 틀린 짝만 막습니다)
  const REL = { that: ['that', 'which', 'who', 'whom'], which: ['which', 'that'], who: ['who', 'that', 'whom'], whom: ['whom', 'who', 'that'] };
  function accepts(input, ans) {
    const v = norm(input);
    if (!v) return false;
    return variants(ans).flatMap((x) => x.split('/')).some((a) => { const n = norm(a); return n === v || (REL[n] || []).includes(v); });
  }
  // 문장 통째 비교 — 관계대명사 that/which/who/whom 차이는 같은 답으로 봅니다.
  const relNorm = (x) => norm(x).replace(/\b(which|who|whom)\b/g, 'that');
  // 정답 표기 풀기 — "which[that]" → which / that, "who(m)" → who / whom, "(that)" → 있어도 없어도
  function variants(str) {
    let out = [String(str)];
    for (let guard = 0; guard < 6; guard++) {
      const next = [];
      let changed = false;
      for (const v of out) {
        let m;
        if ((m = v.match(/([A-Za-z'’]+)\[([^\]]+)\]/))) { changed = true; for (const alt of [m[1], ...m[2].split(/[\/,]/)]) next.push(v.replace(m[0], alt.trim())); }
        else if ((m = v.match(/([A-Za-z]+)\(([a-z]{1,3})\)/))) { changed = true; next.push(v.replace(m[0], m[1]), v.replace(m[0], m[1] + m[2])); }
        else if ((m = v.match(/\(([A-Za-z'’ ]+)\)/))) { changed = true; next.push(v.replace(m[0], m[1]), v.replace(m[0], '')); }
        else next.push(v);
      }
      out = [...new Set(next)].slice(0, 32);
      if (!changed) break;
    }
    return out;
  }
  const sameSentence = (a, b) => variants(a).some((v) => norm(v) === norm(b) || relNorm(v) === relNorm(b));
  const STOP = new Set('the a an and or but to of in on at for with by from is are was were be been am it its this that these those he she they we you i me my your his her their our them us there here what which who how why when where do does did can will would could should may might not no so as if than then just very also have has had about into over up out some any all one'.split(' '));

  // ───────── 이 단원의 암기 덩어리 ─────────
  function itemsFor(L, kind) {
    const out = [];
    if (kind === 'reading') {
      // 소제목(7과처럼 문단 머리에 붙은 것)은 외울 문장이 아니라 묶음 이름으로 씁니다.
      L.reading.paras.forEach((p, pi) => { let g = `문단 ${pi + 1}`; p.forEach((s, si) => {
        if (s.note === '소제목') { g = `문단 ${pi + 1} · ${s.en}`; return; }
        out.push({ id: `${L.no}:r:${pi}.${si}`, en: s.en, ko: s.ko, key: s.key, note: s.note, group: g }); }); });
    } else if (kind === 'fn') {
      L.comm.functions.forEach((f, fi) => [...f.items, ...(f.more || [])].forEach((x, i) =>
        out.push({ id: `${L.no}:f:${fi}.${i}`, en: x.en, ko: x.ko, key: i < f.items.length, group: f.name })));
    } else if (kind === 'dlg') {
      L.comm.dialogs.forEach((d) => d.lines.forEach((x, i) =>
        out.push({ id: `${L.no}:d:${d.id}.${i}`, en: x.en, ko: x.ko, sp: x.sp, group: d.title })));
    } else if (kind === 'gram') {
      L.grammar.forEach((g, gi) => [g.textbook, ...g.examples].filter(Boolean).forEach((x, i) =>
        out.push({ id: `${L.no}:g:${gi}.${i}`, en: x.en, ko: x.ko, key: i === 0, group: g.title })));
    }
    return out;
  }
  const hasComm = (L) => L.comm && (L.comm.functions.length || L.comm.dialogs.length);
  const memCount = (items) => items.filter((x) => S.mem[x.id]).length;
  // 5·6과처럼 영어과외TV 공식 단어 목록표가 있으면 그 목록(교과서 단어)을 씁니다. 예문·품사는 만든 자료에서 붙입니다.
  function wordsOf(L) {
    const mine = [...L.words.map((w) => ({ ...w, kind: 'w' })), ...(L.phrases || []).map((w) => ({ ...w, pos: '숙어', kind: 'p' }))];
    if (!(L.ws && L.ws.source && ['englishtutortv', 'rule', 'official'].includes(L.ws.source.words))) return mine;
    const by = Object.fromEntries(mine.map((w) => [norm(w.en), w]));
    return L.ws.vocab.list.filter((w) => w.core).map((w) => { const m = by[norm(w.en)] || {}; return { en: w.en, ko: w.ko, pos: m.pos || (w.en.includes(' ') ? '숙어' : ''), ex: m.ex, exKo: m.exKo, kind: 'w' }; });
  }
  const wid = (L, w) => `${L.no}:w:${w.en}`;

  function quizStats(L) {
    let done = 0, ok = 0;
    L.questions.forEach((_, i) => { const r = S.qa[`${L.no}:${i}`]; if (r) { done++; if (r.ok) ok++; } });
    return { done, ok, total: L.questions.length };
  }

  // ───────── 사이드바 ─────────
  function syncSide() {
    document.documentElement.dataset.lesson = S.lesson;
    const L = lesson();
    $('#lesson-sub').textContent = L ? `${L.no}과 · ${L.title}` : '자료 없음';
    document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('is-on', b.dataset.tab === S.tab));
    const w = Object.keys(S.wrong).length; const t = $('#wrong-tally'); t.hidden = !w; t.textContent = w;
    $('#who-name').textContent = S.who;
    if (HW) { $('#nav-hw').hidden = false; const left = hwToday() ? hwToday().tasks.filter((t) => !hwTaskOk(t)).length : 0; const ht = $('#hw-tally'); ht.hidden = !left; ht.textContent = left; }
  }
  $('#nav').addEventListener('click', (e) => { const b = e.target.closest('.nav-item'); if (b) go(b.dataset.tab); });
  const brand = $('#brand'), menu = $('#lesson-menu');
  brand.addEventListener('click', () => {
    const open = menu.hidden; menu.hidden = !open; brand.setAttribute('aria-expanded', open);
    if (open) menu.innerHTML = LESSONS.map((l) => `<button class="menu-item ${l.no === S.lesson ? 'on' : ''}" data-l="${l.no}" type="button"><span class="dot" style="--dot:var(--accent)"></span><span class="t">${l.no}과 ${esc(l.title)}</span></button>`).join('');
  });
  menu.addEventListener('click', (e) => { const b = e.target.closest('[data-l]'); if (b) { menu.hidden = true; brand.setAttribute('aria-expanded', false); setLesson(+b.dataset.l); } });
  document.addEventListener('click', (e) => { if (!menu.hidden && !e.target.closest('.switch')) { menu.hidden = true; brand.setAttribute('aria-expanded', false); } });
  $('#who-edit').addEventListener('click', () => {
    const span = $('#who-name'); const inp = document.createElement('input');
    inp.value = S.who; inp.style.cssText = 'padding:4px 8px;font-size:13px;width:110px';
    span.replaceWith(inp); inp.focus();
    const done = () => { S.who = inp.value.trim() || S.who; save(); inp.replaceWith(span); syncSide(); };
    inp.addEventListener('keydown', (e) => e.key === 'Enter' && done()); inp.addEventListener('blur', done);
  });

  function setLesson(no) { if (no !== S.lesson) loading(no); S.lesson = no; UI.rpart = 0; UI.card = 0; UI.cardFlip = false; UI.test = null; UI.quiz = null; save(); render(); }
  function go(tab) { if (tab !== 'quiz') UI.quizOnly = null; S.tab = tab; UI.test = null; save(); render(); window.scrollTo(0, 0); }

  // 단원을 바꾸면 유령이 잠깐 날아와 '5과 불러오는 중' — 바뀐 걸 확실히 느끼게.
  function loading(no) {
    const L = LESSONS.find((l) => l.no === no);
    const o = document.createElement('div'); o.className = 'loader';
    o.innerHTML = `<div class="loader-card"><span class="loader-ghost"></span><b>Lesson ${no}</b><span>${esc(L ? L.title : '')}</span><i class="loader-bar"><i></i></i></div>`;
    document.body.appendChild(o);
    setTimeout(() => o.classList.add('out'), 650); setTimeout(() => o.remove(), 950);
  }
  // ───────── 그리기 ─────────
  let lastView = '';
  function render() {
    syncSide();
    const L = lesson();
    if (!L) { main.innerHTML = `<div class="empty">자료가 아직 없습니다.</div>`; return; }
    ({ hw: hwView, home, words, comm, grammar, reading, quiz, wrong, log: logView })[S.tab]?.(L);
    const view = `${S.lesson}:${S.tab}`;
    if (view !== lastView) { lastView = view; main.classList.remove('enter'); void main.offsetWidth; main.classList.add('enter'); }
    if (pendingFx) { const f = pendingFx; pendingFx = null; const el = f.sel && main.querySelector(f.sel); react(f.ok, el); }
  }

  function head(title, sub, right = '') {
    return `<div class="page-head"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div>${right ? `<div class="right">${right}</div>` : ''}</div>`;
  }
  function seg(name, opts, cur) {
    return `<div class="seg" data-seg="${name}">${opts.map(([v, t]) => `<button type="button" data-v="${v}" class="${v === cur ? 'on' : ''}">${t}</button>`).join('')}</div>`;
  }
  main.addEventListener('click', (e) => {
    const b = e.target.closest('.seg button'); if (!b) return;
    const name = b.closest('.seg').dataset.seg; UI[name] = b.dataset.v;
    if (name === 'words') { UI.test = null; UI.card = 0; UI.cardFlip = false; }
    if (name === 'quizCat' || name === 'quizScope' || name === 'examSet') UI.quiz = null;
    if (name === 'rpart') UI.rpart = +UI.rpart;
    render();
  });

  // ───────── 단원 홈 ─────────
  function home(L) {
    const ws = wordsOf(L), wk = ws.filter((w) => S.known[wid(L, w)]).length;
    const cm = [...itemsFor(L, 'fn'), ...itemsFor(L, 'dlg')], gm = itemsFor(L, 'gram'), rd = itemsFor(L, 'reading');
    const q = quizStats(L);
    const step = (tab, no, t, d, a, b, unit = '') => `
      <button class="route" data-go="${tab}" type="button">
        <span class="route-no ${b && a >= b ? 'done' : ''}">${b && a >= b ? '✓' : no}</span>
        <span class="route-body"><span class="route-t">${t}</span><span class="route-d">${d}</span></span>
        <span class="route-prog"><span class="bar"><span style="width:${pct(a, b)}%"></span></span><span class="route-m">${a} / ${b}${unit}</span></span>
        <span class="route-go" aria-hidden="true">›</span>
      </button>`;
    main.innerHTML = `
      <nav class="lesson-tabs" aria-label="단원">${LESSONS.map((l) => `<button class="ltab ${l.no === L.no ? 'on' : ''}" data-l="${l.no}" type="button"><b>${l.no}과</b><span>${esc(l.title)}</span></button>`).join('')}</nav>
      <section class="banner"><div><h1>Lesson ${L.no}. ${esc(L.title)}</h1><p>본문 「${esc(L.readingTitle)}」</p></div><span class="banner-ghost"></span></section>
      <h2 class="route-h">학습 순서</h2>
      <div class="routes">
        ${step('words', 1, '단어', '학습지 · 카드 · 뜻 고르기 · 스펠링', wk, ws.length, ' 외움')}
        ${hasComm(L) ? step('comm', 2, '의사소통', `${L.comm.functions.map((f) => f.name).join(' · ')} · 대화문 ${L.comm.dialogs.length}개`, memCount(cm), cm.length, ' 문장') : ''}
        ${step('grammar', hasComm(L) ? 3 : 2, '문법', L.grammar.map((g) => g.title.replace(/\s*\(.*\)$/, '')).join(' · '), memCount(gm), gm.length, ' 예문')}
        ${step('reading', hasComm(L) ? 4 : 3, '본문', `「${esc(L.readingTitle)}」 필기 · 학습지 · 본문시험`, memCount(rd), rd.length, ' 문장')}
        ${step('quiz', hasComm(L) ? 5 : 4, '실전 문제', '학교 시험처럼 객관식 + 서술형', q.ok, q.total, ' 맞힘')}
      </div>`;
    main.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => go(b.dataset.go)));
    main.querySelectorAll('[data-l]').forEach((b) => (b.onclick = () => setLesson(+b.dataset.l)));
  }

  // ───────── 단어 ─────────
  function words(L) {
    const ws = wordsOf(L);
    const kn = ws.filter((w) => S.known[wid(L, w)]).length;
    let body = '';
    if (UI.words === 'ws' && !L.ws) UI.words = 'list';
    if (UI.words === 'ws') body = wsVocab(L);
    else if (UI.words === 'list') {
      body = `<table class="wtable">${ws.map((w) => `<tr class="${S.known[wid(L, w)] ? 'known' : ''}"><td class="w">${esc(w.en)}</td><td>${w.pos ? `<span class="badge">${esc(w.pos)}</span> ` : ''}${esc(w.ko)}${w.ex ? `<div class="e">${esc(w.ex)}${w.exKo ? ` — ${esc(w.exKo)}` : ''}</div>` : ''}</td></tr>`).join('')}</table>`;
    } else if (UI.words === 'card') {
      const pool = UI.onlyTodo ? ws.filter((w) => !S.known[wid(L, w)]) : ws;
      if (!pool.length) body = `<div class="empty">다 외웠어요! 🎉 「안 외운 것만」을 끄면 처음부터 다시 볼 수 있어요.</div>`;
      else {
        const i = Math.min(UI.card, pool.length - 1), w = pool[i];
        const front = UI.cardDir === 'en' ? `<div class="big">${esc(w.en)}</div>` : `<div class="mean">${esc(w.ko)}</div>`;
        const ex = w.ex ? `<div class="ex">${esc(w.ex).replace(new RegExp(`\\b(${w.en.split(' ')[0].replace(/[^a-z-]/gi, '')}\\w*)`, 'i'), '<b>$1</b>')}${w.exKo ? `<br>${esc(w.exKo)}` : ''}</div>` : '';
        const back = UI.cardDir === 'en' ? `<div class="mean">${esc(w.ko)}</div>${ex}` : `<div class="big">${esc(w.en)}</div>${ex}`;
        body = `<div class="flashbox">
          <div class="fcard" id="fcard">${w.pos ? `<span class="badge">${esc(w.pos)}</span>` : ''}${front}${UI.cardFlip ? back : '<div class="tap">눌러서 뒤집기 (스페이스)</div>'}</div>
          <div class="fnav">
            <button class="btn" data-c="prev" type="button">← 이전</button>
            <button class="btn no" data-c="no" type="button">몰라요</button>
            <button class="btn ok" data-c="ok" type="button">외웠어요</button>
            <button class="btn" data-c="next" type="button">다음 →</button>
          </div>
          <p class="meta" style="text-align:center">${i + 1} / ${pool.length}</p></div>`;
      }
    } else {
      body = wordTest(L, ws);
    }
    main.innerHTML = head(`단어 · ${L.no}과`, `${kn} / ${ws.length} 외움 (숙어 포함)`, '') +
      `<div class="bar-row">${seg('words', [...(L.ws ? [['ws', '학습지']] : []), ['list', '전체 목록'], ['card', '카드 외우기'], ['mean', '뜻 고르기'], ['spell', '스펠링 쓰기']], UI.words)}
       ${UI.words === 'card' ? `<span class="grow"></span>${seg('cardDir', [['en', '영어 → 뜻'], ['ko', '뜻 → 영어']], UI.cardDir)}<label class="hint"><input type="checkbox" id="only-todo" ${UI.onlyTodo ? 'checked' : ''} style="width:auto"> 안 외운 것만</label>` : ''}</div>` + body;

    if (UI.words === 'ws') bindWs(L);
    if (UI.words === 'card') {
      const pool = UI.onlyTodo ? ws.filter((w) => !S.known[wid(L, w)]) : ws;
      const card = $('#fcard'); if (card) card.onclick = () => { UI.cardFlip = !UI.cardFlip; render(); };
      const ot = $('#only-todo'); if (ot) ot.onchange = () => { UI.onlyTodo = ot.checked; UI.card = 0; render(); };
      main.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => {
        const i = Math.min(UI.card, pool.length - 1), w = pool[i], c = b.dataset.c;
        if (c === 'ok') { S.known[wid(L, w)] = true; logEv('단어 카드', 1, 1, w.en); fxAfter(true, '.fcard'); }
        if (c === 'no') delete S.known[wid(L, w)];
        save();
        if (c === 'prev') UI.card = Math.max(0, i - 1);
        else if (c === 'ok' && UI.onlyTodo) UI.card = i; // 빠지므로 같은 자리
        else UI.card = (i + 1) % pool.length;
        UI.cardFlip = false; render();
      }));
    } else if (UI.words !== 'list') bindWordTest(L, ws);
  }

  function wordTest(L, ws) {
    if (!UI.test || UI.test.mode !== UI.words || UI.test.lesson !== L.no) {
      UI.test = { mode: UI.words, lesson: L.no, order: shuffle(ws.map((_, i) => i)), i: 0, ok: 0, no: 0, answered: null, misses: [] };
    }
    const T = UI.test;
    if (T.i >= T.order.length) {
      return `<div class="card done-card"><span class="big">${T.ok} / ${T.order.length}</span><span class="sub">${T.misses.length ? '틀린 단어: ' + T.misses.map(esc).join(', ') : '전부 맞혔어요!'}</span><div class="actions"><button class="btn primary" id="t-again" type="button">다시 보기</button></div></div>`;
    }
    const w = ws[T.order[T.i]];
    const runHead = `<div class="run-head"><span class="run-count">${T.i + 1} / ${T.order.length}</span><span class="run-bar"><span style="width:${pct(T.i, T.order.length)}%"></span></span><span class="run-score"><span class="ok">○ ${T.ok}</span><span class="no">✕ ${T.no}</span></span></div>`;
    if (UI.words === 'mean') {
      if (!T.choices || T.choicesFor !== T.i) {
        const others = shuffle(ws.filter((x) => x.ko !== w.ko)).slice(0, 4);
        T.choices = shuffle([w, ...others]); T.choicesFor = T.i;
      }
      return `<div class="qwrap">${runHead}<div class="card q-card"><div class="q-ask"><div class="en">${esc(w.en)}</div></div>
        <div class="choices">${T.choices.map((c, k) => {
          let cls = ''; if (T.answered != null) { if (c === w) cls = 'right'; else if (k === T.answered) cls = 'wrong'; }
          return `<button class="choice ${cls}" data-k="${k}" type="button" ${T.answered != null ? 'disabled' : ''}><span class="n">${k + 1}</span>${esc(c.ko)}</button>`;
        }).join('')}</div>
        ${T.answered != null ? `<div class="actions"><button class="btn primary" id="t-next" type="button">다음 →</button></div>` : ''}</div></div>`;
    }
    const first = w.en[0];
    return `<div class="qwrap">${runHead}<div class="card q-card"><div class="q-ask"><div class="ko">${esc(w.ko)}</div></div>
      <div class="spell"><div class="spell-shape">첫 글자 <b>${esc(first)}</b> · ${w.en.length}글자${w.en.includes(' ') ? ' (띄어쓰기 포함)' : ''}</div>
      <div class="spell-row"><input id="t-in" autocomplete="off" spellcheck="false" ${T.answered != null ? 'disabled' : ''} value="${esc(T.typed || '')}"><button class="btn primary" id="t-check" type="button" ${T.answered != null ? 'hidden' : ''}>확인</button></div>
      ${T.answered != null ? `<div class="verdict ${T.answered ? 'ok' : 'no'}">${T.answered ? '정답!' : `정답은 <b>${esc(w.en)}</b>`}</div><div class="actions"><button class="btn primary" id="t-next" type="button">다음 →</button></div>` : ''}</div></div></div>`;
  }
  function bindWordTest(L, ws) {
    const T = UI.test; if (!T) return;
    const w = ws[T.order[T.i]];
    const again = $('#t-again'); if (again) again.onclick = () => { UI.test = null; render(); };
    const mark = (ok) => { if (ok) { T.ok++; } else { T.no++; T.misses.push(w.en); delete S.known[wid(L, w)]; } logEv(UI.words === 'mean' ? '뜻 고르기' : '스펠링', ok ? 1 : 0, 1, w.en); fxAfter(ok, ok ? (UI.words === 'mean' ? '.choice.right' : '.verdict') : (UI.words === 'mean' ? '.choice.wrong' : '#t-in')); save(); };
    main.querySelectorAll('.choice').forEach((b) => (b.onclick = () => { const k = +b.dataset.k; T.answered = k; mark(T.choices[k] === w); render(); }));
    const inp = $('#t-in');
    const check = () => { T.typed = inp.value; const ok = norm(inp.value) === norm(w.en); T.answered = ok; mark(ok); render(); };
    if (inp && T.answered == null) { inp.focus(); inp.onkeydown = (e) => e.key === 'Enter' && check(); $('#t-check').onclick = check; }
    const nx = $('#t-next'); if (nx) { nx.onclick = () => { T.i++; T.answered = null; T.typed = ''; render(); }; nx.focus(); }
  }

  // ───────── 공통 암기기 ─────────
  // 읽기 · 영어 가리기 · 해석 가리기 · 빈칸 · 배열 · 영작 — 의사소통·문법·본문이 함께 씁니다.
  const DRILLS = [['read', '읽기'], ['hideEn', '영어 가리기'], ['hideKo', '해석 가리기'], ['cloze', '빈칸 채우기'], ['order', '배열 영작'], ['write', '통영작']];

  function blanksOf(en) {
    const toks = en.split(/\s+/);
    const cands = toks.map((t, i) => ({ i, core: t.replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, '') }))
      .filter((x) => x.core.length >= 3 && !STOP.has(x.core.toLowerCase()));
    const n = Math.max(1, Math.min(4, Math.round(cands.length * 0.35)));
    const pick = new Set(cands.slice().sort((a, b) => b.core.length - a.core.length || a.i - b.i).slice(0, n).map((x) => x.i));
    return toks.map((t, i) => {
      if (!pick.has(i)) return { t };
      const m = t.match(/^([^A-Za-z0-9']*)(.*?)([^A-Za-z0-9']*)$/);
      return { pre: m[1], ans: m[2], post: m[3] };
    });
  }
  function lcsDiff(mine, ans) {
    const a = mine, b = ans, n = a.length, m = b.length, dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const out = []; let i = 0, j = 0;
    while (i < n && j < m) { if (a[i] === b[j]) { out.push(['ok', b[j]]); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) out.push(['extra', a[i++]]); else out.push(['miss', b[j++]]); }
    while (i < n) out.push(['extra', a[i++]]); while (j < m) out.push(['miss', b[j++]]);
    return out;
  }

  function drill(items, scopeKey) {
    const mode = UI.drill;
    let list = items;
    if (UI.onlyKey) list = list.filter((x) => x.key);
    if (UI.onlyTodo) list = list.filter((x) => !S.mem[x.id]);
    const done = memCount(items);
    let html = `<div class="bar-row">${seg('drill', DRILLS, mode)}<span class="grow"></span>
      <label class="hint"><input type="checkbox" data-flt="onlyKey" ${UI.onlyKey ? 'checked' : ''} style="width:auto"> ★ 중요만</label>
      <label class="hint"><input type="checkbox" data-flt="onlyTodo" ${UI.onlyTodo ? 'checked' : ''} style="width:auto"> 안 외운 것만</label>
      <span class="badge ok">${done} / ${items.length} 외움</span></div>
      <p class="hint" style="margin:-6px 2px 14px">${{
        read: '영어와 해석을 같이 읽어요. 다 외운 문장은 「외웠어요」를 눌러 두세요.',
        hideEn: '해석만 보고 영어 문장을 소리 내어 말해 본 뒤, 가린 곳을 눌러 확인해요.',
        hideKo: '영어만 보고 뜻을 떠올린 뒤 눌러서 확인해요.',
        cloze: '빈칸에 들어갈 단어를 쓰고 Enter. 철자까지 맞아야 초록색이 돼요.',
        order: '낱말을 눌러 순서대로 놓아요. 잘못 놓은 낱말은 다시 누르면 돌아가요.',
        write: '해석을 보고 영어 문장을 통째로 써요. 틀린 곳은 빨간 물결로 보여 줘요.',
      }[mode]}</p>`;
    if (!list.length) return html + `<div class="empty">보여 줄 문장이 없어요. 위의 거르기를 꺼 보세요.</div>`;
    html += `<div class="list">`;
    let g = null, n = 0;
    for (const x of list) {
      if (x.group !== g) { g = x.group; html += `<div class="sub-t">${esc(g)}</div>`; }
      n++;
      const memBtn = `<button class="mk ${S.mem[x.id] ? 'on' : ''}" data-mem="${x.id}" type="button">${S.mem[x.id] ? '✓ 외웠어요' : '외웠어요'}</button>`;
      const sp = x.sp ? `<span class="sp">${esc(x.sp)}</span>` : '';
      const star = x.key ? '<span class="star">★</span> ' : '';
      const rv = UI.revealed[x.id];
      let inner = '';
      if (mode === 'read') inner = `<div class="en">${star}${esc(x.en)}</div><div class="ko">${esc(x.ko)}</div>${x.note ? `<div class="note">💡 ${esc(x.note)}</div>` : ''}`;
      else if (mode === 'hideEn') inner = `<div class="ko">${star}${esc(x.ko)}</div><div class="en ${rv ? '' : 'veil-line'}" data-rv="${x.id}">${esc(x.en)}</div>`;
      else if (mode === 'hideKo') inner = `<div class="en">${star}${esc(x.en)}</div><div class="ko ${rv ? '' : 'veil-line'}" data-rv="${x.id}">${esc(x.ko)}</div>`;
      else if (['cloze', 'order', 'write'].includes(mode) && (S.dm || {})[`${mode}:${x.id}`] && !UI.redo[x.id]) {
        // 이미 맞힌 문장 — 다시 들어와도 완성된 상태로 보여 줍니다 (초기화된 것처럼 보이지 않게)
        inner = `<div class="ko">${star}${esc(x.ko)}</div><div class="en">${esc(x.en)}</div><div class="verdict ok">✓ ${({ cloze: '빈칸', order: '배열 영작', write: '통영작' })[mode]} 완료 <button class="link" data-redo="${x.id}" type="button">다시 해 보기</button></div>`;
      }
      else if (mode === 'cloze') {
        const parts = blanksOf(x.en);
        inner = `<div class="ko">${star}${esc(x.ko)}</div><div class="cloze" data-cl="${x.id}">${parts.map((p, k) => p.ans != null
          ? `${esc(p.pre)}<input data-ans="${esc(p.ans)}" data-k="${k}" style="width:${Math.max(4, p.ans.length) + 2}ch" autocomplete="off" spellcheck="false">${esc(p.post)}`
          : esc(p.t)).join(' ')}</div><div class="fix" hidden></div>`;
      } else if (mode === 'order') {
        const toks = x.en.split(/\s+/);
        const sh = shuffle(toks.map((t, i) => ({ t, i })), x.id);
        inner = `<div class="ko">${star}${esc(x.ko)}</div><div class="tray answer" data-ord="${x.id}"></div><div class="tray">${sh.map((o) => `<button class="chip" data-i="${o.i}" type="button">${esc(o.t)}</button>`).join('')}</div><div class="verdict" hidden></div>`;
      } else if (mode === 'write') {
        inner = `<div class="ko">${star}${esc(x.ko)}</div><div class="write"><textarea rows="2" data-wr="${x.id}" spellcheck="false" placeholder="영어로 써 보세요 (Enter 로 채점)"></textarea></div><div class="diff-line" hidden></div>`;
      }
      html += `<div class="item ${x.key ? 'key' : ''} ${S.mem[x.id] ? 'done' : ''}" data-id="${x.id}">${sp || `<span class="idx">${n}</span>`}<div class="body">${inner}</div><div class="tools">${memBtn}</div></div>`;
    }
    return html + `</div>`;
  }

  function bindDrill(items) {
    const byId = Object.fromEntries(items.map((x) => [x.id, x]));
    main.querySelectorAll('[data-redo]').forEach((b) => (b.onclick = () => { UI.redo[b.dataset.redo] = 1; const y = scrollY; render(); scrollTo(0, y); }));
    main.querySelectorAll('[data-flt]').forEach((c) => (c.onchange = () => { UI[c.dataset.flt] = c.checked; render(); }));
    main.querySelectorAll('[data-mem]').forEach((b) => (b.onclick = () => {
      const id = b.dataset.mem; if (S.mem[id]) delete S.mem[id]; else S.mem[id] = 1; save();
      const it = b.closest('.item'); it.classList.toggle('done', !!S.mem[id]); b.classList.toggle('on', !!S.mem[id]); b.textContent = S.mem[id] ? '✓ 외웠어요' : '외웠어요';
      const badge = main.querySelector('.bar-row .badge.ok'); if (badge) badge.textContent = `${memCount(items)} / ${items.length} 외움`;
    }));
    main.querySelectorAll('[data-rv]').forEach((el) => (el.onclick = () => { UI.revealed[el.dataset.rv] = 1; el.classList.remove('veil-line'); }));
    // 빈칸
    main.querySelectorAll('.cloze').forEach((box) => {
      const ins = [...box.querySelectorAll('input')];
      const grade = () => {
        let all = true;
        ins.forEach((i) => { const ok = accepts(i.value, i.dataset.ans); i.classList.toggle('right', ok); i.classList.toggle('wrong', !ok && i.value.trim() !== ''); if (!ok) all = false; });
        const fix = box.nextElementSibling;
        if (all) { fix.hidden = true; markMem(box.dataset.cl); }
        else { fix.hidden = false; fix.textContent = '정답: ' + ins.map((i) => i.dataset.ans).join(' · '); ins.filter((i) => i.classList.contains('wrong')).forEach((i) => react(false, i)); }
      };
      ins.forEach((i, k) => (i.onkeydown = (e) => { if (e.key !== 'Enter') return; if (k < ins.length - 1) ins[k + 1].focus(); else grade(); }));
      ins.forEach((i) => i.addEventListener('blur', () => { if (ins.every((x) => x.value.trim())) grade(); }));
    });
    // 배열
    main.querySelectorAll('[data-ord]').forEach((ans) => {
      const id = ans.dataset.ord, x = byId[id], pool = ans.nextElementSibling, ver = pool.nextElementSibling;
      const toks = x.en.split(/\s+/);
      const check = () => {
        const placed = [...ans.children].map((c) => toks[+c.dataset.i]);
        if (placed.length !== toks.length) { ver.hidden = true; return; }
        const ok = placed.join(' ') === toks.join(' ');
        ver.hidden = false; ver.className = 'verdict ' + (ok ? 'ok' : 'no');
        ver.innerHTML = ok ? '정답!' : `다시 해 봐요 <span class="tip">${esc(x.en)}</span>`;
        if (!ok) react(false, ans);
        if (ok) markMem(id);
      };
      pool.onclick = (e) => { const c = e.target.closest('.chip'); if (!c || c.classList.contains('used')) return; c.classList.add('used'); const n = c.cloneNode(true); n.classList.remove('used'); ans.appendChild(n); check(); };
      ans.onclick = (e) => { const c = e.target.closest('.chip'); if (!c) return; pool.querySelector(`.chip[data-i="${c.dataset.i}"]`).classList.remove('used'); c.remove(); check(); };
    });
    // 통영작
    main.querySelectorAll('[data-wr]').forEach((ta) => {
      const x = byId[ta.dataset.wr], out = ta.closest('.body').querySelector('.diff-line');
      ta.onkeydown = (e) => {
        if (e.key !== 'Enter' || e.shiftKey) return; e.preventDefault();
        const mine = norm(ta.value).split(' ').filter(Boolean), ans = norm(x.en).split(' ');
        const d = lcsDiff(mine, ans); const ok = d.every(([k]) => k === 'ok') || sameSentence(ta.value, x.en);
        out.hidden = false;
        out.innerHTML = (ok ? '<b class="ok">완벽해요! ✓</b> ' : '') + d.map(([k, w]) => `<span class="${k}">${esc(w)}</span>`).join(' ') + (ok ? '' : `<div class="hint">원문: ${esc(x.en)}</div>`);
        if (ok) markMem(x.id); else react(false, ta);
      };
    });
    function markMem(id) {
      const itEl = main.querySelector(`.item[data-id="${CSS.escape(id)}"]`); if (itEl) react(true, itEl);
      S.dm = S.dm || {}; if (!S.dm[`${UI.drill}:${id}`]) { S.dm[`${UI.drill}:${id}`] = Date.now(); save(); } // 배열·빈칸·통영작 중 무엇으로 맞혔는지
      if (S.mem[id]) return; S.mem[id] = 1; logEv('암기', 1, 1, (byId[id] || {}).en); save();
      const it = main.querySelector(`.item[data-id="${CSS.escape(id)}"]`); if (it) { it.classList.add('done'); const b = it.querySelector('.mk'); b.classList.add('on'); b.textContent = '✓ 외웠어요'; }
      const badge = main.querySelector('.bar-row .badge.ok'); if (badge) badge.textContent = `${memCount(items)} / ${items.length} 외움`;
    }
  }

  // ───────── 의사소통 ─────────
  function comm(L) {
    if (!hasComm(L)) { main.innerHTML = head(`의사소통 · ${L.no}과`, '') + `<div class="empty">${L.no}과는 교과서에 의사소통(대화문)이 없는 읽기 단원이에요.<br>문법과 본문에 집중해요!</div>`; return; }
    if (UI.comm === 'ws' && !(L.ws && L.ws.listen)) UI.comm = 'fn';
    const tabs = seg('comm', [...(L.ws && L.ws.listen ? [['ws', '학습지']] : []), ['fn', '핵심 표현 암기'], ['dlg', '대화문 암기'], ['fnAll', '기능 정리']], UI.comm);
    if (UI.comm === 'ws') { main.innerHTML = head(`의사소통 · ${L.no}과`, 'Listen & Speak 학습지 — 빈칸을 채우고 「채점」', tabs) + wsListen(L); bindWs(L); return; }
    if (UI.comm === 'fnAll') {
      main.innerHTML = head(`의사소통 · ${L.no}과`, '교과서 의사소통 기능 두 가지', tabs) + L.comm.functions.map((f) => `
        <div class="card fn-card"><h4>${esc(f.name)}</h4>
          ${f.items.map((x) => `<div class="line"><div class="body"><div class="en">${esc(x.en)}</div><div class="ko">${esc(x.ko)}</div></div></div>`).join('')}
          ${f.more && f.more.length ? `<div class="sub-t" style="margin:12px 0 4px">같은 뜻의 다른 표현</div>${f.more.map((x) => `<div class="line"><div class="body"><div class="en">${esc(x.en)}</div><div class="ko">${esc(x.ko)}</div></div></div>`).join('')}` : ''}
          ${f.tip ? `<div class="tip">⚠️ ${esc(f.tip)}</div>` : ''}</div>`).join('');
      return;
    }
    const items = itemsFor(L, UI.comm);
    main.innerHTML = head(`의사소통 · ${L.no}과`, UI.comm === 'fn' ? '핵심 표현을 입에 붙여요' : `대화문 ${L.comm.dialogs.length}개 — 시험에 그대로 나와요`, tabs) + drill(items);
    bindDrill(items);
  }

  // ───────── 문법 ─────────
  function grammar(L) {
    if (UI.grammar === 'ws' && !L.ws) UI.grammar = 'concept';
    const tabs = seg('grammar', [...(L.ws ? [['ws', '학습지']] : []), ['concept', '개념 정리'], ['ex', '예문 암기'], ['drill', '확인 문제']], UI.grammar);
    if (UI.grammar === 'ws') { main.innerHTML = head(`문법 · ${L.no}과`, 'Grammar 학습지 — 핵심 정리 → 예문 암기 → 예문 완성 → 전환 → 고치기 → 쓰기', tabs) + wsGrammar(L); bindWs(L); return; }
    if (UI.grammar === 'concept') {
      main.innerHTML = head(`문법 · ${L.no}과`, '교과서 언어 형식 두 가지', tabs) + L.grammar.map((g, gi) => `
        <div class="card gcard"><span class="badge">문법 ${gi + 1}</span><h3 style="margin-top:8px">${esc(g.title)}</h3>
          <div class="gform">${esc(g.form)}</div>
          <p class="gpoint">${esc(g.point)}</p>
          ${g.textbook ? `<div class="gtext"><div class="en">${esc(g.textbook.en)}</div><div class="ko">${esc(g.textbook.ko)}</div></div>` : ''}
          <div class="traps-t">⚠️ 시험 함정</div><ul class="traps">${g.traps.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
          <div class="sub-t">예문</div>${g.examples.map((x) => `<div class="line"><div class="body"><div class="en">${esc(x.en)}</div><div class="ko">${esc(x.ko)}</div></div></div>`).join('')}
        </div>`).join('');
      return;
    }
    if (UI.grammar === 'ex') {
      const items = itemsFor(L, 'gram');
      main.innerHTML = head(`문법 · ${L.no}과`, '문법 예문을 통째로 외워요', tabs) + drill(items);
      bindDrill(items); return;
    }
    // 확인 문제 — 문법별 드릴을 한 화면에
    main.innerHTML = head(`문법 · ${L.no}과`, '고르면 바로 채점돼요', tabs) + L.grammar.map((g, gi) => `
      <div class="sub-t">${esc(g.title)}</div><div class="list">${g.drill.map((d, di) => {
        const k = `${L.no}:gd:${gi}.${di}`, picked = UI.revealed[k];
        return `<div class="card q-card" style="padding:16px 18px"><p class="q-text">${di + 1}. ${rich(d.q)}</p><div class="choices">${d.choices.map((c, ci) => {
          let cls = ''; if (picked != null) { if (ci === d.answer) cls = 'right'; else if (ci === picked - 1) cls = 'wrong'; }
          return `<button class="choice ${cls}" data-gd="${k}" data-ci="${ci}" type="button" ${picked != null ? 'disabled' : ''}><span class="n">${'①②③④⑤'[ci]}</span>${rich(c)}</button>`;
        }).join('')}</div>${picked != null && d.exp ? `<div class="exp">${rich(d.exp)}</div>` : ''}</div>`;
      }).join('')}</div>`).join('');
    main.querySelectorAll('[data-gd]').forEach((b) => (b.onclick = () => {
      const [gi, di] = b.dataset.gd.split(':gd:')[1].split('.').map(Number), ok = +b.dataset.ci === L.grammar[gi].drill[di].answer;
      UI.revealed[b.dataset.gd] = +b.dataset.ci + 1; logEv('문법 확인', ok ? 1 : 0, 1, L.grammar[gi].title);
      fxAfter(ok, `[data-gd="${b.dataset.gd}"][data-ci="${b.dataset.ci}"]`);
      const y = window.scrollY; render(); window.scrollTo(0, y);
    }));
  }

  // ───────── 본문 ─────────
  function reading(L) {
    const items = itemsFor(L, 'reading');
    if (['ws', 'test'].includes(UI.read) && !L.ws) UI.read = 'note';
    const tabs = seg('read', [['note', '필기'], ...(L.ws ? [['ws', '학습지'], ['test', '본문시험']] : []), ['drill', '암기 연습']], UI.read);
    if (UI.read === 'note') { main.innerHTML = head(`본문 필기 · ${esc(L.readingTitle)}`, '문장을 드래그해 S·V·O·절을 표시하고, 아래 불릿에 필기해요', tabs) + noteView(L, items); bindNote(L, items); return; }
    if (UI.read === 'ws') { main.innerHTML = head(`본문 · ${esc(L.readingTitle)}`, 'Reading 학습지 — 핵심 암기 → 문법 + 본문 연습 → 필기 집중 연습', tabs) + wsReading(L); bindWs(L); return; }
    if (UI.read === 'test') { main.innerHTML = head(`본문시험 · ${L.no}과`, '우리말을 보고 본문 문장을 그대로 영작해요', tabs) + wsTest(L); bindWs(L); return; }
    main.innerHTML = head(`본문 · ${esc(L.readingTitle)}`, `${L.no}과 본문 ${items.length}문장 · ★ 는 시험에 잘 나오는 문장`, tabs) + drill(items);
    bindDrill(items);
  }

  // ───────── 본문 필기 ─────────
  // 문장마다 ① 드래그로 구조 표시(S·V·O·C·M·절…) ② 불릿 필기(라벨 선택) ③ ★ 중요.
  // 기록은 S.notes[문장 id] = { marks:[{s,e,lab}], lines:[{lab,t}], star } — 낱말 번호로 저장합니다.
  const MARKS = [
    ['S', 'S', 'sv'], ['V', 'V', 'sv'], ['O', 'O', 'sv'], ['C', 'C', 'sv'], ['M', 'M', 'sv'],
    ['절', '[ ] 절', 'br'], ['관계사절', '관계사절', 'br'], ['to부정사', 'to부정사', 'br'], ['동명사', '동명사', 'br'], ['분사', '분사', 'br'],
    ['형광', '형광펜', 'hl'], ['밑줄', '밑줄', 'ul'],
  ];
  const MK = Object.fromEntries(MARKS.map(([k, t, kind]) => [k, { t, kind }]));
  const LINE_LABS = ['', '주요 문법', '어휘', '해석', '시험 포인트', '암기'];
  const noteOf = (id) => { S.notes = S.notes || {}; return (S.notes[id] = S.notes[id] || { marks: [], lines: [{ lab: '', t: '' }], star: false }); };
  const toks = (en) => en.split(/\s+/);

  // 겹치지 않는(바깥·안쪽만 허용하는) 표시를 낱말 위에 감쌉니다.
  function markHtml(words, marks) {
    const list = marks.map((m, i) => ({ ...m, i })).sort((a, b) => a.s - b.s || b.e - a.e);
    const build = (lo, hi, pool) => {
      let out = [], k = lo;
      while (k <= hi) {
        const m = pool.find((x) => x.s === k && x.e <= hi);
        if (!m) { out.push(`<span class="tk" data-t="${k}">${esc(words[k])}</span>`); k++; continue; }
        const inner = build(m.s, m.e, pool.filter((x) => x !== m && x.s >= m.s && x.e <= m.e));
        const info = MK[m.lab] || { t: m.lab, kind: 'sv' };
        out.push(info.kind === 'br'
          ? `<span class="nm br" data-m="${m.i}"><b class="nm-tag" data-m="${m.i}" title="눌러서 지우기">${esc(info.t)}</b>[${inner}]</span>`
          : `<span class="nm ${info.kind} lab-${m.lab}" data-m="${m.i}">${inner}${info.kind === 'sv' ? `<sub class="nm-tag" data-m="${m.i}" title="눌러서 지우기">${esc(m.lab)}</sub>` : ''}</span>`);
        pool = pool.filter((x) => !(x.s >= m.s && x.e <= m.e));
        k = m.e + 1;
      }
      return out.join(' ');
    };
    return build(0, words.length - 1, list);
  }

  const hasNote = (id) => { const x = (S.notes || {})[id]; return !!x && ((x.marks || []).length || x.star || (x.lines || []).some((l) => l.t)); };
  function noteView(L, items) {
    if (UI.noteReview) return reviewView(L, items);
    let html = `<div class="bar-row"><button class="btn sm2" id="to-review" type="button">📖 필기 복기 모드</button><span class="hint">수업 때 한 필기를 가리고 떠올려 봐요</span></div><div class="note-bar" id="note-bar" hidden>${MARKS.map(([k, t, kind]) => `<button type="button" class="nb ${kind} lab-${k}" data-lab="${k}">${esc(t)}</button>`).join('')}<button type="button" class="nb del" data-lab="-">지우기</button></div>`;
    html += `<div class="bar-row"><label class="hint"><input type="checkbox" id="show-ko" ${UI.showKo !== false ? 'checked' : ''} style="width:auto"> 해석 보기</label><span class="grow"></span><span class="hint">표시를 지우려면 라벨(S·V·절…)을 누르세요</span></div><div class="list">`;
    let g = null, n = 0;
    for (const x of items) {
      if (x.group !== g) { g = x.group; html += `<div class="sub-t">${esc(g)}</div>`; }
      n++;
      const st = noteOf(x.id);
      html += `<div class="item nitem ${st.star ? 'key' : ''}" data-id="${x.id}"><span class="idx">${n}</span><div class="body">
        <div class="en nen" data-sent="${x.id}">${markHtml(toks(x.en), st.marks)}</div>
        ${UI.showKo !== false ? `<div class="ko">${esc(x.ko)}</div>` : ''}
        <div class="blist">${st.lines.map((ln, li) => bulletRow(ln, li)).join('')}</div>
      </div><div class="tools"><button class="mk star-btn ${st.star ? 'on' : ''}" data-star type="button">${st.star ? '★ 중요' : '☆ 중요'}</button></div></div>`;
    }
    return html + '</div>';
  }
  function bulletRow(ln, li) {
    return `<div class="bl" data-li="${li}"><span class="bdot">•</span><button type="button" class="btag ${ln.lab ? 'on' : ''}" title="라벨 바꾸기">${ln.lab ? esc(ln.lab) : '라벨'}</button><input class="bin" value="${esc(ln.t)}" placeholder="필기하고 Enter → 다음 줄" spellcheck="false"></div>`;
  }

  // 필기 복기 — 필기를 가린 문장을 보고 떠올린 뒤, 「필기 보기」로 확인하고 「복기했어요」.
  function reviewView(L, items) {
    const list = items.filter((x) => hasNote(x.id));
    S.rev = S.rev || {};
    const today = new Date(dayKey(Date.now()) + 'T00:00:00').getTime();
    const done = list.filter((x) => (S.rev[x.id] || 0) >= today).length;
    let html = `<div class="bar-row"><button class="btn sm2" id="from-review" type="button">← 필기하기로</button><span class="grow"></span><span class="badge ok">오늘 ${done} / ${list.length} 복기</span></div>
      <p class="hint" style="margin:-6px 2px 14px">필기를 가렸어요. 문장을 보고 S·V·절, 시험 포인트를 먼저 말해 본 다음 「필기 보기」로 확인해요.</p>`;
    if (!list.length) return html + `<div class="empty">이 과에는 아직 수업 때 한 필기가 없어요.</div>`;
    html += '<div class="list">';
    let g = null;
    list.forEach((x, n) => {
      if (x.group !== g) { g = x.group; html += `<div class="sub-t">${esc(g)}</div>`; }
      const st = noteOf(x.id), shown = UI.revealed['rv:' + x.id], ok = (S.rev[x.id] || 0) >= today;
      html += `<div class="item nitem ${ok ? 'done' : ''} ${st.star ? 'key' : ''}" data-id="${x.id}"><span class="idx">${n + 1}</span><div class="body">
        <div class="en nen">${shown ? markHtml(toks(x.en), st.marks) : esc(x.en)}</div>
        ${shown ? `<div class="ko">${esc(x.ko)}</div><div class="blist ro">${st.lines.filter((l) => l.t).map((l) => `<div class="bl"><span class="bdot">•</span>${l.lab ? `<span class="btag on">${esc(l.lab)}</span>` : ''}<span>${esc(l.t)}</span></div>`).join('')}</div>`
          : `<div class="veil-line" data-show="${x.id}" style="margin-top:6px;height:44px"></div>`}
      </div><div class="tools">${shown ? `<button class="mk ${ok ? 'on' : ''}" data-rev="${x.id}" type="button" title="${ok ? '한 번 더 누르면 취소돼요' : ''}">${ok ? '✓ 복기했어요' : '복기했어요'}</button>${ok ? '<span class="hint" style="font-size:11px">다시 누르면 취소</span>' : ''}` : `<button class="mk" data-show="${x.id}" type="button">필기 보기</button>`}</div></div>`;
    });
    return html + '</div>';
  }

  function bindNote(L, items) {
    const tr = $('#to-review'); if (tr) tr.onclick = () => { UI.noteReview = true; render(); };
    const fr = $('#from-review'); if (fr) fr.onclick = () => { UI.noteReview = false; render(); };
    if (UI.noteReview) {
      main.querySelectorAll('[data-show]').forEach((b) => (b.onclick = () => { UI.revealed['rv:' + b.dataset.show] = 1; const y = scrollY; render(); scrollTo(0, y); }));
      main.querySelectorAll('[data-rev]').forEach((b) => (b.onclick = () => {
        const id = b.dataset.rev; S.rev = S.rev || {};
        const today = new Date(dayKey(Date.now()) + 'T00:00:00').getTime();
        if ((S.rev[id] || 0) >= today) { delete S.rev[id]; delete UI.revealed['rv:' + id]; save(); toast('복기를 취소했어요 — 필기를 다시 가렸어요'); } // 잘못 눌렀을 때 되돌리기
        else { S.rev[id] = Date.now(); save(); logEv('필기 복기', 1, 1, (items.find((x) => x.id === id) || {}).en); react(true, b.closest('.item')); }
        const y = scrollY; render(); scrollTo(0, y);
      }));
      return;
    }
    const ko = $('#show-ko'); if (ko) ko.onchange = () => { UI.showKo = ko.checked; render(); };
    const bar = $('#note-bar');
    let pending = null; // { id, s, e }
    const redrawSent = (id) => { const el = main.querySelector(`.nen[data-sent="${CSS.escape(id)}"]`); const x = items.find((y) => y.id === id); el.innerHTML = markHtml(toks(x.en), noteOf(id).marks); };
    const hideBar = () => { bar.hidden = true; pending = null; };
    const onSelect = () => {
      const sel = window.getSelection(); if (!sel || !sel.rangeCount || sel.isCollapsed) return;
      const r = sel.getRangeAt(0);
      const tokOf = (node) => (node.nodeType === 3 ? node.parentElement : node).closest('.tk');
      const sentOf = (node) => (node.nodeType === 3 ? node.parentElement : node).closest('.nen');
      const a = sentOf(r.startContainer), b = sentOf(r.endContainer);
      if (!a || a !== b) return;
      const all = [...a.querySelectorAll('.tk')].filter((t) => sel.containsNode(t, true));
      if (!all.length) return;
      const s = Math.min(...all.map((t) => +t.dataset.t)), e = Math.max(...all.map((t) => +t.dataset.t));
      pending = { id: a.dataset.sent, s, e };
      const rect = r.getBoundingClientRect();
      bar.hidden = false;
      bar.style.top = `${rect.bottom + window.scrollY + 8}px`;
      bar.style.left = `${Math.max(8, Math.min(rect.left + window.scrollX, document.documentElement.clientWidth - bar.offsetWidth - 8))}px`;
    };
    main.querySelectorAll('.nen').forEach((el) => { el.addEventListener('mouseup', () => setTimeout(onSelect, 0)); el.addEventListener('touchend', () => setTimeout(onSelect, 80)); });
    bar.onmousedown = (e) => e.preventDefault(); // 선택이 풀리지 않게
    bar.onclick = (e) => {
      const b = e.target.closest('[data-lab]'); if (!b || !pending) return;
      const st = noteOf(pending.id), { s, e: en } = pending;
      if (b.dataset.lab === '-') st.marks = st.marks.filter((m) => m.e < s || m.s > en);
      else {
        const cross = st.marks.some((m) => m.s < s && m.e >= s && m.e < en || m.s > s && m.s <= en && m.e > en);
        if (cross) { toast('표시끼리 엇갈리게는 못 그어요 — 안쪽이나 바깥쪽으로 골라 주세요'); return; }
        st.marks = st.marks.filter((m) => !(m.s === s && m.e === en && MK[m.lab]?.kind === MK[b.dataset.lab]?.kind));
        st.marks.push({ s, e: en, lab: b.dataset.lab });
      }
      (S.notesAt = S.notesAt || {})[pending.id] = Date.now(); save(); redrawSent(pending.id); window.getSelection().removeAllRanges(); hideBar();
    };
    document.addEventListener('mousedown', (e) => { if (!e.target.closest('#note-bar') && !e.target.closest('.nen')) hideBar(); });
    main.addEventListener('click', (e) => {
      const tag = e.target.closest('.nm-tag'); if (!tag) return;
      const id = tag.closest('.nen').dataset.sent, st = noteOf(id);
      st.marks.splice(+tag.dataset.m, 1); (S.notesAt = S.notesAt || {})[id] = Date.now(); save(); redrawSent(id);
    });
    main.querySelectorAll('[data-star]').forEach((b) => (b.onclick = () => {
      const it = b.closest('.nitem'), st = noteOf(it.dataset.id); st.star = !st.star; save();
      it.classList.toggle('key', st.star); b.classList.toggle('on', st.star); b.textContent = st.star ? '★ 중요' : '☆ 중요';
    }));
    // 불릿 필기 — Enter 새 줄, 빈 줄에서 Backspace 지우기, 라벨은 눌러서 차례로 바꾸기
    main.querySelectorAll('.blist').forEach((box) => {
      const id = box.closest('.nitem').dataset.id;
      const paint = (focus) => { const st = noteOf(id); box.innerHTML = st.lines.map((ln, li) => bulletRow(ln, li)).join(''); bindRows(); if (focus != null) { const inp = box.querySelectorAll('.bin')[focus]; if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); } } };
      const bindRows = () => box.querySelectorAll('.bl').forEach((row) => {
        const li = +row.dataset.li, inp = row.querySelector('.bin'), st = noteOf(id);
        inp.oninput = () => { st.lines[li].t = inp.value; (S.notesAt = S.notesAt || {})[id] = Date.now(); save(); };
        inp.onkeydown = (e) => {
          if (e.isComposing || e.keyCode === 229) return; // 한글 조합 중 Enter 무시
          if (e.key === 'Enter') { e.preventDefault(); st.lines.splice(li + 1, 0, { lab: st.lines[li].lab, t: '' }); save(); paint(li + 1); }
          else if (e.key === 'Backspace' && !inp.value && st.lines.length > 1) { e.preventDefault(); st.lines.splice(li, 1); save(); paint(Math.max(0, li - 1)); }
          else if (e.key === 'ArrowUp' && li > 0) { e.preventDefault(); box.querySelectorAll('.bin')[li - 1].focus(); }
          else if (e.key === 'ArrowDown' && li < st.lines.length - 1) { e.preventDefault(); box.querySelectorAll('.bin')[li + 1].focus(); }
        };
        row.querySelector('.btag').onclick = () => { const cur = LINE_LABS.indexOf(st.lines[li].lab); st.lines[li].lab = LINE_LABS[(cur + 1) % LINE_LABS.length]; save(); paint(li); };
      });
      bindRows();
    });
  }

  // ───────── 선생님 학습지 ─────────
  // 1학기 학습지(Vocabulary · Listen&Speak · Grammar · Reading · 본문시험)와 같은 순서·표기로 그립니다.
  // 빈칸은 ______ 자리에 칸을 놓고, 「채점」을 누르면 한 묶음을 한꺼번에 매깁니다.
  const LETTERS = 'ABCDEFGHIJKLMNOP';
  const NUMS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫'];
  function blanks(q, a) {
    let i = 0;
    return esc(q).replace(/_{3,}/g, () => { const ans = (a && a[i]) ?? ''; i++; return `<input class="wb" data-ans="${esc(ans)}" style="width:${Math.max(4, ans.length) + 2}ch" autocomplete="off" spellcheck="false">`; });
  }
  const koLine = (ko) => (ko ? `<div class="wko">→ ${esc(ko)}</div>` : '');
  const starLine = (st) => (st ? `<div class="wstar">${esc(st)}</div>` : '');
  function rowBlank(n, q, a, ko, star, pre = '') {
    return `<div class="wrow"><span class="wn">${n}</span><div class="wbody"><div class="wq">${pre}${blanks(q, a)}</div>${koLine(ko)}${starLine(star)}</div></div>`;
  }
  function rowFull(n, prompt, answer, extra = '', alts = []) {
    return `<div class="wrow"><span class="wn">${n}</span><div class="wbody"><div class="wq">${prompt}</div>
      <textarea class="wfull" rows="1" data-full="${esc(answer)}" data-alt="${esc(alts.join('||'))}" spellcheck="false" placeholder="영어로 쓰고 Enter"></textarea><div class="wfb" hidden></div>${extra ? `<div class="wwhy" hidden>${extra}</div>` : ''}</div></div>`;
  }
  function rowMemo(n, en, ko, star) {
    return `<div class="wrow memo"><span class="wn">${n}</span><div class="wbody"><div class="wen">${esc(en)}</div>${ko ? `<div class="wko">→ <span class="wkt">${esc(ko)}</span></div>` : ''}${starLine(star)}</div></div>`;
  }
  // 내용 확인 — hint 가 "the Star ______" 처럼 앞뒤를 주면 그 빈칸만 받습니다.
  function rowCheck(n, c) {
    const h = c.hint || '';
    if (h.includes('______')) {
      const [pre, post] = [h.split(/_{3,}/)[0], h.split(/_{3,}/).slice(-1)[0]];
      let mid = c.a;
      if (h.split(/_{3,}/).length === 2 && norm(c.a).startsWith(norm(pre)) && norm(c.a).endsWith(norm(post))) {
        mid = c.a.slice(pre.trim().length, c.a.length - post.trim().length).trim() || c.a;
        return rowBlank(n, h, [mid], '', '', `${esc(c.q)}<br>→ `);
      }
    }
    return rowFull(n, `${esc(c.q)}`, c.a);
  }
  function part(id, letter, title, rows, { memo = false, sub = '' } = {}) {
    const sc = S.ws && S.ws[id];
    const tools = memo
      ? `<button class="mk" data-hide="en" type="button">영어 가리기</button><button class="mk" data-hide="ko" type="button">해석 가리기</button>`
      : `${sc ? `<span class="badge ${sc.ok === sc.total ? 'ok' : ''}">지난번 ${sc.ok}/${sc.total}</span>` : ''}<button class="btn sm2" data-grade type="button">채점</button><button class="btn ghost sm2" data-show type="button">정답 보기</button>`;
    return `<section class="card wpart" data-part="${id}"><div class="wpart-h"><span class="wl">${letter}</span><h3>${esc(title)}</h3>${sub ? `<span class="hint">${esc(sub)}</span>` : ''}<span class="grow"></span>${tools}</div>
      <div class="wpart-b">${rows}</div><div class="wscore" hidden></div></section>`;
  }

  function wsVocab(L) {
    const v = L.ws.vocab;
    const list = UI.coreOnly ? v.list.filter((w) => w.core) : v.list;
    const core = v.list.filter((w) => w.core);
    return `<div class="bar-row"><span class="grow"></span>
        <label class="hint"><input type="checkbox" id="core-only" ${UI.coreOnly ? 'checked' : ''} style="width:auto"> 교과서 단어만 (유의어·반의어 빼기)</label></div>` +
      part(`${L.no}:v:A`, 'A', '단어 암기', `<div class="wgrid">${list.map((w) => `<div class="wrow memo wword ${w.core ? '' : 'rel'}"><div class="wbody"><span class="wen">${esc(w.en)}</span> : <span class="wkt">${esc(w.ko)}</span>${w.core ? '' : ' <span class="reltag">관련어</span>'}</div></div>`).join('')}</div>`, { memo: true, sub: `${list.length}개` }) +
      part(`${L.no}:v:B`, 'B', '영영풀이 보고 단어 쓰기', v.enDef.map((d, i) => rowBlank(`${i + 1}.`, `${d.def} : ______`, [d.answer])).join('')) +
      part(`${L.no}:v:C`, 'C', '우리말 보고 단어 쓰기', core.map((w, i) => rowBlank(`${i + 1}.`, `${w.ko} : ______`, [w.en])).join('')) +
      part(`${L.no}:v:D`, 'D', '예문 완성하기', v.fill.map((f, i) => rowBlank(`${i + 1}.`, f.q, Array.isArray(f.answer) ? f.answer : [f.answer], f.ko)).join(''));
  }

  function wsListen(L) {
    const li = L.ws.listen;
    let html = part(`${L.no}:l:A`, 'A', '핵심 표현 암기', li.expressions.map((g) => `<div class="wsub">${esc(g.title)}</div>${g.lines.map((x) => rowMemo('', x.en, x.ko)).join('')}`).join(''), { memo: true });
    li.dialogs.forEach((d, di) => {
      const rows = d.lines.map((x) => `<div class="wrow"><span class="wn sp">${esc(x.sp || '')}</span><div class="wbody"><div class="wq">${x.q.includes('_') ? blanks(x.q, x.a) : esc(x.q || x.en)}</div>${koLine(x.ko)}</div></div>`).join('') +
        (d.check && d.check.length ? `<div class="wsub">[내용 확인]</div>${d.check.map((c, ci) => rowCheck(`${ci + 1}.`, c)).join('')}` : '');
      html += part(`${L.no}:l:${di}`, LETTERS[di + 1], `${d.title}`, rows, { sub: d.from || '' });
    });
    return html;
  }

  function wsGrammar(L) {
    return L.ws.grammar.map((g, gi) => {
      const id = (k) => `${L.no}:g${gi}:${k}`;
      let h = `<div class="wgtitle"><span class="badge">문법 ${gi + 1}</span> ${esc(g.title)}</div>`;
      h += part(id('A'), 'A', `${g.title} 핵심 정리`, g.summary.map((x) => `<div class="wsum"><div class="wsub">${esc(x.h)}</div><div class="wsum-b">${esc(x.body)}</div></div>`).join(''), { memo: true });
      h += part(id('B'), 'B', '핵심 예문 암기', g.memorize.map((x) => rowMemo('', x.en, x.ko)).join(''), { memo: true });
      h += part(id('C'), 'C', '예문 완성하기', g.complete.map((x, i) => rowBlank(`${i + 1}.`, x.q, x.a, x.ko)).join(''));
      const tf = g.transform || { items: [] };
      h += part(id('D'), 'D', tf.title || '문장 바꾸기', tf.items.map((x, i) => x.hint && x.hint.includes('_')
        ? rowBlank(`${i + 1}.`, x.hint, x.a, '', '', `${esc(x.q)}<br>→ `)
        : rowFull(`${i + 1}.`, esc(x.q), x.answer)).join(''));
      h += part(id('E'), 'E', '틀린 부분 고치기', g.fix.map((x, i) => rowFull(`${i + 1}.`, esc(x.q), x.answer, `💡 ${esc(x.why || '')}`)).join(''));
      h += part(id('F'), 'F', '해석 보고 쓰기', g.write.map((x, i) => rowFull(`${i + 1}.`, esc(x.ko), x.answer)).join(''));
      return h;
    }).join('<div style="height:18px"></div>');
  }

  function wsReading(L) {
    const parts = L.ws.reading;
    const k = Math.min(UI.rpart, parts.length - 1), r = parts[k];
    const id = (x) => `${L.no}:r${k}:${x}`;
    return `<div class="bar-row">${seg('rpart', parts.map((p, i) => [String(i), `${i + 1}. ${p.title}`]), String(k))}</div>` +
      part(id('A'), 'A', '본문 핵심 암기', r.memorize.map((x, i) => rowMemo(`${i + 1}.`, x.en, x.ko)).join(''), { memo: true }) +
      part(id('B'), 'B', '문법 + 본문 연습', r.practice.map((x, i) => rowBlank(`${i + 1}.`, x.q, x.a, x.ko, x.star)).join('')) +
      part(id('C'), 'C', '본문 + 필기 집중 연습', r.notes.map((x, i) => rowBlank(`${i + 1}.`, x.q, x.a, x.ko, x.star)).join(''));
  }

  function wsTest(L) {
    let n = 0;
    return L.ws.test.map((t, ti) => part(`${L.no}:t:${ti}`, '', t.title, t.items.map((x) => rowFull(`${++n}.`, esc(x.ko), x.answer, '', x.alts || [])).join(''))).join('');
  }

  function bindWs(L) {
    const core = $('#core-only'); if (core) core.onchange = () => { UI.coreOnly = core.checked; render(); };
    main.querySelectorAll('.wpart').forEach((sec) => {
      const id = sec.dataset.part;
      const inputs = [...sec.querySelectorAll('input.wb, textarea.wfull')];
      // 쓴 답은 바로바로 저장 — 화면을 바꾸거나 앱을 껐다 켜도 남습니다.
      S.wsv = S.wsv || {};
      const saved = S.wsv[id];
      if (saved) inputs.forEach((el, i) => { if (saved[i] != null) el.value = saved[i]; });
      let tSave;
      const keep = () => { clearTimeout(tSave); tSave = setTimeout(() => { S.wsv[id] = inputs.map((el) => el.value); save(); }, 250); };
      inputs.forEach((el) => el.addEventListener('input', keep));
      const grade = (quiet) => {
        let ok = 0;
        inputs.forEach((el) => {
          if (el.tagName === 'INPUT') {
            const r = accepts(el.value, el.dataset.ans);
            el.classList.toggle('right', r); el.classList.toggle('wrong', !r); if (r) ok++;
          } else {
            const answers = [el.dataset.full, ...(el.dataset.alt ? el.dataset.alt.split('||') : [])];
            const r = answers.some((a) => sameSentence(a, el.value));
            const fb = el.nextElementSibling; fb.hidden = false;
            if (r) { fb.innerHTML = '<span class="ok">✓ 정답</span>'; ok++; }
            else {
              const d = lcsDiff(norm(el.value).split(' ').filter(Boolean), norm(el.dataset.full).split(' '));
              fb.innerHTML = d.map(([kk, w]) => `<span class="${kk}">${esc(w)}</span>`).join(' ') + `<div class="hint">정답: ${esc(el.dataset.full)}</div>`;
            }
            el.classList.toggle('right', r); el.classList.toggle('wrong', !r);
            const why = fb.nextElementSibling; if (why && why.classList.contains('wwhy')) why.hidden = false;
          }
        });
        const sc = sec.querySelector('.wscore'); sc.hidden = false;
        sc.className = 'wscore ' + (ok === inputs.length ? 'ok' : '');
        S.wsv[id] = inputs.map((el) => el.value);
        if (quiet === true) {
          sc.textContent = `${ok} / ${inputs.length} 맞힘 (지난번 채점)`;
          if (!S.ws[id] || S.ws[id].ok !== ok) { S.ws[id] = { ok, total: inputs.length }; save(); } // 채점 기준이 바뀌면 점수도 새로
          return;
        }
        sc.textContent = ok === inputs.length ? `${ok} / ${inputs.length} 다 맞았어요! 🎉` : `${ok} / ${inputs.length} 맞힘 — 빨간 칸을 고쳐서 다시 「채점」`;
        S.ws = S.ws || {}; S.ws[id] = { ok, total: inputs.length }; S.wsAt = S.wsAt || {}; S.wsAt[id] = Date.now();
        logEv('학습지', ok, inputs.length, sec.querySelector('h3')?.textContent);
        inputs.filter((el) => el.classList.contains('wrong')).forEach((el) => shake(el));
        inputs.filter((el) => el.classList.contains('right')).forEach((el) => pop(el));
        if (ok === inputs.length && ok) { burst(sc, 28); cheer('🎉 다 맞았어요!'); } else if (ok) burst(sc, 8);
        save();
      };
      const g = sec.querySelector('[data-grade]'); if (g) g.onclick = () => grade();
      // 채점했던 묶음은 다시 열 때도 맞은 칸·틀린 칸이 보이게 (기록은 다시 남기지 않음)
      if (saved && S.ws && S.ws[id] && inputs.some((el) => el.value.trim())) grade(true);
      const sh = sec.querySelector('[data-show]');
      if (sh) sh.onclick = () => inputs.forEach((el) => {
        if (el.classList.contains('right')) return;
        if (el.tagName === 'INPUT') { el.value = el.dataset.ans.split('/')[0]; el.classList.add('shown'); keep(); }
        else { const fb = el.nextElementSibling; fb.hidden = false; fb.innerHTML = `<div class="hint">정답: ${esc(el.dataset.full)}</div>`; const why = fb.nextElementSibling; if (why && why.classList.contains('wwhy')) why.hidden = false; }
      });
      inputs.forEach((el, i) => el.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' || e.shiftKey) return; e.preventDefault();
        if (i < inputs.length - 1) inputs[i + 1].focus(); else grade();
      }));
      sec.querySelectorAll('textarea.wfull').forEach((ta) => ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }));
      sec.querySelectorAll('[data-hide]').forEach((b) => (b.onclick = () => {
        const cls = 'hide-' + b.dataset.hide; sec.classList.toggle(cls); b.classList.toggle('on', sec.classList.contains(cls));
        sec.querySelectorAll('.rv').forEach((x) => x.classList.remove('rv'));
      }));
      sec.addEventListener('click', (e) => { const t = e.target.closest('.wen, .wkt'); if (t && (sec.classList.contains('hide-en') || sec.classList.contains('hide-ko'))) t.classList.add('rv'); });
    });
  }

  // ───────── 실전 문제 ─────────
  const CATS = ['전체', '어휘', '의사소통', '문법', '본문', '서술형'];
  function qPool(L) {
    if (UI.quizOnly) return UI.quizOnly.map(qByKey).filter(Boolean); // 숙제로 고른 문제만
    const src = UI.quizScope === 'exam' ? EXAMS.flatMap((e) => (UI.examSet === 'all' || UI.examSet === e.id ? e.questions : []).map((q, i) => ({ q, key: `ex:${e.id}:${i}`, no: q.lesson, src: e.title })))
      : UI.quizScope === 'all' ? LESSONS.flatMap((l) => l.questions.map((q, i) => ({ q, key: `${l.no}:${i}`, no: l.no }))) : L.questions.map((q, i) => ({ q, key: `${L.no}:${i}`, no: L.no }));
    return src.filter(({ q }) => UI.quizCat === '전체' || (UI.quizCat === '서술형' ? q.type === 'short' : q.cat === UI.quizCat));
  }
  function quiz(L) {
    if (!UI.quiz) { const pool = qPool(L); UI.quiz = { pool: UI.quizScope === 'all' || (UI.quizScope === 'exam' && UI.examSet === 'all') ? shuffle(pool) : pool, i: 0, picks: {} }; }
    const Q = UI.quiz;
    const st = quizStats(L);
    let html = head(`실전 문제${UI.quizScope === 'exam' ? ' · 기출 시험지' : UI.quizScope === 'all' ? ' · 5~8과 섞어서' : ` · ${L.no}과`}`, UI.quizScope === 'exam' ? (UI.examSet === 'all' ? `기출비 카페에서 골라 낸 좋은 문제 ${EXAMS.reduce((n, e) => n + e.questions.length, 0)}개를 섞어서` : `출처: ${esc((EXAMS.find((e) => e.id === UI.examSet) || {}).source || '')}`) : `직접 만든 문제 · 이 단원 ${st.ok}/${st.total} 맞힘`,
      `<button class="btn" id="q-reset" type="button">처음부터 다시</button>`) +
      `<div class="bar-row">${seg('quizScope', [...(EXAMS.length ? [['exam', `기출 시험지 (${EXAMS.reduce((a, e) => a + e.questions.length, 0)})`]] : []), ['one', '이 단원 (직접 만든 문제)'], ['all', '5~8과 섞기']], UI.quizScope)}${seg('quizCat', CATS.map((c) => [c, c]), UI.quizCat)}</div>` +
      (UI.quizScope === 'exam' && EXAMS.length > 1 ? `<div class="bar-row">${seg('examSet', [['all', '전체 섞기'], ...EXAMS.map((e) => [e.id, `${e.title} (${e.questions.length})`])], UI.examSet)}</div>` : '');
    if (UI.quizOnly) html += `<div class="hw-banner">📌 숙제 문제만 보는 중 (${Q.pool.length}문제) <button class="link" id="q-all" type="button">모든 문제 보기</button></div>`;
    if (!Q.pool.length) { main.innerHTML = html + `<div class="empty">이 갈래의 문제가 없어요.</div>`; bindQuizTop(); return; }
    html += `<div class="qdots">${Q.pool.map((p, i) => { const r = Q.picks[p.key]; return `<button class="qdot ${i === Q.i ? 'on' : ''} ${r ? (r.ok ? 'right' : 'wrong') : ''}" data-qi="${i}" type="button">${i + 1}</button>`; }).join('')}</div>`;
    const answered = Object.values(Q.picks); const okN = answered.filter((r) => r.ok).length;
    if (answered.length === Q.pool.length) html += `<div class="card done-card" style="margin-bottom:14px"><span class="big">${okN} / ${Q.pool.length} 맞혔어요</span><span class="sub">틀린 문제는 오답노트에 모였어요. 두 번 연속 맞히면 빠져요.</span></div>`;
    const cur = Q.pool[Q.i];
    html += `<div class="qwrap">${questionCard(cur, Q.picks[cur.key], Q.i + 1)}
      <div class="actions"><button class="btn" id="q-prev" type="button" ${Q.i === 0 ? 'disabled' : ''}>← 이전</button><button class="btn primary" id="q-next" type="button" ${Q.i >= Q.pool.length - 1 ? 'disabled' : ''}>다음 →</button></div></div>`;
    main.innerHTML = html;
    bindQuizTop();
    bindQuestion(cur, (r) => { Q.picks[cur.key] = r; render(); });
    main.querySelectorAll('[data-qi]').forEach((b) => (b.onclick = () => { Q.i = +b.dataset.qi; render(); }));
    $('#q-prev').onclick = () => { Q.i--; render(); };
    $('#q-next').onclick = () => { Q.i++; render(); };
  }
  function bindQuizTop() { const r = $('#q-reset'); if (r) r.onclick = () => { UI.quiz = null; render(); }; const a = $('#q-all'); if (a) a.onclick = () => { UI.quizOnly = null; UI.quiz = null; render(); }; }

  function questionCard({ q, no, src }, r, num) {
    const kind = q.type === 'short' ? '서술형' : q.cat;
    let body = `<div class="q-head"><span class="cat">${esc(kind)}</span>${UI.quizScope !== 'one' || S.tab === 'wrong' ? `<span class="badge">${no}과</span>` : ''}<span class="badge ${src ? 'ok' : ''}">${src ? '기출 시험지' : '직접 만든 문제'}</span><span class="q-no">${num}번</span></div>
      <p class="q-text">${rich(q.q)}</p>${q.passage ? `<div class="passage">${rich(q.passage)}</div>` : ''}`;
    if (q.type === 'short') {
      body += `<div class="short spell-row"><input id="sh-in" autocomplete="off" spellcheck="false" placeholder="답을 쓰고 Enter" ${r ? 'disabled' : ''} value="${esc(r ? r.typed : '')}"><button class="btn primary" id="sh-go" type="button" ${r ? 'hidden' : ''}>채점</button><button class="btn ghost" id="sh-give" type="button" ${r ? 'hidden' : ''}>모르겠어요</button></div>`;
      if (r) body += `<div class="verdict ${r.ok ? 'ok' : 'no'}">${r.ok ? '정답!' : '아쉬워요'}<span class="tip">모범 답안: ${q.answer.map(esc).join('  /  ')}</span></div>`;
    } else {
      body += `<div class="choices">${q.choices.map((c, k) => {
        let cls = ''; if (r) { if (k === q.answer) cls = 'right'; else if (k === r.pick) cls = 'wrong'; }
        return `<button class="choice ${cls}" data-k="${k}" type="button" ${r ? 'disabled' : ''}><span class="n">${'①②③④⑤'[k]}</span>${rich(c)}</button>`;
      }).join('')}</div>`;
    }
    if (r && q.exp) body += `<div class="exp"><b>해설</b>  ${rich(q.exp)}</div>`;
    return `<div class="card q-card">${body}</div>`;
  }
  function bindQuestion(item, done) {
    const { q, key } = item;
    const record = (r) => {
      S.qa[key] = { ok: r.ok, at: Date.now() };
      logEv(key.startsWith('ex:') ? '기출 시험지' : '실전 문제', r.ok ? 1 : 0, 1, key.startsWith('ex:') ? `${(qByKey(key) || {}).src || '기출'} ${+key.split(':')[2] + 1}번` : `${key.split(':')[0]}과 ${+key.split(':')[1] + 1}번`);
      fxAfter(r.ok, r.ok ? '.q-card .choice.right, .q-card .verdict' : '.q-card .choice.wrong, .q-card .verdict');
      if (!r.ok) S.wrong[key] = 0;
      else if (key in S.wrong) { S.wrong[key]++; if (S.wrong[key] >= 2) delete S.wrong[key]; }
      save(); done(r);
    };
    main.querySelectorAll('.q-card .choice[data-k]').forEach((b) => (b.onclick = () => { const k = +b.dataset.k; record({ pick: k, ok: k === q.answer }); }));
    const inp = $('#sh-in');
    if (inp && !inp.disabled) {
      const go = () => { const v = inp.value; if (!v.trim()) return; record({ typed: v, ok: q.answer.some((a) => sameSentence(a, v)) }); };
      inp.onkeydown = (e) => e.key === 'Enter' && go(); $('#sh-go').onclick = go;
      $('#sh-give').onclick = () => record({ typed: '', ok: false });
    }
  }

  // ───────── 숙제 ─────────
  // content/homework.json 의 요일별 숙제. 해야 할 일마다 앱 기록(S.ws·mem·qa·wrong)으로 끝났는지 스스로 판단합니다.
  const todayKey = () => dayKey(Date.now());
  function hwToday() { if (!HW) return null; const t = todayKey(); return HW.days.find((d) => d.date === t) || null; }
  function hwCheck(c) {
    if (c.type === 'ws') {
      const sc = (S.ws || {})[c.id], at = (S.wsAt || {})[c.id] || 0;
      if (c.since && at < new Date(c.since + 'T00:00:00').getTime()) return { ok: false, txt: sc ? `수업 때 ${sc.ok}/${sc.total} → 다시 풀기` : '아직 채점 안 함' }; // 복기: 그날 다시 풀어야 함
      return { ok: !!sc && sc.total > 0 && sc.ok / sc.total >= c.min, txt: sc ? `${sc.ok}/${sc.total}` : '아직 채점 안 함' };
    }
    if (c.type === 'mem') { const n = c.ids.filter((id) => S.mem[id]).length; return { ok: n >= c.min, txt: `${n}/${c.min}문장` }; }
    if (c.type === 'qa') { const done = c.keys.filter((k) => S.qa[k]), ok = done.filter((k) => S.qa[k].ok).length; return { ok: done.length >= c.min, txt: `${done.length}/${c.min}문제 풂 · ${ok}개 맞힘` }; }
    if (c.type === 'drill') { const n = c.ids.filter((id) => (S.dm || {})[`${c.mode}:${id}`]).length; return { ok: n >= c.min, txt: `${n}/${c.min}문장` }; }
    if (c.type === 'note') { const n = c.ids.filter((id) => { const x = (S.notes || {})[id]; return x && x.marks && x.marks.length; }).length; return { ok: n >= c.min, txt: `${n}/${c.min}문장 표시` }; }
    if (c.type === 'review') {
      const need = c.ids.filter(hasNote), since = new Date((c.since || dayKey(Date.now())) + 'T00:00:00').getTime();
      const n = need.filter((id) => ((S.rev || {})[id] || 0) >= since).length;
      return { ok: need.length > 0 && n >= need.length, txt: need.length ? `${n}/${need.length}문장 복기` : '수업 필기 없음' };
    }
    if (c.type === 'wrongClear') { const n = Object.keys(S.wrong).length; return { ok: n === 0, txt: n ? `오답 ${n}개 남음` : '오답 0개' }; }
    return { ok: false, txt: '' };
  }
  // 오답노트 비우기는 그날 나머지 숙제를 다 한 뒤에만 완료로 칩니다 (처음부터 오답 0개라 저절로 체크되는 것 막기)
  const hwDayOf = (t) => HW.days.find((d) => d.tasks.includes(t));
  const hwTaskOk = (t) => t.checks.every((c) => hwCheck(c).ok) &&
    (!t.checks.some((c) => c.type === 'wrongClear') || hwDayOf(t).tasks.filter((x) => x !== t && !x.checks.some((c) => c.type === 'wrongClear')).every((x) => x.checks.every((c) => hwCheck(c).ok)));
  function hwGo(t) {
    const g = t.go || {};
    if (g.lesson && g.lesson !== S.lesson) { S.lesson = g.lesson; UI.rpart = 0; }
    ['words', 'read', 'drill', 'grammar', 'comm'].forEach((k) => { if (g[k]) UI[k] = g[k]; });
    if (g.rpart != null) UI.rpart = g.rpart;
    UI.noteReview = !!g.review;
    UI.quiz = null; UI.onlyKey = false; UI.onlyTodo = false;
    t.checks.forEach((c) => { if (c.type === 'ws' && c.since && ((S.wsAt || {})[c.id] || 0) < new Date(c.since + 'T00:00:00').getTime() && S.wsv) delete S.wsv[c.id]; }); // 복기는 빈칸부터
    go(g.tab || 'home');
    if (g.quizOnly) { UI.quizOnly = g.quizOnly; UI.quiz = null; render(); }
  }
  function hwMessage(d) {
    const at = S.hwDone && S.hwDone[d.id] ? new Date(S.hwDone[d.id]) : new Date();
    const hm = `${at.getMonth() + 1}/${at.getDate()} ${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
    return `[말랑 내신] ${HW.student} ${d.label}(${d.dateLabel}) 숙제 다 했어요! ✅\n끝낸 시각: ${hm}\n` +
      d.tasks.map((t) => `✓ ${t.t} — ${t.checks.map((c) => hwCheck(c).txt).join(', ')}`).join('\n');
  }
  function hwView() {
    if (!HW) { main.innerHTML = head('숙제', '') + `<div class="empty">아직 숙제가 없어요.</div>`; return; }
    S.hwDone = S.hwDone || {};
    const t = todayKey(), due = new Date(HW.due + 'T00:00:00'), dd = Math.round((due - new Date(t + 'T00:00:00')) / 864e5);
    let justDone = null;
    HW.days.forEach((d) => { if (d.tasks.every(hwTaskOk) && !S.hwDone[d.id]) { S.hwDone[d.id] = Date.now(); justDone = d; } });
    if (justDone && !TEACHER) { save(); logEv('숙제', 1, 1, `${justDone.label} 완료`); }
    let html = `<section class="banner hw-hero"><div><p class="hw-eyebrow">${esc(HW.student)}의 숙제 · ${esc(HW.dueLabel)}까지</p><h1>${esc(HW.title)}</h1>
      <p>${dd > 0 ? `D-${dd}` : dd === 0 ? '오늘 수업!' : '마감 지남'} · ${TEACHER ? `${esc(S.who)}이가 한 만큼 실시간으로 채워져요` : '하루치를 다 하면 「선생님께 알리기」를 눌러 카톡으로 보내 주세요'}</p></div><span class="banner-ghost"></span></section>`;
    html += `<div class="hw-days">${HW.days.map((d) => {
      const okN = d.tasks.filter(hwTaskOk).length, all = okN === d.tasks.length, isToday = d.date === t, late = !all && d.date < t;
      return `<section class="card hw-day ${all ? 'done' : ''} ${isToday ? 'today' : ''}" data-day="${d.id}">
        <div class="hw-day-h"><div><b>${esc(d.label)}</b> <span class="hint">${esc(d.dateLabel)}</span> ${isToday ? '<span class="badge ok">오늘</span>' : ''}${late ? '<span class="badge err">밀린 숙제</span>' : ''}
          <div class="hw-goal">${esc(d.goal)}</div></div>
          <div class="hw-ring" style="--p:${Math.round(okN / d.tasks.length * 100)}"><span>${okN}/${d.tasks.length}</span></div></div>
        <div class="hw-tasks">${d.tasks.map((tk, i) => { const ok = hwTaskOk(tk), info = tk.checks.map((c) => hwCheck(c).txt).join(' · ');
          return `<button class="hw-task ${ok ? 'ok' : ''}" data-day="${d.id}" data-i="${i}" type="button"><span class="hw-box">${ok ? '✓' : i + 1}</span>
            <span class="hw-body"><span class="hw-t">${esc(tk.t)}</span><span class="hw-d">${esc(tk.d)}</span><span class="hw-s">${esc(info)}</span></span><span class="hw-go">${ok ? '다시 보기' : '하러 가기 ›'}</span></button>`; }).join('')}</div>
        ${all ? `<div class="hw-done"><b>🎉 ${esc(d.label)} 끝!</b>${TEACHER ? `<span class="hint">${S.hwDone && S.hwDone[d.id] ? `끝낸 시각 ${new Date(S.hwDone[d.id]).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}</span>` : `<button class="btn primary" data-notify="${d.id}" type="button">선생님께 알리기</button>`}</div><textarea class="hw-msg" data-msg="${d.id}" rows="5" readonly hidden></textarea>` : ''}
      </section>`;
    }).join('')}</div>`;
    main.innerHTML = head('숙제', '') .replace('<div class="page-head"><div><h2>숙제</h2></div></div>', '') + html;
    main.querySelectorAll('.hw-task').forEach((b) => (b.onclick = () => { const d = HW.days.find((x) => x.id === b.dataset.day); hwGo(d.tasks[+b.dataset.i]); }));
    main.querySelectorAll('[data-notify]').forEach((b) => (b.onclick = async () => {
      const d = HW.days.find((x) => x.id === b.dataset.notify), msg = hwMessage(d), ta = main.querySelector(`[data-msg="${d.id}"]`);
      ta.value = msg; ta.hidden = false;
      try { await navigator.clipboard.writeText(msg); toast('복사했어요! 카톡 선생님 방에 붙여넣어 보내 주세요'); }
      catch { ta.focus(); ta.select(); toast('글을 길게 눌러 복사한 뒤 카톡으로 보내 주세요'); }
    }));
    if (justDone) { const el = main.querySelector(`[data-day="${justDone.id}"] .hw-done`); if (el) { burst(el, 40); cheer(`🎉 ${justDone.label} 숙제 끝!`); } }
  }

  // ───────── 기록 ─────────
  const dayKey = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  function logView() {
    const log = S.log || [];
    const today = dayKey(Date.now());
    const days = {}; log.forEach((e) => (days[dayKey(e.at)] = days[dayKey(e.at)] || []).push(e));
    const todays = days[today] || [];
    const sum = (arr) => arr.reduce((a, e) => [a[0] + e.ok, a[1] + e.n], [0, 0]);
    const [tok, tn] = sum(todays), [aok, an] = sum(log);
    let streak = 0; for (let d = new Date(); days[dayKey(d)]; d.setDate(d.getDate() - 1)) streak++;
    const wd = ['일', '월', '화', '수', '목', '금', '토'];
    let html = head('기록', `이 컴퓨터(브라우저)에 저장돼요 · 지금까지 ${log.length}번 기록`,
      `<button class="btn" id="bk-save" type="button">기록 백업 내려받기</button><label class="btn" style="cursor:pointer">백업 불러오기<input id="bk-load" type="file" accept=".json" hidden></label>`);
    html += `<div class="stat-row">
      <div class="stat hot"><div class="k">오늘 푼 것</div><div class="val">${tn}<em>문항</em></div></div>
      <div class="stat"><div class="k">오늘 정답률</div><div class="val">${tn ? pct(tok, tn) : 0}<em>%</em></div></div>
      <div class="stat"><div class="k">연속 공부</div><div class="val">${streak}<em>일째</em></div></div>
      <div class="stat"><div class="k">전체 정답률</div><div class="val">${an ? pct(aok, an) : 0}<em>%</em></div></div>
      <div class="stat"><div class="k">오답노트</div><div class="val">${Object.keys(S.wrong).length}<em>문제</em></div></div></div>`;
    html += `<div class="card" style="padding:16px 18px;margin-bottom:16px"><h3 class="card-title">과별 진도</h3>${LESSONS.map((l) => {
      const q = quizStats(l), ws = wordsOf(l), kn = ws.filter((w) => S.known[wid(l, w)]).length;
      const wsd = Object.entries(S.ws || {}).filter(([k]) => k.startsWith(l.no + ':'));
      const wok = wsd.reduce((a, [, v]) => a + v.ok, 0), wn = wsd.reduce((a, [, v]) => a + v.total, 0);
      return `<div class="lrow"><b>${l.no}과</b><span>단어 ${kn}/${ws.length}</span><span>학습지 ${wn ? `${wok}/${wn}칸` : '—'}</span><span>실전 ${q.ok}/${q.total}</span><span class="bar"><span style="width:${pct(q.ok, q.total)}%"></span></span></div>`;
    }).join('')}</div>`;
    const keys = Object.keys(days).sort().reverse();
    if (!keys.length) html += `<div class="empty">아직 기록이 없어요. 아무 문제나 하나 풀면 여기에 바로 남아요 👻</div>`;
    keys.slice(0, 30).forEach((k) => {
      const arr = days[k], [o, n] = sum(arr), d = new Date(k);
      const groups = {}; arr.forEach((e) => { const g = `${e.l}과 · ${e.k}`; (groups[g] = groups[g] || [0, 0, 0]); groups[g][0] += e.ok; groups[g][1] += e.n; groups[g][2]++; });
      const misses = arr.filter((e) => e.ok < e.n && e.t).slice(-12);
      html += `<div class="card logday"><div class="logday-h"><b>${d.getMonth() + 1}월 ${d.getDate()}일 (${wd[d.getDay()]})</b><span class="badge ${n && o === n ? 'ok' : ''}">${o} / ${n} 맞힘 · ${pct(o, n)}%</span></div>
        <div class="loggrid">${Object.entries(groups).map(([g, v]) => `<div class="logg"><span>${esc(g)}</span><b>${v[0]}/${v[1]}</b></div>`).join('')}</div>
        ${misses.length ? `<div class="hint" style="margin-top:8px">틀린 것: ${misses.map((e) => esc(e.t)).join(' · ')}</div>` : ''}</div>`;
    });
    main.innerHTML = html;
    if (window.NAESIN_ARTIFACT) $('#bk-save').hidden = true; // Artifact 에서는 내려받기가 막힙니다
    $('#bk-save').onclick = () => {
      const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `말랑내신-기록-${S.who}-${today}.json`; a.click();
      toast('백업 파일을 내려받았어요');
    };
    $('#bk-load').onchange = async (e) => {
      try { const d = JSON.parse(await e.target.files[0].text()); Object.assign(S, d); save(); toast('백업을 불러왔어요'); render(); }
      catch { toast('백업 파일을 읽지 못했어요'); }
    };
  }

  // ───────── 오답노트 ─────────
  function wrong() {
    const keys = Object.keys(S.wrong);
    const items = keys.map(qByKey).filter(Boolean);
    if (!UI.wrongPicks) UI.wrongPicks = {};
    let html = head('오답노트', '5~8과에서 틀린 문제가 모여요. 두 번 연속 맞히면 빠져요.');
    if (!items.length) { main.innerHTML = html + `<div class="empty">아직 틀린 문제가 없어요 👻</div>`; return; }
    html += `<div class="qwrap list">${items.map((it, n) => `<div data-wk="${it.key}">${questionCard(it, UI.wrongPicks[it.key], n + 1)}${UI.wrongPicks[it.key] ? `<div class="hint" style="margin:6px 4px 0">연속 정답 ${S.wrong[it.key] ?? 2} / 2</div>` : ''}</div>`).join('')}</div>`;
    main.innerHTML = html;
    items.forEach((it) => {
      const box = main.querySelector(`[data-wk="${it.key}"]`);
      box.querySelectorAll('.choice[data-k]').forEach((b) => (b.onclick = () => {
        const k = +b.dataset.k, ok = k === it.q.answer;
        S.qa[it.key] = { ok, at: Date.now() };
        if (!ok) S.wrong[it.key] = 0; else { S.wrong[it.key] = (S.wrong[it.key] || 0) + 1; if (S.wrong[it.key] >= 2) { delete S.wrong[it.key]; toast('오답노트에서 빠졌어요!'); } }
        logEv('오답노트', ok ? 1 : 0, 1, it.key); fxAfter(ok, `[data-wk="${it.key}"] .choice.${ok ? 'right' : 'wrong'}`);
        save(); UI.wrongPicks[it.key] = { pick: k, ok }; const y = scrollY; render(); scrollTo(0, y);
      }));
      const inp = box.querySelector('#sh-in');
      if (inp && !inp.disabled) {
        inp.removeAttribute('id');
        const go = () => { const v = inp.value; const ok = it.q.answer.some((a) => sameSentence(a, v));
          S.qa[it.key] = { ok, at: Date.now() };
          if (!ok) S.wrong[it.key] = 0; else { S.wrong[it.key] = (S.wrong[it.key] || 0) + 1; if (S.wrong[it.key] >= 2) delete S.wrong[it.key]; }
          logEv('오답노트', ok ? 1 : 0, 1, it.key); fxAfter(ok, `[data-wk="${it.key}"] .verdict`);
          save(); UI.wrongPicks[it.key] = { typed: v, ok }; const y = scrollY; render(); scrollTo(0, y); };
        inp.onkeydown = (e) => e.key === 'Enter' && go();
        box.querySelector('#sh-go').onclick = go;
        box.querySelector('#sh-give').onclick = () => { inp.value = ''; go(); };
      }
    });
  }
  // 오답노트에서 다시 들어오면 새로 풀 수 있게
  $('#nav').addEventListener('click', (e) => { if (e.target.closest('[data-tab="wrong"]')) UI.wrongPicks = {}; }, true);

  // 단어 카드 — 스페이스로 뒤집기
  document.addEventListener('keydown', (e) => {
    if (S.tab === 'words' && UI.words === 'card' && e.code === 'Space' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); UI.cardFlip = !UI.cardFlip; render(); }
  });

  // ───────── 시작 ─────────
  setTimeout(() => { const s = $('#splash'); s.style.transition = 'opacity .35s'; s.style.opacity = 0; setTimeout(() => s.remove(), 360); $('.mark').classList.add('is-caught'); }, 650);
  // 두 기록 합치기 — 어느 쪽에서 한 것도 지우지 않고, 같은 항목은 더 나중에 한 쪽을 씁니다.
  function mergeInto(sd) {
    if (!sd) return false;
    const before = JSON.stringify(S);
    const or = (a = {}, b = {}) => { const o = { ...a }; for (const k in b) if (b[k] && (!o[k] || (typeof b[k] === 'number' && b[k] > o[k]))) o[k] = b[k]; return o; };
    S.mem = or(S.mem, sd.mem); S.known = or(S.known, sd.known); S.dm = or(S.dm, sd.dm); S.hwDone = or(S.hwDone, sd.hwDone); S.rev = or(S.rev, sd.rev);
    S.ws = S.ws || {}; S.wsAt = S.wsAt || {}; S.wsv = S.wsv || {};
    for (const k in sd.ws || {}) {
      const mine = S.wsAt[k] || 0, theirs = (sd.wsAt || {})[k] || 0;
      if (!S.ws[k] || theirs > mine || (!theirs && !mine && sd.ws[k].ok > S.ws[k].ok)) { S.ws[k] = sd.ws[k]; if (theirs) S.wsAt[k] = theirs; if ((sd.wsv || {})[k]) S.wsv[k] = sd.wsv[k]; }
    }
    for (const k in sd.wsv || {}) if (!S.wsv[k]) S.wsv[k] = sd.wsv[k];
    for (const k in sd.qa || {}) {
      if (!S.qa[k] || (sd.qa[k].at || 0) > (S.qa[k].at || 0)) { S.qa[k] = sd.qa[k]; if (k in (sd.wrong || {})) S.wrong[k] = sd.wrong[k]; else delete S.wrong[k]; }
    }
    S.notes = S.notes || {}; S.notesAt = S.notesAt || {};
    const empty = (x) => !x || (!(x.marks || []).length && !x.star && !(x.lines || []).some((l) => l.t));
    for (const k in sd.notes || {}) {
      const mine = S.notesAt[k] || 0, theirs = (sd.notesAt || {})[k] || 0;
      if ((empty(S.notes[k]) && !empty(sd.notes[k])) || theirs > mine) { S.notes[k] = sd.notes[k]; if (theirs) S.notesAt[k] = theirs; }
    }
    const seen = new Set((S.log || []).map((e) => `${e.at}|${e.t}`));
    S.log = [...(S.log || []), ...(sd.log || []).filter((e) => !seen.has(`${e.at}|${e.t}`))].sort((a, b) => a.at - b.at);
    return JSON.stringify(S) !== before;
  }
  // Mac 앱에서 한 기록(수업 필기 등)을 처음 열 때 합칩니다.
  (function mergeSeed() {
    const sd = DATA.seed; if (!sd || !sd.log) return;
    const sig = `${sd.log.length}:${(sd.log[sd.log.length - 1] || {}).at || 0}`;
    if (S.seedApplied === sig) return;
    mergeInto(sd); S.seedApplied = sig; save(true);
  })();

  // 선생님 표시 — 맨 위 띠 + 사이드바에 학생 고르기
  function teacherBar() {
    if (document.getElementById('teacher-bar')) return;
    const d = document.createElement('div'); d.id = 'teacher-bar'; d.className = 'teacher-bar';
    const opts = TEACHER.students.map((x) => `<option value="${esc(x.student)}" ${x.student === S.who ? 'selected' : ''}>${esc(x.student)}</option>`).join('');
    d.innerHTML = `<b>👩‍🏫 선생님 화면</b><span>학생 기록 보기 전용 · 여기서 누른 건 학생 기록에 저장되지 않아요</span><label>학생 <select id="t-stu">${opts}</select></label>`;
    document.body.prepend(d);
    d.querySelector('#t-stu').onchange = (e) => { location.search = `?s=${encodeURIComponent(e.target.value)}&k=${encodeURIComponent(S.syncKey)}`; };
    $('#who-name').textContent = `${S.who} (선생님이 보는 중)`; $('#who-edit').hidden = true;
  }

  // ───────── 서버 동기화 ─────────
  // 기록을 서버(Supabase)에 올리고 받아서, 맥·휴대폰·윤건이 폰 어디서 열어도 같은 기록이 보이게 합니다.
  // 학생마다 비밀 코드(k)가 있어 그 코드를 아는 링크로만 읽고 쓸 수 있습니다.
  const SYNC = DATA.sync || null;
  const params = new URLSearchParams(location.search);
  if (params.get('s')) S.who = params.get('s');
  if (params.get('k')) { S.syncKey = params.get('k'); save(true); }
  if (!S.syncKey && DATA.localKey) { S.syncKey = DATA.localKey; save(true); }
  // 예전 주소(Artifact)에서 넘겨준 기록 받기 — #r=<압축한 기록>
  async function takeHandoff() {
    const m = location.hash.match(/^#r=([\w-]+)/); if (!m) return;
    try {
      const b = Uint8Array.from(atob(m[1].replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
      const txt = await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
      mergeInto(JSON.parse(txt)); save(); toast('예전 주소에서 한 기록을 옮겨 왔어요');
    } catch (e) { toast('기록을 옮기지 못했어요'); }
    history.replaceState(null, '', location.pathname + location.search);
  }
  // Artifact 에서: 이 기기 기록을 새 주소로 들고 가는 버튼
  const NEW_HOME = DATA.newHome || null;
  async function handoffLink() {
    const o = shareable(); o.log = (o.log || []).slice(-400);
    const gz = await new Response(new Blob([JSON.stringify(o)]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
    let bin = ''; new Uint8Array(gz).forEach((c) => (bin += String.fromCharCode(c)));
    return `${NEW_HOME}#r=${btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
  }
  if (window.NAESIN_ARTIFACT && NEW_HOME) setTimeout(async () => {
    const d = document.createElement('div'); d.className = 'store-warn move-warn';
    d.innerHTML = `📦 새 주소로 옮겼어요! 이제 선생님과 기록이 같이 보여요. <a id="move-go" target="_blank" rel="noopener">여기를 눌러 내 기록 가지고 옮기기 →</a>`;
    document.body.prepend(d);
    try { d.querySelector('#move-go').href = await handoffLink(); } catch { d.querySelector('#move-go').href = NEW_HOME; }
  }, 300);
  let pushT = null, syncBusy = false;
  function syncMark(state, txt) { const el = document.getElementById('sync-state'); if (el) { el.dataset.state = state; el.textContent = txt; } }
  async function rpc(fn, body) {
    const r = await fetch(`${SYNC.url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: SYNC.key, Authorization: `Bearer ${SYNC.key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`${r.status}`);
    const t = await r.text(); return t ? JSON.parse(t) : null;
  }
  const shareable = () => { const o = { ...S }; ['tab', 'lesson', 'syncKey', 'seedApplied'].forEach((k) => delete o[k]); return o; };
  async function syncNow(redraw) {
    if (!SYNC || !S.syncKey) return;
    if (syncBusy) { clearTimeout(pushT); pushT = setTimeout(() => syncNow(redraw), 1200); return; } // 맞추는 중이면 끝나고 한 번 더
    syncBusy = true; syncMark('busy', '☁︎ 맞추는 중…');
    try {
      const remote = await rpc('naesin_get', { p_student: S.who, p_code: S.syncKey });
      const changed = mergeInto(remote);
      localStorage.setItem(KEY, JSON.stringify(S));
      if (!TEACHER) { await rpc('naesin_put', { p_student: S.who, p_code: S.syncKey, p_data: shareable() }); syncMark('ok', '☁︎ 저장됨'); }
      else { const t = new Date(); syncMark('ok', `☁︎ ${S.who} 기록 받음 ${t.getHours()}:${String(t.getMinutes()).padStart(2, '0')}`); }
      if (changed && redraw && !document.activeElement.matches('input, textarea')) { const y = scrollY; render(); scrollTo(0, y); }
    } catch (e) { syncMark('err', '☁︎ 연결 안 됨 (이 기기에는 저장됨)'); }
    syncBusy = false;
  }
  let TEACHER = null; // 선생님 링크로 열면 { students: [...] } — 보기 전용
  function schedulePush() { if (!SYNC || !S.syncKey || TEACHER) return; clearTimeout(pushT); syncMark('busy', '☁︎ 저장 중…'); pushT = setTimeout(() => syncNow(false), 1500); }
  setInterval(() => syncNow(true), 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) syncNow(true); });

  S.tab = HW && dayKey(Date.now()) <= HW.due ? 'hw' : 'home'; // 숙제가 있으면 숙제부터, 없으면 단원 홈
  render();
  (async () => {
    if (SYNC && S.syncKey) {
      try {
        const me = await rpc('naesin_whoami', { p_code: S.syncKey });
        if (me && me.role !== 'student') {
          TEACHER = { students: (await rpc('naesin_students', { p_code: S.syncKey })) || [] };
          if (!params.get('s') && TEACHER.students[0]) S.who = TEACHER.students[0].student;
          const remote = await rpc('naesin_get', { p_student: S.who, p_code: S.syncKey });
          ['mem', 'known', 'qa', 'wrong', 'log', 'ws', 'wsAt', 'wsv', 'notes', 'notesAt', 'dm', 'rev', 'hwDone'].forEach((k) => delete S[k]);
          S.qa = {}; S.wrong = {}; S.mem = {}; S.known = {}; mergeInto(remote || {});
          document.documentElement.classList.add('teacher');
          teacherBar(); render();
        }
      } catch (e) {}
    }
    await takeHandoff(); syncNow(true);
  })();
})();
