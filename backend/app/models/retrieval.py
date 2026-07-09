"""
Pydantic schemas for semantic retrieval requests and responses.
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class RetrievalQueryRequest(BaseModel):
    query: str = Field(..., description="Semantic text query to search for")
    top_k: Optional[int] = Field(None, description="Maximum number of nearest neighbor chunks to return")
    similarity_threshold: Optional[float] = Field(None, description="Minimum similarity score threshold (0.0 to 1.0)")
    document_id: Optional[str] = Field(None, description="Optional document ID to restrict retrieval")
    filename: Optional[str] = Field(None, description="Optional filename to restrict retrieval")
    page_number: Optional[int] = Field(None, description="Optional page number filter")
    chunk_number: Optional[int] = Field(None, description="Optional chunk index filter")
    collection_name: Optional[str] = Field(None, description="Target collection name in ChromaDB")

class RetrievalResultItem(BaseModel):
    chunk_id: str = Field(..., description="Unique ID of the matching chunk")
    score: float = Field(..., description="Normalized similarity score")
    filename: str = Field(..., description="Origin filename")
    page: int = Field(..., description="Origin page number")
    text: str = Field(..., description="Chunk content text")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Metadata key-value pairs")

class RetrievalQueryResponse(BaseModel):
    query: str = Field(..., description="Cleaned search query")
    results: List[RetrievalResultItem] = Field(default_factory=list, description="Sorted list of retrieved chunks")
    latency_sec: float = Field(..., description="Retrieval process latency in seconds")
