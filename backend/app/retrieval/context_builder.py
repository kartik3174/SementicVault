"""
Combines retrieved chunks into a unified and structured context string for LLM usage,
implementing advanced deduplication, sorting, and size budget constraints.
"""
import logging
from typing import List
from app.models.retrieval import RetrievalResultItem
from app.config.retrieval_config import MAX_CONTEXT_LENGTH, MAX_CHUNKS

logger = logging.getLogger("SemanticVault.ContextBuilder")

class ContextBuilder:
    """Aggregates retrieved chunks into a cohesive context payload while staying within memory and token budgets."""

    def __init__(self, max_length: int = MAX_CONTEXT_LENGTH, max_chunks: int = MAX_CHUNKS):
        self.max_length = max_length
        self.max_chunks = max_chunks

    def remove_duplicates(self, chunks: List[RetrievalResultItem]) -> List[RetrievalResultItem]:
        """
        Removes chunks with duplicate IDs to prevent feeding repetitive content to an LLM.
        Maintains the original order.
        """
        seen_ids = set()
        deduplicated = []
        for chunk in chunks:
            if chunk.chunk_id not in seen_ids:
                seen_ids.add(chunk.chunk_id)
                deduplicated.append(chunk)
            else:
                logger.debug(f"Removing duplicate chunk ID: {chunk.chunk_id}")
        return deduplicated

    def build_structured_context(self, chunks: List[RetrievalResultItem]) -> str:
        """
        Builds a single structured string of combined context from a list of retrieved chunks.
        Applies duplicate removal, caps chunk count, formats clearly, and truncates to length.
        """
        # Deduplicate
        unique_chunks = self.remove_duplicates(chunks)

        # Cap count
        selected_chunks = unique_chunks[:self.max_chunks]

        context_parts = []
        current_length = 0

        for idx, chunk in enumerate(selected_chunks):
            # Format header clearly
            header = f"--- CHUNK {idx+1} [File: {chunk.filename} | Page: {chunk.page} | Score: {chunk.score:.4f}] ---\n"
            content = f"{chunk.text}\n"
            
            chunk_repr = header + content
            
            # Check length budget
            if current_length + len(chunk_repr) > self.max_length:
                logger.warning(f"Context budget exceeded. Truncating context builder output.")
                truncated_text = chunk_repr[:self.max_length - current_length]
                if truncated_text.strip():
                    context_parts.append(truncated_text)
                context_parts.append("\n[Context truncated due to size budget constraints]")
                break
                
            context_parts.append(chunk_repr)
            current_length += len(chunk_repr)

        return "\n".join(context_parts)
