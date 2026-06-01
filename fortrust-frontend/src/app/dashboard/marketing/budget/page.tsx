"use client";

import React, { useState, useMemo } from "react";
import { 
  DollarSign, Plus, X, TrendingUp, TrendingDown, Target, 
  Activity, PieChart, ArrowUpRight, ArrowDownRight, Globe 
} from "lucide-react";

type Campaign = {
  id: string;
  name: string;
  platform: string;
  spend: number;
  leads: number;
  deals: number;
  revenue: number;
};

const CURRENCIES = [
  { code: "USD", symbol: "$", locale: "en-US" },
  { code: "IDR", symbol: "Rp", locale: "id-ID" },
  { code: "AUD", symbol: "A$", locale: "en-AU" },
  { code: "GBP", symbol: "£", locale: "en-GB" },
  { code: "EUR", symbol: "€", locale: "de-DE" },
];

export default function BudgetRoiPage() {
  const [currency, setCurrency] = useState(CURRENCIES[0]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([
    { id: "1", name: "Q1 University Expo", platform: "Event", spend: 5000, leads: 120, deals: 8, revenue: 24000 },
    { id: "2", name: "Meta Retargeting", platform: "Meta Ads", spend: 1200, leads: 85, deals: 3, revenue: 9000 }
  ]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "", platform: "Meta Ads", spend: "", leads: "", deals: "", revenue: ""
  });

  const handleAddCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    const newCampaign: Campaign = {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.name,
      platform: formData.platform,
      spend: Number(formData.spend),
      leads: Number(formData.leads),
      deals: Number(formData.deals),
      revenue: Number(formData.revenue),
    };
    setCampaigns([newCampaign, ...campaigns]);
    setIsModalOpen(false);
    setFormData({ name: "", platform: "Meta Ads", spend: "", leads: "", deals: "", revenue: "" });
  };

  const deleteCampaign = (id: string) => {
    setCampaigns(campaigns.filter(c => c.id !== id));
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat(currency.locale, {
      style: "currency",
      currency: currency.code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Global KPIs
  const totalSpend = useMemo(() => campaigns.reduce((sum, c) => sum + c.spend, 0), [campaigns]);
  const totalRevenue = useMemo(() => campaigns.reduce((sum, c) => sum + c.revenue, 0), [campaigns]);
  const totalLeads = useMemo(() => campaigns.reduce((sum, c) => sum + c.leads, 0), [campaigns]);
  const totalDeals = useMemo(() => campaigns.reduce((sum, c) => sum + c.deals, 0), [campaigns]);
  
  const globalRoi = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0;
  const averageCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;

  return (
    <div className="p-4 lg:p-8 max-w-[1500px] mx-auto w-full relative animate-in fade-in">
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#282860] flex items-center gap-3">
            <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
              <DollarSign className="text-[#BAD133]" size={28} />
            </div>
            Budget & ROI
          </h1>
          <p className="text-slate-500 mt-2 font-medium text-sm">
            Track marketing spend, calculate cost-per-lead, and analyze return on investment.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:flex-none">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Globe size={16} className="text-slate-400" />
            </div>
            <select 
              className="w-full lg:w-48 pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-[#282860] focus:outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 appearance-none cursor-pointer shadow-sm"
              value={currency.code}
              onChange={(e) => setCurrency(CURRENCIES.find(c => c.code === e.target.value) || CURRENCIES[0])}
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
              ))}
            </select>
          </div>
          
          <button onClick={() => setIsModalOpen(true)} className="bg-[#282860] hover:bg-[#1b1b42] active:scale-95 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md flex items-center gap-2 shrink-0">
            <Plus size={18} /> Add Record
          </button>
        </div>
      </div>

      {/* GLOBAL KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Marketing Spend</p>
          <p className="text-3xl font-black text-[#282860]">{formatMoney(totalSpend)}</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Generated Revenue</p>
          <p className="text-3xl font-black text-emerald-600">{formatMoney(totalRevenue)}</p>
        </div>
        <div className={`rounded-2xl border p-6 shadow-sm ${globalRoi >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'}`}>
          <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${globalRoi >= 0 ? 'text-blue-600' : 'text-red-600'}`}>Average ROI</p>
          <p className={`text-3xl font-black flex items-center gap-2 ${globalRoi >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {globalRoi >= 0 ? <ArrowUpRight size={24}/> : <ArrowDownRight size={24}/>}
            {globalRoi.toFixed(1)}%
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Avg. Cost Per Lead (CPL)</p>
          <p className="text-3xl font-black text-[#282860]">{formatMoney(averageCpl)}</p>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-bold text-[#282860] flex items-center gap-2"><PieChart size={18} className="text-[#BAD133]"/> Campaign Ledger</h3>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-[#f8fafc] border-b border-slate-200 text-[10px] font-black text-slate-400 tracking-widest uppercase">
              <tr>
                <th className="px-6 py-4">Campaign Name</th>
                <th className="px-6 py-4">Platform</th>
                <th className="px-6 py-4 text-right">Spend</th>
                <th className="px-6 py-4 text-center">Leads / Deals</th>
                <th className="px-6 py-4 text-right">Revenue</th>
                <th className="px-6 py-4">Performance (ROI)</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {campaigns.length === 0 ? (
                <tr><td colSpan={7} className="p-12 text-center text-slate-400 font-medium">No marketing data entered yet.</td></tr>
              ) : (
                campaigns.map((c) => {
                  const roi = c.spend > 0 ? ((c.revenue - c.spend) / c.spend) * 100 : 0;
                  const cpl = c.leads > 0 ? c.spend / c.leads : 0;
                  
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-bold text-[#282860] block">{c.name}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">CPL: {formatMoney(cpl)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-xs font-bold">{c.platform}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-600">{formatMoney(c.spend)}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-bold" title="Leads">{c.leads}</span>
                          <span className="text-slate-300">/</span>
                          <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md text-xs font-bold" title="Deals Closed">{c.deals}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-emerald-600">{formatMoney(c.revenue)}</td>
                      <td className="px-6 py-4">
                        <div className={`flex items-center gap-1.5 font-bold text-xs px-2.5 py-1.5 rounded-lg w-fit ${roi >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                          {roi >= 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                          {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => deleteCampaign(c.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <X size={18} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD CAMPAIGN MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-[#f8fafc]">
              <h2 className="text-xl font-bold text-[#282860] flex items-center gap-2"><Target size={22} className="text-[#BAD133]" /> Log Marketing Data</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleAddCampaign} className="p-6 lg:p-8 space-y-5">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Campaign Name</label>
                  <input type="text" required placeholder="e.g. Summer Intake Ads" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all bg-slate-50 focus:bg-white" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                
                <div className="col-span-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Traffic Source / Platform</label>
                  <select className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all bg-slate-50 focus:bg-white cursor-pointer" value={formData.platform} onChange={e => setFormData({...formData, platform: e.target.value})}>
                    <option value="Meta Ads">Meta Ads (FB/IG)</option>
                    <option value="Google Search">Google Search</option>
                    <option value="TikTok Ads">TikTok Ads</option>
                    <option value="Event / Expo">Event / Education Expo</option>
                    <option value="Organic Referral">Organic Referral</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Total Spend ({currency.symbol})</label>
                  <input type="number" required min="0" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-red-500 outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all bg-slate-50 focus:bg-white" value={formData.spend} onChange={e => setFormData({...formData, spend: e.target.value})} />
                </div>
                
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Total Revenue ({currency.symbol})</label>
                  <input type="number" required min="0" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-emerald-600 outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all bg-slate-50 focus:bg-white" value={formData.revenue} onChange={e => setFormData({...formData, revenue: e.target.value})} />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Leads Generated</label>
                  <input type="number" required min="0" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all bg-slate-50 focus:bg-white" value={formData.leads} onChange={e => setFormData({...formData, leads: e.target.value})} />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Deals Closed</label>
                  <input type="number" required min="0" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all bg-slate-50 focus:bg-white" value={formData.deals} onChange={e => setFormData({...formData, deals: e.target.value})} />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-3 text-slate-500 hover:text-slate-700 font-bold text-sm transition-colors">Cancel</button>
                <button type="submit" className="bg-[#282860] hover:bg-[#1b1b42] active:scale-95 text-white px-8 py-3 rounded-xl text-sm font-bold transition-all shadow-md">Save Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}