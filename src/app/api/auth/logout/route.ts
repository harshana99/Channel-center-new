import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

export async function POST(request: Request) {
  try {
    await initDb();
    const db = getDb();

    let token = "";
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }
    if (!token) {
      const cookieHeader = request.headers.get("cookie") || "";
      const match = cookieHeader.match(/clinic_session=([^;]+)/);
      if (match) token = match[1].trim();
    }

    if (token) {
      await db.execute({
        sql: "DELETE FROM sessions WHERE token = ?",
        args: [token],
      });
    }

    const response = NextResponse.json({ success: true, message: "Logged out" });
    response.cookies.delete("clinic_session");
    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
