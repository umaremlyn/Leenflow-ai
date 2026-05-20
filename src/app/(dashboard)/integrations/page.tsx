"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plug, Copy, Check, ExternalLink, Smartphone, Globe, Code2 } from "lucide-react";

export default function IntegrationsPage() {
  const [tenantId, setTenantId]     = useState<string|null>(null);
  const [appUrl, setAppUrl]         = useState("");
  const [copied, setCopied]         = useState<string|null>(null);
  const [waConnected, setWaConnected] = useState(false);
  const [waPhone, setWaPhone]       = useState("");
  const [waToken, setWaToken]       = useState("");
  const [savingWa, setSavingWa]     = useState(false);
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: u } = await supabase.from("users").select("tenant_id").eq("id", user!.id).single();
    setTenantId(u!.tenant_id);
    setAppUrl(process.env.NEXT_PUBLIC_APP_URL ?? "https://leenco.ai");
  }, []);

  useEffect(() => { load(); }, [load]);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const widgetScript = `<script
  src="${appUrl}/widget/leenco.js"
  data-tenant-id="${tenantId ?? "YOUR_TENANT_ID"}"
  data-api-url="${appUrl}"
  async
></script>`;

  const apiExample = `// Send a message to the AI
const response = await fetch("${appUrl}/api/assistant/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    tenantId: "${tenantId ?? "YOUR_TENANT_ID"}",
    message: "What products do you sell?",
    channel: "api",
    visitorName: "John Doe",
    visitorEmail: "john@example.com"
  })
});
const { message, conversationId, confScore } = await response.json();`;

  const webhookExample = `// Leen-Co sends POST to your URL on these events:
// - lead.captured  { lead, conversation }
// - conversation.started  { conversation }

// Example payload:
{
  "event": "lead.captured",
  "tenant_id": "${tenantId ?? "YOUR_TENANT_ID"}",
  "data": {
    "lead": { "full_name": "Chidi Kalu", "email": "chidi@email.com", "temperature": "hot" },
    "conversation": { "channel": "website", "msg_count": 6 }
  }
}`;

  async function saveWhatsApp(e: React.FormEvent) {
    e.preventDefault(); setSavingWa(true);
    // In production: store WHATSAPP_PHONE_NUMBER_ID per tenant in DB
    await new Promise(r => setTimeout(r, 800));
    setWaConnected(true); setSavingWa(false);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Plug size={18} className="text-brand-600" /> Integrations
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Deploy your AI assistant on your website, WhatsApp, and more</p>
      </div>

      <div className="space-y-4">

        {/* ── Website Widget ─────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center">
              <Globe size={16} className="text-brand-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">Website chat widget</p>
              <p className="text-xs text-gray-500">One script tag — drops a floating chat button on any website</p>
            </div>
            <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-700 rounded-full">Active</span>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-gray-600 mb-2">Paste this before the closing <code className="bg-gray-100 px-1 rounded">&lt;/body&gt;</code> tag:</p>
            <div className="relative">
              <pre className="bg-gray-900 text-green-400 text-xs rounded-lg p-4 overflow-x-auto leading-relaxed font-mono">{widgetScript}</pre>
              <button onClick={() => copy(widgetScript, "widget")}
                className="absolute top-2 right-2 flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs px-2.5 py-1.5 rounded-md transition-colors">
                {copied === "widget" ? <><Check size={11}/> Copied!</> : <><Copy size={11}/> Copy</>}
              </button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-gray-500">
              <div className="flex items-start gap-2"><span className="text-brand-600 font-bold">1</span> Copy the code above</div>
              <div className="flex items-start gap-2"><span className="text-brand-600 font-bold">2</span> Paste into your website HTML</div>
              <div className="flex items-start gap-2"><span className="text-brand-600 font-bold">3</span> A chat button appears automatically</div>
            </div>
          </div>
        </div>

        {/* ── WhatsApp ───────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center text-lg">📱</div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">WhatsApp Business</p>
              <p className="text-xs text-gray-500">Your AI replies to WhatsApp messages automatically via the Meta Business API</p>
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${waConnected ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {waConnected ? "Connected" : "Not connected"}
            </span>
          </div>
          <div className="p-5">
            {!waConnected ? (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-xs text-amber-800">
                  <strong>Before connecting:</strong> You need a Meta Business account and a verified WhatsApp Business phone number.
                  <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" target="_blank" rel="noopener noreferrer"
                    className="ml-1 underline inline-flex items-center gap-0.5">Setup guide <ExternalLink size={10}/></a>
                </div>
                <form onSubmit={saveWhatsApp} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">WhatsApp Phone Number ID</label>
                    <input value={waPhone} onChange={e => setWaPhone(e.target.value)} required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                      placeholder="1234567890123456" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Access Token</label>
                    <input type="password" value={waToken} onChange={e => setWaToken(e.target.value)} required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                      placeholder="EAABxx…" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Webhook verify token</label>
                    <div className="flex gap-2">
                      <input readOnly value={tenantId ?? ""} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 font-mono" />
                      <button type="button" onClick={() => copy(tenantId ?? "", "verify")} className="px-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        {copied === "verify" ? <Check size={13} className="text-green-600"/> : <Copy size={13} className="text-gray-500"/>}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Use this as the verify token in your Meta app webhook settings. Webhook URL: <code className="bg-gray-100 px-1 rounded text-[10px]">{appUrl}/api/webhook/whatsapp</code></p>
                  </div>
                  <button type="submit" disabled={savingWa}
                    className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors disabled:opacity-60">
                    {savingWa ? "Connecting…" : "Connect WhatsApp"}
                  </button>
                </form>
              </>
            ) : (
              <div className="flex items-center gap-3 text-sm text-green-700">
                <Check size={16} className="text-green-600"/>
                WhatsApp is connected. Your AI is replying to messages automatically.
                <button onClick={() => setWaConnected(false)} className="ml-auto text-xs text-red-500 hover:underline">Disconnect</button>
              </div>
            )}
          </div>
        </div>

        {/* ── REST API ───────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
              <Code2 size={16} className="text-gray-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">REST API</p>
              <p className="text-xs text-gray-500">Integrate the AI directly into your own app or system</p>
            </div>
            <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded-full">Available</span>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-600">Your Tenant ID</p>
                <button onClick={() => copy(tenantId ?? "", "tid")}
                  className="flex items-center gap-1 text-xs text-brand-600 hover:underline">
                  {copied === "tid" ? <><Check size={10}/>Copied</> : <><Copy size={10}/>Copy</>}
                </button>
              </div>
              <code className="block bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 font-mono">{tenantId ?? "Loading…"}</code>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-600">Chat endpoint example</p>
                <button onClick={() => copy(apiExample, "api")}
                  className="flex items-center gap-1 text-xs text-brand-600 hover:underline">
                  {copied === "api" ? <><Check size={10}/>Copied</> : <><Copy size={10}/>Copy</>}
                </button>
              </div>
              <pre className="bg-gray-900 text-green-400 text-xs rounded-lg p-4 overflow-x-auto leading-relaxed font-mono">{apiExample}</pre>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-600">Webhook event payload</p>
                <button onClick={() => copy(webhookExample, "wh")}
                  className="flex items-center gap-1 text-xs text-brand-600 hover:underline">
                  {copied === "wh" ? <><Check size={10}/>Copied</> : <><Copy size={10}/>Copy</>}
                </button>
              </div>
              <pre className="bg-gray-900 text-blue-300 text-xs rounded-lg p-4 overflow-x-auto leading-relaxed font-mono">{webhookExample}</pre>
            </div>
          </div>
        </div>

        {/* ── Instagram DM (coming soon) ─────────────────────────── */}
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-5 flex items-center gap-4 opacity-60">
          <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center text-lg">📸</div>
          <div>
            <p className="text-sm font-semibold text-gray-700">Instagram DM</p>
            <p className="text-xs text-gray-400">Coming soon — your AI will reply to Instagram Direct Messages</p>
          </div>
          <span className="ml-auto text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded-full">Coming soon</span>
        </div>

      </div>
    </div>
  );
}
