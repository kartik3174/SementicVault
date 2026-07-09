from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("SemanticVault")

app = FastAPI(
    title="SemanticVault API",
    description="Local LLM-Powered Semantic Retrieval System (RAG) Backend",
    version="1.0.0"
)

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "SemanticVault",
        "engine": "FastAPI + Ollama + ChromaDB"
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "ollama_connection": "disconnected",  # Will be configured in later phases
        "chromadb_connection": "initialized"
    }
