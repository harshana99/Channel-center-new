"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  QrCode,
  CalendarClock,
  Database,
  Search,
  Stethoscope,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Users,
  Activity,
  Heart,
  FileText,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { calculateAge, formatDate } from "@/lib/utils";

export default function HomePage() {
  const router = useRouter();
  const { role, userName, isDoctor } = useAuth();

  const [stats, setStats] = useState({
    patientsCount: 3,
    followUpsToday: 1,
    followUpsOverdue: 0,
    recentPatients: [] as any[],
  });
  const [quickSearch, setQuickSearch] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [patientsRes, followUpsRes] = await Promise.all([
          fetch("/api/patients"),
          fetch("/api/follow-ups"),
        ]);

        const patientsData = await patientsRes.json();
        const followUpsData = await followUpsRes.json();

        const patients = patientsData.patients || [];
        const followUps = followUpsData.followUps || [];

        const todayCount = followUps.filter((f: any) => f.status === "today").length;
        const overdueCount = followUps.filter((f: any) => f.status === "overdue").length;

        setStats({
          patientsCount: patients.length,
          followUpsToday: todayCount,
          followUpsOverdue: overdueCount,
          recentPatients: patients.slice(0, 3),
        });
      } catch (err) {
        console.error("Dashboard load error:", err);
      }
    }

    loadDashboard();
  }, []);

  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSearch.trim()) return;
    router.push(`/search?q=${encodeURIComponent(quickSearch.trim())}`);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-700 to-teal-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
          <Stethoscope className="w-64 h-64" />
        </div>

        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-600/60 backdrop-blur border border-teal-400/30 text-teal-100 text-xs font-medium">
            {isDoctor ? <ShieldCheck className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
            <span>Active session: {userName} ({role})</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            CarePoint Medical Practice
          </h1>
          <p className="text-teal-100 text-sm sm:text-base leading-relaxed">
            Fast, clinical patient management for private consultations. Clean, safe, and mobile-ready.
          </p>

          {/* Quick Find Bar */}
          <form onSubmit={handleQuickSearchSubmit} className="pt-2 flex items-center gap-2 max-w-lg">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Scan QR / barcode or enter patient ID, name, phone..."
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 shadow-sm"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-teal-950 font-bold text-sm shadow-sm transition-colors whitespace-nowrap"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Link
          href="/search"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:border-teal-500/50 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total patients
            </span>
            <Users className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
            {stats.patientsCount}
          </div>
          <span className="text-xs text-teal-600 dark:text-teal-400 flex items-center gap-1 mt-1 font-medium group-hover:underline">
            <span>Browse register</span>
            <ArrowRight className="w-3 h-3" />
          </span>
        </Link>

        <Link
          href="/follow-ups"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:border-teal-500/50 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Follow-ups today
            </span>
            <Clock className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="mt-2 text-3xl font-extrabold text-teal-600 dark:text-teal-400">
            {stats.followUpsToday}
          </div>
          <span className="text-xs text-slate-500 flex items-center gap-1 mt-1 font-medium">
            Due for review today
          </span>
        </Link>

        <Link
          href="/follow-ups"
          className="col-span-2 sm:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:border-rose-500/50 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Overdue returns
            </span>
            <AlertTriangle className="w-5 h-5 text-rose-500" />
          </div>
          <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
            {stats.followUpsOverdue}
          </div>
          <span className="text-xs text-slate-500 flex items-center gap-1 mt-1 font-medium">
            Past scheduled review
          </span>
        </Link>
      </div>

      {/* Main Action Touch Cards (Large targets for phone/tablet) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Register Patient Card */}
        <Link
          href="/register"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-500 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group flex items-start gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/70 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <UserPlus className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
              Register new patient
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Register patient demographics, auto-generate unique ID (P-XXXX), and print patient card with QR code.
            </p>
          </div>
        </Link>

        {/* Scan / Find Card */}
        <Link
          href="/search"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-500 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group flex items-start gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/70 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <QrCode className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
              Scan QR or search
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Scan patient card with phone camera or USB barcode reader. Fallback search by ID, name or phone.
            </p>
          </div>
        </Link>

        {/* Follow-ups */}
        <Link
          href="/follow-ups"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-500 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group flex items-start gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/70 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <CalendarClock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
              Follow-up appointments
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Track due appointments with Today & Overdue highlighted. One-click reminder via WhatsApp.
            </p>
          </div>
        </Link>

        {/* Data & Safety Backup */}
        <Link
          href="/backup"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-500 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group flex items-start gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/70 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Database className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
              Data & safety backup
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Export database to JSON / CSV, restore backups, and inspect full allergy safety audit trail.
            </p>
          </div>
        </Link>
      </div>

      {/* Demo Patient Flow Highlights */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Demo sample patients (ready to test)
            </h2>
            <p className="text-xs text-slate-500">
              Pre-loaded scenarios illustrating clinical workflow requirements
            </p>
          </div>

          <Link
            href="/search"
            className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card 1: John Silva */}
          <Link
            href="/patients/P-0001"
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-teal-500 bg-slate-50/50 dark:bg-slate-800/30 transition-all space-y-2 block"
          >
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
                P-0001
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                Penicillin allergy
              </span>
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              John Silva (39 yrs)
            </h3>
            <p className="text-xs text-slate-500">
              Hypertension. 2 past visits. Test typing &quot;Penicillin&quot; or &quot;Amoxicillin&quot; during a visit to trigger the real-time red allergy warning.
            </p>
          </Link>

          {/* Card 2: Sarah Fernando */}
          <Link
            href="/patients/P-0002"
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-teal-500 bg-slate-50/50 dark:bg-slate-800/30 transition-all space-y-2 block"
          >
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
                P-0002
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
                Follow-up TODAY
              </span>
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Sarah Fernando (28 yrs)
            </h3>
            <p className="text-xs text-slate-500">
              Asthma. Assessed with &quot;No known allergies&quot;. Return appointment scheduled for today. Check the Follow-ups tab.
            </p>
          </Link>

          {/* Card 3: Kasun Perera */}
          <Link
            href="/patients/P-0003"
            className="p-4 rounded-xl border-2 border-dashed border-amber-400/80 hover:border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 transition-all space-y-2 block"
          >
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200">
                P-0003
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100">
                0 Visits (First visit!)
              </span>
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Kasun Perera (23 yrs)
            </h3>
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Newly registered. Allergies not assessed yet. Click to start visit and experience the &quot;Medical background (first visit)&quot; flow!
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
