import crypto from "crypto";

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

function checkDrugAllergyMatch(drugInput, allergies) {
  if (!drugInput || drugInput.trim().length < 2 || !allergies || allergies.length === 0) {
    return { hasWarning: false };
  }
  const cleanInput = drugInput.toLowerCase().trim();
  for (const allergy of allergies) {
    if (allergy.type === "drug" || !allergy.type) {
      const cleanAllergen = allergy.allergen.toLowerCase().trim();
      if (cleanInput.includes(cleanAllergen) || cleanAllergen.includes(cleanInput)) {
        return {
          hasWarning: true,
          matchedAllergen: allergy.allergen,
          reaction: allergy.reaction,
          severity: allergy.severity,
        };
      }
    }
  }
  return { hasWarning: false };
}

async function runSecurityTests() {
  console.log("=================================================");
  console.log("   CAREPOINT CLINICAL SECURITY & GAP-FIX TESTS   ");
  console.log("=================================================\n");

  const baseUrl = "http://localhost:3000";

  // -------------------------------------------------------------------------
  // TEST 1: Phone Normalization Unit Tests
  // -------------------------------------------------------------------------
  console.log("TEST 1: Phone Normalization");
  const phoneCases = [
    { input: "+94 77 123 4567", expected: "0771234567" },
    { input: "94771234567", expected: "0771234567" },
    { input: "077-123-4567", expected: "0771234567" },
    { input: "771234567", expected: "0771234567" },
    { input: "0094 71 987 6543", expected: "0719876543" },
  ];

  for (const tc of phoneCases) {
    const res = normalizePhone(tc.input);
    if (res !== tc.expected) {
      throw new Error(`Phone normalization failed for '${tc.input}': got '${res}', expected '${tc.expected}'`);
    }
  }
  console.log("✓ All phone normalization test cases passed (+94, 94, 0094, 9-digit, hyphens/spaces)\n");

  // -------------------------------------------------------------------------
  // TEST 2: Allergy-Drug Real-time Matching Unit Tests
  // -------------------------------------------------------------------------
  console.log("TEST 2: Allergy-Drug Real-time Matching");
  const patientAllergies = [
    { allergen: "Penicillin", type: "drug", severity: "severe", reaction: "Anaphylaxis" },
    { allergen: "Sulfa", type: "drug", severity: "moderate", reaction: "Rash" },
    { allergen: "Peanuts", type: "food", severity: "mild", reaction: "Hives" },
  ];

  const match1 = checkDrugAllergyMatch("Penicillin V Potassium", patientAllergies);
  if (!match1.hasWarning || match1.matchedAllergen !== "Penicillin") {
    throw new Error(`Expected allergy match for Penicillin V Potassium, got: ${JSON.stringify(match1)}`);
  }

  const match2 = checkDrugAllergyMatch("Sulfamethoxazole", patientAllergies);
  if (!match2.hasWarning || match2.matchedAllergen !== "Sulfa") {
    throw new Error(`Expected allergy match for Sulfamethoxazole, got: ${JSON.stringify(match2)}`);
  }

  const match3 = checkDrugAllergyMatch("Paracetamol 500mg", patientAllergies);
  if (match3.hasWarning) {
    throw new Error("Paracetamol should NOT trigger allergy warning for Penicillin/Sulfa!");
  }
  console.log("✓ Allergy-drug matching logic verified (exact & substring matches caught, safe drugs pass)\n");

  // -------------------------------------------------------------------------
  // TEST 3: Authenticate Doctor and Reception
  // -------------------------------------------------------------------------
  console.log("TEST 3: Authentication & Session Issuance");
  const docLogin = await fetch(`${baseUrl}/api/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin: "1234", role: "doctor" }),
  });
  const docData = await docLogin.json();
  if (!docData.success || !docData.token || docData.user.role !== "doctor") {
    throw new Error(`Doctor login failed: ${JSON.stringify(docData)}`);
  }
  const doctorToken = docData.token;
  console.log(`✓ Doctor authenticated. Session token issued: ${doctorToken.substring(0, 12)}...`);

  const recLogin = await fetch(`${baseUrl}/api/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin: "5678", role: "reception" }),
  });
  const recData = await recLogin.json();
  if (!recData.success || !recData.token || recData.user.role !== "reception") {
    throw new Error(`Reception login failed: ${JSON.stringify(recData)}`);
  }
  const receptionToken = recData.token;
  console.log(`✓ Reception authenticated. Session token issued: ${receptionToken.substring(0, 12)}...\n`);

  // -------------------------------------------------------------------------
  // TEST 4: Server-Side Role Enforcement (Reception Data Sanitization)
  // -------------------------------------------------------------------------
  console.log("TEST 4: Server-Side Role Enforcement on API Routes");

  // A. Doctor views P-0001
  const docView = await fetch(`${baseUrl}/api/patients/P-0001`, {
    headers: { Authorization: `Bearer ${doctorToken}` },
  });
  const docViewData = await docView.json();
  const docPatient = docViewData.patient;

  if (!docPatient.visits[0].notes || !docPatient.visits[0].diagnosis || docPatient.visits[0].drugs.length === 0) {
    throw new Error("Doctor should receive clinical notes, diagnosis and drugs!");
  }
  if (!docPatient.auditLogs || docPatient.auditLogs.length === 0) {
    throw new Error("Doctor should receive audit logs!");
  }
  console.log("✓ Doctor received complete medical record (notes, diagnosis, prescribed drugs, audit logs)");

  // B. Reception views P-0001
  const recView = await fetch(`${baseUrl}/api/patients/P-0001`, {
    headers: { Authorization: `Bearer ${receptionToken}` },
  });
  const recViewData = await recView.json();
  const recPatient = recViewData.patient;

  // VERIFY RECEPTION NEVER RECEIVES CLINICAL NOTES, DIAGNOSES, DRUGS, VITALS, OR AUDIT LOGS!
  if (recPatient.visits[0].notes !== "") {
    throw new Error(`SECURITY LEAK: Reception received doctor clinical notes: '${recPatient.visits[0].notes}'`);
  }
  if (recPatient.visits[0].diagnosis !== "") {
    throw new Error(`SECURITY LEAK: Reception received diagnosis: '${recPatient.visits[0].diagnosis}'`);
  }
  if (recPatient.visits[0].drugs.length > 0) {
    throw new Error(`SECURITY LEAK: Reception received prescribed drugs list!`);
  }
  if (Object.keys(recPatient.visits[0].vitals).length > 0) {
    throw new Error(`SECURITY LEAK: Reception received vital signs!`);
  }
  if (recPatient.auditLogs.length > 0) {
    throw new Error(`SECURITY LEAK: Reception received audit logs!`);
  }
  console.log("✓ RECEPTION ROLE STRICTLY SANITIZED: Notes, diagnoses, drugs, vitals & audit logs completely omitted by server!");

  // C. Reception attempts to POST a new visit (Forbidden)
  const recVisitAttempt = await fetch(`${baseUrl}/api/visits`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${receptionToken}`,
    },
    body: JSON.stringify({
      patient_id: "P-0001",
      complaint: "Unauthorized entry attempt",
      diagnosis: "Unauthorized",
    }),
  });
  if (recVisitAttempt.status !== 403) {
    throw new Error(`Expected 403 Forbidden for Reception creating visit, got: ${recVisitAttempt.status}`);
  }
  console.log("✓ Reception blocked from creating visits (403 Forbidden)");

  // D. Reception attempts to modify medical background (Forbidden)
  const recEditAttempt = await fetch(`${baseUrl}/api/patients/P-0001`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${receptionToken}`,
    },
    body: JSON.stringify({
      updateType: "medical_background",
      no_known_allergies: true,
      allergies: [],
    }),
  });
  if (recEditAttempt.status !== 403) {
    throw new Error(`Expected 403 Forbidden for Reception editing medical background, got: ${recEditAttempt.status}`);
  }
  console.log("✓ Reception blocked from editing medical background/allergies (403 Forbidden)\n");

  // -------------------------------------------------------------------------
  // TEST 5: First-Visit Validation
  // -------------------------------------------------------------------------
  console.log("TEST 5: First-Visit Medical Background Validation");

  // Incomplete first visit: missing allergies and missing "No known allergies" checkbox -> must fail 400
  const invalidFirstVisit = await fetch(`${baseUrl}/api/visits`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${doctorToken}`,
    },
    body: JSON.stringify({
      patient_id: "P-0003",
      complaint: "First checkup",
      diagnosis: "Evaluation",
      is_first_visit: true,
      medical_background: {
        no_known_allergies: false,
        allergies: [], // Empty!
        no_conditions: false,
        conditions: [], // Empty!
      },
    }),
  });

  if (invalidFirstVisit.status !== 400) {
    throw new Error(`Expected 400 Bad Request for unassessed first visit, got: ${invalidFirstVisit.status}`);
  }
  const invalidData = await invalidFirstVisit.json();
  console.log(`✓ First-visit validation rejected incomplete submission: "${invalidData.error}"\n`);

  // -------------------------------------------------------------------------
  // TEST 6: Phone Lookup with Shared Numbers
  // -------------------------------------------------------------------------
  console.log("TEST 6: Phone Lookup & Shared Number Disambiguation");
  const phoneSearch = await fetch(`${baseUrl}/api/patients?q=0771234567`);
  const phoneData = await phoneSearch.json();

  if (!phoneData.success || phoneData.patients.length < 2) {
    throw new Error(`Expected at least 2 patients sharing phone 0771234567, got: ${phoneData.patients?.length}`);
  }

  const ids = phoneData.patients.map((p) => p.id);
  if (!ids.includes("P-0001") || !ids.includes("P-0003")) {
    throw new Error(`Expected P-0001 and P-0003 to share phone 0771234567, found: ${ids.join(", ")}`);
  }
  console.log(`✓ Shared number lookup verified: Phone 0771234567 correctly matched ${phoneData.patients.length} patients:`);
  phoneData.patients.forEach((p) => {
    console.log(`   - ${p.id}: ${p.full_name} (${p.sex}, DOB: ${p.dob})`);
  });

  // -------------------------------------------------------------------------
  // TEST 7: Follow-up Status Update ("Mark Done")
  // -------------------------------------------------------------------------
  console.log("\nTEST 7: Follow-up 'Mark Done' Workflow");
  const followUpPatch = await fetch(`${baseUrl}/api/follow-ups`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      visit_id: "V-0003",
      completed: true,
    }),
  });
  const followUpPatchData = await followUpPatch.json();
  if (!followUpPatchData.success) {
    throw new Error(`Failed to mark follow-up as done: ${JSON.stringify(followUpPatchData)}`);
  }
  console.log("✓ Follow-up successfully marked as completed via PATCH /api/follow-ups");

  console.log("\n=================================================");
  console.log("   ALL CLINICAL SECURITY & GAP-FIX TESTS PASSED! ");
  console.log("=================================================");
}

runSecurityTests().catch((err) => {
  console.error("\n❌ Security test failed:", err.message);
  process.exit(1);
});
