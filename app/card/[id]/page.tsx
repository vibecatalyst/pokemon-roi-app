"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { mapApiCard } from "@/lib/api";
import { useFees } from "@/lib/fees-context";
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from "@/lib/watchlist";
import PriceChart from "@/components/PriceChart";
import CardResult from "@/components/CardResult";
import Link from "next/link";

interface PriceHistoryEntry {
  average: number;
  count: number;
}

export default function CardDetail() {
  const { id } = useParams<{ id: string }>();
  const { fees } = useFees();
  const [card, setCard] = useState<ReturnType<typeof mapApiCard> | null>(null);
  const [priceHistory, setPriceHistory] = useState<Record<string, Record<string, PriceHistoryEntry>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [watched, setWatched] = useState(false);

  useEffect(() => {
    if (!id) return;
    setWatched(isInWatchlist(id));
    fetch(`/api/card?id=${id}`)
      .then((r) => r.json())
      .then((json) => {
        const raw = json.data;
        const cardData = Array.isArray(raw) ? raw[0] : raw;
        if (!cardData) { setError("Card not found."); return; }
        setCard(mapApiCard(cardData as Record<string, unknown>));
        const ebay = (cardData.ebay as Record<string, unknown>) ?? {};
        const history = (ebay.priceHistory as Record<string, Record<string, PriceHistoryEntry>>) ?? {};
        setPriceHistory(history);
      })
      .catch(() => setError("Failed to load card data."))
      .finally(() => setLoading(false));
  }, [id]);

  function toggleWatchlist() {
    if (!card) return;
    if (watched) {
      removeFromWatchlist(card.tcgPlayerId);
      setWatched(false);
    } else {
      addToWatchlist({
        tcgPlayerId: card.tcgPlayerId,
        name: card.name,
        set: card.set,
        image: card.image,
        rawPrice: card.rawPrice,
        psa10Price: card.psa10Price,
        rarity: card.rarity,
        number: card.number,
        addedAt: new Date().toISOString(),
      });
      setWatched(true);
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-red-500/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="text-zinc-500 hover:text-white text-sm transition-colors">
            ← Back to Search
          </Link>
          {card && (
            <button
              onClick={toggleWatchlist}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-mono transition-colors ${
                watched
                  ? "bg-blue-500/20 border-blue-500/40 text-blue-400 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400"
                  : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-blue-500/40 hover:text-blue-400"
              }`}
            >
              {watched ? "★ Watching" : "☆ Add to Watchlist"}
            </button>
          )}
        </div>

        {loading && (
          <div className="text-center py-20">
            <div className="text-4xl mb-4 animate-spin inline-block">⚡</div>
            <p className="text-zinc-500 font-mono text-sm">Loading card data...</p>
          </div>
        )}

        {error && (
          <div className="mt-4 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            {error}
          </div>
        )}

        {card && (
          <div className="space-y-6">
            <CardResult card={card} fees={fees} />
            <PriceChart
              priceHistory={priceHistory}
              rawPrice={card.rawPrice}
              cardName={card.name}
            />
          </div>
        )}
      </div>
    </main>
  );
}