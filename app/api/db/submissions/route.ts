import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("user_id", userId)
    .order("submitted_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data, error } = await supabase.from("submissions").upsert({
    id: body.id,
    user_id: userId,
    tcg_player_id: body.tcgPlayerId,
    name: body.name,
    set_name: body.set,
    image: body.image,
    rarity: body.rarity,
    number: body.number,
    raw_price: body.rawPrice,
    psa10_price: body.psa10Price,
    psa9_price: body.psa9Price,
    grading_fee: body.gradingFee,
    shipping_cost: body.shippingCost,
    status: body.status,
    submission_number: body.submissionNumber,
    notes: body.notes,
    actual_grade: body.actualGrade,
    sold_price: body.soldPrice,
    submitted_at: body.submittedAt,
    graded_at: body.gradedAt,
    returned_at: body.returnedAt,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  const { error } = await supabase
    .from("submissions")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}