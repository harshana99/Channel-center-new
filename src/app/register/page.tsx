"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import {
  UserPlus,
  Printer,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Phone,
  CreditCard,
  MapPin,
  User,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { calculateAge } from "@/lib/utils";

function RegisterContent() {
  const searchParams = useSearchParams();
  const phoneParam = searchParams.get("phone") || "";

  const [formData, setFormData] = useState({
    full_name: "",
    dob: "",
    sex: "Male",
    phone: phoneParam,
    nic: "",
    address: "",
  });

  useEffect(() => {
    if (phoneParam) {
      setFormData((prev) => ({ ...prev, phone: phoneParam }));
    }
  }, [phoneParam]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedPatient, setSavedPatient] = useState<{
    id: string;
    full_name: string;
    dob: string;
    sex: string;
    phone: string;
    nic: string;
    address: string;
  } | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      setError("Please enter the patient's full name");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to register patient");
      }

      setSavedPatient(data.patient);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintCard = () => {
    window.print();
  };

  const handleReset = () => {
    setFormData({
      full_name: "",
      dob: "",
      sex: "Male",
      phone: "",
      nic: "",
      address: "",
    });
    setSavedPatient(null);
    setError(null);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* If patient is successfully saved, display the printable patient card modal/view */}
      {savedPatient ? (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="no-print bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 p-4 rounded-2xl flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">
                Patient registered successfully
              </h3>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                Assigned ID: <span className="font-bold">{savedPatient.id}</span>. You can now print the physical patient card below.
              </p>
            </div>
          </div>

          {/* Printable Patient Card */}
          <div className="bg-white dark:bg-slate-900 border-2 border-teal-500/40 rounded-2xl p-6 sm:p-8 shadow-lg printable-area">
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
              <div className="text-center sm:text-left space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                  CarePoint Medical Practice
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                  {savedPatient.full_name}
                </h2>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 text-sm text-slate-600 dark:text-slate-400">
                  <span className="px-2.5 py-1 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 font-mono font-bold text-base">
                    {savedPatient.id}
                  </span>
                  <span>•</span>
                  <span>{savedPatient.sex || "Sex not specified"}</span>
                  {savedPatient.dob && (
                    <>
                      <span>•</span>
                      <span>Age: {calculateAge(savedPatient.dob)}</span>
                    </>
                  )}
                </div>
              </div>

              {/* QR Code containing ONLY patient ID */}
              <div className="flex flex-col items-center p-3 rounded-xl bg-white border border-slate-200 shadow-sm shrink-0">
                <QRCodeSVG
                  value={savedPatient.id}
                  size={120}
                  level="H"
                  includeMargin={true}
                />
                <span className="mt-1 text-xs font-mono font-semibold text-slate-700">
                  {savedPatient.id}
                </span>
              </div>
            </div>

            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-600 dark:text-slate-400">
              <div>
                <span className="font-medium text-slate-500 dark:text-slate-500">Phone: </span>
                <span className="text-slate-900 dark:text-slate-200">{savedPatient.phone || "—"}</span>
              </div>
              <div>
                <span className="font-medium text-slate-500 dark:text-slate-500">NIC: </span>
                <span className="text-slate-900 dark:text-slate-200">{savedPatient.nic || "—"}</span>
              </div>
              {savedPatient.address && (
                <div className="sm:col-span-2">
                  <span className="font-medium text-slate-500 dark:text-slate-500">Address: </span>
                  <span className="text-slate-900 dark:text-slate-200">{savedPatient.address}</span>
                </div>
              )}
            </div>

            <p className="mt-6 text-xs text-center text-slate-400 dark:text-slate-500">
              Present this card or QR code at reception upon each clinic visit.
            </p>
          </div>

          {/* Action buttons (hidden when printing) */}
          <div className="no-print flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={handlePrintCard}
              className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <Printer className="w-5 h-5" />
              <span>Print patient card</span>
            </button>

            <Link
              href={`/patients/${savedPatient.id}`}
              className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-medium flex items-center justify-center gap-2 shadow-sm transition-all text-center"
            >
              <span>Open patient profile</span>
              <ArrowRight className="w-5 h-5" />
            </Link>

            <button
              type="button"
              onClick={handleReset}
              className="w-full sm:w-auto py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium flex items-center justify-center gap-2 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Register another</span>
            </button>
          </div>
        </div>
      ) : (
        /* Registration Form */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Register new patient
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Demographics and contact details for patient registration card
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 flex items-center gap-3 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                Full name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  name="full_name"
                  required
                  autoFocus
                  placeholder="e.g. Kasun Chamara Perera"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* DOB & Sex */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  Date of birth
                  {formData.dob && (
                    <span className="ml-2 text-xs font-normal text-teal-600 dark:text-teal-400 font-mono">
                      (Age: {calculateAge(formData.dob)})
                    </span>
                  )}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <input
                    type="date"
                    name="dob"
                    max={new Date().toISOString().split("T")[0]}
                    value={formData.dob}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  Sex
                </label>
                <select
                  name="sex"
                  value={formData.sex}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Phone & NIC */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  Phone number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-5 h-5" />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="e.g. 0771234567"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  National ID (NIC)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    name="nic"
                    placeholder="e.g. 199678401234 or 851029384V"
                    value={formData.nic}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                Address
              </label>
              <div className="relative">
                <div className="absolute top-3.5 left-0 pl-3.5 pointer-events-none text-slate-400">
                  <MapPin className="w-5 h-5" />
                </div>
                <textarea
                  name="address"
                  rows={2}
                  placeholder="e.g. 88 Lake Road, Negombo"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all resize-none"
                />
              </div>
            </div>

            {/* Clinical Note reminder */}
            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Note: </span>
              Allergies and chronic medical conditions are not recorded during registration; they are formally assessed by the doctor during the initial medical consultation.
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-base shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Generating ID & Patient Card...</span>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  <span>Register patient & generate card</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-slate-500">Loading registration form...</div>}>
      <RegisterContent />
    </Suspense>
  );
}
