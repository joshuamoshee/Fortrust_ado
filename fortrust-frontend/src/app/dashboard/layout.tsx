"use client";

import React, { FormEvent, useEffect, useState, useRef, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
  LayoutDashboard, ShieldAlert, LogOut, Bell, Settings, Users, BookOpen, 
  Megaphone, X, Lock, CheckCircle, Menu, Building2, DollarSign, Landmark, 
  Phone, ChevronDown
} from "lucide-react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // --- UI STATES ---
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  const [settingsTab, setSettingsTab] = useState<"security" | "bank">("security");
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

  useEffect(() => {
    const storedUser = localStorage.getItem("fortrust_user");
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
        body: JSON.stringify({ 
          bank_name: bankName, bank_account: bankAccount, bank_branch: bankBranch, swift_code: swiftCode 
        })
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

  if (!isLoaded || !user) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans antialiased relative overflow-hidden">

      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* SIDEBAR */}
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
              <p className="px-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 mt-2">Agent Workspace</p>

              <Link href="/dashboard/pipeline" className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${pathname === '/dashboard/pipeline' ? 'bg-white/10 text-white font-semibold shadow-inner ring-1 ring-white/5' : 'font-medium text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                <LayoutDashboard size={18} className={pathname === '/dashboard/pipeline' ? 'text-[#BAD133]' : 'text-slate-500 group-hover:text-white transition-colors'} />
                Student Pipeline
              </Link>

              <Link href="/dashboard/programs" className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${pathname === '/dashboard/programs' ? 'bg-white/10 text-white font-semibold shadow-inner ring-1 ring-white/5' : 'font-medium text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                <BookOpen size={18} className={pathname === '/dashboard/programs' ? 'text-[#BAD133]' : 'text-slate-500 group-hover:text-white transition-colors'} />
                Program Finder
              </Link>
            </>
          )}

          {user.role === "MASTER_ADMIN" && (
            <>
              <p className="px-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 mt-2">Admin Tools</p>
              
              <Link href="/dashboard/admin" className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${pathname === '/dashboard/admin' ? 'bg-white/10 text-white font-semibold shadow-inner ring-1 ring-white/5' : 'font-medium text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                <ShieldAlert size={18} className={pathname === '/dashboard/admin' ? 'text-[#BAD133]' : 'text-slate-500 group-hover:text-white transition-colors'} />
                Main Dashboard
              </Link>

              <Link href="/dashboard/agent-pipeline" className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${pathname === '/dashboard/agent-pipeline' ? 'bg-white/10 text-white font-semibold shadow-inner ring-1 ring-white/5' : 'font-medium text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                <Users size={18} className={pathname === '/dashboard/agent-pipeline' ? 'text-[#BAD133]' : 'text-slate-500 group-hover:text-white transition-colors'} />
                Agent Management
              </Link>

              <SidebarMenu label="Consultation" icon={<LayoutDashboard size={18} />} activePath={pathname} menuItems={[ { label: 'Profiling Test', href: '/dashboard/pipeline' }, { label: 'Assessment', href: '/dashboard/assessment' }, { label: 'Program Finder', href: '/dashboard/programs' } ]} />
              <SidebarMenu label="Marketing" icon={<Megaphone size={18} />} activePath={pathname} menuItems={[ { label: 'Leads', href: '/dashboard/marketing' } ]} />
              <SidebarMenu label="Institution Partners" icon={<Building2 size={18} />} activePath={pathname} menuItems={[ { label: 'Agreement', href: '/dashboard/network' }, { label: 'Contact Person', href: '/dashboard/contact-person' }, { label: 'Commission Structure', href: '/dashboard/commission-structure' } ]} />
              <SidebarMenu label="Commissions" icon={<DollarSign size={18} />} activePath={pathname} menuItems={[ { label: 'Reports', href: '/dashboard/claimed' } ]} />
            </>
          )}

        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
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
                    <h3 className="font-bold text-[#282860]">Recent Activity</h3>
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

            {/* THE NEW ZOHO-STYLE PROFILE MENU */}
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
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Role & Access</p>
                      <p className="text-sm font-bold text-slate-700 mt-0.5">{user.role} • {user.branch}</p>
                    </div>
                  </div>
                  <div className="p-2 border-t border-slate-100">
                    <button onClick={() => { setShowSettings(true); setShowProfileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 hover:text-[#282860] hover:bg-slate-50 rounded-xl transition-colors">
                      <Settings size={18} className="text-slate-400" /> Account Settings
                    </button>
                  </div>
                  <div className="p-2 border-t border-slate-100 bg-slate-50/50">
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                      <LogOut size={18} className="text-red-400" /> Secure Sign Out
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

      {/* COMPREHENSIVE ACCOUNT SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh]">
            
            <div className="p-5 lg:p-6 border-b border-slate-100 flex justify-between items-center bg-[#f8fafc]">
              <h2 className="text-lg lg:text-xl font-bold text-[#282860] flex items-center gap-2">
                <Settings size={20} className="text-[#BAD133]" />
                Account Settings
              </h2>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="flex bg-slate-50 border-b border-slate-200">
              <button onClick={() => setSettingsTab('security')} className={`flex-1 py-3 text-sm font-bold transition-colors ${settingsTab === 'security' ? 'text-[#282860] border-b-2 border-[#282860] bg-white' : 'text-slate-400'}`}>Security</button>
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
                  
                  {(user.phone || user.corporation_name) && (
                    <div className="text-[11px] text-slate-500 mt-2 flex flex-wrap items-center gap-3">
                      {user.phone && (
                        <span className="flex items-center gap-1"><Phone size={10} className="text-slate-400"/> {user.phone}</span>
                      )}
                      {user.phone && user.corporation_name && <span className="text-slate-300">|</span>}
                      {user.corporation_name && (
                        <span className="flex items-center gap-1 font-bold text-[#282860]"><Building2 size={10} className="text-[#BAD133]"/> {user.corporation_name}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

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

              {settingsTab === 'bank' && user.role !== "MASTER_ADMIN" && (
                <form onSubmit={handleBankUpdate} className="space-y-4 animate-in fade-in">
                  <h3 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                    <DollarSign size={16} className="text-slate-400" /> Commission Transfer Details
                  </h3>
                  
                  <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg border border-blue-200 font-medium mb-4">
                    Ensure these details are accurate. This account will receive all your commission payouts for closed deals.
                  </div>

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
                      <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g., Bank Central Asia (BCA)" className="w-full mt-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#282860]" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500">Account Number</label>
                      <input type="text" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} placeholder="e.g., 123-456-7890" className="w-full mt-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-[#282860]" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500">Branch Location</label>
                      <input type="text" value={bankBranch} onChange={(e) => setBankBranch(e.target.value)} placeholder="e.g., Jakarta Sudirman" className="w-full mt-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#282860]" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500">SWIFT Code (If applicable)</label>
                      <input type="text" value={swiftCode} onChange={(e) => setSwiftCode(e.target.value)} placeholder="e.g., CENAIDJA" className="w-full mt-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono uppercase focus:outline-none focus:border-[#282860]" />
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