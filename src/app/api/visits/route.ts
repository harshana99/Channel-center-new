import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

async function getNextVisitId(): Promise<string> {
  const db = getDb();
  const result = await db.execute("SELECT id FROM visits");
  let maxNum = 0;
  for (const row of result.rows) {
    const idStr = String(row.id || "");
    const match = idStr.match(/^V-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  const nextNum = maxNum + 1;
  return `V-${String(nextNum).padStart(4, "0")}`;
}

export async function POST(request: Request) {
  try {
    await initDb();
    const db = getDb();

    // Enforce role: Only Doctor can create clinical visit records!
    const session = await getSessionFromRequest(request);
    if (!session.authenticated || session.user?.role !== "doctor") {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: Only Doctor role is permitted to create consultation records",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const {
      patient_id,
      visit_date,
      complaint = "",
      diagnosis = "",
      notes = "",
      vitals = {},
      drugs = [],
      follow_up_date = "",
      follow_up_note = "",
      follow_up_reason = "",
      created_by = session.user.name || "Dr. Aruna Perera",
      // First visit medical background fields:
      is_first_visit = false,
      medical_background = null,
    } = body;

    if (!patient_id) {
      return NextResponse.json(
        { success: false, error: "Patient ID is required" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const vDate = visit_date || now.split("T")[0];

    // If first visit, handle medical background saving to patient profile
    if (is_first_visit && medical_background) {
      const {
        allergies = [],
        no_known_allergies = false,
        conditions = [],
        no_conditions = false,
      } = medical_background;

      // Validation: Must be completed or marked "None"
      if (!no_known_allergies && allergies.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Please record known allergies or check 'No known allergies'",
          },
          { status: 400 }
        );
      }

      if (!no_conditions && conditions.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Please record long-term conditions or check 'No long-term conditions'",
          },
          { status: 400 }
        );
      }

      // Update patient profile
      await db.execute({
        sql: `UPDATE patients SET
          allergies_assessed = 1,
          no_known_allergies = ?,
          allergies_json = ?,
          conditions_assessed = 1,
          no_conditions = ?,
          conditions_json = ?,
          updated_at = ?
          WHERE id = ?`,
        args: [
          no_known_allergies ? 1 : 0,
          JSON.stringify(allergies),
          no_conditions ? 1 : 0,
          JSON.stringify(conditions),
          now,
          patient_id,
        ],
      });

      // Audit log for first visit assessment
      const auditId = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await db.execute({
        sql: `INSERT INTO audit_logs (id, patient_id, changed_by_name, changed_by_role, change_type, details_json, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          auditId,
          patient_id,
          created_by,
          "doctor",
          "first_visit_assessment",
          JSON.stringify({
            note: "First visit medical background assessment recorded",
            no_known_allergies: !!no_known_allergies,
            allergies,
            no_conditions: !!no_conditions,
            conditions,
          }),
          now,
        ],
      });
    }

    // Insert visit
    const visitId = await getNextVisitId();
    await db.execute({
      sql: `INSERT INTO visits (
        id, patient_id, visit_date, complaint, diagnosis, notes,
        vitals_json, drugs_json, follow_up_date, follow_up_note, follow_up_reason, follow_up_completed,
        created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        visitId,
        patient_id,
        vDate,
        complaint.trim(),
        diagnosis.trim(),
        notes.trim(),
        JSON.stringify(vitals || {}),
        JSON.stringify(drugs || []),
        follow_up_date ? follow_up_date.trim() : "",
        follow_up_note ? follow_up_note.trim() : "",
        follow_up_reason ? follow_up_reason.trim() : "",
        0, // follow_up_completed
        created_by,
        now,
        now,
      ],
    });

    // Auto-learn new custom drugs (Requirement 4)
    for (const d of drugs) {
      if (d.drug_name && d.drug_name.trim()) {
        const cleanDrugName = d.drug_name.trim();
        const existingDrug = await db.execute({
          sql: "SELECT id FROM drugs WHERE LOWER(name) = LOWER(?) LIMIT 1",
          args: [cleanDrugName],
        });
        if (existingDrug.rows.length === 0) {
          const newDrugId = `drug-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          await db.execute({
            sql: `INSERT INTO drugs (id, name, default_dose, default_frequency, drug_class, active, created_at)
                  VALUES (?, ?, ?, ?, 'custom', 1, ?)`,
            args: [newDrugId, cleanDrugName, d.dose || "", d.frequency || "OD", now],
          });
        }
      }
    }

    // Log allergy override if doctor confirmed and prescribed flagged drugs
    const { allergy_override = false, overridden_allergies = [] } = body;
    if (allergy_override && Array.isArray(overridden_allergies) && overridden_allergies.length > 0) {
      const overrideAuditId = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await db.execute({
        sql: `INSERT INTO audit_logs (id, patient_id, changed_by_name, changed_by_role, change_type, details_json, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          overrideAuditId,
          patient_id,
          created_by,
          "doctor",
          "allergy_override",
          JSON.stringify({
            note: "Doctor reviewed and confirmed override for allergy warning",
            overriddenDrugs: overridden_allergies,
          }),
          now,
        ],
      });
    }

    return NextResponse.json({
      success: true,
      visitId,
      message: "Visit saved successfully",
    });
  } catch (error: any) {
    console.error("POST /api/visits error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save visit" },
      { status: 500 }
    );
  }
}
