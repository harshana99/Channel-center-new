"use client";

import React, { useState, useEffect } from "react";
import {
  Database,
  Download,
  Upload,
  RotateCcw,
  ShieldCheck,
  History,
  FileSpreadsheet,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Lock,
  Server,
  KeyRound,
  HardDrive,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function BackupPage() {
  const { isDoctor, token, mustChangePin } = useAuth();

  const [stats, setStats] = useState({
    patients: 0,
    visits: 0,
    auditLogs: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const [importing, setImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadData = async () => {
    setLoadingStats(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const pRes = await fetch("/api/patients", { headers });
      const pData = await pRes.json();

      const bRes = await fetch("/api/backup", { headers });
      const bData = await bRes.json();

      if (bData.counts) {
        setStats(bData.counts);
      } else {
        setStats({
          patients: (pData.patients || []).length,
          visits: (bData.visits || []).length,
          auditLogs: (bData.audit_logs || []).length,
        });
      }

      setAuditLogs(bData.audit_logs || []);
    } catch (err) {
      console.error("Error loading backup stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const handleExportJson = () => {
    if (!isDoctor) {
      alert("Doctor authorization required to export full clinical backup.");
      return;
    }
    window.location.href = "/api/backup";
  };

  const handleExportCsv = () => {
    if (!isDoctor) {
      alert("Doctor authorization required to export register CSV.");
      return;
    }
    window.location.href = "/api/backup?format=csv";
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isDoctor) {
      alert("Doctor authorization required to restore backup data.");
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setImporting(true);
        setStatusMessage(null);
        const parsed = JSON.parse(event.target?.result as string);

        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch("/api/backup", {
          method: "POST",
          headers,
          body: JSON.stringify(parsed),
        });

        const result = await res.json();
        if (res.ok && result.success) {
          setStatusMessage({
            type: "success",
            text: result.message || "Backup data restored successfully!",
          });
          loadData();
        } else {
          setStatusMessage({
            type: "error",
            text: result.error || "Failed to restore backup file.",
          });
        }
      } catch (err: any) {
        setStatusMessage({
          type: "error",
          text: "Invalid JSON backup file: " + err.message,
        });
      } finally {
        setImporting(false);
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Database className="w-6 h-6 text-teal-600" />
          <span>Data backup & safety</span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Export clinical database, restore from backup, and review medical audit logs
        </p>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm animate-in fade-in duration-200 ${
            statusMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
              : "bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Role Alert if Reception */}
      {!isDoctor && (
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-xs sm:text-sm flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            You are logged in with the Reception role. Full medical backups and restore functions are restricted to Doctor authorization.
          </span>
        </div>
      )}

      {/* Database Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Total patients
          </span>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {loadingStats ? "..." : stats.patients}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Registered in database</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Clinical visits
          </span>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {loadingStats ? "..." : stats.visits}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Completed consultations</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Audit entries
          </span>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {loadingStats ? "..." : stats.auditLogs}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Allergy & condition change logs</span>
        </div>
      </div>

      {/* SECTION 5: PRODUCTION READINESS & SECURITY SPECIFICATION */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <ShieldCheck className="w-5 h-5 text-teal-600" />
          <h2 className="font-bold text-base text-slate-900 dark:text-white">
            Production readiness & security settings
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600 dark:text-slate-300">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-amber-500" />
              <span>PIN Security & Hashing</span>
            </span>
            <p>
              PINs are hashed using PBKDF2 (SHA-512 with 100,000 iterations & random 128-bit salts). Default PINs (1234/5678) trigger a mandatory change modal upon first login. Rate limiting enforces a 15-minute lockout after 5 consecutive failures.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Server className="w-4 h-4 text-teal-600" />
              <span>HTTPS & Cookie Flags</span>
            </span>
            <p>
              When deployed to production, sessions are strictly stored in HTTP-only cookies with `Secure`, `SameSite=Lax`, and `Max-Age=28800` (8-hour session timeout). All API transport must run over TLS/HTTPS.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-blue-600" />
              <span>Database Region & Low Latency</span>
            </span>
            <p>
              For cloud deployments with Turso or Supabase, select the primary region closest to your clinic (e.g., `sin` Singapore / `bom` Mumbai) for sub-50ms query latency.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Database className="w-4 h-4 text-purple-600" />
              <span>Data Storage Breakdown</span>
            </span>
            <p>
              • <strong>Demographics:</strong> `patients` table (Names, Phones, Normalized format, NIC, Address).
              <br />
              • <strong>Clinical Notes & Rx:</strong> `visits` table (Role-enforced, masked for reception).
              <br />
              • <strong>Audit Trail:</strong> `audit_logs` table (Immutable record of medical changes).
            </p>
          </div>
        </div>
      </div>

      {/* Backup & Export Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Export JSON */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/70 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 flex items-center justify-center">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Full JSON backup</h3>
              <p className="text-xs text-slate-500">
                Exports patients, visits, prescriptions and audit logs
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Download a portable, structured JSON file that can be saved offsite or used to restore data. (Doctor access required).
          </p>
          <button
            type="button"
            onClick={handleExportJson}
            disabled={!isDoctor}
            className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            <span>Download JSON backup</span>
          </button>
        </div>

        {/* Export CSV */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Export CSV spreadsheet</h3>
              <p className="text-xs text-slate-500">
                Compatible with Excel, Google Sheets, LibreOffice
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Export patient register records with names, normalized phones, NIC, and addresses for reporting.
          </p>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!isDoctor}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            <span>Download patients CSV</span>
          </button>
        </div>
      </div>

      {/* Import / Restore Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 flex items-center justify-center">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Restore from backup</h3>
            <p className="text-xs text-slate-500">
              Upload a previously downloaded JSON backup file
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400">
          Restoring merges and updates records by their unique IDs. Existing records with matching IDs will be refreshed. (Doctor access required).
        </p>

        <div className="flex items-center gap-3">
          <label
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all ${
              !isDoctor
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "cursor-pointer bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900"
            }`}
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Restoring records...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Select backup JSON file</span>
              </>
            )}
            <input
              type="file"
              accept=".json"
              disabled={importing || !isDoctor}
              onChange={handleImportFile}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Audit Log for Edits to Allergies & Conditions (Visible only to Doctor) */}
      {isDoctor && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-teal-600" />
              <h3 className="font-bold text-slate-900 dark:text-white">
                Medical safety audit log
              </h3>
            </div>
            <span className="text-xs text-slate-400">{auditLogs.length} logged events</span>
          </div>

          {auditLogs.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No safety audit logs recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase">
                  <tr>
                    <th className="px-3 py-2">Timestamp</th>
                    <th className="px-3 py-2">Patient ID</th>
                    <th className="px-3 py-2">Editor</th>
                    <th className="px-3 py-2">Action</th>
                    <th className="px-3 py-2">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {auditLogs.map((log) => {
                    let details: any = {};
                    try {
                      details = typeof log.details_json === "string" ? JSON.parse(log.details_json) : log.details_json;
                    } catch {}

                    return (
                      <tr key={log.id}>
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-400">
                          {new Date(log.created_at).toLocaleString("en-GB")}
                        </td>
                        <td className="px-3 py-2 font-bold font-mono text-teal-700 dark:text-teal-400">
                          {log.patient_id}
                        </td>
                        <td className="px-3 py-2">
                          {log.changed_by_name} ({log.changed_by_role})
                        </td>
                        <td className="px-3 py-2 font-semibold">
                          {log.change_type === "first_visit_assessment"
                            ? "First visit background"
                            : "Allergies / conditions update"}
                        </td>
                        <td className="px-3 py-2 text-slate-500">
                          {details?.note || details?.reason || "Updated record"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
