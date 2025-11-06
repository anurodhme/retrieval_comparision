# RAG Strategies Comparison Guide

This document explains all the chunking and retrieval strategies available in the RAG Strategy Comparator.

## 🔪 Chunking Strategies (5 Levels)

### Level 1: Fixed-Size Chunking
**Method:** Split text into fixed-size chunks with overlap

**Parameters:**
- Chunk size: 1000 characters
- Overlap: 200 characters

**Best for:**
- Simple documents
- When you need consistent chunk sizes
- Quick implementation

**Limitations:**
- Ignores document structure
- May split sentences/paragraphs awkwardly

---

### Level 2: Recursive Chunking
**Method:** Hierarchical splitting using multiple separators

**Process:**
1. Try splitting by paragraphs (`\n\n`)
2. If chunks too large, split by newlines (`\n`)
3. If still too large, split by sentences (`. `)
4. If still too large, split by words (` `)

**Best for:**
- General-purpose text
- Documents with natural structure
- When you want semantic boundaries

**Advantages:**
- Respects document structure
- More natural chunk boundaries
- Better context preservation

---

### Level 3: Document-Based Chunking
**Method:** Split based on document's inherent structure

**Detection:**
- Custom delimiters (`---`)
- Markdown headers (`#`, `##`, etc.)
- Section breaks
- Fallback to paragraphs

**Best for:**
- Structured documents (markdown, reports)
- Documents with clear sections
- When structure matters

**Limitations:**
- Less effective for unstructured text
- Requires recognizable structure

---

### Level 4: Semantic Chunking ⭐
**Method:** Use embeddings to group semantically similar sentences

**Model:** `all-MiniLM-L6-v2` (Hugging Face)
- 384 dimensions
- 22M parameters
- Fast and accurate

**Process:**
1. Split text into sentences
2. Generate embeddings for each sentence
3. Calculate cosine similarity between consecutive sentences
4. Group sentences with similarity > threshold (0.5)
5. Split when similarity drops

**Best for:**
- Complex documents
- When semantic coherence is important
- Topic-based grouping

**Advantages:**
- Keeps related content together
- Natural semantic boundaries
- Better for Q&A tasks

---

### Level 5: Agentic Chunking
**Method:** Use LLM to intelligently decide chunk boundaries

**Concept:**
- LLM analyzes document context
- Identifies logical sections
- Suggests optimal boundaries

**Status:** Placeholder (future implementation)

---

## 🔍 Retrieval Strategies (5 Methods)

### 1. Top-K (Keyword-based)
**Method:** Simple word overlap matching

**Process:**
1. Split query into words
2. For each chunk, count word overlaps
3. Rank chunks by overlap score
4. Return top-k chunks

**Best for:**
- Exact keyword matches
- Simple queries
- Fast retrieval

**Example:**
- Query: "account opening"
- Matches chunks containing "account" and "opening"

---

### 2. Semantic Retrieval ⭐
**Method:** Embedding-based cosine similarity

**Model:** `all-MiniLM-L6-v2` (same as semantic chunking)

**Process:**
1. Generate embeddings for all chunks (cached)
2. Generate embedding for query
3. Calculate cosine similarity
4. Return top-k most similar chunks

**Best for:**
- Conceptual matches
- Paraphrased queries
- Better understanding

**Example:**
- Query: "How do I register?"
- Also matches: "account creation", "sign up process", "new customer"

**Advantages:**
- Understands meaning, not just keywords
- Finds related concepts
- Better for natural language queries

---

### 3. Hybrid (BM25 + Embeddings) ⭐⭐
**Method:** Combines keyword and semantic search

**Components:**
- **BM25:** Statistical keyword ranking (TF-IDF variant)
- **Embeddings:** Semantic similarity

**Formula:**
```
final_score = 0.5 × semantic_score + 0.5 × bm25_score
```

