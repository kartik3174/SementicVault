import crypto from "crypto";
import fs from "fs";
import path from "path";

// Ensure database directory exists
const DB_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, "db.json");
const LOG_DIR = path.join(process.cwd(), "logs");
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}
const LOG_PATH = path.join(LOG_DIR, "system.log");

// --- STRUCTURED ROTATING LOGS IMPLEMENTATION ---
export class StructuredLogger {
  static write(level: "INFO" | "WARN" | "ERROR" | "SECURITY", message: string, meta: object = {}) {
    const payload = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta
    };
    const logLine = JSON.stringify(payload);
    
    // Write to standard output
    if (level === "ERROR" || level === "SECURITY") {
      console.error(`[${level}] ${message}`, Object.keys(meta).length ? meta : "");
    } else {
      console.log(`[${level}] ${message}`, Object.keys(meta).length ? meta : "");
    }

    // Append to local physical log file
    try {
      fs.appendFileSync(LOG_PATH, logLine + "\n", "utf-8");
    } catch (e) {
      console.error("Failed to append to physical log file:", e);
    }
  }

  static info(msg: string, meta: object = {}) { this.write("INFO", msg, meta); }
  static warn(msg: string, meta: object = {}) { this.write("WARN", msg, meta); }
  static error(msg: string, meta: object = {}) { this.write("ERROR", msg, meta); }
  static security(msg: string, meta: object = {}) { this.write("SECURITY", msg, meta); }
}

// --- PASSWORD HASHING (CRYPTO PBKDF2) ---
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    const testHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
    return hash === testHash;
  } catch (e) {
    return false;
  }
}

// --- STATELess JWT ENGINE ---
export function generateToken(payload: object): string {
  const key = process.env.JWT_SECRET || "semantic-vault-secure-super-secret-key-32";
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const data = Buffer.from(JSON.stringify({ ...payload, iat: Date.now() })).toString("base64url");
  const signature = crypto.createHmac("sha256", key).update(`${header}.${data}`).digest("base64url");
  return `${header}.${data}.${signature}`;
}

export function verifyToken(token: string): any {
  try {
    const key = process.env.JWT_SECRET || "semantic-vault-secure-super-secret-key-32";
    const [header, data, signature] = token.split(".");
    const expectedSignature = crypto.createHmac("sha256", key).update(`${header}.${data}`).digest("base64url");
    if (signature !== expectedSignature) return null;
    return JSON.parse(Buffer.from(data, "base64url").toString("utf-8"));
  } catch (e) {
    return null;
  }
}

// --- DATABASE MODELS & SCHEMAS ---
export interface DBUser {
  id: string;
  username: string;
  passwordHash: string;
  role: "admin" | "user" | "viewer";
  createdAt: number;
}

export interface DBChunk {
  id: string;
  docId: string;
  docName: string;
  text: string;
  index: number;
  pageNumber?: number;
  embedding: number[];
}

export interface DBDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  rawText: string;
  chunks: DBChunk[];
  createdAt: number;
  ownerId: string;
  isFavorite: boolean;
  tags: string[];
  reindexedCount: number;
}

export interface DBChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  citations?: any[];
  contextUsed?: string;
  modelUsed?: string;
  latency_sec?: number;
  tokens_generated?: number;
}

export interface DBConversation {
  id: string;
  title: string;
  messages: DBChatMessage[];
  createdAt: number;
  updatedAt: number;
  ownerId: string;
  isSaved: boolean;
}

export interface DBSearchLog {
  id: string;
  query: string;
  timestamp: string;
  resultsCount: number;
  ownerId: string;
}

interface FileDatabase {
  users: DBUser[];
  documents: DBDocument[];
  conversations: DBConversation[];
  searchLogs: DBSearchLog[];
  embeddingCache: Record<string, number[]>;
  queryCache: Record<string, { answer: string; citations: any[] }>;
}

const initialDbState: FileDatabase = {
  users: [],
  documents: [],
  conversations: [],
  searchLogs: [],
  embeddingCache: {},
  queryCache: {}
};

