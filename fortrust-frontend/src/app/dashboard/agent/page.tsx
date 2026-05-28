"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Target, Users, DollarSign, TrendingUp, GraduationCap, Search,
  Loader2, ArrowRight, Sparkles, FileText, ChevronRight, Award, Globe
} from "lucide-react";

export default function AgentWorkspacePage() {
  const [user, setUser] = useState<any>(null);
  const [myStudents, setMyStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // AI University search
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [programs, setPrograms] = useState<any[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("fortrust_user");
    if (stored) {
      const u = JSON.parse(stored);
      setUser(u);
      fetchMyStudents(u);
    }
  }, []);

  const fetchMyStudents = async (u: any) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/pipeline?role=${u.role}&agent_code=${encodeURIComponent(u.name)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.status === "success") setMyStudents(data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleAiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setPrograms([]);
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/programs/search?query=${encodeURIComponent(searchQuery)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.status === "success") setPrograms(data.data || []);
    } catch (e) { console.error(e); }
    finally { setSearching(false); }
  };

  const activeCount = myStudents.filter(s => !["COMPLETED", "REJECTED"].includes((s.status || "").toUpperCase())).length;
  const closedCount = myStudents.filter(s => (s.status || "").toUpperCase() === "COMPLETED").length;
  const totalCommission = myStudents
    .filter(s => (s.status || "").toUpperCase() === "COMPLETED")
    .reduce((sum, s) => sum + (parseFloat(s.commission_earned) || 0), 0);
  const conversionRate = (activeCount + closedCount) > 0
    ? Math.round((closedCount / (activeCount + closedCount)) * 100)
    : 0;

  if (!user) return <div className="p-16 text-center text-slate-400 animate-pulse">Loading...</div>;

  return (
    <div className="p-4 lg:p-8 max-w-[1500px] mx-auto w-full space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-[#282860] flex items-center gap-3">
          <Target className="text-[#BAD133]" size={32} />
          Agent Workspace
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Manage your pipeline, hit targets, and track your commissions.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-blue-50 p-2 rounded-lg"><Users className="text-blue-600" size={20} /></div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Active</span>
          </div>
          <p className="text-3xl font-black text-[#282860]">{activeCount}</p>
          <p className="text-xs text-slate-500 mt-1">Students in pipeline</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-emerald-50 p-2 rounded-lg"><Award className="text-emerald-600" size={20} /></div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Closed</span>
          </div>
          <p className="text-3xl font-black text-emerald-600">{closedCount}</p>
          <p className="text-xs text-slate-500 mt-1">Deals won</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-yellow-50 p-2 rounded-lg"><DollarSign className="text-yellow-600" size={20} /></div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Earnings</span>
          </div>
          <p className="text-3xl font-black text-[#BAD133]">${totalCommission.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">Commission earned</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-indigo-50 p-2 rounded-lg"><TrendingUp className="text-indigo-600" size={20} /></div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Conversion</span>
          </div>
          <p className="text-3xl font-black text-indigo-600">{conversionRate}%</p>
          <p className="text-xs text-slate-500 mt-1">Win rate</p>
        </div>
      </div>

      {/* AI University Search */}
      <div className="bg-gradient-to-br from-[#1b1b42] to-[#282860] rounded-2xl p-6 lg:p-8 text-white shadow-lg">
        <div className="flex items-start gap-3 mb-4">
          <div className="bg-[#BAD133]/20 p-2.5 rounded-xl">
            <Sparkles className="text-[#BAD133]" size={22} />
          </div>
          <div>
            <h2 className="text-xl font-black">AI University Finder</h2>
            <p className="text-sm text-slate-300 mt-0.5">Powered by live Google Search — discover real, up-to-date programs.</p>
          </div>
        </div>

        <form onSubmit={handleAiSearch} className="flex flex-col sm:flex-row gap-2 mt-5">
          <div className="flex-1 flex items-center gap-2 bg-white rounded-xl px-4 py-3 shadow-md">
            <Search size={18} className="text-slate-400 flex-shrink-0" />
            <input type="text"
              placeholder="e.g. business degrees in Australia, computer science UK..."
              className="flex-1 bg-transparent outline-none text-sm text-slate-800 placeholder-slate-400"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <button type="submit" disabled={searching || !searchQuery}
            className="bg-[#BAD133] hover:bg-[#9bb029] text-[#1b1b42] font-bold text-sm px-6 py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {searching ? <><Loader2 className="animate-spin" size={16} /> Searching...</> : <>Search <ArrowRight size={16} /></>}
          </button>
        </form>

        {programs.length > 0 && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-3">
            {programs.map((p, i) => (
              <div key={i} className="bg-white/10 backdrop-blur border border-white/10 rounded-xl p-4 hover:bg-white/15 transition-colors">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div>
                    <p className="font-black text-white text-sm">{p.university}</p>
                    <p className="text-xs text-slate-300 flex items-center gap-1 mt-0.5">
                      <Globe size={10} /> {p.country}
                    </p>
                  </div>
                  <span className="text-[9px] font-bold bg-[#BAD133]/20 text-[#BAD133] px-2 py-0.5 rounded-full uppercase">{p.level}</span>
                </div>
                <p className="text-xs text-slate-300 font-medium">{p.program_name}</p>
                <div className="flex justify-between items-end mt-3 pt-3 border-t border-white/10">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">Tuition</p>
                    <p className="text-sm font-black text-[#BAD133]">${p.tuition?.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase">Duration</p>
                    <p className="text-sm font-bold text-white">{p.duration} years</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/pipeline"
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-[#BAD133] transition-all group">
          <div className="flex items-center justify-between mb-3">
            <Users className="text-[#282860] group-hover:text-[#BAD133] transition-colors" size={24} />
            <ChevronRight className="text-slate-400 group-hover:text-[#BAD133] transition-colors" size={18} />
          </div>
          <p className="font-black text-[#282860]">Manage Students</p>
          <p className="text-xs text-slate-500 mt-1">View, add, or update your student pipeline</p>
        </Link>

        <Link href="/dashboard/claimed"
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-[#BAD133] transition-all group">
          <div className="flex items-center justify-between mb-3">
            <DollarSign className="text-[#282860] group-hover:text-[#BAD133] transition-colors" size={24} />
            <ChevronRight className="text-slate-400 group-hover:text-[#BAD133] transition-colors" size={18} />
          </div>
          <p className="font-black text-[#282860]">My Earnings</p>
          <p className="text-xs text-slate-500 mt-1">Track commissions and payout history</p>
        </Link>

        <Link href="/dashboard/programs"
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-[#BAD133] transition-all group">
          <div className="flex items-center justify-between mb-3">
            <GraduationCap className="text-[#282860] group-hover:text-[#BAD133] transition-colors" size={24} />
            <ChevronRight className="text-slate-400 group-hover:text-[#BAD133] transition-colors" size={18} />
          </div>
          <p className="font-black text-[#282860]">Program Finder</p>
          <p className="text-xs text-slate-500 mt-1">Browse all available programs in detail</p>
        </Link>
      </div>

      {/* My Recent Students */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="font-black text-[#282860]">My Recent Students</h3>
            <p className="text-xs text-slate-500 mt-0.5">Your most recent pipeline activity</p>
          </div>
          <Link href="/dashboard/pipeline" className="text-xs font-bold text-[#BAD133] hover:underline flex items-center gap-1">
            View All <ChevronRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-[#BAD133]" size={32} /></div>
        ) : myStudents.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="mx-auto text-slate-300 mb-3" size={40} />
            <p className="text-sm text-slate-500 font-medium">No students yet.</p>
            <p className="text-xs text-slate-400 mt-1">Your assigned students will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Student</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Program Interest</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-right text-[10px] font-black text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myStudents.slice(0, 5).map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-bold text-[#282860] text-sm">{s.name}</p>
                      <p className="text-[11px] text-slate-400">{s.email || s.phone || "—"}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600 font-medium">{s.program_interest || "—"}</td>
                    <td className="px-5 py-4">
                      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md
                        ${(s.status || "").toUpperCase() === "COMPLETED" ? "bg-emerald-100 text-emerald-700"
                          : (s.status || "").toUpperCase() === "REJECTED" ? "bg-red-100 text-red-700"
                          : "bg-blue-100 text-blue-700"}`}>
                        {s.status || "NEW"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link href={`/dashboard/pipeline`} className="text-[#BAD133] font-bold text-xs hover:underline">
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}