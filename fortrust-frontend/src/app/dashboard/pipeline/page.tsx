"use client";

import { useState, useEffect } from "react";
import { X, AlertTriangle, Loader2, Trash2, ArrowRight } from "lucide-react";

// 1. Pipeline Stages
const PIPELINE_STAGES = ["NEW LEAD", "QUALIFIED", "CONSULTING", "APPLICATION", "VISA", "COMPLETED", "DROPPED"];
const LOSS_REASONS = ["Unresponsive", "Competitor Choice", "Budget Constraints", "Failed Entrance Test", "Changed Mind", "Other"];

export default function StudentPipeline() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State for Loss Reason
  const [droppedStudent, setDroppedStudent] = useState<any>(null);
  const [lossReason, setLossReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const token = localStorage.getItem("fortrust_token");
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline`, { headers: { "Authorization": `Bearer ${token}` } });
    const data = await res.json();
    if (data.status === "success") setStudents(data.data);
    setLoading(false);
  };

  // 2. Drag & Drop Handler
  const handleDrop = (student: any, newStatus: string) => {
    if (newStatus === "DROPPED") {
      setDroppedStudent({ ...student, newStatus });
      return;
    }
    updateStudentStatus(student.id, newStatus, "");
  };

  const updateStudentStatus = async (id: string, status: string, reason: string) => {
    setIsSaving(true);
    const token = localStorage.getItem("fortrust_token");
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ status, loss_reason: reason })
    });
    fetchData();
    setDroppedStudent(null);
    setLossReason("");
    setIsSaving(false);
  };

  return (
    <div className="p-4 lg:p-8 h-full bg-slate-50">
      <h1 className="text-2xl font-black text-[#282860] mb-6">Student Pipeline</h1>
      
      <div className="flex gap-6 overflow-x-auto pb-4 min-h-[70vh]">
        {PIPELINE_STAGES.map(stage => (
          <div key={stage} className="w-72 flex-shrink-0 flex flex-col" onDragOver={(e) => e.preventDefault()} onDrop={() => {/* Implement drag-and-drop here */}}>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">{stage}</h3>
            <div className="space-y-4">
              {students.filter(s => s.status === stage).map(s => (
                <div key={s.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-grab">
                  <p className="font-bold text-[#282860]">{s.name}</p>
                  <button onClick={() => handleDrop(s, "DROPPED")} className="mt-2 text-xs text-red-600 font-bold">Drop Student</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 3. LOSS REASON MODAL */}
      {droppedStudent && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm animate-in zoom-in-95">
            <h2 className="text-xl font-black text-[#282860] mb-2 flex items-center gap-2"><AlertTriangle className="text-red-500" /> Student Dropped</h2>
            <p className="text-sm text-slate-500 mb-6">Why is {droppedStudent.name} no longer continuing?</p>
            
            <select value={lossReason} onChange={e => setLossReason(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl mb-6">
              <option value="">-- Select Reason --</option>
              {LOSS_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>

            <div className="flex gap-3">
              <button onClick={() => setDroppedStudent(null)} className="flex-1 py-3 font-bold text-slate-500">Cancel</button>
              <button 
                disabled={!lossReason || isSaving}
                onClick={() => updateStudentStatus(droppedStudent.id, "DROPPED", lossReason)} 
                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="animate-spin" /> : "Confirm Drop"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}