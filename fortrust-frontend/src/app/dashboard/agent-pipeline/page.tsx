"use client";

import { useState, useEffect } from "react";
import {
  Users, X, Edit2, Trash2, Plus, DollarSign, Clock,
  Search, AlertTriangle, Star, History, Briefcase, MapPin
} from "lucide-react";

const BRANCH_OPTIONS = ["Jakarta", "Surabaya", "Bandung", "Bali", "Medan", "Headquarters", "Global"];
const ROLE_OPTIONS = ["Corporate Agent", "Student Counselor", "Individual Agent", "Micro Agent", "MASTER_ADMIN"];

export default function AgentManagement() {
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [branchFilter, setBranchFilter] = useState("All");
  const [tierFilter, setTierFilter] = useState("All"); // Top / Average / At Risk
  const [rangeFilter, setRangeFilter] = useState("All"); // 0-5, 6-15, 15+

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [historyAgent, setHistoryAgent] = useState<any>(null);

  // Add form
  const [newUser, setNewUser] = useState({
    name: "", email: "", password: "", role: "Individual Agent",
    branch: "Jakarta", max_capacity: 50
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

  // Flag logic
  const getFlags = (name: string, allCommissions: number[]) => {
    const flags: { icon: React.ReactNode; label: string; color: string }[] = [];
    const comm = getCommission(name);
    const sorted = [...allCommissions].sort((a, b) => b - a);
    const top10Threshold = sorted[Math.floor(sorted.length * 0.1)] ?? 0;
    if (comm >= top10Threshold && comm > 0) {
      flags.push({ icon: <Star size={18} className="fill-yellow-400 text-yellow-400" />, label: "Top 10% Performers", color: "text-yellow-600" });
    }
    if (getDropped(name).length >= 3) {
      flags.push({ icon: <AlertTriangle size={18} className="text-red-500 fill-red-100" />, label: "High Number of Dropped Students", color: "text-red-600" });
    }
    const last = getLastActivity(name);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    if (!last || last < sevenDaysAgo) {
      flags.push({ icon: <AlertTriangle size={18} className="text-amber-500 fill-amber-100" />, label: "No activity in the last 7 days", color: "text-amber-600" });
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

  // Performance tier
  const getPerfTier = (name: string, allCommissions: number[]) => {
    const comm = getCommission(name);
    const sorted = [...allCommissions].sort((a, b) => b - a);
    const top10 = sorted[Math.floor(sorted.length * 0.1)] ?? 0;
    const top50 = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
    if (comm >= top10 && comm > 0) return "Top";
    if (comm >= top50) return "Average";
    return "At Risk";
  };

  // Apply filters
  const allCommissions = systemUsers.map(u => getCommission(u.name));

  const filtered = systemUsers
    .filter(u => u.role !== "MASTER_ADMIN" || true) // keep all, master admin shown differently
    .filter(u => {
      const q = searchQuery.toLowerCase();
      const matchSearch = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchRole = roleFilter === "All" || u.role === roleFilter;
      const matchBranch = branchFilter === "All" || u.branch === branchFilter;
      const active = getActive(u.name).length;
      const matchRange =
        rangeFilter === "All" ||
        (rangeFilter === "0-5" && active <= 5) ||
        (rangeFilter === "6-15" && active >= 6 && active <= 15) ||
        (rangeFilter === "15+" && active > 15);
      const tier = getPerfTier(u.name, allCommissions);
      const matchTier = tierFilter === "All" || tier === tierFilter;
      return matchSearch && matchRole && matchBranch && matchRange && matchTier;
    });

  // Group by status
  const grouped: Record<string, any[]> = { "Inactive/On Leave": [], "Limited Capacity": [], "Active": [], "Master Admin": [] };
  filtered.forEach(u => {
    if (u.role === "MASTER_ADMIN") { grouped["Master Admin"].push(u); return; }
    grouped[getStatusGroup(u)].push(u);
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(newUser),
      });
      if (res.ok) {
        setNotification({ type: "success", message: "✅ Agent created successfully!" });
        fetchData();
        setTimeout(() => { setIsAddModalOpen(false); setNotification(null); }, 1500);
      } else {
        const d = await res.json();
        setNotification({ type: "error", message: `❌ ${d.detail}` });
      }
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
          name: editingUser.name, role: editingUser.role, branch: editingUser.branch,
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

  const AgentRow = ({ u }: { u: any }) => {
    const isMaster = u.role === "MASTER_ADMIN";
    const active = getActive(u.name).length;
    const closed = getClosed(u.name).length;
    const comm = getCommission(u.name);
    const conv = getConversionRate(u.name);
    const avg = getAvgTimePerStage(u.name);
    const flags = getFlags(u.name, allCommissions);
    const group = isMaster ? "Master Admin" : getStatusGroup(u);

    return (
      <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
        {/* Name & Email */}
        <td className="px-5 py-4">
          <div className="flex items-center gap-2">
            {!isMaster && <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getStatusDot(group)}`} />}
            <div>
              <p className={`font-bold ${isMaster ? "text-slate-400" : "text-[#282860]"}`}>{u.name}</p>
              <p className="text-[11px] text-slate-400">{u.email}</p>
            </div>
          </div>
        </td>

        {isMaster ? (
          // Master Admin special row
          <td colSpan={6} className="px-5 py-4">
            <p className="text-xs text-slate-400 italic">
              Tdk perlu ditampilkan di sini, because nobody can delete master admin (role).
            </p>
          </td>
        ) : (
          <>
            <td className="px-5 py-4 text-sm font-bold text-[#282860]">{active} Students</td>
            <td className="px-5 py-4 text-sm font-bold text-[#282860]">{conv} %</td>
            <td className="px-5 py-4 text-sm font-bold text-[#282860]">{avg}</td>
            <td className="px-5 py-4 text-sm font-bold text-[#282860]">{closed}</td>
            <td className="px-5 py-4 text-sm font-bold text-[#282860]">
              USD {comm.toLocaleString()}
            </td>
            <td className="px-5 py-4">
              {flags.length > 0 ? (
                <div className="flex items-center gap-2">
                  {flags[0].icon}
                  <span className={`text-[11px] font-bold ${flags[0].color}`}>{flags[0].label}</span>
                </div>
              ) : (
                <span className="text-[11px] text-slate-300">—</span>
              )}
            </td>
          </>
        )}

        {/* Actions */}
        <td className="px-5 py-4">
          <div className="flex items-center justify-end gap-2">
            {!isMaster && (
              <>
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
              </>
            )}
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
          <p className="text-sm text-[#BAD133] font-medium mt-1 underline underline-offset-2 cursor-pointer">
            Manage team access, monitor performance, and review activity history.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-[#282860] hover:bg-[#1b1b42] text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md"
        >
          <Plus size={18} /> Add Agent
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 mb-6 flex flex-wrap gap-3 items-center shadow-sm">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
          <Search size={14} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search Filters (Role) | Branch | Performance Tier (Top/Average/At Risk) | Active Student Range (0-5, 6-15, 15+)"
            className="bg-transparent outline-none text-xs text-slate-500 w-full"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 outline-none bg-white">
          <option value="All">All Roles</option>
          {ROLE_OPTIONS.map(r => <option key={r}>{r}</option>)}
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
        <select value={rangeFilter} onChange={e => setRangeFilter(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 outline-none bg-white">
          <option value="All">All Ranges</option>
          <option value="0-5">0–5 Students</option>
          <option value="6-15">6–15 Students</option>
          <option value="15+">15+ Students</option>
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
              {(["Inactive/On Leave", "Limited Capacity", "Active", "Master Admin"] as const).map(group => (
                grouped[group]?.length > 0 && (
                  <>
                    {/* Group Label Row */}
                    {group !== "Master Admin" && (
                      <tr key={`label-${group}`} className="bg-slate-50/80">
                        <td colSpan={8} className="px-5 py-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${getStatusDot(group)}`} />
                            <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{group}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                    {grouped[group].map(u => <AgentRow key={u.id} u={u} />)}
                  </>
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-black text-[#282860] flex items-center gap-2"><Users size={20} className="text-[#BAD133]" /> Add New Agent</h2>
              <button onClick={() => setIsAddModalOpen(false)}><X size={22} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {notification && <div className={`p-3 rounded-lg text-sm font-bold ${notification.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{notification.message}</div>}
              <div><label className="text-xs font-bold text-slate-600">Full Name</label><input required className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#BAD133]" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} /></div>
              <div><label className="text-xs font-bold text-slate-600">Email</label><input type="email" required className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#BAD133]" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} /></div>
              <div><label className="text-xs font-bold text-slate-600">Temporary Password</label><input required className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#BAD133]" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-slate-600">Role</label><select className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#BAD133]" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>{ROLE_OPTIONS.map(r => <option key={r}>{r}</option>)}</select></div>
                <div><label className="text-xs font-bold text-slate-600">Branch</label><select className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#BAD133]" value={newUser.branch} onChange={e => setNewUser({ ...newUser, branch: e.target.value })}>{BRANCH_OPTIONS.map(b => <option key={b}>{b}</option>)}</select></div>
                <div className="col-span-2"><label className="text-xs font-bold text-slate-600">Max Student Capacity</label><input type="number" className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#BAD133]" value={newUser.max_capacity} onChange={e => setNewUser({ ...newUser, max_capacity: Number(e.target.value) })} /></div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-slate-500 font-bold text-sm px-4 py-2">Cancel</button>
                <button type="submit" disabled={isSaving} className="bg-[#282860] text-white font-bold text-sm px-6 py-2 rounded-xl disabled:opacity-50">{isSaving ? "Saving..." : "Create Account"}</button>
              </div>
            </form>
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
              {notification && <div className={`p-3 rounded-lg text-sm font-bold ${notification.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{notification.message}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-slate-600">Name</label><input className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#BAD133]" value={editingUser.name} onChange={e => setEditingUser({ ...editingUser, name: e.target.value })} /></div>
                <div><label className="text-xs font-bold text-slate-600">Role</label><select className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#BAD133]" value={editingUser.role} onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}>{ROLE_OPTIONS.map(r => <option key={r}>{r}</option>)}</select></div>
                <div><label className="text-xs font-bold text-slate-600">Branch</label><select className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#BAD133]" value={editingUser.branch || "Global"} onChange={e => setEditingUser({ ...editingUser, branch: e.target.value })}>{BRANCH_OPTIONS.map(b => <option key={b}>{b}</option>)}</select></div>
                <div><label className="text-xs font-bold text-slate-600">Max Capacity</label><input type="number" className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#BAD133]" value={editingUser.max_capacity || 50} onChange={e => setEditingUser({ ...editingUser, max_capacity: Number(e.target.value) })} /></div>
                <div><label className="text-xs font-bold text-slate-600">Account Status</label><select className="w-full mt-1 p-2.5 border-2 border-red-100 rounded-lg text-sm font-bold outline-none focus:border-red-300" value={editingUser.is_active === false ? "false" : "true"} onChange={e => setEditingUser({ ...editingUser, is_active: e.target.value === "true" })}><option value="true">✅ Active</option><option value="false">❄️ Frozen</option></select></div>
                <div><label className="text-xs font-bold text-slate-600">Bank Name</label><input className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#BAD133]" value={editingUser.bank_name || ""} onChange={e => setEditingUser({ ...editingUser, bank_name: e.target.value })} /></div>
                <div><label className="text-xs font-bold text-slate-600">Account No.</label><input className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:border-[#BAD133]" value={editingUser.bank_account || ""} onChange={e => setEditingUser({ ...editingUser, bank_account: e.target.value })} /></div>
                <div><label className="text-xs font-bold text-slate-600">SWIFT Code</label><input className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:border-[#BAD133]" value={editingUser.swift_code || ""} onChange={e => setEditingUser({ ...editingUser, swift_code: e.target.value })} /></div>
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