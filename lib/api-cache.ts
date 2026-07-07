import { supabase } from "@/lib/supabase";

const TTL_MS = 24 * 60 * 60 * 1000;
const API_KEY = process.env.NEXT_PUBLIC_POKEPRICE_API_KEY!;

export async function getCached<T = unknown>(cacheKey: string): Promise<T | null> {
  const { data } = await supabase
    .from("api_cache")
    .select("data, fetched_at")
    .eq("cache_key", cacheKey)
    .maybeSingle();
  if (!data) return null;
  if (Date.now() - new Date(data.fetched_at).getTime() > TTL_MS) return null;
  return data.data as T;
}

export async function setCached(cacheKey: string, data: unknown): Promise<void> {
  await supabase.from("api_cache").upsert({ cache_key: cacheKey, data, fetched_at: new Date().toISOString() });
}

export async function fetchWithCache(url: string): Promise<Record<string, unknown>> {
  const cached = await getCached<Record<string, unknown>>(url);
  if (cached) return cached;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${API_KEY}` } });
  const json = await res.json();
  if (!json.error) await setCached(url, json);
  return json;
}
