# CarePoint - Patient Management System

A simple, fast, and mobile-friendly web-based patient management system designed for a single private-practice doctor and reception team.

Built with a calm clinical aesthetic (teal & neutral palette, dark mode support), sentence-case English UI, large touch targets for tablets/phones, and strict clinical safety guardrails.

---

## Roles & Authentication Security

| Role | Access Privileges | Default Demo PIN |
|---|---|---|
| **Doctor** (`Dr. Aruna Perera`) | Full access to clinical notes, diagnoses, vital signs, prescribing with real-time allergy safety checks, first-visit background assessments, and audit logs. | `1234` |
| **Reception** (`Reception Desk`) | Register patients, print ID cards with QR codes, scan/search patients, schedule follow-ups. **Confidential doctor clinical notes, diagnoses, prescribed drugs, vitals, and audit logs are strictly filtered on the server and hidden.** | `5678` |

### Security Architecture
- **Cryptographic Hashing:** PINs are never stored in plain text. Stored using PBKDF2 (`sha512`, 100,000 iterations, 128-bit random salts).
- **No Bypass / Secure Switching:** Role switching to Doctor strictly requires verifying the Doctor PIN.
- **Rate Limiting & Lockout:** Max 5 failed attempts per 15-minute window; enforces automatic lockout upon repeated failures.
- **Forced Default PIN Rotation:** On initial login with default credentials (`1234` or `5678`), the system enforces a mandatory PIN change modal before allowing access to records.
- **Server-Side Role Enforcement:** Server endpoints inspect session tokens on every request. Reception role requests are sanitized at the database layer (clinical notes, diagnoses, drugs, and vitals are stripped from API JSON responses).
- **Session Timeout:** Sessions expire automatically after 8 hours or upon explicit logout.

---

## Core Features & Workflow

### 1. Patient Registration
- Collects **only** demographic and contact information:
  - Full name (required)
  - Date of birth (calculates age automatically)
  - Sex
  - Phone number (normalized to `07XXXXXXXX` format)
  - National ID (NIC)
  - Address
- **Important:** Does **not** ask for allergies or long-term conditions at registration (these are collected by the doctor at the initial clinical visit).
- Automatically assigns sequential unique IDs (`P-0001`, `P-0002`, ...).
- Generates a QR code containing **only** the patient ID.
- Displays a printable patient ID card with a **Print** button.

### 2. Phone Lookup & Shared Numbers
- **Phone Normalization:** Database stores and indexes `phone_normalized` (strips spaces, handles `+94`, `0094`, and `94` international prefixes, standardizing on Sri Lankan 10-digit mobile numbers).
- **Shared Numbers Support:** If multiple family members or related patients share the same phone number (e.g. `P-0001` John Silva and `P-0003` Kasun Perera):
  - A prominent disambiguation banner displays all matching patients with Name, Age, Sex, and ID, requiring the user to select the specific patient.
- **Unregistered Phone Fallback:** If a search by phone yields no match, a quick button offers **"Register new patient with phone [number]"**, prefilling the registration form immediately.

### 3. Scan / Find Patient
- **Camera-based QR / Barcode Scanner:** Uses the device camera (phone, tablet, or webcam) to scan patient cards and immediately open the record. Shows a clear fallback notice if the camera is denied or unavailable.
- **USB Barcode Scanner Support:** The search input automatically captures USB barcode scanners (keyboard input + `Enter`) and immediately jumps to the patient profile.
- Real-time search filter by Patient ID, Name, or Phone.

### 4. Patient Profile
- Header with Patient Name, ID, Age, Sex, Phone, NIC, and Address.
- **Top Allergy Banner:**
  - **Not Assessed Yet:** Neutral yellow banner (*"Allergies not assessed yet"*).
  - **Has Allergies:** Prominent red alert banner detailing allergen, reaction, and severity.
  - **No Known Allergies:** Calm green badge (*"No known allergies"*).
- **Long-term Conditions:** Monitored chronic conditions (or *"Not assessed yet"*).
- **Current Medications:** Active drugs prescribed during the most recent visit (visible to Doctor).
- **Consultation Timeline:** Newest first, showing date, complaint, diagnosis, doctor notes (restricted to Doctor role; masked for reception), drugs prescribed, and follow-up date.
- **Audit Log Trail:** Visible to the doctor, logging who modified allergies/conditions, when, and the reason.

### 5. Doctor Visit Form
- **First-Visit Medical Background Flow:**
  - If the patient has no previous visits, a top section titled **"Medical background (first visit)"** is displayed.
  - The doctor records known allergies (allergen, type: drug/food/other, reaction, severity) or ticks **"No known allergies"**.
  - The doctor records chronic conditions (or ticks **"No chronic conditions"**).
  - This baseline data is validated and saved directly to the patient profile before the consultation can be saved.
  - On subsequent visits, this section is hidden.
