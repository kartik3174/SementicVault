from typing import List, Dict, Any

class RecursiveCharacterChunker:
    """
    A robust and custom-tailored Recursive Character Chunker.
    Splits text recursively using a hierarchy of separators to maintain structural/paragraph
    coherence, ensuring chunks do not exceed chunk_size while respecting chunk_overlap.
    """
    def __init__(
        self,
        chunk_size: int = 800,
        chunk_overlap: int = 150,
        separators: List[str] = None
    ):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separators = separators or ["\n\n", "\n", " ", ""]
        
        if self.chunk_overlap >= self.chunk_size:
            raise ValueError("Chunk overlap must be strictly less than chunk size.")

    def _split_text_recursive(self, text: str, separators: List[str]) -> List[str]:
        """Core recursive splitting logic."""
        if len(text) <= self.chunk_size:
            return [text]
            
        if not separators:
            # No separators left, force hard split at chunk_size
            chunks = []
            for i in range(0, len(text), self.chunk_size - self.chunk_overlap):
                chunks.append(text[i:i + self.chunk_size])
            return chunks

        # Select current separator and prepare remaining
        separator = separators[0]
        next_separators = separators[1:]
        
        # Split on current separator
        if separator == "":
            # Character level split
            splits = list(text)
        else:
            splits = text.split(separator)
            
        chunks = []
        current_doc = []
        current_len = 0
        
        for split in splits:
            # If the single split is larger than chunk_size, split it recursively
            if len(split) > self.chunk_size:
                if current_doc:
                    chunks.append(separator.join(current_doc))
                    current_doc = []
                    current_len = 0
                
                recursive_splits = self._split_text_recursive(split, next_separators)
                chunks.extend(recursive_splits)
            else:
                # Calculate size increase (including separator)
                sep_len = len(separator) if current_doc else 0
                if current_len + sep_len + len(split) <= self.chunk_size:
                    current_doc.append(split)
                    current_len += sep_len + len(split)
                else:
                    if current_doc:
                        chunks.append(separator.join(current_doc))
                    current_doc = [split]
                    current_len = len(split)
                    
        if current_doc:
            chunks.append(separator.join(current_doc))
            
        return chunks

    def split_text(self, text: str) -> List[Dict[str, Any]]:
        """
        Splits the text into logical chunks, calculates precise character boundaries,
        and extracts the exact overlapping text segments.
        """
        if not text.strip():
            return []

        # Step 1: Perform the structural split
        raw_chunks = self._split_text_recursive(text, self.separators)
        
        # Step 2: Merge splits intelligently while respecting overlap and size
        # To handle overlapping gracefully, we slide our window.
        merged_chunks: List[Dict[str, Any]] = []
        
        # Re-verify chunks & compute actual starts/ends
        current_char_ptr = 0
        
        for idx, chunk_text in enumerate(raw_chunks):
            # Find the actual start pointer in the original text (to handle whitespace normalization differences)
            # We do a fast search from current_char_ptr
            start_pos = text.find(chunk_text, max(0, current_char_ptr - 100))
            if start_pos == -1:
                start_pos = current_char_ptr
                
            length = len(chunk_text)
            end_pos = start_pos + length
            current_char_ptr = end_pos
            
            merged_chunks.append({
                "index": idx,
                "text": chunk_text,
                "char_start": start_pos,
                "char_end": end_pos,
                "length": length,
                "overlap_before": "",
                "overlap_after": ""
            })

        # Step 3: Compute overlaps between adjacent chunks
        # Overlap before is what overlaps with the previous chunk.
        # Overlap after is what overlaps with the next chunk.
        for i in range(len(merged_chunks)):
            # Overlap with previous chunk
            if i > 0:
                prev = merged_chunks[i - 1]
                curr = merged_chunks[i]
                
                # Check if there is physical overlap in the original text coords
                overlap_start = max(curr["char_start"], prev["char_start"])
                overlap_end = min(curr["char_end"], prev["char_end"])
                
                if overlap_end > overlap_start:
                    overlap_text = text[overlap_start:overlap_end]
                    curr["overlap_before"] = overlap_text
                    prev["overlap_after"] = overlap_text

        return merged_chunks
