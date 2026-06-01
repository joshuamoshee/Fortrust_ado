"use client";

import React, { useState } from "react";
import { 
  BrainCircuit, Sparkles, ChevronRight, ChevronLeft, 
  CheckCircle, UploadCloud, FileText, Target, Award, 
  Briefcase, GraduationCap, X, Loader2
} from "lucide-react";

const PROFILING_QUESTIONS = [
  {
    id: "q1",
    question: "Which core academic field interests the student the most?",
    options: [
      { label: "Business & Management", icon: <Briefcase size={24} />, desc: "Finance, Marketing, Entrepreneurship" },
      { label: "STEM", icon: <BrainCircuit size={24} />, desc: "Engineering, Computer Science, Math" },
      { label: "Arts & Humanities", icon: <Award size={24} />, desc: "Design, Literature, Social Sciences" },
      { label: "Healthcare & Medicine", icon: <Target size={24} />, desc: "Nursing, Pre-Med, Psychology" }
    ]
  },
  {
    id: "q2",
    question: "What is their primary post-graduation career goal?",
    options: [
      { label: "Corporate Leadership", icon: <BuildingIcon />, desc: "Climbing the ladder at a Fortune 500" },
      { label: "Startup Founder", icon: <RocketIcon />, desc: "Building their own company" },
      { label: "Research & Academia", icon: <GraduationCap size={24} />, desc: "Pursuing PhDs and innovations" },
      { label: "Creative Freelance", icon: <PaletteIcon />, desc: "Independent design or consulting" }
    ]
  },
  {
    id: "q3",
    question: "What is their preferred campus environment?",
    options: [
      { label: "Bustling Metropolis", icon: <CityIcon />, desc: "Downtown in a major global city" },
      { label: "Traditional College Town", icon: <TownIcon />, desc: "Classic campus, strong community" },
      { label: "Tech & Innovation Hub", icon: <CpuIcon />, desc: "Surrounded by startups and labs" },
      { label: "Quiet & Nature-Focused", icon: <TreeIcon />, desc: "Scenic, peaceful, focused study" }
    ]
  }
];

