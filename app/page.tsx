"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SearchBar from "@/components/SearchBar";
import { CardData } from "@/lib/types";
import { searchCards } from "@/lib/api";
import { useWatchlist } from "@/lib/watchlist-context";
import { getSubmissions, Submission } from "@/lib/submissions";
import { useFees } from "@/lib/fees-context";
import Link from "next/link";

function calcROI(price: number, rawPrice: number, fees: ReturnType<typeof useFees>["fees"]) {
  const totalCosts = rawPrice * (1 + fees.buyingFeePercent / 100) + fees.gradingFee + fees.shippingToGrader + fees.shippingBack;
  const saleProceeds = price * (1 - fees.ebayFeePercent / 100);
  const profit = saleProceeds - totalCosts;
  const roi = totalCosts > 0 ? (profit / totalCosts) * 100 : 0;
  return { profit, roi, totalCosts, saleProceeds };
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-700 rounded-xl p-4">
      <p className="text-sm text-zinc-400 font-semibold mb-1">{label}</p>
      <p className={"text-2xl font-black font-mono " + (color ?? "text-white")}>{value}</p>
      {sub && <p className="text-sm text-zinc-400 mt-1">{sub}</p>}
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  preparing: "📦 Preparing",
  shipped: "🚚 Shipped",
  received: "📬 Received",
  grading: "🔍 Grading",
  graded: "⭐ Graded",
  returned: "✅ Returned",
};

