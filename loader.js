/* 말랑 내신 — 웹(GitHub Pages)용 시작 코드.
   교재·기출 내용은 공개 저장소에 두지 않고 서버(Supabase)에서 받아옵니다. 학생 비밀 코드(k)가 있어야 받을 수 있어요.
   한 번 받은 내용은 이 기기에 넣어 두어서 다음부터는 바로 열립니다. */
// 앱이 시작하다 멈추면(오류) 유령 화면에 갇히지 않게: 오류 내용과 '정리하고 다시 열기'를 보여 줍니다.
(function () {
  let shown = false;
  function fail(msg) {
    if (shown || window.__naesinStarted) return; shown = true;
    const sp = document.getElementById('splash'); if (sp) sp.remove();
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;z-index:200;display:grid;place-items:center;background:#f8fbff;font-family:Pretendard,system-ui,sans-serif;padding:24px';
    d.innerHTML = '<div style="max-width:440px;text-align:center;line-height:1.6"><div style="font-size:40px">👻</div><b style="font-size:18px">앱을 여는 중에 문제가 생겼어요</b>' +
      '<p style="color:#44506b;font-size:14px">아래 버튼을 누르면 이 컴퓨터에 남은 예전 정보만 정리하고 다시 열어요. 공부한 기록은 서버에 있어서 그대로 돌아와요.</p>' +
      '<button id="boot-fix" style="padding:12px 20px;font-size:15px;font-weight:700;color:#fff;background:#4f7cff;border:0;border-radius:12px;cursor:pointer">정리하고 다시 열기</button>' +
      '<p style="margin-top:18px;font-size:11.5px;color:#7f8aa3;word-break:break-all">오류: ' + String(msg).replace(/[<>&]/g, '') + '</p></div>';
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
  window.addEventListener('error', function (e) { fail((e.message || 'error') + ' @' + (e.filename || '').split('/').pop() + ':' + (e.lineno || '')); });
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
  if (!code) { msg('선생님이 보내 준 링크로 열어 주세요.'); return; }
  try {
    let fresh = null;
    try { fresh = await fetchLocalContent(); } catch (e) { msg('불러오는 중… (다른 길로 시도)'); }
    if (!fresh) fresh = await Promise.race([fetchContent(), new Promise((_, no) => setTimeout(() => no(new Error('server slow')), 8000))]);
    if (!fresh) { msg('링크가 맞지 않아요. 선생님께 다시 받아 주세요.'); return; }
    data = fresh; try { localStorage.setItem(CKEY, JSON.stringify(fresh)); } catch {}
  } catch (e) {
    if (cached) data = cached; else { msg('인터넷 연결을 확인해 주세요.'); return; }
  }
  data.sync = C;
  window.NAESIN = data;
  const s = document.createElement('script'); s.src = 'app.js?v=' + (data.version || '') + '-' + Date.now(); /* 늘 최신 앱 코드 */ s.onload = () => { const m = document.getElementById('boot-msg'); if (m) m.remove(); }; document.body.appendChild(s);
})();
