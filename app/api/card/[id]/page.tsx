"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { mapApiCard } from "@/lib/api";
import { useFees } from "@/lib/fees-context";
import PriceChart from "@/components/PriceChart";
import CardResult from "@/components/CardResult";
import Link from "next/link";

export default function CardDetail() {
  const { id } = useParams<{ id: string }>();
  const { fees } = useFees();
  const [card, setCard] = useState<ReturnType<typeof mapApiCard> | null>(null);
  const [priceHistory, setPriceHistory] = useState<Record<string, Record<string, { average: number; count: number }>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/card?id=${id}`)
      .then((r) => r.json())
      .then((json) => {
        const raw = json.data ?? [];
        const arr = Array.isArray(raw) ? raw : [raw];
        if (arr.length === 0) { setError("Card not found."); return; }
        const cardData = arr[0];
        setCard(mapApiCard(cardData));
        const history = (cardData.ebay as Record<string, unknown>)?.priceHistory as Record<string, Record<string, { average: number; count: number }>> ?? {};
        setPriceHistory(history);
      })
      .catch(() => setError("Failed to load card data."))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-400/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-12">
        <Link href="/" className="text-zinc-500 hover:text-white text-sm transition-colors">← Back to Search</Link>

        {loading && (
          <div className="text-center py-20">
            <div className="text-4xl mb-4 animate-spin inline-block">⚡</div>
            <p className="text-zinc-500 font-mono text-sm">Loading card data...</p>
          </div>
        )}

        {error && (
          <div className="mt-4 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-4">{error}</div>
        )}

        {card && (
          <div className="mt-6 space-y-6">
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