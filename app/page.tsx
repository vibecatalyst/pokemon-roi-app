"use client";

import { useState } from "react";
import SearchBar from "@/components/SearchBar";
import CardResult from "@/components/CardResult";
import { CardData } from "@/lib/types";
import { useFees } from "@/lib/fees-context";

export default function Home() {
  const [results, setResults] = useState<CardData[]>([]);
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { fees } = useFees();

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-red-500/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-4 py-1.5 mb-6">
            <span className="text-yellow-400 text-xs font-mono tracking-widest uppercase">PSA Grading ROI Calculator</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-4 tracking-tight" style={{ letterSpacing: "0.02em" }}>
            <span className="text-white">POKE</span>
            <span className="text-yellow-400">ROI</span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-md mx-auto">
            Search any Pokemon card, see raw vs PSA 10 prices, and calculate your real profit after all fees.
          </p>
        </div>

        <SearchBar onResults={setResults} onSelect={setSelectedCard} setLoading={setLoading} setError={setError} loading={loading} />

        {error && (
          <div className="mt-4 text-center text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</div>
        )}

        {results.length > 0 && !selectedCard && (
          <div className="mt-8">
            <p className="text-zinc-500 text-sm mb-4 font-mono">{results.length} cards found - select one to calculate ROI</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {results.map((card, idx) => (
                <button
                  key={`${card.id}-${idx}`}
                  onClick={() => setSelectedCard(card)}
                  className="group relative bg-zinc-900/60 border border-zinc-800 hover:border-yellow-400/40 rounded-xl p-3 text-left transition-all duration-200 hover:bg-zinc-800/60 hover:scale-[1.02]"
                >
                  {card.image && <img src={card.image} alt={card.name} className="w-full rounded-lg mb-2" />}
                  <p className="text-sm font-semibold text-white truncate">{card.name}</p>
                  <p className="text-xs text-zinc-500 truncate">{card.set}</p>
                  {card.rawPrice > 0 && <p className="text-xs text-yellow-400 mt-1 font-mono">${card.rawPrice.toFixed(2)}</p>}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedCard && (
          <div className="mt-8 space-y-6">
            <button onClick={() => setSelectedCard(null)} className="text-zinc-500 hover:text-white text-sm flex items-center gap-2 transition-colors">
              ← Back to results
            </button>
            <CardResult card={selectedCard} fees={fees} />
          </div>
        )}

        {!loading && results.length === 0 && !selectedCard && (
          <div className="mt-16 text-center">
            <div className="text-6xl mb-4">⚡</div>
            <p className="text-zinc-600 font-mono text-sm">Search for a card to get started</p>
          </div>
        )}
      </div>
    </main>
  );
}