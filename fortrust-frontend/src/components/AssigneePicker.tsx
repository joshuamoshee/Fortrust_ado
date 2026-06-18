"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, Bell, BellOff, Sparkles, Star, ChevronDown, Users } from "lucide-react";

interface Agent {
  id: number | string;
  name: string;
  role?: string;
  branch?: string;
  corporation_name?: string;
  email?: string;
}

interface AssigneePickerProps {
  agents: Agent[];
  value: string[];               // currently selected assignee NAMES (first = primary)
  onChange: (newAssignees: string[]) => void;
  placeholder?: string;
  maxAssignees?: number;          // optional cap, default unlimited
  showPrimaryBadge?: boolean;     // show "★ Primary" on first chip
  compact?: boolean;              // smaller variant for inline use in tables
}

/**
 * Google Docs-style multi-assignee picker.
 * First in array = primary (gets ★ Primary badge).
 * Click outside or press Esc to close.
 */
export default function AssigneePicker({
  agents,
  value,
  onChange,
  placeholder = "Assign to...",
  maxAssignees,
  showPrimaryBadge = true,
  compact = false,
}: AssigneePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on Esc
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setSearch("");
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      setTimeout(() => searchRef.current?.focus(), 50);
    }
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen]);

  // Normalize value to a safe array
  const selected = Array.isArray(value) ? value.filter(Boolean) : [];

  // Avatar color palette — deterministic from name
  const getAvatarColor = (name: string) => {
    const colors = [
      { bg: "bg-emerald-500", text: "text-white" },
      { bg: "bg-purple-500", text: "text-white" },
      { bg: "bg-blue-500", text: "text-white" },
      { bg: "bg-amber-500", text: "text-white" },
      { bg: "bg-rose-500", text: "text-white" },
      { bg: "bg-indigo-500", text: "text-white" },
      { bg: "bg-teal-500", text: "text-white" },
      { bg: "bg-orange-500", text: "text-white" },
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const toggle = (agentName: string) => {
    const isSelected = selected.includes(agentName);
    if (isSelected) {
      onChange(selected.filter((n) => n !== agentName));
    } else {
      if (maxAssignees && selected.length >= maxAssignees) return;
      onChange([...selected, agentName]);
    }
  };

  const remove = (agentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((n) => n !== agentName));
  };

  const makePrimary = (agentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const others = selected.filter((n) => n !== agentName);
    onChange([agentName, ...others]);
  };

  // Filter + sort: selected first, then alphabetical
  const filtered = agents
    .filter((a) => {
      const q = search.toLowerCase();
      return (
        (a.name || "").toLowerCase().includes(q) ||
        (a.role || "").toLowerCase().includes(q) ||
        (a.corporation_name || "").toLowerCase().includes(q) ||
        (a.branch || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const aSel = selected.includes(a.name);
      const bSel = selected.includes(b.name);
      if (aSel && !bSel) return -1;
      if (!aSel && bSel) return 1;
      return (a.name || "").localeCompare(b.name || "");
    });

  return (
    <div ref={wrapperRef} className="relative w-full">
      {/* TRIGGER */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left bg-white border rounded-xl transition-all flex items-center gap-2 flex-wrap ${
          compact ? "px-2 py-1.5 text-xs min-h-[36px]" : "px-3 py-2.5 text-sm min-h-[46px]"
        } ${
          isOpen
            ? "border-blue-400 ring-2 ring-blue-400/20 shadow-sm"
            : "border-slate-200 hover:border-slate-300"
        }`}
      >
        {selected.length === 0 ? (
          <span className="text-slate-400 font-medium flex items-center gap-2">
            <Users size={compact ? 12 : 14} />
            {placeholder}
          </span>
        ) : (
          <>
            {selected.map((name, idx) => {
              const color = getAvatarColor(name);
              const isPrimary = idx === 0;
              return (
                <span
                  key={name}
                  className={`inline-flex items-center gap-1.5 rounded-full font-bold transition-all ${
                    compact ? "pl-0.5 pr-1.5 py-0.5 text-[10px]" : "pl-1 pr-2 py-0.5 text-xs"
                  } ${
                    isPrimary && showPrimaryBadge
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700"
                  }`}
                  title={isPrimary ? "Primary assignee" : ""}
                >
                  <span
                    className={`${color.bg} ${color.text} rounded-full flex items-center justify-center font-black ${
                      compact ? "w-4 h-4 text-[8px]" : "w-5 h-5 text-[9px]"
                    }`}
                  >
                    {getInitials(name)}
                  </span>
                  <span className="truncate max-w-[100px]">{name}</span>
                  {isPrimary && showPrimaryBadge && (
                    <Star size={compact ? 8 : 10} className="fill-yellow-300 text-yellow-300 shrink-0" />
                  )}
                  <button
                    type="button"
                    onClick={(e) => remove(name, e)}
                    className={`${
                      isPrimary && showPrimaryBadge
                        ? "hover:bg-white/20"
                        : "hover:bg-slate-200"
                    } rounded-full p-0.5 transition-colors`}
                  >
                    <X size={compact ? 10 : 12} />
                  </button>
                </span>
              );
            })}
          </>
        )}
        <ChevronDown
          size={compact ? 12 : 14}
          className={`ml-auto text-slate-400 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* DROPDOWN */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Search bar */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400/20 transition-all">
              <Search size={16} className="text-slate-400 shrink-0 mr-2" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search names, roles or teams"
                className="bg-transparent outline-none text-sm flex-1 placeholder:text-slate-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-slate-300 hover:text-slate-500 ml-2"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Selected count + max */}
          {selected.length > 0 && (
            <div className="px-4 py-2 bg-blue-50/50 border-b border-blue-100 flex items-center justify-between text-xs">
              <span className="font-bold text-blue-700">
                {selected.length} assigned
                {maxAssignees ? ` of ${maxAssignees} max` : ""}
              </span>
              {selected.length > 1 && (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-blue-600 hover:underline font-bold"
                >
                  Clear all
                </button>
              )}
            </div>
          )}

          {/* List */}
          <div className="max-h-80 overflow-y-auto custom-scrollbar">
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                {search ? `No agents matching "${search}"` : "No agents available"}
              </div>
            ) : (
              <>
                {!search && selected.length === 0 && (
                  <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50">
                    Suggested people
                  </div>
                )}
                {filtered.map((agent) => {
                  const isSelected = selected.includes(agent.name);
                  const isPrimary = isSelected && selected[0] === agent.name;
                  const color = getAvatarColor(agent.name);
                  const wouldExceedMax =
                    maxAssignees != null && !isSelected && selected.length >= maxAssignees;

                  return (
                    <div
                      key={agent.id}
                      className={`flex items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer ${
                        wouldExceedMax
                          ? "opacity-40 cursor-not-allowed"
                          : isSelected
                          ? "bg-emerald-50 hover:bg-emerald-100"
                          : "hover:bg-slate-50"
                      }`}
                      onClick={() => !wouldExceedMax && toggle(agent.name)}
                    >
                      <div
                        className={`${color.bg} ${color.text} rounded-full w-9 h-9 flex items-center justify-center font-black text-xs shrink-0 shadow-sm`}
                      >
                        {getInitials(agent.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 text-sm truncate">{agent.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {agent.role}
                          {agent.branch ? ` · ${agent.branch}` : ""}
                          {agent.corporation_name ? ` · ${agent.corporation_name}` : ""}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="flex items-center gap-1 shrink-0">
                          {isPrimary ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                              <Star size={10} className="fill-yellow-300 text-yellow-300" />
                              Primary
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => makePrimary(agent.name, e)}
                              className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 bg-white border border-emerald-200 hover:border-emerald-400 rounded-full px-2 py-0.5 transition-colors"
                              title="Make primary assignee"
                            >
                              Make primary
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
              <Bell size={12} className="text-blue-500" />
              Assignees will be notified
            </div>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setSearch("");
              }}
              className="text-[11px] font-bold text-slate-600 hover:text-slate-800 px-2 py-1 rounded transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}