export default function AssessmentPage() {
  const [activeTab, setActiveTab] = useState<"profiling" | "document">("profiling");
  
  // Profiling State
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResult, setShowResult] = useState(false);

  // Document State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [docResult, setDocResult] = useState(false);

  const handleOptionSelect = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    if (currentStep < PROFILING_QUESTIONS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setIsAnalyzing(true);
      setTimeout(() => {
        setIsAnalyzing(false);
        setShowResult(true);
      }, 3000); // Simulate AI loading
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const handleExtractData = () => {
    setIsExtracting(true);
    setTimeout(() => {
      setIsExtracting(false);
      setDocResult(true);
    }, 3500); // Simulate Gemini OCR loading
  };

  return (
    <div className="p-4 lg:p-8 max-w-[1200px] mx-auto w-full relative animate-in fade-in">
      
      {/* HEADER */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-[#282860] flex items-center gap-3">
            <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
              <BrainCircuit className="text-[#BAD133]" size={28} />
            </div>
            AI Assessment Engine
          </h1>
          <p className="text-slate-500 mt-2 font-medium text-sm">
            Generate precise university matches using Google Gemini profiling and document OCR.
          </p>
        </div>

        {/* Custom Tab Switcher */}
        <div className="bg-slate-200/50 p-1.5 rounded-2xl flex items-center w-fit shrink-0">
          <button onClick={() => setActiveTab("profiling")} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "profiling" ? "bg-white text-[#282860] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            Career Profiling
          </button>
          <button onClick={() => setActiveTab("document")} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "document" ? "bg-white text-[#282860] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            Document OCR
          </button>
        </div>
      </div>

      {/* --- TAB 1: PROFILING TEST --- */}
      {activeTab === "profiling" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          
          {isAnalyzing ? (
            <div className="p-20 flex flex-col items-center justify-center text-center">
               <div className="relative">
                 <div className="absolute inset-0 bg-[#BAD133] blur-3xl opacity-20 rounded-full animate-pulse"></div>
                 <Loader2 size={64} className="text-[#282860] animate-spin relative z-10" />
               </div>
               <h3 className="mt-8 text-2xl font-black text-[#282860]">Gemini AI is analyzing profile...</h3>
               <p className="text-slate-500 mt-2 font-medium">Cross-referencing personality traits with 4,000+ global university programs.</p>
            </div>
          ) : showResult ? (
            <div className="p-8 lg:p-12">
               <div className="flex items-center gap-3 mb-8">
                 <div className="bg-green-100 text-green-600 p-3 rounded-full"><CheckCircle size={32} /></div>
                 <div>
                   <h2 className="text-2xl font-black text-[#282860]">AI Match Complete</h2>
                   <p className="text-slate-500 font-medium">Based on the student's preferences, here are the top recommendations.</p>
                 </div>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                 <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl">
                   <span className="text-[10px] font-black uppercase tracking-widest text-[#BAD133] mb-2 block">Match #1 (98% Fit)</span>
                   <h4 className="font-bold text-[#282860] text-lg">University of Melbourne</h4>
                   <p className="text-sm text-slate-500 mt-1">Bachelor of Commerce</p>
                 </div>
                 <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl">
                   <span className="text-[10px] font-black uppercase tracking-widest text-[#BAD133] mb-2 block">Match #2 (94% Fit)</span>
                   <h4 className="font-bold text-[#282860] text-lg">Monash University</h4>
                   <p className="text-sm text-slate-500 mt-1">Bachelor of Business</p>
                 </div>
                 <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl">
                   <span className="text-[10px] font-black uppercase tracking-widest text-[#BAD133] mb-2 block">Match #3 (89% Fit)</span>
                   <h4 className="font-bold text-[#282860] text-lg">UNSW Sydney</h4>
                   <p className="text-sm text-slate-500 mt-1">Bachelor of Economics</p>
                 </div>
               </div>

               <div className="flex gap-4">
                 <button className="bg-[#282860] hover:bg-[#1b1b42] text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-md flex items-center gap-2">
                   <FileText size={18}/> Generate PDF Report
                 </button>
                 <button onClick={() => { setShowResult(false); setCurrentStep(0); setAnswers({}); }} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-8 py-3.5 rounded-xl font-bold transition-all">
                   Start New Test
                 </button>
               </div>
            </div>
          ) : (
            <>
              {/* Progress Bar */}
              <div className="bg-slate-50 border-b border-slate-100 p-6 lg:px-12 flex justify-between items-center">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Step {currentStep + 1} of {PROFILING_QUESTIONS.length}</span>
                <div className="flex gap-2">
                  {PROFILING_QUESTIONS.map((_, idx) => (
                    <div key={idx} className={`h-2 rounded-full transition-all duration-500 ${idx <= currentStep ? "w-8 bg-[#BAD133]" : "w-3 bg-slate-200"}`}></div>
                  ))}
                </div>
              </div>

              {/* Question UI */}
              <div className="p-6 lg:p-12">
                <h2 className="text-2xl lg:text-3xl font-black text-[#282860] mb-8 leading-tight">
                  {PROFILING_QUESTIONS[currentStep].question}
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
                  {PROFILING_QUESTIONS[currentStep].options.map((opt) => {
                    const isSelected = answers[PROFILING_QUESTIONS[currentStep].id] === opt.label;
                    return (
                      <div 
                        key={opt.label} 
                        onClick={() => handleOptionSelect(PROFILING_QUESTIONS[currentStep].id, opt.label)}
                        className={`cursor-pointer p-6 rounded-2xl border-2 transition-all duration-200 flex items-start gap-4
                          ${isSelected ? "border-[#282860] bg-[#282860]/5 shadow-md" : "border-slate-100 hover:border-[#BAD133] hover:bg-slate-50"}`}
                      >
                        <div className={`p-3 rounded-xl shrink-0 ${isSelected ? "bg-[#282860] text-white" : "bg-white text-slate-400 border border-slate-200"}`}>
                          {opt.icon}
                        </div>
                        <div>
                          <h4 className={`font-bold text-lg mb-1 ${isSelected ? "text-[#282860]" : "text-slate-700"}`}>{opt.label}</h4>
                          <p className={`text-sm ${isSelected ? "text-slate-600 font-medium" : "text-slate-500"}`}>{opt.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center pt-6 border-t border-slate-100">
                  <button 
                    onClick={() => setCurrentStep(prev => prev - 1)} 
                    disabled={currentStep === 0}
                    className="flex items-center gap-2 px-6 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-xl disabled:opacity-0 transition-colors"
                  >
                    <ChevronLeft size={18} /> Back
                  </button>
                  
                  <button 
                    onClick={handleNext}
                    disabled={!answers[PROFILING_QUESTIONS[currentStep].id]}
                    className="bg-[#282860] hover:bg-[#1b1b42] text-white px-8 py-3.5 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 transition-all shadow-md active:scale-95"
                  >
                    {currentStep === PROFILING_QUESTIONS.length - 1 ? (
                      <><Sparkles size={18} className="text-[#BAD133]"/> Analyze with AI</>
                    ) : (
                      <>Next Question <ChevronRight size={18}/></>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* --- TAB 2: DOCUMENT ASSESSMENT --- */}
      {activeTab === "document" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 lg:p-12 animate-in fade-in slide-in-from-bottom-4">
          
          <div className="mb-8">
            <h2 className="text-2xl font-black text-[#282860]">Academic Document OCR</h2>
            <p className="text-slate-500 mt-2">Upload the student's report cards or transcripts. The AI will extract their grades, calculate their global GPA equivalent, and check eligibility.</p>
          </div>

          {!uploadedFile ? (
            <label className="border-2 border-dashed border-slate-300 rounded-3xl p-16 flex flex-col items-center justify-center cursor-pointer hover:border-[#BAD133] hover:bg-[#BAD133]/5 transition-all group">
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileUpload} />
              <div className="w-20 h-20 bg-slate-50 text-slate-400 group-hover:bg-white group-hover:text-[#BAD133] rounded-full flex items-center justify-center shadow-sm mb-6 transition-all">
                <UploadCloud size={40} />
              </div>
              <h3 className="text-xl font-bold text-[#282860] mb-2">Drag & Drop Transcripts Here</h3>
              <p className="text-slate-400 text-sm font-medium">Supports PDF, JPG, and PNG up to 15MB</p>
            </label>
          ) : isExtracting ? (
            <div className="border-2 border-slate-100 rounded-3xl p-16 flex flex-col items-center justify-center text-center">
              <Loader2 size={48} className="text-[#BAD133] animate-spin mb-6" />
              <h3 className="text-xl font-black text-[#282860]">Extracting Academic Data...</h3>
              <p className="text-slate-500 mt-2">Running optical character recognition (OCR) on {uploadedFile.name}</p>
            </div>
          ) : docResult ? (
            <div className="border-2 border-green-100 bg-green-50/30 rounded-3xl p-8 lg:p-12">
               <div className="flex items-center gap-4 mb-8">
                 <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center shrink-0 shadow-md">
                   <CheckCircle size={24} />
                 </div>
                 <div>
                   <h3 className="text-xl font-black text-[#282860]">Extraction Successful</h3>
                   <p className="text-slate-500 text-sm font-medium">Parsed data from: <span className="text-slate-700">{uploadedFile.name}</span></p>
                 </div>
               </div>

               <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8 grid grid-cols-2 md:grid-cols-4 gap-6">
                 <div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Calculated GPA</span>
                   <span className="text-3xl font-black text-[#282860]">3.8<span className="text-lg text-slate-400">/4.0</span></span>
                 </div>
                 <div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Math Average</span>
                   <span className="text-3xl font-black text-[#282860]">A-</span>
                 </div>
                 <div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">English Average</span>
                   <span className="text-3xl font-black text-[#282860]">B+</span>
                 </div>
                 <div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Eligibility Status</span>
                   <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold mt-2">
                     <CheckCircle size={14}/> Highly Eligible
                   </span>
                 </div>
               </div>

               <div className="flex gap-4">
                 <button onClick={() => { setUploadedFile(null); setDocResult(false); }} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-6 py-3 rounded-xl font-bold transition-all">
                   Upload Another Document
                 </button>
                 <button className="bg-[#282860] hover:bg-[#1b1b42] text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md">
                   Save to Student Profile
                 </button>
               </div>
            </div>
          ) : (
            <div className="border-2 border-slate-100 rounded-3xl p-8 lg:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 border border-blue-100">
                  <FileText size={32} />
                </div>
                <div>
                  <h3 className="font-bold text-[#282860] text-lg">{uploadedFile.name}</h3>
                  <p className="text-slate-500 text-sm font-medium">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB • Ready for extraction</p>
                </div>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <button onClick={() => setUploadedFile(null)} className="p-3 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors shrink-0">
                  <X size={20} />
                </button>
                <button onClick={handleExtractData} className="w-full md:w-auto bg-[#282860] hover:bg-[#1b1b42] text-white px-8 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95">
                  <Sparkles size={18} className="text-[#BAD133]"/> Run AI Extraction
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

// Custom Icons for the profiling test
function BuildingIcon() { return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg> }
function RocketIcon() { return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path></svg> }
function PaletteIcon() { return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5"></circle><circle cx="17.5" cy="10.5" r=".5"></circle><circle cx="8.5" cy="7.5" r=".5"></circle><circle cx="6.5" cy="12.5" r=".5"></circle><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path></svg> }
function CityIcon() { return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="10" width="6" height="12"></rect><rect x="8" y="2" width="8" height="20"></rect><rect x="16" y="14" width="6" height="8"></rect><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M12 18h.01"></path><path d="M4 14h.01"></path><path d="M4 18h.01"></path><path d="M20 18h.01"></path></svg> }
function TownIcon() { return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"></path><path d="M9 8h1"></path><path d="M9 12h1"></path><path d="M9 16h1"></path><path d="M14 8h1"></path><path d="M14 12h1"></path><path d="M14 16h1"></path><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"></path></svg> }
function CpuIcon() { return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg> }
function TreeIcon() { return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"></path><path d="M12 2a5 5 0 0 0-5 5c0 1.5.5 2.5 1.5 3.5-.5 1-1.5 2.5-1.5 4 0 2 1.5 3 4 3s4-1 4-3c0-1.5-1-3-1.5-4 1-1 1.5-2 1.5-3.5a5 5 0 0 0-5-5z"></path></svg> }