"""
Converts matched chunks into standard API model citations.
"""
from typing import List
from app.models.retrieval import RetrievalResultItem
from app.models.chat import CitationItem

class CitationFormatter:
    """Standardizes matching vector chunks into serializable Chat API CitationItem objects."""

    @staticmethod
    def map_to_citations(chunks: List[RetrievalResultItem]) -> List[CitationItem]:
        """
        Translates a list of retrieval result items into API-friendly CitationItems.
        """
        citations = []
        for chunk in chunks:
            item = CitationItem(
                chunk_id=chunk.chunk_id,
                filename=chunk.filename,
                page=chunk.page,
                similarity_score=chunk.score,
                text=chunk.text
            )
            citations.append(item)
        return citations
