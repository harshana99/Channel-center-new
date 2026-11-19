import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { getSessionFromRequest, normalizePhone } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await initDb();
    const db = getDb();
    const session = await getSessionFromRequest(request);

    // Strict role check: Backup export contains sensitive clinical data
    if (!session.authenticated || session.user?.role !== "doctor") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only Doctor role can export full clinical backups" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";

    const patientsRes = await db.execute("SELECT * FROM patients ORDER BY id ASC");
    const visitsRes = await db.execute("SELECT * FROM visits ORDER BY visit_date ASC");
    const auditRes = await db.execute("SELECT * FROM audit_logs ORDER BY created_at ASC");

    if (format === "csv") {
      const headers = ["ID", "Full Name", "DOB", "Sex", "Phone", "Normalized Phone", "NIC", "Address", "Created At"];
      const rows = patientsRes.rows.map((p) => [
        `"${p.id}"`,
        `"${String(p.full_name || "").replace(/"/g, '""')}"`,
        `"${p.dob || ""}"`,
        `"${p.sex || ""}"`,
        `"${p.phone || ""}"`,
        `"${p.phone_normalized || ""}"`,
        `"${p.nic || ""}"`,
        `"${String(p.address || "").replace(/"/g, '""')}"`,
        `"${p.created_at || ""}"`,
      ]);

      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      return new Response(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="patients-register-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    const backupData = {
      version: "2.0",
      exported_at: new Date().toISOString(),
      counts: {
        patients: patientsRes.rows.length,
        visits: visitsRes.rows.length,
        audit_logs: auditRes.rows.length,
      },
      patients: patientsRes.rows,
      visits: visitsRes.rows,
      audit_logs: auditRes.rows,
    };

    return new Response(JSON.stringify(backupData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="clinic-backup-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error: any) {
    console.error("GET /api/backup error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate backup" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const db = getDb();
    const session = await getSessionFromRequest(request);

    if (!session.authenticated || session.user?.role !== "doctor") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only Doctor role can restore clinical backups" },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (!body || !Array.isArray(body.patients)) {
      return NextResponse.json(
        { success: false, error: "Invalid backup format: 'patients' array required" },
        { status: 400 }
      );
    }

    const { patients = [], visits = [], audit_logs = [] } = body;

    for (const p of patients) {
      const phoneNorm = p.phone_normalized || normalizePhone(p.phone);
      await db.execute({
        sql: `INSERT OR REPLACE INTO patients (
          id, full_name, dob, sex, phone, phone_normalized, nic, address,
          allergies_assessed, no_known_allergies, allergies_json,
          conditions_assessed, no_conditions, conditions_json,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          p.id,
          p.full_name,
          p.dob || "",
          p.sex || "",
          p.phone || "",
          phoneNorm,
          p.nic || "",
          p.address || "",
          p.allergies_assessed || 0,
          p.no_known_allergies || 0,
          typeof p.allergies_json === "string" ? p.allergies_json : JSON.stringify(p.allergies_json || []),
          p.conditions_assessed || 0,
          p.no_conditions || 0,
          typeof p.conditions_json === "string" ? p.conditions_json : JSON.stringify(p.conditions_json || []),
          p.created_at || new Date().toISOString(),
          p.updated_at || new Date().toISOString(),
        ],
      });
    }

    for (const v of visits) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO visits (
          id, patient_id, visit_date, complaint, diagnosis, notes,
          vitals_json, drugs_json, follow_up_date, follow_up_note, follow_up_reason, follow_up_completed,
          created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          v.id,
          v.patient_id,
          v.visit_date,
          v.complaint || "",
          v.diagnosis || "",
          v.notes || "",
          typeof v.vitals_json === "string" ? v.vitals_json : JSON.stringify(v.vitals_json || {}),
          typeof v.drugs_json === "string" ? v.drugs_json : JSON.stringify(v.drugs_json || []),
          v.follow_up_date || "",
          v.follow_up_note || "",
          v.follow_up_reason || "",
          v.follow_up_completed || 0,
          v.created_by || "Doctor",
          v.created_at || new Date().toISOString(),
          v.updated_at || new Date().toISOString(),
        ],
      });
    }

    for (const a of audit_logs) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO audit_logs (
          id, patient_id, changed_by_name, changed_by_role, change_type, details_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          a.id,
          a.patient_id,
          a.changed_by_name || "Doctor",
          a.changed_by_role || "doctor",
          a.change_type || "allergies_updated",
          typeof a.details_json === "string" ? a.details_json : JSON.stringify(a.details_json || {}),
          a.created_at || new Date().toISOString(),
        ],
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully restored ${patients.length} patients and ${visits.length} visits.`,
    });
  } catch (error: any) {
    console.error("POST /api/backup error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to import backup" },
      { status: 500 }
    );
  }
}
