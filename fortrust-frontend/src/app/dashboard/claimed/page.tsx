"use client";

import { useState, useEffect } from "react";
import { 
  DollarSign, Building, ChevronRight, X, Loader2, 
  ArrowLeft, FileText, Mail, Phone, Activity, GraduationCap,
  UserCircle, FileSignature
} from "lucide-react";

export default function ClaimedCommission() {
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [completedStudents, setCompletedStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Deep Dive States
  const [selectedInst, setSelectedInst] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null); // This triggers the student detail modal/panel

  useEffect(() => {
    fetchPayoutData();
  }, []);

  const fetchPayoutData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("fortrust_token");
      const [instRes, studentsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/institutions`, { headers: { "Authorization": `Bearer ${token}` } }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pipeline?role=MASTER_ADMIN`, { headers: { "Authorization": `Bearer ${token}` } })
      ]);

      const instData = await instRes.json();
      const studentsData = await studentsRes.json();

      if (instData.status === "success") setInstitutions(instData.data || []);
      if (studentsData.status === "success") {
        const closedDeals = studentsData.data.filter((s: any) => s.status?.toUpperCase() === "COMPLETED");
        setCompletedStudents(closedDeals);
      }
    } catch (error) {
      console.error("Failed to fetch payout data", error);
    } finally {
      setLoading(false);
    }
  };

  const payoutsByInstitution = institutions.map(inst => {
    const instName = inst.institution_name || inst.name;
    const studentsForInst = completedStudents.filter(s => s.university === instName || s.institution_id === inst.id);
    const totalClaimed = studentsForInst.reduce((sum, s) => sum + (parseFloat(s.commission_earned) || 0), 0);
    return { ...inst, instName, students: studentsForInst, totalClaimed };
  }).filter(inst => inst.totalClaimed > 0 || inst.students.length > 0);

  const grandTotalClaimed = payoutsByInstitution.reduce((sum, inst) => sum + inst.totalClaimed, 0);

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-[#BAD133]" size={40}/></div>;

  return (
    <div className="p-4 lg:p-8 max-w-[1400px] mx-auto w-full relative">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#282860] flex items-center gap-3">
            <DollarSign className="text-[#BAD133]" size={36} />
            Claimed Commission
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Track your historical commission payouts from institution partners.</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* LEDGER TABLE */}
        <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 ${selectedInst ? 'hidden lg:block w-1/3' : 'flex-1'}`}>
          <div className="p-6 border-b border-slate-100 bg-[#f8fafc] flex justify-between items-center">
            <div><h2 className="text-lg font-bold text-[#282860]">Ledger</h2></div>
            <p className="text-2xl font-black text-green-600">${grandTotalClaimed.toLocaleString()}</p>
          </div>
          <table className="w-full text-left">
            <tbody className="text-sm divide-y divide-slate-100">
              {payoutsByInstitution.map((inst) => (
                <tr key={inst.id} className={`hover:bg-slate-50 cursor-pointer ${selectedInst?.id === inst.id ? 'bg-slate-50' : ''}`} onClick={() => setSelectedInst(inst)}>
                  <td className="px-5 py-4 font-bold text-[#282860]">{inst.instName}</td>
                  <td className="px-5 py-4 text-right font-black text-green-600">${inst.totalClaimed.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* UNIVERSITY DEEP DIVE */}
        {selectedInst && (
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="p-6 border-b border-slate-100 bg-[#1b1b42] text-white flex justify-between items-center">
              <button onClick={() => setSelectedInst(null)} className="text-slate-400 hover:text-white"><ArrowLeft size={20}/></button>
              <h2 className="font-bold text-lg">{selectedInst.instName}</h2>
              <div/>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
                  <tr><th className="px-6 py-4">Student Name</th><th className="px-6 py-4">Commission</th><th className="px-6 py-4">Status</th></tr>
                </thead>
                <tbody className="divide-y">
                  {selectedInst.students.map((student: any) => (
                    <tr key={student.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedStudent(student)}>
                      <td className="px-6 py-4 font-bold">{student.name}</td>
                      <td className="px-6 py-4 text-green-600">${parseFloat(student.commission_earned).toLocaleString()}</td>
                      <td className="px-6 py-4"><span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 px-2 py-1 rounded">ADMITTED</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* --- STUDENT DETAIL SLIDE-OUT PANEL (THE ONE YOU WANTED) --- */}
      {selectedStudent && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setSelectedStudent(null)}></div>
          <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-white shadow-2xl border-l z-[60] flex flex-col animate-in slide-in-from-right-8 duration-300">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-[#282860] text-xl">{selectedStudent.name}</h3>
              <button onClick={() => setSelectedStudent(null)}><X size={20}/></button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase">Contact Info</p>
                <div className="flex items-center gap-2"><Mail size={14} className="text-slate-400"/> <span className="text-sm font-medium">{selectedStudent.email}</span></div>
                <div className="flex items-center gap-2"><Phone size={14} className="text-slate-400"/> <span className="text-sm font-medium">{selectedStudent.phone}</span></div>
              </div>
              
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-3">Application History</p>
                <div className="space-y-2">
                   {selectedStudent.applications?.map((app: any) => (
                     <div key={app.id} className="p-3 border rounded-lg text-sm font-bold text-[#282860] flex justify-between">
                       {app.university} <span className="text-green-600 text-xs uppercase">{app.status}</span>
                     </div>
                   ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}