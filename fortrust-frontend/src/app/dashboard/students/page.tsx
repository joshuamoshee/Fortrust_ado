"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Search, Filter, GraduationCap, Building, MapPin, 
  FileText, UserMinus, RefreshCcw, Loader2, Edit2, Save,
  X, CheckCircle2, ShieldAlert, Mail, Phone, BookOpen, 
  Thermometer, BrainCircuit, UploadCloud, Activity, AlertCircle, 
  Eye, Trash2, Plus, MessageSquare, Send, Clock, User, Circle,
  ChevronRight, ChevronLeft, CheckCircle, Award, Briefcase, Sparkles, Target
} from "lucide-react";

const DOC_TYPES = [
  "Passport",
  "Report Card",
  "English Test",
  "SOP",
  "Profiling Test",
  "Other"
];

// Standard categories shown in the checklist (each can hold multiple files).
const STANDARD_CATEGORIES = [
  { type: "Passport", description: "Valid international passport (bio page)" },
  { type: "Report Card", description: "Academic transcripts - usually 6+ files across semesters" },
  { type: "English Test", description: "IELTS / TOEFL / PTE certificate" },
  { type: "SOP", description: "Statement of Purpose" },
  { type: "Profiling Test", description: "Profiling test results (HCC or any provider)" }
];

// Academic fields for the "Field of Interest" selector - 3rd AI variable
const ACADEMIC_FIELDS = [
  { label: "Business & Management", emoji: "💼" },
  { label: "Economics & Finance", emoji: "📈" },
  { label: "Marketing & Communication", emoji: "📣" },
  { label: "Computer Science & IT", emoji: "💻" },
  { label: "Engineering", emoji: "⚙️" },
  { label: "Medicine & Health Sciences", emoji: "🩺" },
  { label: "Sciences (Bio/Chem/Physics)", emoji: "🔬" },
  { label: "Mathematics", emoji: "🧮" },
  { label: "Psychology", emoji: "🧠" },
  { label: "Law", emoji: "⚖️" },
  { label: "International Relations", emoji: "🌍" },
  { label: "Design & Creative Arts", emoji: "🎨" },
  { label: "Architecture", emoji: "🏛️" },
  { label: "Education & Teaching", emoji: "📚" },
  { label: "Hospitality & Tourism", emoji: "🏨" },
  { label: "Other", emoji: "✨" },
];

const MAX_FIELD_INTERESTS = 3;

// Category matchers - used to group existing docs into the right buckets.
const CATEGORY_MATCHERS: Record<string, (t: string, f: string) => boolean> = {
  "Passport": (t, f) => t.includes("PASSPORT") || f.includes("PASSPORT"),
  "Report Card": (t, f) =>
    t.includes("REPORT CARD") || t.includes("REPORT_CARD") || t.includes("RAPOT") ||
    f.includes("REPORT_CARD") || f.includes("RAPOT"),
  "English Test": (t, f) =>
    t.includes("ENGLISH") || t.includes("IELTS") || t.includes("TOEFL") || t.includes("PTE") ||
    f.includes("ENGLISH") || f.includes("IELTS") || f.includes("TOEFL"),
  "SOP": (t, f) =>
    t.includes("SOP") || t.includes("STATEMENT OF PURPOSE") ||
    f.includes("SOP") || f.includes("STATEMENT_OF_PURPOSE"),
  "Profiling Test": (t, f) =>
    t.includes("PROFILING") || t.includes("PSYCHOLOGY") || t.includes("PSIKOLOG") || t.includes("HCC") ||
    f.includes("PROFILING") || f.includes("PSYCHOLOGY")
};

function getDocsInCategory(category: string, allDocs: any[]): any[] {
  const matcher = CATEGORY_MATCHERS[category];
  if (!matcher) return [];
  return allDocs.filter((d: any) => 
    matcher((d.title || "").toUpperCase(), (d.filename || "").toUpperCase())
  );
}

function getOtherDocs(allDocs: any[]): any[] {
  return allDocs.filter((d: any) => {
    const t = (d.title || "").toUpperCase();
    const f = (d.filename || "").toUpperCase();
    return !Object.values(CATEGORY_MATCHERS).some(m => m(t, f));
  });
}

