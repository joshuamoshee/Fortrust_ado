"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Users, X, ShieldAlert, CheckCircle2, Edit2, Trash2, Plus, 
  DollarSign, Activity, Target, Mail, MapPin, Clock, PhoneCall,
  Search, Cctv, AlertTriangle, TrendingUp, Briefcase,
  Archive, RefreshCcw, Phone, Landmark, Percent, Building, FileText, LogIn, Network, Loader2, ArrowRight, Timer,
  Megaphone
} from "lucide-react";

const BRANCH_OPTIONS = ["Jakarta", "Surabaya", "Bandung", "Bali", "Medan", "Headquarters"];
const ROLE_OPTIONS = ["Corporate Agent", "Individual Agent", "Student Counselor", "MASTER_ADMIN", "Team Manager"];

export default function AgentManagement() {
  const router = useRouter();
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{type: 'success'|'error', message: string} | null>(null);

  const [viewTab, setViewTab] = useState<"active" | "archived">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [branchFilter, setBranchFilter] = useState("All");

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("Individual Agent");
  const [newUserBranch, setNewUserBranch] = useState("Jakarta");
  const [newUserCapacity, setNewUserCapacity] = useState<number | string>(50);
  const [newUserCorpName, setNewUserCorpName] = useState("");
  const [newUserParentId, setNewUserParentId] = useState("");
  const [isSavingUser, setIsSavingUser] = useState(false);

  const [selectedAgent, setSelectedAgent] = useState<any>(null); 
  const [panelTab, setPanelTab] = useState<"overview" | "financials" | "team" | "history">("overview");
  const [editingUser, setEditingUser] = useState<any>(null); 

  const [deleteFlowState, setDeleteFlowState] = useState<{agent: any, step: 'check' | 'reassign' | 'confirm' | null}>({agent: null, step: null});
  const [reassignTarget, setReassignTarget] = useState("");
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);

  // --- HELPER FUNCTIONS ---
  const getAgentStudents = (agentName: string) => allStudents.filter(s => s.assignee === agentName && s.status !== 'COMPLETED' && s.status !== 'REJECTED');
  const getAgentClosedDeals = (agentName: string) => allStudents.filter(s => s.assignee === agentName && s.status === 'COMPLETED');
  const getAgentLogs = (agentName: string) => auditLogs.filter(log => log.changed_by === agentName);

  const getAgentMetrics = (agentName: string, agentId: number) => {
    const students = allStudents.filter(s => s.assignee === agentName);
    const active = students.filter(s => s.status !== 'COMPLETED' && s.status !== 'REJECTED');
    const closed = students.filter(s => s.status === 'COMPLETED');
    const dropped = students.filter(s => s.status === 'REJECTED');
    
    const winRate = (active.length + closed.length + dropped.length) > 0 
      ? Math.round((closed.length / (active.length + closed.length + dropped.length)) * 100) 
      : 0;

    let totalDays = 0;
    let validClosedCount = 0;
    closed.forEach(s => {
      if (s.created_at && s.updated_at) {
        const start = new Date(s.created_at).getTime();
        const end = new Date(s.updated_at).getTime();
        const days = Math.round((end - start) / (1000 * 60 * 60 * 24));
        if (days >= 0) {
          totalDays += days;
          validClosedCount++;
        }
      }
    });
    const avgVelocity = validClosedCount > 0 ? Math.round(totalDays / validClosedCount) : null;

    const warnings: string[] = [];
    if (active.length >= 10 && closed.length === 0) warnings.push("High Volume, 0 Deals Closed");
    if (winRate > 0 && winRate <= 15) warnings.push("Low Conversion Rate (<15%)");
    if (avgVelocity !== null && avgVelocity > 60) warnings.push("Extremely Slow Deal Velocity");

    const subAgents = systemUsers.filter(su => su.parent_corporate_id === agentId);

    return { active: active.length, closed: closed.length, dropped: dropped.length, winRate, avgVelocity, warnings, subAgents };
  };

  const getLoadStatus = (active: number, max: number) => {
    const pct = max > 0 ? (active / max) * 100 : 0;
    if (pct >= 100) return { color: "bg-red-500", text: "text-red-600", bgLight: "bg-red-50", border: "border-red-200", label: "OVERLOADED" };
    if (pct >= 80) return { color: "bg-amber-500", text: "text-amber-600", bgLight: "bg-amber-50", border: "border-amber-200", label: "HIGH LOAD" };
    return { color: "bg-emerald-500", text: "text-emerald-600", bgLight: "bg-emerald-50", border: "border-emerald-200", label: "OPTIMAL" };
  };

  const formatLogDetails = (log: any) => {
    if (log.action === 'LOGIN') return "Agent authenticated and entered the workspace.";
    let details: any = {};
    try { details = typeof log.details === 'string' ? JSON.parse(log.details) : (log.details || {}); } catch (e) { return "Executed system action."; }
    if (log.action === 'CREATE' && log.entity === 'Student') return `Added a new student lead to the pipeline.`;
    if (log.action === 'UPDATE' && log.entity === 'Student') {
      let changes = [];
      if (details.new_status) changes.push(`Status ➔ ${details.new_status}`);
      if (details.new_assignee) changes.push(`Reassigned ➔ ${details.new_assignee}`);
      if (details.commission_logged) changes.push(`Logged $${details.commission_logged} Commission`);
      return changes.length > 0 ? `Edited student file: ${changes.join(', ')}` : "Updated student record data.";
    }
    if (log.action === 'UPLOAD_DOC') return `Uploaded documents to vault: ${details.documents_added ? details.documents_added.join(', ') : "files"}`;
    return `Modified ${log.entity} data.`;
  };

  // --- DATA FETCHING ---
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

  const managerOptions = systemUsers.filter(u => u.role === "Corporate Agent" || u.role === "MASTER_ADMIN" || u.role === "Team Manager");

  const filteredUsers = systemUsers.filter(u => {
    const safeName = String(u.name || "").toLowerCase();
    const safeEmail = String(u.email || "").toLowerCase();
    const safeCorp = String(u.corporation_name || "").toLowerCase();
    const matchesSearch = safeName.includes(searchQuery.toLowerCase()) || safeEmail.includes(searchQuery.toLowerCase()) || safeCorp.includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === "All" || u.role === roleFilter;
    const matchesBranch = branchFilter === "All" || u.branch === branchFilter;
    const isArchived = u.is_archived === true;
    const matchesTab = viewTab === "archived" ? isArchived : !isArchived;
    return matchesSearch && matchesRole && matchesBranch && matchesTab;
  });

  // --- ACTION HANDLERS ---
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
          name: newUserName, email: newUserEmail, phone: newUserPhone, password: newUserPassword, 
          role: newUserRole, branch: newUserBranch, 
          max_capacity: newUserCapacity === "" ? 50 : Number(newUserCapacity),
          corporation_name: newUserRole === "Corporate Agent" ? newUserCorpName : "",
          parent_corporate_id: newUserParentId ? Number(newUserParentId) : null
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setNotification({type: 'success', message: 'Agent account successfully deployed.'});
        fetchData(); 
        setIsUserModalOpen(false); 
      } else {
        setNotification({type: 'error', message: Array.isArray(data.detail) ? data.detail[0].msg : (data.detail || "Error")});
      }
    } catch (err) { setNotification({type: 'error', message: 'Network error.'}); }
    finally { setIsSavingUser(false); }
  };

