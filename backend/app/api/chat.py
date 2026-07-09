"""
FastAPI route endpoints for orchestrating user queries, chats, streams, and history catalogs.
"""
import logging
from fastapi import APIRouter, HTTPException, Depends, status, Query
from fastapi.responses import StreamingResponse
from app.models.chat import ChatRequest, ChatResponse
from app.models.conversation import ConversationSession, ConversationSummary
from app.services.chat_service import ChatService
from app.services.conversation_service import ConversationService
from typing import List, Optional

logger = logging.getLogger("SemanticVault.API.Chat")

router = APIRouter(tags=["Grounded Chat & Conversations"])

def get_chat_service() -> ChatService:
    return ChatService()

def get_conversation_service() -> ConversationService:
    return ConversationService()

@router.post("/chat", response_model=ChatResponse, status_code=status.HTTP_200_OK)
def process_conversation_query(
    request: ChatRequest,
    chat_service: ChatService = Depends(get_chat_service)
):
    """
    Submits a user query to the RAG grounding chat system.
    
    If streaming is enabled (stream=True), returns a SSE chunk stream.
    Otherwise, blocks and returns a complete synthesized ChatResponse with source citations.
    """
    logger.info(f"API route '/chat' invoked. Query: '{request.message[:40]}...'. Stream mode: {request.stream}")
    try:
        if request.stream:
            # Return Server-Sent Events stream
            generator = chat_service.process_chat_stream_request(request)
            return StreamingResponse(
                generator,
                media_type="text/event-stream",
                headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
            )
        else:
            # Synchronous processing
            response = chat_service.process_chat_request(request)
            return response
            
    except ValueError as e:
        logger.warning(f"Invalid input schema in chat request: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Inference request invalid: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Uncaught exception inside chat endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"SemanticVault synthesis failure: {str(e)}"
        )

@router.get("/history", response_model=List[ConversationSummary], status_code=status.HTTP_200_OK)
def fetch_all_conversation_summaries(
    conv_service: ConversationService = Depends(get_conversation_service)
):
    """
    Retrieves all conversation sessions stored in memory, formatted as lightweight summaries.
    """
    logger.info("API route GET '/history' invoked.")
    try:
        return conv_service.get_all_summaries()
    except Exception as e:
        logger.error(f"Failed to fetch conversation summaries: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve history index."
        )

@router.delete("/history", status_code=status.HTTP_200_OK)
def delete_conversation_session(
    conversation_id: str = Query(..., description="Target session GUID to destroy"),
    conv_service: ConversationService = Depends(get_conversation_service)
):
    """
    Permanently deletes a target conversation thread and its associated message history.
    """
    logger.info(f"API route DELETE '/history' invoked for session: {conversation_id}")
    try:
        success = conv_service.delete_session(conversation_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session GUID '{conversation_id}' not found."
            )
        return {"success": True, "message": f"Successfully deleted conversation thread: {conversation_id}"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete conversation: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete session."
        )

@router.post("/clear", status_code=status.HTTP_200_OK)
def clear_all_conversations(
    conv_service: ConversationService = Depends(get_conversation_service)
):
    """
    Destroys all conversation sessions and lists in-memory.
    """
    logger.info("API route POST '/clear' invoked.")
    try:
        conv_service.clear_all_history()
        return {"success": True, "message": "All conversations and cache successfully cleared."}
    except Exception as e:
        logger.error(f"Failed to clear history database: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear conversations database."
        )
