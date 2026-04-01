"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, UploadCloud, FileText, Building2, User, Search, Download } from "lucide-react";

export default function AgentPipelinePage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [wa, setWa] = useState("");
  const [agentType, setAgentType] = useState("Individual Agent");
  const [corporationName, setCorporationName] = useState("");

  const fetchAgents = async () => {
    const token = localStorage.getItem("fortrust_token");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") {
        // Filter out Master Admins so we only see Agents/Counsellors in the pipeline
        const filteredAgents = data.data.filter((u: any) => u.role !== "MASTER_ADMIN");
        setAgents(filteredAgents);
      }
    } catch (error) {
      console.error("Failed to fetch agents:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAgents(); }, []);

  const handleSaveAgent = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem("fortrust_token");
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({
          name: name,
          email: email,
          password: "DefaultPassword123!", // Give them a default password initially
          role: "Agent",
          branch: "Global",
          phone: wa,
          agent_type: agentType,
          corporation_name: agentType === "Agent Corporation" ? corporationName : ""
        })
      });
      setIsAddModalOpen(false);
      setName(""); setEmail(""); setWa(""); setCorporationName(""); setAgentType("Individual Agent");
      fetchAgents();
    } catch (error) {
      alert("Error saving agent data.");
    } finally {
      setIsSaving(false);
    }
  };

  // Mock function for downloading template
  const handleDownloadFormat = () => {
    const csvContent = "data:text/csv;charset=utf-8,Counsellor Name,Email,WA,Agent Type,Corporation Name\nJohn Doe,john@example.com,628123456789,Individual Agent,\nEduCorp Inc,info@educorp.com,628987654321,Agent Corporation,EduCorp Global";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Fortrust_Agent_Upload_Format.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6 relative p-8 max-w-[1400px] mx-auto">
      
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Agent Pipeline</h2>
          <p className="text-sm text-slate-500 mt-1">Manage and onboard your global network of agents and counsellors.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleDownloadFormat} className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm">
            <Download size={18} className="text-[#282860]" /> Bulk Upload Format
          </button>
          <button onClick={() => setIsAddModalOpen(true)} className="bg-[#282860] hover:bg-[#1b1b42] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-[#282860]/20">
            + Add Agent Data
          </button>
        </div>
      </div>

      {/* ADD AGENT MODAL */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader><DialogTitle className="text-xl text-[#282860]">Add Agent Data</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            
            <div className="space-y-1.5">
              <Label className="text-slate-600 font-bold">Counsellor / Agent Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Budi Santoso" className="focus-visible:ring-[#BAD133]" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-600 font-bold">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="agent@example.com" className="focus-visible:ring-[#BAD133]" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-600 font-bold">WA (WhatsApp Number)</Label>
              <Input value={wa} onChange={(e) => setWa(e.target.value)} placeholder="e.g. +62812..." className="focus-visible:ring-[#BAD133]" />
            </div>

            <div className="space-y-3 pt-2">
              <Label className="text-slate-600 font-bold">Choose 1:</Label>
              <div className="grid grid-cols-2 gap-3">
                <div 
                  onClick={() => setAgentType("Individual Agent")}
                  className={`border-2 rounded-xl p-3 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${agentType === "Individual Agent" ? "border-[#282860] bg-blue-50" : "border-slate-200 hover:border-slate-300"}`}
                >
                  <User size={24} className={agentType === "Individual Agent" ? "text-[#282860]" : "text-slate-400"} />
                  <span className={`text-xs font-bold ${agentType === "Individual Agent" ? "text-[#282860]" : "text-slate-500"}`}>1. Individual Agent</span>
                </div>
                
                <div 
                  onClick={() => setAgentType("Agent Corporation")}
                  className={`border-2 rounded-xl p-3 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${agentType === "Agent Corporation" ? "border-[#282860] bg-blue-50" : "border-slate-200 hover:border-slate-300"}`}
                >
                  <Building2 size={24} className={agentType === "Agent Corporation" ? "text-[#282860]" : "text-slate-400"} />
                  <span className={`text-xs font-bold ${agentType === "Agent Corporation" ? "text-[#282860]" : "text-slate-500"}`}>2. Corporation</span>
                </div>
              </div>
            </div>

            {agentType === "Agent Corporation" && (
              <div className="space-y-1.5 pt-2 animate-in fade-in slide-in-from-top-2">
                <Label className="text-slate-600 font-bold text-xs uppercase">Write Agent Corporation Name:</Label>
                <Input value={corporationName} onChange={(e) => setCorporationName(e.target.value)} placeholder="e.g. EduCorp Global" className="focus-visible:ring-[#BAD133] border-[#BAD133]" />
              </div>
            )}

            <button onClick={handleSaveAgent} disabled={isSaving || !name || !email} className="w-full bg-[#282860] hover:bg-[#1b1b42] text-white py-3 rounded-xl mt-4 font-bold disabled:opacity-50 transition-colors">
              {isSaving ? "Saving..." : "Create Agent Profile"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* THE DATA TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 font-medium animate-pulse">Loading agent pipeline...</div>
        ) : agents.length === 0 ? (
           <div className="p-16 text-center text-slate-500">
             <Users className="mx-auto h-12 w-12 text-slate-300 mb-3" />
             <p className="font-medium text-slate-700">No agents found in pipeline.</p>
           </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="px-6 py-4">Agent Details</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {agents.map((agent) => (
                <tr key={agent.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{agent.name}</div>
                    <div className="text-xs font-medium text-slate-400 mt-0.5">{agent.role}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-700">{agent.email}</div>
                    <div className="text-xs text-slate-500 mt-0.5">WA: {agent.phone || "Not provided"}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-start gap-1">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${agent.agent_type === 'Agent Corporation' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {agent.agent_type || "Individual Agent"}
                      </span>
                      {agent.agent_type === "Agent Corporation" && agent.corporation_name && (
                        <span className="text-xs font-bold text-slate-500 flex items-center gap-1 mt-1">
                          <Building2 size={12} /> {agent.corporation_name}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}