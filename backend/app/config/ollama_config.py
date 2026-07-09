"""
Configuration settings for the local Ollama LLM connection and inference.
"""
import os

# Ollama Endpoint Configuration
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")

# Default Models
DEFAULT_LLM_MODEL = os.environ.get("DEFAULT_LLM_MODEL", "llama3.2")
AVAILABLE_MODELS = [
    "llama3.2",
    "llama3",
    "mistral",
    "phi3",
    "gemma2"
]

# Inference Default Hyperparameters
DEFAULT_TEMPERATURE = float(os.environ.get("DEFAULT_TEMPERATURE", 0.2))
DEFAULT_TOP_P = float(os.environ.get("DEFAULT_TOP_P", 0.9))
DEFAULT_MAX_TOKENS = int(os.environ.get("DEFAULT_MAX_TOKENS", 1024))
OLLAMA_TIMEOUT_SEC = int(os.environ.get("OLLAMA_TIMEOUT_SEC", 30))
