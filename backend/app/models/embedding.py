"""
Pydantic models representing request and response schemas for the Embedding Generation Pipeline.
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class VectorEmbedding(BaseModel):
    """Data model representing a generated vector embedding for a text chunk."""
    embedding_id: str = Field(description="Unique UUID identifying this embedding")
    chunk_id: str = Field(description="The source chunk ID this vector represents")
    document_id: str = Field(description="The parent document UUID")
    vector: List[float] = Field(description="High-dimensional dense float array representing the chunk meaning")
    dimension: int = Field(description="Dimensions of the dense vector")
    model: str = Field(description="The model name used to generate this embedding (e.g. all-MiniLM-L6-v2)")
    created_at: float = Field(description="Unix timestamp of when this vector was computed")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Metadata propagated from the chunk")

class EmbeddingGenerationResponse(BaseModel):
    """Response model returned after generating embeddings for a document's chunks."""
    success: bool = True
    document_id: str = Field(description="Unique UUID of the document processed")
    total_chunks: int = Field(description="Number of chunks processed")
    dimension: int = Field(description="Dimensions of the generated vectors")
    model: str = Field(description="Embedding model name used")
    processing_time_sec: float = Field(description="Execution duration in seconds")
    embeddings: List[VectorEmbedding] = Field(description="List of computed embedding structures (without vector data in summary or with it based on client demand)")

class SimilarityRequest(BaseModel):
    """Request schema for testing cosine similarity between two clean texts."""
    text1: str = Field(description="First text snippet")
    text2: str = Field(description="Second text snippet")

class SimilarityResponse(BaseModel):
    """Response schema demonstrating various distance metrics between two snippets."""
    text1: str
    text2: str
    cosine_similarity: float = Field(description="Cosine similarity metric (usually ranges from -1.0 to 1.0; closer to 1.0 is highly similar)")
    dot_product: float = Field(description="Inner dot product of the normalized embeddings")
    euclidean_distance: float = Field(description="Euclidean distance between embedding vectors (lower is more similar)")
    dimension: int = Field(description="Dimensionality of vectors used")
    model: str = Field(description="Model used for calculation")
