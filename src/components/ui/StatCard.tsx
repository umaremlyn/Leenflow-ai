import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string | number;
  delta?: string;
  trend?: "up" | "down" | "neutral";
  icon?: LucideIcon;
  iconColor?: string;
}

export default function StatCard({ label, value, delta, trend = "neutral", icon: Icon, iconColor = "text-brand-600" }: Props) {
  const trendColor = trend === "up" ? "text-green-600" : trend === "down" ? "text-red-500" : "text-gray-400";
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-gray-500">{label}</p>
        {Icon && (
          <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center">
            <Icon size={14} className={iconColor} />
          </div>
        )}
      </div>
      <p className="text-2xl font-semibold text-gray-900 mb-1">{value}</p>
      {delta && (
        <p className={`text-xs flex items-center gap-1 ${trendColor}`}>
          <TrendIcon size={11} />
          {delta}
        </p>
      )}
    </div>
  );
}
