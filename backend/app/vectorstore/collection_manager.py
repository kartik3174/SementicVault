"""
Manager class handling ChromaDB collection creation, retrieval, validation, and lifecycle operations.
"""
import logging
from typing import Optional, Dict, Any
import chromadb
from app.vectorstore.chroma_client import ChromaClientManager
from app.config.vector_config import DEFAULT_COLLECTION_NAME, SIMILARITY_METRIC

logger = logging.getLogger("SemanticVault.CollectionManager")

class CollectionManager:
    """Handles the administrative and setup logic for ChromaDB Collections."""
    
    def __init__(self):
        self.client_manager = ChromaClientManager()

    def get_collection(self, collection_name: str = DEFAULT_COLLECTION_NAME) -> chromadb.Collection:
        """
        Retrieves or creates a collection in ChromaDB, configuring its distance metric.
        
        Args:
            collection_name (str): Name of the target collection.
            
        Returns:
            chromadb.Collection: The configured collection object.
        """
        client = self.client_manager.get_client()
        logger.debug(f"Fetching collection '{collection_name}' with space set to '{SIMILARITY_METRIC}'")
        try:
            # Create or fetch collection, setting HNSW distance space (e.g. "cosine")
            collection = client.get_or_create_collection(
                name=collection_name,
                metadata={"hnsw:space": SIMILARITY_METRIC}
            )
            logger.info(f"Successfully retrieved or established collection: {collection_name}")
            return collection
        except Exception as e:
            logger.error(f"Failed to access or create collection '{collection_name}': {e}", exc_info=True)
            raise RuntimeError(f"ChromaDB Collection access error: {str(e)}")

    def delete_collection(self, collection_name: str = DEFAULT_COLLECTION_NAME) -> bool:
        """
        Deletes a collection permanently from the database.
        
        Args:
            collection_name (str): Name of the collection to destroy.
            
        Returns:
            bool: True if deleted, False if it did not exist.
        """
        client = self.client_manager.get_client()
        logger.warning(f"Permanently deleting ChromaDB collection: {collection_name}")
        try:
            client.delete_collection(name=collection_name)
            logger.info(f"Successfully deleted collection: {collection_name}")
            return True
        except ValueError:
            # Chroma raises ValueError if the collection does not exist
            logger.info(f"Collection '{collection_name}' was not found; skipped deletion.")
            return False
        except Exception as e:
            logger.error(f"Critical failure while deleting collection '{collection_name}': {e}", exc_info=True)
            raise RuntimeError(f"ChromaDB Collection deletion error: {str(e)}")

    def collection_exists(self, collection_name: str = DEFAULT_COLLECTION_NAME) -> bool:
        """
        Checks if a collection exists in the current persistent instance.
        """
        client = self.client_manager.get_client()
        try:
            collections = client.list_collections()
            names = [col.name for col in collections]
            return collection_name in names
        except Exception as e:
            logger.error(f"Error checking collection existence: {e}")
            return False
