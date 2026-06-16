"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Building2, MapPin, DollarSign, UploadCloud, Plus, 
  Sparkles, X, Loader2, Trash2, Building, FileText, Phone, Calculator,
  Search, Filter, Globe, CheckCircle2, AlertCircle
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

export default function InstitutionPartners() {
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"profile" | "agreement" | "contacts" | "commission">("profile");
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  const emptyForm = {
    id: "",
    institution_name: "", institution_type: "University", country: "", website: "",
    student_intake: "", programs_offered: "", status: "Active",
    agreement_id: "", agreement_date: "", agreement_type: "Commission-based",
    base_commission: "", performance_bonus: "", tiered_levels: "",
    duration_start: "", duration_end: "", terms_conditions: "", document_link: "",
    contacts: [] as any[],
    total_referrals: "", total_enrollment: "", base_amount: "", calc_bonus: "",
    total_payable: "", comm_status: "Pending", payment_date: "", calc_notes: ""
  };

  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    fetchInstitutions();
  }, []);

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

  const handleSaveInstitution = async () => {
    try {
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
        agreement_date: formData.agreement_date || null,
        agreement_type: formData.agreement_type,
        base_commission: formData.base_commission,
        performance_bonus: formData.performance_bonus,
        tiered_levels: formData.tiered_levels,
        duration_start: formData.duration_start || null,
        duration_end: formData.duration_end || null,
        terms_conditions: formData.terms_conditions,
        document_link: formData.document_link,
        contacts: formData.contacts,
      };

      if (!isEditing) delete payload.id;

      const res = await fetch(url, {
        method,
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsEditModalOpen(false);
        fetchInstitutions();
      } else {
        const errorData = await res.json();
        alert(`Backend Error:\n\n${JSON.stringify(errorData.detail || errorData, null, 2)}`);
      }
    } catch (error) {
      alert("Network Error: Could not connect to the backend.");
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanning(true);
    try {
      const payload = new FormData();
      payload.append("contract", file);
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
          agreement_type: result.data.agreement_type || prev.agreement_type,
          base_commission: result.data.base_commission || prev.base_commission,
          performance_bonus: result.data.performance_bonus || prev.performance_bonus,
          tiered_levels: result.data.tiered_levels || prev.tiered_levels,
          duration_start: result.data.duration_start || prev.duration_start,
          duration_end: result.data.duration_end || prev.duration_end,
          terms_conditions: result.data.terms_conditions || prev.terms_conditions,
          contacts: result.data.contacts || prev.contacts,
        }));
        setScanSuccess(true);
        setTimeout(() => setScanSuccess(false), 3000);
      }
    } finally {
      setIsScanning(false);
    }
  };

  const filteredInstitutions = institutions.filter(inst => 
    (inst.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (inst.country || "").toLowerCase().includes(searchQuery.toLowerCase())
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
                <th className="px-5 py-4">Base Commission</th>
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
              ) : filteredInstitutions.map((inst) => (
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
                  <td className="px-5 py-4 font-bold text-emerald-600">{inst.base_commission ? `${inst.base_commission}%` : "-"}</td>
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
                          });
                          setIsEditModalOpen(true);
                          setModalTab("profile");
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MASTER EDIT MODAL --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">

            {/* Modal Header */}
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
                    <div className="bg-red-100 text-red-600 p-1.5 rounded-lg">
                      <AlertCircle size={18}/>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-red-700">⚠️ This agreement has expired</p>
                      <p className="text-xs text-red-600">End date: {formData.duration_end} ({exp.label}). Renew before continuing to refer students.</p>
                    </div>
                  </div>
                );
              }
              if (exp.status === "expiring") {
                return (
                  <div className="bg-amber-50 border-b-2 border-amber-200 px-6 py-3 flex items-center gap-3 shrink-0">
                    <div className="bg-amber-100 text-amber-600 p-1.5 rounded-lg">
                      <AlertCircle size={18}/>
                    </div>
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
                  <p className="text-xs text-slate-500">Upload a PDF agreement to extract terms instantly.</p>
                </div>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf" className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning}
                className="bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-600 hover:text-white px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isScanning ? <><Loader2 size={16} className="animate-spin" /> Scanning...</> : <><UploadCloud size={16} /> Upload PDF</>}
              </button>
            </div>
            {scanSuccess && (
              <div className="bg-green-50 text-green-700 p-2 text-center text-xs font-bold border-b border-green-100 shrink-0">
                ✅ AI successfully extracted contract data!
              </div>
            )}

            {/* Modal Tabs */}
            <div className="flex bg-[#f8fafc] border-b border-slate-200 px-6 overflow-x-auto shrink-0">
              <button onClick={() => setModalTab('profile')} className={`px-4 py-4 text-sm font-bold tracking-wider whitespace-nowrap transition-colors flex items-center gap-2 ${modalTab === 'profile' ? 'border-b-2 border-[#282860] text-[#282860]' : 'text-slate-400'}`}><Building size={16} /> A. Profile</button>
              <button onClick={() => setModalTab('agreement')} className={`px-4 py-4 text-sm font-bold tracking-wider whitespace-nowrap transition-colors flex items-center gap-2 ${modalTab === 'agreement' ? 'border-b-2 border-[#282860] text-[#282860]' : 'text-slate-400'}`}><FileText size={16} /> B. Agreement</button>
              <button onClick={() => setModalTab('contacts')} className={`px-4 py-4 text-sm font-bold tracking-wider whitespace-nowrap transition-colors flex items-center gap-2 ${modalTab === 'contacts' ? 'border-b-2 border-[#282860] text-[#282860]' : 'text-slate-400'}`}><Phone size={16} /> C. Contacts</button>
              <button onClick={() => setModalTab('commission')} className={`px-4 py-4 text-sm font-bold tracking-wider whitespace-nowrap transition-colors flex items-center gap-2 ${modalTab === 'commission' ? 'border-b-2 border-green-600 text-green-700' : 'text-slate-400'}`}><Calculator size={16} /> D. Calculations</button>
            </div>

            {/* Modal Content */}
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
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Programs Offered</label>
                    <textarea rows={3} className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-[#BAD133]" value={formData.programs_offered} onChange={e => setFormData({ ...formData, programs_offered: e.target.value })} />
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
                      <option>Commission-based</option><option>Fixed Fee</option><option>Tiered</option>
                    </select>
                  </div>
                  <div className="col-span-2 grid grid-cols-3 gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <div className="col-span-3 pb-2 border-b text-xs font-bold text-[#282860]">Commission Structure</div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Base Commission %</label>
                      <input type="text" className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-[#BAD133]" placeholder="e.g. 5%" value={formData.base_commission} onChange={e => setFormData({ ...formData, base_commission: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Performance Bonus %</label>
                      <input type="text" className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-[#BAD133]" value={formData.performance_bonus} onChange={e => setFormData({ ...formData, performance_bonus: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Tiered Levels</label>
                      <input type="text" className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-[#BAD133]" value={formData.tiered_levels} onChange={e => setFormData({ ...formData, tiered_levels: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Duration Start</label>
                    <input type="date" className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-[#BAD133]" value={formData.duration_start} onChange={e => setFormData({ ...formData, duration_start: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Duration End</label>
                    <input type="date" className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-[#BAD133]" value={formData.duration_end} onChange={e => setFormData({ ...formData, duration_end: e.target.value })} />
                  </div>
                  
                  {/* MoU UPLOAD SECTION - moved from top button */}
                  <div className="col-span-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-dashed border-blue-200 p-5 rounded-2xl">
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div>
                        <h4 className="text-sm font-black text-[#282860] flex items-center gap-2">
                          <UploadCloud size={16} className="text-blue-600"/> Signed MoU Document
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">Upload the signed agreement PDF or paste a Drive/Dropbox link.</p>
                      </div>
                      {formData.document_link && (
                        <a 
                          href={formData.document_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="bg-white hover:bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 shrink-0"
                        >
                          <FileText size={14}/> View Current PDF
                        </a>
                      )}
                    </div>
                    <label className="block">
                      <span className="text-xs font-bold text-slate-500 uppercase">Document Link / URL</span>
                      <input 
                        type="url" 
                        className="w-full mt-1 p-3 border border-slate-200 rounded-xl text-blue-600 bg-white outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" 
                        placeholder="https://drive.google.com/... or paste any document URL" 
                        value={formData.document_link} 
                        onChange={e => setFormData({ ...formData, document_link: e.target.value })} 
                      />
                    </label>
                    <p className="text-[10px] text-slate-400 mt-2 italic">
                      💡 For now: upload your PDF to Google Drive / Dropbox and paste the share link here. Direct PDF upload to vault coming soon.
                    </p>
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
                  {formData.contacts.map((contact, index) => (
                    <div key={contact.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative">
                      <button
                        onClick={() => handleRemoveContact(index)}
                        className="absolute top-4 right-4 text-red-400 hover:text-red-600 p-1 bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                      <h3 className="font-bold text-[#282860] mb-4 border-b pb-2">
                        Contact Person {index + 1}
                        <span className="text-xs font-mono text-slate-400 ml-2">({contact.id})</span>
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                          <input type="text" className="w-full mt-1 p-2 border border-slate-200 rounded-lg outline-none focus:border-[#BAD133]" value={contact.full_name} onChange={(e) => { const c = [...formData.contacts]; c[index].full_name = e.target.value; setFormData({ ...formData, contacts: c }); }} />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Title/Position</label>
                          <input type="text" className="w-full mt-1 p-2 border border-slate-200 rounded-lg outline-none focus:border-[#BAD133]" value={contact.title} onChange={(e) => { const c = [...formData.contacts]; c[index].title = e.target.value; setFormData({ ...formData, contacts: c }); }} />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
                          <input type="email" className="w-full mt-1 p-2 border border-slate-200 rounded-lg outline-none focus:border-[#BAD133]" value={contact.email} onChange={(e) => { const c = [...formData.contacts]; c[index].email = e.target.value; setFormData({ ...formData, contacts: c }); }} />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Mobile Number</label>
                          <input type="text" className="w-full mt-1 p-2 border border-slate-200 rounded-lg outline-none focus:border-[#BAD133]" value={contact.mobile} onChange={(e) => { const c = [...formData.contacts]; c[index].mobile = e.target.value; setFormData({ ...formData, contacts: c }); }} />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Department</label>
                          <input type="text" className="w-full mt-1 p-2 border border-slate-200 rounded-lg outline-none focus:border-[#BAD133]" value={contact.department} onChange={(e) => { const c = [...formData.contacts]; c[index].department = e.target.value; setFormData({ ...formData, contacts: c }); }} />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">WhatsApp/WeChat</label>
                          <input type="text" className="w-full mt-1 p-2 border border-slate-200 rounded-lg outline-none focus:border-[#BAD133]" value={contact.whatsapp} onChange={(e) => { const c = [...formData.contacts]; c[index].whatsapp = e.target.value; setFormData({ ...formData, contacts: c }); }} />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs font-bold text-slate-500 uppercase">Office Address</label>
                          <textarea rows={2} className="w-full mt-1 p-2 border border-slate-200 rounded-lg outline-none focus:border-[#BAD133]" value={contact.office_address} onChange={(e) => { const c = [...formData.contacts]; c[index].office_address = e.target.value; setFormData({ ...formData, contacts: c }); }} />
                        </div>
                        <div className="col-span-2 grid grid-cols-3 gap-4 mt-2">
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Preferred Contact</label>
                            <select className="w-full mt-1 p-2 border border-slate-200 rounded-lg outline-none focus:border-[#BAD133]" value={contact.method} onChange={(e) => { const c = [...formData.contacts]; c[index].method = e.target.value; setFormData({ ...formData, contacts: c }); }}>
                              <option>Email</option><option>Phone</option><option>WhatsApp</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Primary Contact?</label>
                            <select className="w-full mt-1 p-2 border border-slate-200 rounded-lg outline-none focus:border-[#BAD133]" value={contact.primary} onChange={(e) => { const c = [...formData.contacts]; c[index].primary = e.target.value; setFormData({ ...formData, contacts: c }); }}>
                              <option>Yes</option><option>No</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                            <select className="w-full mt-1 p-2 border border-slate-200 rounded-lg outline-none focus:border-[#BAD133]" value={contact.status} onChange={(e) => { const c = [...formData.contacts]; c[index].status = e.target.value; setFormData({ ...formData, contacts: c }); }}>
                              <option>Active</option><option>Inactive</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={handleAddContact}
                    className="w-full py-4 border-2 border-dashed border-[#BAD133] rounded-xl text-[#282860] font-bold hover:bg-[#BAD133]/10 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus size={18} /> Add Contact Person
                  </button>
                </div>
              )}

              {/* TAB D: COMMISSION CALCULATION */}
              {modalTab === 'commission' && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2 bg-green-50 border border-green-200 rounded-xl p-6 mb-2 shadow-sm">
                    <h3 className="font-black text-green-800 text-lg flex items-center gap-2 mb-4"><Calculator /> Calculation Overview</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-bold text-green-700 uppercase">Total Referrals (Period)</label>
                        <input type="number" className="w-full mt-1 p-3 border border-green-200 rounded-xl bg-white outline-none focus:border-green-400" value={formData.total_referrals} onChange={e => setFormData({ ...formData, total_referrals: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-green-700 uppercase">Enrollment Confirmed</label>
                        <input type="number" className="w-full mt-1 p-3 border border-green-200 rounded-xl bg-white outline-none focus:border-green-400" value={formData.total_enrollment} onChange={e => setFormData({ ...formData, total_enrollment: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-green-700 uppercase">Commission Status</label>
                        <select className="w-full mt-1 p-3 border border-green-200 rounded-xl bg-white font-bold outline-none focus:border-green-400" value={formData.comm_status} onChange={e => setFormData({ ...formData, comm_status: e.target.value })}>
                          <option>Pending</option><option>Approved</option><option>Paid</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Base Commission Amount</label>
                    <input type="text" className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-[#BAD133]" placeholder="$" value={formData.base_amount} onChange={e => setFormData({ ...formData, base_amount: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Performance Bonus (%)</label>
                    <input type="text" className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-[#BAD133]" value={formData.calc_bonus} onChange={e => setFormData({ ...formData, calc_bonus: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Payment Date</label>
                    <input type="date" className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-[#BAD133]" value={formData.payment_date} onChange={e => setFormData({ ...formData, payment_date: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#282860] uppercase">Total Commission Payable</label>
                    <input type="text" className="w-full mt-1 p-3 border-2 border-[#282860] rounded-xl font-black text-xl text-green-600 bg-white outline-none" placeholder="$" value={formData.total_payable} onChange={e => setFormData({ ...formData, total_payable: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Notes / Adjustments</label>
                    <textarea rows={3} className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-[#BAD133]" value={formData.calc_notes} onChange={e => setFormData({ ...formData, calc_notes: e.target.value })} />
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-200 bg-white flex justify-end gap-3 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] shrink-0">
              <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-2.5 text-slate-500 font-bold text-sm hover:text-slate-800 transition-colors">Cancel</button>
              <button onClick={handleSaveInstitution} className="bg-[#282860] hover:bg-[#1b1b42] active:scale-95 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all">Save Institution Data</button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}