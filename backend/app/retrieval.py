"""
Retrieval strategies for finding relevant chunks

1. Simple Top-K: Keyword-based retrieval using word overlap
2. Semantic: Embedding-based retrieval using cosine similarity
3. Hybrid: Combines BM25 (keyword) + embeddings (semantic) with weighted scoring
4. MMR: Maximal Marginal Relevance for diversity
5. Parent Document: Retrieves with expanded context
"""
from typing import List
import numpy as np

# Lazy imports for heavy dependencies
_embedding_model = None
_bm25_index = None
_chunk_embeddings = None


def retrieve_chunks(chunks: List[str], query: str, strategy: str, k: int = 3) -> str:
    """
    Retrieve relevant chunks based on strategy
    
    Args:
        chunks: List of document chunks
        query: User query
        strategy: Retrieval strategy to use
        k: Number of chunks to retrieve
        
    Returns:
        Combined context string from retrieved chunks
    """
    if strategy == 'top-k':
        return retrieve_top_k(chunks, query, k)
    elif strategy == 'semantic':
        return retrieve_semantic(chunks, query, k)
    elif strategy == 'hybrid':
        return retrieve_hybrid(chunks, query, k)
    elif strategy == 'mmr':
        return retrieve_mmr(chunks, query, k)
    elif strategy == 'parent':
        return retrieve_parent_document(chunks, query, k)
    else:
        return retrieve_top_k(chunks, query, k)


def retrieve_top_k(chunks: List[str], query: str, k: int = 3) -> str:
    """
    Retrieve top-k chunks based on keyword similarity
    
    Args:
        chunks: List of document chunks
        query: User query
        k: Number of chunks to retrieve
        
    Returns:
        Combined context string
    """
    scored_chunks = []
    query_words = set(query.lower().split())
    
    for chunk in chunks:
        chunk_words = set(chunk.lower().split())
        # Calculate overlap score
        score = len(query_words.intersection(chunk_words))
        scored_chunks.append((chunk, score))
    
    # Sort by score (descending) and get top k
    scored_chunks.sort(key=lambda x: x[1], reverse=True)
    top_chunks = [chunk for chunk, score in scored_chunks[:k]]
    
    return '\n---\n'.join(top_chunks)


def retrieve_semantic(chunks: List[str], query: str, k: int = 3) -> str:
    """
    Semantic retrieval using embeddings and cosine similarity
    
    Uses the same all-MiniLM-L6-v2 model from Hugging Face to:
    1. Generate embeddings for all chunks (cached)
    2. Generate embedding for the query
    3. Calculate cosine similarity between query and all chunks
    4. Return top-k most similar chunks
    
    Args:
        chunks: List of document chunks
        query: User query
        k: Number of chunks to retrieve
        
    Returns:
        Combined context string from top-k semantically similar chunks
    """
    try:
        from sentence_transformers import SentenceTransformer
        from sklearn.metrics.pairwise import cosine_similarity
        
        # Load model (cached after first use)
        global _embedding_model, _chunk_embeddings
        
        if _embedding_model is None:
            _embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Generate chunk embeddings (cache them for efficiency)
        if _chunk_embeddings is None or len(_chunk_embeddings) != len(chunks):
            _chunk_embeddings = _embedding_model.encode(chunks)
        
        # Generate query embedding
        query_embedding = _embedding_model.encode([query])[0]
        
        # Calculate cosine similarity between query and all chunks
        similarities = cosine_similarity(
            query_embedding.reshape(1, -1),
            _chunk_embeddings
        )[0]
        
        # Get top-k indices
        top_k_indices = np.argsort(similarities)[-k:][::-1]
        
        # Get top-k chunks
        top_chunks = [chunks[i] for i in top_k_indices]
        
        return '\n---\n'.join(top_chunks)
        
    except ImportError:
        print("Warning: sentence-transformers not installed. Falling back to keyword retrieval.")
        return retrieve_top_k(chunks, query, k)
    except Exception as e:
        print(f"Error in semantic retrieval: {e}. Falling back to keyword retrieval.")
        return retrieve_top_k(chunks, query, k)


