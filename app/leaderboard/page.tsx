"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CardData } from "@/lib/types";
import { mapApiCard } from "@/lib/api";
import { useFees } from "@/lib/fees-context";
import { useWatchlist } from "@/lib/watchlist-context";
import WatchlistPicker from "@/components/WatchlistPicker";
import Link from "next/link";

function calcProfit(card: CardData, fees: ReturnType<typeof useFees>["fees"]) {
  const totalCosts = card.rawPrice * (1 + fees.buyingFeePercent / 100) + fees.gradingFee + fees.shippingToGrader + fees.shippingBack;
  const saleProceeds10 = card.psa10Price * (1 - fees.ebayFeePercent / 100);
  const profit = saleProceeds10 - totalCosts;
  const roi = totalCosts > 0 ? (profit / totalCosts) * 100 : 0;
  const psa9Price = card.psa9Price ?? 0;
  const saleProceeds9 = psa9Price * (1 - fees.ebayFeePercent / 100);
  const profit9 = saleProceeds9 - totalCosts;
  const roi9 = totalCosts > 0 ? (profit9 / totalCosts) * 100 : 0;
  return { profit, roi, totalCosts, saleProceeds: saleProceeds10, profit9, roi9, psa9Price };
}

type EnrichedCard = CardData & {
  profit: number;
  roi: number;
  totalCosts: number;
  saleProceeds: number;
  profit9: number;
  roi9: number;
  psa9Price: number;
};

const NEG_INF = -999999;
const POS_INF = 999999;

