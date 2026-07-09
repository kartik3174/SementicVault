"""
Service orchestrating high-level vector database tasks including document indexing, deleting, and similarity searches.
"""
import time
import logging
from typing import List, Dict, Any, Optional
from app.embeddings.embedding_service import EmbeddingService
from app.services.chunk_service import ChunkService
from app.embeddings.embedding_model import EmbeddingModelManager
from app.vectorstore.vector_repository import VectorRepository
from app.vectorstore.metadata_filter import build_chroma_filter
from app.vectorstore.search_utils import convert_distance_to_score
from app.models.vector import VectorSearchResult, VectorSearchResponse
from app.config.vector_config import DEFAULT_COLLECTION_NAME, EMBEDDING_DIMENSION

logger = logging.getLogger("SemanticVault.VectorService")

class VectorService:
    """Provides high-level actions for vector operations, hiding lower-level implementation details."""
    
    def __init__(self, upload_dir: Optional[str] = None):
        self.embedding_service = EmbeddingService(upload_dir)
        self.chunk_service = ChunkService(upload_dir)
        self.repository = VectorRepository()
        self.model_manager = EmbeddingModelManager()

    def index_document(self, document_id: str, collection_name: str = DEFAULT_COLLECTION_NAME) -> int:
        """
        Loads Phase 5 embeddings and Phase 4 chunks, merges them, 
        and indexes the complete set in the local ChromaDB vector store.
        
        If embeddings do not exist, they are generated automatically.
        """
        logger.info(f"Indexing request for document {document_id}")
        start_time = time.time()
        
        # 1. Fetch chunks first to verify document and extract raw text
        chunks = self.chunk_service.get_chunks(document_id)
        if not chunks:
            raise FileNotFoundError(f"No text chunks found for document {document_id}. Run chunking first.")
            
        # 2. Fetch or compute embeddings
        embeddings = self.embedding_service.get_by_document_id(document_id)
        if not embeddings:
            logger.info(f"No existing embeddings found for {document_id}. Automatically generating them now...")
            embeddings = self.embedding_service.generate_for_chunks(document_id, chunks)
            
        if not embeddings:
            raise RuntimeError(f"Embedding generation returned empty results for document {document_id}")
            
        # 3. Create maps for matching embeddings to text chunks
        chunk_map = {c["chunk_id"]: c for c in chunks}
        
        ids: List[str] = []
        vectors: List[List[float]] = []
        metadatas: List[Dict[str, Any]] = []
        documents: List[str] = []
        
        for idx, emb in enumerate(embeddings):
            chunk_id = emb.chunk_id
            chunk_data = chunk_map.get(chunk_id)
            
            if not chunk_data:
                logger.warning(f"Could not find matching text chunk for embedding {chunk_id}. Skipping.")
                continue
                
            text = chunk_data.get("text", "")
            chunk_meta = chunk_data.get("metadata", {})
            
            # Validation checks
            if not text.strip():
                logger.warning(f"Empty chunk text for {chunk_id}. Skipping.")
                continue
                
            if len(emb.vector) != EMBEDDING_DIMENSION:
                logger.error(f"Vector dimension mismatch for {chunk_id}. Expected {EMBEDDING_DIMENSION}, got {len(emb.vector)}")
                continue
                
            # Prepare metadata according to Phase 6 requirements:
            # Document ID, Chunk ID, Filename, Page Number, Chunk Number, Timestamp
            meta_payload = {
                "document_id": str(document_id),
                "chunk_id": str(chunk_id),
                "document_name": str(chunk_meta.get("document_name", "unknown")),
                "page_number": int(chunk_meta.get("page_number", 1)),
                "chunk_number": int(chunk_meta.get("chunk_number", idx + 1)),
                "timestamp": float(chunk_meta.get("created_timestamp", time.time()))
            }
            
            ids.append(chunk_id)
            vectors.append(emb.vector)
            metadatas.append(meta_payload)
            documents.append(text)
            
        if not ids:
            raise ValueError(f"No valid vector records could be prepared for document {document_id}")
            
        # 4. Save into ChromaDB via Repository
        inserted = self.repository.upsert_records(
            ids=ids,
            embeddings=vectors,
            metadatas=metadatas,
            documents=documents,
            collection_name=collection_name
        )
        
        duration = time.time() - start_time
        logger.info(f"Indexed {inserted} chunks for document {document_id} in {duration:.3f}s")
        return inserted

    def search_similarity(
        self,
        query_text: str,
        top_k: int = 5,
        document_id: Optional[str] = None,
        filename: Optional[str] = None,
        page_number: Optional[int] = None,
        chunk_number: Optional[int] = None,
        collection_name: str = DEFAULT_COLLECTION_NAME
    ) -> List[VectorSearchResult]:
        """
        Performs semantic similarity search.
        
        1. Encodes the search query using the singleton SentenceTransformer.
        2. Applies dynamic metadata filters.
        3. Retrieves matching nodes from ChromaDB.
        4. Normalizes distance scores to similarity values and constructs matching domain structures.
        """
        logger.info(f"Executing semantic search for query: '{query_text}' with top_k={top_k}")
        
        if not query_text.strip():
            return []
            
        # 1. Encode query
        query_vector = self.model_manager.encode([query_text], batch_size=1)[0]
        
        # 2. Build metadata filters
        where_filter = build_chroma_filter(
            document_id=document_id,
            filename=filename,
            page_number=page_number,
            chunk_number=chunk_number
        )
        
        # 3. Query collection
        raw_results = self.repository.query_nearest_neighbors(
            query_embeddings=[query_vector],
            top_k=top_k,
            where_filter=where_filter,
            collection_name=collection_name
        )
        
        # 4. Parse response list of lists safely
        results: List[VectorSearchResult] = []
        
        if not raw_results or "ids" not in raw_results or not raw_results["ids"]:
            logger.info("Vector query returned no matches.")
            return []
            
        # Extract lists
        match_ids = raw_results["ids"][0]
        match_distances = raw_results["distances"][0]
        match_metadatas = raw_results["metadatas"][0]
        match_documents = raw_results["documents"][0]
        
        for idx in range(len(match_ids)):
            cid = match_ids[idx]
            dist = match_distances[idx]
            meta = match_metadatas[idx]
            text = match_documents[idx]
            
            # Map raw distance to 0.0 - 1.0 similarity score
            score = convert_distance_to_score(dist)
            
            result_item = VectorSearchResult(
                chunk_id=cid,
                document_id=meta.get("document_id", "unknown"),
                text=text,
                score=score,
                metadata=meta
            )
            results.append(result_item)
            
        # Sort results by similarity score descending
        results.sort(key=lambda r: r.score, reverse=True)
        return results

    def delete_document_vectors(self, document_id: str, collection_name: str = DEFAULT_COLLECTION_NAME) -> bool:
        """
        Removes all indexed vectors associated with a specific document ID.
        """
        filter_dict = {"document_id": document_id}
        return self.repository.delete_by_filter(filter_dict, collection_name)

    def delete_collection(self, collection_name: str = DEFAULT_COLLECTION_NAME) -> bool:
        """
        Completely resets and drops the entire collection.
        """
        return self.collection_manager.delete_collection(collection_name)
