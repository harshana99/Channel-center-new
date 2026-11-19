import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await initDb();
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") || "").trim();
    const limit = parseInt(searchParams.get("limit") || "0", 10);
    const activeOnly = searchParams.get("active") !== "false";

    let sql = "SELECT * FROM drugs";
    const conditions: string[] = [];
    const args: any[] = [];

    if (activeOnly) {
      conditions.push("active = 1");
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    const result = await db.execute({ sql, args });
    let drugs = result.rows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      default_dose: String(r.default_dose || ""),
      default_frequency: String(r.default_frequency || "OD"),
      drug_class: String(r.drug_class || ""),
      active: Number(r.active),
      created_at: String(r.created_at),
    }));

    // If query is provided: sort Prefix matches first, then Contains matches
    if (query) {
      const qLower = query.toLowerCase();
      const prefixMatches: typeof drugs = [];
      const containsMatches: typeof drugs = [];

      for (const d of drugs) {
        const dLower = d.name.toLowerCase();
        if (dLower.startsWith(qLower)) {
          prefixMatches.push(d);
        } else if (dLower.includes(qLower)) {
          containsMatches.push(d);
        }
      }

      // Sort alphabetically within each bucket
      prefixMatches.sort((a, b) => a.name.localeCompare(b.name));
      containsMatches.sort((a, b) => a.name.localeCompare(b.name));

      drugs = [...prefixMatches, ...containsMatches];
    } else {
      drugs.sort((a, b) => a.name.localeCompare(b.name));
    }

    if (limit > 0) {
      drugs = drugs.slice(0, limit);
    }

    return NextResponse.json({ success: true, count: drugs.length, drugs });
  } catch (error: any) {
    console.error("GET /api/drugs error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch drugs" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const db = getDb();
    const session = await getSessionFromRequest(request);

    // Only Doctor can manage drugs master list
    if (!session.authenticated || session.user?.role !== "doctor") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only Doctor can add drugs to master list" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, default_dose = "", default_frequency = "OD", drug_class = "", active = 1 } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Drug name is required" },
        { status: 400 }
      );
    }

    const cleanName = name.trim();

    // Check if drug already exists
    const existing = await db.execute({
      sql: "SELECT id FROM drugs WHERE LOWER(name) = LOWER(?) LIMIT 1",
      args: [cleanName],
    });

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: `A drug named '${cleanName}' already exists` },
        { status: 409 }
      );
    }

    const drugId = `drug-${Date.now()}`;
    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO drugs (id, name, default_dose, default_frequency, drug_class, active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        drugId,
        cleanName,
        default_dose ? default_dose.trim() : "",
        default_frequency || "OD",
        drug_class ? drug_class.trim() : "",
        active ? 1 : 0,
        now,
      ],
    });

    return NextResponse.json({
      success: true,
      drug: {
        id: drugId,
        name: cleanName,
        default_dose: default_dose ? default_dose.trim() : "",
        default_frequency: default_frequency || "OD",
        drug_class: drug_class ? drug_class.trim() : "",
        active: active ? 1 : 0,
        created_at: now,
      },
      message: "Drug added successfully",
    });
  } catch (error: any) {
    console.error("POST /api/drugs error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to add drug" },
      { status: 500 }
    );
  }
}
