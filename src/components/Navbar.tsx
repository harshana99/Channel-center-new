"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import {
  Stethoscope,
  UserPlus,
  QrCode,
  CalendarClock,
  Database,
  Moon,
  Sun,
  ShieldCheck,
  UserCheck,
  KeyRound,
  X,
  Menu,
  Activity,
  LogOut,
  Lock,
  Pill,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const {
    role,
    userName,
    isDoctor,
    loginWithPin,
    logout,
    showPinModal,
    setShowPinModal,
    promptSwitchRole,
  } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinLoading, setPinLoading] = useState(false);

  const navLinks = [
    { href: "/", label: "Dashboard", icon: Activity },
    { href: "/register", label: "Register patient", icon: UserPlus },
    { href: "/search", label: "Scan / find", icon: QrCode },
    { href: "/follow-ups", label: "Follow-ups", icon: CalendarClock },
    ...(isDoctor ? [{ href: "/drugs", label: "Drug list", icon: Pill }] : []),
    { href: "/backup", label: "Data backup", icon: Database },
  ];

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) return;
    setPinLoading(true);
    setPinError("");

    // Switching to Doctor role requires Doctor PIN
    const res = await loginWithPin(pinInput, isDoctor ? "reception" : "doctor");
    setPinLoading(false);
    if (res.success) {
      setShowPinModal(false);
      setPinInput("");
    } else {
      setPinError(res.message || "Invalid PIN");
    }
  };

  const handleRoleButtonClick = () => {
    setPinInput("");
    setPinError("");
    if (isDoctor) {
      // Switching back to Reception
      promptSwitchRole("reception");
    } else {
      // Switching to Doctor requires Doctor PIN
      promptSwitchRole("doctor");
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 transition-colors shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo / Brand */}
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-2.5 text-teal-700 dark:text-teal-400 font-semibold text-lg tracking-tight hover:opacity-90 transition-opacity"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm shadow-teal-500/20">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-slate-900 dark:text-white font-bold leading-none text-base sm:text-lg">
                    CarePoint
                  </span>
                  <span className="text-xs text-teal-600 dark:text-teal-400 font-medium">
                    Clinical practice
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-semibold"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right Controls: Role Badge & PIN Switcher + Theme Toggle */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Dark mode button */}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle color theme"
                className="p-2.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
              </button>

              {/* Role Indicator with PIN switch (NO BYPASS) */}
              <button
                type="button"
                onClick={handleRoleButtonClick}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-medium transition-all shadow-sm ${
                  isDoctor
                    ? "bg-teal-50 dark:bg-teal-950/70 border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 hover:bg-teal-100"
                    : "bg-blue-50 dark:bg-blue-950/70 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 hover:bg-blue-100"
                }`}
                title={isDoctor ? "Doctor session active. Click to switch role." : "Reception session. Click to enter Doctor PIN."}
              >
                {isDoctor ? (
                  <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                ) : (
                  <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                )}
                <div className="text-left">
                  <span className="block font-semibold capitalize leading-none">
                    {role}
                  </span>
                  <span className="text-[10px] opacity-75 hidden sm:inline-block">
                    {isDoctor ? "Switch role" : "Unlock Doctor"}
                  </span>
                </div>
              </button>

              {/* Mobile Menu Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-2 pb-4 space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium ${
                    isActive
                      ? "bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-semibold"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Role PIN Authentication Modal (NO BYPASS OPTION) */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-lg">
                <KeyRound className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <span>{isDoctor ? "Switch to Reception" : "Doctor PIN verification"}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPinModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePinSubmit} className="mt-4 space-y-4">
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                {isDoctor
                  ? "Enter Reception PIN (default: 5678) to switch to front-desk mode."
                  : "Enter Doctor PIN (default: 1234) to unlock clinical records, diagnoses, and prescribing."}
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isDoctor ? "Reception PIN" : "Doctor PIN"}
                </label>
                <input
                  type="password"
                  maxLength={6}
                  autoFocus
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Enter PIN"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-center text-2xl tracking-widest focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {pinError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
                  {pinError}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pinLoading || !pinInput}
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-sm transition-all disabled:opacity-50"
                >
                  {pinLoading ? "Verifying..." : "Verify PIN"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
