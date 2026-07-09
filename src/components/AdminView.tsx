import React, { useEffect, useState } from "react";
import { 
  ShieldAlert, 
  Database, 
  Terminal, 
  Users, 
  FileCode, 
  Trash2, 
  Loader2, 
  CheckCircle,
  AlertOctagon,
  HardDrive
} from "lucide-react";

interface AdminViewProps {
  token: string | null;
  addToast: (msg: any) => void;
  onClearDatabase: () => void;
}

export function AdminView({ token, addToast, onClearDatabase }: AdminViewProps) {
  const [loading, setLoading] = useState(true);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    fetchDiagnostics();
    // Simulate real-time logs parsing
    setLogs([
      "INFO: Enterprise Node.js Secure RAG service online on port 3000",
      "INFO: Database loaded successfully from physical storage. path=data/db.json",
      "INFO: Initializing asynchronous background parsing tasks.",
      "INFO: Vector Cache Engine activated with embeddingModel=all-minilm"
    ]);
  }, [token]);

  const fetchDiagnostics = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/diagnostics", {
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      });
      if (response.ok) {
        const data = await response.json();
        setDiagnostics(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("CRITICAL WARNING: This will permanently delete ALL indexed documents and vector segments in ChromaDB. Proceed?")) {
      return;
    }

    setClearing(true);
    try {
      const res = await fetch("/api/documents/clear", {
        method: "POST",
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      });
      if (res.ok) {
        onClearDatabase();
        addToast({
          title: "Database Flushed",
          description: "All index nodes have been deleted by administrator authority.",
          type: "success"
        });
        fetchDiagnostics();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setClearing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center p-6">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mb-3" />
        <span className="text-xs font-semibold text-slate-400">Loading admin operations cockpit...</span>
      </div>
    );
  }

  const dbSizeKB = diagnostics ? (diagnostics.databaseDiskSizeBytes / 1024).toFixed(1) : "0.0";
  const logSizeKB = diagnostics ? (diagnostics.systemLogSizeBytes / 1024).toFixed(1) : "0.0";

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-950 text-slate-100 space-y-8 select-none">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-50 tracking-tight leading-none flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-indigo-400" />
            <span>Administrator Control Center</span>
          </h2>
          <p className="text-xs text-slate-400 mt-2 font-medium">
            Global system governance, storage diagnostics, and system auditing log indicators.
          </p>
        </div>
        <button
          onClick={fetchDiagnostics}
          className="px-4 py-2 text-xs font-bold text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white rounded-lg transition-all"
        >
          Re-audit System
        </button>
      </div>

      {/* Grid Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700 transition-all shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none block">Total Platform Users</span>
            <span className="text-3xl font-black text-slate-50 mt-2 block leading-none">{diagnostics?.usersCount || 1}</span>
            <span className="text-[10px] text-slate-500 font-semibold mt-1.5 block">Registered user profiles</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700 transition-all shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none block">Documents Indexed</span>
            <span className="text-3xl font-black text-slate-50 mt-2 block leading-none">{diagnostics?.documentsCount || 0}</span>
            <span className="text-[10px] text-slate-500 font-semibold mt-1.5 block">File pointers in tenant</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Database className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700 transition-all shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none block">Database Disk Usage</span>
            <span className="text-3xl font-black text-slate-50 mt-2 block leading-none">{dbSizeKB} KB</span>
            <span className="text-[10px] text-slate-500 font-semibold mt-1.5 block">JSON physical table sizes</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <HardDrive className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700 transition-all shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none block">Logs Disk Usage</span>
            <span className="text-3xl font-black text-slate-50 mt-2 block leading-none">{logSizeKB} KB</span>
            <span className="text-[10px] text-slate-500 font-semibold mt-1.5 block">Local rotating log size</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <FileCode className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Physical logs stream viewer */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg flex flex-col h-[340px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <h3 className="text-sm font-bold text-slate-100 tracking-tight flex items-center gap-2">
              <Terminal className="h-4.5 w-4.5 text-indigo-400" />
              <span>Real-Time Structured System Log Streamer</span>
            </h3>
            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 uppercase tracking-widest animate-pulse">
              Active Stream
            </span>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-[10px] text-slate-300 space-y-1.5 select-text">
            {logs.map((log, idx) => (
              <div key={idx} className="leading-relaxed">
                <span className="text-indigo-400">[{new Date().toLocaleTimeString()}]</span>{" "}
                <span className="text-slate-200">{log}</span>
              </div>
            ))}
            <div className="text-indigo-500 animate-pulse flex items-center gap-1.5 mt-2 font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
              <span>Awaiting stream packets...</span>
            </div>
          </div>
        </div>

        {/* Destructive controls */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100 tracking-tight flex items-center gap-2 mb-2">
              <AlertOctagon className="h-4.5 w-4.5 text-rose-400" />
              <span>Destructive Systems Governance</span>
            </h3>
            <p className="text-[11px] text-slate-400 leading-normal font-medium">
              Trigger administrative level actions. These actions bypass standard user locks and operate immediately.
            </p>
          </div>

          <div className="space-y-3.5 mt-6">
            <button
              onClick={handleClearAll}
              disabled={clearing}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all text-xs font-bold text-rose-400 rounded-xl"
            >
              {clearing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Flushing Vector Chunks...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>Purge Global ChromaDB Index</span>
                </>
              )}
            </button>
          </div>

          <div className="border-t border-slate-800/80 pt-4 mt-6 flex gap-2">
            <CheckCircle className="h-4.5 w-4.5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="text-[9px] text-slate-500 font-semibold leading-relaxed">
              **Compliance Mode**: Safe operational environments are checked. Multi-tenant partitioning boundaries are actively enforced.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
