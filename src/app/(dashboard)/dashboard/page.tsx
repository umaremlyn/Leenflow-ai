import { createClient } from "@/lib/supabase/server";
import { MessageSquare, Users, CheckCircle, AlertCircle } from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import Badge from "@/components/ui/Badge";
import { formatDistanceToNow } from "date-fns";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: appUser } = await supabase
    .from("users").select("tenant_id, full_name, tenants(*)").eq("id", user!.id).single();

  const tenantId = appUser?.tenant_id;

  // Fetch stats in parallel
  const [convsRes, leadsRes] = await Promise.all([
    supabase.from("conversations").select("id", { count: "exact" }).eq("tenant_id", tenantId),
    supabase.from("leads")
      .select("id, full_name, temperature, status, captured_at", { count: "exact" })
      .eq("tenant_id", tenantId)
      .order("captured_at", { ascending: false })
      .limit(4),
  ]);

  const totalConversations = convsRes.count ?? 0;
  const totalLeads         = leadsRes.count ?? 0;
  const recentLeads        = leadsRes.data ?? [];

  const tenant    = (appUser as any)?.tenants;
  const firstName = (appUser as any)?.full_name?.split(" ")[0] ?? "there";

  const topQuestions = [
    { q: "Delivery timeline", pct: 34 },
    { q: "Pricing details",   pct: 28 },
    { q: "Return policy",     pct: 19 },
    { q: "Payment methods",   pct: 12 },
    { q: "Custom orders",     pct: 7  },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Good morning, {firstName} 👋</h1>
        <p className="text-sm text-gray-500 mt-0.5">Here's your AI assistant's performance today</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Conversations" value={totalConversations} delta="+18% vs yesterday" trend="up" icon={MessageSquare} />
        <StatCard label="Leads captured" value={totalLeads} delta="+3 new today" trend="up" icon={Users} />
        <StatCard label="AI resolution" value="84%" delta="up from 79%" trend="up" icon={CheckCircle} iconColor="text-green-600" />
        <StatCard label="Unanswered Qs" value="5" delta="needs attention" trend="down" icon={AlertCircle} iconColor="text-red-500" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Recent leads */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Recent leads</h2>
            <a href="/leads" className="text-xs text-brand-600 hover:underline">View all</a>
          </div>
          <div className="space-y-3">
            {recentLeads.length > 0 ? recentLeads.map((lead: any) => (
              <div key={lead.id} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-semibold flex-shrink-0">
                  {lead.full_name.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-sm text-gray-900 flex-1 truncate">{lead.full_name}</span>
                <Badge variant={lead.temperature as any}>{lead.temperature}</Badge>
                <span className="text-xs text-gray-400">
                  {formatDistanceToNow(new Date(lead.captured_at), { addSuffix: false })}
                </span>
              </div>
            )) : (
              <p className="text-sm text-gray-400 text-center py-4">No leads yet — your AI is ready to capture them</p>
            )}
          </div>
        </div>

        {/* Top questions */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Top questions asked</h2>
            <a href="/faqs" className="text-xs text-brand-600 hover:underline">Update FAQs</a>
          </div>
          <div className="space-y-3">
            {topQuestions.map(({ q, pct }, i) => {
              const colors = ["#534AB7","#7F77DD","#AFA9EC","#CECBF6","#EEEDFE"];
              return (
                <div key={q}>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>{q}</span><span>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div className="h-1.5 rounded-full transition-all"
                      style={{ width: `${pct}%`, background: colors[i] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Usage meter */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Plan usage</h2>
            <a href="/settings" className="text-xs text-brand-600 hover:underline">Upgrade</a>
          </div>
          {tenant && (
            <>
              <div className="flex justify-between text-xs text-gray-600 mb-1.5">
                <span>AI messages</span>
                <span>{tenant.msg_used} / {tenant.msg_limit}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full mb-3">
                <div className="h-2 bg-brand-600 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (tenant.msg_used / tenant.msg_limit) * 100)}%` }} />
              </div>
              <p className="text-xs text-gray-400 capitalize">
                Current plan: <span className="font-medium text-gray-700">{tenant.plan}</span>
              </p>
            </>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Quick actions</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { href: "/faqs",         label: "Add FAQ",      color: "bg-amber-50  text-amber-700  hover:bg-amber-100" },
              { href: "/products",     label: "Add product",  color: "bg-rose-50   text-rose-700   hover:bg-rose-100"  },
              { href: "/ai-assistant", label: "Test AI",      color: "bg-brand-50  text-brand-600  hover:bg-brand-100" },
              { href: "/integrations", label: "Add WhatsApp", color: "bg-green-50  text-green-700  hover:bg-green-100" },
            ].map(({ href, label, color }) => (
              <a key={href} href={href}
                className={`${color} text-xs font-medium px-3 py-2.5 rounded-lg text-center transition-colors`}>
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
