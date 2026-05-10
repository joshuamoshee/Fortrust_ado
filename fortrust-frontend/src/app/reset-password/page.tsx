"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // If there is no secure token in the URL, they shouldn't be here
  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("Invalid or missing security token. Please request a new password reset link.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setStatus("error");
      setErrorMessage("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setStatus("error");
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      // Send the token and new password to your Python backend
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password })
      });
      
      const data = await res.json();
      
      if (res.ok && data.status === "success") {
        setStatus("success");
        setTimeout(() => router.push("/"), 3000); // Auto-redirect to login
      } else {
        setStatus("error");
        setErrorMessage(data.detail || "Failed to reset password. The link may have expired.");
      }
    } catch (error) {
      setStatus("error");
      setErrorMessage("Network error. Please try again.");
    }
  };

  if (status === "success") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-4 animate-in zoom-in duration-300 border border-slate-100">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2"><CheckCircle2 size={32} /></div>
          <h2 className="text-2xl font-black text-[#282860]">Password Reset!</h2>
          <p className="text-slate-500 text-sm">Your account has been secured with your new password. Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl max-w-md w-full border border-slate-100">
        
        <div className="mb-8 text-center">
          <div className="w-12 h-12 bg-[#282860] rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm"><Lock className="text-[#BAD133]" size={24} /></div>
          <h1 className="text-2xl font-black text-[#282860] tracking-tight">Create New Password</h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">Please enter a strong password for your account.</p>
        </div>

        {status === "error" && errorMessage.includes("missing") ? (
           <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm font-bold border border-red-200 text-center">{errorMessage}</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Password</label>
              <div className="relative">
                <input 
                  required 
                  type={showPassword ? "text" : "password"} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border-2 border-slate-100 rounded-xl p-3.5 pr-12 text-sm outline-none focus:border-[#BAD133] focus:bg-slate-50 transition-all font-medium text-slate-800" 
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirm Password</label>
              <input 
                required 
                type={showPassword ? "text" : "password"} 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border-2 border-slate-100 rounded-xl p-3.5 text-sm outline-none focus:border-[#BAD133] focus:bg-slate-50 transition-all font-medium text-slate-800" 
                placeholder="••••••••"
              />
            </div>

            {status === "error" && (
              <div className="flex items-start gap-2 bg-red-50 text-red-700 p-3 rounded-xl text-xs font-bold border border-red-100"><AlertCircle size={16} className="shrink-0 mt-0.5" /> <p>{errorMessage}</p></div>
            )}

            <button disabled={status === "loading"} type="submit" className="w-full bg-[#BAD133] hover:bg-[#a6bb2a] text-[#282860] font-black py-4 rounded-xl mt-2 transition-all shadow-md shadow-[#BAD133]/20 flex justify-center items-center gap-2 disabled:opacity-70">
              {status === "loading" ? <><Loader2 className="animate-spin" size={18} /> Securing Account...</> : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}