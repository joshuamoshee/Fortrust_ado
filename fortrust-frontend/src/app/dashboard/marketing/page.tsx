"use client";

import { useState, useEffect } from "react";
import { Users, UploadCloud, Download, Flame, Thermometer, Snowflake, Plus, FileText, FileSpreadsheet, CheckCircle2, Loader2, X, AlertCircle, Search, Filter, Globe2, Copy, QrCode } from "lucide-react";

export default function MarketingDashboard() {
  const [leads, setLeads] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("database"); 
  const [isLoading, setIsLoading] = useState(true);
  
  // Manual Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [wa, setWa] = useState("");
  const [program, setProgram] = useState("");
  const [source, setSource] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk Upload State
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{status: string, message: string} | null>(null);

  // QR Code State
  const [showQR, setShowQR] = useState(false);
  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/apply` : 'https://yourwebsite.com/apply';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=20&data=${encodeURIComponent(publicUrl)}`;

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("name", name); formData.append("email", email); formData.append("wa_number", wa);
    formData.append("program_interest", program); formData.append("lead_source", source);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/marketing/leads`, {
        method: "POST", body: formData,
      });
      const data = await res.json();
      if (data.status === "success") {
        setName(""); setEmail(""); setWa(""); setProgram(""); setSource("");
        setActiveTab("database");
        fetchLeads(); 
      }
    } catch (error) {
      alert("Failed to submit lead.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(""); setUploadResult(null);
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validExtensions = [".csv", ".xls", ".xlsx"];
    const isExtensionValid = validExtensions.some(ext => selectedFile.name.toLowerCase().endsWith(ext));

    if (!isExtensionValid) {
      setFileError("Invalid format. Please upload an Excel (.xlsx) or CSV file.");
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setFileError("File is too large. Maximum size is 10MB.");
      return;
    }
    setFile(selectedFile);
  };

  const handleDownloadTemplate = () => {
    const headers = "Name,Email (Active),WA,Program yang diminati,How do you know about this event?\n";
    const exampleRow = "Budi Santoso,budi@example.com,08123456789,Bachelor of Business,Website\n";
    const blob = new Blob([headers + exampleRow], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Fortrust_Lead_Upload_Format.csv";
    link.click();
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setIsUploading(true); setUploadResult(null);
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/bulk-upload`, {
        method: "POST", headers: { "Authorization": `Bearer ${token}` }, body: formData,
      });
      const result = await res.json();
      if (res.ok) {
        setUploadResult({ status: "success", message: result.message });
        setFile(null); 
        fetchLeads(); 
      } else {
        setFileError(result.detail || "Failed to process the Excel file.");
      }
    } catch (error) {
      setFileError("Network error. Please check your connection.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    alert("Public registration link copied to clipboard!");
  };

  const downloadQRCode = async () => {
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Fortrust_Registration_QRCode.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert("Failed to download QR Code. You can right-click the image to save it.");
    }
  };

  // UX Analytics
  const unassignedLeads = leads.filter(l => l.assignee === "Unassigned");
  const hotLeads = unassignedLeads.filter(l => l.lead_temperature === "Hot Leads");
  const warmLeads = unassignedLeads.filter(l => l.lead_temperature === "Warm Leads");
  const coldLeads = unassignedLeads.filter(l => l.lead_temperature === "Cold Leads" || !l.lead_temperature);

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6 font-sans antialiased">
      
      {/* QR CODE MODAL */}
      {showQR && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center relative animate-in zoom-in duration-200">
            <button onClick={() => setShowQR(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full"><X size={20}/></button>
            <h3 className="text-xl font-black text-[#282860] mb-1 mt-2">Scan to Register</h3>
            <p className="text-slate-500 text-sm mb-6">Students can scan this with their phone camera to instantly open the application form.</p>
            
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 inline-block mb-6 shadow-inner">
              {/* Uses a free, fast API to generate the code dynamically based on your website URL */}
              <img src={qrUrl} alt="Registration QR Code" className="w-56 h-56 mx-auto rounded-lg mix-blend-multiply" crossOrigin="anonymous" />
            </div>
            
            <button onClick={downloadQRCode} className="w-full bg-[#BAD133] hover:bg-[#a5b92e] text-[#282860] font-black py-4 rounded-xl transition-colors flex justify-center items-center gap-2 shadow-sm">
              <Download size={18}/> Download Image for Print
            </button>
          </div>
        </div>
      )}

      {/* PROFESSIONAL HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-[#282860] tracking-tight">Marketing Hub</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Ingest, auto-grade, and manage raw incoming leads.</p>
        </div>
        
        {/* SLEEK TAB NAVIGATION */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          <button onClick={() => setActiveTab("database")} className={`flex-1 md:flex-none px-6 py-2 text-sm font-bold rounded-lg flex items-center gap-2 transition-all ${activeTab === 'database' ? 'bg-white text-[#282860] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Users size={16}/> Lead Database
          </button>
          <button onClick={() => setActiveTab("import")} className={`flex-1 md:flex-none px-6 py-2 text-sm font-bold rounded-lg flex items-center gap-2 transition-all ${activeTab === 'import' ? 'bg-white text-[#282860] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <FileSpreadsheet size={16}/> Import Excel
          </button>
          <button onClick={() => setActiveTab("manual")} className={`flex-1 md:flex-none px-6 py-2 text-sm font-bold rounded-lg flex items-center gap-2 transition-all ${activeTab === 'manual' ? 'bg-white text-[#282860] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Plus size={16}/> Direct Entry & Links
          </button>
        </div>
      </div>

      {/* VIEW 1: ENTERPRISE LEAD DATABASE (TABLE) */}
      {activeTab === "database" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Unassigned</p>
              <p className="text-2xl font-black text-[#282860]">{unassignedLeads.length}</p>
            </div>
            <div className="bg-red-50 p-5 rounded-2xl border border-red-100 shadow-sm">
              <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Flame size={14}/> Hot Leads</p>
              <p className="text-2xl font-black text-red-700">{hotLeads.length}</p>
            </div>
            <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100 shadow-sm">
              <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Thermometer size={14}/> Warm Leads</p>
              <p className="text-2xl font-black text-orange-700">{warmLeads.length}</p>
            </div>
            <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 shadow-sm">
              <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Snowflake size={14}/> Cold Leads</p>
              <p className="text-2xl font-black text-blue-700">{coldLeads.length}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div className="flex items-center text-slate-400 bg-white px-3 py-2 rounded-lg border border-slate-200 w-80 focus-within:border-[#BAD133] transition-all shadow-sm">
                <Search size={16} className="mr-2 text-slate-400" />
                <input type="text" placeholder="Search leads by name or email..." className="bg-transparent border-none outline-none text-sm text-slate-700 w-full" />
              </div>
              <button className="flex items-center gap-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                <Filter size={16}/> Filter
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 z-10 shadow-sm">
                  <tr className="border-b border-slate-200 text-[10px] font-black text-slate-500 tracking-wider uppercase">
                    <th className="px-6 py-4">Lead Info</th>
                    <th className="px-6 py-4">AI Temperature</th>
                    <th className="px-6 py-4">Program Interest</th>
                    <th className="px-6 py-4">Lead Source</th>
                    <th className="px-6 py-4 text-right">Date Added</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {isLoading ? (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-400 font-medium">Loading database...</td></tr>
                  ) : unassignedLeads.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-400 font-medium">No unassigned leads in the database.</td></tr>
                  ) : (
                    unassignedLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <p className="font-bold text-[#282860]">{lead.name}</p>
                          <p className="text-xs text-slate-500">{lead.email}</p>
                          {lead.phone && <p className="text-[10px] text-slate-400 font-medium mt-0.5">WA: {lead.phone}</p>}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border
                            ${lead.lead_temperature === 'Hot Leads' ? 'bg-red-50 text-red-700 border-red-200' :
                              lead.lead_temperature === 'Warm Leads' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                              'bg-blue-50 text-blue-700 border-blue-200'}`}>
                            {lead.lead_temperature === 'Hot Leads' && <Flame size={12}/>}
                            {lead.lead_temperature === 'Warm Leads' && <Thermometer size={12}/>}
                            {(lead.lead_temperature === 'Cold Leads' || !lead.lead_temperature) && <Snowflake size={12}/>}
                            {lead.lead_temperature || "Cold Leads"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 text-xs font-medium">{lead.program_interest || <span className="text-slate-300 italic">Not specified</span>}</td>
                        <td className="px-6 py-4 text-slate-600 text-xs font-medium">{lead.lead_source || <span className="text-slate-300 italic">Not specified</span>}</td>
                        <td className="px-6 py-4 text-right text-slate-400 text-xs">{new Date(lead.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: PROFESSIONAL EXCEL IMPORT WIZARD */}
      {activeTab === "import" && (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                <FileSpreadsheet size={32} />
              </div>
              <h2 className="text-xl font-black text-[#282860]">Import Excel Leads</h2>
              <p className="text-slate-500 text-sm mt-2">Upload your `.xlsx` or `.csv` file. Our AI will automatically grade the leads and populate the database.</p>
            </div>
            
            <form onSubmit={handleBulkUpload} className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800">Step 1: Get the format</p>
                  <p className="text-xs text-slate-500">Ensure your columns perfectly match our system.</p>
                </div>
                <button type="button" onClick={handleDownloadTemplate} className="text-xs font-bold text-[#282860] bg-white border border-slate-200 px-4 py-2 rounded-lg shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-2">
                  <Download size={14}/> Template
                </button>
              </div>

              <div>
                <p className="text-sm font-bold text-slate-800 mb-3">Step 2: Upload Data</p>
                {!file ? (
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative group text-center">
                    <input type="file" accept=".csv, .xls, .xlsx" onChange={handleFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <UploadCloud className="mx-auto h-10 w-10 text-slate-400 mb-3 group-hover:text-emerald-500 transition-colors" />
                    <p className="text-sm font-bold text-slate-700 group-hover:text-emerald-600">Click to Select Excel File</p>
                    <p className="text-xs text-slate-500 mt-1">or drag & drop here</p>
                  </div>
                ) : (
                  <div className="border-2 border-emerald-500 bg-emerald-50 rounded-xl p-4 relative text-left shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-white rounded-lg shadow-sm text-emerald-600"><CheckCircle2 size={20}/></div>
                        <div className="overflow-hidden">
                          <p className="text-sm font-bold text-slate-800 truncate">{file.name}</p>
                          <p className="text-xs font-bold text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => {setFile(null); setFileError("")}} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors"><X size={16} /></button>
                    </div>
                  </div>
                )}
              </div>

              {fileError && <div className="flex items-start gap-2 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-100"><AlertCircle size={14} className="mt-0.5 flex-shrink-0" /><p>{fileError}</p></div>}

              {uploadResult && (
                <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 text-center">
                  <p className="text-sm font-bold">{uploadResult.message}</p>
                </div>
              )}
              
              <button disabled={!file || isUploading} type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 flex justify-center items-center gap-2 shadow-sm">
                {isUploading ? <><Loader2 className="animate-spin" size={18}/> Importing Database...</> : "Start Import"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* VIEW 3: DIRECT ENTRY & PUBLIC LINK */}
      {activeTab === "manual" && (
        <div className="max-w-xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* THE ENHANCED PUBLIC LINK CARD WITH QR CODE BUTTON */}
          <div className="bg-gradient-to-br from-[#282860] to-[#1b1b42] p-6 rounded-2xl shadow-sm border border-slate-700">
            <h2 className="text-lg font-black text-white mb-2 flex items-center gap-2"><Globe2 className="text-[#BAD133]"/> Public Registration Access</h2>
            <p className="text-slate-300 text-sm mb-5">Share this link directly with students or display the QR code at physical events. Submissions instantly appear in your Lead Database.</p>
            
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex flex-1 items-center gap-2 w-full">
                <input 
                  type="text" 
                  readOnly 
                  value={publicUrl} 
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg p-3.5 text-sm font-medium text-white outline-none w-full" 
                />
                <button 
                  onClick={handleCopyLink} 
                  className="bg-white/10 hover:bg-white/20 text-white font-bold py-3.5 px-4 rounded-lg transition-colors flex items-center gap-2 shadow-sm shrink-0"
                >
                  <Copy size={16}/> Copy
                </button>
              </div>
              
              <button 
                onClick={() => setShowQR(true)} 
                className="bg-[#BAD133] hover:bg-[#a3b827] text-[#1b1b42] w-full sm:w-auto font-black py-3.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm shrink-0"
              >
                <QrCode size={18}/> Show QR Code
              </button>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-black text-[#282860] mb-2 flex items-center gap-2"><Plus className="text-[#BAD133]"/> Add Single Lead</h2>
            <p className="text-slate-500 text-sm mb-6 pb-6 border-b border-slate-100">Manually add a student from a phone call or walk-in.</p>
            
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name *</label><input required value={name} onChange={(e)=>setName(e.target.value)} type="text" className="w-full mt-1.5 border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" placeholder="e.g. Andi Saputra" /></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email (Active) *</label><input required value={email} onChange={(e)=>setEmail(e.target.value)} type="email" className="w-full mt-1.5 border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" placeholder="andi@example.com" /></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">WhatsApp Number</label><input value={wa} onChange={(e)=>setWa(e.target.value)} type="text" className="w-full mt-1.5 border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" placeholder="+62..." /></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Program of Interest</label><input value={program} onChange={(e)=>setProgram(e.target.value)} type="text" className="w-full mt-1.5 border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all" placeholder="e.g. Master of Data Science" /></div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lead Source</label>
                <select value={source} onChange={(e)=>setSource(e.target.value)} className="w-full mt-1.5 border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all bg-white">
                  <option value="">Select source...</option>
                  <option value="Instagram">Instagram</option>
                  <option value="TikTok">TikTok</option>
                  <option value="School Visit">School Visit</option>
                  <option value="Friend/Family">Friend/Family</option>
                </select>
              </div>
              <button disabled={isSubmitting} type="submit" className="w-full bg-[#282860] hover:bg-[#1a1a40] text-white font-bold py-3.5 rounded-xl mt-6 transition-all shadow-sm">
                {isSubmitting ? "Processing..." : "Save & Auto-Grade Lead"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}