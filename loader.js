/* 말랑 내신 — 웹(GitHub Pages)용 시작 코드.
   교재·기출 내용은 공개 저장소에 두지 않고 서버(Supabase)에서 받아옵니다. 학생 비밀 코드(k)가 있어야 받을 수 있어요.
   한 번 받은 내용은 이 기기에 넣어 두어서 다음부터는 바로 열립니다. */
// 앱이 시작하다 멈추면(오류) 유령 화면에 갇히지 않게: 오류 내용과 '정리하고 다시 열기'를 보여 줍니다.
window.__boot = [];
function bootStep(t) { try { window.__boot.push(((performance.now() / 1000) | 0) + 's ' + t); } catch (e) {} }
(function () {
  let shown = false;
  function fail(msg) {
    if (shown || window.__naesinStarted || window.__naesinAsk) return; shown = true;
    const sp = document.getElementById('splash'); if (sp) sp.remove();
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;z-index:200;display:grid;place-items:center;background:#f8fbff;font-family:Pretendard,system-ui,sans-serif;padding:24px';
    d.innerHTML = '<div style="max-width:440px;text-align:center;line-height:1.6"><div style="font-size:40px">👻</div><b style="font-size:18px">앱을 여는 중에 문제가 생겼어요</b>' +
      '<p style="color:#44506b;font-size:14px">아래 버튼을 누르면 이 컴퓨터에 남은 예전 정보만 정리하고 다시 열어요. 공부한 기록은 서버에 있어서 그대로 돌아와요.</p>' +
      '<button id="boot-fix" style="padding:12px 20px;font-size:15px;font-weight:700;color:#fff;background:#4f7cff;border:0;border-radius:12px;cursor:pointer">정리하고 다시 열기</button>' +
      '<p style="margin-top:18px;font-size:11.5px;color:#7f8aa3;word-break:break-all">오류: ' + String(msg).replace(/[<>&]/g, '') + '</p>' +
      '<pre style="text-align:left;font-size:11px;color:#7f8aa3;white-space:pre-wrap;word-break:break-all;background:#eef3fb;border-radius:8px;padding:8px">' +
      ('주소: ' + location.pathname + location.search.replace(/k=([^&]{4})[^&]*/, 'k=$1…') + '\n' + window.__boot.join('\n') + '\n' + navigator.userAgent).replace(/[<>&]/g, '') + '</pre></div>';
    document.body.appendChild(d);
    document.getElementById('boot-fix').onclick = function () {
      try {
        const st = JSON.parse(localStorage.getItem('mallang-naesin:v1') || '{}');
        localStorage.removeItem('mallang-naesin:content');
        localStorage.setItem('mallang-naesin:v1', JSON.stringify({ syncKey: st.syncKey, who: st.who }));
      } catch (e) { try { localStorage.clear(); } catch (e2) {} }
      location.replace(location.pathname + location.search);
    };
  }
  // 파일(앱 코드·글꼴 등)을 못 받으면 어느 파일인지 남김
  window.addEventListener('error', function (e) { const t = e.target; if (t && t !== window && (t.src || t.href)) bootStep('파일 못 받음 ' + (t.src || t.href).split('/').pop()); }, true);
  window.addEventListener('error', function (e) { if (e.target && e.target !== window) return; fail((e.message || 'error') + ' @' + (e.filename || '').split('/').pop() + ':' + (e.lineno || '')); });
  window.addEventListener('unhandledrejection', function (e) { fail('promise: ' + ((e.reason && e.reason.message) || e.reason)); });
  setTimeout(function () { if (!window.__naesinStarted) fail('시작이 15초 넘게 걸려요 (인터넷이 느리거나 막혔을 수 있어요)'); }, 15000);
})();

