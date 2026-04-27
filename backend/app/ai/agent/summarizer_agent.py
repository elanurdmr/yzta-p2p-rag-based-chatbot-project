"""
Özetleme Ajanı — Yüklenen dokümanların tamamını veya belirli konularını özetler.
"""

from typing import Literal

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, SystemMessage
from langchain_core.runnables import RunnableConfig, RunnableLambda, RunnableSerializable
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, MessagesState, StateGraph
from langgraph.prebuilt import ToolNode

from ai.llm import get_model, settings
from ai.tools.document_tools import search_documents, list_documents


SUMMARIZER_INSTRUCTIONS = """Sen bir doküman özetleme asistanısın.

Adımlar:
1. list_documents ile yüklü dosyaları öğren.
2. search_documents ile 3-4 farklı sorgu (giriş, başlıklar, önemli noktalar, sonuç) çalıştır.
3. Her dosya için şu yapıda özet yaz:

## 📄 [Dosya Adı] — Özet
> Kısa giriş (2-3 cümle)
### 🔑 Ana Konular
- Önemli başlıklar ve maddeler
### ⭐ Önemli Noktalar
- Öne çıkan kararlar / bulgular
### 📚 Kaynaklar

Kurallar: Türkçe yaz. Bilgi uydurma. Birden fazla dosya varsa her birini ayrı özetle."""


class SummarizerState(MessagesState):
    """Özetleme ajanı durumu."""


tools = [search_documents, list_documents]


def _build_model(model: BaseChatModel) -> RunnableSerializable[SummarizerState, AIMessage]:
    bound = model.bind_tools(tools)
    preprocessor = RunnableLambda(
        lambda state: [SystemMessage(content=SUMMARIZER_INSTRUCTIONS)] + state["messages"],
        name="SummarizerStateModifier",
    )
    return preprocessor | bound


async def _call_model(state: SummarizerState, config: RunnableConfig) -> SummarizerState:
    model = get_model(config["configurable"].get("model", settings.DEFAULT_MODEL))
    chain = _build_model(model)
    response = await chain.ainvoke(state, config)
    return {"messages": [response]}


def _route(state: SummarizerState) -> Literal["tools", "done"]:
    last = state["messages"][-1]
    if not isinstance(last, AIMessage):
        raise TypeError(f"AIMessage beklendi, gelen: {type(last)}")
    return "tools" if last.tool_calls else "done"


graph = StateGraph(SummarizerState)
graph.add_node("model", _call_model)
graph.add_node("tools", ToolNode(tools=tools))
graph.set_entry_point("model")
graph.add_edge("tools", "model")
graph.add_conditional_edges("model", _route, {"tools": "tools", "done": END})

summarizer_agent = graph.compile(checkpointer=MemorySaver())
summarizer_agent.name = "summarizer_agent"