**Process:**
1. Calculate BM25 scores (keyword-based)
2. Calculate semantic scores (embedding-based)
3. Normalize both to [0, 1]
4. Combine with weights (default: 50/50)
5. Return top-k chunks

**Best for:**
- Best of both worlds
- Robust retrieval
- Production use cases

**Advantages:**
- Handles exact matches (BM25)
- Handles conceptual matches (semantic)
- More robust than either alone

**Example:**
- Query: "What's the minimum deposit for business accounts?"
- BM25 finds: exact matches for "minimum deposit" and "business accounts"
- Semantic finds: "corporate account requirements", "initial balance"
- Hybrid: Combines both for best results

---

### 4. MMR (Maximal Marginal Relevance)
**Method:** Balance relevance and diversity

**Process:**
1. Calculate relevance scores
2. Select most relevant chunk first
3. For remaining chunks, balance:
   - Relevance to query
   - Diversity from already selected chunks
4. Repeat until k chunks selected

**Best for:**
- Avoiding redundancy
- Getting diverse perspectives
- Comprehensive answers

**Advantages:**
- Reduces duplicate information
- Provides broader coverage
- Better for exploratory queries

---

### 5. Parent Document Retriever
**Method:** Retrieve small chunks, return larger context

**Process:**
1. Find top-k relevant chunks
2. For each chunk, include:
   - Previous chunk (if exists)
   - Current chunk
   - Next chunk (if exists)
3. Return expanded context

**Best for:**
- When context matters
- Complex questions
- When chunks might be too small

**Advantages:**
- More context for LLM
- Better understanding
- Reduces information loss

---

## 🎯 Recommended Combinations

### For General Documents
- **Chunking:** Recursive or Semantic
- **Retrieval:** Hybrid

### For Technical Documentation
- **Chunking:** Document-based
- **Retrieval:** Hybrid or Semantic

### For Q&A Systems
- **Chunking:** Semantic
- **Retrieval:** Hybrid

### For Exploratory Search
- **Chunking:** Semantic
- **Retrieval:** MMR

### For Maximum Accuracy
- **Chunking:** Semantic
- **Retrieval:** Hybrid
- **Why:** Best semantic understanding at both stages

---

## 📊 Performance Comparison

| Strategy | Speed | Accuracy | Use Case |
|----------|-------|----------|----------|
| **Chunking** |
| Fixed | ⚡⚡⚡ | ⭐⭐ | Simple docs |
| Recursive | ⚡⚡ | ⭐⭐⭐ | General purpose |
| Document | ⚡⚡ | ⭐⭐⭐ | Structured docs |
| Semantic | ⚡ | ⭐⭐⭐⭐ | Complex docs |
| Agentic | ⚡ | ⭐⭐⭐⭐⭐ | Future |
| **Retrieval** |
| Top-K | ⚡⚡⚡ | ⭐⭐ | Keyword search |
| Semantic | ⚡⚡ | ⭐⭐⭐⭐ | Conceptual search |
| Hybrid | ⚡ | ⭐⭐⭐⭐⭐ | Best overall |
| MMR | ⚡ | ⭐⭐⭐⭐ | Diverse results |
| Parent | ⚡⚡ | ⭐⭐⭐ | More context |

---

## 🔬 Experimentation Tips

1. **Start with defaults:**
   - Chunking: Semantic
   - Retrieval: Hybrid

2. **Try different combinations:**
   - Compare answer quality
   - Note which strategies work best for your documents

3. **Consider your data:**
   - Structured → Document-based chunking
   - Unstructured → Semantic chunking
   - Mixed → Recursive chunking

4. **Monitor performance:**
   - Semantic/Hybrid are slower but more accurate
   - Top-K is fastest but less accurate
   - Choose based on your needs

---

## 🚀 Future Enhancements

- [ ] Agentic chunking implementation
- [ ] Vector database integration (FAISS, ChromaDB)
- [ ] Custom embedding models
- [ ] Fine-tuned retrieval weights
- [ ] Query expansion
- [ ] Re-ranking strategies
