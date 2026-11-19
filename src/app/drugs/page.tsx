"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Pill,
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  ShieldCheck,
  RefreshCw,
  X,
  Filter,
} from "lucide-react";
import { DrugMasterItem, DrugFrequency } from "@/lib/types";

const COMMON_DRUG_CLASSES = [
  "penicillin",
  "cephalosporin",
  "macrolide",
  "fluoroquinolone",
  "sulfonamide",
  "tetracycline",
  "aminoglycoside",
  "carbapenem",
  "NSAID",
  "analgesic",
  "antihistamine",
  "statin",
  "antidiabetic",
  "antihypertensive",
  "antiulcer",
  "bronchodilator",
  "corticosteroid",
  "antifungal",
  "custom",
];

export default function DrugsManagementPage() {
  const { isDoctor, token, promptSwitchRole } = useAuth();

  const [drugs, setDrugs] = useState<DrugMasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [classFilter, setClassFilter] = useState<string>("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDrug, setEditingDrug] = useState<DrugMasterItem | null>(null);
  const [name, setName] = useState("");
  const [defaultDose, setDefaultDose] = useState("");
  const [defaultFrequency, setDefaultFrequency] = useState<DrugFrequency>("OD");
  const [drugClass, setDrugClass] = useState("");
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState("");
  const [bannerNotice, setBannerNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch Drugs
  const loadDrugs = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/drugs?active=all&limit=500", { headers });
      const data = await res.json();
      if (data.success) {
        setDrugs(data.drugs || []);
      } else {
        setBannerNotice({ type: "error", text: data.error || "Failed to load drugs" });
      }
    } catch (err: any) {
      setBannerNotice({ type: "error", text: err.message || "Failed to load drug master list" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isDoctor) {
      loadDrugs();
    }
  }, [isDoctor, token]);

  // Open Modal for Add
  const handleOpenAdd = () => {
    setEditingDrug(null);
    setName("");
    setDefaultDose("500mg");
    setDefaultFrequency("OD");
    setDrugClass("");
    setModalError("");
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (drug: DrugMasterItem) => {
    setEditingDrug(drug);
    setName(drug.name);
    setDefaultDose(drug.default_dose || "");
    setDefaultFrequency(drug.default_frequency || "OD");
    setDrugClass(drug.drug_class || "");
    setModalError("");
    setIsModalOpen(true);
  };

  // Save (Create or Update)
  const handleSaveDrug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setModalError("Drug name is required.");
      return;
    }

    setModalSaving(true);
    setModalError("");

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      if (editingDrug) {
        // PATCH
        const res = await fetch(`/api/drugs/${editingDrug.id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            name: name.trim(),
            default_dose: defaultDose.trim(),
            default_frequency: defaultFrequency,
            drug_class: drugClass.trim() || null,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to update drug");
        }

        setDrugs((prev) =>
          prev.map((d) => (d.id === editingDrug.id ? data.drug : d))
        );
        setBannerNotice({ type: "success", text: `Drug "${name.trim()}" updated successfully.` });
      } else {
        // POST
        const res = await fetch("/api/drugs", {
          method: "POST",
          headers,
          body: JSON.stringify({
            name: name.trim(),
            default_dose: defaultDose.trim(),
            default_frequency: defaultFrequency,
            drug_class: drugClass.trim() || null,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to add drug");
        }

        setDrugs((prev) => [data.drug, ...prev]);
        setBannerNotice({ type: "success", text: `Drug "${name.trim()}" added to master list.` });
      }

      setIsModalOpen(false);
    } catch (err: any) {
      setModalError(err.message || "An error occurred while saving.");
    } finally {
      setModalSaving(false);
    }
  };

  // Toggle Deactivate / Activate
  const handleToggleActive = async (drug: DrugMasterItem) => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      if (drug.active) {
        // Deactivate via DELETE or PATCH active=0
        const res = await fetch(`/api/drugs/${drug.id}`, {
          method: "DELETE",
          headers,
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Failed to deactivate drug");

        setDrugs((prev) =>
          prev.map((d) => (d.id === drug.id ? { ...d, active: 0 } : d))
        );
        setBannerNotice({ type: "success", text: `"${drug.name}" has been deactivated.` });
      } else {
        // Re-activate via PATCH
        const res = await fetch(`/api/drugs/${drug.id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ active: 1 }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Failed to activate drug");

        setDrugs((prev) =>
          prev.map((d) => (d.id === drug.id ? { ...d, active: 1 } : d))
        );
        setBannerNotice({ type: "success", text: `"${drug.name}" is now active.` });
      }
    } catch (err: any) {
      setBannerNotice({ type: "error", text: err.message || "Action failed." });
    }
  };

  // Filtered list
  const filteredDrugs = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return drugs.filter((d) => {
      // Status filter
      if (statusFilter === "active" && !d.active) return false;
      if (statusFilter === "inactive" && d.active) return false;

      // Class filter
      if (classFilter !== "all") {
        if (!d.drug_class || d.drug_class.toLowerCase() !== classFilter.toLowerCase()) {
          return false;
        }
      }

      // Search term
      if (q) {
        const matchName = d.name.toLowerCase().includes(q);
        const matchClass = (d.drug_class || "").toLowerCase().includes(q);
        const matchDose = (d.default_dose || "").toLowerCase().includes(q);
        return matchName || matchClass || matchDose;
      }

      return true;
    });
  }, [drugs, searchTerm, statusFilter, classFilter]);

  // Unique classes for filter dropdown
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    drugs.forEach((d) => {
      if (d.drug_class) set.add(d.drug_class);
    });
    return Array.from(set).sort();
  }, [drugs]);

  // Doctor Access Guard
  if (!isDoctor) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Doctor access required
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 leading-relaxed">
          The drug master list and prescribing catalog can only be viewed and modified by doctors.
          Reception staff are not authorized to view or manage prescription formulations.
        </p>
        <button
          onClick={() => promptSwitchRole("doctor")}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm transition-colors shadow-sm"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Switch to Doctor session</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Pill className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            <span>Drug master list</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Prescription medications, autocomplete defaults, and allergy safety classes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadDrugs}
            disabled={loading}
            title="Reload drugs"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add new drug</span>
          </button>
        </div>
      </div>

      {/* Banner Notice */}
      {bannerNotice && (
        <div
          className={`p-3.5 rounded-xl text-sm flex items-center justify-between ${
            bannerNotice.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800"
              : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {bannerNotice.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{bannerNotice.text}</span>
          </div>
          <button
            onClick={() => setBannerNotice(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by drug name, class, or dose..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-3 flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {(["all", "active", "inactive"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                  statusFilter === filter
                    ? "bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Class Filter */}
          <div className="sm:col-span-3">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200"
            >
              <option value="all">All drug classes ({availableClasses.length})</option>
              {availableClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Counter */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
          <span>
            Showing <strong className="text-slate-800 dark:text-slate-200">{filteredDrugs.length}</strong> of{" "}
            {drugs.length} registered medications
          </span>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="text-teal-600 dark:text-teal-400 hover:underline"
            >
              Clear search
            </button>
          )}
        </div>
      </div>

      {/* Drugs List / Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Loading master drugs...</p>
          </div>
        ) : filteredDrugs.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Pill className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
            <p className="text-base font-semibold">No medications found</p>
            <p className="text-xs text-slate-400 mt-1">
              Try adjusting your search query or add a new drug above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Drug name</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Default dose</th>
                  <th className="py-3 px-4">Frequency</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDrugs.map((drug) => (
                  <tr
                    key={drug.id}
                    className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                      !drug.active ? "opacity-60 bg-slate-50/30 dark:bg-slate-900/30" : ""
                    }`}
                  >
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      {drug.name}
                    </td>
                    <td className="py-3.5 px-4">
                      {drug.drug_class ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {drug.drug_class}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Unclassified</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                      {drug.default_dose || "—"}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-teal-700 dark:text-teal-300">
                      {drug.default_frequency || "OD"}
                    </td>
                    <td className="py-3.5 px-4">
                      {drug.active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                          <XCircle className="w-3 h-3" />
                          <span>Inactive</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(drug)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/60 dark:hover:text-teal-300"
                          title="Edit drug details"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(drug)}
                          className={`p-1.5 rounded-lg text-xs font-semibold ${
                            drug.active
                              ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60"
                              : "text-teal-600 hover:text-teal-800 hover:bg-teal-50 dark:hover:bg-teal-950/60"
                          }`}
                          title={drug.active ? "Deactivate drug" : "Activate drug"}
                        >
                          {drug.active ? (
                            <Trash2 className="w-4 h-4" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Drug Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Pill className="w-5 h-5 text-teal-600" />
                <span>{editingDrug ? "Edit medication" : "Add new medication"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveDrug} className="space-y-4">
              {/* Drug Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Drug name & formulation <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amoxicillin, Paracetamol"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Default Dose */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Default dose
                </label>
                <input
                  type="text"
                  placeholder="e.g. 500mg, 10mg, 1 puff"
                  value={defaultDose}
                  onChange={(e) => setDefaultDose(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                />
              </div>

              {/* Default Frequency */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Default frequency
                </label>
                <select
                  value={defaultFrequency}
                  onChange={(e) => setDefaultFrequency(e.target.value as DrugFrequency)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium"
                >
                  <option value="OD">OD (Once daily)</option>
                  <option value="BD">BD (Twice daily)</option>
                  <option value="TDS">TDS (3x daily)</option>
                  <option value="QDS">QDS (4x daily)</option>
                  <option value="Nocte">Nocte (At night)</option>
                  <option value="SOS">SOS (As needed)</option>
                </select>
              </div>

              {/* Drug Class */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Drug safety class (for cross-allergy checks)
                </label>
                <input
                  type="text"
                  list="class-suggestions"
                  placeholder="e.g. penicillin, cephalosporin, NSAID"
                  value={drugClass}
                  onChange={(e) => setDrugClass(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                />
                <datalist id="class-suggestions">
                  {COMMON_DRUG_CLASSES.map((cls) => (
                    <option key={cls} value={cls} />
                  ))}
                </datalist>
                <p className="text-[11px] text-slate-500 mt-1">
                  Cross-allergy alerts trigger if patient has an allergy to this class.
                </p>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSaving}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  {modalSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingDrug ? "Update drug" : "Save drug"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
