"""
Manager for auditing index integrity, verifying dimensions, and retrieving vector count statistics.
"""
import logging
from app.vectorstore.collection_manager import CollectionManager
from app.config.vector_config import EMBEDDING_DIMENSION

logger = logging.getLogger("SemanticVault.IndexManager")

class IndexManager:
    """Handles health checks, cardinality counts, and dimensionality validation for vector collections."""
    
    def __init__(self):
        self.collection_manager = CollectionManager()

    def get_index_stats(self, collection_name: str) -> dict:
        """
        Gathers metric statistics from a target collection.
        """
        try:
            col = self.collection_manager.get_collection(collection_name)
            count = col.count()
            return {
                "collection_name": collection_name,
                "total_indexed_records": count,
                "expected_dimension": EMBEDDING_DIMENSION,
                "status": "healthy" if count >= 0 else "uninitialized"
            }
        except Exception as e:
            logger.error(f"Failed to query index stats for '{collection_name}': {e}")
            return {
                "collection_name": collection_name,
                "total_indexed_records": 0,
                "expected_dimension": EMBEDDING_DIMENSION,
                "status": "corrupt/error",
                "error_details": str(e)
            }

    def verify_vector_dimension(self, vector: list) -> bool:
        """
        Asserts that a vector matches the system's expected mathematical dimensions.
        """
        if not vector or len(vector) != EMBEDDING_DIMENSION:
            logger.error(f"Vector dimension mismatch! Expected {EMBEDDING_DIMENSION}, got {len(vector) if vector else 0}")
            return False
        return True
