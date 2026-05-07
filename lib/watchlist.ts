export interface WatchlistItem {
  tcgPlayerId: string;
  name: string;
  set: string;
  image?: string;
  rawPrice: number;
  psa10Price: number;
  psa9Price: number;
  rarity: string;
  number: string;
  addedAt: string;
}

const KEY = "pokeroi-watchlist";

export function getWatchlist(): WatchlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function addToWatchlist(item: WatchlistItem): void {
  const list = getWatchlist();
  if (list.find((i) => i.tcgPlayerId === item.tcgPlayerId)) return;
  localStorage.setItem(KEY, JSON.stringify([...list, item]));
}

export function removeFromWatchlist(tcgPlayerId: string): void {
  const list = getWatchlist().filter((i) => i.tcgPlayerId !== tcgPlayerId);
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function isInWatchlist(tcgPlayerId: string): boolean {
  return getWatchlist().some((i) => i.tcgPlayerId === tcgPlayerId);
}