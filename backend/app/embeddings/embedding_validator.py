"""
Validation utilities for identifying anomalous, corrupt, or invalid generated embeddings.
"""
import math
import logging
from typing import List, Dict, Any
from app.config.embedding_config import EMBEDDING_DIMENSION

logger = logging.getLogger("SemanticVault.EmbeddingValidator")

class EmbeddingValidationError(Exception):
    """Custom exception raised when vector embedding validation fails."""
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message

def validate_vector(vector: List[float], chunk_id: str = "unknown") -> None:
    """
    Validates a single vector embedding array.
    
    Checks for:
        - Non-emptiness
        - Correct dimensionality matching model specifications
        - Absence of NaN values
        - Absence of Infinity values
        
    Raises:
        EmbeddingValidationError: if any check fails.
    """
    if not vector:
        raise EmbeddingValidationError(f"Empty embedding vector detected for chunk ID: {chunk_id}")
        
    if len(vector) != EMBEDDING_DIMENSION:
        raise EmbeddingValidationError(
            f"Invalid dimensionality for chunk {chunk_id}. Expected {EMBEDDING_DIMENSION}, got {len(vector)}"
        )
        
    for idx, val in enumerate(vector):
        if math.isnan(val):
            raise EmbeddingValidationError(f"NaN value detected in vector at index {idx} for chunk {chunk_id}")
        if math.isinf(val):
            raise EmbeddingValidationError(f"Infinite value detected in vector at index {idx} for chunk {chunk_id}")

def validate_embeddings_batch(embeddings: List[Dict[str, Any]]) -> None:
    """
    Validates a batch of prepared embedding objects prior to persistence or delivery.
    
    Checks for:
        - Missing critical IDs
        - Structural correctness of nested structures
        - Duplicate chunk or embedding IDs
    """
    seen_chunk_ids = set()
    seen_embedding_ids = set()
    
    for idx, item in enumerate(embeddings):
        # 1. Check critical metadata properties
        emb_id = item.get("embedding_id")
        chunk_id = item.get("chunk_id")
        doc_id = item.get("document_id")
        vector = item.get("vector")
        
        if not emb_id:
            raise EmbeddingValidationError(f"Missing 'embedding_id' in batch item index {idx}")
        if not chunk_id:
            raise EmbeddingValidationError(f"Missing 'chunk_id' in batch item index {idx}")
        if not doc_id:
            raise EmbeddingValidationError(f"Missing 'document_id' in batch item index {idx}")
        if vector is None:
            raise EmbeddingValidationError(f"Missing 'vector' array in batch item index {idx}")
            
        # 2. Check for duplicate IDs inside the same batch
        if emb_id in seen_embedding_ids:
            raise EmbeddingValidationError(f"Duplicate embedding ID '{emb_id}' detected at index {idx}")
        if chunk_id in seen_chunk_ids:
            raise EmbeddingValidationError(f"Duplicate chunk source reference ID '{chunk_id}' detected at index {idx}")
            
        seen_embedding_ids.add(emb_id)
        seen_chunk_ids.add(chunk_id)
        
        # 3. Validate deep values
        validate_vector(vector, chunk_id=chunk_id)
        
    logger.info(f"Batch validation complete. Verified {len(embeddings)} embedding records successfully.")
