"""
Pydantic models representing request and response schemas for the Document Ingestion Pipeline.
"""
from pydantic import BaseModel, Field
from typing import List, Optional

class DocumentMetadata(BaseModel):
    """Metadata of an ingested and stored document."""
    document_id: str = Field(description="Unique UUID string identifying the document")
    filename: str = Field(description="Original filename")
    file_path: str = Field(description="Local path where the document is stored inside uploads/")
    size_bytes: int = Field(description="Document size in bytes")
    pages: int = Field(default=1, description="Number of detected or extracted pages in the document")
    characters: int = Field(default=0, description="Total characters in the extracted clean text")
    content_type: str = Field(description="Standard MIME content type of the file")
    uploaded_at: float = Field(description="Unix timestamp of when the file was ingested")

class UploadResponse(BaseModel):
    """Response model returned upon successful document upload and ingestion."""
    success: bool = True
    document_id: str = Field(description="Unique UUID of the uploaded document")
    filename: str = Field(description="Original name of the uploaded file")
    pages: int = Field(description="Page count (or 1 for text files)")
    characters: int = Field(description="Character count of extracted content")
    status: str = "Uploaded Successfully"

class DocumentListResponse(BaseModel):
    """Response model for retrieving the list of ingested documents."""
    success: bool = True
    documents: List[DocumentMetadata] = []

class DeleteResponse(BaseModel):
    """Response model for document deletion confirmation."""
    success: bool = True
    message: str
    document_id: str