export default function GlobalStudentDatabase() {
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [agentFilter, setAgentFilter] = useState("ALL");
  
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [studentToReassign, setStudentToReassign] = useState<any>(null);
  const [selectedNewAgent, setSelectedNewAgent] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [dossierTab, setDossierTab] = useState<"profile" | "documents" | "profiling_test" | "assessment" | "program_finder" | "notes">("profile");
  const [isSavingStudent, setIsSavingStudent] = useState(false);
  
  const [aiReport, setAiReport] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState("Report Card");
  const [loadingDocFilename, setLoadingDocFilename] = useState<string | null>(null);
  const [deletingDocFilename, setDeletingDocFilename] = useState<string | null>(null);

  // States for relocated Profiling Test tab
  const [isUploadingPsych, setIsUploadingPsych] = useState(false);

  // States for relocated Assessment tab
  const [assessmentSubTab, setAssessmentSubTab] = useState<"profiling" | "document">("profiling");
  const [profilingStep, setProfilingStep] = useState(0);
  const [profilingAnswers, setProfilingAnswers] = useState<Record<string, string>>({});
  const [isProfilingAnalyzing, setIsProfilingAnalyzing] = useState(false);
  const [showProfilingResult, setShowProfilingResult] = useState(false);
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [isOcrExtracting, setIsOcrExtracting] = useState(false);
  const [showOcrResult, setShowOcrResult] = useState(false);

  // States for relocated Program Finder tab
  const [programDocs, setProgramDocs] = useState<any[]>([
    { id: "doc1", documentName: "Official Academic Transcript (Last 1 Year)", category: "Academic", isRequired: true, status: "APPROVED", uploadedFile: { name: "Transcript_Final_Year.pdf", size: "2.4 MB", date: "2026-05-28" } },
    { id: "doc2", documentName: "Human Care Consulting (HCC) Test Results", category: "Profile", isRequired: true, status: "PENDING_REVIEW", uploadedFile: { name: "HCC_Psychology_Report.pdf", size: "1.1 MB", date: "2026-06-01" }, feedback: "AI Core analysis running. Awaiting manual admin confirmation." },
    { id: "doc3", documentName: "Valid International Passport (Bio Page)", category: "Identity", isRequired: true, status: "MISSING" },
    { id: "doc4", documentName: "Statement of Purpose (SOP)", category: "Profile", isRequired: false, status: "MISSING" },
    { id: "doc5", documentName: "Proof of Financial Solvency / Bank Statement", category: "Visa", isRequired: true, status: "MISSING" }
  ]);
  const [programFilter, setProgramFilter] = useState<"ALL" | "MISSING" | "PENDING" | "APPROVED">("ALL");

  const [fieldInterests, setFieldInterests] = useState<string[]>([]);

  const [newNote, setNewNote] = useState("");
  const [isSendingNote, setIsSendingNote] = useState(false);
  const notesEndRef = useRef<HTMLDivElement>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: "", email: "", phone: "", assignee: "", program_interest: "", lead_source: "", lead_temperature: "Cold Leads", status: "NEW LEAD"
  });
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);

  const [notification, setNotification] = useState<{type: 'success'|'error', message: string} | null>(null);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (dossierTab === 'notes') notesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dossierTab, editingStudent?.timeline]);

  // Load field_interests from the student record when dossier opens
  useEffect(() => {
    if (editingStudent) {
      const raw = editingStudent.field_interests;
      if (!raw) {
        setFieldInterests([]);
      } else if (Array.isArray(raw)) {
        setFieldInterests(raw);
      } else if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          setFieldInterests(Array.isArray(parsed) ? parsed : []);
        } catch {
          setFieldInterests(raw.split(',').map((s: string) => s.trim()).filter(Boolean));
        }
      }
    } else {
      setFieldInterests([]);
    }
  }, [editingStudent?.id]);

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
      if (studentsData.status === "success") {
        setAllStudents(studentsData.data);
        if (editingStudent) {
          const fresh = studentsData.data.find((s: any) => s.id === editingStudent.id);
          if (fresh) setEditingStudent(fresh);
        }
      }
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
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...newStudent, assignee: newStudent.assignee || "Unassigned" })
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
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
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
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingStudent.name,
          email: editingStudent.email,
          phone: editingStudent.phone,
          program_interest: editingStudent.program_interest,
          status: editingStudent.status,
          lead_temperature: editingStudent.lead_temperature,
          field_interests: JSON.stringify(fieldInterests)
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

  const handleUploadPsychTest = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingStudent) return;

    setIsUploadingPsych(true);
    const formData = new FormData();
    formData.append("psych_test", file); 

    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline/${editingStudent.id}/document`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData 
      });
      
      if (res.ok) {
        setNotification({type: 'success', message: "Test uploaded! AI is ready to analyze."});
        fetchData(); 
      } else {
        const errorData = await res.json();
        setNotification({type: 'error', message: errorData.detail || "Upload failed."});
      }
    } catch (error) {
      setNotification({type: 'error', message: "Network error during upload."});
    } finally {
      setIsUploadingPsych(false);
      e.target.value = ''; 
    }
  };

  const handleFakeProgramUpload = (id: string, fileName: string) => {
    setProgramDocs(prev => prev.map(doc => {
      if (doc.id === id) {
        return {
          ...doc,
          status: "PENDING_REVIEW",
          uploadedFile: {
            name: fileName,
            size: "1.8 MB",
            date: new Date().toISOString().split('T')[0]
          },
          feedback: "Document uploaded by agent. System routing to Master Admin queue."
        };
      }
      return doc;
    }));
  };

  const handleRemoveProgramFile = (id: string) => {
    setProgramDocs(prev => prev.map(doc => {
      if (doc.id === id) {
        return { ...doc, status: "MISSING", uploadedFile: undefined, feedback: undefined };
      }
      return doc;
    }));
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
      if (res.ok && data.status === "success") setAiReport(data.report);
      else setAiReport("AI Analysis failed. Please ensure the student has valid PDF documents attached.");
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
      formData.append("report_card", file);
      formData.append("doc_type", docType);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline/${editingStudent.id}/document`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setNotification({type: 'success', message: `${docType} uploaded securely to vault.`});
        await fetchData();
      } else {
        const errMsg = Array.isArray(data.detail) 
          ? data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ")
          : (data.detail || "Upload failed.");
        setNotification({type: 'error', message: `Upload failed: ${errMsg}`});
      }
    } catch (error) {
      setNotification({type: 'error', message: "Network error during upload."});
    } finally {
      setIsUploadingDoc(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleViewDocument = async (filename: string) => {
    if (!filename) {
      setNotification({type: 'error', message: 'No file attached.'});
      return;
    }
    setLoadingDocFilename(filename);
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/documents/${encodeURIComponent(filename)}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) {
        let msg = "Could not load document.";
        if (res.status === 404) {
          msg = "This file is registered but missing from the cloud vault. It may have been deleted or upload didn't complete - please re-upload.";
        } else if (res.status === 403) {
          msg = "You don't have permission to view this document.";
        } else {
          try {
            const data = await res.json();
            msg = data.detail || msg;
          } catch {}
        }
        setNotification({type: 'error', message: msg});
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      setNotification({type: 'error', message: 'Could not load document.'});
    } finally {
      setLoadingDocFilename(null);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleDeleteDocument = async (filename: string, displayName: string) => {
    if (!filename || !editingStudent) return;
    if (!window.confirm(`Delete "${displayName}"?\n\nThis cannot be undone.`)) return;

    setDeletingDocFilename(filename);
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/pipeline/${editingStudent.id}/document/${encodeURIComponent(filename)}`,
        {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` }
        }
      );
      if (res.ok) {
        setNotification({type: 'success', message: 'Document deleted.'});
        await fetchData();
      } else {
        let msg = "Failed to delete document.";
        try {
          const data = await res.json();
          msg = data.detail || msg;
        } catch {}
        setNotification({type: 'error', message: msg});
      }
    } catch (e) {
      setNotification({type: 'error', message: 'Network error.'});
    } finally {
      setDeletingDocFilename(null);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleSendNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !editingStudent) return;
    setIsSendingNote(true);
    try {
      const token = localStorage.getItem("fortrust_token");
      let authorName = "Master Admin";
      try {
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          authorName = payload.name || "Master Admin";
        }
      } catch (e) {}

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline/${editingStudent.id}/notes`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ note: newNote, author: authorName })
      });

      if (res.ok) {
        const newEntry = {
          date: new Date().toISOString().replace('T', ' ').substring(0, 16),
          author: authorName,
          note: newNote
        };
        const currentTimeline = typeof editingStudent.timeline === 'string' ? JSON.parse(editingStudent.timeline || "[]") : (editingStudent.timeline || []);
        setEditingStudent({ ...editingStudent, timeline: [...currentTimeline, newEntry] });
        setNewNote("");
        fetchData();
      } else {
        setNotification({type: 'error', message: "Failed to save note."});
      }
    } catch (error) {
      setNotification({type: 'error', message: "Network error."});
    } finally {
      setIsSendingNote(false);
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

  let studentDocs: any[] = [];
  let studentTimeline: any[] = [];
  if (editingStudent) {
    try { studentDocs = typeof editingStudent.documents === 'string' ? JSON.parse(editingStudent.documents) : (editingStudent.documents || []); } catch (e) { studentDocs = []; }
    try { studentTimeline = typeof editingStudent.timeline === 'string' ? JSON.parse(editingStudent.timeline) : (editingStudent.timeline || []); } catch (e) { studentTimeline = []; }
  }

  const totalDocCount = studentDocs.length;
  const categoriesWithDocs = STANDARD_CATEGORIES.filter(c => getDocsInCategory(c.type, studentDocs).length > 0).length;
  const otherDocs = getOtherDocs(studentDocs);

  return (
    <div className="p-4 lg:p-8 max-w-[1600px] mx-auto w-full relative animate-in fade-in">
      
      {notification && (
        <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-2xl font-bold flex items-center justify-between shadow-2xl animate-in slide-in-from-top-4 max-w-md
          ${notification.type === 'success' ? 'bg-[#282860] text-white border border-[#3a3a7a]' : 'bg-red-500 text-white border border-red-600'}`}>
          <div className="flex items-center gap-3">
            {notification.type === 'success' ? <CheckCircle2 className="text-[#BAD133] shrink-0" size={20}/> : <ShieldAlert size={20} className="shrink-0"/>}
            <span className="text-sm">{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="ml-6 opacity-70 hover:opacity-100 transition-opacity shrink-0"><X size={18} /></button>
        </div>
      )}

      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#282860] flex items-center gap-3">
            <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
              <GraduationCap className="text-[#BAD133]" size={28} />
            </div>
            Student Management
          </h1>
          <p className="text-slate-500 mt-2 font-medium text-sm">
            View, search, and manage all student applications across the entire network.
          </p>
        </div>
        <button onClick={() => setIsAddModalOpen(true)}
          className="bg-[#282860] hover:bg-[#1b1b42] text-white px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-md flex items-center gap-2 active:scale-95 shrink-0">
          <Plus size={18} /> Register New Student
        </button>
      </div>

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

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[700px] overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex items-center text-slate-400 bg-white px-4 py-2.5 rounded-xl border border-slate-200 w-full md:w-96 focus-within:border-[#BAD133] focus-within:ring-2 focus-within:ring-[#BAD133]/20 transition-all shadow-sm">
            <Search size={18} className="mr-3 text-slate-400" />
            <input type="text" placeholder="Search student name or email..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-slate-700 w-full font-medium" />
          </div>
          <div className="flex w-full md:w-auto gap-3">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#BAD133] shadow-sm cursor-pointer">
              <option value="ALL">All Stages</option>
              <option value="NEW LEAD">New Lead</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="CONSULTING">Consulting</option>
              <option value="APPLICATION">Application</option>
              <option value="VISA">Visa</option>
              <option value="COMPLETED">Completed</option>
            </select>
            <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#BAD133] shadow-sm cursor-pointer">
              <option value="ALL">All Agents</option>
              <option value="UNASSIGNED">Unassigned Only</option>
              {agents.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
            </select>
          </div>
        </div>

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
                        <button onClick={() => { setStudentToReassign(student); setIsReassignModalOpen(true); }}
                          className="px-3 py-2 bg-slate-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 hover:border-blue-600 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5">
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

      {/* ADD STUDENT MODAL */}
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
                        <option value="Hot Leads">Hot Lead</option>
                        <option value="Warm Leads">Warm Lead</option>
                        <option value="Cold Leads">Cold Lead</option>
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

      {/* REASSIGN MODAL */}
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
                <select value={selectedNewAgent} onChange={(e) => setSelectedNewAgent(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-[#282860] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-slate-50 focus:bg-white cursor-pointer transition-all">
                  <option value="" disabled>-- Choose Agent --</option>
                  {agents.filter(a => a.name !== studentToReassign?.assignee).map(agent => (
                    <option key={agent.id} value={agent.name}>{agent.name} ({agent.branch})</option>
                  ))}
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button onClick={() => setIsReassignModalOpen(false)} className="px-5 py-3 text-slate-500 hover:text-slate-800 font-bold text-sm transition-colors">Cancel</button>
                <button disabled={!selectedNewAgent || isAssigning} onClick={handleReassign} 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-xl transition-all disabled:opacity-50 shadow-md flex items-center justify-center gap-2">
                  {isAssigning ? <><Loader2 size={16} className="animate-spin"/> Moving...</> : "Confirm Transfer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DOSSIER SLIDE-OUT */}
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

            <div className="flex bg-slate-50 border-b border-slate-200 px-6 shrink-0 overflow-x-auto custom-scrollbar">
              <button onClick={() => setDossierTab('profile')} className={`px-4 py-4 text-sm font-bold tracking-wider whitespace-nowrap transition-colors flex items-center gap-2 ${dossierTab === 'profile' ? 'border-b-2 border-[#282860] text-[#282860] bg-white' : 'text-slate-400 hover:text-[#282860]'}`}>
                <Edit2 size={16} /> Profile Settings
              </button>
              <button onClick={() => setDossierTab('documents')} className={`px-4 py-4 text-sm font-bold tracking-wider whitespace-nowrap transition-colors flex items-center gap-2 ${dossierTab === 'documents' ? 'border-b-2 border-[#282860] text-[#282860] bg-white' : 'text-slate-400 hover:text-[#282860]'}`}>
                <UploadCloud size={16} /> Application Vault {totalDocCount > 0 && <span className="bg-[#BAD133] text-[#1b1b42] text-[10px] px-2 py-0.5 rounded-full font-black">{totalDocCount}</span>}
              </button>
              <button onClick={() => setDossierTab('profiling_test')} className={`px-4 py-4 text-sm font-bold tracking-wider whitespace-nowrap transition-colors flex items-center gap-2 ${dossierTab === 'profiling_test' ? 'border-b-2 border-[#BAD133] text-[#1b1b42] bg-white' : 'text-slate-400 hover:text-[#282860]'}`}>
                <BrainCircuit size={16} /> Profiling Test
              </button>
              <button onClick={() => setDossierTab('assessment')} className={`px-4 py-4 text-sm font-bold tracking-wider whitespace-nowrap transition-colors flex items-center gap-2 ${dossierTab === 'assessment' ? 'border-b-2 border-[#282860] text-[#282860] bg-white' : 'text-slate-400 hover:text-[#282860]'}`}>
                <Activity size={16} /> Assessment
              </button>
              <button onClick={() => setDossierTab('program_finder')} className={`px-4 py-4 text-sm font-bold tracking-wider whitespace-nowrap transition-colors flex items-center gap-2 ${dossierTab === 'program_finder' ? 'border-b-2 border-[#282860] text-[#282860] bg-white' : 'text-slate-400 hover:text-[#282860]'}`}>
                <FileText size={16} /> Program Finder
              </button>
              <button onClick={() => setDossierTab('notes')} className={`px-4 py-4 text-sm font-bold tracking-wider whitespace-nowrap transition-colors flex items-center gap-2 ${dossierTab === 'notes' ? 'border-b-2 border-blue-600 text-blue-700 bg-white' : 'text-slate-400 hover:text-blue-600'}`}>
                <MessageSquare size={16} /> Team Collab
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
              
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

                    {/* FIELD OF INTEREST - 3rd AI variable */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                      <div className="border-b border-slate-100 pb-3">
                        <h4 className="text-xs font-black text-[#282860] uppercase tracking-widest flex items-center gap-2">
                          <BrainCircuit size={16} className="text-purple-500"/> Academic Field of Interest
                        </h4>
                        <p className="text-xs text-slate-500 mt-1.5">
                          Ask the student: <em>"Which core academic field interests you the most?"</em> Select up to {MAX_FIELD_INTERESTS}. 
                          Used by AI as a 3rd variable alongside report cards and profiling test.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {ACADEMIC_FIELDS.map((field) => {
                          const isSelected = fieldInterests.includes(field.label);
                          const isMaxed = fieldInterests.length >= MAX_FIELD_INTERESTS && !isSelected;
                          return (
                            <button
                              key={field.label}
                              type="button"
                              disabled={isMaxed}
                              onClick={() => {
                                if (isSelected) {
                                  setFieldInterests(prev => prev.filter(f => f !== field.label));
                                } else if (fieldInterests.length < MAX_FIELD_INTERESTS) {
                                  setFieldInterests(prev => [...prev, field.label]);
                                }
                              }}
                              className={`p-3 rounded-xl text-xs font-bold transition-all border text-left flex items-start gap-2 ${
                                isSelected
                                  ? 'bg-emerald-500 text-white border-emerald-600 shadow-md ring-2 ring-emerald-200'
                                  : isMaxed
                                    ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700'
                              }`}
                            >
                              <span className="text-base shrink-0">{field.emoji}</span>
                              <span className="leading-tight">{field.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className={`text-xs font-bold flex items-center gap-2 ${
                        fieldInterests.length === 0 ? 'text-slate-400' :
                        fieldInterests.length === MAX_FIELD_INTERESTS ? 'text-emerald-600' :
                        'text-blue-600'
                      }`}>
                        <CheckCircle2 size={14}/>
                        {fieldInterests.length} / {MAX_FIELD_INTERESTS} selected
                        {fieldInterests.length > 0 && (
                          <span className="text-slate-500 font-normal ml-2">
                            - {fieldInterests.join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* DOCUMENTS TAB - MULTI-FILE */}
              {dossierTab === 'documents' && (
                <div className="p-6 space-y-6 animate-in fade-in">
                  
                  {/* SMART UPLOAD ZONE */}
                  <div className="bg-white rounded-2xl border-2 border-dashed border-blue-200 p-8 hover:bg-blue-50/30 hover:border-blue-400 transition-all">
                    <div className="flex flex-col items-center text-center mb-6">
                      <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3">
                        {isUploadingDoc ? <Loader2 size={28} className="animate-spin" /> : <UploadCloud size={28} />}
                      </div>
                      <h3 className="text-lg font-black text-[#282860]">Upload Student Document</h3>
                      <p className="text-sm text-slate-500 mt-1 max-w-sm">Select the document type, then choose your file. You can upload multiple files per category.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Document Type</label>
                        <select value={selectedDocType} onChange={(e) => setSelectedDocType(e.target.value)} disabled={isUploadingDoc}
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-[#282860] bg-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all cursor-pointer">
                          {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">File</label>
                        <label className={`bg-[#282860] hover:bg-[#1b1b42] text-white px-4 py-3 rounded-xl text-sm font-bold shadow-md cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-2 ${isUploadingDoc ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          {isUploadingDoc ? "Uploading..." : "Browse"}
                          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.heic,.heif,.doc,.docx,.xls,.xlsx,.txt,.csv" className="hidden" disabled={isUploadingDoc}
                            onChange={(e) => {
                              if(e.target.files && e.target.files[0]) handleDocumentUpload(e.target.files[0], selectedDocType);
                              e.target.value = "";
                            }} />
                        </label>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 text-center mt-4">Accepted: PDF, images, Word, Excel, text (max 10MB)</p>
                  </div>

                  {/* PROGRESS CHIP */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between shadow-sm gap-4">
                    <div>
                      <h3 className="font-black text-[#282860] flex items-center gap-2"><FileText size={20} className="text-blue-500"/> Application Document Vault</h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-md">Upload as many files as needed per category. E.g. 6+ report cards across semesters, multiple profiling tests, etc.</p>
                    </div>
                    <div className="bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-2 shrink-0">
                      <UploadCloud size={16} className="text-blue-500"/> 
                      <span><strong className="text-[#282860]">{totalDocCount}</strong> file{totalDocCount === 1 ? '' : 's'} - <strong className="text-[#282860]">{categoriesWithDocs}</strong>/{STANDARD_CATEGORIES.length} categories</span>
                    </div>
                  </div>

                  {/* CATEGORY CARDS - each holds 0..N files */}
                  <div className="space-y-3">
                    {STANDARD_CATEGORIES.map((cat) => {
                      const filesInCat = getDocsInCategory(cat.type, studentDocs);
                      const count = filesInCat.length;
                      const isEmpty = count === 0;

                      return (
                        <div key={cat.type} className={`rounded-2xl border shadow-sm transition-all ${
                          isEmpty ? "bg-white border-slate-200" : "bg-white border-emerald-200"
                        }`}>
                          <div className="p-4 flex items-center justify-between border-b border-slate-100">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`p-3 rounded-xl border shrink-0 ${
                                isEmpty
                                  ? "bg-slate-50 border-slate-200 text-slate-400"
                                  : "bg-emerald-50 border-emerald-100 text-emerald-600"
                              }`}>
                                <FileText size={20}/>
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-[#282860]">{cat.type}</p>
                                  {!isEmpty && (
                                    <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                                      {count} file{count === 1 ? '' : 's'}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">{cat.description}</p>
                              </div>
                            </div>

                            <label className={`shrink-0 bg-slate-50 hover:bg-[#282860] hover:text-white border border-slate-200 text-slate-600 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm ${isUploadingDoc ? 'opacity-50 cursor-not-allowed' : ''}`}>
                              {isUploadingDoc ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>}
                              <span className="hidden sm:inline">Add</span>
                              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.heic,.heif,.doc,.docx,.xls,.xlsx,.txt,.csv" className="hidden" disabled={isUploadingDoc}
                                onChange={(e) => {
                                  if(e.target.files && e.target.files[0]) handleDocumentUpload(e.target.files[0], cat.type);
                                  e.target.value = "";
                                }} />
                            </label>
                          </div>

                          {isEmpty ? (
                            <div className="px-4 py-3 text-xs text-slate-400 italic flex items-center gap-2">
                              <Circle size={12} className="text-slate-300"/>
                              No files yet. Optional - click "Add" above when ready.
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-50">
                              {filesInCat.map((doc: any, i: number) => {
                                const isLoadingThisDoc = loadingDocFilename === doc.filename;
                                const isDeletingThisDoc = deletingDocFilename === doc.filename;
                                const displayName = doc.title || doc.filename || "Untitled";
                                return (
                                  <div key={`${doc.filename}-${i}`} className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0"/>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-slate-700 truncate" title={displayName}>
                                          {displayName}
                                        </p>
                                        {doc.uploaded_by && (
                                          <p className="text-[10px] text-slate-400 truncate">
                                            by {doc.uploaded_by}{doc.uploaded_at ? ` - ${new Date(doc.uploaded_at).toLocaleDateString()}` : ''}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button onClick={() => handleViewDocument(doc.filename)} disabled={isLoadingThisDoc || isDeletingThisDoc}
                                        className="p-2 bg-slate-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                                        title="View Document">
                                        {isLoadingThisDoc ? <Loader2 size={14} className="animate-spin"/> : <Eye size={14}/>}
                                      </button>
                                      <button onClick={() => handleDeleteDocument(doc.filename, displayName)} disabled={isLoadingThisDoc || isDeletingThisDoc}
                                        className="p-2 bg-slate-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                                        title="Delete Document">
                                        {isDeletingThisDoc ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14}/>}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* OTHER / UNCATEGORIZED FILES */}
                  {otherDocs.length > 0 && (
                    <div className="mt-8">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 pl-2">Other Files ({otherDocs.length})</h4>
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-50">
                        {otherDocs.map((doc: any, i: number) => {
                          const isLoadingThisDoc = loadingDocFilename === doc.filename;
                          const isDeletingThisDoc = deletingDocFilename === doc.filename;
                          const displayName = doc.title || doc.filename || "Untitled";
                          return (
                            <div key={`other-${i}`} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="bg-slate-50 text-slate-500 border border-slate-200 p-2 rounded-lg shrink-0"><FileText size={16}/></div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-slate-700 truncate" title={doc.title}>{displayName}</p>
                                  <p className="text-[10px] text-slate-400 font-mono truncate" title={doc.filename}>{doc.filename}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button onClick={() => handleViewDocument(doc.filename)} disabled={isLoadingThisDoc || isDeletingThisDoc}
                                  className="text-blue-600 font-bold text-xs bg-blue-50 px-3 py-1.5 rounded-lg transition-colors border border-blue-100 flex items-center gap-1.5 disabled:opacity-50">
                                  {isLoadingThisDoc ? <Loader2 size={14} className="animate-spin"/> : <Eye size={14}/>} View
                                </button>
                                <button onClick={() => handleDeleteDocument(doc.filename, displayName)} disabled={isLoadingThisDoc || isDeletingThisDoc}
                                  className="text-red-600 font-bold text-xs bg-red-50 px-3 py-1.5 rounded-lg transition-colors border border-red-100 flex items-center gap-1.5 disabled:opacity-50">
                                  {isDeletingThisDoc ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14}/>}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {dossierTab === 'profiling_test' && (() => {
                const checkTestStatus = (docsString: string) => {
                  if (!docsString) return false;
                  try {
                    const docs = typeof docsString === 'string' ? JSON.parse(docsString) : docsString;
                    return docs.some((d: any) => (d.title || "").toUpperCase().includes("PSYCHOLOGY") || (d.title || "").toUpperCase().includes("HCC"));
                  } catch (e) {
                    return false;
                  }
                };
                const hasTest = checkTestStatus(editingStudent.documents);

                return (
                  <div className="p-6 space-y-6 animate-in fade-in">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 border border-blue-100">
                          <BrainCircuit size={24}/>
                        </div>
                        <div>
                          <h4 className="font-bold text-[#282860] text-lg">Profiling Test Status</h4>
                          <p className="text-slate-500 text-xs mt-0.5">Track and analyze psychological profiling tests.</p>
                        </div>
                      </div>
                      <div>
                        {hasTest ? (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-200">
                            <CheckCircle2 size={14}/> Test Submitted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-bold">
                            <AlertCircle size={14}/> Awaiting Test
                          </span>
                        )}
                      </div>
                    </div>

                    {!hasTest ? (
                      <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-sm text-center flex flex-col items-center justify-center">
                        <AlertCircle size={48} className="text-slate-300 mb-4" />
                        <h4 className="text-lg font-black text-[#282860]">No test has been uploaded yet</h4>
                        <p className="text-slate-500 text-sm max-w-sm mt-1 mb-6">Send the test link to the student or upload their psychology report here.</p>
                        <div className="flex gap-3">
                          <button 
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(`Hi ${editingStudent.name}, please complete your Fortrust HCC Profiling Test here: https://fortrust.com/hcc-test`);
                              setNotification({type: 'success', message: `Test link copied to clipboard!`});
                              setTimeout(() => setNotification(null), 3000);
                            }} 
                            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
                          >
                            <Send size={14} className="text-blue-500"/> Copy Test Link
                          </button>
                          <label className={`cursor-pointer bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 ${isUploadingPsych ? 'opacity-50 pointer-events-none' : ''}`}>
                            {isUploadingPsych ? <Loader2 size={14} className="animate-spin"/> : <UploadCloud size={14}/>}
                            {isUploadingPsych ? 'Uploading...' : 'Upload Test'}
                            <input 
                              type="file" 
                              className="hidden" 
                              accept=".pdf,.png,.jpg,.jpeg"
                              onChange={handleUploadPsychTest}
                              disabled={isUploadingPsych}
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex justify-end">
                          <button 
                            type="button"
                            onClick={generateAIReport}
                            disabled={isGeneratingAI}
                            className="bg-[#282860] hover:bg-[#1b1b42] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
                          >
                            <BrainCircuit size={14} className="text-[#BAD133]"/> 
                            {isGeneratingAI ? "Running Analysis..." : "Run AI Analysis"}
                          </button>
                        </div>

                        {isGeneratingAI && (
                          <div className="flex flex-col items-center justify-center py-12 bg-white border border-slate-200 rounded-2xl">
                            <Loader2 size={36} className="animate-spin text-[#BAD133] mb-4" />
                            <h4 className="font-bold text-[#282860]">Analyzing Profile...</h4>
                            <p className="text-slate-500 text-xs mt-1">Gemini AI is reading transcript and psychology test documents...</p>
                          </div>
                        )}

                        {aiReport && !isGeneratingAI && (
                          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[350px]">
                            <div className="bg-slate-50 border-b border-slate-100 p-4 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 size={18} className="text-emerald-500"/>
                                <span className="font-bold text-[#282860]">AI Strategic Report</span>
                              </div>
                              <button type="button" onClick={generateAIReport} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"><RefreshCcw size={12}/> Regenerate</button>
                            </div>
                            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                              {aiReport}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {dossierTab === 'assessment' && (
                <div className="p-6 space-y-6 animate-in fade-in">
                  <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <h4 className="font-bold text-[#282860] text-lg">AI Assessment Engine</h4>
                    <div className="bg-slate-200/50 p-1 rounded-xl flex items-center shrink-0">
                      <button type="button" onClick={() => setAssessmentSubTab("profiling")} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${assessmentSubTab === "profiling" ? "bg-white text-[#282860] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                        Career Profiling
                      </button>
                      <button type="button" onClick={() => setAssessmentSubTab("document")} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${assessmentSubTab === "document" ? "bg-white text-[#282860] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                        Document OCR
                      </button>
                    </div>
                  </div>

                  {assessmentSubTab === "profiling" && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
                      {isProfilingAnalyzing ? (
                        <div className="p-12 flex flex-col items-center justify-center text-center">
                          <Loader2 size={48} className="text-[#282860] animate-spin mb-4" />
                          <h4 className="text-lg font-black text-[#282860]">Gemini AI is analyzing profile...</h4>
                          <p className="text-slate-500 text-xs mt-1">Cross-referencing preferences with global university programs...</p>
                        </div>
                      ) : showProfilingResult ? (
                        <div>
                          <div className="flex items-center gap-3 mb-6">
                            <div className="bg-green-100 text-green-600 p-2 rounded-full"><CheckCircle size={24} /></div>
                            <div>
                              <h4 className="text-lg font-black text-[#282860]">AI Match Complete</h4>
                              <p className="text-slate-500 text-xs">Top recommendations based on preference.</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                              <span className="text-[9px] font-black uppercase tracking-widest text-[#BAD133] mb-1.5 block">Match #1 (98% Fit)</span>
                              <h5 className="font-bold text-[#282860] text-sm">University of Melbourne</h5>
                              <p className="text-xs text-slate-500 mt-0.5">Bachelor of Commerce</p>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                              <span className="text-[9px] font-black uppercase tracking-widest text-[#BAD133] mb-1.5 block">Match #2 (94% Fit)</span>
                              <h5 className="font-bold text-[#282860] text-sm">Monash University</h5>
                              <p className="text-xs text-slate-500 mt-0.5">Bachelor of Business</p>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                              <span className="text-[9px] font-black uppercase tracking-widest text-[#BAD133] mb-1.5 block">Match #3 (89% Fit)</span>
                              <h5 className="font-bold text-[#282860] text-sm">UNSW Sydney</h5>
                              <p className="text-xs text-slate-500 mt-0.5">Bachelor of Economics</p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <button type="button" className="bg-[#282860] hover:bg-[#1b1b42] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md">Generate PDF Report</button>
                            <button type="button" onClick={() => { setShowProfilingResult(false); setProfilingStep(0); setProfilingAnswers({}); }} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-5 py-2.5 rounded-xl text-xs font-bold">Start New Test</button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Step {profilingStep + 1} of {PROFILING_QUESTIONS.length}</span>
                            <div className="flex gap-1.5">
                              {PROFILING_QUESTIONS.map((_, idx) => (
                                <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${idx <= profilingStep ? "w-6 bg-[#BAD133]" : "w-2 bg-slate-200"}`}></div>
                              ))}
                            </div>
                          </div>
                          <h4 className="text-lg font-black text-[#282860] mb-6 leading-tight">
                            {PROFILING_QUESTIONS[profilingStep].question}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                            {PROFILING_QUESTIONS[profilingStep].options.map((opt) => {
                              const isSelected = profilingAnswers[PROFILING_QUESTIONS[profilingStep].id] === opt.label;
                              return (
                                <div 
                                  key={opt.label} 
                                  onClick={() => setProfilingAnswers(prev => ({ ...prev, [PROFILING_QUESTIONS[profilingStep].id]: opt.label }))}
                                  className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-start gap-3
                                    ${isSelected ? "border-[#282860] bg-[#282860]/5 shadow-sm" : "border-slate-100 hover:border-[#BAD133] hover:bg-slate-50"}`}
                                >
                                  <div className={`p-2 rounded-lg shrink-0 ${isSelected ? "bg-[#282860] text-white" : "bg-white text-slate-400 border border-slate-200"}`}>
                                    {opt.icon}
                                  </div>
                                  <div>
                                    <h5 className={`font-bold text-sm mb-0.5 ${isSelected ? "text-[#282860]" : "text-slate-700"}`}>{opt.label}</h5>
                                    <p className={`text-xs ${isSelected ? "text-slate-600 font-medium" : "text-slate-500"}`}>{opt.desc}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                            <button type="button" onClick={() => setProfilingStep(p => Math.max(0, p - 1))} disabled={profilingStep === 0} className="flex items-center gap-1.5 px-4 py-2 font-bold text-xs text-slate-500 hover:bg-slate-100 rounded-lg disabled:opacity-0">
                              <ChevronLeft size={14} /> Back
                            </button>
                            <button 
                              type="button"
                              disabled={!profilingAnswers[PROFILING_QUESTIONS[profilingStep].id]}
                              onClick={() => {
                                if (profilingStep < PROFILING_QUESTIONS.length - 1) {
                                  setProfilingStep(p => p + 1);
                                } else {
                                  setIsProfilingAnalyzing(true);
                                  setTimeout(() => {
                                    setIsProfilingAnalyzing(false);
                                    setShowProfilingResult(true);
                                  }, 2000);
                                }
                              }}
                              className="bg-[#282860] hover:bg-[#1b1b42] text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
                            >
                              {profilingStep === PROFILING_QUESTIONS.length - 1 ? "Analyze with AI" : "Next"} <ChevronRight size={14}/>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {assessmentSubTab === "document" && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                      <div className="mb-6">
                        <h4 className="text-lg font-black text-[#282860]">Academic Document OCR</h4>
                        <p className="text-slate-500 text-xs mt-1">Upload the student's report cards or transcripts. The AI will extract their grades, calculate their global GPA equivalent, and check eligibility.</p>
                      </div>

                      {!ocrFile ? (
                        <label className="border-2 border-dashed border-slate-300 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-[#BAD133] hover:bg-[#BAD133]/5 transition-all group">
                          <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) setOcrFile(e.target.files[0]);
                          }} />
                          <div className="w-12 h-12 bg-slate-50 text-slate-400 group-hover:bg-white group-hover:text-[#BAD133] rounded-full flex items-center justify-center shadow-sm mb-4 transition-all">
                            <UploadCloud size={24} />
                          </div>
                          <h5 className="font-bold text-[#282860] text-sm mb-1">Drag & Drop Transcripts Here</h5>
                          <p className="text-slate-400 text-[10px]">Supports PDF, JPG, and PNG up to 15MB</p>
                        </label>
                      ) : isOcrExtracting ? (
                        <div className="border-2 border-slate-100 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                          <Loader2 size={36} className="text-[#BAD133] animate-spin mb-4" />
                          <h5 className="font-black text-[#282860] text-sm">Extracting Academic Data...</h5>
                          <p className="text-slate-500 text-xs mt-1">Running OCR on {ocrFile.name}</p>
                        </div>
                      ) : showOcrResult ? (
                        <div className="border border-green-100 bg-green-50/20 rounded-2xl p-6">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center shrink-0 shadow-sm"><CheckCircle size={16} /></div>
                            <div>
                              <h5 className="font-black text-sm text-[#282860]">Extraction Successful</h5>
                              <p className="text-slate-500 text-xs">Parsed data from {ocrFile.name}</p>
                            </div>
                          </div>
                          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Calculated GPA</span>
                              <span className="text-xl font-black text-[#282860]">3.8<span className="text-xs text-slate-400">/4.0</span></span>
                            </div>
                            <div>
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Math Average</span>
                              <span className="text-xl font-black text-[#282860]">A-</span>
                            </div>
                            <div>
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">English Average</span>
                              <span className="text-xl font-black text-[#282860]">B+</span>
                            </div>
                            <div>
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Eligibility</span>
                              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">Highly Eligible</span>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <button type="button" onClick={() => { setOcrFile(null); setShowOcrResult(false); }} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold">Upload Another</button>
                            <button type="button" className="bg-[#282860] hover:bg-[#1b1b42] text-white px-4 py-2 rounded-xl text-xs font-bold">Save to Student</button>
                          </div>
                        </div>
                      ) : (
                        <div className="border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0"><FileText size={24} /></div>
                            <div>
                              <h5 className="font-bold text-[#282860] text-sm truncate max-w-[200px]" title={ocrFile.name}>{ocrFile.name}</h5>
                              <p className="text-slate-500 text-xs">{(ocrFile.size/1024/1024).toFixed(2)} MB • Ready</p>
                            </div>
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto">
                            <button type="button" onClick={() => setOcrFile(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl shrink-0"><X size={16} /></button>
                            <button 
                              type="button"
                              onClick={() => {
                                setIsOcrExtracting(true);
                                setTimeout(() => {
                                  setIsOcrExtracting(false);
                                  setShowOcrResult(true);
                                }, 2000);
                              }}
                              className="bg-[#282860] hover:bg-[#1b1b42] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 w-full sm:w-auto shadow-sm"
                            >
                              <Sparkles size={14} className="text-[#BAD133]"/> Run OCR
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {dossierTab === 'program_finder' && (() => {
                const filteredProgramDocs = programDocs.filter(doc => {
                  if (programFilter === "MISSING") return doc.status === "MISSING";
                  if (programFilter === "PENDING") return doc.status === "PENDING_REVIEW";
                  if (programFilter === "APPROVED") return doc.status === "APPROVED";
                  return true;
                });
                const missingCount = programDocs.filter(d => d.isRequired && d.status === "MISSING").length;

                return (
                  <div className="p-6 space-y-6 animate-in fade-in">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#BAD133] bg-[#282860]/5 border border-[#282860]/10 px-2 py-0.5 rounded mb-1.5 inline-block">ApplyBoard Standard</span>
                        <h4 className="text-lg font-black text-[#282860] flex items-center gap-2">Required Document Matrix</h4>
                        <p className="text-slate-500 text-xs mt-0.5">
                          Student: <span className="font-bold text-slate-800">{editingStudent.name}</span> • Target: <span className="font-bold text-slate-800">{editingStudent.program_interest || "BSc in Artificial Intelligence"}</span>
                        </p>
                      </div>
                      {missingCount > 0 ? (
                        <div className="bg-red-50 border border-red-100 p-3 rounded-xl flex items-center gap-2.5 shrink-0">
                          <AlertCircle className="text-red-500" size={20} />
                          <div>
                            <p className="text-xs font-black text-red-700 uppercase tracking-wide">{missingCount} Missing Requirements</p>
                            <p className="text-[10px] text-red-500 font-medium">Pipeline assignment locked until uploaded.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-center gap-2.5 shrink-0">
                          <CheckCircle2 className="text-emerald-500" size={20} />
                          <div>
                            <p className="text-xs font-black text-emerald-700 uppercase tracking-wide">Ready for Submission</p>
                            <p className="text-[10px] text-emerald-500 font-medium">All mandatory files verified.</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex bg-slate-200/50 p-1 rounded-xl w-fit shadow-sm items-center gap-1.5">
                      <button type="button" onClick={() => setProgramFilter("ALL")} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${programFilter === "ALL" ? "bg-[#282860] text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>All ({programDocs.length})</button>
                      <button type="button" onClick={() => setProgramFilter("MISSING")} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${programFilter === "MISSING" ? "bg-red-500 text-white shadow-sm" : "text-slate-500 hover:text-red-500"}`}>Missing</button>
                      <button type="button" onClick={() => setProgramFilter("PENDING")} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${programFilter === "PENDING" ? "bg-amber-500 text-white shadow-sm" : "text-slate-500 hover:text-amber-500"}`}>In Review</button>
                      <button type="button" onClick={() => setProgramFilter("APPROVED")} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${programFilter === "APPROVED" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500 hover:text-emerald-600"}`}>Approved</button>
                    </div>

                    <div className="space-y-3">
                      {filteredProgramDocs.map((doc) => (
                        <div key={doc.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start gap-3 max-w-md">
                            <div className={`p-2.5 rounded-lg border shrink-0 mt-0.5
                              ${doc.status === "APPROVED" ? "bg-emerald-50 border-emerald-100 text-emerald-600" :
                                doc.status === "PENDING_REVIEW" ? "bg-amber-50 border-amber-100 text-amber-600" :
                                "bg-slate-50 border-slate-100 text-slate-400"}`}>
                              <FileText size={20} />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h5 className="font-bold text-[#282860] text-sm leading-tight">{doc.documentName}</h5>
                                {doc.isRequired && <span className="bg-red-50 text-red-600 border border-red-100 font-black text-[8px] px-1.5 py-0.5 rounded uppercase">Mandatory</span>}
                              </div>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Category: {doc.category}</p>
                              {doc.feedback && (
                                <div className="mt-2 bg-slate-50 border border-slate-200/60 p-2 rounded-lg text-xs font-medium text-slate-600 flex items-start gap-1.5">
                                  <Sparkles size={12} className="text-[#BAD133] shrink-0 mt-0.5" />
                                  <span>{doc.feedback}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="min-w-[200px]">
                            {doc.status === "MISSING" ? (
                              <label className="border-2 border-dashed border-slate-200 hover:border-[#BAD133] hover:bg-[#BAD133]/5 rounded-xl px-3 py-2 flex items-center justify-center gap-2 cursor-pointer transition-all bg-slate-50/50 group">
                                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) handleFakeProgramUpload(doc.id, e.target.files[0].name);
                                }} />
                                <UploadCloud size={14} className="text-slate-400 group-hover:text-[#BAD133]" />
                                <span className="text-xs font-bold text-slate-600 group-hover:text-slate-800">Upload Required File</span>
                              </label>
                            ) : (
                              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-3">
                                <div className="overflow-hidden">
                                  <p className="text-xs font-bold text-slate-700 truncate pr-1" title={doc.uploadedFile?.name}>{doc.uploadedFile?.name}</p>
                                  <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-semibold mt-0.5">
                                    <span>{doc.uploadedFile?.size}</span>
                                    <span>•</span>
                                    <span>{doc.uploadedFile?.date}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border
                                    ${doc.status === "APPROVED" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}>
                                    {doc.status === "APPROVED" ? "Approved" : "In Review"}
                                  </span>
                                  <button type="button" onClick={() => handleRemoveProgramFile(doc.id)} className="p-1 bg-white text-slate-400 hover:text-red-500 border border-slate-200 rounded-lg" title="Remove">
                                    <Trash2 size={12}/>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {dossierTab === 'notes' && (
                <div className="flex flex-col h-full animate-in fade-in">
                  <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-6">
                    {studentTimeline.length === 0 ? (
                      <div className="text-center py-16 text-slate-400 flex flex-col items-center">
                        <MessageSquare size={40} className="mb-3 text-slate-200" />
                        <p className="font-medium">No notes on this student yet.</p>
                        <p className="text-xs mt-1">Start the conversation below.</p>
                      </div>
                    ) : (
                      studentTimeline.map((note: any, i: number) => (
                        <div key={i} className="flex gap-4">
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold border-2 border-white shadow-sm">
                            {(note.author || "U").charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-baseline justify-between mb-1">
                              <span className="font-bold text-slate-800 text-sm">{note.author || "Team Member"}</span>
                              <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1"><Clock size={10}/> {note.date}</span>
                            </div>
                            <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap">
                              {note.note}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={notesEndRef} />
                  </div>
                  <div className="p-5 bg-white border-t border-slate-200 shrink-0">
                    <form onSubmit={handleSendNote} className="relative">
                      <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Add an internal note or mention an agent..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 pr-16 text-sm outline-none focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10 transition-all resize-none" rows={2}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendNote(e);
                          }
                        }} />
                      <button type="submit" disabled={!newNote.trim() || isSendingNote}
                        className="absolute right-3 bottom-3 w-10 h-10 rounded-xl bg-[#282860] hover:bg-[#1b1b42] text-white flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md">
                        {isSendingNote ? <Loader2 size={16} className="animate-spin"/> : <Send size={16} className="-ml-0.5 mt-0.5" />}
                      </button>
                    </form>
                    <p className="text-[10px] text-slate-400 mt-2 font-medium text-center">Press Enter to send, Shift + Enter for new line.</p>
                  </div>
                </div>
              )}
            </div>
            
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

// Custom Icons and Questions for the assessment page
const PROFILING_QUESTIONS = [
  {
    id: "q1",
    question: "Which core academic field interests the student the most?",
    options: [
      { label: "Business & Management", icon: <Briefcase size={24} />, desc: "Finance, Marketing, Entrepreneurship" },
      { label: "STEM", icon: <BrainCircuit size={24} />, desc: "Engineering, Computer Science, Math" },
      { label: "Arts & Humanities", icon: <Award size={24} />, desc: "Design, Literature, Social Sciences" },
      { label: "Healthcare & Medicine", icon: <Target size={24} />, desc: "Nursing, Pre-Med, Psychology" }
    ]
  },
  {
    id: "q2",
    question: "What is their primary post-graduation career goal?",
    options: [
      { label: "Corporate Leadership", icon: <BuildingIcon />, desc: "Climbing the ladder at a Fortune 500" },
      { label: "Startup Founder", icon: <RocketIcon />, desc: "Building their own company" },
      { label: "Research & Academia", icon: <GraduationCap size={24} />, desc: "Pursuing PhDs and innovations" },
      { label: "Creative Freelance", icon: <PaletteIcon />, desc: "Independent design or consulting" }
    ]
  },
  {
    id: "q3",
    question: "What is their preferred campus environment?",
    options: [
      { label: "Bustling Metropolis", icon: <CityIcon />, desc: "Downtown in a major global city" },
      { label: "Traditional College Town", icon: <TownIcon />, desc: "Classic campus, strong community" },
      { label: "Tech & Innovation Hub", icon: <CpuIcon />, desc: "Surrounded by startups and labs" },
      { label: "Quiet & Nature-Focused", icon: <TreeIcon />, desc: "Scenic, peaceful, focused study" }
    ]
  }
];

function BuildingIcon() { return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg> }
function RocketIcon() { return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path></svg> }
function PaletteIcon() { return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5"></circle><circle cx="17.5" cy="10.5" r=".5"></circle><circle cx="8.5" cy="7.5" r=".5"></circle><circle cx="6.5" cy="12.5" r=".5"></circle><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path></svg> }
function CityIcon() { return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="10" width="6" height="12"></rect><rect x="8" y="2" width="8" height="20"></rect><rect x="16" y="14" width="6" height="8"></rect><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M12 18h.01"></path><path d="M4 14h.01"></path><path d="M4 18h.01"></path><path d="M20 18h.01"></path></svg> }
function TownIcon() { return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"></path><path d="M9 8h1"></path><path d="M9 12h1"></path><path d="M9 16h1"></path><path d="M14 8h1"></path><path d="M14 12h1"></path><path d="M14 16h1"></path><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"></path></svg> }
function CpuIcon() { return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg> }
function TreeIcon() { return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"></path><path d="M12 2a5 5 0 0 0-5 5c0 1.5.5 2.5 1.5 3.5-.5 1-1.5 2.5-1.5 4 0 2 1.5 3 4 3s4-1 4-3c0-1.5-1-3-1.5-4 1-1 1.5-2 1.5-3.5a5 5 0 0 0-5-5z"></path></svg> }