"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Loader2, CheckCircle2, ArrowLeft, AlertCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      
      const data = await res.json();
      
      // We always show success even if the email isn't in the database to prevent hacker scanning
      setStatus("success");
      setMessage(data.message || "If that email exists in our system, a reset link has been sent.");
      
    } catch (error) {
      setStatus("error");
      setMessage("Network error. Please check your connection and try again.");
    }
  };

  if (status === "success") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-4 animate-in zoom-in duration-300 border border-slate-100">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-2xl font-black text-[#282860]">Check Your Inbox</h2>
          <p className="text-slate-500 text-sm leading-relaxed">{message}</p>
          <Link href="/" className="inline-block mt-6 text-sm font-bold text-[#BAD133] hover:text-[#9bb029] transition-colors">
            Return to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl max-w-md w-full border border-slate-100 relative">
        
        <Link href="/" className="absolute top-6 left-6 text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowLeft size={20} />
        </Link>

        <div className="mb-8 mt-4 text-center">
          <div className="w-12 h-12 bg-[#282860] rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Mail className="text-[#BAD133]" size={24} />
          </div>
          <h1 className="text-2xl font-black text-[#282860] tracking-tight">Forgot Password?</h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">No worries! Enter your email address and we will send you a secure reset link.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
            <input 
              required 
              type="email" 
              autoComplete="off"
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-2 border-slate-100 rounded-xl p-3.5 text-sm outline-none focus:border-[#BAD133] focus:bg-slate-50 transition-all font-medium text-slate-800" 
              placeholder="agent@fortrust.com"
            />
          </div>

          {status === "error" && (
            <div className="flex items-start gap-2 bg-red-50 text-red-700 p-3 rounded-xl text-xs font-bold border border-red-100">
              <AlertCircle size={16} className="shrink-0 mt-0.5" /> <p>{message}</p>
            </div>
          )}

          <button disabled={status === "loading" || !email} type="submit" className="w-full bg-[#BAD133] hover:bg-[#a6bb2a] text-[#282860] font-black py-4 rounded-xl mt-2 transition-all shadow-md shadow-[#BAD133]/20 flex justify-center items-center gap-2 disabled:opacity-70">
            {status === "loading" ? <><Loader2 className="animate-spin" size={18} /> Sending Link...</> : "Send Reset Link"}
          </button>
        </form>
      </div>
    </div>
  );
}