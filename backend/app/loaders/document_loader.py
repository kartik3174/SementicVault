"""
Unified document loader orchestrator and dispatcher.
"""
import os
import logging
from typing import Tuple
from app.loaders.text_loader import TextLoader
from app.loaders.markdown_loader import MarkdownLoader
from app.loaders.pdf_loader import PDFLoader
from app.loaders.docx_loader import DocxLoader

logger = logging.getLogger("SemanticVault.Loader.Dispatcher")

class DocumentLoader:
    """Unified manager that dispatches to specific sub-loaders based on file extensions."""
    
    @staticmethod
    def load(file_path: str) -> Tuple[str, int]:
        """
        Unified dispatch method.
        
        Args:
            file_path (str): Path to the target document.
            
        Returns:
            Tuple[str, int]: (extracted_raw_text, page_count)
            
        Raises:
            ValueError: If the file extension is unsupported or loader execution fails.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Document file does not exist at: {file_path}")
            
        _, ext = os.path.splitext(file_path.lower())
        
        try:
            if ext in [".txt", ".text"]:
                loader = TextLoader(file_path)
                return loader.load()
            elif ext in [".md", ".markdown"]:
                loader = MarkdownLoader(file_path)
                return loader.load()
            elif ext == ".pdf":
                loader = PDFLoader(file_path)
                return loader.load()
            elif ext == ".docx":
                loader = DocxLoader(file_path)
                return loader.load()
            else:
                # Fallback: attempt to read as plain text if it lacks extension but is readable
                logger.warning(f"Unknown extension '{ext}' for file {file_path}. Falling back to plain TextLoader.")
                loader = TextLoader(file_path)
                return loader.load()
                
        except Exception as e:
            logger.error(f"Error loading document {file_path} using extension handler for '{ext}': {e}", exc_info=True)
            raise ValueError(f"Ingestion extraction failed for file '{os.path.basename(file_path)}': {str(e)}")
