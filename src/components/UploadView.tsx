import React, { useRef, useState } from "react";
import { 
  Upload, 
  Settings, 
  HelpCircle, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  FileText,
  FolderOpen,
  FileCode,
  Sparkles
} from "lucide-react";
import { ToastMessage } from "../types";

interface UploadViewProps {
  onUploadSuccess: () => void;
  addToast: (toast: Omit<ToastMessage, "id">) => void;
}

export function UploadView({ onUploadSuccess, addToast }: UploadViewProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    total: number;
    current: number;
    fileName: string;
    logs: string[];
  } | null>(null);

  // Chunking parameters state
  const [chunkSize, setChunkSize] = useState(800);
  const [chunkOverlap, setChunkOverlap] = useState(150);
  const [collapseSpaces, setCollapseSpaces] = useState(true);
  const [normalizeQuotes, setNormalizeQuotes] = useState(true);
  const [cleanBullets, setCleanBullets] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

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

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await uploadFiles(Array.from(e.target.files));
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const triggerFolderSelect = () => {
    folderInputRef.current?.click();
  };

  const uploadFiles = async (files: File[]) => {
    // Filter supported files
    const supportedExtensions = [".pdf", ".docx", ".txt", ".md", ".json"];
    const validFiles = files.filter(f => {
      const ext = f.name.substring(f.name.lastIndexOf(".")).toLowerCase();
      return supportedExtensions.includes(ext);
    });

    if (validFiles.length === 0) {
      addToast({
        title: "Unsupported File Format",
        description: "Please upload PDF, DOCX, TXT, MD, or JSON documents.",
        type: "error"
      });
      return;
    }

    setUploading(true);
    setUploadProgress({
      total: validFiles.length,
      current: 0,
      fileName: validFiles[0].name,
      logs: ["Starting upload & indexing pipeline...", "Loaded configuration: standard local normalizer"]
    });

    let successCount = 0;
    
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      setUploadProgress(prev => prev ? {
        ...prev,
        current: i,
        fileName: file.name,
        logs: [...prev.logs, `Parsing file structure: "${file.name}" (${(file.size / 1024).toFixed(1)} KB)`]
      } : null);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("chunk_size", chunkSize.toString());
      formData.append("chunk_overlap", chunkOverlap.toString());
      formData.append("collapse_spaces", collapseSpaces.toString());
      formData.append("normalize_quotes", normalizeQuotes.toString());
      formData.append("clean_bullets", cleanBullets.toString());

      try {
        const response = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData
        });

        const logMsg = response.ok 
          ? `✓ Fully parsed, chunked, and embedded "${file.name}" successfully.`
          : `❌ Failed to process "${file.name}": status ${response.status}.`;
          
        if (response.ok) successCount++;

        setUploadProgress(prev => prev ? {
          ...prev,
          logs: [...prev.logs, logMsg]
        } : null);

      } catch (err: any) {
        setUploadProgress(prev => prev ? {
          ...prev,
          logs: [...prev.logs, `❌ Network error parsing "${file.name}": ${err.message}`]
        } : null);
      }
    }

    setUploading(false);
    onUploadSuccess();
    
    if (successCount === validFiles.length) {
      addToast({
        title: "Indexing Success",
        description: `Successfully indexed ${successCount} documents.`,
        type: "success"
      });
    } else {
      addToast({
        title: "Indexing Completed",
        description: `Completed processing: ${successCount} succeeded out of ${validFiles.length}.`,
        type: "warning"
      });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-950 text-slate-100 flex flex-col lg:flex-row gap-6 select-none">
      {/* Upload Drag Card Area */}
      <div className="flex-1 flex flex-col gap-5">
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-xl font-bold text-slate-50 tracking-tight leading-none">Document Upload Vault</h2>
          <p className="text-xs text-slate-400 mt-2 font-medium">
            Surgical text extraction, cleaning, and storage in your local ChromaDB cluster.
          </p>
        </div>

        {/* Drag active target */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerFileSelect}
          className={`flex-1 min-h-[280px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-all ${
            dragActive
              ? "border-indigo-500 bg-indigo-500/5 shadow-inner shadow-indigo-500/10"
              : "border-slate-800 bg-slate-900/40 hover:bg-slate-900/70 hover:border-slate-700"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
            accept=".pdf,.docx,.txt,.md,.json"
          />
          <input
            ref={folderInputRef}
            type="file"
            onChange={handleFileChange}
            className="hidden"
            {...({ webkitdirectory: "", directory: "" } as any)}
          />

          <div className="h-14 w-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 shadow-sm">
            <Upload className="h-7 w-7" />
          </div>
          
          <h3 className="text-sm font-bold text-slate-200">Drag & Drop Stored Files</h3>
          <p className="text-[11px] text-slate-400 max-w-xs mt-1 font-medium leading-normal">
            Supported extensions: **PDF, DOCX, TXT, MD, or JSON** files up to 25MB each.
          </p>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); triggerFileSelect(); }}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-md"
            >
              Browse Files
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); triggerFolderSelect(); }}
              className="px-4 py-2 text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 hover:text-white transition-all rounded-lg"
            >
              <FolderOpen className="h-3.5 w-3.5 inline mr-1.5" />
              Folder Upload
            </button>
          </div>
        </div>

        {/* Process Telemetry Logs */}
        {uploadProgress && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col h-[200px]">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block border-b border-slate-800 pb-2">
              Pipeline Telemetry Logs ({uploadProgress.current + 1}/{uploadProgress.total})
            </span>
            <div className="flex-1 overflow-y-auto mt-3 space-y-1.5 font-mono text-[10px] text-slate-300 pr-1 select-text">
              {uploadProgress.logs.map((log, index) => (
                <div key={index} className="leading-tight">
                  <span className="text-slate-500">[{new Date().toLocaleTimeString()}]</span>{" "}
                  <span className={log.includes("❌") ? "text-rose-400" : log.includes("✓") ? "text-emerald-400" : "text-slate-300"}>
                    {log}
                  </span>
                </div>
              ))}
              {uploading && (
                <div className="flex items-center gap-2 text-indigo-400 animate-pulse mt-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Configuring embeddings matrix for "{uploadProgress.fileName}"...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Normalization Parameters Dial Panel */}
      <div className="w-full lg:w-80 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col gap-6">
        <div>
          <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-1.5 leading-none">
            <Settings className="h-4 w-4 text-indigo-400" />
            <span>Parsing Configuration</span>
          </h3>
          <p className="text-[10px] text-slate-500 font-semibold mt-1.5 leading-normal">
            Configure normalizers and size limits of chunks before parsing references.
          </p>
        </div>

        {/* Sliders */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-[11px] font-bold text-slate-300 mb-1.5">
              <span>Chunk Size (characters)</span>
              <span className="text-indigo-400">{chunkSize}</span>
            </div>
            <input
              type="range"
              min="200"
              max="2000"
              step="50"
              value={chunkSize}
              onChange={(e) => setChunkSize(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <span className="text-[9px] text-slate-500 font-medium block mt-1">Recommended size: 600 - 1000 characters.</span>
          </div>

          <div>
            <div className="flex justify-between text-[11px] font-bold text-slate-300 mb-1.5">
              <span>Chunk Overlap (characters)</span>
              <span className="text-indigo-400">{chunkOverlap}</span>
            </div>
            <input
              type="range"
              min="0"
              max="400"
              step="10"
              value={chunkOverlap}
              onChange={(e) => setChunkOverlap(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <span className="text-[9px] text-slate-500 font-medium block mt-1">Overlaps preserve context across partitions.</span>
          </div>
        </div>

        {/* Checkbox normalizers */}
        <div className="border-t border-slate-800 pt-4 space-y-3.5">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-2">Clean Text Parameters</span>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={collapseSpaces}
              onChange={(e) => setCollapseSpaces(e.target.checked)}
              className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500/20 mt-0.5"
            />
            <div>
              <span className="text-[11px] font-bold text-slate-200 block leading-tight">Collapse Extra Whitespaces</span>
              <span className="text-[9px] text-slate-500 font-medium leading-none block mt-0.5">Cleans duplicate enters, tabs and double spaces.</span>
            </div>
          </label>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={normalizeQuotes}
              onChange={(e) => setNormalizeQuotes(e.target.checked)}
              className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500/20 mt-0.5"
            />
            <div>
              <span className="text-[11px] font-bold text-slate-200 block leading-tight">Standardize Quotations</span>
              <span className="text-[9px] text-slate-500 font-medium leading-none block mt-0.5">Converts curved smart quotes to standard ASCII.</span>
            </div>
          </label>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={cleanBullets}
              onChange={(e) => setCleanBullets(e.target.checked)}
              className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500/20 mt-0.5"
            />
            <div>
              <span className="text-[11px] font-bold text-slate-200 block leading-tight">Clean Bullet List Headers</span>
              <span className="text-[9px] text-slate-500 font-medium leading-none block mt-0.5">Harmonizes custom non-standard list headers.</span>
            </div>
          </label>
        </div>

        <div className="mt-auto bg-indigo-500/5 border border-indigo-500/10 rounded-lg p-3.5 flex gap-2.5">
          <Sparkles className="h-4.5 w-4.5 text-indigo-400 flex-shrink-0 mt-0.5" />
          <p className="text-[9px] text-slate-400 font-medium leading-normal">
            **Security Policy**: All files uploaded through this vault are parsed, chunked, and stored **locally inside your isolated workspace**. No telemetry or data leaves this workspace instance.
          </p>
        </div>
      </div>
    </div>
  );
}
