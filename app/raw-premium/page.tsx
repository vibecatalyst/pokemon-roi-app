"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CardData } from "@/lib/types";
import { mapApiCard } from "@/lib/api";
import { useWatchlist } from "@/lib/watchlist-context";
import WatchlistPicker from "@/components/WatchlistPicker";
import Link from "next/link";

function calcGap(card: CardData) {
  const psa9Price = card.psa9Price ?? 0;
  const gap = card.rawPrice - psa9Price;
  const gapPct = psa9Price > 0 ? (gap / psa9Price) * 100 : 0;
  return { psa9Price, gap, gapPct };
}

type EnrichedCard = CardData & { psa9Price: number; gap: number; gapPct: number };

const POS_INF = 999999;

function RawPremiumInner() {
  const { isWatched, removeItem } = useWatchlist();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sets, setSets] = useState<{ name: string; id: string }[]>([]);
  const [selectedSet, setSelectedSet] = useState(searchParams.get("set") ?? "");
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [setsLoading, setSetsLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState<"gap" | "gapPct" | "raw">(
    (searchParams.get("sort") as "gap" | "gapPct" | "raw") ?? "gap"
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">((searchParams.get("dir") as "asc" | "desc") ?? "desc");
  const [minRaw, setMinRaw] = useState(parseFloat(searchParams.get("min") ?? "1") || 1);
  const [maxRaw, setMaxRaw] = useState(parseFloat(searchParams.get("max") ?? "") || POS_INF);
  const [pickerCard, setPickerCard] = useState<EnrichedCard | null>(null);

  function updateUrl(params: Record<string, string>) {
    const current = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([k, v]) => {
      if (v) current.set(k, v);
      else current.delete(k);
    });
    router.replace("/raw-premium?" + current.toString(), { scroll: false });
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

  function handleSortByChange(sort: typeof sortBy) {
    setSortBy(sort);
    updateUrl({ sort });
  }

  function handleSortDirChange() {
    const next = sortDir === "desc" ? "asc" : "desc";
    setSortDir(next);
    updateUrl({ dir: next });
  }

  async function toggleWatch(e: React.MouseEvent, card: EnrichedCard) {
    e.stopPropagation();
    if (isWatched(card.tcgPlayerId)) {
      await removeItem(card.tcgPlayerId);
    } else {
      setPickerCard(card);
    }
  }

  const filtered: EnrichedCard[] = useMemo(() => {
    return cards
      .map((c) => ({ ...c, ...calcGap(c) }))
      .filter((c) => c.psa9Price > 0 && c.gap > 0)
      .filter((c) => c.rawPrice >= minRaw && c.rawPrice <= maxRaw)
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === "gap") diff = b.gap - a.gap;
        else if (sortBy === "gapPct") diff = b.gapPct - a.gapPct;
        else diff = b.rawPrice - a.rawPrice;
        return sortDir === "desc" ? diff : -diff;
      });
  }, [cards, sortBy, sortDir, minRaw, maxRaw]);

  function exportToCSV() {
    const headers = ["Name", "Set", "Rarity", "Number", "Raw Price", "PSA 9 Price", "Gap $", "Gap %", "Image URL"];
    const rows = filtered.map((card) => [
      card.name, card.set, card.rarity, card.number,
      card.rawPrice.toFixed(2), card.psa9Price.toFixed(2),
      card.gap.toFixed(2), card.gapPct.toFixed(1) + "%",
      card.image ?? "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = selectedSet + "-raw-premium.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function cardUrl(tcgPlayerId: string) {
    return "/card/" + tcgPlayerId + "?from=" + encodeURIComponent("/raw-premium?" + searchParams.toString());
  }

  function SortTh({ label, field }: { label: string; field: typeof sortBy }) {
    const active = sortBy === field;
    return (
      <th
        onClick={() => {
          if (sortBy === field) handleSortDirChange();
          else { handleSortByChange(field); setSortDir("desc"); }
        }}
        className={"text-right text-xs font-mono px-4 py-3 cursor-pointer transition-colors select-none " + (active ? "text-red-400" : "text-zinc-500 hover:text-white")}
      >
        {label} {active ? (sortDir === "desc" ? "↓" : "↑") : ""}
      </th>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl" />
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
            psa9Price: pickerCard.psa9Price,
            rarity: pickerCard.rarity,
            number: pickerCard.number,
            addedAt: new Date().toISOString(),
          }}
          onClose={() => setPickerCard(null)}
        />
      )}

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-12">

        <div className="mb-8">
          <Link href="/" className="text-zinc-500 hover:text-white text-sm transition-colors">← Back to Home</Link>
          <h1 className="text-4xl font-black mt-2">
            <span className="text-white">RAW </span>
            <span className="text-red-400">PREMIUM</span>
            <span className="text-white"> CARDS</span>
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Cards where the raw (ungraded) price is higher than PSA 9 — grading isn&apos;t worth it, or the raw market is pricing in something a PSA 9 slab doesn&apos;t capture.</p>
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
            <label className="block text-xs text-zinc-500 font-mono mb-1">SORT BY</label>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => handleSortByChange(e.target.value as typeof sortBy)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none"
              >
                <option value="gap">Gap $</option>
                <option value="gapPct">Gap %</option>
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
                onChange={(e) => { const v = parseFloat(e.target.value) || 0; setMinRaw(v); updateUrl({ min: String(v) }); }}
                className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none font-mono"
              />
              <span className="text-zinc-600 text-sm font-mono">—</span>
              <input type="number" value={maxRaw === POS_INF ? "" : maxRaw} min={0} placeholder="Max"
                onChange={(e) => { const v = e.target.value === "" ? POS_INF : parseFloat(e.target.value) || POS_INF; setMaxRaw(v); updateUrl({ max: v === POS_INF ? "" : String(v) }); }}
                className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none font-mono"
              />
            </div>
          </div>

          <button
            onClick={exportToCSV}
            disabled={filtered.length === 0}
            className="bg-red-400 hover:bg-red-300 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-bold px-5 py-2.5 rounded-lg transition-colors text-sm whitespace-nowrap"
          >
            Export CSV
          </button>
        </div>

        {loading && (
          <div className="text-center py-20">
            <div className="text-4xl mb-4 animate-spin inline-block">⚡</div>
            <p className="text-zinc-500 font-mono text-sm">Fetching all cards in set...</p>
          </div>
        )}

        {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-4">{error}</div>}

        {!loading && !selectedSet && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">⚠️</div>
            <p className="text-zinc-600 font-mono text-sm mb-2">Select a set above to find raw-premium cards</p>
            <p className="text-zinc-700 text-xs">Cards are loaded on demand to conserve API credits</p>
          </div>
        )}

        {!loading && selectedSet && cards.length > 0 && filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-zinc-500 font-mono text-sm">No cards in this set have a raw price above PSA 9.</p>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800">
              <span className="text-xs text-zinc-600 font-mono">{filtered.length} card{filtered.length !== 1 ? "s" : ""} where raw &gt; PSA 9</span>
            </div>
            <div className="overflow-x-auto">
              <div className="max-h-[72vh] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 z-10 bg-[#0d0d14] border-b border-zinc-800">
                    <tr>
                      <th className="text-left text-xs text-zinc-500 font-mono px-2 py-3 w-8"></th>
                      <th className="text-left text-xs text-zinc-500 font-mono px-4 py-3">CARD</th>
                      <SortTh label="RAW" field="raw" />
                      <th className="text-right text-xs text-zinc-500 font-mono px-4 py-3">PSA 9</th>
                      <SortTh label="GAP $" field="gap" />
                      <SortTh label="GAP %" field="gapPct" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((card, idx) => {
                      const watched = isWatched(card.tcgPlayerId);
                      return (
                        <tr
                          key={card.id}
                          onClick={() => router.push(cardUrl(card.tcgPlayerId))}
                          className={"border-b border-zinc-800/50 transition-colors cursor-pointer " +
                            (idx % 2 === 0 ? "bg-transparent hover:bg-zinc-800/50" : "bg-zinc-800/20 hover:bg-zinc-800/50")}
                        >
                          <td className="px-2 py-3" onClick={(e) => toggleWatch(e, card)}>
                            <button
                              className={"w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold transition-all shadow " +
                                (watched ? "bg-blue-500 text-white hover:bg-red-500" : "bg-zinc-800 text-zinc-500 hover:bg-blue-500 hover:text-white border border-zinc-700")}
                              title={watched ? "Remove from watchlist" : "Add to watchlist"}
                            >
                              {watched ? "★" : "☆"}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {card.image && <img src={card.image} alt={card.name} className="w-10 rounded" />}
                              <div>
                                <p className="text-sm font-semibold text-white">{card.name}</p>
                                <p className="text-xs text-zinc-600">{card.rarity} · #{card.number}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-mono text-white font-bold">${card.rawPrice.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right text-sm font-mono text-blue-400">${card.psa9Price.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right text-sm font-mono font-bold text-red-400">+${card.gap.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right text-sm font-mono font-bold text-red-400">+{card.gapPct.toFixed(0)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function RawPremium() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-zinc-500 font-mono text-sm">Loading...</div>
      </div>
    }>
      <RawPremiumInner />
    </Suspense>
  );
}
