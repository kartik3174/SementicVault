"""
Configuration module for the Vector Database layer utilizing ChromaDB.
"""
import os

# Base directory for the persistent vector database storage
CHROMA_PERSIST_DIR = os.environ.get("CHROMA_PERSIST_DIR", os.path.join(os.getcwd(), "chroma_db"))

# Default Collection name for document chunks
DEFAULT_COLLECTION_NAME = "semanticvault_documents"

# Distance metric for similarity calculations in ChromaDB.
# Supported: "cosine" (Cosine Similarity), "l2" (Euclidean), "ip" (Inner Product)
# In Phase 6, we enforce "cosine" similarity
SIMILARITY_METRIC = "cosine"

# Maximum batch size for ChromaDB insertions (ChromaDB has an absolute upper limit of 41666 ids/elements)
CHROMA_BATCH_SIZE = 2000

# Embedding dimension matching the all-MiniLM-L6-v2 model used in Phase 5
EMBEDDING_DIMENSION = 384
