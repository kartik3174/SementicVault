"""
Service layer for handling document uploads, metadata registry updates, and file storage.
"""
import os
import json
import uuid
import time
import shutil
import logging
from typing import List, Optional, Dict, Any
from fastapi import UploadFile
from app.config.allowed_extensions import ALLOWED_MIME_TYPES
from app.utils.file_validator import validate_file, FileValidationError
from app.loaders.document_loader import DocumentLoader
from app.models.upload import DocumentMetadata

logger = logging.getLogger("SemanticVault.UploadService")

class UploadService:
    """Manages secure file persistence and metadata registration inside SemanticVault."""
    
    def __init__(self, upload_dir: Optional[str] = None):
        # Resolve upload directory from environment variable or default to 'uploads/'
        self.upload_dir = upload_dir or os.environ.get("UPLOAD_DIR", "uploads")
        os.makedirs(self.upload_dir, exist_ok=True)
        self.metadata_file = os.path.join(self.upload_dir, "metadata.json")
        self._init_metadata_registry()

    def _init_metadata_registry(self) -> None:
        """Initializes the metadata registry file if it does not exist."""
        if not os.path.exists(self.metadata_file):
            logger.info("Initializing fresh metadata registry JSON file")
            self._save_registry({})

    def _load_registry(self) -> Dict[str, Dict[str, Any]]:
        """Loads and returns the metadata registry database."""
        try:
            if not os.path.exists(self.metadata_file):
                return {}
            with open(self.metadata_file, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if not content:
                    return {}
                return json.loads(content)
        except Exception as e:
            logger.error(f"Failed to read metadata registry: {e}")
            return {}

    def _save_registry(self, registry: Dict[str, Dict[str, Any]]) -> None:
        """Writes the registry to the metadata file atomically."""
        temp_file = f"{self.metadata_file}.tmp"
        try:
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(registry, f, indent=2, ensure_ascii=False)
            shutil.move(temp_file, self.metadata_file)
        except Exception as e:
            logger.error(f"Failed to save metadata registry atomically: {e}")
            if os.path.exists(temp_file):
                os.remove(temp_file)
            raise RuntimeError(f"Database persist error: {str(e)}")

    def save_and_ingest(self, file: UploadFile) -> DocumentMetadata:
        """
        Validates, saves, extracts, and registers an uploaded document.
        
        Args:
            file (UploadFile): The file upload object from the client.
            
        Returns:
            DocumentMetadata: Structured object representing the ingested document metadata.
            
        Raises:
            FileValidationError: If file validation checks fail.
            ValueError: If file parsing fails.
        """
        # 1. Perform validation checks (Extension, Size, Emptiness)
        validate_file(file)
        
        # 2. Assign unique ID and names to avoid collisions (sandbox path safety)
        document_id = str(uuid.uuid4())
        original_filename = file.filename or "unnamed_document"
        _, ext = os.path.splitext(original_filename.lower())
        unique_filename = f"{document_id}{ext}"
        target_path = os.path.join(self.upload_dir, unique_filename)
        
        logger.info(f"Ingesting file '{original_filename}' assigned id '{document_id}'")
        
        # 3. Save physical file inside the designated uploads storage folder
        try:
            # Rewind file stream pointer to ensure we write full bytes
            file.file.seek(0)
            with open(target_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        except Exception as e:
            logger.error(f"Failed to save physical file to {target_path}: {e}")
            raise RuntimeError(f"Physical file write failure: {str(e)}")
            
        # 4. Extract content and calculate document parameters (pages, clean characters)
        try:
            text_content, pages = DocumentLoader.load(target_path)
            characters_count = len(text_content)
            size_bytes = os.path.getsize(target_path)
        except Exception as e:
            # Self-healing: if loading fails, clear physical file before raising error
            logger.warning(f"Loader failed to parse saved document. Cleaning up: {target_path}")
            if os.path.exists(target_path):
                os.remove(target_path)
            raise ValueError(f"Document parsing failed: {str(e)}")
            
        # 5. Build and register metadata entry
        # Save raw content adjacent to the file as .txt or track within metadata?
        # A good practice is storing raw text alongside metadata or inside the file registry.
        # Let's save a corresponding .txt file for the raw text so we can retrieve raw text easily later!
        raw_text_path = os.path.join(self.upload_dir, f"{document_id}.txt")
        try:
            with open(raw_text_path, "w", encoding="utf-8") as f:
                f.write(text_content)
        except Exception as e:
            logger.error(f"Failed to save extracted raw text helper file: {e}")
            
        # Resolve standard content-type
        content_type = file.content_type or "application/octet-stream"
        
        meta = DocumentMetadata(
            document_id=document_id,
            filename=original_filename,
            file_path=target_path,
            size_bytes=size_bytes,
            pages=pages,
            characters=characters_count,
            content_type=content_type,
            uploaded_at=time.time()
        )
        
        # Save to database
        registry = self._load_registry()
        registry[document_id] = meta.model_dump()
        self._save_registry(registry)
        
        logger.info(f"Ingestion successful for document ID {document_id}")
        return meta

    def list_all(self) -> List[DocumentMetadata]:
        """Lists all uploaded documents sorted by creation timestamp descending."""
        registry = self._load_registry()
        documents = []
        for doc_data in registry.values():
            try:
                documents.append(DocumentMetadata(**doc_data))
            except Exception as e:
                logger.warning(f"Skipping corrupted metadata entry: {e}")
        # Sort newest first
        documents.sort(key=lambda d: d.uploaded_at, reverse=True)
        return documents

    def get_by_id(self, document_id: str) -> Optional[DocumentMetadata]:
        """Retrieves metadata of a specific document by its ID."""
        registry = self._load_registry()
        doc_data = registry.get(document_id)
        if doc_data:
            return DocumentMetadata(**doc_data)
        return None

    def get_raw_text(self, document_id: str) -> str:
        """Retrieves raw extracted text content of a specific document."""
        raw_text_path = os.path.join(self.upload_dir, f"{document_id}.txt")
        if os.path.exists(raw_text_path):
            try:
                with open(raw_text_path, "r", encoding="utf-8") as f:
                    return f.read()
            except Exception as e:
                logger.error(f"Failed to read raw text file for {document_id}: {e}")
                
        # Fallback to direct extraction if .txt is missing but original file remains
        meta = self.get_by_id(document_id)
        if meta and os.path.exists(meta.file_path):
            text, _ = DocumentLoader.load(meta.file_path)
            return text
            
        raise FileNotFoundError(f"Extracted content not found for document: {document_id}")

    def delete_by_id(self, document_id: str) -> bool:
        """
        Deletes the file and its corresponding metadata registry entries.
        
        Args:
            document_id (str): The document ID to delete.
            
        Returns:
            bool: True if deletion was successful, False if document was not found.
        """
        registry = self._load_registry()
        if document_id not in registry:
            logger.warning(f"Delete requested for non-existent document ID: {document_id}")
            return False
            
        meta_dict = registry[document_id]
        file_path = meta_dict.get("file_path")
        
        # 1. Delete physical original file
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
                logger.info(f"Removed physical file: {file_path}")
            except Exception as e:
                logger.error(f"Failed to delete physical file {file_path}: {e}")
                
        # 2. Delete raw extracted text companion file
        raw_text_path = os.path.join(self.upload_dir, f"{document_id}.txt")
        if os.path.exists(raw_text_path):
            try:
                os.remove(raw_text_path)
                logger.info(f"Removed raw text helper file: {raw_text_path}")
            except Exception as e:
                logger.error(f"Failed to delete helper raw text file {raw_text_path}: {e}")
                
        # 3. Clean up registry record
        del registry[document_id]
        self._save_registry(registry)
        logger.info(f"Successfully deleted metadata registry record for {document_id}")
        return True
