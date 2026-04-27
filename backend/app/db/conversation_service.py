"""
Sohbet geçmişi CRUD işlemleri.
"""

import time
from typing import TypedDict

import aiosqlite

from db.database import get_db


class ConversationRow(TypedDict):
    id: str
    title: str
    created_at: int
    updated_at: int


async def upsert_conversation(thread_id: str, title: str) -> None:
    """
    Sohbet kaydı yoksa oluşturur, varsa updated_at günceller.
    Title yalnızca ilk oluşturmada atanır.
    """
    now = int(time.time() * 1000)
    clean_title = title.replace("\n", " ").strip()[:80]
    db = await get_db()
    try:
        await db.execute(
            """
            INSERT INTO conversations (id, title, created_at, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at
            """,
            (thread_id, clean_title, now, now),
        )
        await db.commit()
    finally:
        await db.close()


async def get_all_conversations() -> list[ConversationRow]:
    """Tüm sohbetleri en yeniden eskiye sıralar."""
    db = await get_db()
    try:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT id, title, created_at, updated_at FROM conversations ORDER BY updated_at DESC"
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]  # type: ignore[arg-type]
    finally:
        await db.close()


async def get_conversation(thread_id: str) -> ConversationRow | None:
    """Tek bir sohbet kaydını getirir."""
    db = await get_db()
    try:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT id, title, created_at, updated_at FROM conversations WHERE id = ?",
            (thread_id,),
        )
        row = await cursor.fetchone()
        return dict(row) if row else None  # type: ignore[arg-type]
    finally:
        await db.close()


async def delete_conversation(thread_id: str) -> bool:
    """Sohbet kaydını siler. Başarılıysa True döner."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "DELETE FROM conversations WHERE id = ?", (thread_id,)
        )
        await db.commit()
        return cursor.rowcount > 0
    finally:
        await db.close()
