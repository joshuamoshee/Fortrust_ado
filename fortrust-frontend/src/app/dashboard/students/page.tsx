"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Search, Filter, GraduationCap, Building, MapPin, 
  FileText, UserMinus, RefreshCcw, Loader2, Edit2, Save,
  X, CheckCircle2, ShieldAlert, Mail, Phone, BookOpen, 
  Thermometer, BrainCircuit, UploadCloud, Activity, AlertCircle, 
  Eye, Trash2, Plus, MessageSquare, Send, Clock, User, Circle,
  Archive, DollarSign, RotateCcw, Users, Briefcase, Home
} from "lucide-react";

const DOC_TYPES = [
  "Passport", "Report Card", "English Test", "SOP", "Profiling Test", "Other"
];

const STANDARD_CATEGORIES = [
  { type: "Passport", description: "Valid international passport (bio page)" },
  { type: "Report Card", description: "Academic transcripts - usually 6+ files across semesters" },
  { type: "English Test", description: "IELTS / TOEFL / PTE certificate" },
  { type: "SOP", description: "Statement of Purpose (template link available below)" },
  { type: "Profiling Test", description: "Profiling test results (HCC or any provider)" }
];

// "Other" removed - replaced by free-text input field below the buttons
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
];

const MAX_FIELD_INTERESTS = 3;

const CAREER_GOALS = [
  { label: "Corporate Career", emoji: "💼" },
  { label: "Entrepreneurship", emoji: "🚀" },
  { label: "Academia / Research", emoji: "🎓" },
  { label: "Government / Public Service", emoji: "🏛️" },
  { label: "Creative Industries", emoji: "🎨" },
  { label: "Healthcare Practitioner", emoji: "⚕️" },
  { label: "Tech Industry", emoji: "💻" },
  { label: "Non-profit / Social Impact", emoji: "❤️" },
];

const CAMPUS_ENVIRONMENTS = [
  { label: "Large Urban City", emoji: "🏙️" },
  { label: "College Town", emoji: "🌳" },
  { label: "Coastal / Beachside", emoji: "🏖️" },
  { label: "Mountains / Rural", emoji: "🏔️" },
  { label: "International Hub", emoji: "🌐" },
  { label: "Research-Intensive", emoji: "🔬" },
];

const ARCHIVE_REASONS = [
  { key: "budget_constraint", label: "Budget constraint", emoji: "💰", desc: "Student can't afford target programs" },
  { key: "changed_mind", label: "Changed mind / destination", emoji: "🔄", desc: "Student decided different path/country" },
  { key: "no_followup", label: "No agent follow-up", emoji: "⏰", desc: "Lead went cold from our side" },
  { key: "documents_incomplete", label: "Documents incomplete", emoji: "📋", desc: "Could not gather required docs" },
  { key: "apply_through_other_agent", label: "Apply through other agent", emoji: "🔀", desc: "Reassign instead of archive" },
  { key: "other", label: "Other (specify below)", emoji: "📝", desc: "Use the notes field" },
];

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

