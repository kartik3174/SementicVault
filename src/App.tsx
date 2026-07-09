import React, { useState, useEffect, useRef } from "react";
import { 
  Database, 
  Terminal, 
  Upload, 
  Cpu, 
  MessageSquare, 
  Info, 
  FileText, 
  Trash2, 
  Search, 
  CheckCircle, 
  XCircle, 
  BookOpen, 
  Network, 
  ChevronRight, 
  ArrowRight, 
  Layers, 
  Copy, 
  ExternalLink,
  Sliders,
  Sparkles,
  FileCode,
  Download,
  Check,
  Calendar,
  Image
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  chunksCount: number;
  createdAt: number;
}

interface Chunk {
  id: string;
  index: number;
  text: string;
  pageNumber?: number;
}

interface Citation {
  id: string;
  docName: string;
  pageNumber?: number;
  text: string;
  similarity: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  citations?: Citation[];
  contextUsed?: string;
  modelUsed?: string;
}

export default function App() {
  // Service configuration state
  const [isOllamaOnline, setIsOllamaOnline] = useState<boolean>(true);
  const [selectedModel, setSelectedModel] = useState<string>("llama3.2:3b");
  const [selectedEmbedding, setSelectedEmbedding] = useState<string>("all-minilm");
  
  // Workspace files state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Chunk Viewer modal / focus state
  const [activeChunksDoc, setActiveChunksDoc] = useState<Document | null>(null);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [loadingChunks, setLoadingChunks] = useState<boolean>(false);

  // Chat/Query state
  const [chatMessages, setChatMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I am SemanticVault's local LLM agent. Load private PDFs, DOCX, TXT, or Markdown documents in the **Documents Vault** sidebar, and ask me questions about them.\n\nAll retrievals, embeddings, and context injections are processed here, demonstrating a complete **Retrieval-Augmented Generation (RAG)** system running entirely locally.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [query, setQuery] = useState<string>("");
  const [querying, setQuerying] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<string>("idle"); // 'idle' | 'embedding' | 'retrieving' | 'generating'
  const [lastRAGTrace, setLastRAGTrace] = useState<{
    contextUsed: string;
    citations: Citation[];
    modelUsed: string;
    embeddingModelUsed: string;
  } | null>(null);

  // active workspace tab: "playground" | "architecture" | "local_cli"
  const [activeTab, setActiveTab] = useState<string>("playground");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [uploadStats, setUploadStats] = useState<{ 
    total: number; 
    current: number; 
    currentFileName: string;
    successCount: number;
    failCount: number;
    processedList: Array<{ name: string; status: "success" | "failed" }>;
  } | null>(null);
  const [hoveredDoc, setHoveredDoc] = useState<Document | null>(null);
  const [tooltipY, setTooltipY] = useState<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load status and documents on mount
  useEffect(() => {
    fetchOllamaStatus();
    fetchDocuments();
  }, []);

  // Scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, querying]);

  const fetchOllamaStatus = async () => {
    try {
      const response = await fetch("/api/ollama/status");
      if (response.ok) {
        const data = await response.json();
        setIsOllamaOnline(data.connected);
        setSelectedModel(data.currentModel);
        setSelectedEmbedding(data.embeddingModel);
      }
    } catch (e) {
      console.error("Failed to connect to backend api", e);
    }
  };

  const toggleOllamaConnection = async (state: boolean) => {
    try {
      const response = await fetch("/api/ollama/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connected: state })
      });
      if (response.ok) {
        const data = await response.json();
        setIsOllamaOnline(data.connected);
      }
    } catch (e) {
      console.error("Failed to toggle Ollama connection", e);
    }
  };

  const handleModelChange = async (model: string) => {
    setSelectedModel(model);
    try {
      await fetch("/api/ollama/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentModel: model })
      });
    } catch (e) {
      console.error("Failed to configure model", e);
    }
  };

  const handleEmbeddingChange = async (embedding: string) => {
    setSelectedEmbedding(embedding);
    try {
      await fetch("/api/ollama/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeddingModel: embedding })
      });
    } catch (e) {
      console.error("Failed to configure embedding", e);
    }
  };

  const fetchDocuments = async () => {
    setLoadingDocuments(true);
    try {
      const response = await fetch("/api/documents");
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (e) {
      console.error("Failed to fetch documents", e);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const deleteDocument = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHoveredDoc(null);
    try {
      const response = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (response.ok) {
        setDocuments(prev => prev.filter(doc => doc.id !== id));
        if (activeChunksDoc?.id === id) {
          setActiveChunksDoc(null);
          setChunks([]);
        }
      }
    } catch (e) {
      console.error("Failed to delete document", e);
    }
  };

  const viewChunks = async (doc: Document) => {
    setActiveChunksDoc(doc);
    setLoadingChunks(true);
    try {
      const response = await fetch(`/api/documents/${doc.id}/chunks`);
      if (response.ok) {
        const data = await response.json();
        setChunks(data);
      }
    } catch (e) {
      console.error("Failed to fetch chunks", e);
    } finally {
      setLoadingChunks(false);
    }
  };

  // Recursively read all files from dragged items (files and folders)
  const getAllFilesFromEntries = async (dataTransferItems: DataTransferItemList): Promise<File[]> => {
    const files: File[] = [];

    const traverseEntry = async (entry: any): Promise<void> => {
      if (entry.isFile) {
        const file = await new Promise<File>((resolve, reject) => {
          entry.file(resolve, reject);
        });
        const name = file.name.toLowerCase();
        if (name.endsWith(".pdf") || name.endsWith(".docx") || name.endsWith(".txt") || name.endsWith(".md") ||
            name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".webp") || name.endsWith(".gif")) {
          files.push(file);
        }
      } else if (entry.isDirectory) {
        const directoryReader = entry.createReader();
        const readAllEntries = async (): Promise<any[]> => {
          let allEntries: any[] = [];
          const readBatch = async (): Promise<any[]> => {
            return new Promise((resolve, reject) => {
              directoryReader.readEntries((entries: any[]) => {
                resolve(entries);
              }, reject);
            });
          };
          
          let entriesBatch = await readBatch();
          while (entriesBatch.length > 0) {
            allEntries = allEntries.concat(entriesBatch);
            entriesBatch = await readBatch();
          }
          return allEntries;
        };

        try {
          const entries = await readAllEntries();
          await Promise.all(entries.map(e => traverseEntry(e)));
        } catch (err) {
          console.error("Error reading directory entries:", err);
        }
      }
    };

    const entriesToProcess: any[] = [];
    for (let i = 0; i < dataTransferItems.length; i++) {
      const item = dataTransferItems[i];
      if (item.kind === "file") {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          entriesToProcess.push(entry);
        }
      }
    }

    await Promise.all(entriesToProcess.map(entry => traverseEntry(entry)));
    return files;
  };

  // Drag and Drop files handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const files = await getAllFilesFromEntries(e.dataTransfer.items);
      uploadMultipleFiles(files);
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadMultipleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadMultipleFiles(Array.from(e.target.files));
    }
  };

  const handleFolderInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadMultipleFiles(Array.from(e.target.files));
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const triggerFolderInput = (e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering file input since it's nested or attached
    folderInputRef.current?.click();
  };

  const uploadMultipleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    
    let successCount = 0;
    let failCount = 0;
    
    // Filter supported file extensions
    const validFiles = files.filter(file => {
      const name = file.name.toLowerCase();
      return name.endsWith(".pdf") || name.endsWith(".docx") || name.endsWith(".txt") || name.endsWith(".md") ||
             name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".webp") || name.endsWith(".gif");
    });

    if (validFiles.length === 0) {
      setUploadError("No valid documents or images found (.pdf, .docx, .txt, .md, .png, .jpg, .jpeg, .webp, .gif)");
      setUploading(false);
      return;
    }

    setUploadStats({
      total: validFiles.length,
      current: 0,
      currentFileName: "",
      successCount: 0,
      failCount: 0,
      processedList: []
    });

    // Upload with an optimal concurrency limit of 3 files at a time to maximize performance
    const limit = 3;
    for (let i = 0; i < validFiles.length; i += limit) {
      const chunk = validFiles.slice(i, i + limit);
      await Promise.all(chunk.map(async (file, idx) => {
        const fileIndex = i + idx;
        try {
          setUploadStats(prev => prev ? { 
            ...prev, 
            current: Math.max(prev.current, fileIndex + 1), 
            currentFileName: file.name 
          } : null);
          
          if (file.size > 15 * 1024 * 1024) {
            throw new Error(`${file.name} is too large (Max 15MB)`);
          }

          const base64 = await convertToBase64(file);
          const response = await fetch("/api/documents/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: file.name,
              type: file.type || "application/octet-stream",
              size: file.size,
              base64: base64
            })
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || `Server failed to process ${file.name}`);
          }
          successCount++;
          
          setUploadStats(prev => {
            if (!prev) return null;
            if (prev.processedList.some(item => item.name === file.name)) return prev;
            return {
              ...prev,
              successCount: prev.successCount + 1,
              processedList: [...prev.processedList, { name: file.name, status: "success" }]
            };
          });
        } catch (err: any) {
          console.error(`Failed to upload ${file.name}:`, err);
          failCount++;
          
          setUploadStats(prev => {
            if (!prev) return null;
            if (prev.processedList.some(item => item.name === file.name)) return prev;
            return {
              ...prev,
              failCount: prev.failCount + 1,
              processedList: [...prev.processedList, { name: file.name, status: "failed" }]
            };
          });
        }
      }));
    }

    setUploadStats(null);
    setUploading(false);
    await fetchDocuments();

    if (failCount > 0) {
      setUploadError(`Successfully indexed ${successCount} files. Failed to process ${failCount} files.`);
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64String = result.split(",")[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Submit Query to RAG Pipeline
  const handleQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || querying) return;

    const userMessage = query.trim();
    setQuery("");
    setQuerying(true);
    setLastRAGTrace(null);
    
    // Add user message to state
    const userMsgObj: Message = {
      id: `msg_${Date.now()}_user`,
      role: "user",
      content: userMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev, userMsgObj]);

    // Animate through RAG steps
    setActiveStep("embedding");
    
    try {
      // 1. Embed query step
      await delay(900);
      setActiveStep("retrieving");
      
      // 2. Retrieve similar chunks step
      await delay(900);
      setActiveStep("generating");

      // 3. Prompt context construction & generation step
      const response = await fetch("/api/rag/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          // Send previous chat messages to keep conversation context
          conversationHistory: chatMessages.slice(-6).map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to prompt local RAG engine");
      }

      const data = await response.json();
      
      // Update with assistant's synthesized answer
      const botMsgObj: Message = {
        id: `msg_${Date.now()}_bot`,
        role: "assistant",
        content: data.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: data.citations,
        contextUsed: data.contextUsed,
        modelUsed: data.modelUsed
      };

      setChatMessages(prev => [...prev, botMsgObj]);
      setLastRAGTrace({
        contextUsed: data.contextUsed,
        citations: data.citations,
        modelUsed: data.modelUsed,
        embeddingModelUsed: data.embeddingModelUsed
      });

    } catch (err: any) {
      console.error("RAG pipeline failed", err);
      // Insert failure node
      setChatMessages(prev => [...prev, {
        id: `msg_${Date.now()}_error`,
        role: "assistant",
        content: `⚠️ **RAG pipeline execution failed:** ${err.message || "Unknown offline server issue."}\n\n*Please ensure that your documents are uploaded and Ollama simulated node is toggled active.*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setQuerying(false);
      setActiveStep("idle");
    }
  };

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="flex flex-col h-screen bg-[#0c0c0e] text-[#e1e1e3] font-sans antialiased overflow-hidden">
      {/* Dynamic Header */}
      <nav className="h-14 border-b border-[#262626] flex items-center justify-between px-6 bg-[#0f0f11] z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white shadow-lg shadow-blue-600/10">
            SV
          </div>
          <span className="font-semibold tracking-tight text-lg text-white flex items-center">
            SemanticVault 
            <span className="text-blue-500 text-xs font-mono ml-2 opacity-80">v1.0.0-beta</span>
          </span>
        </div>

        {/* Global Pipeline Node Statuses in beautiful pills */}
        <div className="flex items-center gap-3">
          {/* Node 1: Ollama Server Status */}
          <div className="flex items-center gap-2 px-3 py-1 bg-[#161618] border border-[#262626] rounded-full">
            <div className={`w-2 h-2 rounded-full ${isOllamaOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              Ollama: {isOllamaOnline ? "llama3.2-online" : "disconnected"}
            </span>
          </div>

          <button 
            onClick={() => toggleOllamaConnection(!isOllamaOnline)}
            className="px-2.5 py-1 text-[10px] font-mono bg-[#161618] hover:bg-[#202024] text-slate-300 rounded border border-[#262626] transition-all"
          >
            Toggle Link
          </button>

          {/* Node 2: Database Status */}
          <div className="flex items-center gap-2 px-3 py-1 bg-[#161618] border border-[#262626] rounded-full">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              ChromaDB: Ready
            </span>
          </div>
        </div>
      </nav>

      {/* Main Workspace Frame */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar: Document Vault */}
        <aside className="w-80 bg-[#0f0f11] border-r border-[#262626] flex flex-col overflow-hidden shrink-0">
          <div className="p-4 border-b border-[#262626]">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              Documents Vault
            </h3>
            <p className="text-xs text-slate-400 mb-4">Upload and index documents to create semantic chunks.</p>

            {/* Hidden Inputs */}
            <input 
              ref={fileInputRef}
              type="file" 
              onChange={handleFileInput}
              accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp,.gif"
              multiple
              className="hidden" 
            />
            <input 
              ref={folderInputRef}
              type="file" 
              onChange={handleFolderInput}
              {...{ webkitdirectory: "", directory: "", multiple: true }}
              className="hidden" 
            />

            {/* Drag & Drop Upload Block */}
            <motion.div 
              layout
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerFileInput}
              whileHover={{ scale: uploading ? 1 : 1.01 }}
              whileTap={{ scale: uploading ? 1 : 0.99 }}
              className={`border rounded-xl p-5 text-center cursor-pointer transition-all duration-300 relative overflow-hidden group ${
                dragActive 
                  ? "border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.15)]" 
                  : "border-[#262626] bg-[#121214] hover:bg-[#161618] hover:border-slate-600"
              }`}
            >
              {/* Subtle background glow pattern */}
              <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

              <AnimatePresence mode="wait">
                {uploading ? (
                  <motion.div 
                    key="uploading-state"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col text-left py-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
                        <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider font-mono">
                          Indexing Pipeline
                        </span>
                      </div>
                      {uploadStats && (
                        <span className="text-[10px] font-mono text-slate-400 bg-[#1e1e21] px-2 py-0.5 rounded border border-[#2d2d30]">
                          {uploadStats.current} / {uploadStats.total}
                        </span>
                      )}
                    </div>

                    {uploadStats ? (
                      <div className="space-y-3">
                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[11px] text-slate-400">
                            <span className="truncate max-w-[170px] text-slate-300 font-medium font-mono" title={uploadStats.currentFileName}>
                              {uploadStats.currentFileName || "Awaiting thread..."}
                            </span>
                            <span className="font-mono text-blue-400 font-semibold shrink-0">
                              {Math.round((uploadStats.current / uploadStats.total) * 100)}%
                            </span>
                          </div>
                          <div className="w-full bg-[#1e1e21] h-1.5 rounded-full overflow-hidden border border-[#2d2d30]">
                            <motion.div 
                              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${(uploadStats.current / uploadStats.total) * 100}%` }}
                              transition={{ duration: 0.2 }}
                            />
                          </div>
                        </div>

                        {/* Summary metrics */}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#1e1e21]">
                          <div className="bg-[#161618] p-1.5 rounded border border-[#262626] text-center">
                            <p className="text-[9px] font-mono uppercase text-slate-500 tracking-wider">Processed</p>
                            <p className="text-xs font-mono font-bold text-emerald-400">{uploadStats.successCount}</p>
                          </div>
                          <div className="bg-[#161618] p-1.5 rounded border border-[#262626] text-center">
                            <p className="text-[9px] font-mono uppercase text-slate-500 tracking-wider">Errors/Skips</p>
                            <p className="text-xs font-mono font-bold text-rose-400">{uploadStats.failCount}</p>
                          </div>
                        </div>

                        {/* Recent files log - limited to last 2 for compact space */}
                        {uploadStats.processedList.length > 0 && (
                          <div className="space-y-1 text-[10px] font-mono pt-1">
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Activity Log</p>
                            <div className="bg-[#161618] border border-[#262626] rounded p-1.5 max-h-16 overflow-y-auto space-y-1 divide-y divide-[#262626]/45 scrollbar-none">
                              {uploadStats.processedList.slice(-2).reverse().map((item, index) => (
                                <div key={index} className="flex items-center justify-between py-1 first:pt-0 last:pb-0">
                                  <span className="truncate text-slate-400 max-w-[160px]">{item.name}</span>
                                  {item.status === 'success' ? (
                                    <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1 rounded border border-emerald-500/20 font-bold uppercase font-mono">OK</span>
                                  ) : (
                                    <span className="text-[9px] text-rose-400 bg-rose-500/10 px-1 rounded border border-rose-500/20 font-bold uppercase font-mono">FAIL</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-2 text-center">
                        <p className="text-xs font-medium text-blue-400">Processing Documents...</p>
                        <p className="text-[10px] text-slate-500 mt-1">Extracting, Chunking & Embeddings generation</p>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div 
                    key="idle-state"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="flex flex-col items-center"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#1a1a1e] border border-[#262626] flex items-center justify-center mb-3 group-hover:border-blue-500/40 group-hover:bg-blue-500/5 transition-all duration-300">
                      <Upload className="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors duration-300" />
                    </div>
                    <p className="text-xs font-semibold text-slate-200">Drag & Drop Files or Folders Here</p>
                    <p className="text-[10px] text-slate-500 mt-1 mb-4">Supports Multi-Folders, PDF, DOCX, TXT, MD, Images</p>
                    
                    {/* Dedicated Action Buttons to Click and Upload */}
                    <div className="flex gap-2 w-full">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerFileInput();
                        }}
                        className="flex-1 py-1.5 px-3 bg-[#1e1e21] hover:bg-blue-600 hover:text-white text-[11px] text-slate-300 rounded border border-[#2d2d30] hover:border-blue-500 font-medium transition-all duration-200 shadow-sm"
                      >
                        Choose Files
                      </button>
                      <button
                        type="button"
                        onClick={triggerFolderInput}
                        className="flex-1 py-1.5 px-3 bg-[#1e1e21] hover:bg-blue-600 hover:text-white text-[11px] text-slate-300 rounded border border-[#2d2d30] hover:border-blue-500 font-medium transition-all duration-200 shadow-sm"
                      >
                        Choose Folder
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {uploadError && (
              <div className="mt-3 p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-[11px] text-rose-400">
                {uploadError}
              </div>
            )}
          </div>

          {/* Document list */}
          <div 
            className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-none"
            onScroll={() => setHoveredDoc(null)}
            onMouseLeave={() => setHoveredDoc(null)}
          >
            <h3 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-1">
              Indexed Documents ({documents.length})
            </h3>
            
            {loadingDocuments ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 bg-[#161618] rounded-xl border border-[#262626] p-4">
                <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-medium">No documents loaded</p>
                <p className="text-[10px] text-slate-500 mt-1">Uploaded files will be processed, chunked, and embedded instantly.</p>
              </div>
            ) : (
              documents.map(doc => {
                const ext = doc.name.split('.').pop()?.toLowerCase() || "";
                const isImg = doc.type?.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif"].includes(ext);
                
                return (
                  <div 
                    key={doc.id}
                    onClick={() => viewChunks(doc)}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltipY(rect.top + rect.height / 2);
                      setHoveredDoc(doc);
                    }}
                    onMouseLeave={() => setHoveredDoc(null)}
                    className={`flex items-start justify-between p-3 rounded-lg border cursor-pointer transition-all duration-200 relative ${
                      activeChunksDoc?.id === doc.id 
                        ? "bg-blue-600/10 border-blue-500/40 text-blue-300" 
                        : "bg-[#161618] border-[#262626] hover:bg-[#202024] text-slate-300"
                    }`}
                  >
                    <div className="flex items-start space-x-2.5 overflow-hidden">
                      {isImg ? (
                        <Image className={`w-4 h-4 shrink-0 mt-0.5 ${activeChunksDoc?.id === doc.id ? "text-blue-400" : "text-slate-400"}`} />
                      ) : (
                        <FileText className={`w-4 h-4 shrink-0 mt-0.5 ${activeChunksDoc?.id === doc.id ? "text-blue-400" : "text-slate-400"}`} />
                      )}
                      <div className="overflow-hidden">
                        <p className="text-xs font-semibold text-slate-200 truncate pr-2">{doc.name}</p>
                        <div className="flex items-center space-x-2 mt-1 text-[10px] text-slate-400 font-mono">
                          <span>{formatSize(doc.size)}</span>
                          <span>•</span>
                          <span className="text-emerald-400 font-bold">{doc.chunksCount} Chunks</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => deleteDocument(doc.id, e)}
                      className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 rounded transition shrink-0"
                      title="Remove document index"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Vector Storage metadata footprint */}
          <div className="p-4 bg-[#161618] border-t border-[#262626] space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span className="font-mono">Total Vector Dimensions</span>
              <span className="font-semibold text-white font-mono">384 (MiniLM)</span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span className="font-mono">Retrieved Context Limits</span>
              <span className="font-semibold text-white font-mono">Top K=4 (~3,200 tokens)</span>
            </div>
          </div>
        </aside>

        {/* Middle/Right Container */}
        <main className="flex-1 flex flex-col bg-[#0c0c0e] overflow-hidden relative">
          
          {/* Sub Navigation Bar */}
          <div className="flex items-center justify-between px-6 py-2 bg-[#0f0f11] border-b border-[#262626] shrink-0">
            <div className="flex gap-1.5">
              <button 
                onClick={() => setActiveTab("playground")}
                className={`px-4 py-2 text-xs font-medium rounded-lg border transition-all duration-200 ${
                  activeTab === "playground" 
                    ? "bg-[#161618] border-[#262626] text-white font-semibold shadow-md" 
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                Interactive RAG Chat
              </button>
              <button 
                onClick={() => setActiveTab("architecture")}
                className={`px-4 py-2 text-xs font-medium rounded-lg border transition-all duration-200 ${
                  activeTab === "architecture" 
                    ? "bg-[#161618] border-[#262626] text-white font-semibold shadow-md" 
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                Interactive Vector DB Visualizer
              </button>
              <button 
                onClick={() => setActiveTab("local_cli")}
                className={`px-4 py-2 text-xs font-medium rounded-lg border transition-all duration-200 ${
                  activeTab === "local_cli" 
                    ? "bg-[#161618] border-[#262626] text-white font-semibold shadow-md" 
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                Local Deployment & Commands
              </button>
            </div>

            {/* Quick model configuration controls */}
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-mono text-[11px]">Model:</span>
                <select 
                  value={selectedModel}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="bg-[#161618] border border-[#262626] text-slate-200 rounded px-2 py-1 text-xs font-medium focus:outline-none focus:border-blue-500"
                >
                  <option value="llama3.2:3b">llama3.2 (3B)</option>
                  <option value="llama3:8b">llama3 (8B)</option>
                  <option value="mistral:7b">mistral (7B)</option>
                  <option value="phi3:3.8b">phi3 (3.8B)</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-mono text-[11px]">Embeddings:</span>
                <select 
                  value={selectedEmbedding}
                  onChange={(e) => handleEmbeddingChange(e.target.value)}
                  className="bg-[#161618] border border-[#262626] text-slate-200 rounded px-2 py-1 text-xs font-medium focus:outline-none focus:border-blue-500"
                >
                  <option value="all-minilm">all-MiniLM-L6-v2</option>
                  <option value="nomic-embed-text">nomic-embed-text</option>
                </select>
              </div>
            </div>
          </div>

          {/* Interactive tabs */}
          <div className="flex-1 overflow-hidden flex">
            
            {/* Left Portion: Tab Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              
              {activeTab === "playground" && (
                <div className="flex-1 flex flex-col overflow-hidden relative">
                  
                  {/* Subtle Grid overlay background */}
                  <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "32px 32px" }}></div>
                  
                  {/* Chat Message Lists */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 relative z-10">
                    {chatMessages.map((msg) => (
                      <div 
                        key={msg.id} 
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[85%] flex space-x-3.5 ${msg.role === "user" ? "flex-row-reverse space-x-reverse" : "flex-row"}`}>
                          
                          {/* Avatar */}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-md ${
                            msg.role === "user" 
                              ? "bg-blue-600 text-white font-bold text-sm" 
                              : "bg-[#161618] text-blue-400 border border-[#262626]"
                          }`}>
                            {msg.role === "user" ? "U" : <Cpu className="w-4 h-4" />}
                          </div>

                          {/* Message bubble */}
                          <div className="space-y-1">
                            <div className={`p-4 rounded-2xl shadow-lg ${
                              msg.role === "user" 
                                ? "bg-blue-600 text-white" 
                                : "bg-[#161618] border border-[#262626] text-slate-100"
                            }`}>
                              <p className="text-sm whitespace-pre-line leading-relaxed">{msg.content}</p>
                              
                              {/* Display page citation triggers if present */}
                              {msg.citations && msg.citations.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-[#262626] space-y-2">
                                  <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                                    Retrieved Context Sources ({msg.citations.length})
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {msg.citations.map((cit, idx) => (
                                      <div 
                                        key={idx}
                                        className="text-xs bg-[#0c0c0e] border border-blue-500/20 text-slate-300 rounded px-2.5 py-1 flex items-center cursor-pointer hover:border-blue-500/50 transition-all group"
                                        title={`Page ${cit.pageNumber || "N/A"} • Similarity: ${(cit.similarity * 100).toFixed(1)}%`}
                                      >
                                        <FileText className="w-3.5 h-3.5 text-blue-400 mr-1.5" />
                                        <span className="font-medium truncate max-w-[140px]">{cit.docName}</span>
                                        <span className="text-[10px] bg-[#161618] text-slate-400 ml-1.5 px-1 rounded font-mono border border-[#262626]">
                                          p.{cit.pageNumber || "1"}
                                        </span>
                                        <span className="text-[10px] text-blue-400 font-mono ml-2 font-semibold">
                                          {(cit.similarity * 100).toFixed(0)}%
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Timestamp / Details */}
                            <div className="flex items-center space-x-2 text-[10px] text-slate-500 px-1 font-mono">
                              <span>{msg.timestamp}</span>
                              {msg.modelUsed && (
                                <>
                                  <span>•</span>
                                  <span className="text-blue-400 font-semibold">{msg.modelUsed}</span>
                                </>
                              )}
                            </div>
                          </div>

                        </div>
                      </div>
                    ))}

                    {/* Step-by-step active pipelines */}
                    {querying && (
                      <div className="flex justify-start">
                        <div className="flex space-x-3 max-w-[85%]">
                          <div className="w-8 h-8 rounded-lg bg-[#161618] text-blue-400 border border-[#262626] flex items-center justify-center shrink-0">
                            <Cpu className="w-4 h-4 animate-spin" />
                          </div>
                          
                          <div className="space-y-3 bg-[#161618] border border-[#262626] p-4 rounded-2xl w-80 shadow-2xl">
                            <p className="text-xs font-semibold text-slate-200">Active RAG Retrieval Chain</p>
                            
                            <div className="space-y-2">
                              {/* Step 1 */}
                              <div className="flex items-center justify-between text-xs font-mono p-1.5 rounded bg-[#0c0c0e] border border-[#262626]">
                                <span className="flex items-center text-slate-300">
                                  <Network className="w-3.5 h-3.5 text-blue-400 mr-2" />
                                  1. Embedding Query
                                </span>
                                {activeStep === "embedding" ? (
                                  <span className="text-blue-400 animate-pulse text-[10px] font-bold uppercase">Active</span>
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                )}
                              </div>

                              {/* Step 2 */}
                              <div className="flex items-center justify-between text-xs font-mono p-1.5 rounded bg-[#0c0c0e] border border-[#262626]">
                                <span className="flex items-center text-slate-300">
                                  <Search className="w-3.5 h-3.5 text-amber-400 mr-2" />
                                  2. Semantic Vector Match
                                </span>
                                {activeStep === "embedding" ? (
                                  <span className="text-slate-600 text-[10px] uppercase font-bold">Pending</span>
                                ) : activeStep === "retrieving" ? (
                                  <span className="text-amber-400 animate-pulse text-[10px] font-bold uppercase">Active</span>
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                )}
                              </div>

                              {/* Step 3 */}
                              <div className="flex items-center justify-between text-xs font-mono p-1.5 rounded bg-[#0c0c0e] border border-[#262626]">
                                <span className="flex items-center text-slate-300">
                                  <Sliders className="w-3.5 h-3.5 text-emerald-400 mr-2" />
                                  3. Local LLM Synthesis
                                </span>
                                {activeStep === "generating" ? (
                                  <span className="text-emerald-400 animate-pulse text-[10px] font-bold uppercase font-mono">Writing</span>
                                ) : (
                                  <span className="text-slate-600 text-[10px] uppercase font-bold">Pending</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input Form Box */}
                  <form 
                    onSubmit={handleQuerySubmit}
                    className="p-4 bg-[#0f0f11] border-t border-[#262626] flex items-center space-x-3 shrink-0 relative z-10"
                  >
                    <div className="relative flex-1">
                      <input 
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={documents.length === 0 ? "⚠️ Load files in the sidebar first to chat..." : "Ask semantic questions about your private files..."}
                        disabled={querying || documents.length === 0}
                        className="w-full bg-[#161618] text-slate-200 text-sm pl-4 pr-12 py-3 rounded-xl border border-[#262626] focus:outline-none focus:border-blue-500 transition-all duration-200 disabled:opacity-50"
                      />
                      <button 
                        type="submit"
                        disabled={!query.trim() || querying}
                        className="absolute right-2 top-1.5 p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-all disabled:opacity-40"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </form>

                </div>
              )}

              {/* Interactive Vector DB Space Visualizer */}
              {activeTab === "architecture" && (
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <div className="p-5 bg-[#161618] border border-[#262626] rounded-2xl shadow-xl">
                    <h2 className="text-md font-bold text-slate-200 mb-2 flex items-center">
                      <Network className="w-5 h-5 text-blue-400 mr-2" />
                      Semantic Vector Map Projection
                    </h2>
                    <p className="text-xs text-slate-400 mb-4">
                      High-dimensional chunk embeddings (384 dimensions) projected into a 2D spatial coordinate space. Closer points represent stronger semantic resemblance. Click on any point node to inspect its exact text context.
                    </p>

                    {/* Interactive Dot Grid Mapping */}
                    <div className="h-64 bg-[#0c0c0e] border border-[#262626] rounded-xl relative overflow-hidden flex items-center justify-center p-4 shadow-inner">
                      {/* Grid overlay */}
                      <div className="absolute inset-0 grid grid-cols-12 grid-rows-6 opacity-5 pointer-events-none">
                        {Array.from({ length: 72 }).map((_, i) => (
                          <div key={i} className="border-t border-l border-[#262626]" />
                        ))}
                      </div>

                      {documents.length === 0 ? (
                        <div className="text-center space-y-2 z-10">
                          <Database className="w-10 h-10 text-slate-700 mx-auto" />
                          <p className="text-xs text-slate-500">Vector store database is empty.</p>
                          <p className="text-[10px] text-slate-600">Index some PDF, DOCX, or text files to populate nodes.</p>
                        </div>
                      ) : (
                        <div className="absolute inset-0 p-8 flex items-center justify-center">
                          {/* Render beautiful floating vector dots with smooth entry and exit animations */}
                          <AnimatePresence>
                            {documents.flatMap((doc, docIdx) => {
                              return Array.from({ length: Math.min(doc.chunksCount, 12) }).map((_, chunkIdx) => {
                                // Seed-based pseudo-random coords to make coordinates consistent
                                const x = 10 + (Math.sin(docIdx * 33 + chunkIdx * 17) * 40 + 40);
                                const y = 10 + (Math.cos(docIdx * 19 + chunkIdx * 23) * 40 + 40);
                                const similarityHigh = lastRAGTrace?.citations.some(cit => cit.docName === doc.name);
                                const nodeKey = `node_${doc.id}_${chunkIdx}`;

                                return (
                                  <motion.button
                                    key={nodeKey}
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    whileHover={{ scale: 1.5, zIndex: 30 }}
                                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                    className={`absolute w-3 h-3 rounded-full cursor-pointer border border-[#0c0c0e] z-10 shadow-md transition-all duration-200 ${
                                      similarityHigh 
                                        ? "bg-amber-400 ring-4 ring-amber-400/30 shadow-amber-500/30" 
                                        : docIdx % 3 === 0 
                                          ? "bg-blue-500 shadow-blue-500/20" 
                                          : docIdx % 3 === 1 
                                            ? "bg-emerald-500 shadow-emerald-500/20" 
                                            : "bg-pink-500 shadow-pink-500/20"
                                    }`}
                                    style={{ left: `${x}%`, top: `${y}%` }}
                                    onClick={() => {
                                      viewChunks(doc);
                                    }}
                                    title={`Doc: ${doc.name} (Chunk #${chunkIdx + 1})`}
                                  />
                                );
                              });
                            })}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Explanations about the Vector Math */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 bg-[#161618] border border-[#262626] rounded-xl shadow-lg">
                      <h3 className="text-xs uppercase font-mono tracking-wider text-blue-400 mb-2 font-bold">
                        How Cosine Similarity Works
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Computers don't understand words; they understand numbers. Our embedding model processes text chunk strings and encodes them into massive arrays of fractional numbers (vectors).
                        <br /><br />
                        When you write a query, we embed it using the exact same model. We then measure the angle between the query vector (A) and every chunk vector (B) using the **Cosine Similarity** formula:
                      </p>
                      <div className="my-3 p-3 bg-[#0c0c0e] border border-[#262626] rounded-lg text-center font-mono text-xs text-slate-300">
                        Similarity = cos(θ) = (A · B) / (||A|| ||B||)
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        If two vectors point in the identical direction, the angle is 0, giving a perfect cosine match of **1.0 (100% Match)**. If they are orthogonal, it results in **0.0 (0% Match)**.
                      </p>
                    </div>

                    <div className="p-5 bg-[#161618] border border-[#262626] rounded-xl shadow-lg">
                      <h3 className="text-xs uppercase font-mono tracking-wider text-emerald-400 mb-2 font-bold">
                        Why We Chunk Documents First
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Why not send the whole document directly to the LLM?
                        <br /><br />
                        1. **Token Window Limitations**: LLMs have memory limits (Context Windows). Large files like 200-page booklets cannot fit into a local model's prompt.
                        2. **Information Overload**: If you dump too much text inside the prompt, the model gets confused (known as "Lost in the Middle").
                        3. **Precision Focus**: Slicing the file into tiny paragraphs (chunks of 800 characters) lets us pinpoint and fetch ONLY the exact paragraphs necessary to answer your question.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Local CLI Setup tab */}
              {activeTab === "local_cli" && (
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  
                  {/* Step-by-Step Installation Console */}
                  <div className="bg-[#161618] border border-[#262626] rounded-2xl p-5 space-y-4 shadow-xl">
                    <h2 className="text-md font-bold text-slate-200 flex items-center">
                      <Terminal className="w-5 h-5 text-blue-400 mr-2" />
                      Local Terminal Commands & Setup Command Center
                    </h2>
                    <p className="text-xs text-slate-400">
                      Follow these commands step-by-step on your computer's terminal to deploy Ollama and run llama3.2 completely offline.
                    </p>

                    <div className="space-y-4 font-mono text-xs">
                      {/* CMD 1 */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-wider">
                          <span>1. Pull and Boot Ollama Service</span>
                          <button 
                            onClick={() => copyToClipboard("curl -fsSL https://ollama.com/install.sh | sh", "cmd1")}
                            className="flex items-center text-blue-400 hover:text-blue-300 transition"
                          >
                            {copiedText === "cmd1" ? <span className="text-emerald-400">Copied!</span> : <><Copy className="w-3.5 h-3.5 mr-1" /> Copy</>}
                          </button>
                        </div>
                        <div className="bg-[#0c0c0e] p-3 rounded-lg border border-[#262626] text-slate-300">
                          curl -fsSL https://ollama.com/install.sh | sh
                        </div>
                      </div>

                      {/* CMD 2 */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-wider">
                          <span>2. Download Llama 3.2 3B Model</span>
                          <button 
                            onClick={() => copyToClipboard("ollama pull llama3.2", "cmd2")}
                            className="flex items-center text-blue-400 hover:text-blue-300 transition"
                          >
                            {copiedText === "cmd2" ? <span className="text-emerald-400">Copied!</span> : <><Copy className="w-3.5 h-3.5 mr-1" /> Copy</>}
                          </button>
                        </div>
                        <div className="bg-[#0c0c0e] p-3 rounded-lg border border-[#262626] text-slate-300">
                          ollama pull llama3.2
                        </div>
                      </div>

                      {/* CMD 3 */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-wider">
                          <span>3. Run Llama3.2 directly in console</span>
                          <button 
                            onClick={() => copyToClipboard("ollama run llama3.2", "cmd3")}
                            className="flex items-center text-blue-400 hover:text-blue-300 transition"
                          >
                            {copiedText === "cmd3" ? <span className="text-emerald-400">Copied!</span> : <><Copy className="w-3.5 h-3.5 mr-1" /> Copy</>}
                          </button>
                        </div>
                        <div className="bg-[#0c0c0e] p-3 rounded-lg border border-[#262626] text-slate-300">
                          ollama run llama3.2
                        </div>
                      </div>

                      {/* CMD 4 */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-wider">
                          <span>4. Run multi-container Docker stack</span>
                          <button 
                            onClick={() => copyToClipboard("docker-compose up --build", "cmd4")}
                            className="flex items-center text-blue-400 hover:text-blue-300 transition"
                          >
                            {copiedText === "cmd4" ? <span className="text-emerald-400">Copied!</span> : <><Copy className="w-3.5 h-3.5 mr-1" /> Copy</>}
                          </button>
                        </div>
                        <div className="bg-[#0c0c0e] p-3 rounded-lg border border-[#262626] text-slate-300">
                          docker-compose up --build
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Right portion: Document Chunk Monitor Panel */}
            <div className="w-80 border-l border-[#262626] bg-[#0f0f11] flex flex-col overflow-hidden shrink-0">
              <div className="p-4 border-b border-[#262626] flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 uppercase font-mono flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400 animate-pulse" />
                  Live Chunk Viewer
                </h3>
              </div>

              {/* Dynamic Chunk Details list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {activeChunksDoc ? (
                  <>
                    <div className="p-2.5 bg-blue-600/5 rounded-lg border border-blue-500/20 mb-2">
                      <div className="flex items-center space-x-1.5">
                        <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                        <span className="text-xs font-bold text-white truncate">{activeChunksDoc.name}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 font-mono">{activeChunksDoc.chunksCount} individual semantic chunks generated</p>
                    </div>

                    {loadingChunks ? (
                      <div className="flex items-center justify-center py-10">
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : chunks.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-10">No parsed text chunk outputs found.</p>
                    ) : (
                      chunks.map(ch => (
                        <div 
                          key={ch.id}
                          className="bg-[#161618] border border-[#262626] p-3 rounded-lg space-y-2 text-slate-300 relative group hover:border-blue-500/50 transition-all duration-200"
                        >
                          <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 border-b border-[#262626] pb-1.5">
                            <span>CHUNK #{ch.index + 1}</span>
                            <span className="bg-[#0c0c0e] text-slate-400 px-1 rounded border border-[#262626]">p.{ch.pageNumber || "1"}</span>
                          </div>
                          <p className="text-[11px] leading-relaxed line-clamp-4 select-text text-slate-300">{ch.text}</p>
                        </div>
                      ))
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-center p-4">
                    <Sliders className="w-10 h-10 text-slate-700 mb-3" />
                    <p className="text-xs text-slate-400 font-semibold">No Document Selected</p>
                    <p className="text-[10px] text-slate-500 mt-1">Select any loaded file in the Document list on the left to inspect its live segmented chunks here.</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Premium Developer Footer */}
          <footer className="h-10 bg-[#0f0f11] border-t border-[#262626] px-6 flex items-center justify-between text-[10px] font-mono text-slate-500 shrink-0 relative z-10">
            <div className="flex gap-4">
              <span>LOGS: [2026-07-08 22:52:42] RAG_VECTOR_DB: ONLINE</span>
              <span>LOGS: [2026-07-08 22:52:45] SYSTEM_ORCHESTRATOR: READY</span>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-emerald-500">SYSTEM STABLE</span>
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span>CPU: 8%</span>
            </div>
          </footer>

        </main>
      </div>

      {/* Hover-based Document Metadata Tooltip with Framer Motion */}
      <AnimatePresence>
        {hoveredDoc && (
          <motion.div
            initial={{ opacity: 0, x: -15, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -15, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 26 }}
            className="fixed z-50 pointer-events-none bg-[#131315]/95 backdrop-blur-md border border-[#2d2d30] shadow-[0_12px_40px_rgba(0,0,0,0.6)] rounded-xl p-4 w-80 text-xs text-slate-300"
            style={{ 
              top: tooltipY, 
              left: "332px", 
              transform: "translateY(-50%)" 
            }}
          >
            {/* Visual indicators */}
            <div className="flex items-start gap-3 border-b border-[#262626] pb-3 mb-3">
              <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg shrink-0 text-blue-400">
                {(() => {
                  const ext = hoveredDoc.name.split('.').pop()?.toLowerCase() || "";
                  const isImg = hoveredDoc.type?.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif"].includes(ext);
                  return isImg ? <Image className="w-5 h-5" /> : <FileText className="w-5 h-5" />;
                })()}
              </div>
              <div className="overflow-hidden">
                <h4 className="font-bold text-white text-xs break-all pr-1 leading-tight">
                  {hoveredDoc.name}
                </h4>
                <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-mono">
                  {(() => {
                    const ext = hoveredDoc.name.split('.').pop()?.toUpperCase() || "";
                    if (hoveredDoc.type?.startsWith("image/") || ["PNG", "JPG", "JPEG", "WEBP", "GIF"].includes(ext)) {
                      return `${ext || "IMAGE"} Format Image`;
                    }
                    if (ext === "PDF") return "PDF Document";
                    if (ext === "DOCX") return "MS Word Document";
                    if (ext === "TXT") return "Plain Text File";
                    if (ext === "MD") return "Markdown File";
                    return hoveredDoc.type || "Document File";
                  })()}
                </p>
              </div>
            </div>

            {/* Metadata Fields Grid */}
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="bg-[#1c1c1e] p-2 rounded border border-[#262626]">
                <span className="text-slate-500 block mb-0.5">FILE SIZE</span>
                <span className="text-white font-semibold">{formatSize(hoveredDoc.size)}</span>
              </div>
              <div className="bg-[#1c1c1e] p-2 rounded border border-[#262626]">
                <span className="text-slate-500 block mb-0.5">SEGMENTS</span>
                <span className="text-emerald-400 font-bold">{hoveredDoc.chunksCount} Chunks</span>
              </div>
              <div className="bg-[#1c1c1e] p-2 rounded border border-[#2d2d30] col-span-2 flex items-center gap-1.5 text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <div className="overflow-hidden">
                  <span className="text-[9px] text-slate-500 block">INDEXED TIMESTAMP</span>
                  <span className="text-slate-300 block truncate">
                    {new Date(hoveredDoc.createdAt).toLocaleString(undefined, { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Context hints */}
            <div className="mt-3 flex items-center justify-between text-[9px] text-slate-500 border-t border-[#262626]/40 pt-2 font-mono">
              <span>STATUS: READY</span>
              <span>ID: {hoveredDoc.id.slice(0, 8)}...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
