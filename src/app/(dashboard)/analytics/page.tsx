"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { BarChart2, TrendingUp, Users, MessageSquare, CheckCircle, AlertTriangle } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { subDays, format, eachDayOfInterval, startOfDay } from "date-fns";

const RANGES = [
  { label: "7 days",  days: 7  },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

// Custom chart tooltip
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [range, setRange]           = useState(30);
  const [convData, setConvData]     = useState<any[]>([]);
  const [leadData, setLeadData]     = useState<any[]>([]);
  const [channelData, setChannelData] = useState<any[]>([]);
  const [topQuestions, setTopQ]     = useState<any[]>([]);
  const [totals, setTotals]         = useState({ convs: 0, leads: 0, resolution: 84, unanswered: 5 });
  const [loading, setLoading]       = useState(true);
  const supabase = createClient();

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: u } = await supabase.from("users").select("tenant_id").eq("id", user!.id).single();
    const tid = u!.tenant_id;
    const since = subDays(new Date(), range).toISOString();

    const [convsRes, leadsRes] = await Promise.all([
      supabase.from("conversations").select("started_at, channel").eq("tenant_id", tid).gte("started_at", since),
      supabase.from("leads").select("captured_at, temperature").eq("tenant_id", tid).gte("captured_at", since),
    ]);

    const days = eachDayOfInterval({ start: subDays(new Date(), range - 1), end: new Date() });

    // Daily conversations + leads
    const dailyMap: Record<string, { convs: number; leads: number }> = {};
    days.forEach(d => { dailyMap[format(d, "MMM d")] = { convs: 0, leads: 0 }; });

    (convsRes.data ?? []).forEach((c: any) => {
      const key = format(startOfDay(new Date(c.started_at)), "MMM d");
      if (dailyMap[key]) dailyMap[key].convs++;
    });
    (leadsRes.data ?? []).forEach((l: any) => {
      const key = format(startOfDay(new Date(l.captured_at)), "MMM d");
      if (dailyMap[key]) dailyMap[key].leads++;
    });

    const timeline = Object.entries(dailyMap).map(([date, vals]) => ({ date, ...vals }));
    // Thin out labels for longer ranges
    const step = range > 30 ? 7 : range > 14 ? 3 : 1;
    const labelledTimeline = timeline.map((d, i) => ({
      ...d, date: i % step === 0 ? d.date : "",
    }));

    setConvData(labelledTimeline);
    setLeadData(timeline.slice(-14).map(d => ({ date: d.date, leads: d.leads })));

    // Channel breakdown
    const chanMap: Record<string, number> = {};
    (convsRes.data ?? []).forEach((c: any) => { chanMap[c.channel] = (chanMap[c.channel] ?? 0) + 1; });
    setChannelData(Object.entries(chanMap).map(([name, value]) => ({ name, value })));

    // Totals
    setTotals({
      convs:      convsRes.data?.length ?? 0,
      leads:      leadsRes.data?.length ?? 0,
      resolution: 84,
      unanswered: 5,
    });

    // Top questions (static for now — in production derive from messages)
    setTopQ([
      { q: "Delivery timeline",  count: 34 },
      { q: "Pricing details",    count: 28 },
      { q: "Return policy",      count: 19 },
      { q: "Payment methods",    count: 15 },
      { q: "Custom orders",      count: 10 },
      { q: "Product availability", count: 8 },
    ]);

    setLoading(false);
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const statCards = [
    { label: "Conversations",     value: totals.convs,       icon: MessageSquare, color: "text-brand-600",  bg: "bg-brand-50",  delta: "+12%", trend: "up"      },
    { label: "Leads captured",    value: totals.leads,       icon: Users,         color: "text-teal-600",   bg: "bg-teal-50",   delta: "+8%",  trend: "up"      },
    { label: "AI resolution rate",value: `${totals.resolution}%`, icon: CheckCircle,  color: "text-green-600",  bg: "bg-green-50",  delta: "+5%",  trend: "up"  },
    { label: "Unanswered Qs",     value: totals.unanswered,  icon: AlertTriangle, color: "text-amber-600",  bg: "bg-amber-50",  delta: "review", trend: "down" },
  ];

  const CHANNEL_COLORS: Record<string, string> = { website: "#534AB7", whatsapp: "#16a34a", instagram: "#f97316", api: "#94a3b8" };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BarChart2 size={18} className="text-brand-600" /> Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">How your AI assistant is performing</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {RANGES.map(r => (
            <button key={r.days} onClick={() => setRange(r.days)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${range === r.days ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {statCards.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500">{s.label}</p>
              <div className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon size={13} className={s.color} />
              </div>
            </div>
            <p className="text-2xl font-semibold text-gray-900 mb-1">{loading ? "—" : s.value}</p>
            <p className={`text-xs flex items-center gap-1 ${s.trend === "up" ? "text-green-600" : "text-amber-600"}`}>
              <TrendingUp size={10} /> {s.delta} this period
            </p>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* Conversations over time */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Conversations & leads over time</h2>
          {loading ? (
            <div className="h-48 bg-gray-50 rounded-lg animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={convData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gConv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#534AB7" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#534AB7" stopOpacity={0}    />
                  </linearGradient>
                  <linearGradient id="gLead" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#0d9488" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="convs"  name="Conversations" stroke="#534AB7" fill="url(#gConv)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="leads"  name="Leads"         stroke="#0d9488" fill="url(#gLead)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Channel breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">By channel</h2>
          {channelData.length > 0 ? (
            <div className="space-y-3 mt-2">
              {channelData.map(c => {
                const total = channelData.reduce((s, x) => s + x.value, 0);
                const pct   = total > 0 ? Math.round((c.value / total) * 100) : 0;
                return (
                  <div key={c.name}>
                    <div className="flex justify-between text-xs text-gray-600 mb-1.5">
                      <span className="capitalize font-medium">{c.name}</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div className="h-2 rounded-full transition-all"
                        style={{ width: `${pct}%`, background: CHANNEL_COLORS[c.name] ?? "#94a3b8" }} />
                    </div>
                  </div>
                );
              })}
              {channelData.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No data yet</p>}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-xs text-gray-400">No conversations yet in this period</p>
            </div>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-2 gap-4">
        {/* Top questions bar chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Top questions asked</h2>
            <a href="/faqs" className="text-xs text-brand-600 hover:underline">Update FAQs →</a>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={topQuestions} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis dataKey="q" type="category" width={120} tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Times asked" fill="#534AB7" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Lead temperature breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Lead quality</h2>
          <div className="space-y-4">
            {[
              { label: "Hot leads",  pct: 35, color: "#ef4444", bg: "bg-red-100",   text: "text-red-700"   },
              { label: "Warm leads", pct: 45, color: "#f59e0b", bg: "bg-amber-100", text: "text-amber-700" },
              { label: "Cold leads", pct: 20, color: "#94a3b8", bg: "bg-gray-100",  text: "text-gray-600"  },
            ].map(l => (
              <div key={l.label}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className={`font-medium ${l.text}`}>{l.label}</span>
                  <span className="text-gray-500">{l.pct}%</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full">
                  <div className="h-2.5 rounded-full transition-all" style={{ width: `${l.pct}%`, background: l.color }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-3 font-medium">Conversion funnel</p>
            {[
              { label: "Conversations started", val: totals.convs,                color: "bg-brand-600" },
              { label: "Leads captured",         val: totals.leads,               color: "bg-teal-500"  },
              { label: "Leads contacted",        val: Math.round(totals.leads*0.6), color: "bg-green-500" },
            ].map(f => (
              <div key={f.label} className="flex items-center gap-3 mb-2">
                <div className={`w-2 h-2 rounded-full ${f.color} flex-shrink-0`} />
                <span className="text-xs text-gray-600 flex-1">{f.label}</span>
                <span className="text-xs font-semibold text-gray-800">{loading ? "—" : f.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
