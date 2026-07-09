"""
API route handlers for computing, retrieving, and analyzing vector embeddings.
"""
import time
import logging
from typing import List
from fastapi import APIRouter, HTTPException, status, Query, Depends
from app.services.chunk_service import ChunkService
from app.embeddings.embedding_service import EmbeddingService
from app.embeddings.embedding_model import EmbeddingModelManager
from app.models.embedding import EmbeddingGenerationResponse, VectorEmbedding, SimilarityRequest, SimilarityResponse
from app.utils.similarity import cosine_similarity, dot_product, euclidean_distance

logger = logging.getLogger("SemanticVault.API.Embedding")

router = APIRouter(tags=["Embedding Generation Pipeline"])

def get_chunk_service() -> ChunkService:
    return ChunkService()

def get_embedding_service() -> EmbeddingService:
    return EmbeddingService()

@router.post("/embeddings/{document_id}", response_model=EmbeddingGenerationResponse, status_code=status.HTTP_201_CREATED)
def generate_document_embeddings(
    document_id: str,
    chunk_size: int = Query(500, ge=50, le=5000, description="Chunk size if chunks need to be generated"),
    chunk_overlap: int = Query(100, ge=0, le=2500, description="Chunk overlap if chunks need to be generated"),
    chunk_service: ChunkService = Depends(get_chunk_service),
    embedding_service: EmbeddingService = Depends(get_embedding_service)
):
    """
    Retrieves or generates document chunks, and encodes each text chunk into a high-dimensional dense vector.
    
    The resulting embeddings are validated, enriched with metadata, and saved to disk.
    """
    logger.info(f"API request to generate embeddings for document: {document_id}")
    start_time = time.time()
    
    try:
        # 1. Fetch chunks or trigger creation if they don't exist yet
        # We try to get chunks; if not found on disk, it automatically generates with defaults
        # To match the query params, we trigger generation to ensure correct settings are used
        chunks = chunk_service.generate_chunks(document_id, chunk_size, chunk_overlap)
        
        if not chunks:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"No valid text chunks could be extracted from document '{document_id}' to encode."
            )
            
        # 2. Process and compute embeddings
        embeddings = embedding_service.generate_for_chunks(document_id, chunks)
        
        processing_time = time.time() - start_time
        
        return EmbeddingGenerationResponse(
            success=True,
            document_id=document_id,
            total_chunks=len(embeddings),
            dimension=384,
            model="all-MiniLM-L6-v2",
            processing_time_sec=round(processing_time, 3),
            embeddings=embeddings
        )
        
    except FileNotFoundError as e:
        logger.warning(f"Document not found during embedding generation: {e}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        logger.warning(f"Value/schema parsing failure: {e}")
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to execute embedding generation: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Embedding pipeline execution error: {str(e)}"
        )

@router.get("/embeddings/{document_id}", response_model=List[VectorEmbedding])
def get_document_embeddings(
    document_id: str,
    embedding_service: EmbeddingService = Depends(get_embedding_service)
):
    """
    Loads and returns all computed embeddings for a specific document from local storage.
    """
    logger.info(f"API request to retrieve embeddings for document: {document_id}")
    try:
        embeddings = embedding_service.get_by_document_id(document_id)
        if not embeddings:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Embeddings have not been generated yet for document ID '{document_id}'."
            )
        return embeddings
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error loading document embeddings: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load vector records: {str(e)}"
        )

@router.delete("/embeddings/{document_id}")
def delete_document_embeddings(
    document_id: str,
    embedding_service: EmbeddingService = Depends(get_embedding_service)
):
    """
    Deletes computed embeddings for a specific document.
    """
    logger.info(f"API request to delete embeddings for document: {document_id}")
    try:
        success = embedding_service.delete_by_document_id(document_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No persistent embedding records found to delete for document '{document_id}'."
            )
        return {
            "success": True,
            "document_id": document_id,
            "message": "Persistent embeddings cleared successfully from database storage."
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting embeddings: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear vector records: {str(e)}"
        )

@router.post("/embeddings/similarity", response_model=SimilarityResponse)
def demo_similarity(request: SimilarityRequest):
    """
    Demonstration utility endpoint.
    
    Accepts two arbitrary text strings, computes their 384-dimensional dense vectors 
    on the fly, and returns detailed mathematical similarity/distance metrics:
        - Cosine Similarity
        - Inner Dot Product
        - Euclidean Distance
    """
    logger.info("Computing on-the-fly similarity analysis for demonstration")
    try:
        model = EmbeddingModelManager()
        
        # 1. Encode both text snippets
        vectors = model.encode([request.text1, request.text2], batch_size=2)
        v1, v2 = vectors[0], vectors[1]
        
        # 2. Perform distance metric calculations
        cos_score = cosine_similarity(v1, v2)
        dot_score = dot_product(v1, v2)
        dist_score = euclidean_distance(v1, v2)
        
        return SimilarityResponse(
            text1=request.text1,
            text2=request.text2,
            cosine_similarity=round(cos_score, 6),
            dot_product=round(dot_score, 6),
            euclidean_distance=round(dist_score, 6),
            dimension=384,
            model="all-MiniLM-L6-v2"
        )
    except Exception as e:
        logger.error(f"Similarity comparison failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Vector calculation failed: {str(e)}"
        )
