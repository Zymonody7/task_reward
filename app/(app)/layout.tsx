"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import clsx from "clsx";
import type { Role } from "@/lib/types";

const navItems: { href: string; label: string; roles: Role[] }[] = [
  { href: "/dashboard", label: "Dashboard", roles: ["admin", "user"] },
  { href: "/users", label: "Users", roles: ["admin"] },
  { href: "/tasks", label: "Tasks", roles: ["admin"] },
];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const role = user?.role ?? "user";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 md:min-h-screen flex flex-col justify-between">
        <div>
          <div className="p-6 border-b border-slate-100">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 font-bold text-xl text-indigo-600"
            >
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                />
              </svg>
              <span>RewardSys</span>
            </Link>
          </div>
          <nav className="p-4 space-y-1">
            {navItems
              .filter((item) => item.roles.includes(role))
              .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                    pathname === item.href
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  {item.label}
                </Link>
              ))}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <p className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">
            {user?.username ?? "—"}
          </p>
          <p className="text-[10px] text-slate-400">
            Role: <span className="font-mono">{role}</span>
          </p>
          <button
            type="button"
            className="mt-2 text-xs text-slate-500 hover:text-slate-700"
            onClick={() => logout()}
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen">
        <div className="max-w-5xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
