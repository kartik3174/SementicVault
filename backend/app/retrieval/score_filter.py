"""
Filters retrieved document chunk records using a configurable similarity threshold.
"""
import logging
from typing import List
from app.models.retrieval import RetrievalResultItem

logger = logging.getLogger("SemanticVault.ScoreFilter")

class ScoreFilter:
    """Responsible for removing chunks that do not meet the minimum similarity score criteria."""

    @staticmethod
    def filter_by_threshold(chunks: List[RetrievalResultItem], threshold: float) -> List[RetrievalResultItem]:
        """
        Filters a list of retrieval result items, retaining only those with a score >= threshold.
        """
        if threshold <= 0.0:
            return chunks

        logger.info(f"Filtering {len(chunks)} chunks with similarity threshold: {threshold}")
        filtered = [chunk for chunk in chunks if chunk.score >= threshold]
        logger.info(f"Retained {len(filtered)} / {len(chunks)} chunks above threshold")
        return filtered
