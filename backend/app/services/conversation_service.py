"""
Service layer to format, retrieve, delete, and manage chat history records.
"""
import uuid
import logging
from typing import List, Optional
from datetime import datetime
from app.rag.conversation_manager import ConversationManager
from app.models.conversation import ConversationSession, ConversationSummary, ChatMessageRecord

logger = logging.getLogger("SemanticVault.ConversationService")

class ConversationService:
    """Provides higher-level operations for conversation history querying, naming, and deletion."""

    def __init__(self):
        self.manager = ConversationManager()

    def get_all_summaries(self) -> List[ConversationSummary]:
        """
        Gathers lists of summarized sessions.
        """
        summaries = []
        for sid, session in self.manager.sessions.items():
            # Derive title from first user prompt or default placeholder
            title = "New Discussion"
            if session.messages:
                user_msgs = [m for m in session.messages if m.role == "user"]
                if user_msgs:
                    first_content = user_msgs[0].content
                    title = first_content[:40] + "..." if len(first_content) > 40 else first_content

            summary = ConversationSummary(
                id=sid,
                title=title,
                message_count=len(session.messages),
                created_at=session.created_at,
                updated_at=session.updated_at
            )
            summaries.append(summary)
            
        # Sort by updated_at descending
        summaries.sort(key=lambda s: s.updated_at, reverse=True)
        return summaries

    def create_session(self) -> ConversationSession:
        """
        Creates an empty session.
        """
        return self.manager.create_session()

    def get_session(self, session_id: str) -> Optional[ConversationSession]:
        """
        Gets a session by ID.
        """
        return self.manager.get_session(session_id)

    def delete_session(self, session_id: str) -> bool:
        """
        Deletes a session.
        """
        return self.manager.delete_session(session_id)

    def clear_all_history(self) -> None:
        """
        Removes all cached history.
        """
        self.manager.clear_all_sessions()
