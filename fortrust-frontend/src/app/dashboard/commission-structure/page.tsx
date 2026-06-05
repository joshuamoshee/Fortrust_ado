"use client";

import React, { useState, useEffect } from "react";
import { 
  Percent, Search, Building, TrendingUp, AlertCircle, 
  CheckCircle2, Loader2, ArrowUpRight, DollarSign, FileText
} from "lucide-react";

export default function CommissionStructureMatrix() {
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  useEffect(() => {
    const fetchInstitutions = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("fortrust_token");
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/institutions`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.status === "success") {
          setInstitutions(data.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch structures");
      } finally {
        setLoading(false);
      }
    };
    fetchInstitutions();
  }, []);

  const filteredInstitutions = institutions.filter(inst => {
    const matchesSearch = (inst.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "ALL" || (inst.agreement_type || "Commission-based") === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="p-4 lg:p-8 max-w-[1500px] mx-auto w-full animate-in fade-in">
      
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-[#282860] flex items-center gap-3">
          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
            <Percent className="text-[#BAD133]" size={28} />
          </div>
          Global Commission Matrix
        </h1>
        <p className="text-slate-500 mt-2 font-medium text-sm">
          Master overview of Base Commission %, Performance Bonuses, and MoU payout terms across all partners.
        </p>
      </div>

      {/* CONTROLS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[700px] overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex items-center text-slate-400 bg-white px-4 py-3 rounded-xl border border-slate-200 w-full md:w-96 focus-within:border-[#BAD133] transition-all shadow-sm">
            <Search size={18} className="mr-3 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search institution..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-slate-700 w-full font-bold" 
            />
          </div>
          
          <select 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-white border border-slate-200 text-slate-700 rounded-xl px-5 py-3 text-sm font-bold outline-none focus:border-[#BAD133] shadow-sm cursor-pointer w-full md:w-auto"
          >
            <option value="ALL">All Agreement Types</option>
            <option value="Commission-based">Commission-based</option>
            <option value="Fixed Fee">Fixed Fee</option>
            <option value="Tiered">Tiered Structure</option>
          </select>
        </div>

        {/* MATRIX TABLE */}
        <div className="flex-1 overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-[#f8fafc] border-b border-slate-200 text-[10px] font-black text-slate-400 tracking-widest uppercase sticky top-0 z-10">
              <tr>
                <th className="px-6 py-5">Institution</th>
                <th className="px-6 py-5">Agreement Structure</th>
                <th className="px-6 py-5">Base Commission Rate</th>
                <th className="px-6 py-5">Performance Bonuses</th>
                <th className="px-6 py-5 text-right">MoU Status</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="p-16 text-center"><Loader2 size={32} className="animate-spin text-[#BAD133] mx-auto mb-4"/> Syncing Matrix...</td></tr>
              ) : filteredInstitutions.length === 0 ? (
                <tr><td colSpan={5} className="p-16 text-center text-slate-400 font-medium">No partner agreements found.</td></tr>
              ) : (
                filteredInstitutions.map((inst) => (
                  <tr key={inst.id} className="hover:bg-slate-50 transition-colors group">
                    
                    <td className="px-6 py-5 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-black shrink-0">
                        <Building size={18}/>
                      </div>
                      <div>
                        <p className="font-bold text-[#282860] text-base">{inst.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{inst.country}</p>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border border-slate-200">
                        {inst.agreement_type || "Standard"}
                      </span>
                      <p className="text-[10px] text-slate-400 font-medium mt-1.5 flex items-center gap-1">
                        <FileText size={10}/> ID: {inst.agreement_id || "N/A"}
                      </p>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="bg-emerald-50 text-emerald-700 font-black text-lg px-3 py-1 rounded-xl border border-emerald-100 flex items-center gap-1">
                          {inst.base_commission || "0"}%
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      {inst.performance_bonus || inst.tiered_levels ? (
                        <div className="flex flex-col gap-1">
                          {inst.performance_bonus && (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-blue-600">
                              <TrendingUp size={14}/> Bonus: {inst.performance_bonus}
                            </span>
                          )}
                          {inst.tiered_levels && (
                            <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                              <ArrowUpRight size={12}/> Tiers: {inst.tiered_levels}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">No bonus tiers</span>
                      )}
                    </td>

                    <td className="px-6 py-5 text-right">
                      <span className={`inline-flex px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider
                        ${inst.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                        {inst.status || "ACTIVE"}
                      </span>
                      <p className="text-[10px] text-slate-400 font-medium mt-1.5">Exp: {inst.duration_end || "Unknown"}</p>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}