"""
Pydantic models representing request and response schemas for Vector Database operations.
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class IndexingResponse(BaseModel):
    """Response model returned after indexing a document's embeddings in ChromaDB."""
    success: bool = True
    document_id: str = Field(description="Unique UUID of the indexed document")
    collection_name: str = Field(description="ChromaDB collection name where vectors are stored")
    inserted_count: int = Field(description="Number of vector chunks successfully indexed")
    dimension: int = Field(description="Dimensionality of the indexed vector embeddings")
    processing_time_sec: float = Field(description="Execution duration in seconds")

class VectorSearchResult(BaseModel):
    """Detailed representation of a single matching chunk returned from a vector search."""
    chunk_id: str = Field(description="The unique ID of the matching chunk")
    document_id: str = Field(description="The unique ID of the parent document")
    text: str = Field(description="The textual content of the chunk")
    score: float = Field(description="The similarity score calculated by ChromaDB (ranges from 0.0 to 1.0; 1.0 represents high similarity)")
    metadata: Dict[str, Any] = Field(description="The complete set of metadata attributes associated with this chunk")

class VectorSearchResponse(BaseModel):
    """Enriched response wrapper containing all search results and performance statistics."""
    success: bool = True
    query: str = Field(description="The original user search query")
    top_k: int = Field(description="The maximum number of nearest neighbors requested")
    matches_count: int = Field(description="The actual number of nearest neighbors found")
    results: List[VectorSearchResult] = Field(description="Ordered list of matching chunks sorted by relevance")
    search_time_sec: float = Field(description="Total search and distance evaluation time in seconds")
