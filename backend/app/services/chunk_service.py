"""
Service layer for orchestrating the text preprocessing, intelligent chunking, and metadata construction.
"""
import os
import json
import uuid
import re
import time
import logging
from typing import List, Dict, Any, Optional
from app.cleaners import clean_text
from app.chunkers import RecursiveCharacterChunker
from app.services.upload_service import UploadService
from app.utils.token_counter import TokenCounter
from app.config.chunk_config import DEFAULT_CHUNK_SIZE, DEFAULT_CHUNK_OVERLAP, HIERARCHICAL_SEPARATORS, MIN_CHUNK_CHARACTERS

logger = logging.getLogger("SemanticVault.ChunkService")

class ChunkService:
    """Orchestrates document chunking, cleaning, validation, and metadata enrichment."""
    
    def __init__(self, upload_dir: Optional[str] = None):
        self.upload_dir = upload_dir or os.environ.get("UPLOAD_DIR", "uploads")
        os.makedirs(self.upload_dir, exist_ok=True)
        self.upload_service = UploadService(self.upload_dir)

    def generate_chunks(
        self, 
        document_id: str, 
        chunk_size: int = DEFAULT_CHUNK_SIZE, 
        chunk_overlap: int = DEFAULT_CHUNK_OVERLAP
    ) -> List[Dict[str, Any]]:
        """
        Retrieves a document's raw extracted text, preprocesses it, 
        generates recursive chunks, enriches them with metadata, and saves them to disk.
        """
        logger.info(f"Chunk generation triggered for document ID: {document_id}")
        start_time = time.time()
        
        # 1. Retrieve original document metadata & content
        meta = self.upload_service.get_by_id(document_id)
        if not meta:
            logger.error(f"Failed to find document metadata in registry for ID: {document_id}")
            raise FileNotFoundError(f"Document with ID '{document_id}' does not exist in the vault.")
            
        raw_text = self.upload_service.get_raw_text(document_id)
        if not raw_text.strip():
            logger.warning(f"Extracted content is empty for document: {document_id}")
            raise ValueError(f"Document '{meta.filename}' contains no extractable text content to chunk.")
            
        # 2. Preprocess / Clean the text (preserving headings, structures, and collapsing spaces)
        cleaned_text = clean_text(
            raw_text,
            remove_non_printable=True,
            normalize_quotes=True,
            clean_bullets=True,
            collapse_spaces=True,
            max_newlines=2
        )
        
        # 3. Apply RecursiveCharacterChunker
        # We instantiate with our robust separators order
        chunker = RecursiveCharacterChunker(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=HIERARCHICAL_SEPARATORS
        )
        
        raw_splits = chunker.split_text(cleaned_text)
        if not raw_splits:
            logger.warning(f"No splits generated for document: {document_id}")
            return []
            
        total_chunks = len(raw_splits)
        processed_chunks: List[Dict[str, Any]] = []
        
        # Determine source file extension/type for chunk metadata
        _, ext = os.path.splitext(meta.filename.lower())
        source_type = ext.lstrip(".") if ext else "unknown"
        
        # 4. Build enriched metadata and calculate tokens for each chunk
        for idx, split_info in enumerate(raw_splits):
            chunk_text = split_info.get("text", "")
            
            # Avoid processing extremely small noise chunks
            if len(chunk_text.strip()) < MIN_CHUNK_CHARACTERS:
                logger.debug(f"Skipping tiny chunk index {idx} in document {document_id}")
                continue
                
            chunk_id = f"{document_id}_c{idx}"
            
            # Smart page tracking: Find if there's any '[Page X]' indicator prior to or inside this chunk text
            page_number = 1
            # Search in the substring of cleaned_text up to this chunk's location
            char_start = split_info.get("char_start", 0)
            prefix_text = cleaned_text[:char_start + len(chunk_text)]
            
            page_matches = re.findall(r"\[Page (\d+)\]", prefix_text)
            if page_matches:
                page_number = int(page_matches[-1])  # Select the most recent page index
                
            # Compute token metrics using cl100k_base or estimate fallback
            token_count = TokenCounter.count_tokens(chunk_text)
            
            chunk_entry = {
                "chunk_id": chunk_id,
                "document_id": document_id,
                "chunk_number": idx + 1,
                "page": page_number,
                "characters": len(chunk_text),
                "tokens": token_count,
                "text": chunk_text,
                "metadata": {
                    "document_id": document_id,
                    "document_name": meta.filename,
                    "chunk_id": chunk_id,
                    "chunk_number": idx + 1,
                    "total_chunks": total_chunks,
                    "page_number": page_number,
                    "source_type": source_type,
                    "character_count": len(chunk_text),
                    "estimated_token_count": token_count,
                    "created_timestamp": time.time()
                }
            }
            processed_chunks.append(chunk_entry)
            
        # 5. Save generated chunks to a JSON file alongside document uploads
        chunks_file_path = os.path.join(self.upload_dir, f"{document_id}_chunks.json")
        try:
            with open(chunks_file_path, "w", encoding="utf-8") as f:
                json.dump(processed_chunks, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Failed to persist chunks to disk for document {document_id}: {e}")
            raise RuntimeError(f"Database write error while saving chunks: {str(e)}")
            
        processing_time = time.time() - start_time
        logger.info(f"Successfully chunked document '{meta.filename}'. Created {len(processed_chunks)} chunks in {processing_time:.3f}s")
        return processed_chunks

    def get_chunks(self, document_id: str) -> List[Dict[str, Any]]:
        """Loads and returns all generated chunks for a given document from disk storage."""
        chunks_file_path = os.path.join(self.upload_dir, f"{document_id}_chunks.json")
        if not os.path.exists(chunks_file_path):
            logger.info(f"Chunks do not exist on disk yet for {document_id}. Triggering initial run with default settings...")
            # Automatically generate them with defaults for a seamless developer experience
            return self.generate_chunks(document_id)
            
        try:
            with open(chunks_file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load chunks from disk at {chunks_file_path}: {e}")
            return []

    def delete_chunks(self, document_id: str) -> bool:
        """Deletes persistent chunks file for a document from storage."""
        chunks_file_path = os.path.join(self.upload_dir, f"{document_id}_chunks.json")
        if os.path.exists(chunks_file_path):
            try:
                os.remove(chunks_file_path)
                logger.info(f"Removed chunks JSON file: {chunks_file_path}")
                return True
            except Exception as e:
                logger.error(f"Failed to delete chunks file {chunks_file_path}: {e}")
                return False
        return False
