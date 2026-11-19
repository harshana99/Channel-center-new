import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import {
  checkRateLimit,
  recordPinAttempt,
  verifyPin,
  createSession,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    await initDb();
    const db = getDb();
    const body = await request.json();
    const { pin, role: targetRole } = body;

    // Determine client IP
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";

    if (!pin) {
      return NextResponse.json(
        { success: false, error: "PIN is required" },
        { status: 400 }
      );
    }

    // Rate Limiting check
    const rateLimit = await checkRateLimit(ip);
    if (rateLimit.locked) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many failed PIN attempts. Account locked out for 15 minutes for security.",
        },
        { status: 429 }
      );
    }

    // Query user by targetRole if specified, else search all users
    let sql = "SELECT id, name, role, pin_hash, pin_salt, must_change_pin FROM users";
    const args: any[] = [];
    if (targetRole) {
      sql += " WHERE role = ?";
      args.push(targetRole);
    }

    const res = await db.execute({ sql, args });

    let matchedUser: any = null;
    for (const row of res.rows) {
      if (verifyPin(String(pin), String(row.pin_hash), String(row.pin_salt))) {
        matchedUser = row;
        break;
      }
    }

    if (!matchedUser) {
      // Record failed attempt
      await recordPinAttempt(ip, targetRole || "unknown", false);
      return NextResponse.json(
        { success: false, error: "Invalid PIN. Please try again." },
        { status: 401 }
      );
    }

    // Record successful attempt
    await recordPinAttempt(ip, matchedUser.role, true);

    // Create session
    const { token, expiresAt } = await createSession(
      String(matchedUser.id),
      matchedUser.role as any,
      String(matchedUser.name)
    );

    const response = NextResponse.json({
      success: true,
      token,
      expiresAt,
      user: {
        id: matchedUser.id,
        name: matchedUser.name,
        role: matchedUser.role,
        must_change_pin: Number(matchedUser.must_change_pin) === 1,
      },
    });

    // Set secure cookie
    response.cookies.set("clinic_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 8 * 60 * 60, // 8 hours
    });

    return response;
  } catch (error: any) {
    console.error("POST /api/auth error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Authentication error" },
      { status: 500 }
    );
  }
}
