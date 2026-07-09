"""
Service layer wrapping the Retrieval Pipeline to isolate fastAPI and model interfaces.
"""
import logging
from typing import Optional
from app.retrieval.retrieval_pipeline import RetrievalPipeline
from app.models.retrieval import RetrievalQueryResponse, RetrievalQueryRequest
from app.config.vector_config import DEFAULT_COLLECTION_NAME

logger = logging.getLogger("SemanticVault.RetrievalService")

class RetrievalService:
    """Wrapper service that instantiates and executes the underlying RetrievalPipeline."""

    def __init__(self):
        self.pipeline = RetrievalPipeline()

    def retrieve(self, request: RetrievalQueryRequest) -> RetrievalQueryResponse:
        """
        Executes a semantic query.
        """
        top_k = request.top_k or 5
        threshold = request.similarity_threshold or 0.0
        collection = request.collection_name or DEFAULT_COLLECTION_NAME

        return self.pipeline.execute_retrieval(
            query=request.query,
            top_k=top_k,
            similarity_threshold=threshold,
            document_id=request.document_id,
            filename=request.filename,
            page_number=request.page_number,
            chunk_number=request.chunk_number,
            collection_name=collection
        )
