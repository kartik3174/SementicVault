"""
Service class managing high-performance batch embedding calculations, caching, and serialization.
"""
import os
import json
import uuid
import time
import logging
from typing import List, Dict, Any, Optional
from app.embeddings.embedding_model import EmbeddingModelManager
from app.embeddings.embedding_cache import EmbeddingCache
from app.embeddings.embedding_validator import validate_vector, validate_embeddings_batch
from app.models.embedding import VectorEmbedding
from app.config.embedding_config import DEFAULT_MODEL_NAME, EMBEDDING_DIMENSION

logger = logging.getLogger("SemanticVault.EmbeddingService")

class EmbeddingService:
    """Manages computation and state of document embeddings, integrating model singleton and caching."""
    
    def __init__(self, upload_dir: Optional[str] = None):
        self.upload_dir = upload_dir or os.environ.get("UPLOAD_DIR", "uploads")
        os.makedirs(self.upload_dir, exist_ok=True)
        self.model_manager = EmbeddingModelManager()
        self.cache = EmbeddingCache(self.upload_dir)

    def generate_for_chunks(self, document_id: str, chunks: List[Dict[str, Any]]) -> List[VectorEmbedding]:
        """
        Generates dense vector embeddings for a list of document chunks.
        
        Leverages caching, batching, and validates output shapes.
        
        Args:
            document_id (str): The parent document UUID.
            chunks (List[Dict[str, Any]]): List of chunk dictionaries containing text/metadata.
            
        Returns:
            List[VectorEmbedding]: Complete structured list of generated VectorEmbedding models.
        """
        logger.info(f"Generating embeddings for document {document_id} containing {len(chunks)} chunks")
        
        start_time = time.time()
        results: List[VectorEmbedding] = []
        
        # 1. Separate chunks into cache hits and cache misses
        uncached_texts: List[str] = []
        uncached_indices: List[int] = []
        
        # Pre-allocate results array for correct ordering
        prepared_embeddings: List[Optional[VectorEmbedding]] = [None] * len(chunks)
        
        for idx, chunk in enumerate(chunks):
            text_to_encode = chunk.get("text", "")
            cached_vector = self.cache.get(text_to_encode)
            
            if cached_vector:
                # Cache hit!
                logger.debug(f"Cache hit for chunk {idx}")
                emb = VectorEmbedding(
                    embedding_id=str(uuid.uuid4()),
                    chunk_id=str(chunk.get("index", idx)),
                    document_id=document_id,
                    vector=cached_vector,
                    dimension=EMBEDDING_DIMENSION,
                    model=DEFAULT_MODEL_NAME,
                    created_at=time.time(),
                    metadata=chunk.get("metadata", {})
                )
                prepared_embeddings[idx] = emb
            else:
                # Cache miss
                uncached_texts.append(text_to_encode)
                uncached_indices.append(idx)
                
        # 2. Run batch encoding for cache misses (efficient GPU/CPU utilization)
        if uncached_texts:
            logger.info(f"Encoding {len(uncached_texts)} uncached text segments...")
            try:
                vectors = self.model_manager.encode(uncached_texts, batch_size=32)
                
                # Update cache and populate results
                for uncached_idx, raw_vector in zip(uncached_indices, vectors):
                    orig_chunk = chunks[uncached_idx]
                    text_encoded = orig_chunk.get("text", "")
                    
                    # Store to cache
                    self.cache.set(text_encoded, raw_vector)
                    
                    emb = VectorEmbedding(
                        embedding_id=str(uuid.uuid4()),
                        chunk_id=str(orig_chunk.get("index", uncached_idx)),
                        document_id=document_id,
                        vector=raw_vector,
                        dimension=EMBEDDING_DIMENSION,
                        model=DEFAULT_MODEL_NAME,
                        created_at=time.time(),
                        metadata=orig_chunk.get("metadata", {})
                    )
                    prepared_embeddings[uncached_idx] = emb
            except Exception as e:
                logger.error(f"Failed during model encode phase: {e}", exc_info=True)
                raise RuntimeError(f"Model inference failed: {str(e)}")
                
        # 3. Assemble and validate final batch
        final_embeddings: List[VectorEmbedding] = [e for e in prepared_embeddings if e is not None]
        
        # Validate structurally and mathematically (NaNs, wrong dimensions, etc.)
        batch_dicts = [e.model_dump() for e in final_embeddings]
        validate_embeddings_batch(batch_dicts)
        
        # 4. Persist generated embeddings as JSON for storage in this phase
        self._save_embeddings_to_disk(document_id, final_embeddings)
        
        duration = time.time() - start_time
        logger.info(f"Generated {len(final_embeddings)} embeddings for document {document_id} in {duration:.3f}s")
        return final_embeddings

    def _save_embeddings_to_disk(self, document_id: str, embeddings: List[VectorEmbedding]) -> None:
        """Persists document embeddings to a structured JSON file."""
        file_path = os.path.join(self.upload_dir, f"{document_id}_embeddings.json")
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump([e.model_dump() for e in embeddings], f, indent=2, ensure_ascii=False)
            logger.info(f"Saved {len(embeddings)} embeddings to disk at {file_path}")
        except Exception as e:
            logger.error(f"Failed to persist embeddings for document {document_id}: {e}")
            raise RuntimeError(f"Physical database write failure: {str(e)}")

    def get_by_document_id(self, document_id: str) -> List[VectorEmbedding]:
        """Retrieves and loads computed embeddings for a specific document from disk."""
        file_path = os.path.join(self.upload_dir, f"{document_id}_embeddings.json")
        if not os.path.exists(file_path):
            logger.warning(f"Embeddings file does not exist for document: {document_id}")
            return []
            
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return [VectorEmbedding(**item) for item in data]
        except Exception as e:
            logger.error(f"Failed to load embeddings from disk at {file_path}: {e}")
            return []

    def delete_by_document_id(self, document_id: str) -> bool:
        """Deletes persistent embeddings file for a specific document."""
        file_path = os.path.join(self.upload_dir, f"{document_id}_embeddings.json")
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                logger.info(f"Deleted persistent embeddings JSON file: {file_path}")
                return True
            except Exception as e:
                logger.error(f"Failed to delete embeddings file {file_path}: {e}")
                return False
        return False
