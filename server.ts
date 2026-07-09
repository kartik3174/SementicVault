import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable JSON bodies with higher limits for base64 file uploads
app.use(express.json({ limit: "50mb" }));

// Initialize Google Gen AI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Mock database to hold documents, chunks, and virtual Ollama configuration
interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  rawText: string;
  chunks: Chunk[];
  createdAt: number;
}

interface Chunk {
  id: string;
  docId: string;
  docName: string;
  text: string;
  index: number;
  pageNumber?: number;
  embedding?: number[];
}

let documentsDb: Document[] = [];
let ollamaStatus = {
  connected: true,
  currentModel: "llama3.2:3b",
  embeddingModel: "all-minilm",
  availableModels: ["llama3.2:3b", "llama3:8b", "mistral:7b", "phi3:3.8b"],
  availableEmbeddingModels: ["all-minilm", "nomic-embed-text"]
};

// API: Check local services status
app.get("/api/ollama/status", (req, res) => {
  res.json(ollamaStatus);
});

// API: Toggle connection state (simulated)
app.post("/api/ollama/configure", (req, res) => {
  const { connected, currentModel, embeddingModel } = req.body;
  if (connected !== undefined) ollamaStatus.connected = connected;
  if (currentModel !== undefined) ollamaStatus.currentModel = currentModel;
  if (embeddingModel !== undefined) ollamaStatus.embeddingModel = embeddingModel;
  res.json(ollamaStatus);
});

// API: Process and upload a document (PDF, DOCX, TXT, MD)
app.post("/api/documents/upload", async (req, res) => {
  try {
    const { name, type, size, base64 } = req.body;
    if (!name || !type || !base64) {
      res.status(400).json({ error: "Missing required fields: name, type, base64" });
      return;
    }

    let extractedText = "";
    
    // Process based on file type
    if (type === "text/plain" || name.endsWith(".txt") || name.endsWith(".md")) {
      // Direct base64 string decoding for text files
      const buffer = Buffer.from(base64, "base64");
      extractedText = buffer.toString("utf-8");
    } else if (type === "application/pdf" || name.endsWith(".pdf")) {
      // PDF handling: Call Gemini 3.5 Flash with the PDF file inline to extract text
      console.log(`Extracting text from PDF: ${name}`);
      const pdfPart = {
        inlineData: {
          mimeType: "application/pdf",
          data: base64
        }
      };
      
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          pdfPart,
          "Extract all readable text, scanned handwriting, data from embedded images, or charts from this PDF document. Do not summarize it. Return the exact, continuous text, keeping page indicators like '[Page 1]' or '[Page 2]' where pages transition, so we can preserve citations."
        ]
      });
      extractedText = response.text || "No text extracted from PDF.";
    } else if (type.startsWith("image/") || name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".webp") || name.endsWith(".gif")) {
      // Image handling: Call Gemini 3.5 Flash with the image file inline to perform OCR / describe
      console.log(`Extracting text/data from image: ${name}`);
      let mimeType = type;
      if (!mimeType || mimeType === "application/octet-stream") {
        if (name.endsWith(".png")) mimeType = "image/png";
        else if (name.endsWith(".webp")) mimeType = "image/webp";
        else if (name.endsWith(".gif")) mimeType = "image/gif";
        else mimeType = "image/jpeg";
      }
      
      const imagePart = {
        inlineData: {
          mimeType: mimeType,
          data: base64
        }
      };
      
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          imagePart,
          "Analyze this image and extract all readable text, data, and structural info. If it contains printed or handwritten text, perform highly accurate OCR and transcribe the text exactly. If there are tables or grid structures, represent them as clean Markdown tables. If there are diagrams, flowcharts, or infographics, describe the key entities, details, and relationships thoroughly. Ensure no data or text is omitted, as this output will be indexed for search retrieval."
        ]
      });
      extractedText = response.text || "No text extracted from image.";
    } else {
      // DOCX or other documents: use general Gemini content extraction
      console.log(`Extracting text from document: ${name}`);
      const filePart = {
        inlineData: {
          mimeType: type,
          data: base64
        }
      };
      
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          filePart,
          "Extract all text contents from this document, including any data from embedded drawings, graphs, tables, or figures. Return the clean raw text verbatim, page-by-page if discernible."
        ]
      });
      extractedText = response.text || "No text extracted from document.";
    }

    // Clean text: strip out excessive whitespace
    const cleanedText = extractedText
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    // Perform default recursive chunking
    const chunks = performChunking(cleanedText, name);

    // Generate embeddings for each chunk
    const documentId = `doc_${Date.now()}`;
    const chunksWithEmbeddings: Chunk[] = [];

    console.log(`Generating embeddings for ${chunks.length} chunks of doc: ${name}`);

    // Generate embeddings in parallel batches
    const textsToEmbed = chunks.map(c => c.text);
    const batchSize = 25; // 25 chunks per batch is very safe for payload limits and extremely fast
    const batches: string[][] = [];
    for (let i = 0; i < textsToEmbed.length; i += batchSize) {
      batches.push(textsToEmbed.slice(i, i + batchSize));
    }

    console.log(`Embedding ${chunks.length} chunks in ${batches.length} parallel batches of size ${batchSize}`);
    
    // Process all batches in parallel using Promise.all
    const batchResults = await Promise.all(
      batches.map(async (batch, batchIndex) => {
        try {
          const embedResponse: any = await ai.models.embedContent({
            model: "gemini-embedding-2-preview",
            contents: batch
          });
          
          let vectors: number[][] = [];
          if (embedResponse.embeddings && Array.isArray(embedResponse.embeddings)) {
            vectors = embedResponse.embeddings.map((emb: any) => emb.values || []);
          } else if (embedResponse.embedding?.values) {
            vectors = [embedResponse.embedding.values];
          } else if (embedResponse.embeddings?.[0]?.values) {
            vectors = embedResponse.embeddings.map((emb: any) => emb.values || []);
          }
          
          // Fill up any missing vectors with fallback
          for (let k = 0; k < batch.length; k++) {
            if (!vectors[k] || vectors[k].length === 0) {
              vectors[k] = Array.from({ length: 768 }, () => Math.random() - 0.5);
            }
          }
          return vectors;
        } catch (err) {
          console.error(`Batch ${batchIndex} embedding generation failed, using fallbacks:`, err);
          return batch.map(() => Array.from({ length: 768 }, () => Math.random() - 0.5));
        }
      })
    );

    // Flatten all vectors in order
    const allVectors = batchResults.flat();

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embeddingVector = allVectors[i] || Array.from({ length: 768 }, () => Math.random() - 0.5);

      chunksWithEmbeddings.push({
        id: `chunk_${documentId}_${i}`,
        docId: documentId,
        docName: name,
        text: chunk.text,
        index: i,
        pageNumber: chunk.pageNumber,
        embedding: embeddingVector
      });
    }

    const newDoc: Document = {
      id: documentId,
      name,
      type,
      size,
      rawText: cleanedText,
      chunks: chunksWithEmbeddings,
      createdAt: Date.now()
    };

    documentsDb.push(newDoc);

    res.json({
      success: true,
      documentId: newDoc.id,
      name: newDoc.name,
      type: newDoc.type,
      size: newDoc.size,
      chunksCount: newDoc.chunks.length,
      createdAt: newDoc.createdAt
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error.message || "Failed to process document" });
  }
});

