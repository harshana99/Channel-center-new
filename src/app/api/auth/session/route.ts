import { NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await initDb();
    const session = await getSessionFromRequest(request);

    if (!session.authenticated || !session.user) {
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({
      authenticated: true,
      user: session.user,
    });
  } catch (error: any) {
    return NextResponse.json({ authenticated: false, error: error.message }, { status: 500 });
  }
}
