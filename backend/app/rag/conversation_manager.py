"""
Thread-safe, in-memory repository for storing and managing multi-user conversation logs.
"""
import uuid
import logging
from datetime import datetime
from typing import Dict, List, Optional
from app.models.conversation import ConversationSession, ChatMessageRecord

logger = logging.getLogger("SemanticVault.ConversationManager")

class ConversationManager:
    """Singleton coordinator that stores, retrieves, and clears chat session timelines in memory."""
    
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ConversationManager, cls).__new__(cls)
            cls._instance.sessions = {}
        return cls._instance

    def create_session(self, metadata: Optional[Dict[str, Any]] = None) -> ConversationSession:
        """
        Creates a new unique ConversationSession.
        """
        sid = str(uuid.uuid4())
        session = ConversationSession(
            id=sid,
            messages=[],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            metadata=metadata or {}
        )
        self.sessions[sid] = session
        logger.info(f"Spawned new conversation session GUID: {sid}")
        return session

    def get_session(self, session_id: str) -> Optional[ConversationSession]:
        """
        Returns an active session by ID. Returns None if not found.
        """
        return self.sessions.get(session_id)

    def delete_session(self, session_id: str) -> bool:
        """
        Removes a session by ID. Returns True if removed, False otherwise.
        """
        if session_id in self.sessions:
            del self.sessions[session_id]
            logger.info(f"Destroyed session GUID: {session_id}")
            return True
        return False

    def clear_all_sessions(self) -> None:
        """
        Deletes all cached chat streams.
        """
        self.sessions.clear()
        logger.info("Cleared all conversation sessions from cache.")

    def add_message(self, session_id: str, record: ChatMessageRecord) -> ConversationSession:
        """
        Appends a message record to a session's message list.
        """
        session = self.get_session(session_id)
        if not session:
            # Lazy creation if user sends a custom unregistered ID
            session = ConversationSession(
                id=session_id,
                messages=[],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            self.sessions[session_id] = session

        session.messages.append(record)
        session.updated_at = datetime.utcnow()
        return session
