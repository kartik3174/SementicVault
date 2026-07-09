"""
Pydantic schemas for Chat requests and response models.
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class ChatMessagePayload(BaseModel):
    role: str = Field(..., description="Role of the speaker: 'user' or 'assistant'")
    content: str = Field(..., description="Message text content")

class ChatRequest(BaseModel):
    conversation_id: Optional[str] = Field(None, description="Active conversation session ID. If null, a new session is spawned.")
    message: str = Field(..., description="Incoming user query")
    model: Optional[str] = Field(None, description="Name of LLM model inside Ollama")
    temperature: Optional[float] = Field(None, description="Sampling temperature (0.0 to 2.0)")
    top_p: Optional[float] = Field(None, description="Nucleus sampling threshold")
    top_k_chunks: Optional[int] = Field(None, description="Number of context chunks to retrieve")
    similarity_threshold: Optional[float] = Field(None, description="Minimum score to keep chunks")
    stream: bool = Field(True, description="Enable chunked streaming responses")

class CitationItem(BaseModel):
    chunk_id: str = Field(..., description="Unique index of context chunk")
    filename: str = Field(..., description="Origin file name")
    page: int = Field(..., description="Origin page number")
    similarity_score: float = Field(..., description="Cosine similarity score")
    text: str = Field(..., description="Text content of the chunk")

class ChatResponse(BaseModel):
    conversation_id: str = Field(..., description="Session ID")
    answer: str = Field(..., description="Complete generated response text")
    citations: List[CitationItem] = Field(default_factory=list, description="Citations used to ground this answer")
    latency_sec: float = Field(..., description="Total processing latency in seconds")
    tokens_generated: int = Field(0, description="Approximate count of tokens generated")
