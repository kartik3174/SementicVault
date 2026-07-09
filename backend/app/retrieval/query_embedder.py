"""
Generates high-quality sentence embeddings for preprocessed queries
using the singleton sentence-transformer model.
"""
import logging
from typing import List
from app.embeddings.embedding_model import EmbeddingModelManager

logger = logging.getLogger("SemanticVault.QueryEmbedder")

class QueryEmbedder:
    """Uses the EmbeddingModelManager to convert a text query into a 384-dimensional dense vector."""

    def __init__(self):
        self.model_manager = EmbeddingModelManager()

    def embed_query(self, query_text: str) -> List[float]:
        """
        Encodes a single preprocessed text query into a vector representation.
        """
        logger.info(f"Generating query embedding for query text: '{query_text[:50]}...'")
        try:
            vectors = self.model_manager.encode([query_text], batch_size=1)
            if not vectors or len(vectors) == 0:
                raise RuntimeError("Embedding model returned empty results.")
            return vectors[0]
        except Exception as e:
            logger.error(f"Failed to generate embedding for query: {e}", exc_info=True)
            raise RuntimeError(f"Query embedding generation failed: {str(e)}")
