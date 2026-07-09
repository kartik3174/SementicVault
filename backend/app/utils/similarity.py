"""
Mathematical operations for computing similarity and distance metrics between high-dimensional dense vectors.
"""
import math
import logging
from typing import List

logger = logging.getLogger("SemanticVault.Similarity")

def dot_product(v1: List[float], v2: List[float]) -> float:
    """
    Computes the standard algebraic Dot Product (Inner Product) of two equal-length vectors.
    
    Formula:
        v1 . v2 = sum(v1_i * v2_i)
    """
    if len(v1) != len(v2):
        raise ValueError(f"Vector dimensions mismatch: {len(v1)} and {len(v2)}")
        
    return sum(x * y for x, y in zip(v1, v2))

def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """
    Computes the Cosine Similarity between two vectors.
    
    Formula:
        similarity = (v1 . v2) / (||v1|| * ||v2||)
        
    Returns:
        float: Cosine similarity score between -1.0 and 1.0 (where 1.0 means identical orientation).
    """
    if len(v1) != len(v2):
        raise ValueError(f"Vector dimensions mismatch: {len(v1)} and {len(v2)}")
        
    numerator = dot_product(v1, v2)
    
    norm1 = math.sqrt(sum(x * x for x in v1))
    norm2 = math.sqrt(sum(y * y for y in v2))
    
    if norm1 == 0.0 or norm2 == 0.0:
        return 0.0
        
    return numerator / (norm1 * norm2)

def euclidean_distance(v1: List[float], v2: List[float]) -> float:
    """
    Computes the Euclidean Distance (L2 Distance) between two vectors in space.
    
    Formula:
        d(v1, v2) = sqrt(sum((v1_i - v2_i)^2))
        
    Returns:
        float: Standard geometric straight-line distance (lower is more similar).
    """
    if len(v1) != len(v2):
        raise ValueError(f"Vector dimensions mismatch: {len(v1)} and {len(v2)}")
        
    sum_squares = sum((x - y) ** 2 for x, y in zip(v1, v2))
    return math.sqrt(sum_squares)
