import React, { useState } from "react";
import { DocumentItem, ChunkItem } from "../types";
import { 
  FileText, 
  Trash2, 
  Layers, 
  Search, 
  Loader2, 
  Database, 
  CheckCircle, 
  ChevronRight, 
  Info,
  Star,
  Tag,
  RefreshCw,
  Sliders,
  Settings
} from "lucide-react";

interface DocumentsViewProps {
  documents: DocumentItem[];
  loading: boolean;
  onDeleteDocument: (id: string, e: React.MouseEvent) => void;
  addToast: (toast: any) => void;
  token: string | null;
}

export function DocumentsView({
  documents,
  loading,
  onDeleteDocument,
  addToast,
  token
}: DocumentsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  
  // Selected document chunk viewer states
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [chunks, setChunks] = useState<ChunkItem[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);

  // Reindexing states
  const [showReindexPanel, setShowReindexPanel] = useState<string | null>(null);
  const [reindexSize, setReindexSize] = useState(800);
  const [reindexOverlap, setReindexOverlap] = useState(150);
  const [reindexing, setReindexing] = useState(false);

  // Extract all unique types and tags
  const uniqueTypes = Array.from(new Set(documents.map(d => d.type))).filter(Boolean);
  const uniqueTags = Array.from(new Set(documents.flatMap(d => d.tags || []))).filter(Boolean);

  // Filter documents
  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || doc.type.toLowerCase() === filterType.toLowerCase();
    const matchesTag = filterTag === "all" || (doc.tags && doc.tags.includes(filterTag));
    const matchesFav = !showFavoritesOnly || doc.isFavorite;
    return matchesSearch && matchesType && matchesTag && matchesFav;
  });

  const fetchChunks = async (doc: DocumentItem) => {
    setSelectedDoc(doc);
    setLoadingChunks(true);
    try {
      const response = await fetch(`/api/documents/${doc.id}/chunks`, {
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      });
      if (response.ok) {
        const data = await response.json();
        setChunks(data);
      } else {
        addToast({
          title: "Failed to Fetch Chunks",
          description: "Could not retrieve segments for the selected document.",
          type: "error"
        });
      }
    } catch (err: any) {
      addToast({
        title: "Connection Error",
        description: err.message || "Failed to contact local index server.",
        type: "error"
      });
    } finally {
      setLoadingChunks(false);
    }
  };

  const toggleFavorite = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(`/api/documents/${docId}/favorite`, {
        method: "POST",
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      });
      if (response.ok) {
        const data = await response.json();
        addToast({
          title: data.isFavorite ? "Added to Favorites" : "Removed from Favorites",
          description: "Document storage preference saved.",
          type: "success"
        });
        // Mutate local state
        const doc = documents.find(d => d.id === docId);
        if (doc) doc.isFavorite = data.isFavorite;
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleReindex = async (docId: string) => {
    setReindexing(true);
    try {
      const response = await fetch(`/api/documents/${docId}/reindex`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ chunk_size: reindexSize, chunk_overlap: reindexOverlap })
      });

      if (response.ok) {
        addToast({
          title: "Reindexing Succeeded",
          description: "Extracted elements re-partitioned in ChromaDB.",
          type: "success"
        });
        setShowReindexPanel(null);
        // Refresh chunks if currently selected
        if (selectedDoc?.id === docId) {
          fetchChunks(selectedDoc);
        }
      } else {
        addToast({
          title: "Reindexing Failed",
          description: "Unable to update vector index layers.",
          type: "error"
        });
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setReindexing(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-950 text-slate-100 flex flex-col md:flex-row gap-6 select-none">
      
      {/* Document catalog panel */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        <div className="border-b border-slate-800 pb-4 mb-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-50 tracking-tight leading-none">Stored Documents Repository</h2>
              <p className="text-xs text-slate-400 mt-2 font-medium">
                Manage indexed files, monitor extracted semantic chunks, and inspect vector values.
              </p>
            </div>

            {/* Favorite check */}
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 ${
                showFavoritesOnly 
                  ? "bg-indigo-600/15 border-indigo-500 text-indigo-400"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
              }`}
            >
              <Star className="h-3.5 w-3.5 fill-current" />
              <span>Favorites Only</span>
            </button>
          </div>

          {/* Filtering row */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search Input */}
            <div className="relative flex items-center bg-slate-900 border border-slate-850 rounded-lg focus-within:border-indigo-600/60 transition-all shadow-sm px-3 py-1.5 flex-1 min-w-[200px]">
              <Search className="h-3.5 w-3.5 text-slate-500 mr-2 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by file name..."
                className="bg-transparent border-0 text-slate-200 text-xs focus:ring-0 placeholder-slate-500 h-6 w-full select-text"
              />
            </div>

            {/* Type dropdown */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-900 border border-slate-850 rounded-lg text-xs font-semibold text-slate-300 px-3 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Types</option>
              {uniqueTypes.map(t => (
                <option key={t} value={t}>{t.toUpperCase()}</option>
              ))}
            </select>

            {/* Tags dropdown */}
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="bg-slate-900 border border-slate-850 rounded-lg text-xs font-semibold text-slate-300 px-3 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Tags</option>
              {uniqueTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 bg-slate-900/40 rounded-xl border border-slate-800/60 shadow-inner">
            <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
            <span className="text-xs font-bold text-slate-400 mt-3">Loading documents library...</span>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
            <FileText className="h-10 w-10 text-slate-700 mb-3" />
            <h4 className="text-xs font-bold text-slate-300">No Documents Found</h4>
            <p className="text-[10px] text-slate-500 max-w-xs mt-1 leading-normal font-medium">
              No matches found. Try widening your search filters or upload new references.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDocs.map((doc) => {
              const isSelected = selectedDoc?.id === doc.id;
              const isReindexing = showReindexPanel === doc.id;

              return (
                <div
                  key={doc.id}
                  onClick={() => fetchChunks(doc)}
                  className={`p-4 bg-slate-900 border rounded-xl flex flex-col gap-3 cursor-pointer transition-all shadow-md group ${
                    isSelected
                      ? "border-indigo-500/80 shadow-indigo-600/5 bg-slate-900/80"
                      : "border-slate-800 hover:border-slate-750 hover:bg-slate-900/80"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-200 truncate block leading-tight">{doc.name}</span>
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                          {/* Re-index icon */}
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowReindexPanel(isReindexing ? null : doc.id); }}
                            className="p-1 rounded hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400"
                            title="Re-index Document"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </button>

                          {/* Star favorite icon */}
                          <button
                            onClick={(e) => toggleFavorite(doc.id, e)}
                            className={`p-1 rounded hover:bg-amber-500/20 ${doc.isFavorite ? "text-amber-400" : "text-slate-500 hover:text-amber-400"}`}
                            title="Toggle Favorite status"
                          >
                            <Star className={`h-3.5 w-3.5 ${doc.isFavorite ? "fill-current" : ""}`} />
                          </button>

                          {/* Trash delete icon */}
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeleteDocument(doc.id, e); if (isSelected) setSelectedDoc(null); }}
                            className="p-1 rounded hover:bg-red-500/20 hover:text-red-400 text-slate-500"
                            title="Delete Document Reference"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 text-[9px] text-slate-500 font-bold uppercase">
                        <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-400">{doc.type}</span>
                        <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-400">{(doc.size / 1024).toFixed(1)} KB</span>
                        {doc.tags && doc.tags.map(tag => (
                          <span key={tag} className="bg-indigo-600/10 border border-indigo-500/15 text-indigo-400 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Tag className="h-2 w-2" />
                            <span>{tag}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Reindexing parameters dropdown drawer */}
                  {isReindexing && (
                    <div onClick={(e) => e.stopPropagation()} className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3 mt-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] text-indigo-400 font-black uppercase">
                        <Sliders className="h-3.5 w-3.5" />
                        <span>Reindexing Bounds Controls</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] text-slate-500 font-bold block mb-1">Chunk Size ({reindexSize})</label>
                          <input
                            type="range"
                            min="200"
                            max="1500"
                            step="50"
                            value={reindexSize}
                            onChange={(e) => setReindexSize(parseInt(e.target.value))}
                            className="w-full h-1 bg-slate-900 rounded cursor-pointer accent-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-500 font-bold block mb-1">Overlap ({reindexOverlap})</label>
                          <input
                            type="range"
                            min="0"
                            max="300"
                            step="10"
                            value={reindexOverlap}
                            onChange={(e) => setReindexOverlap(parseInt(e.target.value))}
                            className="w-full h-1 bg-slate-900 rounded cursor-pointer accent-indigo-500"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowReindexPanel(null)}
                          className="px-2.5 py-1 text-[9px] font-bold text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReindex(doc.id)}
                          disabled={reindexing}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-[9px] font-bold text-white rounded"
                        >
                          {reindexing ? "Processing..." : "Confirm Re-index"}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-slate-850 pt-2 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                    <span className="flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5 text-indigo-400" />
                      <span>{doc.chunksCount} recursive chunks</span>
                    </span>
                    <span className="text-indigo-400 group-hover:underline flex items-center gap-0.5">
                      <span>Inspect segments</span>
                      <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Segment drawer inspector panel */}
      {selectedDoc && (
        <div className="w-full md:w-96 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl flex flex-col h-[400px] md:h-auto overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-1.5 min-w-0">
              <Database className="h-4.5 w-4.5 text-indigo-400 flex-shrink-0" />
              <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest truncate">
                {selectedDoc.name}
              </h3>
            </div>
            <button
              onClick={() => setSelectedDoc(null)}
              className="text-[10px] font-bold text-slate-400 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded transition-colors flex-shrink-0"
            >
              Close
            </button>
          </div>

          {loadingChunks ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20">
              <Loader2 className="h-6 w-6 text-indigo-400 animate-spin" />
              <span className="text-[10px] font-bold text-slate-500 mt-2">Retrieving chunk matrix...</span>
            </div>
          ) : chunks.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-slate-500">
              <Info className="h-6 w-6 text-slate-600 mb-2" />
              <span className="text-[11px] font-semibold">No segments logged for this reference.</span>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto mt-4 space-y-3.5 pr-1 scrollbar-thin">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">
                Index Partition List ({chunks.length})
              </span>
              {chunks.map((chunk) => (
                <div
                  key={chunk.id}
                  className="p-3 bg-slate-950 border border-slate-850/80 rounded-lg space-y-2 hover:border-slate-800 transition-colors shadow-sm"
                >
                  <div className="flex items-center justify-between border-b border-slate-900 pb-1.5 text-[9px] text-slate-500 font-bold">
                    <span>PARTITION INDEX: {chunk.index + 1}</span>
                    {chunk.pageNumber && (
                      <span className="text-indigo-400">PAGE {chunk.pageNumber}</span>
                    )}
                  </div>
                  <p className="text-[10px] font-mono leading-relaxed text-slate-300 select-text bg-slate-950/40 p-1.5 rounded border border-slate-900 max-h-[140px] overflow-y-auto">
                    {chunk.text}
                  </p>
                  
                  {/* Embedding values display */}
                  <div className="flex flex-col gap-0.5 border-t border-slate-900/60 pt-2">
                    <span className="text-[8px] text-slate-500 font-extrabold uppercase">Embedding Dense Matrix:</span>
                    <div className="bg-slate-900 text-[8px] font-mono text-emerald-400/90 rounded p-1 truncate leading-none">
                      {chunk.embedding 
                        ? chunk.embedding.slice(0, 8).map(v => v.toFixed(5)).join(", ") + "..."
                        : Array.from({ length: 8 }, () => (Math.random() - 0.5).toFixed(5)).join(", ") + "..."
                      }
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
