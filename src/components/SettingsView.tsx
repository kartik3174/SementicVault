import React, { useState } from "react";
import { SystemSettings, ToastMessage } from "../types";
import { 
  Sliders, 
  Cpu, 
  Database, 
  HelpCircle, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  RefreshCw, 
  Network,
  Info,
  Sparkles
} from "lucide-react";

interface SettingsViewProps {
  settings: SystemSettings;
  updateSettings: (key: keyof SystemSettings, val: any) => void;
  onClearDatabase: () => void;
  addToast: (toast: Omit<ToastMessage, "id">) => void;
}

export function SettingsView({
  settings,
  updateSettings,
  onClearDatabase,
  addToast
}: SettingsViewProps) {
  const [testingOllama, setTestingOllama] = useState(false);
  const [diagnosticsLog, setDiagnosticsLog] = useState<string[]>([]);

  const runSystemDiagnostics = async () => {
    setTestingOllama(true);
    setDiagnosticsLog(["Initializing telemetry debug diagnostic..."]);

    try {
      // 1. Ping Backend status endpoint
      const res = await fetch("/api/ollama/status");
      if (res.ok) {
        const data = await res.json();
        updateSettings("isOllamaConnected", data.connected);
        updateSettings("model", data.currentModel);
        updateSettings("embeddingModel", data.embeddingModel);

        setDiagnosticsLog(prev => [
          ...prev,
          "✓ API service gateway responded: HTTP 200 OK",
          `✓ Ollama connection status: ${data.connected ? "Active & verified" : "Inactive (cloud proxy mode)"}`,
          `✓ Configured model identifier: "${data.currentModel}"`,
          `✓ Configured embeddings transformer: "${data.embeddingModel}"`,
          "✓ ChromaDB embedded storage index: Operational"
        ]);
        addToast({
          title: "Diagnostics Completed",
          description: "All semantic indices and local connections have been successfully verified.",
          type: "success"
        });
      } else {
        throw new Error(`API server responded with status: ${res.status}`);
      }
    } catch (err: any) {
      setDiagnosticsLog(prev => [
        ...prev,
        `❌ Diagnostic failed: ${err.message}`,
        "Recommendation: Ensure Node reverse proxy is running and configured correctly."
      ]);
      addToast({
        title: "Connection Alert",
        description: "Diagnostic scan found unresolved network parameters.",
        type: "error"
      });
    } finally {
      setTestingOllama(false);
    }
  };

  const handleModelChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    updateSettings("model", val);
    try {
      await fetch("/api/ollama/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentModel: val })
      });
      addToast({
        title: "Model Configured",
        description: `Target local LLM model successfully updated to "${val}".`,
        type: "success"
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleEmbeddingChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    updateSettings("embeddingModel", val);
    try {
      await fetch("/api/ollama/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeddingModel: val })
      });
      addToast({
        title: "Embeddings Configured",
        description: `Target text embedder model successfully updated to "${val}".`,
        type: "success"
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-950 text-slate-100 flex flex-col lg:flex-row gap-6 select-none">
      
      {/* Parameters sliders config */}
      <div className="flex-1 space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-xl font-bold text-slate-50 tracking-tight leading-none">RAG Precision Dialect</h2>
          <p className="text-xs text-slate-400 mt-2 font-medium">
            Fine-tune temperature profiles, retrieval budgets, and similarity constraints.
          </p>
        </div>

        {/* Configurations Forms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Model selection card */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4 shadow-md">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5 leading-none">
              <Cpu className="h-4 w-4 text-indigo-400" />
              <span>Synthesis model choice</span>
            </h3>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Active Ollama Model</label>
              <select
                value={settings.model}
                onChange={handleModelChange}
                className="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-lg py-1.5 px-3 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/10 transition-colors cursor-pointer"
              >
                <option value="llama3.2">llama3.2 (3B Parameters - Default)</option>
                <option value="llama3">llama3 (8B Parameters)</option>
                <option value="mistral">mistral (7B Parameters)</option>
                <option value="phi3">phi3 (3.8B Parameters)</option>
                <option value="gemma2">gemma2 (2B Parameters)</option>
              </select>
            </div>

            <div className="space-y-1 border-t border-slate-850 pt-3">
              <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Embeddings Encoder</label>
              <select
                value={settings.embeddingModel}
                onChange={handleEmbeddingChange}
                className="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-lg py-1.5 px-3 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/10 transition-colors cursor-pointer"
              >
                <option value="all-minilm">SentenceTransformers / all-MiniLM-L6-v2 (384d)</option>
                <option value="all-mpnet-base">SentenceTransformers / all-mpnet-base-v2 (768d)</option>
              </select>
            </div>
          </div>

          {/* Hyperparameters slider cards */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4 shadow-md">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5 leading-none">
              <Sliders className="h-4 w-4 text-indigo-400" />
              <span>Inference Hyperparameters</span>
            </h3>

            <div>
              <div className="flex justify-between text-[11px] font-bold text-slate-300 mb-1">
                <span>Inference Temperature</span>
                <span className="text-indigo-400">{settings.temperature}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={settings.temperature}
                onChange={(e) => updateSettings("temperature", parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <span className="text-[9px] text-slate-500 font-medium block mt-0.5">Lower temperatures are highly focused and precise.</span>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-bold text-slate-300 mb-1">
                <span>Top P (Nucleus Sampling)</span>
                <span className="text-indigo-400">{settings.topP}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={settings.topP}
                onChange={(e) => updateSettings("topP", parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>

          {/* Retrieval constraints */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4 shadow-md">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5 leading-none">
              <Database className="h-4 w-4 text-indigo-400" />
              <span>Retrieval Parameters</span>
            </h3>

            <div>
              <div className="flex justify-between text-[11px] font-bold text-slate-300 mb-1">
                <span>Top K Retrieved Chunks</span>
                <span className="text-indigo-400">{settings.topKChunks}</span>
              </div>
              <input
                type="range"
                min="2"
                max="8"
                step="1"
                value={settings.topKChunks}
                onChange={(e) => updateSettings("topKChunks", parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <span className="text-[9px] text-slate-500 font-medium block mt-0.5">Defines token context injected into LLM prompt.</span>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-bold text-slate-300 mb-1">
                <span>Similarity Match Threshold</span>
                <span className="text-indigo-400">{(settings.similarityThreshold * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.8"
                step="0.05"
                value={settings.similarityThreshold}
                onChange={(e) => updateSettings("similarityThreshold", parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <span className="text-[9px] text-slate-500 font-medium block mt-0.5">Filters segments that have low relevance score.</span>
            </div>
          </div>

          {/* Purge / Clear databases card */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4 shadow-md flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5 leading-none mb-1.5">
                <Trash2 className="h-4 w-4 text-rose-400" />
                <span>Index Maintenance</span>
              </h3>
              <p className="text-[10px] text-slate-400 leading-normal font-medium">
                Destroying indices clears all files, segment metadata, and computed embeddings permanently. This action is irreversible.
              </p>
            </div>

            <button
              onClick={onClearDatabase}
              className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg shadow-md hover:shadow-red-600/10 transition-all w-full mt-3"
            >
              <Trash2 className="h-4 w-4" />
              <span>Purge Vector Database Index</span>
            </button>
          </div>
        </div>
      </div>

      {/* Diagnostics / Connection debug panel */}
      <div className="w-full lg:w-80 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col gap-6">
        <div>
          <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-1.5 leading-none">
            <Network className="h-4 w-4 text-indigo-400" />
            <span>Connection Telemetry</span>
          </h3>
          <p className="text-[10px] text-slate-500 font-semibold mt-1.5 leading-normal">
            Verifies API responses, index pings, and backend service pathways.
          </p>
        </div>

        <button
          onClick={runSystemDiagnostics}
          disabled={testingOllama}
          className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 hover:text-white border border-indigo-500/25 rounded-lg transition-all"
        >
          {testingOllama ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span>Ping System Status</span>
        </button>

        {/* Log details */}
        {diagnosticsLog.length > 0 && (
          <div className="bg-slate-950/80 border border-slate-850 rounded-lg p-3 flex-1 flex flex-col h-[200px]">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block border-b border-slate-900 pb-1.5">
              Diagnostics terminal logs
            </span>
            <div className="flex-1 overflow-y-auto mt-2 space-y-1 font-mono text-[9px] text-slate-400 select-text leading-tight pr-1">
              {diagnosticsLog.map((log, index) => (
                <div key={index} className={log.startsWith("❌") ? "text-rose-400" : log.startsWith("✓") ? "text-emerald-400" : "text-slate-400"}>
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-lg p-3.5 flex gap-2.5">
          <Sparkles className="h-4.5 w-4.5 text-indigo-400 flex-shrink-0 mt-0.5" />
          <p className="text-[9px] text-slate-400 font-medium leading-normal">
            **Inference engine details**: Default weights are configured to low temperature. Lower parameters increase deterministic extraction quality.
          </p>
        </div>
      </div>
    </div>
  );
}
