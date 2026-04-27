"""
Uygulama konfigürasyonu — pydantic-settings ile ortam değişkenlerinden okunur.
Docker'da env vars docker-compose üzerinden; lokalde backend/.env dosyasından gelir.
"""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/.env veya proje kökündeki .env dosyasını bul
_HERE = Path(__file__).resolve().parent.parent          # app/
_BACKEND = _HERE.parent                                  # backend/
_ENV_FILE = _BACKEND / ".env" if (_BACKEND / ".env").exists() else ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        env_ignore_empty=True,
        extra="ignore",
        validate_default=False,
    )

    APP_NAME: str = "Kendi Dokümanların ile Sohbet Et"
    DEBUG: bool = False

    GOOGLE_API_KEY: str | None = None

    # Gemini 2.5 Flash Lite — güncel model, geniş ücretsiz kota
    DEFAULT_MODEL: str = "gemini-2.5-flash-lite"

    # Gemini embedding-001 — bu API key ile erişilebilen standart embedding modeli
    EMBEDDING_MODEL: str = "models/gemini-embedding-001"

    CHROMA_PATH: str = "resource/chroma_db"

    # SQLite veritabanı — sohbet geçmişi için
    DB_PATH: str = "resource/conversations.db"

    # Takip soruları / basit özetler için hızlı ve ucuz model
    FAST_MODEL: str = "gemini-1.5-flash"

    # RAG'da döküman chunk sayısı — daha az token, daha odaklı yanıt
    RAG_K: int = 4
    RAG_SCORE_THRESHOLD: float = 0.3


settings = Settings()
