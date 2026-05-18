"use client";

import { useState } from "react";
import { Search, GraduationCap, MapPin, DollarSign, Sparkles, Loader2, BookmarkPlus } from "lucide-react";

export default function AIProgramFinderPage() {
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const handleAISearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setHasSearched(true);
    setPrograms([]);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/programs/search?query=${encodeURIComponent(searchQuery)}`);      
      const data = await response.json();
      if (data.status === "success") {
        setPrograms(data.data);
      } else {
        alert("AI failed to format the response. Try again.");
      }
    } catch (error) {
      console.error("Search failed:", error);
      alert("Network error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      
      {/* HEADER */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-[#282860] tracking-tight">AI Program Finder</h1>
          <p className="text-sm text-slate-500 mt-1">Describe what your student is looking for in natural language.</p>
        </div>
      </div>

      {/* AI SEARCH BAR */}
      <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <form onSubmit={handleAISearch} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Sparkles size={20} className="absolute left-4 top-4 text-[#BAD133]" />
            <input 
              type="text" 
              placeholder='e.g., "Top Architecture schools in the UK"' 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm md:text-base outline-none focus:border-[#282860] focus:ring-4 focus:ring-[#282860]/10 transition-all font-medium text-slate-900 placeholder:text-slate-400"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading || !searchQuery}
            className="w-full md:w-auto bg-[#282860] hover:bg-[#1b1b42] text-white px-8 py-4 rounded-xl font-bold transition-all disabled:opacity-50 flex justify-center items-center gap-2 shadow-md shadow-[#282860]/20"
          >
            {loading ? <><Loader2 size={18} className="animate-spin" /> Searching...</> : "Search Global Data"}
          </button>
        </form>

        {/* Suggested Prompts */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2 custom-scrollbar">
          <span className="text-xs font-bold text-slate-400 py-1.5 shrink-0">Try:</span>
          {["Cheap Nursing in Australia", "Ivy League Computer Science", "Quick 1-year Masters in Europe"].map((suggestion) => (
            <button 
              key={suggestion}
              type="button"
              onClick={() => { setSearchQuery(suggestion); }}
              className="whitespace-nowrap bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border border-slate-200"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* DATA TABLE */}
      {hasSearched && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-16 md:p-24 flex flex-col items-center justify-center text-[#282860]">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-[#BAD133] blur-xl opacity-30 rounded-full animate-pulse"></div>
                <Sparkles className="animate-spin text-[#BAD133] relative z-10" size={48} />
              </div>
              <p className="font-bold text-lg animate-pulse">Consulting global university data...</p>
              <p className="text-slate-400 text-sm mt-2 text-center max-w-sm">Fortrust AI is browsing live tuition feeds and requirements for your query.</p>
            </div>
          ) : programs.length === 0 ? (
            <div className="p-16 text-center text-slate-500">
               <Search className="mx-auto h-12 w-12 text-slate-300 mb-3" />
               <p className="font-medium text-slate-700">No programs found.</p>
               <p className="text-sm mt-1">Try rewording your AI prompt.</p>
             </div>
          ) : (
            // UX UPGRADE: Added overflow-x-auto so the table doesn't break mobile screens
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 tracking-wider uppercase">
                    <th className="px-6 py-4">University & Program</th>
                    <th className="px-6 py-4">Location</th>
                    <th className="px-6 py-4">Level & Major</th>
                    <th className="px-6 py-4">Est. Tuition</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {programs.map((prog, index) => (
                    <tr key={index} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-black text-[#282860] text-base leading-tight">{prog.program_name}</div>
                        <div className="text-xs font-bold text-slate-500 mt-1.5 flex items-center gap-1.5">
                          <GraduationCap size={14} className="text-[#BAD133]"/> {prog.university}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                          <MapPin size={14} className="text-slate-400" /> {prog.country}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-700">{prog.level}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{prog.category}</div>
                        <div className="text-xs font-bold text-slate-400 mt-1">{prog.duration} Years</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center text-emerald-700 font-black bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 shadow-sm shadow-emerald-100/50">
                          <DollarSign size={14} /> {prog.tuition?.toLocaleString() || "Varies"}
                        </span>
                      </td>
                      
                      {/* UX UPGRADE: The "Action" column so agents can actually use the data */}
                      <td className="px-6 py-4 text-right">
                        <button 
                          className="bg-white hover:bg-slate-50 text-[#282860] border border-slate-200 hover:border-[#282860] p-2.5 rounded-lg font-semibold transition-all shadow-sm flex items-center gap-2 ml-auto"
                          title="Save to Pipeline"
                          onClick={() => alert(`In Phase 3, this will save ${prog.program_name} to a student's profile!`)}
                        >
                          <BookmarkPlus size={18} />
                          <span className="text-xs hidden lg:block">Save</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}