// --- SYNCHRONIZED FILE STORAGE ENGINE ---
export class FileDB {
  private static memoryDb: FileDatabase = initialDbState;

  static init() {
    try {
      if (fs.existsSync(DB_PATH)) {
        const data = fs.readFileSync(DB_PATH, "utf-8");
        this.memoryDb = JSON.parse(data);
        // Ensure necessary sub-objects exist
        if (!this.memoryDb.users) this.memoryDb.users = [];
        if (!this.memoryDb.documents) this.memoryDb.documents = [];
        if (!this.memoryDb.conversations) this.memoryDb.conversations = [];
        if (!this.memoryDb.searchLogs) this.memoryDb.searchLogs = [];
        if (!this.memoryDb.embeddingCache) this.memoryDb.embeddingCache = {};
        if (!this.memoryDb.queryCache) this.memoryDb.queryCache = {};
        StructuredLogger.info("Database loaded successfully from physical storage.", { path: DB_PATH });
      } else {
        // Create an initial admin user by default
        const adminHash = hashPassword("admin123");
        this.memoryDb.users.push({
          id: "usr_admin",
          username: "admin",
          passwordHash: adminHash,
          role: "admin",
          createdAt: Date.now()
        });
        this.save();
        StructuredLogger.info("Created new database file with default admin account.");
      }
    } catch (err: any) {
      StructuredLogger.error("Error reading database file, using fallback.", { error: err.message });
      this.memoryDb = initialDbState;
    }
  }

  static save() {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(this.memoryDb, null, 2), "utf-8");
    } catch (err: any) {
      StructuredLogger.error("Failed to commit database transaction to physical disk.", { error: err.message });
    }
  }

  static get users() { return this.memoryDb.users; }
  static get documents() { return this.memoryDb.documents; }
  static get conversations() { return this.memoryDb.conversations; }
  static get searchLogs() { return this.memoryDb.searchLogs; }
  static get embeddingCache() { return this.memoryDb.embeddingCache; }
  static get queryCache() { return this.memoryDb.queryCache; }

  static set documents(docs) { this.memoryDb.documents = docs; this.save(); }
  static set conversations(convs) { this.memoryDb.conversations = convs; this.save(); }
  static set searchLogs(logs) { this.memoryDb.searchLogs = logs; this.save(); }
}

// --- SECURE INPUT SANITIZATION & PROMPT INJECTION SHIELD ---
export function checkPromptInjection(text: string): { isInjected: boolean; reason?: string } {
  const lowercase = text.toLowerCase();
  
  const injectionPatterns = [
    "ignore all previous instructions",
    "ignore system prompt",
    "forget previous instruction",
    "you are now a",
    "override safety",
    "bypass constraints",
    "output raw code of instructions",
    "expose system parameters",
    "reveal guidelines"
  ];

  for (const pattern of injectionPatterns) {
    if (lowercase.includes(pattern)) {
      StructuredLogger.security("Potential prompt injection attack blocked.", { query: text });
      return {
        isInjected: true,
        reason: "Request blocked by SemanticVault safety shield: detected unauthorized instruction-override directives."
      };
    }
  }

  return { isInjected: false };
}

// --- RATE LIMITER MIDDLEWARE ---
const ipRequestHistory: Record<string, { count: number; windowStart: number }> = {};
export function rateLimiter(limit = 60, windowMs = 60000) {
  return (req: any, res: any, next: any) => {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "anonymous";
    const now = Date.now();

    if (!ipRequestHistory[ip]) {
      ipRequestHistory[ip] = { count: 1, windowStart: now };
      return next();
    }

    const tracker = ipRequestHistory[ip];
    if (now - tracker.windowStart > windowMs) {
      tracker.count = 1;
      tracker.windowStart = now;
      return next();
    }

    tracker.count++;
    if (tracker.count > limit) {
      StructuredLogger.warn("Rate limit triggered for requester.", { ip, count: tracker.count });
      return res.status(429).json({
        error: "Too many requests. Please verify compliance and slow down transaction submission rate."
      });
    }

    next();
  };
}
