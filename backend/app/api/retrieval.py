"""
FastAPI route endpoints for executing semantic context retrieval queries.
"""
import logging
from fastapi import APIRouter, HTTPException, Depends, status
from app.models.retrieval import RetrievalQueryRequest, RetrievalQueryResponse
from app.services.retrieval_service import RetrievalService

logger = logging.getLogger("SemanticVault.API.Retrieval")

router = APIRouter(tags=["Semantic Retrieval Engine"])

def get_retrieval_service() -> RetrievalService:
    return RetrievalService()

@router.post("/retrieve", response_model=RetrievalQueryResponse, status_code=status.HTTP_200_OK)
def retrieve_semantic_context(
    request: RetrievalQueryRequest,
    service: RetrievalService = Depends(get_retrieval_service)
):
    """
    Retrieves the most semantically relevant document chunks matching a user's natural language query.
    
    Generates a dense vector query representation, queries the ChromaDB vector store,
    filters the results based on similarity score and optional metadata attributes, and returns
    re-ranked chunks ready to serve as contexts for downstream LLM generation.
    """
    logger.info(f"API route '/retrieve' invoked with query: '{request.query[:50]}...'")
    try:
        response = service.retrieve(request)
        return response
    except ValueError as e:
        logger.warning(f"Validation failure during retrieval request: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Query validation failed: {str(e)}"
        )
    except FileNotFoundError as e:
        logger.warning(f"Missing collection or file resource: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Uncaught exception inside semantic retrieval controller: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Semantic retrieval failure: {str(e)}"
        )
