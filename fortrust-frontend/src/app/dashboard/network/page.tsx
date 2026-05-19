"use client";

import { useState, useEffect } from "react";
import { 
  Building2, MapPin, Mail, Search, Plus, FileText, DownloadCloud, 
  CheckCircle2, AlertCircle, Phone, Globe, Loader2, Edit2, X, PlusCircle, Trash2,
  Briefcase, BookOpen, DollarSign
} from "lucide-react";

export default function NetworkDirectoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [editingInst, setEditingInst] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Quick Add State
  const [quickAddName, setQuickAddName] = useState("");
  const [quickAddCountry, setQuickAddCountry] = useState("");

  const fetchInstitutions = async () => {
    const token = localStorage.getItem("fortrust_token");
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/institutions`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === "success") {
        // Ensure contacts is always parsed as an array
        const parsedData = data.data.map((inst: any) => ({
          ...inst,
          contacts: typeof inst.contacts === 'string' ? JSON.parse(inst.contacts) : (inst.contacts || [])
        }));
        setInstitutions(parsedData);
      }
    } catch (error) {
      console.error("Failed to fetch network directory:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInstitutions(); }, []);

// --- 1. QUICK ADD INSTITUTION ---
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const token = localStorage.getItem("fortrust_token");
    try {
      // 1. Save to database
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/institutions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ name: quickAddName, country: quickAddCountry, type: "University", city: "" })
      });
      
      // 2. Fetch the fresh list from database
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/institutions`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      
      // 3. Clean up the small modal
      const savedName = quickAddName;
      setQuickAddName(""); setQuickAddCountry("");
      setIsQuickAddOpen(false);
      
      if (data.status === "success") {
        const parsedData = data.data.map((inst: any) => ({
          ...inst,
          contacts: typeof inst.contacts === 'string' ? JSON.parse(inst.contacts) : (inst.contacts || [])
        }));
        setInstitutions(parsedData);
        
        // 4. THE FIX: Find the one we just created and automatically open the BIG Edit Panel!
        const newInst = parsedData.find((i: any) => i.name === savedName);
        if (newInst) {
          setEditingInst(newInst);
        }
      }
    } catch (error) { 
      alert("Failed to add institution."); 
    } finally { 
      setIsSaving(false); 
    }
  };
  // --- 2. SAVE FULL PROFILE ---
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const token = localStorage.getItem("fortrust_token");
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/institutions/${editingInst.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(editingInst)
      });
      setEditingInst(null);
      fetchInstitutions();
    } catch (error) { alert("Failed to save profile."); } finally { setIsSaving(false); }
  };

  // --- 3. DYNAMIC CONTACT MANAGEMENT ---
  const addContact = () => {
    const newContact = { id: Date.now(), full_name: "", title: "", email: "", phone: "", primary: false };
    setEditingInst({ ...editingInst, contacts: [...(editingInst.contacts || []), newContact] });
  };

  const updateContact = (index: number, field: string, value: any) => {
    const updatedContacts = [...(editingInst.contacts || [])];
    updatedContacts[index][field] = value;
    setEditingInst({ ...editingInst, contacts: updatedContacts });
  };

  const removeContact = (index: number) => {
    const updatedContacts = [...(editingInst.contacts || [])];
    updatedContacts.splice(index, 1);
    setEditingInst({ ...editingInst, contacts: updatedContacts });
  };

  const filteredInstitutions = institutions.filter(inst => 
    inst.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inst.country?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-[#282860] flex items-center gap-3">
            <Globe className="text-[#BAD133]" size={32} />
            Global Network Directory
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Manage Institution Partners, Agreements, and Contacts.</p>
        </div>
        <button onClick={() => setIsQuickAddOpen(true)} className="bg-[#282860] hover:bg-[#1b1b42] text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-md">
          <Plus size={18} /> Add Institution
        </button>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" placeholder="Search universities, colleges, or countries..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#282860]"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* INSTITUTION TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400"><Loader2 className="animate-spin mb-4" size={32} /><p>Loading global directory...</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#f8fafc] border-b border-slate-200 text-[10px] font-black text-slate-500 tracking-wider uppercase">
                <tr>
                  <th className="px-6 py-5">Institution Name</th>
                  <th className="px-6 py-5">Location</th>
                  <th className="px-6 py-5">Agreement Status</th>
                  <th className="px-6 py-5">Primary Contact</th>
                  <th className="px-6 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredInstitutions.map((inst) => {
                  const primaryContact = (inst.contacts || []).find((c: any) => c.primary) || (inst.contacts || [])[0];
                  return (
                    <tr key={inst.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-bold text-[#282860] block text-base flex items-center gap-2"><Building2 size={16} className="text-slate-400" />{inst.name}</span>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1 block">{inst.type || "Unknown Type"}</span>
                      </td>
                      <td className="px-6 py-4"><div className="flex items-center gap-1.5 text-slate-700 font-medium"><MapPin size={14} className="text-slate-400" />{inst.city ? `${inst.city}, ` : ""}{inst.country}</div></td>
                      <td className="px-6 py-4">
                        {inst.status === "Active" ? (
                          <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-md text-xs font-bold"><CheckCircle2 size={14} /> Active Contract</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-md text-xs font-bold"><AlertCircle size={14} /> {inst.status || "Pending"}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {primaryContact ? (
                          <div>
                            <span className="font-bold text-slate-700 block">{primaryContact.full_name}</span>
                            <span className="text-xs text-slate-500 flex items-center gap-1.5 mt-1"><Mail size={12} /> {primaryContact.email}</span>
                          </div>
                        ) : <span className="text-xs text-slate-400 font-medium">No contacts added</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => setEditingInst(inst)} className="inline-flex items-center gap-2 bg-slate-50 hover:bg-[#282860] hover:text-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold transition-colors">
                          <Edit2 size={14} /> Full Edit
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {filteredInstitutions.length === 0 && (
                  <tr><td colSpan={5} className="py-12 text-center text-slate-500"><Building2 size={48} className="mx-auto text-slate-300 mb-3" /><p className="font-semibold text-lg">No institutions found</p></td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================= */}
      {/* QUICK ADD MODAL */}
      {/* ========================================= */}
      {isQuickAddOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-[#f8fafc]">
              <h2 className="text-xl font-bold text-[#282860]">New Institution</h2>
              <button onClick={() => setIsQuickAddOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleQuickAdd} className="p-6 space-y-4">
              <div><label className="text-xs font-bold text-slate-700">Institution Name</label><input type="text" required className="w-full mt-1.5 px-3 py-2 border rounded-lg text-sm" value={quickAddName} onChange={e => setQuickAddName(e.target.value)} /></div>
              <div><label className="text-xs font-bold text-slate-700">Country</label><input type="text" required className="w-full mt-1.5 px-3 py-2 border rounded-lg text-sm" value={quickAddCountry} onChange={e => setQuickAddCountry(e.target.value)} /></div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsQuickAddOpen(false)} className="px-4 py-2 text-slate-500 font-bold text-sm">Cancel</button>
                <button type="submit" disabled={isSaving} className="bg-[#282860] text-white px-6 py-2 rounded-lg text-sm font-bold">{isSaving ? "Saving..." : "Create & Open"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MASSIVE EDIT COMMAND CENTER (MAMI'S REQUEST) */}
      {/* ========================================= */}
      {editingInst && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh]">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-[#282860] text-white">
              <div>
                <h2 className="text-2xl font-black flex items-center gap-2"><Globe className="text-[#BAD133]" /> {editingInst.name || "Edit Institution"}</h2>
                <p className="text-xs text-slate-300 mt-1 uppercase tracking-widest font-semibold">Master Contract & Commission Dashboard</p>
              </div>
              <button onClick={() => setEditingInst(null)} className="text-slate-300 hover:text-white transition-colors bg-white/10 p-2 rounded-full"><X size={20} /></button>
            </div>

            {/* Scrollable Form Area */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">
              <form id="massive-edit-form" onSubmit={handleSaveProfile} className="space-y-10">

                {/* --- A. INSTITUTION PROFILE --- */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-black text-[#282860] uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Building2 size={18} className="text-[#BAD133]" /> A. Institution Profile
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div><label className="text-xs font-bold text-slate-700">Institution Name</label><input type="text" className="w-full mt-1.5 px-3 py-2 border rounded-lg text-sm bg-slate-50" value={editingInst.name || ""} onChange={e => setEditingInst({...editingInst, name: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-slate-700">Institution Type</label><input type="text" placeholder="e.g. University, College, Vocational" className="w-full mt-1.5 px-3 py-2 border rounded-lg text-sm bg-slate-50" value={editingInst.type || ""} onChange={e => setEditingInst({...editingInst, type: e.target.value})} /></div>
                    <div>
                      <label className="text-xs font-bold text-slate-700">Status</label>
                      <select className="w-full mt-1.5 px-3 py-2 border rounded-lg text-sm bg-slate-50 font-bold" value={editingInst.status || "Active"} onChange={e => setEditingInst({...editingInst, status: e.target.value})}>
                        <option value="Active">Active</option><option value="Inactive">Inactive</option><option value="Pending Renewal">Pending Renewal</option>
                      </select>
                    </div>
                    <div><label className="text-xs font-bold text-slate-700">Country / Region</label><input type="text" className="w-full mt-1.5 px-3 py-2 border rounded-lg text-sm bg-slate-50" value={editingInst.country || ""} onChange={e => setEditingInst({...editingInst, country: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-slate-700">City</label><input type="text" className="w-full mt-1.5 px-3 py-2 border rounded-lg text-sm bg-slate-50" value={editingInst.city || ""} onChange={e => setEditingInst({...editingInst, city: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-slate-700">Website</label><input type="text" placeholder="https://..." className="w-full mt-1.5 px-3 py-2 border rounded-lg text-sm bg-slate-50" value={editingInst.website || ""} onChange={e => setEditingInst({...editingInst, website: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-slate-700">Establishment Year</label><input type="text" placeholder="e.g. 1995" className="w-full mt-1.5 px-3 py-2 border rounded-lg text-sm bg-slate-50" value={editingInst.establishment_year || ""} onChange={e => setEditingInst({...editingInst, establishment_year: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-slate-700">Student Intake (Annual)</label><input type="text" placeholder="e.g. Feb, July, Nov" className="w-full mt-1.5 px-3 py-2 border rounded-lg text-sm bg-slate-50" value={editingInst.student_intake || ""} onChange={e => setEditingInst({...editingInst, student_intake: e.target.value})} /></div>
                    <div className="md:col-span-3"><label className="text-xs font-bold text-slate-700">Programs Offered</label><textarea className="w-full mt-1.5 px-3 py-2 border rounded-lg text-sm bg-slate-50" rows={2} value={editingInst.programs_offered || ""} onChange={e => setEditingInst({...editingInst, programs_offered: e.target.value})}></textarea></div>
                  </div>
                </div>

                {/* --- B. AGREEMENT DETAILS --- */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-black text-[#282860] uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Briefcase size={18} className="text-[#BAD133]" /> B. Agreement Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div><label className="text-xs font-bold text-slate-700">Agreement ID</label><input type="text" className="w-full mt-1.5 px-3 py-2 border rounded-lg text-sm bg-slate-50 font-mono" value={editingInst.agreement_id || ""} onChange={e => setEditingInst({...editingInst, agreement_id: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-slate-700">Agreement Date</label><input type="date" className="w-full mt-1.5 px-3 py-2 border rounded-lg text-sm bg-slate-50" value={editingInst.agreement_date || ""} onChange={e => setEditingInst({...editingInst, agreement_date: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-slate-700">Agreement Type</label><input type="text" placeholder="Commission, Fixed Fee, Tiered" className="w-full mt-1.5 px-3 py-2 border rounded-lg text-sm bg-slate-50" value={editingInst.agreement_type || ""} onChange={e => setEditingInst({...editingInst, agreement_type: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-slate-700">Base Commission (%)</label><input type="text" placeholder="e.g. 10%" className="w-full mt-1.5 px-3 py-2 border rounded-lg text-sm bg-slate-50" value={editingInst.base_commission || ""} onChange={e => setEditingInst({...editingInst, base_commission: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-slate-700">Performance Bonus (%)</label><input type="text" placeholder="e.g. +2% > 50 students" className="w-full mt-1.5 px-3 py-2 border rounded-lg text-sm bg-slate-50" value={editingInst.performance_bonus || ""} onChange={e => setEditingInst({...editingInst, performance_bonus: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-slate-700">Tiered Levels</label><input type="text" placeholder="Details of tiers..." className="w-full mt-1.5 px-3 py-2 border rounded-lg text-sm bg-slate-50" value={editingInst.tiered_levels || ""} onChange={e => setEditingInst({...editingInst, tiered_levels: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-slate-700">Duration Start Date</label><input type="date" className="w-full mt-1.5 px-3 py-2 border rounded-lg text-sm bg-slate-50" value={editingInst.duration_start || ""} onChange={e => setEditingInst({...editingInst, duration_start: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-slate-700">Duration End Date</label><input type="date" className="w-full mt-1.5 px-3 py-2 border rounded-lg text-sm bg-slate-50" value={editingInst.duration_end || ""} onChange={e => setEditingInst({...editingInst, duration_end: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-slate-700">Document/File Link</label><input type="text" placeholder="Google Drive / SharePoint Link" className="w-full mt-1.5 px-3 py-2 border rounded-lg text-sm bg-slate-50 text-blue-600" value={editingInst.agreement_file || ""} onChange={e => setEditingInst({...editingInst, agreement_file: e.target.value})} /></div>
                    <div className="md:col-span-3"><label className="text-xs font-bold text-slate-700">Terms & Conditions</label><textarea className="w-full mt-1.5 px-3 py-2 border rounded-lg text-sm bg-slate-50" rows={3} value={editingInst.terms_conditions || ""} onChange={e => setEditingInst({...editingInst, terms_conditions: e.target.value})}></textarea></div>
                  </div>
                </div>

                {/* --- C. CONTACT PERSONS (MULTI-CONTACT) --- */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-black text-[#282860] uppercase tracking-widest flex items-center gap-2">
                      <Phone size={18} className="text-[#BAD133]" /> C. Contact Persons
                    </h3>
                    <button type="button" onClick={addContact} className="text-xs font-bold bg-[#f1f5f9] text-[#282860] hover:bg-[#e2e8f0] px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                      <PlusCircle size={14} /> Add Contact
                    </button>
                  </div>
                  
                  {(!editingInst.contacts || editingInst.contacts.length === 0) ? (
                    <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                      <p className="text-sm text-slate-500 font-medium">No contacts added yet. Click "Add Contact" to start.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {editingInst.contacts.map((contact: any, index: number) => (
                        <div key={contact.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl relative">
                          <button type="button" onClick={() => removeContact(index)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mr-8">
                            <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Full Name</label><input type="text" className="w-full mt-1 px-2 py-1.5 border rounded-md text-sm" value={contact.full_name} onChange={e => updateContact(index, 'full_name', e.target.value)} /></div>
                            <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Title/Position</label><input type="text" className="w-full mt-1 px-2 py-1.5 border rounded-md text-sm" value={contact.title} onChange={e => updateContact(index, 'title', e.target.value)} /></div>
                            <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Department</label><input type="text" className="w-full mt-1 px-2 py-1.5 border rounded-md text-sm" value={contact.department || ""} onChange={e => updateContact(index, 'department', e.target.value)} /></div>
                            <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label><input type="email" className="w-full mt-1 px-2 py-1.5 border rounded-md text-sm" value={contact.email} onChange={e => updateContact(index, 'email', e.target.value)} /></div>
                            <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Phone Number</label><input type="text" className="w-full mt-1 px-2 py-1.5 border rounded-md text-sm" value={contact.phone} onChange={e => updateContact(index, 'phone', e.target.value)} /></div>
                            <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">WhatsApp/WeChat</label><input type="text" className="w-full mt-1 px-2 py-1.5 border rounded-md text-sm" value={contact.whatsapp || ""} onChange={e => updateContact(index, 'whatsapp', e.target.value)} /></div>
                            <div className="md:col-span-3 flex items-center gap-2 mt-2">
                              <input type="checkbox" id={`primary-${index}`} className="w-4 h-4 text-[#282860] rounded border-slate-300" checked={contact.primary} onChange={e => updateContact(index, 'primary', e.target.checked)} />
                              <label htmlFor={`primary-${index}`} className="text-xs font-bold text-[#282860]">Set as Primary Contact for this Institution</label>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* --- D. COMMISSION CALCULATION FIELDS --- */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-black text-[#282860] uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
                    <DollarSign size={18} className="text-[#BAD133]" /> D. Commission Calculation Fields
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                    <div><label className="text-xs font-bold text-slate-700">Total Referrals</label><input type="number" className="w-full mt-1.5 px-3 py-2 border rounded-lg text-sm bg-slate-50 font-bold" value={editingInst.total_referrals || 0} onChange={e => setEditingInst({...editingInst, total_referrals: parseInt(e.target.value) || 0})} /></div>
                    <div><label className="text-xs font-bold text-slate-700">Enrollments Confirmed</label><input type="number" className="w-full mt-1.5 px-3 py-2 border rounded-lg text-sm bg-slate-50 font-bold text-green-700" value={editingInst.total_enrollment || 0} onChange={e => setEditingInst({...editingInst, total_enrollment: parseInt(e.target.value) || 0})} /></div>
                    <div><label className="text-xs font-bold text-slate-700">Total Base Comm Amount</label><input type="text" placeholder="$..." className="w-full mt-1.5 px-3 py-2 border rounded-lg text-sm bg-slate-50" value={editingInst.total_base_commission || ""} onChange={e => setEditingInst({...editingInst, total_base_commission: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-slate-700">Total Comm Payable</label><input type="text" placeholder="$..." className="w-full mt-1.5 px-3 py-2 border rounded-lg text-sm bg-slate-50 font-bold text-blue-700" value={editingInst.total_payable || ""} onChange={e => setEditingInst({...editingInst, total_payable: e.target.value})} /></div>
                    
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-slate-700">Commission Status</label>
                      <select className="w-full mt-1.5 px-3 py-2 border rounded-lg text-sm bg-slate-50 font-bold" value={editingInst.commission_status || "Pending"} onChange={e => setEditingInst({...editingInst, commission_status: e.target.value})}>
                        <option value="Pending">Pending Calculation</option><option value="Approved">Approved / Invoiced</option><option value="Paid">Paid Successfully</option>
                      </select>
                    </div>
                    <div className="md:col-span-2"><label className="text-xs font-bold text-slate-700">Payment Date</label><input type="date" className="w-full mt-1.5 px-3 py-2 border rounded-lg text-sm bg-slate-50" value={editingInst.payment_date || ""} onChange={e => setEditingInst({...editingInst, payment_date: e.target.value})} /></div>
                    <div className="md:col-span-4"><label className="text-xs font-bold text-slate-700">Accounting / Commission Notes</label><textarea className="w-full mt-1.5 px-3 py-2 border rounded-lg text-sm bg-slate-50" rows={2} value={editingInst.commission_notes || ""} onChange={e => setEditingInst({...editingInst, commission_notes: e.target.value})}></textarea></div>
                  </div>
                </div>

              </form>
            </div>
            
            {/* Footer */}
            <div className="p-5 border-t border-slate-200 bg-white flex justify-end gap-3 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] relative z-10">
              <button onClick={() => setEditingInst(null)} type="button" className="px-6 py-2.5 text-slate-500 font-bold text-sm hover:text-slate-700 transition-colors">Close</button>
              <button form="massive-edit-form" type="submit" disabled={isSaving} className="bg-[#282860] hover:bg-[#1b1b42] text-white px-10 py-2.5 rounded-xl text-sm font-black tracking-wide transition-colors shadow-lg shadow-indigo-900/20 disabled:opacity-50 flex items-center gap-2">
                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />} 
                {isSaving ? "Saving to Database..." : "Save Master Record"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}