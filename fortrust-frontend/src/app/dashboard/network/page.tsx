"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Building2, UploadCloud, Plus, 
  Sparkles, X, Loader2, Trash2, Building, FileText, Phone, Calculator,
  Search, Filter, Globe, AlertCircle, DollarSign, Percent, CheckCircle2,
  Link2, Eye, Download
} from "lucide-react";

// --- AGREEMENT EXPIRY HELPERS ---
function getAgreementStatus(durationEnd: string | null | undefined): {
  status: "active" | "expiring" | "expired" | "unknown";
  daysLeft: number | null;
  label: string;
} {
  if (!durationEnd) return { status: "unknown", daysLeft: null, label: "No end date" };
  try {
    const end = new Date(durationEnd);
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();
    const daysLeft = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return { status: "expired", daysLeft, label: `Expired ${Math.abs(daysLeft)}d ago` };
    if (daysLeft <= 30) return { status: "expiring", daysLeft, label: `Expires in ${daysLeft}d` };
    return { status: "active", daysLeft, label: `${daysLeft}d remaining` };
  } catch {
    return { status: "unknown", daysLeft: null, label: "Invalid date" };
  }
}

// --- COMMISSION PROGRAM TYPE ---
interface CommissionProgram {
  program_name: string;
  part1_pct: number | null;
  part2_pct: number | null;
  partial_service_fee: number | null;
  partial_service_currency: string;  // NEW
  notes: string;
}

const emptyProgram: CommissionProgram = {
  program_name: "",
  part1_pct: null,
  part2_pct: null,
  partial_service_fee: null,
  partial_service_currency: "USD",  // NEW
  notes: ""
};
// --- AUTO-CALC HELPER ---
function calculateCommission(
  program: CommissionProgram | null,
  tuition: number,
  semesters: number
): { total: number; breakdown: string; currency: string } {
  if (!program) return { total: 0, breakdown: "Select a program first", currency: "USD" };
  const currency = program.partial_service_currency || "USD";
  if (program.partial_service_fee !== null && program.partial_service_fee > 0) {
    const total = program.partial_service_fee * semesters;
    return {
      total,
      currency,
      breakdown: `Flat fee: ${currency} ${program.partial_service_fee.toLocaleString()} × ${semesters} semester(s) = ${currency} ${total.toLocaleString()}`
    };
  }
  const p1 = program.part1_pct ? (tuition * program.part1_pct / 100) : 0;
  const p2 = program.part2_pct ? (tuition * program.part2_pct / 100) : 0;
  const total = (p1 + p2) * semesters;
  const parts: string[] = [];
  if (p1) parts.push(`1st Semester: ${program.part1_pct}% × ${tuition.toLocaleString()} = ${p1.toLocaleString()}`);
  if (p2) parts.push(`2nd Semester: ${program.part2_pct}% × ${tuition.toLocaleString()} = ${p2.toLocaleString()}`);
  parts.push(`× ${semesters} semester(s) = ${total.toLocaleString()}`);
  return { total, currency, breakdown: parts.join("\n") };
}

