"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Building2, MapPin, DollarSign, UploadCloud, Search, Plus, 
  Sparkles, X, Loader2, Trash2, Building, Briefcase, FileText, Phone, Calculator
} from "lucide-react";

export default function InstitutionPartners() {
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // The 4 Tabs requested
  const [modalTab, setModalTab] = useState<"profile" | "agreement" | "contacts" | "commission">("profile");
  
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State reflecting the requested fields
  const [formData, setFormData] = useState({
    id: "",
    // A. Profile
    institution_name: "", institution_type: "University", country: "", website: "", 
    establishment_year: "", student_intake: "", programs_offered: "", status: "Active",
    // B. Agreement
    agreement_id: "", agreement_date: "", agreement_type: "Commission-based",
    base_commission: "", performance_bonus: "", tiered_levels: "",
    duration_start: "", duration_end: "", terms_conditions: "", document_link: "",
    // C. Contacts
    contacts: [] as any[], // Complex array support
    // D. Commission Calculation
    total_referrals: "", total_enrollment: "", base_amount: "", calc_bonus: "", 
    total_payable: "", comm_status: "Pending", payment_date: "", calc_notes: ""
  });

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

      const res = await fetch(url, {
        method: method,
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setIsEditModalOpen(false);
        fetchInstitutions(); 
      } else alert("Failed to save the institution.");
    } catch (error) { alert("Network Error."); }
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
    const newContact = { id: `C-${Date.now()}`, full_name: "", title: "", department: "", email: "", phone: "", mobile: "", office_address: "", whatsapp: "", method: "Email", primary: "No", status: "Active" };
    setFormData({ ...formData, contacts: [...formData.contacts, newContact] });
  };

  return (
    <div className="p-4 lg:p-8 max-w-[1400px] mx-auto w-full relative">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-[#282860] flex items-center gap-3">
            <Building2 className="text-[#BAD133]" size={36} />
            Institution Partners
          </h1>
        </div>
        <button 
          onClick={() => {
            setFormData({ 
              id: "", institution_name: "", institution_type: "University", country: "", website: "", establishment_year: "", student_intake: "", programs_offered: "", status: "Active",
              agreement_id: "", agreement_date: "", agreement_type: "Commission-based", base_commission: "", performance_bonus: "", tiered_levels: "", duration_start: "", duration_end: "", terms_conditions: "", document_link: "",
              contacts: [], total_referrals: "", total_enrollment: "", base_amount: "", calc_bonus: "", total_payable: "", comm_status: "Pending", payment_date: "", calc_notes: ""
            });
            setIsEditModalOpen(true);
            setModalTab("profile");
          }}
          className="bg-[#282860] hover:bg-[#1b1b42] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md flex items-center gap-2"
        >
          <Plus size={18} /> Add Institution
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-[#f8fafc] text-[#64748b] text-[10px] uppercase tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-5 py-4">Institution</th>
                <th className="px-5 py-4">Region</th>
                <th className="px-5 py-4">Base Commission</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-[#BAD133]" size={32}/></td></tr>
              ) : institutions.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">No institutions found.</td></tr>
              ) : institutions.map((inst) => (
                <tr key={inst.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-black">{inst.institution_name?.charAt(0) || "U"}</div>
                    <div>
                      <p className="font-bold text-[#282860]">{inst.institution_name || "Unnamed"}</p>
                      <p className="text-[11px] text-slate-400">{inst.website}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-600 font-medium">{inst.country || "N/A"}</td>
                  <td className="px-5 py-4 font-bold text-green-600">{inst.base_commission || "-"}</td>
                  <td className="px-5 py-4"><span className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-[10px] font-bold uppercase">{inst.status || "ACTIVE"}</span></td>
                  <td className="px-5 py-4 flex justify-end gap-2">
                    <button onClick={() => { setFormData({...formData, ...inst, contacts: inst.contacts || []}); setIsEditModalOpen(true); setModalTab("profile"); }} className="text-[#BAD133] hover:text-[#9bb029] font-bold text-xs uppercase tracking-wider bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors">Edit</button>
                    <button onClick={() => handleDeleteInstitution(inst.id)} className="text-red-400 hover:text-white hover:bg-red-500 bg-red-50 px-2 py-1.5 rounded-lg border border-red-100 transition-colors"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* --- COMPLEX EDIT MODAL --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-[#1b1b42] text-white">
              <div>
                <h2 className="text-2xl font-black flex items-center gap-2"><Building2 className="text-[#BAD133]" /> {formData.institution_name || "New Institution"}</h2>
                <p className="text-slate-300 text-sm mt-1">Master Agreement & Contact Profile</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white transition-colors bg-white/10 p-2 rounded-full"><X size={24} /></button>
            </div>

            {/* AI Banner */}
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 border-b border-indigo-100 flex items-center justify-between">
              <div className="flex items-center gap-3"><div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><Sparkles size={20}/></div><div><p className="text-sm font-bold text-[#282860]">AI Contract Auto-Fill</p><p className="text-xs text-slate-500">Upload a PDF agreement to extract terms instantly.</p></div></div>
              <button className="bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-600 hover:text-white px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2"><UploadCloud size={16} /> Upload PDF</button>
            </div>

            {/* Tabs */}
            <div className="flex bg-[#f8fafc] border-b border-slate-200 px-6 overflow-x-auto">
              <button onClick={() => setModalTab('profile')} className={`px-4 py-4 text-sm font-bold tracking-wider whitespace-nowrap transition-colors flex items-center gap-2 ${modalTab === 'profile' ? 'border-b-2 border-[#282860] text-[#282860]' : 'text-slate-400'}`}><Building size={16}/> A. Profile</button>
              <button onClick={() => setModalTab('agreement')} className={`px-4 py-4 text-sm font-bold tracking-wider whitespace-nowrap transition-colors flex items-center gap-2 ${modalTab === 'agreement' ? 'border-b-2 border-[#282860] text-[#282860]' : 'text-slate-400'}`}><FileText size={16}/> B. Agreement</button>
              <button onClick={() => setModalTab('contacts')} className={`px-4 py-4 text-sm font-bold tracking-wider whitespace-nowrap transition-colors flex items-center gap-2 ${modalTab === 'contacts' ? 'border-b-2 border-[#282860] text-[#282860]' : 'text-slate-400'}`}><Phone size={16}/> C. Contacts</button>
              <button onClick={() => setModalTab('commission')} className={`px-4 py-4 text-sm font-bold tracking-wider whitespace-nowrap transition-colors flex items-center gap-2 ${modalTab === 'commission' ? 'border-b-2 border-green-600 text-green-700' : 'text-slate-400'}`}><Calculator size={16}/> D. Calculations</button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50">
              
              {/* TAB A: PROFILE */}
              {modalTab === 'profile' && (
                <div className="grid grid-cols-2 gap-6 animate-in fade-in">
                  <div className="col-span-2"><label className="text-xs font-bold text-slate-500 uppercase">Institution Name</label><input type="text" className="w-full mt-1 p-3 border border-slate-200 rounded-xl font-bold text-[#282860]" value={formData.institution_name} onChange={e=>setFormData({...formData, institution_name: e.target.value})}/></div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase">Institution Type</label><select className="w-full mt-1 p-3 border border-slate-200 rounded-xl" value={formData.institution_type} onChange={e=>setFormData({...formData, institution_type: e.target.value})}><option>University</option><option>College</option><option>Vocational</option><option>Language School</option></select></div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase">Country/Region</label><input type="text" className="w-full mt-1 p-3 border border-slate-200 rounded-xl" value={formData.country} onChange={e=>setFormData({...formData, country: e.target.value})}/></div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase">Website</label><input type="text" className="w-full mt-1 p-3 border border-slate-200 rounded-xl" value={formData.website} onChange={e=>setFormData({...formData, website: e.target.value})}/></div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase">Establishment Year</label><input type="text" className="w-full mt-1 p-3 border border-slate-200 rounded-xl" value={formData.establishment_year} onChange={e=>setFormData({...formData, establishment_year: e.target.value})}/></div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase">Student Intake (Annual)</label><input type="text" className="w-full mt-1 p-3 border border-slate-200 rounded-xl" value={formData.student_intake} onChange={e=>setFormData({...formData, student_intake: e.target.value})}/></div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase">Status</label><select className="w-full mt-1 p-3 border border-slate-200 rounded-xl" value={formData.status} onChange={e=>setFormData({...formData, status: e.target.value})}><option>Active</option><option>Inactive</option></select></div>
                  <div className="col-span-2"><label className="text-xs font-bold text-slate-500 uppercase">Programs Offered</label><textarea rows={3} className="w-full mt-1 p-3 border border-slate-200 rounded-xl" value={formData.programs_offered} onChange={e=>setFormData({...formData, programs_offered: e.target.value})}></textarea></div>
                </div>
              )}

              {/* TAB B: AGREEMENT */}
              {modalTab === 'agreement' && (
                <div className="grid grid-cols-2 gap-6 animate-in fade-in">
                  <div><label className="text-xs font-bold text-slate-500 uppercase">Agreement ID</label><input type="text" className="w-full mt-1 p-3 border border-slate-200 rounded-xl font-mono" value={formData.agreement_id} onChange={e=>setFormData({...formData, agreement_id: e.target.value})}/></div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase">Agreement Date</label><input type="date" className="w-full mt-1 p-3 border border-slate-200 rounded-xl" value={formData.agreement_date} onChange={e=>setFormData({...formData, agreement_date: e.target.value})}/></div>
                  <div className="col-span-2"><label className="text-xs font-bold text-slate-500 uppercase">Agreement Type</label><select className="w-full mt-1 p-3 border border-slate-200 rounded-xl" value={formData.agreement_type} onChange={e=>setFormData({...formData, agreement_type: e.target.value})}><option>Commission-based</option><option>Fixed Fee</option><option>Tiered</option></select></div>
                  
                  <div className="col-span-2 grid grid-cols-3 gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                     <div className="col-span-3 pb-2 border-b text-xs font-bold text-[#282860]">Commission Structure</div>
                     <div><label className="text-xs font-bold text-slate-500 uppercase">Base Commission %</label><input type="text" className="w-full mt-1 p-3 border border-slate-200 rounded-xl" placeholder="e.g. 5%" value={formData.base_commission} onChange={e=>setFormData({...formData, base_commission: e.target.value})}/></div>
                     <div><label className="text-xs font-bold text-slate-500 uppercase">Performance Bonus %</label><input type="text" className="w-full mt-1 p-3 border border-slate-200 rounded-xl" value={formData.performance_bonus} onChange={e=>setFormData({...formData, performance_bonus: e.target.value})}/></div>
                     <div><label className="text-xs font-bold text-slate-500 uppercase">Tiered Levels</label><input type="text" className="w-full mt-1 p-3 border border-slate-200 rounded-xl" value={formData.tiered_levels} onChange={e=>setFormData({...formData, tiered_levels: e.target.value})}/></div>
                  </div>

                  <div><label className="text-xs font-bold text-slate-500 uppercase">Duration Start</label><input type="date" className="w-full mt-1 p-3 border border-slate-200 rounded-xl" value={formData.duration_start} onChange={e=>setFormData({...formData, duration_start: e.target.value})}/></div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase">Duration End</label><input type="date" className="w-full mt-1 p-3 border border-slate-200 rounded-xl" value={formData.duration_end} onChange={e=>setFormData({...formData, duration_end: e.target.value})}/></div>
                  <div className="col-span-2"><label className="text-xs font-bold text-slate-500 uppercase">Document/File Link</label><input type="url" className="w-full mt-1 p-3 border border-slate-200 rounded-xl text-blue-600" value={formData.document_link} onChange={e=>setFormData({...formData, document_link: e.target.value})}/></div>
                  <div className="col-span-2"><label className="text-xs font-bold text-slate-500 uppercase">Terms & Conditions</label><textarea rows={3} className="w-full mt-1 p-3 border border-slate-200 rounded-xl" value={formData.terms_conditions} onChange={e=>setFormData({...formData, terms_conditions: e.target.value})}></textarea></div>
                </div>
              )}

              {/* TAB C: CONTACTS */}
              {modalTab === 'contacts' && (
                <div className="space-y-6 animate-in fade-in">
                  {formData.contacts.map((contact, index) => (
                    <div key={contact.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative">
                      <button className="absolute top-4 right-4 text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                      <h3 className="font-bold text-[#282860] mb-4 border-b pb-2">Contact Person {index + 1} <span className="text-xs font-mono text-slate-400 ml-2">({contact.id})</span></h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs font-bold text-slate-500 uppercase">Full Name</label><input type="text" className="w-full mt-1 p-2 border rounded-lg" value={contact.full_name} onChange={(e) => { const newContacts = [...formData.contacts]; newContacts[index].full_name = e.target.value; setFormData({...formData, contacts: newContacts}); }} /></div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase">Title/Position</label><input type="text" className="w-full mt-1 p-2 border rounded-lg" value={contact.title} onChange={(e) => { const newContacts = [...formData.contacts]; newContacts[index].title = e.target.value; setFormData({...formData, contacts: newContacts}); }} /></div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase">Email Address</label><input type="email" className="w-full mt-1 p-2 border rounded-lg" value={contact.email} onChange={(e) => { const newContacts = [...formData.contacts]; newContacts[index].email = e.target.value; setFormData({...formData, contacts: newContacts}); }} /></div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase">Mobile Number</label><input type="text" className="w-full mt-1 p-2 border rounded-lg" value={contact.mobile} onChange={(e) => { const newContacts = [...formData.contacts]; newContacts[index].mobile = e.target.value; setFormData({...formData, contacts: newContacts}); }} /></div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase">Department</label><input type="text" className="w-full mt-1 p-2 border rounded-lg" value={contact.department} onChange={(e) => { const newContacts = [...formData.contacts]; newContacts[index].department = e.target.value; setFormData({...formData, contacts: newContacts}); }} /></div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase">WhatsApp/WeChat</label><input type="text" className="w-full mt-1 p-2 border rounded-lg" value={contact.whatsapp} onChange={(e) => { const newContacts = [...formData.contacts]; newContacts[index].whatsapp = e.target.value; setFormData({...formData, contacts: newContacts}); }} /></div>
                        <div className="col-span-2"><label className="text-xs font-bold text-slate-500 uppercase">Office Address</label><textarea rows={2} className="w-full mt-1 p-2 border rounded-lg" value={contact.office_address} onChange={(e) => { const newContacts = [...formData.contacts]; newContacts[index].office_address = e.target.value; setFormData({...formData, contacts: newContacts}); }}></textarea></div>
                        <div className="col-span-2 grid grid-cols-3 gap-4 mt-2">
                           <div><label className="text-xs font-bold text-slate-500 uppercase">Preferred Contact</label><select className="w-full mt-1 p-2 border rounded-lg"><option>Email</option><option>Phone</option><option>WhatsApp</option></select></div>
                           <div><label className="text-xs font-bold text-slate-500 uppercase">Primary Contact?</label><select className="w-full mt-1 p-2 border rounded-lg"><option>Yes</option><option>No</option></select></div>
                           <div><label className="text-xs font-bold text-slate-500 uppercase">Status</label><select className="w-full mt-1 p-2 border rounded-lg"><option>Active</option><option>Inactive</option></select></div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={handleAddContact} className="w-full py-4 border-2 border-dashed border-[#BAD133] rounded-xl text-[#282860] font-bold hover:bg-[#BAD133]/10 transition-colors flex items-center justify-center gap-2"><Plus size={18}/> Add Contact Person</button>
                </div>
              )}

              {/* TAB D: COMMISSION CALCULATION */}
              {modalTab === 'commission' && (
                <div className="grid grid-cols-2 gap-6 animate-in fade-in">
                  <div className="col-span-2 bg-green-50 border border-green-200 rounded-xl p-6 mb-2">
                    <h3 className="font-black text-green-800 text-lg flex items-center gap-2 mb-4"><Calculator/> Calculation Overview</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div><label className="text-xs font-bold text-green-700 uppercase">Total Referrals (Period)</label><input type="number" className="w-full mt-1 p-3 border border-green-200 rounded-xl bg-white" value={formData.total_referrals} onChange={e=>setFormData({...formData, total_referrals: e.target.value})}/></div>
                      <div><label className="text-xs font-bold text-green-700 uppercase">Enrollment Confirmed</label><input type="number" className="w-full mt-1 p-3 border border-green-200 rounded-xl bg-white" value={formData.total_enrollment} onChange={e=>setFormData({...formData, total_enrollment: e.target.value})}/></div>
                      <div><label className="text-xs font-bold text-green-700 uppercase">Commission Status</label><select className="w-full mt-1 p-3 border border-green-200 rounded-xl bg-white font-bold" value={formData.comm_status} onChange={e=>setFormData({...formData, comm_status: e.target.value})}><option>Pending</option><option>Approved</option><option>Paid</option></select></div>
                    </div>
                  </div>
                  
                  <div><label className="text-xs font-bold text-slate-500 uppercase">Base Commission Amount</label><input type="text" className="w-full mt-1 p-3 border border-slate-200 rounded-xl" placeholder="$" value={formData.base_amount} onChange={e=>setFormData({...formData, base_amount: e.target.value})}/></div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase">Performance Bonus (%)</label><input type="text" className="w-full mt-1 p-3 border border-slate-200 rounded-xl" value={formData.calc_bonus} onChange={e=>setFormData({...formData, calc_bonus: e.target.value})}/></div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase">Payment Date</label><input type="date" className="w-full mt-1 p-3 border border-slate-200 rounded-xl" value={formData.payment_date} onChange={e=>setFormData({...formData, payment_date: e.target.value})}/></div>
                  <div><label className="text-xs font-bold text-[#282860] uppercase">Total Commission Payable</label><input type="text" className="w-full mt-1 p-3 border-2 border-[#282860] rounded-xl font-black text-xl text-green-600 bg-white" placeholder="$" value={formData.total_payable} onChange={e=>setFormData({...formData, total_payable: e.target.value})}/></div>
                  <div className="col-span-2"><label className="text-xs font-bold text-slate-500 uppercase">Notes / Adjustments</label><textarea rows={3} className="w-full mt-1 p-3 border border-slate-200 rounded-xl" value={formData.calc_notes} onChange={e=>setFormData({...formData, calc_notes: e.target.value})}></textarea></div>
                </div>
              )}

            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] z-10">
              <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-2.5 text-slate-500 font-bold text-sm hover:text-slate-800">Cancel</button>
              <button onClick={handleSaveInstitution} className="bg-[#282860] hover:bg-[#1b1b42] text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-md transition-colors">Save Institution Data</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}