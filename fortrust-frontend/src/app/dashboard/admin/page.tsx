"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users, Target, FileText, DollarSign, ChevronDown, X, PartyPopper, TrendingUp, Medal, Building2, Filter } from "lucide-react";

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
  
  // User Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("Micro Agent");
  const [newUserBranch, setNewUserBranch] = useState("Jakarta");
  const [isSavingUser, setIsSavingUser] = useState(false);

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
      const [studentsRes, usersRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline?role=MASTER_ADMIN`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`, { headers })
      ]);
      const studentsData = await studentsRes.json();
      const usersData = await usersRes.json();
      
      if (studentsData.status === "success") setStudents(studentsData.data);
      if (usersData.status === "success") setSystemUsers(usersData.data);
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingUser(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newUserName, email: newUserEmail, password: newUserPassword, role: newUserRole, branch: newUserBranch }),
      });
      if (response.ok) {
        setIsUserModalOpen(false);
        setNewUserName(""); setNewUserEmail(""); setNewUserPassword("");
        fetchData(); 
      }
    } finally {
      setIsSavingUser(false);
    }
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
    <div className="min-h-screen bg-[#f8fafc] p-8 font-sans space-y-6 relative max-w-[1600px] mx-auto">
      
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Master Admin Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Global Pipeline, Commission, & Team Management</p>
        </div>
        <div className="flex gap-3">
          <Link 
            href="/dashboard/admin/commissions"
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all"
          >
            <FileText size={18} />
            Extract Commission PDF
          </Link>
          <button onClick={() => setIsUserModalOpen(true)} className="flex items-center gap-2 bg-[#282860] hover:bg-[#1b1b42] text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-sm transition-all">
            + Create New User
          </button>
        </div>
      </div>

      {/* DEAL CLOSED MODAL */}
      {isCommissionModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-emerald-100">
            <div className="bg-emerald-500 p-6 text-center">
              <PartyPopper className="mx-auto h-12 w-12 text-white mb-2" />
              <h2 className="text-2xl font-black text-white">Deal Closed!</h2>
              <p className="text-emerald-100 text-sm mt-1">Record the financial details for {closingStudent?.name}</p>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Currency</label>
                <select value={dealCurrency} onChange={(e)=>setDealCurrency(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl py-2.5 px-4 text-slate-900 font-bold outline-none focus:border-emerald-500 transition-all cursor-pointer">
                  <option value="AUD">AUD - Australian Dollar</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="NZD">NZD - New Zealand Dollar</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="IDR">IDR - Indonesian Rupiah</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Total University Tuition (Est)</label>
                <input type="number" value={tuitionAmount} onChange={(e)=>setTuitionAmount(e.target.value)} placeholder={`e.g. 35000`} className="w-full border-2 border-slate-200 rounded-xl py-2.5 px-4 text-slate-900 font-bold outline-none focus:border-emerald-500 transition-all" />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Fortrust Commission Rate (%)</label>
                <div className="relative">
                  <input type="number" value={commissionPercent} onChange={(e)=>setCommissionPercent(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl py-2.5 pl-4 pr-8 text-slate-900 font-bold outline-none focus:border-emerald-500 transition-all" />
                  <span className="absolute right-4 top-2.5 text-slate-400 font-bold">%</span>
                </div>
              </div>

              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 flex justify-between items-center">
                <span className="text-sm font-bold text-emerald-800">Business Generated:</span>
                <span className="text-lg font-black text-emerald-600">
                  {dealCurrency} {((parseFloat(tuitionAmount || "0") * parseFloat(commissionPercent || "0")) / 100).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </span>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button onClick={() => {setIsCommissionModalOpen(false); setClosingStudent(null);}} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors">Cancel</button>
                <button onClick={handleCloseDeal} disabled={!tuitionAmount} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50">Log Commission</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE USER MODAL */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100"><h2 className="text-xl font-bold text-[#282860]">Create New User</h2><button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button></div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Role</label><select value={newUserRole} onChange={(e)=>setNewUserRole(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-sm outline-none focus:border-[#BAD133]"><option value="Agent">Agent Branch</option><option value="Micro Agent">Micro Agent</option><option value="Counsellor">Counsellor</option><option value="Master Admin">Master Admin</option></select></div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Branch / City</label><select value={newUserBranch} onChange={(e)=>setNewUserBranch(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-sm outline-none focus:border-[#BAD133]">{BRANCH_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
              </div>
              <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Display Name</label><input required type="text" value={newUserName} onChange={(e)=>setNewUserName(e.target.value)} placeholder="e.g. Budi Santoso" className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-sm outline-none focus:border-[#BAD133]" /></div>
              <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Email (Login ID)</label><input required type="email" value={newUserEmail} onChange={(e)=>setNewUserEmail(e.target.value)} placeholder="budi@example.com" className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-sm outline-none focus:border-[#BAD133]" /></div>
              <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Password</label><input required type="password" value={newUserPassword} onChange={(e)=>setNewUserPassword(e.target.value)} placeholder="••••••••" className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-sm outline-none focus:border-[#BAD133]" /></div>
              <button disabled={isSavingUser} type="submit" className="w-full bg-[#282860] hover:bg-[#1b1b42] text-white font-bold py-3 rounded-xl mt-4 transition-colors disabled:opacity-50">{isSavingUser ? "Creating Account..." : "Save User Account"}</button>
            </form>
          </div>
        </div>
      )}

      {/* 1. KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center"><p className="text-sm font-bold text-slate-500">Total Students</p><div className="p-2.5 bg-blue-50 rounded-xl text-blue-600"><Users size={20} /></div></div>
          <h3 className="text-3xl font-black text-slate-900 mt-4">{totalStudents}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center"><p className="text-sm font-bold text-slate-500">Qualified Leads</p><div className="p-2.5 bg-purple-50 rounded-xl text-purple-600"><Target size={20} /></div></div>
          <h3 className="text-3xl font-black text-slate-900 mt-4">{qualifiedLeads}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center"><p className="text-sm font-bold text-slate-500">Active Applications</p><div className="p-2.5 bg-orange-50 rounded-xl text-orange-500"><FileText size={20} /></div></div>
          <h3 className="text-3xl font-black text-slate-900 mt-4">{activeApps}</h3>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 rounded-2xl shadow-md shadow-emerald-600/20 flex flex-col justify-between text-white">
          <div className="flex justify-between items-center">
            <p className="text-sm font-bold text-emerald-100">Total Business (Est. USD)</p>
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm"><DollarSign size={20} className="text-white"/></div>
          </div>
          <h3 className="text-4xl font-black mt-4">${totalCommissionUSD.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
        </div>
      </div>

      {/* 2. PERFORMANCE REPORT GRIDS */}
      {stats && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-[#BAD133]" size={20} />
              <h3 className="text-lg font-bold text-[#282860]">Performance Report</h3>
            </div>
            
            <div className="relative inline-block">
              <select 
                value={timeframe} 
                onChange={(e) => setTimeframe(e.target.value)}
                className="appearance-none flex items-center gap-2 text-sm font-bold text-slate-500 bg-white border border-slate-200 py-2 pl-4 pr-10 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20"
              >
                <option value="all">Filter: All Time</option>
                <option value="30days">Filter: Last 30 Days</option>
                <option value="this_year">Filter: This Year</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                <Filter size={16} />
              </div>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Top Agents (Volume)</h4>
              <div className="space-y-3">
                {stats.performance.top_agents_volume?.length > 0 ? stats.performance.top_agents_volume.map((agent: any, i: number) => (
                  <div key={i} className="flex flex-col p-2 bg-slate-50 rounded-xl">
                    <span className="font-bold text-slate-700 text-xs truncate">{i+1}. {agent.name}</span>
                    <span className="text-blue-600 font-black text-xs mt-1">{agent.value} Students</span>
                  </div>
                )) : <p className="text-xs text-slate-400 italic">No data.</p>}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-1">Top Agents (Revenue) <Medal size={12} className="text-[#BAD133]"/></h4>
              <div className="space-y-3">
                {stats.performance.top_agents_revenue?.length > 0 ? stats.performance.top_agents_revenue.map((agent: any, i: number) => (
                  <div key={i} className="flex flex-col p-2 bg-emerald-50 rounded-xl border border-emerald-100/50">
                    <span className="font-bold text-emerald-900 text-xs truncate">{i+1}. {agent.name}</span>
                    <span className="font-black text-emerald-600 text-xs mt-1">${agent.value.toLocaleString()}</span>
                  </div>
                )) : <p className="text-xs text-slate-400 italic">No data.</p>}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Top Counsellors (Volume)</h4>
              <div className="space-y-3">
                {stats.performance.top_counsellors_volume?.length > 0 ? stats.performance.top_counsellors_volume.map((agent: any, i: number) => (
                  <div key={i} className="flex flex-col p-2 bg-slate-50 rounded-xl">
                    <span className="font-bold text-slate-700 text-xs truncate">{i+1}. {agent.name}</span>
                    <span className="text-purple-600 font-black text-xs mt-1">{agent.value} Students</span>
                  </div>
                )) : <p className="text-xs text-slate-400 italic">No data.</p>}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-1">Top Counsellors (Revenue) <Medal size={12} className="text-purple-400"/></h4>
              <div className="space-y-3">
                {stats.performance.top_counsellors_revenue?.length > 0 ? stats.performance.top_counsellors_revenue.map((agent: any, i: number) => (
                  <div key={i} className="flex flex-col p-2 bg-purple-50 rounded-xl border border-purple-100/50">
                    <span className="font-bold text-purple-900 text-xs truncate">{i+1}. {agent.name}</span>
                    <span className="font-black text-purple-600 text-xs mt-1">${agent.value.toLocaleString()}</span>
                  </div>
                )) : <p className="text-xs text-slate-400 italic">No data.</p>}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-1">Top Institutions <Building2 size={12} className="text-slate-400"/></h4>
              <div className="space-y-3">
                {stats.performance.top_institutions?.length > 0 ? stats.performance.top_institutions.map((inst: any, i: number) => (
                  <div key={i} className="flex flex-col p-2 bg-slate-50 rounded-xl">
                    <span className="font-bold text-slate-700 text-xs truncate">{i+1}. {inst.name}</span>
                    <span className="text-orange-600 font-black text-xs mt-1">{inst.value} Apps</span>
                  </div>
                )) : <p className="text-xs text-slate-400 italic">No apps yet.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. CHART & PIPELINE TABLE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        
        {/* Chart */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-8">Branch Volume</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={{stroke: '#cbd5e1'}} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 600}} angle={-45} textAnchor="end"/>
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 600}}/>
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: '1px solid #e2e8f0', fontWeight: 'bold'}}/>
                <Bar dataKey="students" fill="#282860" radius={[6, 6, 0, 0]} barSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Master Data Table 🚨 NOW WITH MARKETING DATA 🚨 */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50"><h3 className="font-bold text-slate-900">Master Pipeline Control</h3></div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 z-10 shadow-sm">
                <tr className="border-b border-slate-200 text-[10px] font-black text-slate-500 tracking-wider uppercase">
                  <th className="px-5 py-4">Student Name</th>
                  <th className="px-5 py-4">Marketing Profile</th> {/* NEW COLUMN */}
                  <th className="px-5 py-4">Assigned To</th>
                  <th className="px-5 py-4">Pipeline Status</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    
                    {/* Column 1: Name & Contact */}
                    <td className="px-5 py-4">
                      <span className="font-bold text-[#282860] block">{student.name}</span>
                      <span className="text-[11px] text-slate-500 block mt-0.5 truncate w-32">{student.email}</span>
                      {student.phone && <span className="text-[11px] text-slate-500 block truncate w-32">WA: {student.phone}</span>}
                    </td>

                    {/* 🚨 Column 2: The New "Marketing Profile" (Hot/Warm/Cold + Source) 🚨 */}
                    <td className="px-5 py-4">
                      <div className="flex flex-col items-start gap-1.5">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          student.lead_temperature === 'Hot Leads' ? 'bg-red-100 text-red-700 border border-red-200' :
                          student.lead_temperature === 'Warm Leads' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                          'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}>
                          {student.lead_temperature || "Cold Leads"}
                        </span>
                        {student.program_interest && <p className="text-[10px] font-bold text-slate-600 truncate max-w-[120px]" title={student.program_interest}>🎓 {student.program_interest}</p>}
                        {student.lead_source && <p className="text-[10px] text-slate-500 truncate max-w-[120px]" title={student.lead_source}>🌐 {student.lead_source}</p>}
                      </div>
                    </td>

                    {/* Column 3: Assignment Dropdown */}
                    <td className="px-5 py-4">
                      <div className="relative inline-block w-40">
                        <select 
                          value={student.assigned_to || "Unassigned"}
                          onChange={(e) => handleAssignAgent(student.id, student.status, e.target.value)}
                          className="block w-full appearance-none bg-white border border-slate-200 text-slate-900 text-xs font-bold rounded-lg py-2 pl-3 pr-8 shadow-sm outline-none focus:border-[#282860] cursor-pointer"
                        >
                          <option value="Unassigned">Unassigned</option>
                          {systemUsers.map(u => <option key={u.id} value={u.name}>{u.role} - {u.name}</option>)}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400"><ChevronDown size={14} /></div>
                      </div>
                    </td>

                    {/* Column 4: Status Dropdown */}
                    <td className="px-5 py-4">
                      <div className="relative inline-block w-36">
                        <select 
                          value={student.status?.toUpperCase() || "NEW LEAD"}
                          onChange={(e) => handleStatusChange(student, e.target.value)}
                          className={`block w-full appearance-none font-black text-[9px] tracking-wider rounded-lg py-2 pl-3 pr-8 outline-none shadow-sm cursor-pointer
                            ${student.status?.toUpperCase() === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 
                              student.status?.toUpperCase() === 'QUALIFIED LEADS' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 
                              'bg-slate-100 text-slate-700 border border-slate-200'}`}
                        >
                          {STATUS_OPTIONS.map(opt => <option key={opt} value={opt} className="bg-white text-slate-900">{opt}</option>)}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-current opacity-50"><ChevronDown size={14} /></div>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}