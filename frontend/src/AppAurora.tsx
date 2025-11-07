import { useState, useEffect, useRef } from 'react';
import type { Message, ChunkingStrategy, RetrievalStrategy } from './types';
import { api, checkBackendHealth } from './services/api';

function AppAurora() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [documentText, setDocumentText] = useState('');
  const [chunkingStrategy, setChunkingStrategy] = useState<ChunkingStrategy>('semantic');
  const [retrievalStrategy, setRetrievalStrategy] = useState<RetrievalStrategy>('hybrid');
  const [isLoading, setIsLoading] = useState(false);
  const [documentLoaded, setDocumentLoaded] = useState(false);
  const [numChunks, setNumChunks] = useState(0);
  const [uploadMode, setUploadMode] = useState<'text' | 'file'>('file');
  const [showSettings, setShowSettings] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input after loading completes
  useEffect(() => {
    if (!isLoading && documentLoaded) {
      inputRef.current?.focus();
    }
  }, [isLoading, documentLoaded]);

  // Check backend connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      const isHealthy = await checkBackendHealth();
      if (!isHealthy) {
        addMessage('assistant', '⚠️ Cannot connect to backend server. Please make sure the backend is running on http://127.0.0.1:8000');
      }
    };
    checkConnection();
  }, []);

  const handleUploadText = async () => {
    if (!documentText.trim()) {
      addMessage('assistant', '❌ Please enter some text first.');
      return;
    }

    setIsLoading(true);
    setIsTyping(true);
    try {
      const response = await api.uploadText(documentText, chunkingStrategy, retrievalStrategy);
      setDocumentLoaded(true);
      setNumChunks(response.num_chunks);
      
      // Simulate typing effect
      setTimeout(() => {
        setIsTyping(false);
        addMessage('assistant', `✅ Document uploaded! Created ${response.num_chunks} chunks using ${chunkingStrategy} chunking.`);
      }, 500);
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload document';
      setIsTyping(false);
      addMessage('assistant', `❌ Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setIsTyping(true);
    try {
      const response = await api.uploadFile(file, chunkingStrategy, retrievalStrategy);
      setDocumentLoaded(true);
      setNumChunks(response.num_chunks);
      
      // Simulate typing effect
      setTimeout(() => {
        setIsTyping(false);
        addMessage('assistant', `✅ File "${response.filename}" uploaded! Created ${response.num_chunks} chunks.`);
      }, 500);
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
      setIsTyping(false);
      addMessage('assistant', `❌ Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    addMessage('user', userMessage);

    // Handle greetings without document
    const greetings = ['hi', 'hello', 'hey', 'greetings'];
    if (!documentLoaded && greetings.includes(userMessage.toLowerCase())) {
      addMessage('assistant', '👋 Hello! I\'m your study assistant. Please upload a document first!');
      return;
    }

    if (!documentLoaded) {
      addMessage('assistant', '📄 Please upload a document first.');
      return;
    }

    setIsLoading(true);
    setIsTyping(true);
    try {
      // Prepare conversation history (convert Message[] to API format)
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      const response = await api.query(userMessage, conversationHistory);
      
      // Simulate typing effect for more natural feel
      setTimeout(() => {
        setIsTyping(false);
        addMessage('assistant', response.response);
      }, 800);
    } catch (error) {
      console.error('Query error:', error);
      setIsTyping(false);
      addMessage('assistant', 'Sorry, there was an error processing your question.');
    } finally {
      setIsLoading(false);
    }
  };

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
    }]);
  };

  return (
    <div className="flex h-screen bg-[#2a2d35]">
      {/* Sidebar */}
      <div className="w-64 bg-[#1a2332] flex flex-col">
        {/* Logo */}
        <div className="p-6 text-center border-b border-[#243447]">
          <div className="w-20 h-20 mx-auto mb-3 flex items-center justify-center">
            <img src="/study-ai-logo.svg" alt="Study AI Logo" className="w-full h-full" />
          </div>
          <h1 className="text-white text-xl font-bold">Study AI</h1>
        </div>

        {/* Navigation */}
        <div className="px-4 py-4 space-y-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              showSettings ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-[#243447]'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span className="font-medium">Chat</span>
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
            {/* Upload Section */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 mb-2 uppercase">Upload Document</h3>
              
              {/* Tabs */}
              <div className="flex gap-1 mb-3 bg-[#243447] p-1 rounded-lg">
                <button
                  onClick={() => setUploadMode('file')}
                  className={`flex-1 py-2 px-3 text-xs font-medium rounded transition ${
                    uploadMode === 'file' ? 'bg-blue-600 text-white' : 'text-gray-400'
                  }`}
                >
                  📎 File
                </button>
                <button
                  onClick={() => setUploadMode('text')}
                  className={`flex-1 py-2 px-3 text-xs font-medium rounded transition ${
                    uploadMode === 'text' ? 'bg-blue-600 text-white' : 'text-gray-400'
                  }`}
                >
                  ✍️ Text
                </button>
              </div>

              {uploadMode === 'file' ? (
                <div>
                  <input
                    type="file"
                    accept=".txt,.pdf"
                    onChange={handleFileUpload}
                    disabled={isLoading}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="block border-2 border-dashed border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition"
                  >
                    <svg className="w-10 h-10 text-gray-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <div className="text-xs text-gray-400">Click to upload</div>
                    <div className="text-xs text-gray-500 mt-1">TXT or PDF</div>
                  </label>
                </div>
              ) : (
                <>
                  <textarea
                    className="w-full h-32 p-3 text-xs border border-gray-600 rounded-lg bg-[#243447] text-white resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Paste text here..."
                    value={documentText}
                    onChange={(e) => setDocumentText(e.target.value)}
                  />
                  <button
                    onClick={handleUploadText}
                    disabled={isLoading || !documentText.trim()}
                    className="w-full mt-2 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition text-xs font-medium"
                  >
                    {isLoading ? 'Uploading...' : 'Upload'}
                  </button>
                </>
              )}

              {documentLoaded && (
                <div className="mt-2 p-2 bg-green-900/30 border border-green-700 rounded text-xs text-green-400">
                  ✓ {numChunks} chunks loaded
                </div>
              )}
            </div>

            {/* Strategies */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 mb-2 uppercase">Chunking</h3>
              <select
                value={chunkingStrategy}
                onChange={(e) => setChunkingStrategy(e.target.value as ChunkingStrategy)}
                className="w-full p-2 text-xs border border-gray-600 rounded-lg bg-[#243447] text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="fixed">Fixed-Size</option>
                <option value="recursive">Recursive</option>
                <option value="document">Document-Based</option>
                <option value="semantic">⭐ Semantic</option>
                <option value="agentic">Agentic</option>
              </select>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-400 mb-2 uppercase">Retrieval</h3>
              <select
                value={retrievalStrategy}
                onChange={(e) => setRetrievalStrategy(e.target.value as RetrievalStrategy)}
                className="w-full p-2 text-xs border border-gray-600 rounded-lg bg-[#243447] text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="top-k">Top-K</option>
                <option value="semantic">⭐ Semantic</option>
                <option value="hybrid">⭐⭐ Hybrid</option>
                <option value="mmr">MMR</option>
                <option value="parent">Parent Doc</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-[#3a3d45] px-6 py-4 flex items-center justify-between border-b border-gray-700">
          <h2 className="text-white text-lg font-semibold">RAG Chatbot</h2>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-300">Online</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 text-sm">Upload a document to start chatting</div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div 
                  key={message.id} 
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-start gap-3 max-w-2xl">
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                        </svg>
                      </div>
                    )}
                    <div className={`px-4 py-3 rounded-2xl transition-all hover:shadow-lg ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-br-sm'
                        : 'bg-[#3a3d45] text-gray-200 rounded-bl-sm hover:bg-[#404349]'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start animate-fadeIn">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center animate-pulse">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                      </svg>
                    </div>
                    <div className="bg-[#3a3d45] px-4 py-3 rounded-2xl rounded-bl-sm">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="bg-[#3a3d45] px-6 py-4 border-t border-gray-700">
          <div className="flex gap-3 items-center">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Compose message..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-[#4a4d55] text-white rounded-full focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-400 transition-all"
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-lg"
            >
              {isLoading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AppAurora;
