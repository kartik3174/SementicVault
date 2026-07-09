"""
Lightweight thread-safe caching system to prevent redundant embedding calculations.
"""
import os
import json
import hashlib
import logging
import threading
from typing import List, Optional, Dict

logger = logging.getLogger("SemanticVault.EmbeddingCache")

class EmbeddingCache:
    """Manages simple on-disk key-value cache of text strings to vector float arrays."""
    
    _lock = threading.Lock()
    
    def __init__(self, cache_dir: Optional[str] = None):
        self.cache_dir = cache_dir or os.environ.get("UPLOAD_DIR", "uploads")
        os.makedirs(self.cache_dir, exist_ok=True)
        self.cache_file = os.path.join(self.cache_dir, "embeddings_cache.json")
        self._cache_data: Dict[str, List[float]] = {}
        self._load_cache()

    def _hash_text(self, text: str) -> str:
        """Generates a stable SHA-256 hash representing the text content."""
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    def _load_cache(self) -> None:
        """Loads existing cache from the disk if available."""
        if not os.path.exists(self.cache_file):
            return
        try:
            with open(self.cache_file, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if content:
                    self._cache_data = json.loads(content)
                    logger.info(f"Loaded {len(self._cache_data)} cached embedding records from disk")
        except Exception as e:
            logger.warning(f"Could not load embedding cache: {e}. Starting with empty cache.")

    def _save_cache(self) -> None:
        """Persists cache data back to disk atomically."""
        temp_file = f"{self.cache_file}.tmp"
        try:
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(self._cache_data, f, ensure_ascii=False)
            os.replace(temp_file, self.cache_file)
        except Exception as e:
            logger.error(f"Failed to persist embedding cache file: {e}")
            if os.path.exists(temp_file):
                os.remove(temp_file)

    def get(self, text: str) -> Optional[List[float]]:
        """
        Retrieves cached embedding for a text snippet.
        """
        key = self._hash_text(text)
        with self._lock:
            return self._cache_data.get(key)

    def set(self, text: str, vector: List[float]) -> None:
        """
        Stores an embedding vector associated with a text snippet.
        """
        key = self._hash_text(text)
        with self._lock:
            self._cache_data[key] = vector
            # For simplicity, we save cache every time a new key is added.
            # In massive production scale this would be debounced or flushed on exit.
            self._save_cache()

    def clear(self) -> None:
        """Clears all records inside the embedding cache."""
        with self._lock:
            self._cache_data.clear()
            if os.path.exists(self.cache_file):
                try:
                    os.remove(self.cache_file)
                except Exception as e:
                    logger.error(f"Failed to remove cache file: {e}")
            logger.info("Embedding cache cleared")
