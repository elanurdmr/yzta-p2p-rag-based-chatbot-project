from functools import cache

from langchain_google_genai import ChatGoogleGenerativeAI

from core.config import settings


@cache
def get_model(model_name: str, /) -> ChatGoogleGenerativeAI:
    """Verilen model adına göre Gemini modeli döndürür (önbellekli)."""
    return ChatGoogleGenerativeAI(
        model=model_name,
        google_api_key=settings.GOOGLE_API_KEY,
        temperature=0.5,
        streaming=True,
    )
