"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Stethoscope,
  AlertTriangle,
  Plus,
  Trash2,
  Calendar,
  Clock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Activity,
  Heart,
  Thermometer,
  Scale,
  Droplet,
  Pill,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AllergyItem, ConditionItem, PrescribedDrug, DrugFrequency } from "@/lib/types";
import { checkDrugAllergyMatch, calculateAge } from "@/lib/utils";
import { DrugAutocompleteInput } from "@/components/DrugAutocompleteInput";

export default function NewVisitPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;
  const { isDoctor, userName, token } = useAuth();

  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Visit details
  const todayStr = new Date().toISOString().split("T")[0];
  const [visitDate, setVisitDate] = useState(todayStr);
  const [complaint, setComplaint] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");

  // Vitals
  const [vitals, setVitals] = useState({
    bp_systolic: "",
    bp_diastolic: "",
    pulse: "",
    weight_kg: "",
    temperature_c: "",
    blood_sugar_mg: "",
  });

  // Prescribed drugs
  const [drugs, setDrugs] = useState<PrescribedDrug[]>([
    {
      id: `drug-${Date.now()}-1`,
      drug_name: "",
      dose: "",
      frequency: "",
      duration_days: 5,
      instructions: "After meals",
    },
  ]);

  // Follow-up
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");
  const [followUpReason, setFollowUpReason] = useState("");
  const [allergyReviewed, setAllergyReviewed] = useState(false);

  // FIRST VISIT ONLY: Medical background state
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [firstVisitAllergies, setFirstVisitAllergies] = useState<AllergyItem[]>([]);
  const [noKnownAllergies, setNoKnownAllergies] = useState(false);
  const [firstVisitConditions, setFirstVisitConditions] = useState<ConditionItem[]>([]);
  const [noConditions, setNoConditions] = useState(false);

  useEffect(() => {
    async function loadPatientData() {
      try {
        const res = await fetch(`/api/patients/${patientId}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to load patient");
        }
        setPatient(data.patient);

        // Check if first visit
        const first = (data.patient.visitsCount || 0) === 0;
        setIsFirstVisit(first);

        if (first) {
          // Pre-populate with one allergy row to make it obvious
          setFirstVisitAllergies([
            {
              id: `alg-${Date.now()}`,
              allergen: "",
              type: "drug",
              reaction: "",
              severity: "moderate",
            },
          ]);
        }
      } catch (err: any) {
        setFormError(err.message || "Failed to initialize form");
      } finally {
        setLoading(false);
      }
    }

    if (patientId) {
      loadPatientData();
    }
  }, [patientId]);

  // Handle Quick Date offset (+1 week, +2 weeks, +1 month)
  const setQuickFollowUp = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setFollowUpDate(d.toISOString().split("T")[0]);
  };

  // Drugs Handlers
  const handleAddDrug = () => {
    setDrugs((prev) => [
      ...prev,
      {
        id: `drug-${Date.now()}-${prev.length + 1}`,
        drug_name: "",
        dose: "",
        frequency: "",
        duration_days: 5,
        instructions: "After meals",
      },
    ]);
  };

  const handleRemoveDrug = (index: number) => {
    setDrugs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrugChange = (index: number, field: keyof PrescribedDrug, value: any) => {
    setDrugs((prev) =>
      prev.map((d, i) => (i === index ? { ...d, [field]: value } : d))
    );
  };

  // Determine active allergies to check against (either existing from patient, or from first-visit form)
  const activeAllergies = isFirstVisit
    ? (noKnownAllergies ? [] : firstVisitAllergies)
    : (patient?.allergies || []);

  // Quick condition suggestions for first visit
  const quickConditions = [
    "Hypertension",
    "Type 2 Diabetes",
    "Bronchial Asthma",
    "Dyslipidemia",
    "Ischemic Heart Disease",
    "Hypothyroidism",
  ];

  const addQuickCondition = (name: string) => {
    setNoConditions(false);
    if (!firstVisitConditions.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      setFirstVisitConditions((prev) => [
        ...prev,
        { id: `c-${Date.now()}-${prev.length}`, name, notes: "" },
      ]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation for first visit medical background
    if (isFirstVisit) {
      const validAllergies = firstVisitAllergies.filter((a) => a.allergen.trim());
      if (!noKnownAllergies && validAllergies.length === 0) {
        setFormError(
          "For the first visit, please either record known allergies or tick 'No known allergies'."
        );
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      const validConditions = firstVisitConditions.filter((c) => c.name.trim());
      if (!noConditions && validConditions.length === 0) {
        setFormError(
          "For the first visit, please either record chronic conditions or tick 'No long-term conditions'."
        );
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }

    if (!diagnosis.trim() && !complaint.trim()) {
      setFormError("Please enter at least a presenting complaint or a diagnosis.");
      return;
    }

    // Filter valid drugs
    const validDrugs = drugs
      .filter((d) => d.drug_name.trim())
      .map((d) => ({
        ...d,
        frequency: (d.frequency || "OD") as DrugFrequency,
      }));

    // Check for allergy conflicts
    const flaggedDrugs = validDrugs.filter((d) => {
      const match = checkDrugAllergyMatch(d.drug_name, activeAllergies);
      return match.hasWarning;
    });

    if (flaggedDrugs.length > 0 && !allergyReviewed) {
      setFormError(
        `Warning: Prescribed medication (${flaggedDrugs.map((d) => d.drug_name).join(", ")}) conflicts with patient recorded allergies. Please review and tick the confirmation checkbox below before saving.`
      );
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        patient_id: patientId,
        visit_date: visitDate,
        complaint: complaint.trim(),
        diagnosis: diagnosis.trim(),
        notes: notes.trim(),
        vitals,
        drugs: validDrugs,
        follow_up_date: followUpDate,
        follow_up_note: followUpNote.trim(),
        follow_up_reason: followUpReason.trim(),
        created_by: userName || "Dr. Aruna Perera",
        is_first_visit: isFirstVisit,
        allergy_override: flaggedDrugs.length > 0 && allergyReviewed,
        overridden_allergies: flaggedDrugs.map((d) => d.drug_name),
      };

      if (isFirstVisit) {
        payload.medical_background = {
          no_known_allergies: noKnownAllergies,
          allergies: noKnownAllergies
            ? []
            : firstVisitAllergies.filter((a) => a.allergen.trim()),
          no_conditions: noConditions,
          conditions: noConditions
            ? []
            : firstVisitConditions.filter((c) => c.name.trim()),
        };
      }

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/visits", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save visit");
      }

      // Success -> navigate to patient profile or print
      router.push(`/patients/${patientId}`);
    } catch (err: any) {
      setFormError(err.message || "Failed to save visit record");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-slate-500">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p>Loading visit form...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold">Patient not found</h2>
        <Link href="/search" className="mt-4 inline-block text-teal-600 underline">
          Back to search
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Breadcrumb & Patient Summary Header */}
      <div className="flex items-center justify-between">
        <Link
          href={`/patients/${patientId}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to patient profile</span>
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-950/70 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 font-mono font-bold text-sm">
              {patient.id}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {patient.full_name}
            </h1>
          </div>
          <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap gap-3">
            <span>{patient.sex || "Sex: —"}</span>
            <span>•</span>
            <span>Age: {calculateAge(patient.dob)}</span>
            {patient.phone && (
              <>
                <span>•</span>
                <span>Phone: {patient.phone}</span>
              </>
            )}
          </div>
        </div>

        {/* First visit indicator tag */}
        {isFirstVisit ? (
          <span className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 self-start sm:self-center">
            <HelpCircle className="w-4 h-4 text-amber-600" />
            <span>First clinical visit</span>
          </span>
        ) : (
          <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium">
            Visit #{patient.visitsCount + 1}
          </span>
        )}
      </div>

      {formError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{formError}</span>
        </div>
      )}

      {/* FORM */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ================================================================= */}
        {/* SECTION 4 REQUIREMENT: MEDICAL BACKGROUND (FIRST VISIT ONLY)       */}
        {/* ================================================================= */}
        {isFirstVisit && (
          <div className="bg-amber-50/70 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-800 rounded-2xl p-6 sm:p-7 shadow-sm space-y-6 animate-in fade-in duration-300">
            <div className="flex items-start gap-3 pb-4 border-b border-amber-200 dark:border-amber-800/60">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-amber-950 dark:text-amber-100">
                  Medical background (first visit)
                </h2>
                <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300">
                  Required baseline assessment for this patient. This data is saved directly to the patient profile and will be checked for drug allergies during every consultation.
                </p>
              </div>
            </div>

            {/* Part 1: Allergies */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Known allergies (drug, food, or other)</span>
                  <span className="text-rose-600 font-bold">*</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 shadow-sm">
                  <input
                    type="checkbox"
                    checked={noKnownAllergies}
                    onChange={(e) => {
                      setNoKnownAllergies(e.target.checked);
                      if (e.target.checked) {
                        setFirstVisitAllergies([]);
                      } else {
                        setFirstVisitAllergies([
                          {
                            id: `alg-${Date.now()}`,
                            allergen: "",
                            type: "drug",
                            reaction: "",
                            severity: "moderate",
                          },
                        ]);
                      }
                    }}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span>No known allergies (NKA)</span>
                </label>
              </div>

              {!noKnownAllergies && (
                <div className="space-y-3">
                  {firstVisitAllergies.map((allergy, idx) => (
                    <div
                      key={allergy.id || idx}
                      className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/80 shadow-sm grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                    >
                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">
                          Allergen name
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Penicillin, Peanuts"
                          value={allergy.allergen}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFirstVisitAllergies((prev) =>
                              prev.map((a, i) =>
                                i === idx ? { ...a, allergen: val } : a
                              )
                            );
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">
                          Type
                        </label>
                        <select
                          value={allergy.type}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setFirstVisitAllergies((prev) =>
                              prev.map((a, i) =>
                                i === idx ? { ...a, type: val } : a
                              )
                            );
                          }}
                          className="w-full px-2 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                        >
                          <option value="drug">Drug</option>
                          <option value="food">Food</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">
                          Reaction
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Hives, Swelling"
                          value={allergy.reaction}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFirstVisitAllergies((prev) =>
                              prev.map((a, i) =>
                                i === idx ? { ...a, reaction: val } : a
                              )
                            );
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">
                          Severity
                        </label>
                        <select
                          value={allergy.severity}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setFirstVisitAllergies((prev) =>
                              prev.map((a, i) =>
                                i === idx ? { ...a, severity: val } : a
                              )
                            );
                          }}
                          className="w-full px-2 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                        >
                          <option value="mild">Mild</option>
                          <option value="moderate">Moderate</option>
                          <option value="severe">Severe</option>
                        </select>
                      </div>

                      <div className="sm:col-span-1 flex items-end justify-center pt-4 sm:pt-0">
                        <button
                          type="button"
                          onClick={() =>
                            setFirstVisitAllergies((prev) =>
                              prev.filter((_, i) => i !== idx)
                            )
                          }
                          className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() =>
                      setFirstVisitAllergies((prev) => [
                        ...prev,
                        {
                          id: `alg-${Date.now()}`,
                          allergen: "",
                          type: "drug",
                          reaction: "",
                          severity: "moderate",
                        },
                      ])
                    }
                    className="px-3 py-2 rounded-lg border border-dashed border-teal-600 text-teal-700 dark:text-teal-300 text-xs font-semibold hover:bg-teal-50 dark:hover:bg-teal-950 flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add another allergy</span>
                  </button>
                </div>
              )}
            </div>

            {/* Part 2: Long-term conditions */}
            <div className="space-y-3 pt-4 border-t border-amber-200 dark:border-amber-800/60">
              <div className="flex items-center justify-between">
                <label className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-teal-600" />
                  <span>Long-term / Chronic medical conditions</span>
                  <span className="text-rose-600 font-bold">*</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 shadow-sm">
                  <input
                    type="checkbox"
                    checked={noConditions}
                    onChange={(e) => {
                      setNoConditions(e.target.checked);
                      if (e.target.checked) {
                        setFirstVisitConditions([]);
                      }
                    }}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span>No chronic conditions</span>
                </label>
              </div>

              {!noConditions && (
                <div className="space-y-3">
                  {/* Quick preset buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-slate-500 font-medium">Quick add:</span>
                    {quickConditions.map((cName) => (
                      <button
                        key={cName}
                        type="button"
                        onClick={() => addQuickCondition(cName)}
                        className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-teal-500 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-teal-50 dark:hover:bg-teal-950/60 transition-colors"
                      >
                        + {cName}
                      </button>
                    ))}
                  </div>

                  {firstVisitConditions.map((cond, idx) => (
                    <div
                      key={cond.id || idx}
                      className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/80 shadow-sm grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                    >
                      <div className="sm:col-span-6">
                        <input
                          type="text"
                          required
                          placeholder="Condition name (e.g. Essential Hypertension)"
                          value={cond.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFirstVisitConditions((prev) =>
                              prev.map((c, i) => (i === idx ? { ...c, name: val } : c))
                            );
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                        />
                      </div>
                      <div className="sm:col-span-5">
                        <input
                          type="text"
                          placeholder="Optional notes / year diagnosed"
                          value={cond.notes || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFirstVisitConditions((prev) =>
                              prev.map((c, i) => (i === idx ? { ...c, notes: val } : c))
                            );
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                        />
                      </div>
                      <div className="sm:col-span-1 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() =>
                            setFirstVisitConditions((prev) =>
                              prev.filter((_, i) => i !== idx)
                            )
                          }
                          className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() =>
                      setFirstVisitConditions((prev) => [
                        ...prev,
                        { id: `c-${Date.now()}`, name: "", notes: "" },
                      ])
                    }
                    className="px-3 py-2 rounded-lg border border-dashed border-teal-600 text-teal-700 dark:text-teal-300 text-xs font-semibold hover:bg-teal-50 dark:hover:bg-teal-950 flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add custom condition</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Existing Allergy Alert (if subsequent visit) */}
        {!isFirstVisit && (
          <div>
            {(patient?.allergies || []).length > 0 ? (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm">
                  <span className="font-bold">Recorded patient allergies: </span>
                  {patient.allergies.map((a: any, i: number) => (
                    <span key={i} className="font-semibold underline ml-1">
                      {a.allergen} ({a.severity})
                      {i < patient.allergies.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>No known allergies recorded in patient profile.</span>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* VISIT DETAILS: DATE, COMPLAINT, DIAGNOSIS, NOTES                   */}
        {/* ================================================================= */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Stethoscope className="w-5 h-5 text-teal-600" />
            <span>Consultation & diagnosis</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Visit date
              </label>
              <input
                type="date"
                required
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Presenting complaint / reason for visit
              </label>
              <input
                type="text"
                placeholder="e.g. Sore throat and fever for 3 days"
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Diagnosis / Clinical impression <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Acute Pharyngitis, Uncontrolled Essential Hypertension"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Clinical examination & doctor notes (confidential)
            </label>
            <textarea
              rows={3}
              placeholder="Physical findings, systemic exam notes, instructions given to patient..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm resize-none"
            />
          </div>
        </div>

        {/* ================================================================= */}
        {/* VITALS (OPTIONAL)                                                  */}
        {/* ================================================================= */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-500" />
            <span>Vital signs (optional)</span>
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs">
            {/* BP */}
            <div>
              <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                Blood pressure
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="Sys (120)"
                  value={vitals.bp_systolic}
                  onChange={(e) =>
                    setVitals((prev) => ({ ...prev, bp_systolic: e.target.value }))
                  }
                  className="w-1/2 px-2 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-center"
                />
                <span>/</span>
                <input
                  type="text"
                  placeholder="Dia (80)"
                  value={vitals.bp_diastolic}
                  onChange={(e) =>
                    setVitals((prev) => ({ ...prev, bp_diastolic: e.target.value }))
                  }
                  className="w-1/2 px-2 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-center"
                />
              </div>
            </div>

            {/* Pulse */}
            <div>
              <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                Pulse (bpm)
              </label>
              <input
                type="text"
                placeholder="e.g. 74"
                value={vitals.pulse}
                onChange={(e) =>
                  setVitals((prev) => ({ ...prev, pulse: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            {/* Weight */}
            <div>
              <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                Weight (kg)
              </label>
              <input
                type="text"
                placeholder="e.g. 68.5"
                value={vitals.weight_kg}
                onChange={(e) =>
                  setVitals((prev) => ({ ...prev, weight_kg: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            {/* Temp */}
            <div>
              <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                Temp (°C)
              </label>
              <input
                type="text"
                placeholder="e.g. 37.0"
                value={vitals.temperature_c}
                onChange={(e) =>
                  setVitals((prev) => ({ ...prev, temperature_c: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            {/* Blood Sugar */}
            <div className="col-span-2 sm:col-span-1">
              <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                Sugar (mg/dL)
              </label>
              <input
                type="text"
                placeholder="e.g. 110"
                value={vitals.blood_sugar_mg}
                onChange={(e) =>
                  setVitals((prev) => ({ ...prev, blood_sugar_mg: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* DRUGS PRESCRIBED & REAL-TIME ALLERGY SAFETY CHECK                  */}
        {/* ================================================================= */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Pill className="w-5 h-5 text-teal-600" />
                <span>Prescription medications (Rx)</span>
              </h2>
              <p className="text-xs text-slate-500">
                Automatic real-time allergy cross-checking on drug name input
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddDrug}
              className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/70 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add drug</span>
            </button>
          </div>

          <div className="space-y-4">
            {drugs.map((drug, idx) => {
              // Real-time allergy check for this drug row!
              const allergyWarning = checkDrugAllergyMatch(
                drug.drug_name,
                activeAllergies
              );

              return (
                <div
                  key={drug.id || idx}
                  className={`p-4 rounded-xl border transition-all ${
                    allergyWarning.hasWarning
                      ? "border-rose-400 bg-rose-50/70 dark:bg-rose-950/40 ring-2 ring-rose-500/20"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40"
                  }`}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                    {/* Drug Name with Autocomplete & Allergy Safety */}
                    <div className="sm:col-span-4">
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Drug name & strength
                      </label>
                      <DrugAutocompleteInput
                        value={drug.drug_name}
                        onChange={(val) => handleDrugChange(idx, "drug_name", val)}
                        onSelectDrug={(suggestion) => {
                          setDrugs((prev) =>
                            prev.map((d, i) => {
                              if (i !== idx) return d;
                              return {
                                ...d,
                                drug_name: suggestion.name,
                                // Auto-fill dose and frequency ONLY if currently empty
                                dose: d.dose && d.dose.trim() ? d.dose : (suggestion.default_dose || ""),
                                frequency:
                                  d.frequency && d.frequency.trim()
                                    ? d.frequency
                                    : ((suggestion.default_frequency as DrugFrequency) || "OD"),
                              };
                            })
                          );
                        }}
                        allergies={activeAllergies}
                        durationInputId={`drug-duration-${idx}`}
                        placeholder="e.g. Amoxicillin, Paracetamol"
                        className={`w-full px-3 py-2 rounded-lg border text-sm font-semibold transition-all ${
                          allergyWarning.hasWarning
                            ? "border-rose-500 bg-white dark:bg-slate-900 text-rose-900 dark:text-rose-200 focus:ring-rose-500"
                            : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-teal-500"
                        }`}
                      />
                    </div>

                    {/* Dose */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Dose
                      </label>
                      <input
                        type="text"
                        placeholder="500mg, 1 tab"
                        value={drug.dose}
                        onChange={(e) =>
                          handleDrugChange(idx, "dose", e.target.value)
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      />
                    </div>

                    {/* Frequency */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Frequency
                      </label>
                      <select
                        value={drug.frequency || ""}
                        onChange={(e) =>
                          handleDrugChange(
                            idx,
                            "frequency",
                            e.target.value as DrugFrequency
                          )
                        }
                        className="w-full px-2 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                      >
                        <option value="">Select frequency</option>
                        <option value="OD">OD (Once daily)</option>
                        <option value="BD">BD (Twice daily)</option>
                        <option value="TDS">TDS (3x daily)</option>
                        <option value="QDS">QDS (4x daily)</option>
                        <option value="Nocte">Nocte (At night)</option>
                        <option value="SOS">SOS (As needed)</option>
                      </select>
                    </div>

                    {/* Duration in Days */}
                    <div className="sm:col-span-1">
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Days
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={180}
                        value={drug.duration_days}
                        onChange={(e) =>
                          handleDrugChange(idx, "duration_days", e.target.value)
                        }
                        className="w-full px-2 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-center font-mono"
                      />
                    </div>

                    {/* Instructions */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Instructions
                      </label>
                      <input
                        type="text"
                        placeholder="After meals"
                        value={drug.instructions}
                        onChange={(e) =>
                          handleDrugChange(idx, "instructions", e.target.value)
                        }
                        className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      />
                    </div>

                    {/* Delete button */}
                    <div className="sm:col-span-1 flex items-center justify-center pt-6">
                      <button
                        type="button"
                        onClick={() => handleRemoveDrug(idx)}
                        disabled={drugs.length === 1}
                        className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* ALLERGY WARNING BANNER (Shows in RED if matching allergy) */}
                  {allergyWarning.hasWarning && (
                    <div className="mt-3 p-3 rounded-lg bg-rose-600 text-white text-xs font-semibold flex items-center gap-2 shadow-sm animate-bounce-short">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      <div>
                        <span>
                          CONTRAINDICATION WARNING: {allergyWarning.warningMessage || `Patient has a recorded drug allergy to "${allergyWarning.matchedAllergen}"!`}
                        </span>
                        {allergyWarning.reaction && (
                          <span className="block font-normal text-[11px] text-rose-100">
                            Severity: {allergyWarning.severity || "High"} | Reaction: {allergyWarning.reaction}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Review checkbox required when any drug conflicts with allergy records */}
          {drugs.some((d) => d.drug_name.trim() && checkDrugAllergyMatch(d.drug_name, activeAllergies).hasWarning) && (
            <div className="mt-4 p-4 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 space-y-3">
              <div className="flex items-start gap-2.5 text-rose-900 dark:text-rose-200">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold">Allergy Safety Confirmation Required</h4>
                  <p className="text-xs text-rose-800 dark:text-rose-300 mt-0.5">
                    One or more prescribed drugs conflict with patient allergy records or drug-class cross-allergies.
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-lg border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allergyReviewed}
                  onChange={(e) => setAllergyReviewed(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 dark:border-slate-700"
                />
                <span className="text-xs font-semibold text-rose-950 dark:text-rose-100">
                  I have reviewed the allergy warning
                </span>
              </label>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* FOLLOW-UP SECTION (DATE + QUICK BUTTONS + NOTE)                   */}
        {/* ================================================================= */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-600" />
            <span>Schedule follow-up</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Follow-up date
              </label>
              <input
                type="date"
                min={todayStr}
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Quick schedule buttons
              </label>
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => setQuickFollowUp(7)}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/60 text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 border border-slate-200 dark:border-slate-700 text-xs font-medium transition-colors"
                >
                  + 1 week
                </button>
                <button
                  type="button"
                  onClick={() => setQuickFollowUp(14)}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/60 text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 border border-slate-200 dark:border-slate-700 text-xs font-medium transition-colors"
                >
                  + 2 weeks
                </button>
                <button
                  type="button"
                  onClick={() => setQuickFollowUp(30)}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/60 text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 border border-slate-200 dark:border-slate-700 text-xs font-medium transition-colors"
                >
                  + 1 month
                </button>
                {followUpDate && (
                  <button
                    type="button"
                    onClick={() => {
                      setFollowUpDate("");
                      setFollowUpNote("");
                    }}
                    className="px-2.5 py-2 text-xs text-rose-600 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Follow-up reason (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. BP medication review, Fasting blood sugar check"
                value={followUpReason}
                onChange={(e) => setFollowUpReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Follow-up instructions note (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Bring fasting lab reports, avoid caffeine"
                value={followUpNote}
                onChange={(e) => setFollowUpNote(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* SUBMIT BUTTON BAR */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            href={`/patients/${patientId}`}
            className="px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-base font-semibold shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Stethoscope className="w-5 h-5" />
            <span>{saving ? "Saving consultation..." : "Save consultation"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
