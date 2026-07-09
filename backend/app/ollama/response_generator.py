"""
Coordinates streaming chunks and post-generations, linking citations and metadata.
"""
import time
import logging
from typing import Generator, List, Dict, Any, Optional
from app.ollama.ollama_client import OllamaClient
from app.ollama.stream_handler import SSEStreamHandler
from app.models.chat import CitationItem

logger = logging.getLogger("SemanticVault.ResponseGenerator")

class ResponseGenerator:
    """Combines OllamaClient, PromptBuilder, and SSEStreamHandler to produce structured streams."""

    def __init__(self):
        self.client = OllamaClient()

    def generate_streaming_response(
        self,
        prompt: str,
        citations: List[CitationItem],
        model: str,
        options: Optional[Dict[str, Any]] = None
    ) -> Generator[str, None, None]:
        """
        Runs streaming generation from Ollama, sending SSE chunks containing text,
        then terminates the stream with a final packet carrying citations and performance metrics.
        """
        start_time = time.time()
        token_count = 0
        full_text = []

        # Yield starting signal
        yield SSEStreamHandler.format_event({"status": "started"}, event_name="system")

        try:
            # Consume Ollama stream
            for chunk in self.client.generate_stream(prompt=prompt, model=model, options=options):
                text_delta = chunk.get("response", "")
                if text_delta:
                    full_text.append(text_delta)
                    token_count += 1
                    
                    # Send token event
                    yield SSEStreamHandler.format_event({
                        "token": text_delta,
                        "cumulative_tokens": token_count
                    }, event_name="token")

                if chunk.get("done", False):
                    break

            # Process metrics
            latency = time.time() - start_time
            serialized_citations = [c.dict() for c in citations]

            # Send complete final metadata
            yield SSEStreamHandler.format_event({
                "done": True,
                "answer": "".join(full_text),
                "citations": serialized_citations,
                "latency_sec": round(latency, 4),
                "tokens_generated": token_count
            }, event_name="final")

        except Exception as e:
            logger.error(f"Failed to generate streaming response: {e}", exc_info=True)
            yield SSEStreamHandler.format_event({
                "error": f"LLM Inference Interruption: {str(e)}"
            }, event_name="error")
