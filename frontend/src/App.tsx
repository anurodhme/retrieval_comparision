import { useState, useEffect } from 'react';
import type { Message, ChunkingStrategy, RetrievalStrategy } from './types';
import { api, checkBackendHealth } from './services/api';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [documentText, setDocumentText] = useState('');
  const [chunkingStrategy, setChunkingStrategy] = useState<ChunkingStrategy>('semantic');
  const [retrievalStrategy, setRetrievalStrategy] = useState<RetrievalStrategy>('hybrid');
  const [isLoading, setIsLoading] = useState(false);
  const [documentLoaded, setDocumentLoaded] = useState(false);
  const [numChunks, setNumChunks] = useState(0);
  const [uploadMode, setUploadMode] = useState<'text' | 'file'>('text');

  // Check backend connection on mount (silently)
  useEffect(() => {
    checkBackendHealth();
  }, []);

  const handleUploadText = async () => {
    if (!documentText.trim()) {
      addMessage('assistant', '❌ Please enter some text first.');
      return;
    }

    console.log('Uploading text, length:', documentText.length);

    setIsLoading(true);
    try {
      const response = await api.uploadText(documentText, chunkingStrategy, retrievalStrategy);
      console.log('Upload response:', response);
      setDocumentLoaded(true);
      setNumChunks(response.num_chunks);
      addMessage('assistant', `✅ Document uploaded! Created ${response.num_chunks} chunks using ${chunkingStrategy} chunking.`);
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload document';
      addMessage('assistant', `❌ Error: ${errorMessage}. Please check the console for details.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('Uploading file:', file.name, file.type, file.size);

    setIsLoading(true);
    try {
      const response = await api.uploadFile(file, chunkingStrategy, retrievalStrategy);
      console.log('Upload response:', response);
      setDocumentLoaded(true);
      setNumChunks(response.num_chunks);
      addMessage('assistant', `File "${response.filename}" uploaded successfully! Created ${response.num_chunks} chunks using ${chunkingStrategy} chunking.`);
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
      addMessage('assistant', `❌ Error: ${errorMessage}. Please check the console for details.`);
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
      addMessage('assistant', '👋 Hello! I\'m your RAG Strategy Comparator assistant. Please upload a document first, and then I can answer questions about it!');
      return;
    }

    if (!documentLoaded) {
      addMessage('assistant', '📄 Please upload a document first before asking questions.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.query(userMessage);
      addMessage('assistant', response.response);
    } catch (error) {
      console.error('Query error:', error);
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

  const [showSettings, setShowSettings] = useState(false);

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getGreetingEmoji = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '🌅';
    if (hour < 18) return '☀️';
    return '🌙';
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Study AI</h1>
              <p className="text-xs text-gray-500">RAG Assistant</p>
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Document Upload */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-gray-900">Upload Document</h3>
            </div>
            
            {/* Tab Selection */}
            <div className="flex gap-2 mb-3 bg-white rounded-lg p-1">
              <button
                onClick={() => setUploadMode('text')}
                className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition ${
                  uploadMode === 'text'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                📝 Text
              </button>
              <button
                onClick={() => setUploadMode('file')}
                className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition ${
                  uploadMode === 'file'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                📎 File
              </button>
            </div>

            {uploadMode === 'text' ? (
              <>
                <textarea
                  className="w-full h-32 p-3 text-sm border-2 border-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white text-gray-900 transition shadow-sm"
                  placeholder="Paste your document text here..."
                  value={documentText}
                  onChange={(e) => setDocumentText(e.target.value)}
                />
                <button
                  onClick={handleUploadText}
                  disabled={isLoading || !documentText.trim()}
                  className="w-full mt-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-semibold shadow-md hover:shadow-lg"
                >
                  {isLoading ? '⏳ Uploading...' : '✨ Upload Text'}
                </button>
              </>
            ) : (
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
                  className="block w-full border-2 border-dashed border-white rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition bg-white shadow-sm"
                >
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <div className="text-sm font-semibold text-gray-900">
                      Click to upload
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      TXT or PDF • Max 10MB
                    </div>
                  </div>
                </label>
              </div>
            )}

            {documentLoaded && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-xs font-semibold text-green-700">
                  Document loaded • {numChunks} chunks
                </p>
              </div>
            )}
          </div>

          {/* Chunking Strategy */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
              <label className="text-sm font-bold text-gray-900">
                Chunking Strategy
              </label>
            </div>
            <select
              value={chunkingStrategy}
              onChange={(e) => setChunkingStrategy(e.target.value as ChunkingStrategy)}
              className="w-full p-3 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-900 cursor-pointer hover:border-gray-300 transition font-medium"
            >
              <option value="fixed">Fixed-Size - Simple chunks with overlap</option>
              <option value="recursive">Recursive - Hierarchical splitting</option>
              <option value="document">Document-Based - Structure-aware</option>
              <option value="semantic">⭐ Semantic - Embedding-based</option>
              <option value="agentic">Agentic - LLM-powered (beta)</option>
            </select>
            <p className="text-xs text-gray-600 mt-3 bg-white rounded-lg p-2 border border-gray-200">
              {chunkingStrategy === 'semantic' && '✨ Uses AI embeddings to group similar content'}
              {chunkingStrategy === 'recursive' && '📊 Splits by paragraphs, then sentences'}
              {chunkingStrategy === 'document' && '📑 Follows document structure'}
              {chunkingStrategy === 'fixed' && '📏 Fixed size with overlap'}
              {chunkingStrategy === 'agentic' && '🤖 LLM decides optimal chunks'}
            </p>
          </div>

          {/* Retrieval Strategy */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-pink-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <label className="text-sm font-bold text-gray-900">
                Retrieval Strategy
              </label>
            </div>
            <select
              value={retrievalStrategy}
              onChange={(e) => setRetrievalStrategy(e.target.value as RetrievalStrategy)}
              className="w-full p-3 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white text-gray-900 cursor-pointer hover:border-gray-300 transition font-medium"
            >
              <option value="top-k">Top-K - Keyword matching</option>
              <option value="semantic">⭐ Semantic - Embedding similarity</option>
              <option value="hybrid">⭐⭐ Hybrid - BM25 + Embeddings (Best)</option>
              <option value="mmr">MMR - Diverse results</option>
              <option value="parent">Parent Doc - Expanded context</option>
            </select>
            <p className="text-xs text-gray-600 mt-3 bg-white rounded-lg p-2 border border-gray-200">
              {retrievalStrategy === 'hybrid' && '🏆 Best: Combines keyword + semantic search'}
              {retrievalStrategy === 'semantic' && '✨ AI-powered similarity matching'}
              {retrievalStrategy === 'top-k' && '🔤 Simple keyword matching'}
              {retrievalStrategy === 'mmr' && '🎯 Balances relevance and diversity'}
              {retrievalStrategy === 'parent' && '📖 Includes surrounding context'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between bg-white shadow-sm">
          <div className="flex items-center gap-3">
            {!showSettings && (
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                title="Settings"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">RAG Chatbot</h1>
          </div>
          {documentLoaded && (
            <div className="flex items-center gap-2 text-xs">
              <span className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full font-medium shadow-sm">
                {chunkingStrategy}
              </span>
              <span className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-full font-medium shadow-sm">
                {retrievalStrategy}
              </span>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-8">
            {(() => {
              console.log('Messages length:', messages.length);
              console.log('Messages:', messages);
              return messages.length === 0;
            })() ? (
              <div className="text-center py-16">
                {/* Time-based Greeting */}
                <div className="mb-8">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-fade-in">
                      {getGreeting()}
                    </h1>
                    <span className="text-6xl animate-fade-in">{getGreetingEmoji()}</span>
                  </div>
                  <p className="text-xl text-gray-700 font-medium">
                    Ready to explore your documents?
                  </p>
                </div>

                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-xl">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                  Welcome to Study AI
                </h2>
                <p className="text-gray-700 mb-8 max-w-md mx-auto">
                  Upload a document and start chatting with your AI assistant using advanced RAG strategies
                </p>
                <button
                  onClick={() => setShowSettings(true)}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Get Started
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message) => (
                  <div key={message.id} className="group">
                    <div className="flex gap-4">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        message.role === 'user' 
                          ? 'bg-blue-600' 
                          : 'bg-gradient-to-br from-purple-500 to-pink-500'
                      }`}>
                        <span className="text-white text-sm font-medium">
                          {message.role === 'user' ? 'U' : 'AI'}
                        </span>
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {message.role === 'user' ? 'You' : 'Assistant'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="prose prose-sm max-w-none">
                          <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                            {message.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="group">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <span className="text-white text-sm font-medium">AI</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-gray-900">Assistant</span>
                        </div>
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-6 bg-white shadow-lg">
          <div className="max-w-4xl mx-auto px-2">
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={documentLoaded ? "Message RAG Assistant..." : "Upload a document to start..."}
                  disabled={isLoading}
                  rows={1}
                  className="w-full p-4 pr-12 border-2 border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 resize-none bg-white text-gray-900 transition-all shadow-sm"
                  style={{ minHeight: '56px', maxHeight: '200px' }}
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !input.trim()}
                className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:from-blue-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">
              Press Enter to send • Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
