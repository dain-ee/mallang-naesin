/* 말랑 내신 — 웹(GitHub Pages)용 시작 코드.
   교재·기출 내용은 공개 저장소에 두지 않고 서버(Supabase)에서 받아옵니다. 학생 비밀 코드(k)가 있어야 받을 수 있어요.
   한 번 받은 내용은 이 기기에 넣어 두어서 다음부터는 바로 열립니다. */
(async () => {
  const C = window.NAESIN_SYNC; // { url, key }
  const KEY = 'mallang-naesin:v1', CKEY = 'mallang-naesin:content';
  const q = new URLSearchParams(location.search);
  let st = {}; try { st = JSON.parse(localStorage.getItem(KEY)) || {}; } catch {}
  const code = q.get('k') || st.syncKey;
  const msg = (t) => { const m = document.getElementById('boot-msg'); if (m) m.textContent = t; };
  let cached = null; try { cached = JSON.parse(localStorage.getItem(CKEY)); } catch {}
  async function fetchContent() {
    const r = await fetch(`${C.url}/rest/v1/rpc/naesin_content_get`, { method: 'POST', headers: { apikey: C.key, Authorization: `Bearer ${C.key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_code: code }) });
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }
  let data = null;
  if (!code) { msg('선생님이 보내 준 링크로 열어 주세요.'); return; }
  try {
    const fresh = await fetchContent();
    if (!fresh) { msg('링크가 맞지 않아요. 선생님께 다시 받아 주세요.'); return; }
    data = fresh; try { localStorage.setItem(CKEY, JSON.stringify(fresh)); } catch {}
  } catch (e) {
    if (cached) data = cached; else { msg('인터넷 연결을 확인해 주세요.'); return; }
  }
  data.sync = C;
  window.NAESIN = data;
  const s = document.createElement('script'); s.src = 'app.js?v=' + (data.version || ''); s.onload = () => { const m = document.getElementById('boot-msg'); if (m) m.remove(); }; document.body.appendChild(s);
})();
