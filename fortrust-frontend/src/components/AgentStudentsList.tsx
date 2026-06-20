"use client";

import { useState, useEffect } from "react";
import { 
  Loader2, GraduationCap, Plus, X, Search, 
  CheckCircle2, ShieldAlert, MapPin, DollarSign,
  FileText, Archive
} from "lucide-react";

interface Student {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  status?: string;
  lead_temperature?: string;
  program_interest?: string;
  country_interest?: string;
  budget?: string;
  assignee?: string;
  assignees?: string[] | string;
}

interface AgentStudentsListProps {
  agentName: string;
  apiUrl: string;
  token: string;
  currentUserRole: string; // "MASTER_ADMIN" enables Assign button
  onClose?: () => void;
}

export default function AgentStudentsList({
  agentName,
  apiUrl,
  token,
  currentUserRole,
  onClose
}: AgentStudentsListProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Assign modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignSearch, setAssignSearch] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set());
  const [isAssigning, setIsAssigning] = useState(false);
  const [notification, setNotification] = useState<{type: 'success'|'error', message: string} | null>(null);
  
  const isMasterAdmin = currentUserRole === "MASTER_ADMIN";

  // Fetch students assigned to this agent
  const fetchAgentStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/agents/${encodeURIComponent(agentName)}/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") {
        setStudents(data.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch agent students");
    } finally {
      setLoading(false);
    }
  };

  // Fetch ALL students (for the Assign modal picker)
  const fetchAllStudents = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/pipeline?role=MASTER_ADMIN`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") {
        setAllStudents(data.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch all students");
    }
  };

  useEffect(() => {
    fetchAgentStudents();
  }, [agentName]);

  // Open assign modal — fetch all students if needed
  const handleOpenAssign = () => {
    setIsAssignModalOpen(true);
    setSelectedStudentIds(new Set());
    setAssignSearch("");
    if (allStudents.length === 0) fetchAllStudents();
  };

  // Filter "available" students for the Assign modal: 
  // exclude students already assigned to THIS agent
  const currentStudentIds = new Set(students.map(s => s.id));
  const availableStudents = allStudents.filter(s => !currentStudentIds.has(s.id));
  
  const filteredAvailable = availableStudents.filter(s => 
    !assignSearch || 
    (s.name || "").toLowerCase().includes(assignSearch.toLowerCase()) ||
    (s.email || "").toLowerCase().includes(assignSearch.toLowerCase())
  );

  const toggleStudent = (id: number) => {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedStudentIds(next);
  };

  // Confirm bulk assign — add agent to each selected student's assignees array
  const handleConfirmAssign = async () => {
    if (selectedStudentIds.size === 0) return;
    setIsAssigning(true);
    
    try {
      // For each selected student, add this agent to their assignees array
      const updates = Array.from(selectedStudentIds).map(async (studentId) => {
        const student = allStudents.find(s => s.id === studentId);
        if (!student) return;
        
        // Parse current assignees
        let currentAssignees: string[] = [];
        if (Array.isArray(student.assignees)) {
          currentAssignees = student.assignees;
        } else if (typeof student.assignees === "string") {
          try { 
            currentAssignees = JSON.parse(student.assignees) || []; 
          } catch { 
            currentAssignees = []; 
          }
        }
        if (student.assignee && student.assignee !== "Unassigned" && !currentAssignees.includes(student.assignee)) {
          currentAssignees = [student.assignee, ...currentAssignees];
        }
        
        // Add this agent if not already present
        if (!currentAssignees.includes(agentName)) {
          currentAssignees.push(agentName);
        }
        
        return fetch(`${apiUrl}/api/students/${studentId}`, {
          method: "PUT",
          headers: { 
            Authorization: `Bearer ${token}`, 
            "Content-Type": "application/json" 
          },
          body: JSON.stringify({ assignees: currentAssignees })
        });
      });
      
      await Promise.all(updates);
      
      setNotification({
        type: 'success', 
        message: `${selectedStudentIds.size} student${selectedStudentIds.size > 1 ? 's' : ''} assigned to ${agentName}.`
      });
      
      setIsAssignModalOpen(false);
      setSelectedStudentIds(new Set());
      await fetchAgentStudents();
      await fetchAllStudents();
      
    } catch (e) {
      setNotification({type: 'error', message: "Failed to assign students."});
    } finally {
      setIsAssigning(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // Filter visible students by search query (within agent's own list)
  const filteredStudents = students.filter(s => 
    !searchQuery ||
    (s.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.email || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    const s = (status || "").toUpperCase();
    if (s === "NEW LEAD") return "bg-blue-50 text-blue-700 border-blue-200";
    if (s === "QUALIFIED") return "bg-purple-50 text-purple-700 border-purple-200";
    if (s === "CONSULTING") return "bg-amber-50 text-amber-700 border-amber-200";
    if (s === "APPLICATION") return "bg-orange-50 text-orange-700 border-orange-200";
    if (s === "VISA") return "bg-pink-50 text-pink-700 border-pink-200";
    if (s === "COMPLETED") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s === "REJECTED" || s === "ARCHIVED") return "bg-red-50 text-red-700 border-red-200";
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  // Stats for header
  const activeCount = students.filter(s => 
    (s.status || "").toUpperCase() !== "ARCHIVED" && 
    (s.status || "").toUpperCase() !== "COMPLETED"
  ).length;
  const completedCount = students.filter(s => 
    (s.status || "").toUpperCase() === "COMPLETED"
  ).length;
  const archivedCount = students.filter(s => 
    (s.status || "").toUpperCase() === "ARCHIVED"
  ).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      
      {notification && (
        <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-2xl animate-in slide-in-from-top-4 ${
          notification.type === 'success' 
            ? 'bg-[#282860] text-white' 
            : 'bg-red-500 text-white'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 size={20} className="text-[#BAD133]"/> : <ShieldAlert size={20}/>}
          <span className="text-sm">{notification.message}</span>
        </div>
      )}
      
      {/* HEADER */}
      <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#282860] to-[#1b1b42] flex items-center justify-center shadow-md">
            <GraduationCap className="text-[#BAD133]" size={22}/>
          </div>
          <div>
            <h3 className="text-lg font-black text-[#282860]">Students Handled by {agentName}</h3>
            <div className="flex items-center gap-4 mt-0.5 text-xs">
              <span className="text-slate-500"><strong className="text-[#282860]">{students.length}</strong> total</span>
              <span className="text-blue-600"><strong>{activeCount}</strong> active</span>
              <span className="text-emerald-600"><strong>{completedCount}</strong> completed</span>
              {archivedCount > 0 && <span className="text-red-500"><strong>{archivedCount}</strong> archived</span>}
            </div>
          </div>
        </div>
        
        {isMasterAdmin && (
          <button
            onClick={handleOpenAssign}
            className="bg-[#282860] hover:bg-[#1b1b42] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md flex items-center gap-2 active:scale-95 transition-all"
          >
            <Plus size={16}/> Assign Student
          </button>
        )}
      </div>

      {/* SEARCH BAR */}
      {students.length > 0 && (
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center bg-white px-4 py-2 rounded-xl border border-slate-200">
            <Search size={16} className="text-slate-400 mr-2"/>
            <input 
              type="text"
              placeholder="Search this agent's students..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full font-medium"
            />
          </div>
        </div>
      )}

      {/* STUDENT LIST */}
      <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 size={28} className="animate-spin text-[#BAD133] mx-auto mb-3"/>
            <p className="text-sm text-slate-500 font-medium">Loading students...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center">
            <GraduationCap size={40} className="text-slate-200 mx-auto mb-3"/>
            <p className="text-sm font-bold text-slate-500">No students assigned to {agentName} yet.</p>
            {isMasterAdmin && (
              <button 
                onClick={handleOpenAssign}
                className="mt-4 text-blue-600 font-bold text-sm hover:underline"
              >
                Assign students now →
              </button>
            )}
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-slate-400 font-medium text-sm">
            No students match "{searchQuery}".
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredStudents.map(student => {
              // Determine if this agent is primary or shared
              let assigneesArr: string[] = [];
              if (Array.isArray(student.assignees)) assigneesArr = student.assignees;
              else if (typeof student.assignees === "string") {
                try { assigneesArr = JSON.parse(student.assignees) || []; } catch {}
              }
              const isPrimary = assigneesArr[0] === agentName || student.assignee === agentName;
              const sharedWith = assigneesArr.filter(a => a !== agentName);
              
              return (
                <div key={student.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-black shrink-0 border-2 border-white shadow-sm">
                        {student.name?.charAt(0).toUpperCase() || "S"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-[#282860] truncate">{student.name}</p>
                          {isPrimary && (
                            <span className="bg-[#BAD133]/20 text-[#1b1b42] text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded">
                              ★ Primary
                            </span>
                          )}
                          {sharedWith.length > 0 && (
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-bold">
                              +{sharedWith.length} shared
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate">{student.email || "No email"}</p>
                        {student.program_interest && (
                          <p className="text-[10px] text-slate-400 mt-0.5">{student.program_interest}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${getStatusColor(student.status || "")}`}>
                        {student.status || "NEW LEAD"}
                      </span>
                      {student.budget && (
                        <span className="text-xs text-slate-500 font-bold whitespace-nowrap">
                          {student.budget}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ASSIGN STUDENT MODAL */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-[#f8fafc]">
              <div>
                <h2 className="text-xl font-bold text-[#282860] flex items-center gap-2">
                  <Plus size={22} className="text-[#BAD133]"/> Assign Students to {agentName}
                </h2>
                <p className="text-xs text-slate-500 mt-1">Select students to add to this agent's pipeline. Agent will be added as a shared assignee.</p>
              </div>
              <button onClick={() => setIsAssignModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                <X size={20}/>
              </button>
            </div>

            {/* SEARCH */}
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
                <Search size={16} className="text-slate-400 mr-2"/>
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={assignSearch}
                  onChange={e => setAssignSearch(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm w-full font-medium"
                  autoFocus
                />
              </div>
              {selectedStudentIds.size > 0 && (
                <p className="text-xs font-bold text-[#282860] mt-2">
                  {selectedStudentIds.size} student{selectedStudentIds.size > 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            {/* STUDENT LIST */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {availableStudents.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm font-medium">
                  All students are already assigned to this agent.
                </div>
              ) : filteredAvailable.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  No students match "{assignSearch}".
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredAvailable.map(student => {
                    const isSelected = selectedStudentIds.has(student.id);
                    return (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => toggleStudent(student.id)}
                        className={`w-full p-4 text-left transition-colors flex items-center gap-3 ${
                          isSelected ? "bg-emerald-50 hover:bg-emerald-100" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected 
                            ? "bg-emerald-500 border-emerald-600" 
                            : "bg-white border-slate-300"
                        }`}>
                          {isSelected && <CheckCircle2 size={12} className="text-white"/>}
                        </div>
                        
                        <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-black shrink-0 text-sm">
                          {student.name?.charAt(0).toUpperCase() || "S"}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-[#282860] truncate">{student.name}</p>
                            {student.assignee && student.assignee !== "Unassigned" && (
                              <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                                with {student.assignee}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 truncate">{student.email || "No email"}</p>
                        </div>
                        
                        <span className={`inline-flex px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider shrink-0 ${getStatusColor(student.status || "")}`}>
                          {student.status || "NEW LEAD"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* FOOTER */}
            <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
              <button 
                onClick={() => setIsAssignModalOpen(false)}
                className="px-5 py-2.5 text-slate-500 font-bold text-sm hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAssign}
                disabled={selectedStudentIds.size === 0 || isAssigning}
                className="bg-[#282860] hover:bg-[#1b1b42] text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md disabled:opacity-50 flex items-center gap-2 active:scale-95"
              >
                {isAssigning ? (
                  <><Loader2 size={16} className="animate-spin"/> Assigning...</>
                ) : (
                  <>Assign {selectedStudentIds.size > 0 ? `(${selectedStudentIds.size})` : ""} student{selectedStudentIds.size !== 1 ? 's' : ''}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}