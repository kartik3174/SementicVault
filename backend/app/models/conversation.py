"""
Pydantic schemas for Conversation history and statistics.
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.models.chat import ChatMessagePayload, CitationItem

class ChatMessageRecord(BaseModel):
    id: str = Field(..., description="Unique message GUID")
    role: str = Field(..., description="Role of the speaker: 'user' or 'assistant'")
    content: str = Field(..., description="Cleaned message text")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Time sent")
    citations: Optional[List[CitationItem]] = Field(None, description="Injected context sources for assistant messages")
    context_used: Optional[str] = Field(None, description="The complete structured context prompt sent to LLM")
    token_usage: Optional[int] = Field(None, description="Estimated token footprint")

class ConversationSession(BaseModel):
    id: str = Field(..., description="Unique conversation session GUID")
    messages: List[ChatMessageRecord] = Field(default_factory=list, description="Ordered timeline of chat transcripts")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Session generation timestamp")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last message timestamp")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Custom contextual parameters")

class ConversationSummary(BaseModel):
    id: str = Field(..., description="Session ID")
    title: str = Field(..., description="Synthesized summary of conversation topic")
    message_count: int = Field(..., description="Number of entries in chat log")
    created_at: datetime = Field(..., description="Session creation date")
    updated_at: datetime = Field(..., description="Session modification date")
