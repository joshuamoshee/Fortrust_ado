"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Search, Filter, GraduationCap, Building, MapPin, 
  FileText, UserMinus, RefreshCcw, Loader2, Edit2, Save,
  X, CheckCircle2, ShieldAlert, Mail, Phone, BookOpen, 
  Thermometer, BrainCircuit, UploadCloud, Activity, AlertCircle, 
  Eye, Trash2, Plus, MessageSquare, Send, Clock, User, Circle,
  ChevronRight, ChevronLeft, CheckCircle, Award, Briefcase, Sparkles, Target, ChevronDown, Archive,
  Download,DollarSign
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
  { label: "Business & Management", emoji: "\uD83D\uDCBC" },
  { label: "Economics & Finance", emoji: "\uD83D\uDCC8" },
  { label: "Marketing & Communication", emoji: "\uD83D\uDCE3" },
  { label: "Computer Science & IT", emoji: "\uD83D\uDCBB" },
  { label: "Engineering", emoji: "\u2699\uFE0F" },
  { label: "Medicine & Health Sciences", emoji: "\uD83E\uDE7A" },
  { label: "Sciences (Bio/Chem/Physics)", emoji: "\uD83D\uDD2C" },
  { label: "Design & Creative Arts", emoji: "\uD83C\uDFA8" },
  { label: "Hospitality & Tourism", emoji: "\uD83C\uDFE8" },
  { label: "Other", emoji: "\u2728" },
];

const CAREER_GOALS = [
  "Corporate / Private Sector",
  "Freelance / Creative",
  "Government / Public Sector",
  "Non-Profit / NGO / Social Impact",
  "Family Business",
  "Entrepreneurship / Business",
  "Academia / Research",
  "Undecided",
  "Other",
];

const CAMPUS_ENVS = [
  "City Center",
  "Suburban / Campus Town",
  "Rural / Quiet",
  "Traditional College Town",
  "Industry / Tech / Innovation Hub",
  "Other",
];

