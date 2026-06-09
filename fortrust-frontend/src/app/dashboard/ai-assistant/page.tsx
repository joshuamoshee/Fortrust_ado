"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles, Send, Loader2, MessageSquare, Lightbulb, RefreshCw,
  Bot, User, Building2, GraduationCap, Globe, DollarSign, ShieldCheck
} from "lucide-react";

const SUGGESTED_QUESTIONS = [
  { icon: <Globe size={14} />, q: "Which universities do we partner with in Australia?" },
  { icon: <GraduationCap size={14} />, q: "Show me business programs we offer" },
  { icon: <DollarSign size={14} />, q: "What's our commission rate for UK institutions?" },
  { icon: <Building2 size={14} />, q: "List all our active university partners" },
  { icon: <ShieldCheck size={14} />, q: "Do we have agreements in Canada?" },
  { icon: <Globe size={14} />, q: "Which schools accept students for engineering?" },
];

type ChatMessage = { role: "user" | "assistant"; content: string; timestamp: string };

export default function AIAssistantPage() {
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("fortrust_user");
    if (stored) setUser(JSON.parse(stored));

    // Restore previous conversation
    const savedChat = localStorage.getItem("fortrust_ai_assistant_chat");
    if (savedChat) {
      try {
        const parsed = JSON.parse(savedChat);
        if (Array.isArray(parsed)) setMessages(parsed);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("fortrust_ai_assistant_chat", JSON.stringify(messages));
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const messageText = (text || input).trim();
    if (!messageText || loading) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: messageText,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agent/ai-assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          message: messageText,
          history: [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
        })
      });
      const data = await res.json();

      if (data.status === "success") {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: data.response,
          timestamp: new Date().toISOString()
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "I had trouble looking that up. Could you rephrase, or try again in a moment?",
          timestamp: new Date().toISOString()
        }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "⚠️ Network error connecting to the AI service. Please check your connection.",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const clearChat = () => {
    if (messages.length === 0) return;
    if (window.confirm("Clear this conversation? This can't be undone.")) {
      setMessages([]);
      localStorage.removeItem("fortrust_ai_assistant_chat");
    }
  };

  // Simple markdown-ish formatter for AI responses
  const formatMessage = (text: string) => {
    // Bold **text** → <strong>
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#282860]">$1</strong>');
    // Bullets at start of line
    formatted = formatted.replace(/^[\*\-•]\s+(.+)$/gm, '<div class="flex gap-2 my-1"><span class="text-[#BAD133] font-bold mt-0.5">•</span><span>$1</span></div>');
    // Numbered items 1. text
    formatted = formatted.replace(/^(\d+)\.\s+(.+)$/gm, '<div class="flex gap-2 my-1"><span class="text-[#BAD133] font-black">$1.</span><span>$2</span></div>');
    // Line breaks
    formatted = formatted.replace(/\n\n/g, '<br/><br/>');
    formatted = formatted.replace(/\n/g, '<br/>');
    return formatted;
  };

  return (
    <div className="p-2 lg:p-6 max-w-5xl mx-auto w-full">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[calc(100vh-140px)] min-h-[600px]">

        {/* ===== Header ===== */}
        <div className="bg-gradient-to-r from-[#1b1b42] via-[#282860] to-[#1b1b42] p-5 lg:p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#BAD133] rounded-full blur-[100px] opacity-10 -mr-20 -mt-20"></div>

          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-start gap-3">
              <div className="bg-[#BAD133] p-3 rounded-2xl shadow-lg">
                <Bot className="text-[#1b1b42]" size={26} />
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-black flex items-center gap-2">
                  Partnership Assistant
                  <Sparkles className="text-[#BAD133]" size={18} />
                </h1>
                <p className="text-xs lg:text-sm text-slate-300 mt-1 max-w-md">
                  Ask anything about Fortrust's university agreements — countries, programs, commissions, contacts.
                </p>
              </div>
            </div>
            <button onClick={clearChat}
              className="text-slate-300 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-1.5 text-xs font-bold"
              title="Clear conversation">
              <RefreshCw size={14} /> <span className="hidden sm:inline">Clear</span>
            </button>
          </div>
        </div>

        {/* ===== Messages ===== */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 bg-gradient-to-b from-slate-50 to-white">

          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <div className="bg-gradient-to-br from-[#BAD133]/20 to-[#282860]/10 w-20 h-20 rounded-3xl flex items-center justify-center mb-5 shadow-inner">
                <MessageSquare className="text-[#282860]" size={32} />
              </div>
              <h3 className="text-xl font-black text-[#282860]">Hi {user?.name?.split(" ")[0] || "there"} 👋</h3>
              <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                I'm your AI assistant for Fortrust's partnership network. Ask me about agreements, programs, or commissions — I'll search our database instantly.
              </p>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 mt-6 mb-4 inline-flex items-center gap-2">
                <Lightbulb size={14} className="text-amber-600" />
                <span className="text-xs font-bold text-amber-700">Try one of these:</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl w-full mt-2">
                {SUGGESTED_QUESTIONS.map((s, i) => (
                  <button key={i} onClick={() => sendMessage(s.q)}
                    className="text-left bg-white border border-slate-200 hover:border-[#BAD133] hover:bg-[#BAD133]/5 hover:shadow-md p-3 rounded-xl text-xs font-medium text-slate-600 transition-all flex items-start gap-2 group">
                    <span className="text-[#BAD133] mt-0.5 group-hover:scale-110 transition-transform">{s.icon}</span>
                    <span className="flex-1">{s.q}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2`}>

                  {msg.role === "assistant" && (
                    <div className="bg-gradient-to-br from-[#BAD133] to-[#9bb029] p-2 rounded-xl h-fit shrink-0 shadow-md">
                      <Bot size={16} className="text-[#1b1b42]" />
                    </div>
                  )}

                  <div className={`max-w-[85%] lg:max-w-[75%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                    <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      msg.role === "user"
                        ? "bg-[#282860] text-white rounded-tr-sm"
                        : "bg-white border border-slate-200 text-slate-700 rounded-tl-sm"
                    }`}>
                      {msg.role === "user" ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 px-2">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {msg.role === "user" && (
                    <div className="bg-[#282860] p-2 rounded-xl h-fit shrink-0 shadow-md">
                      <User size={16} className="text-white" />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-3 justify-start animate-in fade-in">
                  <div className="bg-gradient-to-br from-[#BAD133] to-[#9bb029] p-2 rounded-xl h-fit shadow-md">
                    <Bot size={16} className="text-[#1b1b42]" />
                  </div>
                  <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-sm shadow-sm">
                    <div className="flex gap-1.5 items-center">
                      <span className="w-2 h-2 bg-[#BAD133] rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                      <span className="w-2 h-2 bg-[#BAD133] rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                      <span className="w-2 h-2 bg-[#BAD133] rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                      <span className="text-xs text-slate-400 ml-2 italic">Searching partner database...</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div ref={messagesEndRef}></div>
        </div>

        {/* ===== Input ===== */}
        <div className="border-t border-slate-100 p-3 lg:p-4 bg-white">
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
            className="flex gap-2 items-center bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5 focus-within:border-[#BAD133] focus-within:bg-white focus-within:shadow-md transition-all">
            <Sparkles size={16} className="text-[#BAD133] shrink-0" />
            <input ref={inputRef} type="text" value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={loading ? "Thinking..." : "Ask me about partnerships, programs, commissions..."}
              disabled={loading}
              className="flex-1 bg-transparent outline-none text-sm text-slate-700 placeholder-slate-400 py-2.5 disabled:opacity-50" />
            <button type="submit" disabled={loading || !input.trim()}
              className="bg-[#282860] hover:bg-[#1b1b42] text-white p-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[44px]">
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
            </button>
          </form>
          <div className="flex justify-between items-center mt-2 px-1">
            <p className="text-[10px] text-slate-400">
              Answers based on Fortrust's institution database. Verify critical details.
            </p>
            {messages.length > 0 && (
              <p className="text-[10px] text-slate-400 font-bold">
                {messages.length} messages
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}