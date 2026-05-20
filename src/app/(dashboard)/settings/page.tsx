"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Settings, Building2, User, CreditCard, Shield, Save, Check } from "lucide-react";
import type { Tenant } from "@/types";

const TABS = [
  { id: "business", label: "Business profile", icon: Building2 },
  { id: "account",  label: "My account",       icon: User       },
  { id: "billing",  label: "Billing & plan",   icon: CreditCard },
  { id: "security", label: "Security",          icon: Shield     },
] as const;
type Tab = typeof TABS[number]["id"];

const INDUSTRIES = ["Retail / Fashion","Food & Beverage","Technology","Healthcare","Education","Real Estate","Finance","Logistics","Beauty & Wellness","Other"];
const PLANS = [
  { id: "starter",    name: "Starter",    price: "Free",         messages: "500 msgs/mo",   features: ["1 AI assistant","Website widget","Basic analytics"]                          },
  { id: "growth",     name: "Growth",     price: "₦15,000/mo",   messages: "5,000 msgs/mo", features: ["All Starter features","WhatsApp integration","Lead scoring","Full analytics"] },
  { id: "enterprise", name: "Enterprise", price: "₦45,000/mo",   messages: "Unlimited",     features: ["All Growth features","API access","White-label widget","Priority support"]   },
];