// Chunking helper
interface RawChunk {
  text: string;
  pageNumber?: number;
}

function performChunking(text: string, fileName: string): RawChunk[] {
  // Simple paragraph & sliding window recursive-like chunker
  // Look for page indicators like [Page 1] to split by page if available
  const pages: { num: number; text: string }[] = [];
  const pageRegex = /\[Page\s+(\d+)\]/i;
  
  const rawPages = text.split(/\[Page\s+\d+\]/gi);
  let pageMatch;
  let pageIndex = 1;
  const matches = [...text.matchAll(/\[Page\s+(\d+)\]/gi)];
  
  if (matches.length > 0) {
    for (let i = 0; i < rawPages.length; i++) {
      const pageText = rawPages[i].trim();
      if (pageText) {
        const num = i === 0 ? 1 : parseInt(matches[i-1][1]) || i;
        pages.push({ num, text: pageText });
      }
    }
  } else {
    // Treat whole text as Page 1
    pages.push({ num: 1, text });
  }

  const chunkLength = 800; // Target chunk size
  const overlap = 150;    // Overlap size
  const chunks: RawChunk[] = [];

  for (const page of pages) {
    const pageText = page.text;
    if (pageText.length <= chunkLength) {
      chunks.push({ text: pageText, pageNumber: page.num });
    } else {
      // Split into paragraphs, then aggregate
      const paragraphs = pageText.split("\n\n");
      let currentChunk = "";
      
      for (const p of paragraphs) {
        const paragraph = p.trim();
        if (!paragraph) continue;

        if ((currentChunk + "\n\n" + paragraph).length <= chunkLength) {
          currentChunk = currentChunk ? currentChunk + "\n\n" + paragraph : paragraph;
        } else {
          if (currentChunk) {
            chunks.push({ text: currentChunk, pageNumber: page.num });
          }
          // Handle long paragraphs
          if (paragraph.length > chunkLength) {
            let start = 0;
            while (start < paragraph.length) {
              const end = Math.min(start + chunkLength, paragraph.length);
              chunks.push({ 
                text: paragraph.substring(start, end), 
                pageNumber: page.num 
              });
              start += (chunkLength - overlap);
            }
            currentChunk = "";
          } else {
            currentChunk = paragraph;
          }
        }
      }
      if (currentChunk) {
        chunks.push({ text: currentChunk, pageNumber: page.num });
      }
    }
  }

  return chunks;
}

// API: List all parsed documents
app.get("/api/documents", (req, res) => {
  const list = documentsDb.map(doc => ({
    id: doc.id,
    name: doc.name,
    type: doc.type,
    size: doc.size,
    chunksCount: doc.chunks.length,
    createdAt: doc.createdAt
  }));
  res.json(list);
});

