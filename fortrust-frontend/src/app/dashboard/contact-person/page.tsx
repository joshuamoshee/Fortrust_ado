"use client";

import React, { useState, useEffect } from "react";
import { 
  Phone, Mail, Building2, Search, 
  CheckCircle2, Loader2, MessageCircle, Users
} from "lucide-react";

export default function ContactPersonDirectory() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");

  useEffect(() => {
    const fetchContacts = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("fortrust_token");
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/institutions`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.status === "success") {
          // Extract and flatten ALL contacts from ALL institutions
          const allContacts: any[] = [];
          data.data.forEach((inst: any) => {
            if (!inst.contacts) return;
            let parsedContacts: any[] = [];
            try {
              parsedContacts = typeof inst.contacts === 'string' 
                ? JSON.parse(inst.contacts) 
                : inst.contacts;
            } catch (e) {
              console.warn(`Could not parse contacts for ${inst.name}`);
              return;
            }
            if (!Array.isArray(parsedContacts)) return;
            parsedContacts.forEach((c: any) => {
              if (!c) return;
              allContacts.push({
                ...c,
                institution_name: inst.name,
                country: inst.country,
                institution_status: inst.status,
                institution_id: inst.id
              });
            });
          });
          setContacts(allContacts);
        }
      } catch (error) {
        console.error("Failed to load contacts", error);
      } finally {
        setLoading(false);
      }
    };
    fetchContacts();
  }, []);

  const departments = Array.from(new Set(contacts.map(c => c.department || "General"))).filter(Boolean);

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = (c.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (c.institution_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (c.email || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = departmentFilter === "ALL" || (c.department || "General") === departmentFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="p-4 lg:p-8 max-w-[1500px] mx-auto w-full animate-in fade-in">
      
      {/* HEADER */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#282860] flex items-center gap-3">
            <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
              <Phone className="text-[#BAD133]" size={28} />
            </div>
            Global B2B Directory
          </h1>
          <p className="text-slate-500 mt-2 font-medium text-sm">
            Master Rolodex of all university regional managers, admissions officers, and partners.
            {contacts.length > 0 && (
              <span className="ml-2 bg-[#BAD133]/20 text-[#1b1b42] px-2 py-0.5 rounded-full text-[11px] font-bold">
                {contacts.length} total contacts
              </span>
            )}
          </p>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="bg-white rounded-t-3xl border border-slate-200 shadow-sm p-5 border-b-0 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex items-center text-slate-400 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 w-full md:w-96 focus-within:border-[#BAD133] focus-within:ring-2 focus-within:ring-[#BAD133]/20 transition-all shadow-inner">
          <Search size={18} className="mr-3 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search name, institution, or email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-slate-700 w-full font-bold" 
          />
        </div>
        
        <div className="flex w-full md:w-auto gap-3">
          <select 
            value={departmentFilter} 
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[#BAD133] cursor-pointer w-full md:w-auto"
          >
            <option value="ALL">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* DIRECTORY GRID */}
      <div className="bg-slate-50 border border-slate-200 rounded-b-3xl shadow-sm p-6 min-h-[600px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-[#BAD133] mb-4"/>
            <p className="text-slate-500 font-bold">Syncing B2B Directory...</p>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
            <Users size={48} className="text-slate-300 mb-4"/>
            <p className="text-slate-500 font-bold">
              {contacts.length === 0 ? "No contacts in directory yet." : "No contacts match your search."}
            </p>
            {contacts.length === 0 && (
              <p className="text-xs text-slate-400 mt-2">Add contacts via the Institution Partners page.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredContacts.map((contact, i) => (
              <div key={`${contact.institution_id}-${i}`} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 group">
                <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#282860] text-white flex items-center justify-center font-black text-lg shadow-inner">
                      {(contact.full_name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-black text-[#282860] text-base group-hover:text-[#BAD133] transition-colors">{contact.full_name || "Unknown Name"}</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{contact.title || "Representative"}</p>
                    </div>
                  </div>
                  {contact.primary === "Yes" && (
                    <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 size={10}/> Primary
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><Building2 size={14}/></div>
                    <div className="overflow-hidden">
                      <p className="font-bold text-slate-700 truncate">{contact.institution_name}</p>
                      <p className="text-[10px] font-medium text-slate-400">{contact.department || "General"} • {contact.country}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center shrink-0"><Mail size={14}/></div>
                    <p className="font-bold text-slate-700 truncate">{contact.email || "N/A"}</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shrink-0"><MessageCircle size={14}/></div>
                    <p className="font-bold text-slate-700">{contact.whatsapp || contact.mobile || contact.phone || "N/A"}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}