"""
Loader module for PDF (.pdf) files using PyMuPDF (fitz).
"""
import logging
from typing import Tuple
import fitz  # PyMuPDF

logger = logging.getLogger("SemanticVault.Loader.PDF")

class PDFLoader:
    """Loader for PDF documents utilizing PyMuPDF for efficient programmatic text extraction."""
    
    def __init__(self, file_path: str):
        self.file_path = file_path

    def load(self) -> Tuple[str, int]:
        """
        Extracts raw text page-by-page from a PDF document.
        
        Returns:
            Tuple[str, int]: A tuple containing the continuous text with page boundary indicators 
                             and the total number of pages.
        """
        logger.info(f"Extracting text from PDF: {self.file_path}")
        try:
            doc = fitz.open(self.file_path)
            page_count = len(doc)
            
            if page_count == 0:
                logger.warning(f"PDF file has 0 pages: {self.file_path}")
                return "", 0
                
            full_text = []
            for i, page in enumerate(doc):
                text = page.get_text()
                # Use page marker tags to allow downstream citations and page-specific chunk tagging
                full_text.append(f"[Page {i + 1}]\n{text}")
                
            combined_text = "\n\n".join(full_text)
            logger.info(f"Successfully loaded PDF. Pages: {page_count}, Characters: {len(combined_text)}")
            return combined_text, page_count
            
        except Exception as e:
            logger.error(f"Failed to load PDF {self.file_path}: {e}", exc_info=True)
            raise RuntimeError(f"PyMuPDF failed to process PDF file: {str(e)}")
