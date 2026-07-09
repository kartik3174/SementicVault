"""
API Route Handlers for the Document Ingestion Pipeline.
"""
import logging
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends
from app.services.upload_service import UploadService
from app.utils.file_validator import FileValidationError
from app.models.upload import UploadResponse, DocumentMetadata, DocumentListResponse, DeleteResponse

logger = logging.getLogger("SemanticVault.API.Upload")

# Create router
router = APIRouter(tags=["Document Ingestion Pipeline"])

# Singleton-like helper for service layer
def get_upload_service() -> UploadService:
    return UploadService()

@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    service: UploadService = Depends(get_upload_service)
):
    """
    Upload and ingest a document.
    
    Accepts:
        - multipart/form-data: Key name must be 'file' and hold PDF, DOCX, TXT, or MD/Markdown formats.
        
    Validates:
        - Extension is allowed
        - File size <= 10MB
        - File is not empty (0 bytes)
    """
    logger.info(f"Received file upload request: {file.filename}")
    try:
        meta = service.save_and_ingest(file)
        return UploadResponse(
            success=True,
            document_id=meta.document_id,
            filename=meta.filename,
            pages=meta.pages,
            characters=meta.characters,
            status="Uploaded Successfully"
        )
    except FileValidationError as e:
        logger.warning(f"File validation rejected upload: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    except ValueError as e:
        logger.error(f"Ingestion parsing failed for file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected internal server error during upload: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload service encountered an unexpected error: {str(e)}"
        )

@router.get("/documents", response_model=DocumentListResponse)
def get_documents(service: UploadService = Depends(get_upload_service)):
    """
    Retrieve the registry of all ingested documents in the system.
    """
    try:
        documents = service.list_all()
        return DocumentListResponse(success=True, documents=documents)
    except Exception as e:
        logger.error(f"Failed to list documents: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve document collection: {str(e)}"
        )

@router.delete("/documents/{id}", response_model=DeleteResponse)
def delete_document(
    id: str,
    service: UploadService = Depends(get_upload_service)
):
    """
    Delete an ingested document by its unique ID.
    
    Removes:
        - Local metadata registration
        - Saved physical file
        - Accompanying raw text file
    """
    try:
        success = service.delete_by_id(id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID '{id}' was not found in the vault."
            )
        return DeleteResponse(
            success=True,
            message="Document deleted successfully from the vault",
            document_id=id
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete document {id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute document deletion: {str(e)}"
        )
