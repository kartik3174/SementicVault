"""
Configuration settings for the Semantic Retrieval layer.
"""
import os

# Default Retrieval Parameters
DEFAULT_TOP_K = int(os.environ.get("DEFAULT_TOP_K", 5))
DEFAULT_SIMILARITY_THRESHOLD = float(os.environ.get("DEFAULT_SIMILARITY_THRESHOLD", 0.0)) # 0.0 means no threshold unless configured
MAX_CHUNKS = int(os.environ.get("MAX_CHUNKS", 15))
MAX_CONTEXT_LENGTH = int(os.environ.get("MAX_CONTEXT_LENGTH", 8000)) # Characters limit
MAX_TOKENS = int(os.environ.get("MAX_TOKENS", 4000)) # Approximated token limit

# Query preprocessing defaults
MIN_QUERY_LENGTH = 3
MAX_QUERY_LENGTH = 1000
LOWERCASE_QUERY = True
REMOVE_UNWANTED_SYMBOLS = True
