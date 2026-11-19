"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Printer, ArrowLeft, Stethoscope } from "lucide-react";
import { calculateAge, formatDate } from "@/lib/utils";

export default function PatientCardPrintPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.patientId as string;

  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/patients/${patientId}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Patient not found");
        }
        setPatient(data.patient);
      } catch (err: any) {
        setError(err.message || "Failed to load card");
      } finally {
        setLoading(false);
      }
    }
    if (patientId) load();
  }, [patientId]);

  if (loading) {
    return <div className="py-16 text-center text-slate-500">Loading card...</div>;
  }

  if (error || !patient) {
    return (
      <div className="py-16 text-center">
        <p className="text-rose-500">{error || "Patient not found"}</p>
        <button onClick={() => router.back()} className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="no-print flex items-center justify-between pb-2">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to profile</span>
        </button>

        <button
          onClick={() => window.print()}
          className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold flex items-center gap-2 shadow-sm"
        >
          <Printer className="w-4 h-4" />
          <span>Print patient card</span>
        </button>
      </div>

      {/* Patient Card View (Standard ID size) */}
      <div className="bg-white text-slate-900 border-2 border-teal-600 rounded-3xl p-6 sm:p-8 shadow-xl printable-area max-w-md mx-auto">
        <div className="flex items-center justify-between border-b-2 border-teal-600/30 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center">
              <Stethoscope className="w-4 h-4" />
            </div>
            <div>
              <span className="block font-bold text-sm tracking-tight text-teal-800 leading-none">
                CarePoint Clinic
              </span>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">
                Patient Medical ID
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-md bg-teal-50 border border-teal-200 text-teal-800 font-mono font-bold text-xs">
            {patient.id}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Patient Name</span>
              <h2 className="text-xl font-bold text-slate-900 leading-tight">
                {patient.full_name}
              </h2>
            </div>

            <div className="text-xs text-slate-600 space-y-0.5">
              <p>
                <span className="font-semibold text-slate-700">Sex / Age: </span>
                {patient.sex || "—"} / {calculateAge(patient.dob)}
              </p>
              {patient.dob && (
                <p>
                  <span className="font-semibold text-slate-700">DOB: </span>
                  {formatDate(patient.dob)}
                </p>
              )}
              {patient.phone && (
                <p>
                  <span className="font-semibold text-slate-700">Phone: </span>
                  {patient.phone}
                </p>
              )}
              {patient.nic && (
                <p>
                  <span className="font-semibold text-slate-700">NIC: </span>
                  {patient.nic}
                </p>
              )}
            </div>
          </div>

          {/* QR Code containing ONLY patient ID */}
          <div className="flex flex-col items-center p-2 rounded-xl border border-slate-200 bg-white shrink-0">
            <QRCodeSVG value={patient.id} size={110} level="H" includeMargin={true} />
            <span className="mt-1 text-[10px] font-mono font-bold text-slate-700">
              {patient.id}
            </span>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-200 text-[10px] text-center text-slate-400">
          Present this card upon arrival for instant check-in. • CarePoint Practice
        </div>
      </div>
    </div>
  );
}
