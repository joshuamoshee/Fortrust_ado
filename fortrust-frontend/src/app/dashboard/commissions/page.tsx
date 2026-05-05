"use client";

import { useState } from "react";
import { UploadCloud, FileText, CheckCircle2, Building2, Calendar, User, Mail, Percent, Loader2, X, AlertCircle, Link as LinkIcon } from "lucide-react";

export default function CommissionExtractor() {
  // UI State
  const [activeTab, setActiveTab] = useState<"file" | "link">("file");
  
  // File State
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  
  // Link State
  const [linkUrl, setLinkUrl] = useState("");

  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [contractData, setContractData] = useState<any>(null);

  // --- FILE HANDLING ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError("");
    const selectedFile = e.target.files?.[0];
    
    if (!selectedFile) return;

    if (selectedFile.type !== "application/pdf") {
      setFileError("Invalid file format. Please upload a PDF document.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setFileError("File is too large. Maximum size is 10MB.");
      return;
    }

    setFile(selectedFile);
  };

  const handleCancelFile = () => {
    setFile(null);
    setFileError("");
  };

  // --- SUBMISSION ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent empty submissions
    if (activeTab === "file" && !file) return;
    if (activeTab === "link" && !linkUrl) return;

    setIsAnalyzing(true);
    setContractData(null); 
    setFileError("");
    
    const formData = new FormData();
    if (activeTab === "file" && file) {
      formData.append("contract", file);
      formData.append("type", "file");
    } else if (activeTab === "link" && linkUrl) {
      formData.append("url", linkUrl);
      formData.append("type", "link");
    }

    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/extract-commission`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      });
      
      const result = await res.json();
      
      if (result.status === "success") {
        if (result.data.is_valid === false) {
          alert(result.data.error_message);
        } else {
          setContractData(result.data);
        }
      } else {
        alert("Failed to analyze document. Please ensure the file or link is accessible.");
      }
    } catch (error) {
      alert("Network error. Please check your internet connection.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold text-[#282860]">Commission Agreement AI</h1>
        <p className="text-slate-500 text-sm mt-1">Upload a University PDF contract or paste a link to automatically extract rates and PIC data.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Upload Area */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
          
          {/* TAB SWITCHER */}
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
            <button 
              onClick={() => setActiveTab("file")}
              className={`flex-1 py-2 text-sm font-bold rounded-lg flex justify-center items-center gap-2 transition-all ${activeTab === 'file' ? 'bg-white text-[#282860] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <UploadCloud size={16} /> File Upload
            </button>
            <button 
              onClick={() => setActiveTab("link")}
              className={`flex-1 py-2 text-sm font-bold rounded-lg flex justify-center items-center gap-2 transition-all ${activeTab === 'link' ? 'bg-white text-[#282860] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <LinkIcon size={16} /> Paste Link
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-center">
            
            {/* VIEW 1: FILE UPLOAD (Mami's Request: Window to pick files) */}
            {activeTab === "file" && (
              <>
                {!file ? (
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative group">
                    {/* This invisible input is what opens the "Window" to pick files */}
                    <input 
                      type="file" 
                      accept=".pdf" 
                      onChange={handleFileSelect}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      title="Click to open file picker"
                    />
                    <FileText className="mx-auto h-12 w-12 text-slate-400 mb-3 group-hover:text-[#282860] transition-colors" />
                    <p className="text-sm font-bold text-slate-700 group-hover:text-[#282860]">
                      Click to Browse Files
                    </p>
                    <p className="text-xs text-slate-500 mt-1">or drag & drop here</p>
                    <div className="mt-4 space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Strictly .PDF files only</p>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-[#BAD133] bg-[#BAD133]/10 rounded-xl p-4 relative text-left">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-white rounded-lg shadow-sm border border-[#BAD133]/30 text-[#282860]">
                          <FileText size={20}/>
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-sm font-bold text-slate-800 truncate">{file.name}</p>
                          <p className="text-xs font-bold text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={handleCancelFile} 
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors flex-shrink-0"
                        title="Remove File"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-[#6a781b]">
                      <CheckCircle2 size={12}/> Ready to extract
                    </div>
                  </div>
                )}
              </>
            )}

            {/* VIEW 2: PASTE LINK (Mami's Request: Copy paste link) */}
            {activeTab === "link" && (
              <div className="text-left space-y-2">
                <label className="text-sm font-bold text-slate-700">Document URL</label>
                <input 
                  type="url" 
                  required
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://drive.google.com/..." 
                  className="w-full border-2 border-slate-200 rounded-xl py-3 px-4 text-sm outline-none focus:border-[#BAD133] focus:ring-4 focus:ring-[#BAD133]/10 transition-all"
                />
                <p className="text-xs text-slate-500 mt-1">Paste a direct link to the University PDF contract.</p>
              </div>
            )}

            {/* Error Message Display */}
            {fileError && activeTab === "file" && (
              <div className="flex items-start gap-2 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-100 text-left">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                <p>{fileError}</p>
              </div>
            )}
            
            <button 
              disabled={isAnalyzing || (activeTab === "file" && !file) || (activeTab === "link" && !linkUrl)} 
              type="submit" 
              className="w-full bg-[#282860] hover:bg-[#1a1a40] text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 flex justify-center items-center gap-2 mt-2"
            >
              {isAnalyzing ? <><Loader2 className="animate-spin" size={18}/> AI is Reading Contract...</> : <><UploadCloud size={18}/> Extract Data</>}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: The Extracted Results */}
        <div className="lg:col-span-2 space-y-6">
          {isAnalyzing && (
            <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 border-4 border-[#BAD133] border-t-transparent rounded-full animate-spin mb-4"></div>
              <h3 className="text-lg font-bold text-[#282860]">Abigail AI is analyzing...</h3>
              <p className="text-slate-500 text-sm">Extracting 15+ data points from the legal text.</p>
            </div>
          )}

          {contractData && !isAnalyzing && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
              
              {/* Institution Header */}
              <div className="bg-emerald-50 border-b border-emerald-100 p-6 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-black text-emerald-900 flex items-center gap-2"><Building2 className="text-emerald-500"/> {contractData.institution_name}</h2>
                  <p className="text-emerald-700 text-sm font-medium mt-1 flex items-center gap-1"><Calendar size={14}/> Expires: {contractData.expiry_date}</p>
                </div>
                <div className="bg-emerald-100 text-emerald-700 p-2 rounded-full"><CheckCircle2 size={24} /></div>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Financial Contacts */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Financial PIC (Person In Charge)</h3>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm text-blue-500"><User size={16}/></div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Name</p>
                        <p className="text-sm font-bold text-slate-800">{contractData.finance_pic_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm text-purple-500"><Mail size={16}/></div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Email</p>
                        <p className="text-sm font-bold text-slate-800">{contractData.finance_pic_email}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Commission Structure Table */}
                <div className="space-y-4 md:col-span-2">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-1"><Percent size={14}/> Commission Structure</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(contractData.commission_structure).map(([key, val]: any) => (
                      <div key={key} className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase truncate">{key}</p>
                        <p className="text-sm font-black text-[#282860] mt-1">{val}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
              
              {/* Save Button */}
              <div className="p-4 bg-slate-50 border-t border-slate-100">
                <button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-colors">
                  Approve & Save to Database
                </button>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}