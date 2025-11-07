import type { UploadResponse, QueryResponse, StatusResponse, ChunkingStrategy, RetrievalStrategy } from '../types';

const API_BASE_URL = 'http://127.0.0.1:8000';

// Helper to check if backend is running
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/`);
    return response.ok;
  } catch {
    return false;
  }
};

export const api = {
  async uploadText(
    documentText: string,
    chunkingStrategy: ChunkingStrategy,
    retrievalStrategy: RetrievalStrategy
  ): Promise<UploadResponse> {
    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document_text: documentText,
        chunking_strategy: chunkingStrategy,
        retrieval_strategy: retrievalStrategy,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to upload document');
    }

    return response.json();
  },

  async uploadFile(
    file: File,
    chunkingStrategy: ChunkingStrategy,
    retrievalStrategy: RetrievalStrategy
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(
      `${API_BASE_URL}/api/upload-file?chunking_strategy=${chunkingStrategy}&retrieval_strategy=${retrievalStrategy}`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Failed to upload file');
    }

    return response.json();
  },

  async query(query: string, conversationHistory: Array<{role: string, content: string}> = []): Promise<QueryResponse> {
    const response = await fetch(`${API_BASE_URL}/api/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        query,
        conversation_history: conversationHistory 
      }),
    });

    if (!response.ok) {
      throw new Error(`Query failed: ${response.statusText}`);
    }

    return response.json();
  },

  async getStatus(): Promise<StatusResponse> {
    const response = await fetch(`${API_BASE_URL}/api/status`);

    if (!response.ok) {
      throw new Error('Failed to get status');
    }

    return response.json();
  },
};
