"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Sparkles, X, Send, Loader2, Bot, User, Minimize2, 
  Maximize2, MessageCircle, AlertCircle, Building 
} from "lucide-react";

// Strip markdown so AI messages render clean like a WhatsApp chat
function cleanForChat(text: string): string {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')   // **bold** → bold
    .replace(/\*(.*?)\*/g, '$1')       // *italic* → italic
    .replace(/__(.*?)__/g, '$1')       // __bold__ → bold
    .replace(/_(.*?)_/g, '$1')         // _italic_ → italic
    .replace(/`(.*?)`/g, '$1')         // `code` → code
    .replace(/^#{1,6}\s+/gm, '')       // ## headers → plain
    .replace(/^\s*[-*+]\s+/gm, '• ')   // - bullets → • bullets
    .replace(/\n{3,}/g, '\n\n');       // collapse extra blank lines
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export default function AIAssistantFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [partnerCount, setPartnerCount] = useState<number | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  // Welcome message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: "👋 Hi! I'm your Fortrust Partnership Assistant. Ask me anything about our partner universities — programs, commission rates, contacts, requirements. I have access to Fortrust's full partnership database.\n\nTry asking:\n• \"Which Australian universities do we partner with?\"\n• \"What's the commission rate for ANU?\"\n• \"Show me design programs in New Zealand\"\n• \"Who's the contact at Massey University?\"",
        timestamp: new Date().toISOString()
      }]);
    }
  }, [isOpen, messages.length]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const token = localStorage.getItem("fortrust_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agent/ai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          message: userMsg.content,
          history: messages.slice(-6).map(m => ({ role: m.role, content: m.content }))
        })
      });

      const data = await res.json();

      if (res.ok && data.status === "success") {
        if (data.institutions_count !== undefined) {
          setPartnerCount(data.institutions_count);
        }
        setMessages(prev => [...prev, {
          role: "assistant",
          content: data.response || "I couldn't generate a response. Try rephrasing your question.",
          timestamp: new Date().toISOString()
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `⚠️ ${data.detail || "Sorry, I encountered an error. Please try again."}`,
          timestamp: new Date().toISOString()
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "⚠️ Network error — couldn't reach the AI service. Check your connection and try again.",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    if (window.confirm("Clear conversation history?")) {
      setMessages([]);
    }
  };

  // Quick suggestion chips
  const suggestions = [
    "Which universities are in Australia?",
    "What's the ANU commission rate?",
    "Show design programs",
    "List Canadian partners"
  ];

  return (
    <>
      {/* FAB BUTTON — always visible bottom-right */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 group flex items-center gap-3"
          aria-label="Open AI Assistant"
        >
          {/* Pulse animation ring */}
          <div className="absolute inset-0 right-0 w-16 h-16 ml-auto bg-[#BAD133] rounded-full animate-ping opacity-20"></div>
          
          {/* Tooltip on hover */}
          <span className="bg-[#1b1b42] text-white text-xs font-bold px-3 py-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Ask AI Assistant
          </span>
          
          {/* Main button */}
          <div className="relative w-16 h-16 bg-[#282860] hover:bg-[#1b1b42] rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 border-4 border-white">
            <Sparkles className="text-[#BAD133]" size={26}/>
            {partnerCount !== null && partnerCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#BAD133] text-[#1b1b42] text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">
                {partnerCount}
              </span>
            )}
          </div>
        </button>
      )}

      {/* CHAT PANEL */}
      {isOpen && (
        <div className={`fixed z-50 transition-all duration-300 ${
          isMinimized
            ? "bottom-6 right-6 w-72 h-14"
            : "bottom-6 right-6 w-[400px] h-[600px] max-h-[calc(100vh-3rem)] max-w-[calc(100vw-3rem)]"
        }`}>
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col h-full overflow-hidden">
            
            {/* HEADER */}
            <div className="bg-[#1b1b42] text-white px-4 py-3 flex items-center justify-between shrink-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#BAD133] rounded-full blur-2xl opacity-10 pointer-events-none"></div>
              
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-9 h-9 rounded-xl bg-[#BAD133]/20 border border-[#BAD133]/30 flex items-center justify-center">
                  <Sparkles size={18} className="text-[#BAD133]"/>
                </div>
                <div>
                  <p className="font-black text-sm leading-tight">Fortrust AI Assistant</p>
                  <p className="text-[10px] text-slate-300 leading-tight flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                    {partnerCount !== null ? `${partnerCount} partners loaded` : "Ready to help"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 relative z-10">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  title={isMinimized ? "Expand" : "Minimize"}
                >
                  {isMinimized ? <Maximize2 size={14}/> : <Minimize2 size={14}/>}
                </button>
                <button
                  onClick={() => { setIsOpen(false); setIsMinimized(false); }}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  title="Close"
                >
                  <X size={16}/>
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* MESSAGES */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 bg-slate-50">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        msg.role === "user"
                          ? "bg-[#282860] text-[#BAD133]"
                          : "bg-[#BAD133] text-[#1b1b42]"
                      }`}>
                        {msg.role === "user" ? <User size={14}/> : <Bot size={14}/>}
                      </div>

                      {/* Bubble */}
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                        msg.role === "user"
                          ? "bg-[#282860] text-white rounded-br-sm"
                          : "bg-white text-slate-700 border border-slate-100 shadow-sm rounded-bl-sm"
                      }`}>
                        <div className="whitespace-pre-wrap break-words leading-relaxed">
                          {msg.role === "user" ? msg.content : cleanForChat(msg.content)}
                        </div>
                        <p className={`text-[9px] mt-1 ${msg.role === "user" ? "text-slate-300" : "text-slate-400"}`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Loading indicator */}
                  {isLoading && (
                    <div className="flex gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#BAD133] text-[#1b1b42] flex items-center justify-center shrink-0">
                        <Bot size={14}/>
                      </div>
                      <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 bg-[#BAD133] rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                          <span className="w-2 h-2 bg-[#BAD133] rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                          <span className="w-2 h-2 bg-[#BAD133] rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef}/>
                </div>

                {/* QUICK SUGGESTIONS — only when empty */}
                {messages.length === 1 && !isLoading && (
                  <div className="px-4 py-2 bg-white border-t border-slate-100 shrink-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Quick Asks</p>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => setInput(s)}
                          className="text-[11px] bg-slate-50 hover:bg-[#BAD133] hover:text-[#1b1b42] text-slate-600 border border-slate-200 px-2.5 py-1 rounded-full font-bold transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* INPUT */}
                <div className="border-t border-slate-100 p-3 bg-white shrink-0">
                  <form onSubmit={handleSend} className="flex items-end gap-2">
                    <div className="flex-1 relative">
                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about a university, program, commission..."
                        rows={1}
                        disabled={isLoading}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:bg-white focus:border-[#BAD133] focus:ring-2 focus:ring-[#BAD133]/20 transition-all resize-none disabled:opacity-50"
                        style={{ maxHeight: "100px" }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className="w-10 h-10 rounded-xl bg-[#282860] hover:bg-[#1b1b42] disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors shadow-md active:scale-95 shrink-0"
                    >
                      {isLoading ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
                    </button>
                  </form>
                  
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-[9px] text-slate-400">
                      Press Enter to send, Shift + Enter for new line
                    </p>
                    {messages.length > 1 && (
                      <button
                        onClick={clearChat}
                        className="text-[9px] text-slate-400 hover:text-red-500 font-bold transition-colors"
                      >
                        Clear chat
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}