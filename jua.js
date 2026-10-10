/* 말랑 내신 · 주아 영어 문법 — Grammar Stage Plus 과별 노트를 말랑 내신 틀에서 (러블리 핑크 테마)
   주아 코드(jua1113)로 들어오면 loader.js 가 app.js 대신 이 파일을 엽니다. 기록은 서버에 '주아' 이름으로 남아요. */
(() => {
  'use strict';
  const DATA = window.NAESIN, UNITS = DATA.units || [], SYNC = DATA.sync || null, KEY = 'mallang-naesin:v1';
  const $ = (s) => document.querySelector(s), main = $('#main');
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  // 원래 노트의 채점 기준 그대로 (줄임말·문장부호 차이는 같은 답)
  const norm = (s) => String(s).toLowerCase().replace(/[’‘]/g, "'").replace(/won't/g, 'will not').replace(/isn't/g, 'is not').replace(/aren't/g, 'are not').replace(/\bi'm\b/g, 'i am').replace(/'ll\b/g, ' will').replace(/didn't/g, 'did not').replace(/wasn't/g, 'was not').replace(/weren't/g, 'were not').replace(/[.?!]/g, '').replace(/\s+/g, ' ').trim();
  let S = {}; try { S = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
  S.ans = S.ans || {}; S.log = S.log || [];
  if (!UNITS.find((u) => u.no === S.unit)) S.unit = UNITS.length ? UNITS[UNITS.length - 1].no : 0;
  if (![2, 3, 4, 'wrong'].includes(S.step)) S.step = 2;
  let pushT = null;
  const save = (local) => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} if (!local) schedule(); };

  document.documentElement.dataset.kid = 'jua';
  window.__naesinStarted = true;
  { const bm = document.getElementById('boot-msg'); if (bm) bm.remove(); }
  setTimeout(() => { const s = $('#splash'); if (!s) return; s.style.transition = 'opacity .35s'; s.style.opacity = 0; setTimeout(() => s.remove(), 360); }, 600);
  document.title = '주아 영어 💗';

  // ── 사이드바: 과 → 단계
  $('.brand-name').textContent = '주아 영어';
  $('#lesson-sub').textContent = 'Grammar Stage Plus';
  const subj = $('#subj'); if (subj) subj.hidden = true;
  const brand = $('#brand'); brand.removeAttribute('aria-haspopup'); brand.style.cursor = 'default';
  const STEP_NAME = { 2: '배우기', 3: '실전 문제', 4: '책 덮고 확인' };
  const qs = (u, step) => u.questions.filter((q) => step === 'wrong' ? isWrong(u, q) : q.step === step);
  const rec = (u, q) => S.ans[`${u.no}:${q.id}`];
  const isWrong = (u, q) => { const r = rec(u, q); return r && r.first === false && !r.fixed; };
  const stat = (u, step) => { const list = qs(u, step); return { n: list.length, ok: list.filter((q) => (rec(u, q) || {}).ok).length }; };
  function side() {
    $('#nav').innerHTML = UNITS.slice().reverse().map((u) => `<div class="jua-unit"><div class="jua-unit-h">♡ ${u.no}과</div>${[2, 3, 4].map((st) => { const s2 = stat(u, st); return `<button class="nav-item ${S.unit === u.no && S.step === st ? 'is-on' : ''}" data-u="${u.no}" data-st="${st}" type="button"><i class="ni">${s2.n && s2.ok === s2.n ? '✓' : st - 1}</i>${STEP_NAME[st]}<span class="tally" ${s2.n ? '' : 'hidden'}>${s2.ok}/${s2.n}</span></button>`; }).join('')}</div>`).join('') +
      `<button class="nav-item ${S.step === 'wrong' ? 'is-on' : ''}" data-st="wrong" type="button"><i class="ni">✕</i>틀린 문제 다시<span class="tally" ${wrongAll() ? '' : 'hidden'}>${wrongAll()}</span></button>`;
    $('#who-name').textContent = S.who || '주아';
    $('#who-edit').textContent = '로그아웃';
  }
  const wrongAll = () => UNITS.reduce((n, u) => n + qs(u, 'wrong').length, 0);
  $('#nav').addEventListener('click', (e) => { const b = e.target.closest('[data-st]'); if (!b) return; if (b.dataset.u) S.unit = +b.dataset.u; S.step = b.dataset.st === 'wrong' ? 'wrong' : +b.dataset.st; save(true); render(); scrollTo(0, 0); });

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

  // ── 화면
  function render() {
    side();
    const u = UNITS.find((x) => x.no === S.unit);
    if (!u) { main.innerHTML = '<div class="empty">아직 문법 노트가 없어요.</div>'; return; }
    if (S.step === 'wrong') {
      const groups = UNITS.map((x) => ({ u: x, list: qs(x, 'wrong') })).filter((g) => g.list.length);
      main.innerHTML = `<section class="banner jua-hero"><div><p class="jua-eyebrow">🎀 틀린 문제 다시</p><h1>한 번 더 하면 내 거!</h1><p>처음에 틀렸던 문제예요. 다시 맞히면 여기서 빠져요.</p></div><span class="jua-crown">👑</span></section>` +
        (groups.length ? groups.map((g) => `<div class="sub-t">♡ ${g.u.no}과</div><ol class="jua-q">${g.list.map((q, i) => qCard(g.u, q, i)).join('')}</ol>`).join('') : '<div class="empty">틀린 문제가 하나도 없어요! 💖</div>');
      bind(); return;
    }
    const st = stat(u, S.step), pct = st.n ? Math.round(st.ok / st.n * 100) : 0;
    let html = `<section class="banner jua-hero"><div><p class="jua-eyebrow">${u.no}과 · ${esc(u.steps[S.step] || STEP_NAME[S.step])}</p><h1>${esc(u.title)}</h1>
      <div class="jua-prog"><span style="width:${pct}%"></span></div><p>${st.ok} / ${st.n} 맞힘 ${pct === 100 ? '· 이 단계 클리어! 👑' : ''}</p></div><span class="jua-crown">👑</span></section>`;
    html += `<div class="jua-lesson">${u.lessons[S.step] || ''}</div>`; // 노트에 있던 설명 그대로 (주아 노트 원본)
    let sec = null, list = [];
    const flush = () => { if (sec !== null) html += `<div class="card jua-sec"><h2>${esc(sec)}</h2><ol class="jua-q">${list.join('')}</ol></div>`; list = []; };
    qs(u, S.step).forEach((q, i) => { if (q.section !== sec) { flush(); sec = q.section; } list.push(qCard(u, q, i)); });
    flush();
    const next = S.step < 4 ? `<button class="btn ok" data-next type="button">${STEP_NAME[S.step + 1]} →</button>` : '';
    main.innerHTML = html + `<div class="sc-foot"><span></span>${next}</div>`;
    const nb = main.querySelector('[data-next]'); if (nb) nb.onclick = () => { S.step++; save(true); render(); scrollTo(0, 0); };
    bind();
  }
  function qCard(u, q, i) {
    const r = rec(u, q), k = `${u.no}:${q.id}`, v = r ? r.v : '';
    const box = q.choices ? `<div class="jua-ops">${q.choices.map((c) => `<button type="button" class="chip jua-op ${r && norm(r.v) === norm(c) ? (r.ok ? 'right' : 'wrong') : ''}" data-op="${esc(c)}">${esc(c)}</button>`).join('')}</div>`
      : `<div class="jua-line"><input class="jua-in ${r ? (r.ok ? 'right' : 'wrong') : ''}" data-in value="${esc(v)}" autocomplete="off" spellcheck="false" placeholder="답을 써 보세요"><button class="btn sm2" data-check type="button">채점</button></div>`;
    const fb = !r ? '' : r.ok ? `<div class="jua-fb ok">💖 정답! ${esc(q.why)}</div>` : `<div class="jua-fb no">앗, 다시 한번! <details><summary>정답·이유 보기</summary><b>${esc(q.answers[0])}</b> — ${esc(q.why)}</details></div>`;
    return `<li class="jua-li ${r && r.ok ? 'done' : ''}" data-k="${k}"><span class="jua-n">${i + 1}</span><div class="jua-body"><div class="jua-p">${q.prompt}</div>${box}${fb}</div></li>`;
  }
  function grade(k, val, el) {
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
    const seen = new Set(S.log.map((e) => `${e.at}|${e.t}`)); S.log = [...S.log, ...(sd.log || []).filter((e) => !seen.has(`${e.at}|${e.t}`))].sort((a, b) => a.at - b.at);
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
