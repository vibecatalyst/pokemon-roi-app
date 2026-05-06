"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { mapApiCard } from "@/lib/api";
import { CardData } from "@/lib/types";
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from "@/lib/watchlist";
import Link from "next/link";

interface TrendingCard extends CardData {
  psa10Trend: string;
  psa10Volume7Day: number;
  psa10MarketPrice7Day: number;
  psa9Trend: string;
  psa9SmartPrice: number;
  salesVelocityDaily: number;
  salesVelocityWeekly: number;
}

function mapTrendingCard(c: Record<string, unknown>): TrendingCard {
  const base = mapApiCard(c);
  const ebay = (c.ebay as Record<string, unknown>) ?? {};
  const salesByGrade = (ebay.salesByGrade as Record<string, Record<string, unknown>>) ?? {};
  const salesVelocity = (ebay.salesVelocity as Record<string, number>) ?? {};
  const psa10 = salesByGrade.psa10 ?? {};
  const psa9 = salesByGrade.psa9 ?? {};
  const psa9Smart = (psa9.smartMarketPrice as Record<string, number>) ?? {};
  return {
    ...base,
    psa10Trend: String(psa10.marketTrend ?? "unknown"),
    psa10Volume7Day: (psa10.dailyVolume7Day as number) ?? 0,
    psa10MarketPrice7Day: (psa10.marketPrice7Day as number) ?? 0,
    psa9Trend: String(psa9.marketTrend ?? "unknown"),
    psa9SmartPrice: psa9Smart.price ?? 0,
    salesVelocityDaily: salesVelocity.dailyAverage ?? 0,
    salesVelocityWeekly: salesVelocity.weeklyAverage ?? 0,
  };
}

