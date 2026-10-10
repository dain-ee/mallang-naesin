/* 말랑 내신 — 중2 동아(윤정미) 5~8과 내신 대비.
   서버 없이 index.html 만 열면 돕니다. 기록은 이 브라우저의 localStorage 에 남습니다.
   데이터는 data/data.js 의 window.NAESIN 입니다. */

(() => {
  'use strict';

  const DATA = window.NAESIN || { lessons: [] };
  { const bm = document.getElementById('boot-msg'); if (bm) bm.remove(); } // 웹 버전의 '불러오는 중' 안내
  const LESSONS = DATA.lessons;
  const EXAMS = DATA.exams || [];
  const HIST = DATA.history || null; // 역사 (단원·용어·흐름·문제)
  const HUNITS = HIST ? HIST.units : [], HEXAMS = HIST ? HIST.exams || [] : [];
  const PERF = DATA.perf || null; // 수행평가 원고 — 홈·숙제 맨 위 배너
  const HW = DATA.homework || null; // 선생님이 낸 요일별 숙제 // 기출비 등에서 받은 실제 시험지 (문항마다 lesson 표시)
  // 문제 키 → 문제. 'ex:시험지:번호' 는 기출 시험지, '과:번호' 는 직접 만든 문제.
  function qByKey(k) {
    const p = k.split(':');
    if (p[0] === 'h') { const U = HUNITS.find((u) => u.no === +p[1]), q = U && U.questions[+p[2]]; return q ? { q, key: k, no: U.no, lab: U.code, hist: true } : null; }
    if (p[0] === 'hx') { const e = HEXAMS.find((x) => x.id === p[1]), q = e && e.questions[+p[2]]; const U = q && HUNITS.find((u) => u.no === q.unit); return q ? { q, key: k, no: q.unit, lab: U ? U.code : '', src: e.title, hist: true } : null; }
    if (p[0] === 'ex') { const e = EXAMS.find((x) => x.id === p[1]) || EXAMS[+p[1]], q = e && e.questions[+p[2]]; return q ? { q, key: k, no: q.lesson, src: e.title } : null; }
    const L = LESSONS.find((l) => l.no === +p[0]); return L && L.questions[+p[1]] ? { q: L.questions[+p[1]], key: k, no: L.no } : null;
  }
  const KEY = 'mallang-naesin:v1';

  // ───────── 기록 ─────────
  const S = Object.assign(
    { who: '윤건', subj: 'en', hunit: HUNITS[0] ? HUNITS[0].no : 2, lesson: LESSONS[0] ? LESSONS[0].no : 5, tab: 'home', mem: {}, known: {}, qa: {}, wrong: {} },
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
  const UI = { scSel: {}, spage: 0, scHideKo: false, redo: {}, words: 'ws', comm: 'ws', grammar: 'ws', read: 'note', rpart: 0, coreOnly: true, drill: 'read', onlyKey: false, onlyTodo: false,
               card: 0, cardFlip: false, cardDir: 'en', test: null, quiz: null, quizCat: '전체', quizScope: EXAMS.length ? 'exam' : 'one', examSet: EXAMS.length ? EXAMS[0].id : 'all', revealed: {} };

  const $ = (s, r = document) => r.querySelector(s);
  const main = $('#main');
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // 지문에는 밑줄·굵게만 허용합니다.
  const rich = (s) => esc(s).replace(/&lt;(\/?)(u|b)&gt;/g, '<$1$2>');
  const lesson = () => LESSONS.find((l) => l.no === S.lesson) || LESSONS[0];
  const isHist = () => !!HIST && S.subj === 'hist';
  const hunit = () => HUNITS.find((u) => u.no === S.hunit) || HUNITS[0];
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 1600);
  }

  // ───────── 기록 · 반응 ─────────
  // 푼 것은 S.log 에 하나씩 쌓습니다(날짜·과·갈래·맞힘). 기록 탭이 이걸 그대로 보여 줍니다.
  function logEv(kind, ok, total, label) {
    S.log = S.log || [];
    S.log.push(isHist() ? { at: Date.now(), sj: 'hist', l: S.hunit, k: kind, ok, n: total, t: String(label || '').slice(0, 80) } : { at: Date.now(), l: S.lesson, k: kind, ok, n: total, t: String(label || '').slice(0, 80) });
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
    return variants(ans).flatMap((x) => x.split('/')).some((a) => { const n = norm(a); return n === v || (REL[n] || []).includes(v) || (/[가-힣]/.test(n) && n.replace(/ /g, '') === v.replace(/ /g, '')); });
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
  const sameSentence = (a, b) => variants(a).some((v) => norm(v) === norm(b) || relNorm(v) === relNorm(b) || (/[가-힣]/.test(v) && norm(v).replace(/ /g, '') === norm(b).replace(/ /g, '')));
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
  const SCW_TABS = [['list', '단어장'], ['mdef', '영영풀이 맞추기'], ['mko', '뜻 맞추기'], ['card', '카드 외우기'], ['spell', '스펠링 쓰기'], ['sws', '프린트 빈칸']];
  function wordsOf(L) {
    const mine = [...L.words.map((w) => ({ ...w, kind: 'w' })), ...(L.phrases || []).map((w) => ({ ...w, pos: '숙어', kind: 'p' }))];
    if (!(L.ws && ((L.ws.source && ['englishtutortv', 'rule', 'official'].includes(L.ws.source.words)) || L.ws.vocab.from))) return mine; // 학교 프린트 단어가 있으면 그것
    const by = Object.fromEntries(mine.map((w) => [norm(w.en), w]));
    return L.ws.vocab.list.filter((w) => w.core).map((w) => { const m = by[norm(w.en)] || {}; return { en: w.en, ko: w.ko, pos: m.pos || (w.en.includes(' ') ? '숙어' : ''), ex: w.ex || m.ex, exKo: w.ex ? w.exKo : m.exKo, kind: 'w' }; });
  }
  const wid = (L, w) => `${L.no}:w:${w.en}`;

  function quizStats(L) {
    let done = 0, ok = 0;
    L.questions.forEach((_, i) => { const r = S.qa[`${L.no}:${i}`]; if (r) { done++; if (r.ok) ok++; } });
    return { done, ok, total: L.questions.length };
  }

  // ───────── 사이드바 ─────────
  const NAV = {
    en: [['home', '⌂', '단원 홈'], ['school', '★', '학교 프린트'], ['words', '1', '단어'], ['comm', '2', '의사소통'], ['grammar', '3', '문법'], ['reading', '4', '본문'], ['quiz', '5', '실전 문제']],
    hist: [['hhome', '⌂', '단원 홈'], ['hconcept', '1', '개념 정리'], ['hterms', '2', '핵심 용어'], ['hflow', '3', '흐름 잇기'], ['hquiz', '4', '실전 문제']],
  };
  function syncSide() {
    const hs = isHist();
    document.documentElement.dataset.lesson = hs ? '' : S.lesson;
    document.documentElement.dataset.subj = hs ? 'hist' : 'en';
    const navKey = (hs ? 'h' : 'e') + (HW && !hs ? 1 : 0);
    if ($('#nav').dataset.k !== navKey) {
      $('#nav').dataset.k = navKey;
      $('#nav').innerHTML = (hs ? '' : `<button class="nav-item" data-tab="hw" type="button" id="nav-hw" hidden><i class="ni">✎</i>숙제<span id="hw-tally" class="tally" hidden>0</span></button>` + (PERF ? `<button class="nav-item" data-tab="perf" type="button"><i class="ni">✍</i>수행평가</button>` : '')) +
        NAV[hs ? 'hist' : 'en'].map(([t, i, n]) => `<button class="nav-item" data-tab="${t}" type="button"><i class="ni">${i}</i>${n}</button>`).join('') +
        `<button class="nav-item" data-tab="wrong" type="button"><i class="ni">✕</i>오답노트<span id="wrong-tally" class="tally" hidden>0</span></button><button class="nav-item" data-tab="log" type="button"><i class="ni">✓</i>기록</button>`;
    }
    if (HIST) { $('#subj').hidden = false; document.querySelectorAll('#subj [data-subj]').forEach((b) => b.classList.toggle('on', b.dataset.subj === (hs ? 'hist' : 'en'))); }
    const L = lesson(), U = hunit();
    $('#lesson-sub').textContent = hs ? (U ? `역사 ${U.code} · ${U.title}` : '자료 없음') : L ? `${L.no}과 · ${L.title}` : '자료 없음';
    document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('is-on', b.dataset.tab === S.tab));
    const schNav = document.querySelector('.nav-item[data-tab="school"]'); if (schNav) schNav.hidden = hs || !(L && L.school);
    const w = wrongKeys().length; const t = $('#wrong-tally'); t.hidden = !w; t.textContent = w;
    $('#who-name').textContent = S.who; if (SYNC && S.syncKey && !$('#who-edit').dataset.sure) $('#who-edit').textContent = '로그아웃';
    if (HW && !hs) { $('#nav-hw').hidden = false; const left = hwToday() ? hwToday().tasks.filter((t) => !hwTaskOk(t)).length : 0; const ht = $('#hw-tally'); ht.hidden = !left; ht.textContent = left; }
  }
  $('#nav').addEventListener('click', (e) => { const b = e.target.closest('.nav-item'); if (b) go(b.dataset.tab); });
  const brand = $('#brand'), menu = $('#lesson-menu');
  brand.addEventListener('click', () => {
    const open = menu.hidden; menu.hidden = !open; brand.setAttribute('aria-expanded', open);
    if (open && isHist()) menu.innerHTML = HUNITS.map((u) => `<button class="menu-item ${u.no === S.hunit ? 'on' : ''}" data-u="${u.no}" type="button"><span class="dot" style="--dot:var(--accent)"></span><span class="t">${esc(u.code)} ${esc(u.title)}</span></button>`).join('');
    else if (open) menu.innerHTML = LESSONS.map((l) => `<button class="menu-item ${l.no === S.lesson ? 'on' : ''}" data-l="${l.no}" type="button"><span class="dot" style="--dot:var(--accent)"></span><span class="t">${l.no}과 ${esc(l.title)}</span></button>`).join('');
  });
  menu.addEventListener('click', (e) => { const u = e.target.closest('[data-u]'); if (u) { menu.hidden = true; brand.setAttribute('aria-expanded', false); setUnit(+u.dataset.u); return; } const b = e.target.closest('[data-l]'); if (b) { menu.hidden = true; brand.setAttribute('aria-expanded', false); setLesson(+b.dataset.l); } });
  document.addEventListener('click', (e) => { if (!menu.hidden && !e.target.closest('.switch')) { menu.hidden = true; brand.setAttribute('aria-expanded', false); } });
  $('#who-edit').addEventListener('click', async () => {
    if (SYNC && S.syncKey) { // 웹: 「로그아웃」 — 서버에 마저 올리고, 이 기기에서 지운 뒤 코드 입력 화면으로 (다른 아이 코드로 들어갈 때 기록이 섞이지 않게)
      const btn = $('#who-edit');
      if (!btn.dataset.sure) { btn.dataset.sure = 1; btn.textContent = '한 번 더 누르면 로그아웃'; setTimeout(() => { delete btn.dataset.sure; btn.textContent = '로그아웃'; }, 3000); return; }
      btn.textContent = '저장 중…';
      try { await syncNow(false); } catch (e) {}
      if ($('#sync-state').dataset.state !== 'ok') { btn.textContent = '로그아웃'; delete btn.dataset.sure; toast('아직 서버에 저장되지 않았어요. 인터넷을 확인하고 다시 눌러 주세요'); return; }
      try { localStorage.removeItem(KEY); localStorage.removeItem('mallang-naesin:content'); } catch (e) {}
      location.replace(location.pathname); return;
    }
    const span = $('#who-name'); const inp = document.createElement('input');
    inp.value = S.who; inp.style.cssText = 'padding:4px 8px;font-size:13px;width:110px';
    span.replaceWith(inp); inp.focus();
    const done = () => { S.who = inp.value.trim() || S.who; save(); inp.replaceWith(span); syncSide(); };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') done(); }); inp.addEventListener('blur', done);
  });

  $('#subj').addEventListener('click', (e) => { const b = e.target.closest('[data-subj]'); if (b) setSubj(b.dataset.subj); });
  function setSubj(sj) {
    if (sj === S.subj) return;
    S.subj = sj; UI.test = null; UI.quiz = null; UI.htest = null; UI.hquiz = null; UI.quizOnly = null;
    if (!['wrong', 'log'].includes(S.tab) || (S.tab === 'hw' && sj === 'hist')) S.tab = sj === 'hist' ? 'hhome' : 'home';
    save(true); render(); window.scrollTo(0, 0);
  }
  function setUnit(no) { if (no !== S.hunit) loading(no, true); S.hunit = no; UI.htest = null; UI.hquiz = null; save(true); render(); }
  function setLesson(no) { if (no !== S.lesson) loading(no); S.lesson = no; UI.rpart = 0; UI.card = 0; UI.cardFlip = false; UI.test = null; UI.quiz = null; save(); render(); }
  function go(tab) { if (tab !== 'quiz' && tab !== 'hquiz') UI.quizOnly = null; if (tab !== 'reading') UI.paras = null; S.tab = tab; UI.test = null; save(); render(); window.scrollTo(0, 0); }

  // 단원을 바꾸면 유령이 잠깐 날아와 '5과 불러오는 중' — 바뀐 걸 확실히 느끼게.
  function loading(no, hs) {
    const L = hs ? HUNITS.find((u) => u.no === no) : LESSONS.find((l) => l.no === no);
    const o = document.createElement('div'); o.className = 'loader';
    o.innerHTML = `<div class="loader-card"><span class="loader-ghost"></span><b>${hs ? esc(L ? L.code : '') : `Lesson ${no}`}</b><span>${esc(L ? L.title : '')}</span><i class="loader-bar"><i></i></i></div>`;
    document.body.appendChild(o);
    setTimeout(() => o.classList.add('out'), 650); setTimeout(() => o.remove(), 950);
  }
  // ───────── 그리기 ─────────
  let lastView = '';
  function render() {
    syncSide();
    if (isHist()) {
      if (S.tab === 'hw' || (!['wrong', 'log'].includes(S.tab) && !S.tab.startsWith('h'))) S.tab = 'hhome';
      ({ hhome, hconcept, hterms, hflow, hquiz, wrong, log: logView })[S.tab]?.(hunit());
    } else {
      if (S.tab.startsWith('h') && S.tab !== 'hw') S.tab = 'home';
      const L = lesson();
      if (!L) { main.innerHTML = `<div class="empty">자료가 아직 없습니다.</div>`; return; }
      ({ hw: hwView, perf, home, school, words, comm, grammar, reading, quiz, wrong, log: logView })[S.tab]?.(L);
    }
    const view = `${S.subj}:${isHist() ? S.hunit : S.lesson}:${S.tab}`;
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
    if (name === 'hquizCat' || name === 'hquizScope' || name === 'hexamSet') UI.hquiz = null;
    if (name === 'ht') { UI.htest = null; UI.card = 0; UI.cardFlip = false; }
    if (name === 'rpart') UI.rpart = +UI.rpart;
    render();
  });


  // ───────── 수행평가 원고 ─────────
  const perfItems = () => PERF.sents.map((x, i) => ({ id: `pf:${i}`, en: x.en, ko: x.ko, group: '수행평가 원고', sp: `${i + 1}` }));
  function perfBanner() {
    if (!PERF || isHist()) return '';
    const t = new Date(todayKey() + 'T00:00:00'), it = perfItems(), m = memCount(it);
    const dd = PERF.dates.map((d) => { const n = Math.round((new Date(d.date + 'T00:00:00') - t) / 864e5); return `${d.label} ${n > 0 ? `D-${n}` : n === 0 ? '오늘!' : '끝'}`; }).join(' · ');
    return `<button class="perf-banner" data-perf type="button"><span class="perf-eyebrow">📝 수행평가 · ${esc(dd)}</span><b>${esc(PERF.title)}</b><span class="perf-sub">원고 ${PERF.sents.length}문장 외우기 — ${m}/${it.length} 외움</span><span class="perf-go">외우러 가기 ›</span></button>`;
  }
  function bindPerfBanner() { main.querySelectorAll('[data-perf]').forEach((b) => (b.onclick = () => go('perf'))); }
  function perf() {
    if (!PERF) { S.tab = 'home'; render(); return; }
    const it = perfItems();
    UI.perfMode = UI.perfMode || 'view';
    const tabs = seg('perfMode', [['view', '원고 보기'], ['drill', '외우기 연습']], UI.perfMode);
    const html = head(`수행평가 · ${esc(PERF.title)}`, esc(PERF.sub), tabs);
    if (UI.perfMode === 'view') {
      main.innerHTML = html + `<section class="card perf-card"><h3>원고 (한 문단)</h3><div class="perf-para">${esc(PERF.para)}</div></section>
        <section class="card perf-card"><h3>문장별 · 해석</h3><ol class="perf-list">${PERF.sents.map((x) => `<li><span class="en">${esc(x.en)}</span><span class="ko"><b>${esc(x.tag)}</b> · ${esc(x.ko)}</span></li>`).join('')}</ol></section>
        <section class="card perf-card"><h3>외울 단어</h3><div class="perf-voc">${PERF.voc.map(([e, k]) => `<span><b>${esc(e)}</b> ${esc(k)}</span>`).join('')}</div></section>
        <div class="sc-foot"><span></span><button class="btn ok" data-pm="drill" type="button">외우기 연습 →</button></div>`;
      main.querySelectorAll('[data-pm]').forEach((b) => (b.onclick = () => { UI.perfMode = b.dataset.pm; render(); scrollTo(0, 0); }));
      return;
    }
    main.innerHTML = html + drill(it);
    bindDrill(it);
  }

  // ───────── 단원 홈 ─────────
  function home(L) {
    const ws = wordsOf(L), wk = ws.filter((w) => S.known[wid(L, w)]).length;
    const cm = L.school ? scMemoItems(L, ['대화']) : [...itemsFor(L, 'fn'), ...itemsFor(L, 'dlg')], gm = L.school ? scMemoItems(L, ['문법 예문', '문법 문장']) : itemsFor(L, 'gram'), rd = itemsFor(L, 'reading');
    const scAll = L.school ? L.school.pages.map((p) => scPageStat(L, p)).reduce((x, y) => ({ n: x.n + y.n, done: x.done + y.done }), { n: 0, done: 0 }) : null;
    const q = quizStats(L);
    const step = (tab, no, t, d, a, b, unit = '') => `
      <button class="route" data-go="${tab}" type="button">
        <span class="route-no ${b && a >= b ? 'done' : ''}">${b && a >= b ? '✓' : no}</span>
        <span class="route-body"><span class="route-t">${t}</span><span class="route-d">${d}</span></span>
        <span class="route-prog"><span class="bar"><span style="width:${pct(a, b)}%"></span></span><span class="route-m">${a} / ${b}${unit}</span></span>
        <span class="route-go" aria-hidden="true">›</span>
      </button>`;
    main.innerHTML = perfBanner() + `
      <nav class="lesson-tabs" aria-label="단원">${LESSONS.map((l) => `<button class="ltab ${l.no === L.no ? 'on' : ''}" data-l="${l.no}" type="button"><b>${l.no}과</b><span>${esc(l.title)}</span></button>`).join('')}</nav>
      <section class="banner"><div><h1>Lesson ${L.no}. ${esc(L.title)}</h1><p>본문 「${esc(L.readingTitle)}」</p></div><span class="banner-ghost"></span></section>
      <h2 class="route-h">학습 순서</h2>
      <div class="routes">
        ${scAll ? step('school', '★', '학교 프린트', `${esc(L.school.school)} 선생님 프린트 ${L.school.pages.length}쪽 · 예문 외우기 · 조건 영작`, scAll.done, scAll.n, ' 풂') : ''}
        ${step('words', 1, '단어', L.school ? '선생님 프린트 단어 · 영영풀이 맞추기 · 카드 · 스펠링' : '학습지 · 카드 · 뜻 고르기 · 스펠링', wk, ws.length, ' 외움')}
        ${hasComm(L) ? step('comm', 2, '의사소통', `${L.comm.functions.map((f) => f.name).join(' · ')} · 대화문 ${L.comm.dialogs.length}개`, memCount(cm), cm.length, ' 문장') : ''}
        ${step('grammar', hasComm(L) ? 3 : 2, '문법', L.grammar.map((g) => g.title.replace(/\s*\(.*\)$/, '')).join(' · '), memCount(gm), gm.length, ' 예문')}
        ${step('reading', hasComm(L) ? 4 : 3, '본문', `「${esc(L.readingTitle)}」 필기 · 학습지 · 본문시험`, memCount(rd), rd.length, ' 문장')}
        ${step('quiz', hasComm(L) ? 5 : 4, '실전 문제', '학교 시험처럼 객관식 + 서술형', q.ok, q.total, ' 맞힘')}
      </div>`;
    main.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => go(b.dataset.go)));
    main.querySelectorAll('[data-l]').forEach((b) => (b.onclick = () => setLesson(+b.dataset.l)));
    bindPerfBanner();
  }

  // ───────── 단어 ─────────

  // ───────── 학교 프린트 (선생님이 학교에서 준 프린트를 한 글자도 빼지 않고) ─────────
  //  기록: S.sch[`sc:과:쪽:블록`] = { ok, v, at } — 기기 사이에서 합쳐짐(mergeInto)
  function scKey(L, pg, bi) { return `sc:${L.no}:${pg.no}:${bi}`; }
  function scPageStat(L, pg) {
    let n = 0, ok = 0, done = 0;
    pg.blocks.forEach((b, bi) => { if (!['blank', 'write', 'mc'].includes(b.type) || (b.type === 'blank' && !/\{\{/.test(b.s))) return; n++; const r = (S.sch || {})[scKey(L, pg, bi)]; if (r) { done++; if (r.ok) ok++; } });
    return { n, ok, done };
  }
  const scGloss = (g) => (g ? `<div class="sc-g">✎ ${esc(g)}</div>` : '');
  const scHead = (h) => (h ? `<div class="sc-h">${esc(h)}</div>` : '');
  // 프린트 설명(▶ 개념 · e.g. 예문 · ★ 필기)을 문법 카드처럼
  function scText(b) {
    const out = b.lines.map((ln) => {
      let m;
      if ((m = ln.match(/^▶\s*(.+?)\s*[:：]\s*(.*)$/))) {
        const forms = [...m[2].matchAll(/「([^」]+)」/g)].map((x) => x[1]);
        return `<div class="cc-pt"><div class="cc-h">${esc(m[1])}</div>${forms.map((f) => `<span class="gform">${esc(f)}</span>`).join(' ')}<p class="gpoint">${esc(m[2])}</p></div>`;
      }
      if (/^★/.test(ln)) return `<div class="sc-star">${esc(ln)}</div>`;
      if (/^(e\.g\.\s*)?[A-Z"'(]/.test(ln) && /[A-Za-z]{3}/.test(ln)) {
        const t = ln.replace(/^e\.g\.\s*/, ''), k = t.search(/[가-힣]/), en = k > 0 ? t.slice(0, k).trim() : t, ko = k > 0 ? t.slice(k).trim() : '';
        return `<div class="cc-ex"><div class="en">${esc(en).replace(/ = /g, '<br>= ')}</div>${ko ? `<div class="ko">${esc(ko)}</div>` : ''}</div>`;
      }
      return `<p class="gpoint cc-p">${esc(ln)}</p>`;
    });
    return `<div class="card gcard cc">${out.join('')}</div>`;
  }
  // 프린트 쪽들을 그리는 공통 부품 — 학교 프린트·단어·문법·의사소통·본문 칸이 같이 씀 (기록 키도 같음)
  function scPagesHtml(L, pages, { titles = true } = {}) {
    S.sch = S.sch || {};
    return pages.map((pg) => {
      let html = titles ? `<div class="sub-t sc-pgt">프린트 ${pg.no}쪽 · ${esc(pg.title)}</div>` : '';
      pg.blocks.forEach((b, bi) => {
        const k = scKey(L, pg, bi), r = S.sch[k];
        html += scHead(b.h);
        if (b.type === 'text') html += scText(b);
        else if (b.type === 'table') html += `<div class="htable-wrap"><table class="htable"><tr>${b.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>${b.rows.map((row) => `<tr>${row.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table></div>`;
        else if (b.type === 'vocab') html += `<div class="sc-vtools">${seg('scVoc', [['show', '뜻 보기'], ['hide', '뜻 가리기']], UI.scVoc || 'show')}${L.ws && L.ws.vocab.enDef && L.ws.vocab.enDef.length ? `<button class="btn ok sm2" data-gomatch type="button">영영풀이로 맞추기 →</button>` : ''}</div><table class="wtable sc-vocab ${UI.scVoc === 'hide' ? 'hidek' : ''}">${b.rows.map(([en, ko, ex, g]) => `<tr><td class="w">${esc(en)}</td><td><button class="sc-ko" type="button"><span>${esc(ko)}</span></button></td>${ex || g ? `<td>${ex ? `<div>${esc(ex)}</div>` : ''}${g ? `<div class="e">✎ ${esc(g)}</div>` : ''}</td>` : '<td></td>'}</tr>`).join('')}</table>`;
        else if (b.type === 'notes') html += `<div class="card sc-notes">${b.items.map(([en, n]) => `<div class="sc-note"><div class="en">${esc(en)}</div>${n ? `<div class="sc-star">★ ${esc(n)}</div>` : ''}</div>`).join('')}</div>`;
        else if (b.type === 'passage') html += `<div class="passage sc-pass">${esc(b.text).replace(/\n/g, '<br>')}</div>`;
        else if (b.type === 'blank') {
          const parts = b.s.split(/(\{\{[^}]+\}\})/); let j = 0;
          const body = parts.map((t) => { const m = t.match(/^\{\{(.+)\}\}$/); if (!m) return esc(t); const ans = m[1], i = j++, v = r && r.v ? r.v[i] || '' : '', good = r && accepts(v, ans);
            return `<input data-ans="${esc(ans)}" value="${esc(v)}" class="${r ? (good ? 'right' : 'wrong') : ''}" style="width:${Math.max(4, ans.split('/')[0].length) + 2}ch" autocomplete="off" spellcheck="false">`; }).join('');
          const wrongAns = r && !r.ok ? `<div class="fix">정답: ${esc(parts.filter((t) => /^\{\{/.test(t)).map((t) => t.slice(2, -2)).join(' · '))}</div>` : '';
          html += `<div class="item sc-item ${r && r.ok ? 'done' : ''}" data-sc="${k}"><div class="body"><div class="cloze sc-cl">${body}</div>${b.ko ? `<div class="ko">${esc(b.ko)}</div>` : ''}${scGloss(b.g)}${wrongAns}</div></div>`;
        } else if (b.type === 'write') {
          const v = r ? r.v : '';
          html += `<div class="item sc-item ${r && r.ok ? 'done' : ''}" data-sc="${k}"><div class="body"><div class="q-text sc-q">${esc(b.q).replace(/\n/g, '<br>')}</div><div class="write"><textarea rows="2" data-scw="${k}" spellcheck="false" placeholder="답을 쓰고 Enter">${esc(v || '')}</textarea></div><div class="diff-line" ${r ? '' : 'hidden'}>${r ? scWriteFb(b, v) : ''}</div>${scGloss(b.g)}</div></div>`;
        } else if (b.type === 'mc') {
          const picked = r ? r.v : null, multi = b.answer.length > 1, sel = UI.scSel[k] || [];
          html += `<div class="card q-card sc-mc" data-sc="${k}" style="padding:16px 18px"><p class="q-text">${esc(b.q)}</p>${b.passage ? `<div class="passage">${esc(b.passage).replace(/\n/g, '<br>')}</div>` : ''}<div class="choices">${b.choices.map((c, ci) => {
            let cls = ''; if (picked) { if (b.answer.includes(ci)) cls = 'right'; else if (picked.includes(ci)) cls = 'wrong'; } else if (sel.includes(ci)) cls = 'sel';
            return `<button class="choice ${cls}" data-scm="${k}" data-ci="${ci}" type="button" ${picked ? 'disabled' : ''}><span class="n">${b.choices.length === 2 ? '' : '①②③④⑤'[ci]}</span>${esc(c)}</button>`; }).join('')}</div>${multi && !picked ? `<div class="hint">답이 여러 개예요 — 모두 고른 뒤 <button class="btn ok" data-scok="${k}" type="button">채점</button></div>` : ''}${picked ? `<div class="hint">${b.exp ? `<div class="exp">${esc(b.exp)}</div>` : ''}<button class="link" data-scredo="${k}" type="button">다시 풀기</button></div>` : ''}${scGloss(b.g)}</div>`;
        }
      });
      return html;
    }).join('');
  }
  function scBind(L) {
    const pgOf = (k) => L.school.pages.find((p) => p.no === +k.split(':')[2]);
    const blockOf = (k) => pgOf(k).blocks[+k.split(':')[3]];
    const keep = (k, rec) => { S.sch[k] = { ...rec, at: Date.now() }; logEv('학교 프린트', rec.ok ? 1 : 0, 1, `${L.no}과 프린트 ${pgOf(k).no}쪽`); save(); };
    const again = () => { const y = scrollY; render(); scrollTo(0, y); };
    main.querySelectorAll('.sc-vocab .sc-ko').forEach((b) => (b.onclick = () => b.classList.toggle('peek'))); // 가린 뜻은 눌러서 잠깐 보기 (다시 그리지 않음)
    main.querySelectorAll('[data-gomatch]').forEach((b) => (b.onclick = () => { UI.words = 'mdef'; go('words'); }));
    main.querySelectorAll('[data-scredo]').forEach((b) => (b.onclick = () => { delete S.sch[b.dataset.scredo]; save(); again(); }));
    main.querySelectorAll('.sc-item .sc-cl').forEach((box) => {
      const k = box.closest('[data-sc]').dataset.sc, ins = [...box.querySelectorAll('input')];
      if (!ins.length) return;
      const grade = () => {
        const ok = ins.every((i) => accepts(i.value, i.dataset.ans));
        keep(k, { ok: ok ? 1 : 0, v: ins.map((i) => i.value) }); fxAfter(ok, `[data-sc="${k}"]`); again();
        if (!ok) return;
        const next = [...main.querySelectorAll('.sc-item input')].find((i) => !i.classList.contains('right') && !i.value); if (next) next.focus({ preventScroll: true });
      };
      ins.forEach((i, n) => (i.onkeydown = (e) => { if (e.key !== 'Enter' || e.isComposing) return; e.preventDefault(); if (n < ins.length - 1) ins[n + 1].focus(); else grade(); }));
      ins.forEach((i) => i.addEventListener('change', () => { if (ins.every((x) => x.value.trim()) && !box.contains(document.activeElement)) grade(); })); // 다 채우고 다른 데를 누르면 자동 채점
    });
    main.querySelectorAll('[data-scw]').forEach((ta) => (ta.onkeydown = (e) => {
      if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return; e.preventDefault(); if (!ta.value.trim()) return;
      const k = ta.dataset.scw, ok = scWriteOk(blockOf(k), ta.value);
      keep(k, { ok: ok ? 1 : 0, v: ta.value }); fxAfter(ok, `[data-sc="${k}"]`); again();
    }));
    main.querySelectorAll('[data-scm]').forEach((btn) => (btn.onclick = () => {
      const k = btn.dataset.scm, b = blockOf(k), ci = +btn.dataset.ci;
      if (b.answer.length > 1) { const sel = UI.scSel[k] = UI.scSel[k] || []; const at = sel.indexOf(ci); if (at < 0) sel.push(ci); else sel.splice(at, 1); again(); return; }
      const ok = b.answer[0] === ci; keep(k, { ok: ok ? 1 : 0, v: [ci] }); fxAfter(ok, `[data-scm="${k}"][data-ci="${ci}"]`); again();
    }));
    main.querySelectorAll('[data-scok]').forEach((btn) => (btn.onclick = () => {
      const k = btn.dataset.scok, b = blockOf(k), sel = (UI.scSel[k] || []).slice().sort();
      if (!sel.length) return;
      const ok = sel.length === b.answer.length && b.answer.every((a) => sel.includes(a)); keep(k, { ok: ok ? 1 : 0, v: sel }); delete UI.scSel[k]; fxAfter(ok, `[data-sc="${k}"]`); again();
    }));
    bindMatch(L); bindCond(L);
  }
  const scPages = (L, nos) => (L.school ? L.school.pages.filter((p) => nos.includes(p.no)) : []);
  const scSect = (L, k) => (L.school && L.school.sections ? L.school.sections[k] || [] : []);

  // ── 맞추기: 영영풀이(또는 뜻)를 하나씩 보여 주고, 단어 칩을 눌러 고름 — 맞힌 건 목록에 채워짐
  function matchPairs(L, kind) {
    const v = L.ws && L.ws.vocab; if (!v) return [];
    const koOf = (en) => (v.list.find((w) => norm(w.en) === norm(en)) || {}).ko || '';
    if (kind === 'def') return (v.enDef || []).map((d) => ({ q: d.def, a: d.answer, ko: d.ko || koOf(d.answer) }));
    return v.list.map((w) => ({ q: w.ko, a: w.en, ko: w.ex || '' }));
  }
  function matchBox(L, kind) {
    const key = `mt:${L.no}:${kind}`, pairs = matchPairs(L, kind); S.mt = S.mt || {}; UI.mtCur = UI.mtCur || {};
    const done = (i) => !!(S.mt[`${key}:${i}`] || {}).ok, left = pairs.map((_, i) => i).filter((i) => !done(i));
    const cur = left.includes(UI.mtCur[key]) ? UI.mtCur[key] : left[0];
    const words = shuffle([...new Set(pairs.map((x) => x.a))].map((t) => ({ t })), key).map((o) => o.t);
    const usedUp = (w) => pairs.every((x, i) => norm(x.a) !== norm(w) || done(i));
    let html = `<div class="card mt-wrap" data-mt="${key}"><div class="mt-top"><b>${kind === 'def' ? '선생님 영영풀이 보고 단어 고르기' : '뜻 보고 단어 고르기'}</b><span class="grow"></span><span class="badge ok">${pairs.length - left.length} / ${pairs.length}</span> <button class="link" data-mtreset type="button">처음부터</button></div>`;
    html += cur == null ? `<div class="empty">다 맞혔어요! 🎉</div>` : `<div class="mt-q"><span class="mt-n">${pairs.length - left.length + 1}</span>${esc(pairs[cur].q)}</div><div class="mt-chips">${words.map((w) => `<button class="chip mt-chip ${usedUp(w) ? 'used' : ''}" data-mtw="${esc(w)}" type="button">${esc(w)}</button>`).join('')}</div>`;
    html += `<div class="mt-list">${pairs.map((x, i) => `<button class="mt-row ${done(i) ? 'ok' : ''} ${i === cur ? 'on' : ''}" data-mti="${i}" type="button"><span class="mt-a">${done(i) ? esc(x.a) : '?'}</span><span class="mt-d">${esc(x.q)}${done(i) && x.ko ? `<span class="mt-ko">${esc(x.ko)}</span>` : ''}</span></button>`).join('')}</div></div>`;
    return html;
  }
  function bindMatch(L) {
    main.querySelectorAll('[data-mt]').forEach((box) => {
      const key = box.dataset.mt, pairs = matchPairs(L, key.split(':')[2]);
      const cur = () => { const left = pairs.map((_, i) => i).filter((i) => !(S.mt[`${key}:${i}`] || {}).ok); return left.includes(UI.mtCur[key]) ? UI.mtCur[key] : left[0]; };
      const again = () => { const y = scrollY; render(); scrollTo(0, y); };
      box.querySelectorAll('[data-mti]').forEach((b) => (b.onclick = () => { if ((S.mt[`${key}:${b.dataset.mti}`] || {}).ok) return; UI.mtCur[key] = +b.dataset.mti; again(); }));
      box.querySelectorAll('[data-mtw]').forEach((b) => (b.onclick = () => {
        const i = cur(); if (i == null) return;
        const ok = norm(b.dataset.mtw) === norm(pairs[i].a), r = S.mt[`${key}:${i}`] || {};
        S.mt[`${key}:${i}`] = ok ? { ok: 1, miss: r.miss || 0, at: Date.now() } : { ok: 0, miss: (r.miss || 0) + 1, at: Date.now() };
        logEv('단어 맞추기', ok ? 1 : 0, 1, pairs[i].a); save();
        if (!ok) { react(false, b); return; }
        UI.mtCur[key] = null; fxAfter(true, `[data-mt="${key}"] .mt-row[data-mti="${i}"]`); again();
      }));
      const rs = box.querySelector('[data-mtreset]'); if (rs) rs.onclick = () => { pairs.forEach((_, i) => delete S.mt[`${key}:${i}`]); save(); again(); };
    });
  }
  // ── 조건 영작: that 금지 · 현재분사로 · O단어로(관계대명사 생략) 처럼 조건을 걸어 기계적으로 쓰는 버릇을 막음
  function condCheck(c, v) {
    const n = ` ${norm(v)} `, words = norm(v).split(' ').filter(Boolean), why = [];
    (c.ban || []).forEach((w) => { if (n.includes(` ${norm(w)} `)) why.push(`「${w}」는 쓰면 안 돼요`); });
    (c.need || []).forEach((w) => { if (!n.includes(` ${norm(w)} `)) why.push(`「${w}」가 들어가야 해요`); });
    if (c.words && words.length !== c.words) why.push(`${c.words}단어로 써야 해요 (지금 ${words.length}단어)`);
    return { ok: !why.length && c.ans.some((a) => norm(a) === norm(v)), why };
  }
  function condBox(L, from = 0, to = 999) {
    const SC = L.school; if (!SC || !SC.cond) return '<div class="empty">조건 영작 문제가 아직 없어요.</div>';
    S.sch = S.sch || {};
    return `<div class="list">${SC.cond.slice(from, to).map((c, i) => {
      const r = S.sch[c.id], v = r ? r.v : '', res = r ? condCheck(c, v) : null;
      const near = r ? c.ans.slice().sort((a, b) => lcsDiff(norm(v).split(' '), norm(b).split(' ')).filter(([k]) => k === 'ok').length - lcsDiff(norm(v).split(' '), norm(a).split(' ')).filter(([k]) => k === 'ok').length)[0] : '';
      const fb = !r ? '' : res.ok ? '<b class="ok">조건까지 완벽해요! ✓</b>' : `${res.why.length ? `<div class="fix">⚠️ ${res.why.map(esc).join(' · ')}</div>` : ''}${wrOk(v, near) ? `<div class="hint">정답: ${esc(near)}</div>` : wrDiff(v, near)}`;
      return `<div class="item sc-item ${r && r.ok ? 'done' : ''}" data-cd="${c.id}"><span class="idx">${from + i + 1}</span><div class="body"><div class="cd-rule">조건 · ${esc(c.rule)}</div><div class="q-text sc-q">${esc(c.q)}</div><div class="write"><textarea rows="2" data-cdw="${c.id}" spellcheck="false" placeholder="조건에 맞게 쓰고 Enter">${esc(v || '')}</textarea></div><div class="diff-line" ${r ? '' : 'hidden'}>${fb}</div></div></div>`;
    }).join('')}</div>`;
  }
  function bindCond(L) {
    main.querySelectorAll('[data-cdw]').forEach((ta) => (ta.onkeydown = (e) => {
      if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return; e.preventDefault(); if (!ta.value.trim()) return;
      const c = L.school.cond.find((x) => x.id === ta.dataset.cdw), r = condCheck(c, ta.value);
      S.sch[c.id] = { ok: r.ok ? 1 : 0, v: ta.value, at: Date.now() }; logEv('조건 영작', r.ok ? 1 : 0, 1, c.rule); save();
      fxAfter(r.ok, `[data-cd="${c.id}"]`); const y = scrollY; render(); scrollTo(0, y);
    }));
  }
  // ── 예문 외우기: 프린트 문장을 읽기·가리기·빈칸·배열·통영작으로 (암기 연습과 같은 부품)
  const SC_GROUPS = ['단어 예문', '문법 예문', '문법 문장', '대화', '본문'];
  function scMemoItems(L, groups) { return ((L.school || {}).sentences || []).filter((x) => groups.includes(x.group)); }

  function school(L) {
    const SC = L.school;
    if (!SC) { main.innerHTML = head(`학교 프린트 · ${L.no}과`, '') + `<div class="empty">${L.no}과 학교 프린트는 아직 없어요.<br>선생님이 프린트를 주시면 그대로 넣을게요.</div>`; return; }
    S.sch = S.sch || {};
    const mode = UI.scMode || 'print';
    const tabs = seg('scMode', [['print', '프린트 그대로'], ['memo', '예문 외우기'], ['cond', '조건 영작'], ['mdef', '영영풀이 맞추기']], mode);
    let html = head(`학교 프린트 · ${L.no}과`, `${esc(SC.school)} 선생님 프린트 — ${SC.pages.length}쪽`, tabs);
    if (mode === 'memo') {
      const g = UI.scGroup || '전체', items = scMemoItems(L, g === '전체' ? SC_GROUPS : [g]);
      main.innerHTML = html + `<div class="bar-row">${seg('scGroup', [['전체', '전체'], ...SC_GROUPS.map((x) => [x, x])], g)}</div>` + drill(items); bindDrill(items); return;
    }
    if (mode === 'cond') { main.innerHTML = html + `<p class="hint" style="margin:0 2px 12px">조건을 꼭 지켜서 써요. that만 쓰기·동사원형만 쓰기로는 안 풀려요.</p>` + condBox(L); scBind(L); return; }
    if (mode === 'mdef') { main.innerHTML = html + matchBox(L, 'def') + matchBox(L, 'ko'); scBind(L); return; }
    const pi = Math.min(UI.spage || 0, SC.pages.length - 1), pg = SC.pages[pi], st = scPageStat(L, pg), hw = UI.scHw;
    if (hw) { const tot = scPages(L, hw.pages).map((p) => scPageStat(L, p)).reduce((a, b) => ({ n: a.n + b.n, done: a.done + b.done }), { n: 0, done: 0 });
      html += `<div class="hw-banner sc-hwb">📌 숙제: ${esc(hw.t)} — ${hw.pages.map((no) => { const j = SC.pages.findIndex((p) => p.no === no); return `<button class="chip ${j === pi ? 'on' : ''}" data-sp="${j}" type="button">${no}쪽</button>`; }).join(' ')} <span class="grow"></span><b>${tot.done}/${tot.n}문항</b> <button class="link" id="sc-hwoff" type="button">숙제 표시 끄기</button></div>`; }
    html += `<div class="sc-pages">${SC.pages.map((p, i) => { const s2 = scPageStat(L, p); const cls = s2.n && s2.ok === s2.n ? 'all' : s2.done ? 'some' : ''; return `<button type="button" class="sc-pg ${i === pi ? 'on' : ''} ${cls} ${hw && hw.pages.includes(p.no) ? 'hw' : ''}" data-sp="${i}">${p.no}</button>`; }).join('')}</div>` +
      (SC.missing ? `<div class="hw-banner">📷 아직 사진이 없는 쪽: ${esc(SC.missing.join(', '))}</div>` : '') +
      `<div class="bar-row"><b class="sc-title">${pg.no}. ${esc(pg.title)}</b><span class="grow"></span>${st.n ? `<span class="badge ok">${st.ok} / ${st.n} 맞힘</span> <button class="link" id="sc-reset" type="button">이 쪽 다시 풀기</button>` : ''}</div><div class="sc-body">` +
      scPagesHtml(L, [pg], { titles: false }) +
      `</div><div class="sc-foot">${pi > 0 ? `<button class="btn" data-sp="${pi - 1}" type="button">← ${SC.pages[pi - 1].no}쪽</button>` : '<span></span>'}${pi < SC.pages.length - 1 ? `<button class="btn ok" data-sp="${pi + 1}" type="button">${SC.pages[pi + 1].no}쪽 →</button>` : ''}</div>`;
    main.innerHTML = html;
    main.querySelectorAll('[data-sp]').forEach((b) => (b.onclick = () => { UI.spage = +b.dataset.sp; render(); scrollTo(0, 0); }));
    const rs = $('#sc-reset'); if (rs) rs.onclick = () => { pg.blocks.forEach((_, bi) => delete S.sch[scKey(L, pg, bi)]); save(); render(); };
    const ho = $('#sc-hwoff'); if (ho) ho.onclick = () => { UI.scHw = null; render(); };
    scBind(L);
  }
  function scWriteOk(b, v) {
    if (b.keys) return b.keys.every((w) => v.replace(/\s/g, '').includes(w));
    return b.ans.some((a) => sameSentence(a, v) || (/[가-힣]/.test(a) ? false : wrOk(v, a)));
  }
  function scWriteFb(b, v) {
    if (scWriteOk(b, v)) return `<b class="ok">맞았어요! ✓</b>${b.ans.length > 1 || /[\[(]/.test(b.ans[0]) ? ` <span class="hint">정답: ${esc(b.ans[0])}</span>` : ''}`;
    if (b.keys) return `<span class="hint">빠진 말: ${esc(b.keys.filter((w) => !v.replace(/\s/g, '').includes(w)).join(', '))}</span><div class="hint">선생님 답: ${esc(b.ans[0])}</div>`;
    // 여러 정답 중 내가 쓴 것과 가장 가까운 문장으로 비교 — 정답 줄은 하나만
    const cands = b.ans.flatMap(variants), near = (x) => { const A = norm(v).split(' '), B = norm(x).split(' '); return lcsDiff(A, B).filter(([k]) => k === 'ok').length - Math.abs(A.length - B.length) / 2; };
    return wrDiff(v, cands.sort((x, y) => near(y) - near(x))[0]);
  }

  function words(L) {
    const ws = wordsOf(L);
    if (L.school) { // 학교 프린트 단어만 — 단어장 · 영영풀이 맞추기 · 뜻 맞추기 · 카드 · 스펠링 · 프린트 빈칸
      if (!['list', 'mdef', 'mko', 'card', 'spell', 'sws'].includes(UI.words)) UI.words = 'list';
      if (['mdef', 'mko', 'sws'].includes(UI.words)) {
        const kn = ws.filter((w) => S.known[wid(L, w)]).length;
        main.innerHTML = head(`단어 · ${L.no}과`, `선생님 프린트 단어 ${ws.length}개 · ${kn}개 외움`, '') + `<div class="bar-row">${seg('words', SCW_TABS, UI.words)}</div>` +
          (UI.words === 'mdef' ? matchBox(L, 'def') : UI.words === 'mko' ? matchBox(L, 'ko') : scPagesHtml(L, scPages(L, scSect(L, 'words'))));
        scBind(L); return;
      }
    }
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
      `<div class="bar-row">${seg('words', L.school ? SCW_TABS : [...(L.ws ? [['ws', '학습지']] : []), ['list', '전체 목록'], ['card', '카드 외우기'], ['mean', '뜻 고르기'], ['spell', '스펠링 쓰기']], UI.words)}
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
    if (inp && T.answered == null) { inp.focus(); inp.onkeydown = (e) => { if (e.key === 'Enter' && !e.isComposing) check(); }; $('#t-check').onclick = check; }
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
  const wrOk = (v, en) => lcsDiff(norm(v).split(' ').filter(Boolean), norm(en).split(' ')).every(([k]) => k === 'ok') || sameSentence(v, en);
  // 채점 결과 — 내가 쓴 문장을 그대로 보여 주고, 틀린 말은 빨간 줄, 빠진 말은 초록 ＋로 끼워 넣음 (소문자로 바꾼 줄은 안 보여 줌)
  function wrDiff(v, en) {
    if (wrOk(v, en)) return '<b class="ok">완벽해요! ✓</b>';
    const mr = v.trim().split(/\s+/).filter((t) => norm(t)), ar = en.split(/\s+/).filter((t) => norm(t));
    const a = mr.map(norm), b = ar.map(norm), n = a.length, m = b.length;
    const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const out = []; let i = 0, j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && a[i] === b[j]) { out.push(esc(mr[i])); i++; j++; }
      else if (i < n && (j >= m || dp[i + 1][j] >= dp[i][j + 1])) { out.push(`<span class="bad">${esc(mr[i])}</span>`); i++; } // 잘못 쓴 말 먼저, 그 뒤에 고칠 말
      else { out.push(`<span class="add">＋${esc(ar[j])}</span>`); j++; }
    }
    return `<div class="mine">${out.join(' ')}</div><div class="hint">정답: ${esc(en)}</div>`;
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
        const last = (S.wr || {})[x.id]; // 지난번에 쓴 답 — 다시 들어와도 남아 있게
        inner = `<div class="ko">${star}${esc(x.ko)}</div><div class="write"><textarea rows="2" data-wr="${x.id}" spellcheck="false" placeholder="영어로 써 보세요 (Enter 로 채점)">${last ? esc(last.v) : ''}</textarea></div><div class="diff-line" ${last ? '' : 'hidden'}>${last ? wrDiff(last.v, x.en) : ''}</div>`;
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
        if (!ta.value.trim()) return;
        const ok = wrOk(ta.value, x.en);
        out.hidden = false; out.innerHTML = wrDiff(ta.value, x.en);
        S.wr = S.wr || {}; S.wr[x.id] = { v: ta.value, ok: ok ? 1 : 0, at: Date.now() }; save(); // 써 본 것은 숙제에 바로 셈
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
    if (L.school) { // 선생님 프린트 대화
      if (!['cb', 'cm'].includes(UI.comm)) UI.comm = 'cb';
      const tabs = seg('comm', [['cb', '대화 빈칸 (프린트)'], ['cm', '대화 외우기']], UI.comm), h = head(`의사소통 · ${L.no}과`, '학교 선생님 프린트 그대로', tabs);
      if (UI.comm === 'cm') { const items = scMemoItems(L, ['대화']); main.innerHTML = h + drill(items); bindDrill(items); return; }
      main.innerHTML = h + (L.school.missing ? `<div class="hw-banner">📷 아직 사진이 없는 쪽: ${esc(L.school.missing.join(', '))}</div>` : '') + scPagesHtml(L, scPages(L, scSect(L, 'comm'))); scBind(L); return;
    }
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
    if (L.school) { // 선생님 프린트 문법만
      if (!['tc', 'tm', 'tk', 'td'].includes(UI.grammar)) UI.grammar = 'tc';
      const tabs = seg('grammar', [['tc', '선생님 설명'], ['tm', '예문 외우기'], ['tk', 'Check Up · 워크북'], ['td', '조건 영작']], UI.grammar);
      const h = head(`문법 · ${L.no}과`, '학교 선생님 프린트 그대로', tabs);
      if (UI.grammar === 'tm') { const items = scMemoItems(L, ['문법 예문', '문법 문장']); main.innerHTML = h + drill(items); bindDrill(items); return; }
      main.innerHTML = h + (UI.grammar === 'tc' ? scPagesHtml(L, scPages(L, scSect(L, 'gc'))) : UI.grammar === 'tk' ? scPagesHtml(L, scPages(L, scSect(L, 'gk'))) : `<p class="hint" style="margin:0 2px 12px">조건을 꼭 지켜서 써요. that만 쓰기·동사원형만 쓰기로는 안 풀려요.</p>` + condBox(L));
      scBind(L); return;
    }
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
    let items = itemsFor(L, 'reading');
    if (UI.paras && UI.read === 'drill') items = items.filter((x) => UI.paras.includes(+x.id.split(':')[2].split('.')[0]));
    if (['ws', 'test'].includes(UI.read) && !L.ws) UI.read = 'note';
    const tabs = seg('read', [['note', '필기'], ...(L.school ? [['sprint', '프린트 빈칸·선생님 필기']] : []), ...(L.ws ? [['ws', '학습지'], ['test', '본문시험']] : []), ['drill', '암기 연습']], UI.read);
    if (UI.read === 'sprint' && L.school) { main.innerHTML = head(`본문 · ${esc(L.readingTitle)}`, '학교 선생님 프린트 — 빈칸 채우기와 수업 필기', tabs) + scPagesHtml(L, scPages(L, [...scSect(L, 'rb'), ...scSect(L, 'rn')].sort((a, b) => a - b))); scBind(L); return; }
    if (UI.read === 'note') { main.innerHTML = head(`본문 필기 · ${esc(L.readingTitle)}`, '문장을 드래그해 S·V·O·절을 표시하고, 아래 불릿에 필기해요', tabs) + noteView(L, items); bindNote(L, items); return; }
    if (UI.read === 'ws') { main.innerHTML = head(`본문 · ${esc(L.readingTitle)}`, 'Reading 학습지 — 핵심 암기 → 문법 + 본문 연습 → 필기 집중 연습', tabs) + wsReading(L); bindWs(L); return; }
    if (UI.read === 'test') { main.innerHTML = head(`본문시험 · ${L.no}과`, '우리말을 보고 본문 문장을 그대로 영작해요', tabs) + wsTest(L); bindWs(L); return; }
    main.innerHTML = head(`본문 · ${esc(L.readingTitle)}`, `${L.no}과 본문 ${items.length}문장 · ★ 는 시험에 잘 나오는 문장`, tabs) +
      (UI.paras ? `<div class="hw-banner">📌 숙제: ${esc(UI.partName || '')}만 보는 중 (${items.length}문장) <button class="link" id="para-all" type="button">본문 전체 보기</button></div>` : '') + drill(items);
    const pa = $('#para-all'); if (pa) pa.onclick = () => { UI.paras = null; render(); };
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
    return esc(q).replace(/_{3,}/g, () => { const ans = (a && a[i]) ?? ''; i++; const w = [...ans.split('/')[0]].reduce((n, c) => n + (/[가-힣]/.test(c) ? 1.9 : 1), 0); return `<input class="wb" data-ans="${esc(ans)}" style="width:${Math.max(4, w) + 2}ch" autocomplete="off" spellcheck="false">`; });
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
      (v.from ? part(`${L.no}:v:B`, 'B', '영영풀이 (선생님 프린트)', v.enDef.map((d, i) => rowBlank(`${i + 1}.`, `${d.def} : ______`, [d.answer], d.ko)).join('')) : '') + // 영영풀이는 선생님 프린트의 정의만
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
            else { fb.classList.add('diff-line'); fb.innerHTML = wrDiff(el.value, el.dataset.full); }
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
      // 칸을 다 채웠으면 「채점」을 안 눌러도 그 자리에서 채점·기록 (했는데 기록이 안 남는 일 막기)
      inputs.forEach((el) => el.addEventListener('change', () => { if (inputs.every((x) => x.value.trim())) grade(); }));
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
  // 영영풀이 문제는 선생님 학습지를 받은 뒤에 하기로 해서 지금은 빼 둡니다.
  const isEnDef = (q) => /영영/.test(q.q || '');
  // 숨기는 문제: 시험 범위 밖(q.off — 선생님이 안 다룬 문법) · 선생님 프린트와 다른 영영풀이
  const hideQ = (q) => !!q.off; // 영영풀이는 선생님 프린트와 다른 정의만 scope.json 에서 off
  function qPool(L) { return qPool0(L).filter(({ q }) => !hideQ(q)); }
  function qPool0(L) {
    if (UI.quizOnly) return UI.quizOnly.map(qByKey).filter(Boolean); // 숙제로 고른 문제만
    const src = UI.quizScope === 'exam' ? EXAMS.flatMap((e) => (UI.examSet === 'all' || UI.examSet === e.id ? e.questions : []).map((q, i) => ({ q, key: `ex:${e.id}:${i}`, no: q.lesson, src: e.title })))
      : UI.quizScope === 'all' ? LESSONS.flatMap((l) => l.questions.map((q, i) => ({ q, key: `${l.no}:${i}`, no: l.no }))) : L.questions.map((q, i) => ({ q, key: `${L.no}:${i}`, no: L.no }));
    return src.filter(({ q }) => UI.quizCat === '전체' || (UI.quizCat === '서술형' ? q.type === 'short' : q.cat === UI.quizCat));
  }
  function quiz(L) {
    if (!UI.quiz) { const pool = qPool(L); UI.quiz = { pool: UI.quizScope === 'all' || (UI.quizScope === 'exam' && UI.examSet === 'all') ? shuffle(pool) : pool, i: 0, picks: {} }; }
    const Q = UI.quiz;
    const st = quizStats(L);
    let html = head(`실전 문제${UI.quizScope === 'exam' ? ' · 기출 시험지' : UI.quizScope === 'all' ? ' · 5~8과 섞어서' : ` · ${L.no}과`}`, UI.quizScope === 'exam' ? (UI.examSet === 'all' ? `기출비 카페에서 골라 낸 좋은 문제 ${EXAMS.reduce((n, e) => n + e.questions.filter((q) => !hideQ(q)).length, 0)}개를 섞어서` : `출처: ${esc((EXAMS.find((e) => e.id === UI.examSet) || {}).source || '')}`) : `직접 만든 문제 · 이 단원 ${st.ok}/${st.total} 맞힘`,
      `<button class="btn" id="q-reset" type="button">처음부터 다시</button>`) +
      `<div class="bar-row">${seg('quizScope', [...(EXAMS.length ? [['exam', `기출 시험지 (${EXAMS.reduce((a, e) => a + e.questions.filter((q) => !hideQ(q)).length, 0)})`]] : []), ['one', '이 단원 (직접 만든 문제)'], ['all', '5~8과 섞기']], UI.quizScope)}${seg('quizCat', CATS.map((c) => [c, c]), UI.quizCat)}</div>` +
      (UI.quizScope === 'exam' && EXAMS.length > 1 ? `<div class="bar-row">${seg('examSet', [['all', '전체 섞기'], ...EXAMS.map((e) => [e.id, `${e.title} (${e.questions.filter((q) => !hideQ(q)).length})`])], UI.examSet)}</div>` : '');
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

  function questionCard({ q, no, src, lab, hist }, r, num) {
    const kind = q.type === 'short' ? (hist ? '단답형' : '서술형') : q.type === 'essay' ? '서술형' : q.cat;
    const showNo = hist ? UI.hquizScope !== 'one' || S.tab === 'wrong' : UI.quizScope !== 'one' || S.tab === 'wrong';
    let body = `<div class="q-head"><span class="cat">${esc(kind)}</span>${showNo ? `<span class="badge">${hist ? esc(lab) : `${no}과`}</span>` : ''}<span class="badge ${src ? 'ok' : ''}">${src ? '기출 시험지' : '직접 만든 문제'}</span><span class="q-no">${num}번</span></div>
      <p class="q-text">${rich(q.q)}</p>${q.passage ? `<div class="passage">${rich(q.passage)}</div>` : ''}`;
    if (q.type === 'essay') {
      body += `<div class="short essay"><textarea id="sh-in" rows="3" spellcheck="false" placeholder="문장으로 써 보세요" ${r ? 'disabled' : ''}>${esc(r ? r.typed : '')}</textarea><div class="actions" style="justify-content:flex-start"><button class="btn primary" id="sh-go" type="button" ${r ? 'hidden' : ''}>채점</button><button class="btn ghost" id="sh-give" type="button" ${r ? 'hidden' : ''}>모르겠어요</button></div></div>`;
      if (r) body += `<div class="verdict ${r.ok ? 'ok' : 'no'}">${r.ok ? '핵심어가 다 들어갔어요!' : `빠진 핵심어: ${esc(missingKeys(q, r.typed).join(', '))}`}<span class="tip">모범 답안: ${esc(q.answer[0])}</span></div>`;
    } else if (q.type === 'short') {
      const parts = shortParts(q), typed = r ? String(r.typed || '').split(' ‖ ') : [];
      body += `<div class="short2">${(parts || ['']).map((p, i) => `<div class="sp-row">${parts ? `<span class="sp-n">(${i + 1})</span>` : ''}<textarea class="sh-part" rows="${parts ? 1 : 2}" spellcheck="false" autocomplete="off" placeholder="${parts ? `(${i + 1})의 답` : '답을 쓰세요 · Enter 채점 · Shift+Enter 줄바꿈'}" ${r ? 'disabled' : ''}>${esc(typed[i] || '')}</textarea></div>`).join('')}
        ${r ? '' : `<div class="actions" style="justify-content:flex-start;margin-top:10px"><button class="btn primary sh-go" type="button">채점</button><button class="btn ghost sh-hint" type="button">💡 힌트</button><button class="btn ghost sh-give" type="button">모르겠어요</button></div><div class="sh-hintbox" hidden>${esc(shortHint(q))}</div>`}</div>`;
      if (r) body += `<div class="verdict ${r.ok ? 'ok' : 'no'}">${r.ok ? (r.self ? '✓ 내 답도 맞음 (스스로 채점)' : '정답!') : '아쉬워요 — 모범 답안과 다른 곳을 확인해요'}
        ${!r.ok && r.typed ? `<div class="diff-line sh-diff">${shortDiff(q, r.typed)}</div>` : ''}
        <span class="tip">모범 답안: ${q.answer.map(esc).join('  /  ')}</span>
        ${!r.ok && r.typed ? '<button class="btn sm2 sh-self" type="button">내 답도 맞아요</button>' : ''}</div>`;
    } else {
      body += `<div class="choices">${q.choices.map((c, k) => {
        let cls = ''; if (r) { if (k === q.answer) cls = 'right'; else if (k === r.pick) cls = 'wrong'; }
        return `<button class="choice ${cls}" data-k="${k}" type="button" ${r ? 'disabled' : ''}><span class="n">${'①②③④⑤'[k]}</span>${rich(c)}</button>`;
      }).join('')}</div>`;
    }
    if (r && q.exp) body += `<div class="exp"><b>해설</b>  ${rich(q.exp)}</div>`;
    return `<div class="card q-card">${body}</div>`;
  }
  // 서술형(essay)은 핵심어 묶음(keys: [[같은 뜻 여럿], …])이 모두 들어가면 정답
  const squash = (x) => norm(x).replace(/ /g, '');
  const missingKeys = (q, v) => (q.keys || []).filter((g) => !g.some((k) => squash(v).includes(squash(k)))).map((g) => g[0]);
  const shortOk = (q, v) => (q.type === 'essay' ? !!v.trim() && !missingKeys(q, v).length : q.answer.some((a) => sameSentence(a, v)));
  // ── 영어 서술형 ── 넓은 칸 · (1)(2) 나눠 쓰기 · 힌트 · 넉넉한 채점 · 스스로 맞음 표시
  const cleanAns = (x) => String(x).replace(/[ⓐ-ⓩ①-⑳]/g, ' ').replace(/^\s*[:→\->]+\s*/, '').trim();
  function shortParts(q) {
    const a = String(q.answer[0] || ''); if (!/\(1\)/.test(a)) return null;
    const ps = a.split(/\(\d\)/).map((t) => t.trim().replace(/[,\s]+$/, '')).filter(Boolean);
    return ps.length > 1 ? ps : null;
  }
  const looseEq = (a, v) => sameSentence(cleanAns(a), cleanAns(v)) || variants(cleanAns(a)).some((x) => squash(x) === squash(cleanAns(v)));
  function shortCheck(q, vals) {
    const parts = shortParts(q);
    if (!parts) return q.answer.some((a) => looseEq(a, vals.join(' ')));
    return parts.every((_, i) => q.answer.some((a) => { const ps = String(a).split(/\(\d\)/).map((t) => t.trim().replace(/[,\s]+$/, '')).filter(Boolean); return ps[i] != null && looseEq(ps[i], vals[i] || ''); }));
  }
  function shortHint(q) {
    const one = (t) => { const w = cleanAns(t).split(/\s+/).filter(Boolean); return `첫 글자 「${w[0] ? w[0][0] : ''}」 · ${w.length}단어`; };
    const parts = shortParts(q);
    return parts ? parts.map((p, i) => `(${i + 1}) ${one(p)}`).join('   ') : one(q.answer[0] || '');
  }
  function shortDiff(q, typed) {
    const model = shortParts(q) ? shortParts(q).join(' / ') : String(q.answer[0] || '');
    const d = lcsDiff(norm(cleanAns(typed.replace(/ ‖ /g, ' / '))).split(' ').filter(Boolean), norm(cleanAns(model)).split(' ').filter(Boolean));
    return d.map(([k, w]) => `<span class="${k}">${esc(w)}</span>`).join(' ');
  }
  function bindShortBox(box, q, submit) {
    const tas = [...box.querySelectorAll('.sh-part')];
    const self = box.querySelector('.sh-self');
    if (self) self.onclick = () => submit(tas.map((t) => t.value).join(' ‖ '), true, true);
    if (!tas.length || tas[0].disabled) return;
    const go = () => { const vals = tas.map((t) => t.value); if (!vals.some((v) => v.trim())) { shake(tas[0]); return; } submit(vals.join(' ‖ '), shortCheck(q, vals)); };
    tas.forEach((t, i) => {
      t.addEventListener('input', () => { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; });
      t.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); if (i < tas.length - 1) tas[i + 1].focus(); else go(); } };
    });
    box.querySelector('.sh-go').onclick = go;
    box.querySelector('.sh-give').onclick = () => submit('', false);
    box.querySelector('.sh-hint').onclick = () => { const h = box.querySelector('.sh-hintbox'); h.hidden = !h.hidden; };
  }

  function bindQuestion(item, done) {
    const { q, key } = item;
    const record = (r) => {
      S.qa[key] = { ok: r.ok, at: Date.now() };
      const it = qByKey(key) || {};
      logEv(/^h?x:|^ex:/.test(key) ? '기출 시험지' : '실전 문제', r.ok ? 1 : 0, 1, it.src ? `${it.src} ${+key.split(':')[2] + 1}번` : it.hist ? `${it.lab} ${+key.split(':')[2] + 1}번` : `${key.split(':')[0]}과 ${+key.split(':')[1] + 1}번`);
      fxAfter(r.ok, r.ok ? '.q-card .choice.right, .q-card .verdict' : '.q-card .choice.wrong, .q-card .verdict');
      if (!r.ok) S.wrong[key] = 0; // 오답노트에서 빠지는 건 오답노트 안에서 두 번 연속 맞혔을 때만
      save(); done(r);
    };
    main.querySelectorAll('.q-card .choice[data-k]').forEach((b) => (b.onclick = () => { const k = +b.dataset.k; record({ pick: k, ok: k === q.answer }); }));
    if (q.type === 'short') { const box = main.querySelector('.q-card'); if (box) bindShortBox(box, q, (typed, ok, self) => record({ typed, ok, self })); }
    const inp = $('#sh-in');
    if (inp && !inp.disabled) {
      const go = () => { const v = inp.value; if (!v.trim()) return; record({ typed: v, ok: shortOk(q, v) }); };
      inp.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); go(); } }; $('#sh-go').onclick = go;
      $('#sh-give').onclick = () => record({ typed: '', ok: false });
    }
  }


  // ═════════ 역사 ═════════
  // content/history/H*.json — 단원마다 개념(sections) · 핵심 용어(terms) · 흐름(flows) · 문제(questions).
  // 개념 문장의 {용어} 는 읽기에서는 굵게, 빈칸 채우기에서는 칸이 됩니다. {아바스 왕조|아바스} 처럼 | 뒤는 같이 받아 주는 답.
  const htid = (u, x) => `h${u.no}:t:${x.t}`;
  const keyText = (s) => esc(s).replace(/\{([^}]+)\}/g, (_, x) => `<b class="hk">${x.split('|')[0]}</b>`);
  function hConceptStats(u) {
    let n = 0, ok = 0;
    u.sections.forEach((sec, si) => { sec.blocks.forEach((b) => (b.pts || []).forEach((p) => (n += (p.match(/\{/g) || []).length))); const r = (S.ws || {})[`h${u.no}:c:${si}`]; if (r) ok += r.ok; });
    return { n, ok };
  }
  function hQuizStats(u) {
    let done = 0, ok = 0;
    u.questions.forEach((_, i) => { const r = S.qa[`h:${u.no}:${i}`]; if (r) { done++; if (r.ok) ok++; } });
    return { done, ok, total: u.questions.length };
  }
  const hFlowDone = (u) => (u.flows || []).filter((_, i) => (S.dm || {})[`flow:h${u.no}:f:${i}`]).length;

  function hhome(U) {
    const c = hConceptStats(U), tk = U.terms.filter((x) => S.known[htid(U, x)]).length, q = hQuizStats(U), fl = U.flows || [];
    const step = (tab, no, t, d, a, b, unit = '') => `
      <button class="route" data-go="${tab}" type="button">
        <span class="route-no ${b && a >= b ? 'done' : ''}">${b && a >= b ? '✓' : no}</span>
        <span class="route-body"><span class="route-t">${t}</span><span class="route-d">${d}</span></span>
        <span class="route-prog"><span class="bar"><span style="width:${pct(a, b)}%"></span></span><span class="route-m">${a} / ${b}${unit}</span></span>
        <span class="route-go" aria-hidden="true">›</span>
      </button>`;
    main.innerHTML = `
      <nav class="lesson-tabs" aria-label="단원">${HUNITS.map((u) => `<button class="ltab ${u.no === U.no ? 'on' : ''}" data-u="${u.no}" type="button"><b>${esc(u.code)}</b><span>${esc(u.title)}</span></button>`).join('')}</nav>
      <section class="banner"><div><h1>${esc(U.code)}. ${esc(U.title)}</h1><p>${esc(HIST.textbook)} · ${esc(U.big || '')}</p></div><span class="banner-ghost"></span></section>
      <h2 class="route-h">학습 순서</h2>
      <div class="routes">
        ${step('hconcept', 1, '개념 정리', U.sections.map((x) => x.title.replace(/^\d+\.\s*/, '')).join(' · '), c.ok, c.n, '칸')}
        ${step('hterms', 2, '핵심 용어', '목록 · 카드 · 고르기 · 쓰기', tk, U.terms.length, ' 외움')}
        ${fl.length ? step('hflow', 3, '흐름 잇기', fl.map((f) => f.title).join(' · '), hFlowDone(U), fl.length, '개') : ''}
        ${step('hquiz', fl.length ? 4 : 3, '실전 문제', '학교 시험처럼 객관식 + 서술형', q.ok, q.total, ' 맞힘')}
      </div>`;
    main.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => go(b.dataset.go)));
    main.querySelectorAll('[data-u]').forEach((b) => (b.onclick = () => setUnit(+b.dataset.u)));
  }

  // ───────── 개념 정리 ─────────
  function hconcept(U) {
    const tabs = seg('hc', [['read', '읽기'], ['cloze', '빈칸 채우기']], UI.hc || 'read');
    if ((UI.hc || 'read') === 'read') {
      main.innerHTML = head(`개념 정리 · ${esc(U.code)}`, '굵은 글씨가 시험에 나오는 핵심어예요', tabs) + U.sections.map((sec) => `
        <section class="card hsec"><h3>${esc(sec.title)}</h3>${sec.blocks.map(hBlock).join('')}</section>`).join('');
      return;
    }
    let n = 0;
    main.innerHTML = head(`개념 정리 · ${esc(U.code)}`, '빈칸을 채우고 「채점」 — 한 묶음씩 매겨요', tabs) + U.sections.map((sec, si) => {
      const rows = sec.blocks.filter((b) => b.pts).map((b) => `<div class="wsub">${esc(b.h)}</div>` + b.pts.map((p) => {
        const ans = [...p.matchAll(/\{([^}]+)\}/g)].map((m) => m[1].replace(/\|/g, '/'));
        const q = p.replace(/\{[^}]+\}/g, '______');
        return ans.length ? rowBlank(`${++n}.`, q, ans) : `<div class="wrow"><span class="wn">•</span><div class="wbody"><div class="wq">${esc(p)}</div></div></div>`;
      }).join('')).join('');
      return part(`h${U.no}:c:${si}`, LETTERS[si], sec.title, rows);
    }).join('');
    bindWs(U);
  }
  function hBlock(b) {
    let h = b.h ? `<div class="hblock-h">${esc(b.h)}</div>` : '';
    if (b.pts) h += `<ul class="hpts">${b.pts.map((p) => `<li>${keyText(p)}</li>`).join('')}</ul>`;
    if (b.table) h += `<div class="htable-wrap"><table class="htable"><tr>${b.table.head.map((x) => `<th>${esc(x)}</th>`).join('')}</tr>${b.table.rows.map((r) => `<tr>${r.map((x) => `<td>${keyText(x)}</td>`).join('')}</tr>`).join('')}</table></div>`;
    if (b.src) h += `<div class="hsrc"><div class="hsrc-t">📜 ${esc(b.src.t)}</div><div class="hsrc-b">${rich(b.src.body)}</div>${b.src.note ? `<div class="hsrc-n">💡 ${keyText(b.src.note)}</div>` : ''}</div>`;
    if (b.tip) h += `<div class="tip">⚠️ ${keyText(b.tip)}</div>`;
    return `<div class="hblock">${h}</div>`;
  }

  // ───────── 핵심 용어 ─────────
  function hterms(U) {
    const mode = UI.ht || 'list', T = U.terms;
    const kn = T.filter((x) => S.known[htid(U, x)]).length;
    let body = '';
    if (mode === 'list') body = `<table class="wtable">${T.map((x) => `<tr class="${S.known[htid(U, x)] ? 'known' : ''}"><td class="w">${esc(x.t)}</td><td>${esc(x.d)}</td></tr>`).join('')}</table>`;
    else if (mode === 'card') {
      const pool = UI.onlyTodo ? T.filter((x) => !S.known[htid(U, x)]) : T;
      if (!pool.length) body = `<div class="empty">다 외웠어요! 🎉 「안 외운 것만」을 끄면 처음부터 다시 볼 수 있어요.</div>`;
      else {
        const i = Math.min(UI.card, pool.length - 1), x = pool[i];
        body = `<div class="flashbox"><div class="fcard" id="fcard"><div class="mean">${esc(x.d)}</div>${UI.cardFlip ? `<div class="big">${esc(x.t)}</div>` : '<div class="tap">설명을 보고 용어를 떠올린 뒤 눌러서 확인</div>'}</div>
          <div class="fnav"><button class="btn" data-c="prev" type="button">← 이전</button><button class="btn no" data-c="no" type="button">몰라요</button><button class="btn ok" data-c="ok" type="button">외웠어요</button><button class="btn" data-c="next" type="button">다음 →</button></div>
          <p class="meta" style="text-align:center">${i + 1} / ${pool.length}</p></div>`;
      }
    } else body = hTermTest(U);
    main.innerHTML = head(`핵심 용어 · ${esc(U.code)}`, `${kn} / ${T.length} 외움`) +
      `<div class="bar-row">${seg('ht', [['list', '전체 목록'], ['card', '카드 외우기'], ['pick', '용어 고르기'], ['write', '용어 쓰기']], mode)}
       ${mode === 'card' ? `<span class="grow"></span><label class="hint"><input type="checkbox" id="only-todo" ${UI.onlyTodo ? 'checked' : ''} style="width:auto"> 안 외운 것만</label>` : ''}</div>` + body;
    if (mode === 'card') {
      const pool = UI.onlyTodo ? T.filter((x) => !S.known[htid(U, x)]) : T;
      const card = $('#fcard'); if (card) card.onclick = () => { UI.cardFlip = !UI.cardFlip; render(); };
      const ot = $('#only-todo'); if (ot) ot.onchange = () => { UI.onlyTodo = ot.checked; UI.card = 0; render(); };
      main.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => {
        const i = Math.min(UI.card, pool.length - 1), x = pool[i], c = b.dataset.c;
        if (c === 'ok') { S.known[htid(U, x)] = true; logEv('용어 카드', 1, 1, x.t); fxAfter(true, '.fcard'); }
        if (c === 'no') delete S.known[htid(U, x)];
        save();
        if (c === 'prev') UI.card = Math.max(0, i - 1); else if (c === 'ok' && UI.onlyTodo) UI.card = i; else UI.card = (i + 1) % pool.length;
        UI.cardFlip = false; render();
      }));
    } else if (mode !== 'list') bindHTermTest(U);
  }
  function hTermTest(U) {
    const T = U.terms, mode = UI.ht;
    if (!UI.htest || UI.htest.mode !== mode || UI.htest.unit !== U.no) UI.htest = { mode, unit: U.no, order: shuffle(T.map((_, i) => i)), i: 0, ok: 0, no: 0, answered: null, misses: [] };
    const X = UI.htest;
    if (X.i >= X.order.length) return `<div class="card done-card"><span class="big">${X.ok} / ${X.order.length}</span><span class="sub">${X.misses.length ? '틀린 용어: ' + X.misses.map(esc).join(', ') : '전부 맞혔어요!'}</span><div class="actions"><button class="btn primary" id="t-again" type="button">다시 보기</button></div></div>`;
    const x = T[X.order[X.i]];
    const runHead = `<div class="run-head"><span class="run-count">${X.i + 1} / ${X.order.length}</span><span class="run-bar"><span style="width:${pct(X.i, X.order.length)}%"></span></span><span class="run-score"><span class="ok">○ ${X.ok}</span><span class="no">✕ ${X.no}</span></span></div>`;
    if (mode === 'pick') {
      if (!X.choices || X.choicesFor !== X.i) { X.choices = shuffle([x, ...shuffle(T.filter((y) => y !== x)).slice(0, 4)]); X.choicesFor = X.i; }
      return `<div class="qwrap">${runHead}<div class="card q-card"><div class="q-ask"><div class="ko">${esc(x.d)}</div></div>
        <div class="choices">${X.choices.map((c, k) => { let cls = ''; if (X.answered != null) { if (c === x) cls = 'right'; else if (k === X.answered) cls = 'wrong'; }
          return `<button class="choice ${cls}" data-k="${k}" type="button" ${X.answered != null ? 'disabled' : ''}><span class="n">${k + 1}</span>${esc(c.t)}</button>`; }).join('')}</div>
        ${X.answered != null ? `<div class="actions"><button class="btn primary" id="t-next" type="button">다음 →</button></div>` : ''}</div></div>`;
    }
    return `<div class="qwrap">${runHead}<div class="card q-card"><div class="q-ask"><div class="ko">${esc(x.d)}</div></div>
      <div class="spell"><div class="spell-shape">첫 글자 <b>${esc(x.t[0])}</b> · ${x.t.replace(/\s/g, '').length}글자</div>
      <div class="spell-row"><input id="t-in" autocomplete="off" spellcheck="false" ${X.answered != null ? 'disabled' : ''} value="${esc(X.typed || '')}"><button class="btn primary" id="t-check" type="button" ${X.answered != null ? 'hidden' : ''}>확인</button></div>
      ${X.answered != null ? `<div class="verdict ${X.answered ? 'ok' : 'no'}">${X.answered ? '정답!' : `정답은 <b>${esc(x.t)}</b>`}</div><div class="actions"><button class="btn primary" id="t-next" type="button">다음 →</button></div>` : ''}</div></div></div>`;
  }
  function bindHTermTest(U) {
    const X = UI.htest; if (!X) return;
    const x = U.terms[X.order[X.i]];
    const again = $('#t-again'); if (again) again.onclick = () => { UI.htest = null; render(); };
    const mark = (ok) => { if (ok) X.ok++; else { X.no++; X.misses.push(x.t); delete S.known[htid(U, x)]; } logEv(UI.ht === 'pick' ? '용어 고르기' : '용어 쓰기', ok ? 1 : 0, 1, x.t); fxAfter(ok, ok ? (UI.ht === 'pick' ? '.choice.right' : '.verdict') : (UI.ht === 'pick' ? '.choice.wrong' : '#t-in')); save(); };
    main.querySelectorAll('.choice').forEach((b) => (b.onclick = () => { const k = +b.dataset.k; X.answered = k; mark(X.choices[k] === x); render(); }));
    const inp = $('#t-in');
    const check = () => { X.typed = inp.value; const ok = accepts(inp.value, [x.t, ...(x.alt || [])].join('/')); X.answered = ok; mark(ok); render(); };
    if (inp && X.answered == null) { inp.focus(); inp.onkeydown = (e) => { if (e.key === 'Enter' && !e.isComposing) check(); }; $('#t-check').onclick = check; }
    const nx = $('#t-next'); if (nx) { nx.onclick = () => { X.i++; X.answered = null; X.typed = ''; render(); }; nx.focus(); }
  }

  // ───────── 흐름 잇기 ─────────
  // 사건을 일어난 순서대로 놓아요. 맞히면 연도와 함께 정리된 흐름이 보입니다.
  function hflow(U) {
    const F = U.flows || [];
    main.innerHTML = head(`흐름 잇기 · ${esc(U.code)}`, '낱장을 눌러 일어난 순서대로 놓아요. 잘못 놓은 건 다시 누르면 돌아가요.') +
      `<div class="list">${F.map((f, fi) => {
        const id = `h${U.no}:f:${fi}`, done = (S.dm || {})['flow:' + id] && !UI.redo[id];
        if (done) return `<section class="card hflow done"><h3>${esc(f.title)}</h3><ol class="htl">${f.steps.map((x) => `<li>${x.y ? `<b>${esc(x.y)}</b>` : ''}<span>${esc(x.t)}</span></li>`).join('')}</ol><div class="verdict ok">✓ 완료 <button class="link" data-redo="${id}" type="button">다시 해 보기</button></div></section>`;
        const sh = shuffle(f.steps.map((x, i) => ({ t: x.t, i })), id);
        return `<section class="card hflow"><h3>${esc(f.title)}</h3><div class="tray answer vtray" data-flow="${fi}"></div><div class="tray vtray">${sh.map((o) => `<button class="chip" data-i="${o.i}" type="button">${esc(o.t)}</button>`).join('')}</div><div class="verdict" hidden></div></section>`;
      }).join('')}</div>`;
    main.querySelectorAll('[data-redo]').forEach((b) => (b.onclick = () => { UI.redo[b.dataset.redo] = 1; const y = scrollY; render(); scrollTo(0, y); }));
    main.querySelectorAll('[data-flow]').forEach((ans) => {
      const fi = +ans.dataset.flow, f = F[fi], id = `h${U.no}:f:${fi}`, pool = ans.nextElementSibling, ver = pool.nextElementSibling;
      const check = () => {
        const placed = [...ans.children].map((c) => +c.dataset.i);
        if (placed.length !== f.steps.length) { ver.hidden = true; return; }
        const ok = placed.every((v, i) => v === i);
        ver.hidden = false; ver.className = 'verdict ' + (ok ? 'ok' : 'no');
        ver.innerHTML = ok ? '정답! 🎉' : `순서가 달라요 — 틀린 낱장을 눌러 빼고 다시 놓아 봐요`;
        logEv('흐름 잇기', ok ? 1 : 0, 1, f.title);
        if (ok) { S.dm = S.dm || {}; S.dm['flow:' + id] = Date.now(); delete UI.redo[id]; save(); react(true, ans); setTimeout(() => { const y = scrollY; render(); scrollTo(0, y); }, 700); }
        else { [...ans.children].forEach((c, i) => c.classList.toggle('bad', +c.dataset.i !== i)); react(false, ans); }
      };
      pool.onclick = (e) => { const c = e.target.closest('.chip'); if (!c || c.classList.contains('used')) return; c.classList.add('used'); const n = c.cloneNode(true); n.classList.remove('used'); ans.appendChild(n); check(); };
      ans.onclick = (e) => { const c = e.target.closest('.chip'); if (!c) return; pool.querySelector(`.chip[data-i="${c.dataset.i}"]`).classList.remove('used'); c.remove(); check(); };
    });
  }

  // ───────── 역사 실전 문제 ─────────
  const HCATS = ['전체', '개념', '자료', '서술형'];
  function hPool(U) {
    if (UI.quizOnly) return UI.quizOnly.map(qByKey).filter(Boolean);
    const sc = UI.hquizScope || 'one';
    const one = (u) => u.questions.map((q, i) => qByKey(`h:${u.no}:${i}`));
    const src = sc === 'exam' ? HEXAMS.filter((e) => (UI.hexamSet || 'all') === 'all' || e.id === UI.hexamSet).flatMap((e) => e.questions.map((q, i) => qByKey(`hx:${e.id}:${i}`))) : sc === 'all' ? HUNITS.flatMap(one) : one(U);
    const cat = UI.hquizCat || '전체';
    return src.filter(Boolean).filter(({ q }) => cat === '전체' || (cat === '서술형' ? q.type === 'short' || q.type === 'essay' : q.cat === cat && q.type === 'mc'));
  }
  function hquiz(U) {
    UI.hquizScope = UI.hquizScope || (HEXAMS.length ? 'exam' : 'one');
    if (!UI.hquiz) { const pool = hPool(U); UI.hquiz = { pool: UI.hquizScope === 'all' || (UI.hquizScope === 'exam' && (UI.hexamSet || 'all') === 'all') ? shuffle(pool) : pool, i: 0, picks: {} }; }
    const Q = UI.hquiz, st = hQuizStats(U);
    const scopes = [...(HEXAMS.length ? [['exam', `기출 시험지 (${HEXAMS.reduce((n, e) => n + e.questions.filter((q) => !hideQ(q)).length, 0)})`]] : []), ['one', `이 단원 (${U.questions.length})`], ['all', `${HUNITS.map((u) => u.code).join('·')} 섞기`]];
    const ex = HEXAMS.find((e) => e.id === UI.hexamSet);
    let html = head(`실전 문제 · ${UI.hquizScope === 'exam' ? '기출 시험지' : UI.hquizScope === 'one' ? esc(U.code) : '섞어서'}`, UI.hquizScope === 'exam' ? (ex ? `출처: ${esc(ex.source || '')}` : '기출비 카페에서 받은 시험지를 섞어서') : `직접 만든 문제 · 이 단원 ${st.ok}/${st.total} 맞힘 · 서술형은 핵심어가 다 들어가면 정답`, `<button class="btn" id="q-reset" type="button">처음부터 다시</button>`) +
      `<div class="bar-row">${seg('hquizScope', scopes, UI.hquizScope)}${seg('hquizCat', HCATS.map((c) => [c, c]), UI.hquizCat || '전체')}</div>` +
      (UI.hquizScope === 'exam' && HEXAMS.length > 1 ? `<div class="bar-row">${seg('hexamSet', [['all', '전체 섞기'], ...HEXAMS.map((e) => [e.id, `${e.title} (${e.questions.filter((q) => !hideQ(q)).length})`])], UI.hexamSet || 'all')}</div>` : '');
    if (UI.quizOnly) html += `<div class="hw-banner">📌 숙제 문제만 보는 중 (${Q.pool.length}문제) <button class="link" id="q-all" type="button">모든 문제 보기</button></div>`;
    if (!Q.pool.length) { main.innerHTML = html + `<div class="empty">이 갈래의 문제가 없어요.</div>`; hBindTop(); return; }
    html += `<div class="qdots">${Q.pool.map((p, i) => { const r = Q.picks[p.key]; return `<button class="qdot ${i === Q.i ? 'on' : ''} ${r ? (r.ok ? 'right' : 'wrong') : ''}" data-qi="${i}" type="button">${i + 1}</button>`; }).join('')}</div>`;
    const answered = Object.values(Q.picks), okN = answered.filter((r) => r.ok).length;
    if (answered.length === Q.pool.length) html += `<div class="card done-card" style="margin-bottom:14px"><span class="big">${okN} / ${Q.pool.length} 맞혔어요</span><span class="sub">틀린 문제는 오답노트에 모였어요. 두 번 연속 맞히면 빠져요.</span></div>`;
    const cur = Q.pool[Q.i];
    html += `<div class="qwrap">${questionCard(cur, Q.picks[cur.key], Q.i + 1)}
      <div class="actions"><button class="btn" id="q-prev" type="button" ${Q.i === 0 ? 'disabled' : ''}>← 이전</button><button class="btn primary" id="q-next" type="button" ${Q.i >= Q.pool.length - 1 ? 'disabled' : ''}>다음 →</button></div></div>`;
    main.innerHTML = html;
    hBindTop();
    bindQuestion(cur, (r) => { Q.picks[cur.key] = r; render(); });
    main.querySelectorAll('[data-qi]').forEach((b) => (b.onclick = () => { Q.i = +b.dataset.qi; render(); }));
    $('#q-prev').onclick = () => { Q.i--; render(); };
    $('#q-next').onclick = () => { Q.i++; render(); };
  }
  function hBindTop() { const r = $('#q-reset'); if (r) r.onclick = () => { UI.hquiz = null; render(); }; const a = $('#q-all'); if (a) a.onclick = () => { UI.quizOnly = null; UI.hquiz = null; render(); }; }

  // ───────── 숙제 ─────────
  // content/homework.json 의 요일별 숙제. 해야 할 일마다 앱 기록(S.ws·mem·qa·wrong)으로 끝났는지 스스로 판단합니다.
  const todayKey = () => dayKey(Date.now());
  const hwAllDays = () => (HW ? [...HW.days, ...((HW.school && HW.school.days) || [])] : []); // 학교 프린트 숙제 + 본문·밀린 숙제
  function hwToday() { if (!HW) return null; const t = todayKey(), ds = hwAllDays().filter((d) => d.date === t); return ds.length ? { tasks: ds.flatMap((d) => d.tasks) } : null; }
  function hwCheck(c) {
    if (c.type === 'ws') {
      const sc = (S.ws || {})[c.id], at = (S.wsAt || {})[c.id] || 0;
      if (c.since && at < new Date(c.since + 'T00:00:00').getTime()) return { ok: false, txt: sc ? `수업 때 ${sc.ok}/${sc.total} → 다시 풀기` : '아직 채점 안 함' }; // 복기: 그날 다시 풀어야 함
      return { ok: !!sc && sc.total > 0 && sc.ok / sc.total >= c.min, txt: sc ? `${sc.ok}/${sc.total}` : '아직 채점 안 함' };
    }
    if (c.type === 'mem') { const n = c.ids.filter((id) => S.mem[id]).length; return { ok: n >= c.min, txt: `${n}/${c.min}문장` }; }
    if (c.type === 'qa') { const done = c.keys.filter((k) => S.qa[k]), ok = done.filter((k) => S.qa[k].ok).length; return { ok: done.length >= c.min, txt: `${done.length}/${c.min}문제 풂 · ${ok}개 맞힘` }; }
    if (c.type === 'drill') {
      const perfect = c.ids.filter((id) => (S.dm || {})[`${c.mode}:${id}`]).length;
      if (c.mode !== 'write') return { ok: perfect >= c.min, txt: `${perfect}/${c.min}문장` };
      const n = c.ids.filter((id) => (S.dm || {})[`write:${id}`] || (S.wr || {})[id]).length; // 통영작은 써서 채점하면 한 것으로
      return { ok: n >= c.min, txt: `${n}/${c.min}문장 · 완벽 ${perfect}개` };
    }
    if (c.type === 'note') { const n = c.ids.filter((id) => { const x = (S.notes || {})[id]; return x && x.marks && x.marks.length; }).length; return { ok: n >= c.min, txt: `${n}/${c.min}문장 표시` }; }
    if (c.type === 'review') {
      const need = c.ids.filter(hasNote), since = new Date((c.since || dayKey(Date.now())) + 'T00:00:00').getTime();
      const n = need.filter((id) => ((S.rev || {})[id] || 0) >= since).length;
      return { ok: need.length > 0 && n >= need.length, txt: need.length ? `${n}/${need.length}문장 복기` : '수업 필기 없음' };
    }
    if (c.type === 'school') { // 학교 프린트 — 그 쪽들의 문항을 전부 풀면 완료
      const L = LESSONS.find((l) => l.no === c.lesson), pages = L && L.school ? L.school.pages.filter((p) => c.pages.includes(p.no)) : [];
      const st = pages.map((p) => scPageStat(L, p)).reduce((a, b) => ({ n: a.n + b.n, ok: a.ok + b.ok, done: a.done + b.done }), { n: 0, ok: 0, done: 0 });
      return { ok: st.n > 0 && st.done >= st.n, txt: `${st.done}/${st.n}문항 풂 · ${st.ok}개 맞힘` };
    }
    if (c.type === 'memo') { // 프린트 예문 외우기 — 그 모드(통영작·배열·빈칸)로 다 해 보기
      const L = LESSONS.find((l) => l.no === c.lesson), ids = L ? scMemoItems(L, c.groups).map((x) => x.id) : [];
      const n = ids.filter((id) => (S.dm || {})[`${c.mode}:${id}`] || (c.mode === 'write' && (S.wr || {})[id])).length, perfect = ids.filter((id) => (S.dm || {})[`${c.mode}:${id}`]).length;
      return { ok: ids.length > 0 && n >= ids.length, txt: `${n}/${ids.length}문장${c.mode === 'write' ? ` · 완벽 ${perfect}개` : ''}` };
    }
    if (c.type === 'cond') {
      const L = LESSONS.find((l) => l.no === c.lesson), cs = L && L.school && L.school.cond ? L.school.cond.slice(c.from || 0, c.to || 999) : [];
      const done = cs.filter((x) => (S.sch || {})[x.id]).length, ok = cs.filter((x) => ((S.sch || {})[x.id] || {}).ok).length;
      return { ok: cs.length > 0 && done >= cs.length, txt: `${done}/${cs.length}문제 풂 · ${ok}개 조건까지 맞힘` };
    }
    if (c.type === 'match') {
      const L = LESSONS.find((l) => l.no === c.lesson), n = L ? matchPairs(L, c.kind).length : 0;
      const ok = Array.from({ length: n }, (_, i) => ((S.mt || {})[`mt:${c.lesson}:${c.kind}:${i}`] || {}).ok).filter(Boolean).length;
      const need = Math.min(c.min || n, n); return { ok: n > 0 && ok >= need, txt: `${ok}/${need}개 맞힘` };
    }
    if (c.type === 'pickSet') {
      const keys = ((S.hwSets || {})[c.id] || null) && S.hwSets[c.id].filter((k) => { const x = qByKey(k); return x && !hideQ(x.q); }); // 범위 밖으로 숨긴 문제는 빼고 셈
      if (!keys) return { ok: false, txt: '열면 새 문제 10개를 뽑아요' };
      const done = keys.filter((k) => S.qa[k]), ok = done.filter((k) => S.qa[k].ok).length;
      return { ok: done.length >= keys.length, txt: `${done.length}/${keys.length}문제 풂 · ${ok}개 맞힘` };
    }
    if (c.type === 'wrongClear') { const n = Object.keys(S.wrong).length; return { ok: n === 0, txt: n ? `오답 ${n}개 남음` : '오답 0개' }; }
    return { ok: false, txt: '' };
  }
  // 오답노트 비우기는 그날 나머지 숙제를 다 한 뒤에만 완료로 칩니다 (처음부터 오답 0개라 저절로 체크되는 것 막기)
  const hwDayOf = (t) => hwAllDays().find((d) => d.tasks.includes(t));
  // 새 문제 뽑기 — 아직 안 푼 문제(그리고 다른 숙제로 낸 적 없는 문제)에서 고르고, 한 번 뽑으면 고정
  const PART_RE = { A: /Shoreditch|STIK|hippest|three figures/, B: /Banksy|Finsbury|leafless|sprayer|green tree/, C: /Muswell|Wilson|chewing gum|gum painting/ };
  function pickPool(tags, lesson) {
    const all = [...EXAMS.flatMap((e) => e.questions.map((q, i) => ({ q, key: `ex:${e.id}:${i}` }))), ...((LESSONS.find((l) => l.no === lesson) || {}).questions || []).map((q, i) => ({ q, key: `${lesson}:${i}` }))]
      .filter(({ q }) => (q.lesson == null || q.lesson === lesson) && !hideQ(q));
    const txt = (q) => `${q.q} ${q.passage || ''} ${Array.isArray(q.choices) ? q.choices.join(' ') : ''}`;
    const part = (q) => Object.keys(PART_RE).filter((p) => PART_RE[p].test(txt(q)));
    return all.filter(({ q }) => tags.some((t) => (t === 'G' ? !part(q).length && ['문법', '어휘', '의사소통'].includes(q.cat) : t === 'GM' ? !part(q).length && q.cat === '문법' : part(q).includes(t)))).map((x) => x.key); // GM = 문법만
  }
  function hwEnsurePicks(d) {
    if (TEACHER) return;
    S.hwSets = S.hwSets || {};
    const used = new Set([...Object.keys(S.qa), ...Object.values(S.hwSets).flat(), ...HW.days.flatMap((x) => x.tasks.flatMap((t) => (t.go && t.go.quizOnly) || []))]);
    let changed = false;
    d.tasks.forEach((t) => {
      if (!t.pick || S.hwSets[t.pick.id]) return;
      const pool = shuffle(pickPool(t.pick.tags, (t.go && t.go.lesson) || 5).filter((k) => !used.has(k)));
      S.hwSets[t.pick.id] = pool.slice(0, t.pick.n); S.hwSets[t.pick.id].forEach((k) => used.add(k)); changed = true;
    });
    if (changed) save();
  }
  const hwTaskOk = (t) => t.checks.every((c) => hwCheck(c).ok) &&
    (!t.checks.some((c) => c.type === 'wrongClear') || ((others) => others.length > 0 && others.every((x) => x.checks.every((c) => hwCheck(c).ok)))(hwDayOf(t).tasks.filter((x) => x !== t && !x.checks.some((c) => c.type === 'wrongClear'))));
  function hwGo(t) {
    let g = t.go || {};
    S.subj = g.subj === 'hist' ? 'hist' : 'en';
    if (g.unit) S.hunit = g.unit;
    ['hc', 'ht'].forEach((k) => { if (g[k]) UI[k] = g[k]; });
    if (g.lesson && g.lesson !== S.lesson) { S.lesson = g.lesson; UI.rpart = 0; }
    ['words', 'read', 'drill', 'grammar', 'comm'].forEach((k) => { if (g[k]) UI[k] = g[k]; });
    ['scMode', 'scGroup'].forEach((k) => { if (g[k]) UI[k] = g[k]; });
    UI.scHw = null;
    if (g.spage) {
      const SL = LESSONS.find((l) => l.no === (g.lesson || S.lesson)), pages = (t.checks.find((c) => c.type === 'school') || {}).pages || [g.spage];
      // 숙제인 쪽 중 아직 안 푼 문제가 있는 쪽부터 (설명만 있는 쪽은 건너뜀)
      const first = pages.find((no) => { const pg = SL.school.pages.find((p) => p.no === no), st = pg && scPageStat(SL, pg); return st && st.n && st.done < st.n; }) || pages.find((no) => { const pg = SL.school.pages.find((p) => p.no === no); return pg && scPageStat(SL, pg).n; }) || pages[0];
      const i = SL && SL.school ? SL.school.pages.findIndex((p) => p.no === first) : -1; if (i >= 0) UI.spage = i;
      UI.scHw = { t: t.t, pages };
    }
    if (g.rpart != null) UI.rpart = g.rpart;
    if (g.pickSet) { hwEnsurePicks(hwDayOf(t)); g = { ...g, quizOnly: (S.hwSets || {})[g.pickSet] || [] }; }
    UI.noteReview = !!g.review;
    UI.paras = g.paras || null; UI.partName = g.partName || null; // 그날 외울 부분만
    UI.quiz = null; UI.onlyKey = false; UI.onlyTodo = false;
    t.checks.forEach((c) => { if (c.type === 'ws' && c.since && ((S.wsAt || {})[c.id] || 0) < new Date(c.since + 'T00:00:00').getTime() && S.wsv) delete S.wsv[c.id]; }); // 복기는 빈칸부터
    go(g.tab || 'home');
    if (g.quizOnly) { UI.quizOnly = g.quizOnly; UI.quiz = null; UI.hquiz = null; render(); }
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
    hwAllDays().filter((d) => d.date <= todayKey()).forEach(hwEnsurePicks); // 오늘(과 지난) 숙제는 문제를 미리 뽑아 고정
    const t = todayKey(), due = new Date(HW.due + 'T00:00:00'), dd = Math.round((due - new Date(t + 'T00:00:00')) / 864e5);
    let justDone = null;
    if (!SYNC || !S.syncKey || synced) hwAllDays().forEach((d) => { if (d.tasks.every(hwTaskOk) && !S.hwDone[d.id]) { S.hwDone[d.id] = Date.now(); justDone = d; } }); // 서버 기록을 받기 전에는 '완료'를 찍지 않음
    if (justDone && !TEACHER) { save(); logEv('숙제', 1, 1, `${justDone.label} 완료`); }
    let html = perfBanner() + `<section class="banner hw-hero"><div><p class="hw-eyebrow">${esc(HW.student)}의 숙제 · ${esc(HW.dueLabel)}까지</p><h1>${esc(HW.title)}</h1>
      <p>${dd > 0 ? `D-${dd}` : dd === 0 ? '오늘 수업!' : '마감 지남'} · ${TEACHER ? `${esc(S.who)}이가 한 만큼 실시간으로 채워져요` : '하루치를 다 하면 「선생님께 알리기」를 눌러 카톡으로 보내 주세요'}</p></div><span class="banner-ghost"></span></section>`;
    const dayCards = (days) => days.map((d) => {
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
    }).join('');
    // 본문·문법이 최우선 (사용자 2026-10-10: 단어는 이미 앎, 대화는 지금 덜 중요)
    html += `<div class="hw-days">${dayCards(HW.days)}</div>`;
    if (HW.school && HW.school.days.length) html += `<h2 class="route-h hw-group">🏫 ${esc(HW.school.title || '학교 프린트 숙제')}</h2><div class="hw-days">${dayCards(HW.school.days)}</div>`;
    main.innerHTML = head('숙제', '') .replace('<div class="page-head"><div><h2>숙제</h2></div></div>', '') + html;
    main.querySelectorAll('.hw-task').forEach((b) => (b.onclick = () => { const d = hwAllDays().find((x) => x.id === b.dataset.day); hwGo(d.tasks[+b.dataset.i]); }));
    bindPerfBanner();
    main.querySelectorAll('[data-notify]').forEach((b) => (b.onclick = async () => {
      const d = hwAllDays().find((x) => x.id === b.dataset.notify), msg = hwMessage(d), ta = main.querySelector(`[data-msg="${d.id}"]`);
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
    if (HIST) html += `<div class="card" style="padding:16px 18px;margin-bottom:16px"><h3 class="card-title">역사 단원별 진도</h3>${HUNITS.map((u) => {
      const c = hConceptStats(u), t = u.terms.filter((x) => S.known[htid(u, x)]).length, q = hQuizStats(u);
      return `<div class="lrow"><b>${esc(u.code)}</b><span>개념 빈칸 ${c.n ? `${c.ok}/${c.n}칸` : '—'}</span><span>용어 ${t}/${u.terms.length}</span><span>실전 ${q.ok}/${q.total}</span><span class="bar"><span style="width:${pct(q.ok, q.total)}%"></span></span></div>`;
    }).join('')}</div>`;
    html += `<div class="card" style="padding:16px 18px;margin-bottom:16px"><h3 class="card-title">영어 과별 진도</h3>${LESSONS.map((l) => {
      const q = quizStats(l), ws = wordsOf(l), kn = ws.filter((w) => S.known[wid(l, w)]).length;
      const wsd = Object.entries(S.ws || {}).filter(([k]) => k.startsWith(l.no + ':'));
      const wok = wsd.reduce((a, [, v]) => a + v.ok, 0), wn = wsd.reduce((a, [, v]) => a + v.total, 0);
      return `<div class="lrow"><b>${l.no}과</b><span>단어 ${kn}/${ws.length}</span><span>학습지 ${wn ? `${wok}/${wn}칸` : '—'}</span><span>실전 ${q.ok}/${q.total}</span><span class="bar"><span style="width:${pct(q.ok, q.total)}%"></span></span></div>`;
    }).join('')}</div>`;
    const keys = Object.keys(days).sort().reverse();
    if (!keys.length) html += `<div class="empty">아직 기록이 없어요. 아무 문제나 하나 풀면 여기에 바로 남아요 👻</div>`;
    keys.slice(0, 30).forEach((k) => {
      const arr = days[k], [o, n] = sum(arr), d = new Date(k);
      const groups = {}; arr.forEach((e) => { const g = `${e.sj === 'hist' ? `역사 ${(HUNITS.find((u) => u.no === e.l) || {}).code || e.l}` : `${e.l}과`} · ${e.k}`; (groups[g] = groups[g] || [0, 0, 0]); groups[g][0] += e.ok; groups[g][1] += e.n; groups[g][2]++; });
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
  // 오답 키 — 역사는 'h:' / 'hx:' 로 시작합니다.
  const wrongKeys = () => Object.keys(S.wrong).filter((k) => /^hx?:/.test(k) === isHist());
  function wrong() {
    if (!UI.wrongPicks) UI.wrongPicks = {};
    if (!UI.wrongSeen) UI.wrongSeen = []; // 이번에 오답노트에서 푼 문제 — 빠져도 이 화면에서는 「빠짐」으로 남겨 둠
    const keys = [...new Set([...wrongKeys(), ...UI.wrongSeen.filter((k) => /^hx?:/.test(k) === isHist())])];
    const items = keys.map(qByKey).filter(Boolean);
    let html = head(isHist() ? '오답노트 · 역사' : '오답노트', `${isHist() ? '역사' : '영어 5~8과'}에서 틀린 문제가 모여요. 두 번 연속 맞히면 빠져요.`);
    if (!items.length) { main.innerHTML = html + `<div class="empty">아직 틀린 문제가 없어요 👻</div>`; return; }
    const streak = (k) => (k in S.wrong ? S.wrong[k] : 2);
    html += `<div class="qwrap list">${items.map((it, n) => { const p = UI.wrongPicks[it.key], st = streak(it.key);
      const info = st >= 2 ? '<b class="ok">✓ 두 번 연속 맞혀서 오답노트에서 빠졌어요</b>' : p ? `연속 정답 ${st} / 2 ${p.ok ? '— 한 번 더 맞히면 빠져요' : '— 틀려서 0부터 다시'} <button class="link" data-wredo="${it.key}" type="button">다시 풀기</button>` : `연속 정답 ${st} / 2`;
      return `<div data-wk="${it.key}">${questionCard(it, p, n + 1)}<div class="hint" style="margin:6px 4px 0">${info}</div></div>`; }).join('')}</div>`;
    main.innerHTML = html;
    main.querySelectorAll('[data-wredo]').forEach((b) => (b.onclick = () => { delete UI.wrongPicks[b.dataset.wredo]; const y = scrollY; render(); scrollTo(0, y); }));
    items.forEach((it) => {
      if (!UI.wrongSeen.includes(it.key) && it.key in S.wrong) UI.wrongSeen.push(it.key);
      const box = main.querySelector(`[data-wk="${it.key}"]`);
      box.querySelectorAll('.choice[data-k]').forEach((b) => (b.onclick = () => {
        const k = +b.dataset.k, ok = k === it.q.answer;
        S.qa[it.key] = { ok, at: Date.now() };
        if (!ok) S.wrong[it.key] = 0; else { S.wrong[it.key] = (S.wrong[it.key] || 0) + 1; if (S.wrong[it.key] >= 2) { delete S.wrong[it.key]; toast('오답노트에서 빠졌어요!'); } }
        logEv('오답노트', ok ? 1 : 0, 1, it.key); fxAfter(ok, `[data-wk="${it.key}"] .choice.${ok ? 'right' : 'wrong'}`);
        save(); UI.wrongPicks[it.key] = { pick: k, ok }; const y = scrollY; render(); scrollTo(0, y);
      }));
      if (it.q.type === 'short') bindShortBox(box, it.q, (typed, ok, self) => {
        S.qa[it.key] = { ok, at: Date.now() };
        if (!ok) S.wrong[it.key] = 0; else { S.wrong[it.key] = (S.wrong[it.key] || 0) + 1; if (S.wrong[it.key] >= 2) delete S.wrong[it.key]; }
        logEv('오답노트', ok ? 1 : 0, 1, it.key); fxAfter(ok, `[data-wk="${it.key}"] .verdict`);
        save(); UI.wrongPicks[it.key] = { typed, ok, self }; const y = scrollY; render(); scrollTo(0, y);
      });
      const inp = box.querySelector('#sh-in');
      if (inp && !inp.disabled) {
        inp.removeAttribute('id');
        const go = () => { const v = inp.value; const ok = shortOk(it.q, v);
          S.qa[it.key] = { ok, at: Date.now() };
          if (!ok) S.wrong[it.key] = 0; else { S.wrong[it.key] = (S.wrong[it.key] || 0) + 1; if (S.wrong[it.key] >= 2) delete S.wrong[it.key]; }
          logEv('오답노트', ok ? 1 : 0, 1, it.key); fxAfter(ok, `[data-wk="${it.key}"] .verdict`);
          save(); UI.wrongPicks[it.key] = { typed: v, ok }; const y = scrollY; render(); scrollTo(0, y); };
        inp.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); go(); } };
        box.querySelector('#sh-go').onclick = go;
        box.querySelector('#sh-give').onclick = () => { inp.value = ''; go(); };
      }
    });
  }
  // 오답노트에서 다시 들어오면 새로 풀 수 있게
  $('#nav').addEventListener('click', (e) => { if (e.target.closest('[data-tab="wrong"]')) UI.wrongPicks = {}; }, true);

  // 단어 카드 — 스페이스로 뒤집기
  document.addEventListener('keydown', (e) => {
    if (((S.tab === 'words' && UI.words === 'card') || (S.tab === 'hterms' && UI.ht === 'card')) && e.code === 'Space' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); UI.cardFlip = !UI.cardFlip; render(); }
  });

  // ───────── 시작 ─────────
  window.__naesinStarted = true; // 웹 시작 코드에 '정상 시작'을 알림
  setTimeout(() => { const s = $('#splash'); s.style.transition = 'opacity .35s'; s.style.opacity = 0; setTimeout(() => s.remove(), 360); $('.mark').classList.add('is-caught'); }, 650);
  // 두 기록 합치기 — 어느 쪽에서 한 것도 지우지 않고, 같은 항목은 더 나중에 한 쪽을 씁니다.
  function mergeInto(sd) {
    if (!sd) return false;
    const before = JSON.stringify(S);
    const or = (a = {}, b = {}) => { const o = { ...a }; for (const k in b) if (b[k] && (!o[k] || (typeof b[k] === 'number' && b[k] > o[k]))) o[k] = b[k]; return o; };
    S.hwSets = { ...(S.hwSets || {}), ...(sd.hwSets || {}) };
    S.mt = S.mt || {}; for (const k in sd.mt || {}) if (!S.mt[k] || (sd.mt[k].at || 0) > (S.mt[k].at || 0)) S.mt[k] = sd.mt[k];
    S.sch = S.sch || {}; for (const k in sd.sch || {}) if (!S.sch[k] || (sd.sch[k].at || 0) > (S.sch[k].at || 0)) S.sch[k] = sd.sch[k];
    S.wr = S.wr || {}; for (const k in sd.wr || {}) if (!S.wr[k] || (sd.wr[k].at || 0) > (S.wr[k].at || 0)) S.wr[k] = sd.wr[k];
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
  let pushT = null, syncBusy = false, synced = false;
  function syncMark(state, txt) { const el = document.getElementById('sync-state'); if (el) { el.dataset.state = state; el.textContent = txt; } }
  async function rpc(fn, body) {
    const ac = new AbortController(); setTimeout(() => ac.abort(), 10000); // 서버가 막히거나 느려도 멈추지 않게
    const r = await fetch(`${SYNC.url}/rest/v1/rpc/${fn}`, { signal: ac.signal, method: 'POST', headers: { apikey: SYNC.key, Authorization: `Bearer ${SYNC.key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`${r.status}`);
    const t = await r.text(); return t ? JSON.parse(t) : null;
  }
  const shareable = () => { const o = { ...S }; ['tab', 'lesson', 'subj', 'hunit', 'syncKey', 'seedApplied'].forEach((k) => delete o[k]); return o; };
  async function syncNow(redraw) {
    if (!SYNC || !S.syncKey) return;
    if (syncBusy) { clearTimeout(pushT); pushT = setTimeout(() => syncNow(redraw), 1200); return; } // 맞추는 중이면 끝나고 한 번 더
    syncBusy = true; syncMark('busy', '☁︎ 맞추는 중…');
    try {
      const remote = await rpc('naesin_get', { p_student: S.who, p_code: S.syncKey });
      const changed = mergeInto(remote); synced = true;
      localStorage.setItem(KEY, JSON.stringify(S));
      if (changed && redraw && !document.activeElement.matches('input, textarea')) { const y = scrollY; render(); scrollTo(0, y); } // 받은 기록은 저장(put) 성공 여부와 상관없이 바로 화면에
      if (!TEACHER) { await rpc('naesin_put', { p_student: S.who, p_code: S.syncKey, p_data: shareable() }); syncMark('ok', '☁︎ 저장됨'); }
      else { const t = new Date(); syncMark('ok', `☁︎ ${S.who} 기록 받음 ${t.getHours()}:${String(t.getMinutes()).padStart(2, '0')}`); }
    } catch (e) { syncMark('err', '☁︎ 연결 안 됨 (이 기기에는 저장됨)'); }
    syncBusy = false;
  }
  let TEACHER = null; // 선생님 링크로 열면 { students: [...] } — 보기 전용
  function schedulePush() { if (!SYNC || !S.syncKey || TEACHER) return; clearTimeout(pushT); syncMark('busy', '☁︎ 저장 중…'); pushT = setTimeout(() => syncNow(false), 1500); }
  setInterval(() => syncNow(true), 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) syncNow(true); });

  S.tab = HW && dayKey(Date.now()) <= HW.due ? 'hw' : isHist() ? 'hhome' : 'home'; // 숙제가 있으면 숙제부터, 없으면 단원 홈
  render();
  (async () => {
    if (SYNC && S.syncKey) {
      try {
        const me = await rpc('naesin_whoami', { p_code: S.syncKey });
        if (me && me.role !== 'student') {
          TEACHER = { students: (await rpc('naesin_students', { p_code: S.syncKey })) || [] };
          if (!params.get('s') && TEACHER.students[0]) S.who = TEACHER.students[0].student;
          const remote = await rpc('naesin_get', { p_student: S.who, p_code: S.syncKey });
          ['mem', 'known', 'qa', 'wrong', 'log', 'ws', 'wsAt', 'wsv', 'notes', 'notesAt', 'dm', 'rev', 'hwDone', 'wr', 'sch', 'mt'].forEach((k) => delete S[k]);
          S.qa = {}; S.wrong = {}; S.mem = {}; S.known = {}; mergeInto(remote || {});
          document.documentElement.classList.add('teacher');
          teacherBar(); render();
        }
      } catch (e) {}
    }
    await takeHandoff(); syncNow(true);
  })();
})();
