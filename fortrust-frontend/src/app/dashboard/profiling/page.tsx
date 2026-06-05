"use client";

import React, { useState, useEffect } from "react";
import { 
  BrainCircuit, Search, CheckCircle2, AlertCircle, 
  Send, FileText, Loader2, X, Activity, User, ChevronRight, RefreshCcw
} from "lucide-react";

export default function ProfilingTestHub() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  
  // AI Modal States
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [aiReport, setAiReport] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [notification, setNotification] = useState<{type: 'success'|'error', text: string} | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline?role=MASTER_ADMIN`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") {
        setStudents(data.data || []);
      }
    } catch (error) {
      console.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestLink = (studentName: string) => {
    // In a real app, this might trigger a backend WhatsApp API. 
    // Here, we simulate copying the link to clipboard.
    navigator.clipboard.writeText(`Hi ${studentName}, please complete your Fortrust HCC Profiling Test here: https://fortrust.com/hcc-test`);
    setNotification({type: 'success', text: `Test link copied to clipboard for ${studentName}!`});
    setTimeout(() => setNotification(null), 3000);
  };

  const runAiAnalysis = async (studentId: string) => {
    setIsGenerating(true);
    setAiReport("");
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ai-strategy`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ case_id: studentId })
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setAiReport(data.report);
      } else {
        setAiReport("Analysis failed. The AI could not find readable text in the attached PDF.");
      }
    } catch (error) {
      setAiReport("Network Error. Could not connect to Gemini AI.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper to check if student has the HCC/Psychology test uploaded
  const checkTestStatus = (docsString: string) => {
    if (!docsString) return false;
    try {
      const docs = typeof docsString === 'string' ? JSON.parse(docsString) : docsString;
      return docs.some((d: any) => (d.title || "").toUpperCase().includes("PSYCHOLOGY") || (d.title || "").toUpperCase().includes("HCC"));
    } catch (e) {
      return false;
    }
  };

  const processedStudents = students.map(s => ({
    ...s,
    hasTest: checkTestStatus(s.documents)
  }));

  const filteredStudents = processedStudents.filter(s => {
    const matchesSearch = (s.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    if (filter === "MISSING") return matchesSearch && !s.hasTest;
    if (filter === "COMPLETED") return matchesSearch && s.hasTest;
    return matchesSearch;
  });

  const missingCount = processedStudents.filter(s => !s.hasTest).length;
  const completedCount = processedStudents.filter(s => s.hasTest).length;

  return (
    <div className="p-4 lg:p-8 max-w-[1500px] mx-auto w-full relative animate-in fade-in">
      
      {notification && (
        <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-2xl font-bold flex items-center justify-between shadow-2xl animate-in slide-in-from-top-4
          ${notification.type === 'success' ? 'bg-[#282860] text-white border border-[#3a3a7a]' : 'bg-red-500 text-white border border-red-600'}`}>
          <div className="flex items-center gap-3">
            <CheckCircle2 size={20} className={notification.type === 'success' ? "text-[#BAD133]" : "text-white"}/>
            {notification.text}
          </div>
          <button onClick={() => setNotification(null)} className="ml-6 opacity-70 hover:opacity-100 transition-opacity"><X size={18} /></button>
        </div>
      )}

      {/* HEADER */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#282860] flex items-center gap-3">
            <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
              <BrainCircuit className="text-[#BAD133]" size={28} />
            </div>
            Psychological Profiling Hub
          </h1>
          <p className="text-slate-500 mt-2 font-medium text-sm">
            Track HCC test submissions and generate AI personality/academic reports.
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100"><User size={24}/></div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Pipeline</p>
            <p className="text-3xl font-black text-[#282860]">{processedStudents.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-red-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center shrink-0 border border-red-100"><AlertCircle size={24}/></div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1">Awaiting Test</p>
            <p className="text-3xl font-black text-[#282860]">{missingCount}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100"><FileText size={24}/></div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Tests Submitted</p>
            <p className="text-3xl font-black text-[#282860]">{completedCount}</p>
          </div>
        </div>
      </div>

      {/* TABLE CONTROLS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[600px] overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex items-center text-slate-400 bg-white px-4 py-3 rounded-xl border border-slate-200 w-full md:w-96 focus-within:border-[#BAD133] focus-within:ring-2 focus-within:ring-[#BAD133]/20 transition-all shadow-sm">
            <Search size={18} className="mr-3 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search student name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-slate-700 w-full font-bold placeholder-slate-400" 
            />
          </div>
          
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="bg-white border border-slate-200 text-slate-700 rounded-xl px-5 py-3 text-sm font-bold outline-none focus:border-[#BAD133] shadow-sm cursor-pointer w-full md:w-auto"
          >
            <option value="ALL">All Students</option>
            <option value="MISSING">🔴 Awaiting Test Link</option>
            <option value="COMPLETED">🟢 Test Submitted</option>
          </select>
        </div>

        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-[#f8fafc] border-b border-slate-200 text-[10px] font-black text-slate-400 tracking-widest uppercase sticky top-0 z-10">
              <tr>
                <th className="px-6 py-5">Student</th>
                <th className="px-6 py-5">Assigned Agent</th>
                <th className="px-6 py-5">Pipeline Status</th>
                <th className="px-6 py-5">Profiling Status</th>
                <th className="px-6 py-5 text-right">Required Action</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="p-16 text-center"><Loader2 size={32} className="animate-spin text-[#BAD133] mx-auto mb-4"/> Scanning Vault...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={5} className="p-16 text-center text-slate-400 font-medium">No students match your criteria.</td></tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-5">
                      <p className="font-bold text-[#282860] text-base">{student.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{student.email || "No email provided"}</p>
                    </td>
                    <td className="px-6 py-5">
                      <span className="font-bold text-slate-700 text-sm">{student.assignee || "Unassigned"}</span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border border-slate-200">
                        {student.status || "NEW LEAD"}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      {student.hasTest ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-emerald-500"/>
                          <span className="text-xs font-bold text-emerald-700">Test Document Found</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <AlertCircle size={16} className="text-red-500"/>
                          <span className="text-xs font-bold text-red-600">No Test Uploaded</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-end">
                        {student.hasTest ? (
                          <button 
                            onClick={() => { setSelectedStudent(student); runAiAnalysis(student.id); }}
                            className="bg-[#282860] hover:bg-[#1b1b42] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
                          >
                            <BrainCircuit size={14} className="text-[#BAD133]"/> Run AI Analysis
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleSendTestLink(student.name)}
                            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
                          >
                            <Send size={14} className="text-blue-500"/> Copy Link
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI ANALYSIS MODAL */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-[#1b1b42] text-white shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-[#BAD133]">
                  <BrainCircuit size={24}/>
                </div>
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">AI Profiling Insights</h2>
                  <p className="text-xs text-slate-300 mt-1">Student: {selectedStudent.name}</p>
                </div>
              </div>
              <button onClick={() => { setSelectedStudent(null); setAiReport(""); }} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
            </div>
            
            <div className="p-8 flex-1 overflow-y-auto custom-scrollbar bg-slate-50">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-20 h-full">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-[#BAD133] rounded-full blur-xl opacity-20 animate-pulse"></div>
                    <Loader2 size={48} className="animate-spin text-[#BAD133] relative z-10" />
                  </div>
                  <h3 className="text-xl font-black text-[#282860] mb-2">Analyzing Psychological Profile...</h3>
                  <p className="text-sm text-slate-500 font-medium text-center max-w-md">
                    Gemini AI is reading the uploaded HCC document to extract traits, strengths, and optimal university matches.
                  </p>
                </div>
              ) : aiReport ? (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden h-full flex flex-col">
                  <div className="p-6 overflow-y-auto text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {aiReport}
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 text-slate-500">Something went wrong. Close and try again.</div>
              )}
            </div>

            <div className="p-5 border-t border-slate-100 bg-white flex justify-between items-center shrink-0 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]">
              <button 
                onClick={() => runAiAnalysis(selectedStudent.id)}
                disabled={isGenerating}
                className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCcw size={14}/> Regenerate Report
              </button>
              <button 
                onClick={() => { setSelectedStudent(null); setAiReport(""); }}
                className="bg-[#282860] hover:bg-[#1b1b42] text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}