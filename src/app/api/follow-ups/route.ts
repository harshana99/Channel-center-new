import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await initDb();
    const db = getDb();

    const session = await getSessionFromRequest(request);
    const isDoctor = session.authenticated && session.user?.role === "doctor";

    // Query visits that have follow_up_date set
    const result = await db.execute(`
      SELECT 
        v.id AS visit_id,
        v.visit_date,
        v.diagnosis,
        v.follow_up_date,
        v.follow_up_note,
        v.follow_up_reason,
        v.follow_up_completed,
        p.id AS patient_id,
        p.full_name,
        p.phone,
        p.dob,
        p.sex
      FROM visits v
      JOIN patients p ON v.patient_id = p.id
      WHERE v.follow_up_date IS NOT NULL AND v.follow_up_date != ''
      ORDER BY v.follow_up_date ASC
    `);

    const todayStr = new Date().toISOString().split("T")[0];

    const followUps = result.rows.map((row) => {
      const fDate = String(row.follow_up_date);
      const isCompleted = Number(row.follow_up_completed) === 1;

      let status: "overdue" | "today" | "upcoming" = "upcoming";
      if (fDate < todayStr) {
        status = "overdue";
      } else if (fDate === todayStr) {
        status = "today";
      } else {
        status = "upcoming";
      }

      return {
        visit_id: row.visit_id,
        patient_id: row.patient_id,
        full_name: row.full_name,
        phone: row.phone,
        dob: row.dob,
        sex: row.sex,
        visit_date: row.visit_date,
        // If not doctor, diagnosis is omitted for privacy:
        diagnosis: isDoctor ? row.diagnosis : "Consultation follow-up",
        follow_up_date: row.follow_up_date,
        follow_up_note: row.follow_up_note,
        follow_up_reason: row.follow_up_reason,
        follow_up_completed: isCompleted,
        status,
      };
    });

    return NextResponse.json({ success: true, followUps });
  } catch (error: any) {
    console.error("GET /api/follow-ups error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch follow ups" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    await initDb();
    const db = getDb();
    const body = await request.json();
    const { visit_id, completed } = body;

    if (!visit_id) {
      return NextResponse.json(
        { success: false, error: "Visit ID is required" },
        { status: 400 }
      );
    }

    const completedVal = completed ? 1 : 0;
    const now = new Date().toISOString();

    await db.execute({
      sql: `UPDATE visits SET follow_up_completed = ?, updated_at = ? WHERE id = ?`,
      args: [completedVal, now, visit_id],
    });

    return NextResponse.json({
      success: true,
      message: `Follow-up marked as ${completed ? "completed" : "pending"}`,
    });
  } catch (error: any) {
    console.error("PATCH /api/follow-ups error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update follow-up" },
      { status: 500 }
    );
  }
}
