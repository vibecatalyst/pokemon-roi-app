"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface SealedProduct {
  id: string;
  tcgPlayerId: string;
  tcgPlayerUrl: string;
  name: string;
  setName: string;
  unopenedPrice: number;
  imageCdnUrl400: string;
  priceHistory?: { date: string; unopenedPrice: number }[];
}

function Sparkline({ history }: { history: { date: string; unopenedPrice: number }[] }) {
  if (!history || history.length < 2) return null;
  const prices = history.map(h => h.unopenedPrice).filter(p => p > 0);
  if (prices.length < 2) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const w = 120;
  const h = 40;
  const pts = prices.map((p, i) => (i / (prices.length - 1) * w).toFixed(1) + "," + (h - (p - min) / range * h).toFixed(1)).join(" ");
  const up = prices[prices.length - 1] >= prices[0];
  const pct = (prices[prices.length - 1] - prices[0]) / prices[0] * 100;
  return (
    <div className="flex items-center gap-2">
      <svg width={w} height={h} viewBox={"0 0 " + w + " " + h}>
        <polyline points={pts} fill="none" stroke={up ? "#34d399" : "#f87171"} strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      <span className={"text-xs font-mono font-bold " + (up ? "text-emerald-400" : "text-red-400")}>
        {up ? "+" : ""}{pct.toFixed(1)}%
      </span>
    </div>
  );
}

function SealedInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sets, setSets] = useState<{ name: string; id: string }[]>([]);
  const [selectedSet, setSelectedSet] = useState(searchParams.get("set") ?? "");
  const [products, setProducts] = useState<SealedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [setsLoading, setSetsLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState<"price" | "name" | "trend">("price");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/sets").then(r => r.json()).then(json => {
      const data = json.data ?? json ?? [];
      setSets(Array.isArray(data) ? data.map((s: Record<string, string>) => ({ name: s.name, id: s.id ?? s.name })) : []);
      setSetsLoading(false);
    }).catch(() => setSetsLoading(false));
  }, []);

  useEffect(() => {
    const s = searchParams.get("set");
    if (s) { setSelectedSet(s); fetchProducts(s); }
  }, []);

  async function fetchProducts(setName: string) {
    setLoading(true);
    setError("");
    setProducts([]);
    try {
      const res = await fetch("/api/sealed-products?set=" + encodeURIComponent(setName) + "&includeHistory=true");
      const json = await res.json();
      if (json.error) { setError(json.message ?? json.error); return; }
      setProducts(json.data ?? []);
    } catch {
      setError("Failed to fetch sealed products.");
    } finally {
      setLoading(false);
    }
  }

  function handleSetChange(setName: string) {
    setSelectedSet(setName);
    const p = new URLSearchParams(searchParams.toString());
    if (setName) p.set("set", setName); else p.delete("set");
    router.replace("/sealed?" + p.toString(), { scroll: false });
    if (setName) fetchProducts(setName);
  }

  function getTrend(product: SealedProduct) {
    const h = product.priceHistory;
    if (!h || h.length < 2) return 0;
    const prices = h.map(x => x.unopenedPrice).filter(p => p > 0);
    if (prices.length < 2) return 0;
    return (prices[prices.length - 1] - prices[0]) / prices[0] * 100;
  }

  const filtered = useMemo(() => {
    return products
      .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === "price") diff = b.unopenedPrice - a.unopenedPrice;
        else if (sortBy === "name") diff = a.name.localeCompare(b.name);
        else diff = getTrend(b) - getTrend(a);
        return sortDir === "desc" ? diff : -diff;
      });
  }, [products, sortBy, sortDir, search]);

  const stats = useMemo(() => {
    if (!products.length) return null;
    const prices = products.map(p => p.unopenedPrice).filter(p => p > 0);
    if (!prices.length) return null;
    const lowest = Math.min(...prices);
    const highest = Math.max(...prices);
    return {
      lowest,
      highest,
      cheapest: products.find(p => p.unopenedPrice === lowest),
      mostExpensive: products.find(p => p.unopenedPrice === highest),
    };
  }, [products]);

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-12">

        <div className="mb-8">
          <Link href="/" className="text-zinc-500 hover:text-white text-sm transition-colors">Back to Home</Link>
          <h1 className="text-4xl font-black mt-2">
            <span className="text-white">SEALED </span>
            <span className="text-purple-400">PRODUCTS</span>
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Track booster boxes, ETBs, and sealed product prices by set</p>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 mb-6 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-48">
            <label className="block text-xs text-zinc-500 font-mono mb-1">SELECT SET</label>
            <select value={selectedSet} onChange={(e) => handleSetChange(e.target.value)} disabled={setsLoading} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none">
              <option value="">{setsLoading ? "Loading sets..." : "Choose a set..."}</option>
              {sets.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>

          <div className="flex-1 min-w-40">
            <label className="block text-xs text-zinc-500 font-mono mb-1">SEARCH</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter products..." className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none" />
          </div>

          <div>
            <label className="block text-xs text-zinc-500 font-mono mb-1">SORT BY</label>
            <div className="flex gap-2">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none">
                <option value="price">Price</option>
                <option value="trend">Trend</option>
                <option value="name">Name</option>
              </select>
              <button onClick={() => setSortDir(sortDir === "desc" ? "asc" : "desc")} className="bg-zinc-800 border border-zinc-700 hover:border-zinc-500 rounded-lg px-3 py-2.5 text-white text-sm transition-colors font-mono">
                {sortDir === "desc" ? "Desc" : "Asc"}
              </button>
            </div>
          </div>
        </div>

        {stats && !loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
              <p className="text-xs text-zinc-500 font-mono mb-1">TOTAL PRODUCTS</p>
              <p className="text-2xl font-black text-white font-mono">{products.length}</p>
              <p className="text-xs text-zinc-600 mt-1">in {selectedSet}</p>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
              <p className="text-xs text-zinc-500 font-mono mb-1">CHEAPEST</p>
              <p className="text-2xl font-black text-emerald-400 font-mono">${stats.lowest.toFixed(2)}</p>
              <p className="text-xs text-zinc-600 mt-1 truncate">{stats.cheapest?.name}</p>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
              <p className="text-xs text-zinc-500 font-mono mb-1">MOST EXPENSIVE</p>
              <p className="text-2xl font-black text-yellow-400 font-mono">${stats.highest.toFixed(2)}</p>
              <p className="text-xs text-zinc-600 mt-1 truncate">{stats.mostExpensive?.name}</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-20">
            <div className="text-4xl mb-4 animate-spin inline-block">📦</div>
            <p className="text-zinc-500 font-mono text-sm">Fetching sealed products...</p>
          </div>
        )}

        {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-4">{error}</div>}

        {!loading && !selectedSet && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-zinc-600 font-mono text-sm">Select a set to see sealed product prices</p>
          </div>
        )}

        {!loading && selectedSet && products.length === 0 && !error && (
          <div className="text-center py-20">
            <p className="text-zinc-500 font-mono text-sm">No sealed products found for this set.</p>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((product) => {
              const trend = getTrend(product);
              const trendColor = trend > 5 ? "text-emerald-400" : trend < -5 ? "text-red-400" : "text-zinc-400";
              return (
                <div key={product.id} className="bg-zinc-900/60 border border-zinc-800 hover:border-zinc-600 rounded-2xl p-4 transition-all hover:scale-[1.01] flex flex-col gap-3">

                  <div className="flex items-center justify-center bg-zinc-800/40 rounded-xl p-3 min-h-32">
                    {product.imageCdnUrl400
                      ? <img src={product.imageCdnUrl400} alt={product.name} className="max-h-32 object-contain rounded" />
                      : <span className="text-4xl">📦</span>
                    }
                  </div>

                  <div className="flex-1">
                    <p className="text-sm font-bold text-white leading-tight">{product.name}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{product.setName}</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-zinc-500 font-mono">Market Price</p>
                      <p className="text-xl font-black text-yellow-400 font-mono">
                        {product.unopenedPrice > 0 ? "$" + product.unopenedPrice.toFixed(2) : "N/A"}
                      </p>
                    </div>
                    {trend !== 0 && (
                      <div className="text-right">
                        <p className="text-xs text-zinc-500 font-mono">30d Trend</p>
                        <p className={"text-sm font-black font-mono " + trendColor}>
                          {trend >= 0 ? "+" : ""}{trend.toFixed(1)}%
                        </p>
                      </div>
                    )}
                  </div>

                  {product.priceHistory && product.priceHistory.length > 1 && (
                    <div className="border-t border-zinc-800 pt-2">
                      <Sparkline history={product.priceHistory} />
                    </div>
                  )}

                  <a href={product.tcgPlayerUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-center bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white font-semibold px-3 py-2 rounded-lg transition-colors block">
                    View on TCGPlayer
                  </a>

                </div>
              );
            })}
          </div>
        )}

      </div>
    </main>
  );
}

export default function Sealed() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-zinc-500 font-mono text-sm">Loading...</div>
      </div>
    }>
      <SealedInner />
    </Suspense>
  );
}
