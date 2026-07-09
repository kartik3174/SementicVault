"""
Embedding utility helper methods including vector mathematics and metrics.
"""
import math
import logging
from typing import List

logger = logging.getLogger("SemanticVault.EmbeddingUtils")

def compute_l2_norm(vector: List[float]) -> float:
    """
    Computes the L2 (Euclidean) norm/magnitude of a vector.
    """
    try:
        sum_squares = sum(x * x for x in vector)
        return math.sqrt(sum_squares)
    except Exception as e:
        logger.error(f"Error computing L2 norm: {e}")
        return 0.0

def normalize_l2(vector: List[float]) -> List[float]:
    """
    Normalizes a vector to unit length (L2 norm = 1.0).
    
    This is useful because when vectors are normalized to unit length, 
    their dot product is mathematically equivalent to their cosine similarity.
    """
    norm = compute_l2_norm(vector)
    if norm == 0.0:
        return vector
    return [x / norm for x in vector]

def compute_centroid(vectors: List[List[float]]) -> List[float]:
    """
    Computes the mean/centroid vector of a list of high-dimensional vectors.
    """
    if not vectors:
        return []
        
    dim = len(vectors[0])
    centroid = [0.0] * dim
    
    for v in vectors:
        if len(v) != dim:
            raise ValueError("All vectors must have identical dimensions to compute a centroid.")
        for idx in range(dim):
            centroid[idx] += v[idx]
            
    num_vectors = len(vectors)
    return [x / num_vectors for x in centroid]
