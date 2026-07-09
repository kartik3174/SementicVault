from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import os
import shutil
import logging
from app.loaders import load_document
from app.cleaners import clean_text
from app.chunkers import RecursiveCharacterChunker
from app.api.upload import router as upload_router
from app.api.chunk import router as chunk_router
from app.api.embedding import router as embedding_router
from app.api.vector import router as vector_router
from app.api.retrieval import router as retrieval_router
from app.api.chat import router as chat_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("SemanticVault")

app = FastAPI(
    title="SemanticVault API",
    description="Local LLM-Powered Semantic Retrieval System (RAG) Backend - Phase 6",
    version="6.0.0"
)

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(upload_router, prefix="/api")
app.include_router(upload_router)
app.include_router(chunk_router, prefix="/api")
app.include_router(chunk_router)
app.include_router(embedding_router, prefix="/api")
app.include_router(embedding_router)
app.include_router(vector_router, prefix="/api")
app.include_router(vector_router)
app.include_router(retrieval_router, prefix="/api")
app.include_router(retrieval_router)
app.include_router(chat_router, prefix="/api")
app.include_router(chat_router)


# Pydantic models for request validation
class ChunkingParams(BaseModel):
    chunk_size: int = Field(default=800, ge=50, le=5000)
    chunk_overlap: int = Field(default=150, ge=0, le=2500)
    remove_non_printable: bool = True
    normalize_quotes: bool = True
    clean_bullets: bool = True
    collapse_spaces: bool = True
    max_newlines: int = 2

class TextChunkPreviewRequest(BaseModel):
    text: str
    params: Optional[ChunkingParams] = Field(default_factory=ChunkingParams)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "SemanticVault Backend",
        "phase": "Phase 2: Document Loader & Cleaning Pipeline",
        "engine": "FastAPI + PyMuPDF + python-docx + RecursiveChunker"
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "ollama_connection": "disconnected",
        "chromadb_connection": "initialized"
    }

@app.post("/api/chunking-preview/text")
def preview_text_chunking(request: TextChunkPreviewRequest):
    """
    Preview chunking and cleaning results for raw text input.
    """
    try:
        params = request.params or ChunkingParams()
        
        # 1. Clean the text using the custom normalization pipeline
        cleaned = clean_text(
            request.text,
            remove_non_printable=params.remove_non_printable,
            normalize_quotes=params.normalize_quotes,
            clean_bullets=params.clean_bullets,
            collapse_spaces=params.collapse_spaces,
            max_newlines=params.max_newlines
        )
        
        # 2. Chunk text using RecursiveCharacterChunker
        chunker = RecursiveCharacterChunker(
            chunk_size=params.chunk_size,
            chunk_overlap=params.chunk_overlap
        )
        chunks = chunker.split_text(cleaned)
        
        # 3. Calculate statistics
        total_original_chars = len(request.text)
        total_cleaned_chars = len(cleaned)
        reduction_ratio = (1.0 - (total_cleaned_chars / total_original_chars)) if total_original_chars > 0 else 0.0
        
        return {
            "success": True,
            "statistics": {
                "original_characters": total_original_chars,
                "cleaned_characters": total_cleaned_chars,
                "reduction_ratio": round(reduction_ratio, 4),
                "total_chunks": len(chunks),
                "average_chunk_length": round(sum(c["length"] for c in chunks) / len(chunks), 1) if chunks else 0
            },
            "cleaned_text": cleaned,
            "chunks": chunks
        }
    except Exception as e:
        logger.error(f"Error in preview_text_chunking: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chunking-preview/file")
async def preview_file_chunking(
    file: UploadFile = File(...),
    chunk_size: int = Form(800),
    chunk_overlap: int = Form(150),
    remove_non_printable: bool = Form(True),
    normalize_quotes: bool = Form(True),
    clean_bullets: bool = Form(True),
    collapse_spaces: bool = Form(True),
    max_newlines: int = Form(2)
):
    """
    Preview chunking and cleaning results for an uploaded file (PDF, DOCX, TXT, MD).
    """
    temp_dir = "/tmp/semanticvault_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    temp_file_path = os.path.join(temp_dir, file.filename)
    
    try:
        # Save uploaded file to temporary directory
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 1. Load document using our loaders
        raw_text = load_document(temp_file_path)
        
        # 2. Clean the loaded text
        cleaned = clean_text(
            raw_text,
            remove_non_printable=remove_non_printable,
            normalize_quotes=normalize_quotes,
            clean_bullets=clean_bullets,
            collapse_spaces=collapse_spaces,
            max_newlines=max_newlines
        )
        
        # 3. Chunk text recursively
        chunker = RecursiveCharacterChunker(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
        chunks = chunker.split_text(cleaned)
        
        # Calculate statistics
        total_original_chars = len(raw_text)
        total_cleaned_chars = len(cleaned)
        reduction_ratio = (1.0 - (total_cleaned_chars / total_original_chars)) if total_original_chars > 0 else 0.0
        
        return {
            "success": True,
            "filename": file.filename,
            "content_type": file.content_type,
            "statistics": {
                "original_characters": total_original_chars,
                "cleaned_characters": total_cleaned_chars,
                "reduction_ratio": round(reduction_ratio, 4),
                "total_chunks": len(chunks),
                "average_chunk_length": round(sum(c["length"] for c in chunks) / len(chunks), 1) if chunks else 0
            },
            "cleaned_text": cleaned,
            "chunks": chunks
        }
    except Exception as e:
        logger.error(f"Error in preview_file_chunking: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup temp files
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
