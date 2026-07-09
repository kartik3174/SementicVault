"""
Configuration module defining allowed file extensions, mime types, and size constraints.
"""

# Allowed file extensions for document ingestion
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md", ".markdown"}

# Allowed mime types mapped to extensions for validation
ALLOWED_MIME_TYPES = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "text/plain": ".txt",
    "text/markdown": ".md",
}

# Maximum file size allowed in bytes (10 MB default)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
