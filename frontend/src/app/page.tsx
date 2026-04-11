"use client";

import { useAuth } from "@/context/AuthContext";
import { Utensils } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SplashPage() {
  const { loading, token, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (token && role) {
        if (role === "RESIDENT") router.replace("/resident");
        else if (role === "VENDOR") router.replace("/vendor");
        else if (role === "SUPER_ADMIN") router.replace("/admin");
      } else {
        router.replace("/login");
      }
    }
  }, [loading, token, role, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
      <div className="flex flex-col items-center animate-pulse">
        <div className="bg-white p-6 rounded-3xl shadow-2xl shadow-indigo-900/20 mb-6">
          <Utensils className="w-16 h-16 text-indigo-600" />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">MealTrace</h1>
        <p className="text-indigo-100 font-medium mt-2">Connecting Kitchens & Residents</p>
      </div>
    </div>
  );
}
