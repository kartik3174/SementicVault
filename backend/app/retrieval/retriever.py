"""
Retriever class that orchestrates vector retrieval directly with ChromaDB
and integrates with the VectorRepository.
"""
import logging
from typing import List, Optional, Dict, Any
from app.vectorstore.vector_repository import VectorRepository
from app.vectorstore.metadata_filter import build_chroma_filter
from app.vectorstore.search_utils import convert_distance_to_score
from app.config.vector_config import DEFAULT_COLLECTION_NAME
from app.models.retrieval import RetrievalResultItem

logger = logging.getLogger("SemanticVault.Retriever")

class ChromaRetriever:
    """Queries ChromaDB using dense query vectors, applying metadata filters and metric conversions."""

    def __init__(self):
        self.repository = VectorRepository()

    def retrieve_candidates(
        self,
        query_vector: List[float],
        top_k: int = 5,
        document_id: Optional[str] = None,
        filename: Optional[str] = None,
        page_number: Optional[int] = None,
        chunk_number: Optional[int] = None,
        collection_name: str = DEFAULT_COLLECTION_NAME
    ) -> List[RetrievalResultItem]:
        """
        Directly queries the vector database using the precomputed query embedding.
        """
        # 1. Build ChromaDB compliant metadata filters
        where_filter = build_chroma_filter(
            document_id=document_id,
            filename=filename,
            page_number=page_number,
            chunk_number=chunk_number
        )

        logger.info(f"Retrieving nearest neighbors from ChromaDB collection '{collection_name}' (top_k={top_k})")
        
        # 2. Run Query
        try:
            raw_results = self.repository.query_nearest_neighbors(
                query_embeddings=[query_vector],
                top_k=top_k,
                where_filter=where_filter,
                collection_name=collection_name
            )
        except Exception as e:
            logger.error(f"Failed to query ChromaDB in retriever: {e}", exc_info=True)
            raise RuntimeError(f"ChromaDB search execution failed: {str(e)}")

        results: List[RetrievalResultItem] = []

        if not raw_results or "ids" not in raw_results or not raw_results["ids"]:
            logger.info("No matching records found in ChromaDB.")
            return []

        # Extract rows
        match_ids = raw_results["ids"][0]
        match_distances = raw_results["distances"][0]
        match_metadatas = raw_results["metadatas"][0]
        match_documents = raw_results["documents"][0]

        for idx in range(len(match_ids)):
            cid = match_ids[idx]
            dist = match_distances[idx]
            meta = match_metadatas[idx] or {}
            text = match_documents[idx]

            # Map raw distance to standard 0.0 - 1.0 similarity score
            score = convert_distance_to_score(dist)

            item = RetrievalResultItem(
                chunk_id=cid,
                score=score,
                filename=meta.get("document_name", "unknown"),
                page=meta.get("page_number", 1),
                text=text,
                metadata=meta
            )
            results.append(item)

        # Sort results by score descending
        results.sort(key=lambda r: r.score, reverse=True)
        return results
