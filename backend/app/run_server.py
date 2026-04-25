"""
Yerel geliştirme sunucusu başlatıcı.
Kullanım: python run_server.py
"""

import asyncio
import sys

import uvicorn

if __name__ == "__main__":
    # Windows'ta asyncio event loop politikasını düzelt
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info",
    )
