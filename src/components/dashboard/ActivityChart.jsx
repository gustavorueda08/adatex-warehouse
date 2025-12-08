"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Button from "@/components/ui/Button";
import format from "@/lib/utils/format";

export default function ActivityChart({ data }) {
  const [view, setView] = useState("weekly");

  const chartData = data?.[view] || [];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-zinc-900 border border-zinc-700 p-3 rounded-lg shadow-xl">
          <p className="text-gray-300 text-sm mb-1">{label}</p>
          {view === "weekly" && item.date && (
            <p className="text-xs text-gray-500 mb-2">{item.date}</p>
          )}
          <p className="text-emerald-400 font-bold text-lg">
            {format(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <div className="flex bg-zinc-800/50 p-1 rounded-lg">
          <button
            onClick={() => setView("weekly")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              view === "weekly"
                ? "bg-zinc-700 text-white shadow-sm"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Semana
          </button>
          <button
            onClick={() => setView("monthly")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              view === "monthly"
                ? "bg-zinc-700 text-white shadow-sm"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Mes
          </button>
          <button
            onClick={() => setView("yearly")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              view === "yearly"
                ? "bg-zinc-700 text-white shadow-sm"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Año
          </button>
        </div>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#27272a"
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#71717a", fontSize: 12 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#71717a", fontSize: 12 }}
              tickFormatter={(value) =>
                new Intl.NumberFormat("es-CO", {
                  notation: "compact",
                  compactDisplay: "short",
                }).format(value)
              }
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "#27272a", opacity: 0.4 }}
            />
            <Bar
              dataKey="value"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
              maxBarSize={50}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
