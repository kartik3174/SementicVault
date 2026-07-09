"""
Unified pipeline orchestrator that processes a document from chunking and embedding to vector indexing.
"""
import time
import logging
from typing import Optional
from app.services.chunk_service import ChunkService
from app.embeddings.embedding_service import EmbeddingService
from app.vectorstore.vector_service import VectorService
from app.models.vector import IndexingResponse
from app.config.vector_config import DEFAULT_COLLECTION_NAME, EMBEDDING_DIMENSION

logger = logging.getLogger("SemanticVault.VectorPipeline")

class VectorPipeline:
    """Ties together text parsing/chunking, embedding generation, and database indexing."""
    
    def __init__(self, upload_dir: Optional[str] = None):
        self.chunk_service = ChunkService(upload_dir)
        self.embedding_service = EmbeddingService(upload_dir)
        self.vector_service = VectorService(upload_dir)

    def process_and_index_document(
        self,
        document_id: str,
        chunk_size: int = 500,
        chunk_overlap: int = 100,
        collection_name: str = DEFAULT_COLLECTION_NAME
    ) -> IndexingResponse:
        """
        Coordinates the complete document indexing life cycle:
            1. Cleans text and splits into logical chunks (Phase 4).
            2. Computes 384-dimensional dense vectors using a SentenceTransformer (Phase 5).
            3. Loads the vectors, matches with texts and metadata, and indexes in ChromaDB (Phase 6).
        """
        start_time = time.time()
        logger.info(f"Running end-to-end vector indexing pipeline for document: {document_id}")
        
        # Step 1: Chunking (generates chunks if missing or updates them)
        logger.info(f"[Pipeline Step 1] Ingesting & chunking text (size={chunk_size}, overlap={chunk_overlap})...")
        chunks = self.chunk_service.generate_chunks(
            document_id=document_id,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
        
        # Step 2: Generate embeddings
        logger.info(f"[Pipeline Step 2] Computing vector embeddings...")
        embeddings = self.embedding_service.generate_for_chunks(document_id, chunks)
        
        # Step 3: Insert into vector store (ChromaDB)
        logger.info(f"[Pipeline Step 3] Transferring embeddings to ChromaDB collection: '{collection_name}'...")
        inserted_count = self.vector_service.index_document(document_id, collection_name)
        
        processing_time = time.time() - start_time
        logger.info(f"End-to-end indexing pipeline completed for document {document_id} in {processing_time:.3f}s")
        
        return IndexingResponse(
            success=True,
            document_id=document_id,
            collection_name=collection_name,
            inserted_count=inserted_count,
            dimension=EMBEDDING_DIMENSION,
            processing_time_sec=round(processing_time, 3)
        )
