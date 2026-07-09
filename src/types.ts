export interface User {
  id: string;
  username: string;
  role: "admin" | "user" | "viewer";
  createdAt: number;
}

export interface DocumentItem {
  id: string;
  name: string;
  type: string;
  size: number;
  chunksCount: number;
  createdAt: number;
  ownerId?: string;
  isFavorite?: boolean;
  tags?: string[];
  reindexedCount?: number;
}

export interface ChunkItem {
  id: string;
  index: number;
  text: string;
  pageNumber?: number;
  embedding?: number[];
  docId: string;
}

export interface CitationItem {
  chunk_id: string;
  filename: string;
  page: number;
  similarity_score: number;
  text: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  citations?: CitationItem[];
  contextUsed?: string;
  modelUsed?: string;
  latency_sec?: number;
  tokens_generated?: number;
}

export interface ConversationSummary {
  id: string;
  title: string;
  message_count: number;
  created_at: string;
  updated_at: string;
  ownerId?: string;
  isSaved?: boolean;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: string;
  resultsCount: number;
  ownerId: string;
}

export interface SystemSettings {
  model: string;
  embeddingModel: string;
  temperature: number;
  topP: number;
  topKChunks: number;
  similarityThreshold: number;
  isOllamaConnected: boolean;
}

export type ActivePage = 
  | "dashboard" 
  | "upload" 
  | "chat" 
  | "documents" 
  | "settings" 
  | "analytics" 
  | "admin" 
  | "profile" 
  | "login" 
  | "register";

export interface ToastMessage {
  id: string;
  title: string;
  description: string;
  type: "success" | "error" | "info" | "warning";
}

export interface PerformanceStats {
  averageLatency: number;
  totalTokensGenerated: number;
  totalQueriesProcessed: number;
  cacheHitRatio: number;
  queriesOverTime: { date: string; count: number; latency: number }[];
  modelDistribution: { name: string; count: number }[];
  fileTypeDistribution: { name: string; count: number }[];
}
