// DeepSeek Chat Exporter v2.8 — tip on every export
(function() {
  'use strict';

  const BUTTON_ID = 'ds-export-btn';
  const DONATE_ID = 'ds-donate-btn';
  const TIP_ID = 'ds-tip';
  const SEPARATOR = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  const GAP = '\n\n\n';

  // ЗАМЕНИ НИК НА СВОЙ
  const DONATE_URL = 'https://www.donationalerts.com/r/ТВОЙ_НИК';

  // ---------- ЯЗЫК ----------
  const LANG = (navigator.language || 'en').toLowerCase();
  const STRINGS = {
    ru: {
      exportBtn: '📥 Экспорт .md',
      exportTitle: 'Экспортировать текущий чат DeepSeek в Markdown',
      loading: '⏳ Загрузка...',
      donateTitle: 'Поддержать автора',
      tip: '⭐ Понравилось расширение? <a href="%URL%" target="_blank" rel="noopener">Поддержи автора</a>'
    },
    en: {
      exportBtn: '📥 Export .md',
      exportTitle: 'Export current DeepSeek chat to Markdown',
      loading: '⏳ Loading...',
      donateTitle: 'Support the author',
      tip: '⭐ Enjoying the extension? <a href="%URL%" target="_blank" rel="noopener">Support the author</a>'
    },
    zh: {
      exportBtn: '📥 导出 .md',
      exportTitle: '将当前 DeepSeek 对话导出为 Markdown',
      loading: '⏳ 加载中...',
      donateTitle: '支持作者',
      tip: '⭐ 喜欢这个扩展吗？<a href="%URL%" target="_blank" rel="noopener">支持作者</a>'
    }
  };
  function pickLang() {
    if (LANG.startsWith('ru')) return 'ru';
    if (LANG.startsWith('zh')) return 'zh';
    return 'en';
  }
  const T = STRINGS[pickLang()];

  // ---------- СТИЛИ ----------
  if (!document.getElementById('ds-styles')) {
    const st = document.createElement('style');
    st.id = 'ds-styles';
    st.textContent = `
#ds-export-btn{position:fixed;bottom:20px;right:20px;z-index:999999;padding:10px 16px;background:linear-gradient(135deg,#4a6cf7 0%,#6366f1 100%);color:#fff;border:none;border-radius:10px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:14px;font-weight:600;letter-spacing:.2px;cursor:pointer;box-shadow:0 4px 14px rgba(74,108,247,.4),0 2px 4px rgba(0,0,0,.1);transition:transform .15s ease,box-shadow .15s ease,background .2s;}
#ds-export-btn:hover{background:linear-gradient(135deg,#3b5ce0 0%,#4f46e5 100%);transform:translateY(-2px);box-shadow:0 6px 20px rgba(74,108,247,.5),0 3px 6px rgba(0,0,0,.15);}
#ds-export-btn:active{transform:translateY(0);}
#ds-export-btn:disabled{background:#94a3b8;cursor:wait;transform:none;box-shadow:none;}
#ds-donate-btn{position:fixed;bottom:22px;right:178px;z-index:999999;width:28px;height:28px;background:rgba(255,255,255,.85);color:#f59e0b;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;line-height:1;text-decoration:none;box-shadow:0 2px 6px rgba(0,0,0,.1);opacity:.7;transition:transform .15s ease,box-shadow .15s ease,opacity .15s ease;}
#ds-donate-btn:hover{transform:scale(1.12);box-shadow:0 4px 10px rgba(245,158,11,.35);opacity:1;}
#ds-tip{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);z-index:999999;background:rgba(30,41,59,.95);color:#f1f5f9;padding:12px 20px;border-radius:10px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:13px;box-shadow:0 8px 24px rgba(0,0,0,.25);opacity:.98;transition:opacity .4s ease;}
#ds-tip a{color:#fbbf24;text-decoration:none;font-weight:600;}
#ds-tip a:hover{text-decoration:underline;}
`;
    document.head.appendChild(st);
  }

  // ---------- API ----------
  function getSessionId() {
    const m = location.pathname.match(/\/chat\/s\/([a-f0-9-]+)/i);
    return m ? m[1] : null;
  }
  function getToken() {
    try {
      const raw = localStorage.getItem('userToken');
      if (!raw) return null;
      return JSON.parse(raw).value || null;
    } catch (e) { return null; }
  }
  async function fetchHistory(sid) {
    const token = getToken();
    if (!token) throw new Error('userToken not found — log in to DeepSeek.');
    const r = await fetch(`/api/v0/chat/history_messages?chat_session_id=${sid}`, {
      credentials: 'include',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    if (j.code !== 0) throw new Error(`API ${j.code}: ${j.msg}`);
    const biz = j.data?.biz_data;
    if (!biz) throw new Error('Empty API response');
    return {
      title: biz.chat_session?.title || 'DeepSeek Chat',
      messages: biz.chat_messages || []
    };
  }

  // ---------- Парсинг ----------
  function extractText(msg) {
    const parts = [];
    for (const f of msg.fragments || []) {
      if (msg.role === 'USER') {
        if (f.type === 'REQUEST' && f.content) parts.push(f.content);
        else if (f.type === 'FILE' && Array.isArray(f.files)) {
          const names = f.files.map(x => x.file_name).filter(Boolean);
          if (names.length) parts.push('📎 ' + names.join(', '));
        }
      } else if (msg.role === 'ASSISTANT') {
        if (f.type === 'RESPONSE' && f.content) parts.push(f.content);
      }
    }
    return parts.join('\n\n').trim();
  }
  function convert(messages) {
    const out = [];
    for (const m of messages) {
      const text = extractText(m);
      if (!text) continue;
      const prev = out[out.length - 1];
      if (prev && prev.role === m.role) prev.text += '\n\n' + text;
      else out.push({ role: m.role, text });
    }
    return out;
  }
  function cleanBody(text) {
    const lines = text.split('\n');
    const out = [];
    let inCode = false;
    for (const line of lines) {
      if (/^\s*```/.test(line)) inCode = !inCode;
      if (!inCode) {
        const t = line.trim();
        if (/^-{3,}$/.test(t) || /^━{3,}$/.test(t) || /^═{3,}$/.test(t)
            || /^\*{3,}$/.test(t) || /^_{3,}$/.test(t)) continue;
      }
      out.push(line);
    }
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  function formatMarkdown(title, messages) {
    const blocks = [`# ${title}`];
    for (const m of messages) blocks.push(`*** ${m.role} ***\n\n${cleanBody(m.text)}`);
    return blocks.join(GAP + SEPARATOR + GAP) + '\n';
  }
  function safeFilename(title) {
    return (title || 'chat').replace(/[\\/:*?"<>|#]/g, '_')
      .replace(/\s+/g, ' ').trim().slice(0, 60) || 'chat';
  }
  function download(content, filename) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 100);
  }

  // ← показываем при каждом экспорте, без проверки даты
  function showTip() {
    const old = document.getElementById(TIP_ID);
    if (old) old.remove();
    const tip = document.createElement('div');
    tip.id = TIP_ID;
    tip.innerHTML = T.tip.replace('%URL%', DONATE_URL);
    (document.body || document.documentElement).appendChild(tip);
    setTimeout(() => {
      tip.style.opacity = '0';
      setTimeout(() => tip.remove(), 400);
    }, 5000);
  }

  // ---------- Экспорт ----------
  async function handleExport() {
    const btn = document.getElementById(BUTTON_ID);
    const old = btn ? btn.textContent : '';
    if (btn) { btn.textContent = T.loading; btn.disabled = true; }
    try {
      const sid = getSessionId();
      if (!sid) throw new Error('Chat ID not found in URL.');
      const { title, messages: raw } = await fetchHistory(sid);
      const msgs = convert(raw);
      console.log('[DS Exporter] API returned:', raw.length,
                  '→ USER:', msgs.filter(m => m.role === 'USER').length,
                  'ASSISTANT:', msgs.filter(m => m.role === 'ASSISTANT').length,
                  '| title:', title);
      if (!msgs.length) { alert('No messages found.'); return; }
      const md = formatMarkdown(title, msgs);
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      download(md, `${safeFilename(title)}-${stamp}.md`);
      showTip();
    } catch (e) {
      console.error(e);
      alert('Export error: ' + e.message);
    } finally {
      if (btn) { btn.textContent = old || T.exportBtn; btn.disabled = false; }
    }
  }

  // ---------- UI ----------
  function createButton() {
    if (document.getElementById(BUTTON_ID)) return;
    const btn = document.createElement('button');
    btn.id = BUTTON_ID;
    btn.textContent = T.exportBtn;
    btn.title = T.exportTitle;
    btn.addEventListener('click', handleExport);
    (document.body || document.documentElement).appendChild(btn);
  }
  function createDonateButton() {
    if (document.getElementById(DONATE_ID)) return;
    const a = document.createElement('a');
    a.id = DONATE_ID;
    a.textContent = '☕';
    a.title = T.donateTitle;
    a.href = DONATE_URL;
    a.target = '_blank';
    a.rel = 'noopener';
    (document.body || document.documentElement).appendChild(a);
  }
  function ensureUI() {
    if (!document.getElementById(BUTTON_ID)) createButton();
    if (!document.getElementById(DONATE_ID)) createDonateButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureUI);
  } else {
    ensureUI();
  }

  let t = null;
  const obs = new MutationObserver(() => {
    if (t) return;
    t = setTimeout(() => { t = null; ensureUI(); }, 300);
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });

  console.log('[DS Exporter] v2.8 loaded. Language:', pickLang());
})();