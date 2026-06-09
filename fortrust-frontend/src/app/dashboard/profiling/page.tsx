"use client";

import React, { useState, useEffect } from "react";
import { 
  BrainCircuit, Search, CheckCircle2, AlertCircle, 
  Send, FileText, Loader2, X, User, RefreshCcw, UploadCloud, 
  Sparkles, Compass, Trophy, TrendingUp, DollarSign
} from "lucide-react";

export default function ProfilingTestHub() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  
  // AI & Upload States
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [aiReport, setAiReport] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{type: 'success'|'error', text: string} | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline?role=MASTER_ADMIN`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") setStudents(data.data || []);
    } catch (error) {
      console.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestLink = (studentName: string) => {
    navigator.clipboard.writeText(`Hi ${studentName}, please complete your Fortrust HCC Profiling Test here: https://fortrust.com/hcc-test`);
    setNotification({type: 'success', text: `Test link copied to clipboard for ${studentName}!`});
    setTimeout(() => setNotification(null), 3000);
  };

  const handleUploadTest = async (e: React.ChangeEvent<HTMLInputElement>, studentId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingId(studentId);
    const formData = new FormData();
    formData.append("psych_test", file); 

    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline/${studentId}/document`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData 
      });
      
      if (res.ok) {
        setNotification({type: 'success', text: "Test uploaded! AI is ready to analyze."});
        fetchData(); 
      } else {
        const errorData = await res.json();
        setNotification({type: 'error', text: errorData.detail || "Upload failed."});
      }
    } catch (error) {
      setNotification({type: 'error', text: "Network error during upload."});
    } finally {
      setUploadingId(null);
      e.target.value = ''; 
    }
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
        setAiReport('{"error": "Analysis failed."}');
      }
    } catch (error) {
      setAiReport('{"error": "Network Error."}');
    } finally {
      setIsGenerating(false);
    }
  };

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

  // --- PARSE JSON REPORT ---
  let parsedReport: any = null;
  if (aiReport) {
    try {
      parsedReport = JSON.parse(aiReport);
    } catch (e) {
      console.error("Failed to parse AI JSON");
    }
  }

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

      {/* HEADER & KPIs */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#282860] flex items-center gap-3">
            <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
              <BrainCircuit className="text-[#BAD133]" size={28} />
            </div>
            Psychological Profiling Hub
          </h1>
          <p className="text-slate-500 mt-2 font-medium text-sm">
            Upload student tests, track submissions, and generate premium UI reports.
          </p>
        </div>
      </div>

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
            <option value="MISSING">🔴 Awaiting Test</option>
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
                      <div className="flex justify-end gap-2">
                        {student.hasTest ? (
                          <button 
                            onClick={() => { setSelectedStudent(student); runAiAnalysis(student.id); }}
                            className="bg-[#282860] hover:bg-[#1b1b42] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
                          >
                            <BrainCircuit size={14} className="text-[#BAD133]"/> Run AI Analysis
                          </button>
                        ) : (
                          <>
                            <button 
                              onClick={() => handleSendTestLink(student.name)}
                              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
                            >
                              <Send size={14} className="text-blue-500"/> Link
                            </button>
                            <label className={`cursor-pointer bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 ${uploadingId === student.id ? 'opacity-50 pointer-events-none' : ''}`}>
                              {uploadingId === student.id ? <Loader2 size={14} className="animate-spin"/> : <UploadCloud size={14}/>}
                              {uploadingId === student.id ? 'Uploading...' : 'Upload Test'}
                              <input 
                                type="file" 
                                className="hidden" 
                                accept=".pdf,.png,.jpg,.jpeg"
                                onChange={(e) => handleUploadTest(e, student.id)}
                                disabled={uploadingId === student.id}
                              />
                            </label>
                          </>
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

      {/* AI ANALYSIS MODAL - WITH PREMIUM UI */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[95vh] border border-slate-200">
            
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-white shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#282860] rounded-xl flex items-center justify-center text-white shadow-sm">
                  <BrainCircuit size={24}/>
                </div>
                <div>
                  <h2 className="text-xl font-black text-[#282860] flex items-center gap-2">Strategic AI Assessment</h2>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Student: {selectedStudent.name}</p>
                </div>
              </div>
              <button onClick={() => { setSelectedStudent(null); setAiReport(""); }} className="p-2 text-slate-400 hover:text-[#282860] hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
            </div>
            
            <div className="p-6 lg:p-10 flex-1 overflow-y-auto custom-scrollbar relative">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-20 h-full">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-[#BAD133] rounded-full blur-2xl opacity-40 animate-pulse"></div>
                    <Loader2 size={56} className="animate-spin text-[#282860] relative z-10" />
                  </div>
                  <h3 className="text-2xl font-black text-[#282860] mb-2">Analyzing Psychological Profile...</h3>
                  <p className="text-slate-500 font-medium text-center max-w-md">
                    Gemini AI is currently reading the uploaded HCC document to extract traits, calculate fit, and match the student to live global university data.
                  </p>
                </div>
              ) : parsedReport && !parsedReport.error ? (
                <div className="space-y-8 pb-10">
                  
                  {/* Hero Banner */}
                  <div className="bg-gradient-to-br from-[#282860] to-[#1b1b42] rounded-3xl p-8 text-white shadow-xl relative overflow-hidden border border-[#3a3a7a]">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#BAD133] rounded-full blur-[80px] opacity-20 -mr-20 -mt-20"></div>
                    <div className="relative z-10">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#BAD133] flex items-center gap-2 mb-3"><Sparkles size={14}/> Core Archetype Discovered</span>
                      <h2 className="text-3xl lg:text-4xl font-black mb-4 leading-tight">{parsedReport.superpower}</h2>
                      <p className="text-slate-300 leading-relaxed text-sm md:text-base max-w-3xl border-l-4 border-[#BAD133] pl-4">{parsedReport.executive_summary}</p>
                    </div>
                  </div>

                  {/* Strategic Direction */}
                  <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center gap-6 shadow-sm">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-inner"><Compass size={28}/></div>
                    <div>
                      <h3 className="font-black text-blue-900 text-lg mb-1">Recommended Trajectory</h3>
                      <p className="text-sm font-medium text-blue-800 leading-relaxed">{parsedReport.strategic_direction}</p>
                    </div>
                  </div>

                  {/* University Matches */}
                  <div>
                    <h3 className="text-xl font-black text-[#282860] mb-6 flex items-center gap-2"><Trophy className="text-[#BAD133]"/> Top 3 Global University Matches</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {parsedReport.matches?.map((match: any, idx: number) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative flex flex-col">
                          <div className="absolute top-0 right-0 bg-[#BAD133] text-[#1b1b42] font-black text-xs px-4 py-1.5 rounded-bl-2xl shadow-sm">{match.fit_percentage}% FIT</div>
                          
                          <div className="mb-5 pr-12">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Option {idx + 1}</span>
                            <h4 className="font-black text-[#282860] text-lg leading-tight">{match.university}</h4>
                            <p className="text-sm font-bold text-blue-600 mt-1">{match.major}</p>
                          </div>

                          <div className="space-y-4 mb-6 flex-1">
                            <div>
                              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mb-1.5"><span>Cognitive Sync</span><span>{match.scores?.cognitive || 0}/10</span></div>
                              <div className="w-full bg-slate-100 rounded-full h-2"><div className="bg-emerald-500 h-2 rounded-full" style={{width: `${(match.scores?.cognitive || 0) * 10}%`}}></div></div>
                            </div>
                            <div>
                              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mb-1.5"><span>Interest Sync</span><span>{match.scores?.interest || 0}/10</span></div>
                              <div className="w-full bg-slate-100 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full" style={{width: `${(match.scores?.interest || 0) * 10}%`}}></div></div>
                            </div>
                          </div>

                          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1.5">Future Proofing Analysis</p>
                            <p className="text-xs text-slate-600 font-medium leading-relaxed"><strong className="text-slate-800">Shift:</strong> {match.future_proofing?.shift}</p>
                            <p className="text-xs text-slate-600 font-medium leading-relaxed mt-1"><strong className="text-slate-800">Advice:</strong> {match.future_proofing?.advice}</p>
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-auto">
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase">Live Est. Tuition</p>
                              <p className="font-black text-slate-800 text-sm mt-0.5">{match.tuition_estimate}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-black text-slate-400 uppercase">Risk Level</p>
                              <p className={`font-black text-sm mt-0.5 ${match.risk_factor?.toLowerCase().includes('high') ? 'text-red-500' : match.risk_factor?.toLowerCase().includes('med') ? 'text-amber-500' : 'text-emerald-500'}`}>{match.risk_factor}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Risks & Budget */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                      <h3 className="text-sm font-black text-[#282860] uppercase tracking-widest mb-4 flex items-center gap-2"><AlertCircle size={16} className="text-red-500"/> Psychological Risks</h3>
                      <div className="space-y-4">
                        {parsedReport.success_factors?.map((sf: any, idx: number) => (
                          <div key={idx} className="bg-red-50/50 border border-red-100 rounded-2xl p-4">
                            <p className="text-sm font-bold text-red-800 mb-1">{sf.risk}</p>
                            <p className="text-xs font-medium text-red-600">{sf.action}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                      <h3 className="text-sm font-black text-[#282860] uppercase tracking-widest mb-4 flex items-center gap-2"><DollarSign size={16} className="text-emerald-500"/> Financial Strategy</h3>
                      <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 mb-4">
                        <p className="text-sm font-bold text-emerald-900 mb-2">{parsedReport.budget_strategy?.alternative_pathway}</p>
                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-emerald-200/50">
                          <div>
                            <p className="text-[10px] font-black uppercase text-emerald-700/70">Potential Savings</p>
                            <p className="text-xl font-black text-emerald-700">{parsedReport.budget_strategy?.savings}</p>
                          </div>
                          <TrendingUp size={24} className="text-emerald-400 opacity-50"/>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="text-center py-20 text-slate-500 bg-white border border-slate-200 rounded-3xl">
                  <AlertCircle size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="font-bold text-lg text-slate-600">Report parsing failed.</p>
                  <p className="text-sm mt-2">The AI returned invalid JSON data. Please click regenerate.</p>
                  <p className="text-xs bg-slate-100 p-4 rounded-xl mt-4 max-w-lg mx-auto overflow-x-auto text-left whitespace-pre-wrap">{aiReport}</p>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-200 bg-white flex justify-between items-center shrink-0">
              <button 
                onClick={() => runAiAnalysis(selectedStudent.id)}
                disabled={isGenerating}
                className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCcw size={14}/> Regenerate Report
              </button>
              <button 
                onClick={() => { setSelectedStudent(null); setAiReport(""); }}
                className="bg-[#282860] hover:bg-[#1b1b42] text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"
              >
                Close Dashboard
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}