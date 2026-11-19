import { createClient } from "@libsql/client";
import path from "path";
import crypto from "crypto";
import { COMMON_SRI_LANKAN_DRUGS } from "../src/lib/drug-master-data.mjs";

function generateSalt() {
  return crypto.randomBytes(16).toString("hex");
}

function hashPin(pin, salt) {
  return crypto.pbkdf2Sync(pin.trim(), salt, 100000, 64, "sha512").toString("hex");
}

function normalizePhone(raw) {
  if (!raw) return "";
  let digits = raw.replace(/\D/g, "");
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

async function seed() {
  const dbPath = path.resolve(process.cwd(), "clinic.db");
  const db = createClient({
    url: process.env.LIBSQL_URL || `file:${dbPath}`,
    authToken: process.env.LIBSQL_AUTH_TOKEN,
  });

  console.log("Setting up database tables with security schema...");

  // Drop and recreate tables for clean migration
  await db.execute("DROP TABLE IF EXISTS drugs");
  await db.execute("DROP TABLE IF EXISTS pin_attempts");
  await db.execute("DROP TABLE IF EXISTS sessions");
  await db.execute("DROP TABLE IF EXISTS audit_logs");
  await db.execute("DROP TABLE IF EXISTS visits");
  await db.execute("DROP TABLE IF EXISTS patients");
  await db.execute("DROP TABLE IF EXISTS users");

  await db.execute(`
    CREATE TABLE patients (
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
    CREATE INDEX idx_patients_phone_norm ON patients (phone_normalized);
  `);

  await db.execute(`
    CREATE TABLE visits (
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
    CREATE TABLE audit_logs (
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
    CREATE TABLE users (
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
    CREATE TABLE sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      user_name TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE pin_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT,
      attempted_role TEXT,
      success INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE drugs (
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
    CREATE INDEX idx_drugs_name ON drugs (name);
  `);

  const now = new Date().toISOString();

  // Seed Users with hashed PINs and must_change_pin = 1
  const docSalt = generateSalt();
  const docHash = hashPin("1234", docSalt);

  const recSalt = generateSalt();
  const recHash = hashPin("5678", recSalt);

  await db.execute({
    sql: `INSERT INTO users (id, name, role, pin_hash, pin_salt, must_change_pin, updated_at) VALUES 
      ('user-1', 'Dr. Aruna Perera', 'doctor', ?, ?, 1, ?),
      ('user-2', 'Reception Desk', 'reception', ?, ?, 1, ?)`,
    args: [docHash, docSalt, now, recHash, recSalt, now],
  });

  const daysAgo = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split("T")[0];
  };
  const daysFromNow = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().split("T")[0];
  };

  const todayStr = new Date().toISOString().split("T")[0];

  // Patient 1: John Silva (Phone: 0771234567)
  const p1Allergies = [
    {
      id: "alg-1",
      allergen: "Penicillin",
      type: "drug",
      reaction: "Severe hives, facial angioedema and shortness of breath",
      severity: "severe",
    },
    {
      id: "alg-2",
      allergen: "Peanuts",
      type: "food",
      reaction: "Oral itching and mild erythema",
      severity: "mild",
    },
  ];
  const p1Conditions = [
    { id: "c-1", name: "Hypertension (diagnosed 2021)", notes: "Monitored on Amlodipine" },
    { id: "c-2", name: "Hyperlipidemia", notes: "Diet controlled" },
  ];

  await db.execute({
    sql: `INSERT INTO patients (id, full_name, dob, sex, phone, phone_normalized, nic, address, allergies_assessed, no_known_allergies, allergies_json, conditions_assessed, no_conditions, conditions_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      "P-0001",
      "John Silva",
      "1985-04-12",
      "Male",
      "0771234567",
      normalizePhone("0771234567"),
      "851029384V",
      "14/2 Galle Road, Colombo 03",
      1,
      0,
      JSON.stringify(p1Allergies),
      1,
      0,
      JSON.stringify(p1Conditions),
      daysAgo(90),
      daysAgo(14),
    ],
  });

  // Patient 1 Visit 1
  await db.execute({
    sql: `INSERT INTO visits (id, patient_id, visit_date, complaint, diagnosis, notes, vitals_json, drugs_json, follow_up_date, follow_up_note, follow_up_reason, follow_up_completed, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      "V-0001",
      "P-0001",
      daysAgo(90),
      "Occasional occipital morning headache and mild dizziness for 2 weeks",
      "Essential Hypertension - Stage 1",
      "Patient advised on sodium restriction and daily 30-min brisk walk. Warned to avoid sudden cessation of antihypertensive therapy.",
      JSON.stringify({ bp_systolic: "148", bp_diastolic: "94", pulse: "78", weight_kg: "82", temperature_c: "36.7", blood_sugar_mg: "104" }),
      JSON.stringify([
        { id: "d-1", drug_name: "Amlodipine", dose: "5mg", frequency: "OD", duration_days: 30, instructions: "Morning after breakfast" },
        { id: "d-2", drug_name: "Paracetamol", dose: "500mg", frequency: "SOS", duration_days: 5, instructions: "When headache occurs" },
      ]),
      daysAgo(60),
      "Review BP response and symptom resolution",
      "BP medication titration",
      1, // completed
      "Dr. Aruna Perera",
      daysAgo(90),
      daysAgo(90),
    ],
  });

  // Patient 1 Visit 2
  await db.execute({
    sql: `INSERT INTO visits (id, patient_id, visit_date, complaint, diagnosis, notes, vitals_json, drugs_json, follow_up_date, follow_up_note, follow_up_reason, follow_up_completed, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      "V-0002",
      "P-0001",
      daysAgo(14),
      "Routine follow up. Headaches resolved. Good compliance with morning medication.",
      "Controlled Essential Hypertension",
      "Target BP achieved (<130/85). Tolerating amlodipine with no ankle edema. Continue current dose for 60 days.",
      JSON.stringify({ bp_systolic: "126", bp_diastolic: "82", pulse: "72", weight_kg: "81", temperature_c: "36.6", blood_sugar_mg: "" }),
      JSON.stringify([
        { id: "d-3", drug_name: "Amlodipine", dose: "5mg", frequency: "OD", duration_days: 60, instructions: "Morning after meal" },
      ]),
      daysFromNow(14),
      "Routine BP and lipid profile review",
      "Hypertension monitoring",
      0, // pending upcoming
      "Dr. Aruna Perera",
      daysAgo(14),
      daysAgo(14),
    ],
  });

  // Patient 2: Sarah Fernando (Phone: 0719876543)
  const p2Conditions = [
    { id: "c-3", name: "Bronchial Asthma (mild persistent)", notes: "Triggered by cold weather and dust" },
  ];

  await db.execute({
    sql: `INSERT INTO patients (id, full_name, dob, sex, phone, phone_normalized, nic, address, allergies_assessed, no_known_allergies, allergies_json, conditions_assessed, no_conditions, conditions_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      "P-0002",
      "Sarah Fernando",
      "1996-09-24",
      "Female",
      "0719876543",
      normalizePhone("0719876543"),
      "199678401234",
      "45 Park Street, Kandy",
      1,
      1,
      "[]",
      1,
      0,
      JSON.stringify(p2Conditions),
      daysAgo(21),
      daysAgo(21),
    ],
  });

  // Patient 2 Visit 1 with follow-up set to TODAY
  await db.execute({
    sql: `INSERT INTO visits (id, patient_id, visit_date, complaint, diagnosis, notes, vitals_json, drugs_json, follow_up_date, follow_up_note, follow_up_reason, follow_up_completed, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      "V-0003",
      "P-0002",
      daysAgo(21),
      "Dry cough and nocturnal wheezing for 4 days after dust exposure",
      "Acute mild asthma exacerbation",
      "Chest clear with bilateral expiratory rhonchi. SpO2 98% room air. Advised proper inhaler technique and spacer use.",
      JSON.stringify({ bp_systolic: "115", bp_diastolic: "75", pulse: "84", weight_kg: "58", temperature_c: "36.8", blood_sugar_mg: "" }),
      JSON.stringify([
        { id: "d-4", drug_name: "Salbutamol Inhaler (100mcg)", dose: "2 puffs", frequency: "SOS", duration_days: 30, instructions: "Inhale when wheezing occurs" },
        { id: "d-5", drug_name: "Montelukast", dose: "10mg", frequency: "Nocte", duration_days: 21, instructions: "At night with water" },
        { id: "d-6", drug_name: "Cetirizine", dose: "10mg", frequency: "Nocte", duration_days: 7, instructions: "At night if allergy flare" },
      ]),
      todayStr, // TODAY!
      "Review asthma control and night symptoms",
      "Asthma flare follow-up",
      0, // not completed
      "Dr. Aruna Perera",
      daysAgo(21),
      daysAgo(21),
    ],
  });

  // Patient 3: Kasun Perera (Phone: SAME as John Silva "0771234567" to demo shared phone numbers!)
  // 0 visits, allergies_assessed = 0
  await db.execute({
    sql: `INSERT INTO patients (id, full_name, dob, sex, phone, phone_normalized, nic, address, allergies_assessed, no_known_allergies, allergies_json, conditions_assessed, no_conditions, conditions_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      "P-0003",
      "Kasun Perera",
      "2001-11-05",
      "Male",
      "0771234567",
      normalizePhone("0771234567"), // Shared with John Silva!
      "200181903456",
      "88 Lake Road, Negombo",
      0,
      0,
      "[]",
      0,
      0,
      "[]",
      daysAgo(1),
      daysAgo(1),
    ],
  });

  // Audit log for Patient 1
  await db.execute({
    sql: `INSERT INTO audit_logs (id, patient_id, changed_by_name, changed_by_role, change_type, details_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      "aud-1",
      "P-0001",
      "Dr. Aruna Perera",
      "doctor",
      "first_visit_assessment",
      JSON.stringify({
        allergies: p1Allergies,
        conditions: p1Conditions,
        note: "Initial medical background recorded at first consultation",
      }),
      daysAgo(90),
    ],
  });

  // Seed drugs master list
  for (let i = 0; i < COMMON_SRI_LANKAN_DRUGS.length; i++) {
    const d = COMMON_SRI_LANKAN_DRUGS[i];
    const drugId = `drug-${String(i + 1).padStart(4, "0")}`;
    await db.execute({
      sql: `INSERT INTO drugs (id, name, default_dose, default_frequency, drug_class, active, created_at)
            VALUES (?, ?, ?, ?, ?, 1, ?)`,
      args: [drugId, d.name, d.default_dose, d.default_frequency, d.drug_class, now],
    });
  }

  console.log(`Database seeded successfully with ${COMMON_SRI_LANKAN_DRUGS.length} master drugs, security schema and shared phone demonstration!`);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
