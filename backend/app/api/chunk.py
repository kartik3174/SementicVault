"""
API routes for document chunking and preprocessing.
"""
import logging
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, status, Query, Depends
from app.services.chunk_service import ChunkService

logger = logging.getLogger("SemanticVault.API.Chunk")

router = APIRouter(tags=["Document Chunking & Preprocessing"])

def get_chunk_service() -> ChunkService:
    return ChunkService()

@router.post("/chunk/{document_id}", status_code=status.HTTP_201_CREATED)
def generate_document_chunks(
    document_id: str,
    chunk_size: int = Query(500, ge=50, le=5000, description="Target character size of each chunk"),
    chunk_overlap: int = Query(100, ge=0, le=2500, description="Overlapping characters between adjacent chunks"),
    service: ChunkService = Depends(get_chunk_service)
):
    """
    Triggers the cleaning, normalization, and hierarchical recursive chunking pipeline 
    for an ingested document's text content.
    """
    logger.info(f"API request to generate chunks for document: {document_id}")
    try:
        chunks = service.generate_chunks(document_id, chunk_size, chunk_overlap)
        return {
            "success": True,
            "document_id": document_id,
            "total_chunks": len(chunks),
            "status": "Chunking completed successfully",
            "chunks_preview": chunks[:3]  # Return preview of first 3 chunks to avoid massive payload
        }
    except FileNotFoundError as e:
        logger.warning(f"File not found during chunk API request: {str(e)}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        logger.warning(f"Invalid value/empty content: {str(e)}")
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected chunk generation error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chunking pipeline failed: {str(e)}"
        )

@router.get("/chunk/{document_id}")
def get_document_chunks(
    document_id: str,
    service: ChunkService = Depends(get_chunk_service)
):
    """
    Retrieves all generated chunks for a specific document.
    
    If the document has not been chunked yet, it runs the pipeline using default settings.
    """
    logger.info(f"API request to fetch chunks for document: {document_id}")
    try:
        chunks = service.get_chunks(document_id)
        return {
            "success": True,
            "document_id": document_id,
            "total_chunks": len(chunks),
            "chunks": chunks
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to fetch chunks: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Retrieval of document chunks failed: {str(e)}"
        )

@router.delete("/chunk/{document_id}")
def delete_document_chunks(
    document_id: str,
    service: ChunkService = Depends(get_chunk_service)
):
    """
    Deletes all saved chunks for a specific document from disk storage.
    """
    logger.info(f"API request to delete chunks for document: {document_id}")
    try:
        success = service.delete_chunks(document_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No chunk records found to delete for document {document_id}."
            )
        return {
            "success": True,
            "document_id": document_id,
            "message": "Generated chunks deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete chunks: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete document chunks: {str(e)}"
        )
