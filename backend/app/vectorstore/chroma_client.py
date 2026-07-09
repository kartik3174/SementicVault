"""
Thread-safe Singleton ChromaDB client manager for stable persistent storage access.
"""
import os
import logging
import threading
import chromadb
from app.config.vector_config import CHROMA_PERSIST_DIR

logger = logging.getLogger("SemanticVault.ChromaClient")

class ChromaClientManager:
    """Thread-safe Singleton manager for loading and interacting with the local ChromaDB PersistentClient."""
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = super(ChromaClientManager, cls).__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
            
        self.persist_directory = CHROMA_PERSIST_DIR
        # Ensure target directory exists
        os.makedirs(self.persist_directory, exist_ok=True)
        
        self._client = None
        self._initialized = True
        logger.info(f"ChromaClientManager configured to persist data at: {self.persist_directory}")

    def get_client(self) -> chromadb.PersistentClient:
        """
        Lazily instantiates and returns the PersistentClient instance.
        """
        if self._client is None:
            with self._lock:
                if self._client is None:
                    logger.info("Initializing persistent ChromaDB client...")
                    try:
                        self._client = chromadb.PersistentClient(path=self.persist_directory)
                        logger.info("ChromaDB PersistentClient successfully initialized.")
                    except Exception as e:
                        logger.error(f"Failed to initialize ChromaDB PersistentClient: {e}", exc_info=True)
                        raise RuntimeError(f"ChromaDB initialization failure: {str(e)}")
        return self._client
