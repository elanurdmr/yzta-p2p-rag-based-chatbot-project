"""
Sohbet geçmişi endpoint'leri.
Kalıcı SQLite tablosundaki conversation kayıtlarını yönetir.
"""

import logging

from fastapi import APIRouter, HTTPException, status

from db.conversation_service import (
    delete_conversation,
    get_all_conversations,
    get_conversation,
)

logger = logging.getLogger(__name__)

conversation_router = APIRouter(prefix="/conversations", tags=["conversations"])


@conversation_router.get("")
async def list_conversations():
    """
    Tüm sohbet geçmişini döndürür (en yeniden eskiye).
    Her kayıt: id, title, created_at, updated_at (Unix ms).
    """
    return await get_all_conversations()


@conversation_router.get("/{conversation_id}")
async def get_conversation_detail(conversation_id: str):
    """Belirli bir sohbetin meta bilgisini döndürür."""
    conv = await get_conversation(conversation_id)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sohbet bulunamadı",
        )
    return conv


@conversation_router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_conversation(conversation_id: str):
    """Sohbet kaydını kalıcı olarak siler."""
    deleted = await delete_conversation(conversation_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sohbet bulunamadı",
        )
