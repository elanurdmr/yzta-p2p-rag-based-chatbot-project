"""
SQLite veritabanı bağlantısı ve şema başlatma.
Sohbet geçmişi (conversations) burada kalıcı olarak saklanır.
"""

import aiosqlite
from pathlib import Path

from core.config import settings

_DB_PATH = Path(settings.DB_PATH)


async def init_db() -> None:
    """Uygulama başlarken tabloyu oluşturur (idempotent)."""
    _DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    async with aiosqlite.connect(_DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id          TEXT PRIMARY KEY,
                title       TEXT NOT NULL,
                created_at  INTEGER NOT NULL,
                updated_at  INTEGER NOT NULL
            )
        """)
        await db.commit()


async def get_db() -> aiosqlite.Connection:
    """Bağlantı döndürür — manuel kapatma gerektirir."""
    return await aiosqlite.connect(_DB_PATH)
