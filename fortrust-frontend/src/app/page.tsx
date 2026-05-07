"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, Loader2, ArrowRight, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.status === "success") {
        // 1. Save the Security Token & User Data securely in the browser
        localStorage.setItem("fortrust_token", data.token);
        localStorage.setItem("fortrust_user", JSON.stringify(data.user));

        // 2. Smart Routing based on User Role
        if (data.user.role === "MASTER_ADMIN") {
          router.push("/dashboard/admin");
        } else if (data.user.role === "Agent" || data.user.role === "Counsellor" || data.user.role === "Micro Agent") {
          router.push("/dashboard/agent");
        } else {
          router.push("/dashboard/pipeline");
        }
      } else {
        setError(data.detail || "Invalid email or password.");
      }
    } catch (err) {
      setError("Network error. Please check your connection to the server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans antialiased">
      
      {/* LEFT SIDE - Enterprise Branding */}
      <div className="hidden lg:flex w-1/2 bg-[#1b1b42] flex-col justify-between p-12 relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#282860] rounded-full blur-[100px] opacity-60 pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-[#BAD133] rounded-full blur-[100px] opacity-10 pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16 bg-white w-fit px-4 py-3 rounded-xl shadow-lg">
            <img src="/fortrust-logo.png" alt="Fortrust" className="h-8 w-auto object-contain" />
          </div>

          <h1 className="text-4xl font-black text-white leading-tight mb-6">
            Fortrust OS <br/><span className="text-[#BAD133]">Enterprise Workspace</span>
          </h1>
          <p className="text-lg text-slate-300 max-w-md leading-relaxed">
            The intelligent pipeline and AI agent management system. Log in to access your assigned leads, process applications, and track your commissions.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 text-slate-400 text-sm font-medium">
          <ShieldCheck size={18} className="text-[#BAD133]"/> Secured by JWT & Fortrust AI
        </div>
      </div>

      {/* RIGHT SIDE - Secure Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          
          <div className="text-center lg:text-left">
            <div className="lg:hidden flex justify-center mb-8">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <img src="/fortrust-logo.png" alt="Fortrust" className="h-8 w-auto object-contain" />
              </div>
            </div>
            <h2 className="text-3xl font-black text-[#282860]">Welcome Back</h2>
            <p className="text-slate-500 mt-2 font-medium">Enter your credentials to access your workspace.</p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail size={18} className="text-slate-400" />
                  </div>
                  <input 
                    required 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="admin@fortrust.com" 
                    className="w-full border-2 border-slate-100 rounded-xl pl-11 pr-4 py-3.5 text-sm outline-none focus:border-[#282860] focus:bg-slate-50 transition-all font-medium text-slate-800" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                  <a href="#" className="text-xs font-bold text-[#BAD133] hover:text-[#9bb029] transition-colors">Forgot Password?</a>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock size={18} className="text-slate-400" />
                  </div>
                  <input 
                    required 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="••••••••" 
                    className="w-full border-2 border-slate-100 rounded-xl pl-11 pr-4 py-3.5 text-sm outline-none focus:border-[#282860] focus:bg-slate-50 transition-all font-medium text-slate-800" 
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-lg text-center">
                  {error}
                </div>
              )}

              <button 
                disabled={isLoading || !email || !password} 
                type="submit" 
                className="w-full bg-[#282860] hover:bg-[#1a1a40] text-white font-black py-4 rounded-xl transition-all shadow-md shadow-[#282860]/20 flex justify-center items-center gap-2 disabled:opacity-70"
              >
                {isLoading ? <><Loader2 className="animate-spin" size={18}/> Authenticating...</> : <>Secure Login <ArrowRight size={18}/></>}
              </button>
              
            </form>
          </div>
          
        </div>
      </div>
    </div>
  );
}