import { createClient, Client } from "@libsql/client";
import path from "path";
import { generateSalt, hashPin } from "./auth";
import { COMMON_SRI_LANKAN_DRUGS } from "./drug-master-data";

let dbInstance: Client | null = null;

export function getDb(): Client {
  if (!dbInstance) {
    if (process.env.LIBSQL_URL) {
      dbInstance = createClient({
        url: process.env.LIBSQL_URL,
        authToken: process.env.LIBSQL_AUTH_TOKEN,
      });
    } else {
      const dbPath = path.resolve(process.cwd(), "clinic.db");
      dbInstance = createClient({
        url: `file:${dbPath}`,
      });
    }
  }
  return dbInstance;
}

export async function initDb(): Promise<void> {
  const db = getDb();
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      dob TEXT DEFAULT '',
      sex TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      phone_normalized TEXT DEFAULT '',
      nic TEXT DEFAULT '',
      address TEXT DEFAULT '',
      allergies_assessed INTEGER DEFAULT 0,
      no_known_allergies INTEGER DEFAULT 0,
      allergies_json TEXT DEFAULT '[]',
      conditions_assessed INTEGER DEFAULT 0,
      no_conditions INTEGER DEFAULT 0,
      conditions_json TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_patients_phone_norm ON patients (phone_normalized);
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS visits (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      visit_date TEXT NOT NULL,
      complaint TEXT DEFAULT '',
      diagnosis TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      vitals_json TEXT DEFAULT '{}',
      drugs_json TEXT DEFAULT '[]',
      follow_up_date TEXT DEFAULT '',
      follow_up_note TEXT DEFAULT '',
      follow_up_reason TEXT DEFAULT '',
      follow_up_completed INTEGER DEFAULT 0,
      created_by TEXT DEFAULT 'Doctor',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      changed_by_name TEXT NOT NULL,
      changed_by_role TEXT NOT NULL,
      change_type TEXT NOT NULL,
      details_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      pin_hash TEXT NOT NULL,
      pin_salt TEXT NOT NULL,
      must_change_pin INTEGER DEFAULT 1,
      updated_at TEXT NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      user_name TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS pin_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT,
      attempted_role TEXT,
      success INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS drugs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      default_dose TEXT DEFAULT '',
      default_frequency TEXT DEFAULT 'OD',
      drug_class TEXT DEFAULT '',
      active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_drugs_name ON drugs (name);
  `);

  // Initialize users with securely hashed default PINs if table empty
  const userCountRes = await db.execute("SELECT COUNT(*) as count FROM users");
  if (Number(userCountRes.rows[0].count) === 0) {
    const docSalt = generateSalt();
    const docHash = hashPin("1234", docSalt);

    const recSalt = generateSalt();
    const recHash = hashPin("5678", recSalt);

    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO users (id, name, role, pin_hash, pin_salt, must_change_pin, updated_at) VALUES 
        ('user-1', 'Dr. Aruna Perera', 'doctor', ?, ?, 1, ?),
        ('user-2', 'Reception Desk', 'reception', ?, ?, 1, ?)`,
      args: [docHash, docSalt, now, recHash, recSalt, now],
    });
  }

  // Seed drugs master list if empty
  const drugCountRes = await db.execute("SELECT COUNT(*) as count FROM drugs");
  if (Number(drugCountRes.rows[0].count) === 0) {
    const now = new Date().toISOString();
    for (let i = 0; i < COMMON_SRI_LANKAN_DRUGS.length; i++) {
      const d = COMMON_SRI_LANKAN_DRUGS[i];
      const drugId = `drug-${String(i + 1).padStart(4, "0")}`;
      await db.execute({
        sql: `INSERT INTO drugs (id, name, default_dose, default_frequency, drug_class, active, created_at)
              VALUES (?, ?, ?, ?, ?, 1, ?)`,
        args: [drugId, d.name, d.default_dose, d.default_frequency, d.drug_class, now],
      });
    }
  }
}
