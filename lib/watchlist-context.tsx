"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import { WatchlistItem, getWatchlist, addToWatchlist as localAdd, removeFromWatchlist as localRemove } from "@/lib/watchlist";
import { dbGetWatchlist, dbAddToWatchlist, dbRemoveFromWatchlist } from "@/lib/db";

interface WatchlistContextType {
  items: WatchlistItem[];
  loading: boolean;
  addItem: (item: WatchlistItem) => Promise<void>;
  removeItem: (tcgPlayerId: string) => Promise<void>;
  isWatched: (tcgPlayerId: string) => boolean;
  reload: () => Promise<void>;
}

const WatchlistContext = createContext<WatchlistContextType>({
  items: [],
  loading: false,
  addItem: async () => {},
  removeItem: async () => {},
  isWatched: () => false,
  reload: async () => {},
});

function mapDbItem(row: Record<string, unknown>): WatchlistItem {
  return {
    tcgPlayerId: String(row.tcg_player_id ?? ""),
    name: String(row.name ?? ""),
    set: String(row.set_name ?? ""),
    image: row.image ? String(row.image) : undefined,
    rawPrice: Number(row.raw_price ?? 0),
    psa10Price: Number(row.psa10_price ?? 0),
    psa9Price: Number(row.psa9_price ?? 0),
    rarity: String(row.rarity ?? ""),
    number: String(row.number ?? ""),
    addedAt: String(row.added_at ?? new Date().toISOString()),
  };
}

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    reload();
  }, [isSignedIn]);

  async function reload() {
    setLoading(true);
    try {
      if (isSignedIn) {
        const data = await dbGetWatchlist();
        if (data) {
          setItems(data.map(mapDbItem));
          return;
        }
      }
      setItems(getWatchlist());
    } catch {
      setItems(getWatchlist());
    } finally {
      setLoading(false);
    }
  }

  async function addItem(item: WatchlistItem) {
    if (isSignedIn) {
      await dbAddToWatchlist({
        tcgPlayerId: item.tcgPlayerId,
        name: item.name,
        set: item.set,
        image: item.image,
        rawPrice: item.rawPrice,
        psa10Price: item.psa10Price,
        psa9Price: item.psa9Price,
        rarity: item.rarity,
        number: item.number,
        addedAt: item.addedAt,
      });
      await reload();
    } else {
      localAdd(item);
      setItems(getWatchlist());
    }
  }

  async function removeItem(tcgPlayerId: string) {
    if (isSignedIn) {
      await dbRemoveFromWatchlist(tcgPlayerId);
      await reload();
    } else {
      localRemove(tcgPlayerId);
      setItems(getWatchlist());
    }
  }

  function isWatched(tcgPlayerId: string) {
    return items.some(i => i.tcgPlayerId === tcgPlayerId);
  }

  return (
    <WatchlistContext.Provider value={{ items, loading, addItem, removeItem, isWatched, reload }}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  return useContext(WatchlistContext);
}