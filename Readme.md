RAG Strategy Comparator Chatbot

Overview

This project is a web-based chatbot designed to help users understand and compare the effectiveness of different chunking and retrieval strategies in a Retrieval-Augmented Generation (RAG) pipeline.

Users can upload their own documents, select how the document should be processed (chunked) and how information should be retrieved, and then ask questions. The chatbot uses the Google Gemini 2.5 Flash model via the API to generate answers based on the retrieved context, allowing for a direct comparison of how different strategies affect answer quality.

Features

Document Upload: Users can paste text or upload documents (.txt, .pdf) to serve as the knowledge base.

Strategy Selection: Users can mix and match different chunking and retrieval strategies to see the effect on answer quality.

Interactive Chat: A clean chatbot interface to ask questions about the uploaded document.

Real-time Generation: Leverages the gemini-2.5-flash-preview-09-2025 model for fast and coherent answer generation.

Context Visibility (Future): An option to view the exact text chunks that were retrieved and sent to the LLM as context for each answer.

Strategies for Comparison

Chunking Strategies

This defines how the source document is split into pieces.

Level 1: Fixed-Size Chunking: The simplest method. The text is split into chunks of a fixed number of characters (e.g., 1000 characters) with a small overlap.

Level 2: Recursive Chunking: A smarter method that tries to split the text along semantic boundaries, starting with paragraphs, then sentences, then words.

Level 3: Document-Based Chunking: Splits the document based on its inherent structure (e.g., by paragraph or custom delimiters like "---").

Level 4: Semantic Chunking: Uses embedding models to find "natural breaks" in the text, grouping semantically related sentences into a single chunk.

Level 5: Agentic Chunking: An advanced method where an LLM agent intelligently analyzes the document and decides the optimal way to chunk it for a specific task.

Retrieval Strategies

This defines how the application finds relevant chunks to answer a question.

1. Simple Top-K: The baseline. Retrieves the k chunks that are most semantically similar to the user's query.

2. Maximal Marginal Relevance (MMR): Aims for diversity. It retrieves chunks that are both relevant to the query and dissimilar from each other, reducing redundant information.

3. Parent Document Retriever: Balances precision and context. It retrieves small, specific "child" chunks (like a sentence) but then provides the larger "parent" chunk (like the full paragraph) to the LLM.

Tech Stack

Backend: FastAPI (Python) - Handles document processing, chunking, retrieval, and LLM API calls

Frontend: React with TypeScript, Tailwind CSS - Modern, type-safe UI

Language Model: Google Gemini 2.5 Flash (via the Gemini API)

Vector Embeddings & Search: Keyword-based similarity for demo (can be upgraded to use FAISS, ChromaDB, or Pinecone for production)

How It Works

1. Load: The user provides a source document via the React frontend.

2. Upload: The frontend sends the document text and selected strategies to the FastAPI backend via POST /api/upload.

3. Chunk: The backend processes the document using the selected Chunking Strategy and stores the chunks in memory.

4. Query: The user asks a question in the chat interface.

5. Retrieve: The frontend sends the query to POST /api/query. The backend searches the document chunks using the selected Retrieval Strategy to find the most relevant context.

6. Generate: The backend combines the user's question with the retrieved chunks into a prompt and sends it to the Gemini 2.5 Flash API.

7. Respond: The API's response is returned to the frontend and displayed in the chat interface.

Project Structure

```
banking chatbot/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app and routes
│   │   ├── chunking.py          # Chunking strategies
│   │   ├── retrieval.py         # Retrieval strategies
│   │   └── llm.py               # Gemini API integration
│   ├── requirements.txt
│   └── .env                     # API keys (not committed)
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── services/            # API service layer
│   │   ├── types/               # TypeScript types
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── tsconfig.json
└── readme.md
```

Setup Instructions

Backend Setup:

1. Navigate to the backend directory: `cd backend`
2. Create a virtual environment: `python -m venv venv`
3. Activate it: `source venv/bin/activate` (Mac/Linux) or `venv\Scripts\activate` (Windows)
4. Install dependencies: `pip install -r requirements.txt`
5. Create a `.env` file with your `GEMINI_API_KEY=your_key_here`
6. Run the server: `uvicorn app.main:app --reload`

Frontend Setup:

1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`
4. Open your browser to the URL shown (typically http://localhost:5173)

This application serves as an educational tool to visually and interactively demonstrate the impact of RAG pipeline configuration on LLM performance.