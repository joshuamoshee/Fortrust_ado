"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Award, Users, FileText, DollarSign, TrendingUp, TrendingDown,
  Info, Plus, Calendar, Building2, GraduationCap, ChevronDown,
  X, Loader2, Activity, LogOut, Clock, Target, CheckCircle2, Cctv,
  AlertTriangle, Flag, ShieldAlert, Timer
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const TIMEFRAMES = [
  { value: "all", label: "All Time" },
  { value: "this_year", label: "This Year" },
  { value: "6months", label: "Last 6 Months" },
  { value: "3months", label: "Last 3 Months" },
  { value: "30days", label: "Last 30 Days" },
];

export default function MasterDashboardPage() {
  const [timeframe, setTimeframe] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showCustomModal, setShowCustomModal] = useState(false);
  
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
      if (timeMenuRef.current && !timeMenuRef.current.contains(e.target as Node)) setShowTimeMenu(false);
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) setShowNewMenu(false);
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
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/audit-logs?limit=10`, { headers: { Authorization: `Bearer ${token}` } })
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
    if (val === "custom") setShowCustomModal(true);
    else setTimeframe(val);
  };

  const currentTimeLabel = timeframe === "custom" && customFrom && customTo
    ? `${customFrom} → ${customTo}`
    : TIMEFRAMES.find(t => t.value === timeframe)?.label || "All Time";

  const m = stats?.metrics || {};
  const perf = stats?.performance || {};
  const branchData = perf.branch_pipeline || [];

  // --- HARDCORE LOGIC FOR ALERTS AND FLAGS ---
  const generatePerformanceFlags = () => {
    const flags: any[] = [];
    const agentsVolume = perf.top_agents_volume || [];
    const agentsRevenue = perf.top_agents_revenue || [];

    agentsVolume.forEach((agent: any) => {
      const revenueMatch = agentsRevenue.find((r: any) => r.name === agent.name);
      const totalRevenue = revenueMatch ? revenueMatch.value : 0;
      
      // Condition 1: High Lead volume but zero revenue brought in
      if (agent.value > 15 && totalRevenue === 0) {
        flags.push({
          agent: agent.name,
          type: "CRITICAL",
          reason: "Zero Revenue Generation",
          detail: `Managing ${agent.value} active leads but has contributed $0 in cleared commissions.`
        });
      }
      // Condition 2: Overloaded queue capacity limits
      if (agent.value >= 45) {
        flags.push({
          agent: agent.name,
          type: "WARNING",
          reason: "Pipeline Saturation",
          detail: `Approaching max structural load capacity with ${agent.value} concurrent student files.`
        });
      }
    });

    // Fallback default flag if data is pristine
    if (flags.length === 0) {
      flags.push({
        agent: "Global Operations",
        type: "OPTIMAL",
        reason: "All systems green",
        detail: "No agent is currently triggering underperformance or capacity boundary flags."
      });
    }
    return flags;
  };

  return (
    <div className="p-4 lg:p-8 max-w-[1600px] mx-auto w-full space-y-8 animate-in fade-in">

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-[#282860] flex items-center gap-3">
            <Award className="text-[#BAD133]" size={36} />
            Master Dashboard
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-2">Global business analytics, financial leadership charts, and automated team audit flags.</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative" ref={newMenuRef}>
            <button onClick={() => setShowNewMenu(!showNewMenu)} className="bg-[#282860] hover:bg-[#1b1b42] active:scale-95 text-white text-sm font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md">
              <Plus size={16} /> New <ChevronDown size={14} className={`text-slate-300 transition-transform duration-200 ${showNewMenu ? 'rotate-180' : ''}`}/>
            </button>
            {showNewMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-40 animate-in fade-in slide-in-from-top-2">
                <Link href="/dashboard/pipeline?action=new-student" className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-bold hover:bg-slate-50 text-[#282860]">
                  <GraduationCap size={18} className="text-[#BAD133]" /> New Student
                </Link>
                <Link href="/dashboard/agent-pipeline" className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-bold hover:bg-slate-50 text-slate-600">
                  <Users size={18} className="text-slate-400" /> New Agent
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
                  <button key={t.value} onClick={() => handleTimeChoice(t.value)} className={`w-full text-left px-5 py-3 text-sm font-bold hover:bg-slate-50 border-b border-slate-50 last:border-0 ${timeframe === t.value ? "bg-[#BAD133]/10 text-[#282860]" : "text-slate-600"}`}>
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
          <p className="font-medium tracking-wide">Compiling Master Metrics...</p>
        </div>
      ) : (
        <>
          {/* TOP KPI ROW */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard id="commission" icon={<DollarSign className="text-emerald-600" size={24} />} iconBg="bg-emerald-50" label="Total Cleared Commission" value={`$${(m.logged_commission ?? 0).toLocaleString()}`} tipOpen={openTip === "commission"} onTipToggle={() => setOpenTip(openTip === "commission" ? null : "commission")} tipText="Total historical cleared cash payouts successfully paid out by global institutions.">
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-black">PIPELINE UNRELEASED:</span>
                <span className="font-black text-amber-600 text-xs">${(m.estimation_commission ?? 0).toLocaleString()}</span>
              </div>
            </KpiCard>

            <KpiCard id="velocity" icon={<Timer className="text-blue-600" size={24} />} iconBg="bg-blue-50" label="Avg Time To Close" value={`${m.avg_days_to_close ?? 24} Days`} tipOpen={openTip === "velocity"} onTipToggle={() => setOpenTip(openTip === "velocity" ? null : "velocity")} tipText="Average lifespan tracking of 1 student shifting from initial entry lead to successful institutional placement.">
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
                 <Clock size={14} className="text-slate-400"/>
                 <span className="text-[10px] text-slate-500 uppercase font-black">Target Cycle Metric: 30 Days</span>
              </div>
            </KpiCard>

            <KpiCard id="qualified" icon={<Award className="text-yellow-600" size={24} />} iconBg="bg-yellow-50" label="Qualified Hot Leads" value={m.qualified_leads ?? 0} tipOpen={openTip === "qualified"} onTipToggle={() => setOpenTip(openTip === "qualified" ? null : "qualified")} tipText="AI Rated hot and warm interest files currently requiring active consultation.">
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-black ${(m.qualified_growth ?? 0) >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                  {(m.qualified_growth ?? 0) >= 0 ? "+" : ""}{m.qualified_growth ?? 0}% Growth
                </div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">vs last month</span>
              </div>
            </KpiCard>

            <KpiCard id="active" icon={<Users className="text-purple-600" size={24} />} iconBg="bg-purple-50" label="Total Active Pipeline" value={m.in_progress ?? 0} tipOpen={openTip === "active"} onTipToggle={() => setOpenTip(openTip === "active" ? null : "active")} tipText="Total count of active student profiles currently processing within the systems.">
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100">
                <div className="text-[11px] font-bold text-slate-500">Placed: <span className="text-emerald-600 font-black">{m.completed ?? 0}</span></div>
                <div className="text-[11px] font-bold text-slate-500">Dropped: <span className="text-red-500 font-black">{m.dropped ?? 0}</span></div>
              </div>
            </KpiCard>
          </div>

          {/* SYSTEM PERFORMANCE MATRIX & LEADERBOARD */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            
            {/* Chart Column */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 lg:p-8">
              <div className="mb-6">
                <h3 className="font-black text-xl text-[#282860] flex items-center gap-2"><Building2 size={20} className="text-[#BAD133]" /> Pipeline Volume by Branch</h3>
                <p className="text-xs text-slate-400 mt-1 font-medium">Active student distribution across corporate physical branch architectures.</p>
              </div>
              {branchData.length === 0 ? (
                <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl">
                  <p className="text-slate-400 font-medium">No active branch data found.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={branchData} margin={{ top: 10, right: 10, bottom: 10, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="branch" tick={{ fontSize: 11, fill: "#64748b", fontWeight: 700 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b", fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <ReTooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'none', fontWeight: 'bold', color: '#282860' }} />
                    <Bar dataKey="value" fill="#282860" radius={[6, 6, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* COMMISSION REVENUE LEADERBOARD */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 lg:p-8">
              <div className="mb-6">
                <h3 className="font-black text-xl text-[#282860] flex items-center gap-2"><Target size={20} className="text-[#BAD133]" /> Revenue Leaderboard</h3>
                <p className="text-xs text-slate-400 mt-1 font-medium">Ranked explicitly by total financial commission brought into the company.</p>
              </div>

              {(perf.top_agents_revenue || []).length === 0 ? (
                <div className="h-48 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl">
                  <p className="text-slate-400 font-medium">No transaction histories recorded.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                  {(perf.top_agents_revenue || []).map((agent: any, i: number) => (
                    <div key={agent.name} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/50 hover:bg-slate-50 border border-slate-100 transition-all">
                      <div className="flex items-center gap-4">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black
                          ${i === 0 ? "bg-yellow-100 text-yellow-700 ring-2 ring-yellow-50"
                          : i === 1 ? "bg-slate-200 text-slate-700"
                          : i === 2 ? "bg-amber-100 text-amber-800"
                          : "bg-white border text-slate-400"}`}>
                          {i + 1}
                        </span>
                        <span className="text-sm font-bold text-[#282860]">{agent.name}</span>
                      </div>
                      <span className="text-sm font-black text-emerald-600">${agent.value.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* AUTOMATED OPERATIONAL UNDERPERFORMANCE FLAGS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 lg:p-8 flex flex-col h-full">
              <div className="mb-6">
                <h3 className="font-black text-xl text-[#282860] flex items-center gap-2"><Flag size={20} className="text-red-500" /> System Performance Flags</h3>
                <p className="text-xs text-slate-400 mt-1 font-medium">Automated system scans flagging pipeline bottlenecks or underperformance boundaries.</p>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar max-h-[300px]">
                {generatePerformanceFlags().map((flag: any, i: number) => (
                  <div key={i} className={`p-4 rounded-2xl border flex items-start gap-3 transition-colors
                    ${flag.type === 'CRITICAL' ? 'bg-red-50/60 border-red-100 text-red-800' : 
                      flag.type === 'WARNING' ? 'bg-amber-50/60 border-amber-100 text-amber-800' : 
                      'bg-emerald-50/50 border-emerald-100 text-emerald-800'}`}>
                    <div className="mt-0.5">
                      {flag.type === 'CRITICAL' ? <ShieldAlert size={18} className="text-red-500"/> : 
                       flag.type === 'WARNING' ? <AlertTriangle size={18} className="text-amber-500"/> : 
                       <CheckCircle2 size={18} className="text-emerald-500"/>}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm">{flag.agent}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-black border
                          ${flag.type === 'CRITICAL' ? 'bg-red-100 border-red-200 text-red-700' : 
                            flag.type === 'WARNING' ? 'bg-amber-100 border-amber-200 text-amber-700' : 
                            'bg-emerald-100 border-emerald-200 text-emerald-700'}`}>{flag.reason}</span>
                      </div>
                      <p className="text-xs font-medium text-slate-600 mt-1.5 leading-relaxed">{flag.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SUPER CCTV LIVE ACTION AUDIT FEED */}
            <div className="lg:col-span-2 bg-[#0f172a] rounded-3xl border border-slate-800 shadow-2xl p-6 lg:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600 rounded-full blur-[120px] opacity-10 pointer-events-none"></div>
              
              <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4 relative z-10">
                <div>
                  <h3 className="font-black text-xl text-white flex items-center gap-3">
                    <Cctv size={22} className="text-blue-400" /> Secure Audit CCTV
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 font-medium">Real-time systemic action tracking of all agent accounts across the platform.</p>
                </div>
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl">
                   <span className="relative flex h-2 w-2">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                   </span>
                   <span className="text-[10px] font-black text-red-400 uppercase tracking-wider">Live System Sync</span>
                </div>
              </div>
              
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar relative z-10">
                {auditLogs.length === 0 ? (
                   <p className="text-center text-slate-500 italic py-12 font-medium">No live system inputs tracked.</p>
                ) : (
                   auditLogs.map((log) => (
                     <div key={log.id} className="flex items-start gap-4 p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/60 border border-slate-800/60 transition-colors">
                        <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs
                          ${log.action === 'LOGIN' ? 'bg-indigo-500' : log.action === 'CREATE' ? 'bg-emerald-500' : log.action === 'UPDATE' ? 'bg-blue-500' : 'bg-amber-500'}`}>
                           {log.action === 'LOGIN' ? <LogOut size={14} className="rotate-180" /> : <Activity size={14} />}
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="text-sm text-slate-300 font-medium">
                             <strong className="text-white font-black pr-1">{log.changed_by}</strong> 
                             {log.action === 'LOGIN' ? 'entered workspace' : `executed ${log.action} on ${log.entity}`}
                           </p>
                           <div className="flex items-center gap-3 mt-1.5">
                             <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><Clock size={10}/> {new Date(log.created_at).toLocaleTimeString()}</span>
                             {log.details && (
                               <p className="text-[11px] text-blue-300 font-mono truncate max-w-[450px]">
                                 {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                               </p>
                             )}
                           </div>
                        </div>
                     </div>
                   ))
                )}
              </div>
            </div>

          </div>
        </>
      )}

      {/* TIMEFRAME CALENDAR MODAL */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-[#f8fafc]">
              <h3 className="font-black text-xl text-[#282860] flex items-center gap-2"><Calendar size={20} className="text-[#BAD133]" /> Custom Date Range</h3>
              <button onClick={() => setShowCustomModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">From Date</label>
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border rounded-xl outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">To Date</label>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border rounded-xl outline-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowCustomModal(false)} className="text-slate-500 font-bold text-sm px-4">Cancel</button>
                <button onClick={() => { if (customFrom && customTo) { setTimeframe("custom"); setShowCustomModal(false); } }} disabled={!customFrom || !customTo} className="bg-[#282860] text-white font-bold text-sm px-6 py-2.5 rounded-xl disabled:opacity-50 shadow-md">Apply Filter</button>
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