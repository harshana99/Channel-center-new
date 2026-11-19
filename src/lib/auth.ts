import crypto from "crypto";
import { getDb } from "./db";
import { Role } from "./types";

export function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function hashPin(pin: string, salt: string): string {
  return crypto.pbkdf2Sync(pin.trim(), salt, 100000, 64, "sha512").toString("hex");
}

export function verifyPin(pin: string, hash: string, salt: string): boolean {
  try {
    const calculated = hashPin(pin, salt);
    return crypto.timingSafeEqual(
      Buffer.from(calculated, "hex"),
      Buffer.from(hash, "hex")
    );
  } catch {
    return false;
  }
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Normalizes phone numbers:
 * - Strips non-digits
 * - Converts +94 / 94 to local 0 prefix
 * - Standardizes Sri Lankan 10-digit mobile format: 07XXXXXXXX
 */
export function normalizePhone(raw?: string): string {
  if (!raw) return "";
  let digits = raw.replace(/\D/g, "");

  // Starts with 94 (e.g. 94771234567 or 0094771234567)
  if (digits.startsWith("0094")) {
    digits = digits.substring(4);
  }
  if (digits.startsWith("94") && digits.length >= 11) {
    digits = "0" + digits.substring(2);
  } else if (digits.length === 9 && digits.startsWith("7")) {
    digits = "0" + digits;
  }

  return digits;
}

/**
 * Checks rate limiting for PIN attempts.
 * Max 5 failed attempts in 15 minutes.
 */
export async function checkRateLimit(ip: string): Promise<{ locked: boolean; remainingMinutes?: number }> {
  const db = getDb();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const cutoff = new Date(Date.now() - windowMs).toISOString();

  const res = await db.execute({
    sql: `SELECT COUNT(*) as count FROM pin_attempts 
          WHERE ip = ? AND success = 0 AND created_at >= ?`,
    args: [ip, cutoff],
  });

  const failures = Number(res.rows[0]?.count || 0);
  if (failures >= 5) {
    return { locked: true, remainingMinutes: 15 };
  }
  return { locked: false };
}

export async function recordPinAttempt(ip: string, role: string, success: boolean): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO pin_attempts (ip, attempted_role, success, created_at) VALUES (?, ?, ?, ?)`,
    args: [ip, role, success ? 1 : 0, new Date().toISOString()],
  });
}

/**
 * Creates a new session in DB.
 * Session lasts for 8 hours.
 */
export async function createSession(userId: string, role: Role, userName: string): Promise<{ token: string; expiresAt: string }> {
  const db = getDb();
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(); // 8 hours
  const now = new Date().toISOString();

  await db.execute({
    sql: `INSERT INTO sessions (token, user_id, role, user_name, expires_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [token, userId, role, userName, expiresAt, now],
  });

  return { token, expiresAt };
}

/**
 * Validates request session from Cookie or Authorization header.
 */
export async function getSessionFromRequest(request: Request): Promise<{
  authenticated: boolean;
  user?: { id: string; name: string; role: Role; must_change_pin: boolean };
}> {
  const db = getDb();

  // Check header Authorization: Bearer <token>
  let token = "";
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  }

  // Fallback to cookie
  if (!token) {
    const cookieHeader = request.headers.get("cookie") || "";
    const match = cookieHeader.match(/clinic_session=([^;]+)/);
    if (match) {
      token = match[1].trim();
    }
  }

  if (!token) {
    return { authenticated: false };
  }

  const now = new Date().toISOString();
  const sessionRes = await db.execute({
    sql: `SELECT s.user_id, s.role, s.user_name, s.expires_at, u.must_change_pin
          FROM sessions s
          JOIN users u ON s.user_id = u.id
          WHERE s.token = ? AND s.expires_at > ?
          LIMIT 1`,
    args: [token, now],
  });

  if (sessionRes.rows.length === 0) {
    return { authenticated: false };
  }

  const row = sessionRes.rows[0];
  return {
    authenticated: true,
    user: {
      id: String(row.user_id),
      name: String(row.user_name),
      role: row.role as Role,
      must_change_pin: Number(row.must_change_pin) === 1,
    },
  };
}
