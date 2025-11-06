document.addEventListener('DOMContentLoaded', () => {
    const sendButton = document.getElementById('send-button');
    const chatInput = document.getElementById('chat-input');
    const chatWindow = document.getElementById('chat-window');

    // Clear the initial message
    chatWindow.innerHTML = '';

    sendButton.addEventListener('click', handleSendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    });

    function handleSendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        addMessageToChat('user', message);
        chatInput.value = '';

        const documentText = document.getElementById('document-text').value;
        const chunkingStrategy = document.getElementById('chunking-strategy').value;
        const retrievalStrategy = document.getElementById('retrieval-strategy').value;

        if (!documentText) {
            addMessageToChat('bot', 'Please upload a document first.');
            return;
        }

        // 1. Chunk the document
        const chunks = chunkDocument(documentText, chunkingStrategy);

        // 2. Retrieve relevant chunks (placeholder)
        const context = retrieveChunks(chunks, message, retrievalStrategy);

        // 3. Generate response
        generateResponse(context, message);
    }

    async function generateResponse(context, query) {
        const prompt = `Based on the following context, answer the user's question.\n\nContext:\n${context}\n\nQuestion: ${query}`;

        addMessageToChat('bot', 'Generating answer...');

        // --- GEMINI API INTEGRATION --- //
        // TODO: Replace this with your actual Gemini API call.
        // You will need to use your API key and handle the fetch request here.
        const placeholderResponse = `(Simulated Response) Based on the context provided, here is an answer to: "${query}"`;
        
        // Simulate a network delay
        setTimeout(() => {
            // Find the "Generating answer..." message and update it
            const generatingMessage = Array.from(chatWindow.querySelectorAll('.bot-message')).pop();
            if (generatingMessage && generatingMessage.textContent.includes('Generating')) {
                generatingMessage.textContent = placeholderResponse;
            }
        }, 1500);
        // --- END OF API INTEGRATION --- //
    }

    function chunkDocument(text, strategy) {
        switch (strategy) {
            case 'fixed':
                return chunkFixedSize(text, 1000, 200);
            case 'recursive':
                return chunkRecursive(text);
            case 'document':
                return text.split('---').map(s => s.trim()).filter(Boolean);
            case 'semantic':
            case 'agentic':
                // Placeholder for more advanced strategies
                addMessageToChat('bot', `The '${strategy}' chunking strategy is not yet implemented. Using the full document as a single chunk.`);
                return [text];
            default:
                return [text];
        }
    }

    function chunkRecursive(text) {
        // A simple recursive chunking by paragraph, then sentence.
        const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
        const chunks = [];
        paragraphs.forEach(p => {
            const sentences = p.match(/[^.!?]+[.!?]*/g) || [p];
            chunks.push(...sentences);
        });
        return chunks;
    }

    function chunkFixedSize(text, chunkSize, overlap) {
        const chunks = [];
        let i = 0;
        while (i < text.length) {
            const end = i + chunkSize;
            chunks.push(text.slice(i, end));
            i += chunkSize - overlap;
        }
        return chunks;
    }

    function retrieveChunks(chunks, query, strategy) {
        switch (strategy) {
            case 'top-k':
                return retrieveTopK(chunks, query, 3);
            case 'mmr':
            case 'parent':
                addMessageToChat('bot', `The '${strategy}' retrieval strategy is not yet implemented. Using Simple Top-K instead.`);
                return retrieveTopK(chunks, query, 3);
            default:
                return retrieveTopK(chunks, query, 3);
        }
    }

    function retrieveTopK(chunks, query, k) {
        const scoredChunks = chunks.map(chunk => ({
            chunk,
            score: calculateSimilarity(chunk, query)
        }));

        scoredChunks.sort((a, b) => b.score - a.score);

        return scoredChunks.slice(0, k).map(sc => sc.chunk).join('\n---\n');
    }

    function calculateSimilarity(text, query) {
        // Simple keyword matching for demonstration
        const textWords = new Set(text.toLowerCase().split(/\W+/));
        const queryWords = new Set(query.toLowerCase().split(/\W+/));
        let score = 0;
        for (const word of queryWords) {
            if (textWords.has(word)) {
                score++;
            }
        }
        return score;
    }

    function addMessageToChat(sender, message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', sender === 'user' ? 'user-message' : 'bot-message');
        messageElement.textContent = message;
        chatWindow.appendChild(messageElement);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }
});