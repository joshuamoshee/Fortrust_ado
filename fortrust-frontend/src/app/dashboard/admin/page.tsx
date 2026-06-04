"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Award, Users, FileText, DollarSign, TrendingUp, TrendingDown,
  Info, Plus, Calendar, Building2, GraduationCap, ChevronDown,
  X, Sparkles, Loader2, Activity, LogOut, Clock, Target, CheckCircle2, Cctv
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
  
  // Dropdown States
  const [showTimeMenu, setShowTimeMenu] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);

  const [stats, setStats] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [openTip, setOpenTip] = useState<string | null>(null);
  const timeMenuRef = useRef<HTMLDivElement>(null);
  const newMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (timeMenuRef.current && !timeMenuRef.current.contains(e.target as Node)) {
        setShowTimeMenu(false);
      }
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) {
        setShowNewMenu(false);
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
    <div className="p-4 lg:p-8 max-w-[1600px] mx-auto w-full space-y-8 animate-in fade-in">

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-[#282860] flex items-center gap-3">
            <Award className="text-[#BAD133]" size={36} />
            Master Dashboard
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-2">Global operations overview, branch performance, and live system tracking.</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative" ref={newMenuRef}>
            <button 
              onClick={() => setShowNewMenu(!showNewMenu)} 
              className="bg-[#282860] hover:bg-[#1b1b42] active:scale-95 text-white text-sm font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md"
            >
              <Plus size={16} /> New <ChevronDown size={14} className={`text-slate-300 transition-transform duration-200 ${showNewMenu ? 'rotate-180' : ''}`}/>
            </button>

            {showNewMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden z-40 animate-in fade-in slide-in-from-top-2">
                <Link href="/dashboard/pipeline?action=new-student" className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-bold hover:bg-slate-50 transition-colors border-b border-slate-50 text-[#282860]">
                  <GraduationCap size={18} className="text-[#BAD133]" /> New Student
                </Link>
                <Link href="/dashboard/agent-pipeline" className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-bold hover:bg-slate-50 transition-colors border-b border-slate-50 text-slate-600">
                  <Users size={18} className="text-slate-400" /> New Agent
                </Link>
                <Link href="/dashboard/network" className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-bold hover:bg-slate-50 transition-colors text-slate-600">
                  <Building2 size={18} className="text-slate-400" /> New Institution
                </Link>
              </div>
            )}
          </div>

          <div className="relative ml-2" ref={timeMenuRef}>
            <button onClick={() => setShowTimeMenu(!showTimeMenu)} className="bg-white border border-slate-200 hover:bg-slate-50 text-[#282860] text-sm font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all">
              <Calendar size={16} className="text-[#BAD133]"/> {currentTimeLabel} <ChevronDown size={16} className="text-slate-400"/>
            </button>
            {showTimeMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-30 animate-in fade-in slide-in-from-top-2">
                {TIMEFRAMES.map(t => (
                  <button key={t.value} onClick={() => handleTimeChoice(t.value)} className={`w-full text-left px-5 py-3 text-sm font-bold hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${timeframe === t.value ? "bg-[#BAD133]/10 text-[#282860]" : "text-slate-600"}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#BAD133] mb-4"></div>
          <p className="font-medium tracking-wide">Compiling Global Analytics...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard id="active" icon={<Users className="text-blue-600" size={24} />} iconBg="bg-blue-50" label="Active Pipeline" value={m.in_progress ?? 0} tipOpen={openTip === "active"} onTipToggle={() => setOpenTip(openTip === "active" ? null : "active")} tipText="In progress students only. Excludes completed and dropped.">
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-500"/>
                  <span className="font-black text-emerald-600 text-xs">{m.completed ?? 0}</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Completed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <X size={14} className="text-red-400"/>
                  <span className="font-black text-red-500 text-xs">{m.dropped ?? 0}</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Dropped</span>
                </div>
              </div>
            </KpiCard>

            <KpiCard id="qualified" icon={<Award className="text-yellow-600" size={24} />} iconBg="bg-yellow-50" label="Qualified Leads" value={m.qualified_leads ?? 0} tipOpen={openTip === "qualified"} onTipToggle={() => setOpenTip(openTip === "qualified" ? null : "qualified")} tipText="AI Scored Hot + Warm leads only. Excludes Cold leads.">
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-black tracking-wider ${(m.qualified_growth ?? 0) >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                  {(m.qualified_growth ?? 0) >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {(m.qualified_growth ?? 0) >= 0 ? "+" : ""}{m.qualified_growth ?? 0}%
                </div>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">VS LAST 30 DAYS</span>
              </div>
            </KpiCard>

            <KpiCard id="applications" icon={<FileText className="text-purple-600" size={24} />} iconBg="bg-purple-50" label="Active Applications" value={m.active_applications ?? 0} tipOpen={openTip === "applications"} onTipToggle={() => setOpenTip(openTip === "applications" ? null : "applications")} tipText="Submitted applications, awaiting offer from the institution.">
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
                 <Clock size={14} className="text-purple-400"/>
                 <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Submitted, awaiting offer</span>
              </div>
            </KpiCard>

            <KpiCard id="commission" icon={<DollarSign className="text-emerald-600" size={24} />} iconBg="bg-emerald-50" label="Estimation Commission" value={`$${(m.estimation_commission ?? 0).toLocaleString()}`} tipOpen={openTip === "commission"} onTipToggle={() => setOpenTip(openTip === "commission" ? null : "commission")} tipText="Estimated commission from in-progress deals — projected revenue if all close successfully.">
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Closed:</span>
                <span className="font-black text-emerald-600 text-sm">${(m.logged_commission ?? 0).toLocaleString()}</span>
                <span className="text-[10px] text-slate-400 font-bold ml-1">THIS PERIOD</span>
              </div>
            </KpiCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 lg:p-8">
              <div className="mb-6">
                <h3 className="font-black text-xl text-[#282860] flex items-center gap-2"><Building2 size={20} className="text-[#BAD133]" /> Pipeline Volume by Branch</h3>
                <p className="text-xs text-slate-400 mt-1 font-medium tracking-wide">Active student distribution across the corporate network</p>
              </div>
              {branchData.length === 0 ? (
                <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl">
                  <p className="text-slate-400 font-medium">No branch data available for this period.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={branchData} margin={{ top: 10, right: 10, bottom: 10, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="branch" tick={{ fontSize: 11, fill: "#64748b", fontWeight: 700 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b", fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <ReTooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold', color: '#282860' }} />
                    <Bar dataKey="value" fill="#282860" radius={[6, 6, 0, 0]} maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 lg:p-8">
              <div className="mb-6">
                <h3 className="font-black text-xl text-[#282860] flex items-center gap-2"><Target size={20} className="text-[#BAD133]" /> Top Performers</h3>
                <p className="text-xs text-slate-400 mt-1 font-medium tracking-wide">Ranked by revenue generated</p>
              </div>

              {(perf.top_agents_revenue || []).length === 0 ? (
                <div className="h-48 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl">
                  <p className="text-slate-400 font-medium">No performance data.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(perf.top_agents_revenue || []).slice(0, 5).map((agent: any, i: number) => (
                    <div key={agent.name} className="flex items-center justify-between p-3.5 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                      <div className="flex items-center gap-4">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-sm
                          ${i === 0 ? "bg-yellow-100 text-yellow-700 ring-2 ring-yellow-50"
                          : i === 1 ? "bg-slate-100 text-slate-600 ring-2 ring-slate-50"
                          : i === 2 ? "bg-amber-100 text-amber-700 ring-2 ring-amber-50"
                          : "bg-slate-50 text-slate-400"}`}>
                          {i + 1}
                        </span>
                        <span className="text-sm font-bold text-[#282860]">{agent.name}</span>
                      </div>
                      <span className="text-sm font-black text-emerald-600">${agent.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#0f172a] rounded-3xl border border-slate-800 shadow-2xl p-6 lg:p-8 mt-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600 rounded-full blur-[120px] opacity-10 pointer-events-none"></div>
            
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 border-b border-slate-800/60 pb-6 relative z-10">
              <div>
                <h3 className="font-black text-2xl text-white flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-xl"><Cctv size={24} className="text-blue-400" /></div>
                  Super CCTV Feed
                </h3>
                <p className="text-sm text-slate-400 mt-2 font-medium">Real-time surveillance of agent logins, edits, and system actions.</p>
              </div>
              <div className="mt-4 sm:mt-0 flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl w-fit">
                 <span className="relative flex h-2.5 w-2.5">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                 </span>
                 <span className="text-xs font-black text-red-400 uppercase tracking-widest">Live Monitoring</span>
              </div>
            </div>
            
            <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-4 relative z-10">
              {auditLogs.length === 0 ? (
                 <p className="text-center text-slate-500 italic py-12 font-medium">No activity recorded yet.</p>
              ) : (
                 auditLogs.map((log) => (
                   <div key={log.id} className="flex items-start gap-5 p-4 rounded-2xl bg-slate-800/40 hover:bg-slate-800/80 transition-colors border border-slate-700/50">
                      <div className={`mt-1 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-slate-800
                        ${log.action === 'LOGIN' ? 'bg-indigo-500' : log.action === 'CREATE' ? 'bg-emerald-500' : log.action === 'UPDATE' ? 'bg-blue-500' : log.action === 'DELETE' ? 'bg-red-500' : 'bg-amber-500'}`}>
                         {log.action === 'LOGIN' ? <LogOut size={16} className="rotate-180" /> : <Activity size={16} />}
                      </div>
                      <div className="flex-1">
                         <p className="text-base text-slate-300 font-medium">
                           <span className="font-black text-white">{log.changed_by}</span> 
                           {log.action === 'LOGIN' ? ' authenticated and entered the workspace.' : ` executed a ${log.action} action on a ${log.entity}.`}
                         </p>
                         <div className="flex flex-wrap items-center gap-3 mt-2">
                           <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg"><Clock size={12}/> {new Date(log.created_at).toLocaleString()}</span>
                           {log.details && Object.keys(log.details).length > 0 && (
                             <span className="text-[11px] text-blue-300 font-mono bg-blue-900/30 px-3 py-1 rounded-lg border border-blue-800/50 truncate max-w-[600px] inline-block">
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-[#f8fafc]">
              <h3 className="font-black text-xl text-[#282860] flex items-center gap-2">
                <Calendar size={20} className="text-[#BAD133]" /> Custom Date Range
              </h3>
              <button onClick={() => setShowCustomModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">From Date</label>
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#BAD133] focus:bg-white focus:ring-2 focus:ring-[#BAD133]/20 transition-all" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">To Date</label>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#BAD133] focus:bg-white focus:ring-2 focus:ring-[#BAD133]/20 transition-all" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setShowCustomModal(false)} className="text-slate-500 hover:text-slate-800 font-bold text-sm px-5 py-3 transition-colors">Cancel</button>
                <button onClick={() => { if (customFrom && customTo) { setTimeframe("custom"); setShowCustomModal(false); } }} disabled={!customFrom || !customTo} className="bg-[#282860] hover:bg-[#1b1b42] text-white font-bold text-sm px-8 py-3 rounded-xl disabled:opacity-50 shadow-md transition-all">Apply Filter</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ id, icon, iconBg, label, value, tipOpen, onTipToggle, tipText, children }: any) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm relative hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`${iconBg} p-3 rounded-2xl`}>{icon}</div>
        <button onClick={onTipToggle} className={`p-1.5 rounded-full transition-colors ${tipOpen ? "bg-[#282860] text-white shadow-md" : "text-slate-300 hover:text-[#282860] hover:bg-slate-100"}`}><Info size={16} /></button>
      </div>
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-4xl font-black text-[#282860] mt-1.5 tracking-tight">{value}</p>
      {children}
      {tipOpen && (
        <div className="absolute top-16 right-4 bg-[#1b1b42] text-white text-xs font-medium p-4 rounded-2xl shadow-xl max-w-[240px] z-20 leading-relaxed animate-in fade-in zoom-in-95">
          <div className="absolute -top-1.5 right-4 w-3 h-3 bg-[#1b1b42] rotate-45"></div>
          {tipText}
        </div>
      )}
    </div>
  );
}