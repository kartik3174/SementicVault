"""
Formats retrieved document chunks into clean context summaries for injection.
"""
from typing import List
from app.models.retrieval import RetrievalResultItem
from app.rag.prompt_templates import CONTEXT_PROMPT_TEMPLATE

class ContextFormatter:
    """Provides methods to format lists of Retrieved Items into clear, readable context blocks."""

    @staticmethod
    def format_chunks(chunks: List[RetrievalResultItem]) -> str:
        """
        Takes raw RetrievalResultItem list and renders it as a structured Markdown text block.
        """
        if not chunks:
            return "No document context matching the query is available. No documents are loaded in the database."

        formatted_parts = []
        for idx, chunk in enumerate(chunks):
            part = CONTEXT_PROMPT_TEMPLATE.format(
                index=idx + 1,
                filename=chunk.filename,
                page=chunk.page,
                score=chunk.score,
                text=chunk.text
            )
            formatted_parts.append(part)

        return "\n\n".join(formatted_parts)
