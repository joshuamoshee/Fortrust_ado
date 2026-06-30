"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import AssigneePicker from "@/components/AssigneePicker";

import TeamCollabChat from "@/components/TeamCollabChat";
import { 
  Search, Filter, GraduationCap, Building, MapPin, 
  FileText, UserMinus, RefreshCcw, Loader2, Edit2, Save,
  X, CheckCircle2, ShieldAlert, Mail, Phone, BookOpen, 
  Thermometer, BrainCircuit, UploadCloud, Activity, AlertCircle, 
  Eye, Trash2, Plus, MessageSquare, User, Circle,
  ChevronRight, ChevronLeft, CheckCircle, Award, Briefcase, Sparkles, Target, ChevronDown, Archive,
  Download,DollarSign, School
} from "lucide-react";

const DOC_TYPES = [
  "Passport",
  "High School Certificate",
  "Academic Transcript",
  "Language Test",
  "SOP",
  "Profiling Test",
  "Resume / CV",
  "Reference Letter",
  "Portfolio",
  "CSCA Result",
  "Other"
];

// ----------------------------------------------------------------------------
// CONDITIONAL VISIBILITY HELPERS
// ----------------------------------------------------------------------------

// Detect if the program is postgraduate level (Master / PhD / Doctorate / etc.)
// Used to conditionally show Resume/CV section.
function isPostgradProgram(programInterest: string | undefined | null): boolean {
  if (!programInterest) return false;
  const p = programInterest.toUpperCase();
  return (
    p.includes("MASTER") || p.includes("MSC") || p.includes("MS ") || p.includes("M.S") ||
    p.includes("MBA") || p.includes("MA ") || p.includes("M.A") ||
    p.includes("PHD") || p.includes("PH.D") || p.includes("DOCTORATE") || p.includes("DOCTORAL") ||
    p.includes("POSTGRAD") || p.includes("POST-GRAD") || p.includes("GRADUATE PROGRAM") ||
    p.includes("S2") || p.includes("S3") || // Indonesian education levels
    p.includes("PASCASARJANA") // Indonesian "postgraduate"
  );
}

// Detect program level for reference letter hint text
function detectProgramLevel(programInterest: string | undefined | null): "undergrad" | "grad" | "doctorate" {
  if (!programInterest) return "undergrad";
  const p = programInterest.toUpperCase();
  if (p.includes("PHD") || p.includes("PH.D") || p.includes("DOCTORATE") || p.includes("DOCTORAL") || p.includes("S3")) {
    return "doctorate";
  }
  if (isPostgradProgram(programInterest)) {
    return "grad";
  }
  return "undergrad";
}

// Detect if student has China in their country_interest
function hasChinaInterest(countryInterest: string | undefined | null): boolean {
  if (!countryInterest) return false;
  try {
    const parsed = typeof countryInterest === "string" && countryInterest.startsWith("[")
      ? JSON.parse(countryInterest)
      : [countryInterest];
    return Array.isArray(parsed) && parsed.some((c: string) => 
      (c || "").toLowerCase() === "china"
    );
  } catch {
    return (countryInterest || "").toLowerCase().includes("china");
  }
}

// Standard categories shown in the checklist (each can hold multiple files).
type CategoryDef = {
  type: string;
  description: string;
  visible?: (student: any) => boolean;
  dynamicDescription?: (student: any) => string;
};

const STANDARD_CATEGORIES: CategoryDef[] = [
  { 
    type: "Passport", 
    description: "Valid international passport (bio page)" 
  },
  { 
    type: "High School Certificate", 
    description: "High School Certificate, Diploma, or Certificate of Graduation — in original language & translated into English" 
  },
  { 
    type: "Academic Transcript", 
    description: "In original language & translated into English — usually 6+ files across semesters" 
  },
  { 
    type: "Language Test", 
    description: "IELTS / TOEFL / PTE / HSK Certificate" 
  },
  { 
    type: "SOP", 
    description: "Statement of Purpose" 
  },
  { 
    type: "Profiling Test", 
    description: "Profiling test results (HCC or any provider)" 
  },
  { 
    type: "Resume / CV", 
    description: "Curriculum Vitae — for postgraduate applications", 
    visible: (s: any) => isPostgradProgram(s?.program_interest)
  },
  { 
    type: "Reference Letter", 
    description: "Recommendation letters from teachers, professors, or supervisors",
    dynamicDescription: (s: any) => {
      const level = detectProgramLevel(s?.program_interest);
      if (level === "doctorate") {
        return "Doctorate applicants need 2-3 reference letters from professors, thesis advisors, or research supervisors.";
      }
      if (level === "grad") {
        return "Graduate applicants need 2 reference letters — from university professors / academic advisors, OR from a work manager / supervisor.";
      }
      return "Undergraduate applicants need 0-2 reference letters from high school teachers or school counselors.";
    }
  },
  { 
    type: "Portfolio", 
    description: "Portfolios or work samples — if applicable (typically for design, arts, architecture programs)" 
  },
  { 
    type: "CSCA Result", 
    description: "CSCA (Chinese Standardized College Admission) Result — required for China applications",
    visible: (s: any) => hasChinaInterest(s?.country_interest)
  }
];

// Academic fields for the "Field of Interest" selector - 3rd AI variable
const ACADEMIC_FIELDS = [
  "Business & Management",
  "Computer Science & IT",
  "Design & Creative Arts",
  "Economics & Finance",
  "Engineering",
  "Hospitality & Tourism",
  "Marketing & Communication",
  "Medicine & Health Sciences",
  "Sciences (Bio/Chem/Physics)",
  "Other", // Always last
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
  { value: "canada", label: "🇨🇦 Canada" },
  { value: "china", label: "🇨🇳 China" },
  { value: "malaysia", label: "🇲🇾 Malaysia" },
  { value: "new_zealand", label: "🇳🇿 New Zealand" },
  { value: "singapore", label: "🇸🇬 Singapore" },
  { value: "switzerland", label: "🇨🇭 Switzerland" },
  { value: "uk", label: "🇬🇧 United Kingdom" },
  { value: "usa", label: "🇺🇸 United States" },
  { value: "other", label: "🌍 Other" },
];

const BUDGET_CURRENCIES = [
  { code: "USD", symbol: "$", label: "USD - US Dollar" },
  { code: "AUD", symbol: "A$", label: "AUD - Australian Dollar" },
  { code: "GBP", symbol: "£", label: "GBP - British Pound" },
  { code: "EUR", symbol: "€", label: "EUR - Euro" },
  { code: "CAD", symbol: "C$", label: "CAD - Canadian Dollar" },
  { code: "NZD", symbol: "NZ$", label: "NZD - New Zealand Dollar" },
  { code: "SGD", symbol: "S$", label: "SGD - Singapore Dollar" },
  { code: "CHF", symbol: "CHF", label: "CHF - Swiss Franc" },
  { code: "CNY", symbol: "¥", label: "CNY - Chinese Yuan" },
  { code: "MYR", symbol: "RM", label: "MYR - Malaysian Ringgit" },
  { code: "IDR", symbol: "Rp", label: "IDR - Indonesian Rupiah" },
];

// Default currency picked based on the student's country interest
function getDefaultCurrency(countryValue: string): string {
  const map: Record<string, string> = {
    australia: "AUD", uk: "GBP", usa: "USD", canada: "CAD",
    new_zealand: "NZD", singapore: "SGD", switzerland: "CHF",
    china: "CNY", malaysia: "MYR",
  };
  return map[countryValue] || "USD";
}

// Parse "USD 50000" or "50000 USD" or just "50000" from stored budget string
function parseBudget(budgetStr: string): { amount: string; currency: string } {
  if (!budgetStr) return { amount: "", currency: "USD" };
  const trimmed = budgetStr.trim();
  // Try "USD 50000" pattern
  const m1 = trimmed.match(/^([A-Z]{3})\s+(.+)$/);
  if (m1) return { currency: m1[1], amount: m1[2].trim() };
  // Try "50000 USD" pattern
  const m2 = trimmed.match(/^(.+?)\s+([A-Z]{3})$/);
  if (m2) return { currency: m2[2], amount: m2[1].trim() };
  // No currency code found — assume USD
  return { amount: trimmed, currency: "USD" };
}

const MAX_FIELD_INTERESTS = 3;

