"use client";

import React, { FormEvent, useEffect, useState, useRef, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
  LayoutDashboard, ShieldAlert, LogOut, Bell, Settings, Users, BookOpen, 
  Megaphone, X, Lock, CheckCircle, Menu, Building2, DollarSign, Landmark, 
  Phone, ChevronDown, HelpCircle, ChevronRight, ChevronLeft, BrainCircuit, 
  GraduationCap, Globe, BellRing
} from "lucide-react";

// --- TRANSLATION DICTIONARY ---
const translations = {
  EN: {
    agentWorkspace: "Agent Workspace",
    studentPipeline: "Student Pipeline",
    programFinder: "Program Finder",
    adminTools: "Admin Tools",
    mainDashboard: "Main Dashboard",
    agentManagement: "Agent Management",
    globalStudents: "Global Students",
    broadcasts: "Broadcast Hub", // NEW
    consultation: "Consultation",
    profilingTest: "Profiling Test",
    assessment: "Assessment",
    marketing: "Marketing",
    leads: "Leads",
    budgetRoi: "Budget & ROI",
    aiStrategist: "AI Strategist",
    institutionPartners: "Institution Partners",
    agreement: "Agreement",
    contactPerson: "Contact Person",
    commissionStructure: "Commission Structure",
    commissions: "Commissions",
    reports: "Reports",
    roleAccess: "Role & Access",
    platformTutorial: "Platform Tutorial",
    accountSettings: "Account Settings",
    secureSignOut: "Secure Sign Out",
    recentActivity: "Recent Activity"
  },
  ID: {
    agentWorkspace: "Ruang Kerja Agen",
    studentPipeline: "Data Siswa",
    programFinder: "Pencari Program",
    adminTools: "Alat Admin",
    mainDashboard: "Dasbor Utama",
    agentManagement: "Manajemen Agen",
    globalStudents: "Semua Siswa",
    broadcasts: "Pusat Siaran", // NEW
    consultation: "Konsultasi",
    profilingTest: "Tes Profiling",
    assessment: "Penilaian",
    marketing: "Pemasaran",
    leads: "Prospek",
    budgetRoi: "Anggaran & ROI",
    aiStrategist: "Strategi AI",
    institutionPartners: "Mitra Institusi",
    agreement: "Perjanjian",
    contactPerson: "Kontak Personal",
    commissionStructure: "Struktur Komisi",
    commissions: "Komisi",
    reports: "Laporan",
    roleAccess: "Akses & Peran",
    platformTutorial: "Panduan Sistem",
    accountSettings: "Pengaturan Akun",
    secureSignOut: "Keluar Aman",
    recentActivity: "Aktivitas Terbaru"
  }
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // --- UI STATES ---
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  // Tutorial & Settings States
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [settingsTab, setSettingsTab] = useState<"preferences" | "security" | "bank">("preferences");
  
  // Language State
  const [language, setLanguage] = useState<"EN" | "ID">("EN");
  const [languageMessage, setLanguageMessage] = useState<{ type: 'success', text: string } | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [swiftCode, setSwiftCode] = useState("");
  const [isUpdatingBank, setIsUpdatingBank] = useState(false);
  const [bankMessage, setBankMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const profileMenuRef = useRef<HTMLDivElement>(null);
  
  const t = translations[language];

  useEffect(() => {
    const storedUser = localStorage.getItem("fortrust_user");
    const storedLang = localStorage.getItem("fortrust_lang") as "EN" | "ID";
    if (storedLang) setLanguage(storedLang);

    if (!storedUser) {
      router.push("/");
    } else {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setBankName(parsedUser.bank_name || "");
      setBankAccount(parsedUser.bank_account || "");
      setBankBranch(parsedUser.bank_branch || "");
      setSwiftCode(parsedUser.swift_code || "");
      setIsLoaded(true);
    }
  }, [router]);

  useEffect(() => { setIsMobileMenuOpen(false); }, [pathname]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      const token = localStorage.getItem("fortrust_token");
      if (!token) return;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/audit-logs?limit=5`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.status === "success") {
          setNotifications(data.data);
          setUnreadCount(data.data.length > 5 ? 5 : data.data.length);
        }
      } catch (error) {}
    };

    if (isLoaded && user && user.role === "MASTER_ADMIN") {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [isLoaded, user]);

  const handleLogout = () => {
    localStorage.removeItem("fortrust_user");
    localStorage.removeItem("fortrust_token");
    router.push("/");
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value as "EN" | "ID";
    setLanguage(newLang);
    localStorage.setItem("fortrust_lang", newLang);
    setLanguageMessage({ type: 'success', text: newLang === "EN" ? "Language updated successfully." : "Bahasa berhasil diperbarui." });
    setTimeout(() => setLanguageMessage(null), 3000);
  };

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    setIsChangingPassword(true);
    setPasswordMessage(null);
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ password: newPassword })
      });
      if (res.ok) {
        setPasswordMessage({ type: 'success', text: "Password updated successfully!" });
        setNewPassword("");
        setTimeout(() => { setPasswordMessage(null); }, 3000);
      } else {
        setPasswordMessage({ type: 'error', text: "Failed to update password." });
      }
    } catch (err) {
      setPasswordMessage({ type: 'error', text: "Network Error." });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleBankUpdate = async (e: FormEvent) => {
    e.preventDefault();
    setIsUpdatingBank(true);
    setBankMessage(null);
    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ bank_name: bankName, bank_account: bankAccount, bank_branch: bankBranch, swift_code: swiftCode })
      });
      if (res.ok) {
        setBankMessage({ type: 'success', text: "Bank details secured!" });
        const updatedUser = { ...user, bank_name: bankName, bank_account: bankAccount, bank_branch: bankBranch, swift_code: swiftCode };
        setUser(updatedUser);
        localStorage.setItem("fortrust_user", JSON.stringify(updatedUser));
        setTimeout(() => { setBankMessage(null); }, 3000);
      } else {
        setBankMessage({ type: 'error', text: "Failed to save bank details." });
      }
    } catch (err) {
      setBankMessage({ type: 'error', text: "Network Error." });
    } finally {
      setIsUpdatingBank(false);
    }
  };

  const TUTORIAL_STEPS = [
    {
      title: "1. The Agent Workspace",
      icon: <LayoutDashboard size={40} className="text-blue-500" />,
      bg: "bg-blue-50",
      border: "border-blue-100",
      description: "Your primary command center for managing student pipelines from initial contact to successful enrollment.",
      points: [
        "Add new student leads and assign them to specific branches or agents.",
        "Track progress through 6 stages: New Lead ➔ Qualified ➔ Consulting ➔ Application ➔ Visa ➔ Completed.",
        "Color-coded statuses help you instantly identify bottlenecks in the pipeline."
      ]
    },
    {
      title: "2. AI Profiling & Automation",
      icon: <BrainCircuit size={40} className="text-purple-500" />,
      bg: "bg-purple-50",
      border: "border-purple-100",
      description: "Leverage the Gemini AI engine to automate your daily consulting tasks.",
      points: [
        "Upload student PDF Report Cards and Psychology tests for instant AI analysis.",
        "Generate personalized 'Hasil Reports' to match students with the best university programs.",
        "Use the 1-Click AI Email and AI WhatsApp generators to draft tailored follow-up messages based on the student's status."
      ]
    },
    {
      title: "3. University Applications",
      icon: <GraduationCap size={40} className="text-orange-500" />,
      bg: "bg-orange-50",
      border: "border-orange-100",
      description: "Track external application statuses with global institution partners.",
      points: [
        "Log multiple university applications per student within their Case File.",
        "Update live statuses: Pending ➔ Offer Received ➔ Accepted ➔ Rejected.",
        "Upload and store verified proof documents directly in the cloud."
      ]
    },
    {
      title: "4. Commission & Financials",
      icon: <DollarSign size={40} className="text-emerald-500" />,
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      description: "Securely track your earnings and manage your payout details.",
      points: [
        "Update your Bank Details securely in your Account Settings menu.",
        "Moving a student to 'Completed' automatically logs the deal into the financial ledger.",
        "Track your 'Total Commission Generated' and pending payouts live in the Earnings tab."
      ]
    },
    {
      title: "5. Master Admin Security",
      icon: <ShieldAlert size={40} className="text-red-500" />,
      bg: "bg-red-50",
      border: "border-red-100",
      description: "Advanced controls for network managers and system administrators.",
      points: [
        "Super CCTV: Monitor real-time logs of every login, creation, and edit across the network.",
        "Load Balancing: Set Max Capacity limits for agents to prevent burnout and automatically flag overloaded queues.",
        "2-Step Deletion: Safely 'Archive' rogue agents, or permanently delete them if required."
      ]
    }
  ];

  if (!isLoaded || !user) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans antialiased relative overflow-hidden">

      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-[#1b1b42] text-slate-300 flex flex-col h-full shadow-2xl border-r border-[#131333] transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        <div className="h-16 lg:h-24 flex items-center px-6 border-b border-white/5 bg-[#171738] justify-between">
          <div className="bg-white px-4 py-2 lg:py-3 rounded-xl w-full flex items-center justify-center shadow-md">
            <img src="/fortrust-logo.png" alt="Fortrust" className="h-6 lg:h-8 w-auto object-contain" />
          </div>
          <button className="lg:hidden ml-4 text-slate-400 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">

          {user.role !== "MASTER_ADMIN" && (
            <>
              <p className="px-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 mt-2">{t.agentWorkspace}</p>

              <Link href="/dashboard/pipeline" className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${pathname === '/dashboard/pipeline' ? 'bg-white/10 text-white font-semibold shadow-inner ring-1 ring-white/5' : 'font-medium text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                <LayoutDashboard size={18} className={pathname === '/dashboard/pipeline' ? 'text-[#BAD133]' : 'text-slate-500 group-hover:text-white transition-colors'} />
                {t.studentPipeline}
              </Link>

              <Link href="/dashboard/programs" className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${pathname === '/dashboard/programs' ? 'bg-white/10 text-white font-semibold shadow-inner ring-1 ring-white/5' : 'font-medium text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                <BookOpen size={18} className={pathname === '/dashboard/programs' ? 'text-[#BAD133]' : 'text-slate-500 group-hover:text-white transition-colors'} />
                {t.programFinder}
              </Link>
            </>
          )}

          {user.role === "MASTER_ADMIN" && (
            <>
              <p className="px-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 mt-2">{t.adminTools}</p>
              
              <Link href="/dashboard/admin" className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${pathname === '/dashboard/admin' ? 'bg-white/10 text-white font-semibold shadow-inner ring-1 ring-white/5' : 'font-medium text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                <ShieldAlert size={18} className={pathname === '/dashboard/admin' ? 'text-[#BAD133]' : 'text-slate-500 group-hover:text-white transition-colors'} />
                {t.mainDashboard}
              </Link>

              <Link href="/dashboard/agent-pipeline" className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${pathname === '/dashboard/agent-pipeline' ? 'bg-white/10 text-white font-semibold shadow-inner ring-1 ring-white/5' : 'font-medium text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                <Users size={18} className={pathname === '/dashboard/agent-pipeline' ? 'text-[#BAD133]' : 'text-slate-500 group-hover:text-white transition-colors'} />
                {t.agentManagement}
              </Link>

              <Link href="/dashboard/students" className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${pathname === '/dashboard/students' ? 'bg-white/10 text-white font-semibold shadow-inner ring-1 ring-white/5' : 'font-medium text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                <GraduationCap size={18} className={pathname === '/dashboard/students' ? 'text-[#BAD133]' : 'text-slate-500 group-hover:text-white transition-colors'} />
                {t.globalStudents}
              </Link>

              {/* NEW BROADCAST HUB LINK */}
              <Link href="/dashboard/broadcasts" className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${pathname === '/dashboard/broadcasts' ? 'bg-white/10 text-white font-semibold shadow-inner ring-1 ring-white/5' : 'font-medium text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                <BellRing size={18} className={pathname === '/dashboard/broadcasts' ? 'text-[#BAD133]' : 'text-slate-500 group-hover:text-white transition-colors'} />
                {t.broadcasts}
              </Link>

              <SidebarMenu label={t.consultation} icon={<LayoutDashboard size={18} />} activePath={pathname} menuItems={[ { label: t.profilingTest, href: '/dashboard/profiling' }, { label: t.assessment, href: '/dashboard/assessment' }, { label: t.programFinder, href: '/dashboard/programs' } ]} />
              
              <SidebarMenu label={t.marketing} icon={<Megaphone size={18} />} activePath={pathname} menuItems={[ 
                { label: t.leads, href: '/dashboard/marketing' },
                { label: t.budgetRoi, href: '/dashboard/marketing/budget' },
                { label: t.aiStrategist, href: '/dashboard/marketing/strategist' }
              ]} />
              
              <SidebarMenu label={t.institutionPartners} icon={<Building2 size={18} />} activePath={pathname} menuItems={[ { label: t.agreement, href: '/dashboard/network' }, { label: t.contactPerson, href: '/dashboard/contact-person' }, { label: t.commissionStructure, href: '/dashboard/commission-structure' } ]} />
              <SidebarMenu label={t.commissions} icon={<DollarSign size={18} />} activePath={pathname} menuItems={[ { label: t.reports, href: '/dashboard/claimed' } ]} />
            </>
          )}

        </div>
      </aside>

      <div className="flex-1 flex flex-col lg:ml-[260px] min-w-0 w-full transition-all duration-300">

        <header className="h-16 lg:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 shadow-sm gap-4">

          <div className="flex items-center flex-1 gap-4">
            <button className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>
          </div>

          <div className="flex items-center gap-3 lg:gap-5 flex-shrink-0">

            <div className="relative">
              <button onClick={() => { setShowNotifications(!showNotifications); setShowProfileMenu(false); setUnreadCount(0); }} className={`p-2 lg:p-2.5 rounded-full transition-colors relative ${showNotifications ? 'bg-slate-100 text-[#282860]' : 'text-slate-400 hover:text-[#282860] hover:bg-slate-100'}`}>
                <Bell size={20} />
                {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 lg:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-4 z-50">
                  <div className="p-4 border-b border-slate-100 bg-[#f8fafc] flex justify-between items-center">
                    <h3 className="font-bold text-[#282860]">{t.recentActivity}</h3>
                    {unreadCount > 0 && <span className="text-[10px] font-bold text-white bg-red-500 px-2 py-0.5 rounded-full">{unreadCount} New</span>}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-center text-sm text-slate-500 py-6">No recent activity.</p>
                    ) : (
                      notifications.map((note) => (
                        <div key={note.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors flex gap-3">
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${note.action === 'CREATE' ? 'bg-green-500' : note.action === 'DELETE' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                          <div>
                            <p className="text-sm font-bold text-slate-700">
                              {note.changed_by} <span className="font-medium text-slate-500">{note.action.toLowerCase()}d</span> {note.entity}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">{new Date(note.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

            <div className="relative" ref={profileMenuRef}>
              <button 
                onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotifications(false); }}
                className="flex items-center gap-3 p-1 pr-3 rounded-full border border-slate-200 hover:bg-slate-50 transition-all focus:ring-2 focus:ring-[#BAD133]/20 outline-none"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#BAD133] to-[#9bb029] flex items-center justify-center text-[#1b1b42] font-black text-sm shadow-sm">
                  {user.name.charAt(0)}
                </div>
                <span className="text-sm font-bold text-slate-700 hidden sm:block">{user.name.split(" ")[0]}</span>
                <ChevronDown size={14} className="text-slate-400 hidden sm:block"/>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-3 w-72 bg-white rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="p-5 border-b border-slate-100 bg-[#f8fafc]">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#282860] flex items-center justify-center text-white font-black text-xl shadow-inner">
                        {user.name.charAt(0)}
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-bold text-[#282860] text-base truncate">{user.name}</p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{user.email || "Agent Account"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-2">
                    <div className="px-4 py-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t.roleAccess}</p>
                      <p className="text-sm font-bold text-slate-700 mt-0.5">{user.role} • {user.branch}</p>
                    </div>
                  </div>
                  
                  <div className="p-2 border-t border-slate-100 space-y-1">
                    <button onClick={() => { setShowTutorial(true); setTutorialStep(0); setShowProfileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-[#282860] hover:bg-slate-50 rounded-xl transition-colors">
                      <HelpCircle size={18} className="text-[#BAD133]" /> {t.platformTutorial}
                    </button>
                    <button onClick={() => { setShowSettings(true); setShowProfileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 hover:text-[#282860] hover:bg-slate-50 rounded-xl transition-colors">
                      <Settings size={18} className="text-slate-400" /> {t.accountSettings}
                    </button>
                  </div>

                  <div className="p-2 border-t border-slate-100 bg-slate-50/50">
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                      <LogOut size={18} className="text-red-400" /> {t.secureSignOut}
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        <main className="flex-1 w-full max-w-[1600px] mx-auto overflow-x-hidden p-3 lg:p-6">
          {children}
        </main>
      </div>

      {/* --- PLATFORM TUTORIAL MODAL --- */}
      {showTutorial && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            
            <div className="p-6 flex justify-between items-center bg-white">
              <h2 className="text-lg font-black text-[#282860] flex items-center gap-2">
                <HelpCircle size={20} className="text-[#BAD133]" /> Fortrust OS Guide
              </h2>
              <button onClick={() => setShowTutorial(false)} className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-100 p-2 rounded-full hover:bg-slate-200">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 flex-1 bg-slate-50 border-y border-slate-100 min-h-[350px] flex flex-col justify-center">
               <div className="flex flex-col md:flex-row gap-6 items-center md:items-start animate-in fade-in slide-in-from-right-4 duration-300" key={tutorialStep}>
                 <div className={`w-24 h-24 rounded-3xl flex items-center justify-center shrink-0 shadow-sm border ${TUTORIAL_STEPS[tutorialStep].bg} ${TUTORIAL_STEPS[tutorialStep].border}`}>
                    {TUTORIAL_STEPS[tutorialStep].icon}
                 </div>
                 <div>
                   <h3 className="font-black text-[#282860] text-2xl tracking-tight">{TUTORIAL_STEPS[tutorialStep].title}</h3>
                   <p className="text-slate-500 text-sm mt-2 leading-relaxed font-medium">
                     {TUTORIAL_STEPS[tutorialStep].description}
                   </p>
                   <ul className="mt-5 space-y-3">
                     {TUTORIAL_STEPS[tutorialStep].points.map((point, idx) => (
                       <li key={idx} className="flex items-start gap-3 text-sm text-slate-700">
                         <div className="mt-1 w-1.5 h-1.5 rounded-full bg-[#BAD133] shrink-0"></div>
                         <span className="leading-relaxed">{point}</span>
                       </li>
                     ))}
                   </ul>
                 </div>
               </div>
            </div>

            <div className="p-5 bg-white flex items-center justify-between">
              <button 
                onClick={() => setTutorialStep(prev => Math.max(0, prev - 1))}
                disabled={tutorialStep === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              >
                <ChevronLeft size={18}/> Previous
              </button>
              
              <div className="flex items-center gap-2">
                {TUTORIAL_STEPS.map((_, idx) => (
                  <div key={idx} className={`h-2 rounded-full transition-all duration-300 ${tutorialStep === idx ? "w-6 bg-[#BAD133]" : "w-2 bg-slate-200"}`}></div>
                ))}
              </div>

              {tutorialStep === TUTORIAL_STEPS.length - 1 ? (
                <button 
                  onClick={() => setShowTutorial(false)}
                  className="flex items-center gap-2 bg-[#282860] hover:bg-[#1b1b42] text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md active:scale-95"
                >
                  Get Started <CheckCircle size={18}/>
                </button>
              ) : (
                <button 
                  onClick={() => setTutorialStep(prev => Math.min(TUTORIAL_STEPS.length - 1, prev + 1))}
                  className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-[#282860] px-6 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95"
                >
                  Next <ChevronRight size={18}/>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* COMPREHENSIVE ACCOUNT SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh]">
            
            <div className="p-5 lg:p-6 border-b border-slate-100 flex justify-between items-center bg-[#f8fafc]">
              <h2 className="text-lg lg:text-xl font-bold text-[#282860] flex items-center gap-2">
                <Settings size={20} className="text-[#BAD133]" />
                {t.accountSettings}
              </h2>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="flex bg-slate-50 border-b border-slate-200">
              <button onClick={() => setSettingsTab('preferences')} className={`flex-1 py-3 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${settingsTab === 'preferences' ? 'text-[#282860] border-b-2 border-[#282860] bg-white' : 'text-slate-400'}`}>
                <Globe size={16}/> Preferences
              </button>
              <button onClick={() => setSettingsTab('security')} className={`flex-1 py-3 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${settingsTab === 'security' ? 'text-[#282860] border-b-2 border-[#282860] bg-white' : 'text-slate-400'}`}>
                <Lock size={16}/> Security
              </button>
              {user.role !== "MASTER_ADMIN" && (
                <button onClick={() => setSettingsTab('bank')} className={`flex-1 py-3 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${settingsTab === 'bank' ? 'text-[#282860] border-b-2 border-[#282860] bg-white' : 'text-slate-400'}`}>
                  <Landmark size={16}/> Bank & Commissions
                </button>
              )}
            </div>

            <div className="p-5 lg:p-6 overflow-y-auto flex-1">
              
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 mb-6">
                <div className="w-12 h-12 rounded-full bg-[#282860] flex items-center justify-center text-white font-black text-xl">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-lg">{user.name}</p>
                  <p className="text-xs font-semibold text-slate-500 uppercase mt-0.5">{user.role} • {user.branch}</p>
                </div>
              </div>

              {/* TAB 1: PREFERENCES */}
              {settingsTab === 'preferences' && (
                <div className="space-y-4 animate-in fade-in">
                  <h3 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                    <Globe size={16} className="text-slate-400" /> Language & Interface
                  </h3>
                  
                  {languageMessage && (
                    <div className="p-3 rounded-lg text-xs font-bold flex items-center gap-2 bg-green-50 text-green-700 border border-green-200">
                      <CheckCircle size={14} /> {languageMessage.text}
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold text-slate-500">System Language</label>
                    <div className="relative mt-1">
                      <select 
                        value={language} 
                        onChange={handleLanguageChange} 
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-[#282860] focus:outline-none focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 appearance-none cursor-pointer"
                      >
                        <option value="EN">🇺🇸 English (US)</option>
                        <option value="ID">🇮🇩 Bahasa Indonesia</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-3 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SECURITY */}
              {settingsTab === 'security' && (
                <form onSubmit={handlePasswordChange} className="space-y-4 animate-in fade-in">
                  <h3 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                    <Lock size={16} className="text-slate-400" /> Change Password
                  </h3>
                  
                  {passwordMessage && (
                    <div className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2
                      ${passwordMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      {passwordMessage.type === 'success' ? <CheckCircle size={14} /> : <ShieldAlert size={14} />}
                      {passwordMessage.text}
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold text-slate-500">New Password</label>
                    <input type="password" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" className="w-full mt-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#282860]" />
                  </div>
                  
                  <div className="pt-2 flex justify-end">
                    <button type="submit" disabled={isChangingPassword || !newPassword} className="w-full lg:w-auto bg-[#282860] hover:bg-[#1b1b42] text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50">
                      {isChangingPassword ? "Saving..." : "Update Password"}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 3: BANK DETAILS */}
              {settingsTab === 'bank' && user.role !== "MASTER_ADMIN" && (
                <form onSubmit={handleBankUpdate} className="space-y-4 animate-in fade-in">
                  <h3 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                    <DollarSign size={16} className="text-slate-400" /> Commission Transfer Details
                  </h3>
                  
                  {bankMessage && (
                    <div className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2
                      ${bankMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      {bankMessage.type === 'success' ? <CheckCircle size={14} /> : <ShieldAlert size={14} />}
                      {bankMessage.text}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500">Bank Name</label>
                      <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full mt-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#282860]" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500">Account Number</label>
                      <input type="text" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} className="w-full mt-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-[#282860]" />
                    </div>
                  </div>
                  
                  <div className="pt-2 flex justify-end">
                    <button type="submit" disabled={isUpdatingBank} className="w-full lg:w-auto bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                      {isUpdatingBank ? "Saving..." : <><CheckCircle size={16}/> Save Bank Details</>}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SIDEBAR DROPDOWN COMPONENT ---

type SidebarMenuItem = {
  label: string;
  href: string;
  icon?: React.ReactNode;
  iconClassName?: string | ((active: boolean) => string);
};

type SidebarMenuProps = {
  label: string;
  icon?: React.ReactNode;
  menuItems: SidebarMenuItem[];
  activePath: string;
};

function SidebarMenu({ label, icon, menuItems, activePath }: SidebarMenuProps) {
  const [submenuOpen, setSubmenuOpen] = React.useState(false);
  const btnRef = React.useRef<HTMLDivElement>(null);
  const [submenuPos, setSubmenuPos] = React.useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const submenuHover = React.useRef(false);

  React.useEffect(() => {
    if (submenuOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      let top = rect.top;
      const submenuHeight = 48 * menuItems.length;
      if (top + submenuHeight > window.innerHeight) {
        top = window.innerHeight - submenuHeight - 16;
      }
      setSubmenuPos({
        top,
        left: rect.right + 8,
      });
    }
  }, [submenuOpen, menuItems.length]);

  React.useEffect(() => {
    if (!submenuOpen) return;
    const handle = (e: MouseEvent) => {
      if (
        btnRef.current &&
        !btnRef.current.contains(e.target as Node) &&
        document.getElementById('sidebarmenu-submenu') &&
        !document.getElementById('sidebarmenu-submenu')!.contains(e.target as Node)
      ) {
        setSubmenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [submenuOpen]);

  const isActive = menuItems.some(item => item.href === activePath);
  
  return (
    <>
      <div
        ref={btnRef}
        className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 cursor-pointer ${
          isActive
            ? 'bg-white/10 text-white font-semibold shadow-inner ring-1 ring-white/5'
            : 'font-medium text-slate-400 hover:bg-white/5 hover:text-white'
        }`}
        onMouseEnter={() => setSubmenuOpen(true)}
        onMouseLeave={() => !submenuHover.current && setTimeout(() => setSubmenuOpen(false), 200)}
        onClick={() => setSubmenuOpen((v) => !v)}
        style={{ position: 'relative', zIndex: 51 }}
      >
        {icon && React.isValidElement(icon)
          ? React.cloneElement(icon as React.ReactElement<any>, {
              className: isActive
                ? 'text-[#BAD133]'
                : 'text-slate-500 group-hover:text-white transition-colors',
            })
          : icon}
        {label}
      </div>
      {submenuOpen && typeof window !== 'undefined' && createPortal(
        <div
          id="sidebarmenu-submenu"
          onMouseEnter={() => {
            submenuHover.current = true;
            setSubmenuOpen(true);
          }}
          onMouseLeave={() => {
            submenuHover.current = false;
            setTimeout(() => setSubmenuOpen(false), 200);
          }}
          style={{
            position: 'fixed',
            top: submenuPos.top,
            left: submenuPos.left,
            minWidth: 192,
            background: '#23234a',
            borderRadius: 12,
            boxShadow: '0 8px 32px 0 rgba(0,0,0,0.18)',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '8px 0',
            zIndex: 9999,
            transition: 'opacity 0.2s',
          }}
        >
          {menuItems.map(item => {
            const active = activePath === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${active ? 'bg-[#BAD133] text-[#1b1b42]' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                onClick={() => setSubmenuOpen(false)}
              >
                {item.icon && React.isValidElement(item.icon)
                  ? React.cloneElement(item.icon as React.ReactElement<any>, {
                      className:
                        typeof item.iconClassName === 'function'
                          ? item.iconClassName(active)
                          : item.iconClassName || (active
                              ? 'text-[#BAD133]'
                              : 'text-slate-500 group-hover:text-white transition-colors'),
                    })
                  : item.icon}
                {item.label}
              </Link>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}