import React, { useState, useEffect, useRef } from "react";
import { 
  ActivePage, 
  DocumentItem, 
  ChatMessage, 
  ConversationSummary, 
  SystemSettings, 
  ToastMessage, 
  CitationItem 
} from "./types";
import { Sidebar } from "./components/Sidebar";
import { DashboardView } from "./components/DashboardView";
import { UploadView } from "./components/UploadView";
import { ChatView } from "./components/ChatView";
import { DocumentsView } from "./components/DocumentsView";
import { SettingsView } from "./components/SettingsView";
import { LoginView } from "./components/LoginView";
import { AnalyticsView } from "./components/AnalyticsView";
import { AdminView } from "./components/AdminView";
import { ProfileView } from "./components/ProfileView";
import { AlertCircle, CheckCircle, Info, X, XCircle } from "lucide-react";

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("semantic_vault_token"));
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string; role: string } | null>(null);

  const [activePage, setActivePage] = useState<ActivePage>("dashboard");
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  
  // History and thread management
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [querying, setQuerying] = useState(false);

  // General settings
  const [settings, setSettings] = useState<SystemSettings>({
    model: "llama3.2",
    embeddingModel: "all-minilm",
    temperature: 0.2,
    topP: 0.9,
    topKChunks: 4,
    similarityThreshold: 0.25,
    isOllamaConnected: true
  });

  // Toasts list state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  // Error dialog state
  const [errorDialog, setErrorDialog] = useState<{ title: string; description: string } | null>(null);

  // Load user details if token is found
  useEffect(() => {
    const cachedUser = localStorage.getItem("semantic_vault_user");
    if (token && cachedUser) {
      setCurrentUser(JSON.parse(cachedUser));
    }
  }, [token]);

  // Mount logic once session is active
  useEffect(() => {
    if (token) {
      fetchDocuments();
      fetchConversations();
      checkConnectionStatus();
    }
  }, [token]);

  const addToast = (toast: Omit<ToastMessage, "id">) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const newToast = { ...toast, id };
    setToasts(prev => [...prev, newToast]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const updateSettings = (key: keyof SystemSettings, val: any) => {
    setSettings(prev => ({ ...prev, [key]: val }));
  };

  const checkConnectionStatus = async () => {
    try {
      const res = await fetch("/api/ollama/status");
      if (res.ok) {
        const data = await res.json();
        setSettings(prev => ({
          ...prev,
          isOllamaConnected: data.connected,
          model: data.currentModel || prev.model,
          embeddingModel: data.embeddingModel || prev.embeddingModel
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDocuments = async () => {
    if (!token) return;
    setLoadingDocuments(true);
    try {
      const res = await fetch("/api/documents", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (e) {
      console.error(e);
      addToast({
        title: "Connection Failed",
        description: "Failed to connect to local documents database.",
        type: "error"
      });
    } finally {
      setLoadingDocuments(false);
    }
  };

  const fetchConversations = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/history", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectConversation = async (id: string) => {
    setActiveConversationId(id);
    setActivePage("chat");
    try {
      const res = await fetch(`/api/history`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        // Fetch matching logs from database state
        const list = await res.json();
        const found = list.find((c: any) => c.id === id);
        if (found) {
          // If server database loaded timeline details, hydrate it
          // In server.ts, messages is returned inside individual session fetch or list
          const detailRes = await fetch(`/api/history`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          // Hydrate conversation state from full storage logs
          const historyDetails = list.find((c: any) => c.id === id);
          if (historyDetails) {
            // We can hydrate messages directly since server returns full lists
            // Let's retrieve from FileDB simulation values
            // We'll fetch all conversations with details
            // We can retrieve the conversations and hydrate local chatMessages with the messages field
            // To do this, let's look up messages inside the conversation list or call an endpoint
            // Since we stored messages on the server inside the memory DB, we can find it
            // Let's implement this cleanly:
            const rawConvsRes = await fetch("/api/history", {
              headers: { "Authorization": `Bearer ${token}` }
            });
            if (rawConvsRes.ok) {
              // The API `/api/history` returns summaries. But we can fetch details.
              // Let's read individual messages. Wait, does `/api/history` return messages?
              // Yes, we will read from local conversation list state or simulate
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch and hydrate message threads upon selection
  useEffect(() => {
    if (activeConversationId && token) {
      // Fetch messages for activeConversationId
      fetch(`/api/history`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      .then(res => res.json())
      .then((data: any[]) => {
        // Find matching detailed messages inside user conversation payload
        // Wait, does the API return detailed conversations?
        // Let's fetch all conversations. In server.ts, GET /api/history returns summaries.
        // Wait! Let's modify the GET /api/history route to return detailed threads if needed, 
        // or let's inspect the server.ts code:
        // GET /api/history returns summaries: {id, title, message_count, created_at, updated_at}
        // Let's see: is there an endpoint to get detailed conversation?
        // No, let's check! Ah! In the old server.ts, was there a GET /api/history?id=... ?
        // No, it listed summaries. Let's make sure that if the client wants to load messages, 
        // we can add a simple endpoint in `server.ts` or let the summaries fetch include messages if requested,
        // or let's check how the previous frontend did it.
        // Wait, did the previous frontend retrieve messages?
        // Let's look at lines 120-135 of the old App.tsx:
        // In the old App.tsx:
        // `const response = await fetch('/api/history');`
        // Wait, how did it display messages?
        // Ah! If the user selected a conversation, did it fetch or did it keep it in-memory?
        // Let's check how `ChatView` renders them.
        // Let's add a robust route `GET /api/history/:id` to server.ts, or let GET /api/history/:id return detailed messages!
        // Wait, does our server.ts already have a detailed endpoint?
        // Let's search inside our new server.ts. We didn't add `GET /api/history/:id` explicitly,
        // but we can add it, or we can let `GET /api/history` return the conversations list, and since we load conversations,
        // we can fetch individual conversation messages from there.
        // Let's check our server.ts. In `GET /api/history` on line 512, we did:
        // `res.json(userConvs.map(c => ({ id: c.id, title: c.title, message_count: c.messages.length... })))`
        // Wait! Let's add a simple endpoint to get details of a specific conversation, e.g.:
        // `GET /api/history/:id`! This is incredibly robust and solves hydration perfectly!
        // Let's view the `server.ts` to see where to insert, or we can use `edit_file` to add `GET /api/history/:id` to server.ts.
        // Let's do that right now so the chat loads seamlessly.
      });
    }
  }, [activeConversationId]);

  const handleLoadDetailedMessages = async (id: string) => {
    try {
      const res = await fetch(`/api/history/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data.messages || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeConversationId && token) {
      handleLoadDetailedMessages(activeConversationId);
    }
  }, [activeConversationId]);

  const handleNewChat = () => {
    setActiveConversationId(null);
    setChatMessages([]);
    setActivePage("chat");
    addToast({
      title: "New Conversation Thread",
      description: "Secure local context initialized.",
      type: "info"
    });
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/history?conversation_id=${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setConversations(prev => prev.filter(c => c.id !== id));
        if (activeConversationId === id) {
          handleNewChat();
        }
        addToast({
          title: "Conversation Deleted",
          description: "Grounded chat memory deleted successfully.",
          type: "success"
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAllConversations = async () => {
    try {
      const res = await fetch("/api/clear", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setConversations([]);
        handleNewChat();
        addToast({
          title: "Repository Cleared",
          description: "All historical dialogue threads deleted.",
          type: "success"
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearDatabase = async () => {
    try {
      const res = await fetch("/api/documents/clear", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setDocuments([]);
        addToast({
          title: "ChromaDB Flushed",
          description: "All stored documents and dense embedding indices deleted.",
          type: "success"
        });
        fetchDocuments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // SSE STREAMING CHAT WORKFLOW
  const handleSendMessage = async (text: string, filters: any = {}) => {
    if (querying) return;
    setQuerying(true);

    const userMessage: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedTimeline = [...chatMessages, userMessage];
    setChatMessages(updatedTimeline);

    // Initial placeholder for streaming assistant
    const placeholderMsgId = `msg_assistant_${Date.now()}`;
    const assistantPlaceholder: ChatMessage = {
      id: placeholderMsgId,
      role: "assistant",
      content: "",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, assistantPlaceholder]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          message: text,
          conversation_id: activeConversationId,
          stream: true,
          model: settings.model,
          temperature: settings.temperature,
          top_p: settings.topP,
          top_k_chunks: settings.topKChunks,
          similarity_threshold: settings.similarityThreshold,
          ...filters // transmit tags, types, name filters
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to establish inference connection.");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("SSE Stream Reader initialized empty.");

      let finished = false;
      let buffer = "";
      let answerAccumulator = "";
      let receivedCitations: CitationItem[] = [];

      while (!finished) {
        const { value, done } = await reader.read();
        finished = done;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            if (trimmed.startsWith("data: ")) {
              const rawData = trimmed.substring(6);
              try {
                const parsed = JSON.parse(rawData);
                if (parsed.token) {
                  answerAccumulator += parsed.token;
                  setChatMessages(prev => 
                    prev.map(m => m.id === placeholderMsgId ? { ...m, content: answerAccumulator } : m)
                  );
                } else if (parsed.done) {
                  receivedCitations = parsed.citations || [];
                  setActiveConversationId(parsed.conversation_id);
                  setChatMessages(prev => 
                    prev.map(m => m.id === placeholderMsgId ? { 
                      ...m, 
                      content: parsed.answer || answerAccumulator, 
                      citations: receivedCitations,
                      latency_sec: parsed.latency_sec,
                      tokens_generated: parsed.tokens_generated
                    } : m)
                  );
                } else if (parsed.error) {
                  throw new Error(parsed.error);
                }
              } catch (e) {
                console.error("Failed to parse stream packet", e);
              }
            }
          }
        }
      }

      setQuerying(false);
      fetchConversations(); // refresh list to capture updated summaries and titles

    } catch (err: any) {
      console.error("Chat error:", err);
      setQuerying(false);
      setChatMessages(prev => prev.filter(m => m.id !== placeholderMsgId));
      
      setErrorDialog({
        title: "Inference Error",
        description: err.message || "Failed to contact local synthesis node."
      });
    }
  };

  const handleRegenerate = () => {
    if (chatMessages.length < 2 || querying) return;
    const lastUserMessage = [...chatMessages].reverse().find(m => m.role === "user");
    if (lastUserMessage) {
      setChatMessages(prev => {
        const idx = prev.findIndex(m => m.id === lastUserMessage.id);
        return prev.slice(0, idx + 1);
      });
      handleSendMessage(lastUserMessage.content);
    }
  };

  const handleLoginSuccess = (userToken: string, userDetails: any) => {
    setToken(userToken);
    setCurrentUser(userDetails);
    setActivePage("dashboard");
  };

  const handleSignOut = () => {
    localStorage.removeItem("semantic_vault_token");
    localStorage.removeItem("semantic_vault_user");
    setToken(null);
    setCurrentUser(null);
    setActiveConversationId(null);
    setChatMessages([]);
    addToast({
      title: "Session Expired",
      description: "Secure workspace context invalidated successfully.",
      type: "info"
    });
  };

  // Mandatory Authentication check
  if (!token) {
    return (
      <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden relative">
        <LoginView onLoginSuccess={handleLoginSuccess} addToast={addToast} />
        
        {/* Slide-in Toast Notifications Overlay */}
        <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="pointer-events-auto flex items-start gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-2xl animate-slide-in relative overflow-hidden"
            >
              {toast.type === "success" && <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />}
              {toast.type === "error" && <XCircle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />}
              {toast.type === "info" && <Info className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />}
              {toast.type === "warning" && <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />}

              <div className="flex-1 pr-4">
                <h5 className="text-xs font-bold text-slate-100">{toast.title}</h5>
                <p className="text-[10px] text-slate-400 mt-1 leading-normal font-medium">{toast.description}</p>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-500 hover:text-slate-300 p-0.5 rounded transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 font-sans text-slate-100 overflow-hidden relative">
      
      {/* Sidebar Controls Column */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onClearAllConversations={handleClearAllConversations}
        isOllamaConnected={settings.isOllamaConnected}
        currentUser={currentUser}
        onSignOut={handleSignOut}
      />

      {/* Main Screen Layout Container */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative">
        {activePage === "dashboard" && (
          <DashboardView
            documents={documents}
            isOllamaConnected={settings.isOllamaConnected}
            selectedModel={settings.model}
            selectedEmbedding={settings.embeddingModel}
            setActivePage={setActivePage}
          />
        )}

        {activePage === "upload" && (
          <UploadView
            token={token}
            onUploadSuccess={fetchDocuments}
            addToast={addToast}
          />
        )}

        {activePage === "chat" && (
          <ChatView
            messages={chatMessages}
            activeConversationId={activeConversationId}
            onSendMessage={handleSendMessage}
            querying={querying}
            settings={settings}
            updateSettings={updateSettings}
            onRegenerate={handleRegenerate}
            token={token}
            addToast={addToast}
          />
        )}

        {activePage === "documents" && (
          <DocumentsView
            documents={documents}
            loading={loadingDocuments}
            onDeleteDocument={async (id, e) => {
              e.stopPropagation();
              try {
                const res = await fetch(`/api/documents/${id}`, {
                  method: "DELETE",
                  headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                  setDocuments(prev => prev.filter(doc => doc.id !== id));
                  addToast({
                    title: "Document Reference Purged",
                    description: "Removed partitions from vector database index.",
                    type: "success"
                  });
                }
              } catch (err) {
                console.error(err);
              }
            }}
            addToast={addToast}
            token={token}
          />
        )}

        {activePage === "settings" && (
          <SettingsView
            settings={settings}
            updateSettings={updateSettings}
            onClearDatabase={handleClearDatabase}
            addToast={addToast}
          />
        )}

        {activePage === "analytics" && (
          <AnalyticsView token={token} />
        )}

        {activePage === "admin" && (
          <AdminView
            token={token}
            addToast={addToast}
            onClearDatabase={handleClearDatabase}
          />
        )}

        {activePage === "profile" && (
          <ProfileView user={currentUser} onSignOut={handleSignOut} />
        )}
      </main>

      {/* Slide-in Toast Notifications Overlay */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-2xl animate-slide-in relative overflow-hidden"
          >
            {toast.type === "success" && <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />}
            {toast.type === "error" && <XCircle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />}
            {toast.type === "info" && <Info className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />}
            {toast.type === "warning" && <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />}

            <div className="flex-1 pr-4">
              <h5 className="text-xs font-bold text-slate-100">{toast.title}</h5>
              <p className="text-[10px] text-slate-400 mt-1 leading-normal font-medium">{toast.description}</p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-500 hover:text-slate-300 p-0.5 rounded transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            
            <div className={`absolute bottom-0 left-0 h-0.5 bg-indigo-500 animate-shrink-width w-full`}></div>
          </div>
        ))}
      </div>

      {/* Error Modal Dialog Box */}
      {errorDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setErrorDialog(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 p-1 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-3 mb-4 text-rose-400">
              <AlertCircle className="h-6 w-6" />
              <h3 className="text-sm font-bold text-slate-50">{errorDialog.title}</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-medium mb-5 select-text">
              {errorDialog.description}
            </p>

            <div className="flex justify-end">
              <button
                onClick={() => setErrorDialog(null)}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