// Category matchers - used to group existing docs into the right buckets.
const CATEGORY_MATCHERS: Record<string, (t: string, f: string) => boolean> = {
  "Passport": (t, f) => 
    t.includes("PASSPORT") || f.includes("PASSPORT"),
  
  "High School Certificate": (t, f) =>
    t.includes("HIGH SCHOOL CERT") || t.includes("HIGHSCHOOL") || 
    t.includes("HS CERT") || t.includes("DIPLOMA") || t.includes("GRADUATION CERT") ||
    t.includes("IJAZAH") || t.includes("SMA CERT") ||
    f.includes("HIGHSCHOOL") || f.includes("DIPLOMA") || f.includes("IJAZAH"),
  
  "Academic Transcript": (t, f) =>
    // New + legacy matchers
    t.includes("TRANSCRIPT") || t.includes("ACADEMIC TRANSCRIPT") || 
    t.includes("REPORT CARD") || t.includes("REPORT_CARD") || t.includes("RAPOT") ||
    f.includes("TRANSCRIPT") || f.includes("REPORT_CARD") || f.includes("RAPOT"),
  
  "Language Test": (t, f) =>
    t.includes("LANGUAGE TEST") || t.includes("ENGLISH") || 
    t.includes("IELTS") || t.includes("TOEFL") || t.includes("PTE") || t.includes("HSK") ||
    f.includes("LANGUAGE") || f.includes("ENGLISH") || f.includes("IELTS") || 
    f.includes("TOEFL") || f.includes("HSK"),
  
  "SOP": (t, f) =>
    t.includes("SOP") || t.includes("STATEMENT OF PURPOSE") ||
    f.includes("SOP") || f.includes("STATEMENT_OF_PURPOSE"),
  
  "Profiling Test": (t, f) =>
    t.includes("PROFILING") || t.includes("PSYCHOLOGY") || t.includes("PSIKOLOG") || t.includes("HCC") ||
    f.includes("PROFILING") || f.includes("PSYCHOLOGY"),
  
  "Resume / CV": (t, f) =>
    t.includes("RESUME") || t.includes("CV") || t.includes("CURRICULUM VITAE") ||
    f.includes("RESUME") || f.includes("CV_") || f.startsWith("CV") || f.includes("CURRICULUM"),
  
  "Reference Letter": (t, f) =>
    t.includes("REFERENCE") || t.includes("RECOMMENDATION") || t.includes("REFEREE") ||
    f.includes("REFERENCE") || f.includes("RECOMMENDATION") || f.includes("REFEREE"),
  
  "Portfolio": (t, f) =>
    t.includes("PORTFOLIO") || t.includes("WORK SAMPLE") || t.includes("DESIGN SAMPLE") ||
    f.includes("PORTFOLIO") || f.includes("WORK_SAMPLE"),
  
  "CSCA Result": (t, f) =>
    t.includes("CSCA") || t.includes("CHINA STANDARDIZED") || t.includes("HANYU") || t.includes("CHINESE COLLEGE") ||
    f.includes("CSCA") || f.includes("HANYU")
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [agentFilter, setAgentFilter] = useState("ALL");
  const [studentTab, setStudentTab] = useState<"active" | "archived">("active");
  
  // Reassignment & Archiving States
  const [editingAgentForId, setEditingAgentForId] = useState<string | null>(null);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [studentToArchive, setStudentToArchive] = useState<any>(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [archiveOtherText, setArchiveOtherText] = useState("");
  const [isArchiving, setIsArchiving] = useState(false);

  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [dossierTab, setDossierTab] = useState<"profile" | "documents" | "ai" | "notes" | "appform">("profile");
  const [isSavingStudent, setIsSavingStudent] = useState(false);
  
  const [aiReport, setAiReport] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingAppForm, setIsDownloadingAppForm] = useState(false);

  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState("Passport");
  const [loadingDocFilename, setLoadingDocFilename] = useState<string | null>(null);
  const [deletingDocFilename, setDeletingDocFilename] = useState<string | null>(null);

  // Expanded Academic Profile States
  const [fieldInterests, setFieldInterests] = useState<string[]>([]);
  const [careerGoals, setCareerGoals] = useState<string[]>([]);
  const [campusEnv, setCampusEnv] = useState<string>("");
  const [customFieldInterest, setCustomFieldInterest] = useState("");
  const [customCareerGoal, setCustomCareerGoal] = useState("");
  const [customCampusEnv, setCustomCampusEnv] = useState("");
  const [countryInterests, setCountryInterests] = useState<string[]>([]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: "", email: "", phone: "", assignee: "", program_interest: "", lead_source: "", lead_temperature: "Cold Leads", status: "NEW LEAD", budget: ""
  });
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);

  const [notification, setNotification] = useState<{type: 'success'|'error', message: string} | null>(null);

  useEffect(() => { fetchData(); }, []);

  // Auto-open dossier when arriving from Kanban with ?openId=...
  useEffect(() => {
    const openId = searchParams.get("openId");
    if (!openId || allStudents.length === 0) return;
    
    const target = allStudents.find(s => String(s.id) === String(openId));
    if (target) {
      setEditingStudent(target);
      setDossierTab("profile");
      // Clean URL — remove the param so refresh doesn't reopen
      router.replace("/dashboard/students", { scroll: false });
    }
  }, [searchParams, allStudents, router]);

  // Auto-select the Archived tab if URL has ?tab=archived (from the old redirected route)
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "archived") {
      setStudentTab("archived");
    }
  }, [searchParams]);

  // Load field_interests and profile from the student record when dossier opens
  useEffect(() => {
    if (!editingStudent?.id) {
      setAiReport("");
      setFieldInterests([]);
      setCareerGoals([]);
      setCampusEnv("");
      setCountryInterests([]); // <--- CHANGED HERE
      setCustomFieldInterest("");
      setCustomCareerGoal("");
      setCustomCampusEnv("");
      return;
    }
    // Auto-split name into first/family if app form fields are empty (Phase 1a)
    if (editingStudent.name && !editingStudent.first_name && !editingStudent.family_name) {
      const parts = editingStudent.name.trim().split(/\s+/);
      if (parts.length >= 2) {
        const first = parts.slice(0, -1).join(" ");
        const family = parts[parts.length - 1];
        setEditingStudent((prev: any) => prev ? {...prev, first_name: first, family_name: family} : prev);
      } else if (parts.length === 1) {
        setEditingStudent((prev: any) => prev ? {...prev, first_name: parts[0]} : prev);
      }
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
    // Convert career_goal to array (backward compat with old single-value records)
    try {
      const cg = editingStudent.career_goal;
      if (!cg) {
        setCareerGoals([]);
      } else if (typeof cg === "string" && cg.startsWith("[")) {
        const parsed = JSON.parse(cg);
        setCareerGoals(Array.isArray(parsed) ? parsed : []);
      } else {
        setCareerGoals([cg]);  // legacy single string
      }
    } catch {
      setCareerGoals(editingStudent.career_goal ? [editingStudent.career_goal] : []);
    }
    setCampusEnv(editingStudent.campus_env || "");
    try {
      const ci = editingStudent.country_interest;
      if (!ci) {
        setCountryInterests([]);
      } else if (typeof ci === "string" && ci.startsWith("[")) {
        setCountryInterests(JSON.parse(ci));
      } else {
        setCountryInterests([ci]); // For older records with just one string
      }
    } catch {
      setCountryInterests([]);
    }

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
        body: JSON.stringify({ 
          ...newStudent, 
          assignee: newStudent.assignee ? newStudent.assignee.split("||")[0] : "Unassigned",
          assignees: newStudent.assignee ? newStudent.assignee.split("||").filter(Boolean) : []
          })
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

  const handleInlineReassign = async (studentId: string, newAssignees: string[]) => {
    try {
      const token = localStorage.getItem("fortrust_token");
      // Use the /students endpoint which now handles `assignees` array
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/students/${studentId}`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ assignees: newAssignees }) 
      });
      if (res.ok) {
        const primary = newAssignees[0] || "Unassigned";
        const others = newAssignees.length - 1;
        const message = newAssignees.length === 0
          ? "Student unassigned."
          : others > 0
          ? `${primary} (+${others} more) now assigned.`
          : `${primary} now assigned.`;
        setNotification({type: 'success', message});
        fetchData(); 
      } else {
        setNotification({type: 'error', message: "Failed to update assignees."});
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

      const finalReason = archiveReason === "Other" && archiveOtherText.trim() 
        ? `Other: ${archiveOtherText.trim()}` 
        : archiveReason;

      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline/${studentToArchive.id}/notes`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ note: `SYSTEM: Student was archived. Reason: ${finalReason}`, author: authorName })
      });

      // Also save the full reason text into archive_reason column
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline/${studentToArchive.id}`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ archive_reason: finalReason })
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
    let finalCareerGoals = [...careerGoals];
    if (finalCareerGoals.includes("Other") && customCareerGoal.trim()) {
      finalCareerGoals = finalCareerGoals.map(g => g === "Other" ? customCareerGoal.trim() : g);
    }
    const finalCareer = JSON.stringify(finalCareerGoals);  // store as JSON string
    const finalCampus = campusEnv === "Other" ? customCampusEnv : campusEnv;

    try {
      const token = localStorage.getItem("fortrust_token");
      const toArray = (v: any) => Array.isArray(v) ? v : [];
      const safeProgs = toArray(editingStudent.program_preferences);
      const safeStudies = toArray(editingStudent.previous_studies);
      const safeWorks = toArray(editingStudent.work_experiences);
      const safeTests = toArray(editingStudent.language_tests);
      const safeRefs = toArray(editingStudent.referees);
      
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
          country_interest: JSON.stringify(countryInterests),
          high_school: editingStudent.high_school || "",
          counsellor_notes: editingStudent.counsellor_notes || "",
          emergency_contact_parent: editingStudent.emergency_contact_parent || "",
          // === APPLICATION FORM FIELDS (Phase 1a) ===
          title: editingStudent.title || "",
          gender: editingStudent.gender || "",
          date_of_birth: editingStudent.date_of_birth || null,
          first_name: editingStudent.first_name || "",
          family_name: editingStudent.family_name || "",
          nationality: editingStudent.nationality || "",
          country_of_residence: editingStudent.country_of_residence || "",
          passport_no: editingStudent.passport_no || "",
          home_address: editingStudent.home_address || "",
          postcode: editingStudent.postcode || "",
          tel_1: editingStudent.tel_1 || "",
          tel_2: editingStudent.tel_2 || "",
          fax: editingStudent.fax || "",
          entry_month_year: editingStudent.entry_month_year || "",
          entry_level: editingStudent.entry_level || "",
          program_preferences: safeProgs,
          previous_studies: safeStudies,
          work_experiences: safeWorks,
          language_tests: safeTests,
          referees: safeRefs
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

  const handleDownloadApplicationForm = async () => {
    if (!editingStudent) return;
    setIsDownloadingAppForm(true);
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/students/${editingStudent.id}/application-form-pdf`,
        { headers: { "Authorization": `Bearer ${token}` } }
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setNotification({ type: 'error', message: errData.detail || "PDF generation failed." });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeName = (editingStudent.name || 'student').replace(/[^a-zA-Z0-9]/g, '_');
      link.download = `Fortrust_Application_${safeName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setNotification({ type: 'success', message: "Application Form PDF downloaded successfully." });
    } catch (e) {
      setNotification({ type: 'error', message: "Network error while generating PDF." });
    } finally {
      setIsDownloadingAppForm(false);
      setTimeout(() => setNotification(null), 4000);
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
  const handleDownloadSopTemplate = async () => {
  try {
    const token = localStorage.getItem("fortrust_token");
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/templates/sop`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      if (res.status === 404) {
        setNotification({type: 'error', message: "SOP template not uploaded yet. Ask Master Admin to upload it via Settings → Templates."});
      } else {
        setNotification({type: 'error', message: errData.detail || "Could not download template."});
      }
      setTimeout(() => setNotification(null), 5000);
      return;
    }
    
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    // Detect extension from response headers
    const cd = res.headers.get('Content-Disposition') || '';
    const match = cd.match(/filename="?([^";]+)"?/);
    link.download = match ? match[1] : 'Fortrust_SOP_Template.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setNotification({type: 'success', message: "SOP template downloaded."});
    setTimeout(() => setNotification(null), 3000);
  } catch (e) {
    setNotification({type: 'error', message: "Network error while downloading template."});
    setTimeout(() => setNotification(null), 4000);
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

  const filteredStudents = allStudents.filter(student => {
    const matchesSearch = (student.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (student.email || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || (student.status || "NEW LEAD").toUpperCase() === statusFilter;
    const matchesAgent = agentFilter === "ALL" || 
                        (agentFilter === "UNASSIGNED" && (!student.assignee || student.assignee === "Unassigned")) ||
                        student.assignee === agentFilter;
    // Tab-based filtering: active tab shows non-archived, archived tab shows only archived
    const isArchived = (student.status || "").toUpperCase() === "ARCHIVED";
    const matchesTab = studentTab === "archived" ? isArchived : !isArchived;
    return matchesSearch && matchesStatus && matchesAgent && matchesTab;
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
  // Only count categories that are visible for THIS student (so denominator reflects what's actually shown)
  const visibleCategories = editingStudent 
    ? STANDARD_CATEGORIES.filter(c => !c.visible || c.visible(editingStudent))
    : STANDARD_CATEGORIES;
  const categoriesWithDocs = visibleCategories.filter(c => getDocsInCategory(c.type, studentDocs).length > 0).length;
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
            Student
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

      {/* TABS: Active vs Archived */}
      {(() => {
        const archivedCount = allStudents.filter(s => (s.status || "").toUpperCase() === "ARCHIVED").length;
        const activeCount = allStudents.filter(s => (s.status || "").toUpperCase() !== "ARCHIVED").length;
        
        return (
          <div className="flex items-center justify-between mb-4">
            <div className="flex bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
              <button
                onClick={() => setStudentTab("active")}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                  studentTab === "active" 
                    ? 'bg-[#282860] text-white shadow-md' 
                    : 'text-slate-500 hover:text-[#282860] hover:bg-slate-50'
                }`}
              >
                <GraduationCap size={16}/>
                Active Students
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  studentTab === "active" ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {activeCount}
                </span>
              </button>
              <button
                onClick={() => setStudentTab("archived")}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                  studentTab === "archived" 
                    ? 'bg-red-600 text-white shadow-md' 
                    : 'text-slate-500 hover:text-red-600 hover:bg-red-50'
                }`}
              >
                <Archive size={16}/>
                Archived
                {archivedCount > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    studentTab === "archived" ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'
                  }`}>
                    {archivedCount}
                  </span>
                )}
              </button>
            </div>
            
            {/* NEW: cross-link to deep analytics — only on Archived tab */}
            {studentTab === "archived" && archivedCount > 0 && (
              <button
                onClick={() => router.push("/dashboard/archived-students")}
                className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 active:scale-95 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md flex items-center gap-2"
                title="Deep-dive analytics: lost revenue, trends, by country/agent, high-value losses"
              >
                <Activity size={16}/> View Lost Students Insights →
              </button>
            )}
          </div>
        );
      })()}
      {/* INLINE ANALYTICS — only on Archived tab */}
      {studentTab === "archived" && (() => {
        // Compute analytics from already-loaded student data — no extra API call
        const archived = allStudents.filter(s => (s.status || "").toUpperCase() === "ARCHIVED");
        
        if (archived.length === 0) return null;
        
        // Group by archive reason
        const reasonCounts: Record<string, number> = {};
        archived.forEach(s => {
          let reason = s.archive_reason || "No reason recorded";
          // Normalize "Other: xxx" into just "Other (with notes)" for counting
          if (reason.startsWith("Other:")) reason = "Other (with notes)";
          reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
        });
        const topReasons = Object.entries(reasonCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);
        const topReasonLabel = topReasons[0]?.[0] || "—";
        
        // This month
        const now = new Date();
        const thisMonth = archived.filter(s => {
          try {
            const d = new Date(s.updated_at || s.created_at);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          } catch { return false; }
        }).length;
        
        // Last 30 days
        const last30 = archived.filter(s => {
          try {
            const d = new Date(s.updated_at || s.created_at);
            return (now.getTime() - d.getTime()) < 30 * 24 * 60 * 60 * 1000;
          } catch { return false; }
        }).length;
        
        // Conversion stages they archived from — based on prior status if available, else "Unknown"
        // Note: we don't currently track prior_status. Future enhancement.
        
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            
            {/* Stat cards column */}
            <div className="grid grid-cols-2 gap-3 lg:col-span-1">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[9px] font-black uppercase tracking-widest text-red-500 mb-1">Total Archived</p>
                <p className="text-2xl font-black text-[#282860]">{archived.length}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[9px] font-black uppercase tracking-widest text-amber-500 mb-1">This Month</p>
                <p className="text-2xl font-black text-[#282860]">{thisMonth}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[9px] font-black uppercase tracking-widest text-blue-500 mb-1">Last 30 Days</p>
                <p className="text-2xl font-black text-[#282860]">{last30}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[9px] font-black uppercase tracking-widest text-purple-500 mb-1">Top Reason</p>
                <p className="text-sm font-black text-[#282860] leading-tight mt-1" title={topReasonLabel}>
                  {topReasonLabel.length > 22 ? topReasonLabel.substring(0, 22) + "…" : topReasonLabel}
                </p>
              </div>
            </div>
            
            {/* Reason breakdown chart */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black text-[#282860] uppercase tracking-widest flex items-center gap-2">
                  <Activity size={14} className="text-red-500"/> Archive Reasons Breakdown
                </h3>
                <span className="text-[10px] font-bold text-slate-400">{archived.length} total</span>
              </div>
              {topReasons.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No data yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {topReasons.map(([reason, count]) => {
                    const pct = (count / archived.length) * 100;
                    return (
                      <div key={reason}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-slate-700 truncate max-w-[60%]" title={reason}>{reason}</span>
                          <span className="text-[10px] font-black text-slate-500">
                            {count} · {pct.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-red-400 to-rose-500 rounded-full transition-all"
                            style={{width: `${pct}%`}}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
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
          </div>
        </div>

        <div className="flex-1 overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-[#f8fafc] border-b border-slate-200 text-[10px] font-black text-slate-400 tracking-widest uppercase sticky top-0 z-10">
              <tr>
                <th className="px-6 py-5">Student Identity</th>
                <th className="px-6 py-5">{studentTab === "archived" ? "Status & Date" : "Pipeline Stage"}</th>
                {studentTab === "archived" 
                  ? <th className="px-6 py-5">Archive Reason</th>
                  : <th className="px-6 py-5">Budget</th>
                }
                <th className="px-6 py-5">Assigned Agent</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="p-16 text-center"><Loader2 size={32} className="animate-spin text-[#BAD133] mx-auto mb-4"/> Syncing Global Database...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={5} className="p-16 text-center text-slate-400 font-medium">
                  {studentTab === "archived" 
                    ? "No archived students. When you archive a student, they'll appear here." 
                    : "No students match your criteria."}
                </td></tr>
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
                    {studentTab === "archived" ? (
                      <td className="px-6 py-4">
                        {student.archive_reason ? (
                          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs font-bold max-w-xs">
                            {student.archive_reason}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">No reason recorded</span>
                        )}
                      </td>
                    ) : (
                      <td className="px-6 py-4 font-bold text-slate-600">
                        {student.budget || <span className="text-slate-400 italic font-normal">TBD</span>}
                      </td>
                    )}
                    <td className="px-6 py-4 min-w-[280px]" onClick={(e) => e.stopPropagation()}>
                      <AssigneePicker
                        agents={agents}
                        value={(() => {
                          // Normalize: prefer `assignees` array, fall back to single `assignee`
                          let arr = student.assignees;
                          if (typeof arr === "string") {
                            try { arr = JSON.parse(arr); } catch { arr = []; }
                          }
                          if (Array.isArray(arr) && arr.length > 0) return arr.filter(Boolean);
                          if (student.assignee && student.assignee !== "Unassigned") return [student.assignee];
                          return [];
                        })()}
                        onChange={(newAssignees) => handleInlineReassign(student.id, newAssignees)}
                        placeholder="Unassigned"
                        compact
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => { setEditingStudent(student); setDossierTab("profile"); }} className="p-2 bg-white text-slate-400 hover:text-[#282860] hover:bg-slate-100 border border-slate-200 rounded-lg shadow-sm transition-colors" title="View Student Dossier">
                          <FileText size={16} />
                        </button>
                        {studentTab === "archived" ? (
                          <button 
                            onClick={async () => {
                              if (!window.confirm(`Restore ${student.name} to active pipeline?`)) return;
                              try {
                                const token = localStorage.getItem("fortrust_token");
                                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline/${student.id}`, {
                                  method: "PUT",
                                  headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                                  body: JSON.stringify({ status: "NEW LEAD", archive_reason: "" })
                                });
                                if (res.ok) {
                                  // Log system note
                                  let authorName = "Master Admin";
                                  try { if (token) { const payload = JSON.parse(atob(token.split('.')[1])); authorName = payload.name || "Master Admin"; } } catch (e) {}
                                  await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline/${student.id}/notes`, {
                                    method: "POST",
                                    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                                    body: JSON.stringify({ note: `SYSTEM: ${authorName} restored student from archive.`, author: "System AI" })
                                  });
                                  setNotification({type: 'success', message: `${student.name} restored.`});
                                  fetchData();
                                } else {
                                  setNotification({type: 'error', message: "Failed to restore."});
                                }
                              } catch (e) {
                                setNotification({type: 'error', message: "Network error."});
                              }
                              setTimeout(() => setNotification(null), 3000);
                            }}
                            className="px-3 py-2 bg-white text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-200 hover:border-emerald-600 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5">
                            <RefreshCcw size={14}/> Restore
                          </button>
                        ) : (
                          <button onClick={() => { setStudentToArchive(student); setIsArchiveModalOpen(true); }}
                            className="px-3 py-2 bg-white text-red-600 hover:bg-red-600 hover:text-white border border-red-200 hover:border-red-600 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5">
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
                  <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Assign To Agent(s)</label>
                    <AssigneePicker
                        agents={agents}
                        value={newStudent.assignee ? newStudent.assignee.split("||").filter(Boolean) : []}
                        onChange={(newAssignees) => setNewStudent({...newStudent, assignee: newAssignees.join("||")})}
                        placeholder="Leave empty for Open Pool"
                      />
                      <p className="text-[10px] text-slate-400 mt-1.5">First selected agent becomes the primary. Add more for shared accounts.</p>
                </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block flex items-center gap-1"><DollarSign size={12}/> Budget per Year</label>
                      {(() => {
                        const parsed = parseBudget(newStudent.budget || "");
                        return (
                          <div className="flex gap-2">
                            <select 
                              value={parsed.currency} 
                              onChange={e => setNewStudent({...newStudent, budget: `${e.target.value} ${parsed.amount}`.trim()})}
                              className="px-3 py-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] cursor-pointer w-28">
                              {BUDGET_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                            </select>
                            <input 
                              type="text" 
                              placeholder="e.g. 50,000" 
                              className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" 
                              value={parsed.amount} 
                              onChange={e => setNewStudent({...newStudent, budget: `${parsed.currency} ${e.target.value}`.trim()})} 
                            />
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Lead Temperature</label>
                      <select className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] cursor-pointer" value={newStudent.lead_temperature} onChange={e => setNewStudent({...newStudent, lead_temperature: e.target.value})}>
                        <option value="Hot Leads">Hot Leads</option>
                        <option value="Warm Leads">Warm Leads</option>
                        <option value="Cold Leads">Cold Leads</option>
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
              <button onClick={() => { setIsArchiveModalOpen(false); setArchiveReason(""); setArchiveOtherText(""); }} 
                className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
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
                <select value={archiveReason} onChange={(e) => { setArchiveReason(e.target.value); if (e.target.value !== "Other") setArchiveOtherText(""); }}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-[#282860] outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20 bg-white cursor-pointer transition-all shadow-sm">
                <option value="" disabled>-- Select a Reason --</option>
                <option value="Apply through other agent">Apply through other agent</option>
                <option value="Financial Issues">Financial Issues</option>
                <option value="Changed Mind / Not Proceeding">Changed Mind / Not Proceeding</option>
                <option value="Unresponsive">Unresponsive</option>
                <option value="Other">Other</option>
              </select>

              {archiveReason === "Other" && (
                <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                    Please specify <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={archiveOtherText}
                    onChange={(e) => setArchiveOtherText(e.target.value)}
                    placeholder="Describe why this student is being archived..."
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20 bg-white transition-all shadow-sm resize-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Required when "Other" is selected. This helps Master Admin understand patterns of student loss.</p>
                </div>
              )}
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button onClick={() => setIsArchiveModalOpen(false)} className="px-5 py-3 text-slate-500 hover:text-slate-800 font-bold text-sm transition-colors">Cancel</button>
                <button disabled={!archiveReason || isArchiving || (archiveReason === "Other" && !archiveOtherText.trim())} onClick={handleArchiveSubmit}
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
              <button onClick={() => setDossierTab('appform')} className={`px-4 py-4 text-sm font-bold tracking-wider whitespace-nowrap transition-colors flex items-center gap-2 ${dossierTab === 'appform' ? 'border-b-2 border-purple-600 text-purple-700 bg-white' : 'text-slate-400 hover:text-purple-600'}`}>
                <FileText size={16} /> Application Form
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
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black text-slate-700">Father's Information</p>
                          <label className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg border transition-all ${
                            editingStudent.emergency_contact_parent === "father"
                              ? 'bg-red-50 border-red-300 text-red-700'
                              : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                          }`}>
                            <input
                              type="checkbox"
                              checked={editingStudent.emergency_contact_parent === "father"}
                              onChange={(e) => setEditingStudent({
                                ...editingStudent,
                                emergency_contact_parent: e.target.checked ? "father" : ""
                              })}
                              className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                            />
                            <ShieldAlert size={12}/>
                            <span className="text-[10px] font-black uppercase tracking-widest">Emergency Contact</span>
                          </label>
                        </div>
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
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black text-slate-700">Mother's Information</p>
                          <label className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg border transition-all ${
                            editingStudent.emergency_contact_parent === "mother"
                              ? 'bg-red-50 border-red-300 text-red-700'
                              : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                          }`}>
                            <input
                              type="checkbox"
                              checked={editingStudent.emergency_contact_parent === "mother"}
                              onChange={(e) => setEditingStudent({
                                ...editingStudent,
                                emergency_contact_parent: e.target.checked ? "mother" : ""
                              })}
                              className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                            />
                            <ShieldAlert size={12}/>
                            <span className="text-[10px] font-black uppercase tracking-widest">Emergency Contact</span>
                          </label>
                        </div>
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
                    {/* end of PARENTS SECTION */}

                    {/* PIPELINE DATA */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                      <h4 className="text-xs font-black text-[#282860] uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-3"><BookOpen size={16} className="text-emerald-500"/> Pipeline Data</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Program Interest</label>
                          <input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" value={editingStudent.program_interest || ""} onChange={e => setEditingStudent({...editingStudent, program_interest: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block flex items-center gap-1"><DollarSign size={12}/> Budget per Year</label>
                          {(() => {
                            const parsed = parseBudget(editingStudent.budget || "");
                            return (
                              <div className="flex gap-2">
                                <select 
                                  value={parsed.currency} 
                                  onChange={e => setEditingStudent({...editingStudent, budget: `${e.target.value} ${parsed.amount}`.trim()})}
                                  className="px-3 py-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] cursor-pointer w-28">
                                  {BUDGET_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                                </select>
                                <input 
                                  type="text" 
                                  placeholder="e.g. 50,000 or 30,000-50,000"
                                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" 
                                  value={parsed.amount} 
                                  onChange={e => setEditingStudent({...editingStudent, budget: `${parsed.currency} ${e.target.value}`.trim()})} 
                                />
                              </div>
                            );
                          })()}
                          <p className="text-[10px] text-slate-400 mt-1.5">Used by AI to recommend universities within range.</p>
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

                      {/* HIGH SCHOOL / EDUCATION BACKGROUND */}
                      <div>
                        <div className="border-b border-slate-100 pb-3 mb-4">
                          <h4 className="text-xs font-black text-[#282860] uppercase tracking-widest flex items-center gap-2">
                            <School size={16} className="text-indigo-500"/> Education Background
                          </h4>
                          <p className="text-xs text-slate-500 mt-1.5">Track which schools our students come from — helps marketing target high-yield institutions.</p>
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">High School Name</label>
                          <input 
                            type="text" 
                            placeholder="e.g. SMAK Penabur Bintaro Jaya, SMA Pelita Harapan, etc."
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all" 
                            value={editingStudent.high_school || ""} 
                            onChange={e => setEditingStudent({...editingStudent, high_school: e.target.value})} 
                          />
                          <p className="text-[10px] text-slate-400 mt-1.5">💡 Consistent naming helps build school analytics. Try to match common variations.</p>
                        </div>
                      </div>
                      
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
                            const isSelected = fieldInterests.includes(field);
                            const isMaxed = fieldInterests.length >= MAX_FIELD_INTERESTS && !isSelected;
                            return (
                              <button key={field} type="button" disabled={isMaxed && field !== "Other"}
                                onClick={() => {
                                  if (isSelected) setFieldInterests(prev => prev.filter(f => f !== field));
                                  else if (fieldInterests.length < MAX_FIELD_INTERESTS) setFieldInterests(prev => [...prev, field]);
                                }}
                                className={`p-3 rounded-xl text-xs font-bold transition-all border text-left ${
                                  isSelected ? 'bg-emerald-500 text-white border-emerald-600 shadow-md' : isMaxed ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50'
                                }`}>
                                <span className="leading-tight">{field}</span>
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
                        <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-black text-[#282860] uppercase tracking-widest">Primary Post-Graduation Career Goal</h4>
                            <p className="text-xs text-slate-500 mt-1.5">Select up to <strong className="text-[#282860]">2 career goals</strong>.</p>
                          </div>
                          <span className={`text-xs font-black px-3 py-1.5 rounded-lg shrink-0 ${
                            careerGoals.length === 0 
                              ? 'bg-slate-100 text-slate-400' 
                              : careerGoals.length === 2 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {careerGoals.length} / 2 selected
                          </span>
                        </div>
                        
                        {/* Selected chips preview */}
                        {careerGoals.length > 0 && (
                          <div className="mb-3 flex flex-wrap gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 self-center">Selected:</span>
                            {careerGoals.map(g => (
                              <span key={`chip-${g}`} className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                                {g}
                                <button 
                                  type="button"
                                  onClick={() => setCareerGoals(prev => prev.filter(item => item !== g))}
                                  className="hover:bg-emerald-700 rounded-full p-0.5 transition-colors"
                                >
                                  <X size={10}/>
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex flex-wrap gap-2">
                          {CAREER_GOALS.map(goal => {
                            const isSelected = careerGoals.includes(goal);
                            const isMaxed = careerGoals.length >= 2 && !isSelected;
                            return (
                              <button key={goal} type="button" disabled={isMaxed && goal !== "Other"}
                                onClick={() => {
                                  if (isSelected) {
                                    setCareerGoals(prev => prev.filter(g => g !== goal));
                                  } else if (careerGoals.length < 2) {
                                    setCareerGoals(prev => [...prev, goal]);
                                  }
                                }}
                                className={`px-4 py-2.5 rounded-xl text-xs font-bold border-2 transition-all flex items-center gap-1.5 ${
                                  isSelected 
                                    ? 'bg-[#282860] text-white border-[#BAD133] shadow-md ring-2 ring-[#BAD133]/30' 
                                    : isMaxed 
                                    ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed' 
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-[#282860] active:scale-95'
                                }`}>
                                {isSelected && <CheckCircle2 size={12} className="text-[#BAD133]"/>}
                                {goal}
                              </button>
                            );
                          })}
                        </div>
                        {careerGoals.includes("Other") && (
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
                        <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-black text-[#282860] uppercase tracking-widest flex items-center gap-2">
                              <MapPin size={16} className="text-rose-500"/> Preferred Study Destination
                            </h4>
                            <p className="text-xs text-slate-500 mt-1.5">Select up to <strong className="text-[#282860]">2 countries</strong>. Used by AI for matching.</p>
                          </div>
                          <span className={`text-xs font-black px-3 py-1.5 rounded-lg shrink-0 ${
                            countryInterests.length === 0 
                              ? 'bg-slate-100 text-slate-400' 
                              : countryInterests.length === 2 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {countryInterests.length} / 2 selected
                          </span>
                        </div>
                        
                        {/* Selected countries preview */}
                        {countryInterests.length > 0 && (
                          <div className="mb-3 flex flex-wrap gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl">
                            <span className="text-[10px] font-black uppercase tracking-widest text-rose-700 self-center">Selected:</span>
                            {countryInterests.map(cv => {
                              const country = FORTRUST_COUNTRIES.find(c => c.value === cv);
                              return (
                                <span key={`chip-${cv}`} className="bg-rose-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                                  {country?.label || cv}
                                  <button 
                                    type="button"
                                    onClick={() => setCountryInterests(prev => prev.filter(c => c !== cv))}
                                    className="hover:bg-rose-700 rounded-full p-0.5 transition-colors"
                                  >
                                    <X size={10}/>
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {FORTRUST_COUNTRIES.map(country => {
                            const isSelected = countryInterests.includes(country.value);
                            const isMaxed = countryInterests.length >= 2 && !isSelected;
                            
                            return (
                              <button
                                key={country.value}
                                type="button"
                                disabled={isMaxed}
                                onClick={() => {
                                  if (isSelected) {
                                    setCountryInterests(prev => prev.filter(c => c !== country.value));
                                  } else if (countryInterests.length < 2) {
                                    setCountryInterests(prev => [...prev, country.value]);
                                  }
                                }}
                                className={`px-4 py-2.5 rounded-xl text-xs font-bold border-2 transition-all flex items-center gap-1.5 text-left ${
                                  isSelected
                                    ? 'bg-[#BAD133] text-[#1b1b42] border-[#1b1b42] shadow-md ring-2 ring-[#1b1b42]/20'
                                    : isMaxed 
                                    ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-rose-300 active:scale-95'
                                }`}>
                                {isSelected && <CheckCircle2 size={12} className="text-[#1b1b42]"/>}
                                {country.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      

                    {/* COUNSELLOR NOTES */}
                      <div>
                        <div className="border-b border-slate-100 pb-3 mb-4">
                          <h4 className="text-xs font-black text-[#282860] uppercase tracking-widest flex items-center gap-2">
                            <MessageSquare size={16} className="text-amber-500"/> Counsellor Notes
                          </h4>
                          <p className="text-xs text-slate-500 mt-1.5">Private notes from the counsellor — context, observations, special considerations.</p>
                        </div>
                        <textarea 
                          rows={4}
                          placeholder="e.g. Strong interest in CS but mother wants Business. Family budget tight, look for scholarships. Has anxiety around interviews..."
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all resize-none"
                          value={editingStudent.counsellor_notes || ""}
                          onChange={e => setEditingStudent({...editingStudent, counsellor_notes: e.target.value})}
                        />
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
                      <span><strong className="text-[#282860]">{totalDocCount}</strong> file{totalDocCount === 1 ? '' : 's'} - <strong className="text-[#282860]">{categoriesWithDocs}</strong>/{visibleCategories.length} categories</span>
                    </div>
                  </div>

                  {/* CATEGORY CARDS - each holds 0..N files */}
                  {/* CATEGORY CARDS - each holds 0..N files */}
                  <div className="space-y-3">
                    {STANDARD_CATEGORIES.filter(cat => !cat.visible || cat.visible(editingStudent)).map((cat) => {
                      const filesInCat = getDocsInCategory(cat.type, studentDocs);
                      const count = filesInCat.length;
                      const isEmpty = count === 0;
                      const description = cat.dynamicDescription 
                        ? cat.dynamicDescription(editingStudent) 
                        : cat.description;

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
                                <p className="text-xs text-slate-500 mt-0.5">{description}</p>
                                {cat.type === "SOP" && (
                                  <button 
                                    type="button"
                                    onClick={handleDownloadSopTemplate} 
                                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 mt-1 flex items-center gap-1 transition-colors hover:underline"
                                  >
                                    <Download size={10}/> Download SOP Template
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

              {/* TEAM COLLAB TAB (WhatsApp-style real-time chat) */}
              {dossierTab === 'notes' && editingStudent && (() => {
                // Get current user info from JWT token
                let currentUserName = "Master Admin";
                let currentUserRole = "MASTER_ADMIN";
                try {
                  const token = localStorage.getItem("fortrust_token");
                  if (token) {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    currentUserName = payload.name || "Master Admin";
                    currentUserRole = payload.role || "";
                  }
                } catch (e) {}

                // Build the list of who's in the conversation (assignees array, with legacy fallback)
                let studentAssignees: string[] = [];
                try {
                  const raw = editingStudent.assignees;
                  if (Array.isArray(raw)) {
                    studentAssignees = raw.filter(Boolean);
                  } else if (typeof raw === "string" && raw.startsWith("[")) {
                    const parsed = JSON.parse(raw);
                    studentAssignees = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
                  }
                } catch {
                  studentAssignees = [];
                }
                // Fall back to legacy single assignee if the array is empty
                if (studentAssignees.length === 0 && editingStudent.assignee && editingStudent.assignee !== "Unassigned") {
                  studentAssignees = [editingStudent.assignee];
                }

                return (
                  <TeamCollabChat
                    studentId={editingStudent.id}
                    currentUserName={currentUserName}
                    currentUserRole={currentUserRole}
                    studentAssignees={studentAssignees}
                    apiUrl={process.env.NEXT_PUBLIC_API_URL || ""}
                    token={localStorage.getItem("fortrust_token") || ""}
                    pollInterval={3000}
                  />
                );
              })()}
              {/* APPLICATION FORM TAB (Phase 1a) */}
              {dossierTab === 'appform' && (
                <div className="p-6 space-y-6 animate-in fade-in bg-slate-50/30">
                  
                  {/* Header banner */}
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-5">
                    <div className="flex items-start gap-3">
                      <div className="bg-purple-100 p-2 rounded-lg">
                        <FileText size={20} className="text-purple-600"/>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-black text-purple-900">Fortrust Application Form Data</h3>
                        <p className="text-xs text-purple-700 mt-1">Fill in these fields to generate the official Fortrust Application Form PDF for the student to sign. All fields can be edited later.</p>
                        <p className="text-[10px] text-purple-600 mt-2 font-bold">📋 Coming next: One-click PDF generation from this data.</p>
                      </div>
                    </div>
                  </div>

                  <form id="edit-student-form-appform" onSubmit={handleEditStudent} className="space-y-6">

                    {/* SECTION 1: PERSONAL DETAILS */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                      <h4 className="text-xs font-black text-[#282860] uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-3">
                        <User size={16} className="text-blue-500"/> Personal Details
                      </h4>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Title</label>
                          <select className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-purple-400 cursor-pointer" value={editingStudent.title || ""} onChange={e => setEditingStudent({...editingStudent, title: e.target.value})}>
                            <option value="">--</option>
                            <option value="Mr">Mr</option>
                            <option value="Mrs">Mrs</option>
                            <option value="Ms">Ms</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Gender</label>
                          <select className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-purple-400 cursor-pointer" value={editingStudent.gender || ""} onChange={e => setEditingStudent({...editingStudent, gender: e.target.value})}>
                            <option value="">--</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Date of Birth</label>
                          <input type="date" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-purple-400" value={editingStudent.date_of_birth || ""} onChange={e => setEditingStudent({...editingStudent, date_of_birth: e.target.value})}/>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">First Name (Given Name)</label>
                          <input type="text" placeholder="e.g. Rafael Benjamin" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-purple-400" value={editingStudent.first_name || ""} onChange={e => setEditingStudent({...editingStudent, first_name: e.target.value})}/>
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Family Name (Surname)</label>
                          <input type="text" placeholder="e.g. Sutanto" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-purple-400" value={editingStudent.family_name || ""} onChange={e => setEditingStudent({...editingStudent, family_name: e.target.value})}/>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Nationality</label>
                          <input type="text" placeholder="e.g. Indonesian" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-purple-400" value={editingStudent.nationality || ""} onChange={e => setEditingStudent({...editingStudent, nationality: e.target.value})}/>
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Country of Residence</label>
                          <input type="text" placeholder="e.g. Indonesia" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-purple-400" value={editingStudent.country_of_residence || ""} onChange={e => setEditingStudent({...editingStudent, country_of_residence: e.target.value})}/>
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Passport Number</label>
                          <input type="text" placeholder="e.g. A12345678" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-purple-400 font-mono" value={editingStudent.passport_no || ""} onChange={e => setEditingStudent({...editingStudent, passport_no: e.target.value})}/>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Permanent Home Address</label>
                        <textarea rows={2} placeholder="Full street address..." className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-purple-400 resize-none" value={editingStudent.home_address || ""} onChange={e => setEditingStudent({...editingStudent, home_address: e.target.value})}/>
                      </div>

                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Postcode</label>
                          <input type="text" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-purple-400" value={editingStudent.postcode || ""} onChange={e => setEditingStudent({...editingStudent, postcode: e.target.value})}/>
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Tel 1</label>
                          <input type="text" placeholder="Home phone" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-purple-400" value={editingStudent.tel_1 || ""} onChange={e => setEditingStudent({...editingStudent, tel_1: e.target.value})}/>
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Tel 2</label>
                          <input type="text" placeholder="Alt phone" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-purple-400" value={editingStudent.tel_2 || ""} onChange={e => setEditingStudent({...editingStudent, tel_2: e.target.value})}/>
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Fax</label>
                          <input type="text" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-purple-400" value={editingStudent.fax || ""} onChange={e => setEditingStudent({...editingStudent, fax: e.target.value})}/>
                        </div>
                      </div>
                      
                      <p className="text-[10px] text-slate-400 italic">📞 HP (mobile) and Email are taken from the main Profile tab.</p>
                    </div>

                    {/* SECTION 2: PROGRAM PREFERENCES */}
                    {(() => {
                      const prefs = editingStudent.program_preferences || [];
                      const addPref = () => setEditingStudent({...editingStudent, program_preferences: [...prefs, {institution: "", course: ""}]});
                      const removePref = (idx: number) => setEditingStudent({...editingStudent, program_preferences: prefs.filter((_: any, i: number) => i !== idx)});
                      const updatePref = (idx: number, field: string, value: string) => {
                        const next = [...prefs];
                        next[idx] = {...next[idx], [field]: value};
                        setEditingStudent({...editingStudent, program_preferences: next});
                      };
                      return (
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                          <h4 className="text-xs font-black text-[#282860] uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-3">
                            <Target size={16} className="text-emerald-500"/> Program Preferences
                            <span className="ml-auto text-[10px] text-slate-400 font-normal normal-case tracking-normal">Up to 5 choices in order</span>
                          </h4>
                          
                          {prefs.length === 0 ? (
                            <div className="text-center py-6 text-slate-400 text-sm italic">No program preferences yet.</div>
                          ) : (
                            <div className="space-y-3">
                              {prefs.map((p: any, idx: number) => (
                                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                                  <span className="col-span-1 text-xs font-black text-slate-500 text-center">{idx + 1}.</span>
                                  <input type="text" placeholder="Institution name" className="col-span-5 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:border-emerald-400" value={p.institution || ""} onChange={e => updatePref(idx, "institution", e.target.value)}/>
                                  <input type="text" placeholder="Course / Program" className="col-span-5 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:border-emerald-400" value={p.course || ""} onChange={e => updatePref(idx, "course", e.target.value)}/>
                                  <button type="button" onClick={() => removePref(idx)} className="col-span-1 p-2 text-red-400 hover:text-white hover:bg-red-500 border border-red-100 bg-red-50 rounded-lg transition-colors"><Trash2 size={14}/></button>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {prefs.length < 5 && (
                            <button type="button" onClick={addPref} className="w-full py-2.5 border-2 border-dashed border-emerald-300 rounded-xl text-emerald-700 font-bold text-xs hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2">
                              <Plus size={14}/> Add Program Preference ({prefs.length}/5)
                            </button>
                          )}
                          
                          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                            <div>
                              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Month & Year of Entry</label>
                              <input type="text" placeholder="e.g. September 2026" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-emerald-400" value={editingStudent.entry_month_year || ""} onChange={e => setEditingStudent({...editingStudent, entry_month_year: e.target.value})}/>
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Level of Entry</label>
                              <input type="text" placeholder="e.g. Year 1 Undergraduate" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-emerald-400" value={editingStudent.entry_level || ""} onChange={e => setEditingStudent({...editingStudent, entry_level: e.target.value})}/>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* SECTION 3: PREVIOUS STUDY */}
                    {(() => {
                      const studies = editingStudent.previous_studies || [];
                      const addStudy = () => setEditingStudent({...editingStudent, previous_studies: [...studies, {from_date: "", to_date: "", qualification: "", institution: "", country: ""}]});
                      const removeStudy = (idx: number) => setEditingStudent({...editingStudent, previous_studies: studies.filter((_: any, i: number) => i !== idx)});
                      const updateStudy = (idx: number, field: string, value: string) => {
                        const next = [...studies];
                        next[idx] = {...next[idx], [field]: value};
                        setEditingStudent({...editingStudent, previous_studies: next});
                      };
                      return (
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                          <h4 className="text-xs font-black text-[#282860] uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-3">
                            <GraduationCap size={16} className="text-indigo-500"/> Previous Study & Qualifications
                          </h4>
                          
                          {studies.length === 0 ? (
                            <div className="text-center py-6 text-slate-400 text-sm italic">No previous studies recorded.</div>
                          ) : (
                            <div className="space-y-3">
                              {studies.map((s: any, idx: number) => (
                                <div key={idx} className="border border-slate-200 rounded-xl p-3 bg-slate-50/30 relative">
                                  <button type="button" onClick={() => removeStudy(idx)} className="absolute top-2 right-2 p-1.5 text-red-400 hover:text-white hover:bg-red-500 rounded-lg transition-colors"><Trash2 size={12}/></button>
                                  <div className="grid grid-cols-2 gap-2 mb-2">
                                    <div>
                                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">From (Month/Year)</label>
                                      <input type="text" placeholder="e.g. 06/2020" className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-indigo-400" value={s.from_date || ""} onChange={e => updateStudy(idx, "from_date", e.target.value)}/>
                                    </div>
                                    <div>
                                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">To (Month/Year)</label>
                                      <input type="text" placeholder="e.g. 06/2023" className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-indigo-400" value={s.to_date || ""} onChange={e => updateStudy(idx, "to_date", e.target.value)}/>
                                    </div>
                                  </div>
                                  <input type="text" placeholder="Qualification (to be) obtained and major subject" className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-indigo-400 mb-2" value={s.qualification || ""} onChange={e => updateStudy(idx, "qualification", e.target.value)}/>
                                  <div className="grid grid-cols-2 gap-2">
                                    <input type="text" placeholder="Institution of study" className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-indigo-400" value={s.institution || ""} onChange={e => updateStudy(idx, "institution", e.target.value)}/>
                                    <input type="text" placeholder="Country of study" className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-indigo-400" value={s.country || ""} onChange={e => updateStudy(idx, "country", e.target.value)}/>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {studies.length < 5 && (
                            <button type="button" onClick={addStudy} className="w-full py-2.5 border-2 border-dashed border-indigo-300 rounded-xl text-indigo-700 font-bold text-xs hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2">
                              <Plus size={14}/> Add Previous Study ({studies.length}/5)
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    {/* SECTION 4: WORK EXPERIENCE */}
                    {(() => {
                      const works = editingStudent.work_experiences || [];
                      const addWork = () => setEditingStudent({...editingStudent, work_experiences: [...works, {from_date: "", to_date: "", organisation: "", position: "", duties: "", ft_pt: "FT"}]});
                      const removeWork = (idx: number) => setEditingStudent({...editingStudent, work_experiences: works.filter((_: any, i: number) => i !== idx)});
                      const updateWork = (idx: number, field: string, value: string) => {
                        const next = [...works];
                        next[idx] = {...next[idx], [field]: value};
                        setEditingStudent({...editingStudent, work_experiences: next});
                      };
                      return (
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                          <h4 className="text-xs font-black text-[#282860] uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-3">
                            <Briefcase size={16} className="text-amber-500"/> Work Experience
                          </h4>
                          
                          {works.length === 0 ? (
                            <div className="text-center py-6 text-slate-400 text-sm italic">No work experience recorded.</div>
                          ) : (
                            <div className="space-y-3">
                              {works.map((w: any, idx: number) => (
                                <div key={idx} className="border border-slate-200 rounded-xl p-3 bg-slate-50/30 relative">
                                  <button type="button" onClick={() => removeWork(idx)} className="absolute top-2 right-2 p-1.5 text-red-400 hover:text-white hover:bg-red-500 rounded-lg transition-colors"><Trash2 size={12}/></button>
                                  <div className="grid grid-cols-3 gap-2 mb-2">
                                    <div>
                                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">From</label>
                                      <input type="text" placeholder="MM/YYYY" className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-amber-400" value={w.from_date || ""} onChange={e => updateWork(idx, "from_date", e.target.value)}/>
                                    </div>
                                    <div>
                                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">To</label>
                                      <input type="text" placeholder="MM/YYYY" className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-amber-400" value={w.to_date || ""} onChange={e => updateWork(idx, "to_date", e.target.value)}/>
                                    </div>
                                    <div>
                                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">FT / PT</label>
                                      <select className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-amber-400 cursor-pointer" value={w.ft_pt || "FT"} onChange={e => updateWork(idx, "ft_pt", e.target.value)}>
                                        <option value="FT">FT (Full Time)</option>
                                        <option value="PT">PT (Part Time)</option>
                                      </select>
                                    </div>
                                  </div>
                                  <input type="text" placeholder="Name of Organisation" className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-amber-400 mb-2" value={w.organisation || ""} onChange={e => updateWork(idx, "organisation", e.target.value)}/>
                                  <input type="text" placeholder="Position / Job Title" className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-amber-400 mb-2" value={w.position || ""} onChange={e => updateWork(idx, "position", e.target.value)}/>
                                  <textarea rows={2} placeholder="Type of Work / Duties" className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-amber-400 resize-none" value={w.duties || ""} onChange={e => updateWork(idx, "duties", e.target.value)}/>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {works.length < 3 && (
                            <button type="button" onClick={addWork} className="w-full py-2.5 border-2 border-dashed border-amber-300 rounded-xl text-amber-700 font-bold text-xs hover:bg-amber-50 transition-colors flex items-center justify-center gap-2">
                              <Plus size={14}/> Add Work Experience ({works.length}/3)
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    {/* SECTION 5: LANGUAGE TESTS */}
                    {(() => {
                      const tests = editingStudent.language_tests || [];
                      const addTest = () => setEditingStudent({...editingStudent, language_tests: [...tests, {type: "", test_date: "", result: ""}]});
                      const removeTest = (idx: number) => setEditingStudent({...editingStudent, language_tests: tests.filter((_: any, i: number) => i !== idx)});
                      const updateTest = (idx: number, field: string, value: string) => {
                        const next = [...tests];
                        next[idx] = {...next[idx], [field]: value};
                        setEditingStudent({...editingStudent, language_tests: next});
                      };
                      return (
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                          <h4 className="text-xs font-black text-[#282860] uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-3">
                            <BookOpen size={16} className="text-cyan-500"/> English / Language Test Results
                          </h4>
                          
                          {tests.length === 0 ? (
                            <div className="text-center py-6 text-slate-400 text-sm italic">No test results recorded.</div>
                          ) : (
                            <div className="space-y-2">
                              {tests.map((t: any, idx: number) => (
                                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                                  <select className="col-span-4 px-2 py-2 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-cyan-400 cursor-pointer" value={t.type || ""} onChange={e => updateTest(idx, "type", e.target.value)}>
                                    <option value="">Test type</option>
                                    <option value="IELTS">IELTS</option>
                                    <option value="TOEFL">TOEFL</option>
                                    <option value="PTE">PTE</option>
                                    <option value="HSK">HSK</option>
                                    <option value="Other">Other</option>
                                  </select>
                                  <input type="text" placeholder="Test date (MM/YYYY)" className="col-span-4 px-2 py-2 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-cyan-400" value={t.test_date || ""} onChange={e => updateTest(idx, "test_date", e.target.value)}/>
                                  <input type="text" placeholder="Result / score" className="col-span-3 px-2 py-2 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-cyan-400" value={t.result || ""} onChange={e => updateTest(idx, "result", e.target.value)}/>
                                  <button type="button" onClick={() => removeTest(idx)} className="col-span-1 p-2 text-red-400 hover:text-white hover:bg-red-500 border border-red-100 bg-red-50 rounded-lg transition-colors"><Trash2 size={12}/></button>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <button type="button" onClick={addTest} className="w-full py-2.5 border-2 border-dashed border-cyan-300 rounded-xl text-cyan-700 font-bold text-xs hover:bg-cyan-50 transition-colors flex items-center justify-center gap-2">
                            <Plus size={14}/> Add Language Test
                          </button>
                        </div>
                      );
                    })()}

                    {/* SECTION 6: REFEREES */}
                    {(() => {
                      const refs = editingStudent.referees || [];
                      const addRef = () => setEditingStudent({...editingStudent, referees: [...refs, {name: "", institution: "", position: "", address: "", tel_1: "", tel_2: "", hp: "", fax: "", email: ""}]});
                      const removeRef = (idx: number) => setEditingStudent({...editingStudent, referees: refs.filter((_: any, i: number) => i !== idx)});
                      const updateRef = (idx: number, field: string, value: string) => {
                        const next = [...refs];
                        next[idx] = {...next[idx], [field]: value};
                        setEditingStudent({...editingStudent, referees: next});
                      };
                      return (
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                          <h4 className="text-xs font-black text-[#282860] uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-3">
                            <Award size={16} className="text-rose-500"/> Referees
                            <span className="ml-auto text-[10px] text-slate-400 font-normal normal-case tracking-normal">2 referees recommended</span>
                          </h4>
                          
                          {refs.length === 0 ? (
                            <div className="text-center py-6 text-slate-400 text-sm italic">No referees recorded yet.</div>
                          ) : refs.map((r: any, idx: number) => (
                            <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-rose-50/30 relative space-y-3">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-black text-rose-700">Referee {idx + 1}</p>
                                <button type="button" onClick={() => removeRef(idx)} className="p-1.5 text-red-400 hover:text-white hover:bg-red-500 rounded-lg transition-colors"><Trash2 size={12}/></button>
                              </div>
                              <input type="text" placeholder="Full name" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-rose-400" value={r.name || ""} onChange={e => updateRef(idx, "name", e.target.value)}/>
                              <div className="grid grid-cols-2 gap-2">
                                <input type="text" placeholder="Institution / Company" className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-rose-400" value={r.institution || ""} onChange={e => updateRef(idx, "institution", e.target.value)}/>
                                <input type="text" placeholder="Position" className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-rose-400" value={r.position || ""} onChange={e => updateRef(idx, "position", e.target.value)}/>
                              </div>
                              <textarea rows={2} placeholder="Address" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-rose-400 resize-none" value={r.address || ""} onChange={e => updateRef(idx, "address", e.target.value)}/>
                              <div className="grid grid-cols-4 gap-2">
                                <input type="text" placeholder="Tel 1" className="px-2 py-2 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-rose-400" value={r.tel_1 || ""} onChange={e => updateRef(idx, "tel_1", e.target.value)}/>
                                <input type="text" placeholder="Tel 2" className="px-2 py-2 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-rose-400" value={r.tel_2 || ""} onChange={e => updateRef(idx, "tel_2", e.target.value)}/>
                                <input type="text" placeholder="HP / Mobile" className="px-2 py-2 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-rose-400" value={r.hp || ""} onChange={e => updateRef(idx, "hp", e.target.value)}/>
                                <input type="text" placeholder="Fax" className="px-2 py-2 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-rose-400" value={r.fax || ""} onChange={e => updateRef(idx, "fax", e.target.value)}/>
                              </div>
                              <input type="email" placeholder="Email" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-rose-400" value={r.email || ""} onChange={e => updateRef(idx, "email", e.target.value)}/>
                            </div>
                          ))}
                          
                          {refs.length < 2 && (
                            <button type="button" onClick={addRef} className="w-full py-2.5 border-2 border-dashed border-rose-300 rounded-xl text-rose-700 font-bold text-xs hover:bg-rose-50 transition-colors flex items-center justify-center gap-2">
                              <Plus size={14}/> Add Referee ({refs.length}/2)
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    {/* GENERATE APPLICATION FORM PDF */}
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                          <Download size={24} className="text-emerald-600"/>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-black text-emerald-900">Generate Application Form PDF</p>
                          <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                            Save the form first (button at bottom of page), then click below to render all data onto the official Fortrust template. The PDF is ready to send for student signature.
                          </p>
                          <button 
                            type="button" 
                            onClick={handleDownloadApplicationForm}
                            disabled={isDownloadingAppForm}
                            className="mt-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-50">
                            {isDownloadingAppForm 
                              ? <><Loader2 size={16} className="animate-spin"/> Generating PDF...</>
                              : <><Download size={16}/> Download Application Form PDF</>}
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              )}
            </div>
            {(dossierTab === 'profile' || dossierTab === 'appform') && (
              <div className="p-5 border-t border-slate-200 bg-white flex justify-end gap-3 shrink-0 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]">
                <button onClick={() => setEditingStudent(null)} type="button" className="px-5 py-2.5 text-slate-500 font-bold text-sm hover:text-slate-800 transition-colors">Cancel</button>
                <button 
                  form={dossierTab === 'appform' ? 'edit-student-form-appform' : 'edit-student-form'} 
                  type="submit" 
                  disabled={isSavingStudent} 
                  className="bg-[#282860] hover:bg-[#1b1b42] active:scale-95 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-50">
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