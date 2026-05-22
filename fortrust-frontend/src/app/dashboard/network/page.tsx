"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Building2, MapPin, DollarSign, UploadCloud, Search, Plus, 
  Settings, Sparkles, CheckCircle, Clock, X, FileText,
  UserCircle, ChevronRight, Loader2, Building, Trash2 
} from "lucide-react";

export default function NetworkDirectory() {
  const [activeTab, setActiveTab] = useState<"directory" | "claimed">("directory");
  
  // Real Data States
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [completedStudents, setCompletedStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"profile" | "terms" | "commission" | "contacts">("profile");
  
  // Payout Drill-Down State
  const [selectedPayout, setSelectedPayout] = useState<any>(null);
  
  // AI Scanner States
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Empty Form State for New/Editing
  const [formData, setFormData] = useState({
    id: "",
    institution_name: "",
    institution_type: "University",
    country: "",
    website: "",
    status: "Active",
    agreement_id: "",
    agreement_date: "",
    duration_start: "",
    duration_end: "",
    terms_conditions: "",
    agreement_type: "Tiered",
    base_commission: "",
    performance_bonus: "",
    tiered_levels: "",
    contacts: [] as any[],
  });

  useEffect(() => {
    fetchNetworkData();
  }, []);

  const fetchNetworkData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("fortrust_token");
      
      // Fetch Institutions AND Completed Students for the Ledger
      const [instRes, studentsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/institutions`, { headers: { "Authorization": `Bearer ${token}` } }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline?role=MASTER_ADMIN`, { headers: { "Authorization": `Bearer ${token}` } })
      ]);

      const instData = await instRes.json();
      const studentsData = await studentsRes.json();

      if (instData.status === "success") setInstitutions(instData.data || []);
      if (studentsData.status === "success") {
        // Only keep students who have completed and paid
        const closedDeals = studentsData.data.filter((s: any) => s.status?.toUpperCase() === "COMPLETED");
        setCompletedStudents(closedDeals);
      }
    } catch (error) {
      console.error("Failed to fetch network data", error);
    } finally {
      setLoading(false);
    }
  };

  // --- NEW: Save Institution Logic ---
  const handleSaveInstitution = async () => {
    try {
      const token = localStorage.getItem("fortrust_token");
      const isEditing = !!formData.id;
      const url = isEditing 
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/institutions/${formData.id}` 
        : `${process.env.NEXT_PUBLIC_API_URL}/api/institutions`;
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setIsEditModalOpen(false);
        fetchNetworkData(); // Refresh the table
      } else {
        alert("Failed to save the institution. Check backend connection.");
      }
    } catch (error) {
      alert("Network Error.");
    }
  };

  // --- NEW: Delete Institution Logic ---
  const handleDeleteInstitution = async (id: string) => {
    if (!window.confirm("Are you absolutely sure you want to delete this institution? This cannot be undone.")) return;
    
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/institutions/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        fetchNetworkData(); // Refresh the table
      } else {
        alert("Failed to delete the institution.");
      }
    } catch (error) {
      alert("Network Error.");
    }
  };

  const openNewInstitution = () => {
    setFormData({
      id: "", institution_name: "", institution_type: "University", country: "", website: "", status: "Active",
      agreement_id: `AGR-${Date.now()}`, agreement_date: "", duration_start: "", duration_end: "", terms_conditions: "",
      agreement_type: "Tiered", base_commission: "", performance_bonus: "", tiered_levels: "", contacts: []
    });
    setIsEditModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanSuccess(false);

    try {
      const payload = new FormData();
      payload.append("contract", file);
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/extract-commission`, {
        method: "POST", headers: { "Authorization": `Bearer ${token}` }, body: payload
      });

      const result = await res.json();
      if (result.status === "success" && result.data.is_valid) {
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
          contacts: result.data.contacts?.length > 0 ? result.data.contacts : prev.contacts
        }));
        setScanSuccess(true);
        setTimeout(() => setScanSuccess(false), 4000);
      } else {
        alert("AI could not detect a valid contract.");
      }
    } catch (err) {
      alert("AI Scanning failed.");
    } finally {
      setIsScanning(false);
    }
  };

  // Group completed students by institution for the ledger
  const payoutsByInstitution = institutions.map(inst => {
    const studentsForInst = completedStudents.filter(s => s.institution_id === inst.id);
    const totalClaimed = studentsForInst.reduce((sum, s) => sum + (parseFloat(s.commission_earned) || 0), 0);
    return { ...inst, students: studentsForInst, totalClaimed };
  }).filter(inst => inst.totalClaimed > 0);

  const grandTotalClaimed = payoutsByInstitution.reduce((sum, inst) => sum + inst.totalClaimed, 0);

  return (
    <div className="p-4 lg:p-8 max-w-[1400px] mx-auto w-full relative">
      
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#282860] flex items-center gap-3">
            <Building2 className="text-[#BAD133]" size={36} />
            Network Directory
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Manage university partnerships and track commission agreements.</p>
        </div>
        <button 
          onClick={openNewInstitution}
          className="bg-[#282860] hover:bg-[#1b1b42] text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-md flex items-center gap-2"
        >
          <Plus size={18} /> Add Institution
        </button>
      </div>

      {/* TAB SWITCHER */}
      <div className="flex gap-8 border-b border-slate-200 mb-8 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('directory')} 
          className={`pb-3 font-bold text-sm tracking-wider uppercase whitespace-nowrap transition-colors ${activeTab === 'directory' ? 'text-[#282860] border-b-2 border-[#282860]' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Active Institutions
        </button>
        <button 
          onClick={() => setActiveTab('claimed')} 
          className={`pb-3 font-bold text-sm tracking-wider uppercase whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'claimed' ? 'text-[#282860] border-b-2 border-[#282860]' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Claimed Commission Ledger
        </button>
      </div>

      {loading ? (
        <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-[#BAD133]" size={40}/></div>
      ) : (
        <>
          {/* DIRECTORY VIEW */}
          {activeTab === 'directory' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="relative w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input type="text" placeholder="Search institutions..." className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#282860]" />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                  <thead className="bg-[#f8fafc] text-[#64748b] text-[10px] uppercase tracking-widest border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-4">Institution</th>
                      <th className="px-5 py-4">Region</th>
                      <th className="px-5 py-4">Base Comm.</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {institutions.length === 0 ? (
                      <tr><td colSpan={5} className="p-8 text-center text-slate-500">No institutions added yet. Click "Add Institution".</td></tr>
                    ) : institutions.map((inst) => (
                      <tr key={inst.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-black">{inst.name.charAt(0)}</div>
                          <div>
                            <p className="font-bold text-[#282860]">{inst.name}</p>
                            <p className="text-[11px] text-slate-400">{inst.website}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-600 font-medium flex items-center gap-1"><MapPin size={14}/> {inst.country}</td>
                        <td className="px-5 py-4 font-bold text-green-600">{inst.base_commission || "-"}</td>
                        <td className="px-5 py-4"><span className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-[10px] font-bold uppercase">{inst.status || "ACTIVE"}</span></td>
                        <td className="px-5 py-4 flex justify-end gap-2">
                          <button 
                            onClick={() => { setFormData(inst); setIsEditModalOpen(true); }} 
                            className="text-[#BAD133] hover:text-[#9bb029] font-bold text-xs uppercase tracking-wider bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteInstitution(inst.id)} 
                            className="text-red-400 hover:text-white hover:bg-red-500 bg-red-50 px-2 py-1.5 rounded-lg border border-red-100 transition-colors"
                            title="Delete Institution"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CLAIMED HISTORY VIEW */}
          {activeTab === 'claimed' && (
            <div className="flex gap-6">
              {/* Main Ledger Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1">
                <div className="p-6 border-b border-slate-100 bg-[#f8fafc] flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold text-[#282860]">Commission Payout Ledger</h2>
                    <p className="text-xs text-slate-500">Historical record grouped by institution.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Claimed (Global)</p>
                    <p className="text-2xl font-black text-green-600">${grandTotalClaimed.toLocaleString()}</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-white text-[#64748b] text-[10px] uppercase tracking-widest border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-4">Institution</th>
                        <th className="px-5 py-4 text-center">Total Students</th>
                        <th className="px-5 py-4 text-right">Total Payout</th>
                        <th className="px-5 py-4 text-center">Details</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-100">
                      {payoutsByInstitution.length === 0 ? (
                        <tr><td colSpan={4} className="p-8 text-center text-slate-500">No paid commissions recorded yet.</td></tr>
                      ) : payoutsByInstitution.map((inst) => (
                        <tr key={inst.id} className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => setSelectedPayout(inst)}>
                          <td className="px-5 py-4 font-bold text-[#282860] flex items-center gap-2"><Building size={16} className="text-slate-400"/> {inst.name}</td>
                          <td className="px-5 py-4 text-center font-bold text-slate-600 bg-slate-50">{inst.students.length}</td>
                          <td className="px-5 py-4 font-black text-green-600 text-right">${inst.totalClaimed.toLocaleString()}</td>
                          <td className="px-5 py-4 text-center">
                            <button className="text-[#BAD133] group-hover:text-white group-hover:bg-[#BAD133] border border-[#BAD133] rounded-full p-1 transition-colors mx-auto block"><ChevronRight size={18}/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SLIDE-OUT: Students Detail Panel */}
              {selectedPayout && (
                <div className="w-[400px] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col animate-in slide-in-from-right-8 shrink-0">
                  <div className="p-5 border-b border-slate-100 bg-[#1b1b42] text-white flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#BAD133]">Payout Details</p>
                      <h3 className="font-bold text-lg">{selectedPayout.name}</h3>
                    </div>
                    <button onClick={() => setSelectedPayout(null)} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={20}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50">
                    {selectedPayout.students.map((student: any) => (
                      <div key={student.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                        <div>
                          <p className="font-bold text-[#282860]">{student.name}</p>
                          <p className="text-xs text-slate-500 mt-1">Closed by: <span className="font-bold">{student.assignee}</span></p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400 uppercase font-bold tracking-widest mb-1">Generated</p>
                          <p className="font-black text-green-600">${parseFloat(student.commission_earned).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* --- RESTRUCTURED EDIT MODAL --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-[#1b1b42] text-white">
              <div>
                <h2 className="text-2xl font-black flex items-center gap-2">
                  <Building2 className="text-[#BAD133]" /> {formData.institution_name || "New Institution"}
                </h2>
                <p className="text-slate-300 text-sm mt-1">Master Agreement & Contact Profile</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white transition-colors bg-white/10 p-2 rounded-full"><X size={24} /></button>
            </div>

            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 border-b border-indigo-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><Sparkles size={20}/></div>
                <div>
                  <p className="text-sm font-bold text-[#282860]">AI Contract Auto-Fill</p>
                  <p className="text-xs text-slate-500">Upload a PDF agreement to extract terms instantly.</p>
                </div>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf" className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} disabled={isScanning} className="bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-600 hover:text-white px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50">
                {isScanning ? <><Loader2 size={16} className="animate-spin" /> Scanning...</> : <><UploadCloud size={16} /> Upload PDF</>}
              </button>
            </div>

            {scanSuccess && <div className="bg-green-50 text-green-700 p-2 text-center text-xs font-bold border-b border-green-100">✅ AI successfully extracted contract data!</div>}

            <div className="flex bg-[#f8fafc] border-b border-slate-200 px-6">
              <button onClick={() => setModalTab('profile')} className={`px-4 py-4 text-sm font-bold tracking-wider transition-colors ${modalTab === 'profile' ? 'border-b-2 border-[#282860] text-[#282860]' : 'text-slate-400 hover:text-slate-600'}`}>A. Profile</button>
              <button onClick={() => setModalTab('terms')} className={`px-4 py-4 text-sm font-bold tracking-wider transition-colors ${modalTab === 'terms' ? 'border-b-2 border-[#282860] text-[#282860]' : 'text-slate-400 hover:text-slate-600'}`}>B. Contract Terms</button>
              <button onClick={() => setModalTab('commission')} className={`px-4 py-4 text-sm font-bold tracking-wider transition-colors flex items-center gap-2 ${modalTab === 'commission' ? 'border-b-2 border-green-600 text-green-700' : 'text-slate-400 hover:text-slate-600'}`}><DollarSign size={14}/> C. Commission Structure</button>
              <button onClick={() => setModalTab('contacts')} className={`px-4 py-4 text-sm font-bold tracking-wider transition-colors ${modalTab === 'contacts' ? 'border-b-2 border-[#282860] text-[#282860]' : 'text-slate-400 hover:text-slate-600'}`}>D. Contacts</button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50">
              {modalTab === 'profile' && (
                <div className="grid grid-cols-2 gap-6 animate-in fade-in">
                  <div className="col-span-2"><label className="text-xs font-bold text-slate-500 uppercase">Institution Name</label><input type="text" className="w-full mt-1 p-3 border border-slate-200 rounded-xl font-bold text-[#282860]" value={formData.institution_name} onChange={e=>setFormData({...formData, institution_name: e.target.value})}/></div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase">Type</label><input type="text" className="w-full mt-1 p-3 border border-slate-200 rounded-xl" value={formData.institution_type} onChange={e=>setFormData({...formData, institution_type: e.target.value})}/></div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase">Country/Region</label><input type="text" className="w-full mt-1 p-3 border border-slate-200 rounded-xl" value={formData.country} onChange={e=>setFormData({...formData, country: e.target.value})}/></div>
                </div>
              )}
              {modalTab === 'terms' && (
                <div className="grid grid-cols-2 gap-6 animate-in fade-in">
                  <div className="col-span-2"><label className="text-xs font-bold text-slate-500 uppercase">Terms & Conditions</label><textarea rows={4} className="w-full mt-1 p-3 border border-slate-200 rounded-xl text-sm" value={formData.terms_conditions} onChange={e=>setFormData({...formData, terms_conditions: e.target.value})}></textarea></div>
                </div>
              )}
              {modalTab === 'commission' && (
                <div className="grid grid-cols-1 gap-6 animate-in fade-in">
                  <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                    <label className="text-xs font-black text-green-800 uppercase tracking-widest block mb-2">Base Commission Percentage</label>
                    <input type="text" className="w-full p-4 border-2 border-green-200 rounded-xl text-2xl font-black text-green-700 bg-white" placeholder="e.g. 10%" value={formData.base_commission} onChange={e=>setFormData({...formData, base_commission: e.target.value})}/>
                  </div>
                </div>
              )}
              {modalTab === 'contacts' && (
                <div className="space-y-4 animate-in fade-in">
                  <button className="w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-500 font-bold hover:bg-slate-100 hover:text-[#282860] transition-colors">+ Add Another Contact</button>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] z-10">
              <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-2.5 text-slate-500 font-bold text-sm hover:text-slate-800">Cancel</button>
              <button 
                onClick={handleSaveInstitution}
                className="bg-[#282860] hover:bg-[#1b1b42] text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-md transition-colors"
              >
                Save Master Agreement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}