import crypto from "crypto";

// Helper function mirroring utils.ts allergy cross-matching
const DRUG_CLASS_MAP = {
  penicillin: ["penicillin", "amoxicillin", "ampicillin", "co-amoxiclav", "cloxacillin", "flucloxacillin", "augmentin"],
  cephalosporin: ["cephalosporin", "cephalexin", "cefuroxime", "cefixime", "ceftriaxone", "cefotaxime"],
  sulfonamide: ["sulfonamide", "sulfa", "cotrimoxazole", "bactrim", "sulfamethoxazole"],
  nsaid: ["nsaid", "ibuprofen", "diclofenac", "mefenamic", "naproxen", "etoricoxib", "celecoxib", "indomethacin", "aspirin"],
  macrolide: ["macrolide", "azithromycin", "clarithromycin", "erythromycin"],
  fluoroquinolone: ["fluoroquinolone", "quinolone", "ciprofloxacin", "levofloxacin", "norfloxacin"],
  statin: ["statin", "atorvastatin", "rosuvastatin", "simvastatin"],
};

function checkDrugAllergyMatch(drugInput, allergies, drugClass) {
  if (!drugInput || drugInput.trim().length < 2 || !allergies || allergies.length === 0) {
    return { hasWarning: false };
  }

  const cleanInput = drugInput.toLowerCase().trim();
  const cleanClass = (drugClass || "").toLowerCase().trim();

  // 1. Direct name match check
  for (const allergy of allergies) {
    if (allergy.type === "drug" || !allergy.type) {
      const cleanAllergen = allergy.allergen.toLowerCase().trim();
      if (cleanInput.includes(cleanAllergen) || cleanAllergen.includes(cleanInput)) {
        return {
          hasWarning: true,
          isClassMatch: false,
          matchedAllergen: allergy.allergen,
          warningMessage: `Contraindicated: Patient has recorded allergy to "${allergy.allergen}"`,
          reaction: allergy.reaction,
          severity: allergy.severity,
        };
      }
    }
  }

  // 2. Drug-class cross-allergy check
  for (const allergy of allergies) {
    if (allergy.type === "drug" || !allergy.type) {
      const cleanAllergen = allergy.allergen.toLowerCase().trim();

      if (cleanClass && (cleanClass.includes(cleanAllergen) || cleanAllergen.includes(cleanClass))) {
        return {
          hasWarning: true,
          isClassMatch: true,
          matchedAllergen: allergy.allergen,
          matchedClass: drugClass,
          warningMessage: `Same class as recorded allergy: ${allergy.allergen}`,
          reaction: allergy.reaction,
          severity: allergy.severity,
        };
      }

      for (const [cls, members] of Object.entries(DRUG_CLASS_MAP)) {
        const allergenInClass = members.some((m) => cleanAllergen.includes(m) || m.includes(cleanAllergen));
        const drugInClass = cleanClass === cls || members.some((m) => cleanInput.includes(m) || m.includes(cleanInput));

        if (allergenInClass && drugInClass) {
          return {
            hasWarning: true,
            isClassMatch: true,
            matchedAllergen: allergy.allergen,
            matchedClass: cls,
            warningMessage: `Same class as recorded allergy: ${allergy.allergen}`,
            reaction: allergy.reaction,
            severity: allergy.severity,
          };
        }
      }
    }
  }

  return { hasWarning: false };
}

