"use client";

import { useState, useEffect } from "react";
import { 
  Search, Filter, GraduationCap, Building, MapPin, 
  FileText, UserMinus, RefreshCcw, Loader2, Edit2, Save,
  X, CheckCircle2, ShieldAlert, Mail, Phone, BookOpen, 
  Thermometer, BrainCircuit, UploadCloud, Activity, AlertCircle, Eye, Trash2, Plus
} from "lucide-react";

export default function GlobalStudentDatabase() {
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [agentFilter, setAgentFilter] = useState("ALL");
  
  // Reassign Modal State
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [studentToReassign, setStudentToReassign] = useState<any>(null);
  const [selectedNewAgent, setSelectedNewAgent] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  // Edit Student Dossier State
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [dossierTab, setDossierTab] = useState<"profile" | "documents" | "ai">("profile");
  const [isSavingStudent, setIsSavingStudent] = useState(false);
  
  // AI Report State
  const [aiReport, setAiReport] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Upload State
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Add New Student State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: "", email: "", phone: "", assignee: "", program_interest: "", lead_source: "", lead_temperature: "Cold Leads", status: "NEW LEAD"
  });
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);

  // Notification State
  const [notification, setNotification] = useState<{type: 'success'|'error', message: string} | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("fortrust_token");
      const headers = { "Authorization": `Bearer ${token}` };

      const [studentsRes, usersRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline?role=MASTER_ADMIN`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`, { headers })
      ]);
      
      const studentsData = await studentsRes.json();
      const usersData = await usersRes.json();

      if (studentsData.status === "success") setAllStudents(studentsData.data);
      if (usersData.status === "success") setAgents(usersData.data);
    } catch (error) {
      console.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingStudent(true);
    setNotification(null);
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/students`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...newStudent,
          assignee: newStudent.assignee || "Unassigned"
        })
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({type: 'success', message: 'Student successfully added to the global pipeline.'});
        setIsAddModalOpen(false);
        setNewStudent({ name: "", email: "", phone: "", assignee: "", program_interest: "", lead_source: "", lead_temperature: "Cold Leads", status: "NEW LEAD" });
        fetchData();
      } else {
        setNotification({type: 'error', message: data.detail || "Failed to create student."});
      }
    } catch (error) {
      setNotification({type: 'error', message: "Network error."});
    } finally {
      setIsCreatingStudent(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleReassign = async () => {
    if (!studentToReassign || !selectedNewAgent) return;
    setIsAssigning(true);
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline/${studentToReassign.id}`, {
        method: "PUT",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ assignee: selectedNewAgent }) 
      });
      
      if (res.ok) {
        setNotification({type: 'success', message: `${studentToReassign.name} reassigned to ${selectedNewAgent}.`});
        setIsReassignModalOpen(false);
        setStudentToReassign(null);
        setSelectedNewAgent("");
        fetchData(); 
      } else {
        setNotification({type: 'error', message: "Failed to reassign student."});
      }
    } catch (error) {
      setNotification({type: 'error', message: "Network error."});
    } finally {
      setIsAssigning(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setIsSavingStudent(true);
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/students/${editingStudent.id}`, {
        method: "PUT",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: editingStudent.name,
          email: editingStudent.email,
          phone: editingStudent.phone,
          program_interest: editingStudent.program_interest,
          status: editingStudent.status,
          lead_temperature: editingStudent.lead_temperature
        })
      });
      
      if (res.ok) {
        setNotification({type: 'success', message: `Student profile updated.`});
        fetchData(); 
        setAllStudents(prev => prev.map(s => s.id === editingStudent.id ? editingStudent : s));
      } else {
        setNotification({type: 'error', message: "Failed to update student."});
      }
    } catch (error) {
      setNotification({type: 'error', message: "Network error."});
    } finally {
      setIsSavingStudent(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const generateAIReport = async () => {
    if (!editingStudent) return;
    setIsGeneratingAI(true);
    setAiReport("");
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ai-strategy`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ case_id: editingStudent.id })
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setAiReport(data.report);
      } else {
        setAiReport("AI Analysis failed. Please ensure the student has valid PDF documents or notes attached.");
      }
    } catch (error) {
      setAiReport("Network Error. Could not connect to Gemini API.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleDocumentUpload = async (file: File, docType: string) => {
    if (!editingStudent) return;
    setIsUploadingDoc(true);
    try {
      const token = localStorage.getItem("fortrust_token");
      const formData = new FormData();
      if (docType === "Report Card") formData.append("report_card", file);
      else if (docType === "Psychology Test") formData.append("psych_test", file);
      else formData.append("report_card", file);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline/${editingStudent.id}/document`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        setNotification({type: 'success', message: `${docType} uploaded securely to vault.`});
        fetchData();
        const newDoc = { title: `${docType} - ${file.name}`, filename: file.name };
        const currentDocs = typeof editingStudent.documents === 'string' ? JSON.parse(editingStudent.documents || "[]") : (editingStudent.documents || []);
        setEditingStudent({ ...editingStudent, documents: [...currentDocs, newDoc] });
      } else {
        setNotification({type: 'error', message: "Failed to upload document."});
      }
    } catch (error) {
      setNotification({type: 'error', message: "Network error during upload."});
    } finally {
      setIsUploadingDoc(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const getStatusColor = (status: string) => {
    const s = (status || "").toUpperCase();
    if (s === "NEW LEAD") return "bg-blue-50 text-blue-700 border-blue-200";
    if (s === "QUALIFIED") return "bg-purple-50 text-purple-700 border-purple-200";
    if (s === "CONSULTING") return "bg-amber-50 text-amber-700 border-amber-200";
    if (s === "APPLICATION") return "bg-orange-50 text-orange-700 border-orange-200";
    if (s === "VISA") return "bg-pink-50 text-pink-700 border-pink-200";
    if (s === "COMPLETED") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s === "REJECTED") return "bg-red-50 text-red-700 border-red-200";
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  const filteredStudents = allStudents.filter(student => {
    const matchesSearch = (student.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (student.email || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || (student.status || "NEW LEAD").toUpperCase() === statusFilter;
    const matchesAgent = agentFilter === "ALL" || 
                         (agentFilter === "UNASSIGNED" && (!student.assignee || student.assignee === "Unassigned")) ||
                         student.assignee === agentFilter;
    
    return matchesSearch && matchesStatus && matchesAgent;
  });

  const totalStudents = allStudents.length;
  const unassignedCount = allStudents.filter(s => !s.assignee || s.assignee === "Unassigned").length;
  const inProgressCount = allStudents.filter(s => s.status !== "COMPLETED" && s.status !== "REJECTED").length;
  const completedCount = allStudents.filter(s => s.status === "COMPLETED").length;

  let studentDocs = [];
  if (editingStudent && editingStudent.documents) {
    try {
      studentDocs = typeof editingStudent.documents === 'string' ? JSON.parse(editingStudent.documents) : editingStudent.documents;
    } catch (e) { studentDocs = []; }
  }

  const standardRequirements = [
    { type: "Passport", name: "Valid International Passport (Bio Page)", required: true },
    { type: "Report Card", name: "Academic Transcript (Last 1 Year)", required: true },
    { type: "English Test", name: "IELTS / PTE / TOEFL Certificate", required: true },
    { type: "SOP", name: "Statement of Purpose (SOP)", required: false },
    { type: "Psychology Test", name: "HCC Profiling Test Results", required: false }
  ];

  const getDocStatus = (reqType: string) => {
    const found = studentDocs.find((d: any) => (d.title || "").toUpperCase().includes(reqType.toUpperCase()));
    return found ? { uploaded: true, file: found } : { uploaded: false, file: null };
  };

  return (
    <div className="p-4 lg:p-8 max-w-[1600px] mx-auto w-full relative animate-in fade-in">
      
      {notification && (
        <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-2xl font-bold flex items-center justify-between shadow-2xl animate-in slide-in-from-top-4
          ${notification.type === 'success' ? 'bg-[#282860] text-white border border-[#3a3a7a]' : 'bg-red-500 text-white border border-red-600'}`}>
          <div className="flex items-center gap-3">
            {notification.type === 'success' ? <CheckCircle2 className="text-[#BAD133]" size={20}/> : <ShieldAlert size={20}/>}
            {notification.message}
          </div>
          <button onClick={() => setNotification(null)} className="ml-6 opacity-70 hover:opacity-100 transition-opacity"><X size={18} /></button>
        </div>
      )}

      {/* HEADER */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#282860] flex items-center gap-3">
            <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
              <GraduationCap className="text-[#BAD133]" size={28} />
            </div>
            Global Student Database
          </h1>
          <p className="text-slate-500 mt-2 font-medium text-sm">
            View, search, and manage all student applications across the entire network.
          </p>
        </div>
        
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-[#282860] hover:bg-[#1b1b42] text-white px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-md flex items-center gap-2 active:scale-95 shrink-0"
        >
          <Plus size={18} /> Register New Student
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Students</p>
          <p className="text-3xl font-black text-[#282860]">{totalStudents}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">In Progress</p>
          <p className="text-3xl font-black text-[#282860]">{inProgressCount}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1">Unassigned Leads</p>
          <p className="text-3xl font-black text-[#282860]">{unassignedCount}</p>
        </div>
        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Successfully Placed</p>
          <p className="text-3xl font-black text-emerald-600">{completedCount}</p>
        </div>
      </div>

      {/* TABLE CONTROLS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[700px] overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex items-center text-slate-400 bg-white px-4 py-2.5 rounded-xl border border-slate-200 w-full md:w-96 focus-within:border-[#BAD133] focus-within:ring-2 focus-within:ring-[#BAD133]/20 transition-all shadow-sm">
            <Search size={18} className="mr-3 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search student name or email..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-slate-700 w-full font-medium" 
            />
          </div>
          
          <div className="flex w-full md:w-auto gap-3">
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#BAD133] shadow-sm cursor-pointer"
            >
              <option value="ALL">All Stages</option>
              <option value="NEW LEAD">New Lead</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="CONSULTING">Consulting</option>
              <option value="APPLICATION">Application</option>
              <option value="VISA">Visa</option>
              <option value="COMPLETED">Completed</option>
            </select>
            
            <select 
              value={agentFilter} 
              onChange={(e) => setAgentFilter(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#BAD133] shadow-sm cursor-pointer"
            >
              <option value="ALL">All Agents</option>
              <option value="UNASSIGNED">Unassigned Only</option>
              {agents.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div className="flex-1 overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-[#f8fafc] border-b border-slate-200 text-[10px] font-black text-slate-400 tracking-widest uppercase sticky top-0 z-10">
              <tr>
                <th className="px-6 py-5">Student Identity</th>
                <th className="px-6 py-5">Pipeline Stage</th>
                <th className="px-6 py-5">Target Destination</th>
                <th className="px-6 py-5">Assigned Agent</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="p-16 text-center"><Loader2 size={32} className="animate-spin text-[#BAD133] mx-auto mb-4"/> Syncing Global Database...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={5} className="p-16 text-center text-slate-400 font-medium">No students match your criteria.</td></tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => { setEditingStudent(student); setDossierTab("profile"); }}>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-black shrink-0 border-2 border-white shadow-sm">
                          {student.name ? student.name.charAt(0).toUpperCase() : "S"}
                        </div>
                        <div>
                          <p className="font-bold text-[#282860] text-base group-hover:text-[#BAD133] transition-colors">{student.name || "Unknown Student"}</p>
                          <p className="text-xs text-slate-500">{student.email || "No email"}</p>
                          {student.phone && <p className="text-[10px] text-slate-400 font-bold tracking-wider mt-0.5">{student.phone}</p>}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider ${getStatusColor(student.status)}`}>
                        {student.status || "NEW LEAD"}
                      </span>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">Last Update: {new Date(student.updated_at || student.created_at).toLocaleDateString()}</p>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-bold text-slate-700 text-sm">
                        <MapPin size={14} className="text-slate-400"/> {student.country_interest || "Not Specified"}
                      </div>
                      <div className="flex items-center gap-1.5 font-medium text-slate-500 text-xs mt-1">
                        <Building size={12} className="text-slate-300"/> {student.program_interest || "Undecided"}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {!student.assignee || student.assignee === "Unassigned" ? (
                        <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-bold">
                          <UserMinus size={14}/> Unassigned
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-[10px]">
                            {student.assignee.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-slate-700 text-sm">{student.assignee}</span>
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => { setEditingStudent(student); setDossierTab("profile"); }} className="p-2 bg-white text-slate-400 hover:text-[#282860] hover:bg-slate-100 border border-slate-200 rounded-lg shadow-sm transition-colors" title="View Student Dossier">
                          <FileText size={16} />
                        </button>
                        <button 
                          onClick={() => { setStudentToReassign(student); setIsReassignModalOpen(true); }}
                          className="px-3 py-2 bg-slate-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 hover:border-blue-600 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                        >
                          <RefreshCcw size={14}/> Reassign
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD NEW STUDENT MODAL --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-[#f8fafc]">
              <h2 className="text-xl font-bold text-[#282860] flex items-center gap-2">
                <GraduationCap size={22} className="text-[#BAD133]" /> Register New Student
              </h2>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
            </div>
            
            <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar bg-slate-50">
              <form id="add-student-form" onSubmit={handleCreateStudent} className="space-y-6">
                
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2"><FileText size={14} className="text-blue-500"/> Student Identity</h3>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Full Name</label>
                    <input type="text" required placeholder="e.g. Sarah Jenkins" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Email Address</label>
                      <input type="email" placeholder="sarah@example.com" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" value={newStudent.email} onChange={e => setNewStudent({...newStudent, email: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Phone Number</label>
                      <input type="text" placeholder="+62 812..." className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" value={newStudent.phone} onChange={e => setNewStudent({...newStudent, phone: e.target.value})} />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4 pt-2">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2"><MapPin size={14} className="text-emerald-500"/> Pipeline Routing</h3>
                  
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Assign To Agent</label>
                    <select className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all cursor-pointer font-bold text-[#282860]" value={newStudent.assignee} onChange={e => setNewStudent({...newStudent, assignee: e.target.value})}>
                      <option value="">Unassigned (Open Pool)</option>
                      {agents.map(a => <option key={a.id} value={a.name}>{a.name} ({a.branch})</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Lead Temperature</label>
                      <select className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] cursor-pointer" value={newStudent.lead_temperature} onChange={e => setNewStudent({...newStudent, lead_temperature: e.target.value})}>
                        <option value="Hot Leads">🔥 Hot Lead</option>
                        <option value="Warm Leads">☀️ Warm Lead</option>
                        <option value="Cold Leads">❄️ Cold Lead</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Program Interest</label>
                      <input type="text" placeholder="e.g. Master of Data Science" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" value={newStudent.program_interest} onChange={e => setNewStudent({...newStudent, program_interest: e.target.value})} />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Lead Source</label>
                    <input type="text" placeholder="e.g. Instagram Ads, Education Fair" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" value={newStudent.lead_source} onChange={e => setNewStudent({...newStudent, lead_source: e.target.value})} />
                  </div>
                </div>

              </form>
            </div>
            
            <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]">
              <button onClick={() => setIsAddModalOpen(false)} type="button" className="px-6 py-2.5 text-slate-500 font-bold text-sm hover:text-slate-800 transition-colors">Cancel</button>
              <button form="add-student-form" type="submit" disabled={isCreatingStudent} className="bg-[#282860] hover:bg-[#1b1b42] active:scale-95 text-white px-8 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-50">
                {isCreatingStudent ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : "Register Student"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- REASSIGN MODAL --- */}
      {isReassignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-[#f8fafc]">
              <h2 className="text-xl font-bold text-[#282860] flex items-center gap-2"><RefreshCcw size={22} className="text-blue-500" /> Reassign Pipeline</h2>
              <button onClick={() => { setIsReassignModalOpen(false); setSelectedNewAgent(""); }} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Student Selected</p>
                <p className="font-bold text-[#282860] text-lg">{studentToReassign?.name}</p>
                <p className="text-sm text-slate-500 mt-1">Currently assigned to: <span className="font-bold text-slate-700">{studentToReassign?.assignee || "Unassigned"}</span></p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Select New Agent</label>
                <select 
                  value={selectedNewAgent} 
                  onChange={(e) => setSelectedNewAgent(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-[#282860] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-slate-50 focus:bg-white cursor-pointer transition-all"
                >
                  <option value="" disabled>-- Choose Agent --</option>
                  {agents.filter(a => a.name !== studentToReassign?.assignee).map(agent => (
                    <option key={agent.id} value={agent.name}>{agent.name} ({agent.branch})</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button onClick={() => setIsReassignModalOpen(false)} className="px-5 py-3 text-slate-500 hover:text-slate-800 font-bold text-sm transition-colors">Cancel</button>
                <button 
                  disabled={!selectedNewAgent || isAssigning} 
                  onClick={handleReassign} 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-xl transition-all disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
                >
                  {isAssigning ? <><Loader2 size={16} className="animate-spin"/> Moving...</> : "Confirm Transfer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ENTERPRISE STUDENT DOSSIER SLIDE-OUT PANEL --- */}
      {editingStudent && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity" onClick={() => setEditingStudent(null)}></div>
          <div className="fixed inset-y-0 right-0 w-full sm:w-[750px] bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col transform transition-transform duration-300 ease-out">
            
            <div className="p-8 border-b border-slate-100 bg-[#1b1b42] text-white flex justify-between items-start relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#BAD133] rounded-full blur-[80px] opacity-10 pointer-events-none"></div>
              <div className="relative z-10 flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white font-black text-2xl shadow-inner">
                  {editingStudent.name ? editingStudent.name.charAt(0).toUpperCase() : "S"}
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#BAD133] mb-1.5 block">Student Dossier</span>
                  <h3 className="text-3xl font-black">{editingStudent.name}</h3>
                  <p className="text-sm text-slate-300 mt-1 flex items-center gap-2"><Mail size={14}/> {editingStudent.email || "No Email"}</p>
                </div>
              </div>
              <button onClick={() => setEditingStudent(null)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors relative z-10"><X size={20}/></button>
            </div>

            {/* DOSSIER TABS */}
            <div className="flex bg-slate-50 border-b border-slate-200 px-6 shrink-0 overflow-x-auto custom-scrollbar">
              <button onClick={() => setDossierTab('profile')} className={`px-4 py-4 text-sm font-bold tracking-wider whitespace-nowrap transition-colors flex items-center gap-2 ${dossierTab === 'profile' ? 'border-b-2 border-[#282860] text-[#282860] bg-white' : 'text-slate-400 hover:text-[#282860]'}`}>
                <Edit2 size={16} /> Profile Settings
              </button>
              <button onClick={() => setDossierTab('documents')} className={`px-4 py-4 text-sm font-bold tracking-wider whitespace-nowrap transition-colors flex items-center gap-2 ${dossierTab === 'documents' ? 'border-b-2 border-[#282860] text-[#282860] bg-white' : 'text-slate-400 hover:text-[#282860]'}`}>
                <UploadCloud size={16} /> Application Vault
              </button>
              <button onClick={() => setDossierTab('ai')} className={`px-4 py-4 text-sm font-bold tracking-wider whitespace-nowrap transition-colors flex items-center gap-2 ${dossierTab === 'ai' ? 'border-b-2 border-[#BAD133] text-[#1b1b42] bg-white' : 'text-slate-400 hover:text-[#282860]'}`}>
                <BrainCircuit size={16} /> AI Intelligence
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
              
              {/* TAB 1: PROFILE EDIT */}
              {dossierTab === 'profile' && (
                <div className="p-6">
                  <form id="edit-student-form" onSubmit={handleEditStudent} className="space-y-6 animate-in fade-in">
                    
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                      <h4 className="text-xs font-black text-[#282860] uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-3"><FileText size={16} className="text-blue-500"/> Personal Identity</h4>
                      
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Full Name</label>
                        <input type="text" required className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" value={editingStudent.name || ""} onChange={e => setEditingStudent({...editingStudent, name: e.target.value})} />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block flex items-center gap-1"><Mail size={12}/> Email Address</label>
                          <input type="email" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" value={editingStudent.email || ""} onChange={e => setEditingStudent({...editingStudent, email: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block flex items-center gap-1"><Phone size={12}/> Phone / WA</label>
                          <input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" value={editingStudent.phone || ""} onChange={e => setEditingStudent({...editingStudent, phone: e.target.value})} />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                      <h4 className="text-xs font-black text-[#282860] uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-3"><BookOpen size={16} className="text-emerald-500"/> Academic & Pipeline Profile</h4>
                      
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Program Interest</label>
                        <input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" value={editingStudent.program_interest || ""} onChange={e => setEditingStudent({...editingStudent, program_interest: e.target.value})} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block flex items-center gap-1"><Thermometer size={12}/> Lead Temp</label>
                          <select className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] cursor-pointer" value={editingStudent.lead_temperature || "Cold Leads"} onChange={e => setEditingStudent({...editingStudent, lead_temperature: e.target.value})}>
                            <option value="Hot Leads">Hot Leads</option>
                            <option value="Warm Leads">Warm Leads</option>
                            <option value="Cold Leads">Cold Leads</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Pipeline Status</label>
                          <select className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] cursor-pointer" value={editingStudent.status || "NEW LEAD"} onChange={e => setEditingStudent({...editingStudent, status: e.target.value})}>
                            <option value="NEW LEAD">NEW LEAD</option>
                            <option value="QUALIFIED">QUALIFIED</option>
                            <option value="CONSULTING">CONSULTING</option>
                            <option value="APPLICATION">APPLICATION</option>
                            <option value="VISA">VISA</option>
                            <option value="COMPLETED">COMPLETED</option>
                            <option value="REJECTED">REJECTED</option>
                          </select>
                        </div>
                      </div>
                    </div>

                  </form>
                </div>
              )}

              {/* TAB 2: APPLICATION VAULT (CHECKLIST) */}
              {dossierTab === 'documents' && (
                <div className="p-6 space-y-6 animate-in fade-in">
                  
                  {/* Summary Block */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between shadow-sm gap-4">
                    <div>
                      <h3 className="font-black text-[#282860] flex items-center gap-2"><UploadCloud size={20} className="text-blue-500"/> Application Document Matrix</h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-md">Verify required admission documents before pushing the student's pipeline stage to <strong>Application</strong>.</p>
                    </div>
                    {standardRequirements.filter(req => req.required && !getDocStatus(req.type).uploaded).length > 0 ? (
                      <div className="bg-red-50 text-red-600 px-4 py-2.5 rounded-xl text-xs font-bold border border-red-200 flex items-center gap-2">
                        <AlertCircle size={16}/> Missing Required Files
                      </div>
                    ) : (
                      <div className="bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-xl text-xs font-bold border border-emerald-200 flex items-center gap-2">
                        <CheckCircle2 size={16}/> Ready for Submission
                      </div>
                    )}
                  </div>

                  {/* Document Checklist Array */}
                  <div className="space-y-3">
                    {standardRequirements.map((req, i) => {
                      const docStatus = getDocStatus(req.type);
                      return (
                        <div key={i} className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl border shrink-0 ${docStatus.uploaded ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                              <FileText size={20}/>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-[#282860]">{req.name}</p>
                                {req.required && !docStatus.uploaded && <span className="bg-red-100 text-red-700 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">Required</span>}
                              </div>
                              {docStatus.uploaded ? (
                                <p className="text-xs text-slate-400 font-mono mt-0.5">{docStatus.file.filename}</p>
                              ) : (
                                <p className="text-xs text-slate-400 mt-0.5 italic">Not uploaded yet.</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="shrink-0 flex items-center gap-2">
                            {docStatus.uploaded ? (
                              <>
                                <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider">Uploaded</span>
                                <button className="p-2 bg-slate-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 rounded-lg shadow-sm transition-colors" title="View Document">
                                  <Eye size={16} />
                                </button>
                              </>
                            ) : (
                              <label className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 shadow-sm">
                                {isUploadingDoc ? <Loader2 size={14} className="animate-spin"/> : <UploadCloud size={14}/>}
                                <span>Upload</span>
                                <input 
                                  type="file" 
                                  accept=".pdf,.jpg,.jpeg,.png" 
                                  className="hidden" 
                                  onChange={(e) => {
                                    if(e.target.files && e.target.files[0]) handleDocumentUpload(e.target.files[0], req.type);
                                  }} 
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Catch-all for extra unclassified documents */}
                  {studentDocs.filter((d: any) => !standardRequirements.some(req => (d.title || "").toUpperCase().includes(req.type.toUpperCase()))).length > 0 && (
                    <div className="mt-8">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 pl-2">Additional Files</h4>
                      <div className="space-y-3">
                        {studentDocs.filter((d: any) => !standardRequirements.some(req => (d.title || "").toUpperCase().includes(req.type.toUpperCase()))).map((doc: any, i: number) => (
                          <div key={i} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="bg-slate-50 text-slate-500 border border-slate-200 p-2.5 rounded-lg"><FileText size={18}/></div>
                              <div>
                                <p className="text-sm font-bold text-[#282860]">{doc.title || "Untitled Document"}</p>
                                <p className="text-xs text-slate-400 font-mono mt-0.5">{doc.filename || "unknown_file.pdf"}</p>
                              </div>
                            </div>
                            <button className="text-blue-600 font-bold text-xs bg-blue-50 px-3 py-1.5 rounded-lg transition-colors border border-blue-100 flex items-center gap-1.5">
                              <Eye size={14}/> View
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: AI INTELLIGENCE */}
              {dossierTab === 'ai' && (
                <div className="p-6 h-full flex flex-col animate-in fade-in">
                  
                  {!aiReport && !isGeneratingAI && (
                    <div className="bg-[#1b1b42] rounded-3xl p-8 shadow-xl text-center flex flex-col items-center justify-center relative overflow-hidden border border-[#282860] mt-10">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#BAD133] to-[#282860]"></div>
                      <BrainCircuit size={64} className="text-[#BAD133] mb-6 drop-shadow-[0_0_15px_rgba(186,209,51,0.3)]" />
                      <h3 className="text-2xl font-black text-white mb-2">Generate Strategic Profile</h3>
                      <p className="text-slate-300 text-sm mb-8 max-w-md mx-auto leading-relaxed">
                        Fortrust AI will scan {editingStudent.name}'s uploaded HCC Psychological test and Academic Report Cards to generate a comprehensive placement strategy.
                      </p>
                      <button onClick={generateAIReport} className="bg-[#BAD133] hover:bg-[#a3b827] text-[#1b1b42] font-black px-8 py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center gap-3">
                        <Activity size={20} /> Run AI Analysis
                      </button>
                    </div>
                  )}

                  {isGeneratingAI && (
                    <div className="flex flex-col items-center justify-center py-20 flex-1">
                      <div className="relative mb-6">
                        <div className="absolute inset-0 bg-[#BAD133] rounded-full blur-xl opacity-20 animate-pulse"></div>
                        <Loader2 size={48} className="animate-spin text-[#BAD133] relative z-10" />
                      </div>
                      <h3 className="text-xl font-black text-[#282860] mb-2">Analyzing Dossier...</h3>
                      <p className="text-sm text-slate-500 font-medium">Extracting psychological traits and calculating academic metrics.</p>
                    </div>
                  )}

                  {aiReport && !isGeneratingAI && (
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
                      <div className="bg-slate-50 border-b border-slate-100 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={18} className="text-emerald-500"/>
                          <span className="font-bold text-[#282860]">AI Strategic Report</span>
                        </div>
                        <button onClick={generateAIReport} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"><RefreshCcw size={12}/> Regenerate</button>
                      </div>
                      <div className="p-6 overflow-y-auto custom-scrollbar flex-1 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {aiReport}
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>
            
            {/* DOSSIER FOOTER (Only show Save if on Profile Tab) */}
            {dossierTab === 'profile' && (
              <div className="p-5 border-t border-slate-200 bg-white flex justify-end gap-3 shrink-0 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]">
                <button onClick={() => setEditingStudent(null)} type="button" className="px-5 py-2.5 text-slate-500 font-bold text-sm hover:text-slate-800 transition-colors">Cancel</button>
                <button form="edit-student-form" type="submit" disabled={isSavingStudent} className="bg-[#282860] hover:bg-[#1b1b42] active:scale-95 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-50">
                  {isSavingStudent ? <><Loader2 size={16} className="animate-spin"/> Saving...</> : <><Save size={16}/> Save Changes</>}
                </button>
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
}