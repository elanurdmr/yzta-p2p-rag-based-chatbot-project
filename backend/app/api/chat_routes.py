"""
app/api/chat_routes.py — /chat altındaki tüm endpoint'ler burада.
stream, invoke ve agents olmak üzere üç rota var.
Asıl iş _message_generator içinde yapılıyor.
"""

import json
import logging
from asyncio import CancelledError
from collections.abc import AsyncGenerator
from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, status
from fastapi.exceptions import HTTPException
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, AIMessageChunk, HumanMessage
from langchain_core.runnables import RunnableConfig
from langgraph.types import Command, Interrupt

from ai.agent.agents import DEFAULT_AGENT, get_agent
from ai.follow_up import generate_follow_up_questions
from api.schema.chatSchema import ChatMessage, StreamInput, UserInput
from core.config import settings
from utils.chat_utils import (
    convert_message_content_to_string,
    langchain_to_chat_message,
    remove_tool_calls,
)

logger = logging.getLogger(__name__)

chat_router = APIRouter(prefix="/chat", tags=["chat"])


# FastAPI docs için SSE response örneği — sadece swagger'da güzel görünsün diye
def _sse_response_example() -> dict[int, Any]:
    return {
        status.HTTP_200_OK: {
            "description": "Server-Sent Events yanıtı",
            "content": {
                "text/event-stream": {
                    "example": "data: {\"type\": \"token\", \"content\": \"Merhaba\"}\n\n",
                    "schema": {"type": "string"},
                }
            },
        }
    }


@chat_router.get("/agents")
async def list_agents():
    """Mevcut ajanların listesini döndürür."""
    from ai.agent.agents import get_all_agent_info
    return get_all_agent_info()


# tek seferlik yanıt — streaming istemeyenler için, test amaçlı da kullanışlı
@chat_router.post("/invoke")
async def invoke(user_input: UserInput) -> ChatMessage:
    """Tek seferlik ajan yanıtı."""
    agent = get_agent(user_input.agent_id)
    kwargs, run_id = await _build_input(user_input, agent)
    try:
        response_events = await agent.ainvoke(**kwargs, stream_mode=["updates", "values"])
        response_type, response = response_events[-1]
        if response_type == "values":
            output = langchain_to_chat_message(response["messages"][-1])
        elif response_type == "updates" and "__interrupt__" in response:
            output = langchain_to_chat_message(
                AIMessage(content=response["__interrupt__"][0].value)
            )
        else:
            raise ValueError(f"Beklenmeyen yanıt tipi: {response_type}")
        output.run_id = str(run_id)
        return output
    except Exception as e:
        logger.error(f"invoke hatası: {e}")
        raise HTTPException(status_code=500, detail="Sunucu hatası")


@chat_router.post("/stream", response_class=StreamingResponse, responses=_sse_response_example())
async def stream(user_input: StreamInput) -> StreamingResponse:
    """Streaming ajan yanıtı (SSE)."""
    return StreamingResponse(
        _message_generator(user_input),
        media_type="text/event-stream",
    )


# ---------------------------------------------------------------------------
# Yardımcı fonksiyonlar
# ---------------------------------------------------------------------------

async def _build_input(
    user_input: UserInput, agent
) -> tuple[dict[str, Any], UUID]:
    run_id = uuid4()
    thread_id = user_input.thread_id or str(uuid4())
    configurable = {"thread_id": thread_id, "model": settings.DEFAULT_MODEL}

    if user_input.agent_config:
        # agent_config'deki anahtarlar bizim ayrılmış alanlarla çakışmamalı
        overlap = configurable.keys() & user_input.agent_config.keys()
        if overlap:
            raise HTTPException(
                status_code=422,
                detail=f"agent_config ayrılmış anahtarlar içeriyor: {overlap}",
            )
        configurable.update(user_input.agent_config)

    config = RunnableConfig(configurable=configurable, run_id=run_id)

    # eğer önceki turda bir interrupt varsa resume ile devam et
    state = await agent.aget_state(config=config)
    interrupted = [t for t in state.tasks if hasattr(t, "interrupts") and t.interrupts]
    input_data = Command(resume=user_input.message) if interrupted else {
        "messages": [HumanMessage(content=user_input.message)]
    }

    return {"input": input_data, "config": config}, run_id


