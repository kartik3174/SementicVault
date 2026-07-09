"""
Service layer organizing user input validation, context retrieval, session binding, and inference execution.
"""
import uuid
import logging
from typing import Generator, List, Dict, Any, Optional
from datetime import datetime
from app.rag.rag_pipeline import RAGPipeline
from app.rag.conversation_manager import ConversationManager
from app.retrieval.retrieval_pipeline import RetrievalPipeline
from app.rag.context_formatter import ContextFormatter
from app.rag.citation_formatter import CitationFormatter
from app.ollama.response_generator import ResponseGenerator
from app.models.chat import ChatRequest, ChatResponse, CitationItem
from app.models.conversation import ConversationSession, ChatMessageRecord

logger = logging.getLogger("SemanticVault.ChatService")

class ChatService:
    """Manages chat messages validation, history attachment, and pipelines running."""

    def __init__(self):
        self.pipeline = RAGPipeline()
        self.conv_manager = ConversationManager()
        self.retrieval_pipeline = RetrievalPipeline()
        self.generator = ResponseGenerator()

    def process_chat_request(self, request: ChatRequest) -> ChatResponse:
        """
        Runs synchronous grounding inference, automatically managing history in-memory.
        """
        # Resolve or create session ID
        sid = request.conversation_id
        if not sid:
            session = self.conv_manager.create_session()
            sid = session.id
            request.conversation_id = sid

        session = self.conv_manager.get_session(sid)
        history_records = session.messages if session else []

        # 1. Archive current user question
        user_message_id = f"msg_{uuid.uuid4()}"
        user_record = ChatMessageRecord(
            id=user_message_id,
            role="user",
            content=request.message,
            timestamp=datetime.utcnow()
        )
        self.conv_manager.add_message(sid, user_record)

        # 2. Run grounded response synthesis
        response = self.pipeline.run_inference(request, chat_history=history_records)
        response.conversation_id = sid

        # 3. Save assistant message with sources and citations
        assistant_message_id = f"msg_{uuid.uuid4()}"
        assistant_record = ChatMessageRecord(
            id=assistant_message_id,
            role="assistant",
            content=response.answer,
            timestamp=datetime.utcnow(),
            citations=response.citations,
            token_usage=response.tokens_generated
        )
        self.conv_manager.add_message(sid, assistant_record)

        return response

    def process_chat_stream_request(self, request: ChatRequest) -> Generator[str, None, None]:
        """
        Triggers Server-Sent Events (SSE) RAG stream, retrieving vectors first and passing it to the generator.
        """
        sid = request.conversation_id
        if not sid:
            session = self.conv_manager.create_session()
            sid = session.id
            request.conversation_id = sid

        session = self.conv_manager.get_session(sid)
        history_records = session.messages if session else []

        # Archive user message
        user_message_id = f"msg_{uuid.uuid4()}"
        user_record = ChatMessageRecord(
            id=user_message_id,
            role="user",
            content=request.message,
            timestamp=datetime.utcnow()
        )
        self.conv_manager.add_message(sid, user_record)

        # 1. Retrieve matching sources first
        retrieval_response = self.retrieval_pipeline.execute_retrieval(
            query=request.message,
            top_k=request.top_k_chunks or 4,
            similarity_threshold=request.similarity_threshold or 0.0
        )
        
        chunks = retrieval_response.results
        context_str = ContextFormatter.format_chunks(chunks)
        citations = CitationFormatter.map_to_citations(chunks)

        # 2. Format complete prompt
        full_prompt = self.pipeline.prompt_builder.build_inference_payload(
            question=request.message,
            retrieved_context=context_str,
            history=history_records
        )

        options = {
            "temperature": request.temperature if request.temperature is not None else 0.2,
            "top_p": request.top_p if request.top_p is not None else 0.9
        }

        # 3. Stream back generator chunks
        logger.info(f"Triggering Ollama SSE streaming generator on model '{request.model or 'llama3.2'}'...")
        yield from self.generator.generate_streaming_response(
            prompt=full_prompt,
            citations=citations,
            model=request.model or "llama3.2",
            options=options
        )
