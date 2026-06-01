"use client";

import React from "react";
import { BrainCircuit } from "lucide-react";

export default function AiStrategistPage() {
  return (
    <div className="p-4 lg:p-8 max-w-[1200px] mx-auto w-full relative animate-in fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-[#282860] flex items-center gap-3">
          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
            <BrainCircuit className="text-[#BAD133]" size={28} />
          </div>
          AI Strategist
        </h1>
        <p className="text-slate-500 mt-2 font-medium text-sm">
          AI-driven insights for campaign optimization and market positioning.
        </p>
      </div>
      
      <div className="bg-white border border-slate-200 rounded-3xl p-12 shadow-sm text-center">
         <BrainCircuit size={48} className="mx-auto text-slate-300 mb-4" />
         <h2 className="text-xl font-black text-[#282860]">AI Marketing Copilot</h2>
         <p className="text-slate-500 font-medium mt-2">Module under development.</p>
      </div>
    </div>
  );
}