const FORTRUST_COUNTRIES = [
  { value: "australia", label: "🇦🇺 Australia" },
  { value: "uk", label: "🇬🇧 United Kingdom" },
  { value: "usa", label: "🇺🇸 United States" },
  { value: "canada", label: "🇨🇦 Canada" },
  { value: "netherlands", label: "🇳🇱 Netherlands" },
  { value: "germany", label: "🇩🇪 Germany" },
  { value: "new_zealand", label: "🇳🇿 New Zealand" },
  { value: "singapore", label: "🇸🇬 Singapore" },
  { value: "malaysia", label: "🇲🇾 Malaysia" },
  { value: "other", label: "🌍 Other" },
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
  const [showArchived, setShowArchived] = useState(false);
  
  // Reassignment & Archiving States
  const [editingAgentForId, setEditingAgentForId] = useState<string | null>(null);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [studentToArchive, setStudentToArchive] = useState<any>(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [isArchiving, setIsArchiving] = useState(false);

  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [dossierTab, setDossierTab] = useState<"profile" | "documents" | "ai" | "notes">("profile");
  const [isSavingStudent, setIsSavingStudent] = useState(false);
  
  const [aiReport, setAiReport] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState("Report Card");
  const [loadingDocFilename, setLoadingDocFilename] = useState<string | null>(null);
  const [deletingDocFilename, setDeletingDocFilename] = useState<string | null>(null);

  // Expanded Academic Profile States
  const [fieldInterests, setFieldInterests] = useState<string[]>([]);
  const [careerGoal, setCareerGoal] = useState<string>("");
  const [campusEnv, setCampusEnv] = useState<string>("");
  const [customFieldInterest, setCustomFieldInterest] = useState("");
  const [customCareerGoal, setCustomCareerGoal] = useState("");
  const [customCampusEnv, setCustomCampusEnv] = useState("");
  const [countryInterest, setCountryInterest] = useState("");

  const [newNote, setNewNote] = useState("");
  const [isSendingNote, setIsSendingNote] = useState(false);
  const notesEndRef = useRef<HTMLDivElement>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: "", email: "", phone: "", assignee: "", program_interest: "", lead_source: "", lead_temperature: "Cold Leads", status: "NEW LEAD", budget: ""
  });
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);

  const [notification, setNotification] = useState<{type: 'success'|'error', message: string} | null>(null);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (dossierTab === 'notes') notesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dossierTab, editingStudent?.timeline]);

  // Load field_interests and profile from the student record when dossier opens
  // Load field_interests and profile from the student record when dossier opens
  useEffect(() => {
    if (!editingStudent?.id) {
      setAiReport("");
      setFieldInterests([]);
      setCareerGoal("");
      setCampusEnv("");
      setCountryInterest("");
      setCustomFieldInterest("");
      setCustomCareerGoal("");
      setCustomCampusEnv("");
      return;
    }

    // Populate academic profile fields from student data
    try {
      const raw = editingStudent.field_interests;
      if (raw) {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        setFieldInterests(Array.isArray(parsed) ? parsed : []);
      } else {
        setFieldInterests([]);
      }
    } catch {
      setFieldInterests([]);
    }
    setCareerGoal(editingStudent.career_goal || "");
    setCampusEnv(editingStudent.campus_env || "");
    setCountryInterest(editingStudent.country_interest || "");

    const loadSavedReport = async () => {
      try {
        const token = localStorage.getItem("fortrust_token");
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline/${editingStudent.id}/ai-report`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.status === "success" && data.report) {
            setAiReport(data.report);
          } else {
            setAiReport("");
          }
        }
      } catch (e) {
        console.error("Failed to load saved AI report", e);
      }
    };
    loadSavedReport();
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
        setNewStudent({ name: "", email: "", phone: "", assignee: "", program_interest: "", lead_source: "", lead_temperature: "Cold Leads", status: "NEW LEAD", budget: "" });
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

  const handleInlineReassign = async (studentId: string, newAgentName: string) => {
    setEditingAgentForId(null);
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline/${studentId}`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ assignee: newAgentName }) 
      });
      if (res.ok) {
        setNotification({type: 'success', message: `Student reassigned to ${newAgentName}.`});
        fetchData(); 
      } else {
        setNotification({type: 'error', message: "Failed to reassign student."});
      }
    } catch (error) {
      setNotification({type: 'error', message: "Network error."});
    }
  };

  const handleArchiveSubmit = async () => {
    if (!studentToArchive || !archiveReason) return;
    setIsArchiving(true);
    try {
      const token = localStorage.getItem("fortrust_token");
      
      // Update Status to ARCHIVED
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/students/${studentToArchive.id}`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" })
      });

      // Post system note regarding archive
      let authorName = "Master Admin";
      try {
        if (token) { const payload = JSON.parse(atob(token.split('.')[1])); authorName = payload.name || "Master Admin"; }
      } catch (e) {}

      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline/${studentToArchive.id}/notes`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ note: `SYSTEM: Student was archived. Reason: ${archiveReason}`, author: authorName })
      });

      setNotification({type: 'success', message: `${studentToArchive.name} has been archived.`});
      setIsArchiveModalOpen(false);
      setStudentToArchive(null);
      setArchiveReason("");
      fetchData(); 
    } catch (error) {
      setNotification({type: 'error', message: "Network error while archiving."});
    } finally {
      setIsArchiving(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setIsSavingStudent(true);

    // Resolve 'Other' custom text inputs
    let finalFields = [...fieldInterests];
    if (finalFields.includes("Other") && customFieldInterest) {
      finalFields = finalFields.map(f => f === "Other" ? customFieldInterest : f);
    }
    const finalCareer = careerGoal === "Other" ? customCareerGoal : careerGoal;
    const finalCampus = campusEnv === "Other" ? customCampusEnv : campusEnv;

    try {
      const token = localStorage.getItem("fortrust_token");
      
      // 1. Update Profile
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
          budget: editingStudent.budget,
          father_name: editingStudent.father_name,
          father_email: editingStudent.father_email,
          father_whatsapp: editingStudent.father_whatsapp,
          mother_name: editingStudent.mother_name,
          mother_email: editingStudent.mother_email,
          mother_whatsapp: editingStudent.mother_whatsapp,
          field_interests: JSON.stringify(finalFields),
          career_goal: finalCareer,
          campus_env: finalCampus,
          country_interest: countryInterest
        })
      });

      if (res.ok) {
        setNotification({type: 'success', message: `Student profile updated.`});
        
        // 2. System Activity Logging to Chat/Timeline
        let authorName = "Master Admin";
        try { if (token) { const payload = JSON.parse(atob(token.split('.')[1])); authorName = payload.name.split(" ")[0] || "Admin"; } } catch (e) {}
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline/${editingStudent.id}/notes`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ note: `SYSTEM: ${authorName} updated the Academic & Profile Data.`, author: "System AI" })
        });

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
  const handleDownloadPdf = async () => {
    if (!editingStudent) return;
    setIsDownloadingPdf(true);
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/pipeline/${editingStudent.id}/ai-report/pdf`,
        { headers: { "Authorization": `Bearer ${token}` } }
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setNotification({ type: 'error', message: errData.detail || "PDF download failed." });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeName = (editingStudent.name || 'student').replace(/[^a-zA-Z0-9]/g, '_');
      link.download = `Fortrust_Report_${safeName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setNotification({ type: 'success', message: "PDF downloaded successfully." });
    } catch (e) {
      setNotification({ type: 'error', message: "Network error while downloading PDF." });
    } finally {
      setIsDownloadingPdf(false);
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
        
        // System Log for Document Upload
        let authorName = "Master Admin";
        try { if (token) { const payload = JSON.parse(atob(token.split('.')[1])); authorName = payload.name.split(" ")[0] || "Admin"; } } catch (e) {}
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline/${editingStudent.id}/notes`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ note: `SYSTEM: ${authorName} uploaded a new document (${docType}).`, author: "System AI" })
        });

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
        if (res.status === 404) msg = "This file is registered but missing from the cloud vault. It may have been deleted.";
        else if (res.status === 403) msg = "You don't have permission to view this document.";
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
    if (s === "REJECTED" || s === "ARCHIVED") return "bg-red-50 text-red-700 border-red-200";
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  // Chat syntax highlighter for @mentions
  const renderMessageText = (text: string) => {
    if (!text) return null;
    const words = text.split(" ");
    return words.map((word, idx) => {
      if (word.startsWith("@")) {
        return <span key={idx} className="text-blue-600 font-black bg-blue-50 px-1 rounded mx-0.5">{word} </span>;
      }
      return <span key={idx}>{word} </span>;
    });
  };

  const filteredStudents = allStudents.filter(student => {
    const matchesSearch = (student.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (student.email || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || (student.status || "NEW LEAD").toUpperCase() === statusFilter;
    const matchesAgent = agentFilter === "ALL" || 
                        (agentFilter === "UNASSIGNED" && (!student.assignee || student.assignee === "Unassigned")) ||
                        student.assignee === agentFilter;
    // Sprint A: hide archived students unless toggle is on
    const matchesArchive = showArchived || (student.status || "").toUpperCase() !== "ARCHIVED";
    return matchesSearch && matchesStatus && matchesAgent && matchesArchive;
  });

  const totalStudents = allStudents.length;
  const unassignedCount = allStudents.filter(s => !s.assignee || s.assignee === "Unassigned").length;
  const inProgressCount = allStudents.filter(s => s.status !== "COMPLETED" && s.status !== "REJECTED" && s.status !== "ARCHIVED").length;
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

      {/* ARCHIVED STAT — shown only when archived students exist */}
      {(() => {
        const archivedCount = allStudents.filter(s => (s.status || "").toUpperCase() === "ARCHIVED").length;
        if (archivedCount === 0) return null;
        return (
          <div className="mb-6">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between ${
                showArchived
                  ? 'bg-red-50 border-red-200'
                  : 'bg-slate-50 border-slate-200 hover:bg-red-50 hover:border-red-100'
              }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                  <Archive size={20} className="text-red-600"/>
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-500">Archived Students</p>
                  <p className="text-lg font-black text-[#282860]">{archivedCount} preserved</p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {showArchived ? "Hide from list ↑" : "Show in list ↓"}
              </span>
            </button>
          </div>
        );
      })()}

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
              {agents.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
            </select>
            <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer transition-all shadow-sm border ${
              showArchived ? "bg-red-50 border-red-200 text-red-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}>
              <input 
                type="checkbox" 
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
              />
              <Archive size={14} className={showArchived ? "text-red-500" : "text-slate-400"} />
              <span className="text-xs font-bold whitespace-nowrap">Include archived</span>
            </label>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-[#f8fafc] border-b border-slate-200 text-[10px] font-black text-slate-400 tracking-widest uppercase sticky top-0 z-10">
              <tr>
                <th className="px-6 py-5">Student Identity</th>
                <th className="px-6 py-5">Pipeline Stage</th>
                <th className="px-6 py-5">Budget</th>
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
                      <p className="text-[10px] text-slate-400 font-medium mt-1">Updated: {new Date(student.updated_at || student.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-600">
                      {student.budget ? `$${student.budget}` : "TBD"}
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      {/* INLINE AGENT REASSIGNMENT */}
                      {editingAgentForId === student.id ? (
                        <select 
                          className="px-3 py-1.5 border border-blue-400 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-200"
                          autoFocus
                          onChange={(e) => handleInlineReassign(student.id, e.target.value)}
                          onBlur={() => setEditingAgentForId(null)}
                          defaultValue={student.assignee || ""}
                        >
                          <option value="" disabled>Select Agent...</option>
                          {agents.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                        </select>
                      ) : (
                        <div 
                          className="flex items-center gap-2 cursor-pointer hover:bg-blue-50 p-1.5 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                          onClick={() => setEditingAgentForId(student.id)}
                          title="Click to reassign"
                        >
                          {!student.assignee || student.assignee === "Unassigned" ? (
                            <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded-lg text-xs font-bold">
                              <UserMinus size={14}/> Unassigned
                            </span>
                          ) : (
                            <>
                              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-[10px]">
                                {student.assignee.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-bold text-slate-700 text-sm hover:text-blue-600 underline decoration-dashed decoration-slate-300 underline-offset-4">{student.assignee}</span>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => { setEditingStudent(student); setDossierTab("profile"); }} className="p-2 bg-white text-slate-400 hover:text-[#282860] hover:bg-slate-100 border border-slate-200 rounded-lg shadow-sm transition-colors" title="View Student Dossier">
                          <FileText size={16} />
                        </button>
                        <button onClick={() => { setStudentToArchive(student); setIsArchiveModalOpen(true); }}
                          className="px-3 py-2 bg-white text-red-600 hover:bg-red-600 hover:text-white border border-red-200 hover:border-red-600 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5">
                          <Archive size={14}/> Archive
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Assign To Agent</label>
                      <select className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all cursor-pointer font-bold text-[#282860]" value={newStudent.assignee} onChange={e => setNewStudent({...newStudent, assignee: e.target.value})}>
                        <option value="">Unassigned (Open Pool)</option>
                        {agents.map(a => <option key={a.id} value={a.name}>{a.name} ({a.branch})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block flex items-center gap-1"><DollarSign size={12}/> Budget</label>
                      <input type="text" placeholder="e.g. 50,000" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" value={newStudent.budget} onChange={e => setNewStudent({...newStudent, budget: e.target.value})} />
                    </div>
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

      {/* ARCHIVE CONFIRMATION MODAL */}
      {isArchiveModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-red-100">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-red-50">
              <h2 className="text-xl font-bold text-red-700 flex items-center gap-2"><Archive size={22} className="text-red-500" /> Archive Student Data</h2>
              <button onClick={() => { setIsArchiveModalOpen(false); setArchiveReason(""); }} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                <p className="text-sm text-slate-600">You are about to archive the pipeline for</p>
                <p className="font-black text-[#282860] text-xl mt-1">{studentToArchive?.name}</p>
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mt-3 text-left">
                  <p className="text-xs text-emerald-700 font-bold flex items-center gap-1.5">
                    <CheckCircle2 size={12}/> All data will be preserved
                  </p>
                  <p className="text-[10px] text-emerald-600 mt-0.5">
                    Documents, AI report, chat, notes, and all profile data stay intact.
                    You can restore this student anytime via the archived view.
                  </p>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Reason for dropping/archiving <span className="text-red-500">*</span></label>
                <select value={archiveReason} onChange={(e) => setArchiveReason(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-[#282860] outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20 bg-white cursor-pointer transition-all shadow-sm">
                  <option value="" disabled>-- Select a Reason --</option>
                  <option value="Apply through other agent">Apply through other agent</option>
                  <option value="Financial Issues">Financial Issues</option>
                  <option value="Changed Mind / Not Proceeding">Changed Mind / Not Proceeding</option>
                  <option value="Unresponsive">Unresponsive</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button onClick={() => setIsArchiveModalOpen(false)} className="px-5 py-3 text-slate-500 hover:text-slate-800 font-bold text-sm transition-colors">Cancel</button>
                <button disabled={!archiveReason || isArchiving} onClick={handleArchiveSubmit} 
                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-3 rounded-xl transition-all disabled:opacity-50 shadow-md flex items-center justify-center gap-2">
                  {isArchiving ? <><Loader2 size={16} className="animate-spin"/> Archiving...</> : "Confirm Archive"}
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

            {/* ARCHIVED BANNER */}
            {(editingStudent.status || "").toUpperCase() === "ARCHIVED" && (
              <div className="bg-red-50 border-b border-red-200 px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                    <Archive size={20} className="text-red-600"/>
                  </div>
                  <div>
                    <p className="text-sm font-black text-red-700 uppercase tracking-wider">Student Archived</p>
                    <p className="text-xs text-red-600 mt-0.5">
                      {editingStudent.archive_reason
                        ? <>Reason: <strong>{editingStudent.archive_reason}</strong></>
                        : "No reason specified."}
                      {" "}— All data preserved. Documents and AI report intact.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm(`Restore ${editingStudent.name} to active pipeline?`)) return;
                    try {
                      const token = localStorage.getItem("fortrust_token");
                      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline/${editingStudent.id}`, {
                        method: "PUT",
                        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                        body: JSON.stringify({ status: "NEW LEAD", archive_reason: "" })
                      });
                      if (res.ok) {
                        // Log system note
                        let authorName = "Master Admin";
                        try { if (token) { const payload = JSON.parse(atob(token.split('.')[1])); authorName = payload.name || "Master Admin"; } } catch (e) {}
                        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline/${editingStudent.id}/notes`, {
                          method: "POST",
                          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                          body: JSON.stringify({ note: `SYSTEM: ${authorName} restored student from archive to active pipeline.`, author: "System AI" })
                        });
                        setNotification({type: 'success', message: `${editingStudent.name} restored to active pipeline.`});
                        setEditingStudent(null);
                        fetchData();
                      } else {
                        setNotification({type: 'error', message: "Failed to restore student."});
                      }
                    } catch (e) {
                      setNotification({type: 'error', message: "Network error."});
                    }
                  }}
                  className="bg-white hover:bg-red-100 text-red-700 border border-red-300 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 shrink-0"
                >
                  <RefreshCcw size={14}/> Restore
                </button>
              </div>
            )}
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
              <button onClick={() => setDossierTab('ai')} className={`px-4 py-4 text-sm font-bold tracking-wider whitespace-nowrap transition-colors flex items-center gap-2 ${dossierTab === 'ai' ? 'border-b-2 border-[#BAD133] text-[#1b1b42] bg-white' : 'text-slate-400 hover:text-[#282860]'}`}>
                <BrainCircuit size={16} /> AI Intelligence
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
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block flex items-center gap-1"><Mail size={12}/> Email Address</label>
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
                      <h4 className="text-xs font-black text-[#282860] uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-3"><User size={16} className="text-orange-500"/> Parents / Guardians</h4>
                      
                      {/* FATHER */}
                      <div className="space-y-4">
                        <p className="text-xs font-black text-slate-700">Father's Information</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Name</label>
                            <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:border-orange-300" value={editingStudent.father_name || ""} onChange={e => setEditingStudent({...editingStudent, father_name: e.target.value})} />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Email</label>
                            <input type="email" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:border-orange-300" value={editingStudent.father_email || ""} onChange={e => setEditingStudent({...editingStudent, father_email: e.target.value})} />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Phone / WA</label>
                            <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:border-orange-300" value={editingStudent.father_whatsapp || ""} onChange={e => setEditingStudent({...editingStudent, father_whatsapp: e.target.value})} />
                          </div>
                        </div>
                      </div>

                      {/* MOTHER */}
                      <div className="space-y-4 border-t border-slate-100 pt-4">
                        <p className="text-xs font-black text-slate-700">Mother's Information</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Name</label>
                            <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:border-orange-300" value={editingStudent.mother_name || ""} onChange={e => setEditingStudent({...editingStudent, mother_name: e.target.value})} />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Email</label>
                            <input type="email" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:border-orange-300" value={editingStudent.mother_email || ""} onChange={e => setEditingStudent({...editingStudent, mother_email: e.target.value})} />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Phone / WA</label>
                            <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:border-orange-300" value={editingStudent.mother_whatsapp || ""} onChange={e => setEditingStudent({...editingStudent, mother_whatsapp: e.target.value})} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* PIPELINE DATA */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                      <h4 className="text-xs font-black text-[#282860] uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-3"><BookOpen size={16} className="text-emerald-500"/> Pipeline Data</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Program Interest</label>
                          <input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" value={editingStudent.program_interest || ""} onChange={e => setEditingStudent({...editingStudent, program_interest: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block flex items-center gap-1"><DollarSign size={12}/> Budget</label>
                          <input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" value={editingStudent.budget || ""} onChange={e => setEditingStudent({...editingStudent, budget: e.target.value})} />
                        </div>
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
                            <option value="ARCHIVED">ARCHIVED</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* EXPANDED ACADEMIC PROFILE */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-8">
                      
                      {/* FIELD OF INTEREST */}
                      <div>
                        <div className="border-b border-slate-100 pb-3 mb-4">
                          <h4 className="text-xs font-black text-[#282860] uppercase tracking-widest flex items-center gap-2">
                            <BrainCircuit size={16} className="text-purple-500"/> Academic Field of Interest
                          </h4>
                          <p className="text-xs text-slate-500 mt-1.5">Select up to {MAX_FIELD_INTERESTS}. Used by AI for matching algorithms.</p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {ACADEMIC_FIELDS.map((field) => {
                            const isSelected = fieldInterests.includes(field.label);
                            const isMaxed = fieldInterests.length >= MAX_FIELD_INTERESTS && !isSelected;
                            return (
                              <button key={field.label} type="button" disabled={isMaxed && field.label !== "Other"}
                                onClick={() => {
                                  if (isSelected) setFieldInterests(prev => prev.filter(f => f !== field.label));
                                  else if (fieldInterests.length < MAX_FIELD_INTERESTS) setFieldInterests(prev => [...prev, field.label]);
                                }}
                                className={`p-3 rounded-xl text-xs font-bold transition-all border text-left flex items-start gap-2 ${
                                  isSelected ? 'bg-emerald-500 text-white border-emerald-600 shadow-md' : isMaxed ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50'
                                }`}>
                                <span className="text-base shrink-0">{field.emoji}</span>
                                <span className="leading-tight">{field.label}</span>
                              </button>
                            );
                          })}
                        </div>
                        {fieldInterests.includes("Other") && (
                          <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                            <input type="text" placeholder="Please specify field of interest..." className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-emerald-200" value={customFieldInterest} onChange={(e) => setCustomFieldInterest(e.target.value)}/>
                          </div>
                        )}
                      </div>

                      {/* CAREER GOAL */}
                      <div>
                        <div className="border-b border-slate-100 pb-3 mb-4">
                          <h4 className="text-xs font-black text-[#282860] uppercase tracking-widest">Primary Post-Graduation Career Goal</h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {CAREER_GOALS.map(goal => (
                            <button key={goal} type="button" onClick={() => setCareerGoal(goal)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${careerGoal === goal ? 'bg-[#282860] text-white border-[#1b1b42]' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
                              {goal}
                            </button>
                          ))}
                        </div>
                        {careerGoal === "Other" && (
                          <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                            <input type="text" placeholder="Please specify career goal..." className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-[#282860]/20" value={customCareerGoal} onChange={(e) => setCustomCareerGoal(e.target.value)}/>
                          </div>
                        )}
                      </div>

                      {/* CAMPUS ENVIRONMENT */}
                      <div>
                        <div className="border-b border-slate-100 pb-3 mb-4">
                          <h4 className="text-xs font-black text-[#282860] uppercase tracking-widest">Preferred Campus Environment</h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {CAMPUS_ENVS.map(env => (
                            <button key={env} type="button" onClick={() => setCampusEnv(env)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${campusEnv === env ? 'bg-blue-600 text-white border-blue-700' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
                              {env}
                            </button>
                          ))}
                        </div>
                        {campusEnv === "Other" && (
                          <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                            <input type="text" placeholder="Please specify preferred environment..." className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-blue-200" value={customCampusEnv} onChange={(e) => setCustomCampusEnv(e.target.value)}/>
                          </div>
                        )}
                      </div>

                      {/* PREFERRED STUDY DESTINATION */}
                      <div>
                        <div className="border-b border-slate-100 pb-3 mb-4">
                          <h4 className="text-xs font-black text-[#282860] uppercase tracking-widest flex items-center gap-2">
                            <MapPin size={16} className="text-rose-500"/> Preferred Study Destination
                          </h4>
                          <p className="text-xs text-slate-500 mt-1.5">Select one country. Used by AI for university matching.</p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {FORTRUST_COUNTRIES.map(country => (
                            <button
                              key={country.value}
                              type="button"
                              onClick={() => setCountryInterest(countryInterest === country.value ? "" : country.value)}
                              className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors text-left ${
                                countryInterest === country.value
                                  ? 'bg-[#BAD133] text-[#1b1b42] border-[#BAD133] shadow-md'
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}>
                              {country.label}
                            </button>
                          ))}
                        </div>
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
                                {cat.type === "SOP" && (
                                  <button onClick={() => alert("Downloading SOP Template... (To be linked to backend)")} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 mt-1 flex items-center gap-1 transition-colors">
                                    <Download size={10}/> Download Sample SOP Template
                                  </button>
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

              {dossierTab === 'ai' && (
                <div className="p-6 h-full flex flex-col animate-in fade-in">
                  {!aiReport && !isGeneratingAI && (
                    <div className="bg-[#1b1b42] rounded-3xl p-8 shadow-xl text-center flex flex-col items-center justify-center relative overflow-hidden border border-[#282860] mt-10">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#BAD133] to-[#282860]"></div>
                      <BrainCircuit size={64} className="text-[#BAD133] mb-6 drop-shadow-[0_0_15px_rgba(186,209,51,0.3)]" />
                      <h3 className="text-2xl font-black text-white mb-2">Generate Strategic Profile</h3>
                      <p className="text-slate-300 text-sm mb-8 max-w-md mx-auto leading-relaxed">
                        Fortrust AI will cross-reference {editingStudent.name}'s report cards, profiling tests, and selected academic interests to generate a comprehensive placement strategy.
                      </p>
                      {fieldInterests.length === 0 && (
                        <p className="text-amber-300 text-xs mb-4 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-2">
                          ⚠️ Tip: Select Field of Interest in Profile tab for richer AI analysis.
                        </p>
                      )}
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
                      <p className="text-sm text-slate-500 font-medium">Cross-referencing grades, profiling results, and student aspirations.</p>
                    </div>
                  )}
                  {aiReport && !isGeneratingAI && (
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                      {/* Header bar */}
                      <div className="bg-slate-50 border-b border-slate-100 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={18} className="text-emerald-500"/>
                          <span className="font-bold text-[#282860]">AI Strategic Report</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={handleDownloadPdf}
                            disabled={isDownloadingPdf}
                            className="bg-[#BAD133] hover:bg-[#a3b827] text-[#1b1b42] px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {isDownloadingPdf
                              ? <Loader2 size={12} className="animate-spin"/>
                              : <Download size={12}/>}
                            {isDownloadingPdf ? "Generating..." : "Download PDF"}
                          </button>
                          <button
                            type="button"
                            onClick={generateAIReport}
                            className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <RefreshCcw size={12}/> Regenerate
                          </button>
                        </div>
                      </div>

                      {/* Report body */}
                      <div className="p-6 overflow-y-auto custom-scrollbar prose prose-sm max-w-none">
                        <div className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed font-mono">
                          {aiReport}
                        </div>
                      </div>

                      {/* Bottom download button for long reports */}
                      <div className="border-t border-slate-100 p-4 flex justify-end bg-slate-50">
                        <button
                          type="button"
                          onClick={handleDownloadPdf}
                          disabled={isDownloadingPdf}
                          className="bg-[#BAD133] hover:bg-[#a3b827] text-[#1b1b42] px-5 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                        >
                          {isDownloadingPdf
                            ? <Loader2 size={14} className="animate-spin"/>
                            : <Download size={14}/>}
                          {isDownloadingPdf ? "Generating PDF..." : "Download PDF Report"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TEAM COLLAB TAB (NOTES & CHAT) */}
              {dossierTab === 'notes' && (
                <div className="flex flex-col h-full animate-in fade-in">
                  <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-6">
                    {studentTimeline.length === 0 ? (
                      <div className="text-center py-16 text-slate-400 flex flex-col items-center">
                        <MessageSquare size={40} className="mb-3 text-slate-200" />
                        <p className="font-medium">No notes on this student yet.</p>
                        <p className="text-xs mt-1">Start the conversation below or type @ to mention an agent.</p>
                      </div>
                    ) : (
                      studentTimeline.map((note: any, i: number) => {
                        const isSystem = note.author === "System AI" || note.note.startsWith("SYSTEM:");
                        return (
                          <div key={i} className={`flex gap-4 ${isSystem ? 'opacity-80' : ''}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold border-2 border-white shadow-sm ${isSystem ? 'bg-slate-200 text-slate-500' : 'bg-blue-100 text-blue-700'}`}>
                              {isSystem ? <Activity size={16} /> : (note.author || "U").charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-baseline justify-between mb-1">
                                <span className={`font-bold text-sm ${isSystem ? 'text-slate-500' : 'text-slate-800'}`}>
                                  {isSystem ? 'Fortrust System' : note.author || "Team Member"}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1"><Clock size={10}/> {note.date}</span>
                              </div>
                              <div className={`p-4 rounded-2xl rounded-tl-none shadow-sm border text-sm whitespace-pre-wrap ${isSystem ? 'bg-slate-50 border-slate-200 text-slate-600 italic' : 'bg-white border-blue-100 text-slate-700'}`}>
                                {isSystem ? note.note.replace("SYSTEM: ", "") : renderMessageText(note.note)}
                              </div>
                              
                              {/* Read Receipts Mock Visual */}
                              {!isSystem && (
                                <div className="mt-1.5 flex justify-end">
                                  <span className="text-[10px] font-bold text-blue-400 flex items-center gap-0.5"><CheckCircle2 size={10}/> Read by all</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={notesEndRef} />
                  </div>
                  <div className="p-5 bg-white border-t border-slate-200 shrink-0">
                    <form onSubmit={handleSendNote} className="relative">
                      <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Add an internal note or type @ to mention an agent..."
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
                    <p className="text-[10px] text-slate-400 mt-2 font-medium text-center">Press Enter to send, Shift + Enter for new line. Mentioned agents will receive a push notification.</p>
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