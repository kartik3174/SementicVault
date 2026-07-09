"""
Configuration parameters for the text cleaning and intelligent chunking pipeline.
"""

# Default chunking parameters
DEFAULT_CHUNK_SIZE = 500
DEFAULT_CHUNK_OVERLAP = 100

# Recommended separators in hierarchical order for RecursiveCharacterChunker
# Maintains maximum semantic coherence (Paragraph -> Newline -> Sentence -> Space -> Character)
HIERARCHICAL_SEPARATORS = [
    "\n\n",   # Paragraphs
    "\n",     # Line breaks
    ". ",     # Sentences (standard English trailing dot)
    " ",      # Words
    ""        # Characters (hard split fallback)
]

# Validation thresholds
MIN_CHUNK_CHARACTERS = 5
MAX_CHUNK_CHARACTERS = 10000
