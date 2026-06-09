"use client";

import { useState, useEffect } from "react";
import { X, AlertTriangle, Loader2, ArrowRight, User, Mail, Thermometer, MapPin } from "lucide-react";

// Pipeline Configuration
const PIPELINE_STAGES = ["NEW LEAD", "QUALIFIED", "CONSULTING", "APPLICATION", "VISA", "COMPLETED", "DROPPED"];
const LOSS_REASONS = ["Unresponsive", "Competitor Choice", "Budget Constraints", "Failed Entrance Test", "Changed Mind", "Other"];

const STAGE_COLORS: Record<string, string> = {
  "NEW LEAD": "border-blue-200 bg-blue-50 text-blue-700",
  "QUALIFIED": "border-purple-200 bg-purple-50 text-purple-700",
  "CONSULTING": "border-amber-200 bg-amber-50 text-amber-700",
  "APPLICATION": "border-orange-200 bg-orange-50 text-orange-700",
  "VISA": "border-pink-200 bg-pink-50 text-pink-700",
  "COMPLETED": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "DROPPED": "border-red-200 bg-red-50 text-red-700",
};

export default function StudentPipeline() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State for Loss Reason
  const [droppedStudent, setDroppedStudent] = useState<any>(null);
  const [lossReason, setLossReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline`, { 
        headers: { "Authorization": `Bearer ${token}` } 
      });
      const data = await res.json();
      if (data.status === "success") setStudents(data.data);
    } catch (error) {
      console.error("Failed to load pipeline");
    } finally {
      setLoading(false);
    }
  };

  // --- HTML5 DRAG AND DROP HANDLERS ---
  const handleDragStart = (e: React.DragEvent, studentId: string) => {
    e.dataTransfer.setData("studentId", studentId);
    // Optional: Make the card look semi-transparent while dragging
    setTimeout(() => { (e.target as HTMLElement).style.opacity = "0.5"; }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = "1";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Required to allow dropping
  };

  const handleDropEvent = (e: React.DragEvent, newStage: string) => {
    e.preventDefault();
    const studentId = e.dataTransfer.getData("studentId");
    if (!studentId) return;

    const student = students.find(s => String(s.id) === studentId);
    if (!student || student.status === newStage) return; // Ignore if dropped in the same column

    // If moved to DROPPED, intercept and open the modal
    if (newStage === "DROPPED") {
      setDroppedStudent({ ...student, newStatus: newStage });
      return;
    }

    // Otherwise, update normally
    updateStudentStatus(studentId, newStage, "");
  };

  // --- API UPDATE HANDLER ---
  const updateStudentStatus = async (id: string, status: string, reason: string) => {
    setIsSaving(true);
    
    // Optimistic UI Update (Makes the card snap instantly before the DB finishes)
    setStudents(prev => prev.map(s => String(s.id) === String(id) ? { ...s, status } : s));

    try {
      const token = localStorage.getItem("fortrust_token");
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ status, loss_reason: reason })
      });
      // Sync with server just in case
      fetchData();
    } catch (error) {
      console.error("Failed to update status");
      fetchData(); // Revert optimistic update on failure
    } finally {
      setDroppedStudent(null);
      setLossReason("");
      setIsSaving(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
      <Loader2 className="animate-spin w-12 h-12 text-[#BAD133] mb-4" />
      <p className="font-bold tracking-widest uppercase text-xs">Syncing Pipeline...</p>
    </div>
  );

  return (
    <div className="p-4 lg:p-8 h-[calc(100vh-80px)] flex flex-col bg-slate-50/50">
      
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-[#282860]">My Student Pipeline</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Drag and drop students to update their progress.</p>
        </div>
      </div>
      
      {/* PIPELINE BOARD */}
      <div className="flex-1 flex gap-6 overflow-x-auto pb-4 custom-scrollbar items-start">
        {PIPELINE_STAGES.map(stage => {
          const columnStudents = students.filter(s => (s.status || "NEW LEAD").toUpperCase() === stage);
          const stageColor = STAGE_COLORS[stage] || "border-slate-200 bg-slate-50 text-slate-700";

          return (
            <div 
              key={stage} 
              className="w-80 flex-shrink-0 flex flex-col bg-slate-100/50 rounded-2xl p-4 border border-slate-200/60 min-h-[500px]"
              onDragOver={handleDragOver} 
              onDrop={(e) => handleDropEvent(e, stage)}
            >
              <div className="flex items-center justify-between mb-4">
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border ${stageColor}`}>
                  {stage}
                </span>
                <span className="text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded shadow-sm">{columnStudents.length}</span>
              </div>

              <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
                {columnStudents.length === 0 && (
                  <div className="h-24 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-xs font-bold text-slate-400">
                    Drop Student Here
                  </div>
                )}
                
                {columnStudents.map(s => (
                  <div 
                    key={s.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, s.id)}
                    onDragEnd={handleDragEnd}
                    className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-[#BAD133] hover:shadow-md transition-all cursor-grab active:cursor-grabbing group relative overflow-hidden"
                  >
                    {/* Status accent line */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${STAGE_COLORS[stage].split(' ')[1]}`}></div>
                    
                    <div className="pl-2">
                      <p className="font-bold text-[#282860] text-sm group-hover:text-blue-600 transition-colors">{s.name}</p>
                      
                      {s.program_interest && (
                        <p className="text-xs text-slate-500 mt-1 font-medium line-clamp-1">{s.program_interest}</p>
                      )}
                      
                      <div className="mt-3 flex items-center gap-3 text-[10px] font-bold text-slate-400">
                        {s.lead_temperature && (
                          <span className={`flex items-center gap-1 ${s.lead_temperature.includes('Hot') ? 'text-orange-500' : s.lead_temperature.includes('Warm') ? 'text-amber-500' : 'text-blue-400'}`}>
                            <Thermometer size={12}/> {s.lead_temperature}
                          </span>
                        )}
                        {s.country_interest && (
                          <span className="flex items-center gap-1"><MapPin size={12}/> {s.country_interest}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* LOSS REASON MODAL INTERCEPTOR */}
      {droppedStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md animate-in zoom-in-95 shadow-2xl">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6 mx-auto">
              <AlertTriangle className="text-red-500" size={32} />
            </div>
            
            <h2 className="text-2xl font-black text-center text-[#282860] mb-2">Deal Lost</h2>
            <p className="text-sm text-center text-slate-500 mb-8">
              You are moving <strong className="text-slate-800">{droppedStudent.name}</strong> to Dropped. Please specify the reason to maintain KPI accuracy.
            </p>
            
            <div className="mb-8">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Primary Reason for Drop</label>
              <select 
                value={lossReason} 
                onChange={e => setLossReason(e.target.value)} 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-[#282860] outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20 cursor-pointer transition-all"
              >
                <option value="" disabled>-- Select Reason --</option>
                {LOSS_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setDroppedStudent(null)} 
                className="flex-1 py-3.5 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                disabled={!lossReason || isSaving}
                onClick={() => updateStudentStatus(droppedStudent.id, "DROPPED", lossReason)} 
                className="flex-1 bg-red-600 text-white py-3.5 rounded-xl font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
              >
                {isSaving ? <><Loader2 size={18} className="animate-spin" /> Saving...</> : "Confirm Drop"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}