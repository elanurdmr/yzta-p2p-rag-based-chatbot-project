"""
Takip sorusu üreteci.
Verilen AI yanıtı ve kaynak içeriklere göre 3 adet akıllı takip sorusu üretir.
"""

import json
import logging
import re

from langchain_google_genai import ChatGoogleGenerativeAI

from core.config import settings

logger = logging.getLogger(__name__)

_FOLLOW_UP_PROMPT = """
Bir doküman analiz asistanısın. Kullanıcı bir soruyu sormuş, sen de cevaplamışsın.
Şimdi kullanıcının dökümana daha derinlemesine dalmasını sağlayacak 3 adet akıllı takip sorusu üreteceksin.

Kurallar:
- Sorular dökümanın gerçek içeriğine odaklı olmalı
- Her soru bir öncekinden farklı bir perspektif sunmalı (detay, karşılaştırma, uygulama gibi)
- Sorular kısa ve net olmalı (maksimum 12 kelime)
- Türkçe yaz
- Yalnızca JSON dizisi döndür, başka hiçbir şey yazma

Kullanıcı sorusu: {user_question}
AI yanıtı: {ai_answer}

Sadece şu formatta döndür:
["Soru 1?", "Soru 2?", "Soru 3?"]
"""


async def generate_follow_up_questions(
    user_question: str,
    ai_answer: str,
) -> list[str]:
    """Yanıt sonrası 3 adet takip sorusu üretir."""
    if not ai_answer or len(ai_answer) < 30:
        return []

    try:
        llm = ChatGoogleGenerativeAI(
            model=settings.DEFAULT_MODEL,
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=0.7,
        )
        prompt = _FOLLOW_UP_PROMPT.format(
            user_question=user_question[:500],
            ai_answer=ai_answer[:1500],
        )
        response = await llm.ainvoke(prompt)
        text = response.content.strip()

        # JSON dizisini parse et
        match = re.search(r'\[.*?\]', text, re.DOTALL)
        if match:
            questions = json.loads(match.group())
            return [str(q).strip() for q in questions if q][:3]
    except Exception as e:
        logger.warning(f"Takip sorusu üretilemedi: {e}")

    return []
