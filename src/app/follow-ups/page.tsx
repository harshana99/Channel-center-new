"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CalendarClock,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Phone,
  MessageSquare,
  ArrowRight,
  Calendar,
  Check,
  RotateCcw,
  Tag,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "today" | "overdue" | "upcoming">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadFollowUps = async () => {
    try {
      const res = await fetch("/api/follow-ups");
      const data = await res.json();
      if (data.success) {
        setFollowUps(data.followUps || []);
      }
    } catch (err) {
      console.error("Error loading follow ups:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFollowUps();
  }, []);

  const handleToggleComplete = async (visitId: string, currentCompleted: boolean) => {
    setUpdatingId(visitId);
    try {
      const res = await fetch("/api/follow-ups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visit_id: visitId,
          completed: !currentCompleted,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFollowUps((prev) =>
          prev.map((f) =>
            f.visit_id === visitId ? { ...f, follow_up_completed: !currentCompleted } : f
          )
        );
      }
    } catch (err) {
      console.error("Failed to update follow-up status:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  // WhatsApp Reminder Privacy Rule:
  // Must contain ONLY patient first name, date, time and clinic name.
  // NEVER diagnosis, drugs or allergies!
  const openWhatsAppReminder = (item: any) => {
    const rawPhone = String(item.phone || "").replace(/[^0-9]/g, "");
    let intlPhone = rawPhone;
    if (intlPhone.startsWith("0")) {
      intlPhone = "94" + intlPhone.substring(1);
    }

    // Extract first name ONLY
    const firstName = String(item.full_name || "Patient").trim().split(" ")[0];
    const appointmentDate = formatDate(item.follow_up_date);

    // Strictly privacy-compliant reminder message:
    const message = encodeURIComponent(
      `Hello ${firstName}, this is a reminder from CarePoint Medical Practice for your scheduled appointment on ${appointmentDate} at 10:00 AM. If you need to reschedule, please contact our clinic.`
    );

    window.open(`https://wa.me/${intlPhone}?text=${message}`, "_blank");
  };

  const counts = {
    all: followUps.length,
    today: followUps.filter((f) => f.status === "today").length,
    overdue: followUps.filter((f) => f.status === "overdue").length,
    upcoming: followUps.filter((f) => f.status === "upcoming").length,
  };

  const filteredItems = followUps.filter((f) => {
    if (filter === "all") return true;
    return f.status === filter;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-teal-600" />
            <span>Follow-up schedule</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Monitor return appointments, make direct calls, and send confidential privacy-compliant reminders
          </p>
        </div>

        {/* Filter Tabs with real-time Counts */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === "all"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            All ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setFilter("today")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === "today"
                ? "bg-teal-600 text-white shadow-sm"
                : "text-teal-700 dark:text-teal-400 hover:text-teal-900"
            }`}
          >
            Today ({counts.today})
          </button>
          <button
            type="button"
            onClick={() => setFilter("overdue")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === "overdue"
                ? "bg-rose-600 text-white shadow-sm"
                : "text-rose-700 dark:text-rose-400 hover:text-rose-900"
            }`}
          >
            Overdue ({counts.overdue})
          </button>
          <button
            type="button"
            onClick={() => setFilter("upcoming")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === "upcoming"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Upcoming ({counts.upcoming})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500">
          <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p>Loading follow-up schedule...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center">
          <CheckCircle2 className="w-10 h-10 text-teal-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            No follow-up appointments found
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {filter === "all"
              ? "No scheduled return visits on file."
              : `No appointments currently marked as ${filter}.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filteredItems.map((item) => {
            const isToday = item.status === "today";
            const isOverdue = item.status === "overdue";
            const isDone = Boolean(item.follow_up_completed);

            return (
              <div
                key={item.visit_id}
                className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border transition-all shadow-sm hover:shadow ${
                  isDone
                    ? "opacity-60 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
                    : isToday
                    ? "border-2 border-teal-500 ring-2 ring-teal-500/10 bg-teal-50/20 dark:bg-teal-950/20"
                    : isOverdue
                    ? "border-2 border-rose-300 dark:border-rose-900/80 bg-rose-50/20 dark:bg-rose-950/20"
                    : "border-slate-200 dark:border-slate-800"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Patient info, Date & Follow-up Reason */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs">
                        {item.patient_id}
                      </span>
                      <Link
                        href={`/patients/${item.patient_id}`}
                        className={`font-bold text-base hover:text-teal-600 dark:hover:text-teal-400 transition-colors ${
                          isDone
                            ? "line-through text-slate-500 dark:text-slate-400"
                            : "text-slate-900 dark:text-white"
                        }`}
                      >
                        {item.full_name}
                      </Link>

                      {/* Status Badges */}
                      {isDone ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Completed</span>
                        </span>
                      ) : (
                        <>
                          {isToday && (
                            <span className="px-2.5 py-0.5 rounded-full bg-teal-600 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                              <Clock className="w-3 h-3" />
                              <span>Today</span>
                            </span>
                          )}
                          {isOverdue && (
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Overdue</span>
                            </span>
                          )}
                          {!isToday && !isOverdue && (
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium">
                              Upcoming
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-teal-600" />
                        <span>Due: {formatDate(item.follow_up_date)}</span>
                      </span>

                      {item.phone && (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.phone}</span>
                        </span>
                      )}

                      <span>Attended: {formatDate(item.visit_date)}</span>
                    </div>

                    {/* Optional Follow-up Reason Tag */}
                    {item.follow_up_reason && (
                      <div className="pt-0.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 text-teal-800 dark:text-teal-300 text-xs font-medium">
                          <Tag className="w-3 h-3" />
                          <span>Reason: {item.follow_up_reason}</span>
                        </span>
                      </div>
                    )}

                    {item.follow_up_note && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 inline-block mt-1">
                        <span className="font-semibold text-slate-600 dark:text-slate-300">Note: </span>
                        {item.follow_up_note}
                      </p>
                    )}
                  </div>

                  {/* Right Actions: Mark Done + Call + WhatsApp Reminder */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Mark Done / Pending Toggle Button */}
                    <button
                      type="button"
                      disabled={updatingId === item.visit_id}
                      onClick={() => handleToggleComplete(item.visit_id, isDone)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                        isDone
                          ? "border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                          : "bg-teal-50 dark:bg-teal-950/70 border border-teal-300 dark:border-teal-800 text-teal-800 dark:text-teal-200 hover:bg-teal-100"
                      }`}
                    >
                      {isDone ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                          <span>Reopen</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                          <span>Mark done</span>
                        </>
                      )}
                    </button>

                    {/* Direct Call Button (tel: link) */}
                    {item.phone && (
                      <a
                        href={`tel:${item.phone}`}
                        className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                        title={`Call ${item.phone}`}
                      >
                        <Phone className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        <span>Call</span>
                      </a>
                    )}

                    {/* WhatsApp Reminder Button (Privacy Preserved: Only First Name, Date, Time, Clinic) */}
                    {item.phone && (
                      <button
                        type="button"
                        onClick={() => openWhatsAppReminder(item)}
                        className="px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                        title="Send confidential appointment reminder (First name, Date, Time only)"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WhatsApp</span>
                      </button>
                    )}

                    <Link
                      href={`/patients/${item.patient_id}`}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <span>Profile</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
