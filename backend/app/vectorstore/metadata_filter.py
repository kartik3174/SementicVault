"""
Helper utilities for building dynamic and structurally sound metadata filters for ChromaDB queries.
"""
import logging
from typing import Optional, Dict, Any, List

logger = logging.getLogger("SemanticVault.MetadataFilter")

def build_chroma_filter(
    document_id: Optional[str] = None,
    filename: Optional[str] = None,
    page_number: Optional[int] = None,
    chunk_number: Optional[int] = None
) -> Optional[Dict[str, Any]]:
    """
    Constructs a ChromaDB-compliant logical metadata filter dictionary.
    
    If multiple conditions are provided, it dynamically aggregates them under 
    Chroma's standard logical '$and' conjunction format.
    
    Chroma Filter Syntax:
        - Single field: {"field": value}
        - Multiple fields: {"$and": [{"field1": val1}, {"field2": val2}]}
    """
    conditions: List[Dict[str, Any]] = []
    
    if document_id:
        conditions.append({"document_id": str(document_id)})
        
    if filename:
        conditions.append({"document_name": str(filename)}) # match chunks.json document_name
        
    if page_number is not None:
        conditions.append({"page_number": int(page_number)})
        
    if chunk_number is not None:
        conditions.append({"chunk_number": int(chunk_number)})
        
    if not conditions:
        return None
        
    if len(conditions) == 1:
        return conditions[0]
        
    return {"$and": conditions}
