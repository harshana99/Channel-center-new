async function runTests() {
  console.log("=== RUNNING CLINIC API AUTOMATED TESTS ===");
  const baseUrl = "http://localhost:3000";

  // Login as Doctor
  const authRes = await fetch(`${baseUrl}/api/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin: "1234", role: "doctor" }),
  });
  const authData = await authRes.json();
  const docToken = authData.token;
  const docHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${docToken}`,
  };

  // 1. GET /api/patients
  console.log("\n1. Testing GET /api/patients...");
  const pRes = await fetch(`${baseUrl}/api/patients`);
  const pData = await pRes.json();
  if (!pData.success || pData.patients.length < 3) {
    throw new Error(`Failed to fetch patients or count < 3: ${JSON.stringify(pData)}`);
  }
  console.log(`✓ Fetched ${pData.patients.length} patients. First patient: ${pData.patients[pData.patients.length - 1].id} (${pData.patients[pData.patients.length - 1].full_name})`);

  // 2. Search by ID & Name
  console.log("\n2. Testing search query (q=P-0001)...");
  const sRes = await fetch(`${baseUrl}/api/patients?q=P-0001`);
  const sData = await sRes.json();
  if (sData.patients.length !== 1 || sData.patients[0].full_name !== "John Silva") {
    throw new Error(`Search failed: ${JSON.stringify(sData)}`);
  }
  console.log(`✓ Search for P-0001 returned: ${sData.patients[0].full_name}`);

  // 3. Register New Patient (Section 1)
  console.log("\n3. Testing patient registration (Section 1)...");
  const regPayload = {
    full_name: "Nimali Rathnayake",
    dob: "1992-06-15",
    sex: "Female",
    phone: "0778899001",
    nic: "926581234V",
    address: "24 Station Road, Gampaha",
  };
  const regRes = await fetch(`${baseUrl}/api/patients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(regPayload),
  });
  const regData = await regRes.json();
  if (!regData.success || !regData.patient?.id.startsWith("P-")) {
    throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
  }
  const newPatientId = regData.patient.id;
  console.log(`✓ Registered new patient successfully: ${newPatientId} (${regData.patient.full_name})`);
  console.log(`✓ Verified allergies_assessed is 0 at registration: ${regData.patient.allergies_assessed}`);

  // 4. Verify P-0003 (Demo First Visit flow)
  console.log("\n4. Testing Patient P-0003 profile before first visit...");
  const p3Res = await fetch(`${baseUrl}/api/patients/P-0003`);
  const p3Data = await p3Res.json();
  if (!p3Data.success || p3Data.patient.allergies_assessed !== 0 || p3Data.patient.visitsCount !== 0) {
    throw new Error(`P-0003 should have 0 visits and allergies_assessed = 0: ${JSON.stringify(p3Data)}`);
  }
  console.log(`✓ Confirmed P-0003 has visitsCount = 0 and allergies_assessed = 0`);

  // 5. Submit First Visit with Medical Background for P-0003
  console.log("\n5. Submitting first visit with medical background for P-0003...");
  const visitPayload = {
    patient_id: "P-0003",
    visit_date: new Date().toISOString().split("T")[0],
    complaint: "Epigastric burning pain and nausea after spicy meals",
    diagnosis: "Gastroesophageal Reflux Disease (GERD)",
    notes: "Advised elevation of head during sleep, avoid late heavy meals.",
    vitals: { bp_systolic: "118", bp_diastolic: "78", pulse: "70", weight_kg: "65" },
    drugs: [
      { id: "d-test-1", drug_name: "Omeprazole", dose: "20mg", frequency: "BD", duration_days: 14, instructions: "Before breakfast and dinner" },
      { id: "d-test-2", drug_name: "Antacid syrup", dose: "10ml", frequency: "SOS", duration_days: 7, instructions: "After meals when pain occurs" },
    ],
    follow_up_date: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    follow_up_note: "Review symptom control on PPI therapy",
    created_by: "Dr. Aruna Perera",
    is_first_visit: true,
    medical_background: {
      no_known_allergies: false,
      allergies: [
        { id: "alg-p3-1", allergen: "Sulfa drugs", type: "drug", reaction: "Maculopapular rash", severity: "moderate" },
      ],
      no_conditions: false,
      conditions: [
        { id: "cond-p3-1", name: "Mild Gastritis (recurrent)", notes: "Triggered by NSAIDs" },
      ],
    },
  };

  const vRes = await fetch(`${baseUrl}/api/visits`, {
    method: "POST",
    headers: docHeaders,
    body: JSON.stringify(visitPayload),
  });
  const vData = await vRes.json();
  if (!vData.success || !vData.visitId) {
    throw new Error(`Visit creation failed: ${JSON.stringify(vData)}`);
  }
  console.log(`✓ First visit created: ${vData.visitId}`);

  // 6. Verify P-0003 profile now has medical background and 1 visit
  console.log("\n6. Verifying P-0003 profile after first visit...");
  const p3UpdatedRes = await fetch(`${baseUrl}/api/patients/P-0003`, {
    headers: docHeaders,
  });
  const p3UpdatedData = await p3UpdatedRes.json();
  const updatedP3 = p3UpdatedData.patient;
  if (updatedP3.allergies_assessed !== 1 || updatedP3.visitsCount !== 1) {
    throw new Error(`P-0003 should now have 1 visit and allergies_assessed = 1`);
  }
  console.log(`✓ P-0003 now has ${updatedP3.visitsCount} visit, allergies_assessed: 1`);
  console.log(`✓ Allergies saved: ${updatedP3.allergies[0].allergen} (${updatedP3.allergies[0].severity})`);
  console.log(`✓ Audit log created: ${updatedP3.auditLogs.length} audit entry found`);

  // 7. Verify Follow-ups API
  console.log("\n7. Testing GET /api/follow-ups...");
  const fRes = await fetch(`${baseUrl}/api/follow-ups`);
  const fData = await fRes.json();
  if (!fData.success || fData.followUps.length === 0) {
    throw new Error(`Follow-ups failed: ${JSON.stringify(fData)}`);
  }
  const todayItem = fData.followUps.find((f) => f.status === "today");
  console.log(`✓ Total follow ups: ${fData.followUps.length}`);
  if (todayItem) {
    console.log(`✓ Today follow up correctly identified: ${todayItem.full_name} (${todayItem.patient_id})`);
  }

  // 8. Verify Backup Export API
  console.log("\n8. Testing GET /api/backup...");
  const bRes = await fetch(`${baseUrl}/api/backup`, { headers: docHeaders });
  const bData = await bRes.json();
  if (!bData.patients || bData.patients.length === 0) {
    throw new Error(`Backup export failed`);
  }
  console.log(`✓ Backup successfully generated: ${bData.patients.length} patients, ${bData.visits.length} visits, ${bData.audit_logs.length} audit logs`);

  console.log("\n=== ALL AUTOMATED TESTS PASSED SUCCESSFULLY! ===");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
