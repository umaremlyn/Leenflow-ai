import { createClient } from "@/lib/supabase/server";
import { MessageSquare } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { formatDistanceToNow } from "date-fns";

export const metadata = { title: "Conversations" };

export default async function ConversationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: appUser } = await supabase.from("users").select("tenant_id").eq("id", user!.id).single();

  const { data: conversations, count } = await supabase
    .from("conversations")
    .select("*", { count: "exact" })
    .eq("tenant_id", appUser!.tenant_id)
    .order("started_at", { ascending: false })
    .limit(50);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MessageSquare size={18} className="text-brand-600" /> Conversations
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">{count ?? 0} total conversations</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1fr_80px_80px_100px] text-xs font-medium text-gray-500 px-4 py-3 bg-gray-50 border-b border-gray-200 gap-3">
          <span>Visitor</span><span>Channel</span><span>Started</span>
          <span>Messages</span><span>Lead</span><span>Actions</span>
        </div>
        {conversations && conversations.length > 0 ? conversations.map((conv: any) => (
          <div key={conv.id} className="grid grid-cols-[2fr_1fr_1fr_80px_80px_100px] px-4 py-3 border-b border-gray-100 last:border-0 items-center gap-3 hover:bg-gray-50 transition-colors">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{conv.visitor_name ?? "Anonymous"}</p>
              {conv.visitor_email && <p className="text-xs text-gray-400 truncate">{conv.visitor_email}</p>}
            </div>
            <span className="text-xs text-gray-600 capitalize">{conv.channel}</span>
            <span className="text-xs text-gray-400">{formatDistanceToNow(new Date(conv.started_at), { addSuffix: true })}</span>
            <span className="text-xs text-gray-600">{conv.msg_count} msgs</span>
            <span>{conv.lead_captured ? <Badge variant="live">Yes</Badge> : <Badge variant="draft">No</Badge>}</span>
            <a href={`/conversations/${conv.id}`} className="text-xs text-brand-600 hover:underline">View transcript</a>
          </div>
        )) : (
          <div className="text-center py-16">
            <MessageSquare size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No conversations yet</p>
            <p className="text-xs text-gray-400 mt-1">Deploy your AI assistant to start receiving conversations</p>
          </div>
        )}
      </div>
    </div>
  );
}
