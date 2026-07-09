"""
E2E Retrieval-Augmented Generation (RAG) Orchestrator connecting all components.
"""
import time
import logging
from typing import List, Optional, Dict, Any
from app.retrieval.retrieval_pipeline import RetrievalPipeline
from app.rag.prompt_builder import PromptBuilder
from app.rag.context_formatter import ContextFormatter
from app.rag.citation_formatter import CitationFormatter
from app.rag.response_parser import ResponseParser
from app.ollama.ollama_client import OllamaClient
from app.models.chat import ChatRequest, ChatResponse, CitationItem
from app.models.conversation import ChatMessageRecord

logger = logging.getLogger("SemanticVault.RAGPipeline")

class RAGPipeline:
    """Full-stack RAG pipeline: retrieves matching segments, builds prompt, prompts LLM, parses response."""

    def __init__(self):
        self.retrieval_pipeline = RetrievalPipeline()
        self.prompt_builder = PromptBuilder()
        self.ollama_client = OllamaClient()

    def run_inference(
        self,
        request: ChatRequest,
        chat_history: List[ChatMessageRecord] = None
    ) -> ChatResponse:
        """
        Executes standard synchronous (non-streaming) grounding inference.
        """
        start_time = time.time()
        
        # 1. Retrieve most relevant vector chunks
        retrieval_response = self.retrieval_pipeline.execute_retrieval(
            query=request.message,
            top_k=request.top_k_chunks or 4,
            similarity_threshold=request.similarity_threshold or 0.0
        )
        
        chunks = retrieval_response.results
        
        # 2. Convert retrieved segments into clean context string
        context_str = ContextFormatter.format_chunks(chunks)
        
        # 3. Create model-compliant citations list
        citations = CitationFormatter.map_to_citations(chunks)
        
        # 4. Synthesize complete final prompt (with optional history integration)
        full_prompt = self.prompt_builder.build_inference_payload(
            question=request.message,
            retrieved_context=context_str,
            history=chat_history
        )
        
        # 5. Connect to local LLM for completion
        logger.info(f"Invoking local completion on model '{request.model or 'llama3.2'}'...")
        options = {
            "temperature": request.temperature if request.temperature is not None else 0.2,
            "top_p": request.top_p if request.top_p is not None else 0.9
        }
        
        ollama_response = self.ollama_client.generate_completion(
            prompt=full_prompt,
            model=request.model or "llama3.2",
            options=options
        )
        
        raw_answer = ollama_response.get("response", "")
        tokens_count = ollama_response.get("eval_count", 0)
        
        # 6. Post-process response (strip formatting, handle standard errors)
        cleaned_answer = ResponseParser.post_process_answer(raw_answer)
        
        latency = time.time() - start_time
        logger.info(f"Grounding inference complete. Latency: {latency:.4f}s")
        
        return ChatResponse(
            conversation_id=request.conversation_id or "default",
            answer=cleaned_answer,
            citations=citations,
            latency_sec=round(latency, 4),
            tokens_generated=tokens_count
        )
