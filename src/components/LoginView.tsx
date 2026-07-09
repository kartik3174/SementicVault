import React, { useState } from "react";
import { Database, Shield, Lock, User, Sparkles, AlertCircle, Loader2 } from "lucide-react";

interface LoginViewProps {
  onLoginSuccess: (token: string, user: { id: string; username: string; role: string }) => void;
  addToast: (msg: any) => void;
}

export function LoginView({ onLoginSuccess, addToast }: LoginViewProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "viewer" | "admin">("user");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please input both username and password credentials.");
      return;
    }

    setLoading(true);
    setError(null);

    const endpoint = isRegistering ? "/api/register" : "/api/login";
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      localStorage.setItem("semantic_vault_token", data.token);
      localStorage.setItem("semantic_vault_user", JSON.stringify(data.user));
      
      addToast({
        title: isRegistering ? "Registration Successful" : "Welcome Back",
        description: `Secure workspace session initialized for "${data.user.username}".`,
        type: "success"
      });

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || "Network credentials handshake failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login-container" className="fixed inset-0 bg-slate-950 flex items-center justify-center p-4 z-50 overflow-y-auto">
      {/* Background ambient radial lights */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-slate-950/40 to-slate-950 pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Subtle decorative border indicator */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700"></div>

        <div className="flex flex-col items-center mb-6">
          <div className="h-12 w-12 rounded-xl bg-indigo-600/15 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 shadow-lg">
            <Database className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-black text-slate-50 tracking-tight text-center">SemanticVault Workspace</h2>
          <p className="text-xs text-slate-400 mt-1.5 text-center font-medium">
            Enterprise Grounded Generation & Document Retrieval
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3.5 flex gap-2.5 text-rose-400 text-xs font-semibold mb-5 items-start">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span className="leading-normal">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter identity label..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs font-medium text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/10 transition-all"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Secret Key Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs font-medium text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/10 transition-all"
                disabled={loading}
              />
            </div>
          </div>

          {isRegistering && (
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Workspace Role Authority
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "user", label: "Standard", desc: "Read & upload" },
                  { value: "viewer", label: "Viewer", desc: "Read only" },
                  { value: "admin", label: "Admin", desc: "Full control" }
                ].map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value as any)}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      role === r.value
                        ? "bg-indigo-600/10 border-indigo-500 text-indigo-400 font-bold"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <span className="text-xs block">{r.label}</span>
                    <span className="text-[8px] opacity-60 font-semibold block leading-tight mt-0.5">{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-xl shadow-lg hover:shadow-indigo-600/10 transition-all flex items-center justify-center gap-2 mt-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Handshaking Tenant Database...</span>
              </>
            ) : (
              <>
                <Shield className="h-4 w-4" />
                <span>{isRegistering ? "Confirm Registration" : "Establish Secure Session"}</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-800/80 pt-4 flex items-center justify-between">
          <span className="text-[10px] text-slate-500 font-semibold">
            {isRegistering ? "Already have a credential?" : "Need a new account?"}
          </span>
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError(null);
            }}
            className="text-[10px] font-bold text-indigo-400 hover:underline"
            disabled={loading}
          >
            {isRegistering ? "Access Vault Gate" : "Register Credentials"}
          </button>
        </div>

        <div className="mt-6 bg-slate-950/40 border border-slate-800/50 rounded-xl p-3 flex gap-2">
          <Sparkles className="h-4 w-4 text-indigo-400 flex-shrink-0 mt-0.5" />
          <p className="text-[9px] text-slate-500 font-medium leading-relaxed">
            **Security Policy**: This portal establishes signed stateless sessions. All credentials and operations are governed by localized workspace access bounds.
          </p>
        </div>
      </div>
    </div>
  );
}
