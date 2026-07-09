"""
Cleans, parses, and formats assistant output strings.
"""
import re

class ResponseParser:
    """Post-processes raw LLM text outputs for production standards."""

    @staticmethod
    def post_process_answer(answer: str) -> str:
        """
        Cleans up common formatting glitches like multiple empty lines or unclosed tags.
        """
        if not answer:
            return ""

        # Remove leading/trailing whitespaces and standardise spacing
        text = answer.strip()
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text
