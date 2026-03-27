"use client";

import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users, Target, FileText, DollarSign, ChevronDown, Edit2, X, PartyPopper } from "lucide-react";

const STATUS_OPTIONS = ["NEW LEAD", "QUALIFIED LEADS", "CONSULTING PROCESS", "UNI APPLICATION", "VISA", "COMPLETED"];
const BRANCH_OPTIONS = ["Jakarta", "Surabaya", "Bandung", "Bali", "Medan", "Headquarters"];

// 🚨 NEW: Standard Exchange Rates (Normalized to USD for the Master KPI)
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
  const [loading, setLoading] = useState(true);
  
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
  const [dealCurrency, setDealCurrency] = useState("AUD"); // <-- NEW: Currency State

  const fetchData = async () => {
    try {
      const [studentsRes, usersRes] = await Promise.all([
        fetch("http://127.0.0.1:8000/api/pipeline?role=MASTER_ADMIN"),
        fetch("http://127.0.0.1:8000/api/users")
      ]);
      const studentsData = await studentsRes.json();
      const usersData = await usersRes.json();
      
      if (studentsData.status === "success") setStudents(studentsData.data);
      if (usersData.status === "success") setSystemUsers(usersData.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

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
      await fetch(`http://127.0.0.1:8000/api/pipeline/${caseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, assigned_to: assignedTo, tuition, commission_rate: commRate, currency }), // <-- Added Currency
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
      const response = await fetch("http://127.0.0.1:8000/api/users", {
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
  
  // 🚨 EXCHANGE ENGINE: Convert all earned commissions to a unified USD total
  const totalCommissionUSD = students.reduce((sum, student) => {
    const earned = student.commission_earned || 0;
    const curr = student.currency || "USD";
    const rate = EXCHANGE_RATES[curr] || 1.0;
    return sum + (earned * rate);
  }, 0);

  return (
    <div className="min-h-screen bg-[#f8fafc] p-8 font-sans space-y-6 relative">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Master Control Panel</h1>
          <p className="text-sm text-slate-500 mt-1">Global Pipeline, Commission, & Team Management</p>
        </div>
        <button onClick={() => setIsUserModalOpen(true)} className="flex items-center gap-2 bg-[#282860] hover:bg-[#1b1b42] text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-sm transition-all">
          + Create New User
        </button>
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
              
              {/* 🚨 CURRENCY SELECTOR */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Currency</label>
                <select value={dealCurrency} onChange={(e)=>setDealCurrency(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl py-2.5 px-4 text-slate-900 font-bold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all cursor-pointer">
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
                <input type="number" value={tuitionAmount} onChange={(e)=>setTuitionAmount(e.target.value)} placeholder={`e.g. 35000`} className="w-full border-2 border-slate-200 rounded-xl py-2.5 px-4 text-slate-900 font-bold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all" />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Fortrust Commission Rate (%)</label>
                <div className="relative">
                  <input type="number" value={commissionPercent} onChange={(e)=>setCommissionPercent(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl py-2.5 pl-4 pr-8 text-slate-900 font-bold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all" />
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

      {/* KPI CARDS */}
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
        
        {/* 🚨 UPDATED MONEY KPI CARD */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 rounded-2xl shadow-md shadow-emerald-600/20 flex flex-col justify-between text-white">
          <div className="flex justify-between items-center">
            <p className="text-sm font-bold text-emerald-100">Total Business (Est. USD)</p>
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm"><DollarSign size={20} className="text-white"/></div>
          </div>
          <h3 className="text-4xl font-black mt-4">${totalCommissionUSD.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-8">Top Performing Branches by Student Volume</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height={300} minWidth={1} minHeight={1}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={{stroke: '#cbd5e1'}} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 600}} angle={-45} textAnchor="end"/>
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 600}} label={{ value: 'Number of Students', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11, fontWeight: 600 }}/>
              <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: '1px solid #e2e8f0', fontWeight: 'bold'}}/>
              <Bar dataKey="students" fill="#282860" radius={[6, 6, 0, 0]} barSize={45} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 tracking-wider uppercase">
              <th className="px-6 py-4">Student Name</th>
              <th className="px-6 py-4">Assigned To (Real Agents)</th>
              <th className="px-6 py-4">Pipeline Status</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-slate-100">
            {students.map((student) => (
              <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <span className="font-bold text-[#282860]">{student.name}</span>
                  {student.status === "COMPLETED" && (
                    <div className="text-[10px] font-bold text-emerald-600 mt-1 flex items-center gap-1">
                      <DollarSign size={10}/>
                      Earned: {student.currency || "USD"} {(student.commission_earned || 0).toLocaleString()}
                    </div>
                  )}
                </td>
                
                <td className="px-6 py-4 relative">
                  <div className="relative inline-block w-64">
                    <select 
                      value={student.assigned_to || "Unassigned"}
                      onChange={(e) => handleAssignAgent(student.id, student.status, e.target.value)}
                      className="block w-full appearance-none bg-white border border-slate-200 text-slate-900 text-sm font-bold rounded-lg py-2 pl-3 pr-8 shadow-sm focus:outline-none focus:border-[#282860] focus:ring-1 focus:ring-[#282860] cursor-pointer"
                    >
                      <option value="Unassigned">Unassigned</option>
                      {systemUsers.map(u => <option key={u.id} value={u.name}>{u.role} - {u.name} ({u.branch})</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400"><ChevronDown size={14} /></div>
                  </div>
                </td>

                <td className="px-6 py-4">
                  <div className="relative inline-block w-48">
                    <select 
                      value={student.status?.toUpperCase() || "NEW LEAD"}
                      onChange={(e) => handleStatusChange(student, e.target.value)}
                      className={`block w-full appearance-none font-black text-xs tracking-wider rounded-lg py-2.5 pl-4 pr-8 outline-none cursor-pointer transition-colors shadow-sm
                        ${student.status?.toUpperCase() === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 
                          student.status?.toUpperCase() === 'QUALIFIED LEADS' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 
                          'bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300'}`}
                    >
                      {STATUS_OPTIONS.map(opt => <option key={opt} value={opt} className="bg-white text-slate-900">{opt}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-current opacity-50"><ChevronDown size={14} /></div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}