"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, UserPlus, QrCode, CalendarClock } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();

  const items = [
    { href: "/", label: "Home", icon: Activity },
    { href: "/search", label: "Scan / Find", icon: QrCode },
    { href: "/register", label: "Register", icon: UserPlus },
    { href: "/follow-ups", label: "Follow-ups", icon: CalendarClock },
  ];

  return (
    <div className="bottom-bar md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 pb-safe">
      <div className="grid grid-cols-4 h-16">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive
                  ? "text-teal-600 dark:text-teal-400 font-semibold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