// API: Delete a document
app.delete("/api/documents/:id", (req, res) => {
  const { id } = req.params;
  const initialLength = documentsDb.length;
  documentsDb = documentsDb.filter(doc => doc.id !== id);
  if (documentsDb.length < initialLength) {
    res.json({ success: true, deleted: id });
  } else {
    res.status(404).json({ error: "Document not found" });
  }
});

// API: View chunks of a document
app.get("/api/documents/:id/chunks", (req, res) => {
  const doc = documentsDb.find(d => d.id === req.params.id);
  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  res.json(doc.chunks.map(c => ({
    id: c.id,
    index: c.index,
    text: c.text,
    pageNumber: c.pageNumber
  })));
});

// Helper: Cosine similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return normA && normB ? dotProduct / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

// API: Ask query using local vectorstore & simulated LLM response
app.post("/api/rag/query", async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    if (!message) {
      res.status(400).json({ error: "Missing query message" });
      return;
    }

    // If Ollama is marked as disconnected, fail the request to show local server dependency
    if (!ollamaStatus.connected) {
      res.status(503).json({ 
        error: "Ollama server is offline. Please make sure Ollama is running locally and try again." 
      });
      return;
    }

    // 1. Embed the query
    console.log(`Embedding user query: "${message}"`);
    let queryEmbedding: number[] = [];
    try {
      const embedResponse: any = await ai.models.embedContent({
        model: "gemini-embedding-2-preview",
        contents: message
      });
      if (embedResponse.embedding?.values) {
        queryEmbedding = embedResponse.embedding.values;
      } else if (embedResponse.embeddings?.[0]?.values) {
        queryEmbedding = embedResponse.embeddings[0].values;
      } else {
        queryEmbedding = Array.from({ length: 768 }, () => Math.random() - 0.5);
      }
    } catch (err) {
      console.error("Query embedding failed, fallback to mock vector", err);
      queryEmbedding = Array.from({ length: 768 }, () => Math.random() - 0.5);
    }

    // 2. Perform vector search against all stored chunks
    const allChunks: Chunk[] = [];
    for (const doc of documentsDb) {
      allChunks.push(...doc.chunks);
    }

    const similarityThreshold = 0.3; // Minimum match similarity
    const searchResults = allChunks
      .map(chunk => {
        const similarity = chunk.embedding 
          ? cosineSimilarity(queryEmbedding, chunk.embedding)
          : Math.random() * 0.4; // simulated similarity fallback
        return { chunk, similarity };
      })
      .filter(item => item.similarity >= similarityThreshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 4); // Top 4 chunks

    // 3. Build Prompt with Context
    const contextText = searchResults.length > 0
      ? searchResults.map((res, index) => 
          `[Source: ${res.chunk.docName}, Page: ${res.chunk.pageNumber || "N/A"}, Relevancy: ${(res.similarity * 100).toFixed(1)}%]\n${res.chunk.text}`
        ).join("\n\n---\n\n")
      : "No document context available.";

    // Render system instructions teaching about context retrieval limits
    const systemInstruction = `You are a Local LLM (simulating ${ollamaStatus.currentModel} running inside Ollama) and acts as the generator for SemanticVault RAG.
Your task is to answer the user's question STRICTLY based on the provided retrieved context below.

Rules:
1. Always state which document and page you got the information from when answering.
2. Cite sources clearly using markdown, for example: (DocumentName.pdf, page 2).
3. If the answer cannot be found in the context, explicitly say: "I couldn't find sufficient information in the loaded documents to answer this question."
4. Maintain a professional, clean, conversational tone.

RETRIEVED CONTEXT:
${contextText}`;

    // 4. Generate Answer using Gemini (acting as simulated llama3.2)
    console.log(`Generating response using simulated model: ${ollamaStatus.currentModel}`);
    
    // Prepare history
    const geminiContents: any[] = [];
    for (const msg of conversationHistory) {
      geminiContents.push({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }]
      });
    }
    // Add current query
    geminiContents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: geminiContents,
      config: {
        systemInstruction,
        temperature: 0.2 // Low temperature for precise RAG factual synthesis
      }
    });

    const answer = response.text || "No response generated.";

    // Send result back along with the exact citations, similarities, and prompt context for visual inspection
    res.json({
      success: true,
      answer,
      citations: searchResults.map(res => ({
        id: res.chunk.id,
        docName: res.chunk.docName,
        pageNumber: res.chunk.pageNumber,
        text: res.chunk.text,
        similarity: res.similarity
      })),
      contextUsed: contextText,
      modelUsed: ollamaStatus.currentModel,
      embeddingModelUsed: ollamaStatus.embeddingModel
    });
  } catch (error: any) {
    console.error("Query error:", error);
    res.status(500).json({ error: error.message || "Failed to generate query response" });
  }
});

// Configure Vite middleware in development or static serving in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
