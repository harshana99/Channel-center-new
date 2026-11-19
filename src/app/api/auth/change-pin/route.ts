import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { getSessionFromRequest, generateSalt, hashPin } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    await initDb();
    const db = getDb();
    const session = await getSessionFromRequest(request);

    if (!session.authenticated || !session.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required to change PIN" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { new_pin } = body;

    if (!new_pin || String(new_pin).trim().length < 4) {
      return NextResponse.json(
        { success: false, error: "New PIN must be at least 4 digits" },
        { status: 400 }
      );
    }

    const cleanPin = String(new_pin).trim();
    if (cleanPin === "1234" || cleanPin === "5678" || cleanPin === "0000") {
      return NextResponse.json(
        { success: false, error: "Cannot use common or default PIN. Please choose a secure PIN." },
        { status: 400 }
      );
    }

    const newSalt = generateSalt();
    const newHash = hashPin(cleanPin, newSalt);
    const now = new Date().toISOString();

    await db.execute({
      sql: `UPDATE users SET pin_hash = ?, pin_salt = ?, must_change_pin = 0, updated_at = ?
            WHERE id = ?`,
      args: [newHash, newSalt, now, session.user.id],
    });

    return NextResponse.json({
      success: true,
      message: "PIN updated successfully. Default PIN restriction cleared.",
    });
  } catch (error: any) {
    console.error("POST /api/auth/change-pin error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to change PIN" },
      { status: 500 }
    );
  }
}
