"""
app/core/config.py — Tüm ortam değişkenleri buradan okunur.
pydantic-settings sayesinde .env dosyasından otomatik yükleniyor ve tip kontrolü yapılıyor.
"""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# .env dosyasını önce backend/ klasöründe ara, yoksa proje köküne bak
# docker-compose kök .env'i kullanıyor, uvicorn ise backend/.env'i — her ikisi de çalışıyor
_HERE = Path(__file__).resolve().parent.parent          # app/
_BACKEND = _HERE.parent                                  # backend/
_ENV_FILE = _BACKEND / ".env" if (_BACKEND / ".env").exists() else ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        env_ignore_empty=True,
        extra="ignore",      # .env'de tanımlamadığım değişkenler varsa hata vermesin
        validate_default=False,
    )

    APP_NAME: str = "Kendi Dokümanların ile Sohbet Et"
    DEBUG: bool = False

    # bu olmadan hiçbir şey çalışmaz — Google AI Studio'dan alınıyor
    GOOGLE_API_KEY: str | None = None

    # ana ajan için kullanılan model — gemini-2.5-flash-lite ücretsiz kotada çalışıyor
    DEFAULT_MODEL: str = "gemini-2.5-flash-lite"

    # takip soruları ve özetleme için daha hızlı ve ucuz bir model yeterli
    FAST_MODEL: str = "gemini-1.5-flash"

    # gemini-embedding-001 bu API key ile erişilebilen en güncel embedding modeli
    EMBEDDING_MODEL: str = "models/gemini-embedding-001"

    # ChromaDB diske yazıyor, docker volume ile kalıcı hale getiriliyor
    CHROMA_PATH: str = "resource/chroma_db"

    # arama sonucu kaç chunk dönsün — 4 genellikle yeterli, token maliyeti açısından da iyi
    RAG_K: int = 4
    # bu eşiğin altındaki sonuçlar alakasız sayılıp filtreleniyor
    RAG_SCORE_THRESHOLD: float = 0.3


settings = Settings()
