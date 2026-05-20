"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { CreditCard, Plus, Trash2, Check } from "lucide-react";
import type { PaymentInfo, PaymentMethodType } from "@/types";

const METHOD_META: Record<PaymentMethodType, { label: string; icon: string; placeholder: string }> = {
  bank_transfer: {
    label: "Bank Transfer",
    icon: "🏦",
    placeholder: "Bank: First Bank\nAccount name: Adunni Textiles Ltd\nAccount number: 3012345678\n\nAfter transfer, send your receipt to 08012345678 on WhatsApp for confirmation.",
  },
  paystack: {
    label: "Paystack",
    icon: "💳",
    placeholder: "Pay securely with your debit or credit card via Paystack:\n1. Click the payment link: https://paystack.com/pay/your-link\n2. Enter your card details\n3. Complete payment and save your receipt",
  },
  opay: {
    label: "OPay",
    icon: "📱",
    placeholder: "Pay via OPay:\n1. Open your OPay app\n2. Select 'Transfer'\n3. Enter our OPay number: 08012345678\n4. Send screenshot of transaction to us",
  },
  cash: {
    label: "Cash on Delivery",
    icon: "💵",
    placeholder: "We accept cash payment on delivery for Lagos orders only.\nDelivery fee is paid separately.\nMinimum order for COD: ₦10,000.",
  },
  custom: {
    label: "Custom Method",
    icon: "⚙️",
    placeholder: "Describe your custom payment method and steps…",
  },
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentInfo[]>([]);
  const [tenantId, setTenantId] = useState<string|null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{ method_type: PaymentMethodType; instructions: string }>({ method_type: "bank_transfer", instructions: "" });
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: u } = await supabase.from("users").select("tenant_id").eq("id", user!.id).single();
    setTenantId(u!.tenant_id);
    const { data } = await supabase.from("payment_info").select("*").eq("tenant_id", u!.tenant_id).order("created_at");
    setPayments(data ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addPayment(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    await supabase.from("payment_info").insert({ tenant_id: tenantId, ...form });
    setShowForm(false); setForm({ method_type: "bank_transfer", instructions: "" });
    setSaving(false); load();
  }

  async function toggle(p: PaymentInfo) {
    await supabase.from("payment_info").update({ is_active: !p.is_active }).eq("id", p.id);
    setPayments(ps => ps.map(x => x.id === p.id ? { ...x, is_active: !x.is_active } : x));
  }

  async function remove(id: string) {
    if (!confirm("Remove this payment method?")) return;
    await supabase.from("payment_info").delete().eq("id", id);
    setPayments(ps => ps.filter(p => p.id !== id));
  }

  const existingTypes = new Set(payments.map(p => p.method_type));

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <CreditCard size={18} className="text-brand-600" /> Payment Methods
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Your AI guides customers through payment when they ask how to pay</p>
        </div>
        {Object.keys(METHOD_META).length > existingTypes.size && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Plus size={14}/> Add method
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={addPayment} className="bg-white rounded-xl border border-brand-200 p-5 mb-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Add payment method</h3>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {(Object.entries(METHOD_META) as [PaymentMethodType, typeof METHOD_META[PaymentMethodType]][])
              .filter(([t]) => !existingTypes.has(t))
              .map(([type, meta]) => (
                <button key={type} type="button" onClick={() => setForm(f => ({...f, method_type: type}))}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    form.method_type === type ? "border-brand-600 bg-brand-50" : "border-gray-200 hover:border-gray-300"
                  }`}>
                  <div className="text-lg mb-1">{meta.icon}</div>
                  <p className="text-xs font-medium text-gray-800">{meta.label}</p>
                </button>
              ))
            }
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">Payment instructions</label>
            <textarea required rows={6} value={form.instructions}
              onChange={e => setForm(f=>({...f, instructions: e.target.value}))}
              placeholder={METHOD_META[form.method_type].placeholder}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 resize-none font-mono" />
            <p className="text-xs text-gray-400 mt-1">These exact instructions will be shown to customers who ask how to pay.</p>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 border border-gray-300 text-gray-700 text-sm py-2.5 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-brand-600 text-white text-sm py-2.5 rounded-lg hover:bg-brand-800 transition-colors font-medium disabled:opacity-60">
              {saving ? "Saving…" : "Add payment method"}
            </button>
          </div>
        </form>
      )}

      {/* Payment cards */}
      <div className="space-y-3">
        {payments.length > 0 ? payments.map(p => (
          <div key={p.id} className={`bg-white rounded-xl border p-5 transition-all ${p.is_active ? "border-gray-200" : "border-dashed border-gray-200 opacity-60"}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{METHOD_META[p.method_type]?.icon ?? "💳"}</span>
                <span className="text-sm font-semibold text-gray-900">{METHOD_META[p.method_type]?.label ?? p.method_type}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggle(p)}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                    p.is_active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}>
                  {p.is_active ? <span className="flex items-center gap-1"><Check size={10}/>Active</span> : "Inactive"}
                </button>
                <button onClick={() => remove(p.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
              </div>
            </div>
            <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono bg-gray-50 rounded-lg p-3 leading-relaxed">{p.instructions}</pre>
          </div>
        )) : (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
            <CreditCard size={32} className="text-gray-300 mx-auto mb-3"/>
            <p className="text-sm font-medium text-gray-500 mb-1">No payment methods yet</p>
            <p className="text-xs text-gray-400 mb-4">Add how customers can pay so your AI can guide them through it</p>
            <button onClick={() => setShowForm(true)} className="text-sm text-brand-600 font-medium hover:underline">Add payment method</button>
          </div>
        )}
      </div>
    </div>
  );
}
