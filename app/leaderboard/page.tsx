"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CardData } from "@/lib/types";
import { mapApiCard } from "@/lib/api";
import { useFees } from "@/lib/fees-context";
import Link from "next/link";

function calcProfit(card: CardData, fees: ReturnType<typeof useFees>["fees"]) {
  const totalCosts = card.rawPrice * (1 + fees.buyingFeePercent / 100) + fees.gradingFee + fees.shippingToGrader + fees.shippingBack;
  const saleProceeds = card.psa10Price * (1 - fees.ebayFeePercent / 100);
  const profit = saleProceeds - totalCosts;
  const roi = totalCosts > 0 ? (profit / totalCosts) * 100 : 0;
  return { profit, roi, totalCosts, saleProceeds };
}

type EnrichedCard = CardData & { profit: number; roi: number; totalCosts: number; saleProceeds: number };

export default function Leaderboard() {
  const { fees } = useFees();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sets, setSets] = useState<{ name: string; id: string }[]>([]);
  const [selectedSet, setSelectedSet] = useState(searchParams.get("set") ?? "");
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [setsLoading, setSetsLoading] = useState(true);
  const [error, setError] = useState("");
  const [rarityFilter, setRarityFilter] = useState(searchParams.get("rarity") ?? "All");
  const [sortBy, setSortBy] = useState<"roi" | "profit" | "psa10" | "raw">((searchParams.get("sort") as "roi" | "profit" | "psa10" | "raw") ?? "roi");
  const [sortDir, setSortDir] = useState<"asc" | "desc">((searchParams.get("dir") as "asc" | "desc") ?? "desc");
  const [minRaw, setMinRaw] = useState(parseFloat(searchParams.get("min") ?? "5") || 5);
  const [maxRaw, setMaxRaw] = useState(parseFloat(searchParams.get("max") ?? "") || Infinity);

  // Update URL when filters change
  function updateUrl(params: Record<string, string>) {
    const current = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([k, v]) => {
      if (v) current.set(k, v);
      else current.delete(k);
    });
    router.replace("/leaderboard?" + current.toString(), { scroll: false });
  }

  useEffect(() => {
    fetch("/api/sets")
      .then((r) => r.json())
      .then((json) => {
        const data = json.data ?? json ?? [];
        setSets(Array.isArray(data) ? data.map((s: Record<string, string>) => ({ name: s.name, id: s.id ?? s.name })) : []);
        setSetsLoading(false);
      })
      .catch(() => setSetsLoading(false));
  }, []);

  // Auto-fetch if set is in URL on load
  useEffect(() => {
    const setFromUrl = searchParams.get("set");
    if (setFromUrl) {
      fetchSetCards(setFromUrl);
    }
  }, []);

  async function fetchSetCards(setName: string) {
    setLoading(true);
    setError("");
    setCards([]);
    try {
      const res = await fetch("/api/set-cards?set=" + encodeURIComponent(setName));
      const json = await res.json();
      if (json.error) { setError(json.message ?? json.error); return; }
      const raw = json.data ?? [];
      setCards(raw.map(mapApiCard));
    } catch {
      setError("Failed to fetch set data.");
    } finally {
      setLoading(false);
    }
  }

  function handleSetChange(setName: string) {
    setSelectedSet(setName);
    updateUrl({ set: setName });
    if (setName) fetchSetCards(setName);
  }

  function handleRarityChange(rarity: string) {
    setRarityFilter(rarity);
    updateUrl({ rarity: rarity === "All" ? "" : rarity });
  }

  function handleSortByChange(sort: typeof sortBy) {
    setSortBy(sort);
    updateUrl({ sort });
  }

  function handleSortDirChange() {
    const next = sortDir === "desc" ? "asc" : "desc";
    setSortDir(next);
    updateUrl({ dir: next });
  }

  function handleMinRawChange(val: number) {
    setMinRaw(val);
    updateUrl({ min: String(val) });
  }

  function handleMaxRawChange(val: number | typeof Infinity) {
    setMaxRaw(val);
    updateUrl({ max: val === Infinity ? "" : String(val) });
  }

  const rarities = useMemo(() => {
    const all = new Set(cards.map((c) => c.rarity).filter(Boolean));
    return ["All", ...Array.from(all)];
  }, [cards]);

  const filtered: EnrichedCard[] = useMemo(() => {
    return cards
      .filter((c) => c.psa10Price > 0 && c.rawPrice >= minRaw && c.rawPrice <= maxRaw)
      .filter((c) => rarityFilter === "All" || c.rarity === rarityFilter)
      .map((c) => ({ ...c, ...calcProfit(c, fees) }))
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === "roi") diff = b.roi - a.roi;
        else if (sortBy === "profit") diff = b.profit - a.profit;
        else if (sortBy === "psa10") diff = b.psa10Price - a.psa10Price;
        else diff = b.rawPrice - a.rawPrice;
        return sortDir === "desc" ? diff : -diff;
      });
  }, [cards, rarityFilter, sortBy, sortDir, fees, minRaw, maxRaw]);

  function exportToCSV() {
    const headers = ["Rank", "Name", "Set", "Rarity", "Number", "Raw Price", "PSA 10 Price", "Total Cost", "Sale Proceeds", "Net Profit", "ROI %", "Multiple", "Image URL"];
    const rows = filtered.map((card, idx) => [
      idx + 1, card.name, card.set, card.rarity, card.number,
      card.rawPrice.toFixed(2), card.psa10Price.toFixed(2),
      card.totalCosts.toFixed(2), card.saleProceeds.toFixed(2),
      card.profit.toFixed(2), card.roi.toFixed(1) + "%",
      (card.psa10Price / card.rawPrice).toFixed(2) + "x",
      card.image ?? "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = selectedSet + "-ROI.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function SortTh({ label, field }: { label: string; field: typeof sortBy }) {
    const active = sortBy === field;
    return (
      <th
        onClick={() => {
          if (sortBy === field) handleSortDirChange();
          else { handleSortByChange(field); setSortDir("desc"); }
        }}
        className={"text-right text-xs font-mono px-4 py-3 cursor-pointer transition-colors select-none " + (active ? "text-yellow-400" : "text-zinc-500 hover:text-white")}
      >
        {label} {active ? (sortDir === "desc" ? "↓" : "↑") : ""}
      </th>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-yellow-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-red-500/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-12">

        <div className="mb-8">
          <Link href="/" className="text-zinc-500 hover:text-white text-sm transition-colors">← Back to Home</Link>
          <h1 className="text-4xl font-black mt-2">
            <span className="text-white">TOP </span>
            <span className="text-yellow-400">ROI</span>
            <span className="text-white"> CARDS</span>
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Cards with the highest grading return by set — click any card to see full details</p>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 mb-6 flex flex-wrap gap-4 items-end">

          <div className="flex-1 min-w-48">
            <label className="block text-xs text-zinc-500 font-mono mb-1">SELECT SET</label>
            <select
              value={selectedSet}
              onChange={(e) => handleSetChange(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none"
              disabled={setsLoading}
            >
              <option value="">{setsLoading ? "Loading sets..." : "Choose a set..."}</option>
              {sets.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 font-mono mb-1">RARITY</label>
            <select
              value={rarityFilter}
              onChange={(e) => handleRarityChange(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none"
            >
              {rarities.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 font-mono mb-1">SORT BY</label>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => handleSortByChange(e.target.value as typeof sortBy)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none"
              >
                <option value="roi">ROI %</option>
                <option value="profit">Net Profit</option>
                <option value="psa10">PSA 10 Price</option>
                <option value="raw">Raw Price</option>
              </select>
              <button
                onClick={handleSortDirChange}
                className="bg-zinc-800 border border-zinc-700 hover:border-zinc-500 rounded-lg px-3 py-2.5 text-white text-sm transition-colors font-mono"
              >
                {sortDir === "desc" ? "↓ Desc" : "↑ Asc"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 font-mono mb-1">RAW PRICE RANGE ($)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={minRaw}
                min={0}
                placeholder="Min"
                onChange={(e) => handleMinRawChange(parseFloat(e.target.value) || 0)}
                className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none font-mono"
              />
              <span className="text-zinc-600 text-sm font-mono">—</span>
              <input
                type="number"
                value={maxRaw === Infinity ? "" : maxRaw}
                min={0}
                placeholder="Max"
                onChange={(e) => handleMaxRawChange(e.target.value === "" ? Infinity : parseFloat(e.target.value) || Infinity)}
                className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none font-mono"
              />
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={exportToCSV}
              disabled={filtered.length === 0}
              className="bg-yellow-400 hover:bg-yellow-300 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-bold px-5 py-2.5 rounded-lg transition-colors text-sm whitespace-nowrap"
            >
              Export CSV
            </button>
          </div>
        </div>

        {loading && (
          <div className="text-center py-20">
            <div className="text-4xl mb-4 animate-spin inline-block">⚡</div>
            <p className="text-zinc-500 font-mono text-sm">Fetching all cards in set...</p>
          </div>
        )}

        {error && (
          <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-4">{error}</div>
        )}

        {!loading && !selectedSet && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🏆</div>
            <p className="text-zinc-600 font-mono text-sm">Select a set to see the top ROI cards</p>
          </div>
        )}

        {!loading && selectedSet && filtered.length === 0 && cards.length > 0 && (
          <div className="text-center py-20">
            <p className="text-zinc-500 font-mono text-sm">No cards match your current filters.</p>
            <p className="text-zinc-600 text-xs mt-2">Try adjusting the price range or rarity filter.</p>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left text-xs text-zinc-500 font-mono px-4 py-3 w-8">#</th>
                    <th className="text-left text-xs text-zinc-500 font-mono px-4 py-3">CARD</th>
                    <SortTh label="RAW" field="raw" />
                    <SortTh label="PSA 10" field="psa10" />
                    <th className="text-right text-xs text-zinc-500 font-mono px-4 py-3">TOTAL COST</th>
                    <th className="text-right text-xs text-zinc-500 font-mono px-4 py-3">PROCEEDS</th>
                    <SortTh label="PROFIT" field="profit" />
                    <SortTh label="ROI" field="roi" />
                    <th className="text-right text-xs text-zinc-500 font-mono px-4 py-3">MULT</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((card, idx) => {
                    const roiColor = card.roi > 50 ? "text-emerald-400" : card.roi > 0 ? "text-yellow-400" : "text-red-400";
                    return (
                      <tr
                        key={card.id}
                        onClick={() => router.push("/card/" + card.tcgPlayerId)}
                        className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3 text-zinc-600 text-sm font-mono">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {card.image && <img src={card.image} alt={card.name} className="w-10 rounded" />}
                            <div>
                              <p className="text-sm font-semibold text-white">{card.name}</p>
                              <p className="text-xs text-zinc-600">{card.rarity} · #{card.number}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-mono text-zinc-300">${card.rawPrice.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-sm font-mono text-yellow-400">${card.psa10Price.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-sm font-mono text-zinc-400">${card.totalCosts.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-sm font-mono text-zinc-400">${card.saleProceeds.toFixed(2)}</td>
                        <td className={"px-4 py-3 text-right text-sm font-mono font-bold " + roiColor}>
                          {card.profit >= 0 ? "+" : ""}${card.profit.toFixed(2)}
                        </td>
                        <td className={"px-4 py-3 text-right text-sm font-mono font-bold " + roiColor}>
                          {card.roi >= 0 ? "+" : ""}{card.roi.toFixed(0)}%
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-mono text-zinc-500">
                          {(card.psa10Price / card.rawPrice).toFixed(1)}x
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-between">
              <span className="text-xs text-zinc-600 font-mono">
                {filtered.length} cards · {cards.filter(c => c.psa10Price > 0).length} with PSA 10 data · {cards.length} total · click any row for full details
              </span>
              <button
                onClick={exportToCSV}
                className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-4 py-1.5 rounded-lg transition-colors text-xs"
              >
                Export CSV
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}