"""
Configuration settings for RAG prompt templates and strict matching parameters.
"""
import os

# Prompt parameters
STRICT_CONTEXT_COMPLIANCE = True

# Fallback response when no answers are found in the documents
UNKNOWN_ANSWER_FALLBACK = "I couldn't find this information in the uploaded documents."
