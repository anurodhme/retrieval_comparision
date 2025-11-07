"""
LLM integration for response generation
"""
import os
from dotenv import load_dotenv

load_dotenv()


async def generate_response(context: str, query: str, conversation_history: list = None) -> str:
    """
    Generate response using Gemini API with conversation memory
    
    Args:
        context: Retrieved context from document chunks
        query: User query
        conversation_history: List of previous messages [{"role": "user/assistant", "content": "..."}]
        
    Returns:
        Generated response text
    """
    api_key = os.getenv('GEMINI_API_KEY')
    
    if not api_key:
        return (
            "⚠️ API Key Missing: Please add your GEMINI_API_KEY to the .env file. "
            "For now, here's a simulated response based on the context.\n\n"
            f"Context provided: {len(context)} characters\n"
            f"Query: {query}"
        )
    
    # Build conversation history
    history_text = ""
    if conversation_history:
        history_text = "\n\nPrevious Conversation:\n"
        for msg in conversation_history[-6:]:  # Last 3 exchanges (6 messages)
            role = "User" if msg["role"] == "user" else "Assistant"
            history_text += f"{role}: {msg['content']}\n"
    
    # Construct the improved prompt
    prompt = f"""You are a concise teaching assistant helping students understand lecture materials.

Guidelines:
- Keep responses SHORT and FOCUSED (2-3 paragraphs max)
- NO markdown formatting (no **, *, #, -, etc.) - use plain text only
- For "what is X" questions: Give a brief definition and key points
- For "how to solve" questions: Provide step-by-step approach
- Use simple language and avoid overly technical jargon unless necessary
- If asked for more detail, then elaborate
- Reference previous conversation when relevant

Lecture Material:
{context}
{history_text}

Question: {query}

Provide a concise, plain-text answer (no markdown):"""
    
    try:
        import google.generativeai as genai
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        response = model.generate_content(prompt)
        return response.text
        
    except ImportError:
        return (
            "⚠️ Google Generative AI library not installed. "
            "Please run: pip install google-generativeai"
        )
    except Exception as e:
        return (
            f"⚠️ Error calling Gemini API: {str(e)}\n\n"
            "Please check:\n"
            "1. Your API key is correct\n"
            "2. You have internet connection\n"
            "3. The Gemini API is accessible from your location"
        )
