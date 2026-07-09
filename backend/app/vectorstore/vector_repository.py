"""
Repository implementing the Repository Pattern for isolating direct low-level ChromaDB read/write commands.
"""
import time
import logging
from typing import List, Dict, Any, Optional
import chromadb
from app.vectorstore.collection_manager import CollectionManager
from app.config.vector_config import DEFAULT_COLLECTION_NAME

logger = logging.getLogger("SemanticVault.VectorRepository")

class VectorRepository:
    """Direct database access logic (DAO) communicating with ChromaDB collections."""
    
    def __init__(self):
        self.collection_manager = CollectionManager()

    def upsert_records(
        self,
        ids: List[str],
        embeddings: List[List[float]],
        metadatas: List[Dict[str, Any]],
        documents: List[str],
        collection_name: str = DEFAULT_COLLECTION_NAME
    ) -> int:
        """
        Saves or updates a bulk batch of vector embedding records into ChromaDB.
        
        Args:
            ids (List[str]): Unique string IDs for each item.
            embeddings (List[List[float]]): Array of float vectors.
            metadatas (List[Dict[str, Any]]): Accompanying metadata maps.
            documents (List[str]): Original raw string text segments.
            collection_name (str): The collection target.
            
        Returns:
            int: The number of inserted/updated elements.
        """
        start = time.time()
        col = self.collection_manager.get_collection(collection_name)
        
        logger.info(f"Upserting {len(ids)} vectors into collection '{collection_name}'")
        try:
            col.upsert(
                ids=ids,
                embeddings=embeddings,
                metadatas=metadatas,
                documents=documents
            )
            duration = time.time() - start
            logger.info(f"Successfully upserted {len(ids)} vectors in {duration:.3f}s")
            return len(ids)
        except Exception as e:
            logger.error(f"Failed to upsert records into ChromaDB: {e}", exc_info=True)
            raise RuntimeError(f"Database upsert operation failed: {str(e)}")

    def delete_by_filter(self, filter_dict: Dict[str, Any], collection_name: str = DEFAULT_COLLECTION_NAME) -> bool:
        """
        Deletes vector records from ChromaDB matching a specific metadata filter (e.g. document_id).
        """
        col = self.collection_manager.get_collection(collection_name)
        logger.warning(f"Deleting vector records in '{collection_name}' matching filter: {filter_dict}")
        try:
            col.delete(where=filter_dict)
            logger.info("Matching vectors successfully deleted.")
            return True
        except Exception as e:
            logger.error(f"Failed to delete records using filter {filter_dict}: {e}", exc_info=True)
            raise RuntimeError(f"Database delete operation failed: {str(e)}")

    def delete_by_ids(self, ids: List[str], collection_name: str = DEFAULT_COLLECTION_NAME) -> bool:
        """
        Deletes specific vector records by their string IDs.
        """
        col = self.collection_manager.get_collection(collection_name)
        logger.warning(f"Deleting vector records in '{collection_name}' by IDs: {ids}")
        try:
            col.delete(ids=ids)
            logger.info("Specific vector IDs deleted successfully.")
            return True
        except Exception as e:
            logger.error(f"Failed to delete records for IDs {ids}: {e}", exc_info=True)
            raise RuntimeError(f"Database deletion by IDs failed: {str(e)}")

    def query_nearest_neighbors(
        self,
        query_embeddings: List[List[float]],
        top_k: int = 5,
        where_filter: Optional[Dict[str, Any]] = None,
        collection_name: str = DEFAULT_COLLECTION_NAME
    ) -> Dict[str, Any]:
        """
        Executes a vector search query against the ChromaDB collection.
        
        Args:
            query_embeddings (List[List[float]]): Chunks of encoded search queries.
            top_k (int): Number of nearest neighbors to retrieve.
            where_filter (dict, optional): Metadata filters to apply prior to vector scoring.
            collection_name (str): Target collection.
            
        Returns:
            dict: Raw result dictionary from Chroma containing 'ids', 'distances', 'metadatas', 'documents'.
        """
        start = time.time()
        col = self.collection_manager.get_collection(collection_name)
        
        logger.info(f"Querying nearest neighbors (top_k={top_k}) with filter: {where_filter}")
        try:
            raw_results = col.query(
                query_embeddings=query_embeddings,
                n_results=top_k,
                where=where_filter,
                include=["documents", "metadatas", "distances"]
            )
            duration = time.time() - start
            logger.info(f"Nearest neighbor query executed in {duration:.3f}s")
            return raw_results
        except Exception as e:
            logger.error(f"Nearest neighbor query failed: {e}", exc_info=True)
            raise RuntimeError(f"Database query operation failed: {str(e)}")
