"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Printer, ArrowLeft, Stethoscope, AlertTriangle } from "lucide-react";
import { formatDate, calculateAge } from "@/lib/utils";

export default function PrescriptionPrintPage() {
  const params = useParams();
  const router = useRouter();
  const visitId = params.visitId as string;

  const [visit, setVisit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadVisit() {
      try {
        const res = await fetch(`/api/visits/${visitId}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Visit not found");
        }
        setVisit(data.visit);
      } catch (err: any) {
        setError(err.message || "Failed to load prescription");
      } finally {
        setLoading(false);
      }
    }

    if (visitId) {
      loadVisit();
    }
  }, [visitId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-500">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p>Loading prescription layout...</p>
      </div>
    );
  }

  if (error || !visit) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <p className="text-rose-500 font-semibold">{error || "Prescription not found"}</p>
        <button
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 rounded-xl bg-teal-600 text-white text-sm"
        >
          Go back
        </button>
      </div>
    );
  }

  const patient = visit.patient || {};
  const drugs = visit.drugs || [];
  const vitals = visit.vitals || {};
  const allergies = patient.allergies || [];
  const hasAllergies = !patient.no_known_allergies && allergies.length > 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* On-screen action toolbar (hidden on print) */}
      <div className="no-print flex items-center justify-between pb-2">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          onClick={handlePrint}
          className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>Print prescription</span>
        </button>
      </div>

      {/* Prescription Document (The printable sheet) */}
      <div className="bg-white text-slate-900 border border-slate-300 rounded-2xl p-8 sm:p-10 shadow-lg printable-area">
        {/* Clinic Letterhead */}
        <div className="border-b-2 border-teal-700 pb-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-teal-800">
              <Stethoscope className="w-7 h-7 text-teal-700" />
              <h1 className="text-2xl font-bold tracking-tight">
                CarePoint Medical Practice
              </h1>
            </div>
            <p className="text-sm font-semibold text-slate-800 mt-1">
              Dr. Aruna Perera, MBBS (Colombo), MD, MRCP
            </p>
            <p className="text-xs text-slate-600">
              Consultant Physician • SLMC Reg. No: 48291
            </p>
          </div>

          <div className="text-xs text-slate-600 sm:text-right space-y-0.5">
            <p className="font-semibold text-slate-800">Clinic & Consultation Center</p>
            <p>14/2 Hospital Road, Colombo 03</p>
            <p>Tel: 011-2345678 / 077-1234567</p>
            <p>Appointments: 071-9988776</p>
          </div>
        </div>

        {/* Patient Details & Date */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs sm:text-sm">
          <div>
            <span className="text-slate-500 font-medium block text-xs">Patient Name:</span>
            <span className="font-bold text-slate-900">{patient.full_name || "—"}</span>
          </div>

          <div>
            <span className="text-slate-500 font-medium block text-xs">Patient ID:</span>
            <span className="font-mono font-bold text-teal-800">{patient.id || "—"}</span>
          </div>

          <div>
            <span className="text-slate-500 font-medium block text-xs">Age / Sex:</span>
            <span className="font-semibold text-slate-800">
              {calculateAge(patient.dob)} / {patient.sex || "—"}
            </span>
          </div>

          <div>
            <span className="text-slate-500 font-medium block text-xs">Date:</span>
            <span className="font-semibold text-slate-800">{formatDate(visit.visit_date)}</span>
          </div>

          {vitals.bp_systolic && (
            <div className="col-span-2 sm:col-span-4 pt-2 border-t border-slate-200/60 text-xs text-slate-600 flex flex-wrap gap-4">
              <span><strong>BP:</strong> {vitals.bp_systolic}/{vitals.bp_diastolic || "—"} mmHg</span>
              {vitals.pulse && <span><strong>Pulse:</strong> {vitals.pulse} bpm</span>}
              {vitals.weight_kg && <span><strong>Weight:</strong> {vitals.weight_kg} kg</span>}
              {vitals.blood_sugar_mg && <span><strong>RBS:</strong> {vitals.blood_sugar_mg} mg/dL</span>}
            </div>
          )}
        </div>

        {/* Allergy Alert for Pharmacist */}
        {hasAllergies && (
          <div className="mb-6 p-3 rounded-lg border-2 border-red-500 bg-red-50 text-red-900 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>
              ALLERGY WARNING (Pharmacist check): Patient has recorded allergies to{" "}
              {allergies.map((a: any) => a.allergen).join(", ")}.
            </span>
          </div>
        )}

        {/* Diagnosis & Rx Symbol */}
        <div className="mb-4 flex items-center justify-between">
          <div className="text-3xl font-serif font-black text-teal-800">
            ℞
          </div>
          {visit.diagnosis && (
            <div className="text-xs text-slate-600">
              <span className="font-semibold">Diagnosis:</span> {visit.diagnosis}
            </div>
          )}
        </div>

        {/* Drugs Table */}
        <div className="mb-8 border border-slate-300 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold border-b border-slate-300">
              <tr>
                <th className="px-3.5 py-2.5">#</th>
                <th className="px-3.5 py-2.5">Medication & Strength</th>
                <th className="px-3.5 py-2.5">Dose</th>
                <th className="px-3.5 py-2.5">Frequency</th>
                <th className="px-3.5 py-2.5">Duration</th>
                <th className="px-3.5 py-2.5">Instructions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {drugs.map((drug: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="px-3.5 py-3 font-mono text-slate-400 text-xs">{idx + 1}</td>
                  <td className="px-3.5 py-3 font-bold text-slate-900">{drug.drug_name}</td>
                  <td className="px-3.5 py-3">{drug.dose}</td>
                  <td className="px-3.5 py-3 font-semibold text-teal-800">{drug.frequency}</td>
                  <td className="px-3.5 py-3">{drug.duration_days} days</td>
                  <td className="px-3.5 py-3 text-slate-600">{drug.instructions || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Follow-up Note */}
        {visit.follow_up_date && (
          <div className="mb-10 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
            <span className="font-bold text-slate-900">Next Review: </span>
            <span>{formatDate(visit.follow_up_date)}</span>
            {visit.follow_up_note && (
              <span className="block mt-0.5 text-slate-600 italic">
                Note: {visit.follow_up_note}
              </span>
            )}
          </div>
        )}

        {/* Doctor Signature Block */}
        <div className="pt-8 border-t border-slate-200 flex items-end justify-between text-xs text-slate-600">
          <div>
            <p className="italic text-[11px]">Valid for dispensing within 30 days of issue.</p>
            <p className="text-[10px] text-slate-400 mt-1 font-mono">Prescription Ref: {visit.id}</p>
          </div>

          <div className="text-center w-52">
            <div className="h-14 border-b border-dashed border-slate-400 mb-1.5" />
            <p className="font-bold text-slate-800">Dr. Aruna Perera</p>
            <p className="text-[11px] text-slate-500">Doctor&apos;s Signature & Stamp</p>
          </div>
        </div>
      </div>
    </div>
  );
}
