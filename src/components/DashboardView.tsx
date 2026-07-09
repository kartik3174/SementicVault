import React from "react";
import { DocumentItem } from "../types";
import { 
  Cpu, 
  FileText, 
  Layers, 
  TrendingUp, 
  Database, 
  CheckCircle, 
  XCircle, 
  ArrowRight,
  BookOpen,
  Network
} from "lucide-react";

interface DashboardViewProps {
  documents: DocumentItem[];
  isOllamaConnected: boolean;
  selectedModel: string;
  selectedEmbedding: string;
  latency?: number;
  tokensCount?: number;
  setActivePage: (page: any) => void;
}

export function DashboardView({
  documents,
  isOllamaConnected,
  selectedModel,
  selectedEmbedding,
  latency = 0.42,
  tokensCount = 380,
  setActivePage
}: DashboardViewProps) {
  
  // Compute metrics from documents
  const totalDocsCount = documents.length;
  const totalChunksCount = documents.reduce((acc, doc) => acc + (doc.chunksCount || 0), 0);
  const totalVectorCount = totalChunksCount; // 1-to-1 mapping
  const embeddingDimension = selectedEmbedding === "all-minilm" ? 384 : 768;

  // Last 3 documents uploaded
  const recentDocs = [...documents]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 3);

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-950 text-slate-100 space-y-8 select-none">
      {/* Welcome Title Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-50 tracking-tight leading-none">RAG Performance Monitor</h2>
          <p className="text-xs text-slate-400 mt-2 font-medium">
            Real-time analytics, diagnostic telemetry, and node indicators of SemanticVault.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300">ChromaDB Online</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
            <span className={`h-1.5 w-1.5 rounded-full ${isOllamaConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400 animate-pulse"}`}></span>
            <span className="text-slate-300">Ollama {isOllamaConnected ? "Connected" : "Offline"}</span>
          </div>
        </div>
      </div>

      {/* Bento Grid Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none block">Documents Vault</span>
            <span className="text-3xl font-black text-slate-50 mt-2 block leading-none">{totalDocsCount}</span>
            <span className="text-[10px] text-slate-500 font-semibold mt-1.5 block">Stored references</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <FileText className="h-6 w-6" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none block">Recursive Chunks</span>
            <span className="text-3xl font-black text-slate-50 mt-2 block leading-none">{totalChunksCount}</span>
            <span className="text-[10px] text-slate-500 font-semibold mt-1.5 block">Segment partitions</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Layers className="h-6 w-6" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none block">Vector Dimensions</span>
            <span className="text-3xl font-black text-slate-50 mt-2 block leading-none">{embeddingDimension}d</span>
            <span className="text-[10px] text-slate-500 font-semibold mt-1.5 block">Dense vector shape</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Database className="h-6 w-6" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none block">Response Speed</span>
            <span className="text-3xl font-black text-slate-50 mt-2 block leading-none">{latency ? `${latency}s` : "0.5s"}</span>
            <span className="text-[10px] text-slate-500 font-semibold mt-1.5 block">Simulated latency</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Lower Section split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* RAG pipeline conceptual Flow Chart Map */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100 tracking-tight flex items-center gap-2">
              <Cpu className="h-4 w-4 text-indigo-400" />
              <span>Grounded Inference Architecture Pipeline</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 font-medium leading-normal">
              How queries are securely analyzed, converted into semantic representations, matched against local indices, and synthesized by the language model.
            </p>
          </div>

          <div className="my-6 grid grid-cols-1 sm:grid-cols-5 gap-3 items-center relative">
            {/* Step 1 */}
            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-center flex flex-col items-center gap-1 shadow-md">
              <FileText className="h-5 w-5 text-indigo-400 mb-1" />
              <span className="text-[10px] font-bold text-slate-200">Parse Document</span>
              <span className="text-[8px] text-slate-500 font-medium">Extraction</span>
            </div>
            
            <div className="hidden sm:flex justify-center text-slate-600"><ArrowRight className="h-4.5 w-4.5" /></div>

            {/* Step 2 */}
            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-center flex flex-col items-center gap-1 shadow-md">
              <Layers className="h-5 w-5 text-indigo-400 mb-1" />
              <span className="text-[10px] font-bold text-slate-200">Segment Text</span>
              <span className="text-[8px] text-slate-500 font-medium">Recursive character</span>
            </div>

            <div className="hidden sm:flex justify-center text-slate-600"><ArrowRight className="h-4.5 w-4.5" /></div>

            {/* Step 3 */}
            <div className="p-3.5 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-center flex flex-col items-center gap-1 shadow-md">
              <Database className="h-5 w-5 text-indigo-400 mb-1" />
              <span className="text-[10px] font-bold text-indigo-300">ChromaDB Index</span>
              <span className="text-[8px] text-indigo-500 font-medium">Cosine search</span>
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Index Status</span>
              <span className="text-xs text-indigo-400 font-bold block">{totalVectorCount} text chunks cataloged in vector index</span>
            </div>
            <button
              onClick={() => setActivePage("chat")}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md hover:shadow-indigo-600/10 transition-all flex items-center justify-center gap-1.5"
            >
              <span>Test Grounding</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Recent Documents side panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100 tracking-tight flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-indigo-400" />
              <span>Recent Library Uploads</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 font-medium leading-normal mb-4">
              Recently processed references inside the repository database.
            </p>

            {recentDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 border border-dashed border-slate-800 rounded-lg text-center bg-slate-950/40">
                <FileText className="h-7 w-7 text-slate-600 mb-2" />
                <span className="text-[11px] text-slate-400 font-semibold">No documents uploaded.</span>
                <button
                  onClick={() => setActivePage("upload")}
                  className="mt-2 text-[10px] font-bold text-indigo-400 hover:underline"
                >
                  Upload now
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg flex items-center justify-between shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-slate-200 truncate block leading-tight">{doc.name}</span>
                      <span className="text-[9px] text-slate-500 font-semibold block uppercase mt-0.5">
                        {doc.chunksCount} chunks • {(doc.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <span className="text-[9px] text-emerald-400 bg-emerald-400/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md font-bold">
                      Indexed
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {documents.length > 3 && (
            <button
              onClick={() => setActivePage("documents")}
              className="mt-4 text-center text-[10px] font-bold text-indigo-400 hover:underline block"
            >
              View all {documents.length} documents
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
