"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { HelpCircle, Plus, Trash2, GripVertical } from "lucide-react";
import type { FAQ } from "@/types";

export default function FAQsPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ question: "", answer: "" });
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  async function loadFAQs() {
    const { data: user } = await supabase.auth.getUser();
    const { data: appUser } = await supabase.from("users").select("tenant_id").eq("id", user.user!.id).single();
    const { data } = await supabase.from("faqs").select("*").eq("tenant_id", appUser!.tenant_id).order("sort_order");
    setFaqs(data ?? []);
    setLoading(false);
  }

  useEffect(() => { loadFAQs(); }, []);

  async function addFAQ(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: user } = await supabase.auth.getUser();
    const { data: appUser } = await supabase.from("users").select("tenant_id").eq("id", user.user!.id).single();
    await supabase.from("faqs").insert({ ...form, tenant_id: appUser!.tenant_id, sort_order: faqs.length });
    setForm({ question: "", answer: "" });
    setShowForm(false);
    setSaving(false);
    loadFAQs();
  }

  async function deleteFAQ(id: string) {
    if (!confirm("Delete this FAQ?")) return;
    await supabase.from("faqs").delete().eq("id", id);
    setFaqs(faqs.filter(f => f.id !== id));
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <HelpCircle size={18} className="text-brand-600" /> FAQs
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Questions your AI will know the answers to</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus size={14} /> Add FAQ
        </button>
      </div>

      {showForm && (
        <form onSubmit={addFAQ} className="bg-white rounded-xl border border-brand-200 p-4 mb-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-900 mb-3">New FAQ</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Question</label>
              <input value={form.question} onChange={e => setForm(f => ({...f, question: e.target.value}))} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                placeholder="What is your return policy?" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Answer</label>
              <textarea value={form.answer} onChange={e => setForm(f => ({...f, answer: e.target.value}))} required rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 resize-none"
                placeholder="We accept returns within 14 days of purchase…" />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 border border-gray-300 text-gray-700 text-sm py-2 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-brand-600 text-white text-sm py-2 rounded-lg hover:bg-brand-800 transition-colors disabled:opacity-60">
              {saving ? "Saving…" : "Save FAQ"}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {loading ? (
          Array.from({length: 3}).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-full" />
            </div>
          ))
        ) : faqs.length > 0 ? faqs.map((faq) => (
          <div key={faq.id} className="bg-white rounded-xl border border-gray-200 p-4 flex gap-3 group hover:border-brand-200 transition-colors">
            <GripVertical size={16} className="text-gray-300 flex-shrink-0 mt-0.5 cursor-grab" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 mb-1">{faq.question}</p>
              <p className="text-sm text-gray-500 leading-relaxed">{faq.answer}</p>
            </div>
            <button onClick={() => deleteFAQ(faq.id)}
              className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0">
              <Trash2 size={14} />
            </button>
          </div>
        )) : (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
            <HelpCircle size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No FAQs yet</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">Add questions your customers commonly ask</p>
            <button onClick={() => setShowForm(true)}
              className="text-sm text-brand-600 font-medium hover:underline">Add your first FAQ</button>
          </div>
        )}
      </div>
    </div>
  );
}
