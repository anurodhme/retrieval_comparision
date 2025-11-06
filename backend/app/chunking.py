"""
Chunking strategies for document processing

Level 1: Fixed-Size Chunking
    The simplest method. Split text into chunks of fixed size with overlap.

Level 2: Recursive Chunking
    Divide text into smaller chunks in a hierarchical and iterative manner using 
    a set of separators. If initial split doesn't produce desired size, recursively 
    call with different separator until desired chunk size is achieved.

Level 3: Document-Based Chunking
    Split document based on its inherent structure. Considers the flow and structure 
    of content but may not be as effective for documents lacking clear structure.

Level 4: Semantic Chunking
    Extract semantic meaning from embeddings and assess semantic relationship between 
    chunks. Keep together chunks that are semantically similar.

Level 5: Agentic Chunking
    Use LLM to determine how much and what text should be included in a chunk based 
    on the context.
"""
import re
from typing import List

# Lazy import for sentence transformers (only load when needed)
_embedding_model = None


def chunk_document(text: str, strategy: str) -> List[str]:
    """
    Chunk document based on selected strategy
    
    Args:
        text: The document text to chunk
        strategy: The chunking strategy to use
        
    Returns:
        List of text chunks
    """
    if strategy == 'fixed':
        return chunk_fixed_size(text, chunk_size=1000, overlap=200)
    elif strategy == 'recursive':
        return chunk_recursive(text)
    elif strategy == 'document':
        return chunk_document_based(text)
    elif strategy == 'semantic':
        # Placeholder for semantic chunking
        return [text]
    elif strategy == 'agentic':
        # Placeholder for agentic chunking
        return [text]
    else:
        return [text]


