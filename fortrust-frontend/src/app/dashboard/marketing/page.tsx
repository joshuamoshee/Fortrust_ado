"use client";

import { useState, useEffect } from "react";
import { Users, UploadCloud, Download, Flame, Thermometer, Snowflake, Plus, FileText } from "lucide-react";

export default function MarketingDashboard() {
  const [leads, setLeads] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("pipeline"); // 'pipeline' | 'add_single' | 'bulk_upload'
  
  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [wa, setWa] = useState("");
  const [program, setProgram] = useState("");
  const [source, setSource] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline?role=MASTER_ADMIN`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") {
        setLeads(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch leads:", error);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("wa_number", wa);
    formData.append("program_interest", program);
    formData.append("lead_source", source);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/marketing/leads`, {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      if (data.status === "success") {
        alert(`Success! Lead saved and graded as: ${data.temperature}`);
        // Reset Form
        setName(""); setEmail(""); setWa(""); setProgram(""); setSource("");
        setActiveTab("pipeline");
        fetchLeads(); // Refresh the pipeline
      }
    } catch (error) {
      alert("Failed to submit lead.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,Name,Email,WA,Program Interest,Lead Source\nBudi,budi@email.com,081234567,Business,Instagram";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Fortrust_Lead_Template.csv");
    document.body.appendChild(link);
    link.click();
  };

  // Grouping leads by temperature
  const hotLeads = leads.filter(l => l.lead_temperature === "Hot Leads");
  const warmLeads = leads.filter(l => l.lead_temperature === "Warm Leads");
  const coldLeads = leads.filter(l => l.lead_temperature === "Cold Leads" || !l.lead_temperature);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 bg-slate-50 min-h-screen">
      
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-[#282860]">Marketing Hub</h1>
          <p className="text-slate-500 text-sm mt-1">Ingest, Filter, and Grade Leads Automatically</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setActiveTab("pipeline")} className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'pipeline' ? 'bg-[#282860] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Pipeline View</button>
          <button onClick={() => setActiveTab("add_single")} className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 ${activeTab === 'add_single' ? 'bg-[#BAD133] text-[#282860]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><Plus size={16}/> Add Single Lead</button>
          <button onClick={() => setActiveTab("bulk_upload")} className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 ${activeTab === 'bulk_upload' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><UploadCloud size={16}/> Bulk Upload</button>
        </div>
      </div>

      {/* VIEW 1: MANUAL ADD FORM */}
      {activeTab === "add_single" && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-2xl mx-auto">
          <h2 className="text-lg font-bold text-[#282860] mb-6 flex items-center gap-2"><FileText className="text-[#BAD133]"/> Manual Data Entry (G-Form Style)</h2>
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div><label className="text-sm font-bold text-slate-600">Full Name</label><input required value={name} onChange={(e)=>setName(e.target.value)} type="text" className="w-full mt-1 border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-[#BAD133]" placeholder="e.g. Andi Saputra" /></div>
            <div><label className="text-sm font-bold text-slate-600">Email (Active)</label><input required value={email} onChange={(e)=>setEmail(e.target.value)} type="email" className="w-full mt-1 border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-[#BAD133]" placeholder="andi@example.com" /></div>
            <div><label className="text-sm font-bold text-slate-600">WhatsApp Number</label><input value={wa} onChange={(e)=>setWa(e.target.value)} type="text" className="w-full mt-1 border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-[#BAD133]" placeholder="+62..." /></div>
            <div><label className="text-sm font-bold text-slate-600">Program yang diminati</label><input value={program} onChange={(e)=>setProgram(e.target.value)} type="text" className="w-full mt-1 border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-[#BAD133]" placeholder="e.g. Master of Data Science" /></div>
            <div>
              <label className="text-sm font-bold text-slate-600">How do you know about this event?</label>
              <select value={source} onChange={(e)=>setSource(e.target.value)} className="w-full mt-1 border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-[#BAD133]">
                <option value="">Select source...</option>
                <option value="Instagram">Instagram</option>
                <option value="TikTok">TikTok</option>
                <option value="School Visit">School Visit</option>
                <option value="Friend/Family">Friend/Family</option>
              </select>
            </div>
            <button disabled={isSubmitting} type="submit" className="w-full bg-[#282860] hover:bg-[#1a1a40] text-white font-bold py-4 rounded-xl mt-4 transition-colors">
              {isSubmitting ? "Processing..." : "Save & Auto-Grade Lead"}
            </button>
          </form>
        </div>
      )}

      {/* VIEW 2: BULK UPLOAD */}
      {activeTab === "bulk_upload" && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-2xl mx-auto">
           <UploadCloud className="mx-auto h-16 w-16 text-blue-500 mb-4" />
           <h2 className="text-xl font-bold text-slate-800">Bulk Upload Leads</h2>
           <p className="text-slate-500 text-sm mt-2 mb-8">Upload an Excel/CSV file to process hundreds of leads at once. The AI will automatically grade them.</p>
           
           <div className="flex justify-center gap-4">
              <button onClick={handleDownloadTemplate} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-colors">
                <Download size={18}/> Download CSV Template
              </button>
              <button className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-colors">
                Select File to Upload
              </button>
           </div>
           <p className="text-xs text-slate-400 mt-6">(Note: CSV processing endpoint to be connected in next step)</p>
        </div>
      )}

      {/* VIEW 3: PIPELINE (AUTO-SORTED) */}
      {activeTab === "pipeline" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* HOT LEADS */}
          <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
            <h3 className="font-black text-red-700 flex items-center gap-2 mb-4 uppercase text-sm tracking-wider"><Flame size={18}/> Hot Leads ({hotLeads.length})</h3>
            <div className="space-y-3">
              {hotLeads.map(lead => <LeadCard key={lead.id} lead={lead} borderColor="border-red-200" tagColor="bg-red-100 text-red-700" />)}
            </div>
          </div>

          {/* WARM LEADS */}
          <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
            <h3 className="font-black text-orange-700 flex items-center gap-2 mb-4 uppercase text-sm tracking-wider"><Thermometer size={18}/> Warm Leads ({warmLeads.length})</h3>
            <div className="space-y-3">
              {warmLeads.map(lead => <LeadCard key={lead.id} lead={lead} borderColor="border-orange-200" tagColor="bg-orange-100 text-orange-700" />)}
            </div>
          </div>

          {/* COLD LEADS */}
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
            <h3 className="font-black text-blue-700 flex items-center gap-2 mb-4 uppercase text-sm tracking-wider"><Snowflake size={18}/> Cold Leads ({coldLeads.length})</h3>
            <div className="space-y-3">
              {coldLeads.map(lead => <LeadCard key={lead.id} lead={lead} borderColor="border-blue-200" tagColor="bg-blue-100 text-blue-700" />)}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}

function LeadCard({ lead, borderColor, tagColor }: { lead: any, borderColor: string, tagColor: string }) {
  return (
    <div className={`bg-white p-4 rounded-xl shadow-sm border ${borderColor} hover:shadow-md transition-shadow`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="font-bold text-slate-800">{lead.name}</p>
          <p className="text-xs text-slate-500 mt-1">{lead.email}</p>
          {lead.phone && <p className="text-xs text-slate-500">WA: {lead.phone}</p>}
        </div>
        <span className={`text-[10px] font-black px-2 py-1 rounded-md ${tagColor}`}>{lead.lead_temperature}</span>
      </div>
      {(lead.program_interest || lead.lead_source) && (
        <div className="mt-3 pt-3 border-t border-slate-100 text-xs">
          {lead.program_interest && <p className="text-slate-600"><span className="font-bold">Interest:</span> {lead.program_interest}</p>}
          {lead.lead_source && <p className="text-slate-400 mt-1 italic">Source: {lead.lead_source}</p>}
        </div>
      )}
    </div>
  );
}