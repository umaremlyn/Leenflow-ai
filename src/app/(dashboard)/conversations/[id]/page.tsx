import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageSquare, User, Bot } from "lucide-react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { format } from "date-fns";

export const metadata = { title: "Conversation" };

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Next.js 15 — params is a Promise, must be awaited
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: appUser } = await supabase
    .from("users").select("tenant_id").eq("id", user!.id).single();

  const { data: conv } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", appUser!.tenant_id)
    .single();

  if (!conv) notFound();

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("conversation_id", id)
    .maybeSingle();

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back + header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/conversations" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-gray-900">
            {conv.visitor_name ?? "Anonymous visitor"}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {format(new Date(conv.started_at), "dd MMM yyyy · h:mm a")} ·
            <span className="capitalize ml-1">{conv.channel}</span> ·
            {conv.msg_count} messages
          </p>
        </div>
        <div className="flex items-center gap-2">
          {conv.lead_captured && <Badge variant="live">Lead captured</Badge>}
          <Badge variant={conv.channel === "whatsapp" ? "converted" : "new"}>
            {conv.channel}
          </Badge>
        </div>
      </div>

      {/* Lead info banner */}
      {lead && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <User size={14} className="text-green-700" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-800">{lead.full_name}</p>
            <p className="text-xs text-green-600">
              {[lead.email, lead.phone].filter(Boolean).join(" · ")}
            </p>
          </div>
          <Badge variant={lead.temperature as any}>{lead.temperature}</Badge>
          <Badge variant={lead.status as any}>{lead.status}</Badge>
          <Link href="/leads" className="text-xs text-green-700 hover:underline font-medium">
            View in leads →
          </Link>
        </div>
      )}

      {/* Transcript */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
          <MessageSquare size={14} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Transcript</span>
        </div>

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {messages && messages.length > 0 ? messages.map((msg: any) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                msg.role === "assistant" ? "bg-brand-100" : "bg-gray-100"
              }`}>
                {msg.role === "assistant"
                  ? <Bot size={13} className="text-brand-600" />
                  : <User size={13} className="text-gray-500" />}
              </div>
              <div className={`max-w-[78%] flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "assistant"
                    ? "bg-gray-100 text-gray-800 rounded-tl-sm"
                    : "bg-brand-600 text-white rounded-tr-sm"
                }`}>
                  {msg.content}
                </div>
                <div className={`flex items-center gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <span className="text-[10px] text-gray-400">
                    {format(new Date(msg.created_at), "h:mm a")}
                  </span>
                  {msg.conf_score !== null && msg.role === "assistant" && (
                    <span className={`text-[10px] font-medium ${
                      msg.conf_score >= 0.8 ? "text-green-500"
                      : msg.conf_score >= 0.6 ? "text-amber-500"
                      : "text-red-400"
                    }`}>
                      {Math.round(msg.conf_score * 100)}% confidence
                    </span>
                  )}
                </div>
              </div>
            </div>
          )) : (
            <p className="text-sm text-gray-400 text-center py-8">
              No messages in this conversation
            </p>
          )}
        </div>
      </div>

      {/* Visitor details */}
      <div className="mt-4 bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Visitor details</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            { label: "Name",    value: conv.visitor_name  },
            { label: "Email",   value: conv.visitor_email },
            { label: "Phone",   value: conv.visitor_phone },
            { label: "Channel", value: conv.channel       },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-gray-500 mb-0.5">{label}</p>
              <p className="text-sm text-gray-900">
                {value ?? <span className="text-gray-400">Not provided</span>}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
