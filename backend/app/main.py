from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from app.chunking import chunk_document
from app.retrieval import retrieve_chunks
from app.llm import generate_response
from app.utils import extract_text_from_pdf

load_dotenv()

app = FastAPI(title="RAG Strategy Comparator API")

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174", 
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory document store (use database in production)
document_store = {
    'text': '',
    'chunks': [],
    'chunking_strategy': '',
    'retrieval_strategy': '',
    'conversation_history': []  # Store conversation for context
}


class DocumentUpload(BaseModel):
    document_text: str
    chunking_strategy: str = "fixed"
    retrieval_strategy: str = "top-k"


class Query(BaseModel):
    query: str
    conversation_history: list = []  # Optional conversation history from frontend


@app.get("/")
async def root():
    return {"message": "RAG Strategy Comparator API", "status": "running"}


@app.post("/api/upload")
async def upload_document(data: DocumentUpload):
    """Handle document upload and chunking"""
    if not data.document_text:
        raise HTTPException(status_code=400, detail="No document text provided")
    
    # Store document and strategies
    document_store['text'] = data.document_text
    document_store['chunking_strategy'] = data.chunking_strategy
    document_store['retrieval_strategy'] = data.retrieval_strategy
    
    # Chunk the document
    chunks = chunk_document(data.document_text, data.chunking_strategy)
    document_store['chunks'] = chunks
    
    # Clear conversation history when new document is uploaded
    document_store['conversation_history'] = []
    
    # Pre-generate embeddings for semantic/hybrid retrieval to speed up queries
    if data.retrieval_strategy in ['semantic', 'hybrid']:
        from app.retrieval import _embedding_model
        try:
            from sentence_transformers import SentenceTransformer
            if _embedding_model is None:
                # Load model once
                import app.retrieval as retrieval_module
                retrieval_module._embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            # Pre-compute chunk embeddings
            import app.retrieval as retrieval_module
            retrieval_module._chunk_embeddings = retrieval_module._embedding_model.encode(chunks)
        except Exception as e:
            print(f"Warning: Could not pre-compute embeddings: {e}")
            pass  # Fallback to computing on query
    
    return {
        "message": "Document uploaded successfully",
        "num_chunks": len(chunks),
        "chunking_strategy": data.chunking_strategy
    }


@app.post("/api/upload-file")
async def upload_file(
    file: UploadFile = File(...),
    chunking_strategy: str = "fixed",
    retrieval_strategy: str = "top-k"
):
    """Handle file upload (txt or pdf)"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Extract text based on file type
    if file.filename.endswith('.txt'):
        content = await file.read()
        document_text = content.decode('utf-8')
    elif file.filename.endswith('.pdf'):
        content = await file.read()
        document_text = extract_text_from_pdf(content)
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type. Please upload .txt or .pdf")
    
    # Store document and strategies
    document_store['text'] = document_text
    document_store['chunking_strategy'] = chunking_strategy
    document_store['retrieval_strategy'] = retrieval_strategy
    
    # Chunk the document
    chunks = chunk_document(document_text, chunking_strategy)
    document_store['chunks'] = chunks
    
    return {
        "message": "File uploaded successfully",
        "filename": file.filename,
        "num_chunks": len(chunks),
        "chunking_strategy": chunking_strategy
    }


@app.post("/api/query")
async def query_document(data: Query):
    """Handle user queries and generate responses with conversation memory"""
    if not data.query:
        raise HTTPException(status_code=400, detail="No query provided")
    
    if not document_store['chunks']:
        raise HTTPException(status_code=400, detail="No document uploaded. Please upload a document first.")
    
    # Retrieve relevant chunks
    context = retrieve_chunks(
        document_store['chunks'],
        data.query,
        document_store['retrieval_strategy']
    )
    
    # Use conversation history from request or stored history
    conversation_history = data.conversation_history if data.conversation_history else document_store.get('conversation_history', [])
    
    # Generate response using Gemini API with conversation context
    response = await generate_response(context, data.query, conversation_history)
    
    # Store this exchange in conversation history (keep last 10 exchanges)
    document_store['conversation_history'].append({"role": "user", "content": data.query})
    document_store['conversation_history'].append({"role": "assistant", "content": response})
    document_store['conversation_history'] = document_store['conversation_history'][-20:]  # Keep last 10 exchanges
    
    return {
        "response": response,
        "context": context,
        "num_chunks_retrieved": len(context.split('\n---\n')) if context else 0,
        "chunking_strategy": document_store['chunking_strategy'],
        "retrieval_strategy": document_store['retrieval_strategy']
    }


@app.get("/api/status")
async def get_status():
    """Get current document status"""
    return {
        "document_loaded": bool(document_store['text']),
        "num_chunks": len(document_store['chunks']),
        "chunking_strategy": document_store['chunking_strategy'],
        "retrieval_strategy": document_store['retrieval_strategy']
    }
