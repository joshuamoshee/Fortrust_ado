"use client";

import { useState } from "react";
import { Sparkles, ArrowRight, CheckCircle2, GraduationCap, Megaphone, Phone } from "lucide-react";

export default function PublicApplicationPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // 🚨 UPDATED: Client's requested Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [wa, setWa] = useState("");
  const [program, setProgram] = useState("");
  const [source, setSource] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("wa_number", wa);
    formData.append("program_interest", program);
    formData.append("lead_source", source);

    try {
      // 🚨 UPDATED: Fixed string literal bug and pointed to the new Auto-Grading Marketing API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/marketing/leads`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setIsSuccess(true);
      } else {
        alert("Something went wrong. Please try again.");
      }
    } catch (error) {
      alert("Network error. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-slate-100">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-emerald-600" />
          </div>
          <h2 className="text-2xl font-black text-[#282860] mb-2">Registration Complete!</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            Thank you, {name}! Your profile has been sent to our expert advisory team. A Fortrust counsellor will reach out to you on WhatsApp to begin your journey.
          </p>
          <button 
            onClick={() => {
              setIsSuccess(false);
              setName(""); setEmail(""); setWa(""); setProgram(""); setSource("");
            }} 
            className="text-[#BAD133] font-bold hover:text-[#9bb029] transition-colors"
          >
            Submit another application
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* LEFT SIDE - Brand & Marketing (Hidden on small mobile screens) */}
      <div className="hidden lg:flex w-1/2 bg-[#1b1b42] flex-col justify-between p-12 relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#282860] rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-[#BAD133] rounded-full blur-3xl opacity-10"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <img src="/fortrust-logo.png" alt="Fortrust" className="h-12 w-auto object-contain" />
          </div>

          <h1 className="text-5xl font-black text-white leading-tight mb-6">
            Your Global <br/><span className="text-[#BAD133]">Education</span> Starts Here.
          </h1>
          <p className="text-lg text-slate-300 max-w-md leading-relaxed">
            Get matched with the world's top universities, secure your visa, and plan your future with our expert advisory platform.
          </p>
        </div>

        <div className="relative z-10 bg-[#282860]/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 max-w-md">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-[#BAD133] rounded-full flex items-center justify-center text-[#1b1b42] font-black"><Sparkles size={24}/></div>
            <div>
              <p className="text-white font-bold">Priority Processing</p>
              <p className="text-sm text-slate-400">Register now to get automatically matched with a senior counsellor.</p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - The Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-[#f8fafc]">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-black text-[#282860] mb-2">Event Registration</h2>
            <p className="text-slate-500 text-sm">Fill out your details below to get started.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
              <input required type="text" value={name} onChange={(e)=>setName(e.target.value)} placeholder="e.g. Budi Santoso" className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#282860] focus:ring-4 focus:ring-[#282860]/10 transition-all font-medium" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email (Active)</label>
                <input required type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="budi@email.com" className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#282860] focus:ring-4 focus:ring-[#282860]/10 transition-all font-medium" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Phone size={12}/> WhatsApp</label>
                <input required type="tel" value={wa} onChange={(e)=>setWa(e.target.value)} placeholder="+62 812..." className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#282860] focus:ring-4 focus:ring-[#282860]/10 transition-all font-medium" />
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><GraduationCap size={14}/> Program yang diminati</label>
              <input type="text" value={program} onChange={(e)=>setProgram(e.target.value)} placeholder="e.g. Master of Data Science" className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#282860] focus:ring-4 focus:ring-[#282860]/10 transition-all font-medium" />
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Megaphone size={14}/> How do you know about this event?</label>
              <select value={source} onChange={(e)=>setSource(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#282860] focus:ring-4 focus:ring-[#282860]/10 transition-all font-bold text-slate-700 cursor-pointer bg-white">
                <option value="" disabled>Select source...</option>
                <option value="Instagram">Instagram</option>
                <option value="TikTok">TikTok</option>
                <option value="School Visit">School Visit</option>
                <option value="Friend/Family">Friend/Family</option>
              </select>
            </div>

            <button 
              disabled={isSubmitting} 
              type="submit" 
              className="w-full bg-[#BAD133] hover:bg-[#a3b827] text-[#1b1b42] font-black py-4 rounded-xl mt-6 transition-all shadow-lg shadow-[#BAD133]/30 flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : <>Submit Registration <ArrowRight size={18} /></>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}