def chunk_fixed_size(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
    """
    Split text into fixed-size chunks with overlap
    
    Args:
        text: The text to chunk
        chunk_size: Size of each chunk in characters
        overlap: Number of overlapping characters between chunks
        
    Returns:
        List of text chunks
    """
    chunks = []
    i = 0
    while i < len(text):
        end = i + chunk_size
        chunks.append(text[i:end])
        i += chunk_size - overlap
    return [chunk for chunk in chunks if chunk.strip()]


def chunk_recursive(text: str, max_chunk_size: int = 1000) -> List[str]:
    """
    Level 2: Recursive Chunking
    
    Divide text into smaller chunks in a hierarchical and iterative manner using 
    a set of separators. If initial split doesn't produce desired size, recursively 
    call with different separator until desired chunk size is achieved.
    
    Args:
        text: The text to chunk
        max_chunk_size: Maximum size for each chunk
        
    Returns:
        List of text chunks
    """
    # Hierarchical separators in order of preference
    separators = ['\n\n', '\n', '. ', ' ']
    
    def recursive_split(text: str, separators: List[str]) -> List[str]:
        """Recursively split text using hierarchical separators"""
        if not separators or len(text) <= max_chunk_size:
            return [text] if text.strip() else []
        
        separator = separators[0]
        remaining_separators = separators[1:]
        
        # Split by current separator
        splits = text.split(separator)
        chunks = []
        current_chunk = ""
        
        for split in splits:
            # If adding this split exceeds max size, save current chunk and start new one
            if current_chunk and len(current_chunk) + len(separator) + len(split) > max_chunk_size:
                # If current chunk is still too large, recursively split it
                if len(current_chunk) > max_chunk_size:
                    chunks.extend(recursive_split(current_chunk, remaining_separators))
                else:
                    chunks.append(current_chunk.strip())
                current_chunk = split
            else:
                # Add to current chunk
                if current_chunk:
                    current_chunk += separator + split
                else:
                    current_chunk = split
        
        # Handle remaining chunk
        if current_chunk:
            if len(current_chunk) > max_chunk_size:
                chunks.extend(recursive_split(current_chunk, remaining_separators))
            else:
                chunks.append(current_chunk.strip())
        
        return [c for c in chunks if c.strip()]
    
    return recursive_split(text, separators)


def chunk_document_based(text: str, delimiter: str = '---') -> List[str]:
    """
    Level 3: Document-Based Chunking
    
    Split document based on its inherent structure. This approach considers the 
    flow and structure of content but may not be as effective for documents 
    lacking clear structure.
    
    Looks for structural markers like section headers, delimiters, or natural 
    document boundaries.
    
    Args:
        text: The text to chunk
        delimiter: The delimiter to split on (default: '---')
        
    Returns:
        List of text chunks
    """
    # Try to detect document structure
    # First, try custom delimiter
    if delimiter in text:
        chunks = [chunk.strip() for chunk in text.split(delimiter) if chunk.strip()]
        return chunks
    
    # Try to detect markdown headers or section breaks
    header_pattern = r'\n#{1,6}\s+.+\n'
    if re.search(header_pattern, text):
        # Split by headers while keeping the header with its content
        parts = re.split(r'(\n#{1,6}\s+.+\n)', text)
        chunks = []
        current_chunk = ""
        
        for i, part in enumerate(parts):
            if re.match(r'\n#{1,6}\s+.+\n', part):
                # This is a header
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = part
            else:
                current_chunk += part
        
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        return [c for c in chunks if c]
    
    # Fallback to paragraph-based splitting
    chunks = [chunk.strip() for chunk in text.split('\n\n') if chunk.strip()]
    return chunks


def chunk_semantic(
    text: str, 
    similarity_threshold: float = 0.5,
    min_chunk_size: int = 100,
    max_chunk_size: int = 2000
) -> List[str]:
    """
    Level 4: Semantic Chunking
    
    Extract semantic meaning from embeddings and assess the semantic relationship 
    between chunks. The core idea is to keep together chunks that are semantically 
    similar.
    
    Uses the 'all-MiniLM-L6-v2' model from Hugging Face (sentence-transformers).
    This is a lightweight, fast model that produces high-quality embeddings.
    
    Process:
    1. Split text into sentences
    2. Generate embeddings for each sentence using sentence-transformers
    3. Calculate cosine similarity between consecutive sentences
    4. Group sentences with high similarity into chunks
    5. Split when similarity drops below threshold
    
    Args:
        text: The text to chunk
        similarity_threshold: Threshold for semantic similarity (0-1)
        min_chunk_size: Minimum characters per chunk
        max_chunk_size: Maximum characters per chunk
        
    Returns:
        List of text chunks
    """
    try:
        from sentence_transformers import SentenceTransformer
        from sklearn.metrics.pairwise import cosine_similarity
        
        # Load model (cached after first use)
        global _embedding_model
        if _embedding_model is None:
            # Using all-MiniLM-L6-v2: Fast, lightweight, and effective
            # 384 dimensions, 22M parameters
            _embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Split into sentences
        sentences = _split_into_sentences(text)
        
        if len(sentences) <= 1:
            return [text]
        
        # Generate embeddings for all sentences
        embeddings = _embedding_model.encode(sentences)
        
        # Calculate cosine similarity between consecutive sentences
        similarities = []
        for i in range(len(embeddings) - 1):
            sim = cosine_similarity(
                embeddings[i].reshape(1, -1),
                embeddings[i + 1].reshape(1, -1)
            )[0][0]
            similarities.append(sim)
        
        # Group sentences into chunks based on similarity
        chunks = []
        current_chunk = [sentences[0]]
        current_size = len(sentences[0])
        
        for i, (sentence, similarity) in enumerate(zip(sentences[1:], similarities)):
            sentence_len = len(sentence)
            
            # Check if we should start a new chunk
            should_split = (
                similarity < similarity_threshold or  # Low semantic similarity
                current_size + sentence_len > max_chunk_size  # Exceeds max size
            )
            
            if should_split and current_size >= min_chunk_size:
                # Save current chunk and start new one
                chunks.append(' '.join(current_chunk))
                current_chunk = [sentence]
                current_size = sentence_len
            else:
                # Add to current chunk
                current_chunk.append(sentence)
                current_size += sentence_len
        
        # Add the last chunk
        if current_chunk:
            chunks.append(' '.join(current_chunk))
        
        return [chunk for chunk in chunks if chunk.strip()]
        
    except ImportError:
        # Fallback if sentence-transformers not installed
        print("Warning: sentence-transformers not installed. Falling back to recursive chunking.")
        print("Install with: pip install sentence-transformers")
        return chunk_recursive(text)
    except Exception as e:
        print(f"Error in semantic chunking: {e}. Falling back to recursive chunking.")
        return chunk_recursive(text)


def _split_into_sentences(text: str) -> List[str]:
    """
    Split text into sentences using regex
    
    Args:
        text: Text to split
        
    Returns:
        List of sentences
    """
    # Split on sentence boundaries (., !, ?)
    sentence_pattern = r'(?<=[.!?])\s+'
    sentences = re.split(sentence_pattern, text)
    
    # Clean and filter
    sentences = [s.strip() for s in sentences if s.strip()]
    
    return sentences


def chunk_agentic(text: str) -> List[str]:
    """
    Level 5: Agentic Chunking
    
    Use LLM to determine how much and what text should be included in a chunk 
    based on the context. The LLM analyzes the document and makes intelligent 
    decisions about natural breakpoints.
    
    Full implementation would:
    1. Send document to LLM with instructions to identify logical sections
    2. LLM analyzes content, topics, and context
    3. LLM suggests optimal chunk boundaries based on semantic coherence
    4. Extract chunks based on LLM recommendations
    
    For now, falls back to recursive chunking.
    
    Args:
        text: The text to chunk
        
    Returns:
        List of text chunks
    """
    # TODO: Implement agentic chunking with LLM
    # Example implementation:
    # prompt = f"Analyze this document and suggest optimal chunk boundaries:\n\n{text}"
    # response = llm.generate(prompt)
    # boundaries = parse_llm_response(response)
    # chunks = split_by_boundaries(text, boundaries)
    
    return chunk_recursive(text)
