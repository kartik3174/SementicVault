import React from "react";
import { 
  ActivePage, 
  ConversationSummary 
} from "../types";
import { 
  Database, 
  MessageSquare, 
  Upload, 
  FileText, 
  Sliders, 
  Trash2, 
  Plus, 
  TrendingUp,
  ShieldAlert,
  User,
  LogOut,
  Star
} from "lucide-react";

interface SidebarProps {
  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string, e: React.MouseEvent) => void;
  onClearAllConversations: () => void;
  isOllamaConnected: boolean;
  currentUser: { id: string; username: string; role: string } | null;
  onSignOut: () => void;
}

export function Sidebar({
  activePage,
  setActivePage,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onClearAllConversations,
  isOllamaConnected,
  currentUser,
  onSignOut
}: SidebarProps) {
  
  const menuItems = [
    { id: "dashboard" as ActivePage, label: "Dashboard", icon: Database, roles: ["admin", "user", "viewer"] },
    { id: "upload" as ActivePage, label: "Upload Vault", icon: Upload, roles: ["admin", "user"] },
    { id: "chat" as ActivePage, label: "Semantic Chat", icon: MessageSquare, roles: ["admin", "user", "viewer"] },
    { id: "documents" as ActivePage, label: "Stored Chunks", icon: FileText, roles: ["admin", "user", "viewer"] },
    { id: "analytics" as ActivePage, label: "System Telemetry", icon: TrendingUp, roles: ["admin", "user", "viewer"] },
    { id: "admin" as ActivePage, label: "Admin Control", icon: ShieldAlert, roles: ["admin"] },
    { id: "settings" as ActivePage, label: "Config Dialect", icon: Sliders, roles: ["admin", "user", "viewer"] },
  ];

  const visibleMenuItems = menuItems.filter(
    item => currentUser && item.roles.includes(currentUser.role)
  );

  return (
    <aside id="sidebar-aside" className="w-64 flex flex-col h-full bg-slate-900 border-r border-slate-800 shadow-xl select-none">
      {/* Title Header Branding */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/30 border border-indigo-500/30">
            <Database className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 tracking-tight leading-none">SemanticVault</h1>
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Enterprise RAG</span>
          </div>
        </div>
      </div>

      {/* Main Pages Navigation */}
      <div className="px-3 py-4 flex flex-col gap-1 border-b border-slate-800/60">
        <span className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Navigation</span>
        {visibleMenuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 group text-left ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"
              }`}
            >
              <IconComponent className={`h-4.5 w-4.5 transition-transform duration-200 group-hover:scale-110 ${
                isActive ? "text-white" : "text-slate-400 group-hover:text-indigo-400"
              }`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Chat Thread Session Logs */}
      <div className="flex-1 flex flex-col min-h-0 px-3 py-4 overflow-y-auto">
        <div className="flex items-center justify-between px-3 mb-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">History Threads</span>
          <button
            onClick={onNewChat}
            className="flex items-center justify-center p-1 rounded-md bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all border border-indigo-500/20"
            title="Start New Conversation"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <span className="text-[11px] font-semibold text-slate-500 italic">No chat threads generated.</span>
            <button
              onClick={onNewChat}
              className="mt-2.5 px-3 py-1.5 text-[10px] font-bold text-indigo-400 bg-indigo-500/10 rounded border border-indigo-500/20 hover:bg-indigo-500 hover:text-white transition-colors"
            >
              New Conversation
            </button>
          </div>
        ) : (
          <div className="space-y-1 overflow-y-auto pr-1 scrollbar-thin">
            {conversations.map((conv) => {
              const isSelected = activeConversationId === conv.id;
              return (
                <div
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  className={`group relative flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? "bg-slate-800 text-slate-100 border border-slate-700/60"
                      : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <MessageSquare className={`h-3.5 w-3.5 flex-shrink-0 ${
                      isSelected ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-400"
                    }`} />
                    <span className="truncate pr-4 select-none">{conv.title}</span>
                  </div>
                  
                  {conv.isSaved && (
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400 mr-2 flex-shrink-0" />
                  )}

                  <button
                    onClick={(e) => onDeleteConversation(conv.id, e)}
                    className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 hover:text-red-400 text-slate-500 transition-all"
                    title="Delete Conversation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* User info status drawer */}
      {currentUser && (
        <div className="p-3 border-t border-slate-800 flex items-center justify-between gap-2.5">
          <button
            onClick={() => setActivePage("profile")}
            className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
          >
            <div className="h-7 w-7 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-sm">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black text-slate-200 truncate leading-none">{currentUser.username}</p>
              <span className="text-[8px] text-indigo-400 font-extrabold uppercase leading-none block mt-0.5">{currentUser.role}</span>
            </div>
          </button>
          <button
            onClick={onSignOut}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
            title="Sign Out Session"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Sidebar Footer (Ollama Status & Clear Option) */}
      <div className="p-4 bg-slate-950/40 border-t border-slate-800 flex flex-col gap-3">
        {conversations.length > 0 && (
          <button
            onClick={onClearAllConversations}
            className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-md border border-red-500/20 bg-red-500/5 text-[10px] font-bold text-red-400 hover:bg-red-500 hover:text-white transition-all"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Purge Chat Catalog</span>
          </button>
        )}

        {/* Local Server Connection Indicator */}
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-slate-950/80 border border-slate-800/80">
          <div className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isOllamaConnected ? "bg-emerald-400" : "bg-rose-400"
            }`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              isOllamaConnected ? "bg-emerald-500" : "bg-rose-500"
            }`}></span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-slate-200 select-none">
              OLLAMA {isOllamaConnected ? "ONLINE" : "OFFLINE"}
            </p>
            <p className="text-[9px] text-slate-500 truncate select-none leading-none mt-0.5">
              {isOllamaConnected ? "Local inference active" : "Using cloud proxy failover"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
