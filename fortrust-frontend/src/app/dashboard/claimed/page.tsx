"use client";

import { useState, useEffect } from "react";
import { DollarSign, Building, ChevronRight, X, Loader2 } from "lucide-react";

export default function ClaimedCommission() {
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [completedStudents, setCompletedStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayout, setSelectedPayout] = useState<any>(null);

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
    const studentsForInst = completedStudents.filter(s => s.institution_id === inst.id);
    const totalClaimed = studentsForInst.reduce((sum, s) => sum + (parseFloat(s.commission_earned) || 0), 0);
    return { ...inst, students: studentsForInst, totalClaimed };
  }).filter(inst => inst.totalClaimed > 0);

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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1">
          <div className="p-6 border-b border-slate-100 bg-[#f8fafc] flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-[#282860]">Commission Payout Ledger</h2>
              <p className="text-xs text-slate-500">Historical record grouped by institution.</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Claimed (Global)</p>
              <p className="text-2xl font-black text-green-600">${grandTotalClaimed.toLocaleString()}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-white text-[#64748b] text-[10px] uppercase tracking-widest border-b border-slate-200">
                <tr>
                  <th className="px-5 py-4">Institution</th>
                  <th className="px-5 py-4 text-center">Total Students</th>
                  <th className="px-5 py-4 text-right">Total Payout</th>
                  <th className="px-5 py-4 text-center">Details</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {payoutsByInstitution.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-500">No paid commissions recorded yet.</td></tr>
                ) : payoutsByInstitution.map((inst) => (
                  <tr key={inst.id} className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => setSelectedPayout(inst)}>
                    <td className="px-5 py-4 font-bold text-[#282860] flex items-center gap-2"><Building size={16} className="text-slate-400"/> {inst.name}</td>
                    <td className="px-5 py-4 text-center font-bold text-slate-600 bg-slate-50">{inst.students.length}</td>
                    <td className="px-5 py-4 font-black text-green-600 text-right">${inst.totalClaimed.toLocaleString()}</td>
                    <td className="px-5 py-4 text-center">
                      <button className="text-[#BAD133] group-hover:text-white group-hover:bg-[#BAD133] border border-[#BAD133] rounded-full p-1 transition-colors mx-auto block"><ChevronRight size={18}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selectedPayout && (
          <div className="w-[400px] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col animate-in slide-in-from-right-8 shrink-0">
            <div className="p-5 border-b border-slate-100 bg-[#1b1b42] text-white flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#BAD133]">Payout Details</p>
                <h3 className="font-bold text-lg">{selectedPayout.name}</h3>
              </div>
              <button onClick={() => setSelectedPayout(null)} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50">
              {selectedPayout.students.map((student: any) => (
                <div key={student.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                  <div>
                    <p className="font-bold text-[#282860]">{student.name}</p>
                    <p className="text-xs text-slate-500 mt-1">Closed by: <span className="font-bold">{student.assignee}</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-widest mb-1">Generated</p>
                    <p className="font-black text-green-600">${parseFloat(student.commission_earned).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}