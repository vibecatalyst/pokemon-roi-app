import { NextResponse } from "next/server";

const API_KEY = process.env.NEXT_PUBLIC_POKEPRICE_API_KEY!;
const BASE_URL = "https://www.pokemonpricetracker.com/api/v2";

export async function GET() {
  try {
    const res = await fetch(BASE_URL + "/sets?limit=1", {
      headers: { Authorization: "Bearer " + API_KEY },
      cache: "no-store",
    });
    const dailyLimit = res.headers.get("x-ratelimit-daily-limit");
    const dailyRemaining = res.headers.get("x-ratelimit-daily-remaining");
    const dailyReset = res.headers.get("x-ratelimit-daily-reset");
    const minuteLimit = res.headers.get("x-ratelimit-minute-limit");
    const minuteRemaining = res.headers.get("x-ratelimit-minute-remaining");
    return NextResponse.json({
      dailyLimit: dailyLimit ? parseInt(dailyLimit) : null,
      dailyRemaining: dailyRemaining ? parseInt(dailyRemaining) : null,
      dailyReset: dailyReset ? parseInt(dailyReset) : null,
      minuteLimit: minuteLimit ? parseInt(minuteLimit) : null,
      minuteRemaining: minuteRemaining ? parseInt(minuteRemaining) : null,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch usage" }, { status: 500 });
  }
}