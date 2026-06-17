"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Award, Users, DollarSign, Calendar, ChevronDown, X, Activity,
  Target, CheckCircle2, Timer,
  ArrowRight, Flame, FileWarning, UserMinus, FileClock, BellRing,
  Plus, GraduationCap, Zap,
  TrendingUp, Building2
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const TIMEFRAMES = [
  { value: "all", label: "All Time" },
  { value: "this_year", label: "This Year" },
  { value: "6months", label: "Last 6 Months" },
  { value: "3months", label: "Last 3 Months" },
  { value: "30days", label: "Last 30 Days" },
];

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

export default function MasterDashboardPage() {
  const [timeframe, setTimeframe] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showCustomModal, setShowCustomModal] = useState(false);

  const [showTimeMenu, setShowTimeMenu] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);

  const [stats, setStats] = useState<any>(null);
  const [actionQueue, setActionQueue] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  const timeMenuRef = useRef<HTMLDivElement>(null);
  const newMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("fortrust_user");
    if (storedUser) {
      try { setUserName(JSON.parse(storedUser).name?.split(" ")[0] || ""); } catch {}
    }
    const handle = (e: MouseEvent) => {
      if (timeMenuRef.current && !timeMenuRef.current.contains(e.target as Node)) setShowTimeMenu(false);
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) setShowNewMenu(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("fortrust_token");
      let url = `${process.env.NEXT_PUBLIC_API_URL}/api/admin/dashboard-stats?timeframe=${timeframe}`;
      if (timeframe === "custom" && customFrom && customTo) {
        url += `&from_date=${customFrom}&to_date=${customTo}`;
      }

      const [statsRes, queueRes, logsRes] = await Promise.all([
        fetch(url, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/action-queue`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/audit-logs?limit=8`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const statsData = await statsRes.json();
      const queueData = await queueRes.json();
      const logsData = await logsRes.json();

      if (statsData.status === "success") setStats(statsData.data);
      if (queueData.status === "success") setActionQueue(queueData.data);
      if (logsData.status === "success") setAuditLogs(logsData.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (timeframe !== "custom" || (customFrom && customTo)) fetchAllData();
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
  const q = actionQueue || {};

  // Total items needing attention
  const totalAttention =
    (q.hot_stale?.count || 0) +
    (q.missing_docs?.count || 0) +
    (q.unassigned?.count || 0) +
    (q.commissions_ready?.count || 0) +
    (q.expiring_agreements?.count || 0) +
    (q.todays_reminders?.count || 0);

  return (
    <div className="p-4 lg:p-8 max-w-[1600px] mx-auto w-full space-y-6 animate-in fade-in">

      {/* WELCOME BAR */}
      <div className="bg-gradient-to-r from-[#1b1b42] via-[#282860] to-[#1b1b42] rounded-3xl p-6 lg:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#BAD133] rounded-full blur-[120px] opacity-10 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <p className="text-[#BAD133] text-sm font-black uppercase tracking-widest mb-2">
              {getGreeting()}{userName ? `, ${userName}` : ""} 👋
            </p>
            <h1 className="text-3xl lg:text-4xl font-black mb-2">
              {totalAttention === 0
                ? "All clear — nothing urgent today!"
                : `You have ${totalAttention} ${totalAttention === 1 ? "item" : "items"} needing attention`}
            </h1>
            <p className="text-slate-300 text-sm font-medium">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative" ref={newMenuRef}>
              <button onClick={() => setShowNewMenu(!showNewMenu)} className="bg-[#BAD133] hover:bg-[#a3b827] active:scale-95 text-[#1b1b42] text-sm font-black px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-md">
                <Plus size={16} /> Quick Add <ChevronDown size={14} className={`transition-transform duration-200 ${showNewMenu ? 'rotate-180' : ''}`}/>
              </button>
              {showNewMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-40 animate-in fade-in slide-in-from-top-2">
                  <Link href="/dashboard/students" className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-bold hover:bg-slate-50 text-[#282860]">
                    <GraduationCap size={18} className="text-[#BAD133]" /> New Student
                  </Link>
                  <Link href="/dashboard/agent-pipeline" className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-bold hover:bg-slate-50 text-slate-600">
                    <Users size={18} className="text-slate-400" /> New Agent
                  </Link>
                  <Link href="/dashboard/network" className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-bold hover:bg-slate-50 text-slate-600">
                    <Building2 size={18} className="text-slate-400" /> New Institution
                  </Link>
                </div>
              )}
            </div>

            <div className="relative" ref={timeMenuRef}>
              <button onClick={() => setShowTimeMenu(!showTimeMenu)} className="bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-bold px-5 py-3 rounded-xl flex items-center gap-2 transition-all backdrop-blur-sm">
                <Calendar size={16} className="text-[#BAD133]"/> {currentTimeLabel} <ChevronDown size={16}/>
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
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#BAD133] mb-4"></div>
          <p className="font-medium tracking-wide">Loading your command center...</p>
        </div>
      ) : (
        <>
          {/* ACTION QUEUE — THE HERO */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-[#282860] flex items-center gap-2">
                <Zap size={22} className="text-[#BAD133]"/> Action Queue
              </h2>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Click any card to jump straight in</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

              <ActionCard
                href="/dashboard/students?filter=stale-hot"
                accent="red"
                icon={<Flame size={22} className="text-red-600"/>}
                iconBg="bg-red-50"
                title="Hot Leads Going Cold"
                count={q.hot_stale?.count || 0}
                description="No contact in 3+ days"
                items={q.hot_stale?.items || []}
                renderItem={(it: any) => (
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 truncate">{it.name}</span>
                    <span className="text-red-500 font-bold shrink-0 ml-2">{it.assignee || 'Unassigned'}</span>
                  </div>
                )}
                ctaLabel="View all stale leads"
              />

              <ActionCard
                href="/dashboard/claimed"
                accent="emerald"
                icon={<DollarSign size={22} className="text-emerald-600"/>}
                iconBg="bg-emerald-50"
                title="Ready to Claim"
                count={q.commissions_ready?.count || 0}
                description={q.commissions_ready?.description || "Cleared funds awaiting withdrawal"}
                heroValue={q.commissions_ready?.total_amount > 0 ? `$${(q.commissions_ready.total_amount).toLocaleString()}` : null}
                items={q.commissions_ready?.items || []}
                renderItem={(it: any) => (
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 truncate">{it.name}</span>
                    <span className="text-emerald-600 font-black shrink-0 ml-2">${(it.commission_earned || 0).toLocaleString()}</span>
                  </div>
                )}
                ctaLabel="Claim commissions"
              />

              <ActionCard
                href="/dashboard/students"
                accent="amber"
                icon={<FileWarning size={22} className="text-amber-600"/>}
                iconBg="bg-amber-50"
                title="Missing Documents"
                count={q.missing_docs?.count || 0}
                description="Students with incomplete files"
                items={q.missing_docs?.items || []}
                renderItem={(it: any) => (
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 truncate">{it.name}</span>
                    <span className="text-amber-600 font-bold shrink-0 ml-2">{it.doc_count}/3+ docs</span>
                  </div>
                )}
                ctaLabel="Review document gaps"
              />

              <ActionCard
                href="/dashboard/students?filter=unassigned"
                accent="blue"
                icon={<UserMinus size={22} className="text-blue-600"/>}
                iconBg="bg-blue-50"
                title="Unassigned Leads"
                count={q.unassigned?.count || 0}
                description="Waiting in the open pool"
                items={q.unassigned?.items || []}
                renderItem={(it: any) => (
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 truncate">{it.name}</span>
                    <span className="text-blue-500 font-bold shrink-0 ml-2 capitalize">{(it.lead_temperature || 'cold').toLowerCase().replace(' leads', '')}</span>
                  </div>
                )}
                ctaLabel="Assign now"
              />

              <ActionCard
                href="/dashboard/network"
                accent="purple"
                icon={<FileClock size={22} className="text-purple-600"/>}
                iconBg="bg-purple-50"
                title="Agreements at Risk"
                count={q.expiring_agreements?.count || 0}
                description="Expiring or expired in 30 days"
                items={q.expiring_agreements?.items || []}
                renderItem={(it: any) => (
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 truncate">{it.name}</span>
                    <span className={`font-bold shrink-0 ml-2 ${it.is_expired ? 'text-red-500' : 'text-amber-600'}`}>
                      {it.is_expired ? `Expired ${Math.abs(it.days_left)}d ago` : `${it.days_left}d left`}
                    </span>
                  </div>
                )}
                ctaLabel="Renew agreements"
              />

              <ActionCard
                href="/dashboard/students"
                accent="indigo"
                icon={<BellRing size={22} className="text-indigo-600"/>}
                iconBg="bg-indigo-50"
                title="Today's Reminders"
                count={q.todays_reminders?.count || 0}
                description="Scheduled follow-ups for today"
                items={q.todays_reminders?.items || []}
                renderItem={(it: any) => (
                  <div className="text-xs">
                    <p className="font-bold text-slate-700 truncate">{it.student_name}</p>
                    <p className="text-[10px] text-slate-500 truncate italic">{it.note}</p>
                  </div>
                )}
                ctaLabel="View reminders"
              />
            </div>
          </div>

          {/* PERFORMANCE METRICS STRIP */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-[#282860] flex items-center gap-2">
                <TrendingUp size={22} className="text-[#BAD133]"/> Performance Snapshot
              </h2>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{currentTimeLabel}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricChip
                icon={<Users size={18}/>}
                color="purple"
                label="Active Pipeline"
                value={m.in_progress ?? 0}
                sublabel={`${m.completed ?? 0} placed · ${m.dropped ?? 0} dropped`}
              />
              <MetricChip
                icon={<Award size={18}/>}
                color="yellow"
                label="Qualified Leads"
                value={m.qualified_leads ?? 0}
                sublabel={`${(m.qualified_growth ?? 0) >= 0 ? '+' : ''}${m.qualified_growth ?? 0}% vs last month`}
                trend={(m.qualified_growth ?? 0) >= 0 ? 'up' : 'down'}
              />
              <MetricChip
                icon={<DollarSign size={18}/>}
                color="emerald"
                label="Cleared Commission"
                value={`$${(m.logged_commission ?? 0).toLocaleString()}`}
                sublabel={`$${(m.estimation_commission ?? 0).toLocaleString()} pipeline`}
              />
              <MetricChip
                icon={<Timer size={18}/>}
                color="blue"
                label="Avg Time to Close"
                value={`${m.avg_days_to_close ?? 24}d`}
                sublabel="Target: 30 days"
              />
            </div>
          </div>

          {/* LOWER SECTION: Branch Volume + Top Performers */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <div className="mb-4">
                <h3 className="font-black text-lg text-[#282860] flex items-center gap-2"><Building2 size={20} className="text-[#BAD133]" /> Pipeline by Branch</h3>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">Active student distribution across branches</p>
              </div>
              {branchData.length === 0 ? (
                <div className="h-48 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl">
                  <p className="text-slate-400 font-medium text-sm">No branch data yet.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={branchData} margin={{ top: 10, right: 10, bottom: 10, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="branch" tick={{ fontSize: 11, fill: "#64748b", fontWeight: 700 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b", fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <ReTooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'none', fontWeight: 'bold', color: '#282860' }} />
                    <Bar dataKey="value" fill="#BAD133" radius={[6, 6, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <div className="mb-4">
                <h3 className="font-black text-lg text-[#282860] flex items-center gap-2"><Target size={20} className="text-[#BAD133]" /> Top Performers</h3>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">Revenue leaders this period</p>
              </div>
              {(perf.top_agents_revenue || []).length === 0 ? (
                <div className="h-32 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl">
                  <p className="text-slate-400 font-medium text-sm">No revenue yet.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {(perf.top_agents_revenue || []).slice(0, 5).map((agent: any, i: number) => (
                    <div key={agent.name} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0
                          ${i === 0 ? "bg-yellow-100 text-yellow-700 ring-2 ring-yellow-200"
                          : i === 1 ? "bg-slate-200 text-slate-700"
                          : i === 2 ? "bg-amber-100 text-amber-800"
                          : "bg-white border text-slate-400"}`}>
                          {i + 1}
                        </span>
                        <span className="text-sm font-bold text-[#282860] truncate">{agent.name}</span>
                      </div>
                      <span className="text-xs font-black text-emerald-600 shrink-0 ml-2">${agent.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* LIVE ACTIVITY — compact */}
          <div className="bg-[#0f172a] rounded-3xl border border-slate-800 shadow-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[100px] opacity-10 pointer-events-none"></div>

            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3 relative z-10">
              <div>
                <h3 className="font-black text-lg text-white flex items-center gap-2">
                  <Activity size={20} className="text-blue-400" /> Live Activity
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">Real-time actions across all users</p>
              </div>
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl">
                 <span className="relative flex h-2 w-2">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                 </span>
                 <span className="text-[10px] font-black text-red-400 uppercase tracking-wider">Live</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 relative z-10">
              {auditLogs.length === 0 ? (
                 <p className="col-span-2 text-center text-slate-500 italic py-8 font-medium text-sm">No activity tracked yet.</p>
              ) : (
                 auditLogs.slice(0, 8).map((log) => (
                   <div key={log.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-800/40 hover:bg-slate-800/70 border border-slate-800/60 transition-colors">
                      <div className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs
                        ${log.action === 'LOGIN' ? 'bg-indigo-500' : log.action === 'CREATE' || log.action === 'CREATE_LEAD' ? 'bg-emerald-500' : log.action === 'UPDATE' ? 'bg-blue-500' : log.action === 'ARCHIVE_STUDENT' ? 'bg-red-500' : 'bg-amber-500'}`}>
                        <Activity size={12} />
                      </div>
                      <div className="flex-1 min-w-0">
                         <p className="text-xs text-slate-300 font-medium truncate">
                           <strong className="text-white font-black">{log.changed_by}</strong>{' '}
                           <span className="text-slate-400">{log.action === 'LOGIN' ? 'logged in' : `${log.action.toLowerCase().replace(/_/g, ' ')}`}</span>
                         </p>
                         <p className="text-[10px] font-bold text-slate-500 mt-0.5">{new Date(log.created_at).toLocaleString()}</p>
                      </div>
                   </div>
                 ))
              )}
            </div>
          </div>
        </>
      )}

      {/* CUSTOM DATE RANGE MODAL */}
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
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#BAD133]" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">To Date</label>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#BAD133]" />
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

// =============================================================
// ACTION CARD — the new hero component
// =============================================================
function ActionCard({
  href, accent, icon, iconBg, title, count, description, items, renderItem, ctaLabel, heroValue
}: any) {
  const isEmpty = count === 0;

  const accentColors: any = {
    red: { border: "border-red-200", hover: "hover:border-red-400 hover:shadow-red-100", badge: "bg-red-50 text-red-700 border-red-200", cta: "text-red-600 group-hover:text-red-700" },
    emerald: { border: "border-emerald-200", hover: "hover:border-emerald-400 hover:shadow-emerald-100", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", cta: "text-emerald-600 group-hover:text-emerald-700" },
    amber: { border: "border-amber-200", hover: "hover:border-amber-400 hover:shadow-amber-100", badge: "bg-amber-50 text-amber-700 border-amber-200", cta: "text-amber-600 group-hover:text-amber-700" },
    blue: { border: "border-blue-200", hover: "hover:border-blue-400 hover:shadow-blue-100", badge: "bg-blue-50 text-blue-700 border-blue-200", cta: "text-blue-600 group-hover:text-blue-700" },
    purple: { border: "border-purple-200", hover: "hover:border-purple-400 hover:shadow-purple-100", badge: "bg-purple-50 text-purple-700 border-purple-200", cta: "text-purple-600 group-hover:text-purple-700" },
    indigo: { border: "border-indigo-200", hover: "hover:border-indigo-400 hover:shadow-indigo-100", badge: "bg-indigo-50 text-indigo-700 border-indigo-200", cta: "text-indigo-600 group-hover:text-indigo-700" },
  };
  const c = accentColors[accent] || accentColors.blue;

  if (isEmpty) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 opacity-60">
        <div className="flex items-center gap-3 mb-3">
          <div className={`${iconBg} p-2.5 rounded-xl opacity-50`}>{icon}</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-sm text-slate-500">{title}</h3>
            <p className="text-[11px] text-slate-400 font-medium">{description}</p>
          </div>
        </div>
        <div className="text-center py-4">
          <CheckCircle2 size={32} className="text-emerald-300 mx-auto mb-2"/>
          <p className="text-xs font-bold text-slate-400">All clear!</p>
        </div>
      </div>
    );
  }

  return (
    <Link href={href} className={`group bg-white rounded-2xl border-2 ${c.border} ${c.hover} p-5 shadow-sm hover:shadow-lg transition-all cursor-pointer block`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`${iconBg} p-2.5 rounded-xl shrink-0`}>{icon}</div>
          <div className="min-w-0">
            <h3 className="font-black text-sm text-[#282860] truncate">{title}</h3>
            <p className="text-[11px] text-slate-500 font-medium">{description}</p>
          </div>
        </div>
        <span className={`${c.badge} px-2.5 py-1 rounded-lg text-xs font-black border shrink-0`}>{count}</span>
      </div>

      {heroValue && (
        <div className="mb-3">
          <p className="text-2xl font-black text-emerald-600">{heroValue}</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-1.5 mb-3 py-3 border-y border-slate-100">
          {items.map((it: any, i: number) => (
            <div key={i}>{renderItem(it)}</div>
          ))}
          {count > items.length && (
            <p className="text-[10px] text-slate-400 font-bold italic">+{count - items.length} more...</p>
          )}
        </div>
      )}

      <div className={`flex items-center justify-between ${c.cta} font-bold text-xs transition-colors`}>
        <span>{ctaLabel}</span>
        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform"/>
      </div>
    </Link>
  );
}

// =============================================================
// COMPACT METRIC CHIP
// =============================================================
function MetricChip({ icon, color, label, value, sublabel, trend }: any) {
  const colors: any = {
    purple: "bg-purple-50 text-purple-600",
    yellow: "bg-yellow-50 text-yellow-600",
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-2">
        <div className={`${colors[color]} p-2 rounded-lg`}>{icon}</div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      </div>
      <p className="text-2xl font-black text-[#282860] tracking-tight">{value}</p>
      <p className={`text-[11px] font-bold mt-1 ${trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-500' : 'text-slate-500'}`}>
        {sublabel}
      </p>
    </div>
  );
}