"""
Saves all modular retrieval steps (preprocessing, embedding, candidate search,
filtering, re-ranking, and fusion) under a clean orchestrator pipeline.
"""
import time
import logging
from typing import List, Optional, Dict, Any
from app.config.vector_config import DEFAULT_COLLECTION_NAME
from app.retrieval.query_preprocessor import QueryPreprocessor
from app.retrieval.query_embedder import QueryEmbedder
from app.retrieval.retriever import ChromaRetriever
from app.retrieval.score_filter import ScoreFilter
from app.retrieval.reranker import CrossEncoderReranker
from app.retrieval.hybrid_search import HybridSearcher
from app.retrieval.query_expander import QueryExpander
from app.retrieval.context_builder import ContextBuilder
from app.models.retrieval import RetrievalResultItem, RetrievalQueryResponse

logger = logging.getLogger("SemanticVault.RetrievalPipeline")

class RetrievalPipeline:
    """Orchestrates modular components to implement the entire retrieval pipeline safely and cleanly."""

    def __init__(self):
        self.preprocessor = QueryPreprocessor()
        self.embedder = QueryEmbedder()
        self.retriever = ChromaRetriever()
        self.reranker = CrossEncoderReranker()
        self.hybrid_searcher = HybridSearcher()
        self.query_expander = QueryExpander()
        self.context_builder = ContextBuilder()

    def execute_retrieval(
        self,
        query: str,
        top_k: int = 5,
        similarity_threshold: float = 0.0,
        document_id: Optional[str] = None,
        filename: Optional[str] = None,
        page_number: Optional[int] = None,
        chunk_number: Optional[int] = None,
        collection_name: str = DEFAULT_COLLECTION_NAME
    ) -> RetrievalQueryResponse:
        """
        Executes end-to-end semantic retrieval process.
        """
        start_time = time.time()
        logger.info(f"Incoming query to retrieval pipeline: '{query}'")

        # 1. Query Validation and Preprocessing
        self.preprocessor.validate_query(query)
        cleaned_query = self.preprocessor.clean_query(query)
        logger.info(f"Cleaned query: '{cleaned_query}'")

        # 2. Query Expansion (Placeholder)
        expanded_queries = self.query_expander.expand_query(cleaned_query)
        primary_query = expanded_queries[0]

        # 3. Query Embedding Generation
        query_vector = self.embedder.embed_query(primary_query)

        # 4. Dense Retrieval
        candidates = self.retriever.retrieve_candidates(
            query_vector=query_vector,
            top_k=top_k,
            document_id=document_id,
            filename=filename,
            page_number=page_number,
            chunk_number=chunk_number,
            collection_name=collection_name
        )

        # 5. Hybrid Search Integration (Placeholder)
        hybrid_candidates = self.hybrid_searcher.search(
            query=primary_query,
            dense_results=candidates,
            top_k=top_k
        )

        # 6. Re-ranking (Placeholder)
        reranked_candidates = self.reranker.rerank(primary_query, hybrid_candidates)

        # 7. Similarity Score Filtering
        filtered_results = ScoreFilter.filter_by_threshold(reranked_candidates, similarity_threshold)

        # 8. Context Deduplication
        final_results = self.context_builder.remove_duplicates(filtered_results)

        latency = time.time() - start_time
        avg_score = sum([r.score for r in final_results]) / len(final_results) if final_results else 0.0
        
        logger.info(
            f"Retrieval pipeline complete. Query: '{cleaned_query[:30]}...', "
            f"Latency: {latency:.4f}s, Chunks Retrieved: {len(final_results)}, "
            f"Average Score: {avg_score:.4f}"
        )

        return RetrievalQueryResponse(
            query=cleaned_query,
            results=final_results,
            latency_sec=round(latency, 4)
        )
