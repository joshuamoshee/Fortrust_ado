"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Archive, TrendingDown, AlertTriangle, DollarSign, Clock,
  Users, MapPin, BarChart3, Activity, Loader2, ShieldAlert,
  RefreshCcw, Eye, FileText, Calendar, Thermometer, Target,
  ArrowDown, ArrowUp, Filter, Search, ExternalLink, X
} from "lucide-react";

interface AnalyticsData {
  summary: {
    total_archived: number;
    total_active: number;
    total_completed: number;
    total_all_students: number;
    loss_rate_pct: number;
    avg_days_to_archive: number;
    estimated_lost_revenue: number;
    budgets_recorded: number;
  };
  reason_breakdown: Array<{ reason: string; count: number; percentage: number }>;
  by_country: Array<{ country: string; count: number }>;
  by_agent: Array<{ agent: string; count: number }>;
  monthly_trend: Array<{ month: string; label: string; count: number }>;
  by_temperature: Array<{ temperature: string; count: number }>;
  by_source: Array<{ source: string; count: number }>;
  revenue_by_country: Array<{ country: string; amount: number }>;
  high_value_losses: Array<any>;
  archived_students: Array<any>;
}

export default function ArchivedStudentsAnalytics() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [reasonFilter, setReasonFilter] = useState<string>("ALL");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  // Brand colors
  const NAVY = "#282860";
  const DARK_NAVY = "#1b1b42";
  const LIME = "#BAD133";

  // Distinct palette for charts
  const CHART_COLORS = [
    "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
    "#10b981", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6",
    "#ec4899", "#64748b"
  ];

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/archived-analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 403) {
        setError("Master Admin access required.");
        setLoading(false);
        return;
      }

      const json = await res.json();
      if (json.status === "success") {
        setData(json.data);
      } else {
        setError(json.detail || "Failed to load analytics.");
      }
    } catch (e) {
      setError("Network error. Could not load analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Filter archived students for the table
  const filteredStudents = useMemo(() => {
    if (!data) return [];
    return data.archived_students.filter(s => {
      const matchesSearch = !searchQuery ||
        (s.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.email || "").toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesReason = reasonFilter === "ALL" ||
        (() => {
          const rawReason = (s.archive_reason || "Not specified").trim();
          if (rawReason.toLowerCase().startsWith("other:")) return reasonFilter === "Other";
          return rawReason === reasonFilter;
        })();
      
      return matchesSearch && matchesReason;
    });
  }, [data, searchQuery, reasonFilter]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 size={40} className="animate-spin text-[#BAD133] mb-4" />
        <p className="text-sm text-slate-500 font-bold">Analyzing archived data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <ShieldAlert size={40} className="text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-black text-red-700">Cannot Load Analytics</h2>
          <p className="text-sm text-red-600 mt-2">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="mt-4 bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl text-sm font-bold transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary, reason_breakdown, by_country, by_agent, monthly_trend, by_temperature, by_source, revenue_by_country, high_value_losses } = data;

  // Calculate insights
  const topReason = reason_breakdown[0];
  const peakMonth = [...monthly_trend].sort((a, b) => b.count - a.count)[0];
  const recentTrend = monthly_trend.slice(-3).reduce((acc, m) => acc + m.count, 0);
  const previousTrend = monthly_trend.slice(-6, -3).reduce((acc, m) => acc + m.count, 0);
  const trendingDirection = recentTrend > previousTrend ? "up" : recentTrend < previousTrend ? "down" : "flat";
  const trendingPct = previousTrend > 0 ? Math.round(((recentTrend - previousTrend) / previousTrend) * 100) : 0;

  // Max values for chart scaling
  const maxMonthly = Math.max(...monthly_trend.map(m => m.count), 1);
  const maxReason = Math.max(...reason_breakdown.map(r => r.count), 1);
  const maxCountry = Math.max(...by_country.map(c => c.count), 1);
  const maxAgent = Math.max(...by_agent.map(a => a.count), 1);

  return (
    <div className="p-4 lg:p-8 max-w-[1600px] mx-auto w-full animate-in fade-in">
      
      {/* HEADER */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <button 
            onClick={() => router.back()} 
            className="text-xs font-bold text-slate-500 hover:text-[#282860] mb-2 flex items-center gap-1"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-black text-[#282860] flex items-center gap-3">
            <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
              <Archive className="text-red-500" size={28} />
            </div>
            Archived Students Analysis
          </h1>
          <p className="text-slate-500 mt-2 font-medium text-sm">
            Understand why students don't proceed — patterns, lost revenue, and actionable trends.
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="bg-white border border-slate-200 hover:bg-slate-50 text-[#282860] px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 transition-all"
        >
          <RefreshCcw size={14} /> Refresh
        </button>
      </div>

      {/* SUMMARY KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-red-600">Total Archived</p>
            <Archive size={16} className="text-red-400" />
          </div>
          <p className="text-3xl font-black text-red-700">{summary.total_archived}</p>
          <p className="text-[10px] text-red-500 font-bold mt-1">
            {summary.loss_rate_pct}% loss rate of resolved deals
          </p>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Lost Revenue (est.)</p>
            <DollarSign size={16} className="text-amber-400" />
          </div>
          <p className="text-3xl font-black text-[#282860]">
            ${(summary.estimated_lost_revenue / 1000).toFixed(0)}<span className="text-lg text-slate-400">K</span>
          </p>
          <p className="text-[10px] text-slate-500 font-bold mt-1">
            From {summary.budgets_recorded} budgets recorded
          </p>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Avg Time to Archive</p>
            <Clock size={16} className="text-blue-400" />
          </div>
          <p className="text-3xl font-black text-[#282860]">
            {summary.avg_days_to_archive}<span className="text-lg text-slate-400">d</span>
          </p>
          <p className="text-[10px] text-slate-500 font-bold mt-1">
            From lead creation to drop
          </p>
        </div>

        <div className={`p-6 rounded-2xl shadow-sm border ${
          trendingDirection === "up" 
            ? "bg-red-50 border-red-200" 
            : trendingDirection === "down" 
            ? "bg-emerald-50 border-emerald-200" 
            : "bg-slate-50 border-slate-200"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <p className={`text-[10px] font-black uppercase tracking-widest ${
              trendingDirection === "up" ? "text-red-600" : trendingDirection === "down" ? "text-emerald-600" : "text-slate-600"
            }`}>
              Recent Trend (90d)
            </p>
            {trendingDirection === "up" ? <ArrowUp size={16} className="text-red-500" /> 
             : trendingDirection === "down" ? <ArrowDown size={16} className="text-emerald-500" />
             : <Activity size={16} className="text-slate-400" />}
          </div>
          <p className={`text-3xl font-black ${
            trendingDirection === "up" ? "text-red-700" : trendingDirection === "down" ? "text-emerald-700" : "text-slate-700"
          }`}>
            {trendingDirection === "flat" ? "Stable" : `${trendingPct > 0 ? "+" : ""}${trendingPct}%`}
          </p>
          <p className={`text-[10px] font-bold mt-1 ${
            trendingDirection === "up" ? "text-red-500" : trendingDirection === "down" ? "text-emerald-500" : "text-slate-500"
          }`}>
            {trendingDirection === "up" ? "Losses increasing" : trendingDirection === "down" ? "Losses decreasing" : "No major change"}
          </p>
        </div>
      </div>

      {/* KEY INSIGHTS BANNER */}
      {topReason && (
        <div className="bg-[#1b1b42] text-white rounded-2xl p-6 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#BAD133] rounded-full blur-[80px] opacity-10 pointer-events-none"></div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#BAD133] mb-2">Key Insight</p>
            <div className="flex flex-wrap items-baseline gap-2">
              <p className="text-2xl font-black">
                {topReason.percentage}%
              </p>
              <p className="text-base">
                of archived students were lost due to <strong className="text-[#BAD133]">{topReason.reason}</strong>
                {peakMonth && peakMonth.count > 0 && (
                  <>, with the highest concentration in <strong className="text-[#BAD133]">{peakMonth.label}</strong> ({peakMonth.count} losses)</>
                )}.
              </p>
            </div>
            <p className="text-xs text-slate-400 mt-3">
              💡 Recommendation: {
                topReason.reason.toLowerCase().includes("financial") 
                  ? "Consider offering more scholarship matches or partial-payment plans for hot leads early."
                  : topReason.reason.toLowerCase().includes("unresponsive")
                  ? "Tighten the follow-up SLA — most unresponsive leads drop within the first 14 days. Set automated nudges."
                  : topReason.reason.toLowerCase().includes("changed mind")
                  ? "Audit the consultation funnel. Are we qualifying intent strongly enough at first contact?"
                  : topReason.reason.toLowerCase().includes("other agent")
                  ? "Investigate competitive positioning. What are other agencies offering that we aren't?"
                  : "Investigate root causes by interviewing the top 5 archived students from this category."
              }
            </p>
          </div>
        </div>
      )}

      {/* === CHARTS GRID === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        {/* REASON BREAKDOWN */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-black text-[#282860] uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-500" /> Loss Reasons
              </h3>
              <p className="text-xs text-slate-400 mt-1">Why students were archived</p>
            </div>
          </div>
          <div className="space-y-3">
            {reason_breakdown.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">No data yet.</p>
            ) : reason_breakdown.map((r, idx) => (
              <div key={r.reason}>
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className="text-sm font-bold text-[#282860] truncate pr-2">{r.reason}</span>
                  <span className="text-xs font-bold text-slate-600 shrink-0">{r.count} <span className="text-slate-400">({r.percentage}%)</span></span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-2 rounded-full transition-all duration-700"
                    style={{ 
                      width: `${(r.count / maxReason) * 100}%`,
                      backgroundColor: CHART_COLORS[idx % CHART_COLORS.length]
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* MONTHLY TREND */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-black text-[#282860] uppercase tracking-widest flex items-center gap-2">
                <BarChart3 size={16} className="text-blue-500" /> Monthly Trend
              </h3>
              <p className="text-xs text-slate-400 mt-1">Archives per month (last 12)</p>
            </div>
          </div>
          <div className="flex items-end gap-1.5 h-48 px-2">
            {monthly_trend.map((m, idx) => {
              const heightPct = maxMonthly > 0 ? (m.count / maxMonthly) * 100 : 0;
              const isRecent = idx >= monthly_trend.length - 3;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                  <div className="absolute -top-7 bg-[#282860] text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {m.count} archived
                  </div>
                  <div 
                    className={`w-full rounded-t-md transition-all duration-500 ${
                      isRecent ? "bg-red-500 hover:bg-red-600" : "bg-slate-300 hover:bg-slate-400"
                    }`}
                    style={{ height: `${Math.max(heightPct, m.count > 0 ? 4 : 0)}%`, minHeight: m.count > 0 ? "4px" : "0" }}
                  ></div>
                </div>
              );
            })}
          </div>
          <div className="flex items-end gap-1.5 mt-2 px-2">
            {monthly_trend.map(m => (
              <div key={m.month} className="flex-1 text-center">
                <p className="text-[9px] font-bold text-slate-400 truncate">{m.label.split(' ')[0]}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 text-center mt-2 font-medium">
            <span className="inline-block w-2 h-2 bg-red-500 rounded mr-1"></span> Last 3 months
            <span className="inline-block w-2 h-2 bg-slate-300 rounded ml-3 mr-1"></span> Older
          </p>
        </div>

        {/* BY COUNTRY */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-black text-[#282860] uppercase tracking-widest flex items-center gap-2">
                <MapPin size={16} className="text-amber-500" /> By Target Country
              </h3>
              <p className="text-xs text-slate-400 mt-1">Where they wanted to study</p>
            </div>
          </div>
          <div className="space-y-2.5">
            {by_country.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">No data yet.</p>
            ) : by_country.slice(0, 8).map((c, idx) => (
              <div key={c.country} className="flex items-center gap-3">
                <span className="text-sm font-bold text-[#282860] w-32 truncate" title={c.country}>
                  {c.country === "Unknown" ? <em className="text-slate-400">Not specified</em> : c.country}
                </span>
                <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-2 rounded-full transition-all duration-700"
                    style={{ 
                      width: `${(c.count / maxCountry) * 100}%`,
                      backgroundColor: CHART_COLORS[idx % CHART_COLORS.length]
                    }}
                  ></div>
                </div>
                <span className="text-xs font-black text-slate-600 w-8 text-right">{c.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* BY AGENT */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-black text-[#282860] uppercase tracking-widest flex items-center gap-2">
                <Users size={16} className="text-purple-500" /> By Primary Agent
              </h3>
              <p className="text-xs text-slate-400 mt-1">Which agent was handling them</p>
            </div>
          </div>
          <div className="space-y-2.5">
            {by_agent.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">No data yet.</p>
            ) : by_agent.slice(0, 8).map((a, idx) => (
              <div key={a.agent} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-xs shrink-0`} 
                  style={{ backgroundColor: a.agent === "Unassigned" ? "#94a3b8" : CHART_COLORS[idx % CHART_COLORS.length] }}>
                  {a.agent === "Unassigned" ? "?" : a.agent.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-bold text-[#282860] truncate flex-1" title={a.agent}>
                  {a.agent === "Unassigned" ? <em className="text-slate-400">Unassigned</em> : a.agent}
                </span>
                <span className="text-xs font-black bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{a.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* TEMPERATURE */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-black text-[#282860] uppercase tracking-widest flex items-center gap-2 mb-5">
            <Thermometer size={16} className="text-orange-500" /> Lead Temperature at Loss
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {["Hot Leads", "Warm Leads", "Cold Leads"].map(temp => {
              const t = by_temperature.find(x => x.temperature === temp);
              const count = t?.count || 0;
              const total = by_temperature.reduce((acc, x) => acc + x.count, 0);
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={temp} className={`p-4 rounded-xl text-center border ${
                  temp === "Hot Leads" ? "bg-red-50 border-red-200" :
                  temp === "Warm Leads" ? "bg-amber-50 border-amber-200" :
                  "bg-blue-50 border-blue-200"
                }`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                    temp === "Hot Leads" ? "text-red-600" :
                    temp === "Warm Leads" ? "text-amber-600" :
                    "text-blue-600"
                  }`}>{temp}</p>
                  <p className={`text-2xl font-black ${
                    temp === "Hot Leads" ? "text-red-700" :
                    temp === "Warm Leads" ? "text-amber-700" :
                    "text-blue-700"
                  }`}>{count}</p>
                  <p className="text-[10px] font-bold text-slate-500 mt-0.5">{pct}%</p>
                </div>
              );
            })}
          </div>
          {by_temperature.find(x => x.temperature === "Hot Leads")?.count && (by_temperature.find(x => x.temperature === "Hot Leads")?.count || 0) > 0 && (
            <p className="text-xs text-red-600 font-bold mt-4 bg-red-50 p-3 rounded-lg border border-red-100">
              ⚠️ Losing hot leads — investigate why high-intent leads aren't closing.
            </p>
          )}
        </div>

        {/* LEAD SOURCE */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-black text-[#282860] uppercase tracking-widest flex items-center gap-2 mb-5">
            <Target size={16} className="text-emerald-500" /> Where Losses Originated
          </h3>
          {by_source.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-8">No source data recorded.</p>
          ) : (
            <div className="space-y-2">
              {by_source.slice(0, 6).map((s, idx) => (
                <div key={s.source} className="flex items-center justify-between bg-slate-50 hover:bg-slate-100 p-3 rounded-xl border border-slate-100 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-xs shrink-0"
                      style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}>
                      {idx + 1}
                    </div>
                    <span className="text-sm font-bold text-[#282860] truncate" title={s.source}>
                      {s.source === "Unknown" ? <em className="text-slate-400">Not tracked</em> : s.source}
                    </span>
                  </div>
                  <span className="text-xs font-black bg-white text-slate-700 px-2 py-1 rounded-md border border-slate-200">{s.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* REVENUE BY COUNTRY */}
      {revenue_by_country.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 mb-6 shadow-sm">
          <h3 className="text-sm font-black text-amber-700 uppercase tracking-widest flex items-center gap-2 mb-5">
            <DollarSign size={16} /> Estimated Lost Revenue by Destination
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {revenue_by_country.slice(0, 5).map((r, idx) => (
              <div key={r.country} className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 truncate">{r.country === "Unknown" ? "Not specified" : r.country}</p>
                <p className="text-xl font-black text-[#282860] mt-1">
                  ${(r.amount / 1000).toFixed(0)}<span className="text-sm text-slate-400">K</span>
                </p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-amber-600 mt-3 font-bold">
            *Based on per-year budget midpoints. Actual lifetime value may be higher.
          </p>
        </div>
      )}

      {/* HIGH VALUE LOSSES */}
      {high_value_losses.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-sm">
          <h3 className="text-sm font-black text-[#282860] uppercase tracking-widest flex items-center gap-2 mb-5">
            <TrendingDown size={16} className="text-red-500" /> Top 10 High-Value Losses
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-[10px] font-black text-slate-400 tracking-widest uppercase">
                <tr>
                  <th className="py-3 pr-4">#</th>
                  <th className="py-3 pr-4">Student</th>
                  <th className="py-3 pr-4">Budget</th>
                  <th className="py-3 pr-4">Country</th>
                  <th className="py-3">Loss Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {high_value_losses.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedStudent(s)}>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex w-6 h-6 rounded-full items-center justify-center text-[10px] font-black ${
                        idx < 3 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"
                      }`}>{idx + 1}</span>
                    </td>
                    <td className="py-3 pr-4 font-bold text-[#282860]">{s.name}</td>
                    <td className="py-3 pr-4 font-bold text-amber-600">{s.budget_raw || "—"}</td>
                    <td className="py-3 pr-4 text-slate-600">{s.country_interest || <em className="text-slate-400">—</em>}</td>
                    <td className="py-3 text-xs text-slate-600 truncate max-w-[200px]" title={s.archive_reason}>{s.archive_reason || <em className="text-slate-400">Not specified</em>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FULL ARCHIVED STUDENT TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-3 justify-between items-center">
          <div>
            <h3 className="text-sm font-black text-[#282860] uppercase tracking-widest flex items-center gap-2">
              <Archive size={16} className="text-red-500"/> All Archived Students
              <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-md text-[10px]">{filteredStudents.length}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">Click any row to see full details</p>
          </div>
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <div className="flex items-center bg-white px-3 py-2 rounded-xl border border-slate-200 w-full md:w-64">
              <Search size={14} className="text-slate-400 mr-2"/>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-full font-medium"
              />
            </div>
            <select 
              value={reasonFilter} 
              onChange={e => setReasonFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-red-400 cursor-pointer"
            >
              <option value="ALL">All Reasons</option>
              {reason_breakdown.map(r => <option key={r.reason} value={r.reason}>{r.reason}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 tracking-widest uppercase">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Budget</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Archived</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredStudents.length === 0 ? (
                <tr><td colSpan={6} className="p-12 text-center text-slate-400 font-medium">No archived students match your filters.</td></tr>
              ) : filteredStudents.map(s => {
                let assigneesArr: string[] = [];
                if (Array.isArray(s.assignees)) assigneesArr = s.assignees;
                else if (typeof s.assignees === "string") {
                  try { assigneesArr = JSON.parse(s.assignees) || []; } catch {}
                }
                const primary = assigneesArr[0] || s.assignee || "Unassigned";
                
                return (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedStudent(s)}>
                    <td className="px-4 py-3">
                      <p className="font-bold text-[#282860]">{s.name}</p>
                      <p className="text-[10px] text-slate-400">{s.email || "No email"}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.country_interest || <em className="text-slate-400">—</em>}</td>
                    <td className="px-4 py-3 font-bold text-slate-600">{s.budget || <em className="text-slate-400 font-normal">—</em>}</td>
                    <td className="px-4 py-3 text-slate-600">{primary}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className="bg-red-50 text-red-700 px-2 py-1 rounded-md border border-red-100 font-bold text-[10px]">
                        {s.archive_reason ? (s.archive_reason.toLowerCase().startsWith("other:") ? "Other" : s.archive_reason) : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[10px] text-slate-400 font-bold">
                      {s.updated_at ? new Date(s.updated_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* STUDENT DETAIL MODAL */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-red-100 bg-red-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                  <Archive size={22} className="text-red-600"/>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-600">Archived Student</p>
                  <h3 className="text-xl font-black text-[#282860]">{selectedStudent.name}</h3>
                </div>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                <X size={20}/>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email</p>
                  <p className="text-sm font-bold text-slate-700 truncate">{selectedStudent.email || "—"}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Phone</p>
                  <p className="text-sm font-bold text-slate-700">{selectedStudent.phone || "—"}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Country</p>
                  <p className="text-sm font-bold text-slate-700">{selectedStudent.country_interest || "—"}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Budget</p>
                  <p className="text-sm font-bold text-amber-600">{selectedStudent.budget || selectedStudent.budget_raw || "—"}</p>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-1">Reason for Archive</p>
                <p className="text-sm font-bold text-red-700">{selectedStudent.archive_reason || "Not specified"}</p>
              </div>
              <button 
                onClick={() => router.push(`/dashboard/students?id=${selectedStudent.id}`)}
                className="w-full bg-[#282860] hover:bg-[#1b1b42] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
              >
                <ExternalLink size={14}/> Open Full Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}