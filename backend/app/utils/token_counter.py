"""
Token counter helper utilizing tiktoken for precise character-to-token ratio computations.
"""
import logging
from typing import Optional

logger = logging.getLogger("SemanticVault.TokenCounter")

class TokenCounter:
    """Estimates and computes token counts using tiktoken with fallback capabilities."""
    
    _encoding = None
    _failed_init = False
    
    @classmethod
    def _init_encoding(cls) -> None:
        """Lazily initialize the cl100k_base tokenizer encoding."""
        if cls._encoding is None and not cls._failed_init:
            try:
                import tiktoken
                # cl100k_base is the standard encoding for GPT-3.5-turbo, GPT-4, and text-embedding-ada-002/003
                cls._encoding = tiktoken.get_encoding("cl100k_base")
                logger.info("Successfully loaded tiktoken cl100k_base encoding")
            except Exception as e:
                logger.warning(f"Failed to load tiktoken. Using robust estimation fallback instead: {e}")
                cls._failed_init = True

    @classmethod
    def count_tokens(cls, text: str) -> int:
        """
        Calculates the exact token count if tiktoken is loaded, else uses a highly accurate 
        standard English rule of thumb (approx. 4 characters per token / 1.3 tokens per word).
        """
        if not text:
            return 0
            
        cls._init_encoding()
        
        if cls._encoding is not None:
            try:
                return len(cls._encoding.encode(text))
            except Exception as e:
                logger.debug(f"tiktoken encoding error: {e}. Falling back to estimate.")
                
        # Fallback estimation:
        # Standard NLP rule of thumb: 1 token ~ 4 characters in English
        # Or 0.75 words per token -> 1.33 tokens per word
        words = text.split()
        if not words:
            return max(1, len(text) // 4)
            
        estimated_by_chars = max(1, len(text) // 4)
        estimated_by_words = int(len(words) * 1.33)
        
        # Average both estimations for a balanced result
        return (estimated_by_chars + estimated_by_words) // 2
