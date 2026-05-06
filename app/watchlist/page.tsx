"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getWatchlist, removeFromWatchlist, WatchlistItem } from "@/lib/watchlist";
import { useFees } from "@/lib/fees-context";
import Link from "next/link";

function calcROI(price: number, rawPrice: number, fees: ReturnType<typeof useFees>["fees"]) {
  const totalCosts = rawPrice * (1 + fees.buyingFeePercent / 100) + fees.gradingFee + fees.shippingToGrader + fees.shippingBack;
  const saleProceeds = price * (1 - fees.ebayFeePercent / 100);
  const profit = saleProceeds - totalCosts;
  const roi = totalCosts > 0 ? (profit / totalCosts) * 100 : 0;
  const breakEven = totalCosts / (1 - fees.ebayFeePercent / 100);
  return { profit, roi, totalCosts, saleProceeds, breakEven };
}

export default function Watchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [sortBy, setSortBy] = useState<"roi" | "raw" | "psa10" | "profit" | "added">("added");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
      const roiA = calcROI(a.psa10Price, a.rawPrice, fees).roi;
      const roiB = calcROI(b.psa10Price, b.rawPrice, fees).roi;
      const profitA = calcROI(a.psa10Price, a.rawPrice, fees).profit;
      const profitB = calcROI(b.psa10Price, b.rawPrice, fees).profit;
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
    const headers = ["Name", "Set", "Rarity", "Number", "Raw Price", "PSA 10 Price", "PSA 9 Price", "Total Cost", "PSA 10 Profit", "PSA 10 ROI %", "PSA 9 Profit", "PSA 9 ROI %", "Added"];
    const rows = sorted.map((item) => {
      const r10 = calcROI(item.psa10Price, item.rawPrice, fees);
      const r9 = calcROI(item.psa9Price, item.rawPrice, fees);
      return [
        item.name, item.set, item.rarity, item.number,
        item.rawPrice.toFixed(2),
        item.psa10Price.toFixed(2),
        item.psa9Price.toFixed(2),
        r10.totalCosts.toFixed(2),
        r10.profit.toFixed(2),
        r10.roi.toFixed(1) + "%",
        r9.profit.toFixed(2),
        r9.roi.toFixed(1) + "%",
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
        className={`text-right text-xs font-mono px-4 py-3 cursor-pointer transition-colors select-none ${active ? "text-yellow-400" : "text-zinc-500 hover:text-white"}`}
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
            <div className="flex items-center gap-3 flex-wrap justify-end">
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
              const profitable = items.filter((i) => calcROI(i.psa10Price, i.rawPrice, fees).profit > 0);
              const totalProfit = items.reduce((s, i) => s + calcROI(i.psa10Price, i.rawPrice, fees).profit, 0);
              const avgRoi = items.length > 0 ? items.reduce((s, i) => s + calcROI(i.psa10Price, i.rawPrice, fees).roi, 0) / items.length : 0;
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
                    <th className="text-left text-xs text-zinc-500 font-mono px-4 py-3 w-8"></th>
                    <th className="text-left text-xs text-zinc-500 font-mono px-4 py-3">CARD</th>
                    <SortHeader label="RAW" field="raw" />
                    <SortHeader label="PSA 10" field="psa10" />
                    <th className="text-right text-xs text-zinc-500 font-mono px-4 py-3">PSA 9</th>
                    <th className="text-right text-xs text-zinc-500 font-mono px-4 py-3">TOTAL COST</th>
                    <SortHeader label="P10 PROFIT" field="profit" />
                    <SortHeader label="P10 ROI" field="roi" />
                    <th className="text-right text-xs text-zinc-500 font-mono px-4 py-3">P9 PROFIT</th>
                    <th className="text-right text-xs text-zinc-500 font-mono px-4 py-3">P9 ROI</th>
                    <SortHeader label="ADDED" field="added" />
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((item) => {
                    const r10 = calcROI(item.psa10Price, item.rawPrice, fees);
                    const r9 = calcROI(item.psa9Price, item.rawPrice, fees);
                    const hasPsa9 = item.psa9Price > 0;
                    const roi10Color = r10.roi > 50 ? "text-emerald-400" : r10.roi > 0 ? "text-yellow-400" : "text-red-400";
                    const roi9Color = r9.roi > 50 ? "text-emerald-400" : r9.roi > 0 ? "text-yellow-400" : "text-red-400";
                    const isExpanded = expandedId === item.tcgPlayerId;

                    return (
                      <>
                        <tr key={item.tcgPlayerId} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : item.tcgPlayerId)}
                              className="text-zinc-600 hover:text-white transition-colors text-sm font-mono w-5"
                            >
                              {isExpanded ? "▼" : "▶"}
                            </button>
                          </td>
                          <td className="px-4 py-3 cursor-pointer" onClick={() => router.push(`/card/${item.tcgPlayerId}`)}>
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
                          <td className="px-4 py-3 text-right text-sm font-mono text-blue-400">
                            {hasPsa9 ? `$${item.psa9Price.toFixed(2)}` : "N/A"}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-mono text-zinc-400">
                            ${r10.totalCosts.toFixed(2)}
                          </td>
                          <td className={`px-4 py-3 text-right text-sm font-mono font-bold ${roi10Color}`}>
                            {item.psa10Price > 0 ? `${r10.profit >= 0 ? "+" : ""}$${r10.profit.toFixed(2)}` : "N/A"}
                          </td>
                          <td className={`px-4 py-3 text-right text-sm font-mono font-bold ${roi10Color}`}>
                            {item.psa10Price > 0 ? `${r10.roi >= 0 ? "+" : ""}${r10.roi.toFixed(0)}%` : "N/A"}
                          </td>
                          <td className={`px-4 py-3 text-right text-sm font-mono font-bold ${hasPsa9 ? roi9Color : "text-zinc-600"}`}>
                            {hasPsa9 ? `${r9.profit >= 0 ? "+" : ""}$${r9.profit.toFixed(2)}` : "N/A"}
                          </td>
                          <td className={`px-4 py-3 text-right text-sm font-mono font-bold ${hasPsa9 ? roi9Color : "text-zinc-600"}`}>
                            {hasPsa9 ? `${r9.roi >= 0 ? "+" : ""}${r9.roi.toFixed(0)}%` : "N/A"}
                          </td>
                          <td className="px-4 py-3 text-right text-xs font-mono text-zinc-600">
                            {new Date(item.addedAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRemove(item.tcgPlayerId); }}
                              className="text-zinc-600 hover:text-red-400 transition-colors text-lg"
                            >
                              ×
                            </button>
                          </td>
                        </tr>

                        {/* Expanded grade comparison */}
                        {isExpanded && (
                          <tr key={`${item.tcgPlayerId}-expanded`} className="border-b border-zinc-800">
                            <td colSpan={12} className="px-4 py-4 bg-zinc-900/40">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                {/* PSA 10 panel */}
                                {item.psa10Price > 0 && (
                                  <div className="bg-yellow-400/5 border border-yellow-400/10 rounded-xl p-4 space-y-2">
                                    <div className="flex justify-between items-center">
                                      <p className="text-sm font-black text-yellow-400">PSA 10 — Gem Mint</p>
                                      <p className="text-lg font-black text-yellow-400 font-mono">${item.psa10Price.toFixed(2)}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                      <div className="bg-zinc-800/40 rounded-lg p-2">
                                        <p className="text-zinc-600">Total cost</p>
                                        <p className="text-white font-bold">${r10.totalCosts.toFixed(2)}</p>
                                      </div>
                                      <div className="bg-zinc-800/40 rounded-lg p-2">
                                        <p className="text-zinc-600">Proceeds</p>
                                        <p className="text-white font-bold">${r10.saleProceeds.toFixed(2)}</p>
                                      </div>
                                      <div className="bg-zinc-800/40 rounded-lg p-2">
                                        <p className="text-zinc-600">Profit</p>
                                        <p className={`font-bold ${r10.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                          {r10.profit >= 0 ? "+" : ""}${r10.profit.toFixed(2)}
                                        </p>
                                      </div>
                                      <div className="bg-zinc-800/40 rounded-lg p-2">
                                        <p className="text-zinc-600">ROI</p>
                                        <p className={`font-bold ${r10.roi >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                          {r10.roi >= 0 ? "+" : ""}{r10.roi.toFixed(0)}%
                                        </p>
                                      </div>
                                    </div>
                                    <p className="text-xs font-mono text-zinc-500 pt-1">
                                      Break-even: ${r10.breakEven.toFixed(2)}
                                    </p>
                                  </div>
                                )}

                                {/* PSA 9 panel */}
                                {hasPsa9 && (
                                  <div className="bg-blue-400/5 border border-blue-400/10 rounded-xl p-4 space-y-2">
                                    <div className="flex justify-between items-center">
                                      <p className="text-sm font-black text-blue-400">PSA 9 — Mint</p>
                                      <p className="text-lg font-black text-blue-400 font-mono">${item.psa9Price.toFixed(2)}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                      <div className="bg-zinc-800/40 rounded-lg p-2">
                                        <p className="text-zinc-600">Total cost</p>
                                        <p className="text-white font-bold">${r9.totalCosts.toFixed(2)}</p>
                                      </div>
                                      <div className="bg-zinc-800/40 rounded-lg p-2">
                                        <p className="text-zinc-600">Proceeds</p>
                                        <p className="text-white font-bold">${r9.saleProceeds.toFixed(2)}</p>
                                      </div>
                                      <div className="bg-zinc-800/40 rounded-lg p-2">
                                        <p className="text-zinc-600">Profit</p>
                                        <p className={`font-bold ${r9.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                          {r9.profit >= 0 ? "+" : ""}${r9.profit.toFixed(2)}
                                        </p>
                                      </div>
                                      <div className="bg-zinc-800/40 rounded-lg p-2">
                                        <p className="text-zinc-600">ROI</p>
                                        <p className={`font-bold ${r9.roi >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                          {r9.roi >= 0 ? "+" : ""}{r9.roi.toFixed(0)}%
                                        </p>
                                      </div>
                                    </div>
                                    <p className="text-xs font-mono text-zinc-500 pt-1">
                                      Break-even: ${r9.breakEven.toFixed(2)}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Verdict */}
                              {item.psa10Price > 0 && hasPsa9 && (
                                <div className="mt-3 bg-zinc-800/40 border border-zinc-700 rounded-xl p-3">
                                  <p className="text-xs font-mono text-zinc-500 mb-1">Verdict</p>
                                  {(() => {
                                    const diff = r10.profit - r9.profit;
                                    const bothProfitable = r10.profit > 0 && r9.profit > 0;
                                    const neitherProfitable = r10.profit <= 0 && r9.profit <= 0;
                                    return (
                                      <p className="text-sm font-bold text-white">
                                        {neitherProfitable
                                          ? "❌ Neither grade is profitable at current prices"
                                          : !bothProfitable && r10.profit > 0
                                          ? "⚠️ Only profitable if you hit PSA 10 — PSA 9 is a loss"
                                          : !bothProfitable && r9.profit > 0
                                          ? "✅ Even a PSA 9 is profitable on this card"
                                          : diff > 20
                                          ? `✅ PSA 10 worth chasing — $${diff.toFixed(2)} more than a 9`
                                          : `🟡 PSA 9 nearly as good — only $${diff.toFixed(2)} less than a 10`}
                                      </p>
                                    );
                                  })()}
                                </div>
                              )}

                              <button
                                onClick={() => router.push(`/card/${item.tcgPlayerId}`)}
                                className="mt-3 text-xs text-zinc-500 hover:text-white transition-colors font-mono"
                              >
                                View full detail & price history →
                              </button>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-zinc-800 text-xs text-zinc-600 font-mono">
              {sorted.length} cards · click ▶ to expand grade comparison · click card name to view full details
            </div>
          </div>
        )}
      </div>
    </main>
  );
}