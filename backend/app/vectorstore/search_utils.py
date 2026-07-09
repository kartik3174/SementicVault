"""
Utility functions for vector search processing, distance-to-similarity mappings, and results formatting.
"""
import logging
from typing import Dict, Any, List
from app.config.vector_config import SIMILARITY_METRIC

logger = logging.getLogger("SemanticVault.SearchUtils")

def convert_distance_to_score(distance: float, metric: str = SIMILARITY_METRIC) -> float:
    """
    Translates raw vector distance metrics returned by ChromaDB into a standardized 
    similarity score ranging from 0.0 to 1.0 (where 1.0 means perfectly identical orientation/match).
    
    Chroma Metrics:
        - Cosine Distance: distance = 1.0 - cosine_similarity.
          Therefore: similarity = 1.0 - distance.
        - L2 (Euclidean) Distance: distance = sum((v1_i - v2_i)^2).
          Therefore: similarity = 1.0 / (1.0 + distance).
        - IP (Inner Product): distance = 1.0 - inner_product (for normalized vectors).
          Therefore: similarity = 1.0 - distance.
    """
    try:
        if metric == "cosine" or metric == "ip":
            # For cosine space, distance is (1.0 - similarity)
            score = 1.0 - distance
            # Clamp the score to 0.0 - 1.0 range safely
            return max(0.0, min(1.0, score))
        elif metric == "l2":
            # Map standard Euclidean distance onto a non-linear 0.0 to 1.0 scale
            return 1.0 / (1.0 + distance)
        else:
            # Fallback direct inverse
            return max(0.0, min(1.0, 1.0 - distance))
    except Exception as e:
        logger.error(f"Error converting distance {distance} to score: {e}")
        return 0.0
