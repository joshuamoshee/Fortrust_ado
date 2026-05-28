"use client";

import { useState, useEffect } from "react";
import { 
  Users, X, ShieldAlert, CheckCircle2, Edit2, Trash2, Plus, 
  DollarSign, Activity, Target, Mail, MapPin, Clock, 
  Search, Cctv, AlertTriangle, TrendingUp, Briefcase,
  Archive, RefreshCcw, MoreHorizontal
} from "lucide-react";

const BRANCH_OPTIONS = ["Jakarta", "Surabaya", "Bandung", "Bali", "Medan", "Headquarters"];
const ROLE_OPTIONS = ["Corporate Agent", "Student Counselor", "Individual Agent", "MASTER_ADMIN"];

export default function AgentManagement() {
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{type: 'success'|'error', message: string} | null>(null);

  // Tabs & Filters
  const [viewTab, setViewTab] = useState<"active" | "archived">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [branchFilter, setBranchFilter] = useState("All");

  // User Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("Individual Agent");
  const [newUserBranch, setNewUserBranch] = useState("Jakarta");
  const [newUserCapacity, setNewUserCapacity] = useState(50);
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Detail & Edit States
  const [selectedAgent, setSelectedAgent] = useState<any>(null); 
  const [panelTab, setPanelTab] = useState<"overview" | "financials" | "history">("overview");
  const [editingUser, setEditingUser] = useState<any>(null); 

  const fetchData = async () => {
    const token = localStorage.getItem("fortrust_token");
    const headers = { "Authorization": `Bearer ${token}` };

    try {
      const [usersRes, studentsRes, logsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline?role=MASTER_ADMIN`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/audit-logs`, { headers })
      ]);
      
      const usersData = await usersRes.json();
      const studentsData = await studentsRes.json();
      const logsData = await logsRes.json();

      if (usersData.status === "success") setSystemUsers(usersData.data);
      if (studentsData.status === "success") setAllStudents(studentsData.data);
      if (logsData.status === "success") setAuditLogs(logsData.data);
    } catch (error) {
      console.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingUser(true);
    setNotification(null);
    try {
      const token = localStorage.getItem("fortrust_token");
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`, {
        method: "POST", 
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ 
          name: newUserName, email: newUserEmail, password: newUserPassword, 
          role: newUserRole, branch: newUserBranch, max_capacity: newUserCapacity 
        }),
      });
      const data = await response.json();
      
      if (response.ok) {
        setNotification({type: 'success', message: 'Agent account successfully deployed.'});
        fetchData(); 
        setTimeout(() => { setIsUserModalOpen(false); setNewUserName(""); setNewUserEmail(""); setNewUserPassword(""); setNotification(null); }, 1500);
      } else setNotification({type: 'error', message: data.detail || "Failed to create user."});
    } catch (err) { setNotification({type: 'error', message: 'Network error.'}); } finally { setIsSavingUser(false); }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);
    try {
      const token = localStorage.getItem("fortrust_token");
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${editingUser.id}`, {
        method: "PUT", 
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ 
          name: editingUser.name, role: editingUser.role, office_address: editingUser.office_address, 
          bank_name: editingUser.bank_name, bank_branch: editingUser.bank_branch, bank_address: editingUser.bank_address, 
          bank_account: editingUser.bank_account, swift_code: editingUser.swift_code, is_active: editingUser.is_active,
          max_capacity: editingUser.max_capacity
        }),
      });
      if (response.ok) {
        setNotification({type: 'success', message: 'Agent configuration updated.'});
        fetchData();
        setTimeout(() => { setEditingUser(null); setNotification(null); }, 1500);
      } else setNotification({type: 'error', message: 'Failed to update.'});
    } catch (err) { setNotification({type: 'error', message: 'Network error.'}); }
  };

  const handleDeleteUser = async (userId: string, agentName: string, isArchived: boolean) => {
    if (!isArchived) {
      const activeCount = getAgentStudents(agentName).length;
      if (activeCount > 0) {
        alert(`ACCESS DENIED: Cannot archive ${agentName}.\nThey have ${activeCount} active students. Reassign pipeline first.`);
        return;
      }
      if (!window.confirm(`Move ${agentName} to the Archive? They will lose system access.`)) return;
    } else {
      if (!window.confirm(`CRITICAL WARNING: Permanently delete ${agentName}? This destroys historical data.`)) return;
    }

    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${userId}`, { method: "DELETE", headers: { "Authorization": `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        setNotification({type: 'success', message: data.message});
        fetchData();
      } else alert(data.detail);
    } catch (err) { alert("Action failed."); }
  };

  const handleRestoreUser = async (userId: string, agentName: string) => {
    if (!window.confirm(`Restore ${agentName} to Active status?`)) return;
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${userId}`, { 
        method: "PUT", 
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ is_archived: false, is_active: true })
      });
      if (res.ok) {
        setNotification({type: 'success', message: `${agentName} restored successfully.`});
        fetchData();
      }
    } catch (err) {}
  };

  const getAgentStudents = (agentName: string) => allStudents.filter(s => s.assignee === agentName && s.status !== 'COMPLETED' && s.status !== 'REJECTED');
  const getAgentClosedDeals = (agentName: string) => allStudents.filter(s => s.assignee === agentName && s.status === 'COMPLETED');
  const getAgentLogs = (agentName: string) => auditLogs.filter(log => log.changed_by === agentName);

  const getLoadStatus = (active: number, max: number) => {
    const pct = (active / max) * 100;
    if (pct >= 100) return { color: "bg-red-500", text: "text-red-600", bgLight: "bg-red-50", border: "border-red-200", label: "OVERLOADED" };
    if (pct >= 80) return { color: "bg-amber-500", text: "text-amber-600", bgLight: "bg-amber-50", border: "border-amber-200", label: "HIGH LOAD" };
    return { color: "bg-emerald-500", text: "text-emerald-600", bgLight: "bg-emerald-50", border: "border-emerald-200", label: "OPTIMAL" };
  };

  const filteredUsers = systemUsers.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "All" || u.role === roleFilter;
    const matchesBranch = branchFilter === "All" || u.branch === branchFilter;
    const isArchived = u.is_archived === true;
    const matchesTab = viewTab === "archived" ? isArchived : !isArchived;
    return matchesSearch && matchesRole && matchesBranch && matchesTab;
  });

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#BAD133] mb-4"></div>
      <p className="font-medium tracking-wide">Syncing Agent Data...</p>
    </div>
  );

  return (
    <div className="p-4 lg:p-8 max-w-[1500px] mx-auto w-full relative">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-2xl font-bold flex items-center justify-between shadow-2xl animate-in slide-in-from-top-4
          ${notification.type === 'success' ? 'bg-[#282860] text-white border border-[#3a3a7a]' : 'bg-red-500 text-white border border-red-600'}`}>
          <div className="flex items-center gap-3">
            {notification.type === 'success' ? <CheckCircle2 className="text-[#BAD133]" size={20}/> : <ShieldAlert size={20}/>}
            {notification.message}
          </div>
          <button onClick={() => setNotification(null)} className="ml-6 opacity-70 hover:opacity-100 transition-opacity"><X size={18} /></button>
        </div>
      )}

      {/* HEADER: Clean, spacious, enterprise look */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#282860] flex items-center gap-3">
            <Briefcase className="text-[#BAD133]" size={32} /> 
            Agent Management
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Control pipeline distribution, monitor KPIs, and manage access.</p>
        </div>
        <button onClick={() => setIsUserModalOpen(true)} className="bg-[#282860] hover:bg-[#1b1b42] active:scale-95 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-md flex items-center gap-2 shrink-0">
          <Plus size={18} /> Add New Agent
        </button>
      </div>

      {/* UX POLISH: Filter Bar merged beautifully with Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col overflow-hidden">
        
        {/* Toggle Tabs */}
        <div className="flex px-2 pt-2 border-b border-slate-100 bg-slate-50/50">
          <button onClick={() => setViewTab('active')} className={`px-6 py-3.5 text-sm font-bold tracking-wide transition-all rounded-t-xl ${viewTab === 'active' ? 'bg-white text-[#282860] border-t border-x border-slate-200 shadow-[0_-4px_6px_-2px_rgba(0,0,0,0.02)]' : 'text-slate-400 hover:text-slate-600'}`}>
            Active Agents
          </button>
          <button onClick={() => setViewTab('archived')} className={`px-6 py-3.5 text-sm font-bold tracking-wide transition-all rounded-t-xl flex items-center gap-2 ${viewTab === 'archived' ? 'bg-white text-red-600 border-t border-x border-slate-200 shadow-[0_-4px_6px_-2px_rgba(0,0,0,0.02)]' : 'text-slate-400 hover:text-red-400'}`}>
            <Archive size={16}/> Archived Data
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 flex flex-col md:flex-row gap-4 items-center bg-white">
          <div className="flex items-center text-slate-400 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 w-full md:w-96 focus-within:border-[#BAD133] focus-within:ring-2 focus-within:ring-[#BAD133]/20 transition-all">
            <Search size={18} className="mr-3 text-slate-400" />
            <input type="text" placeholder="Search by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent border-none outline-none text-sm text-slate-700 w-full font-medium placeholder-slate-400" />
          </div>
          <div className="flex w-full md:w-auto gap-4">
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="flex-1 md:w-48 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all cursor-pointer">
              <option value="All">All Roles</option>
              {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="flex-1 md:w-48 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all cursor-pointer">
              <option value="All">All Branches</option>
              {BRANCH_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* MAIN DATA TABLE: High-end spacing and typography */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-[#f8fafc] border-b border-slate-200 text-[10px] font-black text-slate-400 tracking-widest uppercase">
              <tr>
                <th className="px-6 py-5">Agent Identity</th>
                <th className="px-6 py-5">Role & Assignment</th>
                <th className="px-6 py-5">Capacity Load</th>
                <th className="px-6 py-5">Performance KPIs</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr><td colSpan={5} className="p-16 text-center text-slate-400 font-medium">No agents found matching your current filters.</td></tr>
              ) : (
                filteredUsers.map((u) => {
                  const activeCount = getAgentStudents(u.name).length;
                  const closedCount = getAgentClosedDeals(u.name).length;
                  const winRate = (activeCount + closedCount) > 0 ? Math.round((closedCount / (activeCount + closedCount)) * 100) : 0;
                  const maxCap = u.max_capacity || 50;
                  const status = getLoadStatus(activeCount, maxCap);

                  return (
                    <tr key={u.id} className={`hover:bg-slate-50/80 transition-colors cursor-pointer group ${u.is_archived ? 'opacity-60 grayscale' : ''}`} onClick={() => { setSelectedAgent(u); setPanelTab("overview"); }}>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full ${u.is_archived ? 'bg-slate-300' : status.color} shadow-sm ring-4 ring-white`}></div>
                          <div>
                            <span className="font-bold text-[#282860] group-hover:text-[#BAD133] transition-colors block text-base">{u.name}</span>
                            <span className="text-xs text-slate-500 block mt-0.5 font-medium">{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-[10px] font-bold block w-fit mb-2 uppercase tracking-wider">{u.role}</span>
                        <span className="font-bold text-slate-500 text-xs flex items-center gap-1.5"><MapPin size={14}/> {u.branch}</span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="w-48">
                          <div className="flex justify-between items-end mb-1.5">
                            <span className={`text-[10px] font-black uppercase tracking-wider ${u.is_archived ? 'text-slate-400' : status.text}`}>{u.is_archived ? 'ARCHIVED' : status.label}</span>
                            <span className="text-xs font-bold text-slate-600">{activeCount} / {maxCap}</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/50">
                            <div className={`h-2.5 rounded-full ${u.is_archived ? 'bg-slate-300' : status.color} transition-all duration-700 ease-out`} style={{ width: `${Math.min((activeCount / maxCap) * 100, 100)}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-700 flex items-center gap-1.5"><CheckCircle2 size={14}/> {closedCount} Won</div>
                          <div className="bg-blue-50 border border-blue-100 px-2.5 py-1.5 rounded-lg text-xs font-bold text-blue-700 flex items-center gap-1.5"><TrendingUp size={14}/> {winRate}% Conv.</div>
                        </div>
                      </td>
                      <td className="px-6 py-5 flex justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                        {viewTab === "active" ? (
                          <>
                            <button onClick={() => setEditingUser(u)} className="text-slate-500 hover:text-[#282860] hover:bg-slate-100 font-bold text-[11px] uppercase tracking-wider px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 border border-transparent hover:border-slate-200"><Edit2 size={14}/> Config</button>
                            <button onClick={() => handleDeleteUser(u.id, u.name, false)} className="text-red-400 hover:text-white hover:bg-red-500 bg-white border border-slate-200 hover:border-red-500 px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-sm" title="Archive Agent"><Archive size={14} /> Archive</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleRestoreUser(u.id, u.name)} className="text-blue-600 hover:text-white hover:bg-blue-600 font-bold text-[11px] uppercase tracking-wider bg-white border border-blue-200 px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"><RefreshCcw size={14}/> Restore</button>
                            <button onClick={() => handleDeleteUser(u.id, u.name, true)} className="text-red-600 hover:text-white hover:bg-red-600 bg-red-50 px-3 py-2 rounded-xl border border-red-200 transition-all flex items-center gap-1.5 shadow-sm" title="Delete Permanently"><Trash2 size={16} /></button>
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- SLIDE-OUT PANEL (CCTV, KPIs) --- */}
      {selectedAgent && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity" onClick={() => setSelectedAgent(null)}></div>
          <div className="fixed inset-y-0 right-0 w-full sm:w-[650px] bg-[#f8fafc] shadow-2xl border-l border-slate-200 z-50 flex flex-col transform transition-transform duration-300 ease-out">
            
            <div className="p-8 border-b border-slate-100 bg-[#1b1b42] text-white flex justify-between items-start relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#BAD133] rounded-full blur-[80px] opacity-10 pointer-events-none"></div>
              <div className="relative z-10">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#BAD133] mb-2 block">Agent Dossier</span>
                <h3 className="text-3xl font-black flex items-center gap-3">
                  {selectedAgent.name} 
                  {selectedAgent.is_archived && <span className="bg-red-500 text-white text-xs px-3 py-1 rounded-full uppercase tracking-wider">Archived</span>}
                  {selectedAgent.is_active === false && !selectedAgent.is_archived && <span className="bg-orange-500 text-white text-xs px-3 py-1 rounded-full uppercase tracking-wider">Frozen</span>}
                </h3>
                <p className="text-sm text-slate-300 mt-2 flex items-center gap-2"><Mail size={14} className="text-slate-400"/> {selectedAgent.email}</p>
              </div>
              <button onClick={() => setSelectedAgent(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors relative z-10"><X size={24}/></button>
            </div>

            <div className="flex bg-white border-b border-slate-200 px-8 shadow-sm relative z-10">
              <button onClick={() => setPanelTab('overview')} className={`px-2 py-5 mr-8 text-sm font-bold tracking-wide transition-colors flex items-center gap-2 ${panelTab === 'overview' ? 'border-b-[3px] border-[#282860] text-[#282860]' : 'text-slate-400 hover:text-slate-600 border-b-[3px] border-transparent'}`}>
                <Target size={18}/> Load & KPIs
              </button>
              <button onClick={() => setPanelTab('financials')} className={`px-2 py-5 mr-8 text-sm font-bold tracking-wide transition-colors flex items-center gap-2 ${panelTab === 'financials' ? 'border-b-[3px] border-green-600 text-green-700' : 'text-slate-400 hover:text-slate-600 border-b-[3px] border-transparent'}`}>
                <DollarSign size={18}/> Financials
              </button>
              <button onClick={() => setPanelTab('history')} className={`px-2 py-5 text-sm font-bold tracking-wide transition-colors flex items-center gap-2 ${panelTab === 'history' ? 'border-b-[3px] border-blue-600 text-blue-700' : 'text-slate-400 hover:text-slate-600 border-b-[3px] border-transparent'}`}>
                <Cctv size={18}/> System CCTV
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
              {panelTab === 'overview' && (() => {
                const activeCount = getAgentStudents(selectedAgent.name).length;
                const maxCap = selectedAgent.max_capacity || 50;
                const status = getLoadStatus(activeCount, maxCap);

                return (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className={`p-6 rounded-2xl border bg-white shadow-sm`}>
                      <div className="flex justify-between items-center mb-5">
                        <h4 className={`font-black uppercase tracking-widest text-sm flex items-center gap-2 ${status.text}`}>
                          {status.label === "OVERLOADED" ? <AlertTriangle size={20}/> : <Activity size={20}/>} 
                          Capacity Status: {status.label}
                        </h4>
                        <span className="font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">{activeCount} / {maxCap} Students</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden shadow-inner">
                        <div className={`h-4 rounded-full ${status.color} transition-all duration-1000 ease-out`} style={{ width: `${Math.min((activeCount / maxCap) * 100, 100)}%` }}></div>
                      </div>
                      {status.label === "OVERLOADED" && <p className="text-xs font-bold text-red-600 mt-4 bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-2"><ShieldAlert size={16}/> System is currently blocking new assignments to this agent.</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-center flex flex-col justify-center">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Pipeline</p>
                        <p className="text-4xl font-black text-[#282860] mt-2">{activeCount}</p>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl shadow-sm text-center flex flex-col justify-center">
                        <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Closed Won</p>
                        <p className="text-4xl font-black text-emerald-600 mt-2">{getAgentClosedDeals(selectedAgent.name).length}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {panelTab === 'financials' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                  <div className="bg-gradient-to-br from-[#282860] to-[#1b1b42] p-8 rounded-3xl shadow-xl relative overflow-hidden text-white border border-[#3a3a7a]">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-[#BAD133] rounded-full blur-[60px] opacity-20 -mr-10 -mt-10"></div>
                    <p className="text-xs font-bold text-[#BAD133] uppercase tracking-widest mb-2 relative z-10">Total Commission Generated</p>
                    <p className="text-5xl font-black text-white relative z-10 tracking-tight">${getAgentClosedDeals(selectedAgent.name).reduce((sum, s) => sum + (parseFloat(s.agent_cut || 0)), 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                  </div>
                </div>
              )}

              {panelTab === 'history' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center justify-between mb-6 bg-[#0f172a] text-white p-5 rounded-2xl shadow-lg border border-slate-800 relative overflow-hidden">
                    <div className="absolute inset-0 bg-blue-500/10 pointer-events-none"></div>
                    <div className="relative z-10 flex items-center gap-3">
                      <div className="p-2 bg-blue-500/20 rounded-lg"><Cctv className="text-blue-400" size={20}/></div>
                      <p className="text-sm font-bold uppercase tracking-widest text-slate-200">Secure System CCTV</p>
                    </div>
                    <span className="relative z-10 bg-[#1e293b] text-slate-300 border border-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg shadow-inner">{getAgentLogs(selectedAgent.name).length} Logs</span>
                  </div>
                  
                  {getAgentLogs(selectedAgent.name).length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed">
                      <Cctv size={48} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-sm text-slate-500 font-medium">No system actions recorded yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                      {getAgentLogs(selectedAgent.name).map(log => (
                        <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                          <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#f8fafc] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm relative z-10
                            ${log.action === 'CREATE' ? 'bg-emerald-500' : log.action === 'UPDATE' ? 'bg-blue-500' : 'bg-amber-500'}`}>
                              <Activity size={14} className="text-white"/>
                          </div>
                          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-1">
                              <div className="font-bold text-slate-900 text-sm">{log.action === 'UPDATE' ? 'Updated' : log.action === 'CREATE' ? 'Created' : 'Action on'} <span className="text-[#282860]">{log.entity}</span></div>
                              <time className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">{new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</time>
                            </div>
                            <div className="text-xs text-slate-500 font-medium">{new Date(log.created_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </>
      )}

      {/* --- ADD NEW AGENT MODAL (Refined styling) --- */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-[#f8fafc]">
              <h2 className="text-xl font-bold text-[#282860] flex items-center gap-2"><Users size={22} className="text-[#BAD133]" /> Create New Agent</h2>
              <button onClick={() => setIsUserModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-5">
              <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Full Name</label><input type="text" required className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all bg-slate-50 focus:bg-white" value={newUserName} onChange={e => setNewUserName(e.target.value)} /></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Email Address</label><input type="email" required className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all bg-slate-50 focus:bg-white" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} /></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Temporary Password</label><input type="text" required className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all bg-slate-50 focus:bg-white" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">System Role</label>
                  <select className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all bg-slate-50 focus:bg-white cursor-pointer" value={newUserRole} onChange={e => setNewUserRole(e.target.value)}>
                    {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Branch</label>
                  <select className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all bg-slate-50 focus:bg-white cursor-pointer" value={newUserBranch} onChange={e => setNewUserBranch(e.target.value)}>
                    {BRANCH_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Max Pipeline Capacity</label>
                  <input type="number" required className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-[#282860] outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all bg-slate-50 focus:bg-white" value={newUserCapacity} onChange={e => setNewUserCapacity(Number(e.target.value))} />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3"><button type="button" onClick={() => setIsUserModalOpen(false)} className="px-5 py-3 text-slate-500 hover:text-slate-700 font-bold text-sm transition-colors">Cancel</button><button type="submit" disabled={isSavingUser} className="bg-[#282860] hover:bg-[#1b1b42] active:scale-95 text-white px-8 py-3 rounded-xl text-sm font-bold disabled:opacity-50 transition-all shadow-md">{isSavingUser ? "Deploying..." : "Create Account"}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT AGENT CONFIG MODAL --- */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-[#f8fafc]">
              <div>
                <h2 className="text-xl font-bold text-[#282860] flex items-center gap-2">
                  <Edit2 size={20} className="text-[#BAD133]" /> Configuration Matrix
                </h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">{editingUser.email}</p>
              </div>
              <button onClick={() => setEditingUser(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-white">
              <form id="edit-user-form" onSubmit={handleEditUser} className="space-y-8">
                <div>
                  <h3 className="text-xs font-black text-[#282860] uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-100 pb-2"><ShieldAlert size={14} className="text-amber-500"/> Core Security & Access</h3>
                  <div className="grid grid-cols-2 gap-5">
                    <div><label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Account Name</label><input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" value={editingUser.name || ""} onChange={e => setEditingUser({...editingUser, name: e.target.value})} /></div>
                    <div><label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">System Role</label><select className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all cursor-pointer" value={editingUser.role || "Individual Agent"} onChange={e => setEditingUser({...editingUser, role: e.target.value})}>{ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                    
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block flex items-center gap-1"><Users size={12}/> Max Active Capacity</label>
                      <input type="number" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-black text-[#282860] bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" value={editingUser.max_capacity || 50} onChange={e => setEditingUser({...editingUser, max_capacity: Number(e.target.value)})} />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block text-red-500 flex items-center gap-1"><ShieldAlert size={12}/> Emergency Access Control</label>
                      <select className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20 transition-all cursor-pointer" value={editingUser.is_active === false ? "false" : "true"} onChange={e => setEditingUser({...editingUser, is_active: e.target.value === "true"})}>
                        <option value="true" className="text-emerald-600 font-bold">🟢 SYSTEM ACTIVE</option>
                        <option value="false" className="text-red-600 font-bold">🔴 FREEZE ACCOUNT</option>
                      </select>
                    </div>
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-5 border-t border-slate-100 bg-[#f8fafc] flex justify-end gap-3">
              <button onClick={() => setEditingUser(null)} type="button" className="px-6 py-2.5 text-slate-500 font-bold text-sm hover:text-slate-800 transition-colors">Cancel</button>
              <button form="edit-user-form" type="submit" className="bg-[#282860] hover:bg-[#1b1b42] active:scale-95 text-white px-8 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md">Apply Configuration</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}