import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await initDb();
    const db = getDb();
    const visitId = params.id;

    const session = await getSessionFromRequest(request);
    const isDoctor = session.authenticated && session.user?.role === "doctor";

    const visitRes = await db.execute({
      sql: "SELECT * FROM visits WHERE id = ? LIMIT 1",
      args: [visitId],
    });

    if (visitRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Visit not found" },
        { status: 404 }
      );
    }

    const visitRow = visitRes.rows[0];

    // Get patient details
    const patientRes = await db.execute({
      sql: "SELECT * FROM patients WHERE id = ? LIMIT 1",
      args: [String(visitRow.patient_id)],
    });

    const patient = patientRes.rows[0] || null;

    // Strict role sanitization: if NOT doctor, mask sensitive clinical fields
    if (!isDoctor) {
      return NextResponse.json({
        success: true,
        visit: {
          id: visitRow.id,
          patient_id: visitRow.patient_id,
          visit_date: visitRow.visit_date,
          complaint: visitRow.complaint,
          diagnosis: "", // masked
          notes: "", // masked
          vitals: {}, // masked
          drugs: [], // masked
          follow_up_date: visitRow.follow_up_date,
          follow_up_note: visitRow.follow_up_note,
          follow_up_reason: visitRow.follow_up_reason,
          created_by: visitRow.created_by,
          patient: patient
            ? {
                id: patient.id,
                full_name: patient.full_name,
                dob: patient.dob,
                sex: patient.sex,
                phone: patient.phone,
              }
            : null,
        },
      });
    }

    let vitals = {};
    let drugs = [];
    try {
      vitals = JSON.parse(String(visitRow.vitals_json || "{}"));
    } catch {}
    try {
      drugs = JSON.parse(String(visitRow.drugs_json || "[]"));
    } catch {}

    let allergies = [];
    try {
      allergies = JSON.parse(String(patient?.allergies_json || "[]"));
    } catch {}

    const visit = {
      ...visitRow,
      vitals,
      drugs,
      patient: patient
        ? {
            ...patient,
            allergies,
          }
        : null,
    };

    return NextResponse.json({ success: true, visit });
  } catch (error: any) {
    console.error("GET /api/visits/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load visit" },
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
    const visitId = params.id;

    const session = await getSessionFromRequest(request);
    if (!session.authenticated || session.user?.role !== "doctor") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only Doctor role can delete visit records" },
        { status: 403 }
      );
    }

    await db.execute({
      sql: "DELETE FROM visits WHERE id = ?",
      args: [visitId],
    });

    return NextResponse.json({ success: true, message: "Visit deleted" });
  } catch (error: any) {
    console.error("DELETE /api/visits/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete visit" },
      { status: 500 }
    );
  }
}