def retrieve_hybrid(chunks: List[str], query: str, k: int = 3, alpha: float = 0.5) -> str:
    """
    Hybrid retrieval combining BM25 (keyword) and semantic (embedding) search
    
    Combines two complementary approaches:
    - BM25: Statistical keyword-based ranking (good for exact matches)
    - Semantic: Embedding-based similarity (good for conceptual matches)
    
    Final score = alpha * semantic_score + (1 - alpha) * bm25_score
    
    Args:
        chunks: List of document chunks
        query: User query
        k: Number of chunks to retrieve
        alpha: Weight for semantic vs BM25 (0.5 = equal weight)
        
    Returns:
        Combined context string from top-k hybrid-scored chunks
    """
    try:
        from sentence_transformers import SentenceTransformer
        from sklearn.metrics.pairwise import cosine_similarity
        from rank_bm25 import BM25Okapi
        
        # Load embedding model
        global _embedding_model, _chunk_embeddings, _bm25_index
        
        if _embedding_model is None:
            _embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Generate/cache chunk embeddings
        if _chunk_embeddings is None or len(_chunk_embeddings) != len(chunks):
            _chunk_embeddings = _embedding_model.encode(chunks)
        
        # Build/cache BM25 index
        if _bm25_index is None or len(_bm25_index.doc_freqs) != len(chunks):
            tokenized_chunks = [chunk.lower().split() for chunk in chunks]
            _bm25_index = BM25Okapi(tokenized_chunks)
        
        # 1. Get semantic scores
        query_embedding = _embedding_model.encode([query])[0]
        semantic_scores = cosine_similarity(
            query_embedding.reshape(1, -1),
            _chunk_embeddings
        )[0]
        
        # Normalize semantic scores to [0, 1]
        semantic_scores = (semantic_scores - semantic_scores.min()) / (semantic_scores.max() - semantic_scores.min() + 1e-10)
        
        # 2. Get BM25 scores
        tokenized_query = query.lower().split()
        bm25_scores = _bm25_index.get_scores(tokenized_query)
        
        # Normalize BM25 scores to [0, 1]
        bm25_scores = (bm25_scores - bm25_scores.min()) / (bm25_scores.max() - bm25_scores.min() + 1e-10)
        
        # 3. Combine scores
        hybrid_scores = alpha * semantic_scores + (1 - alpha) * bm25_scores
        
        # 4. Get top-k indices
        top_k_indices = np.argsort(hybrid_scores)[-k:][::-1]
        
        # 5. Get top-k chunks
        top_chunks = [chunks[i] for i in top_k_indices]
        
        return '\n---\n'.join(top_chunks)
        
    except ImportError as e:
        print(f"Warning: Missing library for hybrid retrieval: {e}")
        print("Falling back to semantic retrieval.")
        return retrieve_semantic(chunks, query, k)
    except Exception as e:
        print(f"Error in hybrid retrieval: {e}. Falling back to keyword retrieval.")
        return retrieve_top_k(chunks, query, k)


def retrieve_mmr(chunks: List[str], query: str, k: int = 3, lambda_param: float = 0.5) -> str:
    """
    Maximal Marginal Relevance retrieval for diversity
    
    Balances relevance to query with diversity among selected chunks.
    
    Args:
        chunks: List of document chunks
        query: User query
        k: Number of chunks to retrieve
        lambda_param: Balance between relevance (1.0) and diversity (0.0)
        
    Returns:
        Combined context string
    """
    if not chunks:
        return ""
    
    query_words = set(query.lower().split())
    selected = []
    remaining = list(chunks)
    
    # Calculate initial relevance scores
    relevance_scores = []
    for chunk in remaining:
        chunk_words = set(chunk.lower().split())
        score = len(query_words.intersection(chunk_words))
        relevance_scores.append(score)
    
    # Select first chunk (highest relevance)
    first_idx = relevance_scores.index(max(relevance_scores))
    selected.append(remaining.pop(first_idx))
    relevance_scores.pop(first_idx)
    
    # Select remaining chunks balancing relevance and diversity
    while len(selected) < k and remaining:
        mmr_scores = []
        
        for i, chunk in enumerate(remaining):
            relevance = relevance_scores[i]
            
            # Calculate max similarity to already selected chunks
            max_similarity = 0
            chunk_words = set(chunk.lower().split())
            for selected_chunk in selected:
                selected_words = set(selected_chunk.lower().split())
                similarity = len(chunk_words.intersection(selected_words)) / max(len(chunk_words), 1)
                max_similarity = max(max_similarity, similarity)
            
            # MMR score
            mmr = lambda_param * relevance - (1 - lambda_param) * max_similarity
            mmr_scores.append(mmr)
        
        # Select chunk with highest MMR score
        best_idx = mmr_scores.index(max(mmr_scores))
        selected.append(remaining.pop(best_idx))
        relevance_scores.pop(best_idx)
    
    return '\n---\n'.join(selected)


def retrieve_parent_document(chunks: List[str], query: str, k: int = 3) -> str:
    """
    Parent Document Retriever (simplified version)
    
    In a full implementation, this would retrieve small child chunks but return
    larger parent chunks. For this demo, we retrieve chunks and include surrounding context.
    
    Args:
        chunks: List of document chunks
        query: User query
        k: Number of chunks to retrieve
        
    Returns:
        Combined context string with expanded context
    """
    # For now, use top-k but with larger context window
    # In production, you'd maintain parent-child relationships
    scored_chunks = []
    query_words = set(query.lower().split())
    
    for i, chunk in enumerate(chunks):
        chunk_words = set(chunk.lower().split())
        score = len(query_words.intersection(chunk_words))
        scored_chunks.append((i, chunk, score))
    
    # Sort by score and get top k
    scored_chunks.sort(key=lambda x: x[2], reverse=True)
    
    # Get expanded context (include neighboring chunks)
    expanded_chunks = []
    for i, chunk, score in scored_chunks[:k]:
        context_parts = []
        # Add previous chunk if exists
        if i > 0:
            context_parts.append(chunks[i-1])
        # Add current chunk
        context_parts.append(chunk)
        # Add next chunk if exists
        if i < len(chunks) - 1:
            context_parts.append(chunks[i+1])
        
        expanded_chunks.append(' '.join(context_parts))
    
    return '\n---\n'.join(expanded_chunks)


def calculate_similarity(text1: str, text2: str) -> float:
    """
    Calculate simple word overlap similarity between two texts
    
    Args:
        text1: First text
        text2: Second text
        
    Returns:
        Similarity score between 0 and 1
    """
    words1 = set(text1.lower().split())
    words2 = set(text2.lower().split())
    
    if not words1 or not words2:
        return 0.0
    
    intersection = len(words1.intersection(words2))
    union = len(words1.union(words2))
    
    return intersection / union if union > 0 else 0.0
