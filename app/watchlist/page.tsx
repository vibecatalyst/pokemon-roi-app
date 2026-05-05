"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getWatchlist, removeFromWatchlist, WatchlistItem } from "@/lib/watchlist";
import { useFees } from "@/lib/fees-context";
import Link from "next/link";

function calcROI(item: WatchlistItem, fees: ReturnType<typeof useFees>["fees"]) {
  const totalCosts = item.rawPrice * (1 + fees.buyingFeePercent / 100) + fees.gradingFee + fees.shippingToGrader + fees.shippingBack;
  const saleProceeds = item.psa10Price * (1 - fees.ebayFeePercent / 100);
  const profit = saleProceeds - totalCosts;
  const roi = totalCosts > 0 ? (profit / totalCosts) * 100 : 0;
  return { profit, roi, totalCosts, saleProceeds };
}

export default function Watchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [sortBy, setSortBy] = useState<"roi" | "raw" | "psa10" | "profit" | "added">("added");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const { fees } = useFees();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    setItems(getWatchlist());
  }, []);

  function handleRemove(tcgPlayerId: string) {
    removeFromWatchlist(tcgPlayerId);
    setItems(getWatchlist());
  }

  function toggleSort(key: typeof sortBy) {
    if (sortBy === key) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortBy(key);
      setSortDir("desc");
    }
  }

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const roiA = calcROI(a, fees).roi;
      const roiB = calcROI(b, fees).roi;
      const profitA = calcROI(a, fees).profit;
      const profitB = calcROI(b, fees).profit;

      let diff = 0;
      if (sortBy === "roi") diff = roiB - roiA;
      else if (sortBy === "raw") diff = b.rawPrice - a.rawPrice;
      else if (sortBy === "psa10") diff = b.psa10Price - a.psa10Price;
      else if (sortBy === "profit") diff = profitB - profitA;
      else diff = new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();

      return sortDir === "desc" ? diff : -diff;
    });
  }, [items, sortBy, sortDir, fees]);

  function exportToCSV() {
    const headers = ["Name", "Set", "Rarity", "Number", "Raw Price", "PSA 10 Price", "Total Cost", "Sale Proceeds", "Net Profit", "ROI %", "Added"];
    const rows = sorted.map((item) => {
      const { profit, roi, totalCosts, saleProceeds } = calcROI(item, fees);
      return [
        item.name,
        item.set,
        item.rarity,
        item.number,
        item.rawPrice.toFixed(2),
        item.psa10Price.toFixed(2),
        totalCosts.toFixed(2),
        saleProceeds.toFixed(2),
        profit.toFixed(2),
        roi.toFixed(1) + "%",
        new Date(item.addedAt).toLocaleDateString(),
      ];
    });
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "watchlist.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function SortHeader({ label, field }: { label: string; field: typeof sortBy }) {
    const active = sortBy === field;
    return (
      <th
        onClick={() => toggleSort(field)}
        className={`text-right text-xs font-mono px-4 py-3 cursor-pointer transition-colors select-none ${
          active ? "text-yellow-400" : "text-zinc-500 hover:text-white"
        }`}
      >
        {label} {active ? (sortDir === "desc" ? "↓" : "↑") : ""}
      </th>
    );
  }

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/" className="text-zinc-500 hover:text-white text-sm transition-colors">← Back to Search</Link>
            <h1 className="text-4xl font-black mt-2">
              <span className="text-white">MY </span>
              <span className="text-blue-400">WATCHLIST</span>
            </h1>
            <p className="text-zinc-500 text-sm mt-1">Cards you are tracking for grading opportunities</p>
          </div>
          {items.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-zinc-500 font-mono">SORT</label>
                <select
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value as typeof sortBy); setSortDir("desc"); }}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none font-mono"
                >
                  <option value="added">Date Added</option>
                  <option value="roi">ROI %</option>
                  <option value="profit">Net Profit</option>
                  <option value="raw">Raw Price</option>
                  <option value="psa10">PSA 10 Price</option>
                </select>
                <button
                  onClick={() => setSortDir(sortDir === "desc" ? "asc" : "desc")}
                  className="bg-zinc-800 border border-zinc-700 hover:border-zinc-500 rounded-lg px-3 py-2 text-white text-sm transition-colors font-mono"
                >
                  {sortDir === "desc" ? "↓ Desc" : "↑ Asc"}
                </button>
              </div>
              <button
                onClick={exportToCSV}
                className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-5 py-2 rounded-lg transition-colors text-sm"
              >
                Export CSV
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        {items.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {(() => {
              const profitable = items.filter((i) => calcROI(i, fees).profit > 0);
              const totalProfit = items.reduce((s, i) => s + calcROI(i, fees).profit, 0);
              const avgRoi = items.length > 0 ? items.reduce((s, i) => s + calcROI(i, fees).roi, 0) / items.length : 0;
              const totalInvest = items.reduce((s, i) => s + calcROI(i, fees).totalCosts, 0);
              return (
                <>
                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-center">
                    <p className="text-2xl font-black text-white font-mono">{items.length}</p>
                    <p className="text-xs text-zinc-600 mt-1">Cards watching</p>
                  </div>
                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-center">
                    <p className="text-2xl font-black text-emerald-400 font-mono">{profitable.length}</p>
                    <p className="text-xs text-zinc-600 mt-1">Profitable to grade</p>
                  </div>
                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-center">
                    <p className={`text-2xl font-black font-mono ${totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {totalProfit >= 0 ? "+" : ""}${totalProfit.toFixed(0)}
                    </p>
                    <p className="text-xs text-zinc-600 mt-1">Total potential profit</p>
                  </div>
                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-center">
                    <p className={`text-2xl font-black font-mono ${avgRoi >= 0 ? "text-yellow-400" : "text-red-400"}`}>
                      {avgRoi >= 0 ? "+" : ""}{avgRoi.toFixed(0)}%
                    </p>
                    <p className="text-xs text-zinc-600 mt-1">Average ROI</p>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* Empty state */}
        {items.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">👀</div>
            <p className="text-zinc-500 font-mono text-sm mb-2">Your watchlist is empty</p>
            <p className="text-zinc-700 text-xs mb-6">Search for cards and click the bookmark icon to add them here</p>
            <Link href="/" className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-5 py-2.5 rounded-lg transition-colors text-sm">
              Search Cards
            </Link>
          </div>
        )}

        {/* Table */}
        {sorted.length > 0 && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left text-xs text-zinc-500 font-mono px-4 py-3">CARD</th>
                    <SortHeader label="RAW" field="raw" />
                    <SortHeader label="PSA 10" field="psa10" />
                    <th className="text-right text-xs text-zinc-500 font-mono px-4 py-3">TOTAL COST</th>
                    <SortHeader label="PROFIT" field="profit" />
                    <SortHeader label="ROI" field="roi" />
                    <SortHeader label="ADDED" field="added" />
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((item) => {
                    const { profit, roi, totalCosts } = calcROI(item, fees);
                    const roiColor = roi > 50 ? "text-emerald-400" : roi > 0 ? "text-yellow-400" : "text-red-400";
                    return (
                      <tr
                        key={item.tcgPlayerId}
                        className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors cursor-pointer"
                        onClick={() => router.push(`/card/${item.tcgPlayerId}`)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {item.image && <img src={item.image} alt={item.name} className="w-10 rounded" />}
                            <div>
                              <p className="text-sm font-semibold text-white">{item.name}</p>
                              <p className="text-xs text-zinc-600">{item.set} · {item.rarity} · #{item.number}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-mono text-zinc-300">
                          {item.rawPrice > 0 ? `$${item.rawPrice.toFixed(2)}` : "N/A"}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-mono text-yellow-400">
                          {item.psa10Price > 0 ? `$${item.psa10Price.toFixed(2)}` : "N/A"}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-mono text-zinc-400">
                          ${totalCosts.toFixed(2)}
                        </td>
                        <td className={`px-4 py-3 text-right text-sm font-mono font-bold ${roiColor}`}>
                          {item.psa10Price > 0 ? `${profit >= 0 ? "+" : ""}$${profit.toFixed(2)}` : "N/A"}
                        </td>
                        <td className={`px-4 py-3 text-right text-sm font-mono font-bold ${roiColor}`}>
                          {item.psa10Price > 0 ? `${roi >= 0 ? "+" : ""}${roi.toFixed(0)}%` : "N/A"}
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-mono text-zinc-600">
                          {new Date(item.addedAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRemove(item.tcgPlayerId); }}
                            className="text-zinc-600 hover:text-red-400 transition-colors text-lg"
                            title="Remove from watchlist"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-zinc-800 text-xs text-zinc-600 font-mono">
              {sorted.length} cards · click a row to view full details · click column headers to sort
            </div>
          </div>
        )}
      </div>
    </main>
  );
}