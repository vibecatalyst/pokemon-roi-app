"use client";

import { useState, FormEvent } from "react";
import { searchCards } from "@/lib/api";
import { CardData } from "@/lib/types";

interface Props {
  onResults: (cards: CardData[]) => void;
  onSelect: (card: CardData | null) => void;
  setLoading: (v: boolean) => void;
  setError: (v: string) => void;
  loading: boolean;
}

export default function SearchBar({ onResults, onSelect, setLoading, setError, loading }: Props) {
  const [query, setQuery] = useState("");

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    onSelect(null);
    onResults([]);
    try {
      const cards = await searchCards(query.trim());
      if (cards.length === 0) {
        setError("No cards found. Try a different search.");
      } else {
        onResults(cards);
      }
    } catch (err) {
      setError("Failed to fetch card data. Check your API key or try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSearch} className="flex gap-3 max-w-2xl mx-auto">
      <div className="relative flex-1">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Pokemon card name... (e.g. Charizard, Pikachu VMAX)"
          className="w-full bg-zinc-900/80 border border-zinc-700 hover:border-zinc-600 focus:border-yellow-400/60 rounded-xl px-5 py-4 text-white placeholder-zinc-600 outline-none transition-colors font-mono text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={loading || !query.trim()}
        className="bg-yellow-400 hover:bg-yellow-300 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-bold px-6 py-4 rounded-xl transition-colors whitespace-nowrap"
      >
        {loading ? "Searching..." : "Search"}
      </button>
    </form>
  );
}
