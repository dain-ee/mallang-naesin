/* 말랑 내신 「선생님께 말하기」 — 카톡이 없는 학생이 앱 안에서 바로 선생님께 글·사진을 보내고 답장을 받아요.
   서버: Supabase RPC naesin_msg_* (학생 이름 + 그 학생 코드가 맞아야만 읽고 씀).
   학생 화면(app.js·jua.js·jiwon.js)에는 loader.js 가 이 파일을 붙여요. teacher.html 은 아래 NaesinChat 도우미만 써요. */
(function () {
  const CFG = window.NAESIN_SYNC || (window.NAESIN && window.NAESIN.sync) || null;
  const KEY = 'mallang-naesin:v1';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  async function rpc(fn, body) {
    const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 15000);
    try {
      const r = await fetch(`${CFG.url}/rest/v1/rpc/${fn}`, { signal: ac.signal, method: 'POST', headers: { apikey: CFG.key, Authorization: `Bearer ${CFG.key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const txt = await r.text();
      if (!r.ok) { let m = String(r.status); try { m = JSON.parse(txt).message || m; } catch (e) {} const er = new Error(m); er.status = r.status; throw er; }
      return txt ? JSON.parse(txt) : null;
    } finally { clearTimeout(t); }
  }

  // 사진 → 긴 쪽 1280px 이하 jpeg, 300KB 안쪽 data URL
  function shrink(file, max = 1280, limit = 300 * 1024) {
    return new Promise((ok, no) => {
      const url = URL.createObjectURL(file); const im = new Image();
      im.onload = () => {
        URL.revokeObjectURL(url);
        let w = im.naturalWidth, h = im.naturalHeight, sc = Math.min(1, max / Math.max(w, h));
        const cv = document.createElement('canvas'); const cx = cv.getContext('2d');
        for (let tries = 0; tries < 8; tries++) {
          cv.width = Math.max(1, Math.round(w * sc)); cv.height = Math.max(1, Math.round(h * sc));
          cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(im, 0, 0, cv.width, cv.height);
          for (const q of [0.82, 0.7, 0.58, 0.46]) {
            const d = cv.toDataURL('image/jpeg', q);
            if ((d.length - 23) * 0.75 <= limit) return ok(d);
          }
          sc *= 0.75;
        }
        no(new Error('too big'));
      };
      im.onerror = () => { URL.revokeObjectURL(url); no(new Error('not image')); };
      im.src = url;
    });
  }

  const pad = (n) => String(n).padStart(2, '0');
  function hm(at) { const d = new Date(at); const h = d.getHours(); return `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${pad(d.getMinutes())}`; }
  function dayLabel(at) { const d = new Date(at); return `${d.getMonth() + 1}월 ${d.getDate()}일 ${'일월화수목금토'[d.getDay()]}요일`; }
  const dayKey = (at) => { const d = new Date(at); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
  function linkify(s) { return esc(s).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/\n/g, '<br>'); }

  // 말풍선 목록 그리기. mine = 오른쪽에 둘 보낸 사람('student' 또는 'teacher')
  function renderMsgs(box, msgs, mine, seenUpto, otherName) {
    let html = '', lastDay = '';
    msgs.forEach((m, i) => {
      const dk = dayKey(m.at); if (dk !== lastDay) { html += `<div class="nc-day"><span>${dayLabel(m.at)}</span></div>`; lastDay = dk; }
      const me = m.sender === mine, nx = msgs[i + 1];
      const tail = !nx || nx.sender !== m.sender || hm(nx.at) !== hm(m.at) || dayKey(nx.at) !== dk; // 같은 분에 이어 보낸 말은 시각을 마지막에만
      const pv = msgs[i - 1], first = !pv || pv.sender !== m.sender || dayKey(pv.at) !== dk;
      html += `<div class="nc-row ${me ? 'me' : 'you'}${first ? ' first' : ''}" data-id="${m.id}">` +
        (!me && first ? `<div class="nc-who">${esc(otherName)}</div>` : '') +
        `<div class="nc-line"><div class="nc-bub${m.img && !m.body ? ' pic' : ''}">` +
        (m.img ? `<img class="nc-img" src="${m.img}" alt="보낸 사진">` : '') +
        (m.body ? `<div class="nc-tx">${linkify(m.body)}</div>` : '') +
        `</div>${tail ? `<div class="nc-meta">${me && m.id <= seenUpto ? '<b>읽음</b>' : me && m.id > 0 ? '<b class="un">1</b>' : ''}${m.pending ? '보내는 중' : m.failed ? '<span class="nc-fail">못 보냈어요</span>' : hm(m.at)}</div>` : ''}</div></div>`;
    });
    const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
    box.innerHTML = html || `<div class="nc-empty">${esc(box.dataset.empty || '아직 주고받은 말이 없어요')}</div>`;
    if (atBottom || box.dataset.stick !== '0') { box.scrollTop = box.scrollHeight; box.querySelectorAll('img').forEach((im) => { if (!im.complete) im.addEventListener('load', () => { box.scrollTop = box.scrollHeight; }, { once: true }); }); } // 사진이 늦게 뜨면 다시 맨 아래로
    box.dataset.stick = '0';
  }

  // 사진 크게 보기
  function viewer(src) {
    const v = document.createElement('div'); v.className = 'nc-view';
    v.innerHTML = `<img src="${src}" alt="사진 크게 보기"><button type="button" class="nc-view-x" aria-label="닫기">✕</button>`;
    v.onclick = () => v.remove(); document.body.appendChild(v);
  }
  document.addEventListener('click', (e) => { const im = e.target.closest && e.target.closest('.nc-img'); if (im) viewer(im.src); });

  // 입력칸: Enter 보내기 · Shift+Enter 줄바꿈 · 글 길이에 맞춰 높이 늘리기
  function wireInput(ta, send) {
    const fit = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'; };
    ta.addEventListener('input', fit);
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); send(); }
    });
    return fit;
  }


  const CSS = `
.nc-fab{position:fixed;right:max(20px,env(safe-area-inset-right));bottom:max(20px,env(safe-area-inset-bottom));z-index:80;display:flex;align-items:center;gap:8px;height:52px;padding:0 20px 0 16px;font:inherit;font-size:15px;font-weight:800;color:#fff;background:var(--accent,#4f7cff);border:0;border-radius:99px;box-shadow:var(--shadow-lift,0 12px 30px rgba(0,0,0,.18));cursor:pointer;transition:transform .15s ease,box-shadow .15s ease}
.nc-fab:hover{transform:translateY(-2px)}.nc-fab:active{transform:scale(.97)}
.nc-fab.on{background:var(--ink,#17213a)}
.nc-fab-ic{width:22px;height:22px;background:currentColor;-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 3C6.5 3 2 6.6 2 11c0 2.6 1.6 4.9 4 6.4L5 21l4.3-2.4c.9.2 1.8.4 2.7.4 5.5 0 10-3.6 10-8s-4.5-8-10-8z'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 3C6.5 3 2 6.6 2 11c0 2.6 1.6 4.9 4 6.4L5 21l4.3-2.4c.9.2 1.8.4 2.7.4 5.5 0 10-3.6 10-8s-4.5-8-10-8z'/%3E%3C/svg%3E") center/contain no-repeat}
.nc-badge{position:absolute;top:-6px;right:-4px;min-width:22px;height:22px;padding:0 6px;display:grid;place-items:center;font-size:12px;font-weight:800;color:#fff;background:#f04452;border:2px solid var(--bg,#fff);border-radius:99px;font-variant-numeric:tabular-nums}
.nc-fab.has-new{animation:nc-bump 2.4s ease-in-out infinite}
@keyframes nc-bump{0%,86%,100%{transform:none}90%{transform:translateY(-4px)}95%{transform:translateY(0)}}
.nc-pane{position:fixed;right:max(20px,env(safe-area-inset-right));bottom:84px;z-index:81;width:min(380px,calc(100vw - 32px));height:min(600px,calc(100vh - 120px));display:flex;flex-direction:column;background:var(--card,#fff);border:1px solid var(--line,#e1e8f6);border-radius:var(--r,18px);box-shadow:var(--shadow-lift,0 18px 44px rgba(0,0,0,.16));overflow:hidden;animation:nc-in .18s ease-out}
@keyframes nc-in{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}
.nc-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 14px 12px 18px;border-bottom:1px solid var(--line-soft,#eef3fc)}
.nc-head b{display:block;font-size:16px;font-weight:800;color:var(--ink,#17213a)}
.nc-head span{display:block;font-size:12.5px;color:var(--sub,#7f8aa3);margin-top:1px}
.nc-x{width:34px;height:34px;flex:none;font:inherit;font-size:15px;color:var(--mid,#44506b);background:var(--line-soft,#eef3fc);border:0;border-radius:99px;cursor:pointer}
.nc-list{flex:1;overflow-y:auto;padding:12px 14px 6px;background:var(--bg,#f8fbff);overscroll-behavior:contain}
.nc-empty{margin:40px 12px;text-align:center;font-size:14px;line-height:1.6;color:var(--sub,#7f8aa3)}
.nc-day{display:flex;justify-content:center;margin:10px 0 8px}
.nc-day span{padding:3px 12px;font-size:11.5px;font-weight:700;color:var(--sub,#7f8aa3);background:var(--line-soft,#eef3fc);border-radius:99px}
.nc-row{display:flex;flex-direction:column;margin-top:3px}.nc-row.first{margin-top:10px}
.nc-row.me{align-items:flex-end}.nc-row.you{align-items:flex-start}
.nc-who{font-size:12px;font-weight:700;color:var(--mid,#44506b);margin:0 0 4px 2px}
.nc-line{display:flex;align-items:flex-end;gap:6px;max-width:82%}
.nc-row.me .nc-line{flex-direction:row-reverse}
.nc-bub{padding:9px 13px;font-size:15px;line-height:1.5;color:var(--ink,#17213a);background:var(--card,#fff);border:1px solid var(--line,#e1e8f6);border-radius:18px;word-break:break-word;overflow-wrap:anywhere;min-width:0}
.nc-row.you.first .nc-bub{border-top-left-radius:6px}
.nc-row.me .nc-bub{color:#fff;background:var(--accent,#4f7cff);border-color:transparent}
.nc-row.me.first .nc-bub{border-top-right-radius:6px}
.nc-row.me .nc-bub a{color:#fff}
.nc-bub.pic{padding:3px;background:transparent!important;border-color:transparent}
.nc-img{display:block;max-width:100%;max-height:260px;border-radius:14px;cursor:zoom-in;object-fit:cover}
.nc-img+.nc-tx{margin-top:7px}
.nc-meta{flex:none;display:flex;flex-direction:column;align-items:flex-end;font-size:11px;line-height:1.3;color:var(--sub,#7f8aa3);white-space:nowrap;padding-bottom:2px}
.nc-row.you .nc-meta{align-items:flex-start}
.nc-meta b{font-weight:700;font-size:10.5px;color:var(--sub,#7f8aa3)}.nc-meta b.un{color:var(--accent,#4f7cff)}
.nc-fail{color:var(--err,#e5484d);font-weight:700}
.nc-pic{display:flex;align-items:center;gap:10px;padding:8px 14px;border-top:1px solid var(--line-soft,#eef3fc);background:var(--card,#fff)}
.nc-pic img{width:56px;height:56px;object-fit:cover;border-radius:10px;border:1px solid var(--line,#e1e8f6)}
.nc-pic-x{font:inherit;font-size:13px;font-weight:700;color:var(--mid,#44506b);background:var(--line-soft,#eef3fc);border:0;border-radius:99px;padding:6px 12px;cursor:pointer}
.nc-form{display:flex;align-items:flex-end;gap:8px;padding:10px 12px;border-top:1px solid var(--line-soft,#eef3fc);background:var(--card,#fff)}
.nc-attach{flex:none;width:40px;height:40px;display:grid;place-items:center;font-size:22px;font-weight:600;color:var(--mid,#44506b);background:var(--line-soft,#eef3fc);border-radius:99px;cursor:pointer}
.nc-form textarea{flex:1;min-width:0;resize:none;height:40px;max-height:120px;padding:9px 12px;font:inherit;font-size:15px;line-height:1.45;color:var(--ink,#17213a);background:var(--bg,#f8fbff);border:1px solid var(--line,#e1e8f6);border-radius:14px;outline:none}
.nc-form textarea:focus{border-color:var(--accent,#4f7cff)}
.nc-send{flex:none;height:40px;padding:0 16px;font:inherit;font-size:14.5px;font-weight:800;color:#fff;background:var(--accent,#4f7cff);border:0;border-radius:99px;cursor:pointer}
.nc-send:disabled{opacity:.4;cursor:default}
.nc-flash{position:absolute;left:50%;bottom:70px;transform:translateX(-50%);max-width:88%;padding:9px 14px;font-size:13px;font-weight:700;color:#fff;background:var(--ink,#17213a);border-radius:12px;text-align:center}
.nc-view{position:fixed;inset:0;z-index:120;display:grid;place-items:center;padding:24px;background:rgba(10,14,24,.82);cursor:zoom-out}
.nc-view img{max-width:100%;max-height:100%;border-radius:10px}
.nc-view-x{position:absolute;top:16px;right:16px;width:40px;height:40px;font-size:18px;color:#fff;background:rgba(255,255,255,.16);border:0;border-radius:99px;cursor:pointer}
html.nc-has-fab .main{padding-bottom:96px}
@media (max-width:560px){.nc-fab{height:48px;padding:0 16px 0 13px;font-size:14px}.nc-pane{inset:0;width:auto;height:auto;border-radius:0;border:0}html.nc-open body{overflow:hidden}}
`;
  if (!document.getElementById('nc-css')) { const st = document.createElement('style'); st.id = 'nc-css'; st.textContent = CSS; document.head.appendChild(st); }

  window.NaesinChat = { rpc, shrink, renderMsgs, wireInput, esc, hm };

  // ───────── 학생 화면: 떠 있는 단추 + 대화창 ─────────
  if (!window.NAESIN || !CFG || window.__naesinChat) return;
  window.__naesinChat = true;
  const me = () => { try { const s = JSON.parse(localStorage.getItem(KEY)) || {}; return s.syncKey && s.who ? { student: s.who, code: s.syncKey } : null; } catch (e) { return null; } };

  let msgs = [], lastId = 0, unread = 0, seenUpto = 0, open = false, timer = null, busy = false, who = null, ready = false;
  const fab = document.createElement('button'); fab.type = 'button'; fab.className = 'nc-fab'; fab.hidden = true;
  fab.innerHTML = '<span class="nc-fab-ic" aria-hidden="true"></span><span class="nc-fab-tx">선생님께 말하기</span><span class="nc-badge" hidden></span>';
  const pane = document.createElement('section'); pane.className = 'nc-pane'; pane.hidden = true; pane.setAttribute('aria-label', '선생님께 말하기');
  pane.innerHTML = `<header class="nc-head"><div><b>선생님</b><span>궁금한 거, 숙제 사진, 뭐든 보내 주세요</span></div><button type="button" class="nc-x" aria-label="닫기">✕</button></header>
    <div class="nc-list" data-empty="선생님께 하고 싶은 말을 아래에 써 보세요. 사진도 보낼 수 있어요."></div>
    <div class="nc-pic" hidden><img alt="보낼 사진"><button type="button" class="nc-pic-x">사진 빼기</button></div>
    <form class="nc-form"><label class="nc-attach" title="사진 보내기"><input type="file" accept="image/*" hidden><span aria-hidden="true">＋</span></label>
    <textarea rows="1" placeholder="메시지를 입력하세요" aria-label="메시지"></textarea><button type="submit" class="nc-send" disabled>보내기</button></form>`;
  document.body.append(fab, pane);
  const list = pane.querySelector('.nc-list'), ta = pane.querySelector('textarea'), sendBtn = pane.querySelector('.nc-send');
  const fileIn = pane.querySelector('input[type=file]'), picBox = pane.querySelector('.nc-pic');
  let pic = null;
  const canSend = () => { sendBtn.disabled = !(ta.value.trim() || pic); };
  ta.addEventListener('input', canSend);
  const fit = wireInput(ta, () => doSend());

  function badge() {
    const b = fab.querySelector('.nc-badge');
    b.hidden = !unread || open; b.textContent = unread > 9 ? '9+' : String(unread);
    fab.classList.toggle('has-new', !!unread && !open);
  }
  const draw = () => renderMsgs(list, msgs, 'student', seenUpto, '선생님');

  async function poll(first) {
    const w = me(); if (!w) { fab.hidden = true; return; }
    if (who && (who.student !== w.student || who.code !== w.code)) { msgs = []; lastId = 0; } // 다른 아이로 바뀜
    who = w; if (busy) return; busy = true;
    try {
      const r = await rpc('naesin_msg_list', { p_student: w.student, p_code: w.code, p_after: lastId, p_seen: open && !document.hidden });
      ready = true; fab.hidden = document.documentElement.classList.contains('teacher'); document.documentElement.classList.toggle('nc-has-fab', !fab.hidden);
      const fresh = (r.msgs || []).filter((m) => !msgs.some((x) => x.id === m.id));
      const changed = fresh.length || r.seen_upto !== seenUpto;
      if (fresh.length) { msgs = msgs.filter((x) => !x.pending && !x.failed || x.keep).concat(fresh).sort((a, b) => a.id - b.id); lastId = Math.max(lastId, ...fresh.map((m) => m.id)); }
      seenUpto = r.seen_upto || 0; unread = open && !document.hidden ? 0 : r.unread || 0; badge();
      if (open && (changed || first)) draw();
    } catch (e) {
      if (e.status && /denied/.test(e.message)) { fab.hidden = true; ready = false; document.documentElement.classList.remove('nc-has-fab'); } // 선생님 코드·코드 없음 → 단추 숨김
    }
    busy = false;
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(async () => { await poll(); schedule(); }, open ? 5000 : 30000); }

  function setOpen(v) {
    open = v; pane.hidden = !v; fab.classList.toggle('on', v); document.documentElement.classList.toggle('nc-open', v);
    if (v) { list.dataset.stick = '1'; draw(); poll(true); setTimeout(() => ta.focus(), 30); }
    badge(); schedule();
  }
  fab.onclick = () => setOpen(!open);
  pane.querySelector('.nc-x').onclick = () => setOpen(false);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open && !document.querySelector('.nc-view')) setOpen(false); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { poll(); schedule(); } });

  fileIn.onchange = async () => {
    const f = fileIn.files[0]; fileIn.value = ''; if (!f) return;
    try { pic = await shrink(f); picBox.querySelector('img').src = pic; picBox.hidden = false; canSend(); ta.focus(); }
    catch (e) { flash('이 사진은 보낼 수 없어요. 다른 사진을 골라 주세요.'); }
  };
  picBox.querySelector('.nc-pic-x').onclick = () => { pic = null; picBox.hidden = true; canSend(); };
  // 붙여넣기한 사진도 보내기
  ta.addEventListener('paste', async (e) => {
    const it = [...(e.clipboardData || {}).items || []].find((x) => x.type.startsWith('image/')); if (!it) return;
    e.preventDefault(); try { pic = await shrink(it.getAsFile()); picBox.querySelector('img').src = pic; picBox.hidden = false; canSend(); } catch (er) {}
  });
  function flash(t) { const d = document.createElement('div'); d.className = 'nc-flash'; d.textContent = t; pane.appendChild(d); setTimeout(() => d.remove(), 2600); }

  pane.querySelector('.nc-form').onsubmit = (e) => { e.preventDefault(); doSend(); };
  async function doSend() {
    const body = ta.value.trim(), img = pic; if (!body && !img) return;
    const w = me(); if (!w) return;
    const tmp = { id: 1e15 + Date.now(), sender: 'student', body, img, at: new Date().toISOString(), pending: true };
    msgs.push(tmp); ta.value = ''; fit(); pic = null; picBox.hidden = true; canSend(); list.dataset.stick = '1'; draw();
    try {
      const m = await rpc('naesin_msg_send', { p_student: w.student, p_code: w.code, p_body: body, p_img: img });
      msgs = msgs.filter((x) => x !== tmp); if (!msgs.some((x) => x.id === m.id)) msgs.push(m); msgs.sort((a, b) => a.id - b.id);
    } catch (er) {
      tmp.pending = false; tmp.failed = true; tmp.keep = true;
      flash(/slow/.test(er.message) ? '너무 빨리 보내고 있어요. 잠깐 뒤에 다시 보내 주세요.' : '인터넷이 끊겨서 못 보냈어요. 다시 보내 주세요.');
      if (!ta.value) { ta.value = body; fit(); } if (img && !pic) { pic = img; picBox.querySelector('img').src = img; picBox.hidden = false; }
      msgs = msgs.filter((x) => x !== tmp); canSend();
    }
    list.dataset.stick = '1'; draw();
  }

  poll(true).then(schedule);
})();
