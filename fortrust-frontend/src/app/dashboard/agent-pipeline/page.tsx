"use client";

import React, { useState, useEffect } from "react";
import {
  Users, X, Edit2, Trash2, Plus, Clock,
  Search, History, Briefcase, Building2
} from "lucide-react";

const BRANCH_OPTIONS = ["Jakarta", "Surabaya", "Bandung", "Bali", "Medan", "Headquarters", "Global"];

// Display labels — what users see — and internal values sent to backend
const ROLE_OPTIONS = [
  { label: "Corporate Agent", value: "Corporate Agent" },
  { label: "Individual Agent", value: "Individual Agent" },
  { label: "Master Admin", value: "MASTER_ADMIN" },
];

// Convert DB role → friendly label
const roleLabel = (role: string) =>
  role === "MASTER_ADMIN" ? "Master Admin" : role;

export default function AgentManagement() {
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailAgent, setDetailAgent] = useState<any>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [branchFilter, setBranchFilter] = useState("All");
  const [tierFilter, setTierFilter] = useState("All");
  const [rangeFilter, setRangeFilter] = useState("All");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [agentTypeChoice, setAgentTypeChoice] = useState<"Individual Agent" | "Corporate Agent" | null>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [historyAgent, setHistoryAgent] = useState<any>(null);

  // Individual Agent form
  const [individualForm, setIndividualForm] = useState({
    name: "", email: "", password: "", phone: "", branch: "Jakarta"
  });

  // Corporate Agent form
  const [corporateForm, setCorporateForm] = useState({
    corporation_name: "", office_address: "",
    name: "", email: "", password: "", phone: "", branch: "Jakarta",
    subAgents: [] as { name: string; email: string; wa: string; password: string }[]
  });

  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    const token = localStorage.getItem("fortrust_token");
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [usersRes, studentsRes, logsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline?role=MASTER_ADMIN`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/audit-logs`, { headers }),
      ]);
      const [u, s, l] = await Promise.all([usersRes.json(), studentsRes.json(), logsRes.json()]);
      if (u.status === "success") setSystemUsers(u.data);
      if (s.status === "success") setAllStudents(s.data);
      if (l.status === "success") setAuditLogs(l.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- Helpers ---
  const getActive = (name: string) =>
    allStudents.filter(s => s.assignee === name && !["COMPLETED", "REJECTED"].includes((s.status || "").toUpperCase()));

  const getClosed = (name: string) =>
    allStudents.filter(s => s.assignee === name && (s.status || "").toUpperCase() === "COMPLETED");

  const getDropped = (name: string) =>
    allStudents.filter(s => s.assignee === name && (s.status || "").toUpperCase() === "REJECTED");

  const getCommission = (name: string) =>
    getClosed(name).reduce((sum, s) => sum + (parseFloat(s.commission_earned) || 0), 0);

  const getLastActivity = (name: string) => {
    const logs = auditLogs.filter(l => l.changed_by === name);
    if (!logs.length) return null;
    return new Date(logs[0].created_at);
  };

  const getAvgTimePerStage = (name: string) => {
    const logs = auditLogs.filter(l => l.changed_by === name && l.action === "UPDATE");
    if (logs.length < 2) return "N/A";
    const oldest = new Date(logs[logs.length - 1].created_at).getTime();
    const newest = new Date(logs[0].created_at).getTime();
    const avgHours = Math.round((newest - oldest) / (logs.length * 3600000));
    return `${avgHours} Hours`;
  };

  const getConversionRate = (name: string) => {
    const total = getActive(name).length + getClosed(name).length;
    if (!total) return 0;
    return Math.round((getClosed(name).length / total) * 100);
  };

  // ✅ Flag logic — symbols only with native hover tooltips
  const getFlags = (name: string, allCommissions: number[]) => {
    const flags: { icon: string; label: string; color: string }[] = [];
    const comm = getCommission(name);
    const sorted = [...allCommissions].sort((a, b) => b - a);
    const top10Threshold = sorted[Math.floor(sorted.length * 0.1)] ?? 0;

    if (comm >= top10Threshold && comm > 0) {
      flags.push({ icon: "🏆", label: "Top 10% Performance", color: "text-yellow-500" });
    }
    if (getDropped(name).length >= 3) {
      flags.push({ icon: "〽️", label: "High Number of drop Students", color: "text-red-500" });
    }
    const last = getLastActivity(name);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    if (!last || last < sevenDaysAgo) {
      flags.push({ icon: "⚠️", label: "No Activities in the last 7 days", color: "text-amber-500" });
    }
    return flags;
  };

  // Status grouping
  const getStatusGroup = (u: any) => {
    if (u.is_active === false) return "Inactive/On Leave";
    const active = getActive(u.name).length;
    const max = u.max_capacity || 50;
    if (active / max >= 0.8) return "Limited Capacity";
    return "Active";
  };

  const getStatusDot = (group: string) => {
    if (group === "Inactive/On Leave") return "bg-red-500";
    if (group === "Limited Capacity") return "bg-yellow-400";
    return "bg-green-500";
  };

  const getPerfTier = (name: string, allCommissions: number[]) => {
    const comm = getCommission(name);
    const sorted = [...allCommissions].sort((a, b) => b - a);
    const top10 = sorted[Math.floor(sorted.length * 0.1)] ?? 0;
    const top50 = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
    if (comm >= top10 && comm > 0) return "Top";
    if (comm >= top50) return "Average";
    return "At Risk";
  };

  // ✅ Hide MASTER_ADMIN from directory completely
  const allCommissions = systemUsers
    .filter(u => u.role !== "MASTER_ADMIN")
    .map(u => getCommission(u.name));

  const filtered = systemUsers
    .filter(u => u.role !== "MASTER_ADMIN")
    .filter(u => {
      const q = searchQuery.toLowerCase();
      const matchSearch = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchRole = roleFilter === "All" || u.role === roleFilter;
      const matchBranch = branchFilter === "All" || u.branch === branchFilter;
      const active = getActive(u.name).length;
      // ✅ Updated ranges: 1-20, 21-40, 40+
      const matchRange =
        rangeFilter === "All" ||
        (rangeFilter === "1-20" && active >= 1 && active <= 20) ||
        (rangeFilter === "21-40" && active >= 21 && active <= 40) ||
        (rangeFilter === "40+" && active > 40);
      const tier = getPerfTier(u.name, allCommissions);
      const matchTier = tierFilter === "All" || tier === tierFilter;
      return matchSearch && matchRole && matchBranch && matchRange && matchTier;
    });

  const grouped: Record<string, any[]> = {
    "Inactive/On Leave": [],
    "Limited Capacity": [],
    "Active": []
  };
  filtered.forEach(u => { grouped[getStatusGroup(u)].push(u); });

  // ---------------- Submission Handlers ----------------
  const createSingleUser = async (payload: any) => {
    const token = localStorage.getItem("fortrust_token");
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    return res;
  };

  const handleCreateIndividual = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await createSingleUser({
        name: individualForm.name,
        email: individualForm.email,
        password: individualForm.password,
        phone: individualForm.phone,
        branch: individualForm.branch,
        role: "Individual Agent",
        agent_type: "Individual Agent"
      });
      if (res.ok) {
        setNotification({ type: "success", message: "✅ Individual Agent created!" });
        fetchData();
        setTimeout(() => {
          setIsAddModalOpen(false);
          setAgentTypeChoice(null);
          setIndividualForm({ name: "", email: "", password: "", phone: "", branch: "Jakarta" });
          setNotification(null);
        }, 1500);
      } else {
        const d = await res.json();
        setNotification({ type: "error", message: `❌ ${d.detail}` });
      }
    } catch { setNotification({ type: "error", message: "❌ Network error." }); }
    finally { setIsSaving(false); }
  };

  const handleCreateCorporate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // 1) Create the corporate owner account
      const ownerRes = await createSingleUser({
        name: corporateForm.name,
        email: corporateForm.email,
        password: corporateForm.password,
        phone: corporateForm.phone,
        branch: corporateForm.branch,
        role: "Corporate Agent",
        agent_type: "Corporate Agent",
        corporation_name: corporateForm.corporation_name
      });

      if (!ownerRes.ok) {
        const d = await ownerRes.json();
        setNotification({ type: "error", message: `❌ Owner: ${d.detail}` });
        setIsSaving(false);
        return;
      }

      // 2) Create each sub-agent linked to the corporation
      let subSuccess = 0;
      let subFailed = 0;
      for (const sub of corporateForm.subAgents) {
        if (!sub.name || !sub.email || !sub.password) continue;
        const r = await createSingleUser({
          name: sub.name,
          email: sub.email,
          password: sub.password,
          phone: sub.wa,
          branch: corporateForm.branch,
          role: "Individual Agent",
          agent_type: "Sub Agent",
          corporation_name: corporateForm.corporation_name
        });
        if (r.ok) subSuccess++; else subFailed++;
      }

      setNotification({
        type: "success",
        message: `✅ Corporate created. Sub-agents: ${subSuccess} ok${subFailed ? `, ${subFailed} failed` : ""}`
      });
      fetchData();
      setTimeout(() => {
        setIsAddModalOpen(false);
        setAgentTypeChoice(null);
        setCorporateForm({
          corporation_name: "", office_address: "",
          name: "", email: "", password: "", phone: "", branch: "Jakarta",
          subAgents: []
        });
        setNotification(null);
      }, 2000);
    } catch { setNotification({ type: "error", message: "❌ Network error." }); }
    finally { setIsSaving(false); }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: editingUser.name, email: editingUser.email, phone: editingUser.phone, role: editingUser.role, branch: editingUser.branch,
          bank_name: editingUser.bank_name, bank_branch: editingUser.bank_branch,
          bank_account: editingUser.bank_account, swift_code: editingUser.swift_code,
          is_active: editingUser.is_active, max_capacity: editingUser.max_capacity
        }),
      });
      if (res.ok) {
        setNotification({ type: "success", message: "✅ Updated!" });
        fetchData();
        setTimeout(() => { setEditingUser(null); setNotification(null); }, 1500);
      }
    } catch { setNotification({ type: "error", message: "❌ Network error." }); }
  };

  const handleDelete = async (userId: string, name: string) => {
    if (!window.confirm(`Archive ${name}?`)) return;
    const token = localStorage.getItem("fortrust_token");
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${userId}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` }
    });
    fetchData();
  };

  if (loading) return <div className="p-16 text-center text-slate-400 animate-pulse">Loading Agents...</div>;

  // Single Agent Row
  const AgentRow = ({ u }: { u: any }) => {
    const active = getActive(u.name).length;
    const closed = getClosed(u.name).length;
    const comm = getCommission(u.name);
    const conv = getConversionRate(u.name);
    const avg = getAvgTimePerStage(u.name);
    const flags = getFlags(u.name, allCommissions);
    const group = getStatusGroup(u);

    return (
      <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
        <td className="px-5 py-4">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getStatusDot(group)}`} />
            <button
              onClick={() => setDetailAgent(u)}
              className="text-left hover:underline"
            >
              <p className="font-bold text-[#282860] hover:text-[#BAD133] transition-colors">{u.name}</p>
              <p className="text-[11px] text-slate-400">{u.email}</p>
            </button>
          </div>
        </td>
        <td className="px-5 py-4 text-sm font-bold text-[#282860]">{active} Students</td>
        <td className="px-5 py-4 text-sm font-bold text-[#282860]">{conv} %</td>
        <td className="px-5 py-4 text-sm font-bold text-[#282860]">{avg}</td>
        <td className="px-5 py-4 text-sm font-bold text-[#282860]">{closed}</td>
        <td className="px-5 py-4 text-sm font-bold text-[#282860]">USD {comm.toLocaleString()}</td>

        {/* ✅ Symbols-only flags with native tooltips */}
        <td className="px-5 py-4">
          {flags.length > 0 ? (
            <div className="flex items-center gap-2">
              {flags.map((f, i) => (
                <span key={i} title={f.label} className="text-xl cursor-help">
                  {f.icon}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-[11px] text-slate-300">—</span>
          )}
        </td>

        <td className="px-5 py-4">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setHistoryAgent(u)}
              className="border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
            >
              <History size={13} /> HISTORY
            </button>
            <button
              onClick={() => setEditingUser(u)}
              className="border border-[#BAD133] text-[#9bb029] hover:bg-[#BAD133] hover:text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
            >
              <Edit2 size={13} /> EDIT
            </button>
            <button
              onClick={() => handleDelete(u.id, u.name)}
              className="text-red-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="p-4 lg:p-8 max-w-[1500px] mx-auto w-full">

      {notification && (
        <div className={`mb-4 p-4 rounded-xl font-bold flex justify-between items-center
          ${notification.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {notification.message}
          <button onClick={() => setNotification(null)}><X size={16} /></button>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <h1 className="text-3xl font-black text-[#282860] flex items-center gap-3">
            <Briefcase className="text-[#BAD133]" size={32} />
            <span>Agent <span className="font-light">- Management</span></span>
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Manage team access, monitor performance, and review activity history.
          </p>
        </div>
        <button
          onClick={() => { setIsAddModalOpen(true); setAgentTypeChoice(null); }}
          className="bg-[#282860] hover:bg-[#1b1b42] text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md"
        >
          <Plus size={18} /> Add Agent
        </button>
      </div>

      {/* ✅ Single search bar with short placeholder */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 mb-6 flex flex-wrap gap-3 items-center shadow-sm">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
          <Search size={14} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            className="bg-transparent outline-none text-xs text-slate-600 w-full"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 outline-none bg-white">
          <option value="All">All Roles</option>
          <option value="Corporate Agent">Corporate Agent</option>
          <option value="Individual Agent">Individual Agent</option>
        </select>
        <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 outline-none bg-white">
          <option value="All">All Branches</option>
          {BRANCH_OPTIONS.map(b => <option key={b}>{b}</option>)}
        </select>
        <select value={tierFilter} onChange={e => setTierFilter(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 outline-none bg-white">
          <option value="All">All Tiers</option>
          <option value="Top">Top</option>
          <option value="Average">Average</option>
          <option value="At Risk">At Risk</option>
        </select>
        {/* ✅ Updated ranges */}
        <select value={rangeFilter} onChange={e => setRangeFilter(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 outline-none bg-white">
          <option value="All">All Ranges</option>
          <option value="1-20">1–20 Students</option>
          <option value="21-40">21–40 Students</option>
          <option value="40+">40+ Students</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1100px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Name & Email</th>
                <th className="px-5 py-3">
                  <p className="text-[10px] font-black text-slate-500 uppercase">Active Students</p>
                  <p className="text-[9px] text-slate-400">Current Workload</p>
                </th>
                <th className="px-5 py-3">
                  <p className="text-[10px] font-black text-slate-500 uppercase">Conversion Rate %</p>
                  <p className="text-[9px] text-slate-400">Agent Quality</p>
                </th>
                <th className="px-5 py-3">
                  <p className="text-[10px] font-black text-slate-500 uppercase">Avg Time / Stage</p>
                  <p className="text-[9px] text-slate-400">Speed & Efficiency</p>
                </th>
                <th className="px-5 py-3">
                  <p className="text-[10px] font-black text-slate-500 uppercase">Deals Closed</p>
                  <p className="text-[9px] text-slate-400">Revenue Contribution</p>
                </th>
                <th className="px-5 py-3">
                  <p className="text-[10px] font-black text-slate-500 uppercase">Commission Generated</p>
                  <p className="text-[9px] text-slate-400">Direct Business Impact</p>
                </th>
                <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase">Flags</th>
                <th className="px-5 py-3 text-right text-[10px] font-black text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(["Inactive/On Leave", "Limited Capacity", "Active"] as const).map(group => (
                grouped[group]?.length > 0 && (
                  <React.Fragment key={group}>
                    <tr className="bg-slate-50/80">
                      <td colSpan={8} className="px-5 py-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusDot(group)}`} />
                          <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{group}</span>
                        </div>
                      </td>
                    </tr>
                    {grouped[group].map(u => <AgentRow key={u.id} u={u} />)}
                  </React.Fragment>
                )
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* HISTORY MODAL */}
      {historyAgent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="p-5 border-b flex justify-between items-center bg-[#1b1b42] text-white rounded-t-2xl">
              <div>
                <p className="text-xs text-[#BAD133] font-bold uppercase tracking-widest">System CCTV</p>
                <h3 className="text-lg font-black">{historyAgent.name}</h3>
              </div>
              <button onClick={() => setHistoryAgent(null)} className="p-1.5 hover:bg-white/20 rounded-full"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {auditLogs.filter(l => l.changed_by === historyAgent.name).length === 0 ? (
                <p className="text-center text-slate-400 italic py-10">No activity logged yet.</p>
              ) : auditLogs.filter(l => l.changed_by === historyAgent.name).map(log => (
                <div key={log.id} className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-start gap-3">
                  <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${log.action === "CREATE" ? "bg-green-500" : log.action === "UPDATE" ? "bg-blue-500" : "bg-amber-500"}`} />
                  <div>
                    <p className="text-sm font-bold text-slate-700">{log.action} on <span className="text-[#282860]">{log.entity}</span></p>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock size={11} /> {new Date(log.created_at).toLocaleString()}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500 bg-white border border-slate-100 p-2 rounded mt-2">{JSON.stringify(log.details)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ADD AGENT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-black text-[#282860] flex items-center gap-2">
                <Users size={20} className="text-[#BAD133]" /> Add New Agent
              </h2>
              <button onClick={() => { setIsAddModalOpen(false); setAgentTypeChoice(null); }}>
                <X size={22} className="text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {notification && (
                <div className={`p-3 mb-4 rounded-lg text-sm font-bold ${notification.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                  {notification.message}
                </div>
              )}

              {/* STEP 1: Type Picker */}
              {!agentTypeChoice && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-500 font-medium">What type of agent are you adding?</p>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setAgentTypeChoice("Individual Agent")}
                      className="border-2 border-slate-200 hover:border-[#BAD133] hover:bg-[#BAD133]/5 p-6 rounded-2xl text-left transition-all"
                    >
                      <Users className="text-[#BAD133] mb-3" size={32} />
                      <p className="font-black text-[#282860] text-lg">Individual Agent</p>
                      <p className="text-xs text-slate-500 mt-1">Single agent account with personal credentials.</p>
                    </button>
                    <button
                      onClick={() => setAgentTypeChoice("Corporate Agent")}
                      className="border-2 border-slate-200 hover:border-[#BAD133] hover:bg-[#BAD133]/5 p-6 rounded-2xl text-left transition-all"
                    >
                      <Building2 className="text-[#BAD133] mb-3" size={32} />
                      <p className="font-black text-[#282860] text-lg">Corporate Agent</p>
                      <p className="text-xs text-slate-500 mt-1">Company account + sub-agents under it.</p>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2A: Individual Agent Form */}
              {agentTypeChoice === "Individual Agent" && (
                <form onSubmit={handleCreateIndividual} className="space-y-4">
                  <button type="button" onClick={() => setAgentTypeChoice(null)} className="text-xs text-slate-400 hover:text-slate-600 mb-2">← Change type</button>
                  <div>
                    <label className="text-xs font-bold text-slate-600">Full Name</label>
                    <input required className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#BAD133]"
                      value={individualForm.name} onChange={e => setIndividualForm({ ...individualForm, name: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600">Email</label>
                      <input type="email" required className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#BAD133]"
                        value={individualForm.email} onChange={e => setIndividualForm({ ...individualForm, email: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600">Mobile Number</label>
                      <input className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#BAD133]"
                        value={individualForm.phone} onChange={e => setIndividualForm({ ...individualForm, phone: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600">Temporary Password</label>
                      <input required className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#BAD133]"
                        value={individualForm.password} onChange={e => setIndividualForm({ ...individualForm, password: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600">Branch</label>
                      <select className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#BAD133]"
                        value={individualForm.branch} onChange={e => setIndividualForm({ ...individualForm, branch: e.target.value })}>
                        {BRANCH_OPTIONS.map(b => <option key={b}>{b}</option>)}
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 italic">Max Student Capacity can be set later from the agent's detail page.</p>
                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => { setIsAddModalOpen(false); setAgentTypeChoice(null); }} className="text-slate-500 font-bold text-sm px-4 py-2">Cancel</button>
                    <button type="submit" disabled={isSaving} className="bg-[#282860] text-white font-bold text-sm px-6 py-2 rounded-xl disabled:opacity-50">
                      {isSaving ? "Saving..." : "Create Account"}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2B: Corporate Agent Form */}
              {agentTypeChoice === "Corporate Agent" && (
                <form onSubmit={handleCreateCorporate} className="space-y-5">
                  <button type="button" onClick={() => setAgentTypeChoice(null)} className="text-xs text-slate-400 hover:text-slate-600 mb-2">← Change type</button>

                  {/* Company Section */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Company Details</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="text-xs font-bold text-slate-600">Company / Corporation Name</label>
                        <input required className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#BAD133] bg-white"
                          value={corporateForm.corporation_name} onChange={e => setCorporateForm({ ...corporateForm, corporation_name: e.target.value })} />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-bold text-slate-600">Office Address</label>
                        <input className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#BAD133] bg-white"
                          value={corporateForm.office_address} onChange={e => setCorporateForm({ ...corporateForm, office_address: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600">Branch</label>
                        <select className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#BAD133] bg-white"
                          value={corporateForm.branch} onChange={e => setCorporateForm({ ...corporateForm, branch: e.target.value })}>
                          {BRANCH_OPTIONS.map(b => <option key={b}>{b}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Owner Section */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Account Owner (Login)</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-600">Owner Name</label>
                        <input required className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#BAD133] bg-white"
                          value={corporateForm.name} onChange={e => setCorporateForm({ ...corporateForm, name: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600">Owner Email</label>
                        <input type="email" required className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#BAD133] bg-white"
                          value={corporateForm.email} onChange={e => setCorporateForm({ ...corporateForm, email: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600">Mobile Number</label>
                        <input className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#BAD133] bg-white"
                          value={corporateForm.phone} onChange={e => setCorporateForm({ ...corporateForm, phone: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600">Temporary Password</label>
                        <input required className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#BAD133] bg-white"
                          value={corporateForm.password} onChange={e => setCorporateForm({ ...corporateForm, password: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  {/* Sub-Agents Section */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sub-Agents Under This Corporation</p>
                      <button type="button"
                        onClick={() => setCorporateForm({ ...corporateForm, subAgents: [...corporateForm.subAgents, { name: "", email: "", wa: "", password: "" }] })}
                        className="text-[#BAD133] font-bold text-xs flex items-center gap-1 hover:text-[#9bb029]"
                      >
                        <Plus size={14} /> Add Row
                      </button>
                    </div>

                    {corporateForm.subAgents.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center py-4">No sub-agents yet. Click "Add Row" to register one.</p>
                    ) : (
                      <div className="space-y-2">
                        <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-500 uppercase px-1">
                          <div className="col-span-1">#</div>
                          <div className="col-span-3">Name</div>
                          <div className="col-span-3">Email</div>
                          <div className="col-span-2">WA</div>
                          <div className="col-span-2">Password</div>
                          <div className="col-span-1"></div>
                        </div>
                        {corporateForm.subAgents.map((sub, i) => (
                          <div key={i} className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-1 text-xs font-bold text-slate-400">{i + 1}.</div>
                            <input className="col-span-3 p-2 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-[#BAD133]"
                              placeholder="Name" value={sub.name}
                              onChange={e => { const c = [...corporateForm.subAgents]; c[i].name = e.target.value; setCorporateForm({ ...corporateForm, subAgents: c }); }} />
                            <input className="col-span-3 p-2 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-[#BAD133]"
                              placeholder="Email" type="email" value={sub.email}
                              onChange={e => { const c = [...corporateForm.subAgents]; c[i].email = e.target.value; setCorporateForm({ ...corporateForm, subAgents: c }); }} />
                            <input className="col-span-2 p-2 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-[#BAD133]"
                              placeholder="WA" value={sub.wa}
                              onChange={e => { const c = [...corporateForm.subAgents]; c[i].wa = e.target.value; setCorporateForm({ ...corporateForm, subAgents: c }); }} />
                            <input className="col-span-2 p-2 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-[#BAD133]"
                              placeholder="Password" value={sub.password}
                              onChange={e => { const c = [...corporateForm.subAgents]; c[i].password = e.target.value; setCorporateForm({ ...corporateForm, subAgents: c }); }} />
                            <button type="button"
                              onClick={() => setCorporateForm({ ...corporateForm, subAgents: corporateForm.subAgents.filter((_, idx) => idx !== i) })}
                              className="col-span-1 text-red-400 hover:text-red-600">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 italic">Max Student Capacity for each agent can be set later from their detail page.</p>

                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => { setIsAddModalOpen(false); setAgentTypeChoice(null); }} className="text-slate-500 font-bold text-sm px-4 py-2">Cancel</button>
                    <button type="submit" disabled={isSaving} className="bg-[#282860] text-white font-bold text-sm px-6 py-2 rounded-xl disabled:opacity-50">
                      {isSaving ? "Saving..." : "Create Corporate + Sub-Agents"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-black text-[#282860] flex items-center gap-2"><Edit2 size={18} className="text-[#BAD133]" /> Edit Agent</h2>
              <button onClick={() => setEditingUser(null)}><X size={22} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleEditUser} className="p-6 space-y-4">
              {notification && (
                <div className={`p-3 rounded-lg text-sm font-bold ${notification.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                  {notification.message}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600">Name</label>
                  <input className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#BAD133]"
                    value={editingUser.name} onChange={e => setEditingUser({ ...editingUser, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600">Role</label>
                  <select className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#BAD133]"
                    value={editingUser.role} onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}>
                    {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600">Branch</label>
                  <select className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#BAD133]"
                    value={editingUser.branch || "Global"} onChange={e => setEditingUser({ ...editingUser, branch: e.target.value })}>
                    {BRANCH_OPTIONS.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600">Max Capacity</label>
                  <input type="number" className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#BAD133]"
                    value={editingUser.max_capacity || 50}
                    onChange={e => setEditingUser({ ...editingUser, max_capacity: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600">Account Status</label>
                  <select className="w-full mt-1 p-2.5 border-2 border-red-100 rounded-lg text-sm font-bold outline-none focus:border-red-300"
                    value={editingUser.is_active === false ? "false" : "true"}
                    onChange={e => setEditingUser({ ...editingUser, is_active: e.target.value === "true" })}>
                    <option value="true">✅ Active</option>
                    <option value="false">❄️ Frozen</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600">Bank Name</label>
                  <input className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#BAD133]"
                    value={editingUser.bank_name || ""} onChange={e => setEditingUser({ ...editingUser, bank_name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600">Account No.</label>
                  <input className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:border-[#BAD133]"
                    value={editingUser.bank_account || ""} onChange={e => setEditingUser({ ...editingUser, bank_account: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600">SWIFT Code</label>
                  <input className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:border-[#BAD133]"
                    value={editingUser.swift_code || ""} onChange={e => setEditingUser({ ...editingUser, swift_code: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditingUser(null)} className="text-slate-500 font-bold text-sm px-4 py-2">Cancel</button>
                <button type="submit" className="bg-[#282860] text-white font-bold text-sm px-6 py-2 rounded-xl">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}