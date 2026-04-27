# app/api/schema/chatSchema.py — sohbet API'sinin Pydantic modelleri
# UserInput → gelen istek, ChatMessage → giden yanıt, StreamInput → streaming isteği

from pydantic import BaseModel, Field, SerializeAsAny
from typing import Any, Literal, NotRequired
from typing_extensions import TypedDict
from ai.agent.agents import DEFAULT_AGENT


class UserInput(BaseModel):
    """Kullanıcıdan gelen sohbet isteği."""

    message: str = Field(
        description="input message"
    )

    # thread_id yoksa backend yeni bir UUID üretiyor
    # aynı thread_id gönderilirse LangGraph bellekten önceki mesajları biliyor
    thread_id: str | None = Field(
        description="Thread ID is used for persistence and continuing multi-round conversations",
        default=None
    )

    # belirtilmezse DEFAULT_AGENT kullanılır
    agent_id: str | None = Field(
        description="a agent id",
        default=DEFAULT_AGENT
    )

    # ajan bazlı özel config geçmek isteyenler için — şimdilik kullanmıyoruz ama ileride işe yarar
    agent_config: dict[str, Any] = Field(
        description="Additional configuration to pass through to the agent",
        default={},
        examples=[{"spicy_level": 0.8}],
    )


class ToolCall(TypedDict):
    """Ajanın bir araç çağırma isteği."""

    name: str
    args: dict[str, Any]
    id: str | None
    type: NotRequired[Literal["tool_call"]]


class ChatMessage(BaseModel):
    """API'den dönen tek mesaj birimi — hem AI hem tool hem human mesajları bu yapıda geliyor."""

    type: Literal["human", "ai", "tool", "custom"] = Field(
        description="Role of the message.",
        examples=["human", "ai", "tool", "custom"],
    )
    content: str = Field(
        description="Content of the message.",
        examples=["Hello, world!"],
    )
    tool_calls: list[ToolCall] = Field(
        description="Tool calls in the message.",
        default=[],
    )
    tool_call_id: str | None = Field(
        description="Tool call that this message is responding to.",
        default=None,
    )
    run_id: str | None = Field(
        description="Run ID of the message.",
        default=None,
    )
    response_metadata: dict[str, Any] = Field(
        description="Response metadata. For example: response headers, logprobs, token counts.",
        default={},
    )
    custom_data: dict[str, Any] = Field(
        description="Custom message data.",
        default={},
    )


class StreamInput(UserInput):
    """Streaming istekleri için genişletilmiş input — stream_tokens ile token bazlı akışı açıp kapayabiliyoruz."""

    # False yapılırsa sadece tam mesajlar gelir, token gelişi olmaz
    stream_tokens: bool = Field(
        description="Whether to stream LLM tokens to the client.",
        default=True,
    )
