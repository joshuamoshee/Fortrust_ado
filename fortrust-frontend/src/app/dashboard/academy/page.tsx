"use client";

import { useState, useEffect } from "react";
import { PlayCircle, CheckCircle2, Award, ShieldAlert, X, Loader2, Video, TrendingUp, BookOpen, GraduationCap, Lock, Unlock } from "lucide-react";

// Advanced Course Structure
const COURSES = [
  { 
    id: "c1", 
    title: "Dulut College Masterclass", 
    institution: "Dulut", 
    totalModules: 2,
    rewardPoints: 10,
    certificationName: "Dulut Certified Counselor",
    modules: [
      { id: "m1", title: "Understanding Dulut Programmes", duration: "4:00", videoUrl: "https://www.youtube.com/embed/KbWL7Gd8kX0?si=1aqHNuuqmx_cY7Rx" },
      { id: "m2", title: "Dulut Application Process", duration: "8:15", videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4" }
    ]
  },
  { 
    id: "c2", 
    title: "Bloom University Elite Partner", 
    institution: "Bloom", 
    totalModules: 1,
    rewardPoints: 5,
    certificationName: "Bloom Specialist",
    modules: [
      { id: "m3", title: "Bloom Admission Updates Q3", duration: "13:30", videoUrl: "https://www.youtube.com/embed/aXRkgnn2Q5U?si=u_eHV8FnKPjEjDbu" }
    ]
  }
];

export default function FortrustAcademyLMS() {
  const [user, setUser] = useState<any>(null);
  const [completedModules, setCompletedModules] = useState<string[]>([]);
  const [earnedCerts, setEarnedCerts] = useState<string[]>([]);
  
  const [activeCourse, setActiveCourse] = useState<any>(null);
  const [activeVideo, setActiveVideo] = useState<any>(null);
  const [videoFinished, setVideoFinished] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [notification, setNotification] = useState<{type: 'success'|'error', text: string} | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("fortrust_user");
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      // Load progress from local storage for now (should move to DB later)
      const progress = localStorage.getItem(`academy_progress_${parsed.id}`);
      if (progress) {
        const p = JSON.parse(progress);
        setCompletedModules(p.completedModules || []);
        setEarnedCerts(p.earnedCerts || []);
      }
    }
  }, []);

  // Save progress locally whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem(`academy_progress_${user.id}`, JSON.stringify({ completedModules, earnedCerts }));
    }
  }, [completedModules, earnedCerts, user]);

  const handleVideoEnd = () => {
    setVideoFinished(true);
  };

  const claimModuleProgress = async () => {
    if (!user || !activeCourse || !activeVideo) return;
    setIsClaiming(true);
    
    try {
      // 1. Mark Module as Complete
      const newCompleted = [...completedModules, activeVideo.id];
      setCompletedModules(newCompleted);

      // 2. Check if Course is Fully Completed
      const courseModuleIds = activeCourse.modules.map((m: any) => m.id);
      const isCourseDone = courseModuleIds.every((id: string) => newCompleted.includes(id));

      if (isCourseDone && !earnedCerts.includes(activeCourse.certificationName)) {
        // AWard Certificate and Points via API
        const token = localStorage.getItem("fortrust_token");
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${user.id}/award-training-point`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (res.ok) {
           const data = await res.json();
           const updatedUser = { ...user, training_points: data.new_total };
           setUser(updatedUser);
           localStorage.setItem("fortrust_user", JSON.stringify(updatedUser));
           
           setEarnedCerts([...earnedCerts, activeCourse.certificationName]);
           setNotification({type: 'success', text: `🏆 CERTIFICATION UNLOCKED: ${activeCourse.certificationName}!`});
        }
      } else {
        setNotification({type: 'success', text: "Module Completed! Progress Saved."});
      }
      
      setTimeout(() => {
        setActiveVideo(null);
        setVideoFinished(false);
      }, 2000);

    } catch (error) {
      setNotification({type: 'error', text: "Failed to save progress."});
    } finally {
      setIsClaiming(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  if (!user) return null;

  return (
    <div className="p-4 lg:p-8 max-w-[1400px] mx-auto w-full animate-in fade-in">
      
      {/* NOTIFICATION TOAST */}
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

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
        <div>
          <h1 className="text-3xl font-black text-[#282860] flex items-center gap-3">
            <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
              <GraduationCap className="text-[#BAD133]" size={28} />
            </div>
            Fortrust Academy
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Complete institutional courses to earn official certifications and KPI points.
          </p>
        </div>

        <div className="flex gap-4">
          <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center"><Award className="text-orange-500" size={20}/></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Certifications</p>
              <p className="text-2xl font-black text-[#282860] leading-none">{earnedCerts.length}</p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-[#282860] to-[#1b1b42] px-6 py-3 rounded-2xl shadow-lg border border-[#3a3a7a] flex items-center gap-4 text-white">
            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center"><TrendingUp className="text-[#BAD133]" size={20}/></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#BAD133] mb-0.5">KPI Score</p>
              <p className="text-2xl font-black leading-none">{user.training_points || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* CERTIFICATIONS WALL */}
      {earnedCerts.length > 0 && (
        <div className="mb-10 animate-in fade-in slide-in-from-bottom-4">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Award size={16}/> Your Earned Certifications</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
            {earnedCerts.map((cert, i) => (
              <div key={i} className="bg-gradient-to-r from-amber-100 to-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm min-w-[250px] shrink-0">
                 <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-amber-100 text-amber-500"><Award size={24}/></div>
                 <div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">Official Partner</p>
                   <p className="font-black text-slate-800 leading-tight">{cert}</p>
                 </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COURSE DIRECTORY */}
      <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><BookOpen size={16}/> Course Directory</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {COURSES.map(course => {
          const completedInCourse = course.modules.filter(m => completedModules.includes(m.id)).length;
          const isFullyComplete = completedInCourse === course.totalModules;
          const progressPct = (completedInCourse / course.totalModules) * 100;

          return (
            <div key={course.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
              <div className="p-6 border-b border-slate-100 bg-[#f8fafc] relative overflow-hidden">
                {isFullyComplete && <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 rounded-full blur-[50px] opacity-20 pointer-events-none"></div>}
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <span className="bg-white border border-slate-200 text-[#282860] text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg shadow-sm">{course.institution}</span>
                  {isFullyComplete ? (
                    <span className="bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg flex items-center gap-1"><CheckCircle2 size={12}/> Certified</span>
                  ) : (
                    <span className="bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg flex items-center gap-1"><Lock size={12}/> Locked</span>
                  )}
                </div>
                <h3 className="font-black text-[#282860] text-xl leading-tight mb-2 relative z-10">{course.title}</h3>
                
                {/* Progress Bar */}
                <div className="mt-4 relative z-10">
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Course Progress</span>
                    <span className="text-xs font-bold text-slate-600">{completedInCourse} / {course.totalModules}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div className={`h-2 rounded-full transition-all duration-1000 ${isFullyComplete ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progressPct}%` }}></div>
                  </div>
                </div>
              </div>
              
              <div className="p-4 flex-1 bg-white">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-2">Modules</p>
                <div className="space-y-2">
                  {course.modules.map((module, idx) => {
                    const isModComplete = completedModules.includes(module.id);
                    // A module is unlocked if it's the first one, or the previous one is completed
                    const isUnlocked = idx === 0 || completedModules.includes(course.modules[idx-1].id);

                    return (
                      <div key={module.id} className={`p-3 rounded-xl border flex items-center justify-between transition-colors
                        ${isModComplete ? 'bg-emerald-50 border-emerald-100' : isUnlocked ? 'bg-white border-slate-200 hover:border-blue-300 shadow-sm cursor-pointer' : 'bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed'}
                      `}
                      onClick={() => {
                        if (isUnlocked && !isModComplete) {
                          setActiveCourse(course);
                          setActiveVideo(module);
                          setVideoFinished(false);
                        }
                      }}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0
                            ${isModComplete ? 'bg-emerald-100 text-emerald-600' : isUnlocked ? 'bg-blue-50 text-blue-600' : 'bg-slate-200 text-slate-400'}
                          `}>
                            {isModComplete ? <CheckCircle2 size={16}/> : isUnlocked ? <PlayCircle size={16}/> : <Lock size={16}/>}
                          </div>
                          <div>
                            <p className={`text-sm font-bold ${isModComplete ? 'text-emerald-900' : isUnlocked ? 'text-[#282860]' : 'text-slate-500'}`}>{module.title}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{module.duration}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* VIDEO PLAYER MODAL */}
      {activeVideo && activeCourse && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-5xl bg-black rounded-3xl overflow-hidden shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => { setActiveVideo(null); setVideoFinished(false); }} className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/30 text-white p-2 rounded-full transition-colors">
              <X size={24} />
            </button>
            
            {activeVideo.videoUrl.includes("youtube.com") ? (
              <div className="relative pt-[56.25%] w-full bg-black">
                <iframe 
                  className="absolute top-0 left-0 w-full h-full"
                  src={`${activeVideo.videoUrl}&autoplay=1`}
                  title="YouTube video player" 
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                  allowFullScreen
                ></iframe>
                {/* Simulated completion overlay since YouTube iframes don't reliably fire onEnded cross-origin */}
                <div className="absolute bottom-4 right-4 z-10">
                  <button 
                    onClick={handleVideoEnd}
                    className="bg-white/10 hover:bg-white/30 backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border border-white/20 flex items-center gap-1"
                  >
                    <CheckCircle2 size={14}/> I have finished watching
                  </button>
                </div>
              </div>
            ) : (
              <video 
                src={activeVideo.videoUrl} 
                controls 
                autoPlay 
                onEnded={handleVideoEnd}
                className="w-full h-auto max-h-[70vh]"
              />
            )}

            {/* MODAL FOOTER */}
            <div className="bg-white p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 border-t-4 border-[#BAD133]">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Course: {activeCourse.title}</span>
                <h2 className="text-2xl font-black text-[#282860]">{activeVideo.title}</h2>
              </div>
              
              {videoFinished ? (
                <button 
                  onClick={claimModuleProgress}
                  disabled={isClaiming}
                  className="bg-[#282860] hover:bg-[#1b1b42] text-white px-8 py-4 rounded-xl font-black transition-transform active:scale-95 shadow-lg flex items-center gap-2 w-full md:w-auto justify-center"
                >
                  {isClaiming ? <><Loader2 size={20} className="animate-spin"/> Saving...</> : <><Unlock size={20} className="text-[#BAD133]"/> Log Progress & Continue</>}
                </button>
              ) : (
                <div className="bg-slate-50 text-slate-400 px-6 py-4 rounded-xl font-bold text-sm flex items-center gap-2 w-full md:w-auto justify-center border border-slate-100">
                  <PlayCircle size={18}/> Watch video to unlock next step
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}