"use client";

import { useState, useEffect } from "react";
import { 
  Building2, 
  MapPin, 
  Mail, 
  Search, 
  Plus, 
  FileText, 
  DownloadCloud, 
  CheckCircle2, 
  AlertCircle,
  Phone,
  Globe,
  Loader2
} from "lucide-react";

export default function NetworkDirectoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // FETCH DATA FROM PYTHON BACKEND
  useEffect(() => {
    const fetchInstitutions = async () => {
      const token = localStorage.getItem("fortrust_token");
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/institutions`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.status === "success") {
          setInstitutions(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch network directory:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInstitutions();
  }, []);

  const filteredInstitutions = institutions.filter(inst => 
    inst.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inst.country?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-[#282860] flex items-center gap-3">
            <Globe className="text-[#BAD133]" size={32} />
            Global Network Directory
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Manage Institution Partners, Key Contacts, and Legal Agreements.
          </p>
        </div>
        <button className="bg-[#282860] hover:bg-[#1b1b42] text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-md">
          <Plus size={18} />
          Add Institution
        </button>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search universities, colleges, or countries..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#282860] focus:ring-1 focus:ring-[#282860] transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* INSTITUTION TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p>Loading global directory...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#f8fafc] border-b border-slate-200 text-[10px] font-black text-slate-500 tracking-wider uppercase">
                <tr>
                  <th className="px-6 py-5">Institution Name</th>
                  <th className="px-6 py-5">Location</th>
                  <th className="px-6 py-5">Key Contact</th>
                  <th className="px-6 py-5">Agreement Status</th>
                  <th className="px-6 py-5 text-right">Contract File</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredInstitutions.map((inst) => (
                  <tr key={inst.id} className="hover:bg-slate-50 transition-colors">
                    
                    {/* Name & Type */}
                    <td className="px-6 py-4">
                      <span className="font-bold text-[#282860] block text-base flex items-center gap-2">
                        <Building2 size={16} className="text-slate-400" />
                        {inst.name}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1 block">
                        {inst.type}
                      </span>
                    </td>

                    {/* Location */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <MapPin size={14} className="text-slate-400" />
                        {inst.city}, {inst.country}
                      </div>
                    </td>

                    {/* Key Contact */}
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-700 block">{inst.contact_name}</span>
                      <div className="flex flex-col gap-1 mt-1">
                        <span className="text-xs text-slate-500 flex items-center gap-1.5 hover:text-blue-600 cursor-pointer">
                          <Mail size={12} /> {inst.contact_email}
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1.5">
                          <Phone size={12} /> {inst.contact_phone}
                        </span>
                      </div>
                    </td>

                    {/* Agreement Status */}
                    <td className="px-6 py-4">
                      {inst.status === "Active" ? (
                        <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-md text-xs font-bold">
                          <CheckCircle2 size={14} /> Active Contract
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-md text-xs font-bold">
                          <AlertCircle size={14} /> Pending Renewal
                        </span>
                      )}
                    </td>

                    {/* Contract File Download */}
                    <td className="px-6 py-4 text-right">
                      <button className="inline-flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                        <FileText size={14} className="text-[#282860]" />
                        View Contract
                        <DownloadCloud size={14} className="text-slate-400 ml-1" />
                      </button>
                    </td>

                  </tr>
                ))}
                
                {filteredInstitutions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      <Building2 size={48} className="mx-auto text-slate-300 mb-3" />
                      <p className="font-semibold text-lg">No institutions found</p>
                      <p className="text-sm">Click "Add Institution" to start building your network directory.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}