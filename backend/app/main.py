"""
FastAPI uygulama giriş noktası.
'Kendi Dokümanların ile Sohbet Et' — Google Gemini + LangGraph + ChromaDB
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.chat_routes import chat_router
from api.upload_routes import upload_router
from core.config import settings

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 %s başlatılıyor...", settings.APP_NAME)
    logger.info("   LLM  : %s", settings.DEFAULT_MODEL)
    logger.info("   Embed: %s", settings.EMBEDDING_MODEL)
    logger.info("   Chroma: %s", settings.CHROMA_PATH)
    yield
    logger.info("🛑 Uygulama kapatılıyor.")


app = FastAPI(
    title=settings.APP_NAME,
    description="Google Gemini 1.5 Flash destekli doküman tabanlı RAG sohbet sistemi",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)
app.include_router(upload_router)
