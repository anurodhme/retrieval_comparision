export type ChunkingStrategy = 'fixed' | 'recursive' | 'document' | 'semantic' | 'agentic';
export type RetrievalStrategy = 'top-k' | 'semantic' | 'hybrid' | 'mmr' | 'parent';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface UploadResponse {
  message: string;
  num_chunks: number;
  chunking_strategy: string;
  filename?: string;
}

export interface QueryResponse {
  response: string;
  context: string;
  num_chunks_retrieved: number;
  chunking_strategy: string;
  retrieval_strategy: string;
}

export interface StatusResponse {
  document_loaded: boolean;
  num_chunks: number;
  chunking_strategy: string;
  retrieval_strategy: string;
}
