"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Package, Plus, Trash2, Pencil, X, Check } from "lucide-react";
import type { Product } from "@/types";

const CATEGORIES = ["Clothing","Fabric","Food & Drink","Electronics","Beauty","Home & Living","Services","Digital Products","Other"];
const CURRENCIES = ["NGN","USD","GBP","EUR","GHS","KES","ZAR"];

type FormState = Omit<Product,"id"|"tenant_id"|"created_at">;
const EMPTY: FormState = { name:"", description:"", price:null, currency:"NGN", category:"", is_active:true };

export default function ProductsPage() {
  const [products, setProducts]   = useState<Product[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editId, setEditId]       = useState<string|null>(null);
  const [form, setForm]           = useState<FormState>(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [tenantId, setTenantId]   = useState<string|null>(null);
  const [search, setSearch]       = useState("");
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: u } = await supabase.from("users").select("tenant_id").eq("id", user!.id).single();
    setTenantId(u!.tenant_id);
    const { data } = await supabase.from("products").select("*")
      .eq("tenant_id", u!.tenant_id).order("created_at", { ascending: false });
    setProducts(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() { setForm(EMPTY); setEditId(null); setShowForm(true); }
  function openEdit(p: Product) {
    setForm({ name:p.name, description:p.description, price:p.price, currency:p.currency, category:p.category, is_active:p.is_active });
    setEditId(p.id); setShowForm(true);
  }
  function closeForm() { setShowForm(false); setEditId(null); setForm(EMPTY); }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const payload = { ...form, tenant_id: tenantId, price: form.price ? Number(form.price) : null };
    if (editId) {
      await supabase.from("products").update(payload).eq("id", editId);
    } else {
      await supabase.from("products").insert(payload);
    }
    setSaving(false); closeForm(); load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this product?")) return;
    await supabase.from("products").delete().eq("id", id);
    setProducts(p => p.filter(x => x.id !== id));
  }

  async function toggleActive(p: Product) {
    await supabase.from("products").update({ is_active: !p.is_active }).eq("id", p.id);
    setProducts(ps => ps.map(x => x.id === p.id ? { ...x, is_active: !x.is_active } : x));
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Package size={18} className="text-brand-600" /> Products & Services
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {products.length} item{products.length !== 1 ? "s" : ""} · your AI learns from these
          </p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus size={14} /> Add product
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search products…"
          className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
      </div>

      {/* Slide-over form */}
      {showForm && (
        <div className="fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/30" onClick={closeForm} />
          <div className="relative ml-auto w-full max-w-md bg-white h-full shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">{editId ? "Edit product" : "Add product"}</h2>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
            </div>
            <form onSubmit={save} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Product / service name *</label>
                <input required value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                  placeholder="Premium Ankara Fabric" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea rows={3} value={form.description ?? ""} onChange={e => setForm(f=>({...f,description:e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 resize-none"
                  placeholder="Describe this product so your AI can answer questions about it…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Price</label>
                  <input type="number" min="0" step="0.01" value={form.price ?? ""} onChange={e => setForm(f=>({...f,price:e.target.value?Number(e.target.value):null}))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                    placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
                  <select value={form.currency} onChange={e => setForm(f=>({...f,currency:e.target.value}))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 bg-white">
                    {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                <select value={form.category ?? ""} onChange={e => setForm(f=>({...f,category:e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 bg-white">
                  <option value="">Select category</option>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button type="button" onClick={() => setForm(f=>({...f,is_active:!f.is_active}))}
                  className={`w-10 h-5 rounded-full relative transition-colors ${form.is_active?"bg-brand-600":"bg-gray-300"}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${form.is_active?"right-0.5":"left-0.5"}`}/>
                </button>
                <span className="text-sm text-gray-600">{form.is_active ? "Active — visible to AI" : "Draft — hidden from AI"}</span>
              </div>
            </form>
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              <button type="button" onClick={closeForm}
                className="flex-1 border border-gray-300 text-gray-700 text-sm py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={save} disabled={saving}
                className="flex-1 bg-brand-600 text-white text-sm py-2.5 rounded-lg hover:bg-brand-800 transition-colors disabled:opacity-60 font-medium">
                {saving ? "Saving…" : editId ? "Save changes" : "Add product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({length:6}).map((_,i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"/><div className="h-3 bg-gray-100 rounded w-full mb-1"/><div className="h-3 bg-gray-100 rounded w-2/3"/>
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map(p => (
            <div key={p.id} className={`bg-white rounded-xl border p-4 group transition-all hover:shadow-sm ${p.is_active?"border-gray-200":"border-dashed border-gray-200 opacity-60"}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
                  <Package size={14} className="text-rose-600"/>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(p)} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-brand-600 transition-colors">
                    <Pencil size={12}/>
                  </button>
                  <button onClick={() => remove(p.id)} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={12}/>
                  </button>
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-900 mb-1 truncate">{p.name}</p>
              {p.description && <p className="text-xs text-gray-500 line-clamp-2 mb-2 leading-relaxed">{p.description}</p>}
              <div className="flex items-center justify-between mt-2">
                {p.price ? (
                  <span className="text-sm font-medium text-gray-900">{p.currency} {Number(p.price).toLocaleString()}</span>
                ) : <span className="text-xs text-gray-400">No price set</span>}
                <button onClick={() => toggleActive(p)}
                  className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${p.is_active?"bg-green-100 text-green-700":"bg-gray-100 text-gray-500"}`}>
                  {p.is_active ? <span className="flex items-center gap-1"><Check size={10}/>Active</span> : "Draft"}
                </button>
              </div>
              {p.category && <p className="text-[10px] text-gray-400 mt-1.5">{p.category}</p>}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <Package size={36} className="text-gray-300 mx-auto mb-3"/>
          <p className="text-sm font-medium text-gray-500 mb-1">
            {search ? "No products match your search" : "No products yet"}
          </p>
          <p className="text-xs text-gray-400 mb-4">
            {search ? "Try a different search term" : "Add your products and services so your AI can answer pricing questions"}
          </p>
          {!search && <button onClick={openAdd} className="text-sm text-brand-600 font-medium hover:underline">Add your first product</button>}
        </div>
      )}
    </div>
  );
}
