"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useWatchlist } from "@/lib/watchlist-context";
import { WatchlistItem } from "@/lib/watchlist";
import { useFees } from "@/lib/fees-context";
import WatchlistPicker from "@/components/WatchlistPicker";
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
  const { items, lists, loading: syncing, removeItem, deleteList, renameList, reload, createList } = useWatchlist();
  const [mounted, setMounted] = useState(false);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"roi" | "raw" | "psa10" | "profit" | "added">("roi");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [confirmDeleteList, setConfirmDeleteList] = useState<string | null>(null);
  const [newListName, setNewListName] = useState("");
  const [creatingList, setCreatingList] = useState(false);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState("");
  const { fees } = useFees();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const listItems = useMemo(() => {
    if (activeListId === null) return items.filter(i => !i.watchlistId);
    return items.filter(i => i.watchlistId === activeListId);
  }, [items, activeListId]);

  async function handleRemove(tcgPlayerId: string) {
    const watchlistId = activeListId ?? undefined;
    await removeItem(tcgPlayerId, watchlistId);
  }

  async function handleDeleteList(id: string) {
    await deleteList(id);
    setConfirmDeleteList(null);
    setActiveListId(null);
  }

  async function handleCreateList() {
    if (!newListName.trim()) return;
    setCreatingList(true);
    await createList(newListName.trim());
    setNewListName("");
    setCreatingList(false);
  }

  async function handleRenameList() {
    if (!editingListId || !editingListName.trim()) return;
    await renameList(editingListId, editingListName.trim());
    setEditingListId(null);
    setEditingListName("");
  }

  async function handleRefreshAll() {
    if (listItems.length === 0) return;
    setRefreshing(true);
    setRefreshProgress(0);

    const updated = [...listItems];
    for (let i = 0; i < updated.length; i++) {
      try {
        const res = await fetch("/api/card?id=" + updated[i].tcgPlayerId);
        const json = await res.json();
        const raw = json.data;
        const cardData = Array.isArray(raw) ? raw[0] : raw;
        if (cardData) {
          const prices = (cardData.prices as Record<string, number>) ?? {};
          const rawPrice = prices.market ?? prices.low ?? updated[i].rawPrice;
          const ebay = (cardData.ebay as Record<string, unknown>) ?? {};
          const salesByGrade = (ebay.salesByGrade as Record<string, Record<string, unknown>>) ?? {};
          const psa10 = salesByGrade.psa10 ?? {};
          const psa9 = salesByGrade.psa9 ?? {};
          const smart10 = (psa10.smartMarketPrice as Record<string, number>) ?? {};
          const smart9 = (psa9.smartMarketPrice as Record<string, number>) ?? {};
          const psa10Price = smart10.price ?? (psa10.marketPrice7Day as number) ?? updated[i].psa10Price;
          const psa9Price = smart9.price ?? (psa9.marketPrice7Day as number) ?? updated[i].psa9Price;
          updated[i] = { ...updated[i], rawPrice, psa10Price, psa9Price };
        }
      } catch {
        // keep existing price
      }
      setRefreshProgress(i + 1);
      await new Promise((r) => setTimeout(r, 300));
    }

    for (const item of updated) {
  await fetch("/api/db/watchlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tcgPlayerId: item.tcgPlayerId,
      name: item.name,
      set: item.set,
      image: item.image,
      rawPrice: item.rawPrice,
      psa10Price: item.psa10Price,
      psa9Price: item.psa9Price,
      rarity: item.rarity,
      number: item.number,
      addedAt: item.addedAt,
      watchlistId: item.watchlistId ?? null,
    }),
  });
}

    await reload();
    setRefreshing(false);
    setRefreshProgress(0);
    setLastRefreshed(new Date());
  }

  function toggleSort(key: typeof sortBy) {
    if (sortBy === key) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else { setSortBy(key); setSortDir("desc"); }
  }

  function cardUrl(tcgPlayerId: string) {
    return "/card/" + tcgPlayerId + "?from=" + encodeURIComponent("/watchlist");
  }

  const sorted = useMemo(() => {
    return [...listItems].sort((a, b) => {
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
  }, [listItems, sortBy, sortDir, fees]);

  function exportToCSV() {
    const headers = ["Name", "Set", "Rarity", "Number", "Raw Price", "PSA 10 Price", "PSA 9 Price", "Total Cost", "PSA 10 Profit", "PSA 10 ROI %", "PSA 9 Profit", "PSA 9 ROI %", "Added"];
    const rows = sorted.map((item) => {
      const r10 = calcROI(item.psa10Price, item.rawPrice, fees);
      const r9 = calcROI(item.psa9Price, item.rawPrice, fees);
      return [
        item.name, item.set, item.rarity, item.number,
        item.rawPrice.toFixed(2), item.psa10Price.toFixed(2), item.psa9Price.toFixed(2),
        r10.totalCosts.toFixed(2), r10.profit.toFixed(2), r10.roi.toFixed(1) + "%",
        r9.profit.toFixed(2), r9.roi.toFixed(1) + "%",
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
        className={"text-right text-xs font-mono px-4 py-3 cursor-pointer transition-colors select-none " + (active ? "text-yellow-400" : "text-zinc-400 hover:text-white")}
      >
        {label} {active ? (sortDir === "desc" ? "↓" : "↑") : ""}
      </th>
    );
  }

  const activeListName = activeListId === null
    ? "Main Watchlist"
    : lists.find(l => l.id === activeListId)?.name ?? "Unknown";

  const mainCount = items.filter(i => !i.watchlistId).length;

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
      </div>

      {showAddPicker && (
        <WatchlistPicker
          card={{
            tcgPlayerId: "",
            name: "",
            set: "",
            rawPrice: 0,
            psa10Price: 0,
            psa9Price: 0,
            rarity: "",
            number: "",
            addedAt: new Date().toISOString(),
          }}
          onClose={() => setShowAddPicker(false)}
        />
      )}

      {confirmDeleteList && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0d14] border border-zinc-700 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-black text-white">Delete Watchlist?</h2>
            <p className="text-zinc-400 text-sm font-medium">
              This will delete the list and all {items.filter(i => i.watchlistId === confirmDeleteList).length} cards in it. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteList(null)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-300 font-bold px-4 py-2.5 rounded-lg transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteList(confirmDeleteList)}
                className="flex-1 bg-red-500 hover:bg-red-400 text-white font-bold px-4 py-2.5 rounded-lg transition-colors text-sm"
              >
                Delete List
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-12">

        <div className="mb-6">
          <Link href="/" className="text-zinc-400 hover:text-white text-sm font-semibold transition-colors">← Back to Home</Link>
          <h1 className="text-4xl font-black mt-2">
            <span className="text-white">MY </span>
            <span className="text-blue-400">WATCHLISTS</span>
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-zinc-400 text-sm font-medium">{items.length} cards across {lists.length + 1} lists</p>
            <span className="text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-mono">
              ☁ Synced
            </span>
          </div>
        </div>

        {syncing && (
          <div className="text-center py-8">
            <div className="text-2xl mb-2 animate-spin inline-block">⟳</div>
            <p className="text-zinc-400 font-semibold text-sm">Loading from cloud...</p>
          </div>
        )}

        {!syncing && (
          <div className="space-y-6">

            {/* List tabs + create */}
            <div className="flex flex-wrap gap-2 items-center">

              {/* Main watchlist tab */}
              <button
                onClick={() => setActiveListId(null)}
                className={"px-4 py-2 rounded-lg border text-sm font-bold transition-colors " +
                  (activeListId === null
                    ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                    : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500")}
              >
                ★ Main ({mainCount})
              </button>

              {/* Custom list tabs */}
              {lists.map((list) => {
                const count = items.filter(i => i.watchlistId === list.id).length;
                return (
                  <div key={list.id} className="relative group flex items-center">
                    {editingListId === list.id ? (
                      <div className="flex gap-1 items-center">
                        <input
                          autoFocus
                          value={editingListName}
                          onChange={(e) => setEditingListName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameList();
                            if (e.key === "Escape") { setEditingListId(null); setEditingListName(""); }
                          }}
                          className="bg-zinc-800 border border-blue-500/40 rounded-lg px-3 py-2 text-white text-sm outline-none w-36"
                        />
                        <button
                          onClick={handleRenameList}
                          className="text-xs bg-blue-500 hover:bg-blue-400 text-white font-bold px-2 py-2 rounded-lg transition-colors"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => { setEditingListId(null); setEditingListName(""); }}
                          className="text-xs bg-zinc-700 hover:bg-zinc-600 text-white font-bold px-2 py-2 rounded-lg transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => setActiveListId(list.id)}
                          className={"px-4 py-2 rounded-lg border text-sm font-bold transition-colors pr-16 " +
                            (activeListId === list.id
                              ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                              : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500")}
                        >
                          📋 {list.name} ({count})
                        </button>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1">
                          <button
                            onClick={() => { setEditingListId(list.id); setEditingListName(list.name); }}
                            className="text-zinc-500 hover:text-blue-400 transition-colors text-xs font-bold"
                            title="Rename list"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => setConfirmDeleteList(list.id)}
                            className="text-zinc-500 hover:text-red-400 transition-colors text-xs font-bold"
                            title="Delete list"
                          >
                            ✕
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

              {/* Create new list */}
              <div className="flex gap-2 items-center">
                <input
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreateList(); }}
                  placeholder="New list name..."
                  className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm outline-none placeholder-zinc-500 w-36"
                />
                <button
                  onClick={handleCreateList}
                  disabled={creatingList || !newListName.trim()}
                  className="bg-yellow-400 hover:bg-yellow-300 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-bold px-3 py-2 rounded-lg transition-colors text-sm whitespace-nowrap"
                >
                  {creatingList ? "..." : "+ Create"}
                </button>
              </div>
            </div>

            {/* Active list header + controls */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-black text-white">{activeListName}</h2>
                <p className="text-sm text-zinc-400 font-medium">{sorted.length} cards</p>
              </div>

              {sorted.length > 0 && (
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-zinc-400 font-semibold">SORT</label>
                    <select
                      value={sortBy}
                      onChange={(e) => { setSortBy(e.target.value as typeof sortBy); setSortDir("desc"); }}
                      className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm outline-none"
                    >
                      <option value="roi">ROI %</option>
                      <option value="profit">Net Profit</option>
                      <option value="raw">Raw Price</option>
                      <option value="psa10">PSA 10 Price</option>
                      <option value="added">Date Added</option>
                    </select>
                    <button
                      onClick={() => setSortDir(sortDir === "desc" ? "asc" : "desc")}
                      className="bg-zinc-800 border border-zinc-600 hover:border-zinc-500 rounded-lg px-3 py-2 text-white text-sm transition-colors font-mono"
                    >
                      {sortDir === "desc" ? "↓ Desc" : "↑ Asc"}
                    </button>
                  </div>

                  <button
                    onClick={handleRefreshAll}
                    disabled={refreshing}
                    className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-600 border border-zinc-600 text-zinc-300 font-bold px-4 py-2 rounded-lg transition-colors text-sm"
                  >
                    {refreshing ? (
                      <><span className="animate-spin inline-block">⟳</span> {refreshProgress}/{listItems.length}</>
                    ) : (
                      <>⟳ Refresh Prices</>
                    )}
                  </button>

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
            {sorted.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(() => {
                  const profitable = sorted.filter((i) => calcROI(i.psa10Price, i.rawPrice, fees).profit > 0);
                  const totalProfit = sorted.reduce((s, i) => s + calcROI(i.psa10Price, i.rawPrice, fees).profit, 0);
                  const avgRoi = sorted.length > 0 ? sorted.reduce((s, i) => s + calcROI(i.psa10Price, i.rawPrice, fees).roi, 0) / sorted.length : 0;
                  return (
                    <>
                      <div className="bg-zinc-900/60 border border-zinc-700 rounded-xl p-4 text-center">
                        <p className="text-2xl font-black text-white font-mono">{sorted.length}</p>
                        <p className="text-sm text-zinc-400 mt-1 font-medium">Cards watching</p>
                      </div>
                      <div className="bg-zinc-900/60 border border-zinc-700 rounded-xl p-4 text-center">
                        <p className="text-2xl font-black text-emerald-400 font-mono">{profitable.length}</p>
                        <p className="text-sm text-zinc-400 mt-1 font-medium">Profitable to grade</p>
                      </div>
                      <div className="bg-zinc-900/60 border border-zinc-700 rounded-xl p-4 text-center">
                        <p className={"text-2xl font-black font-mono " + (totalProfit >= 0 ? "text-emerald-400" : "text-red-400")}>
                          {totalProfit >= 0 ? "+" : ""}${totalProfit.toFixed(0)}
                        </p>
                        <p className="text-sm text-zinc-400 mt-1 font-medium">Total potential profit</p>
                      </div>
                      <div className="bg-zinc-900/60 border border-zinc-700 rounded-xl p-4 text-center">
                        <p className={"text-2xl font-black font-mono " + (avgRoi >= 0 ? "text-yellow-400" : "text-red-400")}>
                          {avgRoi >= 0 ? "+" : ""}{avgRoi.toFixed(0)}%
                        </p>
                        <p className="text-sm text-zinc-400 mt-1 font-medium">Average ROI</p>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Empty state */}
            {sorted.length === 0 && (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">👀</div>
                <p className="text-zinc-400 font-bold text-base mb-2">{activeListName} is empty</p>
                <p className="text-zinc-600 text-sm mb-6">Search for cards and use the star icon to add them to this list</p>
                <Link href="/" className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-5 py-2.5 rounded-lg transition-colors text-sm">
                  Search Cards
                </Link>
              </div>
            )}

            {lastRefreshed && (
              <p className="text-xs text-zinc-600 font-mono">
                Prices last refreshed at {lastRefreshed.toLocaleTimeString()}
              </p>
            )}

            {/* Table */}
            {sorted.length > 0 && (
              <div className="bg-zinc-900/60 border border-zinc-700 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-700">
                        <th className="text-left text-xs text-zinc-400 font-mono px-4 py-3 w-8"></th>
                        <th className="text-left text-xs text-zinc-400 font-mono px-4 py-3">CARD</th>
                        <SortHeader label="RAW" field="raw" />
                        <SortHeader label="PSA 10" field="psa10" />
                        <th className="text-right text-xs text-zinc-400 font-mono px-4 py-3">PSA 9</th>
                        <th className="text-right text-xs text-zinc-400 font-mono px-4 py-3">TOTAL COST</th>
                        <SortHeader label="P10 PROFIT" field="profit" />
                        <SortHeader label="P10 ROI" field="roi" />
                        <th className="text-right text-xs text-zinc-400 font-mono px-4 py-3">P9 PROFIT</th>
                        <th className="text-right text-xs text-zinc-400 font-mono px-4 py-3">P9 ROI</th>
                        <SortHeader label="ADDED" field="added" />
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((item: WatchlistItem) => {
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
                                  className="text-zinc-500 hover:text-white transition-colors text-sm font-mono w-5"
                                >
                                  {isExpanded ? "▼" : "▶"}
                                </button>
                              </td>
                              <td className="px-4 py-3 cursor-pointer" onClick={() => router.push(cardUrl(item.tcgPlayerId))}>
                                <div className="flex items-center gap-3">
                                  {item.image && <img src={item.image} alt={item.name} className="w-10 rounded" />}
                                  <div>
                                    <p className="text-sm font-bold text-white">{item.name}</p>
                                    <p className="text-xs text-zinc-500">{item.set} · {item.rarity} · #{item.number}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-mono text-zinc-300">
                                {item.rawPrice > 0 ? "$" + item.rawPrice.toFixed(2) : "N/A"}
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-mono text-yellow-400">
                                {item.psa10Price > 0 ? "$" + item.psa10Price.toFixed(2) : "N/A"}
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-mono text-blue-400">
                                {hasPsa9 ? "$" + item.psa9Price.toFixed(2) : "N/A"}
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-mono text-zinc-400">
                                ${r10.totalCosts.toFixed(2)}
                              </td>
                              <td className={"px-4 py-3 text-right text-sm font-mono font-bold " + roi10Color}>
                                {item.psa10Price > 0 ? (r10.profit >= 0 ? "+" : "") + "$" + r10.profit.toFixed(2) : "N/A"}
                              </td>
                              <td className={"px-4 py-3 text-right text-sm font-mono font-bold " + roi10Color}>
                                {item.psa10Price > 0 ? (r10.roi >= 0 ? "+" : "") + r10.roi.toFixed(0) + "%" : "N/A"}
                              </td>
                              <td className={"px-4 py-3 text-right text-sm font-mono font-bold " + (hasPsa9 ? roi9Color : "text-zinc-600")}>
                                {hasPsa9 ? (r9.profit >= 0 ? "+" : "") + "$" + r9.profit.toFixed(2) : "N/A"}
                              </td>
                              <td className={"px-4 py-3 text-right text-sm font-mono font-bold " + (hasPsa9 ? roi9Color : "text-zinc-600")}>
                                {hasPsa9 ? (r9.roi >= 0 ? "+" : "") + r9.roi.toFixed(0) + "%" : "N/A"}
                              </td>
                              <td className="px-4 py-3 text-right text-xs font-mono text-zinc-500">
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

                            {isExpanded && (
                              <tr key={item.tcgPlayerId + "-expanded"} className="border-b border-zinc-800">
                                <td colSpan={12} className="px-4 py-4 bg-zinc-900/40">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {item.psa10Price > 0 && (
                                      <div className="bg-yellow-400/5 border border-yellow-400/10 rounded-xl p-4 space-y-2">
                                        <div className="flex justify-between items-center">
                                          <p className="text-sm font-black text-yellow-400">PSA 10 — Gem Mint</p>
                                          <p className="text-lg font-black text-yellow-400 font-mono">${item.psa10Price.toFixed(2)}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                          <div className="bg-zinc-800/40 rounded-lg p-2"><p className="text-zinc-500">Total cost</p><p className="text-white font-bold">${r10.totalCosts.toFixed(2)}</p></div>
                                          <div className="bg-zinc-800/40 rounded-lg p-2"><p className="text-zinc-500">Proceeds</p><p className="text-white font-bold">${r10.saleProceeds.toFixed(2)}</p></div>
                                          <div className="bg-zinc-800/40 rounded-lg p-2"><p className="text-zinc-500">Profit</p><p className={"font-bold " + (r10.profit >= 0 ? "text-emerald-400" : "text-red-400")}>{r10.profit >= 0 ? "+" : ""}${r10.profit.toFixed(2)}</p></div>
                                          <div className="bg-zinc-800/40 rounded-lg p-2"><p className="text-zinc-500">ROI</p><p className={"font-bold " + (r10.roi >= 0 ? "text-emerald-400" : "text-red-400")}>{r10.roi >= 0 ? "+" : ""}{r10.roi.toFixed(0)}%</p></div>
                                        </div>
                                        <p className="text-xs font-mono text-zinc-500">Break-even: ${r10.breakEven.toFixed(2)}</p>
                                      </div>
                                    )}

                                    {hasPsa9 && (
                                      <div className="bg-blue-400/5 border border-blue-400/10 rounded-xl p-4 space-y-2">
                                        <div className="flex justify-between items-center">
                                          <p className="text-sm font-black text-blue-400">PSA 9 — Mint</p>
                                          <p className="text-lg font-black text-blue-400 font-mono">${item.psa9Price.toFixed(2)}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                          <div className="bg-zinc-800/40 rounded-lg p-2"><p className="text-zinc-500">Total cost</p><p className="text-white font-bold">${r9.totalCosts.toFixed(2)}</p></div>
                                          <div className="bg-zinc-800/40 rounded-lg p-2"><p className="text-zinc-500">Proceeds</p><p className="text-white font-bold">${r9.saleProceeds.toFixed(2)}</p></div>
                                          <div className="bg-zinc-800/40 rounded-lg p-2"><p className="text-zinc-500">Profit</p><p className={"font-bold " + (r9.profit >= 0 ? "text-emerald-400" : "text-red-400")}>{r9.profit >= 0 ? "+" : ""}${r9.profit.toFixed(2)}</p></div>
                                          <div className="bg-zinc-800/40 rounded-lg p-2"><p className="text-zinc-500">ROI</p><p className={"font-bold " + (r9.roi >= 0 ? "text-emerald-400" : "text-red-400")}>{r9.roi >= 0 ? "+" : ""}{r9.roi.toFixed(0)}%</p></div>
                                        </div>
                                        <p className="text-xs font-mono text-zinc-500">Break-even: ${r9.breakEven.toFixed(2)}</p>
                                      </div>
                                    )}
                                  </div>

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
                                              ? "Neither grade is profitable at current prices"
                                              : !bothProfitable && r10.profit > 0
                                              ? "Only profitable if you hit PSA 10 — PSA 9 is a loss"
                                              : !bothProfitable && r9.profit > 0
                                              ? "Even a PSA 9 is profitable on this card"
                                              : diff > 20
                                              ? "PSA 10 worth chasing — $" + diff.toFixed(2) + " more than a 9"
                                              : "PSA 9 nearly as good — only $" + diff.toFixed(2) + " less than a 10"}
                                          </p>
                                        );
                                      })()}
                                    </div>
                                  )}

                                  <button
                                    onClick={() => router.push(cardUrl(item.tcgPlayerId))}
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
                <div className="px-4 py-3 border-t border-zinc-700 flex items-center justify-between">
                  <span className="text-sm text-zinc-400 font-medium">
                    {sorted.length} cards · click ▶ to expand
                    {lastRefreshed && " · refreshed " + lastRefreshed.toLocaleTimeString()}
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
        )}
      </div>
    </main>
  );
}