export default function InstitutionPartners() {
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"profile" | "agreement" | "contacts" | "programs" | "commission">("profile");
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const agreementFileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  
  // Multi-agreement state
  const [isAddAgreementOpen, setIsAddAgreementOpen] = useState(false);
  const [agreementMode, setAgreementMode] = useState<"choose" | "file" | "link">("choose");
  const [agreementLinkUrl, setAgreementLinkUrl] = useState("");
  const [agreementLinkName, setAgreementLinkName] = useState("");
  const [isUploadingAgreement, setIsUploadingAgreement] = useState(false);

  // Calc tab state (per-student commission calculator)

  // Calc tab state (per-student commission calculator)
  const [calcProgramIdx, setCalcProgramIdx] = useState<number | null>(null);
  const [calcTuition, setCalcTuition] = useState<string>("");
  const [calcSemesters, setCalcSemesters] = useState<string>("1");

  const emptyForm = {
    id: "",
    institution_name: "", institution_type: "University", country: "", website: "",
    student_intake: "", programs_offered: "", status: "Active",
    agreement_id: "", agreement_date: "", agreement_type: "Commission-based",
    base_commission: "", performance_bonus: "", tiered_levels: "",
    duration_start: "", duration_end: "", terms_conditions: "", document_link: "",
    agreements: [] as any[],   // ⬅️ NEW
    contacts: [] as any[],
    commission_programs: [] as CommissionProgram[],
    total_referrals: "", total_enrollment: "", base_amount: "", calc_bonus: "",
    total_payable: "", comm_status: "Pending", payment_date: "", calc_notes: ""
  };

  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => { fetchInstitutions(); }, []);

  const fetchInstitutions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/institutions`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") setInstitutions(data.data || []);
    } catch (error) {
      console.error("Failed to fetch institutions", error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // AGREEMENT HANDLERS (multi-file + link support)
  // ============================================================
  
  const handleAddAgreementFile = async (file: File) => {
    if (!formData.id) {
      alert("Please save the institution first before adding agreements.");
      return;
    }
    setIsUploadingAgreement(true);
    try {
      const token = localStorage.getItem("fortrust_token");
      const payload = new FormData();
      payload.append("file", file);
      
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/institutions/${formData.id}/agreements/file`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: payload
        }
      );
      
      const data = await res.json();
      if (res.ok && data.status === "success") {
        // Append to local state
        const currentAgreements = formData.agreements || [];
        setFormData({ ...formData, agreements: [...currentAgreements, data.agreement] });
        setIsAddAgreementOpen(false);
        setAgreementMode("choose");
      } else {
        alert(data.detail || "Upload failed.");
      }
    } catch (e) {
      alert("Network error during upload.");
    } finally {
      setIsUploadingAgreement(false);
    }
  };

  const handleAddAgreementLink = async () => {
    if (!formData.id) {
      alert("Please save the institution first before adding agreements.");
      return;
    }
    if (!agreementLinkUrl.trim()) {
      alert("Please enter a URL.");
      return;
    }
    setIsUploadingAgreement(true);
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/institutions/${formData.id}/agreements/link`,
        {
          method: "POST",
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            url: agreementLinkUrl.trim(),
            name: agreementLinkName.trim() || "External Agreement Link"
          })
        }
      );
      
      const data = await res.json();
      if (res.ok && data.status === "success") {
        const currentAgreements = formData.agreements || [];
        setFormData({ ...formData, agreements: [...currentAgreements, data.agreement] });
        setIsAddAgreementOpen(false);
        setAgreementMode("choose");
        setAgreementLinkUrl("");
        setAgreementLinkName("");
      } else {
        alert(data.detail || "Failed to add link.");
      }
    } catch (e) {
      alert("Network error.");
    } finally {
      setIsUploadingAgreement(false);
    }
  };

  const handleDeleteAgreement = async (agreementId: string) => {
    if (!window.confirm("Remove this agreement? This action cannot be undone.")) return;
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/institutions/${formData.id}/agreements/${agreementId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (res.ok) {
        setFormData({
          ...formData,
          agreements: (formData.agreements || []).filter((a: any) => a.id !== agreementId)
        });
      } else {
        alert("Could not delete agreement.");
      }
    } catch (e) {
      alert("Network error.");
    }
  };

  const closeAgreementModal = () => {
    setIsAddAgreementOpen(false);
    setAgreementMode("choose");
    setAgreementLinkUrl("");
    setAgreementLinkName("");
  };

  const handleSaveInstitution = async () => {
      try {
        // --- SANITIZE commission_programs to prevent type errors ---
        const cleanPrograms = (formData.commission_programs || []).map((p: any) => ({
          program_name: String(p.program_name || ""),
          part1_pct: p.part1_pct === null || p.part1_pct === "" ? null : Number(p.part1_pct),
          part2_pct: p.part2_pct === null || p.part2_pct === "" ? null : Number(p.part2_pct),
          partial_service_fee: p.partial_service_fee === null || p.partial_service_fee === "" ? null : Number(p.partial_service_fee),
          partial_service_currency: String(p.partial_service_currency || "USD"),
          notes: String(p.notes || "")
        }));

        // --- SANITIZE contacts ---
        const cleanContacts = (formData.contacts || []).map((c: any) => ({
          id: c.id || `C-${Date.now()}-${Math.random()}`,
          full_name: String(c.full_name || c.name || ""),
          title: String(c.title || ""),
          department: String(c.department || ""),
          email: String(c.email || ""),
          phone: String(c.phone || ""),
          mobile: String(c.mobile || ""),
          whatsapp: String(c.whatsapp || ""),
          office_address: String(c.office_address || ""),
          method: String(c.method || "Email"),
          primary: String(c.primary || "No"),
          status: String(c.status || "Active")
        }));

        // --- SANITIZE dates: strip any non-YYYY-MM-DD garbage ---
        const cleanDate = (d: any): string | null => {
          if (!d) return null;
          const str = String(d).trim();
          // Match YYYY-MM-DD at start of string
          const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
          return match ? match[1] : null;
        };

        const token = localStorage.getItem("fortrust_token");
        const isEditing = !!formData.id;
        const url = isEditing
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/institutions/${formData.id}`
          : `${process.env.NEXT_PUBLIC_API_URL}/api/institutions`;
        const method = isEditing ? "PUT" : "POST";

        const payload: any = {
          name: formData.institution_name,
          type: formData.institution_type,
          country: formData.country,
          website: formData.website,
          status: formData.status,
          student_intake: formData.student_intake,
          programs_offered: formData.programs_offered,
          agreement_id: formData.agreement_id,
          agreement_date: cleanDate(formData.agreement_date),
          agreement_type: formData.agreement_type,
          base_commission: formData.base_commission,
          performance_bonus: formData.performance_bonus,
          tiered_levels: formData.tiered_levels,
          duration_start: cleanDate(formData.duration_start),
          duration_end: cleanDate(formData.duration_end),
          terms_conditions: formData.terms_conditions,
          document_link: formData.document_link,
          contacts: cleanContacts,
          commission_programs: cleanPrograms,
        };

        if (!isEditing) delete payload.id;

        // --- DEBUG: log what we're sending ---
        console.log("[SAVE INSTITUTION] Sending payload:", JSON.stringify(payload, null, 2));

        const res = await fetch(url, {
          method,
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const responseText = await res.text();
        console.log("[SAVE INSTITUTION] Response status:", res.status);
        console.log("[SAVE INSTITUTION] Response body:", responseText);

        if (res.ok) {
          setIsEditModalOpen(false);
          fetchInstitutions();
        } else {
          let errorMsg = responseText;
          try {
            const errorData = JSON.parse(responseText);
            errorMsg = JSON.stringify(errorData.detail || errorData, null, 2);
          } catch {}
          alert(`Backend Error (${res.status}):\n\n${errorMsg}`);
        }
      } catch (error: any) {
        console.error("[SAVE INSTITUTION] Network error:", error);
        alert(`Network Error: ${error.message || "Could not connect to backend."}`);
      }
    };

  const handleDeleteInstitution = async (id: string) => {
    if (!window.confirm("Delete this institution?")) return;
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/institutions/${id}`, {
        method: "DELETE", headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) fetchInstitutions();
    } catch (error) { alert("Network Error."); }
  };

  const handleAddContact = () => {
    const newContact = {
      id: `C-${Date.now()}`, full_name: "", title: "", department: "",
      email: "", phone: "", mobile: "", office_address: "",
      whatsapp: "", method: "Email", primary: "No", status: "Active"
    };
    setFormData({ ...formData, contacts: [...formData.contacts, newContact] });
  };

  const handleRemoveContact = (index: number) => {
    const updated = formData.contacts.filter((_, i) => i !== index);
    setFormData({ ...formData, contacts: updated });
  };

  // --- COMMISSION PROGRAM CRUD ---
  const handleAddProgram = () => {
    setFormData({
      ...formData,
      commission_programs: [...formData.commission_programs, { ...emptyProgram }]
    });
  };

  const handleUpdateProgram = (index: number, field: keyof CommissionProgram, value: any) => {
    const updated = [...formData.commission_programs];
    if (field === "part1_pct" || field === "part2_pct" || field === "partial_service_fee") {
      updated[index] = { ...updated[index], [field]: value === "" || value === null ? null : Number(value) };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setFormData({ ...formData, commission_programs: updated });
  };

  const handleRemoveProgram = (index: number) => {
    if (!window.confirm("Remove this program row?")) return;
    const updated = formData.commission_programs.filter((_, i) => i !== index);
    setFormData({ ...formData, commission_programs: updated });
  };

const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length > 5) {
      alert("Maximum 5 PDFs at a time. Please select fewer files.");
      e.target.value = ""; // reset input
      return;
    }

    setIsScanning(true);
    try {
      const payload = new FormData();
      // Append each file under the same field name 'contracts'
      for (let i = 0; i < files.length; i++) {
        payload.append("contracts", files[i]);
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/extract-commission`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${localStorage.getItem("fortrust_token")}` },
        body: payload
      });
      const result = await res.json();

      if (result.status === "success") {
        setFormData(prev => ({
          ...prev,
          institution_name: result.data.institution_name || prev.institution_name,
          institution_type: result.data.institution_type || prev.institution_type,
          country: result.data.country || prev.country,
          website: result.data.website || prev.website,
          agreement_id: result.data.agreement_id || prev.agreement_id,
          agreement_type: result.data.agreement_type || prev.agreement_type,
          base_commission: result.data.base_commission || prev.base_commission,
          performance_bonus: result.data.performance_bonus || prev.performance_bonus,
          tiered_levels: result.data.tiered_levels || prev.tiered_levels,
          duration_start: result.data.duration_start || prev.duration_start,
          duration_end: result.data.duration_end || prev.duration_end,
          terms_conditions: result.data.terms_conditions || prev.terms_conditions,
          contacts: result.data.contacts || prev.contacts,
          commission_programs: (result.data.commission_programs && result.data.commission_programs.length > 0)
            ? result.data.commission_programs
            : prev.commission_programs,
        }));
        setScanSuccess(true);
        setTimeout(() => setScanSuccess(false), 4000);

        // Log amendment history to console for debugging
        if (result.data.amendment_history && result.data.amendment_history.length > 1) {
          console.log(`[AI Extraction] Merged ${result.data.amendment_history.length} documents:`, result.data.amendment_history);
        }

        if (result.data.commission_programs && result.data.commission_programs.length > 0) {
          setModalTab("programs");
        }

        // Friendly toast if multi-file
        const fileCount = result.files_processed || files.length;
        if (fileCount > 1) {
          setTimeout(() => {
            alert(`✅ Successfully merged ${fileCount} documents into one agreement.\n\n${result.data.amendment_history?.length || 0} amendments tracked. Check the Programs tab.`);
          }, 500);
        }
      } else {
        alert(result.message || "AI extraction failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error. Could not reach AI extraction service.");
    } finally {
      setIsScanning(false);
      e.target.value = ""; // reset so user can re-upload same file
    }
  };

  const filteredInstitutions = institutions.filter(inst => 
    (inst.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (inst.country || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calc tab — compute current selected commission
  const selectedProgram = calcProgramIdx !== null ? formData.commission_programs[calcProgramIdx] : null;
  const calcResult = calculateCommission(
    selectedProgram,
    Number(calcTuition) || 0,
    Number(calcSemesters) || 1
  );

  return (
    <div className="p-4 lg:p-8 max-w-[1500px] mx-auto w-full relative animate-in fade-in">

      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#282860] flex items-center gap-3">
            <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
              <Building2 className="text-[#BAD133]" size={28} />
            </div>
            Institution Partners
          </h1>
          <p className="text-slate-500 mt-2 font-medium text-sm">
            Manage university agreements, MoU documents, and active partner statuses.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto">
          <button
            onClick={() => { setFormData(emptyForm); setIsEditModalOpen(true); setModalTab("profile"); }}
            className="bg-[#282860] hover:bg-[#1b1b42] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md flex items-center gap-2 shrink-0 transition-colors"
          >
            <Plus size={18} /> Add Institution
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[650px]">

        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <div className="flex items-center text-slate-400 bg-white px-3 py-2 rounded-lg border border-slate-200 w-full max-w-sm focus-within:border-[#BAD133] transition-all shadow-sm">
            <Search size={16} className="mr-2 text-slate-400" />
            <input
              type="text"
              placeholder="Search institution or country..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-slate-700 w-full"
            />
          </div>
          <button className="flex items-center gap-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 shadow-sm shrink-0">
            <Filter size={16}/> Filter Status
          </button>
        </div>

        <div className="flex-1 overflow-x-auto custom-scrollbar">
          <table className="w-full text-left min-w-[1000px]">
            <thead className="bg-white text-[#64748b] text-[10px] uppercase tracking-widest border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-5 py-4">Institution Name</th>
                <th className="px-5 py-4">Location</th>
                <th className="px-5 py-4">Programs</th>
                <th className="px-5 py-4">MoU Status</th>
                <th className="px-5 py-4">Agreement File</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <Loader2 className="animate-spin mx-auto text-[#BAD133]" size={32} />
                  </td>
                </tr>
              ) : filteredInstitutions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500">
                    No institutions found. Click "Add Institution" to get started.
                  </td>
                </tr>
              ) : filteredInstitutions.map((inst) => {
                const programCount = Array.isArray(inst.commission_programs) ? inst.commission_programs.length : 0;
                return (
                <tr key={inst.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-5 py-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-black shrink-0">
                      {inst.name?.charAt(0) || "U"}
                    </div>
                    <div>
                      <p className="font-bold text-[#282860]">{inst.name || "Unnamed"}</p>
                      <p className="text-[11px] text-slate-400">{inst.website || "No website"}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-600 font-medium">
                    <span className="flex items-center gap-1.5"><Globe size={14} className="text-slate-400"/> {inst.country || "N/A"}</span>
                  </td>
                  <td className="px-5 py-4">
                    {programCount > 0 ? (
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider flex items-center gap-1 w-fit">
                        <Percent size={11}/> {programCount} program{programCount !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs italic">No programs yet</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {(() => {
                      const exp = getAgreementStatus(inst.duration_end);
                      const isActive = inst.status === "Active";
                      if (exp.status === "expired") {
                        return (
                          <div className="flex flex-col gap-1">
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-red-50 text-red-700 border border-red-200 w-fit">
                              ⚠️ Expired
                            </span>
                            <span className="text-[9px] text-red-500 font-bold">{exp.label}</span>
                          </div>
                        );
                      }
                      if (exp.status === "expiring") {
                        return (
                          <div className="flex flex-col gap-1">
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 w-fit">
                              ⏰ Expiring Soon
                            </span>
                            <span className="text-[9px] text-amber-600 font-bold">{exp.label}</span>
                          </div>
                        );
                      }
                      return (
                        <div className="flex flex-col gap-1">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider w-fit ${isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-50 text-slate-600 border border-slate-200"}`}>
                            {inst.status || "ACTIVE"}
                          </span>
                          {exp.daysLeft !== null && (
                            <span className="text-[9px] text-slate-400 font-bold">{exp.label}</span>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-5 py-4">
                    {inst.document_link ? (
                      <a href={inst.document_link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-fit text-[#282860] bg-white border border-slate-200 hover:border-[#BAD133] px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm">
                        <FileText size={14}/> View PDF
                      </a>
                    ) : (
                      <span className="flex items-center justify-center gap-2 text-slate-400 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold w-fit">
                        <UploadCloud size={14}/> No file
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setFormData({
                            ...emptyForm,
                            ...inst,
                            institution_name: inst.name || "",
                            institution_type: inst.type || "University",
                            contacts: inst.contacts || [],
                            commission_programs: inst.commission_programs || [],
                            agreements: inst.agreements || [],   // ⬅️ NEW
                          });
                          setIsEditModalOpen(true);
                          setModalTab("profile");
                          setCalcProgramIdx(null);
                          setCalcTuition("");
                          setCalcSemesters("1");
                        }}
                        className="text-[#BAD133] hover:text-[#9bb029] font-bold text-xs uppercase tracking-wider bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteInstitution(inst.id)}
                        className="text-red-400 hover:text-white hover:bg-red-500 bg-red-50 px-2 py-1.5 rounded-lg border border-red-100 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MASTER EDIT MODAL --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">

            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-[#1b1b42] text-white shrink-0">
              <div>
                <h2 className="text-2xl font-black flex items-center gap-2">
                  <Building2 className="text-[#BAD133]" />
                  {formData.institution_name || "New Institution"}
                </h2>
                <p className="text-slate-300 text-sm mt-1">Master Agreement & Contact Profile</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors bg-white/10 p-2 rounded-full"
              >
                <X size={24} />
              </button>
            </div>

            {/* EXPIRY WARNING BANNER */}
            {formData.duration_end && (() => {
              const exp = getAgreementStatus(formData.duration_end);
              if (exp.status === "expired") {
                return (
                  <div className="bg-red-50 border-b-2 border-red-200 px-6 py-3 flex items-center gap-3 shrink-0">
                    <div className="bg-red-100 text-red-600 p-1.5 rounded-lg"><AlertCircle size={18}/></div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-red-700">⚠️ This agreement has expired</p>
                      <p className="text-xs text-red-600">End date: {formData.duration_end} ({exp.label}). Renew before continuing.</p>
                    </div>
                  </div>
                );
              }
              if (exp.status === "expiring") {
                return (
                  <div className="bg-amber-50 border-b-2 border-amber-200 px-6 py-3 flex items-center gap-3 shrink-0">
                    <div className="bg-amber-100 text-amber-600 p-1.5 rounded-lg"><AlertCircle size={18}/></div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-amber-700">⏰ Agreement expiring soon</p>
                      <p className="text-xs text-amber-600">End date: {formData.duration_end} ({exp.label}). Begin renewal discussions now.</p>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* AI Banner */}
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 border-b border-indigo-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><Sparkles size={20} /></div>
                <div>
                  <p className="text-sm font-bold text-[#282860]">AI Contract Auto-Fill</p>
                  <p className="text-xs text-slate-500">Upload up to <strong>5 PDFs</strong> (original + amendments/variations). AI merges them with later dates winning conflicts.</p>
                </div>
              </div>
              <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    accept=".pdf" 
                    multiple 
                    className="hidden" 
                  />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning}
                className="bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-600 hover:text-white px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isScanning ? <><Loader2 size={16} className="animate-spin" /> Scanning...</> : <><UploadCloud size={16} /> Upload PDF</>}
              </button>
            </div>
            {scanSuccess && (
              <div className="bg-green-50 text-green-700 p-3 text-center text-xs font-bold border-b border-green-100 shrink-0 flex items-center justify-center gap-2">
                <CheckCircle2 size={16}/>
                AI extracted {formData.commission_programs.length} program row{formData.commission_programs.length !== 1 ? 's' : ''} from the agreement documents — verify in the Programs tab below.
              </div>
            )}

            {/* Tabs */}
            <div className="flex bg-[#f8fafc] border-b border-slate-200 px-6 overflow-x-auto shrink-0">
              <button onClick={() => setModalTab('profile')} className={`px-4 py-4 text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${modalTab === 'profile' ? 'border-b-2 border-[#282860] text-[#282860]' : 'text-slate-400'}`}><Building size={16} /> A. Profile</button>
              <button onClick={() => setModalTab('agreement')} className={`px-4 py-4 text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${modalTab === 'agreement' ? 'border-b-2 border-[#282860] text-[#282860]' : 'text-slate-400'}`}><FileText size={16} /> B. Agreement</button>
              <button onClick={() => setModalTab('contacts')} className={`px-4 py-4 text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${modalTab === 'contacts' ? 'border-b-2 border-[#282860] text-[#282860]' : 'text-slate-400'}`}><Phone size={16} /> C. Contacts</button>
              <button onClick={() => setModalTab('programs')} className={`px-4 py-4 text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${modalTab === 'programs' ? 'border-b-2 border-purple-600 text-purple-700' : 'text-slate-400'}`}>
                <Percent size={16} /> D. Programs
                {formData.commission_programs.length > 0 && (
                  <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[10px] font-black">{formData.commission_programs.length}</span>
                )}
              </button>
              <button onClick={() => setModalTab('commission')} className={`px-4 py-4 text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${modalTab === 'commission' ? 'border-b-2 border-green-600 text-green-700' : 'text-slate-400'}`}><Calculator size={16} /> E. Calculator</button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50 custom-scrollbar">

              {/* TAB A: PROFILE */}
              {modalTab === 'profile' && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Institution Name</label>
                    <input type="text" className="w-full mt-1 p-3 border border-slate-200 rounded-xl font-bold text-[#282860] outline-none focus:border-[#BAD133]" value={formData.institution_name} onChange={e => setFormData({ ...formData, institution_name: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Institution Type</label>
                    <select className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-[#BAD133]" value={formData.institution_type} onChange={e => setFormData({ ...formData, institution_type: e.target.value })}>
                      <option>University</option><option>College</option><option>Vocational</option><option>Language School</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Country/Region</label>
                    <input type="text" className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-[#BAD133]" value={formData.country} onChange={e => setFormData({ ...formData, country: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Website</label>
                    <input type="text" className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-[#BAD133]" value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Student Intake (Annual)</label>
                    <input type="text" className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-[#BAD133]" value={formData.student_intake} onChange={e => setFormData({ ...formData, student_intake: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                    <select className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-[#BAD133]" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                      <option>Active</option><option>Inactive</option>
                    </select>
                  </div>
                </div>
              )}

              {/* TAB B: AGREEMENT */}
              {modalTab === 'agreement' && (
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Agreement ID</label>
                    <input type="text" className="w-full mt-1 p-3 border border-slate-200 rounded-xl font-mono outline-none focus:border-[#BAD133]" value={formData.agreement_id} onChange={e => setFormData({ ...formData, agreement_id: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Agreement Date</label>
                    <input type="date" className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-[#BAD133]" value={formData.agreement_date} onChange={e => setFormData({ ...formData, agreement_date: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Agreement Type</label>
                    <select className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-[#BAD133]" value={formData.agreement_type} onChange={e => setFormData({ ...formData, agreement_type: e.target.value })}>
                      <option>Commission-based</option><option>Fixed Fee</option><option>Tiered</option><option>Hybrid</option>
                    </select>
                  </div>
                  <div className="col-span-2 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                    <p className="text-xs font-bold text-purple-700 flex items-center gap-2">
                      💡 For per-program commission rates (e.g. Bachelor 10%, MChD $2,500 flat), use the <span className="bg-purple-200 px-2 py-0.5 rounded">D. Programs</span> tab.
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Headline Base Commission</label>
                    <input type="text" className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-[#BAD133]" placeholder="e.g. 10% or Variable" value={formData.base_commission} onChange={e => setFormData({ ...formData, base_commission: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Performance Bonus</label>
                    <input type="text" className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-[#BAD133]" value={formData.performance_bonus} onChange={e => setFormData({ ...formData, performance_bonus: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Duration Start</label>
                    <input type="date" className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-[#BAD133]" value={formData.duration_start} onChange={e => setFormData({ ...formData, duration_start: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Duration End</label>
                    <input type="date" className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-[#BAD133]" value={formData.duration_end} onChange={e => setFormData({ ...formData, duration_end: e.target.value })} />
                  </div>

                  {/* SIGNED MOU DOCUMENTS — multi-file + link support */}
                  <div className="col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-blue-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                          <FileText size={18}/>
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-[#282860]">Signed MoU Documents</h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {(formData.agreements || []).length === 0 
                              ? "No agreements uploaded yet."
                              : `${(formData.agreements || []).length} document${(formData.agreements || []).length === 1 ? '' : 's'} on file.`}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!formData.id) {
                            alert("Please save the institution first (click 'Save Institution Data' below), then come back to add agreements.");
                            return;
                          }
                          setIsAddAgreementOpen(true);
                          setAgreementMode("choose");
                        }}
                        className="bg-[#282860] hover:bg-[#1b1b42] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 shrink-0"
                      >
                        <Plus size={14}/> New Agreement
                      </button>
                    </div>
                    
                    {/* List of agreements */}
                    {(!formData.agreements || formData.agreements.length === 0) ? (
                      <div className="p-12 text-center">
                        <FileText size={40} className="text-slate-200 mx-auto mb-3"/>
                        <p className="text-sm font-bold text-slate-500">No agreements yet</p>
                        <p className="text-xs text-slate-400 mt-1">Click "+ New Agreement" above to upload a file or paste a link.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {(formData.agreements || []).map((agr: any) => (
                          <div key={agr.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              agr.type === "file" 
                                ? "bg-blue-100 text-blue-600" 
                                : "bg-purple-100 text-purple-600"
                            }`}>
                              {agr.type === "file" ? <FileText size={18}/> : <Link2 size={18}/>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-[#282860] text-sm truncate">{agr.name}</p>
                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                                  agr.type === "file" 
                                    ? "bg-blue-100 text-blue-700" 
                                    : "bg-purple-100 text-purple-700"
                                }`}>
                                  {agr.type === "file" ? "📎 File" : "🔗 Link"}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {agr.uploaded_by && <span>Added by <strong>{agr.uploaded_by}</strong></span>}
                                {agr.uploaded_at && <span> · {new Date(agr.uploaded_at).toLocaleDateString()}</span>}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <a
                                href={agr.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                              >
                                <Eye size={12}/> View
                              </a>
                              <button
                                type="button"
                                onClick={() => handleDeleteAgreement(agr.id)}
                                className="bg-white hover:bg-red-50 text-red-500 border border-red-200 p-2 rounded-lg transition-colors shadow-sm"
                                title="Remove"
                              >
                                <Trash2 size={14}/>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Terms & Conditions</label>
                    <textarea rows={3} className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-[#BAD133]" value={formData.terms_conditions} onChange={e => setFormData({ ...formData, terms_conditions: e.target.value })} />
                  </div>
                </div>
              )}

              {/* TAB C: CONTACTS */}
              {modalTab === 'contacts' && (
                <div className="space-y-6">
                  {formData.contacts.length === 0 && (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-center">
                      <p className="text-sm text-amber-700 font-bold">No contacts yet. Add the authorized signatory + key operational contacts.</p>
                    </div>
                  )}
                  {formData.contacts.map((contact, index) => (
                    <div key={contact.id || index} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative">
                      <button onClick={() => handleRemoveContact(index)}
                        className="absolute top-4 right-4 text-red-400 hover:text-red-600 p-1 bg-red-50 rounded-md transition-colors">
                        <Trash2 size={16} />
                      </button>
                      <h3 className="font-bold text-[#282860] mb-4 border-b pb-2">
                        Contact Person {index + 1}
                        {contact.primary === "Yes" && <span className="ml-2 bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">Primary</span>}
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                          <input type="text" className="w-full mt-1 p-2 border border-slate-200 rounded-lg outline-none focus:border-[#BAD133]" value={contact.full_name || contact.name || ""} onChange={(e) => { const c = [...formData.contacts]; c[index].full_name = e.target.value; setFormData({ ...formData, contacts: c }); }} />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Title/Position</label>
                          <input type="text" className="w-full mt-1 p-2 border border-slate-200 rounded-lg outline-none focus:border-[#BAD133]" value={contact.title || ""} onChange={(e) => { const c = [...formData.contacts]; c[index].title = e.target.value; setFormData({ ...formData, contacts: c }); }} />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                          <input type="email" className="w-full mt-1 p-2 border border-slate-200 rounded-lg outline-none focus:border-[#BAD133]" value={contact.email || ""} onChange={(e) => { const c = [...formData.contacts]; c[index].email = e.target.value; setFormData({ ...formData, contacts: c }); }} />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Mobile</label>
                          <input type="text" className="w-full mt-1 p-2 border border-slate-200 rounded-lg outline-none focus:border-[#BAD133]" value={contact.mobile || contact.phone || ""} onChange={(e) => { const c = [...formData.contacts]; c[index].mobile = e.target.value; setFormData({ ...formData, contacts: c }); }} />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Department</label>
                          <input type="text" className="w-full mt-1 p-2 border border-slate-200 rounded-lg outline-none focus:border-[#BAD133]" value={contact.department || ""} onChange={(e) => { const c = [...formData.contacts]; c[index].department = e.target.value; setFormData({ ...formData, contacts: c }); }} />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">WhatsApp</label>
                          <input type="text" className="w-full mt-1 p-2 border border-slate-200 rounded-lg outline-none focus:border-[#BAD133]" value={contact.whatsapp || ""} onChange={(e) => { const c = [...formData.contacts]; c[index].whatsapp = e.target.value; setFormData({ ...formData, contacts: c }); }} />
                        </div>
                        <div className="col-span-2 grid grid-cols-3 gap-4 mt-2">
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Primary Contact?</label>
                            <select className="w-full mt-1 p-2 border border-slate-200 rounded-lg outline-none focus:border-[#BAD133]" value={contact.primary || "No"} onChange={(e) => { const c = [...formData.contacts]; c[index].primary = e.target.value; setFormData({ ...formData, contacts: c }); }}>
                              <option>Yes</option><option>No</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Preferred Contact</label>
                            <select className="w-full mt-1 p-2 border border-slate-200 rounded-lg outline-none focus:border-[#BAD133]" value={contact.method || "Email"} onChange={(e) => { const c = [...formData.contacts]; c[index].method = e.target.value; setFormData({ ...formData, contacts: c }); }}>
                              <option>Email</option><option>Phone</option><option>WhatsApp</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                            <select className="w-full mt-1 p-2 border border-slate-200 rounded-lg outline-none focus:border-[#BAD133]" value={contact.status || "Active"} onChange={(e) => { const c = [...formData.contacts]; c[index].status = e.target.value; setFormData({ ...formData, contacts: c }); }}>
                              <option>Active</option><option>Inactive</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={handleAddContact}
                    className="w-full py-4 border-2 border-dashed border-[#BAD133] rounded-xl text-[#282860] font-bold hover:bg-[#BAD133]/10 transition-colors flex items-center justify-center gap-2">
                    <Plus size={18} /> Add Contact Person
                  </button>
                </div>
              )}

{/* TAB D: COMMISSION PROGRAMS */}
              {modalTab === 'programs' && (
                <div className="space-y-4">
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-purple-100 text-purple-700 p-2 rounded-lg"><Percent size={18}/></div>
                      <h3 className="font-black text-purple-900 text-lg">Per-Program Commission Structure</h3>
                    </div>
                    <p className="text-xs text-purple-700">
                      Break down commission rates by program type. Different programs may have different 1st Semester / 2nd Semester percentages, or fixed flat fees with their own currency (Partial Service).
                    </p>
                  </div>

                  {formData.commission_programs.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center">
                      <Percent size={48} className="text-slate-300 mx-auto mb-4"/>
                      <p className="text-slate-500 font-bold mb-2">No commission programs defined yet.</p>
                      <p className="text-xs text-slate-400 mb-6">Add programs manually or use AI Auto-Fill to extract from the agreement PDF.</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3 text-left">Program Name</th>
                            <th className="px-4 py-3 text-center w-28">1st Semester %</th>
                            <th className="px-4 py-3 text-center w-28">2nd Semester %</th>
                            <th className="px-4 py-3 text-center w-44">Flat Fee</th>
                            <th className="px-4 py-3 text-left">Notes</th>
                            <th className="px-2 py-3 w-12"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {formData.commission_programs.map((prog, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  placeholder="e.g. Bachelor / Masters / PhD"
                                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold text-[#282860] outline-none focus:border-purple-400"
                                  value={prog.program_name}
                                  onChange={(e) => handleUpdateProgram(idx, "program_name", e.target.value)}
                                />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  type="number"
                                  step="0.5"
                                  placeholder="00"
                                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-center font-mono outline-none focus:border-purple-400"
                                  value={prog.part1_pct ?? ""}
                                  onChange={(e) => handleUpdateProgram(idx, "part1_pct", e.target.value)}
                                />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  type="number"
                                  step="0.5"
                                  placeholder="00"
                                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-center font-mono outline-none focus:border-purple-400"
                                  value={prog.part2_pct ?? ""}
                                  onChange={(e) => handleUpdateProgram(idx, "part2_pct", e.target.value)}
                                />
                              </td>
                              <td className="px-2 py-2">
                                <div className="flex gap-1">
                                  <select
                                    className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-bold bg-white outline-none focus:border-purple-400 cursor-pointer"
                                    value={prog.partial_service_currency || "USD"}
                                    onChange={(e) => handleUpdateProgram(idx, "partial_service_currency", e.target.value)}
                                    title="Currency"
                                  >
                                    <option value="USD">USD</option>
                                    <option value="AUD">AUD</option>
                                    <option value="GBP">GBP</option>
                                    <option value="EUR">EUR</option>
                                    <option value="CAD">CAD</option>
                                    <option value="NZD">NZD</option>
                                    <option value="SGD">SGD</option>
                                    <option value="CHF">CHF</option>
                                    <option value="CNY">CNY</option>
                                    <option value="MYR">MYR</option>
                                    <option value="IDR">IDR</option>
                                  </select>
                                  <input
                                    type="number"
                                    step="100"
                                    placeholder="0000"
                                    className="flex-1 min-w-0 px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-center font-mono outline-none focus:border-purple-400"
                                    value={prog.partial_service_fee ?? ""}
                                    onChange={(e) => handleUpdateProgram(idx, "partial_service_fee", e.target.value)}
                                  />
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  placeholder="Per semester after Census Date..."
                                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-purple-400"
                                  value={prog.notes}
                                  onChange={(e) => handleUpdateProgram(idx, "notes", e.target.value)}
                                />
                              </td>
                              <td className="px-2 py-2 text-center">
                                <button
                                  onClick={() => handleRemoveProgram(idx)}
                                  className="text-red-400 hover:text-white hover:bg-red-500 p-1.5 rounded-lg border border-red-100 bg-red-50 transition-colors"
                                  title="Remove program"
                                >
                                  <Trash2 size={14}/>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <button
                    onClick={handleAddProgram}
                    className="w-full py-4 border-2 border-dashed border-purple-400 rounded-xl text-purple-700 font-bold hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus size={18} /> Add Program Row
                  </button>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600">
                    <p className="font-bold text-[#282860] mb-2">💡 How to fill this:</p>
                    <ul className="space-y-1 list-disc list-inside">
                      <li><strong>Percentage programs:</strong> Fill 1st Semester % and/or 2nd Semester % (leave Flat Fee as 0000)</li>
                      <li><strong>Flat fee programs</strong> (e.g. MChD AUD 2,500/sem): Pick currency, fill Flat Fee, leave semester %s as 00</li>
                      <li><strong>Single-payment programs:</strong> Fill only 1st Semester %, leave 2nd Semester as 00</li>
                      <li><strong>"00" / "0000" placeholder</strong> means "not yet filled" — clear it and type the actual number</li>
                      <li><strong>Currency matters:</strong> the AI uses it for accurate calculations regardless of the school's country</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* TAB E: PER-STUDENT COMMISSION CALCULATOR */}
              {modalTab === 'commission' && (
                <div className="space-y-6">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                    <h3 className="font-black text-green-800 text-lg flex items-center gap-2 mb-4">
                      <Calculator/> Per-Student Commission Calculator
                    </h3>
                    <p className="text-xs text-green-700 mb-4">
                      Select a program, enter the student's tuition, and the system auto-calculates your commission based on the program's rules.
                    </p>

                    {formData.commission_programs.length === 0 ? (
                      <div className="bg-white border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                        <AlertCircle size={20} className="text-amber-500 shrink-0"/>
                        <div>
                          <p className="text-sm font-bold text-amber-700">No programs defined yet</p>
                          <p className="text-xs text-amber-600">Go to the <strong>D. Programs</strong> tab first to define commission rates per program type.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs font-bold text-green-700 uppercase mb-1.5 block">Program</label>
                          <select
                            className="w-full p-3 border border-green-200 rounded-xl bg-white font-bold outline-none focus:border-green-400 text-sm"
                            value={calcProgramIdx ?? ""}
                            onChange={(e) => setCalcProgramIdx(e.target.value === "" ? null : Number(e.target.value))}
                          >
                            <option value="">-- Select program --</option>
                            {formData.commission_programs.map((p, i) => (
                              <option key={i} value={i}>{p.program_name || `Program ${i + 1}`}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-green-700 uppercase mb-1.5 block">Tuition / Semester</label>
                          <input
                            type="number"
                            placeholder="30000"
                            className="w-full p-3 border border-green-200 rounded-xl bg-white outline-none focus:border-green-400 font-mono"
                            value={calcTuition}
                            onChange={(e) => setCalcTuition(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-green-700 uppercase mb-1.5 block"># Semesters</label>
                          <input
                            type="number"
                            min="1"
                            className="w-full p-3 border border-green-200 rounded-xl bg-white outline-none focus:border-green-400 font-mono"
                            value={calcSemesters}
                            onChange={(e) => setCalcSemesters(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* CALCULATION RESULT */}
                  {selectedProgram && (
                    <div className="bg-white border-2 border-green-500 rounded-2xl p-6 shadow-lg">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Estimated Commission</p>
                      <p className="text-5xl font-black text-green-600 mb-4">
                        ${calcResult.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Calculation Breakdown</p>
                        <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono">{calcResult.breakdown}</pre>
                        {selectedProgram.notes && (
                          <p className="text-[11px] text-slate-500 italic mt-3 border-t border-slate-200 pt-2">
                            📌 {selectedProgram.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* MANUAL ENTRY for tracking actual paid commission */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6">
                    <h4 className="font-bold text-[#282860] mb-4 flex items-center gap-2"><DollarSign size={18}/> Track Actual Commission Earned</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Total Referrals (Period)</label>
                        <input type="number" className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-[#BAD133]" value={formData.total_referrals} onChange={e => setFormData({ ...formData, total_referrals: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Enrolled / Confirmed</label>
                        <input type="number" className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-[#BAD133]" value={formData.total_enrollment} onChange={e => setFormData({ ...formData, total_enrollment: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Total Payable (USD)</label>
                        <input type="text" className="w-full mt-1 p-3 border-2 border-[#282860] rounded-xl font-black text-lg text-green-600 outline-none" value={formData.total_payable} onChange={e => setFormData({ ...formData, total_payable: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                        <select className="w-full mt-1 p-3 border border-slate-200 rounded-xl font-bold outline-none focus:border-[#BAD133]" value={formData.comm_status} onChange={e => setFormData({ ...formData, comm_status: e.target.value })}>
                          <option>Pending</option><option>Approved</option><option>Paid</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Notes / Adjustments</label>
                        <textarea rows={2} className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-[#BAD133]" value={formData.calc_notes} onChange={e => setFormData({ ...formData, calc_notes: e.target.value })} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-200 bg-white flex justify-end gap-3 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] shrink-0">
              <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-2.5 text-slate-500 font-bold text-sm hover:text-slate-800 transition-colors">Cancel</button>
              <button onClick={handleSaveInstitution} className="bg-[#282860] hover:bg-[#1b1b42] active:scale-95 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all">Save Institution Data</button>
            </div>

          </div>
        </div>
      )}
      {/* ADD AGREEMENT PICKER MODAL */}
      {isAddAgreementOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 bg-[#f8fafc] flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-[#282860] flex items-center gap-2">
                  <Plus size={22} className="text-[#BAD133]"/> New Agreement
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {agreementMode === "choose" && "How do you want to add this agreement?"}
                  {agreementMode === "file" && "Upload a signed agreement file"}
                  {agreementMode === "link" && "Paste a link to the agreement document"}
                </p>
              </div>
              <button onClick={closeAgreementModal} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                <X size={20}/>
              </button>
            </div>

            {/* CHOOSE MODE */}
            {agreementMode === "choose" && (
              <div className="p-6 grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setAgreementMode("file")}
                  className="p-6 rounded-2xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-left group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <UploadCloud size={28}/>
                  </div>
                  <h3 className="font-black text-[#282860] text-lg mb-1">Upload File</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Upload a PDF, image, or document. Stored securely in our vault.
                  </p>
                  <p className="text-[10px] text-slate-400 mt-3 font-bold">PDF · DOC · DOCX · PNG · JPG · max 20MB</p>
                </button>
                
                <button
                  type="button"
                  onClick={() => setAgreementMode("link")}
                  className="p-6 rounded-2xl border-2 border-slate-200 hover:border-purple-400 hover:bg-purple-50 transition-all text-left group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Link2 size={28}/>
                  </div>
                  <h3 className="font-black text-[#282860] text-lg mb-1">Paste Link</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Link to a Google Drive, Dropbox, or any external document URL.
                  </p>
                  <p className="text-[10px] text-slate-400 mt-3 font-bold">Drive · Dropbox · OneDrive · any URL</p>
                </button>
              </div>
            )}

            {/* FILE UPLOAD MODE */}
            {agreementMode === "file" && (
              <div className="p-6">
                <button
                  type="button"
                  onClick={() => setAgreementMode("choose")}
                  className="text-xs font-bold text-slate-500 hover:text-[#282860] mb-4 flex items-center gap-1"
                >
                  ← Back to options
                </button>
                
                {isUploadingAgreement ? (
                  <div className="p-12 text-center">
                    <Loader2 size={32} className="animate-spin text-blue-500 mx-auto mb-3"/>
                    <p className="text-sm font-bold text-[#282860]">Uploading agreement...</p>
                  </div>
                ) : (
                  <label className="block border-2 border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50 rounded-2xl p-12 text-center cursor-pointer transition-all">
                    <UploadCloud size={40} className="text-blue-500 mx-auto mb-3"/>
                    <p className="text-sm font-black text-[#282860] mb-1">Click to choose a file</p>
                    <p className="text-xs text-slate-500">PDF, DOC, DOCX, PNG, JPG · Max 20MB</p>
                    <input 
                      ref={agreementFileInputRef}
                      type="file" 
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleAddAgreementFile(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            )}

            {/* LINK MODE */}
            {agreementMode === "link" && (
              <div className="p-6 space-y-4">
                <button
                  type="button"
                  onClick={() => setAgreementMode("choose")}
                  className="text-xs font-bold text-slate-500 hover:text-[#282860] flex items-center gap-1"
                >
                  ← Back to options
                </button>
                
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                    Document Name <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MOU - Penabur University 2024"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all"
                    value={agreementLinkName}
                    onChange={(e) => setAgreementLinkName(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                    Agreement URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/file/d/..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all font-mono"
                    value={agreementLinkUrl}
                    onChange={(e) => setAgreementLinkUrl(e.target.value)}
                    autoFocus
                  />
                  <p className="text-[10px] text-slate-400 mt-1.5">Make sure the link is shareable (view access for anyone with the link).</p>
                </div>
                
                <div className="pt-2 flex justify-end gap-3">
                  <button 
                    onClick={closeAgreementModal}
                    type="button"
                    className="px-5 py-2.5 text-slate-500 font-bold text-sm hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddAgreementLink}
                    disabled={!agreementLinkUrl.trim() || isUploadingAgreement}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-2.5 rounded-xl transition-all disabled:opacity-50 shadow-md flex items-center gap-2"
                  >
                    {isUploadingAgreement 
                      ? <><Loader2 size={16} className="animate-spin"/> Adding...</>
                      : <><Link2 size={16}/> Add Link</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}