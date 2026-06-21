"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { 
  Send, Loader2, Activity, CheckCircle2, Clock, MessageSquare, 
  Lock, ShieldAlert, Cctv, Users
} from "lucide-react";

interface ChatMessage {
  id: number | string;
  student_id: number;
  sender: string;
  message: string;
  mentioned_users?: string[];
  read_by?: Array<{ user: string; read_at: string }>;
  is_system: boolean;
  created_at: string;
  _optimistic?: boolean;
  _failed?: boolean;
}

interface AuditEvent {
  id: string;
  type: string;
  actor: string | null;
  message: string;
  timestamp: string | null;
}

interface TeamCollabChatProps {
  studentId: number | string;
  currentUserName: string;
  apiUrl: string;
  token: string;
  pollInterval?: number;
  className?: string;
  /** Array of assignee names + Master Admin is always allowed */
  studentAssignees?: string[];
  /** Current user's role — Master Admin always has access */
  currentUserRole?: string;
}

export default function TeamCollabChat({
  studentId,
  currentUserName,
  apiUrl,
  token,
  pollInterval = 3000,
  className = "",
  studentAssignees = [],
  currentUserRole = "",
}: TeamCollabChatProps) {
  // Sub-tab state: "chat" or "audit"
  const [activeSubtab, setActiveSubtab] = useState<"chat" | "audit">("chat");
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pollTimer = useRef<NodeJS.Timeout | null>(null);
  const userIsAtBottomRef = useRef(true);

  // Quick client-side access check (server is the source of truth)
  const hasAccessClient = 
    currentUserRole === "MASTER_ADMIN" || 
    studentAssignees.includes(currentUserName);

  const checkIfAtBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    const threshold = 120;
    const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    userIsAtBottomRef.current = atBottom;
    return atBottom;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  // ============================================================
  // FETCH CHAT MESSAGES
  // ============================================================
  const fetchMessages = useCallback(async (silent: boolean = false) => {
    try {
      const res = await fetch(`${apiUrl}/api/pipeline/${studentId}/chat`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.status === 403) {
        setAccessDenied(true);
        setIsInitialLoad(false);
        return;
      }
      
      const data = await res.json();
      if (data.status !== "success") return;

      const fetched: ChatMessage[] = data.data || [];

      setMessages((prev) => {
        const serverIds = new Set(fetched.map((m) => String(m.id)));
        const optimisticOnly = prev.filter(
          (m) => m._optimistic && !serverIds.has(String(m.id))
        );

        const merged = [...fetched];
        for (const opt of optimisticOnly) {
          const matched = fetched.find(
            (s) =>
              s.sender === opt.sender &&
              s.message === opt.message
          );
          if (!matched) merged.push(opt);
        }

        merged.sort((a, b) => {
          const ta = new Date(a.created_at).getTime() || 0;
          const tb = new Date(b.created_at).getTime() || 0;
          return ta - tb;
        });

        return merged;
      });

      if (!silent) setIsInitialLoad(false);
    } catch (e) {
      if (!silent) {
        setError("Could not load messages.");
        setIsInitialLoad(false);
      }
    }
  }, [apiUrl, studentId, token]);

  // ============================================================
  // FETCH AUDIT TRAIL
  // ============================================================
  const fetchAuditTrail = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/pipeline/${studentId}/audit-trail`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.status === 403) {
        setAccessDenied(true);
        return;
      }
      
      const data = await res.json();
      if (data.status === "success") {
        setAuditEvents(data.data || []);
      }
    } catch (e) {
      console.error("Failed to load audit trail");
    }
  }, [apiUrl, studentId, token]);

  // ============================================================
  // POLLING — only when on chat tab
  // ============================================================
  useEffect(() => {
    if (!hasAccessClient) {
      setAccessDenied(true);
      setIsInitialLoad(false);
      return;
    }
    
    if (activeSubtab === "chat") {
      fetchMessages(false);
      pollTimer.current = setInterval(() => fetchMessages(true), pollInterval);
    } else if (activeSubtab === "audit") {
      fetchAuditTrail();
    }

    return () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };
  }, [fetchMessages, fetchAuditTrail, pollInterval, activeSubtab, hasAccessClient]);

  useEffect(() => {
    if (isInitialLoad) {
      scrollToBottom("auto");
    } else if (userIsAtBottomRef.current) {
      scrollToBottom("smooth");
    }
  }, [messages.length, isInitialLoad, scrollToBottom]);

  // ============================================================
  // SEND MESSAGE (optimistic)
  // ============================================================
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || isSending) return;

    // Block users from posting fake SYSTEM messages
    if (text.toUpperCase().startsWith("SYSTEM:")) {
      setError("Messages cannot start with 'SYSTEM:'. That's reserved for audit events.");
      setTimeout(() => setError(null), 4000);
      return;
    }

    const tempId = `optimistic-${Date.now()}`;
    const now = new Date();
    const optimistic: ChatMessage = {
      id: tempId,
      student_id: Number(studentId),
      sender: currentUserName,
      message: text,
      is_system: false,
      created_at: now.toISOString(),
      _optimistic: true,
    };

    setMessages((prev) => [...prev, optimistic]);
    setInputText("");
    setIsSending(true);

    userIsAtBottomRef.current = true;
    setTimeout(() => scrollToBottom("smooth"), 50);

    try {
      const res = await fetch(`${apiUrl}/api/pipeline/${studentId}/chat`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok || data.status !== "success") {
        throw new Error(data.detail || "Failed to send");
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...data.data, _optimistic: false } : m
        )
      );
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, _failed: true } : m
        )
      );
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const retryMessage = (msgId: string | number) => {
    const failed = messages.find((m) => m.id === msgId);
    if (!failed) return;
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    setInputText(failed.message);
    setTimeout(() => handleSend(), 50);
  };

  // ============================================================
  // RENDER HELPERS
  // ============================================================
  const renderText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\s+)/);
    return parts.map((part, idx) => {
      if (part.startsWith("@")) {
        return (
          <span key={idx} className="text-blue-600 font-bold bg-blue-50 px-1 rounded">
            {part}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T"));
      if (isNaN(d.getTime())) return "";
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = d.toDateString() === yesterday.toDateString();

      const time = d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      if (isToday) return time;
      if (isYesterday) return `Yesterday ${time}`;
      return d.toLocaleDateString([], { month: "short", day: "numeric" }) + ` ${time}`;
    } catch {
      return "";
    }
  };

  const formatFullDate = (dateStr: string | null) => {
    if (!dateStr) return "Unknown time";
    try {
      const d = new Date(dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T"));
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString([], {
        month: "short", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: false
      });
    } catch {
      return dateStr;
    }
  };

  const groupMessages = (msgs: ChatMessage[]) => {
    const groups: ChatMessage[][] = [];
    let currentGroup: ChatMessage[] = [];
    for (const msg of msgs) {
      if (
        currentGroup.length === 0 ||
        currentGroup[currentGroup.length - 1].sender === msg.sender
      ) {
        currentGroup.push(msg);
      } else {
        groups.push(currentGroup);
        currentGroup = [msg];
      }
    }
    if (currentGroup.length > 0) groups.push(currentGroup);
    return groups;
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-amber-500",
      "bg-rose-500", "bg-indigo-500", "bg-teal-500", "bg-orange-500",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // ============================================================
  // ACCESS DENIED STATE
  // ============================================================
  if (accessDenied) {
    return (
      <div className={`flex flex-col h-full ${className} bg-slate-50/50`}>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <Lock size={28} className="text-amber-600"/>
            </div>
            <h3 className="text-lg font-black text-[#282860] mb-2">Chat Access Restricted</h3>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Only agents assigned to this student and Master Admin can view or post in this chat. 
              This protects student privacy and keeps conversations focused.
            </p>
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-left">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                Need access?
              </p>
              <p className="text-xs text-slate-600">
                Ask Master Admin to add you as an assignee on this student's profile.
              </p>
              {studentAssignees.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Current Members
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {studentAssignees.map(name => (
                      <span key={name} className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-1 rounded-md">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessages(messages);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      
      {/* SUB-TAB STRIP */}
      <div className="flex border-b border-slate-200 bg-white shrink-0">
        <button
          onClick={() => setActiveSubtab("chat")}
          className={`flex-1 py-3 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
            activeSubtab === "chat" 
              ? "text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/30" 
              : "text-slate-400 hover:text-slate-700"
          }`}
        >
          <MessageSquare size={16}/> Chat
          {messages.length > 0 && (
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
              activeSubtab === "chat" ? "bg-emerald-200 text-emerald-700" : "bg-slate-100 text-slate-500"
            }`}>
              {messages.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveSubtab("audit")}
          className={`flex-1 py-3 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
            activeSubtab === "audit" 
              ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/30" 
              : "text-slate-400 hover:text-slate-700"
          }`}
        >
          <Cctv size={16}/> Audit Trail
          {auditEvents.length > 0 && (
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
              activeSubtab === "audit" ? "bg-blue-200 text-blue-700" : "bg-slate-100 text-slate-500"
            }`}>
              {auditEvents.length}
            </span>
          )}
        </button>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-xs font-bold text-red-700 flex items-center gap-2 shrink-0">
          <ShieldAlert size={14}/> {error}
        </div>
      )}

      {/* ============== CHAT TAB ============== */}
      {activeSubtab === "chat" && (
        <>
          {/* Members chip */}
          {studentAssignees.length > 0 && (
            <div className="bg-slate-50/50 border-b border-slate-100 px-4 py-2 flex items-center gap-2 shrink-0">
              <Users size={12} className="text-slate-400"/>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">In this conversation:</p>
              <div className="flex flex-wrap gap-1">
                {studentAssignees.map(name => (
                  <span key={name} className="bg-white border border-slate-200 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                    {name}
                  </span>
                ))}
                {currentUserRole === "MASTER_ADMIN" && !studentAssignees.includes(currentUserName) && (
                  <span className="bg-[#282860] text-[#BAD133] text-[10px] font-bold px-1.5 py-0.5 rounded">
                    {currentUserName} (Admin)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* MESSAGE LIST */}
          <div
            ref={messagesContainerRef}
            onScroll={checkIfAtBottom}
            className="flex-1 overflow-y-auto custom-scrollbar bg-gradient-to-b from-slate-50/50 to-white px-4 py-5"
          >
            {isInitialLoad ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Loader2 size={28} className="animate-spin mb-3 text-[#BAD133]" />
                <p className="text-sm font-medium">Loading messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-16 text-slate-400 flex flex-col items-center">
                <MessageSquare size={40} className="mb-3 text-slate-200" />
                <p className="font-medium text-sm">No messages yet.</p>
                <p className="text-xs mt-1">Start the conversation or type @ to mention an agent.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messageGroups.map((group, gIdx) => {
                  const first = group[0];
                  const isMe = first.sender === currentUserName;
                  const senderName = first.sender;
                  const avatarColor = getAvatarColor(senderName || "?");
                  const initial = (senderName || "?").charAt(0).toUpperCase();

                  return (
                    <div
                      key={`g-${gIdx}`}
                      className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                    >
                      <div className="shrink-0 w-8 flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full ${avatarColor} text-white font-black text-xs flex items-center justify-center shadow-sm`}
                        >
                          {initial}
                        </div>
                      </div>

                      <div className={`flex flex-col gap-0.5 max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                        <p className={`text-[11px] font-bold ${isMe ? "text-emerald-600" : "text-slate-700"} px-1`}>
                          {isMe ? "You" : senderName}
                        </p>

                        {group.map((msg, mIdx) => (
                          <div key={msg.id} className="group/msg flex items-end gap-1.5">
                            <div
                              className={`relative px-3.5 py-2 max-w-full ${
                                isMe ? "bg-[#dcf8c6] text-slate-800" : "bg-white border border-slate-200 text-slate-700"
                              } ${
                                isMe
                                  ? mIdx === 0 ? "rounded-2xl rounded-tr-md" : "rounded-2xl rounded-r-md"
                                  : mIdx === 0 ? "rounded-2xl rounded-tl-md" : "rounded-2xl rounded-l-md"
                              } ${msg._failed ? "border-red-300 bg-red-50" : ""} shadow-sm`}
                            >
                              <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                {renderText(msg.message)}
                              </div>
                              <div className={`flex items-center gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {formatTime(msg.created_at)}
                                </span>
                                {isMe && (
                                  <>
                                    {msg._failed ? (
                                      <button
                                        onClick={() => retryMessage(msg.id)}
                                        className="text-[10px] text-red-500 font-bold hover:underline"
                                      >
                                        ↻ Retry
                                      </button>
                                    ) : msg._optimistic ? (
                                      <Clock size={10} className="text-slate-400" />
                                    ) : (
                                      <CheckCircle2 size={10} className="text-blue-500" />
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* INPUT BAR */}
          <div className="p-4 bg-white border-t border-slate-200 shrink-0">
            <form onSubmit={handleSend} className="relative">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a message... use @ to mention an agent"
                rows={1}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 pr-14 text-sm outline-none focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all resize-none max-h-32"
                style={{ minHeight: "44px" }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = Math.min(target.scrollHeight, 128) + "px";
                }}
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isSending}
                className="absolute right-2 bottom-2 w-9 h-9 rounded-full bg-[#282860] hover:bg-[#1b1b42] text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-md active:scale-95"
              >
                {isSending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} className="-ml-0.5" />}
              </button>
            </form>
            <p className="text-[10px] text-slate-400 mt-1.5 text-center font-medium">
              Enter to send • Shift + Enter for new line • Updates every 3 seconds
            </p>
          </div>
        </>
      )}

      {/* ============== AUDIT TRAIL TAB ============== */}
      {activeSubtab === "audit" && (
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30 p-5">
          <div className="bg-[#0f172a] text-white p-4 rounded-2xl mb-4 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Cctv className="text-blue-400" size={20}/>
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-widest">System Audit Trail</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Automated events recorded for this student</p>
              </div>
            </div>
            <span className="bg-[#1e293b] text-slate-300 border border-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg">
              {auditEvents.length} events
            </span>
          </div>

          {auditEvents.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Activity size={40} className="mx-auto text-slate-200 mb-3"/>
              <p className="text-sm font-medium">No system events recorded yet.</p>
              <p className="text-xs mt-1">Edits, uploads, and assignment changes will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {auditEvents.map(event => (
                <div key={event.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-start gap-3 shadow-sm">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Activity size={16} className="text-slate-500"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 leading-relaxed">{event.message}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {event.actor && (
                        <span className="text-[10px] font-bold text-[#282860] bg-slate-100 px-1.5 py-0.5 rounded">
                          {event.actor}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-medium">
                        {formatFullDate(event.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}