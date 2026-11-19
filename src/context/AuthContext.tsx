"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Role } from "@/lib/types";

interface AuthContextType {
  role: Role;
  userName: string;
  isDoctor: boolean;
  isReception: boolean;
  token: string | null;
  mustChangePin: boolean;
  loginWithPin: (pin: string, targetRole?: Role) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  changePin: (newPin: string) => Promise<{ success: boolean; message?: string }>;
  showPinModal: boolean;
  setShowPinModal: (show: boolean) => void;
  targetRoleToSwitch: Role | null;
  promptSwitchRole: (targetRole: Role) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>("reception"); // Secure default: reception
  const [userName, setUserName] = useState<string>("Reception Desk");
  const [token, setToken] = useState<string | null>(null);
  const [mustChangePin, setMustChangePin] = useState<boolean>(false);

  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [targetRoleToSwitch, setTargetRoleToSwitch] = useState<Role | null>(null);

  // Modal for forced PIN change
  const [showChangePinModal, setShowChangePinModal] = useState<boolean>(false);
  const [newPinInput, setNewPinInput] = useState<string>("");
  const [confirmPinInput, setConfirmPinInput] = useState<string>("");
  const [changePinError, setChangePinError] = useState<string>("");
  const [changePinLoading, setChangePinLoading] = useState<boolean>(false);

  // Check existing session on load
  useEffect(() => {
    async function verifySession() {
      const savedToken = localStorage.getItem("clinic_session_token");
      if (savedToken) {
        setToken(savedToken);
      }

      try {
        const headers: Record<string, string> = {};
        if (savedToken) headers["Authorization"] = `Bearer ${savedToken}`;

        const res = await fetch("/api/auth/session", { headers });
        const data = await res.json();
        if (data.authenticated && data.user) {
          setRole(data.user.role);
          setUserName(data.user.name);
          setMustChangePin(Boolean(data.user.must_change_pin));
          if (data.user.must_change_pin) {
            setShowChangePinModal(true);
          }
        } else {
          // No active session: default to reception view with prompt
          setRole("reception");
          setUserName("Reception Desk");
        }
      } catch (err) {
        console.error("Session check error:", err);
      }
    }

    verifySession();
  }, []);

  const loginWithPin = async (
    pin: string,
    targetRole?: Role
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, role: targetRole }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.user) {
        setRole(data.user.role);
        setUserName(data.user.name);
        setToken(data.token);
        localStorage.setItem("clinic_session_token", data.token);

        const needChange = Boolean(data.user.must_change_pin);
        setMustChangePin(needChange);
        setShowPinModal(false);

        if (needChange) {
          setShowChangePinModal(true);
        }

        return { success: true };
      } else {
        return { success: false, message: data.error || "Authentication failed" };
      }
    } catch {
      return { success: false, message: "Network error during authentication" };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {}
    localStorage.removeItem("clinic_session_token");
    setToken(null);
    setRole("reception");
    setUserName("Reception Desk");
    setMustChangePin(false);
  };

  const changePin = async (newPin: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/auth/change-pin", {
        method: "POST",
        headers,
        body: JSON.stringify({ new_pin: newPin }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMustChangePin(false);
        setShowChangePinModal(false);
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.error || "Failed to change PIN" };
      }
    } catch {
      return { success: false, message: "Network error updating PIN" };
    }
  };

  const promptSwitchRole = (targetRole: Role) => {
    setTargetRoleToSwitch(targetRole);
    setShowPinModal(true);
  };

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPinInput !== confirmPinInput) {
      setChangePinError("New PIN and confirmation do not match.");
      return;
    }
    if (newPinInput.length < 4) {
      setChangePinError("PIN must be at least 4 digits.");
      return;
    }
    setChangePinLoading(true);
    setChangePinError("");

    const res = await changePin(newPinInput);
    setChangePinLoading(false);
    if (!res.success) {
      setChangePinError(res.message || "Failed to update PIN");
    } else {
      setNewPinInput("");
      setConfirmPinInput("");
      alert("PIN successfully updated! You can now use your new secure PIN.");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        role,
        userName,
        isDoctor: role === "doctor",
        isReception: role === "reception",
        token,
        mustChangePin,
        loginWithPin,
        logout,
        changePin,
        showPinModal,
        setShowPinModal,
        targetRoleToSwitch,
        promptSwitchRole,
      }}
    >
      {children}

      {/* Force Change Default PIN Modal */}
      {showChangePinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border-2 border-amber-500">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="px-2.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 text-xs font-bold uppercase tracking-wider">
                First-Run Security Setup
              </span>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                Change Default {role === "doctor" ? "Doctor" : "Reception"} PIN
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                You are currently using the default system PIN. For medical data protection, you must establish a new private PIN before proceeding.
              </p>
            </div>

            <form onSubmit={handleChangePinSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Secure PIN (4-6 digits)
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  maxLength={6}
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                  placeholder="Enter new PIN"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-center text-lg tracking-widest focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm New PIN
                </label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  value={confirmPinInput}
                  onChange={(e) => setConfirmPinInput(e.target.value)}
                  placeholder="Re-enter new PIN"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-center text-lg tracking-widest focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {changePinError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
                  {changePinError}
                </div>
              )}

              <button
                type="submit"
                disabled={changePinLoading || !newPinInput || !confirmPinInput}
                className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-sm transition-all disabled:opacity-50"
              >
                {changePinLoading ? "Securing PIN..." : "Save New PIN & Continue"}
              </button>
            </form>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
