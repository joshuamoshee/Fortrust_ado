"use client";

import { useState, useRef } from "react";
import { 
  Building2, MapPin, DollarSign, UploadCloud, Search, Plus, 
  Settings, Sparkles, CheckCircle, Clock, X, FileText,
  UserCircle, Loader2 
} from "lucide-react";

export default function NetworkDirectory() {
  const [activeTab, setActiveTab] = useState<"directory" | "claimed">("directory");
  
  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  // THE NEW, CLEANER TABS
  const [modalTab, setModalTab] = useState<"profile" | "terms" | "commission" | "contacts">("profile");
  
  // AI Scanner States
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    institution_name: "Monash University",
    institution_type: "University",
    country: "Australia",
    website: "monash.edu",
    status: "Active",
    agreement_id: "MON-2026-001",
    agreement_date: "2024-01-15",
    duration_start: "2024-01-01",
    duration_end: "2027-12-31",
    terms_conditions: "Standard 30-day payout terms.",
    agreement_type: "Tiered",
    base_commission: "10%",
    performance_bonus: "2% if > 50 students",
    tiered_levels: "10% base, 12.5% silver, 15% gold",
    contacts: [
      { name: "Sarah Jenkins", title: "International Relations Manager", department: "Admissions", email: "sarah@monash.edu", phone: "+61 400 000 000", primary: true }
    ],
  });

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
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: payload
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
      alert("AI Scanning failed. Please check the backend connection.");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-[1400px] mx-auto w-full">
      
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
          onClick={() => setIsEditModalOpen(true)}
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

      {/* DIRECTORY VIEW */}
      {activeTab === 'directory' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="Search institutions..." className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#282860]" />
            </div>
            <button className="text-slate-500 hover:text-slate-800"><Settings size={18}/></button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
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
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-black">M</div>
                    <div>
                      <p className="font-bold text-[#282860]">Monash University</p>
                      <p className="text-[11px] text-slate-400">monash.edu</p>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-600 font-medium flex items-center gap-1"><MapPin size={14}/> Australia</td>
                  <td className="px-5 py-4 font-bold text-green-600">10%</td>
                  <td className="px-5 py-4"><span className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-[10px] font-bold">ACTIVE</span></td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => setIsEditModalOpen(true)} className="text-[#BAD133] hover:text-[#9bb029] font-bold text-xs uppercase tracking-wider bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">Edit Contract</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CLAIMED HISTORY VIEW */}
      {activeTab === 'claimed' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-[#f8fafc] flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-[#282860]">Commission Payout Ledger</h2>
              <p className="text-xs text-slate-500">Historical record of all funds received from institutions.</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Claimed (2026)</p>
              <p className="text-2xl font-black text-green-600">$142,500</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white text-[#64748b] text-[10px] uppercase tracking-widest border-b border-slate-200">
                <tr>
                  <th className="px-5 py-4">Date Paid</th>
                  <th className="px-5 py-4">Institution</th>
                  <th className="px-5 py-4">Total Enrollments</th>
                  <th className="px-5 py-4">Amount Claimed</th>
                  <th className="px-5 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 text-slate-600 font-bold">15 May 2026</td>
                  <td className="px-5 py-4 font-bold text-[#282860]">Deakin University</td>
                  <td className="px-5 py-4 text-slate-500">12 Students</td>
                  <td className="px-5 py-4 font-black text-green-600">$24,000</td>
                  <td className="px-5 py-4"><span className="bg-green-100 text-green-700 px-2 py-1 flex items-center gap-1 w-fit rounded-md text-[10px] font-bold"><CheckCircle size={12}/> PAID</span></td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 text-slate-600 font-bold">01 Jun 2026</td>
                  <td className="px-5 py-4 font-bold text-[#282860]">Monash University</td>
                  <td className="px-5 py-4 text-slate-500">38 Students</td>
                  <td className="px-5 py-4 font-black text-slate-400">$45,000</td>
                  <td className="px-5 py-4"><span className="bg-amber-100 text-amber-700 px-2 py-1 flex items-center gap-1 w-fit rounded-md text-[10px] font-bold"><Clock size={12}/> PENDING</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- RESTRUCTURED EDIT MODAL --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-[#1b1b42] text-white">
              <div>
                <h2 className="text-2xl font-black flex items-center gap-2">
                  <Building2 className="text-[#BAD133]" /> {formData.institution_name}
                </h2>
                <p className="text-slate-300 text-sm mt-1">Master Agreement & Contact Profile</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white transition-colors bg-white/10 p-2 rounded-full">
                <X size={24} />
              </button>
            </div>

            {/* AI Scanner Bar */}
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 border-b border-indigo-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><Sparkles size={20}/></div>
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
              <div className="bg-green-50 text-green-700 p-2 text-center text-xs font-bold border-b border-green-100">
                ✅ AI successfully extracted contract data!
              </div>
            )}

            {/* Cleaner Modal Tabs */}
            <div className="flex bg-[#f8fafc] border-b border-slate-200 px-6">
              <button onClick={() => setModalTab('profile')} className={`px-4 py-4 text-sm font-bold tracking-wider transition-colors ${modalTab === 'profile' ? 'border-b-2 border-[#282860] text-[#282860]' : 'text-slate-400 hover:text-slate-600'}`}>A. Profile</button>
              <button onClick={() => setModalTab('terms')} className={`px-4 py-4 text-sm font-bold tracking-wider transition-colors ${modalTab === 'terms' ? 'border-b-2 border-[#282860] text-[#282860]' : 'text-slate-400 hover:text-slate-600'}`}>B. Contract Terms</button>
              <button onClick={() => setModalTab('commission')} className={`px-4 py-4 text-sm font-bold tracking-wider transition-colors flex items-center gap-2 ${modalTab === 'commission' ? 'border-b-2 border-green-600 text-green-700' : 'text-slate-400 hover:text-slate-600'}`}><DollarSign size={14}/> C. Commission Structure</button>
              <button onClick={() => setModalTab('contacts')} className={`px-4 py-4 text-sm font-bold tracking-wider transition-colors ${modalTab === 'contacts' ? 'border-b-2 border-[#282860] text-[#282860]' : 'text-slate-400 hover:text-slate-600'}`}>D. Contacts</button>
            </div>

            {/* Scrollable Form Area */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50">
              
              {/* TAB A: PROFILE */}
              {modalTab === 'profile' && (
                <div className="grid grid-cols-2 gap-6 animate-in fade-in">
                  <div className="col-span-2"><label className="text-xs font-bold text-slate-500 uppercase">Institution Name</label><input type="text" className="w-full mt-1 p-3 border border-slate-200 rounded-xl font-bold text-[#282860]" value={formData.institution_name} onChange={e=>setFormData({...formData, institution_name: e.target.value})}/></div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase">Type</label><input type="text" className="w-full mt-1 p-3 border border-slate-200 rounded-xl" value={formData.institution_type} onChange={e=>setFormData({...formData, institution_type: e.target.value})}/></div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase">Country/Region</label><input type="text" className="w-full mt-1 p-3 border border-slate-200 rounded-xl" value={formData.country} onChange={e=>setFormData({...formData, country: e.target.value})}/></div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase">Website</label><input type="text" className="w-full mt-1 p-3 border border-slate-200 rounded-xl text-blue-600 underline" value={formData.website} onChange={e=>setFormData({...formData, website: e.target.value})}/></div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                    <select className="w-full mt-1 p-3 border border-slate-200 rounded-xl bg-white" value={formData.status} onChange={e=>setFormData({...formData, status: e.target.value})}>
                      <option value="Active">Active</option><option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              )}

              {/* TAB B: CONTRACT TERMS */}
              {modalTab === 'terms' && (
                <div className="grid grid-cols-2 gap-6 animate-in fade-in">
                  <div><label className="text-xs font-bold text-slate-500 uppercase">Agreement ID</label><input type="text" className="w-full mt-1 p-3 border border-slate-200 rounded-xl bg-slate-100" value={formData.agreement_id} readOnly/></div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase">Date Signed</label><input type="date" className="w-full mt-1 p-3 border border-slate-200 rounded-xl" value={formData.agreement_date} onChange={e=>setFormData({...formData, agreement_date: e.target.value})}/></div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase">Valid From</label><input type="date" className="w-full mt-1 p-3 border border-slate-200 rounded-xl" value={formData.duration_start} onChange={e=>setFormData({...formData, duration_start: e.target.value})}/></div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase">Valid Until</label><input type="date" className="w-full mt-1 p-3 border border-slate-200 rounded-xl" value={formData.duration_end} onChange={e=>setFormData({...formData, duration_end: e.target.value})}/></div>
                  <div className="col-span-2"><label className="text-xs font-bold text-slate-500 uppercase">Legal Terms & Conditions</label><textarea rows={4} className="w-full mt-1 p-3 border border-slate-200 rounded-xl text-sm" value={formData.terms_conditions} onChange={e=>setFormData({...formData, terms_conditions: e.target.value})}></textarea></div>
                </div>
              )}

              {/* TAB C: COMMISSION STRUCTURE (NEW) */}
              {modalTab === 'commission' && (
                <div className="grid grid-cols-1 gap-6 animate-in fade-in">
                  <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                    <label className="text-xs font-black text-green-800 uppercase tracking-widest block mb-2">Base Commission Percentage</label>
                    <input type="text" className="w-full p-4 border-2 border-green-200 rounded-xl text-2xl font-black text-green-700 bg-white" placeholder="e.g. 10%" value={formData.base_commission} onChange={e=>setFormData({...formData, base_commission: e.target.value})}/>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Agreement Type</label>
                    <select className="w-full mt-1 p-3 border border-slate-200 rounded-xl bg-white" value={formData.agreement_type} onChange={e=>setFormData({...formData, agreement_type: e.target.value})}>
                      <option value="Tiered">Tiered Commission</option><option value="Fixed">Fixed Fee</option><option value="Flat">Flat Percentage</option>
                    </select>
                  </div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase">Performance Bonus Rules</label><input type="text" className="w-full mt-1 p-3 border border-slate-200 rounded-xl" placeholder="e.g. Extra 2% if > 50 students" value={formData.performance_bonus} onChange={e=>setFormData({...formData, performance_bonus: e.target.value})}/></div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase">Tiered Commission Levels</label><textarea rows={3} className="w-full mt-1 p-3 border border-slate-200 rounded-xl text-sm" placeholder="e.g. 10% for 1-10 students, 12% for 11-20..." value={formData.tiered_levels} onChange={e=>setFormData({...formData, tiered_levels: e.target.value})}></textarea></div>
                </div>
              )}

              {/* TAB D: CONTACTS */}
              {modalTab === 'contacts' && (
                <div className="space-y-4 animate-in fade-in">
                  {formData.contacts.map((contact, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative flex items-start gap-4">
                      {contact.primary && <span className="absolute top-4 right-4 bg-amber-100 text-amber-700 px-2 py-1 rounded text-[10px] font-black tracking-widest">PRIMARY</span>}
                      <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0"><UserCircle size={24}/></div>
                      <div className="grid grid-cols-2 gap-4 w-full pt-1">
                        <div className="col-span-2 sm:col-span-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Full Name</label><p className="font-bold text-[#282860]">{contact.name}</p></div>
                        <div className="col-span-2 sm:col-span-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Title & Dept</label><p className="text-sm font-medium text-slate-600">{contact.title} ({contact.department})</p></div>
                        <div className="col-span-2 sm:col-span-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Email</label><p className="text-sm text-blue-600">{contact.email}</p></div>
                        <div className="col-span-2 sm:col-span-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Phone</label><p className="text-sm text-slate-600">{contact.phone}</p></div>
                      </div>
                    </div>
                  ))}
                  <button className="w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-500 font-bold hover:bg-slate-100 hover:text-[#282860] transition-colors">+ Add Another Contact</button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] z-10">
              <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-2.5 text-slate-500 font-bold text-sm hover:text-slate-800">Cancel</button>
              <button className="bg-[#282860] hover:bg-[#1b1b42] text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-md">Save Master Agreement</button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}