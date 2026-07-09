"""
Singleton model manager for loading and executing SentenceTransformer embeddings safely and lazily.
"""
import logging
import threading
from typing import Any, List
from app.config.embedding_config import DEFAULT_MODEL_NAME, CACHE_DIR, DEVICE

logger = logging.getLogger("SemanticVault.EmbeddingModel")

class EmbeddingModelManager:
    """Thread-safe Singleton class for loading and utilizing the SentenceTransformer model."""
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = super(EmbeddingModelManager, cls).__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
            
        self.model_name = DEFAULT_MODEL_NAME
        self._model = None
        self._initialized = True
        logger.info(f"EmbeddingModelManager initialized for model: {self.model_name}")

    def get_model(self) -> Any:
        """
        Lazily loads and returns the SentenceTransformer model instance.
        
        This avoids heavy imports and model downloads at server startup time.
        """
        if self._model is None:
            with self._lock:
                if self._model is None:
                    logger.info(f"Lazy loading SentenceTransformer model '{self.model_name}' on device '{DEVICE}'...")
                    try:
                        # Lazy imports
                        from sentence_transformers import SentenceTransformer
                        
                        self._model = SentenceTransformer(
                            model_name_or_path=self.model_name,
                            cache_folder=CACHE_DIR,
                            device=DEVICE
                        )
                        logger.info(f"Successfully loaded model '{self.model_name}' into RAM")
                    except Exception as e:
                        logger.error(f"Failed to load embedding model '{self.model_name}': {e}", exc_info=True)
                        raise RuntimeError(f"Embedding model loading failure: {str(e)}")
                        
        return self._model

    def encode(self, texts: List[str], batch_size: int = 32, show_progress_bar: bool = False) -> List[List[float]]:
        """
        Generates dense embeddings for a list of string texts.
        
        Args:
            texts (List[str]): List of clean text segments.
            batch_size (int): Size of batches for parallel computation.
            show_progress_bar (bool): True to log/render PyTorch progress metrics.
            
        Returns:
            List[List[float]]: A list of raw float arrays representing the vector representations.
        """
        model = self.get_model()
        logger.debug(f"Encoding {len(texts)} text chunks with batch_size {batch_size}")
        try:
            # We enforce returning list of floats directly
            import numpy as np
            embeddings = model.encode(
                texts,
                batch_size=batch_size,
                show_progress_bar=show_progress_bar,
                convert_to_numpy=True
            )
            # Convert NumPy arrays to standard lists of floats for API serialization
            return embeddings.tolist()
        except Exception as e:
            logger.error(f"Error generating embedding encodes: {e}", exc_info=True)
            raise RuntimeError(f"Encoder generation failure: {str(e)}")
