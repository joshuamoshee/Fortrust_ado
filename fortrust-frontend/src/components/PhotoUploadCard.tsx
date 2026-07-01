// fortrust-frontend/src/components/PhotoUploadCard.tsx
// Country-aware photo upload with visual specs reference.
// Shows the exact dimensions, background, head height required for the
// target country before the agent uploads. Also tracks hard copy quantities.

"use client";

import { useState } from "react";
import { Camera, UploadCloud, CheckCircle2, AlertCircle, Loader2, Trash2, Eye, X, Info, Printer } from "lucide-react";
import type { PhotoSpec, CountryRequirements } from "@/lib/countryRequirements";

interface Props {
  countries: CountryRequirements[];
  uploadedPhotos: Array<{filename: string, title: string, uploaded_by?: string, uploaded_at?: string, country_code?: string}>;
  hardCopyTracker: Record<string, number>; // {usa: 4, cn: 2} - how many hard copies already prepped
  onUploadPhoto: (file: File, countryCode: string) => Promise<void>;
  onDeletePhoto: (filename: string) => Promise<void>;
  onViewPhoto: (filename: string) => Promise<void>;
  onUpdateHardCopyCount: (countryCode: string, count: number) => void;
  isUploading: boolean;
}

export default function PhotoUploadCard({
  countries,
  uploadedPhotos,
  hardCopyTracker,
  onUploadPhoto,
  onDeletePhoto,
  onViewPhoto,
  onUpdateHardCopyCount,
  isUploading,
}: Props) {
  const [activeCountryCode, setActiveCountryCode] = useState<string>(countries[0]?.code || "");
  const [showSpecsModal, setShowSpecsModal] = useState(false);
  
  const activeCountry = countries.find(c => c.code === activeCountryCode);
  if (!activeCountry) return null;
  
  const photosForCountry = uploadedPhotos.filter(p => 
    p.country_code === activeCountryCode || 
    p.title?.toLowerCase().includes(`photo`) && p.title?.toLowerCase().includes(activeCountry.code)
  );
  
  const renderSpec = (spec: PhotoSpec) => {
    return (
      <div className="grid grid-cols-2 gap-3 text-xs">
        <SpecRow label="Dimensions" value={spec.dimensions} highlight/>
        <SpecRow label="Background" value={spec.background}/>
        <SpecRow label="Head Height" value={spec.headHeight}/>
        <SpecRow label="Glasses" value={
          spec.glassesAllowed === "no" ? "❌ Not allowed"
          : spec.glassesAllowed === "no-reflection" ? "⚠️ Allowed (no reflection)"
          : "✓ Allowed"
        }/>
        {spec.earsVisible && <SpecRow label="Ears" value="✓ Must be visible"/>}
        {spec.noWhiteShirt && <SpecRow label="Clothing" value="❌ No white shirt"/>}
        <SpecRow label="Format" value={spec.digitalFormats.join(", ").toUpperCase()}/>
        <SpecRow label="Hard Copies" value={spec.hardCopiesRequired > 0 ? `${spec.hardCopiesRequired} required` : "Not required"}/>
      </div>
    );
  };
  
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-violet-50 to-purple-50 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
            <Camera size={20} className="text-violet-600"/>
          </div>
          <div>
            <h3 className="text-sm font-black text-[#282860]">Visa Photo Upload</h3>
            <p className="text-[11px] text-slate-500">Country-specific photo specs — read before shooting</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowSpecsModal(true)}
          className="text-xs font-bold text-violet-600 hover:bg-violet-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
        >
          <Info size={12}/> Full Specs
        </button>
      </div>
      
      {/* Country tabs if multiple countries */}
      {countries.length > 1 && (
        <div className="px-5 pt-3 pb-2 border-b border-slate-100 flex gap-1 overflow-x-auto">
          {countries.map(c => (
            <button
              key={c.code}
              type="button"
              onClick={() => setActiveCountryCode(c.code)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeCountryCode === c.code
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {c.flag} {c.name}
            </button>
          ))}
        </div>
      )}
      
      {/* Specs panel */}
      <div className="p-5 space-y-4">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">{activeCountry.flag}</span>
            <p className="text-xs font-black text-[#282860] uppercase tracking-widest">
              {activeCountry.name} Photo Requirements
            </p>
          </div>
          {renderSpec(activeCountry.photo)}
          {activeCountry.photo.notes && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <p className="text-[10px] text-slate-600 italic flex items-start gap-1.5">
                <Info size={10} className="text-slate-400 mt-0.5 shrink-0"/>
                {activeCountry.photo.notes}
              </p>
            </div>
          )}
        </div>
        
        {/* Hard copy tracker — only if required */}
        {activeCountry.photo.hardCopiesRequired > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Printer size={18} className="text-amber-600 shrink-0"/>
              <div className="flex-1">
                <p className="text-xs font-black text-amber-900">Hard Copy Print Tracking</p>
                <p className="text-[10px] text-amber-700 mt-0.5">
                  {activeCountry.code === "usa" ? "USA" : activeCountry.name} requires <strong>{activeCountry.photo.hardCopiesRequired} physical printed photos</strong>. Track how many you've printed:
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateHardCopyCount(activeCountryCode, Math.max(0, (hardCopyTracker[activeCountryCode] || 0) - 1))}
                  className="w-7 h-7 rounded-lg bg-white border border-amber-300 text-amber-700 font-black hover:bg-amber-100 transition-colors"
                >−</button>
                <span className={`min-w-[60px] text-center text-sm font-black px-3 py-1.5 rounded-lg border-2 ${
                  (hardCopyTracker[activeCountryCode] || 0) >= activeCountry.photo.hardCopiesRequired
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                    : 'bg-white border-amber-300 text-amber-700'
                }`}>
                  {hardCopyTracker[activeCountryCode] || 0} / {activeCountry.photo.hardCopiesRequired}
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateHardCopyCount(activeCountryCode, (hardCopyTracker[activeCountryCode] || 0) + 1)}
                  className="w-7 h-7 rounded-lg bg-white border border-amber-300 text-amber-700 font-black hover:bg-amber-100 transition-colors"
                >+</button>
              </div>
            </div>
          </div>
        )}
        
        {/* Visual reference box (simulated photo) */}
        <div className="flex items-center gap-4">
          <div 
            className="relative bg-white border-2 border-slate-300 rounded-lg shrink-0 flex flex-col items-center justify-center"
            style={{
              width: parseInt(activeCountry.photo.dimensions.split('x')[0].trim()) * 2 + 'px',
              height: parseInt(activeCountry.photo.dimensions.split('x')[1].split('mm')[0].trim()) * 2 + 'px',
              minWidth: '80px',
              minHeight: '100px',
            }}
            title={`Visual reference at 2x scale: ${activeCountry.photo.dimensions}`}
          >
            <div className="w-1/2 h-1/3 rounded-full bg-slate-200 mb-1"/>
            <div className="w-3/4 h-1/4 rounded-t-full bg-slate-200"/>
            <div className="absolute -top-2 -right-2 bg-violet-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded">
              {activeCountry.photo.dimensions}
            </div>
          </div>
          <div className="flex-1 text-[11px] text-slate-500 leading-relaxed">
            <p className="font-bold text-slate-700 mb-1">Visual reference (2× scale)</p>
            <p>The portrait should fill the frame from mid-chest to slightly above the head. Head height per spec: <strong className="text-violet-700">{activeCountry.photo.headHeight}</strong>.</p>
          </div>
        </div>
        
        {/* Upload button */}
        <label className={`block bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white px-5 py-3.5 rounded-xl text-sm font-bold shadow-md cursor-pointer transition-all active:scale-95 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <div className="flex items-center justify-center gap-2">
            {isUploading ? <Loader2 size={16} className="animate-spin"/> : <UploadCloud size={16}/>}
            {isUploading ? "Uploading..." : `Upload Photo for ${activeCountry.name}`}
          </div>
          <input
            type="file"
            accept={activeCountry.photo.digitalFormats.join(",")}
            className="hidden"
            disabled={isUploading}
            onChange={async (e) => {
              if (e.target.files && e.target.files[0]) {
                await onUploadPhoto(e.target.files[0], activeCountryCode);
                e.target.value = "";
              }
            }}
          />
        </label>
        <p className="text-[10px] text-slate-400 text-center">
          Accepts: {activeCountry.photo.digitalFormats.join(", ")} only · Max 10MB
        </p>
        
        {/* Uploaded photos list */}
        {photosForCountry.length > 0 && (
          <div className="border-t border-slate-100 pt-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Uploaded photos for {activeCountry.name} ({photosForCountry.length})
            </p>
            <div className="space-y-2">
              {photosForCountry.map((p, i) => (
                <div key={`${p.filename}-${i}`} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0"/>
                    <span className="text-xs font-semibold text-slate-700 truncate">{p.title || p.filename}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onViewPhoto(p.filename)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View photo"
                    >
                      <Eye size={12}/>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeletePhoto(p.filename)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete photo"
                    >
                      <Trash2 size={12}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Full specs modal */}
      {showSpecsModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white flex items-center justify-between">
              <h3 className="text-lg font-black flex items-center gap-2">
                <Camera size={18}/> All Country Photo Specs
              </h3>
              <button onClick={() => setShowSpecsModal(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={18}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
              {countries.map(c => (
                <div key={c.code} className="bg-white border border-slate-200 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                    <span className="text-2xl">{c.flag}</span>
                    <p className="text-sm font-black text-[#282860]">{c.name}</p>
                  </div>
                  {renderSpec(c.photo)}
                  {c.photo.notes && (
                    <p className="text-[10px] text-slate-500 italic mt-2 pt-2 border-t border-slate-100">{c.photo.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SpecRow({label, value, highlight = false}: {label: string, value: string, highlight?: boolean}) {
  return (
    <div className="flex justify-between items-center bg-white border border-slate-100 rounded-lg px-3 py-2">
      <span className="text-slate-500 font-medium">{label}</span>
      <span className={`font-bold ${highlight ? 'text-violet-700' : 'text-slate-800'}`}>{value}</span>
    </div>
  );
}