export default function SettingsPage() {
  const [tab, setTab]               = useState<Tab>("business");
  const [tenant, setTenant]         = useState<Tenant|null>(null);
  const [appUser, setAppUser]       = useState<any>(null);
  const [bizForm, setBizForm]       = useState({ name: "", industry: "", slug: "" });
  const [accForm, setAccForm]       = useState({ full_name: "", email: "" });
  const [pwForm, setPwForm]         = useState({ current: "", newPw: "", confirm: "" });
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [pwError, setPwError]       = useState("");
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: u } = await supabase.from("users").select("*, tenants(*)").eq("id", user!.id).single();
    setAppUser(u);
    setTenant(u?.tenants as Tenant);
    setBizForm({ name: u?.tenants?.name ?? "", industry: u?.tenants?.industry ?? "", slug: u?.tenants?.slug ?? "" });
    setAccForm({ full_name: u?.full_name ?? "", email: u?.email ?? "" });
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveBusiness(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    await supabase.from("tenants").update({ name: bizForm.name, industry: bizForm.industry }).eq("id", tenant!.id);
    setSaved(true); setSaving(false);
    setTimeout(() => setSaved(false), 2000);
    load();
  }

  async function saveAccount(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    await supabase.from("users").update({ full_name: accForm.full_name }).eq("id", appUser.id);
    setSaved(true); setSaving(false);
    setTimeout(() => setSaved(false), 2000);
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault(); setPwError("");
    if (pwForm.newPw !== pwForm.confirm) { setPwError("New passwords don't match"); return; }
    if (pwForm.newPw.length < 8) { setPwError("Password must be at least 8 characters"); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPw });
    if (error) { setPwError(error.message); } else { setSaved(true); setPwForm({ current:"", newPw:"", confirm:"" }); }
    setSaving(false);
    setTimeout(() => setSaved(false), 2000);
  }

  const usagePct = tenant ? Math.min(100, Math.round((tenant.msg_used / tenant.msg_limit) * 100)) : 0;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Settings size={18} className="text-brand-600" /> Settings
        </h1>
      </div>

      <div className="flex gap-4">
        {/* Tab sidebar */}
        <div className="w-44 flex-shrink-0 space-y-0.5">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                tab === t.id ? "bg-brand-50 text-brand-700 font-medium" : "text-gray-600 hover:bg-gray-100"
              }`}>
              <t.icon size={14}/> {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1">

          {/* ── Business profile ───────────────────────────────── */}
          {tab === "business" && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-5">Business profile</h2>
              <form onSubmit={saveBusiness} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Business name</label>
                  <input value={bizForm.name} onChange={e => setBizForm(f=>({...f,name:e.target.value}))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Industry</label>
                  <select value={bizForm.industry} onChange={e => setBizForm(f=>({...f,industry:e.target.value}))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-600">
                    <option value="">Select industry</option>
                    {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Business URL slug</label>
                  <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-600">
                    <span className="bg-gray-50 px-3 py-2 text-sm text-gray-500 border-r border-gray-200">leenco.ai/</span>
                    <input value={bizForm.slug} readOnly className="flex-1 px-3 py-2 text-sm bg-white text-gray-500 focus:outline-none" />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Slug is set at registration and cannot be changed.</p>
                </div>
                <div className="pt-1">
                  <button type="submit" disabled={saving}
                    className="flex items-center gap-2 bg-brand-600 hover:bg-brand-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-60">
                    {saved ? <><Check size={13}/>Saved!</> : <><Save size={13}/>{saving?"Saving…":"Save changes"}</>}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── Account ────────────────────────────────────────── */}
          {tab === "account" && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-5">My account</h2>
              <form onSubmit={saveAccount} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Full name</label>
                  <input value={accForm.full_name} onChange={e => setAccForm(f=>({...f,full_name:e.target.value}))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input value={accForm.email} readOnly
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500" />
                  <p className="text-xs text-gray-400 mt-1">Contact support to change your email address.</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                  <input value={appUser?.role ?? ""} readOnly
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 capitalize" />
                </div>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 bg-brand-600 hover:bg-brand-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-60">
                  {saved ? <><Check size={13}/>Saved!</> : <><Save size={13}/>{saving?"Saving…":"Save changes"}</>}
                </button>
              </form>
            </div>
          )}

          {/* ── Billing ────────────────────────────────────────── */}
          {tab === "billing" && (
            <div className="space-y-4">
              {/* Usage meter */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Current usage</h2>
                <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                  <span>AI messages this month</span>
                  <span className="font-semibold">{tenant?.msg_used ?? 0} / {tenant?.msg_limit?.toLocaleString() ?? "—"}</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <div className={`h-3 rounded-full transition-all ${usagePct > 80 ? "bg-red-500" : usagePct > 60 ? "bg-amber-500" : "bg-brand-600"}`}
                    style={{ width: `${usagePct}%` }} />
                </div>
                <p className="text-xs text-gray-400">{usagePct}% of your plan limit used</p>
              </div>

              {/* Plan cards */}
              <div className="grid grid-cols-3 gap-3">
                {PLANS.map(plan => {
                  const current = tenant?.plan === plan.id;
                  return (
                    <div key={plan.id} className={`bg-white rounded-xl border-2 p-4 transition-all ${
                      current ? "border-brand-600 shadow-sm" : "border-gray-200 hover:border-gray-300"
                    }`}>
                      {current && <span className="text-[10px] font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full mb-2 inline-block">Current plan</span>}
                      <p className="text-sm font-bold text-gray-900">{plan.name}</p>
                      <p className="text-lg font-semibold text-brand-600 mt-1 mb-0.5">{plan.price}</p>
                      <p className="text-xs text-gray-500 mb-3">{plan.messages}</p>
                      <ul className="space-y-1.5 mb-4">
                        {plan.features.map(f => (
                          <li key={f} className="flex items-start gap-1.5 text-xs text-gray-600">
                            <Check size={11} className="text-green-500 mt-0.5 flex-shrink-0"/> {f}
                          </li>
                        ))}
                      </ul>
                      {!current && (
                        <button className="w-full bg-brand-600 hover:bg-brand-800 text-white text-xs font-medium py-2 rounded-lg transition-colors">
                          {tenant?.plan === "enterprise" && plan.id !== "enterprise" ? "Downgrade" : "Upgrade"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 text-center">Payments processed via Paystack. Cancel anytime.</p>
            </div>
          )}

          {/* ── Security ───────────────────────────────────────── */}
          {tab === "security" && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-5">Change password</h2>
              <form onSubmit={changePassword} className="space-y-4 max-w-sm">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">New password</label>
                  <input type="password" value={pwForm.newPw} onChange={e => setPwForm(f=>({...f,newPw:e.target.value}))} required minLength={8}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                    placeholder="Min. 8 characters" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Confirm new password</label>
                  <input type="password" value={pwForm.confirm} onChange={e => setPwForm(f=>({...f,confirm:e.target.value}))} required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                    placeholder="Repeat password" />
                </div>
                {pwError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{pwError}</p>}
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 bg-brand-600 hover:bg-brand-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-60">
                  {saved ? <><Check size={13}/>Updated!</> : saving ? "Saving…" : "Update password"}
                </button>
              </form>

              <hr className="my-6 border-gray-200" />

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Danger zone</h3>
                <p className="text-xs text-gray-500 mb-3">Permanently delete your account and all business data. This cannot be undone.</p>
                <button className="text-sm text-red-600 border border-red-300 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors">
                  Delete account
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
