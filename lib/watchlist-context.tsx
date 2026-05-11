"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import { WatchlistItem, getWatchlist, addToWatchlist as localAdd, removeFromWatchlist as localRemove } from "@/lib/watchlist";
import { dbGetWatchlist, dbAddToWatchlist, dbRemoveFromWatchlist, dbGetWatchlists, dbCreateWatchlist, dbDeleteWatchlist, dbRenameWatchlist } from "@/lib/db";

export interface WatchlistList {
  id: string;
  name: string;
  created_at: string;
}

export interface WatchlistItemWithList extends WatchlistItem {
  watchlistId?: string;
}

interface WatchlistContextType {
  items: WatchlistItemWithList[];
  lists: WatchlistList[];
  loading: boolean;
  addItem: (item: WatchlistItem, watchlistId?: string) => Promise<void>;
  removeItem: (tcgPlayerId: string, watchlistId?: string) => Promise<void>;
  isWatched: (tcgPlayerId: string, watchlistId?: string) => boolean;
  createList: (name: string) => Promise<WatchlistList | null>;
  deleteList: (id: string) => Promise<void>;
  renameList: (id: string, name: string) => Promise<void>;
  reload: () => Promise<void>;
}

const WatchlistContext = createContext<WatchlistContextType>({
  items: [],
  lists: [],
  loading: false,
  addItem: async () => {},
  removeItem: async () => {},
  isWatched: () => false,
  createList: async () => null,
  deleteList: async () => {},
  renameList: async () => {},
  reload: async () => {},
});

function mapDbItem(row: Record<string, unknown>): WatchlistItemWithList {
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
    watchlistId: row.watchlist_id ? String(row.watchlist_id) : undefined,
  };
}

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth();
  const [items, setItems] = useState<WatchlistItemWithList[]>([]);
  const [lists, setLists] = useState<WatchlistList[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    reload();
  }, [isSignedIn]);

  async function reload() {
    setLoading(true);
    try {
      if (isSignedIn) {
        const [itemData, listData] = await Promise.all([
          dbGetWatchlist(),
          dbGetWatchlists(),
        ]);
        if (itemData) setItems(itemData.map(mapDbItem));
        if (listData) setLists(listData);
        return;
      }
      setItems(getWatchlist());
      setLists([]);
    } catch {
      setItems(getWatchlist());
      setLists([]);
    } finally {
      setLoading(false);
    }
  }

  async function addItem(item: WatchlistItem, watchlistId?: string) {
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
        watchlistId: watchlistId ?? null,
      });
      await reload();
    } else {
      localAdd(item);
      setItems(getWatchlist());
    }
  }

  async function removeItem(tcgPlayerId: string, watchlistId?: string) {
    if (isSignedIn) {
      await dbRemoveFromWatchlist(tcgPlayerId, watchlistId);
      await reload();
    } else {
      localRemove(tcgPlayerId);
      setItems(getWatchlist());
    }
  }

  function isWatched(tcgPlayerId: string, watchlistId?: string) {
    if (watchlistId) {
      return items.some(i => i.tcgPlayerId === tcgPlayerId && i.watchlistId === watchlistId);
    }
    return items.some(i => i.tcgPlayerId === tcgPlayerId);
  }

  async function createList(name: string) {
    const newList = await dbCreateWatchlist(name);
    if (newList) {
      setLists(prev => [...prev, newList]);
      return newList;
    }
    return null;
  }

  async function deleteList(id: string) {
    await dbDeleteWatchlist(id);
    setLists(prev => prev.filter(l => l.id !== id));
    setItems(prev => prev.filter(i => i.watchlistId !== id));
  }

  async function renameList(id: string, name: string) {
    await dbRenameWatchlist(id, name);
    setLists(prev => prev.map(l => l.id === id ? { ...l, name } : l));
  }

  return (
    <WatchlistContext.Provider value={{ items, lists, loading, addItem, removeItem, isWatched, createList, deleteList, renameList, reload }}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  return useContext(WatchlistContext);
}