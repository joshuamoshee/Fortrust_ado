"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, 
  ShieldAlert, 
  LogOut, 
  Bell, 
  Search,
  Settings,
  Users,
  BookOpen,
  Megaphone,
  X,
  Lock,
  CheckCircle,
  Menu // NEW: Added Hamburger Menu Icon
} from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // --- STATES ---
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  
  // NEW: Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const notifications = [
    { id: 1, text: "New Student Lead: John Doe", time: "10 min ago" },
    { id: 2, text: "Document uploaded for Sarah Smith", time: "1 hour ago" },
    { id: 3, text: "System Update Complete", time: "2 hours ago" },
  ];

  useEffect(() => {
    const storedUser = localStorage.getItem("fortrust_user");
    if (!storedUser) {
      router.push("/");
    } else {
      setUser(JSON.parse(storedUser));
      setIsLoaded(true);
    }
  }, [router]);

  // NEW: Auto-close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("fortrust_user");
    localStorage.removeItem("fortrust_token");
    router.push("/");
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChangingPassword(true);
    setPasswordMessage(null);

    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${user.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ password: newPassword })
      });

      if (res.ok) {
        setPasswordMessage({type: 'success', text: "Password successfully updated!"});
        setNewPassword("");
        setTimeout(() => {
            setShowSettings(false);
            setPasswordMessage(null);
        }, 2000);
      } else {
        setPasswordMessage({type: 'error', text: "Failed to update password."});
      }
    } catch (err) {
      setPasswordMessage({type: 'error', text: "Network Error."});
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!isLoaded || !user) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans antialiased relative overflow-hidden">
      
      {/* NEW: MOBILE BACKDROP OVERLAY */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* 1. THE RESPONSIVE SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-[#1b1b42] text-slate-300 flex flex-col h-full shadow-2xl border-r border-[#131333] transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Sleek Logo Area */}
        <div className="h-16 lg:h-24 flex items-center px-6 border-b border-white/5 bg-[#171738] justify-between">
          <div className="bg-white px-4 py-2 lg:py-3 rounded-xl w-full flex items-center justify-center shadow-md">
            <img src="/fortrust-logo.png" alt="Fortrust" className="h-6 lg:h-8 w-auto object-contain" />
          </div>
          {/* Mobile Close Button */}
          <button className="lg:hidden ml-4 text-slate-400 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={24} />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          
          <p className="px-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 mt-2">Main Menu</p>
          
          <Link href="/dashboard/pipeline" className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${pathname === '/dashboard/pipeline' ? 'bg-white/10 text-white font-semibold shadow-inner ring-1 ring-white/5' : 'font-medium text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            <LayoutDashboard size={18} className={pathname === '/dashboard/pipeline' ? 'text-[#BAD133]' : 'text-slate-500 group-hover:text-white transition-colors'} />
            Student Pipeline
          </Link>

          <Link href="/dashboard/programs" className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${pathname === '/dashboard/programs' ? 'bg-white/10 text-white font-semibold shadow-inner ring-1 ring-white/5' : 'font-medium text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            <BookOpen size={18} className={pathname === '/dashboard/programs' ? 'text-[#BAD133]' : 'text-slate-500 group-hover:text-white transition-colors'} />
            Program Finder
          </Link>

          {/* Master Admin Only Section */}
          {user.role === "MASTER_ADMIN" && (
            <>
              <p className="px-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 mt-8">Admin Tools</p>
              
              <Link href="/dashboard/agent-pipeline" className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${pathname === '/dashboard/agent-pipeline' ? 'bg-white/10 text-white font-semibold shadow-inner ring-1 ring-white/5' : 'font-medium text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                <Users size={18} className={pathname === '/dashboard/agent-pipeline' ? 'text-[#BAD133]' : 'text-slate-500 group-hover:text-white transition-colors'} />
                Agent Pipeline
              </Link>
              
              <Link href="/dashboard/admin" className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${pathname === '/dashboard/admin' ? 'bg-white/10 text-white font-semibold shadow-inner ring-1 ring-white/5' : 'font-medium text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                <ShieldAlert size={18} className={pathname === '/dashboard/admin' ? 'text-[#BAD133]' : 'text-slate-500 group-hover:text-white transition-colors'} />
                Master Admin Panel
              </Link>
              
              <Link href="/dashboard/network" className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${pathname === '/dashboard/network' ? 'bg-white/10 text-white font-semibold shadow-inner ring-1 ring-white/5' : 'font-medium text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                <Users size={18} className={pathname === '/dashboard/network' ? 'text-[#BAD133]' : 'text-slate-500 group-hover:text-white transition-colors'} />
                Network Directory
              </Link>

              <Link href="/dashboard/marketing" className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${pathname === '/dashboard/marketing' ? 'bg-white/10 text-white font-semibold shadow-inner ring-1 ring-white/5' : 'font-medium text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                <Megaphone size={18} className={pathname === '/dashboard/marketing' ? 'text-[#BAD133]' : 'text-slate-500 group-hover:text-white transition-colors'} />
                <span className="font-bold">Marketing Hub</span>
              </Link>
            </>
          )}
        </div>

        {/* User Profile & Logout */}
        <div className="p-4 bg-[#171738] border-t border-white/5">
          <div className="flex items-center justify-between bg-white/5 p-2.5 rounded-xl border border-white/5">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowSettings(true)}>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#BAD133] to-[#9bb029] flex items-center justify-center shadow-md hover:scale-105 transition-transform">
                <span className="text-sm font-black text-[#1b1b42]">{user.name.charAt(0)}</span>
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate w-24 hover:text-[#BAD133] transition-colors">{user.name}</p>
                <p className="text-[9px] text-slate-400 uppercase tracking-widest truncate">{user.role}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors" title="Sign Out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col lg:ml-[260px] min-w-0 w-full transition-all duration-300">
        
        {/* Top Utility Header */}
        <header className="h-16 lg:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 shadow-sm gap-4">
          
          <div className="flex items-center flex-1 gap-4">
            {/* NEW: MOBILE HAMBURGER MENU */}
            <button 
              className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>

            {/* Hide search bar on small phones to save space */}
            <div className="hidden sm:flex items-center text-slate-400 bg-slate-50 px-4 py-2 lg:py-2.5 rounded-xl border border-slate-200 w-full max-w-md focus-within:border-[#282860] focus-within:ring-1 focus-within:ring-[#282860] transition-all">
              <Search size={18} className="mr-3 text-slate-400 flex-shrink-0" />
              <input 
                type="text" 
                placeholder="Search students or agents..." 
                className="bg-transparent border-none outline-none text-sm text-slate-700 w-full placeholder-slate-400 font-medium min-w-0"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-5 flex-shrink-0">
            
            {/* --- BELL ICON & NOTIFICATION DROPDOWN --- */}
            <div className="relative">
              <button 
                onClick={() => { setShowNotifications(!showNotifications); setShowSettings(false); }}
                className={`p-2 lg:p-2.5 rounded-full transition-colors relative ${showNotifications ? 'bg-slate-100 text-[#282860]' : 'text-slate-400 hover:text-[#282860] hover:bg-slate-100'}`}
              >
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
              </button>

              {/* Notification Popup */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 lg:w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-4 z-50">
                  <div className="p-4 border-b border-slate-100 bg-[#f8fafc] flex justify-between items-center">
                    <h3 className="font-bold text-[#282860]">Notifications</h3>
                    <span className="text-[10px] font-bold text-white bg-red-500 px-2 py-0.5 rounded-full">3 New</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map((note) => (
                      <div key={note.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                        <div>
                          <p className="text-sm font-medium text-slate-700">{note.text}</p>
                          <p className="text-xs text-slate-400 mt-1">{note.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 text-center border-t border-slate-100 bg-slate-50">
                    <button className="text-xs font-bold text-[#282860] hover:underline">Mark all as read</button>
                  </div>
                </div>
              )}
            </div>

            {/* --- SETTINGS ICON --- */}
            <button 
              onClick={() => { setShowSettings(true); setShowNotifications(false); }}
              className={`p-2 lg:p-2.5 rounded-full transition-colors ${showSettings ? 'bg-slate-100 text-[#282860]' : 'text-slate-400 hover:text-[#282860] hover:bg-slate-100'}`}
            >
              <Settings size={20} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 w-full max-w-[1600px] mx-auto overflow-x-hidden p-3 lg:p-6">
          {children}
        </main>
      </div>
      
      {/* --- ACCOUNT SETTINGS MODAL --- */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-5 lg:p-6 border-b border-slate-100 flex justify-between items-center bg-[#f8fafc]">
              <h2 className="text-lg lg:text-xl font-bold text-[#282860] flex items-center gap-2">
                <Settings size={20} className="text-[#BAD133]" />
                Account Settings
              </h2>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-5 lg:p-6">
              {/* Profile Overview */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 mb-6">
                <div className="w-12 h-12 rounded-full bg-[#282860] flex items-center justify-center text-white font-black text-xl">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-slate-800">{user.name}</p>
                  <p className="text-xs font-semibold text-slate-500 uppercase">{user.role}</p>
                </div>
              </div>

              {/* Password Change Form */}
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <h3 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                  <Lock size={16} className="text-slate-400" /> Change Password
                </h3>
                
                {passwordMessage && (
                  <div className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2
                    ${passwordMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {passwordMessage.type === 'success' ? <CheckCircle size={14}/> : <ShieldAlert size={14}/>}
                    {passwordMessage.text}
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-500">New Password</label>
                  <input 
                    type="password" 
                    required 
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full mt-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#282860]"
                  />
                </div>
                
                <div className="pt-2 flex justify-end">
                  <button 
                    type="submit" 
                    disabled={isChangingPassword || !newPassword}
                    className="w-full lg:w-auto bg-[#282860] hover:bg-[#1b1b42] text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                  >
                    {isChangingPassword ? "Saving..." : "Update Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}