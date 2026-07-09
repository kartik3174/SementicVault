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

  // active workspace tab: "playground" | "architecture" | "local_cli" | "pipeline"
  const [activeTab, setActiveTab] = useState<string>("playground");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Document Chunking Pipeline Visualizer States
  const [pipelineSourceType, setPipelineSourceType] = useState<"text" | "doc">("text");
  const [pipelineText, setPipelineText] = useState<string>(
    `SemanticVault RAG Chunker Test Document\n\n` +
    `Retrieval-Augmented Generation (RAG) is an AI framework for improving the quality of LLM responses by grounding the model on external sources of knowledge. Slicing documents into smaller text parts (chunks) is essential for indexing. This is a paragraph demonstrating chunking.\n\n` +
    `Recursive character chunking is a sophisticated technique. It tries to split the text by structural elements like double newlines first, then single newlines, then spaces, and finally single characters if needed. This preserves semantic meaning by keeping related sentences together in the same chunk.\n\n` +
    `Overlap variables allow consecutive chunks to share a small region of text. This overlap is crucial because it ensures that information situated exactly at a boundary is not split and lost. For example, if a key sentence spans across Chunk 1 and Chunk 2, the overlap region helps retain full context for both embeddings.\n\n` +
    `Try modifying the Chunk Size and Chunk Overlap parameters on the left to see how the segment highlights and overlap regions update dynamically! You can also toggle different custom cleaning normalizations like collapsing spaces or standardizing bullet points.`
  );
  const [pipelineSelectedDocId, setPipelineSelectedDocId] = useState<string>("");
  const [pipelineChunkSize, setPipelineChunkSize] = useState<number>(400);
  const [pipelineChunkOverlap, setPipelineChunkOverlap] = useState<number>(80);
  const [pipelineRemoveNonPrintable, setPipelineRemoveNonPrintable] = useState<boolean>(true);
  const [pipelineNormalizeQuotes, setPipelineNormalizeQuotes] = useState<boolean>(true);
  const [pipelineCleanBullets, setPipelineCleanBullets] = useState<boolean>(true);
  const [pipelineCollapseSpaces, setPipelineCollapseSpaces] = useState<boolean>(true);
  const [pipelineMaxNewlines, setPipelineMaxNewlines] = useState<number>(2);

  const [pipelineLoading, setPipelineLoading] = useState<boolean>(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [pipelineResults, setPipelineResults] = useState<{
    success: boolean;
    statistics: {
      original_characters: number;
      cleaned_characters: number;
      reduction_ratio: number;
      total_chunks: number;
      average_chunk_length: number;
    };
    cleaned_text: string;
    chunks: Array<{
      index: number;
      text: string;
      char_start: number;
      char_end: number;
      length: number;
      overlap_before: string;
      overlap_after: string;
    }>;
  } | null>(null);

  const [selectedPipelineChunkIdx, setSelectedPipelineChunkIdx] = useState<number | null>(null);
  const [hoveredPipelineChunkIdx, setHoveredPipelineChunkIdx] = useState<number | null>(null);

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

  const handlePipelineRun = async () => {
    setPipelineLoading(true);
    setPipelineError(null);
    setSelectedPipelineChunkIdx(null);
    setHoveredPipelineChunkIdx(null);

    try {
      let textToChunk = pipelineText;
      if (pipelineSourceType === "doc") {
        if (!pipelineSelectedDocId) {
          throw new Error("Please select an indexed document from the dropdown.");
        }
        const rawRes = await fetch(`/api/documents/${pipelineSelectedDocId}/raw`);
        if (!rawRes.ok) {
          throw new Error("Failed to load raw document content.");
        }
        const rawData = await rawRes.json();
        textToChunk = rawData.rawText;
        setPipelineText(textToChunk);
      }

      const res = await fetch("/api/chunking-preview/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToChunk,
          params: {
            chunk_size: pipelineChunkSize,
            chunk_overlap: pipelineChunkOverlap,
            remove_non_printable: pipelineRemoveNonPrintable,
            normalize_quotes: pipelineNormalizeQuotes,
            clean_bullets: pipelineCleanBullets,
            collapse_spaces: pipelineCollapseSpaces,
            max_newlines: pipelineMaxNewlines
          }
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to execute pipeline preview");
      }

      const data = await res.json();
      setPipelineResults(data);
    } catch (err: any) {
      console.error("Pipeline run failed", err);
      setPipelineError(err.message || "An unexpected error occurred during chunking.");
    } finally {
      setPipelineLoading(false);
    }
  };

  // Auto-fetch raw text when a pipeline document selection changes
  useEffect(() => {
    if (pipelineSourceType === "doc" && pipelineSelectedDocId) {
      const loadDocRaw = async () => {
        try {
          const rawRes = await fetch(`/api/documents/${pipelineSelectedDocId}/raw`);
          if (rawRes.ok) {
            const rawData = await rawRes.json();
            setPipelineText(rawData.rawText);
          }
        } catch (e) {
          console.error("Failed to prefetch document text", e);
        }
      };
      loadDocRaw();
    }
  }, [pipelineSelectedDocId, pipelineSourceType]);

  // Run initial pipeline when pipeline tab is selected
  useEffect(() => {
    if (activeTab === "pipeline" && !pipelineResults && !pipelineLoading) {
      handlePipelineRun();
    }
  }, [activeTab]);

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
              <button 
                onClick={() => setActiveTab("pipeline")}
                className={`px-4 py-2 text-xs font-medium rounded-lg border transition-all duration-200 ${
                  activeTab === "pipeline" 
                    ? "bg-[#161618] border-[#262626] text-white font-semibold shadow-md" 
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                Loader & Chunker Pipeline
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

              {activeTab === "pipeline" && (
                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-[#0c0c0e]">
                  {/* Left Panel: Configuration & Normalization */}
                  <div className="w-full lg:w-96 bg-[#0f0f11] border-r border-[#262626] p-5 overflow-y-auto space-y-6 flex flex-col shrink-0">
                    <div>
                      <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2 mb-1">
                        <Sliders className="w-4 h-4 text-blue-500" />
                        Pipeline Variables
                      </h2>
                      <p className="text-[10px] text-slate-500 font-mono">PHASE 2: CLEAN, NORMALIZATION & CHUNK</p>
                    </div>

                    {/* Config 1: Chunk Size */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-400">Target Chunk Size</span>
                        <span className="text-blue-400 font-bold">{pipelineChunkSize} chars</span>
                      </div>
                      <input 
                        type="range" 
                        min="100" 
                        max="1500" 
                        step="50"
                        value={pipelineChunkSize} 
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setPipelineChunkSize(val);
                          if (pipelineChunkOverlap >= val) {
                            setPipelineChunkOverlap(Math.max(0, val - 50));
                          }
                        }}
                        className="w-full h-1 bg-[#1e1e21] rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                      <p className="text-[10px] text-slate-500 leading-normal">
                        The target maximum character limit for each text segment.
                      </p>
                    </div>

                    {/* Config 2: Chunk Overlap */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-400">Chunk Overlap</span>
                        <span className="text-blue-400 font-bold">{pipelineChunkOverlap} chars</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="600" 
                        step="10"
                        value={pipelineChunkOverlap} 
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (val < pipelineChunkSize) {
                            setPipelineChunkOverlap(val);
                          }
                        }}
                        className="w-full h-1 bg-[#1e1e21] rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Characters shared between adjacent chunks to maintain context.
                      </p>
                    </div>

                    {/* Config 3: Source Select */}
                    <div className="space-y-2 pt-2 border-t border-[#1e1e21]">
                      <span className="text-[11px] uppercase tracking-wider text-slate-500 font-mono font-bold block mb-2">Input Source</span>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          type="button"
                          onClick={() => setPipelineSourceType("text")}
                          className={`py-1.5 px-3 text-xs font-mono rounded border transition ${
                            pipelineSourceType === "text" 
                              ? "bg-blue-600/10 border-blue-500/40 text-blue-400 font-semibold" 
                              : "bg-transparent border-[#262626] text-slate-400 hover:text-white"
                          }`}
                        >
                          Paste Text
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            setPipelineSourceType("doc");
                            if (documents.length > 0 && !pipelineSelectedDocId) {
                              setPipelineSelectedDocId(documents[0].id);
                            }
                          }}
                          className={`py-1.5 px-3 text-xs font-mono rounded border transition ${
                            pipelineSourceType === "doc" 
                              ? "bg-blue-600/10 border-blue-500/40 text-blue-400 font-semibold" 
                              : "bg-transparent border-[#262626] text-slate-400 hover:text-white"
                          }`}
                        >
                          Vault File
                        </button>
                      </div>

                      {pipelineSourceType === "doc" && (
                        <div className="pt-2">
                          <select 
                            value={pipelineSelectedDocId}
                            onChange={(e) => setPipelineSelectedDocId(e.target.value)}
                            className="w-full bg-[#161618] border border-[#262626] rounded p-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 font-mono"
                          >
                            <option value="" disabled>Select indexed document...</option>
                            {documents.map(doc => (
                              <option key={doc.id} value={doc.id}>{doc.name} ({formatSize(doc.size)})</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Config 4: Text Cleaning Custom Normalizations */}
                    <div className="space-y-3 pt-4 border-t border-[#1e1e21]">
                      <span className="text-[11px] uppercase tracking-wider text-slate-500 font-mono font-bold block">Text-Cleaning Filters</span>
                      
                      {/* Filter 1 */}
                      <label className="flex items-start gap-2.5 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          checked={pipelineCollapseSpaces}
                          onChange={(e) => setPipelineCollapseSpaces(e.target.checked)}
                          className="mt-0.5 w-3.5 h-3.5 rounded bg-[#161618] border-[#262626] text-blue-600 focus:ring-0 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs text-slate-300 group-hover:text-white transition font-mono">Collapse Whitespace</span>
                          <p className="text-[9px] text-slate-500">Converts multiple spaces/tabs into a single space.</p>
                        </div>
                      </label>

                      {/* Filter 2 */}
                      <label className="flex items-start gap-2.5 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          checked={pipelineCleanBullets}
                          onChange={(e) => setPipelineCleanBullets(e.target.checked)}
                          className="mt-0.5 w-3.5 h-3.5 rounded bg-[#161618] border-[#262626] text-blue-600 focus:ring-0 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs text-slate-300 group-hover:text-white transition font-mono">Standardize Lists</span>
                          <p className="text-[9px] text-slate-500">Transforms custom bullets into hyphens (-).</p>
                        </div>
                      </label>

                      {/* Filter 3 */}
                      <label className="flex items-start gap-2.5 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          checked={pipelineNormalizeQuotes}
                          onChange={(e) => setPipelineNormalizeQuotes(e.target.checked)}
                          className="mt-0.5 w-3.5 h-3.5 rounded bg-[#161618] border-[#262626] text-blue-600 focus:ring-0 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs text-slate-300 group-hover:text-white transition font-mono">Smart Quotes & Dashes</span>
                          <p className="text-[9px] text-slate-500">Converts curly quotes to standard ascii quotes.</p>
                        </div>
                      </label>

                      {/* Filter 4 */}
                      <label className="flex items-start gap-2.5 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          checked={pipelineRemoveNonPrintable}
                          onChange={(e) => setPipelineRemoveNonPrintable(e.target.checked)}
                          className="mt-0.5 w-3.5 h-3.5 rounded bg-[#161618] border-[#262626] text-blue-600 focus:ring-0 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs text-slate-300 group-hover:text-white transition font-mono">Strip Non-Printable</span>
                          <p className="text-[9px] text-slate-500">Removes unprintable binary characters.</p>
                        </div>
                      </label>

                      {/* Filter 5: Line breaks count config */}
                      <div className="space-y-1.5 pl-6">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-slate-500">Max Consecutive Newlines</span>
                          <span className="text-slate-300 font-bold">{pipelineMaxNewlines}</span>
                        </div>
                        <input 
                          type="range" 
                          min="1" 
                          max="4" 
                          value={pipelineMaxNewlines} 
                          onChange={(e) => setPipelineMaxNewlines(Number(e.target.value))}
                          className="w-full h-1 bg-[#1e1e21] rounded appearance-none cursor-pointer accent-blue-500"
                        />
                      </div>
                    </div>

                    {/* CTA Run Trigger */}
                    <button
                      onClick={handlePipelineRun}
                      disabled={pipelineLoading}
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-500/10 active:scale-95 transition-all flex items-center justify-center gap-2 font-mono"
                    >
                      {pipelineLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          COMPILING & PARSING...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          RUN EXTRACTION & CHUNK
                        </>
                      )}
                    </button>
                  </div>

                  {/* Right Panel: Code Sandbox & Segment visualization map */}
                  <div className="flex-1 flex flex-col overflow-hidden p-6 space-y-6">
                    
                    {/* Dynamic Source Input text area or summary */}
                    <div className="bg-[#0f0f11] border border-[#262626] rounded-2xl flex flex-col h-44 shrink-0 overflow-hidden relative">
                      <div className="h-8 border-b border-[#262626] bg-[#161618] px-4 flex items-center justify-between">
                        <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400">
                          Source Document Buffer
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {pipelineText.length} Characters
                        </span>
                      </div>
                      <textarea
                        value={pipelineText}
                        onChange={(e) => {
                          if (pipelineSourceType === "text") {
                            setPipelineText(e.target.value);
                          }
                        }}
                        disabled={pipelineSourceType === "doc" || pipelineLoading}
                        placeholder="Paste or write raw document text here..."
                        className="flex-1 bg-transparent p-4 text-xs font-mono text-slate-300 border-none outline-none resize-none placeholder-slate-600 focus:ring-0 leading-relaxed overflow-y-auto"
                      />
                      {pipelineSourceType === "doc" && (
                        <div className="absolute inset-0 bg-[#0c0c0e]/40 backdrop-blur-[1px] pointer-events-none flex items-center justify-center">
                          <span className="text-[10px] font-mono text-slate-400 bg-[#161618] border border-[#262626] px-3 py-1.5 rounded-lg shadow-lg">
                            🔒 VIEWING INDEXED FILE (EDIT VIA PASTE MODE)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Main Results area */}
                    <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
                      
                      {/* Left pane: Chunk listing & visual stats */}
                      <div className="flex-1 flex flex-col overflow-hidden bg-[#0f0f11] border border-[#262626] rounded-2xl">
                        <div className="h-10 border-b border-[#262626] bg-[#161618] px-5 flex items-center justify-between shrink-0">
                          <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400">
                            Generated Logical Chunks
                          </span>
                          {pipelineResults?.statistics && (
                            <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                              {pipelineResults.statistics.total_chunks} Segments
                            </span>
                          )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                          {pipelineError && (
                            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl font-mono">
                              ⚠️ {pipelineError}
                            </div>
                          )}

                          {pipelineLoading ? (
                            <div className="flex flex-col items-center justify-center py-24 space-y-3">
                              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                              <p className="text-xs text-slate-400 font-mono">Processing Pipeline Chunker Execution...</p>
                            </div>
                          ) : !pipelineResults ? (
                            <div className="flex flex-col items-center justify-center py-24 text-center">
                              <FileCode className="w-10 h-10 text-slate-700 mb-3" />
                              <p className="text-xs text-slate-400 font-semibold">No chunks generated yet</p>
                              <p className="text-[10px] text-slate-500 mt-1">Configure parameters and hit 'Run Extraction & Chunk' to visualize segmentation.</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {/* Stats Dashboard */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                                <div className="bg-[#161618] p-3 rounded-xl border border-[#262626] text-center">
                                  <p className="text-[9px] font-mono uppercase text-slate-500">Original Chars</p>
                                  <p className="text-md font-mono font-bold text-white mt-1">
                                    {pipelineResults.statistics.original_characters}
                                  </p>
                                </div>
                                <div className="bg-[#161618] p-3 rounded-xl border border-[#262626] text-center">
                                  <p className="text-[9px] font-mono uppercase text-slate-500">Normalized Chars</p>
                                  <p className="text-md font-mono font-bold text-white mt-1">
                                    {pipelineResults.statistics.cleaned_characters}
                                  </p>
                                </div>
                                <div className="bg-[#161618] p-3 rounded-xl border border-[#262626] text-center">
                                  <p className="text-[9px] font-mono uppercase text-slate-500">Trimmed Noise</p>
                                  <p className="text-md font-mono font-bold text-emerald-400 mt-1">
                                    {Math.round(pipelineResults.statistics.reduction_ratio * 1000) / 10}%
                                  </p>
                                </div>
                                <div className="bg-[#161618] p-3 rounded-xl border border-[#262626] text-center">
                                  <p className="text-[9px] font-mono uppercase text-slate-500">Avg Churn Chars</p>
                                  <p className="text-md font-mono font-bold text-blue-400 mt-1">
                                    {pipelineResults.statistics.average_chunk_length}
                                  </p>
                                </div>
                              </div>

                              {/* Grid indicator of all chunks */}
                              <div className="bg-[#161618] border border-[#262626] p-4 rounded-xl space-y-2">
                                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">Segmentation Density Grid</p>
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {pipelineResults.chunks.map((ch) => (
                                    <button
                                      key={ch.index}
                                      onMouseEnter={() => setHoveredPipelineChunkIdx(ch.index)}
                                      onMouseLeave={() => setHoveredPipelineChunkIdx(null)}
                                      onClick={() => setSelectedPipelineChunkIdx(ch.index)}
                                      className={`h-7 px-2.5 text-[10px] font-mono font-bold rounded-md border flex items-center transition-all ${
                                        selectedPipelineChunkIdx === ch.index
                                          ? "bg-blue-600 text-white border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)] scale-105"
                                          : hoveredPipelineChunkIdx === ch.index
                                            ? "bg-[#202024] border-slate-500 text-white"
                                            : "bg-[#0c0c0e] border-[#262626] text-slate-400 hover:text-slate-200"
                                      }`}
                                    >
                                      C-{ch.index + 1}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Listing */}
                              <div className="space-y-2 pt-2">
                                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Chunk Cards stack</p>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                  {pipelineResults.chunks.map((ch) => (
                                    <div
                                      key={ch.index}
                                      onClick={() => setSelectedPipelineChunkIdx(ch.index)}
                                      onMouseEnter={() => setHoveredPipelineChunkIdx(ch.index)}
                                      onMouseLeave={() => setHoveredPipelineChunkIdx(null)}
                                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition duration-150 relative overflow-hidden group ${
                                        selectedPipelineChunkIdx === ch.index
                                          ? "bg-blue-600/5 border-blue-500/40"
                                          : hoveredPipelineChunkIdx === ch.index
                                            ? "bg-[#1d1d21] border-[#2d2d30]"
                                            : "bg-[#131315] border-[#262626] hover:bg-[#1a1a1c]"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 border-b border-[#262626]/50 pb-2 mb-2">
                                        <span className={`${selectedPipelineChunkIdx === ch.index ? "text-blue-400 font-bold" : "text-slate-400"}`}>
                                          CHUNK #{ch.index + 1}
                                        </span>
                                        <span className="text-slate-500">{ch.length} chars</span>
                                      </div>
                                      <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 select-text pr-4">{ch.text}</p>
                                      
                                      <div className="flex items-center gap-3 pt-2.5 mt-2.5 border-t border-[#262626]/30 text-[9px] font-mono text-slate-500">
                                        {ch.overlap_before && (
                                          <span className="flex items-center text-purple-400">
                                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mr-1" />
                                            Prev Overlap ({ch.overlap_before.length}c)
                                          </span>
                                        )}
                                        {ch.overlap_after && (
                                          <span className="flex items-center text-emerald-400">
                                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1" />
                                            Next Overlap ({ch.overlap_after.length}c)
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right pane: Overlap Variables Highlight Visualizer */}
                      <div className="w-full lg:w-96 flex flex-col bg-[#0f0f11] border border-[#262626] rounded-2xl overflow-hidden">
                        <div className="h-10 border-b border-[#262626] bg-[#161618] px-5 flex items-center shrink-0">
                          <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400">
                            Interactive Overlap Inspection
                          </span>
                        </div>

                        <div className="flex-1 p-5 overflow-y-auto space-y-4">
                          {selectedPipelineChunkIdx !== null && pipelineResults ? (() => {
                            const ch = pipelineResults.chunks[selectedPipelineChunkIdx];
                            let overlapBeforePart = "";
                            let overlapAfterPart = "";
                            let centerPart = ch.text;

                            if (ch.overlap_before && ch.text.startsWith(ch.overlap_before)) {
                              overlapBeforePart = ch.overlap_before;
                              centerPart = centerPart.substring(ch.overlap_before.length);
                            }
                            if (ch.overlap_after && centerPart.endsWith(ch.overlap_after)) {
                              overlapAfterPart = ch.overlap_after;
                              centerPart = centerPart.substring(0, centerPart.length - ch.overlap_after.length);
                            }

                            return (
                              <div className="space-y-4">
                                <div className="flex justify-between items-center text-xs border-b border-[#262626] pb-3">
                                  <span className="font-mono text-slate-400">SELECTED CHUNK: #{ch.index + 1}</span>
                                  <span className="font-mono bg-[#161618] text-slate-300 border border-[#262626] px-2 py-0.5 rounded">
                                    {ch.length} chars
                                  </span>
                                </div>

                                <div className="space-y-2 p-3 bg-[#0c0c0e] border border-[#262626] rounded-xl text-[10px] font-mono">
                                  <p className="text-slate-400 uppercase font-bold text-[9px] mb-1">Color Legend</p>
                                  <div className="flex flex-col gap-1.5 text-slate-300">
                                    <div className="flex items-center gap-2">
                                      <span className="w-3 h-3 bg-purple-500/20 border border-purple-500/40 rounded shrink-0" />
                                      <span>Overlap with preceding chunk ({ch.overlap_before?.length || 0} chars)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="w-3 h-3 bg-blue-500/10 border border-blue-500/20 rounded shrink-0" />
                                      <span>Unique central segment</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="w-3 h-3 bg-emerald-500/20 border border-emerald-500/40 rounded shrink-0" />
                                      <span>Overlap with succeeding chunk ({ch.overlap_after?.length || 0} chars)</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="bg-[#0c0c0e] border border-[#262626] rounded-xl p-4 font-sans text-xs leading-relaxed text-slate-200 select-text space-y-4 shadow-inner">
                                  <div className="whitespace-pre-wrap leading-relaxed select-text">
                                    {overlapBeforePart && (
                                      <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 px-1 py-0.5 rounded-md font-semibold select-text" title="Overlaps with preceding chunk">
                                        {overlapBeforePart}
                                      </span>
                                    )}
                                    <span className="bg-blue-500/5 text-slate-200 px-1 py-0.5 select-text">
                                      {centerPart}
                                    </span>
                                    {overlapAfterPart && (
                                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1 py-0.5 rounded-md font-semibold select-text" title="Overlaps with next chunk">
                                        {overlapAfterPart}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                                  <button
                                    type="button"
                                    disabled={ch.index === 0}
                                    onClick={() => setSelectedPipelineChunkIdx(ch.index - 1)}
                                    className="bg-[#161618] p-2.5 rounded-xl border border-[#262626] text-left hover:bg-[#202024] transition disabled:opacity-40 disabled:pointer-events-none"
                                  >
                                    <span className="text-slate-500 block mb-0.5">← PREVIOUS</span>
                                    <span className="text-white">Chunk #{ch.index}</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={ch.index === pipelineResults.chunks.length - 1}
                                    onClick={() => setSelectedPipelineChunkIdx(ch.index + 1)}
                                    className="bg-[#161618] p-2.5 rounded-xl border border-[#262626] text-right hover:bg-[#202024] transition disabled:opacity-40 disabled:pointer-events-none"
                                  >
                                    <span className="text-slate-500 block mb-0.5">NEXT →</span>
                                    <span className="text-white">Chunk #{ch.index + 2}</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })() : (
                            <div className="flex flex-col items-center justify-center py-24 text-center">
                              <Sliders className="w-8 h-8 text-slate-700 mb-2" />
                              <p className="text-xs text-slate-400 font-semibold">No Segment Selected</p>
                              <p className="text-[10px] text-slate-500 mt-1">Select any chunk card on the left to inspect its exact overlap highlighting details.</p>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>

                  </div>
                </div>
              )}

            </div>

            {/* Right portion: Document Chunk Monitor Panel */}
            {activeTab !== "pipeline" && (
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
            )}

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
