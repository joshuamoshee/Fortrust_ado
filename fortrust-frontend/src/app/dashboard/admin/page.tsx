"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Award, Users, FileText, DollarSign, TrendingUp, TrendingDown,
  Info, Plus, Calendar, Building2, GraduationCap, ChevronDown,
  X, Sparkles, Loader2, Activity, LogOut, Clock
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
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tooltip state
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
      
      // Fetch both the Dashboard Stats AND the Live CCTV Feed simultaneously
      const [statsRes, logsRes] = await Promise.all([
        fetch(url, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/audit-logs?limit=50`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      const statsData = await statsRes.json();
      const logsData = await logsRes.json();
      
      if (statsData.status === "success") setStats(statsData.data);
      if (logsData.status === "success") setAuditLogs(logsData.data);
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

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#282860] flex items-center gap-3">
            <Award className="text-[#BAD133]" size={32} />
            Master Dashboard
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Global operations overview and branch performance.</p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <Link href="/dashboard/agent-pipeline" className="bg-white border border-slate-200 hover:border-[#BAD133] text-[#282860] text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm">
            <Plus size={14} className="text-[#BAD133]" /> New Agent
          </Link>
          <Link href="/dashboard/network" className="bg-white border border-slate-200 hover:border-[#BAD133] text-[#282860] text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm">
            <Plus size={14} className="text-[#BAD133]" /> New Institution
          </Link>
          <Link href="/dashboard/pipeline?action=new-student" className="bg-white border border-slate-200 hover:border-[#BAD133] text-[#282860] text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm">
            <Plus size={14} className="text-[#BAD133]" /> New Student
          </Link>

          <div className="relative" ref={timeMenuRef}>
            <button onClick={() => setShowTimeMenu(!showTimeMenu)} className="bg-[#282860] hover:bg-[#1b1b42] text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm">
              <Calendar size={14} /> {currentTimeLabel} <ChevronDown size={14} />
            </button>
            {showTimeMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-30">
                {TIMEFRAMES.map(t => (
                  <button key={t.value} onClick={() => handleTimeChoice(t.value)} className={`w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${timeframe === t.value ? "bg-[#BAD133]/10 text-[#282860]" : "text-slate-600"}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-20 text-center">
          <Loader2 className="animate-spin mx-auto text-[#BAD133]" size={36} />
          <p className="text-sm text-slate-400 mt-2">Loading dashboard...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard id="active" icon={<Users className="text-blue-600" size={20} />} iconBg="bg-blue-50" label="Active Pipeline" value={m.in_progress ?? 0} valueColor="text-[#282860]" tipOpen={openTip === "active"} onTipToggle={() => setOpenTip(openTip === "active" ? null : "active")} tipText="In progress students only." />
            <KpiCard id="qualified" icon={<Award className="text-yellow-600" size={20} />} iconBg="bg-yellow-50" label="Qualified Leads" value={m.qualified_leads ?? 0} valueColor="text-[#282860]" tipOpen={openTip === "qualified"} onTipToggle={() => setOpenTip(openTip === "qualified" ? null : "qualified")} tipText="AI Scored Hot + Warm leads only." />
            <KpiCard id="applications" icon={<FileText className="text-purple-600" size={20} />} iconBg="bg-purple-50" label="Active Applications" value={m.active_applications ?? 0} valueColor="text-[#282860]" tipOpen={openTip === "applications"} onTipToggle={() => setOpenTip(openTip === "applications" ? null : "applications")} tipText="Submitted applications, awaiting offer." />
            <KpiCard id="commission" icon={<DollarSign className="text-emerald-600" size={20} />} iconBg="bg-emerald-50" label="Estimation Commission" value={`$${(m.estimation_commission ?? 0).toLocaleString()}`} valueColor="text-[#282860]" tipOpen={openTip === "commission"} onTipToggle={() => setOpenTip(openTip === "commission" ? null : "commission")} tipText="Estimated commission from in-progress deals." />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-black text-[#282860] flex items-center gap-2 mb-4"><Building2 size={18} className="text-[#BAD133]" /> Pipeline Volume by Branch</h3>
              {branchData.length === 0 ? (
                <p className="text-center text-slate-400 italic py-12">No branch data for this period.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={branchData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="branch" tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                    <ReTooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, fontWeight: 700 }} cursor={{ fill: "#BAD13310" }} />
                    <Bar dataKey="value" fill="#282860" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-black text-[#282860] flex items-center gap-2 mb-1"><TrendingUp size={18} className="text-[#BAD133]" /> Top Performers</h3>
              {(perf.top_agents_revenue || []).length === 0 ? (
                <p className="text-center text-slate-400 italic py-8 text-sm">No performance data.</p>
              ) : (
                <div className="space-y-2 mt-4">
                  {(perf.top_agents_revenue || []).slice(0, 5).map((agent: any, i: number) => (
                    <div key={agent.name} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-slate-100 text-slate-600" : i === 2 ? "bg-amber-100 text-amber-700" : "bg-slate-50 text-slate-400"}`}>{i + 1}</span>
                        <span className="text-sm font-bold text-[#282860] truncate">{agent.name}</span>
                      </div>
                      <span className="text-xs font-black text-[#BAD133]">${agent.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ===== SUPER CCTV LIVE FEED ===== */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mt-4">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-[#282860] flex items-center gap-2">
                  <Activity size={18} className="text-blue-500" />
                  Super CCTV: Live Agent Activity
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Real-time tracking of agent logins, edits, and file updates.</p>
              </div>
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 px-3 py-1.5 rounded-full">
                 <span className="relative flex h-2.5 w-2.5">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                 </span>
                 <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Live System</span>
              </div>
            </div>
            
            <div className="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
              {auditLogs.length === 0 ? (
                 <p className="text-center text-slate-400 italic py-8 text-sm">No activity recorded yet.</p>
              ) : (
                 auditLogs.map((log) => (
                   <div key={log.id} className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                      <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm
                        ${log.action === 'LOGIN' ? 'bg-indigo-500' : log.action === 'CREATE' ? 'bg-emerald-500' : log.action === 'UPDATE' ? 'bg-blue-500' : log.action === 'DELETE' ? 'bg-red-500' : 'bg-amber-500'}`}>
                         {log.action === 'LOGIN' ? <LogOut size={14} className="rotate-180" /> : <Activity size={14} />}
                      </div>
                      <div className="flex-1">
                         <p className="text-sm text-slate-700">
                           <span className="font-bold text-[#282860]">{log.changed_by}</span> 
                           {log.action === 'LOGIN' ? ' logged into the Fortrust workspace.' : ` ${log.action.toLowerCase()}d a ${log.entity}.`}
                         </p>
                         <div className="flex items-center gap-3 mt-1.5">
                           <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1"><Clock size={12}/> {new Date(log.created_at).toLocaleString()}</span>
                           {log.details && Object.keys(log.details).length > 0 && (
                             <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200 truncate max-w-[500px] inline-block">
                               {JSON.stringify(log.details)}
                             </span>
                           )}
                         </div>
                      </div>
                   </div>
                 ))
              )}
            </div>
          </div>

        </>
      )}

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
              <div><label className="text-xs font-bold text-slate-600">From</label><input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#BAD133]" /></div>
              <div><label className="text-xs font-bold text-slate-600">To</label><input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#BAD133]" /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowCustomModal(false)} className="text-slate-500 font-bold text-sm px-4 py-2">Cancel</button>
                <button onClick={() => { if (customFrom && customTo) { setTimeframe("custom"); setShowCustomModal(false); } }} disabled={!customFrom || !customTo} className="bg-[#282860] text-white font-bold text-sm px-6 py-2 rounded-xl disabled:opacity-50">Apply</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ id, icon, iconBg, label, value, valueColor, tipOpen, onTipToggle, tipText, children }: any) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm relative">
      <div className="flex items-start justify-between mb-3">
        <div className={`${iconBg} p-2.5 rounded-xl`}>{icon}</div>
        <button onClick={onTipToggle} className={`p-1 rounded-full transition-colors ${tipOpen ? "bg-[#282860] text-white" : "text-slate-300 hover:text-[#282860] hover:bg-slate-100"}`}><Info size={14} /></button>
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className={`text-3xl font-black ${valueColor} mt-1`}>{value}</p>
      {children}
      {tipOpen && <div className="absolute top-14 right-3 bg-[#1b1b42] text-white text-[11px] font-medium p-3 rounded-xl shadow-xl max-w-[240px] z-20 leading-relaxed"><div className="absolute -top-1.5 right-3 w-3 h-3 bg-[#1b1b42] rotate-45"></div>{tipText}</div>}
    </div>
  );
}