export default function StudentManagement() {
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [agentFilter, setAgentFilter] = useState("ALL");
  const [includeArchived, setIncludeArchived] = useState(false);

  // Archive flow
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [studentToArchive, setStudentToArchive] = useState<any>(null);
  const [archiveReason, setArchiveReason] = useState<string>("");
  const [archiveNotes, setArchiveNotes] = useState("");
  const [archiveNewAgent, setArchiveNewAgent] = useState("");
  const [isArchiving, setIsArchiving] = useState(false);

  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [dossierTab, setDossierTab] = useState<"profile" | "documents" | "ai" | "notes">("profile");
  const [isSavingStudent, setIsSavingStudent] = useState(false);
  
  const [aiReport, setAiReport] = useState("");
  const [aiReportGeneratedAt, setAiReportGeneratedAt] = useState<string | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState("Report Card");
  const [loadingDocFilename, setLoadingDocFilename] = useState<string | null>(null);
  const [deletingDocFilename, setDeletingDocFilename] = useState<string | null>(null);

  // Extended profile state
  const [fieldInterests, setFieldInterests] = useState<string[]>([]);
  const [careerGoal, setCareerGoal] = useState<string>("");
  const [campusEnvironment, setCampusEnvironment] = useState<string>("");
  const [otherFieldInterest, setOtherFieldInterest] = useState<string>("");

  const [newNote, setNewNote] = useState("");
  const [isSendingNote, setIsSendingNote] = useState(false);
  const notesEndRef = useRef<HTMLDivElement>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: "", email: "", phone: "", assignee: "", program_interest: "", lead_source: "", lead_temperature: "Cold Leads", status: "NEW LEAD"
  });
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);

  const [notification, setNotification] = useState<{type: 'success'|'error', message: string} | null>(null);

  useEffect(() => { fetchData(); }, [includeArchived]);

  useEffect(() => {
    if (dossierTab === 'notes') notesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dossierTab, editingStudent?.timeline]);

  // Initialize all extended-profile state when dossier opens or student changes
  useEffect(() => {
    if (editingStudent) {
      // Field interests
      const raw = editingStudent.field_interests;
      if (!raw) setFieldInterests([]);
      else if (Array.isArray(raw)) setFieldInterests(raw);
      else if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          setFieldInterests(Array.isArray(parsed) ? parsed : []);
        } catch {
          setFieldInterests(raw.split(',').map((s: string) => s.trim()).filter(Boolean));
        }
      }
      setCareerGoal(editingStudent.career_goal || "");
      setCampusEnvironment(editingStudent.campus_environment || "");
      setOtherFieldInterest(editingStudent.other_field_interest || "");
    } else {
      setFieldInterests([]);
      setCareerGoal("");
      setCampusEnvironment("");
      setOtherFieldInterest("");
    }
  }, [editingStudent?.id]);

  // Load saved AI report when dossier opens
  useEffect(() => {
    if (!editingStudent) {
      setAiReport("");
      setAiReportGeneratedAt(null);
      return;
    }
    const loadSaved = async () => {
      try {
        const token = localStorage.getItem("fortrust_token");
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline/${editingStudent.id}/ai-report`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.report) {
            setAiReport(data.report);
            setAiReportGeneratedAt(data.generated_at);
          } else {
            setAiReport("");
            setAiReportGeneratedAt(null);
          }
        }
      } catch (e) {
        // silent
      }
    };
    loadSaved();
  }, [editingStudent?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("fortrust_token");
      const headers = { "Authorization": `Bearer ${token}` };
      const archParam = includeArchived ? "&include_archived=true" : "";
      const [studentsRes, usersRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline?role=MASTER_ADMIN${archParam}`, { headers }),
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
        setNotification({type: 'success', message: 'Student successfully added to the pipeline.'});
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

  const handleArchive = async () => {
    if (!studentToArchive || !archiveReason) return;
    if (archiveReason === "apply_through_other_agent" && !archiveNewAgent) {
      setNotification({type: 'error', message: 'Please select the new agent.'});
      return;
    }
    setIsArchiving(true);
    try {
      const token = localStorage.getItem("fortrust_token");
      const body: any = { reason: archiveReason, notes: archiveNotes };
      if (archiveReason === "apply_through_other_agent") body.new_agent = archiveNewAgent;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline/${studentToArchive.id}/archive`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({
          type: 'success',
          message: data.action === 'reassigned'
            ? `${studentToArchive.name} reassigned to ${archiveNewAgent}.`
            : `${studentToArchive.name} archived.`
        });
        setIsArchiveModalOpen(false);
        setStudentToArchive(null);
        setArchiveReason("");
        setArchiveNotes("");
        setArchiveNewAgent("");
        fetchData();
      } else {
        setNotification({type: 'error', message: data.detail || "Archive failed."});
      }
    } catch (e) {
      setNotification({type: 'error', message: "Network error."});
    } finally {
      setIsArchiving(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleUnarchive = async (studentId: string) => {
    if (!window.confirm("Restore this student to the active pipeline?")) return;
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline/${studentId}/unarchive`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setNotification({type: 'success', message: "Student restored to active pipeline."});
        fetchData();
      } else {
        setNotification({type: 'error', message: "Could not un-archive."});
      }
    } catch (e) {
      setNotification({type: 'error', message: "Network error."});
    } finally {
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
          field_interests: JSON.stringify(fieldInterests),
          // Parents
          father_name: editingStudent.father_name || null,
          father_email: editingStudent.father_email || null,
          father_phone: editingStudent.father_phone || null,
          mother_name: editingStudent.mother_name || null,
          mother_email: editingStudent.mother_email || null,
          mother_phone: editingStudent.mother_phone || null,
          // Budget
          budget_usd: editingStudent.budget_usd ? Number(editingStudent.budget_usd) : null,
          // Extended academic profile
          career_goal: careerGoal || null,
          campus_environment: campusEnvironment || null,
          other_field_interest: otherFieldInterest || null,
        })
      });
      if (res.ok) {
        setNotification({type: 'success', message: `Student profile updated.`});
        fetchData(); 
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
        setAiReportGeneratedAt(data.generated_at || new Date().toISOString());
      } else {
        setAiReport("AI Analysis failed. Please ensure the student has valid PDF documents attached.");
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
        if (res.status === 404) msg = "File missing from cloud vault - please re-upload.";
        else if (res.status === 403) msg = "Not authorized to view this document.";
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
        { method: "DELETE", headers: { "Authorization": `Bearer ${token}` } }
      );
      if (res.ok) {
        setNotification({type: 'success', message: 'Document deleted.'});
        await fetchData();
      } else {
        setNotification({type: 'error', message: "Failed to delete document."});
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
    if (s === "ARCHIVED") return "bg-slate-100 text-slate-600 border-slate-300";
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

  const totalStudents = allStudents.filter(s => !s.archived).length;
  const archivedCount = allStudents.filter(s => s.archived).length;
  const unassignedCount = allStudents.filter(s => (!s.assignee || s.assignee === "Unassigned") && !s.archived).length;
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
            Manage all student applications, profiles, documents, and AI-powered strategies across the network.
          </p>
        </div>
        <button onClick={() => setIsAddModalOpen(true)}
          className="bg-[#282860] hover:bg-[#1b1b42] text-white px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-md flex items-center gap-2 active:scale-95 shrink-0">
          <Plus size={18} /> Register New Student
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Active Students</p>
          <p className="text-3xl font-black text-[#282860]">{totalStudents}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1">Unassigned Leads</p>
          <p className="text-3xl font-black text-[#282860]">{unassignedCount}</p>
        </div>
        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Successfully Placed</p>
          <p className="text-3xl font-black text-emerald-600">{completedCount}</p>
        </div>
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setIncludeArchived(!includeArchived)}>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1">
            <Archive size={10}/> Archived {includeArchived ? '(showing)' : '(hidden)'}
          </p>
          <p className="text-3xl font-black text-slate-500">{archivedCount}</p>
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
          <div className="flex w-full md:w-auto gap-3 items-center">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
              <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#BAD133] focus:ring-[#BAD133]"/>
              Include archived
            </label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#BAD133] shadow-sm cursor-pointer">
              <option value="ALL">All Stages</option>
              <option value="NEW LEAD">New Lead</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="CONSULTING">Consulting</option>
              <option value="APPLICATION">Application</option>
              <option value="VISA">Visa</option>
              <option value="COMPLETED">Completed</option>
              <option value="ARCHIVED">Archived</option>
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
                <tr><td colSpan={5} className="p-16 text-center"><Loader2 size={32} className="animate-spin text-[#BAD133] mx-auto mb-4"/> Syncing pipeline...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={5} className="p-16 text-center text-slate-400 font-medium">No students match your criteria.</td></tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className={`hover:bg-slate-50 transition-colors group cursor-pointer ${student.archived ? 'opacity-60' : ''}`} onClick={() => { setEditingStudent(student); setDossierTab("profile"); }}>
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
                      {student.archived && (
                        <p className="text-[10px] text-slate-500 font-bold mt-1 flex items-center gap-1"><Archive size={10}/> {student.archive_reason || 'archived'}</p>
                      )}
                      <p className="text-[10px] text-slate-400 font-medium mt-1">Last Update: {new Date(student.updated_at || student.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-bold text-slate-700 text-sm">
                        <MapPin size={14} className="text-slate-400"/> {student.country_interest || "Not Specified"}
                      </div>
                      <div className="flex items-center gap-1.5 font-medium text-slate-500 text-xs mt-1">
                        <Building size={12} className="text-slate-300"/> {student.program_interest || "Undecided"}
                      </div>
                      {student.budget_usd && (
                        <div className="flex items-center gap-1.5 font-medium text-emerald-600 text-xs mt-1">
                          <DollarSign size={12}/> ${Number(student.budget_usd).toLocaleString()}/yr
                        </div>
                      )}
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
                        <button onClick={() => { setEditingStudent(student); setDossierTab("profile"); }} className="p-2 bg-white text-slate-400 hover:text-[#282860] hover:bg-slate-100 border border-slate-200 rounded-lg shadow-sm transition-colors" title="View Dossier">
                          <FileText size={16} />
                        </button>
                        {student.archived ? (
                          <button onClick={() => handleUnarchive(student.id)}
                            className="px-3 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-200 hover:border-emerald-600 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5">
                            <RotateCcw size={14}/> Un-archive
                          </button>
                        ) : (
                          <button onClick={() => { setStudentToArchive(student); setIsArchiveModalOpen(true); setArchiveReason(""); setArchiveNotes(""); setArchiveNewAgent(""); }}
                            className="px-3 py-2 bg-slate-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 hover:border-red-600 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5">
                            <Archive size={14}/> Archive
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
            <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3">
              <button onClick={() => setIsAddModalOpen(false)} type="button" className="px-6 py-2.5 text-slate-500 font-bold text-sm hover:text-slate-800 transition-colors">Cancel</button>
              <button form="add-student-form" type="submit" disabled={isCreatingStudent} className="bg-[#282860] hover:bg-[#1b1b42] active:scale-95 text-white px-8 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-50">
                {isCreatingStudent ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : "Register Student"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ARCHIVE MODAL */}
      {isArchiveModalOpen && studentToArchive && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-red-50/50">
              <h2 className="text-xl font-bold text-red-700 flex items-center gap-2">
                <Archive size={22}/> Archive Student
              </h2>
              <button onClick={() => setIsArchiveModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar bg-slate-50">
              <div className="bg-white border border-slate-200 p-4 rounded-xl">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Student</p>
                <p className="font-bold text-[#282860] text-lg">{studentToArchive.name}</p>
                <p className="text-sm text-slate-500 mt-1">Currently assigned to: <span className="font-bold text-slate-700">{studentToArchive.assignee || "Unassigned"}</span></p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-2 block">Drop-off Reason *</label>
                <div className="space-y-2">
                  {ARCHIVE_REASONS.map(r => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setArchiveReason(r.key)}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all flex items-start gap-3 ${
                        archiveReason === r.key
                          ? 'bg-red-50 border-red-400 ring-2 ring-red-200'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xl shrink-0">{r.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold ${archiveReason === r.key ? 'text-red-700' : 'text-[#282860]'}`}>{r.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{r.desc}</p>
                      </div>
                      {archiveReason === r.key && <CheckCircle2 size={20} className="text-red-500 shrink-0"/>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional: new agent selector when "Apply through other agent" */}
              {archiveReason === "apply_through_other_agent" && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3 animate-in fade-in">
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Reassign to which agent?</p>
                  <select value={archiveNewAgent} onChange={(e) => setArchiveNewAgent(e.target.value)}
                    className="w-full px-4 py-3 border border-emerald-300 rounded-xl text-sm font-bold text-[#282860] bg-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 cursor-pointer transition-all">
                    <option value="" disabled>-- Select new agent --</option>
                    {agents.filter(a => a.name !== studentToArchive.assignee).map(agent => (
                      <option key={agent.id} value={agent.name}>{agent.name} ({agent.branch})</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-emerald-700">Student stays active — only the assigned agent changes.</p>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-2 block">Additional Notes (optional)</label>
                <textarea value={archiveNotes} onChange={(e) => setArchiveNotes(e.target.value)}
                  rows={3} placeholder="Any context worth keeping in the timeline..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all resize-none"/>
              </div>
            </div>
            <div className="p-5 border-t border-slate-200 bg-white flex justify-end gap-3">
              <button onClick={() => setIsArchiveModalOpen(false)} className="px-5 py-3 text-slate-500 hover:text-slate-800 font-bold text-sm transition-colors">Cancel</button>
              <button disabled={!archiveReason || isArchiving} onClick={handleArchive} 
                className={`text-white font-bold px-8 py-3 rounded-xl transition-all disabled:opacity-50 shadow-md flex items-center justify-center gap-2 ${
                  archiveReason === "apply_through_other_agent" ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                }`}>
                {isArchiving ? <><Loader2 size={16} className="animate-spin"/> Processing...</> : 
                  archiveReason === "apply_through_other_agent" ? <><RefreshCcw size={16}/> Reassign</> : <><Archive size={16}/> Archive Student</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOSSIER SLIDE-OUT */}
      {editingStudent && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity" onClick={() => setEditingStudent(null)}></div>
          <div className="fixed inset-y-0 right-0 w-full sm:w-[750px] bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col">
            
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

            {/* Archive banner if archived */}
            {editingStudent.archived && (
              <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <Archive size={18} className="text-amber-700"/>
                  <div>
                    <p className="text-sm font-bold text-amber-900">This student is archived</p>
                    <p className="text-xs text-amber-700">Reason: {editingStudent.archive_reason || "unspecified"}{editingStudent.archive_notes ? ` — ${editingStudent.archive_notes}` : ""}</p>
                  </div>
                </div>
                <button onClick={() => handleUnarchive(editingStudent.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors">
                  <RotateCcw size={14}/> Un-archive
                </button>
              </div>
            )}

            <div className="flex bg-slate-50 border-b border-slate-200 px-6 shrink-0 overflow-x-auto custom-scrollbar">
              <button onClick={() => setDossierTab('profile')} className={`px-4 py-4 text-sm font-bold tracking-wider whitespace-nowrap transition-colors flex items-center gap-2 ${dossierTab === 'profile' ? 'border-b-2 border-[#282860] text-[#282860] bg-white' : 'text-slate-400 hover:text-[#282860]'}`}>
                <Edit2 size={16} /> Profile Settings
              </button>
              <button onClick={() => setDossierTab('documents')} className={`px-4 py-4 text-sm font-bold tracking-wider whitespace-nowrap transition-colors flex items-center gap-2 ${dossierTab === 'documents' ? 'border-b-2 border-[#282860] text-[#282860] bg-white' : 'text-slate-400 hover:text-[#282860]'}`}>
                <UploadCloud size={16} /> Application Vault {totalDocCount > 0 && <span className="bg-[#BAD133] text-[#1b1b42] text-[10px] px-2 py-0.5 rounded-full font-black">{totalDocCount}</span>}
              </button>
              <button onClick={() => setDossierTab('ai')} className={`px-4 py-4 text-sm font-bold tracking-wider whitespace-nowrap transition-colors flex items-center gap-2 ${dossierTab === 'ai' ? 'border-b-2 border-[#BAD133] text-[#1b1b42] bg-white' : 'text-slate-400 hover:text-[#282860]'}`}>
                <BrainCircuit size={16} /> AI Intelligence {aiReport && <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-black">✓</span>}
              </button>
              <button onClick={() => setDossierTab('notes')} className={`px-4 py-4 text-sm font-bold tracking-wider whitespace-nowrap transition-colors flex items-center gap-2 ${dossierTab === 'notes' ? 'border-b-2 border-blue-600 text-blue-700 bg-white' : 'text-slate-400 hover:text-blue-600'}`}>
                <MessageSquare size={16} /> Team Collab
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
              
              {dossierTab === 'profile' && (
                <div className="p-6">
                  <form id="edit-student-form" onSubmit={handleEditStudent} className="space-y-6 animate-in fade-in">
                    
                    {/* PERSONAL IDENTITY */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                      <h4 className="text-xs font-black text-[#282860] uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-3"><FileText size={16} className="text-blue-500"/> Personal Identity</h4>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Full Name</label>
                        <input type="text" required className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" value={editingStudent.name || ""} onChange={e => setEditingStudent({...editingStudent, name: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block flex items-center gap-1"><Mail size={12}/> Email</label>
                          <input type="email" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" value={editingStudent.email || ""} onChange={e => setEditingStudent({...editingStudent, email: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block flex items-center gap-1"><Phone size={12}/> Phone / WA</label>
                          <input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" value={editingStudent.phone || ""} onChange={e => setEditingStudent({...editingStudent, phone: e.target.value})} />
                        </div>
                      </div>
                    </div>

                    {/* PARENTS SECTION */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                      <h4 className="text-xs font-black text-[#282860] uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-3"><Users size={16} className="text-pink-500"/> Parents Contact</h4>
                      
                      <div className="bg-blue-50/30 p-4 rounded-xl border border-blue-100 space-y-3">
                        <p className="text-[11px] font-black text-blue-700 uppercase tracking-widest">Father</p>
                        <input type="text" placeholder="Full Name" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" value={editingStudent.father_name || ""} onChange={e => setEditingStudent({...editingStudent, father_name: e.target.value})} />
                        <div className="grid grid-cols-2 gap-2">
                          <input type="email" placeholder="Email" className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" value={editingStudent.father_email || ""} onChange={e => setEditingStudent({...editingStudent, father_email: e.target.value})} />
                          <input type="text" placeholder="WhatsApp" className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" value={editingStudent.father_phone || ""} onChange={e => setEditingStudent({...editingStudent, father_phone: e.target.value})} />
                        </div>
                      </div>
                      
                      <div className="bg-pink-50/30 p-4 rounded-xl border border-pink-100 space-y-3">
                        <p className="text-[11px] font-black text-pink-700 uppercase tracking-widest">Mother</p>
                        <input type="text" placeholder="Full Name" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" value={editingStudent.mother_name || ""} onChange={e => setEditingStudent({...editingStudent, mother_name: e.target.value})} />
                        <div className="grid grid-cols-2 gap-2">
                          <input type="email" placeholder="Email" className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" value={editingStudent.mother_email || ""} onChange={e => setEditingStudent({...editingStudent, mother_email: e.target.value})} />
                          <input type="text" placeholder="WhatsApp" className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" value={editingStudent.mother_phone || ""} onChange={e => setEditingStudent({...editingStudent, mother_phone: e.target.value})} />
                        </div>
                      </div>
                    </div>

                    {/* ACADEMIC & PIPELINE PROFILE */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                      <h4 className="text-xs font-black text-[#282860] uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-3"><BookOpen size={16} className="text-emerald-500"/> Academic & Pipeline Profile</h4>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Program Interest</label>
                        <input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" value={editingStudent.program_interest || ""} onChange={e => setEditingStudent({...editingStudent, program_interest: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block flex items-center gap-1"><DollarSign size={12}/> Annual Budget (USD)</label>
                        <input type="number" min="0" step="1000" placeholder="e.g. 30000" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" value={editingStudent.budget_usd || ""} onChange={e => setEditingStudent({...editingStudent, budget_usd: e.target.value})} />
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

                    {/* FIELD OF INTEREST + OTHER */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                      <div className="border-b border-slate-100 pb-3">
                        <h4 className="text-xs font-black text-[#282860] uppercase tracking-widest flex items-center gap-2">
                          <BrainCircuit size={16} className="text-purple-500"/> Academic Field of Interest
                        </h4>
                        <p className="text-xs text-slate-500 mt-1.5">
                          <em>"Which core academic field interests you the most?"</em> — pick up to {MAX_FIELD_INTERESTS}.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {ACADEMIC_FIELDS.map((field) => {
                          const isSelected = fieldInterests.includes(field.label);
                          const isMaxed = fieldInterests.length >= MAX_FIELD_INTERESTS && !isSelected;
                          return (
                            <button key={field.label} type="button" disabled={isMaxed}
                              onClick={() => {
                                if (isSelected) setFieldInterests(prev => prev.filter(f => f !== field.label));
                                else if (fieldInterests.length < MAX_FIELD_INTERESTS) setFieldInterests(prev => [...prev, field.label]);
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

                      <div className="text-xs font-bold flex items-center gap-2 text-slate-500">
                        <CheckCircle2 size={14} className={fieldInterests.length > 0 ? 'text-emerald-500' : 'text-slate-300'}/>
                        {fieldInterests.length} / {MAX_FIELD_INTERESTS} selected
                      </div>

                      {/* Free-text "Other" replacing the old Other button */}
                      <div className="pt-2 border-t border-slate-100">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Other interests (not in list above)</label>
                        <input type="text" placeholder="e.g. Marine Biology, Fashion Tech, Game Design..." 
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all"
                          value={otherFieldInterest} onChange={e => setOtherFieldInterest(e.target.value)} />
                      </div>
                    </div>

                    {/* PRIMARY POST-GRADUATION CAREER GOAL */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                      <div className="border-b border-slate-100 pb-3">
                        <h4 className="text-xs font-black text-[#282860] uppercase tracking-widest flex items-center gap-2">
                          <Briefcase size={16} className="text-indigo-500"/> Primary Post-Graduation Career Goal
                        </h4>
                        <p className="text-xs text-slate-500 mt-1.5">Where does the student see themselves after graduating? Pick one.</p>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {CAREER_GOALS.map(g => {
                          const isSelected = careerGoal === g.label;
                          return (
                            <button key={g.label} type="button"
                              onClick={() => setCareerGoal(isSelected ? "" : g.label)}
                              className={`p-3 rounded-xl text-xs font-bold transition-all border text-left flex items-start gap-2 ${
                                isSelected
                                  ? 'bg-indigo-500 text-white border-indigo-600 shadow-md ring-2 ring-indigo-200'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50 hover:border-indigo-300'
                              }`}
                            >
                              <span className="text-base shrink-0">{g.emoji}</span>
                              <span className="leading-tight">{g.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* PREFERRED CAMPUS ENVIRONMENT */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                      <div className="border-b border-slate-100 pb-3">
                        <h4 className="text-xs font-black text-[#282860] uppercase tracking-widest flex items-center gap-2">
                          <Home size={16} className="text-orange-500"/> Preferred Campus Environment
                        </h4>
                        <p className="text-xs text-slate-500 mt-1.5">Where would the student thrive? Pick one.</p>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {CAMPUS_ENVIRONMENTS.map(c => {
                          const isSelected = campusEnvironment === c.label;
                          return (
                            <button key={c.label} type="button"
                              onClick={() => setCampusEnvironment(isSelected ? "" : c.label)}
                              className={`p-3 rounded-xl text-xs font-bold transition-all border text-left flex items-start gap-2 ${
                                isSelected
                                  ? 'bg-orange-500 text-white border-orange-600 shadow-md ring-2 ring-orange-200'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-orange-50 hover:border-orange-300'
                              }`}
                            >
                              <span className="text-base shrink-0">{c.emoji}</span>
                              <span className="leading-tight">{c.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* DOCUMENTS TAB */}
              {dossierTab === 'documents' && (
                <div className="p-6 space-y-6 animate-in fade-in">
                  
                  <div className="bg-white rounded-2xl border-2 border-dashed border-blue-200 p-8 hover:bg-blue-50/30 hover:border-blue-400 transition-all">
                    <div className="flex flex-col items-center text-center mb-6">
                      <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3">
                        {isUploadingDoc ? <Loader2 size={28} className="animate-spin" /> : <UploadCloud size={28} />}
                      </div>
                      <h3 className="text-lg font-black text-[#282860]">Upload Student Document</h3>
                      <p className="text-sm text-slate-500 mt-1 max-w-sm">Multiple files per category supported.</p>
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
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between shadow-sm gap-4">
                    <div>
                      <h3 className="font-black text-[#282860] flex items-center gap-2"><FileText size={20} className="text-blue-500"/> Application Document Vault</h3>
                      <p className="text-xs text-slate-500 mt-1">Upload as many files as needed per category.</p>
                    </div>
                    <div className="bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-2 shrink-0">
                      <UploadCloud size={16} className="text-blue-500"/> 
                      <span><strong className="text-[#282860]">{totalDocCount}</strong> files - <strong className="text-[#282860]">{categoriesWithDocs}</strong>/{STANDARD_CATEGORIES.length} categories</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {STANDARD_CATEGORIES.map((cat) => {
                      const filesInCat = getDocsInCategory(cat.type, studentDocs);
                      const count = filesInCat.length;
                      const isEmpty = count === 0;

                      return (
                        <div key={cat.type} className={`rounded-2xl border shadow-sm transition-all ${isEmpty ? "bg-white border-slate-200" : "bg-white border-emerald-200"}`}>
                          <div className="p-4 flex items-center justify-between border-b border-slate-100">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`p-3 rounded-xl border shrink-0 ${isEmpty ? "bg-slate-50 border-slate-200 text-slate-400" : "bg-emerald-50 border-emerald-100 text-emerald-600"}`}>
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
                                {/* SOP sample link */}
                                {cat.type === 'SOP' && (
                                  <a href="https://www.examples.com/education/statement-of-purpose-examples.html" target="_blank" rel="noopener noreferrer"
                                    className="text-xs font-bold text-blue-600 hover:underline mt-1 inline-flex items-center gap-1">
                                    📄 View SOP template / samples →
                                  </a>
                                )}
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
                              No files yet.
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
                                        <p className="text-sm font-semibold text-slate-700 truncate" title={displayName}>{displayName}</p>
                                        {doc.uploaded_by && (
                                          <p className="text-[10px] text-slate-400 truncate">by {doc.uploaded_by}</p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button onClick={() => handleViewDocument(doc.filename)} disabled={isLoadingThisDoc || isDeletingThisDoc}
                                        className="p-2 bg-slate-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 rounded-lg shadow-sm transition-colors disabled:opacity-50" title="View">
                                        {isLoadingThisDoc ? <Loader2 size={14} className="animate-spin"/> : <Eye size={14}/>}
                                      </button>
                                      <button onClick={() => handleDeleteDocument(doc.filename, displayName)} disabled={isLoadingThisDoc || isDeletingThisDoc}
                                        className="p-2 bg-slate-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 rounded-lg shadow-sm transition-colors disabled:opacity-50" title="Delete">
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
                                  <p className="text-sm font-semibold text-slate-700 truncate">{displayName}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button onClick={() => handleViewDocument(doc.filename)} disabled={isLoadingThisDoc || isDeletingThisDoc}
                                  className="text-blue-600 font-bold text-xs bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 flex items-center gap-1.5 disabled:opacity-50">
                                  {isLoadingThisDoc ? <Loader2 size={14} className="animate-spin"/> : <Eye size={14}/>} View
                                </button>
                                <button onClick={() => handleDeleteDocument(doc.filename, displayName)} disabled={isLoadingThisDoc || isDeletingThisDoc}
                                  className="text-red-600 font-bold text-xs bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 flex items-center gap-1.5 disabled:opacity-50">
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

              {/* AI INTELLIGENCE — with persistence */}
              {dossierTab === 'ai' && (
                <div className="p-6 h-full flex flex-col animate-in fade-in">
                  {!aiReport && !isGeneratingAI && (
                    <div className="bg-[#1b1b42] rounded-3xl p-8 shadow-xl text-center flex flex-col items-center justify-center relative overflow-hidden border border-[#282860] mt-10">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#BAD133] to-[#282860]"></div>
                      <BrainCircuit size={64} className="text-[#BAD133] mb-6"/>
                      <h3 className="text-2xl font-black text-white mb-2">Generate Strategic Profile</h3>
                      <p className="text-slate-300 text-sm mb-8 max-w-md mx-auto leading-relaxed">
                        Fortrust AI will cross-reference {editingStudent.name}'s report cards, profiling tests, and selected interests.
                      </p>
                      <button onClick={generateAIReport} className="bg-[#BAD133] hover:bg-[#a3b827] text-[#1b1b42] font-black px-8 py-4 rounded-xl shadow-lg flex items-center gap-3">
                        <Activity size={20} /> Run AI Analysis
                      </button>
                    </div>
                  )}
                  {isGeneratingAI && (
                    <div className="flex flex-col items-center justify-center py-20 flex-1">
                      <Loader2 size={48} className="animate-spin text-[#BAD133] mb-6" />
                      <h3 className="text-xl font-black text-[#282860] mb-2">Analyzing Dossier...</h3>
                      <p className="text-sm text-slate-500">Cross-referencing grades, profiling, and aspirations.</p>
                    </div>
                  )}
                  {aiReport && !isGeneratingAI && (
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
                      <div className="bg-slate-50 border-b border-slate-100 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={18} className="text-emerald-500"/>
                          <div>
                            <span className="font-bold text-[#282860]">AI Strategic Report</span>
                            {aiReportGeneratedAt && (
                              <p className="text-[10px] text-slate-500">Last generated: {new Date(aiReportGeneratedAt).toLocaleString()}</p>
                            )}
                          </div>
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

              {/* NOTES TAB */}
              {dossierTab === 'notes' && (
                <div className="flex flex-col h-full animate-in fade-in">
                  <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-6">
                    {studentTimeline.length === 0 ? (
                      <div className="text-center py-16 text-slate-400 flex flex-col items-center">
                        <MessageSquare size={40} className="mb-3 text-slate-200" />
                        <p className="font-medium">No notes yet.</p>
                      </div>
                    ) : (
                      studentTimeline.map((note: any, i: number) => (
                        <div key={i} className="flex gap-4">
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold border-2 border-white shadow-sm">
                            {(note.author || "U").charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-baseline justify-between mb-1">
                              <span className="font-bold text-slate-800 text-sm">{note.author || "Team"}</span>
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
                        placeholder="Add an internal note..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 pr-16 text-sm outline-none focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10 transition-all resize-none" rows={2}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendNote(e); }
                        }} />
                      <button type="submit" disabled={!newNote.trim() || isSendingNote}
                        className="absolute right-3 bottom-3 w-10 h-10 rounded-xl bg-[#282860] hover:bg-[#1b1b42] text-white flex items-center justify-center disabled:opacity-50 shadow-md">
                        {isSendingNote ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
                      </button>
                    </form>
                    <p className="text-[10px] text-slate-400 mt-2 font-medium text-center">Team Collab v2 (with @mentions + read receipts) coming in Sprint B.</p>
                  </div>
                </div>
              )}
            </div>
            
            {dossierTab === 'profile' && (
              <div className="p-5 border-t border-slate-200 bg-white flex justify-end gap-3 shrink-0">
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