- **Consultation Details:** Visit date, presenting complaint, diagnosis, and confidential clinical notes.
- **Vital Signs:** Blood pressure (systolic/diastolic), pulse, weight, temperature, and blood sugar.
- **Prescription Table:** Repeatable rows with Drug Name, Dose, Frequency (`OD`, `BD`, `TDS`, `QDS`, `Nocte`, `SOS`), Duration in days, and Instructions.
- **Real-Time Allergy Safety Warning:** As the doctor types a drug name, the system immediately checks against the patient's recorded drug allergies and displays a prominent **red warning box** if a match is detected.
- **Follow-up Scheduling:** Date picker with quick buttons (`+1 week`, `+2 weeks`, `+1 month`), optional follow-up reason, and instructions note.

### 6. Follow-ups Page
- Chronological list of return appointments.
- Status highlights:
  - **Today:** Highlighted in teal/emerald with a badge.
  - **Overdue:** Highlighted in red with an alert badge.
  - **Upcoming:** Neutral.
- Quick filter tabs: **All**, **Today**, **Overdue**, **Upcoming**, with real-time counts on every tab.
- **Mark Done:** Toggle follow-up completion status directly from the list.
- **Call Button:** One-tap calling (`tel:07XXXXXXXX`) for phones and tablets.
- **WhatsApp Reminder Privacy:**
  - **Strict Medical Privacy Guarantee:** The reminder template contains **only** the patient's first name, appointment date, time, and clinic name. It **never** contains diagnosis, drugs, or allergies.
  - Example: *"Hello John, this is a reminder from CarePoint Medical Practice for your scheduled appointment on 20 Nov 2026 at 10:00 AM. If you need to reschedule, please contact our clinic."*

### 7. Prescription & Patient Card Printing
- Dedicated, clean print layouts formatted specifically for paper output via `@media print`.
- Prescriptions include clinic letterhead placeholders, doctor credentials, patient details, vital signs, allergy warning for dispensing pharmacist, Rx emblem, drugs table, next review date, and doctor's signature line.
- Patient card prints wallet-sized ID cards with the patient QR code.

---

## Production Readiness Guide

### 1. Mandatory Default PIN Rotation
- In production, never retain the default PINs (`1234` for Doctor, `5678` for Reception).
- When any user logs in with a default PIN, the application detects `must_change_pin: 1` and enforces a mandatory modal requiring a custom PIN (minimum 4 digits) before allowing data access.
- You can also change your PIN at any time from the account settings.

### 2. HTTPS & Secure Cookie Enforcement
- **SSL/TLS Requirement:** Clinical data must always be transmitted over encrypted HTTPS in production.
- **Cookie Security:** The application issues session tokens in HTTP-only cookies with `SameSite=Lax` and sets `Secure=true` in production environments, mitigating XSS and CSRF token interception risks.
- **Session Duration:** Idle sessions time out after 8 hours (`Max-Age=28800`).

### 3. Automated Backups Schedule
- In a production environment, implement an automated daily backup:
  ```bash
  # Example daily cron job creating timestamped backup of SQLite database:
  0 2 * * * cp /path/to/clinic.db /backups/clinic-$(date +\%F).db
  ```
- Alternatively, use the built-in **Full JSON Backup Export** in `/backup` at the close of clinic operations and store the encrypted JSON file off-site (e.g. encrypted cloud drive or cold storage).

### 4. Database Region & Latency
- When deploying to serverless platforms (such as Vercel + Turso or Supabase):
  - Choose the primary database region physically closest to your clinic location (e.g., `sin` Singapore or `bom` Mumbai for South Asia / Sri Lanka) to ensure sub-50ms query response times.

### 5. Data Storage Matrix (What is Stored Where)

| Data Category | Table / Location | Security & Role Restrictions |
|---|---|---|
| **Patient Demographics** | `patients` | Accessible to both Doctor and Reception. Search indexed on `phone_normalized`. |
| **Allergies & Conditions** | `patients` (`allergies_json`, `conditions_json`) | Modifiable only by Doctor. Logged in audit trail. |
| **Consultation Notes & Diagnosis** | `visits` (`notes`, `diagnosis`, `vitals_json`, `drugs_json`) | **Strictly Doctor-only.** Stripped by server API for Reception role. |
| **Follow-up Appointments** | `visits` (`follow_up_date`, `follow_up_reason`, `follow_up_completed`) | Date and reasons visible to Reception for scheduling. |
| **User Credentials** | `users` (`pin_hash`, `pin_salt`) | PBKDF2 (SHA-512) hashed with unique 128-bit random salts. Never stored in plain text. |
| **Audit Logs** | `audit_logs` | Immutable audit trail recording timestamps and authors for medical edits. |

---

## Pre-loaded Demo Patients

The system is seeded with 3 representative sample patients:

1. **John Silva (`P-0001`)**
   - **Scenario:** Established patient with recorded **Penicillin allergy** and **Hypertension**. Phone: `0771234567`.
   - **Test:** Open a new visit and type *"Amoxicillin"* or *"Penicillin"* to see the real-time red allergy warning banner.
