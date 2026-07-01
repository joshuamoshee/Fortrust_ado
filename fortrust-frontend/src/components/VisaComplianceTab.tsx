// fortrust-frontend/src/components/VisaComplianceTab.tsx
// The main Visa Compliance dashboard — country-aware document checklist.
// Shows requirements specific to student's target country/countries with
// status tracking, download buttons for blank forms, and upload slots.

"use client";

import { useMemo, useState } from "react";
import {
  ShieldCheck, CheckCircle2, AlertCircle, Loader2, Download,
  Plus, Eye, Trash2, FileText, MapPin, ChevronRight, Globe, Sparkles,
  Languages, Stamp, Camera
} from "lucide-react";
import {
  COUNTRY_REQUIREMENTS,
  CountryCode,
  CountryRequirements,
  DocumentRequirement,
  getRequirementsForCountries,
  mergeRequirements,
  isStudentUnder18,
  shouldShowDocument,
  CATEGORY_META,
} from "@/lib/countryRequirements";
import PhotoUploadCard from "./PhotoUploadCard";

interface Props {
  student: any;
  studentDocs: any[];
  isUploadingDoc: boolean;
  loadingDocFilename: string | null;
  deletingDocFilename: string | null;
  onUploadDocument: (file: File, docId: string, countryCode?: string) => Promise<void>;
  onViewDocument: (filename: string) => Promise<void>;
  onDeleteDocument: (filename: string, displayName: string) => Promise<void>;
  onDownloadTemplate: (formId: string) => Promise<void>;
  onUpdateHardCopyCount: (countryCode: string, count: number) => void;
  apiUrl: string;
}

// Match uploaded docs to a requirement by checking title/filename for the doc id
function getDocsForRequirement(docId: string, allDocs: any[]): any[] {
  const idTokens = docId.toLowerCase().split("_");
  return allDocs.filter((d: any) => {
    const title = (d.title || "").toLowerCase();
    const filename = (d.filename || "").toLowerCase();
    // Match if all major tokens appear in either title or filename
    return idTokens.every(tok => tok.length < 3 || title.includes(tok) || filename.includes(tok));
  });
}

