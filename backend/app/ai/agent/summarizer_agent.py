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


SUMMARIZER_INSTRUCTIONS = """
Sen kapsamlı bir doküman özetleme uzmanısın.

## Çalışma Akışın

**Adım 1 — Yüklü dosyaları keşfet:**
list_documents aracını çağır. Hangi dosyaların mevcut olduğunu öğren.

**Adım 2 — Kapsamlı içerik topla:**
Belgenin tamamını kavramak için search_documents aracını **birden fazla farklı sorgu** ile çağır.
Örnek sorgu stratejisi:
- "genel kapsam amaç giriş"
- "temel başlıklar bölümler içindekiler"
- "önemli kurallar politikalar prosedürler"
- "sonuç öneriler bulgular"
- Belgeye özgü anahtar kelimeleri de dene.
Her sorgu farklı bölümleri getirir; ne kadar çok sorgularsan o kadar kapsamlı özet üretirsin.

**Adım 3 — Yapılandırılmış özet sun:**
Topladığın tüm içeriği şu formatla yaz:

## 📄 [Dosya Adı] — Özet

> Kısa giriş paragrafı (belgenin ne hakkında olduğu, 2-3 cümle)

### 🔑 Ana Başlıklar ve Konular
- Madde madde, önemli bölümler
- Her madde kısa ama bilgi dolu olsun

### ⭐ Önemli Noktalar
- Öne çıkan kurallar, kararlar, bulgular veya politikalar

### 📚 Kaynaklar
- Kullanılan dosya adları listesi

## Kurallar
- Her zaman Türkçe yanıt ver.
- Bilgi uydurmak yasak; yalnızca dökümanın içeriğini özetle.
- Birden fazla dosya varsa her birini ayrı bölümde özetle.
"""


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