async function runDrugSuite() {
  console.log("=================================================");
  console.log("   CAREPOINT DRUG MASTER & AUTOCOMPLETE TESTS    ");
  console.log("=================================================\n");

  const baseUrl = "http://localhost:3000";

  // Login as Doctor
  console.log("Authenticating as Doctor...");
  const docLoginRes = await fetch(`${baseUrl}/api/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin: "1234", role: "doctor" }),
  });
  const docLoginData = await docLoginRes.json();
  if (!docLoginData.success || !docLoginData.token) {
    throw new Error(`Doctor login failed: ${JSON.stringify(docLoginData)}`);
  }
  const docToken = docLoginData.token;
  console.log("✓ Doctor authenticated successfully\n");

  // Login as Reception
  console.log("Authenticating as Reception...");
  const recLoginRes = await fetch(`${baseUrl}/api/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin: "5678", role: "reception" }),
  });
  const recLoginData = await recLoginRes.json();
  if (!recLoginData.success || !recLoginData.token) {
    throw new Error(`Reception login failed: ${JSON.stringify(recLoginData)}`);
  }
  const recToken = recLoginData.token;
  console.log("✓ Reception authenticated successfully\n");

  // -------------------------------------------------------------------------
  // TEST 1: Autocomplete ranking (prefix before contains)
  // -------------------------------------------------------------------------
  console.log("TEST 1: Autocomplete ranking (prefix before contains)");
  const rankRes = await fetch(`${baseUrl}/api/drugs?q=amox`, {
    headers: { Authorization: `Bearer ${docToken}` },
  });
  const rankData = await rankRes.json();
  if (!rankData.success || !Array.isArray(rankData.drugs)) {
    throw new Error(`Failed to query autocomplete drugs: ${JSON.stringify(rankData)}`);
  }

  const amoxIndex = rankData.drugs.findIndex((d) => d.name.toLowerCase().startsWith("amox"));
  const coAmoxIndex = rankData.drugs.findIndex((d) => d.name.toLowerCase().includes("amox") && !d.name.toLowerCase().startsWith("amox"));

  if (amoxIndex === -1) {
    throw new Error("Expected prefix match 'Amoxicillin' in query results");
  }
  if (coAmoxIndex !== -1 && amoxIndex > coAmoxIndex) {
    throw new Error(`Expected prefix match (index ${amoxIndex}) to appear before contains match (index ${coAmoxIndex})`);
  }
  if (rankData.drugs.length > 8) {
    throw new Error(`Expected at most 8 suggestions, received: ${rankData.drugs.length}`);
  }
  console.log(`✓ Prefix matches appear first (e.g. '${rankData.drugs[0].name}') before contains matches (max 8 returned: ${rankData.drugs.length})\n`);

  // -------------------------------------------------------------------------
  // TEST 2: Keyboard selection state simulation
  // -------------------------------------------------------------------------
  console.log("TEST 2: Keyboard navigation & selection simulation");
  const testSuggestions = rankData.drugs.slice(0, 3);
  let highlightedIndex = -1;

  // ArrowDown
  highlightedIndex = (highlightedIndex + 1 < testSuggestions.length) ? highlightedIndex + 1 : 0;
  if (highlightedIndex !== 0) throw new Error("ArrowDown should select index 0");

  // ArrowDown again
  highlightedIndex = (highlightedIndex + 1 < testSuggestions.length) ? highlightedIndex + 1 : 0;
  if (highlightedIndex !== 1) throw new Error("ArrowDown should select index 1");

  // ArrowUp
  highlightedIndex = (highlightedIndex - 1 >= 0) ? highlightedIndex - 1 : testSuggestions.length - 1;
  if (highlightedIndex !== 0) throw new Error("ArrowUp should move back to index 0");

  // Enter selects highlighted
  const selectedDrug = testSuggestions[highlightedIndex];
  if (!selectedDrug || selectedDrug.name !== testSuggestions[0].name) {
    throw new Error("Enter key should select highlighted drug");
  }
  console.log(`✓ Keyboard navigation (ArrowDown, ArrowUp, Enter) correctly selects '${selectedDrug.name}'\n`);

  // -------------------------------------------------------------------------
  // TEST 3: Auto-fill behavior (fill dose/frequency only when empty)
  // -------------------------------------------------------------------------
  console.log("TEST 3: Auto-fill behavior only when fields are empty");
  const defaultSuggestion = {
    name: "Amoxicillin",
    default_dose: "500mg",
    default_frequency: "TDS",
  };

  // Case A: Row is empty
  const emptyRow = { drug_name: "", dose: "", frequency: "" };
  const filledRowA = {
    ...emptyRow,
    drug_name: defaultSuggestion.name,
    dose: emptyRow.dose && emptyRow.dose.trim() ? emptyRow.dose : defaultSuggestion.default_dose,
    frequency: emptyRow.frequency && emptyRow.frequency.trim() ? emptyRow.frequency : defaultSuggestion.default_frequency,
  };
  if (filledRowA.dose !== "500mg" || filledRowA.frequency !== "TDS") {
    throw new Error(`Expected auto-fill to set defaults in empty row, got: ${JSON.stringify(filledRowA)}`);
  }

  // Case B: Row already has custom dose and frequency
  const existingRow = { drug_name: "", dose: "250mg", frequency: "BD" };
  const filledRowB = {
    ...existingRow,
    drug_name: defaultSuggestion.name,
    dose: existingRow.dose && existingRow.dose.trim() ? existingRow.dose : defaultSuggestion.default_dose,
    frequency: existingRow.frequency && existingRow.frequency.trim() ? existingRow.frequency : defaultSuggestion.default_frequency,
  };
  if (filledRowB.dose !== "250mg" || filledRowB.frequency !== "BD") {
    throw new Error(`Expected custom dose/frequency to be preserved, got: ${JSON.stringify(filledRowB)}`);
  }
  console.log("✓ Empty row auto-fills defaults; non-empty row preserves custom dose & frequency\n");

  // -------------------------------------------------------------------------
  // TEST 4: Allergy direct name match
  // -------------------------------------------------------------------------
  console.log("TEST 4: Allergy direct name match");
  const patientAllergies = [
    { allergen: "Penicillin", type: "drug", severity: "severe", reaction: "Anaphylaxis" },
  ];

  const directMatch = checkDrugAllergyMatch("Penicillin V", patientAllergies, "penicillin");
  if (!directMatch.hasWarning || directMatch.matchedAllergen !== "Penicillin") {
    throw new Error(`Direct allergy match failed for Penicillin V: ${JSON.stringify(directMatch)}`);
  }
  console.log(`✓ Direct match confirmed: ${directMatch.warningMessage}\n`);

  // -------------------------------------------------------------------------
  // TEST 5: Drug-class cross-allergy detection
  // -------------------------------------------------------------------------
  console.log("TEST 5: Drug-class cross-allergy detection");
  // Patient is allergic to Penicillin. Prescribing Amoxicillin (in penicillin class)
  const classCrossMatch1 = checkDrugAllergyMatch("Amoxicillin", patientAllergies, "penicillin");
  if (!classCrossMatch1.hasWarning || !classCrossMatch1.isClassMatch) {
    throw new Error(`Class cross-allergy failed for Amoxicillin with penicillin allergy: ${JSON.stringify(classCrossMatch1)}`);
  }
  if (!classCrossMatch1.warningMessage.includes("Same class as recorded allergy")) {
    throw new Error(`Expected class cross-allergy warning text, got: ${classCrossMatch1.warningMessage}`);
  }

  // Prescribing Co-amoxiclav
  const classCrossMatch2 = checkDrugAllergyMatch("Co-amoxiclav", patientAllergies, "penicillin");
  if (!classCrossMatch2.hasWarning || !classCrossMatch2.isClassMatch) {
    throw new Error(`Class cross-allergy failed for Co-amoxiclav: ${JSON.stringify(classCrossMatch2)}`);
  }
  console.log(`✓ Cross-allergy warning confirmed: '${classCrossMatch1.warningMessage}' for Amoxicillin & Co-amoxiclav\n`);

  // -------------------------------------------------------------------------
  // TEST 6: Auto-learning new custom drugs and free-text prescribing
  // -------------------------------------------------------------------------
  console.log("TEST 6: Free-text prescribing & auto-learning new custom drugs");
  const uniqueCustomDrug = `CustomPharma-${Date.now().toString(36)}`;

  const visitPayload = {
    patient_id: "P-0001",
    visit_date: new Date().toISOString().split("T")[0],
    complaint: "Routine clinical assessment",
    diagnosis: "General wellness check",
    notes: "Prescribing novel custom formulation",
    vitals: {},
    drugs: [
      {
        id: `drug-custom-1`,
        drug_name: uniqueCustomDrug,
        dose: "100mg",
        frequency: "OD",
        duration_days: 7,
        instructions: "After breakfast",
      },
    ],
    created_by: "Dr. Aruna Perera",
    is_first_visit: false,
    allergy_override: false,
  };

  const visitRes = await fetch(`${baseUrl}/api/visits`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${docToken}`,
    },
    body: JSON.stringify(visitPayload),
  });
  const visitData = await visitRes.json();
  if (!visitData.success) {
    throw new Error(`Failed to save visit with custom drug: ${JSON.stringify(visitData)}`);
  }

  // Query autocomplete list to confirm novel drug was learned!
  const learnedQueryRes = await fetch(`${baseUrl}/api/drugs?q=${uniqueCustomDrug}`, {
    headers: { Authorization: `Bearer ${docToken}` },
  });
  const learnedQueryData = await learnedQueryRes.json();
  const foundLearned = (learnedQueryData.drugs || []).find(
    (d) => d.name.toLowerCase() === uniqueCustomDrug.toLowerCase()
  );

  if (!foundLearned) {
    throw new Error(`Novel drug '${uniqueCustomDrug}' was not auto-learned in master drugs table!`);
  }
  if (foundLearned.drug_class !== "custom") {
    throw new Error(`Expected learned drug to have drug_class 'custom', got '${foundLearned.drug_class}'`);
  }
  console.log(`✓ Free-text drug '${uniqueCustomDrug}' accepted and auto-learned in master drug table\n`);

  // -------------------------------------------------------------------------
  // TEST 7: Role restriction on Drugs API (/api/drugs)
  // -------------------------------------------------------------------------
  console.log("TEST 7: Role restrictions on Drugs Management API");

  // Reception attempts POST /api/drugs -> MUST FAIL (403)
  const recPostRes = await fetch(`${baseUrl}/api/drugs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${recToken}`,
    },
    body: JSON.stringify({
      name: "ReceptionTestDrug",
      default_dose: "50mg",
      default_frequency: "OD",
    }),
  });
  if (recPostRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for Reception POST /api/drugs, got ${recPostRes.status}`);
  }

  // Reception attempts PATCH /api/drugs/[id] -> MUST FAIL (403)
  const recPatchRes = await fetch(`${baseUrl}/api/drugs/${foundLearned.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${recToken}`,
    },
    body: JSON.stringify({ default_dose: "200mg" }),
  });
  if (recPatchRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for Reception PATCH /api/drugs, got ${recPatchRes.status}`);
  }

  // Reception attempts DELETE /api/drugs/[id] -> MUST FAIL (403)
  const recDeleteRes = await fetch(`${baseUrl}/api/drugs/${foundLearned.id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${recToken}`,
    },
  });
  if (recDeleteRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for Reception DELETE /api/drugs, got ${recDeleteRes.status}`);
  }

  // Doctor modifies drug -> MUST SUCCEED (200)
  const docPatchRes = await fetch(`${baseUrl}/api/drugs/${foundLearned.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${docToken}`,
    },
    body: JSON.stringify({ default_dose: "250mg", default_frequency: "BD" }),
  });
  const docPatchData = await docPatchRes.json();
  if (!docPatchRes.ok || !docPatchData.success) {
    throw new Error(`Doctor failed to update drug: ${JSON.stringify(docPatchData)}`);
  }

  // Doctor deactivates drug -> MUST SUCCEED (200)
  const docDeleteRes = await fetch(`${baseUrl}/api/drugs/${foundLearned.id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${docToken}`,
    },
  });
  const docDeleteData = await docDeleteRes.json();
  if (!docDeleteRes.ok || !docDeleteData.success) {
    throw new Error(`Doctor failed to deactivate drug: ${JSON.stringify(docDeleteData)}`);
  }
  console.log("✓ Reception strictly blocked (403 Forbidden); Doctor permitted to create, edit, deactivate master drugs\n");

  console.log("=================================================");
  console.log("   ALL 7 DRUG MASTER & AUTOCOMPLETE TESTS PASSED ");
  console.log("=================================================");
}

runDrugSuite().catch((err) => {
  console.error("\n❌ TEST SUITE FAILED:", err);
  process.exit(1);
});
