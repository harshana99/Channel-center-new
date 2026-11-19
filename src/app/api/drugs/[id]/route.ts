import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await initDb();
    const db = getDb();
    const drugId = params.id;
    const session = await getSessionFromRequest(request);

    if (!session.authenticated || session.user?.role !== "doctor") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only Doctor can edit drugs master list" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, default_dose, default_frequency, drug_class, active } = body;

    const existingRes = await db.execute({
      sql: "SELECT * FROM drugs WHERE id = ? LIMIT 1",
      args: [drugId],
    });

    if (existingRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Drug not found" },
        { status: 404 }
      );
    }

    await db.execute({
      sql: `UPDATE drugs SET
        name = COALESCE(?, name),
        default_dose = COALESCE(?, default_dose),
        default_frequency = COALESCE(?, default_frequency),
        drug_class = COALESCE(?, drug_class),
        active = COALESCE(?, active)
        WHERE id = ?`,
      args: [
        name !== undefined ? name.trim() : null,
        default_dose !== undefined ? default_dose.trim() : null,
        default_frequency !== undefined ? default_frequency : null,
        drug_class !== undefined ? drug_class.trim() : null,
        active !== undefined ? (active ? 1 : 0) : null,
        drugId,
      ],
    });

    return NextResponse.json({ success: true, message: "Drug updated successfully" });
  } catch (error: any) {
    console.error("PATCH /api/drugs/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update drug" },
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
    const drugId = params.id;
    const session = await getSessionFromRequest(request);

    if (!session.authenticated || session.user?.role !== "doctor") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only Doctor can deactivate or delete drugs" },
        { status: 403 }
      );
    }

    // Soft delete / deactivate
    await db.execute({
      sql: "UPDATE drugs SET active = 0 WHERE id = ?",
      args: [drugId],
    });

    return NextResponse.json({ success: true, message: "Drug deactivated successfully" });
  } catch (error: any) {
    console.error("DELETE /api/drugs/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to deactivate drug" },
      { status: 500 }
    );
  }
}
