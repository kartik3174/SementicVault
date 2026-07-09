"""
Unified orchestrator executing the entire document ingestion-to-vector pipeline.
"""
import time
import logging
from typing import List, Dict, Any, Optional
from app.services.chunk_service import ChunkService
from app.embeddings.embedding_service import EmbeddingService
from app.models.embedding import VectorEmbedding

logger = logging.getLogger("SemanticVault.EmbeddingPipeline")

class EmbeddingPipeline:
    """Orchestrator that ties together Document Loading, Chunking, and Embedding Generation."""
    
    def __init__(self, upload_dir: Optional[str] = None):
        self.chunk_service = ChunkService(upload_dir)
        self.embedding_service = EmbeddingService(upload_dir)

    def execute_pipeline(
        self, 
        document_id: str, 
        chunk_size: int, 
        chunk_overlap: int
    ) -> List[VectorEmbedding]:
        """
        Coordinates the ingestion-to-embedding sequence:
            1. Retrieves raw text and runs the preprocessor cleaning steps.
            2. Generates hierarchical recursive chunks.
            3. Converts clean text chunks into high-dimensional dense vector embeddings.
            4. Performs mathematical shape/NaN verification.
            5. Persists chunks and embedding layers to disk.
        """
        logger.info(f"Executing complete vector generation pipeline for document {document_id}")
        start_time = time.time()
        
        # Step 1 & 2: Generate recursive text splits/chunks
        # (This cleans raw text, builds standard chunk metadata, and writes {doc_id}_chunks.json)
        chunks = self.chunk_service.generate_chunks(
            document_id=document_id,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
        
        if not chunks:
            logger.warning(f"No text chunks were generated for document {document_id}")
            return []
            
        # Step 3 & 4: Compute dense vectors using model singleton and caching
        # (This generates vectors, updates cache, validates shapes, and writes {doc_id}_embeddings.json)
        embeddings = self.embedding_service.generate_for_chunks(
            document_id=document_id,
            chunks=chunks
        )
        
        elapsed = time.time() - start_time
        logger.info(f"Pipeline executed successfully for document {document_id} in {elapsed:.3f}s. Total Embeddings: {len(embeddings)}")
        return embeddings
