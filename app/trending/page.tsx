"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { mapApiCard } from "@/lib/api";
import { CardData } from "@/lib/types";
import { useWatchlist } from "@/lib/watchlist-context";
import Link from "next/link";

interface TrendingCard extends CardData {
  trend: "up" | "down" | "stable";
  trendPct: number;
}

const NEG_INF = -999999;
const POS_INF = 999999;

function TrendingInner() {
  const { addItem, removeItem, isWatched } = useWatchlist();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sets, setSets] = useState<{ name: string; id: string }[]>([]);
  const [selectedSet, setSelectedSet] = useState(searchParams.get("set") ?? "");
  const [cards, setCards] = useState<TrendingCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [setsLoading, setSetsLoading] = useState(true);
  const [error, setError] = useState("");
  const [trendFilter, setTrendFilter] = useState<"all" | "up" | "down" | "stable">(
    (searchParams.get("trend") as "all" | "up" | "down" | "stable") ?? "all"
  );
  const [sortBy, setSortBy] = useState<"trend" | "psa10" | "raw" | "name">(
    (searchParams.get("sort") as "trend" | "psa10" | "raw" | "name") ?? "trend"
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">((searchParams.get("dir") as "asc" | "desc") ?? "desc");
  const [minRaw, setMinRaw] = useState(parseFloat(searchParams.get("min") ?? "") || NEG_INF);
  const [maxRaw, setMaxRaw] = useState(parseFloat(searchParams.get("max") ?? "") || POS_INF);

  function updateUrl(params: Record<string, string>) {
    const current = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([k, v]) => {
      if (v) current.set(k, v);
      else current.delete(k);
    });
    router.replace("/trending?" + current.toString(), { scroll: false });
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
      fetchTrending(fromUrl);
    }
  }, []);

  async function fetchTrending(setName: string) {
    setLoading(true);
    setError("");
    setCards([]);
    try {
      const res = await fetch("/api/trending?set=" + encodeURIComponent(setName));
      const json = await res.json();
      if (json.error) { setError(json.message ?? json.error); return; }
      const raw = json.data ?? [];
      const mapped = raw.map((item: Record<string, unknown>) => {
        const card = mapApiCard(item);
        const ebay = (item.ebay as Record<string, unknown>) ?? {};
        const salesByGrade = (ebay.salesByGrade as Record<string, Record<string, unknown>>) ?? {};
        const psa10 = salesByGrade.psa10 ?? {};
        const trend = String(psa10.marketTrend ?? "stable") as "up" | "down" | "stable";
        const trendPct = Number(psa10.marketTrendPercent ?? 0);
        return { ...card, trend, trendPct };
      });
      setCards(mapped);
    } catch {
      setError("Failed to fetch trending data.");
    } finally {
      setLoading(false);
    }
  }

  function handleSetChange(setName: string) {
    setSelectedSet(setName);
    updateUrl({ set: setName });
    if (setName) fetchTrending(setName);
  }

  async function toggleWatch(e: React.MouseEvent, card: TrendingCard) {
    e.stopPropagation();
    if (isWatched(card.tcgPlayerId)) {
      await removeItem(card.tcgPlayerId);
    } else {
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
      });
    }
  }

  const filtered = useMemo(() => {
    return cards
      .filter(c => trendFilter === "all" || c.trend === trendFilter)
      .filter(c => c.rawPrice >= minRaw && c.rawPrice <= maxRaw)
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === "trend") diff = b.trendPct - a.trendPct;
        else if (sortBy === "psa10") diff = b.psa10Price - a.psa10Price;
        else if (sortBy === "raw") diff = b.rawPrice - a.rawPrice;
        else diff = a.name.localeCompare(b.name);
        return sortDir === "desc" ? diff : -diff;
      });
  }, [cards, trendFilter, sortBy, sortDir, minRaw, maxRaw]);

  function cardUrl(tcgPlayerId: string) {
    return "/card/" + tcgPlayerId + "?from=" + encodeURIComponent("/trending?" + searchParams.toString());
  }

  function trendIcon(trend: string) {
    if (trend === "up") return "📈";
    if (trend === "down") return "📉";
    return "➡️";
  }

  function trendColor(trend: string) {
    if (trend === "up") return "text-emerald-400";
    if (trend === "down") return "text-red-400";
    return "text-zinc-400";
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-12">

        <div className="mb-8">
          <Link href="/" className="text-zinc-500 hover:text-white text-sm transition-colors">← Back to Home</Link>
          <h1 className="text-4xl font-black mt-2">
            <span className="text-white">TRENDING </span>
            <span className="text-emerald-400">CARDS</span>
          </h1>
          <p className="text-zinc-500 text-sm mt-1">PSA 10 price movement by set — click card for full ROI · ☆ to watchlist</p>
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
            <label className="block text-xs text-zinc-500 font-mono mb-1">TREND</label>
            <div className="flex gap-2">
              {(["all", "up", "down", "stable"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTrendFilter(t); updateUrl({ trend: t === "all" ? "" : t }); }}
                  className={"px-3 py-2.5 rounded-lg border text-sm font-mono transition-colors " +
                    (trendFilter === t
                      ? "bg-zinc-700 border-zinc-500 text-white"
                      : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-white")}
                >
                  {t === "all" ? "All" : t === "up" ? "📈 Up" : t === "down" ? "📉 Down" : "➡️ Stable"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 font-mono mb-1">SORT BY</label>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value as typeof sortBy); updateUrl({ sort: e.target.value }); }}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none"
              >
                <option value="trend">Trend %</option>
                <option value="psa10">PSA 10 Price</option>
                <option value="raw">Raw Price</option>
                <option value="name">Name</option>
              </select>
              <button
                onClick={() => {
                  const next = sortDir === "desc" ? "asc" : "desc";
                  setSortDir(next);
                  updateUrl({ dir: next });
                }}
                className="bg-zinc-800 border border-zinc-700 hover:border-zinc-500 rounded-lg px-3 py-2.5 text-white text-sm transition-colors font-mono"
              >
                {sortDir === "desc" ? "↓ Desc" : "↑ Asc"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 font-mono mb-1">RAW PRICE ($)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={minRaw === NEG_INF ? "" : minRaw}
                min={0}
                placeholder="Min"
                onChange={(e) => { const v = e.target.value === "" ? NEG_INF : parseFloat(e.target.value) || 0; setMinRaw(v); updateUrl({ min: v === NEG_INF ? "" : String(v) }); }}
                className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none font-mono"
              />
              <span className="text-zinc-600 text-sm font-mono">—</span>
              <input
                type="number"
                value={maxRaw === POS_INF ? "" : maxRaw}
                min={0}
                placeholder="Max"
                onChange={(e) => { const v = e.target.value === "" ? POS_INF : parseFloat(e.target.value) || POS_INF; setMaxRaw(v); updateUrl({ max: v === POS_INF ? "" : String(v) }); }}
                className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {loading && (
          <div className="text-center py-20">
            <div className="text-4xl mb-4 animate-spin inline-block">📈</div>
            <p className="text-zinc-500 font-mono text-sm">Fetching trending data...</p>
          </div>
        )}

        {error && (
          <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-4">{error}</div>
        )}

        {!loading && !selectedSet && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📈</div>
            <p className="text-zinc-600 font-mono text-sm">Select a set to see trending cards</p>
          </div>
        )}

        {!loading && selectedSet && filtered.length === 0 && cards.length > 0 && (
          <div className="text-center py-20">
            <p className="text-zinc-500 font-mono text-sm">No cards match your current filters.</p>
          </div>
        )}

        {filtered.length > 0 && (
          <div>
            <p className="text-xs text-zinc-600 font-mono mb-4">
              {filtered.length} cards · {cards.filter(c => c.trend === "up").length} rising · {cards.filter(c => c.trend === "down").length} falling
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filtered.map((card) => {
                const watched = isWatched(card.tcgPlayerId);
                return (
                  <div
                    key={card.id}
                    onClick={() => router.push(cardUrl(card.tcgPlayerId))}
                    className="group relative bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 rounded-xl p-3 cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    {/* Watchlist button */}
                    <button
                      onClick={(e) => toggleWatch(e, card)}
                      className={"absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold transition-all z-10 " +
                        (watched
                          ? "bg-blue-500 text-white hover:bg-red-500"
                          : "bg-zinc-800/80 text-zinc-500 hover:bg-blue-500 hover:text-white border border-zinc-700")}
                    >
                      {watched ? "★" : "☆"}
                    </button>

                    {card.image && (
                      <img
                        src={card.image}
                        alt={card.name}
                        className="w-full rounded-lg mb-2 group-hover:scale-[1.03] transition-transform"
                      />
                    )}

                    <p className="text-sm font-semibold text-white truncate pr-8">{card.name}</p>
                    <p className="text-xs text-zinc-600 truncate">{card.rarity} · #{card.number}</p>

                    <div className="flex items-center justify-between mt-2">
                      <div>
                        <p className="text-xs text-zinc-600 font-mono">PSA 10</p>
                        <p className="text-sm font-black text-yellow-400 font-mono">
                          {card.psa10Price > 0 ? "$" + card.psa10Price.toFixed(2) : "N/A"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-zinc-600 font-mono">Trend</p>
                        <p className={"text-sm font-black font-mono " + trendColor(card.trend)}>
                          {trendIcon(card.trend)} {card.trendPct !== 0 ? (card.trendPct > 0 ? "+" : "") + card.trendPct.toFixed(1) + "%" : card.trend}
                        </p>
                      </div>
                    </div>

                    {card.rawPrice > 0 && (
                      <p className="text-xs text-zinc-600 font-mono mt-1">Raw: ${card.rawPrice.toFixed(2)}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function Trending() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-zinc-500 font-mono text-sm">Loading...</div>
      </div>
    }>
      <TrendingInner />
    </Suspense>
  );
}