"""
Server-Sent Events (SSE) stream formatting handler for token generation over HTTP.
"""
import json
from typing import Any, Dict

class SSEStreamHandler:
    """Standardizes dictionary payloads into Server-Sent Events text-stream lines."""

    @staticmethod
    def format_event(data: Dict[str, Any], event_name: str = "token") -> str:
        """
        Renders data dict into 'event: token\\ndata: {...}\\n\\n' format.
        """
        payload = json.dumps(data)
        return f"event: {event_name}\ndata: {payload}\n\n"

    @staticmethod
    def format_ping() -> str:
        """
        Keeps connections active in cloud load balancers.
        """
        return ": ping\n\n"
