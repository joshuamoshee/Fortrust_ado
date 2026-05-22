"use client";

import { useState, useEffect } from "react";
import { Search, Clock, UserCircle, Activity, PlusCircle, Edit, Trash2, DollarSign, ChevronRight, FileText } from "lucide-react";

export default function SystemCCTV() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [searchTerm, setSearchQuery] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/audit-logs`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") {
        setLogs(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch logs");
    } finally {
      setLoading(false);
    }
  };

  // Get unique agents from logs
  const agents = Array.from(new Set(logs.map(log => log.changed_by))).filter(Boolean);
  
  // Filter agents by search term
  const filteredAgents = agents.filter(agent => agent.toLowerCase().includes(searchTerm.toLowerCase()));

  // Filter logs for the selected agent
  const agentLogs = logs.filter(log => log.changed_by === selectedAgent);

  // Human Readable Formatter
  const formatAction = (action: string) => {
    switch (action) {
      case "CREATE": return { text: "Created New", icon: <PlusCircle size={14}/>, color: "text-emerald-600 bg-emerald-50 border-emerald-200" };
      case "UPDATE": return { text: "Updated", icon: <Edit size={14}/>, color: "text-blue-600 bg-blue-50 border-blue-200" };
      case "DELETE": return { text: "Deleted", icon: <Trash2 size={14}/>, color: "text-red-600 bg-red-50 border-red-200" };
      case "COMMISSION_SPLIT": return { text: "Closed Deal", icon: <DollarSign size={14}/>, color: "text-amber-600 bg-amber-50 border-amber-200" };
      default: return { text: action, icon: <Activity size={14}/>, color: "text-slate-600 bg-slate-50 border-slate-200" };
    }
  };

  const parseDetails = (details: any, action: string) => {
    if (!details) return "No specific details logged.";
    
    try {
      const d = typeof details === "string" ? JSON.parse(details) : details;
      
      if (action === "COMMISSION_SPLIT") {
        return `Processed payment: $${d.total}. Fortrust retained $${d.fortrust_cut}, Agent earned $${d.agent_cut}.`;
      }
      
      // If it's a standard update, format the JSON into a readable string
      const keys = Object.keys(d);
      if (keys.length === 0) return "General update.";
      
      const changes = keys.map(k => `${k.replace('_', ' ')}: ${d[k]}`).join(", ");
      return `Updated fields -> ${changes}`;
    } catch (e) {
      return JSON.stringify(details); // Fallback
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-black text-[#282860] flex items-center gap-3">
            <Activity className="text-[#BAD133]" size={36} />
            System CCTV
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Monitor all agent actions, updates, and closed deals in real-time.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[750px]">
        
        {/* LEFT PANEL: Agent Roster */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search agent..." 
                value={searchTerm}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#282860]" 
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {loading ? (
              <div className="text-center text-slate-400 p-8 text-sm animate-pulse">Loading roster...</div>
            ) : filteredAgents.length === 0 ? (
              <div className="text-center text-slate-400 p-8 text-sm">No activity found.</div>
            ) : (
              filteredAgents.map(agent => (
                <button
                  key={agent}
                  onClick={() => setSelectedAgent(agent)}
                  className={`w-full text-left p-3 rounded-xl flex items-center justify-between transition-all ${selectedAgent === agent ? 'bg-[#282860] text-white shadow-md' : 'hover:bg-slate-50 text-slate-700'}`}
                >
                  <div className="flex items-center gap-3">
                    <UserCircle size={20} className={selectedAgent === agent ? 'text-[#BAD133]' : 'text-slate-400'}/>
                    <span className="font-bold text-sm">{agent}</span>
                  </div>
                  <ChevronRight size={16} className={selectedAgent === agent ? 'text-white/50' : 'text-slate-300'}/>
                </button>
              ))
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Agent Timeline */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden relative">
          {!selectedAgent ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Activity size={48} className="mb-4 text-slate-200"/>
              <p className="font-medium text-lg text-slate-500">Select an agent</p>
              <p className="text-sm">Click an agent on the left to view their detailed activity feed.</p>
            </div>
          ) : (
            <>
              <div className="p-6 border-b border-slate-100 bg-[#f8fafc] flex justify-between items-center sticky top-0 z-10">
                <div>
                  <h2 className="text-lg font-black text-[#282860]">{selectedAgent}'s Activity Log</h2>
                  <p className="text-xs text-slate-500 mt-1">Showing all historical actions taken by this user.</p>
                </div>
                <span className="text-[10px] font-bold bg-[#BAD133]/20 text-[#282860] px-3 py-1 rounded-full uppercase tracking-widest">{agentLogs.length} Records</span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50">
                <div className="space-y-6">
                  {agentLogs.length === 0 ? (
                    <p className="text-center text-slate-400 italic">No activity logged yet.</p>
                  ) : (
                    agentLogs.map((log) => {
                      const actionFormat = formatAction(log.action);
                      return (
                        <div key={log.id} className="flex gap-4 relative">
                          <div className="absolute left-[15px] top-8 bottom-[-24px] w-[2px] bg-slate-200 last:hidden"></div>
                          
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 border shadow-sm ${actionFormat.color}`}>
                            {actionFormat.icon}
                          </div>
                          
                          <div className="flex-1 bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:border-[#BAD133] transition-colors group">
                            <div className="flex justify-between items-start mb-2">
                              <p className="font-bold text-[#282860] text-sm">
                                {actionFormat.text} <span className="font-medium text-slate-500">{log.entity}</span>
                                {log.entity_id && <span className="text-xs text-slate-400 ml-1">({log.entity_id.split('-')[0]}...)</span>}
                              </p>
                              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                <Clock size={12}/> {new Date(log.created_at).toLocaleString()}
                              </span>
                            </div>
                            
                            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2 rounded border border-slate-100 font-mono mt-2">
                              {parseDetails(log.details, log.action)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}