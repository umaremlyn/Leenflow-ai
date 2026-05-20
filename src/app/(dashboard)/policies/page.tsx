"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { FileText, Save } from "lucide-react";
import type { Policy, PolicyType } from "@/types";

const POLICY_TYPES: { type: PolicyType; label: string; placeholder: string }[] = [
  { type:"returns",  label:"Returns & Refunds",  placeholder:"We accept returns within 14 days of purchase. Items must be unused and in original packaging. Customised orders are non-refundable…" },
  { type:"shipping", label:"Delivery & Shipping", placeholder:"We deliver across Nigeria within 3–5 business days. Lagos orders arrive in 1–2 days. Free delivery on orders above ₦50,000…" },
  { type:"privacy",  label:"Privacy Policy",      placeholder:"We collect your name and contact to process orders and improve our service. We do not sell your data to third parties…" },
  { type:"terms",    label:"Terms & Conditions",  placeholder:"By placing an order, you agree to our terms. Prices are subject to change without notice…" },
  { type:"hours",    label:"Business Hours",      placeholder:"Monday to Friday: 9am – 6pm. Saturday: 10am – 4pm. Sunday: Closed. Public holidays: Closed…" },
  { type:"custom",   label:"Custom Policy",       placeholder:"Add any other business information you want your AI to know, such as warranty details, special offers, etc…" },
];

export default function PoliciesPage() {
  const [policies, setPolicies]   = useState<Record<PolicyType, string>>({} as any);
  const [saved, setSaved]         = useState<Record<PolicyType, boolean>>({} as any);
  const [saving, setSaving]       = useState<PolicyType|null>(null);
  const [tenantId, setTenantId]   = useState<string|null>(null);
  const [activeTab, setActiveTab] = useState<PolicyType>("returns");
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: u } = await supabase.from("users").select("tenant_id").eq("id", user!.id).single();
    setTenantId(u!.tenant_id);
    const { data } = await supabase.from("policies").select("*").eq("tenant_id", u!.tenant_id);
    const map: Record<string, string> = {};
    (data ?? []).forEach((p: Policy) => { map[p.policy_type] = p.content; });
    setPolicies(map as any);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function savePolicy(type: PolicyType) {
    if (!tenantId) return;
    setSaving(type);
    await supabase.from("policies").upsert(
      { tenant_id: tenantId, policy_type: type, content: policies[type] ?? "", updated_at: new Date().toISOString() },
      { onConflict: "tenant_id,policy_type" }
    );
    setSaved(s => ({...s, [type]: true}));
    setSaving(null);
    setTimeout(() => setSaved(s => ({...s, [type]: false})), 2000);
  }

  const current = POLICY_TYPES.find(p => p.type === activeTab)!;
  const wordCount = (policies[activeTab] ?? "").split(/\s+/).filter(Boolean).length;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FileText size={18} className="text-brand-600" /> Business Policies
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Your AI uses these to answer customer questions about returns, delivery, and more</p>
      </div>

      <div className="flex gap-4">
        {/* Policy type selector */}
        <div className="w-48 flex-shrink-0 space-y-1">
          {POLICY_TYPES.map(p => (
            <button key={p.type} onClick={() => setActiveTab(p.type)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-between ${
                activeTab === p.type ? "bg-brand-50 text-brand-700 font-medium" : "text-gray-600 hover:bg-gray-100"
              }`}>
              <span>{p.label}</span>
              {policies[p.type] && <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0"/>}
            </button>
          ))}
        </div>

        {/* Editor */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">{current.label}</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">{wordCount} words</span>
              <button onClick={() => savePolicy(activeTab)} disabled={!!saving}
                className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  saved[activeTab]
                    ? "bg-green-100 text-green-700"
                    : "bg-brand-600 hover:bg-brand-800 text-white"
                } disabled:opacity-60`}>
                <Save size={13}/>
                {saving === activeTab ? "Saving…" : saved[activeTab] ? "Saved ✓" : "Save"}
              </button>
            </div>
          </div>
          <textarea
            value={policies[activeTab] ?? ""}
            onChange={e => setPolicies(p => ({...p, [activeTab]: e.target.value}))}
            rows={16}
            placeholder={current.placeholder}
            className="w-full p-5 text-sm text-gray-800 leading-relaxed placeholder:text-gray-300 resize-none focus:outline-none"
          />
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-400">
              💡 Write naturally — the more detail you add, the better your AI can answer customer questions about this policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
