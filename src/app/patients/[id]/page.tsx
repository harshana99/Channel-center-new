"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  User,
  Phone,
  Calendar,
  CreditCard,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Stethoscope,
  Pill,
  Clock,
  Printer,
  Edit3,
  Lock,
  Plus,
  Trash2,
  History,
  FileText,
  AlertCircle,
  X,
  Share2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { calculateAge, formatDate } from "@/lib/utils";
import { AllergyItem, ConditionItem } from "@/lib/types";

export default function PatientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;
  const { isDoctor, role, userName, token } = useAuth();

  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Allergies & Conditions Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editAllergies, setEditAllergies] = useState<AllergyItem[]>([]);
  const [editNoAllergies, setEditNoAllergies] = useState(false);
  const [editConditions, setEditConditions] = useState<ConditionItem[]>([]);
  const [editNoConditions, setEditNoConditions] = useState(false);
  const [editReason, setEditReason] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Quick Follow-up modal for reception
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [targetVisitId, setTargetVisitId] = useState("");
  const [newFollowUpDate, setNewFollowUpDate] = useState("");
  const [newFollowUpNote, setNewFollowUpNote] = useState("");

  const loadPatient = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/patients/${patientId}`, { headers });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Patient not found");
      }
      setPatient(data.patient);
    } catch (err: any) {
      setError(err.message || "Failed to load patient");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      loadPatient();
    }
  }, [patientId]);

  const openEditModal = () => {
    if (!patient) return;
    setEditAllergies([...(patient.allergies || [])]);
    setEditNoAllergies(Boolean(patient.no_known_allergies));
    setEditConditions([...(patient.conditions || [])]);
    setEditNoConditions(Boolean(patient.no_conditions));
    setEditReason("");
    setEditModalOpen(true);
  };

  const handleAddAllergyRow = () => {
    setEditNoAllergies(false);
    setEditAllergies((prev) => [
      ...prev,
      {
        id: `alg-${Date.now()}`,
        allergen: "",
        type: "drug",
        reaction: "",
        severity: "moderate",
      },
    ]);
  };

  const handleRemoveAllergyRow = (index: number) => {
    setEditAllergies((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddConditionRow = () => {
    setEditNoConditions(false);
    setEditConditions((prev) => [
      ...prev,
      {
        id: `c-${Date.now()}`,
        name: "",
        notes: "",
      },
    ]);
  };

  const handleRemoveConditionRow = (index: number) => {
    setEditConditions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveMedicalBackground = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNoAllergies && editAllergies.length === 0) {
      alert("Please either add allergies or check 'No known allergies'");
      return;
    }
    if (!editNoConditions && editConditions.length === 0) {
      alert("Please either add conditions or check 'No long-term conditions'");
      return;
    }

    setEditSaving(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/patients/${patientId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          updateType: "medical_background",
          allergies: editNoAllergies ? [] : editAllergies.filter((a) => a.allergen.trim()),
          no_known_allergies: editNoAllergies,
          conditions: editNoConditions ? [] : editConditions.filter((c) => c.name.trim()),
          no_conditions: editNoConditions,
          changed_by_name: userName || "Doctor",
          changed_by_role: role,
          reason: editReason || "Updated via patient profile",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update background");
      }

      setEditModalOpen(false);
      loadPatient();
    } catch (err: any) {
      alert(err.message || "Failed to save updates");
    } finally {
      setEditSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-slate-500">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p>Loading patient records...</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Patient not found</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">{error || "Could not find record for ID " + patientId}</p>
        <Link
          href="/search"
          className="inline-flex px-4 py-2.5 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700"
        >
          Return to search
        </Link>
      </div>
    );
  }

  const notAssessedYet = Number(patient.allergies_assessed) === 0;
  const hasRecordedAllergies = !notAssessedYet && Number(patient.no_known_allergies) === 0 && (patient.allergies || []).length > 0;
  const noKnownAllergies = !notAssessedYet && Number(patient.no_known_allergies) === 1;

  const conditionsNotAssessed = Number(patient.conditions_assessed) === 0;
  const hasRecordedConditions = !conditionsNotAssessed && Number(patient.no_conditions) === 0 && (patient.conditions || []).length > 0;
  const noKnownConditions = !conditionsNotAssessed && Number(patient.no_conditions) === 1;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 1. Header Card: Name, ID, Age, Sex, Phone */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/70 border border-teal-200/80 dark:border-teal-800/80 text-teal-700 dark:text-teal-300 font-mono font-bold text-lg flex items-center justify-center shrink-0">
              {patient.id}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                  {patient.full_name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                  {patient.sex || "Sex: N/A"}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                  Age: {calculateAge(patient.dob)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-slate-600 dark:text-slate-400">
                {patient.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{patient.phone}</span>
                  </span>
                )}
                {patient.dob && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>DOB: {formatDate(patient.dob)}</span>
                  </span>
                )}
                {patient.nic && (
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-slate-400" />
                    <span>NIC: {patient.nic}</span>
                  </span>
                )}
                {patient.address && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>{patient.address}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            <Link
              href={`/print/card/${patient.id}`}
              target="_blank"
              className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print card</span>
            </Link>

            {isDoctor && (
              <Link
                href={`/patients/${patient.id}/visit/new`}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
              >
                <Stethoscope className="w-4 h-4" />
                <span>New visit</span>
              </Link>
            )}
          </div>
        </div>

        {/* 2. Allergy Banner at the top of profile */}
        <div className="mt-5">
          {notAssessedYet ? (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <HelpCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <span className="font-bold text-sm">Allergies not assessed yet</span>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    This patient has not completed their initial medical consultation. Medical background will be recorded on the first doctor visit.
                  </p>
                </div>
              </div>
              {isDoctor && (
                <button
                  type="button"
                  onClick={openEditModal}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 self-start sm:self-center transition-colors"
                >
                  Assess now
                </button>
              )}
            </div>
          ) : hasRecordedAllergies ? (
            <div className="p-4 sm:p-5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-400 dark:border-rose-800 text-rose-950 dark:text-rose-100 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-rose-600 text-white">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-rose-900 dark:text-rose-200 leading-tight">
                      CRITICAL ALLERGY ALERT
                    </h3>
                    <p className="text-xs text-rose-700 dark:text-rose-300">
                      Known adverse drug/food reactions recorded in patient chart
                    </p>
                  </div>
                </div>

                {isDoctor && (
                  <button
                    type="button"
                    onClick={openEditModal}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-800 bg-white/80 dark:bg-slate-900/80 hover:bg-white text-rose-800 dark:text-rose-300 text-xs font-semibold transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit allergies</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                {(patient.allergies || []).map((a: AllergyItem, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-rose-200 dark:border-rose-900 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-900 dark:text-rose-200 text-sm">
                        {a.allergen}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          a.severity === "severe"
                            ? "bg-rose-600 text-white"
                            : a.severity === "moderate"
                            ? "bg-amber-500 text-white"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                        }`}
                      >
                        {a.severity}
                      </span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-400">
                      <span className="font-semibold capitalize text-slate-700 dark:text-slate-300">
                        Type: {a.type}
                      </span>
                      {a.reaction && (
                        <p className="mt-0.5 text-slate-800 dark:text-slate-300">
                          <span className="font-medium text-slate-500">Reaction:</span> {a.reaction}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-semibold">No known allergies (NKA recorded)</span>
              </div>
              {isDoctor && (
                <button
                  type="button"
                  onClick={openEditModal}
                  className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Update</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Two Columns: Long-term conditions & Current Medications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Long-term Conditions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-4 h-4 text-teal-600" />
              <span>Long-term conditions</span>
            </h3>
            {isDoctor && !conditionsNotAssessed && (
              <button
                type="button"
                onClick={openEditModal}
                className="text-xs text-teal-600 dark:text-teal-400 font-medium hover:underline flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" />
                <span>Edit</span>
              </button>
            )}
          </div>

          {conditionsNotAssessed ? (
            <div className="py-4 text-center text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
              <HelpCircle className="w-6 h-6 text-amber-500 mx-auto mb-1.5 opacity-80" />
              <p className="font-medium text-slate-700 dark:text-slate-300">
                Not assessed yet
              </p>
              <p className="text-xs mt-0.5">Assessed at patient&apos;s initial visit</p>
            </div>
          ) : noKnownConditions ? (
            <div className="py-3 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>No chronic or long-term medical conditions recorded</span>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
              {(patient.conditions || []).map((c: ConditionItem, idx: number) => (
                <li key={idx} className="py-2.5 flex items-start justify-between gap-2">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {c.name}
                    </span>
                    {c.notes && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {c.notes}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Current Medications (from most recent visit) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Pill className="w-4 h-4 text-teal-600" />
              <span>Current medications</span>
            </h3>
            <span className="text-xs text-slate-400">
              {patient.visitsCount > 0 ? "From latest visit" : "None"}
            </span>
          </div>

          {(patient.currentMedications || []).length === 0 ? (
            <div className="py-4 text-center text-slate-400 text-xs sm:text-sm">
              <p>No active prescription drugs on record.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
              {(patient.currentMedications || []).map((drug: any, idx: number) => (
                <li key={idx} className="py-2 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {drug.drug_name}
                    </span>{" "}
                    <span className="text-slate-600 dark:text-slate-300 font-medium">
                      {drug.dose}
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {drug.frequency} • {drug.duration_days} days
                      {drug.instructions ? ` • ${drug.instructions}` : ""}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-mono text-xs font-semibold">
                    {drug.frequency}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 4. Visit History Timeline (Newest first) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Consultation history ({patient.visitsCount || 0})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Chronological visit timeline (newest first)
            </p>
          </div>

          {isDoctor && (
            <Link
              href={`/patients/${patient.id}/visit/new`}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Record new visit</span>
            </Link>
          )}
        </div>

        {patient.visitsCount === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <Stethoscope className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              No previous visits recorded
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-sm mx-auto">
              This patient is awaiting their initial clinical consultation.
            </p>
            {isDoctor ? (
              <Link
                href={`/patients/${patient.id}/visit/new`}
                className="inline-flex items-center gap-2 mt-4 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold shadow-sm"
              >
                <Stethoscope className="w-4 h-4" />
                <span>Start first visit now</span>
              </Link>
            ) : (
              <div className="mt-3 text-xs text-slate-400">
                Doctor will record the first visit and assess medical background.
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {(patient.visits || []).map((visit: any, index: number) => {
              const vitals = visit.vitals || {};
              const drugs = visit.drugs || [];

              return (
                <div key={visit.id} className="relative pl-8 space-y-3">
                  {/* Timeline dot */}
                  <div className="absolute left-1.5 top-1.5 w-4 h-4 rounded-full border-2 border-teal-500 bg-white dark:bg-slate-900" />

                  {/* Visit Card */}
                  <div className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/60 dark:border-slate-700/60">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-slate-900 dark:text-white">
                            Visit on {formatDate(visit.visit_date)}
                          </span>
                          <span className="text-xs font-mono text-slate-400">
                            ({visit.id})
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">
                          Attended by: {visit.created_by || "Doctor"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Print Prescription Button */}
                        <Link
                          href={`/print/prescription/${visit.id}`}
                          target="_blank"
                          className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors shadow-sm"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print prescription</span>
                        </Link>
                      </div>
                    </div>

                    {/* Vitals Bar (if present) */}
                    {(vitals.bp_systolic || vitals.pulse || vitals.weight_kg || vitals.temperature_c || vitals.blood_sugar_mg) && (
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-slate-500">Vitals:</span>
                        {vitals.bp_systolic && (
                          <span className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium">
                            BP: {vitals.bp_systolic}/{vitals.bp_diastolic || "—"} mmHg
                          </span>
                        )}
                        {vitals.pulse && (
                          <span className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium">
                            Pulse: {vitals.pulse} bpm
                          </span>
                        )}
                        {vitals.weight_kg && (
                          <span className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium">
                            Weight: {vitals.weight_kg} kg
                          </span>
                        )}
                        {vitals.temperature_c && (
                          <span className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium">
                            Temp: {vitals.temperature_c} °C
                          </span>
                        )}
                        {vitals.blood_sugar_mg && (
                          <span className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium">
                            Sugar: {vitals.blood_sugar_mg} mg/dL
                          </span>
                        )}
                      </div>
                    )}

                    {/* Complaint & Diagnosis */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                        <span className="text-slate-400 font-semibold block text-xs uppercase tracking-wider mb-1">
                          Presenting complaint
                        </span>
                        <p className="text-slate-800 dark:text-slate-200">
                          {visit.complaint || "None recorded"}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                        <span className="text-slate-400 font-semibold block text-xs uppercase tracking-wider mb-1">
                          Diagnosis
                        </span>
                        <p className="font-semibold text-teal-800 dark:text-teal-300">
                          {visit.diagnosis || "Under evaluation"}
                        </p>
                      </div>
                    </div>

                    {/* Clinical Notes (Role Protected: Hidden from Reception!) */}
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-slate-400 font-semibold block text-xs uppercase tracking-wider">
                          Doctor clinical notes
                        </span>
                        {!isDoctor && (
                          <span className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            <Lock className="w-3 h-3" />
                            <span>Restricted to Doctor</span>
                          </span>
                        )}
                      </div>

                      {isDoctor ? (
                        <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line">
                          {visit.notes || "No additional clinical notes."}
                        </p>
                      ) : (
                        <div className="py-2 text-xs text-slate-400 italic flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Confidential clinical notes are hidden for Reception role.</span>
                        </div>
                      )}
                    </div>

                    {/* Prescribed Drugs Table */}
                    {drugs.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-slate-400 font-semibold block text-xs uppercase tracking-wider">
                          Prescription (Rx)
                        </span>
                        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100/70 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase font-semibold">
                              <tr>
                                <th className="px-3 py-2">Drug name</th>
                                <th className="px-3 py-2">Dose</th>
                                <th className="px-3 py-2">Frequency</th>
                                <th className="px-3 py-2">Duration</th>
                                <th className="px-3 py-2">Instructions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                              {drugs.map((d: any, dIdx: number) => (
                                <tr key={dIdx}>
                                  <td className="px-3 py-2 font-semibold">{d.drug_name}</td>
                                  <td className="px-3 py-2">{d.dose}</td>
                                  <td className="px-3 py-2">
                                    <span className="px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950 font-mono text-[11px] text-teal-700 dark:text-teal-300">
                                      {d.frequency}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2">{d.duration_days} days</td>
                                  <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                                    {d.instructions || "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Follow-up Section */}
                    {visit.follow_up_date && (
                      <div className="p-3 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                          <span className="font-semibold text-teal-900 dark:text-teal-200">
                            Scheduled follow-up: {formatDate(visit.follow_up_date)}
                          </span>
                          {visit.follow_up_note && (
                            <span className="text-teal-700 dark:text-teal-300">
                              ({visit.follow_up_note})
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Audit Log (Visible to Doctor) */}
      {isDoctor && (patient.auditLogs || []).length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <History className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Medical background audit trail
            </h3>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {patient.auditLogs.map((log: any) => (
              <div key={log.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-slate-600 dark:text-slate-400">
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {log.changed_by_name} ({log.changed_by_role})
                  </span>
                  <span className="mx-1.5">•</span>
                  <span>{log.change_type === "first_visit_assessment" ? "Initial background recorded" : "Allergies / conditions updated"}</span>
                  {log.details?.reason && (
                    <span className="text-slate-500 italic ml-1">
                      (&quot;{log.details.reason}&quot;)
                    </span>
                  )}
                </div>
                <span className="text-slate-400 font-mono text-[11px]">
                  {new Date(log.created_at).toLocaleString("en-GB")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Allergies / Conditions Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-teal-600" />
                <span>Edit medical background & allergies</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMedicalBackground} className="mt-4 space-y-6">
              {/* Allergies Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-sm text-slate-900 dark:text-white">
                    Known allergies
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editNoAllergies}
                      onChange={(e) => {
                        setEditNoAllergies(e.target.checked);
                        if (e.target.checked) setEditAllergies([]);
                      }}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span>No known allergies (NKA)</span>
                  </label>
                </div>

                {!editNoAllergies && (
                  <div className="space-y-2">
                    {editAllergies.map((allergy, idx) => (
                      <div
                        key={allergy.id || idx}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40"
                      >
                        <input
                          type="text"
                          placeholder="Allergen (e.g. Penicillin)"
                          value={allergy.allergen}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditAllergies((prev) =>
                              prev.map((a, i) => (i === idx ? { ...a, allergen: val } : a))
                            );
                          }}
                          className="sm:col-span-4 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900"
                        />
                        <select
                          value={allergy.type}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setEditAllergies((prev) =>
                              prev.map((a, i) => (i === idx ? { ...a, type: val } : a))
                            );
                          }}
                          className="sm:col-span-2 px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900"
                        >
                          <option value="drug">Drug</option>
                          <option value="food">Food</option>
                          <option value="other">Other</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Reaction (e.g. Hives)"
                          value={allergy.reaction}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditAllergies((prev) =>
                              prev.map((a, i) => (i === idx ? { ...a, reaction: val } : a))
                            );
                          }}
                          className="sm:col-span-3 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900"
                        />
                        <select
                          value={allergy.severity}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setEditAllergies((prev) =>
                              prev.map((a, i) => (i === idx ? { ...a, severity: val } : a))
                            );
                          }}
                          className="sm:col-span-2 px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900"
                        >
                          <option value="mild">Mild</option>
                          <option value="moderate">Moderate</option>
                          <option value="severe">Severe</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveAllergyRow(idx)}
                          className="sm:col-span-1 p-1 text-slate-400 hover:text-rose-600 flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={handleAddAllergyRow}
                      className="px-3 py-1.5 rounded-lg border border-dashed border-teal-500 text-teal-600 text-xs font-semibold hover:bg-teal-50 dark:hover:bg-teal-950 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add allergy row</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Long-term Conditions Section */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-sm text-slate-900 dark:text-white">
                    Long-term medical conditions
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editNoConditions}
                      onChange={(e) => {
                        setEditNoConditions(e.target.checked);
                        if (e.target.checked) setEditConditions([]);
                      }}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span>No chronic conditions</span>
                  </label>
                </div>

                {!editNoConditions && (
                  <div className="space-y-2">
                    {editConditions.map((cond, idx) => (
                      <div
                        key={cond.id || idx}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40"
                      >
                        <input
                          type="text"
                          placeholder="Condition name (e.g. Hypertension)"
                          value={cond.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditConditions((prev) =>
                              prev.map((c, i) => (i === idx ? { ...c, name: val } : c))
                            );
                          }}
                          className="sm:col-span-6 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900"
                        />
                        <input
                          type="text"
                          placeholder="Notes / Year diagnosed (optional)"
                          value={cond.notes || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditConditions((prev) =>
                              prev.map((c, i) => (i === idx ? { ...c, notes: val } : c))
                            );
                          }}
                          className="sm:col-span-5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveConditionRow(idx)}
                          className="sm:col-span-1 p-1 text-slate-400 hover:text-rose-600 flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={handleAddConditionRow}
                      className="px-3 py-1.5 rounded-lg border border-dashed border-teal-500 text-teal-600 text-xs font-semibold hover:bg-teal-50 dark:hover:bg-teal-950 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add condition row</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Audit Reason */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for update (recorded in audit log)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Patient newly diagnosed with peanut allergy"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold shadow-sm disabled:opacity-50"
                >
                  {editSaving ? "Saving..." : "Save updates & log"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
