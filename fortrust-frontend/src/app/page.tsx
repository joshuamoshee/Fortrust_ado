"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("process.env.NEXT_PUBLIC_API_URL/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("Invalid credentials");
      }

      const data = await response.json();

      if (data.status === "success") {
        // 1. Save the user's role to the browser
        localStorage.setItem("fortrust_user", JSON.stringify(data.user));
        
        // 2. THE FIX: Route them based on their Role!
        if (data.user.role === "MASTER_ADMIN") {
          router.push("/dashboard/admin");
        } else {
          router.push("/dashboard/pipeline");
        }
      }
    } catch (err) {
      setError("Invalid email or password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        
        {/* Branding Header */}
        <div className="bg-blue-600 p-8 text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">FORTRUST</h1>
          <p className="text-blue-100 mt-2 text-sm">Global Education Ecosystem</p>
        </div>

        {/* Login Form */}
        <div className="p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">Sign In to Dashboard</h2>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 text-center border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                  placeholder="admin@fortrust.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-70 mt-4"
            >
              {isLoading ? "Authenticating..." : "Sign In"}
              {!isLoading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
          
          
        </div>
      </div>
    </div>
  );
}