"use client";

import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users, Target, FileText, DollarSign, ChevronDown, X, TrendingUp, Medal, Building2, CheckCircle2 } from "lucide-react";

const STATUS_OPTIONS = ["NEW LEAD", "QUALIFIED LEADS", "CONSULTING PROCESS", "UNI APPLICATION", "VISA", "COMPLETED"];
const BRANCH_OPTIONS = ["Jakarta", "Surabaya", "Bandung", "Bali", "Medan", "Headquarters"];

const EXCHANGE_RATES: Record<string, number> = {
  "USD": 1.0, "AUD": 0.65, "GBP": 1.26, "NZD": 0.60, "CAD": 0.73, "EUR": 1.08, "IDR": 0.000063
};

export default function MasterAdminDashboard() {
  const [students, setStudents] = useState<any[]>([]);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null); 
  const [loading, setLoading] = useState(true);
  
  const [timeframe, setTimeframe] = useState("all"); 
  
  // Cleaned Tabs - Removed 'team'
  const [activeTab, setActiveTab] = useState<"pipeline" | "audit">("pipeline");
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Commission Modal State
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);
  const [closingStudent, setClosingStudent] = useState<any>(null);
  const [tuitionAmount, setTuitionAmount] = useState("");
  const [commissionPercent, setCommissionPercent] = useState("10"); 
  const [dealCurrency, setDealCurrency] = useState("AUD");

  const fetchData = async () => {
    const token = localStorage.getItem("fortrust_token");
    const headers = { "Authorization": `Bearer ${token}` };

    try {
      const [studentsRes, usersRes, auditRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline?role=MASTER_ADMIN`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/audit-logs`, { headers }) 
      ]);
      const studentsData = await studentsRes.json();
      const usersData = await usersRes.json();
      const auditData = await auditRes.json(); 
      
      if (studentsData.status === "success") setStudents(studentsData.data);
      if (usersData.status === "success") setSystemUsers(usersData.data);
      if (auditData.status === "success") setAuditLogs(auditData.data); 
    } catch (error) {
      console.error("Failed to fetch initial data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem("fortrust_token");
      try {
        const statsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/dashboard-stats?timeframe=${timeframe}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const statsData = await statsRes.json();
        if (statsData.status === "success") setStats(statsData.data);
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      }
    };
    fetchStats();
  }, [timeframe]);

  useEffect(() => { fetchData(); }, []);

  const handleStatusChange = (student: any, newStatus: string) => {
    if (newStatus === "COMPLETED") {
      setClosingStudent(student);
      setIsCommissionModalOpen(true);
    } else {
      executeLeadUpdate(student.id, newStatus, student.assignee, 0, 0, "USD");
    }
  };

  const executeLeadUpdate = async (caseId: string, status: string, assignedTo: string, tuition: number, commRate: number, currency: string) => {
    try {
      const token = localStorage.getItem("fortrust_token");
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline/${caseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ status, assignee: assignedTo, tuition, commission_rate: commRate, currency }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        alert(`Server Error: ${errorData.detail || "Failed to update"}`);
        return;
      }
      fetchData(); 
    } catch (error) {
      alert("Network Error: Could not reach the backend.");
    }
  };

  const handleCloseDeal = () => {
    if (closingStudent) {
      executeLeadUpdate(closingStudent.id, "COMPLETED", closingStudent.assignee, parseFloat(tuitionAmount), parseFloat(commissionPercent), dealCurrency);
      setIsCommissionModalOpen(false);
      setClosingStudent(null);
      setTuitionAmount("");
    }
  };

  const handleAssignAgent = (studentId: string, currentStatus: string, newAgent: string) => {
    executeLeadUpdate(studentId, currentStatus, newAgent, 0, 0, "USD");
  };

  const chartData = useMemo(() => {
    const branchCounts: Record<string, number> = {};
    BRANCH_OPTIONS.forEach(b => branchCounts[b] = 0);
    students.forEach(student => {
      const agent = systemUsers.find(u => u.name === student.assignee);
      const branchName = agent ? agent.branch : "Unassigned";
      if (branchCounts[branchName] !== undefined) branchCounts[branchName] += 1;
      else branchCounts[branchName] = 1;
    });
    return Object.keys(branchCounts).map(branch => ({ name: branch, students: branchCounts[branch] })).sort((a, b) => b.students - a.students);
  }, [students, systemUsers]);

  const totalStudents = students.length; 
  const qualifiedLeads = students.filter(s => s.status?.toUpperCase() === "QUALIFIED LEADS").length;
  const activeApps = students.filter(s => s.status?.toUpperCase() === "UNI APPLICATION").length;
  
  const totalCommissionUSD = students.reduce((sum, student) => {
    const earned = student.commission_earned || 0;
    const curr = student.currency || "USD";
    const rate = EXCHANGE_RATES[curr] || 1.0;
    return sum + (earned * rate);
  }, 0);

  if (loading) return <div className="p-16 text-center text-slate-400 font-medium animate-pulse">Syncing Master Dashboard...</div>;

  return (
    <div className="p-8 max-w-[1400px] mx-auto w-full">
      
      {/* HEADER & TABS */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-[#282860] flex items-center gap-3">
            <Medal className="text-[#BAD133]" size={36} />
            Master Dashboard
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Global operations overview and branch performance.</p>
        </div>
        
        <div className="flex gap-4">
          <select 
            className="bg-white border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm focus:outline-none focus:border-[#282860]"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
          >
            <option value="all">All Time History</option>
            <option value="this_year">This Year (2026)</option>
            <option value="30days">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* TAB SWITCHER */}
      <div className="flex gap-8 border-b border-slate-200 mb-8">
        <button 
          onClick={() => setActiveTab('pipeline')} 
          className={`pb-3 font-bold text-sm tracking-wider uppercase transition-colors ${activeTab === 'pipeline' ? 'text-[#282860] border-b-2 border-[#282860]' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Global Pipeline
        </button>
        <button 
          onClick={() => setActiveTab('audit')} 
          className={`pb-3 font-bold text-sm tracking-wider uppercase transition-colors ${activeTab === 'audit' ? 'text-[#282860] border-b-2 border-[#282860]' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Activity Feed
        </button>
      </div>

      {/* KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5">
          <div className="h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center"><Users className="text-blue-600" size={24} /></div>
          <div><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Pipeline</p><p className="text-3xl font-black text-[#282860] mt-1">{totalStudents}</p></div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5">
          <div className="h-14 w-14 rounded-full bg-amber-50 flex items-center justify-center"><Target className="text-amber-500" size={24} /></div>
          <div><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Qualified Leads</p><p className="text-3xl font-black text-[#282860] mt-1">{qualifiedLeads}</p></div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5">
          <div className="h-14 w-14 rounded-full bg-purple-50 flex items-center justify-center"><FileText className="text-purple-600" size={24} /></div>
          <div><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Apps</p><p className="text-3xl font-black text-[#282860] mt-1">{activeApps}</p></div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center relative z-10"><DollarSign className="text-green-600" size={24} /></div>
          <div className="relative z-10"><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Est. Commission</p><p className="text-2xl font-black text-green-600 mt-1">${totalCommissionUSD.toLocaleString()}</p></div>
        </div>
      </div>

      {/* --- PIPELINE TAB CONTENT --- */}
      {activeTab === 'pipeline' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2"><Building2 size={18} className="text-slate-400" /> Pipeline Volume by Branch</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="students" fill="#282860" radius={[6, 6, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2"><TrendingUp size={18} className="text-slate-400" /> Top Performers</h3>
              {stats?.performance?.top_agents_volume?.length > 0 ? (
                <div className="space-y-4">
                  {stats.performance.top_agents_volume.map((agent: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-slate-200 text-slate-700' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-[#f8fafc] text-slate-500'}`}>
                          #{idx + 1}
                        </div>
                        <span className="font-bold text-slate-700 text-sm">{agent.name}</span>
                      </div>
                      <span className="font-black text-[#282860] bg-slate-100 px-3 py-1 rounded-lg text-xs">{agent.value} cases</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-10">Not enough data to rank agents yet.</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50"><h3 className="font-bold text-slate-900">Global Master Pipeline</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 tracking-wider uppercase">
                  <tr>
                    <th className="px-5 py-4">Student</th>
                    <th className="px-5 py-4">Assigned Agent</th>
                    <th className="px-5 py-4">Global Status</th>
                    <th className="px-5 py-4 text-right">Commission Logged</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {students.map((s) => {
                    const agent = systemUsers.find((u) => u.name === s.assignee);
                    const branchName = agent ? agent.branch : "Unknown";
                    return (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4"><span className="font-bold text-[#282860] block">{s.name}</span><span className="text-[11px] text-slate-400 block mt-0.5">{s.email}</span></td>
                        <td className="px-5 py-4">
                          <select className="bg-white border border-slate-200 text-slate-700 rounded-lg px-2 py-1 text-xs font-bold focus:border-[#282860] outline-none"
                            value={s.assignee || "Unassigned"} onChange={(e) => handleAssignAgent(s.id, s.status, e.target.value)}>
                            <option value="Unassigned">Unassigned</option>
                            {systemUsers.map(u => <option key={u.id} value={u.name}>{u.name} ({u.branch})</option>)}
                          </select>
                        </td>
                        <td className="px-5 py-4">
                          <div className="relative inline-block w-40">
                            <select className="appearance-none w-full bg-slate-100 border-none text-slate-700 py-1.5 pl-3 pr-8 rounded-lg text-[10px] font-black tracking-wider uppercase focus:ring-2 focus:ring-[#BAD133]"
                              value={s.status || "NEW LEAD"} onChange={(e) => handleStatusChange(s, e.target.value)}>
                              {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          {s.commission_earned > 0 ? (
                            <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-2.5 py-1 rounded-md text-xs font-bold border border-green-100">
                              <CheckCircle2 size={12} /> {s.commission_earned} {s.currency || "USD"}
                            </span>
                          ) : <span className="text-xs text-slate-400 font-medium">-</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- AUDIT LOG TAB --- */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-[#f8fafc] flex justify-between items-center">
            <h2 className="text-xl font-bold text-[#282860]">System Activity Feed</h2>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">LIVE CCTV</p>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-[#f1f5f9] text-[#64748b] text-[10px] uppercase tracking-widest">
                <tr>
                  <th className="px-5 py-4">Time</th>
                  <th className="px-5 py-4">Agent Name</th>
                  <th className="px-5 py-4">Action</th>
                  <th className="px-5 py-4">Target Entity</th>
                  <th className="px-5 py-4">Details</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {auditLogs.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-slate-500">No activity recorded yet.</td></tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4 text-xs font-bold text-slate-500">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-5 py-4 font-bold text-[#282860]">{log.changed_by}</td>
                      <td className="px-5 py-4">
                        <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md text-[10px] font-bold">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-600">{log.entity} <span className="text-slate-400">({log.entity_id})</span></td>
                      <td className="px-5 py-4 text-xs text-slate-500 max-w-xs truncate" title={JSON.stringify(log.details)}>
                        {JSON.stringify(log.details)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}