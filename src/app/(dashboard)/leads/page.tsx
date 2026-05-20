import { createClient } from "@/lib/supabase/server";
import { Users, Download } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { formatDistanceToNow } from "date-fns";

export const metadata = { title: "Leads" };

const CHANNEL_COLORS: Record<string, string> = {
  website:   "bg-brand-100 text-brand-700",
  whatsapp:  "bg-green-100 text-green-700",
  instagram: "bg-orange-100 text-orange-700",
  api:       "bg-gray-100 text-gray-600",
};

export default async function LeadsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: appUser } = await supabase.from("users").select("tenant_id").eq("id", user!.id).single();

  const { data: leads, count } = await supabase
    .from("leads")
    .select("*, conversations(channel)", { count: "exact" })
    .eq("tenant_id", appUser!.tenant_id)
    .order("captured_at", { ascending: false });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users size={18} className="text-brand-600" /> Leads
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{count ?? 0} contacts captured by your AI</p>
        </div>
        <button className="flex items-center gap-2 text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-50 transition-colors">
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr_80px] text-xs font-medium text-gray-500 px-4 py-3 bg-gray-50 border-b border-gray-200 gap-3">
          <span>Name</span><span>Contact</span><span>Channel</span>
          <span>Temperature</span><span>Status</span><span>Captured</span><span>Actions</span>
        </div>

        {leads && leads.length > 0 ? leads.map((lead: any) => (
          <div key={lead.id} className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr_80px] px-4 py-3 border-b border-gray-100 last:border-0 items-center gap-3 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-semibold flex-shrink-0">
                {lead.full_name.slice(0,2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{lead.full_name}</p>
                {lead.email && <p className="text-xs text-gray-400 truncate">{lead.email}</p>}
              </div>
            </div>
            <span className="text-xs text-gray-600 truncate">{lead.phone ?? lead.email ?? "—"}</span>
            <span>
              {lead.conversations?.channel ? (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CHANNEL_COLORS[lead.conversations.channel] ?? "bg-gray-100 text-gray-500"}`}>
                  {lead.conversations.channel}
                </span>
              ) : "—"}
            </span>
            <span><Badge variant={lead.temperature as any}>{lead.temperature}</Badge></span>
            <span><Badge variant={lead.status as any}>{lead.status}</Badge></span>
            <span className="text-xs text-gray-400">
              {formatDistanceToNow(new Date(lead.captured_at), { addSuffix: true })}
            </span>
            <div className="flex gap-1">
              <a href={lead.conversation_id ? `/conversations?id=${lead.conversation_id}` : "#"}
                className="text-xs text-brand-600 hover:underline">View</a>
            </div>
          </div>
        )) : (
          <div className="text-center py-16">
            <Users size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No leads captured yet</p>
            <p className="text-xs text-gray-400 mt-1">Your AI assistant will capture leads automatically during conversations</p>
          </div>
        )}
      </div>
    </div>
  );
}
