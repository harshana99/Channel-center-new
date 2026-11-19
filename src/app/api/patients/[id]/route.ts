import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { getSessionFromRequest, normalizePhone } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await initDb();
    const db = getDb();
    const patientId = params.id;

    // Check session role for server-side enforcement
    const session = await getSessionFromRequest(request);
    const isDoctor = session.authenticated && session.user?.role === "doctor";

    const patientRes = await db.execute({
      sql: "SELECT * FROM patients WHERE id = ? LIMIT 1",
      args: [patientId],
    });

    if (patientRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 }
      );
    }

    const patientRow = patientRes.rows[0];

    // Fetch visits sorted newest first
    const visitsRes = await db.execute({
      sql: "SELECT * FROM visits WHERE patient_id = ? ORDER BY visit_date DESC, created_at DESC",
      args: [patientId],
    });

    // Parse JSON fields
    let allergies = [];
    try {
      allergies = JSON.parse(String(patientRow.allergies_json || "[]"));
    } catch {
      allergies = [];
    }

    let conditions = [];
    try {
      conditions = JSON.parse(String(patientRow.conditions_json || "[]"));
    } catch {
      conditions = [];
    }

    // Role enforcement:
    // If NOT doctor (e.g. reception), MUST NEVER receive clinical notes, diagnoses, drugs, or vitals!
    const visits = visitsRes.rows.map((v) => {
      if (!isDoctor) {
        return {
          id: v.id,
          patient_id: v.patient_id,
          visit_date: v.visit_date,
          complaint: v.complaint,
          diagnosis: "", // Masked for reception
          notes: "", // Masked for reception
          vitals: {}, // Masked for reception
          drugs: [], // Masked for reception
          follow_up_date: v.follow_up_date,
          follow_up_note: v.follow_up_note,
          follow_up_reason: v.follow_up_reason,
          follow_up_completed: v.follow_up_completed,
          created_by: v.created_by,
          created_at: v.created_at,
        };
      }

      let vitals = {};
      let drugs = [];
      try {
        vitals = JSON.parse(String(v.vitals_json || "{}"));
      } catch {}
      try {
        drugs = JSON.parse(String(v.drugs_json || "[]"));
      } catch {}

      return {
        ...v,
        vitals,
        drugs,
      };
    });

    // Audit logs: Only doctor can access audit logs
    let auditLogs: any[] = [];
    if (isDoctor) {
      const logsRes = await db.execute({
        sql: "SELECT * FROM audit_logs WHERE patient_id = ? ORDER BY created_at DESC",
        args: [patientId],
      });
      auditLogs = logsRes.rows.map((l) => {
        let details = {};
        try {
          details = JSON.parse(String(l.details_json || "{}"));
        } catch {}
        return {
          ...l,
          details,
        };
      });
    }

    // Current medications: Only doctor sees active drugs
    const currentMedications = isDoctor && visits.length > 0 ? visits[0].drugs : [];

    const patient = {
      ...patientRow,
      allergies_assessed: Number(patientRow.allergies_assessed),
      no_known_allergies: Number(patientRow.no_known_allergies),
      allergies,
      conditions_assessed: Number(patientRow.conditions_assessed),
      no_conditions: Number(patientRow.no_conditions),
      conditions,
      visitsCount: visits.length,
      currentMedications,
      visits,
      auditLogs,
      access_role: isDoctor ? "doctor" : "reception",
    };

    return NextResponse.json({ success: true, patient });
  } catch (error: any) {
    console.error("GET /api/patients/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load patient" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await initDb();
    const db = getDb();
    const patientId = params.id;
    const body = await request.json();

    const session = await getSessionFromRequest(request);

    // Check if patient exists
    const existingRes = await db.execute({
      sql: "SELECT * FROM patients WHERE id = ? LIMIT 1",
      args: [patientId],
    });

    if (existingRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    // 1. Update demographics (allowed for Reception and Doctor)
    if (body.updateType === "demographics") {
      const { full_name, dob, sex, phone, nic, address } = body;
      const phoneNorm = phone !== undefined ? normalizePhone(phone) : null;

      await db.execute({
        sql: `UPDATE patients SET
          full_name = COALESCE(?, full_name),
          dob = COALESCE(?, dob),
          sex = COALESCE(?, sex),
          phone = COALESCE(?, phone),
          phone_normalized = COALESCE(?, phone_normalized),
          nic = COALESCE(?, nic),
          address = COALESCE(?, address),
          updated_at = ?
          WHERE id = ?`,
        args: [
          full_name ? full_name.trim() : null,
          dob !== undefined ? dob : null,
          sex !== undefined ? sex : null,
          phone !== undefined ? phone.trim() : null,
          phoneNorm,
          nic !== undefined ? nic.trim() : null,
          address !== undefined ? address.trim() : null,
          now,
          patientId,
        ],
      });

      return NextResponse.json({ success: true, message: "Demographics updated" });
    }

    // 2. Update medical background (STRICT: Only Doctor allowed!)
    if (body.updateType === "medical_background" || body.updateType === "allergies_conditions") {
      if (!session.authenticated || session.user?.role !== "doctor") {
        return NextResponse.json(
          {
            success: false,
            error: "Forbidden: Only Doctor role is permitted to modify medical background or allergies",
          },
          { status: 403 }
        );
      }

      const {
        allergies,
        no_known_allergies,
        conditions,
        no_conditions,
        changed_by_name = session.user.name,
        changed_by_role = session.user.role,
        reason = "Manual update via patient profile",
      } = body;

      const allergiesJson = JSON.stringify(allergies || []);
      const conditionsJson = JSON.stringify(conditions || []);

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
          allergiesJson,
          no_conditions ? 1 : 0,
          conditionsJson,
          now,
          patientId,
        ],
      });

      // Insert audit log
      const auditId = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await db.execute({
        sql: `INSERT INTO audit_logs (id, patient_id, changed_by_name, changed_by_role, change_type, details_json, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          auditId,
          patientId,
          changed_by_name,
          changed_by_role,
          "allergies_updated",
          JSON.stringify({
            reason,
            no_known_allergies: !!no_known_allergies,
            allergiesCount: (allergies || []).length,
            allergies: allergies || [],
            no_conditions: !!no_conditions,
            conditionsCount: (conditions || []).length,
            conditions: conditions || [],
          }),
          now,
        ],
      });

      return NextResponse.json({
        success: true,
        message: "Allergies and conditions updated and logged successfully",
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid updateType" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("PATCH /api/patients/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update patient" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await initDb();
    const db = getDb();
    const patientId = params.id;

    const session = await getSessionFromRequest(request);
    if (!session.authenticated || session.user?.role !== "doctor") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only Doctor role can delete patient records" },
        { status: 403 }
      );
    }

    await db.execute({
      sql: "DELETE FROM audit_logs WHERE patient_id = ?",
      args: [patientId],
    });
    await db.execute({
      sql: "DELETE FROM visits WHERE patient_id = ?",
      args: [patientId],
    });
    await db.execute({
      sql: "DELETE FROM patients WHERE id = ?",
      args: [patientId],
    });

    return NextResponse.json({ success: true, message: "Patient record deleted" });
  } catch (error: any) {
    console.error("DELETE /api/patients/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete patient" },
      { status: 500 }
    );
  }
}
