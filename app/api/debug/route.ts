import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  try {
    const authResult = await auth();
    return NextResponse.json({
      userId: authResult.userId,
      isAuthenticated: (authResult as Record<string, unknown>).isAuthenticated,
      sessionId: authResult.sessionId,
      keys: Object.keys(authResult),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) });
  }
}