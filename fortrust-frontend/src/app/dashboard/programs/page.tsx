"use client";

import React, { useState } from "react";
import { 
  FileText, UploadCloud, CheckCircle2, AlertCircle, Clock, 
  Trash2, Eye, ShieldCheck, Sparkles, HelpCircle, ArrowUpRight
} from "lucide-react";

type RequirementDoc = {
  id: string;
  documentName: string;
  category: "Academic" | "Identity" | "Visa" | "Profile";
  isRequired: boolean;
  status: "MISSING" | "PENDING_REVIEW" | "APPROVED";
  uploadedFile?: { name: string; size: string; date: string };
  feedback?: string;
};

export default function StudentDocumentChecklist() {
  const [selectedStudent, setSelectedStudent] = useState("Joshua Moshee");
  const [targetProgram, setTargetProgram] = useState("BSc in Artificial Intelligence - Teesside University");
  
  const [documents, setDocuments] = useState<RequirementDoc[]>(([
    { id: "doc1", documentName: "Official Academic Transcript (Last 1 Year)", category: "Academic", isRequired: true, status: "APPROVED", uploadedFile: { name: "Transcript_Final_Year.pdf", size: "2.4 MB", date: "2026-05-28" } },
    { id: "doc2", documentName: "Human Care Consulting (HCC) Test Results", category: "Profile", isRequired: true, status: "PENDING_REVIEW", uploadedFile: { name: "HCC_Psychology_Report.pdf", size: "1.1 MB", date: "2026-06-01" }, feedback: "AI Core analysis running. Awaiting manual admin confirmation." },
    { id: "doc3", documentName: "Valid International Passport (Bio Page)", category: "Identity", isRequired: true, status: "MISSING" },
    { id: "doc4", documentName: "Statement of Purpose (SOP)", category: "Profile", isRequired: false, status: "MISSING" },
    { id: "doc5", documentName: "Proof of Financial Solvency / Bank Statement", category: "Visa", isRequired: true, status: "MISSING" }
  ]));

  const [activeFilter, setActiveFilter] = useState<"ALL" | "MISSING" | "PENDING" | "APPROVED">("ALL");

  const handleFakeUpload = (id: string, fileName: string) => {
    setDocuments(prev => prev.map(doc => {
      if (doc.id === id) {
        return {
          ...doc,
          status: "PENDING_REVIEW",
          uploadedFile: {
            name: fileName,
            size: "1.8 MB",
            date: new Date().toISOString().split('T')[0]
          },
          feedback: "Document uploaded by agent. System routing to Master Admin queue."
        };
      }
      return doc;
    }));
  };

  const handleRemoveFile = (id: string) => {
    setDocuments(prev => prev.map(doc => {
      if (doc.id === id) {
        return { ...doc, status: "MISSING", uploadedFile: undefined, feedback: undefined };
      }
      return doc;
    }));
  };

  const filteredDocs = documents.filter(doc => {
    if (activeFilter === "MISSING") return doc.status === "MISSING";
    if (activeFilter === "PENDING") return doc.status === "PENDING_REVIEW";
    if (activeFilter === "APPROVED") return doc.status === "APPROVED";
    return true;
  });

  const missingRequiredCount = documents.filter(d => d.isRequired && d.status === "MISSING").length;

  return (
    <div className="p-4 lg:p-8 max-w-[1200px] mx-auto w-full relative animate-in fade-in">
      
      {/* HEADER SECTION */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#BAD133] bg-[#282860]/5 border border-[#282860]/10 px-2.5 py-1 rounded-md mb-2 inline-block">ApplyBoard Standard</span>
          <h1 className="text-2xl font-black text-[#282860] flex items-center gap-2">
            <FileText size={24} className="text-[#BAD133]" /> Required Document Matrix
          </h1>
          <p className="text-slate-500 text-xs mt-1 font-medium">
            Student: <span className="text-slate-800 font-bold">{selectedStudent}</span> • Target: <span className="text-slate-800 font-bold">{targetProgram}</span>
          </p>
        </div>

        {missingRequiredCount > 0 ? (
          <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 shrink-0">
            <AlertCircle className="text-red-500" size={24} />
            <div>
              <p className="text-xs font-black text-red-700 uppercase tracking-wide">{missingRequiredCount} Missing Requirements</p>
              <p className="text-[11px] text-red-500 font-medium mt-0.5">Pipeline assignment locked until uploaded.</p>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-3 shrink-0">
            <ShieldCheck className="text-emerald-500" size={24} />
            <div>
              <p className="text-xs font-black text-emerald-700 uppercase tracking-wide">Ready for Submission</p>
              <p className="text-[11px] text-emerald-500 font-medium mt-0.5">All mandatory files verified.</p>
            </div>
          </div>
        )}
      </div>

      {/* FILTER BUTTONS BAR */}
      <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-fit shadow-sm mb-6 items-center overflow-x-auto gap-1">
        <button onClick={() => setActiveFilter("ALL")} className={`px-5 py-2 rounded-xl text-xs font-black tracking-wide transition-all ${activeFilter === "ALL" ? "bg-[#282860] text-white shadow-md" : "text-slate-500 hover:text-slate-700"}`}>All Requirements ({documents.length})</button>
        <button onClick={() => setActiveFilter("MISSING")} className={`px-5 py-2 rounded-xl text-xs font-black tracking-wide transition-all ${activeFilter === "MISSING" ? "bg-red-500 text-white shadow-md" : "text-slate-500 hover:text-red-500"}`}>Missing</button>
        <button onClick={() => setActiveFilter("PENDING")} className={`px-5 py-2 rounded-xl text-xs font-black tracking-wide transition-all ${activeFilter === "PENDING" ? "bg-amber-500 text-white shadow-md" : "text-slate-500 hover:text-amber-500"}`}>In Review</button>
        <button onClick={() => setActiveFilter("APPROVED")} className={`px-5 py-2 rounded-xl text-xs font-black tracking-wide transition-all ${activeFilter === "APPROVED" ? "bg-emerald-600 text-white shadow-md" : "text-slate-500 hover:text-emerald-600"}`}>Approved</button>
      </div>

      {/* DYNAMIC CHECKLIST CARDS MATRIX */}
      <div className="space-y-4">
        {filteredDocs.map((doc) => (
          <div key={doc.id} className={`bg-white rounded-2xl border p-5 lg:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all border-slate-200 hover:shadow-md`}>
            
            {/* Left Column: Doc Descriptor */}
            <div className="flex items-start gap-4 max-w-xl">
              <div className={`p-3 rounded-xl border shrink-0 mt-0.5
                ${doc.status === "APPROVED" ? "bg-emerald-50 border-emerald-100 text-emerald-600" :
                  doc.status === "PENDING_REVIEW" ? "bg-amber-50 border-amber-100 text-amber-600" :
                  "bg-slate-50 border-slate-100 text-slate-400"}`}>
                <FileText size={24} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-[#282860] text-base leading-tight">{doc.documentName}</h3>
                  {doc.isRequired && (
                    <span className="bg-red-50 text-red-600 border border-red-100 font-black text-[9px] px-2 py-0.5 rounded uppercase tracking-wider">Mandatory</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">Category: {doc.category}</p>
                
                {doc.feedback && (
                  <div className="mt-3 bg-slate-50 border border-slate-200/60 p-2.5 rounded-xl text-xs font-medium text-slate-600 flex items-start gap-2 max-w-md">
                    <Sparkles size={14} className="text-[#BAD133] shrink-0 mt-0.5" />
                    <span>{doc.feedback}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Upload Mechanics / File Info */}
            <div className="w-full md:w-auto shrink-0 min-w-[280px]">
              {doc.status === "MISSING" ? (
                <label className="border-2 border-dashed border-slate-200 hover:border-[#BAD133] hover:bg-[#BAD133]/5 rounded-xl px-4 py-3 flex items-center justify-center gap-2.5 cursor-pointer transition-all bg-slate-50/50 group">
                  <input 
                    type="file" 
                    accept=".pdf,.jpg,.jpeg,.png" 
                    className="hidden" 
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFakeUpload(doc.id, e.target.files[0].name);
                      }
                    }} 
                  />
                  <UploadCloud size={16} className="text-slate-400 group-hover:text-[#BAD133] transition-colors" />
                  <span className="text-xs font-bold text-slate-600 group-hover:text-slate-800 transition-colors">Upload Required File</span>
                </label>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-4 shadow-inner">
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-700 truncate pr-2" title={doc.uploadedFile?.name}>{doc.uploadedFile?.name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold mt-0.5">
                      <span>{doc.uploadedFile?.size}</span>
                      <span>•</span>
                      <span>{doc.uploadedFile?.date}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded border mr-1
                      ${doc.status === "APPROVED" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}>
                      {doc.status === "APPROVED" ? "Approved" : "In Review"}
                    </span>
                    <button className="p-1.5 bg-white text-slate-400 hover:text-[#282860] border border-slate-200 rounded-lg shadow-sm transition-colors" title="View Document">
                      <Eye size={14} />
                    </button>
                    {doc.status !== "APPROVED" && (
                      <button onClick={() => handleRemoveFile(doc.id)} className="p-1.5 bg-white text-slate-400 hover:text-red-500 border border-slate-200 rounded-lg shadow-sm transition-colors" title="Remove File">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}