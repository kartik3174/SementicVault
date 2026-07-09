"""
API route handlers for ChromaDB vector store indexing, querying, and collection management.
"""
import time
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Query, Depends
from app.services.vector_pipeline import VectorPipeline
from app.vectorstore.vector_service import VectorService
from app.models.vector import IndexingResponse, VectorSearchResponse
from app.config.vector_config import DEFAULT_COLLECTION_NAME

logger = logging.getLogger("SemanticVault.API.Vector")

router = APIRouter(tags=["Vector Database Integration (ChromaDB)"])

def get_vector_service() -> VectorService:
    return VectorService()

def get_vector_pipeline() -> VectorPipeline:
    return VectorPipeline()

@router.post("/vectors/index/{document_id}", response_model=IndexingResponse, status_code=status.HTTP_201_CREATED)
def index_document_vectors(
    document_id: str,
    chunk_size: int = Query(500, ge=50, le=5000, description="Target character size of each chunk"),
    chunk_overlap: int = Query(100, ge=0, le=2500, description="Overlapping characters between adjacent chunks"),
    pipeline: VectorPipeline = Depends(get_vector_pipeline)
):
    """
    Ingests, cleans, chunks, encodes, and indexes a document end-to-end inside the local 
    ChromaDB vector store.
    """
    logger.info(f"API request to run vector pipeline & index document: {document_id}")
    try:
        response = pipeline.process_and_index_document(
            document_id=document_id,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
        return response
    except FileNotFoundError as e:
        logger.warning(f"File not found during vector index API request: {str(e)}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        logger.warning(f"Invalid parameters or values: {str(e)}")
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        logger.error(f"Critical error during document indexing: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Vector database indexing failed: {str(e)}"
        )

@router.get("/vectors/search", response_model=VectorSearchResponse)
def search_vectors(
    query: str = Query(..., min_length=1, description="Semantic text query to search for"),
    top_k: int = Query(5, ge=1, le=50, description="Maximum number of nearest neighbor chunks to return"),
    document_id: Optional[str] = Query(None, description="Optional document UUID to filter search results"),
    filename: Optional[str] = Query(None, description="Optional filename to filter search results"),
    page_number: Optional[int] = Query(None, ge=1, description="Optional page number to filter search results"),
    chunk_number: Optional[int] = Query(None, ge=1, description="Optional chunk number to filter search results"),
    service: VectorService = Depends(get_vector_service)
):
    """
    Performs a high-performance vector semantic search against the persistent ChromaDB collection.
    
    Generates a dense query embedding vector and uses HNSW cosine similarity to fetch the most 
    relevant text chunks. Supports pre-query metadata filtering by document, filename, page, or chunk.
    """
    logger.info(f"API request for vector search: '{query}' [top_k={top_k}]")
    start_time = time.time()
    try:
        matches = service.search_similarity(
            query_text=query,
            top_k=top_k,
            document_id=document_id,
            filename=filename,
            page_number=page_number,
            chunk_number=chunk_number
        )
        search_time = time.time() - start_time
        
        return VectorSearchResponse(
            success=True,
            query=query,
            top_k=top_k,
            matches_count=len(matches),
            results=matches,
            search_time_sec=round(search_time, 4)
        )
    except Exception as e:
        logger.error(f"Vector search failure: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Semantic search query execution failed: {str(e)}"
        )

@router.delete("/vectors/{document_id}")
def delete_document_vectors(
    document_id: str,
    service: VectorService = Depends(get_vector_service)
):
    """
    Deletes all vector embeddings indexed for a specific document ID.
    """
    logger.warning(f"API request to clear vector records for document: {document_id}")
    try:
        success = service.delete_document_vectors(document_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No vector records found to delete for document '{document_id}'."
            )
        return {
            "success": True,
            "document_id": document_id,
            "message": "Persistent document vector records successfully deleted."
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to clear document vectors: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear vector records: {str(e)}"
        )

@router.delete("/vectors/collection")
def clear_collection(
    service: VectorService = Depends(get_vector_service)
):
    """
    Performs a full wipe and deletion of the main ChromaDB document collection.
    """
    logger.warning("API request to destroy collection 'semanticvault_documents'")
    try:
        success = service.delete_collection(DEFAULT_COLLECTION_NAME)
        if not success:
            return {
                "success": False,
                "message": f"Collection '{DEFAULT_COLLECTION_NAME}' did not exist; skip reset."
            }
        return {
            "success": True,
            "message": f"Successfully dropped and cleared collection '{DEFAULT_COLLECTION_NAME}'."
        }
    except Exception as e:
        logger.error(f"Failed to drop collection: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Wiping collection failed: {str(e)}"
        )
