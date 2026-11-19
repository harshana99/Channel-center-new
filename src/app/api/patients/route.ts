import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { normalizePhone } from "@/lib/auth";

async function getNextPatientId(): Promise<string> {
  const db = getDb();
  const result = await db.execute("SELECT id FROM patients");
  let maxNum = 0;
  for (const row of result.rows) {
    const idStr = String(row.id || "");
    const match = idStr.match(/^P-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  const nextNum = maxNum + 1;
  return `P-${String(nextNum).padStart(4, "0")}`;
}

export async function GET(request: Request) {
  try {
    await initDb();
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";
    const phoneParam = searchParams.get("phone")?.trim() || "";

    let sql = "SELECT * FROM patients";
    const args: any[] = [];

    if (phoneParam) {
      const normalizedQuery = normalizePhone(phoneParam);
      sql += " WHERE phone_normalized = ? OR phone_normalized LIKE ?";
      args.push(normalizedQuery, `%${normalizedQuery}%`);
    } else if (query) {
      const normQuery = normalizePhone(query);
      if (normQuery.length >= 3) {
        sql += ` WHERE id LIKE ? OR full_name LIKE ? OR phone_normalized LIKE ? OR nic LIKE ?`;
        const pattern = `%${query}%`;
        const phonePattern = `%${normQuery}%`;
        args.push(pattern, pattern, phonePattern, pattern);
      } else {
        sql += ` WHERE id LIKE ? OR full_name LIKE ? OR nic LIKE ?`;
        const pattern = `%${query}%`;
        args.push(pattern, pattern, pattern);
      }
    }

    sql += " ORDER BY id DESC";

    const result = await db.execute({ sql, args });

    const patients = result.rows.map((row) => ({
      ...row,
      allergies_assessed: Number(row.allergies_assessed),
      no_known_allergies: Number(row.no_known_allergies),
      conditions_assessed: Number(row.conditions_assessed),
      no_conditions: Number(row.no_conditions),
    }));

    return NextResponse.json({
      success: true,
      count: patients.length,
      patients,
    });
  } catch (error: any) {
    console.error("GET /api/patients error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch patients" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const db = getDb();
    const body = await request.json();

    const { full_name, dob = "", sex = "", phone = "", nic = "", address = "" } = body;

    if (!full_name || !full_name.trim()) {
      return NextResponse.json(
        { success: false, error: "Full name is required" },
        { status: 400 }
      );
    }

    const patientId = await getNextPatientId();
    const now = new Date().toISOString();
    const phoneNorm = normalizePhone(phone);

    await db.execute({
      sql: `INSERT INTO patients (
        id, full_name, dob, sex, phone, phone_normalized, nic, address,
        allergies_assessed, no_known_allergies, allergies_json,
        conditions_assessed, no_conditions, conditions_json,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        patientId,
        full_name.trim(),
        dob || "",
        sex || "",
        phone ? phone.trim() : "",
        phoneNorm,
        nic ? nic.trim() : "",
        address ? address.trim() : "",
        0,
        0,
        "[]",
        0,
        0,
        "[]",
        now,
        now,
      ],
    });

    return NextResponse.json({
      success: true,
      patient: {
        id: patientId,
        full_name: full_name.trim(),
        dob,
        sex,
        phone,
        phone_normalized: phoneNorm,
        nic,
        address,
        allergies_assessed: 0,
        no_known_allergies: 0,
        conditions_assessed: 0,
        no_conditions: 0,
      },
    });
  } catch (error: any) {
    console.error("POST /api/patients error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to register patient" },
      { status: 500 }
    );
  }
}