export default function VisaComplianceTab({
  student,
  studentDocs,
  isUploadingDoc,
  loadingDocFilename,
  deletingDocFilename,
  onUploadDocument,
  onViewDocument,
  onDeleteDocument,
  onDownloadTemplate,
  onUpdateHardCopyCount,
  apiUrl,
}: Props) {
  // Parse student's country interests
  const targetCountryCodes = useMemo(() => {
    if (!student?.country_interest) return [];
    try {
      const parsed = typeof student.country_interest === "string" && student.country_interest.startsWith("[")
        ? JSON.parse(student.country_interest)
        : [student.country_interest];
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }, [student?.country_interest]);
  
  const countries: CountryRequirements[] = useMemo(() => 
    getRequirementsForCountries(targetCountryCodes),
    [targetCountryCodes]
  );
  
  // Parse hard copy tracker (stored in student.photo_hard_copies JSONB)
  const hardCopyTracker = useMemo(() => {
    if (!student?.photo_hard_copies) return {};
    try {
      return typeof student.photo_hard_copies === "string" 
        ? JSON.parse(student.photo_hard_copies)
        : student.photo_hard_copies;
    } catch {
      return {};
    }
  }, [student?.photo_hard_copies]);
  
  // Merge requirements across all target countries
  const mergedDocs = useMemo(() => {
    if (countries.length === 0) return [];
    return mergeRequirements(countries).filter(doc => shouldShowDocument(doc, student));
  }, [countries, student]);
  
  // Group by category
  const docsByCategory = useMemo(() => {
    const groups: Record<string, DocumentRequirement[]> = {};
    for (const doc of mergedDocs) {
      // Skip identity/postal in checklist - they're tracked differently
      if (doc.category === "identity" || doc.category === "postal") continue;
      if (!groups[doc.category]) groups[doc.category] = [];
      groups[doc.category].push(doc);
    }
    return groups;
  }, [mergedDocs]);
  
  // Calculate compliance stats
  const stats = useMemo(() => {
    const required = mergedDocs.filter(d => d.required);
    const completed = required.filter(d => getDocsForRequirement(d.id, studentDocs).length > 0);
    return {
      requiredCount: required.length,
      completedCount: completed.length,
      pct: required.length > 0 ? Math.round((completed.length / required.length) * 100) : 0,
    };
  }, [mergedDocs, studentDocs]);
  
  // Photos uploaded
  const uploadedPhotos = useMemo(() => 
    studentDocs.filter(d => {
      const title = (d.title || "").toLowerCase();
      return title.includes("photo") || title.includes("foto") || title.startsWith("visa photo");
    }),
    [studentDocs]
  );
  
  // ============ EMPTY STATE ============
  if (countries.length === 0) {
    return (
      <div className="p-6 animate-in fade-in">
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-8 text-center">
          <Globe size={48} className="text-amber-500 mx-auto mb-4"/>
          <h3 className="text-lg font-black text-amber-900 mb-2">Set Target Country First</h3>
          <p className="text-sm text-amber-700 max-w-md mx-auto leading-relaxed">
            To see country-specific visa requirements, photo specs, and downloadable forms, set the student's <strong>Preferred Study Destination</strong> in the Profile Settings tab.
          </p>
          <p className="text-xs text-amber-600 italic mt-3">
            Once a country is selected, this tab will show all required documents, photo specifications, and compliance items specific to that country.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6 space-y-6 animate-in fade-in bg-slate-50/30">
      
      {/* HEADER + COMPLIANCE SCORE */}
      <div className="bg-gradient-to-r from-[#1b1b42] to-[#282860] text-white rounded-2xl p-6 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#BAD133] rounded-full blur-[80px] opacity-10 pointer-events-none"/>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#BAD133] mb-1">Visa Compliance Dashboard</p>
              <h2 className="text-xl font-black flex items-center gap-2">
                Applying to: {countries.map(c => (
                  <span key={c.code} className="inline-flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg text-sm">
                    {c.flag} {c.name}
                  </span>
                ))}
              </h2>
              {isStudentUnder18(student) && (
                <p className="text-xs text-pink-300 mt-2 flex items-center gap-1.5">
                  <Sparkles size={12}/> Under-18 documentation requirements included
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-4xl font-black text-[#BAD133]">{stats.pct}<span className="text-lg text-white/60">%</span></p>
              <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Compliance</p>
              <p className="text-[10px] text-white/60 mt-1">{stats.completedCount} of {stats.requiredCount} required</p>
            </div>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#BAD133] to-emerald-400 rounded-full transition-all duration-700"
              style={{width: `${stats.pct}%`}}
            />
          </div>
        </div>
      </div>
      
      {/* SPECIAL NOTES */}
      {countries.some(c => c.specialNotes && c.specialNotes.length > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-xs font-black text-amber-900 uppercase tracking-widest mb-2 flex items-center gap-2">
            <AlertCircle size={14}/> Country-Specific Notes
          </p>
          <ul className="space-y-1.5">
            {countries.flatMap(c => 
              (c.specialNotes || []).map((note, i) => (
                <li key={`${c.code}-${i}`} className="text-[11px] text-amber-800 flex items-start gap-2">
                  <span className="text-amber-500 shrink-0">{c.flag}</span>
                  <span>{note}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
      
      {/* PHOTO UPLOAD CARD */}
      <PhotoUploadCard
        countries={countries}
        uploadedPhotos={uploadedPhotos}
        hardCopyTracker={hardCopyTracker}
        onUploadPhoto={async (file, countryCode) => {
          await onUploadDocument(file, `visa_photo_${countryCode}`, countryCode);
        }}
        onDeletePhoto={async (filename) => {
          const doc = studentDocs.find(d => d.filename === filename);
          await onDeleteDocument(filename, doc?.title || filename);
        }}
        onViewPhoto={onViewDocument}
        onUpdateHardCopyCount={onUpdateHardCopyCount}
        isUploading={isUploadingDoc}
      />
      
      {/* DOCUMENT CHECKLIST BY CATEGORY */}
      {Object.entries(docsByCategory).map(([category, docs]) => {
        const meta = CATEGORY_META[category] || {label: category, icon: "FileText", color: "slate"};
        const categoryCompleted = docs.filter(d => getDocsForRequirement(d.id, studentDocs).length > 0).length;
        
        return (
          <div key={category} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            
            {/* Category header */}
            <div className={`px-5 py-3 border-b border-slate-100 bg-${meta.color}-50 flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg bg-${meta.color}-100 flex items-center justify-center`}>
                  <FileText size={16} className={`text-${meta.color}-600`}/>
                </div>
                <div>
                  <p className="text-xs font-black text-[#282860] uppercase tracking-widest">{meta.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{categoryCompleted} of {docs.length} items</p>
                </div>
              </div>
              <div className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                categoryCompleted === docs.length ? 'bg-emerald-100 text-emerald-700'
                : categoryCompleted > 0 ? 'bg-amber-100 text-amber-700'
                : 'bg-slate-100 text-slate-500'
              }`}>
                {categoryCompleted}/{docs.length}
              </div>
            </div>
            
            {/* Document rows */}
            <div className="divide-y divide-slate-100">
              {docs.map(doc => {
                const matchedDocs = getDocsForRequirement(doc.id, studentDocs);
                const isDone = matchedDocs.length > 0;
                
                return (
                  <div key={doc.id} className={`p-4 transition-colors ${isDone ? 'bg-emerald-50/30' : 'bg-white hover:bg-slate-50'}`}>
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 mt-0.5">
                        {isDone 
                          ? <CheckCircle2 size={18} className="text-emerald-500"/>
                          : doc.required 
                            ? <AlertCircle size={18} className="text-amber-400"/>
                            : <div className="w-[18px] h-[18px] rounded-full border-2 border-slate-300"/>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold text-[#282860]">{doc.name}</p>
                              {!doc.required && <span className="text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Optional</span>}
                              {doc.needsTranslation === "sworn" && (
                                <span className="text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <Languages size={9}/> Sworn translation
                                </span>
                              )}
                              {doc.needsTranslation === "agent-certified" && (
                                <span className="text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <Languages size={9}/> Agent-certified
                                </span>
                              )}
                              {doc.needsTranslation === "non-bilingual-only" && (
                                <span className="text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                                  Translate if non-bilingual
                                </span>
                              )}
                              {doc.needsApostille && (
                                <span className="text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <Stamp size={9}/> Apostille
                                </span>
                              )}
                              {doc.conditionalOn === "under18" && (
                                <span className="text-[9px] font-black uppercase tracking-wider bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded">Under-18</span>
                              )}
                              {doc.conditionalOn === "postgrad" && (
                                <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">Postgrad</span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{doc.description}</p>
                            {doc.notes && (
                              <p className="text-[10px] text-amber-600 italic mt-1 flex items-start gap-1">
                                <AlertCircle size={9} className="mt-0.5 shrink-0"/>{doc.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="flex items-center gap-2 mt-2">
                          {doc.hasDownloadableForm && doc.formId && (
                            <button
                              type="button"
                              onClick={() => onDownloadTemplate(doc.formId!)}
                              className="text-[11px] font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 border border-violet-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                            >
                              <Download size={11}/> Download Blank Form
                            </button>
                          )}
                          <label className={`text-[11px] font-bold text-white bg-[#282860] hover:bg-[#1b1b42] px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${isUploadingDoc ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <Plus size={11}/>
                            {matchedDocs.length > 0 ? "Add Another" : "Upload"}
                            <input
                              type="file"
                              multiple={doc.multipleFiles}
                              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.heic,.heif,.doc,.docx,.xls,.xlsx,.txt,.csv"
                              className="hidden"
                              disabled={isUploadingDoc}
                              onChange={async (e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                  for (let i = 0; i < e.target.files.length; i++) {
                                    await onUploadDocument(e.target.files[i], doc.id);
                                  }
                                  e.target.value = "";
                                }
                              }}
                            />
                          </label>
                        </div>
                        
                        {/* Existing uploaded files */}
                        {matchedDocs.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                            {matchedDocs.map((d, i) => {
                              const isLoadingThis = loadingDocFilename === d.filename;
                              const isDeletingThis = deletingDocFilename === d.filename;
                              return (
                                <div key={`${d.filename}-${i}`} className="flex items-center justify-between bg-emerald-50/50 border border-emerald-100 rounded-lg px-3 py-1.5">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <CheckCircle2 size={11} className="text-emerald-500 shrink-0"/>
                                    <span className="text-[11px] font-semibold text-slate-700 truncate">{d.title || d.filename}</span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => onViewDocument(d.filename)}
                                      disabled={isLoadingThis || isDeletingThis}
                                      className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                                      title="View"
                                    >
                                      {isLoadingThis ? <Loader2 size={10} className="animate-spin"/> : <Eye size={10}/>}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onDeleteDocument(d.filename, d.title || d.filename)}
                                      disabled={isLoadingThis || isDeletingThis}
                                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                      title="Delete"
                                    >
                                      {isDeletingThis ? <Loader2 size={10} className="animate-spin"/> : <Trash2 size={10}/>}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      
      {/* FOOTER REMINDER */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <ShieldCheck size={20} className="text-blue-600 shrink-0 mt-0.5"/>
        <div>
          <p className="text-xs font-black text-blue-900">Visa Compliance Checklist Updated</p>
          <p className="text-[11px] text-blue-700 mt-1 leading-relaxed">
            This checklist updates automatically based on the student's target country/countries. If the student adds another destination in Profile Settings, new requirements will appear here. All uploaded documents are stored in the same vault as the Application Vault tab — both views stay in sync.
          </p>
        </div>
      </div>
    </div>
  );
}