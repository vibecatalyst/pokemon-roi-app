"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

interface PriceHistoryEntry {
  average: number;
  count: number;
}

interface Props {
  priceHistory: Record<string, Record<string, PriceHistoryEntry>>;
  rawPrice: number;
  cardName: string;
}

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-xs font-mono shadow-xl">
      <p className="text-zinc-400 mb-2">{label}</p>
      {payload.map((p) =>
        p.value != null ? (
          <div key={p.name} className="flex justify-between gap-4">
            <span style={{ color: p.color }}>{p.name}</span>
            <span className="text-white font-bold">${p.value.toFixed(2)}</span>
          </div>
        ) : null
      )}
    </div>
  );
}

export default function PriceChart({ priceHistory, rawPrice, cardName }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const psa10History = priceHistory?.psa10 ?? {};
  const psa9History = priceHistory?.psa9 ?? {};

  const psa10Dates = Object.keys(psa10History);
  const psa9Dates = Object.keys(psa9History);
  const allDates = Array.from(new Set([...psa10Dates, ...psa9Dates])).sort();

  console.log("PriceChart rendering, allDates:", allDates.length, "mounted:", mounted);

  if (allDates.length === 0) {
    return (
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 text-center">
        <p className="text-zinc-600 font-mono text-sm">No price history available for this card yet.</p>
        <p className="text-zinc-700 text-xs mt-1">psa10: {psa10Dates.length} psa9: {psa9Dates.length}</p>
      </div>
    );
  }

  const data = allDates.map((date) => ({
    date: formatDate(date),
    psa10: psa10History[date]?.average ?? null,
    psa9: psa9History[date]?.average ?? null,
    raw: rawPrice > 0 ? rawPrice : null,
  }));

  if (!mounted) {
    return (
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
        <p className="text-zinc-600 font-mono text-sm text-center">Loading chart...</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-white">Price History</h3>
        <p className="text-xs text-zinc-500 mt-0.5">
          {cardName} — {allDates.length} data points
        </p>
        <div className="flex gap-4 mt-2">
          <span className="text-xs font-mono text-yellow-400">● PSA 10: {psa10Dates.length} points</span>
          <span className="text-xs font-mono text-blue-400">● PSA 9: {psa9Dates.length} points</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#71717a", fontSize: 10, fontFamily: "monospace" }}
            tickLine={false}
            axisLine={{ stroke: "#27272a" }}
          />
          <YAxis
            tick={{ fill: "#71717a", fontSize: 10, fontFamily: "monospace" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `$${v}`}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: "11px", fontFamily: "monospace", color: "#71717a" }}
          />
          <Line
            type="monotone"
            dataKey="psa10"
            name="PSA 10"
            stroke="#facc15"
            strokeWidth={2}
            dot={{ fill: "#facc15", r: 4 }}
            connectNulls
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="psa9"
            name="PSA 9"
            stroke="#60a5fa"
            strokeWidth={2}
            dot={{ fill: "#60a5fa", r: 4 }}
            connectNulls
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="raw"
            name="Raw"
            stroke="#71717a"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}