const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);
    try {
      const token = localStorage.getItem("fortrust_token");
      
      // EXPLICIT CLEANING: Ensuring empty strings become 0 or null
      const payload = {
        name: editingUser.name,
        role: editingUser.role,
        office_address: editingUser.office_address || "",
        phone: editingUser.phone || "",
        commission_rate: editingUser.commission_rate === "" ? 0 : parseFloat(editingUser.commission_rate),
        bank_name: editingUser.bank_name || "",
        bank_branch: editingUser.bank_branch || "",
        bank_account: editingUser.bank_account || "",
        swift_code: editingUser.swift_code || "",
        is_active: editingUser.is_active,
        max_capacity: editingUser.max_capacity === "" ? 50 : parseInt(editingUser.max_capacity),
        parent_corporate_id: editingUser.parent_corporate_id ? parseInt(editingUser.parent_corporate_id) : null
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${editingUser.id}`, {
        method: "PUT", 
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (response.ok) {
        setNotification({type: 'success', message: 'Agent updated successfully.'});
        fetchData();
        setEditingUser(null);
      } else {
        // Detailed error logging for 422
        console.error("Backend Rejected:", data);
        setNotification({type: 'error', message: `Backend Error: ${JSON.stringify(data.detail)}`});
      }
    } catch (err) { 
      setNotification({type: 'error', message: 'Network connection failed.'}); 
    }
  };

  const handleArchiveUser = async (userId: string, agentName: string) => {
    // 1. Client-side check before hitting API
    const activeCount = getAgentStudents(agentName).length;
    if (activeCount > 0) {
      alert(`Cannot archive ${agentName}: They have ${activeCount} active students. Please reassign their pipeline first.`);
      return;
    }
    if (!window.confirm(`Move ${agentName} to the Archive? They will lose system access.`)) return;
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${userId}`, { 
        method: "PUT", 
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ is_archived: true, is_active: false })
      });
      const data = await res.json();
      
      if (res.ok) {
        setNotification({type: 'success', message: `${agentName} moved to Archive.`});
        fetchData();
      } else {
        // Now you will actually see the error if the DB rejects it
        console.error("Archive Error Details:", data);
        alert(`Failed to archive: ${data.detail || "Database error."}`);
      }
    } catch (err) { 
      alert("Network error: Check your connection to the server."); 
    }
  };

  const handleRestoreUser = async (userId: string, agentName: string) => {
    if (!window.confirm(`Activate ${agentName}?`)) return;
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${userId}`, { 
        method: "PUT", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ is_archived: false, is_active: true })
      });
      if (res.ok) { setNotification({type: 'success', message: `${agentName} activated.`}); fetchData(); }
    } catch (err) {}
  };

  const initiateDeletion = (agent: any) => {
    const activeStudents = allStudents.filter(s => s.assignee === agent.name && s.status !== 'COMPLETED' && s.status !== 'REJECTED');
    if (activeStudents.length > 0) {
      setDeleteFlowState({ agent, step: 'reassign' });
    } else {
      setDeleteFlowState({ agent, step: 'confirm' });
    }
  };

  const executeBulkReassign = async () => {
    if (!reassignTarget || !deleteFlowState.agent) return;
    setIsProcessingDelete(true);
    try {
      const token = localStorage.getItem("fortrust_token");
      const activeStudents = allStudents.filter(s => s.assignee === deleteFlowState.agent.name && s.status !== 'COMPLETED' && s.status !== 'REJECTED');
      for (const student of activeStudents) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline/${student.id}`, {
          method: "PUT", headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ assignee: reassignTarget }) 
        });
      }
      setDeleteFlowState({ agent: deleteFlowState.agent, step: 'confirm' });
      fetchData();
    } catch (e) { setNotification({type: 'error', message: "Reassignment failed."}); }
    finally { setIsProcessingDelete(false); }
  };

  const executeFinalDelete = async () => {
    if (deleteConfirmationText !== deleteFlowState.agent.name) return;
    setIsProcessingDelete(true);
    try {
      const token = localStorage.getItem("fortrust_token");
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${deleteFlowState.agent.id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${token}` } });
      setDeleteFlowState({ agent: null, step: null });
      fetchData();
    } catch (err) { setNotification({type: 'error', message: "Deletion failed."}); }
    finally { setIsProcessingDelete(false); }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#BAD133] mb-4"></div>
      <p className="font-medium tracking-wide">Syncing Agent Data...</p>
    </div>
  );

  return (
    <div className="p-4 lg:p-8 max-w-[1600px] mx-auto w-full relative animate-in fade-in">
      
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

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#282860] flex items-center gap-3">
            <Briefcase className="text-[#BAD133]" size={32} /> 
            Agent Management
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Full oversight of agent velocity, win rates, and team hierarchies.</p>
        </div>
        <button onClick={() => setIsUserModalOpen(true)} className="bg-[#282860] hover:bg-[#1b1b42] active:scale-95 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-md flex items-center gap-2 shrink-0">
          <Plus size={18} /> Add New Agent
        </button>
      </div>

      {/* FILTER TABS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col overflow-hidden">
        <div className="flex px-2 pt-2 border-b border-slate-100 bg-slate-50/50">
          <button onClick={() => setViewTab('active')} className={`px-6 py-3.5 text-sm font-bold tracking-wide transition-all rounded-t-xl ${viewTab === 'active' ? 'bg-white text-[#282860] border-t border-x border-slate-200 shadow-[0_-4px_6px_-2px_rgba(0,0,0,0.02)]' : 'text-slate-400 hover:text-slate-600'}`}>
            Active Agents
          </button>
          <button onClick={() => setViewTab('archived')} className={`px-6 py-3.5 text-sm font-bold tracking-wide transition-all rounded-t-xl flex items-center gap-2 ${viewTab === 'archived' ? 'bg-white text-red-600 border-t border-x border-slate-200 shadow-[0_-4px_6px_-2px_rgba(0,0,0,0.02)]' : 'text-slate-400 hover:text-red-400'}`}>
            <Archive size={16}/> Archived Data
          </button>
          <button onClick={() => router.push('/dashboard/broadcasts')} className="px-6 py-3.5 text-sm font-bold tracking-wide transition-all rounded-t-xl flex items-center gap-2 text-slate-400 hover:text-[#282860]">
            <Megaphone size={16}/> Broadcast Hub
          </button>
        </div>

        <div className="p-4 flex flex-col md:flex-row gap-4 items-center bg-white">
          <div className="flex items-center text-slate-400 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 w-full md:w-96 focus-within:border-[#BAD133] focus-within:ring-2 focus-within:ring-[#BAD133]/20 transition-all">
            <Search size={18} className="mr-3 text-slate-400" />
            <input type="text" placeholder="Search name or corporation..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent border-none outline-none text-sm text-slate-700 w-full font-medium placeholder-slate-400" />
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

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-[#f8fafc] border-b border-slate-200 text-[10px] font-black text-slate-400 tracking-widest uppercase">
              <tr>
                <th className="px-6 py-5">Agent & Hierarchy</th>
                <th className="px-6 py-5">Pipeline Capacity</th>
                <th className="px-6 py-5">Velocity & Win Rate</th>
                <th className="px-6 py-5">Performance Audit</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr><td colSpan={5} className="p-16 text-center text-slate-400 font-medium">No agents found matching your current filters.</td></tr>
              ) : (
                filteredUsers.map((u) => {
                  const safeName = String(u.name || "Unknown");
                  const metrics = getAgentMetrics(safeName, u.id);
                  const maxCap = u.max_capacity || 50;
                  const status = getLoadStatus(metrics.active, maxCap);
                  const parentManager = u.parent_corporate_id ? systemUsers.find(su => su.id === u.parent_corporate_id) : null;

                  return (
                    <tr key={u.id} className={`hover:bg-slate-50/80 transition-colors cursor-pointer group ${u.is_archived ? 'opacity-60 grayscale' : ''}`} onClick={() => { setSelectedAgent(u); setPanelTab("overview"); }}>
                      <td className="px-6 py-5">
                        <div className="flex items-start gap-4">
                          <div className={`mt-1 w-3 h-3 rounded-full ${u.is_archived ? 'bg-slate-300' : status.color} shadow-sm ring-4 ring-white`}></div>
                          <div>
                            <span className="font-bold text-[#282860] group-hover:text-[#BAD133] transition-colors block text-base">{safeName}</span>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider mt-1 inline-block">{u.role}</span>
                            
                            {u.role === "Corporate Agent" && u.corporation_name && (
                              <p className="text-[11px] text-blue-600 font-bold flex items-center gap-1 mt-1.5"><Building size={12}/> {u.corporation_name}</p>
                            )}
                            
                            {parentManager && (
                              <p className="text-[11px] text-indigo-600 font-bold flex items-center gap-1 mt-1.5 border-l-2 border-indigo-200 pl-2 ml-1">
                                <Network size={12}/> Mgr: {parentManager.name}
                              </p>
                            )}
                            {metrics.subAgents.length > 0 && (
                              <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 mt-1.5">
                                <Users size={12}/> Manages {metrics.subAgents.length} Agents
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-5 align-top">
                        <div className="w-48">
                          <div className="flex justify-between items-end mb-1.5">
                            <span className={`text-[10px] font-black uppercase tracking-wider ${u.is_archived ? 'text-slate-400' : status.text}`}>{u.is_archived ? 'ARCHIVED' : status.label}</span>
                            <span className="text-xs font-bold text-slate-600">{metrics.active} / {maxCap}</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/50">
                            <div className={`h-2.5 rounded-full ${u.is_archived ? 'bg-slate-300' : status.color} transition-all duration-700 ease-out`} style={{ width: `${Math.min((metrics.active / maxCap) * 100, 100)}%` }}></div>
                          </div>
                          <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider flex items-center gap-1.5 mt-2"><MapPin size={12}/> {u.branch || "N/A"}</span>
                        </div>
                      </td>
                      
                      <td className="px-6 py-5 align-top">
                        <div className="flex flex-col gap-2">
                          <div className="bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg flex items-center justify-between w-36">
                            <span className="text-[10px] font-black text-emerald-700 uppercase">Win Rate</span>
                            <span className="text-sm font-black text-emerald-600">{metrics.winRate}%</span>
                          </div>
                          <div className="bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg flex items-center justify-between w-36">
                            <span className="text-[10px] font-black text-blue-700 uppercase flex items-center gap-1"><Timer size={10}/> Velocity</span>
                            <span className="text-sm font-black text-blue-600">{metrics.avgVelocity !== null ? `${metrics.avgVelocity}d` : 'N/A'}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5 align-top">
                        {metrics.warnings.length === 0 ? (
                          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-400"/> Operational Optimal</span>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            {metrics.warnings.map((warn, i) => (
                              <span key={i} className="bg-red-50 text-red-600 border border-red-100 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded flex items-center gap-1 w-max">
                                <AlertTriangle size={10}/> {warn}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-5 align-top flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        {u.is_archived ? (
                          <button onClick={() => handleRestoreUser(u.id, safeName)} className="bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"><RefreshCcw size={14}/> Reactive</button>
                        ) : (
                          <>
                            <button onClick={() => setEditingUser(u)} className="text-slate-500 hover:text-[#282860] hover:bg-slate-100 font-bold text-[11px] uppercase tracking-wider px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 border border-transparent hover:border-slate-200"><Edit2 size={14}/> Config</button>
                            <button onClick={() => handleArchiveUser(u.id, safeName)} className="text-amber-500 hover:text-white hover:bg-amber-500 bg-white border border-slate-200 hover:border-amber-500 px-3 py-2 rounded-xl text-[11px] uppercase font-bold tracking-wider transition-all flex items-center gap-1.5 shadow-sm" title="Archive Agent"><Archive size={14} /> Archive</button>
                          </>
                        )}
                        {u.is_archived && (
                          <button onClick={() => initiateDeletion(u)} className="text-red-600 hover:text-white hover:bg-red-600 bg-red-50 px-3 py-2 rounded-xl text-[11px] uppercase tracking-wider font-bold border border-red-200 transition-all flex items-center gap-1.5 shadow-sm"><Trash2 size={14} /> Delete</button>
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

      {/* --- ADVANCED DELETION MODALS --- */}
      {deleteFlowState.step === 'reassign' && deleteFlowState.agent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-amber-50 p-6 border-b border-amber-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center shrink-0"><AlertTriangle size={24}/></div>
              <div>
                <h2 className="text-xl font-black text-amber-800">Action Blocked: Active Pipeline</h2>
                <p className="text-sm text-amber-700 mt-1 font-medium">You cannot delete this agent until their students are reassigned.</p>
              </div>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-2xl bg-slate-50">
                <div><p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Agent to Delete</p><p className="font-black text-[#282860] text-lg">{deleteFlowState.agent.name}</p></div>
                <div className="text-right"><p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Students</p><p className="font-black text-red-600 text-lg">{allStudents.filter(s => s.assignee === deleteFlowState.agent.name && s.status !== 'COMPLETED' && s.status !== 'REJECTED').length}</p></div>
              </div>
              <div className="flex justify-center"><div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shadow-inner border border-slate-200"><ArrowRight size={20} className="text-slate-400 rotate-90"/></div></div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Transfer Pipeline To</label>
                <select value={reassignTarget} onChange={(e) => setReassignTarget(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-[#282860] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-slate-50 focus:bg-white cursor-pointer transition-all">
                  <option value="" disabled>-- Select New Agent --</option>
                  {systemUsers.filter(a => a.name !== deleteFlowState.agent.name && a.is_active).map(agent => (<option key={agent.id} value={agent.name}>{agent.name} ({agent.branch})</option>))}
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button onClick={() => {setDeleteFlowState({agent: null, step: null}); setReassignTarget("");}} className="px-5 py-3 text-slate-500 hover:text-slate-800 font-bold text-sm transition-colors">Cancel</button>
                <button disabled={!reassignTarget || isProcessingDelete} onClick={executeBulkReassign} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-xl transition-all disabled:opacity-50 shadow-md flex items-center justify-center gap-2">
                  {isProcessingDelete ? <><Loader2 size={16} className="animate-spin"/> Transferring...</> : "Transfer & Continue"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteFlowState.step === 'confirm' && deleteFlowState.agent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-red-50 p-6 border-b border-red-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0"><Trash2 size={24}/></div>
              <div><h2 className="text-xl font-black text-red-800">Permanent Deletion</h2><p className="text-sm text-red-700 mt-1 font-medium">This action cannot be undone.</p></div>
            </div>
            <div className="p-8 space-y-6">
              <p className="text-slate-600 text-sm leading-relaxed">You are about to permanently destroy the system profile for <strong className="text-red-600">{deleteFlowState.agent.name}</strong>. Their past actions will remain in the system logs, but they will never be able to access Fortrust OS again.</p>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Please type <span className="font-mono bg-slate-100 text-slate-800 px-1 py-0.5 rounded select-all">{deleteFlowState.agent.name}</span> to confirm.</label>
                <input type="text" value={deleteConfirmationText} onChange={(e) => setDeleteConfirmationText(e.target.value)} className="w-full px-4 py-3 border border-red-200 rounded-xl text-sm font-bold text-red-800 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50/50 focus:bg-white transition-all" placeholder="Type agent name here..." />
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button onClick={() => {setDeleteFlowState({agent: null, step: null}); setDeleteConfirmationText("");}} className="px-5 py-3 text-slate-500 hover:text-slate-800 font-bold text-sm transition-colors">Cancel</button>
                <button disabled={deleteConfirmationText !== deleteFlowState.agent.name || isProcessingDelete} onClick={executeFinalDelete} className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-3 rounded-xl transition-all disabled:opacity-50 shadow-md flex items-center justify-center gap-2">
                  {isProcessingDelete ? <><Loader2 size={16} className="animate-spin"/> Deleting...</> : "I understand, delete this agent"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- SLIDE-OUT PANEL (DETAILED DOSSIER) --- */}
      {selectedAgent && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity" onClick={() => setSelectedAgent(null)}></div>
          <div className="fixed inset-y-0 right-0 w-full sm:w-[750px] bg-[#f8fafc] shadow-2xl border-l border-slate-200 z-50 flex flex-col transform transition-transform duration-300 ease-out">
            
            <div className="p-8 border-b border-slate-100 bg-[#1b1b42] text-white flex justify-between items-start relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#BAD133] rounded-full blur-[80px] opacity-10 pointer-events-none"></div>
              <div className="relative z-10">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#BAD133] mb-2 block">Agent Dossier</span>
                <h3 className="text-3xl font-black flex items-center gap-3">
                  {selectedAgent.name || "Unknown"} 
                  {selectedAgent.is_archived && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded uppercase tracking-wider">Archived</span>}
                  {selectedAgent.is_active === false && !selectedAgent.is_archived && <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded uppercase tracking-wider">Frozen</span>}
                </h3>
                {selectedAgent.role === "Corporate Agent" && selectedAgent.corporation_name ? (
                  <p className="text-sm text-blue-300 mt-2 flex items-center gap-2"><Building size={14}/> {selectedAgent.corporation_name}</p>
                ) : (
                  <p className="text-sm text-slate-300 mt-2 flex items-center gap-2"><Mail size={14} className="text-slate-400"/> {selectedAgent.email || "N/A"}</p>
                )}
              </div>
              <button onClick={() => setSelectedAgent(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors relative z-10"><X size={24}/></button>
            </div>

            <div className="flex bg-white border-b border-slate-200 px-8 shadow-sm relative z-10 overflow-x-auto custom-scrollbar shrink-0">
              <button onClick={() => setPanelTab('overview')} className={`px-2 py-5 mr-8 text-sm font-bold tracking-wide transition-colors flex items-center gap-2 whitespace-nowrap ${panelTab === 'overview' ? 'border-b-[3px] border-[#282860] text-[#282860]' : 'text-slate-400 hover:text-slate-600 border-b-[3px] border-transparent'}`}>
                <Target size={18}/> Identity & Load
              </button>
              {(selectedAgent.role === "Corporate Agent" || selectedAgent.role === "Team Manager" || selectedAgent.role === "MASTER_ADMIN") && (
                <button onClick={() => setPanelTab('team')} className={`px-2 py-5 mr-8 text-sm font-bold tracking-wide transition-colors flex items-center gap-2 whitespace-nowrap ${panelTab === 'team' ? 'border-b-[3px] border-indigo-600 text-indigo-700' : 'text-slate-400 hover:text-slate-600 border-b-[3px] border-transparent'}`}>
                  <Network size={18}/> Team Network
                </button>
              )}
              <button onClick={() => setPanelTab('financials')} className={`px-2 py-5 mr-8 text-sm font-bold tracking-wide transition-colors flex items-center gap-2 whitespace-nowrap ${panelTab === 'financials' ? 'border-b-[3px] border-green-600 text-green-700' : 'text-slate-400 hover:text-slate-600 border-b-[3px] border-transparent'}`}>
                <DollarSign size={18}/> Financials & Bank
              </button>
              <button onClick={() => setPanelTab('history')} className={`px-2 py-5 text-sm font-bold tracking-wide transition-colors flex items-center gap-2 whitespace-nowrap ${panelTab === 'history' ? 'border-b-[3px] border-blue-600 text-blue-700' : 'text-slate-400 hover:text-slate-600 border-b-[3px] border-transparent'}`}>
                <Cctv size={18}/> System CCTV
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8">
              {panelTab === 'overview' && (() => {
                const metrics = getAgentMetrics(selectedAgent.name || "", selectedAgent.id);
                const maxCap = selectedAgent.max_capacity || 50;
                const status = getLoadStatus(metrics.active, maxCap);

                return (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    
                    {/* Performance Audit Warnings */}
                    {metrics.warnings.length > 0 && (
                      <div className="bg-red-50 border border-red-200 p-5 rounded-2xl flex items-start gap-4">
                        <div className="bg-red-100 text-red-600 p-2 rounded-full shrink-0"><AlertTriangle size={20}/></div>
                        <div>
                          <h4 className="font-black text-red-800 text-sm">Performance Flags Detected</h4>
                          <ul className="mt-2 space-y-1">
                            {metrics.warnings.map((w, i) => (
                              <li key={i} className="text-xs font-bold text-red-600 flex items-center gap-2"><span className="w-1 h-1 bg-red-600 rounded-full"></span> {w}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                         <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Contact Information</h4>
                         <div className="space-y-4">
                           <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0"><Phone size={14} className="text-blue-500"/></div>
                             <div><p className="text-[10px] font-bold text-slate-400 uppercase">Primary Phone</p><p className="text-sm font-bold text-slate-700">{selectedAgent.phone || "Not provided"}</p></div>
                           </div>
                           <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0"><Mail size={14} className="text-slate-500"/></div>
                             <div className="overflow-hidden"><p className="text-[10px] font-bold text-slate-400 uppercase">Email Address</p><p className="text-sm font-bold text-slate-700 truncate pr-2" title={selectedAgent.email}>{selectedAgent.email || "Not provided"}</p></div>
                           </div>
                           <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0"><ShieldAlert size={14} className="text-red-500"/></div>
                             <div><p className="text-[10px] font-bold text-red-400 uppercase">Emergency Contact</p><p className="text-sm font-bold text-slate-700">{selectedAgent.emergency_contact || "Not provided"}</p></div>
                           </div>
                         </div>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                         <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Assignment & Office</h4>
                         <div className="space-y-4">
                           <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0"><Users size={14} className="text-slate-500"/></div>
                             <div><p className="text-[10px] font-bold text-slate-400 uppercase">System Role</p><p className="text-sm font-bold text-slate-700">{selectedAgent.role}</p></div>
                           </div>
                           {selectedAgent.parent_corporate_id && (
                             <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0"><Network size={14} className="text-indigo-500"/></div>
                               <div><p className="text-[10px] font-bold text-slate-400 uppercase">Reports To</p><p className="text-sm font-bold text-indigo-700">{systemUsers.find(su => su.id === selectedAgent.parent_corporate_id)?.name || "Unknown"}</p></div>
                             </div>
                           )}
                           <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0"><Building size={14} className="text-slate-500"/></div>
                             <div><p className="text-[10px] font-bold text-slate-400 uppercase">Office Location</p><p className="text-sm font-bold text-slate-700 truncate pr-2" title={selectedAgent.office_address}>{selectedAgent.office_address || "Remote / Unspecified"}</p></div>
                           </div>
                         </div>
                      </div>
                    </div>

                    <div className={`p-6 rounded-2xl border bg-white shadow-sm`}>
                      <div className="flex justify-between items-center mb-5">
                        <h4 className={`font-black uppercase tracking-widest text-sm flex items-center gap-2 ${status.text}`}>
                          {status.label === "OVERLOADED" ? <AlertTriangle size={20}/> : <Activity size={20}/>} 
                          Capacity Status: {status.label}
                        </h4>
                        <span className="font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">{metrics.active} / {maxCap} Students</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden shadow-inner">
                        <div className={`h-4 rounded-full ${status.color} transition-all duration-1000 ease-out`} style={{ width: `${Math.min((metrics.active / maxCap) * 100, 100)}%` }}></div>
                      </div>
                      {status.label === "OVERLOADED" && <p className="text-xs font-bold text-red-600 mt-4 bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-2"><ShieldAlert size={16}/> System is currently blocking new assignments to this agent.</p>}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-center flex flex-col justify-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Pipeline</p>
                        <p className="text-3xl font-black text-[#282860] mt-2">{metrics.active}</p>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl shadow-sm text-center flex flex-col justify-center">
                        <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Win Rate</p>
                        <p className="text-3xl font-black text-emerald-600 mt-2">{metrics.winRate}%</p>
                      </div>
                      <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl shadow-sm text-center flex flex-col justify-center">
                        <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">Avg Velocity</p>
                        <p className="text-3xl font-black text-blue-600 mt-2">{metrics.avgVelocity ? `${metrics.avgVelocity}d` : '-'}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {panelTab === 'team' && (() => {
                const subAgents = systemUsers.filter(su => su.parent_corporate_id === selectedAgent.id);
                return (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                        <h3 className="font-black text-[#282860] flex items-center gap-2"><Network size={20} className="text-indigo-500"/> Team Roster</h3>
                        <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider">{subAgents.length} Sub-Agents</span>
                      </div>
                      
                      {subAgents.length === 0 ? (
                        <div className="text-center py-10">
                          <Users size={40} className="mx-auto text-slate-200 mb-3" />
                          <p className="text-sm font-medium text-slate-500">This user does not manage any sub-agents.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {subAgents.map(sub => {
                            const subMetrics = getAgentMetrics(sub.name, sub.id);
                            return (
                              <div key={sub.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200 transition-all">
                                <div>
                                  <p className="font-bold text-[#282860]">{sub.name}</p>
                                  <p className="text-xs text-slate-500 mt-0.5">{sub.role} • {sub.branch}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Pipeline</p>
                                  <p className="font-black text-[#282860]">{subMetrics.active}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {panelTab === 'financials' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                  <div className="bg-gradient-to-br from-[#282860] to-[#1b1b42] p-8 rounded-3xl shadow-xl relative overflow-hidden text-white border border-[#3a3a7a]">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-[#BAD133] rounded-full blur-[60px] opacity-20 -mr-10 -mt-10"></div>
                    <p className="text-xs font-bold text-[#BAD133] uppercase tracking-widest mb-2 relative z-10">Total Commission Generated</p>
                    <p className="text-5xl font-black text-white relative z-10 tracking-tight">${getAgentClosedDeals(selectedAgent.name || "").reduce((sum, s) => sum + (parseFloat(s.agent_cut || 0)), 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Landmark size={14}/> Banking Coordinates</h4>
                      <div className="grid grid-cols-2 gap-y-4">
                         <div><p className="text-[10px] font-bold text-slate-400 uppercase">Bank Name</p><p className="text-sm font-bold text-slate-700">{selectedAgent.bank_name || "Not specified"}</p></div>
                         <div><p className="text-[10px] font-bold text-slate-400 uppercase">Branch</p><p className="text-sm font-bold text-slate-700">{selectedAgent.bank_branch || "Not specified"}</p></div>
                         <div><p className="text-[10px] font-bold text-slate-400 uppercase">Account Number</p><p className="text-sm font-mono font-bold text-slate-700">{selectedAgent.bank_account || "Not specified"}</p></div>
                         <div><p className="text-[10px] font-bold text-slate-400 uppercase">SWIFT Code</p><p className="text-sm font-mono font-bold text-slate-700">{selectedAgent.swift_code || "N/A"}</p></div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3"><Percent size={20}/></div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Base Commission Rate</p>
                      <p className="text-3xl font-black text-[#282860] mt-1">{selectedAgent.commission_rate ? `${selectedAgent.commission_rate}%` : "Standard"}</p>
                    </div>
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
                    <span className="relative z-10 bg-[#1e293b] text-slate-300 border border-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg shadow-inner">{getAgentLogs(selectedAgent.name || "").length} Logs</span>
                  </div>
                  
                  {getAgentLogs(selectedAgent.name || "").length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed">
                      <Cctv size={48} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-sm text-slate-500 font-medium">No system actions recorded yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                      {getAgentLogs(selectedAgent.name || "").map(log => (
                        <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                          
                          <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#f8fafc] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm relative z-10
                            ${log.action === 'CREATE' ? 'bg-emerald-500' : log.action === 'UPDATE' ? 'bg-blue-500' : log.action === 'LOGIN' ? 'bg-indigo-500' : log.action === 'UPLOAD_DOC' ? 'bg-amber-500' : 'bg-slate-500'}`}>
                              {log.action === 'LOGIN' ? <LogIn size={14} className="text-white"/> : 
                               log.action === 'UPLOAD_DOC' ? <FileText size={14} className="text-white"/> : 
                               <Activity size={14} className="text-white"/>}
                          </div>
                          
                          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-2 border-b border-slate-50 pb-2">
                              <div className="font-black text-[#282860] text-sm">
                                {log.action === 'LOGIN' ? 'System Access' : `${log.action} • ${log.entity}`}
                              </div>
                              <time className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">{new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</time>
                            </div>
                            
                            <div className="text-xs text-slate-600 font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                              {formatLogDetails(log)}
                            </div>
                            
                            <div className="text-[10px] text-slate-400 font-medium mt-2">{new Date(log.created_at).toLocaleDateString()}</div>
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

      {/* --- ADD NEW AGENT MODAL --- */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-[#f8fafc]">
              <h2 className="text-xl font-bold text-[#282860] flex items-center gap-2"><Users size={22} className="text-[#BAD133]" /> Create New Agent</h2>
              <button onClick={() => setIsUserModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-5">
              
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">System Role</label>
                <select className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all bg-slate-50 focus:bg-white cursor-pointer" value={newUserRole} onChange={e => setNewUserRole(e.target.value)}>
                  {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {/* DYNAMIC CORPORATE / MANAGER FIELDS */}
              {newUserRole === "Corporate Agent" && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Building size={14}/> Corporation Name</label>
                  <input type="text" required placeholder="e.g. EduGlobal Partners" className="w-full px-4 py-3 border border-blue-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all bg-blue-50 focus:bg-white" value={newUserCorpName} onChange={e => setNewUserCorpName(e.target.value)} />
                </div>
              )}

              {(newUserRole === "Individual Agent" || newUserRole === "Student Counselor") && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Network size={14}/> Reports To / Team Manager</label>
                  <select className="w-full px-4 py-3 border border-blue-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all bg-blue-50 focus:bg-white cursor-pointer" value={newUserParentId} onChange={e => setNewUserParentId(e.target.value)}>
                    <option value="">None (Independent Agent)</option>
                    {managerOptions.map(m => <option key={m.id} value={m.id}>{m.name} {m.corporation_name ? `(${m.corporation_name})` : `(${m.role})`}</option>)}
                  </select>
                </div>
              )}

              <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">{newUserRole === "Corporate Agent" ? "PIC Full Name" : "Full Name"}</label><input type="text" required className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all bg-slate-50 focus:bg-white" value={newUserName} onChange={e => setNewUserName(e.target.value)} /></div>
              
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Email Address</label><input type="email" required className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all bg-slate-50 focus:bg-white" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} /></div>
                <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Phone Number</label><input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all bg-slate-50 focus:bg-white" value={newUserPhone} onChange={e => setNewUserPhone(e.target.value)} /></div>
              </div>

              <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Temporary Password</label><input type="text" required className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all bg-slate-50 focus:bg-white" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Branch</label>
                  <select className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all bg-slate-50 focus:bg-white cursor-pointer" value={newUserBranch} onChange={e => setNewUserBranch(e.target.value)}>
                    {BRANCH_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Max Pipeline Capacity</label>
                  <input type="number" required className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-[#282860] outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all bg-slate-50 focus:bg-white" value={newUserCapacity} onChange={e => setNewUserCapacity(e.target.value)} />
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
                  <h3 className="text-xs font-black text-[#282860] uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-100 pb-2"><ShieldAlert size={14} className="text-amber-500"/> Security & Identity</h3>
                  <div className="grid grid-cols-2 gap-5">
                    
                    <div><label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">System Role</label><select className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all cursor-pointer" value={editingUser.role || "Individual Agent"} onChange={e => setEditingUser({...editingUser, role: e.target.value})}>{ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>

                    {/* DYNAMIC CORPORATE FIELD */}
                    {editingUser.role === "Corporate Agent" ? (
                      <div className="animate-in fade-in slide-in-from-top-2">
                        <label className="text-[11px] font-bold text-blue-500 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Building size={12}/> Corporation Name</label>
                        <input type="text" required placeholder="Company Name" className="w-full px-4 py-3 border border-blue-200 rounded-xl text-sm bg-blue-50 focus:bg-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all" value={editingUser.corporation_name || ""} onChange={e => setEditingUser({...editingUser, corporation_name: e.target.value})} />
                      </div>
                    ) : (
                      <div className="animate-in fade-in slide-in-from-top-2">
                        <label className="text-[11px] font-bold text-blue-500 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Network size={12}/> Reports To / Manager</label>
                        <select className="w-full px-4 py-3 border border-blue-200 rounded-xl text-sm bg-blue-50 focus:bg-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all cursor-pointer" value={editingUser.parent_corporate_id || ""} onChange={e => setEditingUser({...editingUser, parent_corporate_id: e.target.value})}>
                          <option value="">None (Independent)</option>
                          {managerOptions.map(m => {
                            if (m.id === editingUser.id) return null; // Can't report to self
                            return <option key={m.id} value={m.id}>{m.name} {m.corporation_name ? `(${m.corporation_name})` : `(${m.role})`}</option>;
                          })}
                        </select>
                      </div>
                    )}

                    <div><label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">{editingUser.role === "Corporate Agent" ? "PIC Full Name" : "Account Name"}</label><input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" value={editingUser.name || ""} onChange={e => setEditingUser({...editingUser, name: e.target.value})} /></div>
                    
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block flex items-center gap-1"><Users size={12}/> Max Active Capacity</label>
                      <input type="number" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-black text-[#282860] bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" value={editingUser.max_capacity || ""} onChange={e => setEditingUser({...editingUser, max_capacity: e.target.value})} />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block text-red-500 flex items-center gap-1"><ShieldAlert size={12}/> Access Control</label>
                      <select className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20 transition-all cursor-pointer" value={editingUser.is_active === false ? "false" : "true"} onChange={e => setEditingUser({...editingUser, is_active: e.target.value === "true"})}>
                        <option value="true" className="text-emerald-600 font-bold">🟢 SYSTEM ACTIVE</option>
                        <option value="false" className="text-red-600 font-bold">🔴 FREEZE ACCOUNT</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-black text-[#282860] uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-100 pb-2"><PhoneCall size={14} className="text-blue-500"/> Contact Information</h3>
                  <div className="grid grid-cols-2 gap-5">
                    <div><label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Phone Number</label><input type="text" placeholder="e.g. +62 812..." className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" value={editingUser.phone || ""} onChange={e => setEditingUser({...editingUser, phone: e.target.value})} /></div>
                    
                    <div><label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block text-red-500">Emergency Contact</label><input type="text" placeholder="e.g. +62 812..." className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" value={editingUser.emergency_contact || ""} onChange={e => setEditingUser({...editingUser, emergency_contact: e.target.value})} /></div>
                    
                    <div className="col-span-2"><label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Office Address</label><input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" value={editingUser.office_address || ""} onChange={e => setEditingUser({...editingUser, office_address: e.target.value})} /></div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-black text-[#282860] uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-100 pb-2"><DollarSign size={14} className="text-emerald-500"/> Commission & Banking</h3>
                  <div className="grid grid-cols-2 gap-5">
                    <div><label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Bank Name</label><input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" value={editingUser.bank_name || ""} onChange={e => setEditingUser({...editingUser, bank_name: e.target.value})} /></div>
                    <div><label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Account Number</label><input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-mono bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" value={editingUser.bank_account || ""} onChange={e => setEditingUser({...editingUser, bank_account: e.target.value})} /></div>
                    <div><label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Bank Branch</label><input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" value={editingUser.bank_branch || ""} onChange={e => setEditingUser({...editingUser, bank_branch: e.target.value})} /></div>
                    
                    <div><label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Commission Rate (%)</label><input type="number" step="0.1" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-black text-emerald-600 bg-emerald-50 focus:bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" value={editingUser.commission_rate || ""} onChange={e => setEditingUser({...editingUser, commission_rate: e.target.value})} /></div>
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