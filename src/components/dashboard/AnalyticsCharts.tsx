"use client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { MessageSquare, Users, TrendingUp, Zap } from "lucide-react";

interface Props {
  chartData:   { date: string; conversations: number; leads: number }[];
  channelData: { name: string; value: number }[];
  tempData:    { name: string; value: number; fill: string }[];
  statusData:  { name: string; value: number }[];
  stats:       { totalConvs: number; totalLeads: number; convRate: number; totalMsgs: number };
}

const CHANNEL_COLORS: Record<string, string> = {
  website: "#534AB7", whatsapp: "#16a34a", instagram: "#f97316", api: "#64748b",
};

const STATUS_COLORS = ["#534AB7","#16a34a","#f59e0b","#ef4444"];

export default function AnalyticsCharts({ chartData, channelData, tempData, statusData, stats }: Props) {
  const topStats = [
    { label: "Conversations (7d)", value: stats.totalConvs, icon: MessageSquare, color: "text-brand-600", bg: "bg-brand-50" },
    { label: "Leads captured (7d)", value: stats.totalLeads, icon: Users, color: "text-green-600", bg: "bg-green-50" },
    { label: "Lead conversion rate", value: `${stats.convRate}%`, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Total AI messages (7d)", value: stats.totalMsgs, icon: Zap, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <div className="space-y-4">
      {/* Top stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {topStats.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500">{s.label}</p>
              <div className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon size={14} className={s.color}/>
              </div>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Conversations & leads over time */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Conversations & leads — last 7 days</h2>
        {chartData.every(d => d.conversations === 0) ? (
          <div className="flex items-center justify-center h-48 text-sm text-gray-400">No conversation data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barGap={4} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false}/>
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false}/>
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false}/>
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,.06)" }}
                cursor={{ fill: "#f9fafb" }}
              />
              <Bar dataKey="conversations" name="Conversations" fill="#534AB7" radius={[4,4,0,0]}/>
              <Bar dataKey="leads" name="Leads" fill="#86efac" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Channels */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Conversations by channel</h2>
          {channelData.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">No data yet</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={channelData} cx="50%" cy="50%" innerRadius={36} outerRadius={58} dataKey="value" paddingAngle={3}>
                    {channelData.map((entry, i) => (
                      <Cell key={i} fill={CHANNEL_COLORS[entry.name] ?? "#9ca3af"}/>
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {channelData.map(c => (
                  <div key={c.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: CHANNEL_COLORS[c.name] ?? "#9ca3af" }}/>
                      <span className="capitalize text-gray-600">{c.name}</span>
                    </div>
                    <span className="font-medium text-gray-800">{c.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Lead temperature */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Lead temperature</h2>
          {tempData.every(t => t.value === 0) ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">No leads yet</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={tempData} cx="50%" cy="50%" innerRadius={36} outerRadius={58} dataKey="value" paddingAngle={3}>
                    {tempData.map((entry, i) => <Cell key={i} fill={entry.fill}/>)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {tempData.map(t => (
                  <div key={t.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: t.fill }}/>
                      <span className="text-gray-600">{t.name}</span>
                    </div>
                    <span className="font-medium text-gray-800">{t.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Lead status */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Lead pipeline</h2>
          {statusData.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">No leads yet</div>
          ) : (
            <div className="space-y-3 mt-2">
              {statusData.map((s, i) => {
                const total = statusData.reduce((a, b) => a + b.value, 0);
                const pct = total ? Math.round((s.value / total) * 100) : 0;
                return (
                  <div key={s.name}>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span className="capitalize">{s.name}</span>
                      <span className="font-medium">{s.value} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div className="h-2 rounded-full transition-all"
                        style={{ width: `${pct}%`, background: STATUS_COLORS[i % STATUS_COLORS.length] }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
