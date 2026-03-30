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
  BookOpen
} from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("fortrust_user");
    if (!storedUser) {
      router.push("/");
    } else {
      setUser(JSON.parse(storedUser));
      setIsLoaded(true);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("fortrust_user");
    router.push("/");
  };

  if (!isLoaded || !user) return null;

  return (
    // 🚨 Added font-sans and antialiased to force modern typography!
    <div className="min-h-screen bg-[#f8fafc] flex font-sans antialiased">
      
      {/* 1. THE REFINED SIDEBAR */}
      <aside className="w-[260px] bg-[#1b1b42] text-slate-300 flex flex-col fixed h-full z-50 shadow-2xl border-r border-[#131333]">
        
        {/* Sleek Logo Area */}
        <div className="h-24 flex items-center px-6 border-b border-white/5 bg-[#171738]">
          <div className="bg-white px-4 py-3 rounded-xl w-full flex items-center justify-center shadow-md">
            <img src="/fortrust-logo.png" alt="Fortrust" className="h-8 w-auto object-contain" />
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          
          <p className="px-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 mt-2">Main Menu</p>
          
          <Link 
            href="/dashboard/pipeline" 
            className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
              ${pathname === '/dashboard/pipeline' 
                ? 'bg-white/10 text-white font-semibold shadow-inner ring-1 ring-white/5' 
                : 'font-medium text-slate-400 hover:bg-white/5 hover:text-white'}`}
          >
            <LayoutDashboard size={18} className={pathname === '/dashboard/pipeline' ? 'text-[#BAD133]' : 'text-slate-500 group-hover:text-white transition-colors'} />
            Student Pipeline
          </Link>

          <Link 
            href="/dashboard/programs" 
            className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
              ${pathname === '/dashboard/programs' 
                ? 'bg-white/10 text-white font-semibold shadow-inner ring-1 ring-white/5' 
                : 'font-medium text-slate-400 hover:bg-white/5 hover:text-white'}`}
          >
            <BookOpen size={18} className={pathname === '/dashboard/programs' ? 'text-[#BAD133]' : 'text-slate-500 group-hover:text-white transition-colors'} />
            Program Finder
          </Link>

          {/* Master Admin Only Section */}
          {user.role === "MASTER_ADMIN" && (
            <>
              <p className="px-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 mt-8">Admin Tools</p>
              
              <Link 
                href="/dashboard/admin" 
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
                  ${pathname === '/dashboard/admin' 
                    ? 'bg-white/10 text-white font-semibold shadow-inner ring-1 ring-white/5' 
                    : 'font-medium text-slate-400 hover:bg-white/5 hover:text-white'}`}
              >
                <ShieldAlert size={18} className={pathname === '/dashboard/admin' ? 'text-[#BAD133]' : 'text-slate-500 group-hover:text-white transition-colors'} />
                Master Admin Panel
              </Link>
              
              <Link 
                  href="/dashboard/network" 
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
                    ${pathname === '/dashboard/network' 
                      ? 'bg-white/10 text-white font-semibold shadow-inner ring-1 ring-white/5' 
                      : 'font-medium text-slate-400 hover:bg-white/5 hover:text-white'}`}
                >
                  <Users size={18} className={pathname === '/dashboard/network' ? 'text-[#BAD133]' : 'text-slate-500 group-hover:text-white transition-colors'} />
                  Network Directory
                </Link>
            </>
          )}
        </div>

        {/* User Profile & Logout */}
        <div className="p-4 bg-[#171738] border-t border-white/5">
          <div className="flex items-center justify-between bg-white/5 p-2.5 rounded-xl border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#BAD133] to-[#9bb029] flex items-center justify-center shadow-md">
                <span className="text-sm font-black text-[#1b1b42]">{user.name.charAt(0)}</span>
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate w-24">{user.name}</p>
                <p className="text-[9px] text-slate-400 uppercase tracking-widest truncate">{user.role}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col ml-[260px] min-w-0">
        
        {/* Top Utility Header */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40 shadow-sm">
          
          <div className="flex items-center text-slate-400 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 w-96 focus-within:border-[#282860] focus-within:ring-1 focus-within:ring-[#282860] transition-all">
            <Search size={18} className="mr-3 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search students, emails, or agents..." 
              className="bg-transparent border-none outline-none text-sm text-slate-700 w-full placeholder-slate-400 font-medium"
            />
          </div>

          <div className="flex items-center gap-5">
            <button className="p-2.5 text-slate-400 hover:text-[#282860] hover:bg-slate-100 rounded-full transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            <button className="p-2.5 text-slate-400 hover:text-[#282860] hover:bg-slate-100 rounded-full transition-colors">
              <Settings size={20} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 w-full max-w-[1600px] mx-auto overflow-x-hidden p-2">
          {children}
        </main>
      </div>
      
    </div>
  );
}