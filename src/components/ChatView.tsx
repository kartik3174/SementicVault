import React, { useRef, useEffect, useState } from "react";
import { 
  ChatMessage, 
  CitationItem, 
  SystemSettings 
} from "../types";
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Copy, 
  Check, 
  RotateCcw, 
  Sparkles, 
  BookOpen, 
  Layers, 
  Database,
  Sliders,
  Star,
  Tag,
  FileText,
  Settings,
  X
} from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface ChatViewProps {
  messages: ChatMessage[];
  activeConversationId: string | null;
  onSendMessage: (text: string, filters?: any) => void;
  querying: boolean;
  settings: SystemSettings;
  updateSettings: (key: keyof SystemSettings, val: any) => void;
  onRegenerate: () => void;
  token: string | null;
  addToast: (msg: any) => void;
}

export function ChatView({
  messages,
  activeConversationId,
  onSendMessage,
  querying,
  settings,
  updateSettings,
  onRegenerate,
  token,
  addToast
}: ChatViewProps) {
  const [inputText, setInputText] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [focusedCitation, setFocusedCitation] = useState<CitationItem | null>(null);
  
  // Metadata filters drawer state
  const [showFilters, setShowFilters] = useState(false);
  const [filterTag, setFilterTag] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterFilename, setFilterFilename] = useState("");

  // Saved threads toggle state
  const [isSaved, setIsSaved] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, querying]);

  // Synchronize thread saved status
  useEffect(() => {
    if (activeConversationId) {
      checkThreadStatus();
    } else {
      setIsSaved(false);
    }
  }, [activeConversationId]);

  const checkThreadStatus = async () => {
    try {
      const res = await fetch("/api/history", {
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const list = await res.json();
        const found = list.find((c: any) => c.id === activeConversationId);
        if (found) {
          setIsSaved(found.isSaved);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || querying) return;
    onSendMessage(inputText, {
      filter_tag: filterTag || undefined,
      filter_type: filterType || undefined,
      filter_filename: filterFilename || undefined
    });
    setInputText("");
  };

  const copyMessageToClipboard = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(msgId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const toggleSaveConversation = async () => {
    if (!activeConversationId) return;
    try {
      const response = await fetch(`/api/history/${activeConversationId}/save`, {
        method: "POST",
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      });
      if (response.ok) {
        const data = await response.json();
        setIsSaved(data.isSaved);
        addToast({
          title: data.isSaved ? "Thread Bookmarked" : "Thread Removed",
          description: "Dialogue status updated.",
          type: "success"
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full bg-slate-950 text-slate-100 min-h-0 select-none">
      
      {/* Main chat dialogue panel */}
      <div className="flex-1 flex flex-col h-full min-w-0 border-r border-slate-900">
        
        {/* Active conversation details bar */}
        <div className="px-5 py-3 border-b border-slate-900 bg-slate-950/40 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-7 w-7 rounded-md bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                <Bot className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-slate-100 truncate">
                  {activeConversationId ? "Active Grounding Thread" : "New Secure Workspace"}
                </h3>
                <p className="text-[10px] text-slate-500 truncate leading-none mt-0.5">
                  Target model: **{settings.model}**
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeConversationId && (
                <button
                  onClick={toggleSaveConversation}
                  className={`p-1.5 rounded-lg border flex items-center justify-center transition-all ${
                    isSaved
                      ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-750 hover:text-slate-200"
                  }`}
                  title={isSaved ? "Saved Conversation" : "Bookmark Conversation"}
                >
                  <Star className={`h-3.5 w-3.5 ${isSaved ? "fill-current" : ""}`} />
                </button>
              )}

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-1.5 rounded-lg border flex items-center justify-center gap-1.5 transition-all text-xs font-bold ${
                  showFilters || filterTag || filterType || filterFilename
                    ? "bg-indigo-600/15 border-indigo-500 text-indigo-400"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-750 hover:text-slate-200"
                }`}
                title="Configure Metadata Filters"
              >
                <Sliders className="h-3.5 w-3.5" />
                <span>Filters</span>
              </button>

              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-bold">
                <Database className="h-3.5 w-3.5 text-indigo-400" />
                <span>Context: Top-{settings.topKChunks}</span>
              </div>
            </div>
          </div>

          {/* Metadata Filters expandable drawer */}
          {showFilters && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-inner relative animate-fade-in">
              <button
                onClick={() => setShowFilters(false)}
                className="absolute top-2.5 right-2.5 text-slate-500 hover:text-slate-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              <div className="flex items-center gap-1.5 text-[10px] text-indigo-400 font-black uppercase">
                <Settings className="h-3.5 w-3.5" />
                <span>Grounded Metadata Partition Controls</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[9px] text-slate-500 font-black uppercase block mb-1">Filter by Tag</label>
                  <div className="relative">
                    <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-600" />
                    <input
                      type="text"
                      value={filterTag}
                      onChange={(e) => setFilterTag(e.target.value)}
                      placeholder="e.g. quarterly"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-[10px] text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] text-slate-500 font-black uppercase block mb-1">Filter by Type</label>
                  <div className="relative">
                    <FileText className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-600" />
                    <input
                      type="text"
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      placeholder="e.g. PDF, TXT"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-[10px] text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] text-slate-500 font-black uppercase block mb-1">Filter by Name</label>
                  <div className="relative">
                    <BookOpen className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-600" />
                    <input
                      type="text"
                      value={filterFilename}
                      onChange={(e) => setFilterFilename(e.target.value)}
                      placeholder="e.g. manual"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-[10px] text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {(filterTag || filterType || filterFilename) && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => { setFilterTag(""); setFilterType(""); setFilterFilename(""); }}
                    className="text-[9px] text-indigo-400 font-bold hover:underline"
                  >
                    Clear Active Filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Message timeline viewport */}
        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 scrollbar-thin">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full max-w-sm mx-auto text-center">
              <div className="h-12 w-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 mb-4 animate-bounce">
                <Sparkles className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-200">Start Grounded Reasoning</h4>
              <p className="text-[11px] text-slate-400 mt-1 font-medium leading-normal">
                Ask a specific question. The pipeline will automatically retrieve corresponding chunks from ChromaDB, synthesize an in-context prompt, and generate a secure streaming answer.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, index) => {
                const isAssistant = msg.role === "assistant";
                return (
                  <div key={msg.id || index} className="flex gap-4 animate-fade-in">
                    {/* User / Bot Avatar */}
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center border shadow-sm flex-shrink-0 ${
                      isAssistant 
                        ? "bg-indigo-600/10 border-indigo-500/20 text-indigo-400" 
                        : "bg-slate-800 border-slate-700 text-slate-300"
                    }`}>
                      {isAssistant ? <Bot className="h-4.5 w-4.5" /> : <User className="h-4.5 w-4.5" />}
                    </div>

                    {/* Dialogue content container */}
                    <div className="flex-1 space-y-3 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-slate-300 uppercase tracking-wider">
                          {isAssistant ? "SemanticVault" : "User Workspace"}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-slate-500 font-semibold">{msg.timestamp}</span>
                          <button
                            onClick={() => copyMessageToClipboard(msg.content, msg.id)}
                            className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-900 transition-colors"
                            title="Copy message content"
                          >
                            {copiedMessageId === msg.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Rendered content */}
                      <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-4 shadow-sm hover:border-slate-800 transition-colors select-text">
                        <MarkdownRenderer content={msg.content} />
                      </div>

                      {/* Performance indicators */}
                      {isAssistant && msg.latency_sec !== undefined && (
                        <div className="text-[9px] font-mono text-slate-500 flex gap-3">
                          <span>Latency: <strong className="text-slate-400">{msg.latency_sec}s</strong></span>
                          <span>Tokens: <strong className="text-slate-400">{msg.tokens_generated || "cache"}</strong></span>
                        </div>
                      )}

                      {/* Grounded Citation Badges */}
                      {isAssistant && msg.citations && msg.citations.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block flex items-center gap-1">
                            <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
                            <span>Grounded Citations ({msg.citations.length})</span>
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {msg.citations.map((cite, cIdx) => (
                              <button
                                key={cIdx}
                                onClick={() => setFocusedCitation(cite)}
                                className={`text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all shadow-sm ${
                                  focusedCitation?.chunk_id === cite.chunk_id
                                    ? "bg-indigo-600 border-indigo-500 text-white"
                                    : "bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-slate-750 text-slate-300"
                                }`}
                              >
                                <span className="max-w-[120px] truncate">{cite.filename}</span>
                                <span className="opacity-60">• p.{cite.page}</span>
                                <span className="opacity-60">({(cite.similarity_score * 100).toFixed(0)}%)</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {/* Query active loading states */}
              {querying && (
                <div className="flex gap-4">
                  <div className="h-8 w-8 rounded-lg bg-indigo-600/10 border-indigo-500/20 text-indigo-400 flex items-center justify-center animate-spin">
                    <Loader2 className="h-4.5 w-4.5" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none block">Retrieval Active</span>
                    <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-4 shadow-sm max-w-[160px] animate-pulse">
                      <div className="h-2 bg-slate-800 rounded w-12 mb-1.5"></div>
                      <div className="h-2 bg-slate-800 rounded w-24"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input box form container */}
        <div className="p-4 border-t border-slate-900 bg-slate-950/40">
          <form onSubmit={handleSend} className="relative flex items-center bg-slate-900 border border-slate-800 rounded-xl focus-within:border-indigo-600/80 transition-all shadow-md px-3.5 py-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask questions about securely stored files..."
              className="flex-1 bg-transparent border-0 text-slate-200 text-xs focus:ring-0 placeholder-slate-500 pr-12 h-8 select-text"
              disabled={querying}
            />
            
            <div className="absolute right-2 flex items-center gap-1.5">
              {messages.length > 1 && !querying && (
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                  title="Regenerate last response"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
              <button
                type="submit"
                disabled={querying || !inputText.trim()}
                className={`p-1.5 rounded-lg text-white transition-all shadow-md flex items-center justify-center ${
                  querying || !inputText.trim()
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-transparent"
                    : "bg-indigo-600 hover:bg-indigo-500 hover:scale-105"
                }`}
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Side drawer displaying focused citation details */}
      {focusedCitation && (
        <div className="w-full md:w-80 bg-slate-900 p-5 flex flex-col h-[300px] md:h-full overflow-y-auto border-t md:border-t-0 md:border-l border-slate-800/80 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-indigo-400" />
              <span>Citation Inspector</span>
            </h3>
            <button
              onClick={() => setFocusedCitation(null)}
              className="text-[10px] font-bold text-slate-400 bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded transition-colors"
            >
              Close
            </button>
          </div>

          <div className="mt-4 space-y-4 flex-1">
            <div className="space-y-1.5 bg-slate-950/80 p-3 rounded-lg border border-slate-800">
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold">
                <span>FILE NAME:</span>
                <span className="text-indigo-400 font-bold max-w-[130px] truncate">{focusedCitation.filename}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold">
                <span>PAGE:</span>
                <span className="text-slate-200 font-bold">{focusedCitation.page}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold">
                <span>RELEVANCY RANK:</span>
                <span className="text-emerald-400 font-black">{(focusedCitation.similarity_score * 100).toFixed(1)}%</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-indigo-400" />
                <span>Extracted Vector Block</span>
              </span>
              <div className="bg-slate-950/60 rounded-lg p-3.5 border border-slate-800 max-h-[220px] overflow-y-auto text-slate-300 font-mono text-[10px] leading-relaxed select-text">
                {focusedCitation.text}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
