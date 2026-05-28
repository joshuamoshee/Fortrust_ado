"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Award, Users, FileText, DollarSign, TrendingUp, TrendingDown,
  Info, Plus, Calendar, Building2, GraduationCap, ChevronDown,
  X, Sparkles, Loader2, ArrowUpRight
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const TIMEFRAMES = [
  { value: "all", label: "All Time" },
  { value: "this_year", label: "This Year" },
  { value: "6months", label: "Last 6 Months" },
  { value: "3months", label: "Last 3 Months" },
  { value: "30days", label: "Last 30 Days" },
  { value: "custom", label: "Custom Date Range" },
];

export default function MasterDashboardPage() {
  const [timeframe, setTimeframe] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showTimeMenu, setShowTimeMenu] = useState(false);

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Tooltip state — click to show info
  const [openTip, setOpenTip] = useState<string | null>(null);

  const timeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (timeMenuRef.current && !timeMenuRef.current.contains(e.target as Node)) {
        setShowTimeMenu(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("fortrust_token");
      let url = `${process.env.NEXT_PUBLIC_API_URL}/api/admin/dashboard-stats?timeframe=${timeframe}`;
      if (timeframe === "custom" && customFrom && customTo) {
        url += `&from_date=${customFrom}&to_date=${customTo}`;
      }
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === "success") setStats(data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (timeframe !== "custom" || (customFrom && customTo)) fetchStats();
  }, [timeframe, customFrom, customTo]);

  const handleTimeChoice = (val: string) => {
    setShowTimeMenu(false);
    if (val === "custom") {
      setShowCustomModal(true);
    } else {
      setTimeframe(val);
    }
  };

  const currentTimeLabel = timeframe === "custom" && customFrom && customTo
    ? `${customFrom} → ${customTo}`
    : TIMEFRAMES.find(t => t.value === timeframe)?.label || "All Time";

  const m = stats?.metrics || {};
  const perf = stats?.performance || {};
  const branchData = perf.branch_pipeline || [];

  return (
    <div className="p-4 lg:p-8 max-w-[1600px] mx-auto w-full space-y-6">

      {/* ===== HEADER ===== */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#282860] flex items-center gap-3">
            <Award className="text-[#BAD133]" size={32} />
            Master Dashboard
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Global operations overview and branch performance.
          </p>
        </div>

        {/* Quick Actions + Time Filter */}
        <div className="flex flex-wrap gap-2 items-center">
          <Link href="/dashboard/agent-pipeline"
            className="bg-white border border-slate-200 hover:border-[#BAD133] text-[#282860] text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm">
            <Plus size={14} className="text-[#BAD133]" /> New Agent
          </Link>
          <Link href="/dashboard/network"
            className="bg-white border border-slate-200 hover:border-[#BAD133] text-[#282860] text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm">
            <Plus size={14} className="text-[#BAD133]" /> New Institution
          </Link>
          <Link href="/dashboard/pipeline"
            className="bg-white border border-slate-200 hover:border-[#BAD133] text-[#282860] text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm">
            <Plus size={14} className="text-[#BAD133]" /> New Student
          </Link>

          {/* Time Period Selector */}
          <div className="relative" ref={timeMenuRef}>
            <button onClick={() => setShowTimeMenu(!showTimeMenu)}
              className="bg-[#282860] hover:bg-[#1b1b42] text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm">
              <Calendar size={14} />
              {currentTimeLabel}
              <ChevronDown size={14} />
            </button>
            {showTimeMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-30">
                {TIMEFRAMES.map(t => (
                  <button key={t.value} onClick={() => handleTimeChoice(t.value)}
                    className={`w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0
                      ${timeframe === t.value ? "bg-[#BAD133]/10 text-[#282860]" : "text-slate-600"}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Currently filtered banner */}
      <div className="bg-[#BAD133]/10 border border-[#BAD133]/30 rounded-xl px-4 py-2 flex items-center gap-2 text-xs">
        <Sparkles size={14} className="text-[#9bb029]" />
        <span className="font-bold text-[#282860]">Currently showing data for:</span>
        <span className="text-slate-700">{currentTimeLabel}</span>
        <span className="text-slate-400 italic">— applied across all KPIs, charts, and tables below.</span>
      </div>

      {loading ? (
        <div className="p-20 text-center">
          <Loader2 className="animate-spin mx-auto text-[#BAD133]" size={36} />
          <p className="text-sm text-slate-400 mt-2">Loading dashboard...</p>
        </div>
      ) : (
        <>

          {/* ===== KPI CARDS ===== */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* CARD 1 — ACTIVE PIPELINE */}
            <KpiCard
              id="active"
              icon={<Users className="text-blue-600" size={20} />}
              iconBg="bg-blue-50"
              label="Active Pipeline"
              value={m.in_progress ?? 0}
              valueColor="text-[#282860]"
              tipOpen={openTip === "active"}
              onTipToggle={() => setOpenTip(openTip === "active" ? null : "active")}
              tipText="In progress students only. Excludes Completed and Dropped — gives every manager the same interpretation."
            >
              <div className="flex items-center gap-3 mt-2 text-[11px] border-t border-slate-100 pt-2">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-emerald-600">{m.completed ?? 0}</span>
                  <span className="text-slate-400 uppercase">Completed</span>
                </div>
                <span className="text-slate-200">|</span>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-red-500">{m.dropped ?? 0}</span>
                  <span className="text-slate-400 uppercase">Dropped</span>
                </div>
              </div>
            </KpiCard>

            {/* CARD 2 — QUALIFIED LEADS */}
            <KpiCard
              id="qualified"
              icon={<Award className="text-yellow-600" size={20} />}
              iconBg="bg-yellow-50"
              label="Qualified Leads"
              value={m.qualified_leads ?? 0}
              valueColor="text-[#282860]"
              tipOpen={openTip === "qualified"}
              onTipToggle={() => setOpenTip(openTip === "qualified" ? null : "qualified")}
              tipText="AI Scored Hot + Warm leads only. Excludes Cold leads."
            >
              <div className="flex items-center gap-1 mt-2 text-[11px] border-t border-slate-100 pt-2">
                {(m.qualified_growth ?? 0) >= 0 ? (
                  <TrendingUp size={12} className="text-emerald-600" />
                ) : (
                  <TrendingDown size={12} className="text-red-500" />
                )}
                <span className={`font-bold ${(m.qualified_growth ?? 0) >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {(m.qualified_growth ?? 0) >= 0 ? "+" : ""}{m.qualified_growth ?? 0}%
                </span>
                <span className="text-slate-400">vs last 30 days</span>
              </div>
            </KpiCard>

            {/* CARD 3 — ACTIVE APPLICATIONS */}
            <KpiCard
              id="applications"
              icon={<FileText className="text-purple-600" size={20} />}
              iconBg="bg-purple-50"
              label="Active Applications"
              value={m.active_applications ?? 0}
              valueColor="text-[#282860]"
              tipOpen={openTip === "applications"}
              onTipToggle={() => setOpenTip(openTip === "applications" ? null : "applications")}
              tipText="Submitted applications, awaiting offer from the institution."
            >
              <p className="text-[11px] text-slate-400 mt-2 border-t border-slate-100 pt-2">
                Submitted, awaiting offer
              </p>
            </KpiCard>

            {/* CARD 4 — ESTIMATION COMMISSION */}
            <KpiCard
              id="commission"
              icon={<DollarSign className="text-emerald-600" size={20} />}
              iconBg="bg-emerald-50"
              label="Estimation Commission"
              value={`$${(m.estimation_commission ?? 0).toLocaleString()}`}
              valueColor="text-[#282860]"
              tipOpen={openTip === "commission"}
              onTipToggle={() => setOpenTip(openTip === "commission" ? null : "commission")}
              tipText="Estimated commission from in-progress deals — projected revenue if all close successfully."
            >
              <div className="flex items-center gap-1 mt-2 text-[11px] border-t border-slate-100 pt-2">
                <span className="text-slate-400 uppercase">Closed:</span>
                <span className="font-bold text-emerald-600">${(m.logged_commission ?? 0).toLocaleString()}</span>
                <span className="text-slate-300 ml-1 italic">this period</span>
              </div>
            </KpiCard>

          </div>

          {/* ===== CHARTS ROW ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Pipeline by Branch */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-black text-[#282860] flex items-center gap-2">
                    <Building2 size={18} className="text-[#BAD133]" />
                    Pipeline Volume by Branch
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Active students distribution across branches</p>
                </div>
              </div>
              {branchData.length === 0 ? (
                <p className="text-center text-slate-400 italic py-12">No branch data for this period.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={branchData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="branch" tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                    <ReTooltip
                      contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, fontWeight: 700 }}
                      cursor={{ fill: "#BAD13310" }}
                    />
                    <Bar dataKey="value" fill="#282860" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Top Performers */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-black text-[#282860] flex items-center gap-2 mb-1">
                <TrendingUp size={18} className="text-[#BAD133]" />
                Top Performers
              </h3>
              <p className="text-xs text-slate-400 mb-4">By revenue this period</p>

              {(perf.top_agents_revenue || []).length === 0 ? (
                <p className="text-center text-slate-400 italic py-8 text-sm">No performance data.</p>
              ) : (
                <div className="space-y-2">
                  {(perf.top_agents_revenue || []).slice(0, 5).map((agent: any, i: number) => (
                    <div key={agent.name} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black
                          ${i === 0 ? "bg-yellow-100 text-yellow-700"
                          : i === 1 ? "bg-slate-100 text-slate-600"
                          : i === 2 ? "bg-amber-100 text-amber-700"
                          : "bg-slate-50 text-slate-400"}`}>
                          {i + 1}
                        </span>
                        <span className="text-sm font-bold text-[#282860] truncate">{agent.name}</span>
                      </div>
                      <span className="text-xs font-black text-[#BAD133]">${agent.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ===== TOP INSTITUTIONS ===== */}
          {(perf.top_institutions || []).length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-black text-[#282860] flex items-center gap-2 mb-4">
                <GraduationCap size={18} className="text-[#BAD133]" />
                Most Active Institutions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                {perf.top_institutions.map((inst: any) => (
                  <div key={inst.name} className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                    <p className="text-xs font-bold text-[#282860] truncate" title={inst.name}>{inst.name}</p>
                    <p className="text-2xl font-black text-[#282860] mt-1">{inst.value}</p>
                    <p className="text-[10px] text-slate-400 uppercase">Active Apps</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </>
      )}

      {/* ===== CUSTOM DATE RANGE MODAL ===== */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-[#282860] flex items-center gap-2">
                <Calendar size={18} className="text-[#BAD133]" /> Custom Date Range
              </h3>
              <button onClick={() => setShowCustomModal(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600">From</label>
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                  className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#BAD133]" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600">To</label>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                  className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#BAD133]" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowCustomModal(false)}
                  className="text-slate-500 font-bold text-sm px-4 py-2">Cancel</button>
                <button onClick={() => {
                  if (customFrom && customTo) {
                    setTimeframe("custom");
                    setShowCustomModal(false);
                  }
                }}
                  disabled={!customFrom || !customTo}
                  className="bg-[#282860] text-white font-bold text-sm px-6 py-2 rounded-xl disabled:opacity-50">
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ====================================================================
   Reusable KPI Card
   ==================================================================== */
function KpiCard({
  id, icon, iconBg, label, value, valueColor, tipOpen, onTipToggle, tipText, children
}: {
  id: string;
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: number | string;
  valueColor: string;
  tipOpen: boolean;
  onTipToggle: () => void;
  tipText: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm relative">

      <div className="flex items-start justify-between mb-3">
        <div className={`${iconBg} p-2.5 rounded-xl`}>{icon}</div>

        <button onClick={onTipToggle}
          className={`p-1 rounded-full transition-colors ${tipOpen ? "bg-[#282860] text-white" : "text-slate-300 hover:text-[#282860] hover:bg-slate-100"}`}
          aria-label="Info">
          <Info size={14} />
        </button>
      </div>

      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className={`text-3xl font-black ${valueColor} mt-1`}>{value}</p>

      {children}

      {/* Click-to-show info tooltip */}
      {tipOpen && (
        <div className="absolute top-14 right-3 bg-[#1b1b42] text-white text-[11px] font-medium p-3 rounded-xl shadow-xl max-w-[240px] z-20 leading-relaxed">
          <div className="absolute -top-1.5 right-3 w-3 h-3 bg-[#1b1b42] rotate-45"></div>
          {tipText}
        </div>
      )}
    </div>
  );
}