(async () => {
  const C = window.NAESIN_SYNC; // { url, key }
  const KEY = 'mallang-naesin:v1', CKEY = 'mallang-naesin:content';
  const q = new URLSearchParams(location.search);
  let st = {}; try { st = JSON.parse(localStorage.getItem(KEY)) || {}; } catch {}
  const code = q.get('k') || st.syncKey;
  const msg = (t) => { const m = document.getElementById('boot-msg'); if (m) m.textContent = t; };
  let cached = null; try { cached = JSON.parse(localStorage.getItem(CKEY)); } catch {}
  // 1순위: 같은 주소(github.io)의 암호화 내용 — 서버(supabase) 연결이 막힌 컴퓨터에서도 열림
  async function fetchLocalContent() {
    const enc = new TextEncoder();
    const hex = async (t) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(t)))].map((b) => b.toString(16).padStart(2, '0')).join('');
    const fid = (await hex('naesin:' + code)).slice(0, 20);
    const r = await fetch('c/' + fid + '.bin?v=' + Date.now());
    if (!r.ok) throw new Error('local ' + r.status);
    const buf = new Uint8Array(await r.arrayBuffer());
    const keyHex = await hex(code), keyBytes = new Uint8Array(keyHex.match(/../g).map((h) => parseInt(h, 16)));
    const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-CTR', false, ['decrypt']);
    const plain = await crypto.subtle.decrypt({ name: 'AES-CTR', counter: buf.slice(0, 16), length: 64 }, key, buf.slice(16));
    const txt = await new Response(new Blob([plain]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    return JSON.parse(txt);
  }
  async function fetchContent() {
    const r = await fetch(`${C.url}/rest/v1/rpc/naesin_content_get`, { method: 'POST', headers: { apikey: C.key, Authorization: `Bearer ${C.key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_code: code }) });
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }
  let data = null;
  bootStep('시작 (코드 ' + (code ? code.slice(0, 4) + '…' + (q.get('k') ? ' 링크' : ' 저장') : '없음') + ')');
  if (!code) { askCode(); return; }
  // 짧은 코드 입력 — 긴 링크를 손으로 칠 수 없는 컴퓨터용. 한 번 넣으면 이 기기에 기억됨
  function askCode(err) {
    window.__naesinAsk = true;
    const sp = document.getElementById('splash'); if (sp) sp.remove();
    const m = document.getElementById('boot-msg'); if (m) m.remove();
    let d = document.getElementById('code-ask');
    if (!d) {
      d = document.createElement('form'); d.id = 'code-ask';
      d.style.cssText = 'position:fixed;inset:0;z-index:200;display:grid;place-items:center;background:#f8fbff;font-family:Pretendard,system-ui,sans-serif;padding:24px';
      d.innerHTML = '<div style="text-align:center;line-height:1.6"><div style="font-size:40px">👻</div><b style="font-size:20px">말랑 내신</b>' +
        '<p style="color:#44506b;font-size:15px;margin:6px 0 14px">선생님이 알려 준 코드를 넣어 주세요</p>' +
        '<input id="code-in" autocomplete="off" autocapitalize="off" spellcheck="false" style="font-size:22px;padding:12px 14px;width:220px;text-align:center;border:2px solid #c9d6ef;border-radius:12px;outline:none">' +
        '<div><button style="margin-top:14px;padding:12px 28px;font-size:16px;font-weight:700;color:#fff;background:#4f7cff;border:0;border-radius:12px;cursor:pointer">시작</button></div>' +
        '<p id="code-err" style="color:#e5484d;font-size:14px;min-height:20px"></p></div>';
      document.body.appendChild(d);
      d.onsubmit = async (e) => {
        e.preventDefault();
        const w = document.getElementById('code-in').value.trim().toLowerCase().replace(/\s+/g, '');
        if (!w) return;
        try {
          const enc = new TextEncoder();
          const hx = async (t) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(t)))].map((b) => b.toString(16).padStart(2, '0')).join('');
          const r = await fetch('a/' + (await hx('alias:' + w)).slice(0, 20) + '.bin?v=' + Date.now());
          if (!r.ok) throw new Error('nf');
          const buf = new Uint8Array(await r.arrayBuffer());
          const kb = new Uint8Array((await hx('naesin-alias:' + w)).match(/../g).map((h) => parseInt(h, 16)));
          const key = await crypto.subtle.importKey('raw', kb, 'AES-CTR', false, ['decrypt']);
          const o = JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-CTR', counter: buf.slice(0, 16), length: 64 }, key, buf.slice(16))));
          let cur = {}; try { cur = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e2) {}
          cur.syncKey = o.code; cur.who = o.who;
          localStorage.setItem(KEY, JSON.stringify(cur));
          location.replace(location.pathname);
        } catch (e2) { document.getElementById('code-err').textContent = '코드가 맞지 않아요. 다시 확인해 주세요.'; }
      };
    }
    if (err) document.getElementById('code-err').textContent = err;
    setTimeout(() => { const i = document.getElementById('code-in'); if (i) i.focus(); }, 50);
  }
  try {
    let fresh = null;
    try { fresh = await fetchLocalContent(); bootStep('내용 받음(같은 주소)'); } catch (e) { bootStep('같은 주소 실패: ' + e.message); msg('불러오는 중… (다른 길로 시도)'); }
    if (!fresh) fresh = await Promise.race([fetchContent(), new Promise((_, no) => setTimeout(() => no(new Error('server slow')), 8000))]);
    if (!fresh) { bootStep('서버도 내용 없음 → 링크 코드가 틀림'); askCode('저장된 코드가 맞지 않아요. 선생님 코드를 다시 넣어 주세요.'); return; }
    data = fresh; try { localStorage.setItem(CKEY, JSON.stringify(fresh)); } catch {}
  } catch (e) {
    bootStep('서버 실패: ' + e.message + (cached ? ' → 저장본 사용' : ''));
    if (cached) data = cached; else { msg('인터넷 연결을 확인해 주세요.'); return; }
  }
  data.sync = C;
  window.NAESIN = data;
  const s = document.createElement('script'); s.src = 'app.js?v=' + (data.version || '') + '-' + Date.now(); /* 늘 최신 앱 코드 */ s.onerror = () => bootStep('앱 코드 못 받음'); s.onload = () => { bootStep('앱 코드 받음'); const m = document.getElementById('boot-msg'); if (m) m.remove(); }; document.body.appendChild(s);
})();
