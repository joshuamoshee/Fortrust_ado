"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("Invalid credentials");
      }

      const data = await response.json();

      if (data.status === "success") {
        // Save the ID Badge (token) to the browser's memory
        localStorage.setItem("fortrust_token", data.token);
        // Save the user details like before
        localStorage.setItem("fortrust_user", JSON.stringify(data.user));
        // NEW: Also set the token as a cookie (expires in 7 days)
        document.cookie = `fortrust_token=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}`;
        // Go to dashboard
        router.push("/dashboard/pipeline");
      } else {
        // If login fails, show the error message and do NOT go to dashboard
        setError("Invalid email or password.");
      }
      
    } catch (err) {
      // If the server crashes or internet drops
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg bg-[var(--neutral-100)] rounded-3xl shadow-2xl overflow-hidden transform transition-all duration-300">
        
        {/* Branding Header */}
        <div className="bg-[var(--brand-700)] p-6 sm:p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative z-10">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">FORTRUST</h1>
            <p className="text-white mt-0.5 text-sm sm:text-base">Global Education Ecosystem</p>
          </div>
        </div>

        {/* Login Form */}
        <div className="p-6 sm:p-8">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-[var(--neutral-900)] mb-1 text-center">Welcome Back</h2>
          <p className="text-[var(--neutral-700)] text-center mb-6 text-sm sm:text-base">Sign in to access your dashboard</p>
          
          {error && (
            <div className="bg-red-900/20 text-red-400 p-4 rounded-xl text-sm mb-6 text-center border border-red-800 animate-pulse">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--neutral-900)] block">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-[var(--neutral-400)]" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3 border border-[var(--neutral-700)] rounded-xl focus:ring-2 focus:ring-[var(--brand-500)] focus:border-transparent outline-none transition-all duration-200 text-sm sm:text-base bg-[var(--neutral-100)] focus:bg-[var(--neutral-100)] text-[var(--neutral-900)]"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--neutral-900)] block">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-[var(--neutral-400)]" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-12 pr-12 py-3 border border-[var(--neutral-700)] rounded-xl focus:ring-2 focus:ring-[var(--brand-500)] focus:border-transparent outline-none transition-all duration-200 text-sm sm:text-base bg-[var(--neutral-100)] focus:bg-[var(--neutral-100)] text-[var(--neutral-900)]"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-[var(--neutral-400)] hover:text-[var(--neutral-700)] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-[var(--brand-700)] hover:bg-[var(--brand-500)] text-[var(--neutral-100)] font-semibold py-3 px-6 rounded-xl transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-95 shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Authenticating...
                </div>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-[var(--neutral-400)] text-sm">
              Need help? <a href="#" className="text-[var(--brand-700)] hover:text-[var(--brand-500)] font-medium transition-colors">Contact Support</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}