async def _message_generator(user_input: StreamInput) -> AsyncGenerator[str, None]:
    agent = get_agent(user_input.agent_id)
    kwargs, run_id = await _build_input(user_input, agent)

    thread_id = user_input.thread_id or str(run_id)

    # takip sorularını üretmek için son AI yanıtını tutuyoruz
    # çok kısa yanıtlarda follow-up üretmiyoruz zaten
    last_ai_content: str = ""

    try:
        async for stream_event in agent.astream(
            **kwargs, stream_mode=["updates", "messages", "custom"]
        ):
            if not isinstance(stream_event, tuple):
                continue

            stream_mode, event = stream_event
            new_messages = []

            if stream_mode == "updates":
                for node, updates in event.items():
                    if node == "__interrupt__":
                        for interrupt in updates:
                            new_messages.append(AIMessage(content=interrupt.value))
                        continue
                    new_messages.extend(updates.get("messages", []))

            if stream_mode == "custom":
                new_messages = [event]

            for message in new_messages:
                try:
                    chat_message = langchain_to_chat_message(message)
                    chat_message.run_id = str(run_id)
                except Exception as e:
                    logger.error(f"Mesaj ayrıştırma hatası: {e}")
                    yield f"data: {json.dumps({'type': 'error', 'content': 'Beklenmeyen hata'})}\n\n"
                    continue

                # kullanıcının kendi mesajını tekrar gönderme
                if chat_message.type == "human" and chat_message.content == user_input.message:
                    continue

                if chat_message.type == "ai" and chat_message.content and not chat_message.tool_calls:
                    last_ai_content = chat_message.content

                yield f"data: {json.dumps({'type': 'message', 'content': chat_message.model_dump()})}\n\n"

            if stream_mode == "messages":
                if not user_input.stream_tokens:
                    continue
                msg, metadata = event
                # bazı node'lar stream_tokens=False gibi davranmak için bu tag'i kullanıyor
                if "skip_stream" in metadata.get("tags", []):
                    continue
                if not isinstance(msg, AIMessageChunk):
                    continue
                content = remove_tool_calls(msg.content)
                if content:
                    yield f"data: {json.dumps({'type': 'token', 'content': convert_message_content_to_string(content)})}\n\n"

    except GeneratorExit:
        # kullanıcı sayfayı kapattı
        logger.info("Akış istemci tarafından kapatıldı")
        return
    except CancelledError:
        logger.info("Akış iptal edildi")
        return
    except Exception as e:
        err_str = str(e)
        logger.error(f"Akış hatası: {e}")
        # 429 özel mesaj göster, diğerleri generic hata
        if "429" in err_str or "quota" in err_str.lower() or "Quota" in err_str:
            msg = "⏳ API kotası doldu. Lütfen 1-2 dakika bekleyip tekrar deneyin."
        else:
            msg = f"Sunucu hatası: {err_str[:200]}"
        yield f"data: {json.dumps({'type': 'error', 'content': msg})}\n\n"
    finally:
        # finally'de takip sorularını üret — hata olsa bile end eventi gönderilmeli
        if last_ai_content and len(last_ai_content) > 40:
            try:
                questions = await generate_follow_up_questions(
                    user_question=user_input.message,
                    ai_answer=last_ai_content,
                )
                if questions:
                    yield f"data: {json.dumps({'type': 'follow_up', 'questions': questions})}\n\n"
            except Exception as e:
                logger.warning(f"Takip soruları gönderilemedi: {e}")

        yield f"data: {json.dumps({'type': 'end'})}\n\n"
