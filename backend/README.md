# RAG Strategy Comparator - Backend

FastAPI backend for the RAG Strategy Comparator application.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Mac/Linux
# or
venv\Scripts\activate  # On Windows
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create a `.env` file:
```bash
cp .env.example .env
```

4. Add your Gemini API key to `.env`:
```
GEMINI_API_KEY=your_actual_api_key_here
```

## Running the Server

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Endpoints

### `GET /`
Health check endpoint

### `POST /api/upload`
Upload document text with chunking and retrieval strategies
```json
{
  "document_text": "Your document text here...",
  "chunking_strategy": "fixed",
  "retrieval_strategy": "top-k"
}
```

### `POST /api/upload-file`
Upload a file (.txt or .pdf)
- Form data with file upload
- Query parameters: `chunking_strategy`, `retrieval_strategy`

### `POST /api/query`
Query the uploaded document
```json
{
  "query": "Your question here?"
}
```

### `GET /api/status`
Get current document status

## Chunking Strategies

- `fixed`: Fixed-size chunks with overlap (1000 chars, 200 overlap)
- `recursive`: Hierarchical chunking using separators (paragraphs → sentences → words)
- `document`: Structure-based chunking (detects headers, delimiters, sections)
- `semantic`: **Semantic chunking using embeddings** (all-MiniLM-L6-v2 from Hugging Face)
  - Uses sentence-transformers to generate embeddings
  - Groups semantically similar sentences together
  - Splits when similarity drops below threshold
- `agentic`: LLM-based chunking (placeholder for future implementation)

## Retrieval Strategies

- `top-k`: **Keyword-based retrieval** - Simple word overlap matching
- `semantic`: **Embedding-based retrieval** - Uses all-MiniLM-L6-v2 embeddings with cosine similarity
  - Finds chunks semantically similar to the query
  - Better for conceptual matches (e.g., "account opening" matches "registration process")
- `hybrid`: **BM25 + Embeddings** - Combines keyword and semantic search
  - BM25: Statistical keyword ranking (good for exact matches)
  - Embeddings: Semantic similarity (good for conceptual matches)
  - Weighted combination: 50% BM25 + 50% semantic (configurable)
- `mmr`: **Maximal Marginal Relevance** - Balances relevance and diversity
  - Retrieves relevant chunks that are also diverse from each other
  - Reduces redundant information
- `parent`: **Parent Document Retriever** - Retrieves with expanded context
  - Finds relevant chunks and includes neighboring chunks for more context
