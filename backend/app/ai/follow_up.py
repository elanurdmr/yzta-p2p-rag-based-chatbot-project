"""
app/ai/follow_up.py — Her AI yanıtından sonra 3 takip sorusu üretir.
Bu ayrı bir LLM çağrısı — hafif model kullanmak maliyeti düşürüyor.
"""

import json
import logging
import re

from langchain_google_genai import ChatGoogleGenerativeAI

from core.config import settings

logger = logging.getLogger(__name__)

# prompt'ta JSON formatı zorlamak önemli çünkü parse etmek zorundayız
# "başka hiçbir şey yazma" kısmı olmadan model açıklama eklemeye çalışıyor
_FOLLOW_UP_PROMPT = """Aşağıdaki soru-cevap çiftine göre, kullanıcının dokümana daha derinlemesine dalmasını sağlayacak 3 kısa takip sorusu üret.

Kullanıcı sorusu: {user_question}
AI yanıtı: {ai_answer}

Kurallar:
- Her soru maksimum 12 kelime, Türkçe
- Farklı açılar (detay, karşılaştırma, uygulama)
- YALNIZCA aşağıdaki formatta JSON dizisi döndür, başka hiçbir şey yazma:
["Soru 1?", "Soru 2?", "Soru 3?"]"""


def _parse_questions(text: str) -> list[str]:
    """Model çıktısından JSON dizi içindeki soruları güvenle çıkarır.
    Bazen model ```json ... ``` blok içinde dönüyor, bazen düz metin ekliyor.
    Her iki durumu da handle etmeye çalışıyoruz."""

    # markdown code block temizle
    text = re.sub(r"```[a-z]*\n?", "", text).strip()

    # [ ... ] bloğunu bul — re.DOTALL önemli çünkü multiline JSON olabilir
    match = re.search(r"\[.*\]", text, re.DOTALL)
    if not match:
        return []

    try:
        questions = json.loads(match.group())
        if isinstance(questions, list):
            return [str(q).strip() for q in questions if str(q).strip()][:3]
    except json.JSONDecodeError:
        pass

    return []


async def generate_follow_up_questions(
    user_question: str,
    ai_answer: str,
) -> list[str]:
    """Yanıt sonrası 3 adet takip sorusu üretir.
    Çok kısa yanıtlar için (30 karakter altı) hiç üretme — genellikle hata mesajıdır."""
    if not ai_answer or len(ai_answer) < 30:
        return []

    try:
        # temperature=0.7 — biraz yaratıcılık istiyoruz, tamamen deterministik olmasın
        llm = ChatGoogleGenerativeAI(
            model=settings.DEFAULT_MODEL,
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=0.7,
        )
        # uzun yanıtları keserek token tasarrufu yapıyoruz
        prompt = _FOLLOW_UP_PROMPT.format(
            user_question=user_question[:400],
            ai_answer=ai_answer[:1200],
        )
        response = await llm.ainvoke(prompt)
        text = (response.content or "").strip()
        logger.debug("Follow-up ham yanıt: %s", text[:200])

        questions = _parse_questions(text)
        if questions:
            return questions

        # parse başarısız oldu ama hata da olmadı — sessizce boş dön
        logger.warning("Follow-up: JSON parse başarısız. Ham yanıt: %s", text[:300])
    except Exception as e:
        # follow-up oluşturulamaması kritik değil — akışı kesmemek için sadece log
        logger.warning("Takip sorusu üretilemedi: %s", e)

    return []
