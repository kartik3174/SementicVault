"""
Document validation utilities for checking file format, size, and content integrity.
"""
import os
import logging
from typing import Union
from fastapi import UploadFile
from app.config.allowed_extensions import ALLOWED_EXTENSIONS, MAX_FILE_SIZE

logger = logging.getLogger("SemanticVault.Validator")

class FileValidationError(Exception):
    """Custom exception raised when file validation fails."""
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message

def validate_file(file: UploadFile) -> bool:
    """
    Validates an uploaded file's extension, emptiness, and file size.
    
    Args:
        file (UploadFile): The FastAPI UploadFile object to validate.
        
    Returns:
        bool: True if the file is valid.
        
    Raises:
        FileValidationError: If validation fails.
    """
    filename = file.filename or ""
    _, ext = os.path.splitext(filename.lower())
    
    # 1. Validate file extension
    if not ext or ext not in ALLOWED_EXTENSIONS:
        msg = f"Unsupported file format '{ext}'. Supported extensions are: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        logger.warning(f"File validation failed for '{filename}': {msg}")
        raise FileValidationError(msg)
    
    # 2. Check for empty files
    # We read a small chunk to check if it's empty, and check size via seek/tell if possible
    try:
        file.file.seek(0, os.SEEK_END)
        size = file.file.tell()
        file.file.seek(0)  # Reset pointer to beginning
    except Exception as e:
        # Fallback if tell is not supported
        logger.debug(f"Could not check file size via seek: {e}")
        size = -1
        
    if size == 0:
        msg = "Uploaded file is empty (0 bytes)."
        logger.warning(f"File validation failed for '{filename}': {msg}")
        raise FileValidationError(msg)
        
    if size > MAX_FILE_SIZE:
        msg = f"File size exceeds the limit of {MAX_FILE_SIZE / (1024 * 1024):.1f} MB. Actual size: {size / (1024 * 1024):.1f} MB"
        logger.warning(f"File validation failed for '{filename}': {msg}")
        raise FileValidationError(msg)
        
    logger.info(f"File '{filename}' passed validation checks (Size: {size} bytes, Format: '{ext}')")
    return True

def validate_local_file_path(file_path: str) -> bool:
    """
    Validates that a local file path exists, is a file, is not empty, and matches allowed extensions.
    
    Args:
        file_path (str): Path to the file.
        
    Returns:
        bool: True if valid.
        
    Raises:
        FileValidationError: If validation fails.
    """
    if not os.path.exists(file_path):
        raise FileValidationError(f"File not found: {file_path}")
        
    if not os.path.isfile(file_path):
        raise FileValidationError(f"Path is not a regular file: {file_path}")
        
    size = os.path.getsize(file_path)
    if size == 0:
        raise FileValidationError("File is empty.")
        
    if size > MAX_FILE_SIZE:
        raise FileValidationError(f"File exceeds maximum allowed size of {MAX_FILE_SIZE / (1024 * 1024):.1f} MB.")
        
    _, ext = os.path.splitext(file_path.lower())
    if ext not in ALLOWED_EXTENSIONS:
        raise FileValidationError(f"Unsupported file format '{ext}'.")
        
    return True