2. **Sarah Fernando (`P-0002`)**
   - **Scenario:** Assessed with *"No known allergies"*, history of Asthma, and a scheduled follow-up **TODAY**. Phone: `0719876543`.
   - **Test:** Open the `/follow-ups` page to see her appointment highlighted under *Today*. Click *"Mark done"* to toggle status.
3. **Kasun Perera (`P-0003`)**
   - **Scenario:** Newly registered patient with **0 visits** and *"Allergies not assessed yet"*.
   - **Shared Phone Demo:** Seeded with the **same phone number** as John Silva (`0771234567`).
   - **Test 1 (Shared Phone):** Go to `/search` and search `0771234567`. Observe the shared phone disambiguation card showing both John Silva and Kasun Perera.
   - **Test 2 (First Visit Assessment):** Click *"New visit"* on Kasun's profile to experience the mandatory *"Medical background (first visit)"* workflow.

---

## Getting Started

### Prerequisites
- Node.js (v18, v20, v22, or v24)
- npm

### 1. Install Dependencies
```bash
npm install
```

### 2. Seed Database
```bash
npm run seed
```

### 3. Run Automated Tests
```bash
node scripts/test-security.mjs
```

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for Production
```bash
npm run build
npm start
```

---

## Drug Master Catalog & Intelligent Prescribing

CarePoint includes an integrated pharmaceutical formulary and real-time safety autocomplete system:

### 1. Pre-loaded Sri Lankan GP Formulary (~112 Medications)
Seeded with standard clinical formulations:
- **Antibiotics:** Penicillin V, Amoxicillin, Co-amoxiclav, Cephalexin, Cefuroxime, Ciprofloxacin, Azithromycin, Cotrimoxazole, Doxycycline, Metronidazole, etc.
- **Analgesics & NSAIDs:** Paracetamol, Ibuprofen, Diclofenac Sodium, Mefenamic Acid, Tramadol, Naproxen, Celecoxib.
- **Cardiovascular & Metabolic:** Amlodipine, Losartan, Enalapril, Atorvastatin, Rosuvastatin, Metformin, Gliclazide, Empagliflozin, Levothyroxine.
- **Respiratory & Allergy:** Salbutamol inhaler, Beclomethasone inhaler, Cetirizine, Loratadine, Fexofenadine, Montelukast.
- **Gastrointestinal:** Omeprazole, Pantoprazole, Famotidine, Domperidone, Antacid suspension.
- **Dermatology, Antifungals & Antiparasitics:** Fluconazole, Clotrimazole cream, Hydrocortisone, Betamethasone, Albendazole, Mebendazole.

### 2. Autocomplete Prescribing Behavior
- **Prefix-first Ranking:** Suggestions prioritize prefix matches (e.g., typing *"amox"* places *Amoxicillin* before *Co-amoxiclav*), followed by substring matches (up to 8 results).
- **Keyboard Navigation:** Full ARIA combobox support (`ArrowUp`, `ArrowDown`, `Enter` to select, `Esc` to dismiss) and large touch targets.
- **Smart Auto-fill:** On selecting a suggestion, default dose and frequency are auto-filled **only if currently empty**; any values previously entered by the doctor are strictly preserved.
- **Immediate Focus Advance:** Selecting an autocomplete item moves input focus to duration (days).
- **Free-text Prescribing:** Doctors can type unlisted drugs or custom compounding notes without obstruction.

### 3. Drug-Class Cross-Allergy Safety Protection
- **Real-time Cross-Allergy Detection:** Flags direct allergen matches as well as pharmacologic class cross-allergies (e.g., a patient allergic to *Penicillin* is alerted when prescribing *Amoxicillin*, *Penicillin V*, or *Co-amoxiclav* with *"Same class as recorded allergy: Penicillin"*).
- **Dropdown & Prescription Warnings:** Shows an inline red **Allergy** badge in suggestions and a warning banner under the prescription row.
- **Prescription Override Checkbox:** The doctor must confirm *"I have reviewed the allergy warning"* before saving. The override is immutably logged in `audit_logs` (recording practitioner, timestamp, and overridden drugs).

### 4. Auto-Learning Novel Medications & `/drugs` Management Page
- **Auto-Learning:** Prescribing an unlisted drug automatically saves it to the `drugs` table as a `custom` entry (`active = 1`) for future autocomplete suggestions.
- **Doctor-Only Drugs Page (`/drugs`):** Doctors can search medications, filter by status or pharmacological class, add new drugs with default dosing, edit formulations, and deactivate/reactivate entries. Reception staff are strictly restricted (`403 Forbidden`).

### 5. Automated Test Suites
Run the full automated test battery:
```bash
# Drug master, autocomplete ranking, cross-allergy, auto-learning, and role restrictions
node scripts/test-drugs.mjs

# Authentication, phone normalization, session lockout, and API role enforcement
node scripts/test-security.mjs

# End-to-end patient registration, first-visit workflow, and backup exports
node scripts/test-api.mjs
```
