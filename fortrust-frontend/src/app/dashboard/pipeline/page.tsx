"use client"; 

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Sparkles, UploadCloud, Users, FileText, X, Phone, Mail, 
  MessageSquare, Send, Clock, MessageCircle, GraduationCap, 
  Building, Plus, Calendar, CheckCircle2, DownloadCloud, 
  ShieldAlert, Building2, DollarSign, Activity, BrainCircuit,
  BookOpen, Search, Download, FileSignature, Target, ChevronRight, Filter
} from "lucide-react";
import ReactMarkdown from "react-markdown";

const STATUS_OPTIONS = ["NEW LEAD", "QUALIFIED LEADS", "CONSULTING PROCESS", "UNI APPLICATION", "VISA", "COMPLETED"];

export default function PipelinePage() {
  const [user, setUser] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UX UPGRADE: Clean Tab Navigation
  const [activeTab, setActiveTab] = useState<"pipeline" | "earnings">("pipeline");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal States
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  
  // Panel States
  const [selectedStudent, setSelectedStudent] = useState<any>(null); 
  const [panelTab, setPanelTab] = useState<"overview" | "consultation" | "application">("overview");
  
  // Loading & Action States
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiReport, setAiReport] = useState<string>("");
  const [isDraftingEmail, setIsDraftingEmail] = useState(false);
  const [isDraftingWA, setIsDraftingWA] = useState(false);

  // Timeline States
  const [newNote, setNewNote] = useState("");
  const [newReminderDate, setNewReminderDate] = useState(""); 
  const [showDatePicker, setShowDatePicker] = useState(false);

  // New Lead Form States
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [reportCardFiles, setReportCardFiles] = useState<File[]>([]);
  const [psychTestFiles, setPsychTestFiles] = useState<File[]>([]);
  const [slideOutReportCard, setSlideOutReportCard] = useState<File | null>(null);
  const [slideOutPsychTest, setSlideOutPsychTest] = useState<File | null>(null);

  // Anti-Cheat Commission States
  const [selectedInstitutionId, setSelectedInstitutionId] = useState("");
  const [verifyTuition, setVerifyTuition] = useState("");
  const [verifyRate, setVerifyRate] = useState("");
  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<{verified?: boolean, reason?: string, message?: string} | null>(null);

  // App Tracker States
  const [newAppUni, setNewAppUni] = useState("");
  const [newAppProg, setNewAppProg] = useState("");
  const [newAppStatus, setNewAppStatus] = useState("Pending");

  useEffect(() => {
    const storedUser = localStorage.getItem("fortrust_user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      fetchStudents(parsedUser.role, parsedUser.name);
      fetchInstitutions(); 
    }
  }, []);

  const fetchStudents = (role: string, agentName: string) => {
    const token = localStorage.getItem("fortrust_token");
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline?role=${role}&agent_code=${encodeURIComponent(agentName)}`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then((res) => {
        if (res.status === 401) {
          localStorage.removeItem("fortrust_token");
          window.location.href = "/";
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.status === "success") {
          setStudents(Array.isArray(data.data) ? data.data : []);
          setSelectedStudent((prev: any) => {
            if (!prev) return null;
            return data.data.find((s: any) => s.id === prev.id) || prev;
          });
        }
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
      });
  };

  const fetchInstitutions = async () => {
    const token = localStorage.getItem("fortrust_token");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/institutions`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") {
        setInstitutions(data.data);
      }
    } catch (err) {
      console.error("Failed to load network directory");
    }
  };

  const getStatusColor = (status: string) => {
    const s = status?.toUpperCase() || "";
    if (s.includes("QUALIFIED")) return "bg-blue-100 text-blue-800 border-blue-200";
    if (s.includes("VISA") || s.includes("APPLICATION")) return "bg-orange-100 text-orange-800 border-orange-200";
    if (s.includes("COMPLETED") || s.includes("ACCEPTED") || s.includes("RECEIVED")) return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (s.includes("REJECTED")) return "bg-red-100 text-red-800 border-red-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  const updateStudentStatus = async (studentId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline/${studentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchStudents(user.role, user.name);
      }
    } catch (error) {
      alert("Network error updating status");
    }
  };

  const handleSaveLead = async () => {
    setIsSaving(true);
    const formData = new FormData();
    formData.append("name", newName);
    formData.append("email", newEmail);
    formData.append("phone", newPhone);
    formData.append("assignee", user?.name || "Unassigned");
    
    if (reportCardFiles.length === 0) formData.append("report_cards", new File([""], "empty.txt", { type: "text/plain" }));
    else reportCardFiles.forEach(file => formData.append("report_cards", file));

    if (psychTestFiles.length === 0) formData.append("psych_tests", new File([""], "empty.txt", { type: "text/plain" }));
    else psychTestFiles.forEach(file => formData.append("psych_tests", file));

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline`, { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        alert(`Error: ${JSON.stringify(err.detail || "Failed to save lead.")}`);
        return;
      }
      setIsSingleModalOpen(false); 
      setNewName(""); setNewEmail(""); setNewPhone(""); 
      setReportCardFiles([]); setPsychTestFiles([]);
      fetchStudents(user.role, user.name);       
    } catch (error) { 
      alert("Network Error: Could not reach the server."); 
    } finally { setIsSaving(false); }
  };

  const handleBulkImport = async () => {
    if (!bulkFile) return;
    setIsSaving(true);
    const formData = new FormData();
    formData.append("file", bulkFile);
    formData.append("assignee", user?.name || "Unassigned");
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline/bulk`, { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok) return alert(result.detail || "Import failed.");
      alert(result.message || "Import complete.");
      setIsBulkModalOpen(false); setBulkFile(null); fetchStudents(user.role, user.name);
    } catch (error) { alert("Error parsing document."); } finally { setIsSaving(false); }
  };

  const handleUploadToExisting = async (caseId: string) => {
    if (reportCardFiles.length === 0 && psychTestFiles.length === 0) return alert("Please select at least one file to upload.");
    setIsSaving(true);
    try {
      const formData = new FormData();
      reportCardFiles.forEach((file) => formData.append("file", file));
      psychTestFiles.forEach((file) => formData.append("file", file));
      const token = localStorage.getItem("fortrust_token");
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline/${caseId}/document`, {
        method: "PUT", headers: { "Authorization": `Bearer ${token}` }, body: formData,
      });
      if (!response.ok) throw new Error("Failed to upload to server");
      alert("Documents successfully uploaded and saved to the student's profile!");
      setReportCardFiles([]); setPsychTestFiles([]);
    } catch (error: any) { alert(`Upload failed: ${error.message}`); } finally { setIsSaving(false); }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedStudent) return;
    setIsSaving(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline/${selectedStudent.id}/notes`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: newNote, author: user?.name || "Agent", reminder_date: newReminderDate || null }),
      });
      setNewNote(""); setNewReminderDate(""); setShowDatePicker(false);
      fetchStudents(user.role, user.name);
    } catch (error) { alert("Failed to save note."); } finally { setIsSaving(false); }
  };

  const handleVerifyCommission = async () => {
    if (!verifyFile || !verifyTuition || !verifyRate || !selectedInstitutionId) return;
    setIsVerifying(true); setVerifyStatus(null);
    const formData = new FormData();
    const token = localStorage.getItem("fortrust_token");
    formData.append("institution_id", selectedInstitutionId); 
    formData.append("tuition", verifyTuition);
    formData.append("commission_rate", verifyRate);
    formData.append("proof_document", verifyFile);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline/${selectedStudent.id}/verify-commission`, { 
        method: "POST", headers: { "Authorization": `Bearer ${token}` }, body: formData 
      });
      const data = await response.json();
      setVerifyStatus(data);
      if (data.verified) fetchStudents(user.role, user.name); 
    } catch (error) { alert("Verification server error."); } finally { setIsVerifying(false); }
  };
  
  const syncApplications = async (updatedApps: any[]) => {
    setIsSaving(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline/${selectedStudent.id}/applications`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applications: updatedApps }),
      });
      fetchStudents(user.role, user.name); 
    } catch (error) { alert("Failed to update applications."); } finally { setIsSaving(false); }
  };

  const handleAddApplication = () => {
    if (!newAppUni.trim() || !newAppProg.trim()) return;
    const currentApps = selectedStudent.applications || [];
    const newApp = { id: Date.now().toString(), university: newAppUni, program: newAppProg, status: newAppStatus };
    syncApplications([...currentApps, newApp]);
    setNewAppUni(""); setNewAppProg(""); setNewAppStatus("Pending");
  };

  const handleUpdateAppStatus = (appId: string, newStatus: string) => {
    const updatedApps = selectedStudent.applications.map((app: any) => app.id === appId ? { ...app, status: newStatus } : app);
    syncApplications(updatedApps);
  };

  const handleGenerateAI = async (studentId: string, studentName: string) => {
    setAiReport(`Fetching data and parsing PDF for ${studentName}...\nPlease wait...`);
    setIsGenerating(true); setIsAiModalOpen(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ai-strategy`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ case_id: studentId }), 
      });
      const result = await response.json();
      setAiReport(result.report || "Failed to generate report.");
    } catch (error) { setAiReport("Network Error."); } finally { setIsGenerating(false); }
  };

  const handleDraftEmail = async () => {
    if (!selectedStudent) return;
    setIsDraftingEmail(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline/${selectedStudent.id}/draft-email`, { method: "POST" });
      const data = await response.json();
      if (data.status === "success") {
        const mailtoLink = `mailto:${selectedStudent.email}?subject=${encodeURIComponent(data.data.subject)}&body=${encodeURIComponent(data.data.body)}`;
        window.location.href = mailtoLink;
      } else alert("Failed to draft email.");
    } catch (error) { alert("Network error drafting email."); } finally { setIsDraftingEmail(false); }
  };

  const handleDraftWhatsApp = async () => {
    if (!selectedStudent) return;
    setIsDraftingWA(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline/${selectedStudent.id}/draft-whatsapp`, { method: "POST" });
      const data = await response.json();
      if (data.status === "success") {
        const phone = selectedStudent.phone?.replace(/\D/g, '');
        const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(data.data.message)}`;
        window.open(waLink, '_blank');
      } else alert("Failed to draft WhatsApp message.");
    } catch (error) { alert("Network error drafting WhatsApp."); } finally { setIsDraftingWA(false); }
  };

  const activeTasks = (students || []).flatMap(student => 
    (student.timeline || [])
      .filter((t: any) => t.reminder_date)
      .map((t: any) => ({ ...t, studentName: student.name, studentId: student.id }))
  ).sort((a, b) => new Date(a.reminder_date).getTime() - new Date(b.reminder_date).getTime());

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 relative p-4 lg:p-8 max-w-[1400px] mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#282860] tracking-tight flex items-center gap-2"><Target className="text-[#BAD133]" /> Agent Workspace</h2>
          <p className="text-sm text-slate-500 mt-1">Manage your pipeline, hit targets, and track your commissions.</p>
        </div>
        <div className="flex gap-3 w-full lg:w-auto">
          <button onClick={() => setIsBulkModalOpen(true)} className="flex-1 lg:flex-none flex justify-center items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm"><UploadCloud size={18} className="text-[#282860]" /> Bulk Scan</button>
          <button onClick={() => setIsSingleModalOpen(true)} className="flex-1 lg:flex-none flex justify-center items-center bg-[#282860] hover:bg-[#1b1b42] text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-md shadow-[#282860]/20"><Plus size={18}/> New Lead</button>
        </div>
      </div>

      {/* --- DASHBOARD TABS --- */}
      <div className="flex gap-6 border-b border-slate-200 mb-6 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('pipeline')} 
          className={`pb-3 font-bold text-sm tracking-wider uppercase transition-colors whitespace-nowrap ${activeTab === 'pipeline' ? 'text-[#282860] border-b-2 border-[#282860]' : 'text-slate-400 hover:text-slate-600'}`}
        >
          My Student Pipeline
        </button>
        <button 
          onClick={() => setActiveTab('earnings')} 
          className={`pb-3 font-bold text-sm tracking-wider uppercase transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'earnings' ? 'text-[#282860] border-b-2 border-[#282860]' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Earnings & Payouts <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px]">Financials</span>
        </button>
      </div>

      {/* --- TAB 1: WORK ROOM (PIPELINE) --- */}
      {activeTab === 'pipeline' && (
        <div className="animate-in fade-in">
          {activeTasks.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
              <div className="flex items-center gap-2 mb-4"><Calendar className="text-[#BAD133]" size={20} /><h3 className="text-lg font-bold text-[#282860]">My Action Items</h3><span className="bg-[#BAD133]/20 text-[#282860] text-xs font-bold px-2 py-0.5 rounded-full ml-2">{activeTasks.length}</span></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {activeTasks.slice(0, 3).map((task, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between group hover:border-[#BAD133] transition-colors">
                    <div>
                      <div className="flex justify-between items-start mb-2"><span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-md shadow-sm">Due: {task.reminder_date}</span><button className="text-slate-300 hover:text-emerald-500 transition-colors" title="Mark Complete"><CheckCircle2 size={18}/></button></div>
                      <p className="font-bold text-slate-900 text-sm mt-3">{task.studentName}</p>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">{task.note}</p>
                    </div>
                    <button onClick={() => { setSelectedStudent(students.find(s => s.id === task.studentId)); setPanelTab("overview"); }} className="text-xs font-bold text-[#282860] mt-4 flex items-center gap-1 group-hover:text-[#BAD133] transition-colors">Open Profile &rarr;</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" placeholder="Search by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-[#282860]" />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="sticky top-0 bg-[#f8fafc] border-b border-slate-200 text-[10px] font-black text-slate-500 tracking-wider uppercase z-10">
                  <tr>
                    <th className="px-6 py-4">Student Profile</th>
                    <th className="px-6 py-4">Program Interest</th>
                    <th className="px-6 py-4">Pipeline Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {loading ? (
                    <tr><td colSpan={4} className="p-16 text-center text-slate-400 font-medium animate-pulse">Syncing pipeline...</td></tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr><td colSpan={4} className="p-16 text-center text-slate-500"><FileText className="mx-auto h-12 w-12 text-slate-300 mb-3" /><p className="font-medium text-slate-700">No students found.</p></td></tr>
                  ) : (
                    filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50/80 transition-colors group cursor-pointer" onClick={() => { setSelectedStudent(student); setPanelTab("overview"); }}>
                        <td className="px-6 py-4">
                          <div className="font-bold text-[#282860] group-hover:text-[#BAD133] transition-colors">{student.name}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{student.phone} • {student.email}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-medium">{student.program_interest || <span className="text-slate-300 italic">Not specified</span>}</td>
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <select 
                            className={`text-[10px] font-black tracking-wider uppercase px-3 py-1.5 rounded-lg border outline-none cursor-pointer ${getStatusColor(student.status)}`}
                            value={student.status || "NEW LEAD"}
                            onChange={(e) => updateStudentStatus(student.id, e.target.value)}
                          >
                            {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        </td>
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button className="text-[#BAD133] group-hover:text-white group-hover:bg-[#BAD133] border border-[#BAD133] rounded-full p-1.5 transition-colors inline-block"><ChevronRight size={18}/></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: FINANCE ROOM (EARNINGS) --- */}
      {activeTab === 'earnings' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Earnings KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5">
              <div className="h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center"><Users className="text-blue-600" size={24} /></div>
              <div><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Closed Deals</p>
              <p className="text-3xl font-black text-[#282860] mt-1">{students.filter(s => s.status?.toUpperCase() === "COMPLETED").length}</p></div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5">
              <div className="h-14 w-14 rounded-full bg-amber-50 flex items-center justify-center"><Clock className="text-amber-500" size={24} /></div>
              <div><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pending Payouts</p>
              <p className="text-3xl font-black text-[#282860] mt-1">${students.filter(s => s.status?.toUpperCase() === "COMPLETED").reduce((acc, curr) => acc + (parseFloat(curr.agent_cut) || 0), 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p></div>
            </div>

            <div className="bg-gradient-to-br from-[#282860] to-[#1b1b42] p-6 rounded-2xl shadow-lg border border-[#3a3a7a] flex items-center gap-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#BAD133] rounded-full blur-3xl opacity-20 -mr-10 -mt-10"></div>
              <div className="h-14 w-14 rounded-full bg-white/10 flex items-center justify-center relative z-10"><DollarSign className="text-[#BAD133]" size={24} /></div>
              <div className="relative z-10"><p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Total Earned YTD</p><p className="text-3xl font-black text-white mt-1">$0.00</p></div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-[#f8fafc] flex justify-between items-center">
              <h3 className="font-bold text-[#282860]">Commission Ledger</h3>
              <span className="text-[10px] font-black bg-[#282860] text-white uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-sm">Your Tier Rate: {user?.role || "Agent"}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white text-[#64748b] text-[10px] uppercase tracking-widest border-b border-slate-200">
                  <tr><th className="px-6 py-4">Student</th><th className="px-6 py-4">Total Commission Generated</th><th className="px-6 py-4">Your Cut</th><th className="px-6 py-4">Payment Status</th></tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {students.filter(s => s.status?.toUpperCase() === "COMPLETED").length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">No closed deals yet. Move a student to 'Completed' to earn commissions!</td></tr>
                  ) : (
                    students.filter(s => s.status?.toUpperCase() === "COMPLETED").map(student => (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-[#282860]">{student.name}</td>
                        <td className="px-6 py-4 text-slate-500">${(student.commission_earned || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        <td className="px-6 py-4 font-black text-green-600">${(parseFloat(student.agent_cut) || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        <td className="px-6 py-4"><span className="bg-amber-100 text-amber-700 px-2 py-1 flex items-center gap-1 w-fit rounded-md text-[10px] font-bold"><Clock size={12}/> PENDING</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- STUDENT DETAIL SLIDE-OUT PANEL --- */}
      {selectedStudent && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40" onClick={() => setSelectedStudent(null)}></div>
          <div className="fixed inset-y-0 right-0 w-full sm:w-[600px] bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col transform transition-transform duration-300">
            
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-[#1b1b42] text-white">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#BAD133] mb-1 block">Student Case File</span>
                <h3 className="text-2xl font-black">{selectedStudent.name}</h3>
                <div className="flex gap-3 mt-2 text-xs text-slate-300">
                  <span className="flex items-center gap-1"><Mail size={12}/> {selectedStudent.email}</span>
                  {selectedStudent.phone && <span className="flex items-center gap-1"><Phone size={12}/> {selectedStudent.phone}</span>}
                </div>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="p-1.5 hover:bg-white/20 rounded-full transition-colors"><X size={20}/></button>
            </div>

            <div className="flex bg-[#f8fafc] border-b border-slate-200 px-6">
              <button onClick={() => setPanelTab('overview')} className={`px-4 py-4 text-sm font-bold tracking-wider transition-colors flex items-center gap-2 ${panelTab === 'overview' ? 'border-b-2 border-[#282860] text-[#282860]' : 'text-slate-400 hover:text-slate-600'} `}><Activity size={16}/> Overview</button>
              <button onClick={() => setPanelTab('consultation')} className={`px-4 py-4 text-sm font-bold tracking-wider transition-colors flex items-center gap-2 ${panelTab === 'consultation' ? 'border-b-2 border-[#282860] text-[#282860]' : 'text-slate-400 hover:text-slate-600'} `}><BrainCircuit size={16}/> Consultation & Report</button>
              <button onClick={() => setPanelTab('application')} className={`px-4 py-4 text-sm font-bold tracking-wider transition-colors flex items-center gap-2 ${panelTab === 'application' ? 'border-b-2 border-[#282860] text-[#282860]' : 'text-slate-400 hover:text-slate-600'} `}><FileSignature size={16}/> Application</button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 p-6">
              {/* TAB 1: OVERVIEW */}
              {panelTab === "overview" && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Pipeline Status</p>
                    <select className="w-full bg-slate-50 border border-slate-200 text-[#282860] rounded-xl px-4 py-3 text-sm font-black tracking-wider uppercase outline-none focus:border-[#BAD133]" value={selectedStudent.status || "NEW LEAD"} onChange={(e) => updateStudentStatus(selectedStudent.id, e.target.value)}>
                      {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  
                  <div className="flex gap-2">
                    <button onClick={handleDraftEmail} disabled={isDraftingEmail} className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-[#282860] py-3 rounded-xl font-bold transition-colors disabled:opacity-50 text-xs shadow-sm"><Sparkles size={14} className="text-[#BAD133]" /> AI Email</button>
                    <button onClick={handleDraftWhatsApp} disabled={isDraftingWA} className="flex-1 flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 py-3 rounded-xl font-bold transition-colors disabled:opacity-50 text-xs shadow-sm"><Sparkles size={14} className="text-emerald-500" /> AI WhatsApp</button>
                  </div>

                  <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm min-h-[250px]">
                    <p className="text-[10px] font-bold text-[#282860] uppercase tracking-widest flex items-center gap-2 mb-4"><MessageSquare size={14}/> Activity Timeline</p>
                    <div className="relative mb-6">
                      <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Log a call, text, or set a reminder..." className="w-full border border-slate-200 rounded-xl p-3 pr-12 pb-10 text-sm outline-none focus:border-[#282860] focus:ring-2 focus:ring-[#282860]/10 resize-none h-24 shadow-sm" />
                      <div className="absolute bottom-3 left-3 flex items-center gap-2">
                        <button onClick={() => setShowDatePicker(!showDatePicker)} className={`p-1.5 rounded-md text-xs font-bold transition-colors flex items-center gap-1 ${newReminderDate ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:bg-slate-200'}`}><Calendar size={14} /> {newReminderDate ? "Task Set" : "Set Reminder"}</button>
                        {showDatePicker && (<input type="date" value={newReminderDate} onChange={(e) => { setNewReminderDate(e.target.value); setShowDatePicker(false); }} className="text-xs border border-slate-300 rounded p-1 outline-none text-slate-600 bg-white" />)}
                      </div>
                      <button onClick={handleAddNote} disabled={isSaving || !newNote.trim()} className="absolute bottom-3 right-3 bg-[#282860] text-white p-1.5 rounded-lg hover:bg-[#1b1b42] transition-colors disabled:opacity-50"><Send size={14} /></button>
                    </div>

                    <div className="space-y-4">
                      {selectedStudent.timeline && selectedStudent.timeline.length > 0 ? (
                        [...selectedStudent.timeline].reverse().map((entry: any, index: number) => (
                          <div key={index} className="flex gap-3 relative">
                            {index !== selectedStudent.timeline.length - 1 && (<div className="absolute left-3.5 top-8 bottom-[-16px] w-[2px] bg-slate-200"></div>)}
                            <div className="w-7 h-7 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center flex-shrink-0 z-10">{entry.reminder_date ? <Calendar size={12} className="text-[#BAD133]"/> : <Clock size={12} className="text-slate-400" />}</div>
                            <div className="flex-1 bg-slate-50 border border-slate-100 p-3 rounded-lg shadow-sm">
                              <div className="flex justify-between items-start mb-1"><span className="text-xs font-bold text-slate-900">{entry.author}</span><span className="text-[10px] text-slate-400 font-medium">{entry.date}</span></div>
                              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{entry.note}</p>
                              {entry.reminder_date && (<div className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-[#BAD133] bg-[#BAD133]/10 px-2 py-1 rounded-md"><Calendar size={10}/> Reminder: {entry.reminder_date}</div>)}
                            </div>
                          </div>
                        ))
                      ) : (<div className="text-center text-slate-400 text-sm italic py-4">No activity logged yet.</div>)}
                    </div>
                  </div>

                  <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4"><ShieldAlert size={14} className="text-orange-500"/> Verify Commission Check</p>
                    {selectedStudent.status?.toUpperCase().includes("COMPLETED") ? (
                      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-center">
                        <CheckCircle2 size={24} className="text-emerald-500 mx-auto mb-2" />
                        <p className="font-bold text-emerald-800 text-sm">Deal Verified & Commission Logged</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-600 flex items-center gap-1"><Building2 size={12}/> University Partner</Label>
                          <select value={selectedInstitutionId} onChange={(e) => setSelectedInstitutionId(e.target.value)} className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:ring-[#BAD133] outline-none bg-slate-50">
                            <option value="">-- Choose Partner --</option>
                            {institutions.map(inst => <option key={inst.id} value={inst.id}>{inst.name} ({inst.country})</option>)}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5"><Label className="text-xs font-bold text-slate-600">Tuition ($)</Label><Input type="number" placeholder="Tuition" value={verifyTuition} onChange={(e) => setVerifyTuition(e.target.value)} className="text-xs" /></div>
                          <div className="space-y-1.5"><Label className="text-xs font-bold text-slate-600">Rate (%)</Label><Input type="number" step="0.01" placeholder="e.g. 10%" value={verifyRate} onChange={(e) => setVerifyRate(e.target.value)} className="text-xs" /></div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-600">Proof Document (PDF)</Label>
                          <Input type="file" accept=".pdf" onChange={(e) => setVerifyFile(e.target.files?.[0] || null)} className="text-xs cursor-pointer" />
                        </div>
                        <button onClick={handleVerifyCommission} disabled={isVerifying || !verifyFile || !verifyTuition || !verifyRate || !selectedInstitutionId} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-lg text-sm transition-colors flex justify-center items-center gap-2 disabled:opacity-50 shadow-md">
                          {isVerifying ? "Verifying..." : "Verify Deal"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: CONSULTATION & REPORT */}
              {panelTab === "consultation" && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="bg-gradient-to-br from-[#282860] to-[#1b1b42] p-6 rounded-xl border border-slate-700 shadow-sm text-white">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-black text-lg flex items-center gap-2"><BrainCircuit className="text-[#BAD133]"/> AI Profiling Test</h3>
                        <p className="text-xs text-slate-300 mt-1">Send a dynamic assessment to align the student's skills with the best university programs.</p>
                      </div>
                    </div>
                    <div className="bg-white/10 p-4 rounded-lg flex items-center justify-between border border-white/10">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Status</p>
                        <p className="font-black text-[#BAD133]">Completed</p>
                      </div>
                      <button className="bg-[#BAD133] text-[#1b1b42] px-4 py-2 rounded-lg text-xs font-bold shadow-md hover:bg-[#a4b82d] transition-colors">
                        Resend Test Link
                      </button>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                      <h3 className="font-bold text-[#282860] flex items-center gap-2"><BookOpen size={18} className="text-[#BAD133]"/> AI Profiling Hasil Report</h3>
                      <button onClick={() => handleGenerateAI(selectedStudent.id, selectedStudent.name)} className="text-xs font-bold bg-[#BAD133]/20 text-[#282860] px-3 py-1 rounded-md hover:bg-[#BAD133] hover:text-white transition-colors">Regenerate AI</button>
                    </div>
                    
                    <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl mb-4">
                      <div className="w-12 h-12 bg-red-100 text-red-600 rounded-lg flex items-center justify-center font-black text-xs border border-red-200">PDF</div>
                      <div className="flex-1">
                        <p className="font-bold text-sm text-[#282860]">Report_{selectedStudent.name.replace(/\s+/g, '_')}.pdf</p>
                        <p className="text-xs text-slate-500">Generated automatically via AI Scoring Engine</p>
                      </div>
                      <a href={`${process.env.NEXT_PUBLIC_API_URL}/api/documents/Report_${selectedStudent.name.replace(/\s+/g, '_')}.pdf`} target="_blank" rel="noopener noreferrer" className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-[#282860] hover:border-[#282860] rounded-lg transition-all shadow-sm">
                        <Download size={18} />
                      </a>
                    </div>

                    <div className="space-y-1 mt-6">
                       <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Consultor Notes</label>
                       <textarea rows={4} className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#BAD133] bg-white" placeholder="Add your analysis and recommendations based on the AI report here..."></textarea>
                       <div className="flex justify-end mt-2"><button className="bg-slate-100 text-slate-600 hover:bg-[#282860] hover:text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">Save Notes</button></div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: APPLICATION TRACKER */}
              {panelTab === "application" && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="space-y-3 mb-5">
                    {selectedStudent.applications && selectedStudent.applications.length > 0 ? (
                      selectedStudent.applications.map((app: any) => (
                        <div key={app.id} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm"><div className="flex justify-between items-start mb-2"><div><p className="font-bold text-[#282860] text-sm flex items-center gap-1.5"><Building size={14} className="text-slate-400"/> {app.university}</p><p className="text-xs text-slate-500 mt-0.5">{app.program}</p></div><select value={app.status} onChange={(e) => handleUpdateAppStatus(app.id, e.target.value)} className={`text-[10px] font-bold uppercase tracking-wider py-1 px-2 rounded-md outline-none border cursor-pointer ${getStatusColor(app.status)}`}><option value="Pending">Pending</option><option value="Offer Received">Offer Received</option><option value="Accepted">Accepted (Enrolled)</option><option value="Rejected">Rejected</option></select></div></div>
                      ))
                    ) : (<div className="text-xs text-slate-400 italic text-center py-8">No applications started yet.</div>)}
                  </div>
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
                    <p className="text-xs font-bold text-slate-600">Add New Application</p>
                    <div className="space-y-2"><Input placeholder="e.g. Monash University" value={newAppUni} onChange={(e) => setNewAppUni(e.target.value)} className="text-sm bg-white" /><Input placeholder="e.g. Bachelor of Business" value={newAppProg} onChange={(e) => setNewAppProg(e.target.value)} className="text-sm bg-white" /></div>
                    <button onClick={handleAddApplication} disabled={!newAppUni || !newAppProg || isSaving} className="w-full bg-white hover:bg-slate-100 text-[#282860] border border-slate-200 font-bold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-1 disabled:opacity-50"><Plus size={16}/> Add to Tracker</button>
                  </div>
                  
                  <div className="p-6 mt-4 border border-slate-200 bg-white rounded-xl">
                    <p className="text-[10px] font-bold text-[#BAD133] uppercase tracking-widest flex items-center gap-2 mb-4"><FileText size={14}/> Student Documents</p>
                    <div className="space-y-4">
                      <div className="space-y-1.5"><Label className="text-xs font-semibold text-slate-600">School Report Card (Grades)</Label><div className="border border-slate-200 rounded-lg p-2 bg-slate-50 hover:bg-slate-100 transition-colors"><Input type="file" accept=".pdf" className="border-none shadow-none text-xs cursor-pointer bg-transparent" onChange={(e) => setSlideOutReportCard(e.target.files?.[0] || null)} /></div></div>
                      <div className="space-y-1.5"><Label className="text-xs font-semibold text-slate-600">Psychology Test</Label><div className="border border-slate-200 rounded-lg p-2 bg-slate-50 hover:bg-slate-100 transition-colors"><Input type="file" accept=".pdf" className="border-none shadow-none text-xs cursor-pointer bg-transparent" onChange={(e) => setSlideOutPsychTest(e.target.files?.[0] || null)} /></div></div>
                      {(slideOutReportCard || slideOutPsychTest) && (<button onClick={() => handleUploadToExisting(selectedStudent.id)} disabled={isSaving} className="w-full bg-[#282860] hover:bg-[#1b1b42] text-white font-bold py-2.5 rounded-lg mt-2 text-sm transition-colors shadow-md disabled:opacity-50">{isSaving ? "Uploading..." : "Save Documents"}</button>)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* --- ALL MODALS REMAIN THE SAME --- */}
      <Dialog open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-xl"><Users className="text-[#BAD133]" /> AI Bulk Scanner</DialogTitle><DialogDescription className="text-slate-500 mt-2">Upload a raw PDF list from a school expo. Gemini AI will extract data.</DialogDescription></DialogHeader>
          <div className="py-6"><div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50 hover:bg-slate-100 transition-colors"><UploadCloud className="mx-auto h-12 w-12 text-slate-400 mb-4" /><Input type="file" accept=".pdf,.csv" onChange={(e) => setBulkFile(e.target.files?.[0] || null)} className="max-w-xs mx-auto bg-white cursor-pointer" /></div></div>
          <DialogFooter><button onClick={handleBulkImport} disabled={isSaving || !bulkFile} className="w-full bg-[#282860] hover:bg-[#1b1b42] text-white py-3 rounded-xl font-medium disabled:opacity-50 transition-colors">{isSaving ? "Scanning..." : "Scan & Import Students"}</button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSingleModalOpen} onOpenChange={setIsSingleModalOpen}>
        <DialogContent className="rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-xl">Add Student Data</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-1.5"><Label className="text-slate-600">Full Name (As per Passport)</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. John Doe" className="focus-visible:ring-[#BAD133]" /></div>
            <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><Label className="text-slate-600">Email Address</Label><Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="john@example.com" className="focus-visible:ring-[#BAD133]" /></div><div className="space-y-1.5"><Label className="text-slate-600">Phone Number</Label><Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+1 555..." className="focus-visible:ring-[#BAD133]" /></div></div>
            
            <div className="space-y-4 pt-4 border-t border-slate-100 mt-2">
              <div className="space-y-2"><Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">1. School Report Card (Optional)</Label><div className="relative border-2 border-dashed border-slate-200 rounded-xl p-4 hover:bg-slate-50 transition-colors text-center cursor-pointer group"><Input type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(e) => setReportCardFiles(Array.from(e.target.files || []))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" /><div className="flex flex-col items-center justify-center pointer-events-none"><UploadCloud size={24} className="mb-2 text-slate-400 group-hover:text-[#282860] transition-colors" /><span className="font-semibold text-[#282860] text-sm">Upload File</span><span className="text-[11px] text-slate-400 mt-1">(PDF, DOCX, JPG - You can select multiple files)</span></div></div>{reportCardFiles.length > 0 && (<div className="flex flex-col items-end"><p className="text-xs font-semibold text-[#BAD133] mt-1">{reportCardFiles.length} file(s) selected</p>{reportCardFiles.map((f, i) => <span key={i} className="text-[10px] text-slate-400">{f.name}</span>)}</div>)}</div>
              <div className="space-y-2"><Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">2. Psychology / Profiling Test (Optional)</Label><div className="relative border-2 border-dashed border-slate-200 rounded-xl p-4 hover:bg-slate-50 transition-colors text-center cursor-pointer group"><Input type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(e) => setPsychTestFiles(Array.from(e.target.files || []))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" /><div className="flex flex-col items-center justify-center pointer-events-none"><UploadCloud size={24} className="mb-2 text-slate-400 group-hover:text-[#282860] transition-colors" /><span className="font-semibold text-[#282860] text-sm">Upload File</span><span className="text-[11px] text-slate-400 mt-1">(PDF, DOCX, JPG - You can select multiple files)</span></div></div>{psychTestFiles.length > 0 && (<div className="flex flex-col items-end"><p className="text-xs font-semibold text-[#BAD133] mt-1">{psychTestFiles.length} file(s) selected</p>{psychTestFiles.map((f, i) => <span key={i} className="text-[10px] text-slate-400">{f.name}</span>)}</div>)}</div>
            </div>
            <button onClick={handleSaveLead} disabled={isSaving} className="w-full bg-[#282860] hover:bg-[#1b1b42] text-white py-3 rounded-xl mt-4 font-medium disabled:opacity-50 transition-colors shadow-md shadow-[#282860]/10">{isSaving ? "Saving..." : "Create Profile"}</button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
        <DialogContent className="sm:max-w-[850px] max-h-[85vh] flex flex-col rounded-2xl p-0 overflow-hidden"><div className="bg-[#1b1b42] p-5 flex items-center gap-3"><div className="p-2 bg-[#282860] rounded-lg border border-[#BAD133]/30"><Sparkles className="text-[#BAD133]" size={20} /></div><DialogTitle className="text-white text-lg font-bold tracking-wide">AI Strategic Assessment</DialogTitle></div><div className="flex-1 overflow-y-auto p-8 bg-white">{isGenerating ? (<div className="flex flex-col items-center justify-center h-64 text-[#282860]"><Sparkles className="animate-spin mb-4 text-[#BAD133]" size={40} /><p className="whitespace-pre-line text-center font-semibold text-slate-600 leading-relaxed">{aiReport}</p></div>) : (<div className="text-sm text-slate-800 leading-relaxed prose prose-blue max-w-none"><ReactMarkdown>{aiReport}</ReactMarkdown></div>)}</div></DialogContent>
      </Dialog>
    </div>
  );
}