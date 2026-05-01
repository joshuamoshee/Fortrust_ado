"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, Trash2 } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [isClearing, setIsClearing] = useState(false);

  const handleClearCache = () => {
    setIsClearing(true);
    setTimeout(() => {
      localStorage.clear();
      sessionStorage.clear();
      setIsClearing(false);
      alert("Cache cleared!");
    }, 500);
  };

  const handleLogout = () => {
    localStorage.removeItem("fortrust_user");
    localStorage.removeItem("fortrust_token");
    document.cookie = "fortrust_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push("/");
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-16 bg-white rounded-2xl shadow-lg p-4 sm:p-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-8">Settings</h1>
      <div className="space-y-6 w-full">
        {/* Clear Cache Row */}
        <div className="w-full flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 sm:px-8 py-5 mb-2">
          <div>
            <div className="font-semibold text-slate-800 text-base">Clear Cache</div>
            <div className="text-xs text-slate-500 mt-1">Remove all saved data and refresh the app.</div>
          </div>
          <Button
            onClick={handleClearCache}
            disabled={isClearing}
            className="flex items-center gap-2 bg-[#282860] hover:bg-[#1b1b42] text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md shadow-[#282860]/10 transition-colors disabled:opacity-50"
          >
            <Trash2 className="text-red-200" size={18} />
            {isClearing ? "Clearing..." : "Clear"}
          </Button>
        </div>
        {/* Logout Row */}
        <div className="w-full flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 sm:px-8 py-5">
          <div>
            <div className="font-semibold text-slate-800 text-base">Logout</div>
            <div className="text-xs text-slate-500 mt-1">Sign out from your account securely.</div>
          </div>
          <Button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md transition-colors disabled:opacity-50"
          >
            <LogOut size={18} />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
