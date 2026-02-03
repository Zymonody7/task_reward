"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const role = user?.role;

  useEffect(() => {
    if (loading) return;
    if (role !== "admin") {
      router.replace("/dashboard");
    }
  }, [loading, role, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  if (role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-slate-500">Redirecting...</p>
      </div>
    );
  }

  return <>{children}</>;
}
