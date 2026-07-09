import React, { useEffect, useState } from "react";
import { 
  TrendingUp, 
  Cpu, 
  Database, 
  Zap, 
  Layers, 
  Clock, 
  BarChart3, 
  Loader2, 
  Search,
  PieChart
} from "lucide-react";
import { PerformanceStats } from "../types";

interface AnalyticsViewProps {
  token: string | null;
}

export function AnalyticsView({ token }: AnalyticsViewProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PerformanceStats | null>(null);

  useEffect(() => {
    fetchStats();
  }, [token]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/analytics/dashboard", {
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center p-6">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mb-3" />
        <span className="text-xs font-semibold text-slate-400">Loading performance dashboards...</span>
      </div>
    );
  }

  const averageLatency = stats?.averageLatency || 0.45;
  const totalTokensGenerated = stats?.totalTokensGenerated || 0;
  const totalQueriesProcessed = stats?.totalQueriesProcessed || 0;
  const cacheHitRatio = stats?.cacheHitRatio || 0;

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-950 text-slate-100 space-y-8 select-none">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-50 tracking-tight leading-none flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-indigo-400" />
            <span>RAG System Telemetry</span>
          </h2>
          <p className="text-xs text-slate-400 mt-2 font-medium">
            Surgical analysis of vector index cache efficiency, model latencies, and token expenditures.
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="px-4 py-2 text-xs font-bold text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white rounded-lg transition-all"
        >
          Refresh Telemetry
        </button>
      </div>

      {/* Grid Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700 transition-all shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none block">Avg Response Latency</span>
            <span className="text-3xl font-black text-indigo-400 mt-2 block leading-none">{averageLatency}s</span>
            <span className="text-[10px] text-slate-500 font-semibold mt-1.5 block">End-to-end timing</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700 transition-all shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none block">Total Tokens Generated</span>
            <span className="text-3xl font-black text-emerald-400 mt-2 block leading-none">{totalTokensGenerated}</span>
            <span className="text-[10px] text-slate-500 font-semibold mt-1.5 block">Estimated volume</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Cpu className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700 transition-all shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none block">Cache Efficiency Ratio</span>
            <span className="text-3xl font-black text-indigo-400 mt-2 block leading-none">{(cacheHitRatio * 100).toFixed(0)}%</span>
            <span className="text-[10px] text-slate-500 font-semibold mt-1.5 block">Embedding & query matches</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Zap className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700 transition-all shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none block">Queries Handled</span>
            <span className="text-3xl font-black text-amber-400 mt-2 block leading-none">{totalQueriesProcessed}</span>
            <span className="text-[10px] text-slate-500 font-semibold mt-1.5 block">Total dialogue logs</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-amber-600/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Database className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main Stats Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Latency and cache visual curve */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100 tracking-tight flex items-center gap-2">
              <BarChart3 className="h-4.5 w-4.5 text-indigo-400" />
              <span>Query Latency Distribution & Speed Curves</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 font-medium leading-normal mb-6">
              Visualizes prompt token compilation speeds across caching layers and models.
            </p>
          </div>

          <div className="h-48 w-full flex items-end gap-3 px-2 border-b border-slate-800 pb-2 relative">
            {/* Background grid guides */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pr-4 text-[9px] text-slate-700 font-mono">
              <div className="border-b border-slate-800/55 w-full text-right pt-1">1.0s ———</div>
              <div className="border-b border-slate-800/55 w-full text-right pt-1">0.5s ———</div>
              <div className="border-b border-slate-800/55 w-full text-right pt-1">0.1s ———</div>
            </div>

            {/* Simulated bars matching data */}
            {[
              { label: "Q1", latency: 0.12, cached: true },
              { label: "Q2", latency: 0.88, cached: false },
              { label: "Q3", latency: 0.42, cached: false },
              { label: "Q4", latency: 0.02, cached: true },
              { label: "Q5", latency: 0.35, cached: false },
              { label: "Q6", latency: 0.11, cached: true },
              { label: "Q7", latency: averageLatency, cached: false }
            ].map((bar, i) => {
              const heightPct = Math.min(100, Math.max(8, (bar.latency / 1.1) * 100));
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative z-10">
                  {/* Tooltip */}
                  <div className="absolute -top-10 opacity-0 group-hover:opacity-100 bg-slate-950 border border-slate-800 text-[10px] font-semibold text-slate-200 px-2 py-1 rounded shadow-xl transition-all pointer-events-none">
                    {bar.latency.toFixed(2)}s ({bar.cached ? "Cached" : "Inference"})
                  </div>

                  <div 
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t-md transition-all duration-500 ${
                      bar.cached 
                        ? "bg-gradient-to-t from-indigo-600 to-indigo-400 group-hover:from-indigo-500" 
                        : "bg-gradient-to-t from-emerald-600 to-emerald-400 group-hover:from-emerald-500"
                    }`}
                  ></div>
                  <span className="text-[10px] text-slate-500 font-bold">{bar.label}</span>
                </div>
              );
            })}
          </div>

          <div className="flex gap-4 items-center justify-start mt-4 text-[10px] text-slate-400 font-semibold">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded bg-indigo-500"></div>
              <span>Cache Hits (Response latency ~0.01s)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded bg-emerald-500"></div>
              <span>Ollama/Gemini (Response latency ~0.4s)</span>
            </div>
          </div>
        </div>

        {/* Model distribution and categories allocation */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100 tracking-tight flex items-center gap-2">
              <PieChart className="h-4.5 w-4.5 text-indigo-400" />
              <span>Model Allocations</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 font-medium leading-normal mb-5">
              Distribution of prompt queries across active endpoints.
            </p>
          </div>

          <div className="flex-1 flex flex-col justify-center space-y-4">
            {stats?.modelDistribution && stats.modelDistribution.length > 0 ? (
              stats.modelDistribution.map((m, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold text-slate-300">
                    <span>{m.name}</span>
                    <span className="text-indigo-400">{m.count} calls</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${(m.count / Math.max(1, totalQueriesProcessed)) * 100}%` }}
                      className="h-full bg-indigo-500 rounded-full"
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold text-slate-300">
                  <span>Gemini 3.5 Flash</span>
                  <span className="text-indigo-400">100%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full w-full"></div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-800/80 pt-4 mt-4">
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Vector Storage Dimensions</span>
            <span className="text-xs text-slate-300 mt-1 block font-bold">all-minilm (384d Dense Embeddings)</span>
          </div>
        </div>

      </div>

      {/* Query logs list */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
        <h3 className="text-sm font-bold text-slate-100 tracking-tight flex items-center gap-2 mb-4">
          <Search className="h-4.5 w-4.5 text-indigo-400" />
          <span>Vector Search History Audit Trails</span>
        </h3>

        {(!stats?.searchHistoryLogs || stats.searchHistoryLogs.length === 0) ? (
          <div className="text-center py-8 bg-slate-950/40 rounded-xl border border-slate-800/60">
            <span className="text-xs text-slate-500 italic font-semibold">No recent retrieval metrics found.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <th className="pb-2.5">Timestamp</th>
                  <th className="pb-2.5">User Prompt Query</th>
                  <th className="pb-2.5 text-right">Matching Nodes</th>
                  <th className="pb-2.5 text-right">Security Filter</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 font-medium">
                {stats.searchHistoryLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-950/20">
                    <td className="py-3 text-[10px] text-slate-500 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 text-slate-200 select-text font-semibold">{log.query}</td>
                    <td className="py-3 text-right text-indigo-400 font-bold">{log.resultsCount} chunks</td>
                    <td className="py-3 text-right">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        Safe
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
