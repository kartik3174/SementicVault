import React from "react";
import { User, Shield, Key, Clock, Database, ChevronRight, HardDrive } from "lucide-react";

interface ProfileViewProps {
  user: { id: string; username: string; role: string } | null;
  onSignOut: () => void;
}

export function ProfileView({ user, onSignOut }: ProfileViewProps) {
  if (!user) return null;

  const roleLabel = user.role === "admin" ? "Systems Administrator" : user.role === "user" ? "Standard Contributor" : "Read-Only Auditor";

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-950 text-slate-100 space-y-8 select-none">
      {/* Top Banner */}
      <div className="border-b border-slate-800 pb-6">
        <h2 className="text-2xl font-black text-slate-50 tracking-tight leading-none flex items-center gap-2">
          <User className="h-6 w-6 text-indigo-400" />
          <span>User Identity Profile</span>
        </h2>
        <p className="text-xs text-slate-400 mt-2 font-medium">
          Manage your secure workspace session parameters, cryptographic role access, and tenant tokens.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-md">
                <User className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-100">{user.username}</h3>
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">{user.role} Authority</span>
              </div>
            </div>

            <div className="border-t border-slate-800/85 pt-4 space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-500">Workspace ID</span>
                <span className="text-slate-300 font-mono text-[10px]">{user.id}</span>
              </div>
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-500">Access Level</span>
                <span className="text-slate-300">{roleLabel}</span>
              </div>
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-500">Session Status</span>
                <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active Secure
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onSignOut}
            className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all mt-6"
          >
            Invalidate Secure Session (Sign Out)
          </button>
        </div>

        {/* Access tokens and role permissions mappings */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg space-y-5">
          <h3 className="text-sm font-bold text-slate-100 tracking-tight flex items-center gap-2 border-b border-slate-800 pb-3">
            <Shield className="h-4.5 w-4.5 text-indigo-400" />
            <span>Cryptographic Capability Mappings (RBAC Model)</span>
          </h3>

          <div className="space-y-3.5">
            {[
              { 
                title: "Document Vault Upload", 
                allowed: user.role !== "viewer", 
                desc: "Allowed to upload text, PDF, images into local ChromaDB workspace partitions." 
              },
              { 
                title: "Interactive Grounded Retrieval Chat", 
                allowed: true, 
                desc: "Allowed to compile grounded chat prompts and query multi-document indices." 
              },
              { 
                title: "Perform Deep Database Index Purges", 
                allowed: user.role === "admin", 
                desc: "Privileged administrator authority to delete tenant database indexes." 
              },
              { 
                title: "View High-Level Analytical Dashboards", 
                allowed: true, 
                desc: "View average query latencies, token consumption totals, and logs trails." 
              }
            ].map((perm, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-slate-950/40 border border-slate-800/80 rounded-xl">
                <div className={`p-1.5 rounded-lg border flex-shrink-0 mt-0.5 ${
                  perm.allowed 
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                    : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                }`}>
                  <Key className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-200">{perm.title}</span>
                    <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      perm.allowed ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                    }`}>
                      {perm.allowed ? "Granted" : "Blocked"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-semibold leading-relaxed mt-0.5">{perm.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
