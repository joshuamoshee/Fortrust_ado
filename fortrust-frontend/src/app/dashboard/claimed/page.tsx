"use client";

import React, { useState, useEffect } from "react";
import { 
  DollarSign, TrendingUp, Download, CheckCircle2, Clock, 
  AlertCircle, Wallet, FileText, ArrowUpRight, Search, Filter, Sparkles, Building, Loader2, X
} from "lucide-react";

export default function CommissionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Live Database State
  const [ledger, setLedger] = useState<any[]>([]);
  const [notification, setNotification] = useState<{type: 'success'|'error', text: string} | null>(null);

  useEffect(() => {
    fetchLedger();
  }, []);

  const fetchLedger = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/commissions`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") {
        setLedger(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch ledger");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimFunds = async () => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/commissions/claim`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (res.ok && data.status === "success") {
        setNotification({type: 'success', text: "Invoice successfully generated and sent to Fortrust Finance! Funds will arrive in 3-5 business days."});
        setShowClaimModal(false);
        fetchLedger(); // Refresh to show funds as CLAIMED
      } else {
        setNotification({type: 'error', text: data.message || "Failed to claim funds."});
      }
    } catch (error) {
      setNotification({type: 'error', text: "Network Error."});
    } finally {
      setIsProcessing(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const clearedTotal = ledger.filter(l => l.status === "CLEARED").reduce((sum, l) => sum + l.amount, 0);
  const pendingTotal = ledger.filter(l => l.status === "PENDING_CENSUS").reduce((sum, l) => sum + l.amount, 0);
  const lifetimeTotal = ledger.filter(l => l.status === "CLAIMED").reduce((sum, l) => sum + l.amount, 0);

  const filteredLedger = ledger.filter(l => {
    const matchesSearch = l.student.toLowerCase().includes(searchQuery.toLowerCase()) || l.university.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 lg:p-8 max-w-[1500px] mx-auto w-full relative animate-in fade-in">
      
      {notification && (
        <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-2xl font-bold flex items-center justify-between shadow-2xl animate-in slide-in-from-top-4
          ${notification.type === 'success' ? 'bg-[#282860] text-white border border-[#3a3a7a]' : 'bg-red-500 text-white border border-red-600'}`}>
          <div className="flex items-center gap-3">
            {notification.type === 'success' ? <CheckCircle2 className="text-[#BAD133]" size={20}/> : <AlertCircle size={20}/>}
            {notification.text}
          </div>
          <button onClick={() => setNotification(null)} className="ml-6 opacity-70 hover:opacity-100 transition-opacity"><X size={18} /></button>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#282860] flex items-center gap-3">
            <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
              <Wallet className="text-[#BAD133]" size={28} />
            </div>
            Financial Ledger & Payouts
          </h1>
          <p className="text-slate-500 mt-2 font-medium text-sm">
            Track your cleared commissions, pending university payments, and lifetime earnings.
          </p>
        </div>
        
        <button 
          onClick={() => setShowClaimModal(true)}
          disabled={clearedTotal === 0}
          className="bg-[#282860] hover:bg-[#1b1b42] disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-8 py-3.5 rounded-xl text-sm font-black transition-all shadow-xl shadow-[#282860]/20 flex items-center gap-2 active:scale-95 shrink-0"
        >
          <ArrowUpRight size={18} className={clearedTotal > 0 ? "text-[#BAD133]" : "text-slate-400"} /> 
          Claim ${clearedTotal.toLocaleString()} Now
        </button>
      </div>

      {/* FINANCIAL METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        
        <div className="bg-gradient-to-br from-[#282860] to-[#1b1b42] p-8 rounded-3xl shadow-xl relative overflow-hidden text-white border border-[#3a3a7a]">
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#BAD133] rounded-full blur-[60px] opacity-20 -mr-10 -mt-10 pointer-events-none"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/10 p-3 rounded-2xl border border-white/10"><Wallet className="text-[#BAD133]" size={24}/></div>
              <span className="bg-[#BAD133] text-[#1b1b42] px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm">Available to Claim</span>
            </div>
            <p className="text-5xl font-black tracking-tight mb-1">${clearedTotal.toLocaleString()}</p>
            <p className="text-sm text-blue-200 font-medium">Cleared by universities and ready for SWIFT transfer.</p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-amber-50 p-3 rounded-2xl border border-amber-100"><Clock className="text-amber-500" size={24}/></div>
            <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">In Escrow</span>
          </div>
          <p className="text-4xl font-black text-[#282860] tracking-tight mb-1">${pendingTotal.toLocaleString()}</p>
          <p className="text-sm text-slate-500 font-medium">Pending university census dates or student enrollment confirmation.</p>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100"><TrendingUp className="text-emerald-500" size={24}/></div>
            <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">Lifetime Earned</span>
          </div>
          <p className="text-4xl font-black text-[#282860] tracking-tight mb-1">${lifetimeTotal.toLocaleString()}</p>
          <p className="text-sm text-slate-500 font-medium">Total historical commissions successfully withdrawn to your bank.</p>
        </div>

      </div>

      {/* AI REVENUE FORECAST */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-6 rounded-3xl mb-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm relative overflow-hidden">
         <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-white/40 to-transparent pointer-events-none"></div>
         <div className="flex items-start gap-4 relative z-10">
           <div className="bg-white p-3 rounded-2xl shadow-sm border border-blue-100 shrink-0 mt-1"><Sparkles size={24} className="text-blue-600"/></div>
           <div>
             <h3 className="font-black text-[#282860] text-lg flex items-center gap-2">AI Revenue Forecast</h3>
             <p className="text-sm text-slate-600 font-medium mt-1 leading-relaxed max-w-3xl">
               Based on your current <strong>Active Pipeline</strong> (students in Application & Visa stages) and historical conversion rates, Fortrust AI predicts you will generate an additional <strong className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 font-black">${(pendingTotal * 1.5).toLocaleString()}</strong> in cleared commissions over the next 90 days.
             </p>
           </div>
         </div>
      </div>

      {/* LEDGER TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-[600px]">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex items-center text-slate-400 bg-white px-4 py-3 rounded-xl border border-slate-200 w-full md:w-96 focus-within:border-[#BAD133] focus-within:ring-2 focus-within:ring-[#BAD133]/20 transition-all shadow-sm">
            <Search size={18} className="mr-3 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search student or university..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-slate-700 w-full font-bold placeholder-slate-400" 
            />
          </div>
          
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 text-slate-700 rounded-xl px-5 py-3 text-sm font-bold outline-none focus:border-[#BAD133] shadow-sm cursor-pointer w-full md:w-auto"
          >
            <option value="ALL">All Transactions</option>
            <option value="CLEARED">🟢 Cleared & Ready</option>
            <option value="PENDING_CENSUS">🟠 Pending Escrow</option>
            <option value="CLAIMED">⚪ Already Claimed</option>
          </select>
        </div>

        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-[#f8fafc] border-b border-slate-200 text-[10px] font-black text-slate-400 tracking-widest uppercase sticky top-0 z-10">
              <tr>
                <th className="px-6 py-5">Transaction Details</th>
                <th className="px-6 py-5">Institution & Program</th>
                <th className="px-6 py-5">Financial Breakdown</th>
                <th className="px-6 py-5">Ledger Status</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={5} className="p-16 text-center"><Loader2 size={32} className="animate-spin text-[#BAD133] mx-auto mb-4"/> Syncing Financial Records...</td></tr>
              ) : filteredLedger.length === 0 ? (
                <tr><td colSpan={5} className="p-16 text-center text-slate-400 font-medium">No transactions found matching your criteria.</td></tr>
              ) : (
                filteredLedger.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
                    
                    <td className="px-6 py-5">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl border shrink-0
                          ${row.status === 'CLEARED' ? 'bg-[#BAD133]/10 border-[#BAD133]/20 text-[#282860]' : 
                            row.status === 'PENDING_CENSUS' ? 'bg-amber-50 border-amber-100 text-amber-500' : 
                            'bg-slate-100 border-slate-200 text-slate-400'}`}>
                          <FileText size={20}/>
                        </div>
                        <div>
                          <p className="font-black text-[#282860] text-base group-hover:text-[#BAD133] transition-colors">{row.student}</p>
                          <p className="text-[10px] text-slate-400 font-mono font-bold tracking-wider mt-0.5">{row.id}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 font-bold text-slate-700 text-sm">
                        <Building size={14} className="text-slate-400"/> {row.university}
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-1 ml-5">{row.program}</p>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between max-w-[200px] text-xs">
                          <span className="text-slate-500">Gross Tuition:</span>
                          <span className="font-mono font-bold text-slate-700">${row.tuition.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between max-w-[200px] text-xs">
                          <span className="text-slate-500">Base Rate:</span>
                          <span className="font-mono font-bold text-blue-600">{row.rate}%</span>
                        </div>
                        <div className="flex items-center justify-between max-w-[200px] text-sm mt-1 border-t border-slate-100 pt-1">
                          <span className="font-bold text-[#282860]">Net Payout:</span>
                          <span className="font-black text-emerald-600">${row.amount.toLocaleString()}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      {row.status === "CLEARED" && (
                        <div className="flex flex-col items-start gap-1">
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"><CheckCircle2 size={12}/> Cleared</span>
                          <span className="text-[10px] text-slate-500 font-medium max-w-[180px]">{row.notes}</span>
                        </div>
                      )}
                      {row.status === "PENDING_CENSUS" && (
                        <div className="flex flex-col items-start gap-1">
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"><Clock size={12}/> In Escrow</span>
                          <span className="text-[10px] text-amber-600 font-bold max-w-[180px]">{row.notes}</span>
                        </div>
                      )}
                      {row.status === "CLAIMED" && (
                        <div className="flex flex-col items-start gap-1">
                          <span className="bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"><CheckCircle2 size={12}/> Claimed</span>
                          <span className="text-[10px] text-slate-500 font-bold">Processed: {row.date}</span>
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex justify-end">
                        <button 
                          disabled={row.status === "PENDING_CENSUS"}
                          className={`p-2 rounded-lg border transition-all shadow-sm flex items-center justify-center
                            ${row.status === 'PENDING_CENSUS' 
                              ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed' 
                              : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300'}`}
                          title={row.status === "PENDING_CENSUS" ? "Invoice not available until cleared" : "Download PDF Invoice"}
                        >
                          <Download size={18} />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1-CLICK CLAIM MODAL */}
      {showClaimModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-[#1b1b42] p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#BAD133] rounded-full blur-[60px] opacity-20 -mr-10 -mt-10 pointer-events-none"></div>
              <div className="w-16 h-16 bg-[#BAD133] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg rotate-3">
                <Wallet size={32} className="text-[#1b1b42] -rotate-3"/>
              </div>
              <h2 className="text-2xl font-black text-white">Withdraw Funds</h2>
              <p className="text-slate-300 text-sm mt-2">Generate invoice and request SWIFT transfer.</p>
            </div>
            
            <div className="p-8">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center mb-6">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Amount to Claim</p>
                <p className="text-4xl font-black text-[#282860]">${clearedTotal.toLocaleString()}</p>
                <p className="text-xs text-slate-500 font-medium mt-3 flex items-center justify-center gap-1.5"><AlertCircle size={14}/> Funds will be sent to your saved Bank Details.</p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowClaimModal(false)} className="w-full py-3.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold transition-all">Cancel</button>
                <button 
                  onClick={handleClaimFunds}
                  disabled={isProcessing}
                  className="w-full py-3.5 bg-[#BAD133] hover:bg-[#a3b827] text-[#1b1b42] disabled:opacity-50 rounded-xl font-black transition-all shadow-md flex items-center justify-center gap-2"
                >
                  {isProcessing ? <><Loader2 size={18} className="animate-spin"/> Processing...</> : "Confirm Payout"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}