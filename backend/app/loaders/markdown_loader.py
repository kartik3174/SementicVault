"""
Loader module for Markdown (.md, .markdown) files.
"""
import logging
from typing import Tuple
from app.loaders.text_loader import TextLoader

logger = logging.getLogger("SemanticVault.Loader.Markdown")

class MarkdownLoader:
    """Loader for Markdown documents."""
    
    def __init__(self, file_path: str):
        self.file_path = file_path

    def load(self) -> Tuple[str, int]:
        """
        Loads and reads the content of the Markdown file.
        
        Returns:
            Tuple[str, int]: A tuple containing the extracted markdown raw text and the page count (always 1).
        """
        logger.info(f"Loading Markdown document from: {self.file_path}")
        # Re-use TextLoader's robust encoding fallbacks for reading
        text_loader = TextLoader(self.file_path)
        content, pages = text_loader.load()
        return content, pages
