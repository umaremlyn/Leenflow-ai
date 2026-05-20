"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ email: "", password: "", fullName: "", businessName: "", industry: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const industries = ["Retail / Fashion","Food & Beverage","Technology","Healthcare","Education","Real Estate","Finance","Logistics","Beauty & Wellness","Other"];

  function update(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { data, error } = await supabase.auth.signUp({ email: form.email, password: form.password });
    if (error) { setError(error.message); setLoading(false); return; }
    if (data.user) {
      const slug = form.businessName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
      const { error: tenantError } = await supabase.from("tenants").insert({ name: form.businessName, slug, industry: form.industry, plan: "starter", msg_limit: 500 });
      if (tenantError) { setError("Account created but setup failed. Please contact support."); setLoading(false); return; }
    }
    router.push("/dashboard");
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
      <div className="flex gap-2 mb-6">
        {[1,2].map(s => (
          <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${step >= s ? "bg-brand-600" : "bg-gray-200"}`} />
        ))}
      </div>
      {step === 1 ? (
        <>
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Create your account</h1>
          <p className="text-sm text-gray-500 mb-6">Step 1 of 2 — Your details</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
              <input value={form.fullName} onChange={e => update("fullName", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                placeholder="Adunni Tunde" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => update("email", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                placeholder="you@business.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" value={form.password} onChange={e => update("password", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                placeholder="Min. 8 characters" />
            </div>
            <button onClick={() => setStep(2)} disabled={!form.email || !form.password || !form.fullName}
              className="w-full bg-brand-600 hover:bg-brand-800 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60">
              Continue
            </button>
          </div>
        </>
      ) : (
        <>
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Your business</h1>
          <p className="text-sm text-gray-500 mb-6">Step 2 of 2 — Business details</p>
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business name</label>
              <input value={form.businessName} onChange={e => update("businessName", e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                placeholder="Adunni Textiles" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
              <select value={form.industry} onChange={e => update("industry", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 bg-white">
                <option value="">Select your industry</option>
                {industries.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)}
                className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                Back
              </button>
              <button type="submit" disabled={loading || !form.businessName}
                className="flex-1 bg-brand-600 hover:bg-brand-800 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60">
                {loading ? "Creating…" : "Create account"}
              </button>
            </div>
          </form>
        </>
      )}
      <p className="text-center text-sm text-gray-500 mt-6">
        Already have an account? <Link href="/login" className="text-brand-600 font-medium hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
