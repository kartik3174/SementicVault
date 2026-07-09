import re
import unicodedata

def normalize_whitespace(text: str) -> str:
    """Collapses multiple spaces and tabs into a single space."""
    return re.sub(r"[ \t]+", " ", text)

def normalize_line_breaks(text: str, max_consecutive_newlines: int = 2) -> str:
    """
    Standardizes line breaks to '\n' and caps consecutive newlines 
    to prevent excessive whitespace holes in the document index.
    """
    # Convert carriage returns
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # Cap excessive consecutive newlines
    pattern = r"\n{" + str(max_consecutive_newlines + 1) + r",}"
    replacement = "\n" * max_consecutive_newlines
    return re.sub(pattern, replacement, text)

def clean_smart_quotes_and_dashes(text: str) -> str:
    """Replaces decorative/smart quotes and long dashes with standard ASCII equivalents."""
    replacements = {
        "“": '"',
        "”": '"',
        "‘": "'",
        "’": "'",
        "–": "-",  # en-dash
        "—": "-",  # em-dash
        "…": "...",
    }
    for orig, repl in replacements.items():
        text = text.replace(orig, repl)
    return text

def remove_non_printable_chars(text: str) -> str:
    """Removes control and non-printable characters from the text string."""
    return "".join(c for c in text if unicodedata.category(c)[0] != "C" or c == "\n" or c == "\t")

def clean_bullets_and_lists(text: str) -> str:
    """Standardizes list bullets to standard hyphen bullets for uniform parsing."""
    # Matches bullet characters like •, ∙, ◦, ▪, etc.
    bullet_pattern = re.compile(r"^\s*[•∙◦▪■\-*+]\s+", re.MULTILINE)
    return bullet_pattern.sub("- ", text)

def clean_text(
    text: str,
    remove_non_printable: bool = True,
    normalize_quotes: bool = True,
    clean_bullets: bool = True,
    collapse_spaces: bool = True,
    max_newlines: int = 2
) -> str:
    """
    Unified text cleaning pipeline.
    Applies custom normalizations based on the configuration parameters.
    """
    if not text:
        return ""
        
    # 1. Non-printable characters
    if remove_non_printable:
        text = remove_non_printable_chars(text)
        
    # 2. Smart quotes and long dashes
    if normalize_quotes:
        text = clean_smart_quotes_and_dashes(text)
        
    # 3. Standardize lists and bullets
    if clean_bullets:
        text = clean_bullets_and_lists(text)
        
    # 4. Normalize line breaks
    text = normalize_line_breaks(text, max_newlines)
    
    # 5. Normalize general horizontal spaces
    if collapse_spaces:
        # We process line by line to keep newlines intact
        lines = [normalize_whitespace(line).strip() for line in text.split("\n")]
        text = "\n".join(lines)
        
    return text.strip()
