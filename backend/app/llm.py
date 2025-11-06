"""
LLM integration for response generation
"""
import os
from dotenv import load_dotenv

load_dotenv()


async def generate_response(context: str, query: str) -> str:
    """
    Generate response using Gemini API
    
    Args:
        context: Retrieved context from document chunks
        query: User query
        
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
    
    # Construct the prompt
    prompt = f"""Based on the following context, answer the user's question accurately and concisely.

Context:
{context}

Question: {query}

Answer:"""
    
    try:
        import google.generativeai as genai
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
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
