"use client";

import React, { useState, useEffect } from "react";
import { 
  BellRing, Send, CheckCircle2, Loader2, X, AlertCircle, 
  Users, MapPin, Mail, Clock, Target
} from "lucide-react";

export default function BroadcastHubPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetRole, setTargetRole] = useState("ALL");
  const [targetBranch, setTargetBranch] = useState("ALL");
  const [sendEmail, setSendEmail] = useState(true);
  
  const [isSending, setIsSending] = useState(false);
  const [notification, setNotification] = useState<{type: 'success'|'error', text: string} | null>(null);

  // Live Database State
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Fetch live history on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/broadcasts`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") {
        setHistory(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch broadcast history", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setNotification(null);
    
    try {
      const token = localStorage.getItem("fortrust_token");
      const payload = {
        title: title,
        message: message,
        target_role: targetRole,
        target_branch: targetBranch,
        send_email: sendEmail
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/broadcasts`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        setNotification({ type: 'success', text: "Broadcast successfully dispatched to target audience." });
        setTitle("");
        setMessage("");
        fetchHistory(); // Instantly refresh the live table
      } else {
        setNotification({ type: 'error', text: data.detail || "Failed to send broadcast." });
      }
    } catch (error) {
      setNotification({ type: 'error', text: "Network error. Could not connect to backend." });
    } finally {
      setIsSending(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-[1200px] mx-auto w-full relative animate-in fade-in">
      
      {notification && (
        <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-2xl font-bold flex items-center justify-between shadow-2xl animate-in slide-in-from-top-4
          ${notification.type === 'success' ? 'bg-[#282860] text-white border border-[#3a3a7a]' : 'bg-red-500 text-white border border-red-600'}`}>
          <div className="flex items-center gap-3">
            {notification.type === 'success' ? <CheckCircle2 className="text-[#BAD133]" size={20}/> : <AlertCircle size={20}/>}
            {notification.text}
          </div>
          <button onClick={() => setNotification(null)} className="ml-6 opacity-70 hover:opacity-100 transition-opacity"><X size={18} /></button>
        </div>
      )}

      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-[#282860] flex items-center gap-3">
          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
            <BellRing className="text-[#BAD133]" size={28} />
          </div>
          Global Broadcast Hub
        </h1>
        <p className="text-slate-500 mt-2 font-medium text-sm">
          Push targeted announcements to agent notification bells and inboxes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COMPOSER FORM */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 lg:p-8">
          <h2 className="text-xl font-black text-[#282860] mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
            <Send size={20} className="text-[#BAD133]"/> Compose Broadcast
          </h2>
          
          <form onSubmit={handleSendBroadcast} className="space-y-6">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Announcement Title</label>
              <input 
                type="text" 
                required
                placeholder="e.g., Important System Update" 
                className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold text-[#282860] outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Message Body</label>
              <textarea 
                required
                rows={5}
                placeholder="Type your announcement details here..." 
                className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all resize-none"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl space-y-4">
              <h3 className="text-sm font-black text-[#282860] flex items-center gap-2"><Target size={16}/> Target Audience</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Users size={12}/> Target Role</label>
                  <select 
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none cursor-pointer focus:border-[#BAD133]"
                  >
                    <option value="ALL">All Agents & Roles</option>
                    <option value="Corporate Agent">Corporate Agents Only</option>
                    <option value="Individual Agent">Individual Agents Only</option>
                    <option value="Student Counselor">Student Counselors Only</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><MapPin size={12}/> Target Branch</label>
                  <select 
                    value={targetBranch}
                    onChange={(e) => setTargetBranch(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none cursor-pointer focus:border-[#BAD133]"
                  >
                    <option value="ALL">Global (All Branches)</option>
                    <option value="Jakarta">Jakarta Only</option>
                    <option value="Surabaya">Surabaya Only</option>
                    <option value="Bandung">Bandung Only</option>
                    <option value="Bali">Bali Only</option>
                    <option value="Medan">Medan Only</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-6">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-6 h-6 rounded flex items-center justify-center border transition-colors ${sendEmail ? 'bg-[#282860] border-[#282860] text-[#BAD133]' : 'bg-slate-50 border-slate-300 text-transparent group-hover:border-[#282860]'}`}>
                  <CheckCircle2 size={16}/>
                </div>
                <input type="checkbox" className="hidden" checked={sendEmail} onChange={() => setSendEmail(!sendEmail)} />
                <span className="text-sm font-bold text-slate-700 flex items-center gap-2"><Mail size={16} className="text-slate-400"/> Send copy to email inbox</span>
              </label>

              <button 
                type="submit" 
                disabled={!title || !message || isSending}
                className="bg-[#282860] hover:bg-[#1b1b42] disabled:opacity-50 text-white px-8 py-3 rounded-xl font-black text-sm shadow-md transition-all active:scale-95 flex items-center gap-2"
              >
                {isSending ? <><Loader2 size={18} className="animate-spin"/> Pushing Data...</> : <><Send size={18}/> Send Broadcast</>}
              </button>
            </div>
          </form>
        </div>

        {/* LIVE BROADCAST HISTORY */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col h-full max-h-[600px]">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-100 pb-4">
            <Clock size={16}/> Recent Dispatches
          </h2>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
            {loadingHistory ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Loader2 size={24} className="animate-spin text-[#BAD133] mb-2" />
                <p className="text-xs font-bold text-slate-400">Syncing with database...</p>
              </div>
            ) : history.length === 0 ? (
              <p className="text-center text-slate-400 text-sm font-medium py-10 border-2 border-dashed border-slate-100 rounded-xl">No active broadcasts found in database.</p>
            ) : (
              history.map(item => (
                <div key={item.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                  <p className="font-bold text-[#282860] text-sm mb-2">{item.title}</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">{item.target_role === "ALL" ? "All Agents" : item.target_role}</span>
                    <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">{item.target_branch === "ALL" ? "Global" : item.target_branch}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                    <span>{new Date(item.created_at || Date.now()).toLocaleString()}</span>
                    {item.send_email ? <span className="flex items-center gap-1 text-emerald-600"><Mail size={12}/> Emailed</span> : <span>App Only</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}