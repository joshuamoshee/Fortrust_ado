"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users, Target, FileText, DollarSign, ChevronDown, X, PartyPopper, TrendingUp, Medal, Building2, Filter, Trash2, Edit2, CheckCircle2 } from "lucide-react";

const STATUS_OPTIONS = ["NEW LEAD", "QUALIFIED LEADS", "CONSULTING PROCESS", "UNI APPLICATION", "VISA", "COMPLETED"];
const BRANCH_OPTIONS = ["Jakarta", "Surabaya", "Bandung", "Bali", "Medan", "Headquarters"];

// Standard Exchange Rates
const EXCHANGE_RATES: Record<string, number> = {
  "USD": 1.0,
  "AUD": 0.65,
  "GBP": 1.26,
  "NZD": 0.60,
  "CAD": 0.73,
  "EUR": 1.08,
  "IDR": 0.000063
};

export default function MasterAdminDashboard() {
  const [students, setStudents] = useState<any[]>([]);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null); 
  const [loading, setLoading] = useState(true);
  
  const [timeframe, setTimeframe] = useState("all"); 
  
  // NEW: UI Tab Switcher & Notifications
  const [activeTab, setActiveTab] = useState<"pipeline" | "team" | "audit">("pipeline");
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [notification, setNotification] = useState<{type: 'success'|'error', message: string} | null>(null);

  // User Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("Micro Agent");
  const [newUserBranch, setNewUserBranch] = useState("Jakarta");
  const [isSavingUser, setIsSavingUser] = useState(false);

  // NEW: Edit User State
  const [editingUser, setEditingUser] = useState<any>(null);

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
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/audit-logs`, { headers }) // NEW: Fetch Logs
      ]);
      const studentsData = await studentsRes.json();
      const usersData = await usersRes.json();
      const auditData = await auditRes.json(); // NEW: Parse Logs
      
      if (studentsData.status === "success") setStudents(studentsData.data);
      if (usersData.status === "success") setSystemUsers(usersData.data);
      if (auditData.status === "success") setAuditLogs(auditData.data); // NEW: Save Logs
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
      executeLeadUpdate(student.id, newStatus, student.assigned_to, 0, 0, "USD");
    }
  };

  const executeLeadUpdate = async (caseId: string, status: string, assignedTo: string, tuition: number, commRate: number, currency: string) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline/${caseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, assigned_to: assignedTo, tuition, commission_rate: commRate, currency }),
      });
      fetchData(); 
    } catch (error) {
      console.error("Update failed:", error);
    }
  };

  const handleCloseDeal = () => {
    if (closingStudent) {
      executeLeadUpdate(closingStudent.id, "COMPLETED", closingStudent.assigned_to, parseFloat(tuitionAmount), parseFloat(commissionPercent), dealCurrency);
      setIsCommissionModalOpen(false);
      setClosingStudent(null);
      setTuitionAmount("");
    }
  };

  const handleAssignAgent = (studentId: string, currentStatus: string, newAgent: string) => {
    executeLeadUpdate(studentId, currentStatus, newAgent, 0, 0, "USD");
  };

  // UX UPGRADE: Added Success/Error Notifications
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingUser(true);
    setNotification(null);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newUserName, email: newUserEmail, password: newUserPassword, role: newUserRole, branch: newUserBranch }),
      });
      const data = await response.json();
      
      if (response.ok) {
        setNotification({type: 'success', message: '✅ Agent account created securely!'});
        fetchData(); 
        setTimeout(() => { 
          setIsUserModalOpen(false); 
          setNewUserName(""); setNewUserEmail(""); setNewUserPassword(""); 
          setNotification(null); 
        }, 1500);
      } else {
        setNotification({type: 'error', message: `❌ ${data.detail || "Failed to create user."}`});
      }
    } catch (err) {
       setNotification({type: 'error', message: '❌ Network error.'});
    } finally {
      setIsSavingUser(false);
    }
  };

  // NEW: Update existing user (Bank Details, Freeze Status, Role, etc)
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${editingUser.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: editingUser.name, 
          role: editingUser.role, 
          office_address: editingUser.office_address,
          bank_name: editingUser.bank_name,
          bank_branch: editingUser.bank_branch,
          bank_address: editingUser.bank_address,
          bank_account: editingUser.bank_account,
          swift_code: editingUser.swift_code,
          is_active: editingUser.is_active
        }),
      });
      if (response.ok) {
        setNotification({type: 'success', message: '✅ Profile & Bank Details updated!'});
        fetchData();
        setTimeout(() => { setEditingUser(null); setNotification(null); }, 1500);
      } else {
        setNotification({type: 'error', message: '❌ Failed to update. Check backend.'});
      }
    } catch (err) { setNotification({type: 'error', message: '❌ Network error.'}); }
  };

  // NEW: Delete User
  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this agent?")) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${userId}`, { method: "DELETE" });
      fetchData();
    } catch (err) { alert("Failed to delete user"); }
  };

  const chartData = useMemo(() => {
    const branchCounts: Record<string, number> = {};
    BRANCH_OPTIONS.forEach(b => branchCounts[b] = 0);
    students.forEach(student => {
      const agent = systemUsers.find(u => u.name === student.assigned_to);
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
      {/* 1. NOTIFICATIONS */}
      {notification && (
        <div className={`mb-6 p-4 rounded-xl font-bold flex items-center justify-between shadow-sm animate-in slide-in-from-top-2
          ${notification.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {notification.message}
          <button onClick={() => setNotification(null)} className="opacity-50 hover:opacity-100"><X size={18} /></button>
        </div>
      )}

      {/* 2. HEADER & TABS */}
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
          <button onClick={() => setIsUserModalOpen(true)} className="bg-[#282860] hover:bg-[#1b1b42] text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-md flex items-center gap-2">
            <Users size={16} /> Add Agent
          </button>
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
          onClick={() => setActiveTab('team')} 
          className={`pb-3 font-bold text-sm tracking-wider uppercase transition-colors ${activeTab === 'team' ? 'text-[#282860] border-b-2 border-[#282860]' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Team Directory
        </button>
        <button 
          onClick={() => setActiveTab('audit')} 
          className={`pb-3 font-bold text-sm tracking-wider uppercase transition-colors ${activeTab === 'audit' ? 'text-[#282860] border-b-2 border-[#282860]' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Activity Feed
        </button>
      </div>

      {/* 3. KPIS */}
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
              <table className="w-full text-left border-collapse">
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
                    const agent = systemUsers.find((u) => u.name === s.assigned_to);
                    const branchName = agent ? agent.branch : "Unknown";
                    return (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4"><span className="font-bold text-[#282860] block">{s.name}</span><span className="text-[11px] text-slate-400 block mt-0.5">{s.email}</span></td>
                        <td className="px-5 py-4">
                          <select className="bg-white border border-slate-200 text-slate-700 rounded-lg px-2 py-1 text-xs font-bold focus:border-[#282860] outline-none"
                            value={s.assigned_to || "Unassigned"} onChange={(e) => handleAssignAgent(s.id, s.status, e.target.value)}>
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

      {/* --- TEAM DIRECTORY TAB CONTENT --- */}
      {activeTab === 'team' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50"><h3 className="font-bold text-slate-900">Fortrust Staff & Agents</h3></div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 z-10 shadow-sm">
                <tr className="border-b border-slate-200 text-[10px] font-black text-slate-500 tracking-wider uppercase">
                  <th className="px-5 py-4">Name & Email</th>
                  <th className="px-5 py-4">Role</th>
                  <th className="px-5 py-4">Branch</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {systemUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4"><span className="font-bold text-[#282860] block">{u.name}</span><span className="text-[11px] text-slate-500 block mt-0.5">{u.email}</span></td>
                    <td className="px-5 py-4">
                      <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md text-[10px] font-bold mr-2">{u.role}</span>
                      {u.is_active === false && <span className="bg-red-100 text-red-700 px-2 py-1 rounded-md text-[10px] font-bold">FROZEN</span>}
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-600 text-xs">{u.branch}</td>
                    <td className="px-5 py-4 flex justify-end gap-3">
                      <button onClick={() => setEditingUser(u)} className="text-blue-500 hover:text-blue-700 transition-colors" title="Edit Profile & Bank"><Edit2 size={16} /></button>
                      <button onClick={() => handleDeleteUser(u.id)} className="text-red-400 hover:text-red-600 transition-colors" title="Delete Agent"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            <table className="w-full text-left">
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

      {/* --- ADD NEW AGENT MODAL --- */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-[#f8fafc]">
              <h2 className="text-xl font-bold text-[#282860] flex items-center gap-2"><Users size={20} className="text-[#BAD133]" /> Create New Agent</h2>
              <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div><label className="text-xs font-bold text-slate-700">Full Name</label><input type="text" required className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm" value={newUserName} onChange={e => setNewUserName(e.target.value)} /></div>
              <div><label className="text-xs font-bold text-slate-700">Email Address</label><input type="email" required className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} /></div>
              <div><label className="text-xs font-bold text-slate-700">Temporary Password</label><input type="text" required className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700">System Role</label>
                  <select className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm" value={newUserRole} onChange={e => setNewUserRole(e.target.value)}>
                    <option value="Agent">Agent</option><option value="Corporate Agent">Corporate Agent</option><option value="Micro Agent">Micro Agent</option><option value="MASTER_ADMIN">Master Admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Branch</label>
                  <select className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm" value={newUserBranch} onChange={e => setNewUserBranch(e.target.value)}>
                    {BRANCH_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3"><button type="button" onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold text-sm">Cancel</button><button type="submit" disabled={isSavingUser} className="bg-[#282860] text-white px-6 py-2 rounded-lg text-sm font-bold disabled:opacity-50">{isSavingUser ? "Saving..." : "Create Account"}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT AGENT / BANK DETAILS MODAL --- */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-[#f8fafc]">
              <div>
                <h2 className="text-xl font-bold text-[#282860] flex items-center gap-2">
                  <Edit2 size={20} className="text-[#BAD133]" />
                  Agent Profile Summary
                </h2>
                <p className="text-xs text-slate-500 mt-1">{editingUser.email}</p>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <form id="edit-user-form" onSubmit={handleEditUser} className="space-y-8">
                
                {/* 1. Account Settings */}
                <div>
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Users size={14} /> 1. Account & Security
                  </h3>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <label className="text-xs font-bold text-slate-700">Account Name</label>
                      <input type="text" className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" 
                             value={editingUser.name || ""} onChange={e => setEditingUser({...editingUser, name: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700">System Role</label>
                      <select className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                              value={editingUser.role || "Agent"} onChange={e => setEditingUser({...editingUser, role: e.target.value})}>
                        <option value="Agent">Agent</option>
                        <option value="Corporate Agent">Corporate Agent</option>
                        <option value="Micro Agent">Micro Agent</option>
                        <option value="MASTER_ADMIN">Master Admin</option>
                      </select>
                    </div>
                    <div className="col-span-2 mt-2">
                      <label className="text-xs font-bold text-slate-700">Emergency Access Control (Freeze)</label>
                      <select className="w-full mt-1.5 px-3 py-2 border-2 border-red-100 rounded-lg text-sm font-bold focus:border-red-300"
                              value={editingUser.is_active === false ? "false" : "true"} 
                              onChange={e => setEditingUser({...editingUser, is_active: e.target.value === "true"})}>
                        <option value="true" className="text-green-600">✅ ACTIVE (Agent can login & manage students)</option>
                        <option value="false" className="text-red-600">❄️ FROZEN (Agent is completely blocked from system)</option>
                      </select>
                      <p className="text-[10px] text-slate-400 mt-1">Freezing an account protects their student data without deleting it.</p>
                    </div>
                  </div>
                </div>

                {/* 2. Corporate & Office */}
                <div>
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Building2 size={14} /> 2. Corporate Details
                  </h3>
                  <div className="grid grid-cols-1 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <label className="text-xs font-bold text-slate-700">Office Address (Optional)</label>
                      <textarea className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" rows={2}
                             value={editingUser.office_address || ""} onChange={e => setEditingUser({...editingUser, office_address: e.target.value})}></textarea>
                    </div>
                  </div>
                </div>

                {/* 3. Commission Bank Transfer Details */}
                <div>
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <DollarSign size={14} className="text-[#BAD133]" /> 3. Commission Transfer Registration
                  </h3>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <label className="text-xs font-bold text-slate-700">Bank Name</label>
                      <input type="text" placeholder="e.g. BANK OCBC" className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" 
                             value={editingUser.bank_name || ""} onChange={e => setEditingUser({...editingUser, bank_name: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700">Account Number</label>
                      <input type="text" placeholder="e.g. 123-456-789010" className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white font-mono" 
                             value={editingUser.bank_account || ""} onChange={e => setEditingUser({...editingUser, bank_account: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700">Branch Name</label>
                      <input type="text" className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" 
                             value={editingUser.bank_branch || ""} onChange={e => setEditingUser({...editingUser, bank_branch: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700">SWIFT Code</label>
                      <input type="text" placeholder="e.g. ABCDEF" className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white font-mono" 
                             value={editingUser.swift_code || ""} onChange={e => setEditingUser({...editingUser, swift_code: e.target.value})} />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-bold text-slate-700">Bank Address</label>
                      <textarea className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" rows={2}
                             value={editingUser.bank_address || ""} onChange={e => setEditingUser({...editingUser, bank_address: e.target.value})}></textarea>
                    </div>
                  </div>
                </div>

              </form>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] relative z-10">
              <button onClick={() => setEditingUser(null)} type="button" className="px-5 py-2.5 text-slate-500 font-bold text-sm hover:text-slate-700 transition-colors">
                Cancel
              </button>
              <button form="edit-user-form" type="submit" className="bg-[#282860] hover:bg-[#1b1b42] text-white px-8 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-md">
                Save & Update Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}