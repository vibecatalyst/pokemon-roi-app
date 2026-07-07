import { CardData } from "@/lib/types";

export async function searchCards(query: string): Promise<CardData[]> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  if (res.status === 429) throw new Error("429 credit limit exceeded");
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  const raw = json.data ?? [];
  if (!Array.isArray(raw)) return [];
  return raw.map(mapApiCard);
}

export function mapApiCard(c: Record<string, unknown>): CardData {
  const prices = (c.prices as Record<string, unknown>) ?? {};
  const rawPrice = (prices.market as number) ?? (prices.low as number) ?? 0;

  const ebay = (c.ebay as Record<string, unknown>) ?? {};
  const salesByGrade = (ebay.salesByGrade as Record<string, Record<string, unknown>>) ?? {};

  const psa10Data = salesByGrade.psa10 ?? {};
  const psa9Data = salesByGrade.psa9 ?? {};
  const psa8Data = salesByGrade.psa8 ?? {};
  const psa7Data = salesByGrade.psa7 ?? {};

  const smartPrice10 = (psa10Data.smartMarketPrice as Record<string, number>) ?? {};
  const smartPrice9 = (psa9Data.smartMarketPrice as Record<string, number>) ?? {};
  const smartPrice8 = (psa8Data.smartMarketPrice as Record<string, number>) ?? {};
  const smartPrice7 = (psa7Data.smartMarketPrice as Record<string, number>) ?? {};

  const psa10Price =
    smartPrice10.price ??
    (psa10Data.marketPrice7Day as number) ??
    (psa10Data.averagePrice as number) ??
    0;

  const psa9Price =
    smartPrice9.price ??
    (psa9Data.marketPrice7Day as number) ??
    (psa9Data.averagePrice as number) ??
    0;

  const psa8Price =
    smartPrice8.price ??
    (psa8Data.marketPrice7Day as number) ??
    (psa8Data.averagePrice as number) ??
    0;

  const psa7Price =
    smartPrice7.price ??
    (psa7Data.marketPrice7Day as number) ??
    (psa7Data.averagePrice as number) ??
    0;

  return {
    id: String(c.id ?? c.tcgPlayerId ?? Math.random()),
    name: String(c.name ?? "Unknown"),
    set: String(c.setName ?? (c.set as Record<string, string>)?.name ?? ""),
    number: String(c.cardNumber ?? c.number ?? ""),
    rarity: String(c.rarity ?? ""),
    image: String(c.imageCdnUrl400 ?? c.imageCdnUrl200 ?? c.imageUrl ?? c.image ?? ""),
    rawPrice,
    psa10Price,
    psa9Price,
    psa8Price,
    psa7Price,
    tcgPlayerId: String(c.tcgPlayerId ?? c.id ?? ""),
  };
}