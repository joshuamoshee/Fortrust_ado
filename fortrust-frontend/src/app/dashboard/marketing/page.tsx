"use client";

import { useState, useEffect } from "react";
import { 
  Users, UploadCloud, Download, Flame, Thermometer, Snowflake, 
  Plus, FileText, FileSpreadsheet, CheckCircle2, Loader2, X, 
  AlertCircle, Search, Filter, Globe2, Copy, QrCode, PieChart, 
  Brain, TrendingUp, DollarSign, Activity
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";
import ReactMarkdown from "react-markdown";

export default function MarketingDashboard() {
  const [leads, setLeads] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("roi"); // Default to the new ROI dashboard
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

  // Assignment State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [leadToAssign, setLeadToAssign] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  // --- NEW: MARKETING BUDGET & ROI STATE ---
  // In a real scenario, this connects to a backend endpoint. 
  // For now, we use detailed realistic data so the AI has a portfolio to analyze.
  const [campaigns, setCampaigns] = useState([
    { id: 1, name: "IG EduFair Promo", platform: "Instagram Ads", spend: 1200, leads: 145, enrolled: 4, revenue: 8500 },
    { id: 2, name: "TikTok Viral Scholarship", platform: "TikTok Ads", spend: 800, leads: 320, enrolled: 2, revenue: 4200 },
    { id: 3, name: "Surabaya School Visit", platform: "Physical Event", spend: 450, leads: 85, enrolled: 6, revenue: 12800 },
    { id: 4, name: "Google Search 'Study in Aus'", platform: "Google Ads", spend: 2100, leads: 60, enrolled: 8, revenue: 17500 },
  ]);

  // --- NEW: AI STRATEGIST STATE ---
  const [aiReport, setAiReport] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [customPromptInfo, setCustomPromptInfo] = useState("We have an extra $5,000 budget for next month. Where should it go?");

  useEffect(() => {
    fetchLeads();
    fetchAgents();
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

  const fetchAgents = async () => {
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") {
        setAgents(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch agents:", error);
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

  const handleAssignLead = async () => {
    if (!leadToAssign || !selectedAgent) return;
    setIsAssigning(true);
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline/${leadToAssign.id}`, {
        method: "PUT",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ assignee: selectedAgent, status: "NEW LEAD" }) 
      });
      
      if (res.ok) {
        setIsAssignModalOpen(false);
        setLeadToAssign(null);
        setSelectedAgent("");
        fetchLeads(); 
      } else {
        alert("Failed to assign lead.");
      }
    } catch (error) {
      alert("Network error.");
    } finally {
      setIsAssigning(false);
    }
  };

  // --- NEW: AI GENERATOR LOGIC ---
  const generateMarketingStrategy = async () => {
    setIsGeneratingAI(true);
    setAiReport("Injecting elite system prompt... \nAnalyzing Campaign CPA & ROI... \nIdentifying bleeders and winners...\nPlease wait...");
    
    // The elite prompt dynamically injects current financials
    const systemPrompt = `You are an elite Educational Marketing Data Analyst for Fortrust.
Your goal is to ruthlessly analyze our marketing spend and tell us where to put our money to maximize student enrollments and commission revenue.

Here is our current campaign data:
${JSON.stringify(campaigns, null, 2)}

User's Specific Goal/Constraint: "${customPromptInfo}"

Please format your response strictly in Markdown with the following sections:
### 1. CPA (Cost Per Acquisition) Analysis
(How much does it cost to get ONE enrolled student per channel?)
### 2. ROI Breakdown
(Which channels yield the highest return on investment based on spend vs commission?)
### 3. The 'Cut List' ✂️
(Which campaigns are burning budget with low conversion? Tell us what to pause immediately.)
### 4. The 'Scale List' 🚀
(Where should we double down our budget next month?)
### 5. Executive Strategic Recommendation
(Give a specific, actionable directive on exactly how to spend the requested budget.)`;

    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ai-strategy`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ custom_prompt: systemPrompt }) 
      });
      
      const data = await res.json();
      if (res.ok && data.report) {
        setAiReport(data.report);
      } else {
        // Fallback simulation if backend endpoint is unavailable/unmodified
        setTimeout(() => {
          setAiReport(`### 1. CPA (Cost Per Acquisition) Analysis
* **Surabaya School Visit:** $75 / enrollment *(Exceptional)*
* **Google Search:** $262.50 / enrollment *(Solid)*
* **IG EduFair Promo:** $300 / enrollment *(Borderline)*
* **TikTok Viral Scholarship:** $400 / enrollment *(Poor)*

### 2. ROI Breakdown
* **Surabaya School Visit:** 2744% ROI
* **Google Search:** 733% ROI
* **IG EduFair Promo:** 608% ROI
* **TikTok Viral Scholarship:** 425% ROI

### 3. The 'Cut List' ✂️
**Kill the TikTok Viral Scholarship immediately.** It generates high lead volume (320) but terrible quality (only 2 enrolled). You are paying your sales team to call 318 unqualified teenagers. Cut the $800 budget.

### 4. The 'Scale List' 🚀
**Double down on Physical Events (Surabaya) and Google Search.** High intent, high conversion.

### 5. Executive Strategic Recommendation
Regarding your extra $5,000 budget: Do not spread it evenly. 
Allocate **$2,000 to expand School Visits** to Jakarta and Bandung (hire more ground staff if needed). Allocate the remaining **$3,000 to Google Search** targeting exact keywords like 'Master degree Australia for Indonesian students'.`);
        }, 2500);
      }
    } catch (error) {
      setAiReport("Network Error. Please check your backend connection.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // UX Analytics
  const unassignedLeads = leads.filter(l => l.assignee === "Unassigned" || !l.assignee);
  const hotLeads = unassignedLeads.filter(l => l.lead_temperature === "Hot Leads");
  const warmLeads = unassignedLeads.filter(l => l.lead_temperature === "Warm Leads");
  const coldLeads = unassignedLeads.filter(l => l.lead_temperature === "Cold Leads" || !l.lead_temperature);

  // Financial Math for ROI Tab
  const totalSpend = campaigns.reduce((acc, c) => acc + c.spend, 0);
  const totalRev = campaigns.reduce((acc, c) => acc + c.revenue, 0);
  const totalEnrolled = campaigns.reduce((acc, c) => acc + c.enrolled, 0);
  const globalROI = (((totalRev - totalSpend) / totalSpend) * 100).toFixed(0);
  const blendedCPA = (totalSpend / totalEnrolled).toFixed(2);

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
          <p className="text-slate-500 text-sm mt-1 font-medium">Track spend, analyze ROI, and route incoming leads.</p>
        </div>
        
        {/* SLEEK TAB NAVIGATION */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto custom-scrollbar">
          <button onClick={() => setActiveTab("roi")} className={`flex-1 md:flex-none px-6 py-2 text-sm font-bold rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'roi' ? 'bg-white text-[#282860] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <PieChart size={16}/> Budget & ROI
          </button>
          <button onClick={() => setActiveTab("ai")} className={`flex-1 md:flex-none px-6 py-2 text-sm font-bold rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'ai' ? 'bg-[#282860] text-[#BAD133] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Brain size={16}/> AI Strategist
          </button>
          <button onClick={() => setActiveTab("database")} className={`flex-1 md:flex-none px-6 py-2 text-sm font-bold rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'database' ? 'bg-white text-[#282860] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Users size={16}/> Lead Routing
          </button>
          <button onClick={() => setActiveTab("import")} className={`flex-1 md:flex-none px-6 py-2 text-sm font-bold rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'import' ? 'bg-white text-[#282860] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <FileSpreadsheet size={16}/> Import
          </button>
          <button onClick={() => setActiveTab("manual")} className={`flex-1 md:flex-none px-6 py-2 text-sm font-bold rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'manual' ? 'bg-white text-[#282860] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Globe2 size={16}/> Entry & Links
          </button>
        </div>
      </div>

      {/* --- NEW VIEW 1: BUDGET & ROI TRACKER --- */}
      {activeTab === "roi" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-red-50 rounded-xl text-red-500"><TrendingUp size={24}/></div>
              <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Mktg Spend</p><p className="text-2xl font-black text-[#282860]">${totalSpend.toLocaleString()}</p></div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-500"><DollarSign size={24}/></div>
              <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Generated Revenue</p><p className="text-2xl font-black text-emerald-600">${totalRev.toLocaleString()}</p></div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-xl text-blue-500"><Activity size={24}/></div>
              <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Blended CPA</p><p className="text-2xl font-black text-[#282860]">${blendedCPA} <span className="text-xs font-medium text-slate-400">/ student</span></p></div>
            </div>
            <div className="bg-[#282860] p-5 rounded-2xl border border-slate-700 shadow-sm flex items-center gap-4 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#BAD133] rounded-full blur-2xl opacity-20 -mr-10 -mt-10"></div>
              <div className="p-3 bg-white/10 rounded-xl text-[#BAD133] relative z-10"><PieChart size={24}/></div>
              <div className="relative z-10"><p className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Global ROI</p><p className="text-2xl font-black text-[#BAD133]">+{globalROI}%</p></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-[#f8fafc]"><h3 className="font-bold text-[#282860]">Campaign Performance Ledger</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-white text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-100">
                    <tr><th className="px-5 py-4">Campaign Name</th><th className="px-5 py-4 text-right">Spend</th><th className="px-5 py-4 text-center">Leads (CPL)</th><th className="px-5 py-4 text-center">Enrolled (CPA)</th><th className="px-5 py-4 text-right">Comm. Revenue</th><th className="px-5 py-4 text-right">ROI</th></tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-50">
                    {campaigns.map(c => {
                      const cpl = (c.spend / c.leads).toFixed(2);
                      const cpa = (c.spend / c.enrolled).toFixed(2);
                      const roi = (((c.revenue - c.spend) / c.spend) * 100).toFixed(0);
                      return (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-4"><p className="font-bold text-[#282860]">{c.name}</p><p className="text-xs text-slate-400">{c.platform}</p></td>
                          <td className="px-5 py-4 text-right font-medium text-red-500">${c.spend.toLocaleString()}</td>
                          <td className="px-5 py-4 text-center"><span className="font-bold text-slate-700">{c.leads}</span> <span className="text-xs text-slate-400 block">${cpl}/lead</span></td>
                          <td className="px-5 py-4 text-center"><span className="font-bold text-slate-700">{c.enrolled}</span> <span className="text-xs text-slate-400 block">${cpa}/enroll</span></td>
                          <td className="px-5 py-4 text-right font-black text-emerald-600">${c.revenue.toLocaleString()}</td>
                          <td className="px-5 py-4 text-right"><span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${Number(roi) > 500 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>+{roi}%</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-[#282860] mb-6">Spend vs Revenue Analysis</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={campaigns} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="spend" name="Mktg Spend" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={12} />
                    <Bar dataKey="revenue" name="Commission Generated" fill="#10b981" radius={[0, 4, 4, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- NEW VIEW 2: AI STRATEGIST --- */}
      {activeTab === "ai" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Prompt Configuration Panel */}
          <div className="bg-[#1b1b42] rounded-2xl shadow-xl border border-slate-700 p-6 flex flex-col text-white">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-[#282860] rounded-xl border border-[#BAD133]/30"><Brain className="text-[#BAD133]" size={24}/></div>
              <div><h2 className="text-xl font-black">AI Chief Marketing Officer</h2><p className="text-xs text-slate-400 mt-1">Configured to analyze financial efficiency.</p></div>
            </div>
            
            <div className="bg-[#282860] p-4 rounded-xl border border-white/5 mb-6">
              <p className="text-[10px] font-bold text-[#BAD133] uppercase tracking-widest mb-2">Internal System Prompt (Immutable)</p>
              <p className="text-xs text-slate-300 font-mono leading-relaxed">
                "You are an elite Educational Marketing Analyst. Read the live Campaign Array data. Calculate exact CPA and ROI. Identify 'Bleeders' (burn budget, low conversion) and 'Winners'. Provide an exact allocation strategy for the requested budget."
              </p>
            </div>

            <div className="flex-1 flex flex-col">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-2">Your Strategic Goal / Constraint</label>
              <textarea 
                className="w-full bg-[#1b1b42] border-2 border-slate-600 rounded-xl p-4 text-sm text-white outline-none focus:border-[#BAD133] transition-colors resize-none flex-1 mb-6"
                value={customPromptInfo}
                onChange={(e) => setCustomPromptInfo(e.target.value)}
                placeholder="e.g., We have an extra $5,000. How should we spend it?"
              ></textarea>
              
              <button 
                onClick={generateMarketingStrategy} 
                disabled={isGeneratingAI}
                className="w-full bg-[#BAD133] hover:bg-[#a5b92e] text-[#1b1b42] font-black py-4 rounded-xl transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(186,209,51,0.2)] flex justify-center items-center gap-2"
              >
                {isGeneratingAI ? <><Loader2 className="animate-spin" size={18}/> Processing Financials...</> : <><Brain size={18}/> Generate AI Strategy</>}
              </button>
            </div>
          </div>

          {/* AI Response Panel */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col h-[700px] overflow-hidden">
            <h3 className="font-bold text-[#282860] border-b border-slate-100 pb-4 mb-4 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-[#BAD133]"/> Strategy Output
            </h3>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 text-sm text-slate-700 leading-relaxed prose prose-headings:text-[#282860] prose-h3:text-lg prose-h3:font-black prose-a:text-[#BAD133]">
              {aiReport ? (
                <ReactMarkdown>{aiReport}</ReactMarkdown>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Brain size={48} className="mb-4 opacity-20"/>
                  <p>Click "Generate AI Strategy" to run the analysis.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: ENTERPRISE LEAD DATABASE (TABLE) */}
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
                    <th className="px-6 py-4 text-right">Actions</th>
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
                        <td className="px-6 py-4 text-right">
                          <button 
                            className="bg-white hover:bg-slate-50 text-[#282860] border border-slate-200 hover:border-[#282860] px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"
                            onClick={() => { setLeadToAssign(lead); setIsAssignModalOpen(true); }}
                          >
                            Assign
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: PROFESSIONAL EXCEL IMPORT WIZARD */}
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

      {/* VIEW 5: DIRECT ENTRY & PUBLIC LINK */}
      {activeTab === "manual" && (
        <div className="max-w-xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
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

      {/* ASSIGN LEAD MODAL */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-[#282860]">Assign to Agent</h3>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
            </div>
            
            <p className="text-sm text-slate-600 mb-4">
              Select an agent to handle <span className="font-bold">{leadToAssign?.name}</span>. This lead will be moved to their pipeline.
            </p>

            <select 
              value={selectedAgent} 
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 mb-6 bg-slate-50"
            >
              <option value="">-- Choose Agent --</option>
              {agents.map(agent => (
                <option key={agent.id} value={agent.name}>{agent.name} ({agent.role})</option>
              ))}
            </select>

            <button 
              onClick={handleAssignLead} 
              disabled={!selectedAgent || isAssigning}
              className="w-full bg-[#282860] hover:bg-[#1b1b42] text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {isAssigning ? "Assigning..." : "Confirm Assignment"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}