function HomeInner() {
  const [results, setResults] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [mounted, setMounted] = useState(false);
  const { items: watchlist, loading: watchlistLoading, addItem, removeItem, isWatched } = useWatchlist();
  const { fees } = useFees();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    setMounted(true);
    setSubmissions(getSubmissions());

    const q = searchParams.get("q");
    if (q && q.trim()) {
      setLastQuery(q);
      setLoading(true);
      searchCards(q.trim())
        .then((cards) => { if (cards.length > 0) setResults(cards); })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, []);

  function cardUrl(tcgPlayerId: string) {
    return "/card/" + tcgPlayerId + "?from=" + encodeURIComponent("/?q=" + encodeURIComponent(lastQuery));
  }

  const watchlistStats = mounted && !watchlistLoading ? (() => {
    const profitable = watchlist.filter(i => calcROI(i.psa10Price, i.rawPrice, fees).profit > 0);
    const totalProfit = watchlist.reduce((s, i) => s + calcROI(i.psa10Price, i.rawPrice, fees).profit, 0);
    const avgRoi = watchlist.length > 0 ? watchlist.reduce((s, i) => s + calcROI(i.psa10Price, i.rawPrice, fees).roi, 0) / watchlist.length : 0;
    return { profitable, totalProfit, avgRoi };
  })() : null;

  const submissionStats = mounted ? (() => {
    const active = submissions.filter(s => s.status !== "returned");
    const returned = submissions.filter(s => s.status === "returned" && s.soldPrice);
    const totalInvested = active.reduce((s, i) => s + i.rawPrice + i.gradingFee + i.shippingCost, 0);
    const realizedProfit = returned.reduce((s, i) => {
      const proceeds = (i.soldPrice ?? 0) * (1 - fees.ebayFeePercent / 100);
      const cost = i.rawPrice + i.gradingFee + i.shippingCost;
      return s + proceeds - cost;
    }, 0);
    return { active, totalInvested, realizedProfit };
  })() : null;

  const topOpportunities = mounted && !watchlistLoading
    ? [...watchlist]
        .filter(i => i.psa10Price > 0)
        .map(i => ({ ...i, ...calcROI(i.psa10Price, i.rawPrice, fees) }))
        .sort((a, b) => b.roi - a.roi)
        .slice(0, 5)
    : [];

  const showDashboard = results.length === 0 && !loading && mounted;

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12">

        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-7xl font-black mb-3 tracking-tight">
            <span className="text-white">POKE</span>
            <span className="text-yellow-400">ROI</span>
          </h1>
          <p className="text-zinc-300 text-xl max-w-md mx-auto font-medium">
            Your Pokémon card grading command center
          </p>
        </div>

        {/* Search */}
        <SearchBar
          onResults={(cards) => setResults(cards)}
          onSelect={() => {}}
          onQueryChange={(q) => {
            setLastQuery(q);
            router.replace("/?q=" + encodeURIComponent(q), { scroll: false });
          }}
          setLoading={setLoading}
          setError={setError}
          loading={loading}
        />

        {error && (
          <div className="mt-4 text-center text-red-400 text-base bg-red-500/10 border border-red-500/20 rounded-lg p-3 font-semibold">
            {error}
          </div>
        )}

        {/* Search results */}
        {results.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-zinc-300 text-base font-semibold">{results.length} cards found — click to view ROI</p>
              <button
                onClick={() => { setResults([]); router.replace("/", { scroll: false }); }}
                className="text-sm text-zinc-400 hover:text-zinc-200 font-semibold transition-colors"
              >
                Clear ✕
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {results.map((card, idx) => {
                const watched = isWatched(card.tcgPlayerId);
                return (
                  <div
                    key={card.id + "-" + idx}
                    className="group relative bg-zinc-900/60 border border-zinc-700 hover:border-yellow-400/40 rounded-xl p-3 transition-all duration-200 hover:bg-zinc-800/60 hover:scale-[1.02]"
                  >
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (watched) {
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
                      }}
                      className={"absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-all z-10 " +
                        (watched
                          ? "bg-blue-500 text-white hover:bg-red-500"
                          : "bg-zinc-800/80 text-zinc-400 hover:bg-blue-500 hover:text-white border border-zinc-600")}
                    >
                      {watched ? "★" : "☆"}
                    </button>

                    <div onClick={() => router.push(cardUrl(card.tcgPlayerId))} className="cursor-pointer">
                      {card.image && <img src={card.image} alt={card.name} className="w-full rounded-lg mb-2" />}
                      <p className="text-sm font-bold text-white truncate pr-8">{card.name}</p>
                      <p className="text-xs text-zinc-400 truncate font-medium">{card.set}</p>
                      {card.rawPrice > 0 && <p className="text-sm text-yellow-400 mt-1 font-bold font-mono">${card.rawPrice.toFixed(2)}</p>}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-xl pointer-events-none">
                        <span className="text-sm text-white font-bold bg-yellow-400/20 border border-yellow-400/30 px-3 py-1.5 rounded-lg">
                          View ROI →
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dashboard */}
        {showDashboard && (
          <div className="mt-10 space-y-8">

            {/* Quick nav */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { href: "/leaderboard", icon: "🏆", label: "Top ROI", sub: "Best cards to grade by set" },
                { href: "/trending", icon: "📈", label: "Trending", sub: "Rising PSA 10 prices" },
                { href: "/watchlist", icon: "★", label: "Watchlist", sub: watchlistLoading ? "Loading..." : watchlist.length + " cards saved" },
                { href: "/submissions", icon: "📦", label: "Submissions", sub: (submissionStats?.active.length ?? 0) + " in progress" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="bg-zinc-900/60 border border-zinc-700 hover:border-zinc-500 rounded-xl p-4 transition-colors group"
                >
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <p className="text-base font-bold text-white group-hover:text-yellow-400 transition-colors">{item.label}</p>
                  <p className="text-sm text-zinc-400 mt-0.5 font-medium">{item.sub}</p>
                </Link>
              ))}
            </div>

            {/* Watchlist loading state */}
            {watchlistLoading && (
              <div className="text-center py-8">
                <div className="text-2xl mb-2 animate-spin inline-block">⟳</div>
                <p className="text-zinc-400 font-semibold text-base">Loading your watchlist...</p>
              </div>
            )}

            {/* Watchlist summary */}
            {!watchlistLoading && watchlist.length > 0 && watchlistStats && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-black text-white">Watchlist Summary</h2>
                  <Link href="/watchlist" className="text-sm text-zinc-400 hover:text-white font-semibold transition-colors">
                    View all {watchlist.length} cards →
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <StatCard label="Cards Watching" value={String(watchlist.length)} />
                  <StatCard
                    label="Profitable to Grade"
                    value={String(watchlistStats.profitable.length)}
                    sub={((watchlistStats.profitable.length / watchlist.length) * 100).toFixed(0) + "% of watchlist"}
                    color="text-emerald-400"
                  />
                  <StatCard
                    label="Total Potential Profit"
                    value={(watchlistStats.totalProfit >= 0 ? "+" : "") + "$" + watchlistStats.totalProfit.toFixed(0)}
                    color={watchlistStats.totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}
                  />
                  <StatCard
                    label="Average ROI"
                    value={(watchlistStats.avgRoi >= 0 ? "+" : "") + watchlistStats.avgRoi.toFixed(0) + "%"}
                    color={watchlistStats.avgRoi >= 0 ? "text-yellow-400" : "text-red-400"}
                  />
                </div>

                {topOpportunities.length > 0 && (
                  <div className="bg-zinc-900/60 border border-zinc-700 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-zinc-700">
                      <p className="text-sm text-zinc-300 font-bold uppercase tracking-widest">Top Opportunities in Watchlist</p>
                    </div>
                    <div className="divide-y divide-zinc-800/50">
                      {topOpportunities.map((card, idx) => {
                        const roiColor = card.roi > 50 ? "text-emerald-400" : card.roi > 0 ? "text-yellow-400" : "text-red-400";
                        return (
                          <div
                            key={card.tcgPlayerId}
                            onClick={() => router.push("/card/" + card.tcgPlayerId + "?from=" + encodeURIComponent("/watchlist"))}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/30 transition-colors cursor-pointer"
                          >
                            <span className="text-zinc-400 font-bold text-sm w-5">{idx + 1}</span>
                            {card.image && <img src={card.image} alt={card.name} className="w-10 rounded flex-shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <p className="text-base font-bold text-white truncate">{card.name}</p>
                              <p className="text-sm text-zinc-400 truncate font-medium">{card.set}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className={"text-base font-black font-mono " + roiColor}>
                                {card.roi >= 0 ? "+" : ""}{card.roi.toFixed(0)}%
                              </p>
                              <p className={"text-sm font-semibold font-mono " + roiColor}>
                                {card.profit >= 0 ? "+" : ""}${card.profit.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Submissions summary */}
            {submissions.length > 0 && submissionStats && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-black text-white">Submissions</h2>
                  <Link href="/submissions" className="text-sm text-zinc-400 hover:text-white font-semibold transition-colors">
                    View all →
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <StatCard label="Total Submitted" value={String(submissions.length)} />
                  <StatCard label="In Progress" value={String(submissionStats.active.length)} color="text-orange-400" />
                  <StatCard label="Capital at Risk" value={"$" + submissionStats.totalInvested.toFixed(0)} color="text-yellow-400" />
                  <StatCard
                    label="Realized Profit"
                    value={(submissionStats.realizedProfit >= 0 ? "+" : "") + "$" + submissionStats.realizedProfit.toFixed(0)}
                    color={submissionStats.realizedProfit >= 0 ? "text-emerald-400" : "text-red-400"}
                  />
                </div>

                {submissionStats.active.length > 0 && (
                  <div className="bg-zinc-900/60 border border-zinc-700 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-zinc-700">
                      <p className="text-sm text-zinc-300 font-bold uppercase tracking-widest">Active Submissions</p>
                    </div>
                    <div className="divide-y divide-zinc-800/50">
                      {submissionStats.active.slice(0, 5).map((sub) => (
                        <div
                          key={sub.id}
                          onClick={() => router.push("/submissions")}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/30 transition-colors cursor-pointer"
                        >
                          {sub.image && <img src={sub.image} alt={sub.name} className="w-10 rounded flex-shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-bold text-white truncate">{sub.name}</p>
                            <p className="text-sm text-zinc-400 truncate font-medium">{sub.set}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-semibold text-zinc-300">{STATUS_LABELS[sub.status]}</p>
                            <p className="text-sm font-mono text-zinc-400">${(sub.rawPrice + sub.gradingFee + sub.shippingCost).toFixed(2)} invested</p>
                          </div>
                        </div>
                      ))}
                      {submissionStats.active.length > 5 && (
                        <div className="px-4 py-3 text-center">
                          <Link href="/submissions" className="text-sm text-zinc-400 hover:text-white font-semibold transition-colors">
                            +{submissionStats.active.length - 5} more →
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Empty state */}
            {!watchlistLoading && watchlist.length === 0 && submissions.length === 0 && (
              <div className="text-center py-10">
                <div className="text-5xl mb-4">⚡</div>
                <p className="text-zinc-300 font-bold text-lg mb-2">Welcome to PokeROI</p>
                <p className="text-zinc-500 text-base mb-6 max-w-sm mx-auto">
                  Search for a card above to get started, or browse the Top ROI leaderboard to find grading opportunities
                </p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <Link href="/leaderboard" className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-5 py-2.5 rounded-lg transition-colors text-base">
                    🏆 Browse Top ROI
                  </Link>
                  <Link href="/trending" className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white font-bold px-5 py-2.5 rounded-lg transition-colors text-base">
                    📈 See Trending Cards
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-zinc-300 font-semibold text-base">Loading...</div>
      </div>
    }>
      <HomeInner />
    </Suspense>
  );
}