const TREND_CONFIG = {
  up: { label: "↑ Rising", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  down: { label: "↓ Falling", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  stable: { label: "→ Stable", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
  unknown: { label: "— No data", color: "text-zinc-600", bg: "bg-zinc-800/30 border-zinc-700/30" },
};

export default function Trending() {
  const [sets, setSets] = useState<{ name: string; id: string }[]>([]);
  const [selectedSet, setSelectedSet] = useState("");
  const [cards, setCards] = useState<TrendingCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [setsLoading, setSetsLoading] = useState(true);
  const [error, setError] = useState("");
  const [trendFilter, setTrendFilter] = useState<"all" | "up" | "down" | "stable">("up");
  const [sortBy, setSortBy] = useState<"volume" | "velocity" | "price">("volume");
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
  const router = useRouter();

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

  async function fetchCards(setName: string) {
    setLoading(true);
    setError("");
    setCards([]);
    try {
      const res = await fetch("/api/trending?set=" + encodeURIComponent(setName));
      const json = await res.json();
      if (json.error) { setError(json.message ?? json.error); return; }
      const raw = json.data ?? [];
      const mapped = raw.map(mapTrendingCard);
      setCards(mapped);
      const watched = new Set<string>();
      mapped.forEach((c: TrendingCard) => {
        if (isInWatchlist(c.tcgPlayerId)) watched.add(c.tcgPlayerId);
      });
      setWatchedIds(watched);
    } catch {
      setError("Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  }

  function toggleWatch(e: React.MouseEvent, card: TrendingCard) {
    e.stopPropagation();
    if (watchedIds.has(card.tcgPlayerId)) {
      removeFromWatchlist(card.tcgPlayerId);
      setWatchedIds(prev => { const next = new Set(prev); next.delete(card.tcgPlayerId); return next; });
    } else {
      addToWatchlist({
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
      setWatchedIds(prev => new Set(prev).add(card.tcgPlayerId));
    }
  }

  const filtered = useMemo(() => {
    return cards
      .filter((c) => c.psa10Price > 0)
      .filter((c) => trendFilter === "all" || c.psa10Trend === trendFilter)
      .sort((a, b) => {
        if (sortBy === "volume") return b.psa10Volume7Day - a.psa10Volume7Day;
        if (sortBy === "velocity") return b.salesVelocityWeekly - a.salesVelocityWeekly;
        return b.psa10MarketPrice7Day - a.psa10MarketPrice7Day;
      });
  }, [cards, trendFilter, sortBy]);

  const stats = useMemo(() => {
    const withTrend = cards.filter(c => c.psa10Price > 0);
    return {
      up: withTrend.filter(c => c.psa10Trend === "up").length,
      down: withTrend.filter(c => c.psa10Trend === "down").length,
      stable: withTrend.filter(c => c.psa10Trend === "stable").length,
      total: withTrend.length,
    };
  }, [cards]);

  function cardUrl(tcgPlayerId: string) {
    return "/card/" + tcgPlayerId + "?from=" + encodeURIComponent("/trending");
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-emerald-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-12">

        <div className="mb-8">
          <Link href="/" className="text-zinc-500 hover:text-white text-sm transition-colors">← Back to Home</Link>
          <h1 className="text-4xl font-black mt-2">
            <span className="text-white">TRENDING </span>
            <span className="text-emerald-400">CARDS</span>
          </h1>
          <p className="text-zinc-500 text-sm mt-1">PSA 10 price momentum and sales velocity — click card to view details · ☆ to watchlist</p>
        </div>

        {/* Controls */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 mb-6 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-48">
            <label className="block text-xs text-zinc-500 font-mono mb-1">SELECT SET</label>
            <select
              value={selectedSet}
              onChange={(e) => { setSelectedSet(e.target.value); fetchCards(e.target.value); }}
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
              {(["all", "up", "stable", "down"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTrendFilter(t)}
                  className={"px-3 py-2.5 rounded-lg text-sm font-mono border transition-colors " +
                    (trendFilter === t
                      ? t === "up" ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                        : t === "down" ? "bg-red-500/20 border-red-500/40 text-red-400"
                        : t === "stable" ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-400"
                        : "bg-zinc-700 border-zinc-600 text-white"
                      : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-white")}
                >
                  {t === "all" ? "All" : t === "up" ? "↑ Rising" : t === "down" ? "↓ Falling" : "→ Stable"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 font-mono mb-1">SORT BY</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "volume" | "velocity" | "price")}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none"
            >
              <option value="volume">Daily Volume</option>
              <option value="velocity">Weekly Sales</option>
              <option value="price">7-Day Price</option>
            </select>
          </div>
        </div>

        {/* Stats bar */}
        {cards.length > 0 && (
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { label: "Total with PSA 10", value: stats.total, color: "text-white" },
              { label: "↑ Rising", value: stats.up, color: "text-emerald-400" },
              { label: "→ Stable", value: stats.stable, color: "text-yellow-400" },
              { label: "↓ Falling", value: stats.down, color: "text-red-400" },
            ].map((s) => (
              <div key={s.label} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-center">
                <p className={"text-2xl font-black font-mono " + s.color}>{s.value}</p>
                <p className="text-xs text-zinc-600 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div className="text-center py-20">
            <div className="text-4xl mb-4 animate-spin inline-block">📈</div>
            <p className="text-zinc-500 font-mono text-sm">Fetching price trends...</p>
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
            <p className="text-zinc-500 font-mono text-sm">No cards match this trend filter.</p>
          </div>
        )}

        {/* Cards grid */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((card) => {
              const trend = TREND_CONFIG[card.psa10Trend as keyof typeof TREND_CONFIG] ?? TREND_CONFIG.unknown;
              const isWatched = watchedIds.has(card.tcgPlayerId);
              return (
                <div
                  key={card.id}
                  onClick={() => router.push(cardUrl(card.tcgPlayerId))}
                  className="bg-zinc-900/60 border border-zinc-800 hover:border-zinc-600 rounded-2xl overflow-hidden transition-all cursor-pointer hover:scale-[1.02] hover:bg-zinc-800/60"
                >
                  <div className="relative">
                    {card.image && (
                      <img src={card.image} alt={card.name} className="w-full object-cover" />
                    )}
                    <div className={"absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-full border " + trend.bg + " " + trend.color}>
                      {trend.label}
                    </div>
                    {/* Watchlist star */}
                    <button
                      onClick={(e) => toggleWatch(e, card)}
                      className={"absolute top-2 left-2 text-xl transition-colors px-1 " + (isWatched ? "text-blue-400 hover:text-red-400" : "text-zinc-600 hover:text-blue-400")}
                      title={isWatched ? "Remove from watchlist" : "Add to watchlist"}
                    >
                      {isWatched ? "★" : "☆"}
                    </button>
                  </div>

                  <div className="p-4 space-y-3">
                    <div>
                      <p className="font-bold text-white text-sm leading-tight">{card.name}</p>
                      <p className="text-xs text-zinc-600 mt-0.5">{card.rarity} · #{card.number}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-zinc-800/50 rounded-lg p-2">
                        <p className="text-xs text-zinc-600 font-mono">Raw</p>
                        <p className="text-sm font-black text-white font-mono">${card.rawPrice.toFixed(2)}</p>
                      </div>
                      <div className="bg-yellow-400/5 border border-yellow-400/10 rounded-lg p-2">
                        <p className="text-xs text-yellow-400/60 font-mono">PSA 10</p>
                        <p className="text-sm font-black text-yellow-400 font-mono">${card.psa10Price.toFixed(2)}</p>
                      </div>
                    </div>

                    {card.psa10MarketPrice7Day > 0 && (
                      <div className="bg-zinc-800/30 rounded-lg px-3 py-2 flex justify-between items-center">
                        <span className="text-xs text-zinc-500 font-mono">7-day market</span>
                        <span className="text-xs font-bold font-mono text-white">${card.psa10MarketPrice7Day.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <div className="text-center">
                        <p className="text-xs text-zinc-600 font-mono">Daily</p>
                        <p className="text-sm font-black text-white font-mono">{card.salesVelocityDaily.toFixed(1)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-zinc-600 font-mono">Weekly</p>
                        <p className="text-sm font-black text-white font-mono">{card.salesVelocityWeekly.toFixed(1)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-zinc-600 font-mono">7d vol</p>
                        <p className={"text-sm font-black font-mono " + (card.psa10Volume7Day > 0 ? "text-emerald-400" : "text-zinc-600")}>
                          {card.psa10Volume7Day > 0 ? card.psa10Volume7Day.toFixed(2) : "—"}
                        </p>
                      </div>
                    </div>

                    <div className="text-center pt-1">
                      <span className="text-xs text-zinc-700 font-mono">Click to view full ROI →</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}