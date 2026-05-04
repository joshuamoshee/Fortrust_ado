"use client";

import { useState } from "react";
import { UploadCloud, FileText, CheckCircle2, Building2, Calendar, User, Mail, Percent, Loader2 } from "lucide-react";

export default function CommissionExtractor() {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [contractData, setContractData] = useState<any>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsAnalyzing(true);
    setContractData(null); // <-- CLEARS the screen before a new upload starts
    
    const formData = new FormData();
    formData.append("contract", file);

    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/extract-commission`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      });
      
      const result = await res.json();
      
      // 🚨 NEW USER-FRIENDLY FAIL-SAFE LOGIC 🚨
      if (result.status === "success") {
        if (result.data.is_valid === false) {
          // The AI rejected the PDF (no institution found, wrong document type, etc.)
          alert(result.data.error_message);
        } else {
          // The AI successfully found a valid contract!
          setContractData(result.data);
        }
      } else {
        alert("Failed to analyze document. Please try a different PDF.");
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
        <p className="text-slate-500 text-sm mt-1">Upload a University PDF contract to automatically extract rates and PIC data.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Upload Area */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
          <form onSubmit={handleUpload} className="space-y-4 text-center">
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative">
              <input 
                type="file" 
                accept=".pdf" 
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <FileText className="mx-auto h-12 w-12 text-slate-400 mb-3" />
              <p className="text-sm font-bold text-slate-700">
                {file ? file.name : "Click or Drag PDF Contract Here"}
              </p>
              <p className="text-xs text-slate-500 mt-1">Supports standard University Agreements</p>
            </div>
            
            <button 
              disabled={!file || isAnalyzing} 
              type="submit" 
              className="w-full bg-[#282860] hover:bg-[#1a1a40] text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 flex justify-center items-center gap-2"
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
                        <p className="text-[10px] font-bold text-slate-400 uppercase truncate">{key.replace(/_/g, ' ')}</p>
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