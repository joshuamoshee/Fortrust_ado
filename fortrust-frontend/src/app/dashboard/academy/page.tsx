"use client";

import { useState, useEffect } from "react";
import { PlayCircle, CheckCircle2, Award, ShieldAlert, X, Loader2, Video, TrendingUp } from "lucide-react";

// Mock Data for Training Modules - Later this can be fetched from the DB
// Mock Data for Training Modules
const TRAINING_MODULES = [
  { 
    id: 1, 
    title: "Understanding Dulut College Programmes", 
    institution: "Dulut", 
    duration: "4:00", 
    // Converting the standard watch link to the embed link format required by iframes
    videoUrl: "https://www.youtube.com/embed/KbWL7Gd8kX0?si=1aqHNuuqmx_cY7Rx" 
  },
  { 
    id: 2, 
    title: "Bloom University: Admission Updates", 
    institution: "Bloom", 
    duration: "13:30", 
    // Converting the standard watch link to the embed link format required by iframes
    videoUrl: "https://www.youtube.com/embed/aXRkgnn2Q5U?si=u_eHV8FnKPjEjDbu" 
  },
  { 
    id: 3, 
    title: "Fortrust OS: System Navigation Basics", 
    institution: "Internal", 
    duration: "2:45", 
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4" // Placeholder for an internal video
  }
];

export default function FortrustAcademy() {
  const [user, setUser] = useState<any>(null);
  const [activeVideo, setActiveVideo] = useState<any>(null);
  const [videoFinished, setVideoFinished] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [notification, setNotification] = useState<{type: 'success'|'error', text: string} | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("fortrust_user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const handleVideoEnd = () => {
    setVideoFinished(true);
  };

  const claimKpiPoint = async () => {
    if (!user) return;
    setIsClaiming(true);
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${user.id}/award-training-point`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      const data = await res.json();
      if (res.ok) {
        setNotification({type: 'success', text: `+1 KPI Point! Total: ${data.new_total} Points`});
        // Update local user state
        const updatedUser = { ...user, training_points: data.new_total };
        setUser(updatedUser);
        localStorage.setItem("fortrust_user", JSON.stringify(updatedUser));
        
        setTimeout(() => {
          setActiveVideo(null);
          setVideoFinished(false);
        }, 2000);
      } else {
        setNotification({type: 'error', text: "Failed to claim point."});
      }
    } catch (error) {
      setNotification({type: 'error', text: "Network error."});
    } finally {
      setIsClaiming(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  if (!user) return null;

  return (
    <div className="p-4 lg:p-8 max-w-[1200px] mx-auto w-full animate-in fade-in">
      
      {notification && (
        <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-2xl font-bold flex items-center justify-between shadow-2xl animate-in slide-in-from-top-4
          ${notification.type === 'success' ? 'bg-[#282860] text-white border border-[#3a3a7a]' : 'bg-red-500 text-white border border-red-600'}`}>
          <div className="flex items-center gap-3">
            {notification.type === 'success' ? <Award className="text-[#BAD133]" size={20}/> : <ShieldAlert size={20}/>}
            {notification.text}
          </div>
          <button onClick={() => setNotification(null)} className="ml-6 opacity-70 hover:opacity-100 transition-opacity"><X size={18} /></button>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#282860] flex items-center gap-3">
            <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
              <PlayCircle className="text-[#BAD133]" size={28} />
            </div>
            Fortrust Academy
          </h1>
          <p className="text-slate-500 mt-2 font-medium text-sm">
            Watch institution updates to earn KPI points and boost your agent ranking.
          </p>
        </div>

        <div className="bg-gradient-to-br from-[#282860] to-[#1b1b42] px-6 py-3 rounded-2xl shadow-lg border border-[#3a3a7a] flex items-center gap-4 text-white">
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center"><TrendingUp className="text-[#BAD133]" size={20}/></div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#BAD133] mb-0.5">Your Training KPI</p>
            <p className="text-2xl font-black leading-none">{user.training_points || 0} <span className="text-sm font-bold text-white/60">PTS</span></p>
          </div>
        </div>
      </div>

      {/* TRAINING MODULES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {TRAINING_MODULES.map(module => (
          <div key={module.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
            <div className="h-40 bg-slate-100 relative flex items-center justify-center border-b border-slate-200">
              <Video size={48} className="text-slate-300 group-hover:scale-110 transition-transform duration-300" />
              <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur text-white text-[10px] font-black px-2 py-1 rounded-md">{module.duration}</div>
              <div className="absolute top-3 left-3 bg-white/90 backdrop-blur text-[#282860] text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md shadow-sm border border-slate-200/50">{module.institution}</div>
            </div>
            <div className="p-6">
              <h3 className="font-black text-[#282860] text-lg leading-tight mb-4">{module.title}</h3>
              <button 
                onClick={() => { setActiveVideo(module); setVideoFinished(false); }}
                className="w-full bg-slate-50 hover:bg-[#282860] text-[#282860] hover:text-white border border-slate-200 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <PlayCircle size={18} /> Start Module
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* VIDEO PLAYER MODAL */}
      {activeVideo && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-black rounded-3xl overflow-hidden shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => { setActiveVideo(null); setVideoFinished(false); }} className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/30 text-white p-2 rounded-full transition-colors">
              <X size={24} />
            </button>
            
            <video 
              src={activeVideo.videoUrl} 
              controls 
              autoPlay 
              onEnded={handleVideoEnd}
              className="w-full h-auto max-h-[70vh]"
            />

            <div className="bg-white p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#BAD133] mb-1 block">{activeVideo.institution} Training</span>
                <h2 className="text-xl font-black text-[#282860]">{activeVideo.title}</h2>
              </div>
              
              {videoFinished ? (
                <button 
                  onClick={claimKpiPoint}
                  disabled={isClaiming}
                  className="bg-[#BAD133] hover:bg-[#a3b827] text-[#1b1b42] px-8 py-4 rounded-xl font-black transition-transform active:scale-95 shadow-lg flex items-center gap-2 w-full md:w-auto justify-center"
                >
                  {isClaiming ? <><Loader2 size={20} className="animate-spin"/> Claiming...</> : <><Award size={20}/> Claim KPI Point</>}
                </button>
              ) : (
                <div className="bg-slate-100 text-slate-500 px-6 py-4 rounded-xl font-bold text-sm flex items-center gap-2 w-full md:w-auto justify-center border border-slate-200">
                  <PlayCircle size={18}/> Finish video to claim point
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}