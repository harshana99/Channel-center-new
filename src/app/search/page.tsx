"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Camera,
  CameraOff,
  User,
  Phone,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  Stethoscope,
  Barcode,
  Loader2,
  X,
  Users,
  UserPlus,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { calculateAge } from "@/lib/utils";

export default function SearchPage() {
  const router = useRouter();
  const { isDoctor } = useAuth();

  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Camera scanner state
  const [scannerActive, setScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load initial patients list on mount
  useEffect(() => {
    fetchPatients("");
  }, []);

  const fetchPatients = async (searchTerm: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/patients?q=${encodeURIComponent(searchTerm)}`);
      const data = await res.json();
      if (data.success) {
        setPatients(data.patients || []);
      }
    } catch (err) {
      console.error("Error fetching patients:", err);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    fetchPatients(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) return;

      const idMatch = trimmed.match(/^P-\d+$/i);
      if (idMatch) {
        router.push(`/patients/${trimmed.toUpperCase()}`);
        return;
      }

      // If exactly 1 patient matched and not a phone search
      if (patients.length === 1 && !isPhoneQuery) {
        router.push(`/patients/${patients[0].id}`);
      }
    }
  };

  // Camera QR Scanner control
  useEffect(() => {
    let html5QrCode: any = null;

    if (scannerActive) {
      import("html5-qrcode")
        .then(({ Html5Qrcode }) => {
          html5QrCode = new Html5Qrcode("qr-reader-container");
          scannerRef.current = html5QrCode;

          html5QrCode
            .start(
              { facingMode: "environment" },
              {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
              },
              (decodedText: string) => {
                const cleanId = decodedText.trim();
                if (cleanId) {
                  html5QrCode
                    .stop()
                    .then(() => {
                      setScannerActive(false);
                      router.push(`/patients/${cleanId}`);
                    })
                    .catch(() => {
                      router.push(`/patients/${cleanId}`);
                    });
                }
              },
              () => {}
            )
            .catch((err: any) => {
              console.warn("Camera start error:", err);
              setCameraError(
                "Unable to access camera. Please allow camera permissions or use the search box with USB scanner."
              );
              setScannerActive(false);
            });
        })
        .catch(() => {
          setCameraError("Camera scanner library could not load. Please use search box.");
          setScannerActive(false);
        });
    }

    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().catch(() => {});
        } catch {}
      }
    };
  }, [scannerActive, router]);

  const toggleScanner = () => {
    setCameraError(null);
    setScannerActive((prev) => !prev);
  };

  // Phone lookup detection
  const digitsOnly = query.replace(/\D/g, "");
  const isPhoneQuery = digitsOnly.length >= 4;
  const isSharedPhone = isPhoneQuery && patients.length > 1;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Find or scan patient
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Scan QR code with camera, use USB barcode reader, or search by name, ID or phone
          </p>
        </div>

        {/* Camera Toggle Button */}
        <button
          type="button"
          onClick={toggleScanner}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all shadow-sm ${
            scannerActive
              ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
              : "bg-teal-600 hover:bg-teal-700 text-white"
          }`}
        >
          {scannerActive ? (
            <>
              <CameraOff className="w-4 h-4" />
              <span>Close camera</span>
            </>
          ) : (
            <>
              <Camera className="w-4 h-4" />
              <span>Scan with camera</span>
            </>
          )}
        </button>
      </div>

      {/* Camera Scanner View */}
      {scannerActive && (
        <div className="bg-white dark:bg-slate-900 border-2 border-teal-500/40 rounded-2xl p-6 shadow-md overflow-hidden animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-teal-600 dark:text-teal-400 animate-pulse" />
              <span className="font-semibold text-slate-900 dark:text-white">
                Align patient card QR code inside camera frame
              </span>
            </div>
            <button
              onClick={() => setScannerActive(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div
            id="qr-reader-container"
            className="w-full max-w-sm mx-auto overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-black min-h-[260px]"
          />

          <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4">
            Position the QR code steadily. Upon scan, the patient record opens automatically.
          </p>
        </div>
      )}

      {/* Camera Error Message */}
      {cameraError && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 flex items-start gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">Camera scanner unavailable</p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
              {cameraError} You can type the patient ID or phone in the search box below, or connect a USB barcode scanner.
            </p>
          </div>
          <button
            onClick={() => setCameraError(null)}
            className="text-amber-600 dark:text-amber-400 hover:text-amber-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search Input Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
          <Search className="w-5 h-5" />
        </div>
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoFocus
          placeholder="Search by phone (e.g. 0771234567), ID (e.g. P-0001), name or USB barcode..."
          className="w-full pl-12 pr-28 py-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 text-base shadow-sm focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all"
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-2">
          {query && (
            <button
              onClick={() => {
                setQuery("");
                fetchPatients("");
                searchInputRef.current?.focus();
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-500">
            <Barcode className="w-3.5 h-3.5" />
            <span>USB scanner ready</span>
          </span>
        </div>
      </div>

      {/* SHARED PHONE NUMBER DISAMBIGUATION BANNER */}
      {isSharedPhone && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100 space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm sm:text-base">
            <Users className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Multiple patients share this phone number ({patients.length} matches found)</span>
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-200">
            Several family members or contacts share phone number <span className="font-mono font-bold">{query}</span>. Please verify and select the individual patient record:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {patients.map((p) => (
              <Link
                key={p.id}
                href={`/patients/${p.id}`}
                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/80 hover:border-teal-500 shadow-sm flex items-center justify-between gap-3 group transition-all"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950 font-mono font-bold text-xs text-teal-800 dark:text-teal-200">
                      {p.id}
                    </span>
                    <span className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-teal-600">
                      {p.full_name}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 mt-0.5 block">
                    {p.sex || "Sex: —"} • Age: {calculateAge(p.dob)}
                  </span>
                </div>
                <span className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold flex items-center gap-1 group-hover:bg-teal-700 shrink-0">
                  <span>Select</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Results List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
          <span>Patients ({patients.length})</span>
          {loading && (
            <span className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Updating...</span>
            </span>
          )}
        </div>

        {patients.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-3">
            <User className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              No matching patient records
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              We couldn&apos;t find any patient matching &quot;{query}&quot;.
            </p>

            {/* If user was searching for a phone number that doesn't exist, offer quick register with prefilled phone! */}
            {isPhoneQuery ? (
              <div className="pt-2">
                <Link
                  href={`/register?phone=${encodeURIComponent(query.trim())}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold shadow-sm transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register new patient with phone {query}</span>
                </Link>
              </div>
            ) : (
              <Link
                href="/register"
                className="inline-flex items-center gap-2 mt-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-all"
              >
                <span>Register new patient</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {patients.map((p) => {
              const notAssessed = Number(p.allergies_assessed) === 0;
              const hasAllergies = !notAssessed && Number(p.no_known_allergies) === 0;

              return (
                <div
                  key={p.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-500/50 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/70 border border-teal-200/60 dark:border-teal-800/60 text-teal-700 dark:text-teal-300 font-mono font-bold text-sm flex items-center justify-center shrink-0">
                      {p.id}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/patients/${p.id}`}
                          className="font-bold text-slate-900 dark:text-white text-base sm:text-lg hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                        >
                          {p.full_name}
                        </Link>

                        {/* Allergy Status Tag */}
                        {notAssessed ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-medium flex items-center gap-1">
                            <HelpCircle className="w-3 h-3" />
                            <span>Allergies not assessed</span>
                          </span>
                        ) : hasAllergies ? (
                          <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Has allergies</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>No allergies</span>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        <span>{p.sex || "Sex: —"}</span>
                        <span>•</span>
                        <span>Age: {calculateAge(p.dob)}</span>
                        {p.phone && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              {p.phone}
                            </span>
                          </>
                        )}
                        {p.nic && (
                          <>
                            <span>•</span>
                            <span>NIC: {p.nic}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0 w-full sm:w-auto">
                    {isDoctor && (
                      <Link
                        href={`/patients/${p.id}/visit/new`}
                        className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 hover:bg-teal-100 border border-teal-200 dark:border-teal-800 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Stethoscope className="w-4 h-4" />
                        <span>New visit</span>
                      </Link>
                    )}

                    <Link
                      href={`/patients/${p.id}`}
                      className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>Profile</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