function BulkWatchlistPicker({ cards, onClose }: { cards: EnrichedCard[]; onClose: () => void }) {
  const { lists, addItem } = useWatchlist();
  const [selectedListId, setSelectedListId] = useState<string | undefined>(undefined);
  const [adding, setAdding] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);

  async function handleAddAll() {
    setAdding(true);
    setProgress(0);
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      await addItem({
        tcgPlayerId: card.tcgPlayerId,
        name: card.name,
        set: card.set,
        image: card.image,
        rawPrice: card.rawPrice,
        psa10Price: card.psa10Price,
        psa9Price: card.psa9Price ?? 0,
        rarity: card.rarity,
        number: card.number,
        addedAt: new Date().toISOString(),
      }, selectedListId);
      setProgress(i + 1);
    }
    setAdding(false);
    setDone(true);
  }

  const listName = selectedListId === undefined
    ? "Main Watchlist"
    : lists.find(l => l.id === selectedListId)?.name ?? "Unknown";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0d0d14] border border-zinc-700 rounded-2xl p-6 w-full max-w-sm space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-white">Add to Watchlist</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors text-xl">✕</button>
        </div>

        <p className="text-zinc-400 text-sm font-medium">
          Adding <span className="text-white font-bold">{cards.length} selected card{cards.length !== 1 ? "s" : ""}</span> to a watchlist.
        </p>

        {!done && (
          <>
            <div className="space-y-2">
              <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">Choose Watchlist</p>

              <button
                onClick={() => setSelectedListId(undefined)}
                className={"w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors " +
                  (selectedListId === undefined ? "bg-blue-500/20 border-blue-500/40 text-white" : "bg-zinc-800/60 border-zinc-700 text-zinc-300 hover:border-zinc-500")}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">★</span>
                  <span className="font-semibold text-sm">Main Watchlist</span>
                </div>
                {selectedListId === undefined && <span className="text-xs text-blue-400 font-bold">Selected ✓</span>}
              </button>

              {lists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => setSelectedListId(list.id)}
                  className={"w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors " +
                    (selectedListId === list.id ? "bg-blue-500/20 border-blue-500/40 text-white" : "bg-zinc-800/60 border-zinc-700 text-zinc-300 hover:border-zinc-500")}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">📋</span>
                    <span className="font-semibold text-sm">{list.name}</span>
                  </div>
                  {selectedListId === list.id && <span className="text-xs text-blue-400 font-bold">Selected ✓</span>}
                </button>
              ))}
            </div>

            {adding && (
              <div className="space-y-2">
                <div className="w-full bg-zinc-700 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: (progress / cards.length * 100) + "%" }} />
                </div>
                <p className="text-xs text-zinc-400 font-mono text-center">Adding {progress} of {cards.length}...</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={onClose} className="flex-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-300 font-bold px-4 py-2.5 rounded-lg transition-colors text-sm">
                Cancel
              </button>
              <button
                onClick={handleAddAll}
                disabled={adding}
                className="flex-1 bg-blue-500 hover:bg-blue-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold px-4 py-2.5 rounded-lg transition-colors text-sm"
              >
                {adding ? "Adding..." : "Add " + cards.length + " Card" + (cards.length !== 1 ? "s" : "")}
              </button>
            </div>
          </>
        )}

        {done && (
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
              <p className="text-2xl mb-1">✅</p>
              <p className="text-emerald-400 font-bold text-sm">Added {cards.length} cards to {listName}</p>
            </div>
            <button onClick={onClose} className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-300 font-bold px-4 py-2.5 rounded-lg transition-colors text-sm">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function LeaderboardInner() {
  const { fees } = useFees();
  const { isWatched, removeItem } = useWatchlist();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sets, setSets] = useState<{ name: string; id: string }[]>([]);
  const [selectedSet, setSelectedSet] = useState(searchParams.get("set") ?? "");
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [setsLoading, setSetsLoading] = useState(true);
  const [error, setError] = useState("");
  const [rarityFilter, setRarityFilter] = useState(searchParams.get("rarity") ?? "All");
  const [sortBy, setSortBy] = useState<"roi" | "profit" | "psa10" | "raw" | "roi9" | "profit9">(
    (searchParams.get("sort") as "roi" | "profit" | "psa10" | "raw" | "roi9" | "profit9") ?? "roi"
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">((searchParams.get("dir") as "asc" | "desc") ?? "desc");
  const [minRaw, setMinRaw] = useState(parseFloat(searchParams.get("min") ?? "1") || 1);
  const [maxRaw, setMaxRaw] = useState(parseFloat(searchParams.get("max") ?? "") || POS_INF);
  const [minRoi, setMinRoi] = useState(parseFloat(searchParams.get("minRoi") ?? "") || NEG_INF);
  const [maxRoi, setMaxRoi] = useState(parseFloat(searchParams.get("maxRoi") ?? "") || POS_INF);
  const [showAll, setShowAll] = useState(false);
  const [pickerCard, setPickerCard] = useState<EnrichedCard | null>(null);
  const [showBulkPicker, setShowBulkPicker] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

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

  useEffect(() => {
    const fromUrl = searchParams.get("set");
    if (fromUrl) {
      setSelectedSet(fromUrl);
      fetchSetCards(fromUrl);
    }
  }, []);

  async function fetchSetCards(setName: string) {
    setLoading(true);
    setError("");
    setCards([]);
    setShowAll(false);
    setSelectedIds(new Set());
    setSelectMode(false);
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
    if (setName) {
      localStorage.setItem("pokeroi-last-set", setName);
      fetchSetCards(setName);
    }
  }

  function handleRarityChange(rarity: string) {
    setRarityFilter(rarity);
    setShowAll(false);
    updateUrl({ rarity: rarity === "All" ? "" : rarity });
  }

  function handleSortByChange(sort: typeof sortBy) {
    setSortBy(sort);
    setShowAll(false);
    updateUrl({ sort });
  }

  function handleSortDirChange() {
    const next = sortDir === "desc" ? "asc" : "desc";
    setSortDir(next);
    setShowAll(false);
    updateUrl({ dir: next });
  }

  function handleMinRawChange(val: number) {
    setMinRaw(val);
    setShowAll(false);
    updateUrl({ min: String(val) });
  }

  function handleMaxRawChange(val: number) {
    setMaxRaw(val);
    setShowAll(false);
    updateUrl({ max: val === POS_INF ? "" : String(val) });
  }

  function handleMinRoiChange(val: number) {
    setMinRoi(val);
    setShowAll(false);
    updateUrl({ minRoi: val === NEG_INF ? "" : String(val) });
  }

  function handleMaxRoiChange(val: number) {
    setMaxRoi(val);
    setShowAll(false);
    updateUrl({ maxRoi: val === POS_INF ? "" : String(val) });
  }

  function resetFilters() {
    setRarityFilter("All");
    setMinRaw(1);
    setMaxRaw(POS_INF);
    setMinRoi(NEG_INF);
    setMaxRoi(POS_INF);
    setShowAll(false);
    updateUrl({ rarity: "", min: "1", max: "", minRoi: "", maxRoi: "" });
  }

  async function toggleWatch(e: React.MouseEvent, card: EnrichedCard) {
    e.stopPropagation();
    if (isWatched(card.tcgPlayerId)) {
      await removeItem(card.tcgPlayerId);
    } else {
      setPickerCard(card);
    }
  }

  function toggleSelectCard(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === visibleCards.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleCards.map(c => c.tcgPlayerId)));
    }
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
      .filter((c) => c.roi >= minRoi && c.roi <= maxRoi)
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === "roi") diff = b.roi - a.roi;
        else if (sortBy === "profit") diff = b.profit - a.profit;
        else if (sortBy === "psa10") diff = b.psa10Price - a.psa10Price;
        else if (sortBy === "roi9") diff = b.roi9 - a.roi9;
        else if (sortBy === "profit9") diff = b.profit9 - a.profit9;
        else diff = b.rawPrice - a.rawPrice;
        return sortDir === "desc" ? diff : -diff;
      });
  }, [cards, rarityFilter, sortBy, sortDir, fees, minRaw, maxRaw, minRoi, maxRoi]);

  const visibleCards = showAll ? filtered : filtered.slice(0, 10);

  const selectedCards = filtered.filter(c => selectedIds.has(c.tcgPlayerId));

  const setStats = useMemo(() => {
    if (cards.length === 0) return null;
    const withPsa10 = cards.filter(c => c.psa10Price > 0);
    const enriched = withPsa10.map(c => ({ ...c, ...calcProfit(c, fees) }));
    const profitable = enriched.filter(e => e.profit > 0);
    const avgRoi = enriched.length > 0 ? enriched.reduce((s, e) => s + e.roi, 0) / enriched.length : 0;
    const bestCard = [...enriched].sort((a, b) => b.roi - a.roi)[0];
    const withPsa9 = cards.filter(c => (c.psa9Price ?? 0) > 0);
    const profitableP9 = withPsa9.map(c => ({ ...c, ...calcProfit(c, fees) })).filter(e => e.profit9 > 0);
    return { withPsa10, profitable, avgRoi, bestCard, withPsa9, profitableP9 };
  }, [cards, fees]);

  function exportToCSV() {
    const headers = ["Rank", "Name", "Set", "Rarity", "Number", "Raw Price", "PSA 10 Price", "PSA 9 Price", "Total Cost", "Sale Proceeds", "Net Profit", "ROI %", "PSA 9 Profit", "PSA 9 ROI %", "Multiple", "Image URL"];
    const rows = filtered.map((card, idx) => [
      idx + 1, card.name, card.set, card.rarity, card.number,
      card.rawPrice.toFixed(2), card.psa10Price.toFixed(2),
      card.psa9Price > 0 ? card.psa9Price.toFixed(2) : "",
      card.totalCosts.toFixed(2), card.saleProceeds.toFixed(2),
      card.profit.toFixed(2), card.roi.toFixed(1) + "%",
      card.psa9Price > 0 ? card.profit9.toFixed(2) : "",
      card.psa9Price > 0 ? card.roi9.toFixed(1) + "%" : "",
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

  function cardUrl(tcgPlayerId: string) {
    return "/card/" + tcgPlayerId + "?from=" + encodeURIComponent("/leaderboard?" + searchParams.toString());
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

      {pickerCard && (
        <WatchlistPicker
          card={{
            tcgPlayerId: pickerCard.tcgPlayerId,
            name: pickerCard.name,
            set: pickerCard.set,
            image: pickerCard.image,
            rawPrice: pickerCard.rawPrice,
            psa10Price: pickerCard.psa10Price,
            psa9Price: pickerCard.psa9Price ?? 0,
            rarity: pickerCard.rarity,
            number: pickerCard.number,
            addedAt: new Date().toISOString(),
          }}
          onClose={() => setPickerCard(null)}
        />
      )}

      {showBulkPicker && selectedCards.length > 0 && (
        <BulkWatchlistPicker
          cards={selectedCards}
          onClose={() => { setShowBulkPicker(false); setSelectedIds(new Set()); setSelectMode(false); }}
        />
      )}

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-12">

        <div className="mb-8">
          <Link href="/" className="text-zinc-500 hover:text-white text-sm transition-colors">← Back to Home</Link>
          <h1 className="text-4xl font-black mt-2">
            <span className="text-white">TOP </span>
            <span className="text-yellow-400">ROI</span>
            <span className="text-white"> CARDS</span>
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Cards with the highest grading return by set — click row for details · ☆ to watchlist</p>
        </div>

        {/* Controls */}
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
                <option value="roi">ROI % (PSA 10)</option>
                <option value="profit">Net Profit (PSA 10)</option>
                <option value="roi9">ROI % (PSA 9)</option>
                <option value="profit9">Net Profit (PSA 9)</option>
                <option value="psa10">PSA 10 Price</option>
                <option value="raw">Raw Price</option>
              </select>
              <button onClick={handleSortDirChange} className="bg-zinc-800 border border-zinc-700 hover:border-zinc-500 rounded-lg px-3 py-2.5 text-white text-sm transition-colors font-mono">
                {sortDir === "desc" ? "↓ Desc" : "↑ Asc"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 font-mono mb-1">RAW PRICE ($)</label>
            <div className="flex items-center gap-2">
              <input type="number" value={minRaw} min={0} placeholder="Min"
                onChange={(e) => handleMinRawChange(parseFloat(e.target.value) || 0)}
                className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none font-mono"
              />
              <span className="text-zinc-600 text-sm font-mono">—</span>
              <input type="number" value={maxRaw === POS_INF ? "" : maxRaw} min={0} placeholder="Max"
                onChange={(e) => handleMaxRawChange(e.target.value === "" ? POS_INF : parseFloat(e.target.value) || POS_INF)}
                className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 font-mono mb-1">ROI % RANGE</label>
            <div className="flex items-center gap-2">
              <input type="number" value={minRoi === NEG_INF ? "" : minRoi} placeholder="Min %"
                onChange={(e) => handleMinRoiChange(e.target.value === "" ? NEG_INF : parseFloat(e.target.value))}
                className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none font-mono"
              />
              <span className="text-zinc-600 text-sm font-mono">—</span>
              <input type="number" value={maxRoi === POS_INF ? "" : maxRoi} placeholder="Max %"
                onChange={(e) => handleMaxRoiChange(e.target.value === "" ? POS_INF : parseFloat(e.target.value))}
                className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none font-mono"
              />
            </div>
          </div>

          <div className="flex items-end gap-2 flex-wrap">
            <button onClick={resetFilters} className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 hover:text-white font-bold px-3 py-2.5 rounded-lg transition-colors text-xs font-mono whitespace-nowrap">
              Reset Filters
            </button>
            <button
              onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}
              disabled={filtered.length === 0}
              className={"font-bold px-4 py-2.5 rounded-lg transition-colors text-sm whitespace-nowrap border " +
                (selectMode
                  ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                  : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 disabled:bg-zinc-800 disabled:text-zinc-600")}
            >
              {selectMode ? "✕ Cancel Select" : "☑ Select Cards"}
            </button>
            <button
              onClick={exportToCSV}
              disabled={filtered.length === 0}
              className="bg-yellow-400 hover:bg-yellow-300 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-bold px-5 py-2.5 rounded-lg transition-colors text-sm whitespace-nowrap"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Selection bar */}
        {selectMode && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="text-sm font-bold text-blue-300 hover:text-white transition-colors font-mono"
              >
                {selectedIds.size === visibleCards.length ? "☑ Deselect All" : "☐ Select All Visible"}
              </button>
              <span className="text-zinc-400 text-sm font-medium">
                {selectedIds.size} card{selectedIds.size !== 1 ? "s" : ""} selected
              </span>
            </div>
            <button
              onClick={() => setShowBulkPicker(true)}
              disabled={selectedIds.size === 0}
              className="bg-blue-500 hover:bg-blue-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold px-5 py-2 rounded-lg transition-colors text-sm"
            >
              ★ Add {selectedIds.size > 0 ? selectedIds.size + " " : ""}Selected to Watchlist
            </button>
          </div>
        )}

        {/* Set overview stats */}
        {!loading && setStats && (
          <div className="mb-6 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-white font-mono">{cards.length}</p>
                <p className="text-xs text-zinc-600 mt-0.5">Total cards</p>
              </div>
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-yellow-400 font-mono">{setStats.withPsa10.length}</p>
                <p className="text-xs text-zinc-600 mt-0.5">With PSA 10 data</p>
              </div>
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-emerald-400 font-mono">{setStats.profitable.length}</p>
                <p className="text-xs text-zinc-600 mt-0.5">Profitable to grade</p>
              </div>
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 text-center">
                <p className={"text-2xl font-black font-mono " + (setStats.avgRoi >= 0 ? "text-emerald-400" : "text-red-400")}>
                  {setStats.avgRoi >= 0 ? "+" : ""}{setStats.avgRoi.toFixed(0)}%
                </p>
                <p className="text-xs text-zinc-600 mt-0.5">Average ROI</p>
              </div>
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-blue-400 font-mono">{setStats.withPsa9.length}</p>
                <p className="text-xs text-zinc-600 mt-0.5">With PSA 9 data</p>
              </div>
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-emerald-400 font-mono">{setStats.profitableP9.length}</p>
                <p className="text-xs text-zinc-600 mt-0.5">Profitable at PSA 9</p>
              </div>
            </div>

            {setStats.bestCard && (
              <div
                onClick={() => router.push(cardUrl(setStats.bestCard.tcgPlayerId))}
                className="bg-yellow-400/5 border border-yellow-400/10 hover:border-yellow-400/30 rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-colors"
              >
                {setStats.bestCard.image && <img src={setStats.bestCard.image} alt={setStats.bestCard.name} className="w-12 rounded flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-500 font-mono mb-0.5">Best ROI card in set</p>
                  <p className="text-sm font-bold text-white truncate">{setStats.bestCard.name}</p>
                  <p className="text-xs text-zinc-600">{setStats.bestCard.rarity} · #{setStats.bestCard.number}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-black text-emerald-400 font-mono">+{setStats.bestCard.roi.toFixed(0)}%</p>
                  <p className="text-xs text-emerald-400 font-mono">+${setStats.bestCard.profit.toFixed(2)} profit</p>
                  <p className="text-xs text-zinc-600 mt-0.5">PSA 10: ${setStats.bestCard.psa10Price.toFixed(2)}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="text-center py-20">
            <div className="text-4xl mb-4 animate-spin inline-block">⚡</div>
            <p className="text-zinc-500 font-mono text-sm">Fetching all cards in set...</p>
          </div>
        )}

        {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-4">{error}</div>}

        {!loading && !selectedSet && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🏆</div>
            <p className="text-zinc-600 font-mono text-sm mb-2">Select a set above to see the top ROI cards</p>
            <p className="text-zinc-700 text-xs">Cards are loaded on demand to conserve API credits</p>
          </div>
        )}

        {!loading && selectedSet && filtered.length === 0 && cards.length > 0 && (
          <div className="text-center py-20">
            <p className="text-zinc-500 font-mono text-sm">No cards match your current filters.</p>
            <button onClick={resetFilters} className="mt-3 text-xs text-blue-400 hover:text-blue-300 font-mono transition-colors">Reset all filters →</button>
          </div>
        )}

        {/* Table */}
        {filtered.length > 0 && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <div className="max-h-[72vh] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 z-10 bg-[#0d0d14] border-b border-zinc-800">
                    <tr>
                      {selectMode && (
                        <th className="px-3 py-3 w-8">
                          <button onClick={toggleSelectAll} className="text-zinc-400 hover:text-white transition-colors text-sm">
                            {selectedIds.size === visibleCards.length && visibleCards.length > 0 ? "☑" : "☐"}
                          </button>
                        </th>
                      )}
                      <th className="text-left text-xs text-zinc-500 font-mono px-4 py-3 w-8">#</th>
                      {!selectMode && <th className="text-left text-xs text-zinc-500 font-mono px-2 py-3 w-8"></th>}
                      <th className="text-left text-xs text-zinc-500 font-mono px-4 py-3">CARD</th>
                      <SortTh label="RAW" field="raw" />
                      <SortTh label="PSA 10" field="psa10" />
                      <th className="text-right text-xs text-zinc-500 font-mono px-4 py-3">PSA 9</th>
                      <th className="text-right text-xs text-zinc-500 font-mono px-4 py-3">COST</th>
                      <SortTh label="P10 PROFIT" field="profit" />
                      <SortTh label="P10 ROI" field="roi" />
                      <SortTh label="P9 PROFIT" field="profit9" />
                      <SortTh label="P9 ROI" field="roi9" />
                      <th className="text-right text-xs text-zinc-500 font-mono px-4 py-3">MULT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleCards.map((card, idx) => {
                      const roi10Color = card.roi > 50 ? "text-emerald-400" : card.roi > 0 ? "text-yellow-400" : "text-red-400";
                      const roi9Color = card.roi9 > 50 ? "text-emerald-400" : card.roi9 > 0 ? "text-yellow-400" : "text-red-400";
                      const watched = isWatched(card.tcgPlayerId);
                      const isSelected = selectedIds.has(card.tcgPlayerId);
                      return (
                        <tr
                          key={card.id}
                          onClick={() => selectMode ? toggleSelectCard({ stopPropagation: () => {} } as React.MouseEvent, card.tcgPlayerId) : router.push(cardUrl(card.tcgPlayerId))}
                          className={"border-b border-zinc-800/50 transition-colors cursor-pointer " +
                            (isSelected
                              ? "bg-blue-500/10 hover:bg-blue-500/20"
                              : idx % 2 === 0 ? "bg-transparent hover:bg-zinc-800/50" : "bg-zinc-800/20 hover:bg-zinc-800/50")}
                        >
                          {selectMode && (
                            <td className="px-3 py-3" onClick={(e) => toggleSelectCard(e, card.tcgPlayerId)}>
                              <span className={"text-lg " + (isSelected ? "text-blue-400" : "text-zinc-600")}>
                                {isSelected ? "☑" : "☐"}
                              </span>
                            </td>
                          )}
                          <td className="px-4 py-3 text-zinc-600 text-sm font-mono">{idx + 1}</td>
                          {!selectMode && (
                            <td className="px-2 py-3" onClick={(e) => toggleWatch(e, card)}>
                              <button
                                className={"w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold transition-all shadow " +
                                  (watched ? "bg-blue-500 text-white hover:bg-red-500" : "bg-zinc-800 text-zinc-500 hover:bg-blue-500 hover:text-white border border-zinc-700")}
                                title={watched ? "Remove from watchlist" : "Add to watchlist"}
                              >
                                {watched ? "★" : "☆"}
                              </button>
                            </td>
                          )}
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
                          <td className="px-4 py-3 text-right text-sm font-mono text-blue-400">{card.psa9Price > 0 ? "$" + card.psa9Price.toFixed(2) : "—"}</td>
                          <td className="px-4 py-3 text-right text-sm font-mono text-zinc-400">${card.totalCosts.toFixed(2)}</td>
                          <td className={"px-4 py-3 text-right text-sm font-mono font-bold " + roi10Color}>{card.profit >= 0 ? "+" : ""}${card.profit.toFixed(2)}</td>
                          <td className={"px-4 py-3 text-right text-sm font-mono font-bold " + roi10Color}>{card.roi >= 0 ? "+" : ""}{card.roi.toFixed(0)}%</td>
                          <td className={"px-4 py-3 text-right text-sm font-mono font-bold " + (card.psa9Price > 0 ? roi9Color : "text-zinc-700")}>
                            {card.psa9Price > 0 ? (card.profit9 >= 0 ? "+" : "") + "$" + card.profit9.toFixed(2) : "—"}
                          </td>
                          <td className={"px-4 py-3 text-right text-sm font-mono font-bold " + (card.psa9Price > 0 ? roi9Color : "text-zinc-700")}>
                            {card.psa9Price > 0 ? (card.roi9 >= 0 ? "+" : "") + card.roi9.toFixed(0) + "%" : "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-xs font-mono text-zinc-500">{(card.psa10Price / card.rawPrice).toFixed(1)}x</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-between gap-4 flex-wrap">
              <span className="text-xs text-zinc-600 font-mono">
                Showing {visibleCards.length} of {filtered.length} cards
                {!showAll && filtered.length > 10 && (
                  <span className="text-zinc-700"> · top 10 by {sortBy === "roi" ? "ROI" : sortBy === "profit" ? "profit" : sortBy === "roi9" ? "PSA 9 ROI" : sortBy === "profit9" ? "PSA 9 profit" : sortBy === "psa10" ? "PSA 10 price" : "raw price"}</span>
                )}
              </span>
              <div className="flex items-center gap-3">
                {filtered.length > 10 && (
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className={"text-sm font-mono font-bold px-4 py-1.5 rounded-lg border transition-colors " +
                      (showAll ? "border-zinc-600 text-zinc-400 hover:text-white" : "border-blue-500/40 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20")}
                  >
                    {showAll ? "↑ Show top 10" : "↓ Show all " + filtered.length + " cards"}
                  </button>
                )}
                <button onClick={exportToCSV} className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-4 py-1.5 rounded-lg transition-colors text-xs">
                  Export CSV
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function Leaderboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-zinc-500 font-mono text-sm">Loading...</div>
      </div>
    }>
      <LeaderboardInner />
    </Suspense>
  );
}