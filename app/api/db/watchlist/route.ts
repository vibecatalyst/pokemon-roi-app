import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const watchlistId = searchParams.get("watchlist_id");
  let query = supabase
    .from("watchlist")
    .select("*")
    .eq("user_id", userId)
    .order("added_at", { ascending: false });
  if (watchlistId) query = query.eq("watchlist_id", watchlistId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  const matchQuery = supabase
    .from("watchlist")
    .select("id")
    .eq("user_id", userId)
    .eq("tcg_player_id", body.tcgPlayerId);

  const finalQuery = body.watchlistId
    ? matchQuery.eq("watchlist_id", body.watchlistId)
    : matchQuery.is("watchlist_id", null);

  const { data: existing } = await finalQuery.maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("watchlist")
      .update({
        name: body.name,
        set_name: body.set,
        image: body.image,
        raw_price: body.rawPrice,
        psa10_price: body.psa10Price,
        psa9_price: body.psa9Price,
        psa8_price: body.psa8Price,
        psa7_price: body.psa7Price,
        rarity: body.rarity,
        number: body.number,
      })
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase
      .from("watchlist")
      .insert({
        user_id: userId,
        tcg_player_id: body.tcgPlayerId,
        name: body.name,
        set_name: body.set,
        image: body.image,
        raw_price: body.rawPrice,
        psa10_price: body.psa10Price,
        psa9_price: body.psa9Price,
        psa8_price: body.psa8Price,
        psa7_price: body.psa7Price,
        rarity: body.rarity,
        number: body.number,
        added_at: body.addedAt,
        watchlist_id: body.watchlistId ?? null,
      });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tcgPlayerId, watchlistId } = await req.json();

  const deleteQuery = supabase
    .from("watchlist")
    .delete()
    .eq("user_id", userId)
    .eq("tcg_player_id", tcgPlayerId);

  const finalQuery = watchlistId
    ? deleteQuery.eq("watchlist_id", watchlistId)
    : deleteQuery.is("watchlist_id", null);

  const { error } = await finalQuery;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}