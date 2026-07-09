"""
Loader module for plain text (.txt) files.
"""
import logging
from typing import Tuple

logger = logging.getLogger("SemanticVault.Loader.Text")

class TextLoader:
    """Loader for plain text (.txt) files."""
    
    def __init__(self, file_path: str):
        self.file_path = file_path

    def load(self) -> Tuple[str, int]:
        """
        Loads and reads the content of the plain text file.
        
        Returns:
            Tuple[str, int]: A tuple containing the extracted raw text and the page count (always 1).
        """
        logger.info(f"Loading plain text document from: {self.file_path}")
        try:
            # Try loading with standard UTF-8 encoding
            with open(self.file_path, "r", encoding="utf-8") as f:
                content = f.read()
                return content, 1
        except UnicodeDecodeError:
            logger.warning(f"UTF-8 decode failed for {self.file_path}, falling back to ISO-8859-1")
            # Fallback to latin-1 / ISO-8859-1 to avoid cracking binary/other text files
            with open(self.file_path, "r", encoding="iso-8859-1") as f:
                content = f.read()
                return content, 1
        except Exception as e:
            logger.error(f"Failed to read text file {self.file_path}: {e}")
            raise RuntimeError(f"Failed to read text file: {str(e)}")
