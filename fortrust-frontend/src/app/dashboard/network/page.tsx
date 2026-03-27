"use client";

import { useEffect, useState } from "react";
import { Users, MapPin, Search, ShieldAlert } from "lucide-react";

export default function NetworkDirectoryPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    // 1. Fetch the user list from the Python server
    fetch("process.env.NEXT_PUBLIC_API_URL/api/users")
      .then(res => res.json())
      .then(data => {
        if (data.status === "success") {
          setAgents(data.data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load users:", err);
        setLoading(false);
      });
  }, []);

  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    agent.branch.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6">
      
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-[#282860] tracking-tight">Network Directory</h1>
          <p className="text-sm text-slate-500 mt-1">View and manage all active Fortrust agents and counsellors.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center">
        <Search size={18} className="text-slate-400 mx-2" />
        <input 
          type="text" 
          placeholder="Search by agent name, branch, or role..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full py-2 outline-none font-medium text-slate-700"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 font-medium animate-pulse">Loading directory...</div>
        ) : filteredAgents.length === 0 ? (
          <div className="p-16 text-center text-slate-500">No agents found matching that search.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 tracking-wider uppercase">
                <th className="px-6 py-4">Agent Name & Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Branch Office</th>
                <th className="px-6 py-4 text-center">Active Students</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {filteredAgents.map((agent) => (
                <tr key={agent.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#BAD133] flex items-center justify-center font-bold text-[#282860]">
                        {agent.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-[#282860]">{agent.name}</div>
                        <div className="text-xs text-slate-500">{agent.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border
                      ${agent.role.includes("ADMIN") ? "bg-red-50 text-red-700 border-red-200" : "bg-blue-50 text-blue-700 border-blue-200"}
                    `}>
                      {agent.role.includes("ADMIN") && <ShieldAlert size={12}/>}
                      {agent.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                      <MapPin size={14} className="text-[#BAD133]" /> {agent.branch}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center font-black text-slate-700">
                    {agent.student_count}
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