/**
 * Leen-Co AI — Embeddable Chat Widget
 * Usage: <script src="https://your-domain.com/widget/leenco.js" data-tenant-id="YOUR_TENANT_ID"></script>
 */
(function () {
  const script = document.currentScript;
  const tenantId = script?.getAttribute("data-tenant-id");
  const apiBase = script?.getAttribute("data-api-url") || "https://leenco.ai";

  if (!tenantId) { console.error("Leen-Co: data-tenant-id is required"); return; }

  let conversationId = null;
  let isOpen = false;
  let isLoading = false;

  const styles = `
    #leenco-widget * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    #leenco-bubble { position: fixed; bottom: 24px; right: 24px; width: 52px; height: 52px; border-radius: 50%; background: #534AB7; border: none; cursor: pointer; box-shadow: 0 4px 16px rgba(83,74,183,.4); display: flex; align-items: center; justify-content: center; z-index: 9999; transition: transform .2s; }
    #leenco-bubble:hover { transform: scale(1.08); }
    #leenco-bubble svg { width: 24px; height: 24px; fill: none; stroke: #fff; stroke-width: 2; }
    #leenco-panel { position: fixed; bottom: 88px; right: 24px; width: 340px; max-height: 520px; background: #fff; border-radius: 16px; box-shadow: 0 8px 40px rgba(0,0,0,.14); display: flex; flex-direction: column; z-index: 9998; overflow: hidden; transition: opacity .2s, transform .2s; }
    #leenco-panel.hidden { opacity: 0; pointer-events: none; transform: translateY(12px); }
    #leenco-header { background: #534AB7; padding: 14px 16px; display: flex; align-items: center; gap: 10px; }
    #leenco-header-av { width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,.25); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 500; color: #fff; flex-shrink: 0; }
    #leenco-header-name { font-size: 13px; font-weight: 500; color: #fff; }
    #leenco-header-role { font-size: 11px; color: rgba(255,255,255,.75); }
    #leenco-close { margin-left: auto; background: none; border: none; color: rgba(255,255,255,.75); cursor: pointer; font-size: 20px; line-height: 1; padding: 0; }
    #leenco-messages { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; background: #f7f7f8; }
    .leenco-ai-msg { background: #fff; border-radius: 10px 10px 10px 2px; padding: 9px 12px; font-size: 13px; color: #1a1a1a; max-width: 88%; line-height: 1.5; border: 1px solid #ebebeb; }
    .leenco-user-msg { background: #534AB7; border-radius: 10px 10px 2px 10px; padding: 9px 12px; font-size: 13px; color: #fff; max-width: 82%; margin-left: auto; line-height: 1.5; }
    .leenco-typing { display: flex; gap: 4px; padding: 12px; background: #fff; border-radius: 10px; width: fit-content; border: 1px solid #ebebeb; }
    .leenco-typing span { width: 6px; height: 6px; border-radius: 50%; background: #999; animation: leenco-bounce .9s infinite; }
    .leenco-typing span:nth-child(2) { animation-delay: .15s; }
    .leenco-typing span:nth-child(3) { animation-delay: .3s; }
    @keyframes leenco-bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }
    #leenco-form-card { background: #f0effe; border-radius: 10px; padding: 12px; font-size: 12px; }
    #leenco-form-card p { font-weight: 500; color: #26215C; margin-bottom: 8px; }
    #leenco-form-card input { width: 100%; border: 1px solid #ccc; border-radius: 7px; padding: 7px 10px; font-size: 12px; margin-bottom: 6px; }
    #leenco-form-card button { width: 100%; background: #534AB7; color: #fff; border: none; border-radius: 7px; padding: 8px; font-size: 12px; font-weight: 500; cursor: pointer; }
    #leenco-input-bar { padding: 10px 12px; border-top: 1px solid #ebebeb; display: flex; gap: 8px; background: #fff; }
    #leenco-input { flex: 1; border: 1px solid #ddd; border-radius: 8px; padding: 8px 12px; font-size: 13px; outline: none; }
    #leenco-send { background: #534AB7; border: none; border-radius: 8px; width: 34px; height: 34px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    #leenco-send svg { width: 16px; height: 16px; fill: none; stroke: #fff; stroke-width: 2; }
    #leenco-footer { padding: 6px; text-align: center; font-size: 10px; color: #999; background: #fff; border-top: 1px solid #f0f0f0; }
    #leenco-footer a { color: #534AB7; text-decoration: none; }
  `;

  const el = document.createElement("div");
  el.id = "leenco-widget";
  el.innerHTML = `
    <style>${styles}</style>
    <button id="leenco-bubble" aria-label="Open chat">
      <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
    </button>
    <div id="leenco-panel" class="hidden">
      <div id="leenco-header">
        <div id="leenco-header-av">L</div>
        <div><div id="leenco-header-name">Leen</div><div id="leenco-header-role">AI assistant</div></div>
        <button id="leenco-close" aria-label="Close chat">×</button>
      </div>
      <div id="leenco-messages"></div>
      <div id="leenco-input-bar">
        <input id="leenco-input" type="text" placeholder="Type a message…" autocomplete="off"/>
        <button id="leenco-send" aria-label="Send">
          <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
      <div id="leenco-footer">Powered by <a href="https://leenco.ai" target="_blank">Leen-Co AI</a></div>
    </div>
  `;
  document.body.appendChild(el);

  const panel = document.getElementById("leenco-panel");
  const msgs  = document.getElementById("leenco-messages");
  const input = document.getElementById("leenco-input");
  const bubble = document.getElementById("leenco-bubble");

  function togglePanel() {
    isOpen = !isOpen;
    panel.classList.toggle("hidden", !isOpen);
    if (isOpen && msgs.children.length === 0) addGreeting();
  }

  function addGreeting() {
    appendMsg("ai", "Hi! I'm Leen, the AI assistant. How can I help you today?");
  }

  function appendMsg(type, text) {
    const div = document.createElement("div");
    div.className = type === "ai" ? "leenco-ai-msg" : "leenco-user-msg";
    div.textContent = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function showTyping() {
    const div = document.createElement("div");
    div.className = "leenco-typing";
    div.id = "leenco-typing";
    div.innerHTML = "<span></span><span></span><span></span>";
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function removeTyping() {
    document.getElementById("leenco-typing")?.remove();
  }

  async function sendMessage(text) {
    if (!text.trim() || isLoading) return;
    isLoading = true;
    appendMsg("user", text);
    showTyping();

    try {
      const res = await fetch(`${apiBase}/api/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, conversationId, message: text, channel: "website" }),
      });
      const data = await res.json();
      removeTyping();
      if (data.error) { appendMsg("ai", "Sorry, something went wrong. Please try again."); }
      else { conversationId = data.conversationId; appendMsg("ai", data.message); }
    } catch { removeTyping(); appendMsg("ai", "Network error. Please check your connection."); }
    finally { isLoading = false; }
  }

  bubble.addEventListener("click", togglePanel);
  document.getElementById("leenco-close").addEventListener("click", togglePanel);
  document.getElementById("leenco-send").addEventListener("click", () => {
    const val = input.value.trim();
    if (val) { input.value = ""; sendMessage(val); }
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); const val = input.value.trim(); if (val) { input.value = ""; sendMessage(val); } }
  });
})();
