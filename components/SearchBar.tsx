"use client";

import { useState, FormEvent } from "react";
import { searchCards } from "@/lib/api";
import { CardData } from "@/lib/types";

interface Props {
  onResults: (cards: CardData[]) => void;
  onSelect: (card: CardData | null) => void;
  onQueryChange?: (query: string) => void;
  setLoading: (v: boolean) => void;
  setError: (v: string) => void;
  loading: boolean;
}

export default function SearchBar({ onResults, onSelect, onQueryChange, setLoading, setError, loading }: Props) {
  const [query, setQuery] = useState("");

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    onSelect(null);
    onResults([]);
    if (onQueryChange) onQueryChange(query.trim());
    try {
      const cards = await searchCards(query.trim());
      if (cards.length === 0) {
        setError("No cards found. Try a different search.");
      } else {
        onResults(cards);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("429")) {
        setError("Daily API credit limit reached. Try again tomorrow or upgrade at pokemonpricetracker.com.");
      } else {
        setError("Failed to fetch card data. Check your API key or try again.");
      }
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
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Searching
          </span>
        ) : "Search"}
      </button>
    </form>
  );
}