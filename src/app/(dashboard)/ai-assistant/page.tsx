"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bot, RefreshCw, Send, ToggleLeft, ToggleRight } from "lucide-react";
import type { Assistant } from "@/types";

const TABS = ["Training sources", "Behaviour", "Test sandbox", "Persona"] as const;
type Tab = typeof TABS[number];

export default function AIAssistantPage() {
  const [tab, setTab] = useState<Tab>("Training sources");
  const [assistant, setAssistant] = useState<Assistant | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [training, setTraining] = useState(false);
  const [trainResult, setTrainResult] = useState<{chunksIndexed:number;errors:string[]}|null>(null);
  const [messages, setMessages] = useState<{role:string;content:string;conf?:number}[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const msgEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: appUser } = await supabase.from("users").select("tenant_id").eq("id", user!.id).single();
      setTenantId(appUser?.tenant_id ?? null);
      const { data } = await supabase.from("assistants").select("*").eq("tenant_id", appUser!.tenant_id).single();
      setAssistant(data);
    })();
  }, []);

  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function retrain() {
    setTraining(true); setTrainResult(null);
    const res = await fetch("/api/train", { method: "POST" });
    const data = await res.json();
    setTrainResult(data);
    setTraining(false);
  }

  async function toggleLive() {
    if (!assistant || !tenantId) return;
    const newVal = !assistant.is_live;
    await supabase.from("assistants").update({ is_live: newVal }).eq("tenant_id", tenantId);
    setAssistant({ ...assistant, is_live: newVal });
  }

  async function savePersona() {
    if (!assistant || !tenantId) return;
    setSaving(true);
    await supabase.from("assistants").update({
      name: assistant.name, persona_tone: assistant.persona_tone,
      greeting_msg: assistant.greeting_msg, fallback_msg: assistant.fallback_msg,
      language: assistant.language, lead_capture_on: assistant.lead_capture_on,
      conf_threshold: assistant.conf_threshold,
    }).eq("tenant_id", tenantId);
    setSaving(false);
  }

  async function sendTest() {
    if (!input.trim() || !tenantId) return;
    const userMsg = input.trim(); setInput(""); setChatLoading(true);
    setMessages(m => [...m, { role: "user", content: userMsg }]);
    const res = await fetch("/api/assistant/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, message: userMsg, channel: "website" }),
    });
    const data = await res.json();
    setMessages(m => [...m, { role: "assistant", content: data.message ?? data.error, conf: data.confScore }]);
    setChatLoading(false);
  }

  const SOURCES = [
    { label: "Products & services", type: "product", color: "bg-rose-50 text-rose-600", conf: 92 },
    { label: "FAQs",                type: "faq",     color: "bg-amber-50 text-amber-600", conf: 88 },
    { label: "Business policies",   type: "policy",  color: "bg-teal-50 text-teal-600",  conf: 74 },
    { label: "Payment info",        type: "payment", color: "bg-blue-50 text-blue-600",  conf: 81 },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Bot size={18} className="text-brand-600" /> AI Assistant
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure training, behaviour, and test your AI</p>
        </div>
        <button onClick={toggleLive}
          className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
            assistant?.is_live ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}>
          {assistant?.is_live ? <ToggleRight size={16}/> : <ToggleLeft size={16}/>}
          {assistant?.is_live ? "Live" : "Go live"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 bg-white rounded-t-xl overflow-hidden">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
              tab === t ? "border-brand-600 text-brand-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>{t}</button>
        ))}
      </div>

      {tab === "Training sources" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Knowledge sources</h2>
              <span className="text-xs text-gray-400">Confidence score</span>
            </div>
            <div className="space-y-3">
              {SOURCES.map(s => (
                <div key={s.type} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${s.color}`}>
                    {s.type[0].toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-700 flex-1">{s.label}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    s.conf >= 85 ? "bg-green-100 text-green-700" : s.conf >= 70 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"
                  }`}>{s.conf}%</span>
                </div>
              ))}
            </div>
            <button onClick={retrain} disabled={training}
              className="w-full mt-4 flex items-center justify-center gap-2 bg-brand-50 hover:bg-brand-100 text-brand-600 text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-60">
              <RefreshCw size={13} className={training ? "animate-spin" : ""} />
              {training ? "Training…" : "Re-train AI on latest data"}
            </button>
            {trainResult && (
              <p className="text-xs text-center mt-2 text-green-600">
                ✓ {trainResult.chunksIndexed} chunks indexed successfully
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Training tips</h2>
            <div className="space-y-3">
              {[
                { t: "More detail = better answers", d: "Longer product descriptions help the AI give accurate pricing and feature info." },
                { t: "Write FAQs as customers ask", d: "Use natural language in questions, not formal headings." },
                { t: "Re-train after updates", d: "Every time you add products, FAQs, or policies, re-train so the AI learns the changes." },
                { t: "Low confidence?", d: "Add more FAQs covering that topic. The AI learns from your content." },
              ].map(tip => (
                <div key={tip.t} className="flex gap-2">
                  <span className="text-brand-600 text-xs mt-0.5 flex-shrink-0">•</span>
                  <div>
                    <p className="text-xs font-medium text-gray-800">{tip.t}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{tip.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "Test sandbox" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden max-w-xl mx-auto">
          <div className="bg-brand-600 px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-semibold">L</div>
            <div>
              <p className="text-sm font-medium text-white">{assistant?.name ?? "Leen"}</p>
              <p className="text-xs text-white/70">AI assistant sandbox</p>
            </div>
            <div className="ml-auto w-2 h-2 rounded-full bg-green-400" title="Online" />
          </div>
          <div className="h-72 overflow-y-auto p-4 bg-gray-50 flex flex-col gap-3">
            {messages.length === 0 && (
              <div className="bg-white border border-gray-200 rounded-xl rounded-tl-sm p-3 text-sm text-gray-700 max-w-xs">
                {assistant?.greeting_msg ?? "Hi! How can I help you today?"}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex flex-col gap-1"}>
                <div className={`px-3 py-2 rounded-xl text-sm max-w-xs leading-relaxed ${
                  m.role === "user" ? "bg-brand-600 text-white rounded-tr-sm" : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm"
                }`}>{m.content}</div>
                {m.conf !== undefined && (
                  <span className="text-[10px] text-gray-400">Confidence: {Math.round(m.conf * 100)}%</span>
                )}
              </div>
            ))}
            {chatLoading && (
              <div className="flex gap-1.5 p-3 bg-white border border-gray-200 rounded-xl rounded-tl-sm w-fit">
                {[0,1,2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            )}
            <div ref={msgEndRef} />
          </div>
          <div className="flex gap-2 p-3 border-t border-gray-200">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendTest())}
              className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-600"
              placeholder="Test your AI here…" />
            <button onClick={sendTest} disabled={chatLoading || !input.trim()}
              className="bg-brand-600 text-white px-3 py-2 rounded-lg hover:bg-brand-800 transition-colors disabled:opacity-50">
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      {tab === "Persona" && assistant && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-xl">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assistant name</label>
              <input value={assistant.name} onChange={e => setAssistant({...assistant, name: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tone</label>
              <div className="grid grid-cols-4 gap-2">
                {(["friendly","professional","formal","casual"] as const).map(t => (
                  <button key={t} onClick={() => setAssistant({...assistant, persona_tone: t})}
                    className={`py-2 text-sm rounded-lg border transition-colors capitalize ${
                      assistant.persona_tone === t ? "bg-brand-50 border-brand-600 text-brand-600 font-medium" : "border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}>{t}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Greeting message</label>
              <textarea value={assistant.greeting_msg} onChange={e => setAssistant({...assistant, greeting_msg: e.target.value})}
                rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fallback message</label>
              <textarea value={assistant.fallback_msg} onChange={e => setAssistant({...assistant, fallback_msg: e.target.value})}
                rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 resize-none" />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-700">Lead capture</p>
                <p className="text-xs text-gray-400">Ask for contact before sharing pricing</p>
              </div>
              <button onClick={() => setAssistant({...assistant, lead_capture_on: !assistant.lead_capture_on})}
                className={`w-11 h-6 rounded-full relative transition-colors ${assistant.lead_capture_on ? "bg-brand-600" : "bg-gray-300"}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${assistant.lead_capture_on ? "right-1" : "left-1"}`} />
              </button>
            </div>
            <button onClick={savePersona} disabled={saving}
              className="w-full bg-brand-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-brand-800 transition-colors disabled:opacity-60">
              {saving ? "Saving…" : "Save persona"}
            </button>
          </div>
        </div>
      )}

      {tab === "Behaviour" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-xl">
          <div className="space-y-4">
            {[
              { label: "Capture lead before sharing pricing", desc: "AI asks for name & contact first" },
              { label: "Escalate if confidence below 60%", desc: "Show fallback message on low confidence" },
              { label: "Only answer about my business", desc: "AI ignores off-topic questions" },
              { label: "Show payment steps when asked", desc: "Guide users through payment process" },
              { label: "After-hours auto-response", desc: "Different message outside business hours" },
            ].map((rule, i) => (
              <div key={rule.label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{rule.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{rule.desc}</p>
                </div>
                <div className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${i < 4 ? "bg-brand-600" : "bg-gray-300"}`}>
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${i < 4 ? "right-1" : "left-1"}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
