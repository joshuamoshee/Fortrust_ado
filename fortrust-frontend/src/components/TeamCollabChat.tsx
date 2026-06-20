"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Loader2, Activity, CheckCircle2, Clock, MessageSquare } from "lucide-react";

interface ChatMessage {
  id: number | string;
  student_id: number;
  sender: string;
  message: string;
  mentioned_users?: string[];
  read_by?: Array<{ user: string; read_at: string }>;
  is_system: boolean;
  created_at: string;
  _optimistic?: boolean;  // local flag for not-yet-confirmed messages
  _failed?: boolean;       // failed to send
}

interface TeamCollabChatProps {
  studentId: number | string;
  currentUserName: string;
  apiUrl: string;
  token: string;
  /** ms between polls. default 3000 */
  pollInterval?: number;
  className?: string;
}

/**
 * Fast WhatsApp-style team chat.
 * 
 * Performance tricks:
 * - Independent state (doesn't trigger parent re-renders)
 * - Polls every 3s for new messages — only appends NEW ones, no full reload
 * - Optimistic send: shows message instantly, marks as sent when server confirms
 * - Smart scroll: only auto-scrolls if user is already near the bottom
 * - Groups consecutive messages from same sender (WhatsApp style)
 */
export default function TeamCollabChat({
  studentId,
  currentUserName,
  apiUrl,
  token,
  pollInterval = 3000,
  className = "",
}: TeamCollabChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pollTimer = useRef<NodeJS.Timeout | null>(null);
  const lastMessageIdRef = useRef<number | string | null>(null);
  const userIsAtBottomRef = useRef(true);

  // ============================================================
  // SMART SCROLL — only auto-scroll if user is already near bottom
  // ============================================================
  const checkIfAtBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    const threshold = 120; // px
    const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    userIsAtBottomRef.current = atBottom;
    return atBottom;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  // ============================================================
  // FETCH MESSAGES (polling + initial)
  // ============================================================
  const fetchMessages = useCallback(async (silent: boolean = false) => {
    try {
      const res = await fetch(`${apiUrl}/api/pipeline/${studentId}/chat`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.status !== "success") return;

      const fetched: ChatMessage[] = data.data || [];

      setMessages((prev) => {
        // Merge logic: keep optimistic messages until they're confirmed,
        // then replace optimistic with server version.
        const serverIds = new Set(fetched.map((m) => m.id));
        const optimisticOnly = prev.filter(
          (m) => m._optimistic && !serverIds.has(m.id)
        );

        // For optimistic messages, check if a server message matches by content+sender within last 10s
        const merged = [...fetched];
        for (const opt of optimisticOnly) {
          const matched = fetched.find(
            (s) =>
              s.sender === opt.sender &&
              s.message === opt.message &&
              !s.is_system
          );
          if (!matched) {
            // Still not confirmed — keep showing as pending
            merged.push(opt);
          }
        }

        // Sort by created_at
        merged.sort((a, b) => {
          const ta = new Date(a.created_at).getTime() || 0;
          const tb = new Date(b.created_at).getTime() || 0;
          return ta - tb;
        });

        // Track latest message ID for change detection
        if (merged.length > 0) {
          lastMessageIdRef.current = merged[merged.length - 1].id;
        }

        return merged;
      });

      // Mark chat as read (don't await, fire-and-forget)
      if (fetched.length > 0) {
        fetch(`${apiUrl}/api/pipeline/${studentId}/chat/read`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }

      if (!silent) setIsInitialLoad(false);
    } catch (e) {
      if (!silent) {
        setError("Could not load messages.");
        setIsInitialLoad(false);
      }
    }
  }, [apiUrl, studentId, token]);

  // ============================================================
  // POLLING SETUP
  // ============================================================
  useEffect(() => {
    // Initial fetch
    fetchMessages(false);

    // Polling loop
    pollTimer.current = setInterval(() => {
      fetchMessages(true);
    }, pollInterval);

    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [fetchMessages, pollInterval]);

  // ============================================================
  // AUTO-SCROLL on new messages (but only if user was at bottom)
  // ============================================================
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

    // Show message instantly with optimistic ID
    const tempId = `optimistic-${Date.now()}`;
    const now = new Date();
    const optimistic: ChatMessage = {
      id: tempId,
      student_id: Number(studentId),
      sender: currentUserName,
      message: text,
      is_system: false,
      created_at: now.toISOString().replace("T", " ").substring(0, 19),
      _optimistic: true,
    };

    setMessages((prev) => [...prev, optimistic]);
    setInputText("");
    setIsSending(true);

    // Force scroll to bottom since user just sent something
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
      // Replace optimistic with real server message
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...data.data, _optimistic: false } : m
        )
      );
    } catch (err) {
      // Mark optimistic message as failed
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
  // Highlight @mentions
  const renderText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\s+)/);
    return parts.map((part, idx) => {
      if (part.startsWith("@")) {
        return (
          <span
            key={idx}
            className="text-blue-600 font-bold bg-blue-50 px-1 rounded"
          >
            {part}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  // Format timestamp like WhatsApp: "10:42" if today, else "Yesterday 10:42" or full date
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
      return d.toLocaleDateString([], {
        month: "short",
        day: "numeric",
      }) + ` ${time}`;
    } catch {
      return "";
    }
  };

  // Group consecutive messages from the same sender
  const groupMessages = (msgs: ChatMessage[]) => {
    const groups: ChatMessage[][] = [];
    let currentGroup: ChatMessage[] = [];
    for (const msg of msgs) {
      if (
        currentGroup.length === 0 ||
        (currentGroup[currentGroup.length - 1].sender === msg.sender &&
          currentGroup[currentGroup.length - 1].is_system === msg.is_system)
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

  // Avatar color from name hash
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

  const messageGroups = groupMessages(messages);

  // ============================================================
  // UI
  // ============================================================
  return (
    <div className={`flex flex-col h-full ${className}`}>
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
        ) : error ? (
          <div className="text-center py-16 text-red-500 text-sm font-medium">
            {error}
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
              const isSystem = first.is_system || first.sender === "System" || first.sender === "System AI";
              const senderName = isSystem ? "System" : first.sender;
              const avatarColor = getAvatarColor(senderName || "?");
              const initial = (senderName || "?").charAt(0).toUpperCase();

              if (isSystem) {
                // System messages: centered grey pill
                return (
                  <div key={`g-${gIdx}`} className="flex flex-col items-center gap-1.5">
                    {group.map((msg) => (
                      <div
                        key={msg.id}
                        className="bg-slate-100 text-slate-500 text-[11px] font-medium px-3 py-1.5 rounded-full italic flex items-center gap-1.5"
                      >
                        <Activity size={11} className="text-slate-400" />
                        {msg.message.replace(/^SYSTEM:\s*/i, "")}
                      </div>
                    ))}
                  </div>
                );
              }

              return (
                <div
                  key={`g-${gIdx}`}
                  className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                >
                  {/* Avatar — only show on first message of group */}
                  <div className="shrink-0 w-8 flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full ${avatarColor} text-white font-black text-xs flex items-center justify-center shadow-sm`}
                    >
                      {initial}
                    </div>
                  </div>

                  <div className={`flex flex-col gap-0.5 max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                    {/* Sender name */}
                    <p className={`text-[11px] font-bold ${isMe ? "text-emerald-600" : "text-slate-700"} px-1`}>
                      {isMe ? "You" : senderName}
                    </p>

                    {/* Message bubbles */}
                    {group.map((msg, mIdx) => {
                      const isLast = mIdx === group.length - 1;
                      return (
                        <div key={msg.id} className="group/msg flex items-end gap-1.5">
                          <div
                            className={`relative px-3.5 py-2 max-w-full ${
                              isMe
                                ? "bg-[#dcf8c6] text-slate-800"
                                : "bg-white border border-slate-200 text-slate-700"
                            } ${
                              isMe
                                ? mIdx === 0
                                  ? "rounded-2xl rounded-tr-md"
                                  : "rounded-2xl rounded-r-md"
                                : mIdx === 0
                                ? "rounded-2xl rounded-tl-md"
                                : "rounded-2xl rounded-l-md"
                            } ${msg._failed ? "border-red-300 bg-red-50" : ""} shadow-sm`}
                          >
                            <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                              {renderText(msg.message)}
                            </div>
                            <div
                              className={`flex items-center gap-1 mt-1 ${
                                isMe ? "justify-end" : "justify-start"
                              }`}
                            >
                              <span className="text-[10px] text-slate-400 font-medium">
                                {formatTime(msg.created_at)}
                              </span>
                              {isMe && (
                                <>
                                  {msg._failed ? (
                                    <button
                                      onClick={() => retryMessage(msg.id)}
                                      className="text-[10px] text-red-500 font-bold hover:underline"
                                      title="Retry"
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
                      );
                    })}
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
              // Auto-grow textarea
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
            {isSending ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Send size={15} className="-ml-0.5" />
            )}
          </button>
        </form>
        <p className="text-[10px] text-slate-400 mt-1.5 text-center font-medium">
          Enter to send • Shift + Enter for new line • Updates every 3 seconds
        </p>
      </div>
    </div>
  );
}