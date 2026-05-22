"use client";

import { useState, useEffect } from "react";
import { Users, X, ShieldAlert, CheckCircle, Edit2, Trash2, Plus, DollarSign, Activity, Target, Mail, MapPin } from "lucide-react";

const BRANCH_OPTIONS = ["Jakarta", "Surabaya", "Bandung", "Bali", "Medan", "Headquarters"];
const ROLE_OPTIONS = ["Corporate Agent", "Student Counselor", "Individual Agent", "MASTER_ADMIN"];

export default function AgentsDirectory() {
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{type: 'success'|'error', message: string} | null>(null);

  // User Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("Individual Agent");
  const [newUserBranch, setNewUserBranch] = useState("Jakarta");
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Detail & Edit States
  const [selectedAgent, setSelectedAgent] = useState<any>(null); // Controls the Slide-Out Panel
  const [editingUser, setEditingUser] = useState<any>(null); // Controls the Edit Bank Details Modal

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
      console.error("Failed to fetch data:", error);
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
        body: JSON.stringify({ name: newUserName, email: newUserEmail, password: newUserPassword, role: newUserRole, branch: newUserBranch }),
      });
      const data = await response.json();
      
      if (response.ok) {
        setNotification({type: 'success', message: '✅ Agent account created securely!'});
        fetchData(); 
        setTimeout(() => { setIsUserModalOpen(false); setNewUserName(""); setNewUserEmail(""); setNewUserPassword(""); setNotification(null); }, 1500);
      } else setNotification({type: 'error', message: `❌ ${data.detail || "Failed to create user."}`});
    } catch (err) { setNotification({type: 'error', message: '❌ Network error.'}); } finally { setIsSavingUser(false); }
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
          name: editingUser.name, role: editingUser.role, office_address: editingUser.office_address, bank_name: editingUser.bank_name,
          bank_branch: editingUser.bank_branch, bank_address: editingUser.bank_address, bank_account: editingUser.bank_account,
          swift_code: editingUser.swift_code, is_active: editingUser.is_active
        }),
      });
      if (response.ok) {
        setNotification({type: 'success', message: '✅ Profile updated!'});
        fetchData();
        setTimeout(() => { setEditingUser(null); setNotification(null); }, 1500);
      } else setNotification({type: 'error', message: '❌ Failed to update.'});
    } catch (err) { setNotification({type: 'error', message: '❌ Network error.'}); }
  };
  
  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this agent?")) return;
    try {
      const token = localStorage.getItem("fortrust_token");
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${userId}`, { method: "DELETE", headers: { "Authorization": `Bearer ${token}` } });
      fetchData();
    } catch (err) { alert("Failed to delete user"); }
  };

  // Helper functions for the slide-out panel metrics
  const getAgentStudents = (agentName: string) => allStudents.filter(s => s.assignee === agentName);
  const getAgentLogs = (agentName: string) => auditLogs.filter(log => log.changed_by === agentName).slice(0, 10); // Show last 10 actions

  if (loading) return <div className="p-16 text-center text-slate-400 font-medium animate-pulse">Loading Agents...</div>;

  return (
    <div className="p-4 lg:p-8 max-w-[1400px] mx-auto w-full relative">
      {notification && (
        <div className={`mb-6 p-4 rounded-xl font-bold flex items-center justify-between shadow-sm animate-in slide-in-from-top-2
          ${notification.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {notification.message}
          <button onClick={() => setNotification(null)} className="opacity-50 hover:opacity-100"><X size={18} /></button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#282860] flex items-center gap-3"><Users className="text-[#BAD133]" size={36} /> Agent Directory</h1>
          <p className="text-slate-500 mt-2 font-medium">Manage team access, monitor performance, and review agent activity.</p>
        </div>
        <button onClick={() => setIsUserModalOpen(true)} className="bg-[#282860] hover:bg-[#1b1b42] text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-md flex items-center gap-2">
          <Plus size={18} /> Add Agent
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-[#f8fafc] border-b border-slate-200 text-[10px] font-black text-slate-500 tracking-wider uppercase">
              <tr><th className="px-5 py-4">Name & Email</th><th className="px-5 py-4">Role</th><th className="px-5 py-4">Branch</th><th className="px-5 py-4">Total Pipeline</th><th className="px-5 py-4 text-right">Actions</th></tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {systemUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => setSelectedAgent(u)}>
                  <td className="px-5 py-4"><span className="font-bold text-[#282860] group-hover:text-[#BAD133] transition-colors block">{u.name}</span><span className="text-[11px] text-slate-500 block mt-0.5">{u.email}</span></td>
                  <td className="px-5 py-4">
                    <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md text-[10px] font-bold mr-2">{u.role}</span>
                    {u.is_active === false && <span className="bg-red-100 text-red-700 px-2 py-1 rounded-md text-[10px] font-bold">FROZEN</span>}
                  </td>
                  <td className="px-5 py-4 font-bold text-slate-600 text-xs flex items-center gap-1 mt-1"><MapPin size={12}/> {u.branch}</td>
                  <td className="px-5 py-4 font-black text-slate-500">{getAgentStudents(u.name).length} Students</td>
                  <td className="px-5 py-4 flex justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setEditingUser(u)} className="text-[#BAD133] hover:text-white hover:bg-[#BAD133] font-bold text-xs uppercase tracking-wider bg-slate-50 px-3 py-1.5 rounded-lg border border-[#BAD133] transition-colors">Edit Config</button>
                    <button onClick={() => handleDeleteUser(u.id)} className="text-red-400 hover:text-white hover:bg-red-500 bg-red-50 px-2 py-1.5 rounded-lg border border-red-100 transition-colors" title="Delete Agent"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- SLIDE-OUT PANEL: AGENT DETAILS --- */}
      {selectedAgent && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40" onClick={() => setSelectedAgent(null)}></div>
          <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col transform transition-transform duration-300">
            
            {/* Panel Header */}
            <div className="p-6 border-b border-slate-100 bg-[#1b1b42] text-white flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#BAD133] mb-1 block">Agent Profile</span>
                <h3 className="text-2xl font-black">{selectedAgent.name}</h3>
                <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5"><Mail size={12}/> {selectedAgent.email}</p>
              </div>
              <button onClick={() => setSelectedAgent(null)} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={20}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50">
              
              {/* Performance Metrics */}
              <div className="p-6 pb-2">
                <p className="text-[10px] font-bold text-[#BAD133] uppercase tracking-widest flex items-center gap-2 mb-3"><Target size={14}/> Pipeline Performance</p>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-center">
                    <p className="text-xs font-bold text-slate-500 uppercase">Active Students</p>
                    <p className="text-2xl font-black text-[#282860] mt-1">{getAgentStudents(selectedAgent.name).length}</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl shadow-sm text-center">
                    <p className="text-xs font-bold text-emerald-700 uppercase">Closed Deals</p>
                    <p className="text-2xl font-black text-emerald-600 mt-1">{getAgentStudents(selectedAgent.name).filter(s => s.status?.toUpperCase() === "COMPLETED").length}</p>
                  </div>
                  <div className="col-span-2 bg-gradient-to-br from-[#282860] to-[#1b1b42] p-4 rounded-xl border border-slate-700 shadow-inner flex justify-between items-center text-white">
                    <div className="flex items-center gap-2"><DollarSign className="text-[#BAD133]" size={20}/> <span className="font-bold text-sm">Commission Generated</span></div>
                    <span className="font-black text-lg text-[#BAD133]">
                      ${getAgentStudents(selectedAgent.name).reduce((sum, s) => sum + (parseFloat(s.agent_cut || 0)), 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Security & Bank Config */}
              <div className="px-6 py-4 border-t border-slate-200 bg-white">
                 <p className="text-[10px] font-bold text-[#BAD133] uppercase tracking-widest mb-3">System Configuration</p>
                 <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex justify-between border-b border-slate-100 pb-2"><span className="font-bold">Role:</span> <span>{selectedAgent.role}</span></div>
                    <div className="flex justify-between border-b border-slate-100 pb-2"><span className="font-bold">Branch:</span> <span>{selectedAgent.branch}</span></div>
                    <div className="flex justify-between border-b border-slate-100 pb-2"><span className="font-bold">Bank Name:</span> <span>{selectedAgent.bank_name || <span className="italic text-slate-400">Not Setup</span>}</span></div>
                    <div className="flex justify-between pb-1"><span className="font-bold">Bank Acc:</span> <span className="font-mono text-xs">{selectedAgent.bank_account || <span className="italic text-slate-400">Not Setup</span>}</span></div>
                 </div>
              </div>

              {/* Agent Activity Feed (CCTV) */}
              <div className="p-6 border-t border-slate-200">
                <p className="text-[10px] font-bold text-[#BAD133] uppercase tracking-widest flex items-center gap-2 mb-4"><Activity size={14}/> Recent Activity (CCTV)</p>
                <div className="space-y-4">
                  {getAgentLogs(selectedAgent.name).length === 0 ? (
                    <p className="text-center text-sm text-slate-400 italic">No actions logged recently.</p>
                  ) : (
                    getAgentLogs(selectedAgent.name).map(log => (
                      <div key={log.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3">
                        <div className={`mt-1 flex-shrink-0 w-2 h-2 rounded-full ${log.action === 'CREATE' ? 'bg-green-500' : log.action === 'UPDATE' ? 'bg-blue-500' : 'bg-amber-500'}`}></div>
                        <div>
                          <p className="text-sm font-bold text-slate-700">{log.action === 'UPDATE' ? 'Updated' : log.action === 'CREATE' ? 'Created' : 'Action on'} <span className="text-[#282860]">{log.entity}</span></p>
                          <p className="text-xs text-slate-400 mt-0.5">{new Date(log.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        </>
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
              <div><label className="text-xs font-bold text-slate-700">Full Name</label><input type="text" required className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#BAD133]" value={newUserName} onChange={e => setNewUserName(e.target.value)} /></div>
              <div><label className="text-xs font-bold text-slate-700">Email Address</label><input type="email" required className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#BAD133]" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} /></div>
              <div><label className="text-xs font-bold text-slate-700">Temporary Password</label><input type="text" required className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#BAD133]" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700">System Role</label>
                  <select className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#BAD133]" value={newUserRole} onChange={e => setNewUserRole(e.target.value)}>
                    {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Branch</label>
                  <select className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#BAD133]" value={newUserBranch} onChange={e => setNewUserBranch(e.target.value)}>
                    {BRANCH_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3"><button type="button" onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold text-sm">Cancel</button><button type="submit" disabled={isSavingUser} className="bg-[#282860] hover:bg-[#1b1b42] text-white px-6 py-2 rounded-lg text-sm font-bold disabled:opacity-50">{isSavingUser ? "Saving..." : "Create Account"}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT AGENT CONFIG MODAL --- */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-[#f8fafc]">
              <div>
                <h2 className="text-xl font-bold text-[#282860] flex items-center gap-2">
                  <Edit2 size={20} className="text-[#BAD133]" /> Agent Config
                </h2>
                <p className="text-xs text-slate-500 mt-1">{editingUser.email}</p>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <form id="edit-user-form" onSubmit={handleEditUser} className="space-y-8">
                <div>
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Users size={14} /> 1. Account & Security</h3>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div><label className="text-xs font-bold text-slate-700">Account Name</label><input type="text" className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-[#BAD133]" value={editingUser.name || ""} onChange={e => setEditingUser({...editingUser, name: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-slate-700">System Role</label><select className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-[#BAD133]" value={editingUser.role || "Individual Agent"} onChange={e => setEditingUser({...editingUser, role: e.target.value})}>{ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                    <div className="col-span-2 mt-2"><label className="text-xs font-bold text-slate-700">Emergency Access Control (Freeze)</label><select className="w-full mt-1.5 px-3 py-2 border-2 border-red-100 rounded-lg text-sm font-bold focus:border-red-300 outline-none" value={editingUser.is_active === false ? "false" : "true"} onChange={e => setEditingUser({...editingUser, is_active: e.target.value === "true"})}><option value="true" className="text-green-600">✅ ACTIVE</option><option value="false" className="text-red-600">❄️ FROZEN</option></select></div>
                  </div>
                </div>
                <div>
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><DollarSign size={14} className="text-[#BAD133]" /> 2. Commission Transfer Registration</h3>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div><label className="text-xs font-bold text-slate-700">Bank Name</label><input type="text" placeholder="e.g. BANK OCBC" className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-[#BAD133]" value={editingUser.bank_name || ""} onChange={e => setEditingUser({...editingUser, bank_name: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-slate-700">Account Number</label><input type="text" placeholder="e.g. 123-456-789010" className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white font-mono outline-none focus:border-[#BAD133]" value={editingUser.bank_account || ""} onChange={e => setEditingUser({...editingUser, bank_account: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-slate-700">Branch Name</label><input type="text" className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-[#BAD133]" value={editingUser.bank_branch || ""} onChange={e => setEditingUser({...editingUser, bank_branch: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-slate-700">SWIFT Code</label><input type="text" placeholder="e.g. ABCDEF" className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white font-mono outline-none focus:border-[#BAD133]" value={editingUser.swift_code || ""} onChange={e => setEditingUser({...editingUser, swift_code: e.target.value})} /></div>
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] relative z-10">
              <button onClick={() => setEditingUser(null)} type="button" className="px-5 py-2.5 text-slate-500 font-bold text-sm hover:text-slate-700 transition-colors">Cancel</button>
              <button form="edit-user-form" type="submit" className="bg-[#282860] hover:bg-[#1b1b42] text-white px-8 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-md">Save & Update Profile</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}