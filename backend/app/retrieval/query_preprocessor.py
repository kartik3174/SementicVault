"""
Query Preprocessor module handling whitespace trimming, space normalization,
lowercasing, symbol stripping, quoted phrase preservation, and query validation.
"""
import re
import logging
from app.config.retrieval_config import MIN_QUERY_LENGTH, MAX_QUERY_LENGTH

logger = logging.getLogger("SemanticVault.QueryPreprocessor")

class QueryPreprocessor:
    """Preprocesses and validates user query strings to optimize embedding generation."""

    def __init__(self, lowercase: bool = True, remove_symbols: bool = True):
        self.lowercase = lowercase
        self.remove_symbols = remove_symbols

    def clean_query(self, query: str) -> str:
        """
        Cleans raw query text based on config settings, preserving double-quoted phrases.
        """
        if not query:
            return ""

        # 1. Trim leading and trailing whitespaces
        text = query.strip()

        # 2. Extract quoted phrases to preserve them from symbol stripping
        quoted_phrases = re.findall(r'"([^"]*)"', text)
        
        # Replace quoted sections temporarily with placeholders
        placeholder_map = {}
        for idx, phrase in enumerate(quoted_phrases):
            placeholder = f"__QUOTED_PHRASE_{idx}__"
            text = text.replace(f'"{phrase}"', placeholder)
            placeholder_map[placeholder] = phrase

        # 3. Handle lowercasing (if configured)
        if self.lowercase:
            text = text.lower()

        # 4. Remove unwanted symbols (if configured)
        if self.remove_symbols:
            # Keep alphanumeric characters, spaces, and our custom placeholders
            text = re.sub(r'[^\w\s_]', ' ', text)

        # 5. Restore quoted phrases (with quotes)
        for placeholder, phrase in placeholder_map.items():
            restored = f'"{phrase}"'
            if self.lowercase:
                restored = restored.lower()
            text = text.replace(placeholder.lower() if self.lowercase else placeholder, restored)

        # 6. Normalize intermediate spaces (multiple spaces to a single space)
        text = re.sub(r'\s+', ' ', text).strip()

        return text

    def validate_query(self, query: str) -> bool:
        """
        Validates query length against system parameters.
        Returns True if valid, raises ValueError if empty or out of bounds.
        """
        if not query or not query.strip():
            raise ValueError("Query cannot be empty or contain only whitespace.")
        
        cleaned = self.clean_query(query)
        length = len(cleaned)

        if length < MIN_QUERY_LENGTH:
            raise ValueError(f"Cleaned query length ({length}) is shorter than the minimum threshold of {MIN_QUERY_LENGTH} characters.")
        if length > MAX_QUERY_LENGTH:
            raise ValueError(f"Cleaned query length ({length}) exceeds the maximum limit of {MAX_QUERY_LENGTH} characters.")

        return True
