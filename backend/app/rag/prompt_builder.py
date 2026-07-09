"""
Compiles structured context, chat history, and system instructions into standard Ollama prompts.
"""
from typing import List, Dict, Any
from app.rag.prompt_templates import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE
from app.models.conversation import ChatMessageRecord

class PromptBuilder:
    """Manages system instruction, chat history aggregation, and prompt formatting for local inference."""

    def __init__(self, system_prompt: str = SYSTEM_PROMPT):
        self.system_prompt = system_prompt

    def build_history_context(self, history: List[ChatMessageRecord]) -> str:
        """
        Formats previous conversation rounds to preserve conversational flow.
        """
        formatted_history = []
        for msg in history:
            role_label = "User" if msg.role == "user" else "Assistant"
            formatted_history.append(f"{role_label}: {msg.content}")
        return "\n".join(formatted_history)

    def build_inference_payload(
        self,
        question: str,
        retrieved_context: str,
        history: List[ChatMessageRecord] = None
    ) -> str:
        """
        Assembles context, history, and user input into a single formatted string prompt
        suitable for simple Ollama completion.
        """
        user_part = USER_PROMPT_TEMPLATE.format(
            retrieved_context=retrieved_context,
            question=question
        )

        full_prompt_lines = [
            f"System: {self.system_prompt}\n",
        ]

        if history:
            history_text = self.build_history_context(history)
            full_prompt_lines.append("Previous Conversation History:")
            full_prompt_lines.append(history_text)
            full_prompt_lines.append("")

        full_prompt_lines.append(user_part)

        return "\n".join(full_prompt_lines)

    def build_ollama_messages(
        self,
        question: str,
        retrieved_context: str,
        history: List[ChatMessageRecord] = None
    ) -> List[Dict[str, str]]:
        """
        Creates a list of structured message dictionaries for models that support chat format.
        """
        messages = [
            {"role": "system", "content": self.system_prompt}
        ]

        # Add conversation history
        if history:
            for record in history:
                messages.append({"role": record.role, "content": record.content})

        # Format user prompt with context and current question
        user_content = USER_PROMPT_TEMPLATE.format(
            retrieved_context=retrieved_context,
            question=question
        )
        messages.append({"role": "user", "content": user_content})

        return messages
