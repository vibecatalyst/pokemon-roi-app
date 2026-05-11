"use client";

import { useState } from "react";
import { useWatchlist, WatchlistList } from "@/lib/watchlist-context";
import { WatchlistItem } from "@/lib/watchlist";

interface Props {
  card: WatchlistItem;
  onClose: () => void;
}

export default function WatchlistPicker({ card, onClose }: Props) {
  const { lists, items, addItem, removeItem, createList } = useWatchlist();
  const [newListName, setNewListName] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  const cardInLists = items
    .filter(i => i.tcgPlayerId === card.tcgPlayerId)
    .map(i => i.watchlistId);

  async function handleToggle(list: WatchlistList) {
    setSaving(list.id);
    const isIn = cardInLists.includes(list.id);
    if (isIn) {
      await removeItem(card.tcgPlayerId, list.id);
    } else {
      await addItem(card, list.id);
    }
    setSaving(null);
  }

  async function handleAddToDefault() {
    setSaving("default");
    const isIn = cardInLists.includes(undefined);
    if (isIn) {
      await removeItem(card.tcgPlayerId, undefined);
    } else {
      await addItem(card, undefined);
    }
    setSaving(null);
  }

  async function handleCreateAndAdd() {
    if (!newListName.trim()) return;
    setCreating(true);
    const newList = await createList(newListName.trim());
    if (newList) {
      await addItem(card, newList.id);
    }
    setNewListName("");
    setCreating(false);
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0d0d14] border border-zinc-700 rounded-2xl p-6 w-full max-w-sm space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-white">Add to Watchlist</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors text-xl">✕</button>
        </div>

        {/* Card preview */}
        <div className="flex items-center gap-3 bg-zinc-800/60 rounded-xl p-3">
          {card.image && <img src={card.image} alt={card.name} className="w-12 rounded flex-shrink-0" />}
          <div className="min-w-0">
            <p className="font-bold text-white text-sm truncate">{card.name}</p>
            <p className="text-xs text-zinc-400 truncate">{card.set}</p>
          </div>
        </div>

        {/* Lists */}
        <div className="space-y-2">
          <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">Your Watchlists</p>

          {/* Default / no list */}
          <button
            onClick={handleAddToDefault}
            disabled={saving === "default"}
            className={"w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors " +
              (cardInLists.includes(undefined)
                ? "bg-blue-500/20 border-blue-500/40 text-white"
                : "bg-zinc-800/60 border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white")}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">★</span>
              <span className="font-semibold text-sm">Main Watchlist</span>
            </div>
            {saving === "default" ? (
              <span className="text-xs text-zinc-500 animate-spin">⟳</span>
            ) : cardInLists.includes(undefined) ? (
              <span className="text-xs text-blue-400 font-bold">Added ✓</span>
            ) : (
              <span className="text-xs text-zinc-500">+ Add</span>
            )}
          </button>

          {lists.map((list) => {
            const isIn = cardInLists.includes(list.id);
            return (
              <button
                key={list.id}
                onClick={() => handleToggle(list)}
                disabled={saving === list.id}
                className={"w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors " +
                  (isIn
                    ? "bg-blue-500/20 border-blue-500/40 text-white"
                    : "bg-zinc-800/60 border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white")}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">📋</span>
                  <span className="font-semibold text-sm">{list.name}</span>
                </div>
                {saving === list.id ? (
                  <span className="text-xs text-zinc-500 animate-spin">⟳</span>
                ) : isIn ? (
                  <span className="text-xs text-blue-400 font-bold">Added ✓</span>
                ) : (
                  <span className="text-xs text-zinc-500">+ Add</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Create new list */}
        <div className="space-y-2">
          <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">Create New List</p>
          <div className="flex gap-2">
            <input
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateAndAdd(); }}
              placeholder="List name..."
              className="flex-1 bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm outline-none placeholder-zinc-500"
            />
            <button
              onClick={handleCreateAndAdd}
              disabled={creating || !newListName.trim()}
              className="bg-yellow-400 hover:bg-yellow-300 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-bold px-4 py-2 rounded-lg transition-colors text-sm"
            >
              {creating ? "..." : "Create"}
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-300 font-bold px-4 py-2.5 rounded-lg transition-colors text-sm"
        >
          Done
        </button>
      </div>
    </div>
  );
}