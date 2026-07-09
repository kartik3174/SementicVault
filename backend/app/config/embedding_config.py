"""
Configuration module defining parameters for the Embedding Generation Pipeline.
"""
import os

# Default embedding model name (SentenceTransformer)
DEFAULT_MODEL_NAME = "all-MiniLM-L6-v2"

# Output dimension for the all-MiniLM-L6-v2 model
EMBEDDING_DIMENSION = 384

# Batch size for embedding generation
BATCH_SIZE = 32

# Max sequence length supported by the model (all-MiniLM-L6-v2 supports 256 tokens)
MAX_SEQUENCE_LENGTH = 256

# Cache directory for sentence transformers
CACHE_DIR = os.environ.get("SENTENCE_TRANSFORMERS_HOME", "/tmp/sentence_transformers")
os.makedirs(CACHE_DIR, exist_ok=True)

# Device configuration: use GPU if available, else fallback to CPU
DEVICE = os.environ.get("EMBEDDING_DEVICE", "cpu")  # default to cpu for predictable local execution
