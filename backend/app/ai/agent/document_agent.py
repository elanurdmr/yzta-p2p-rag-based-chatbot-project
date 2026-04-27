"""
app/ai/agent/document_agent.py — Soru-cevap için kullanılan LangGraph ajanı.
ReAct döngüsü: model → araç çağrısı → model → araç çağrısı → ... → son yanıt
"""

from datetime import datetime
from typing import Literal

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, SystemMessage
from langchain_core.runnables import RunnableConfig, RunnableLambda, RunnableSerializable
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, MessagesState, StateGraph
from langgraph.prebuilt import ToolNode

from ai.llm import get_model, settings
from ai.tools.document_tools import search_documents, list_documents


# sistem prompt'u her çağrıda yeniden oluşturuluyor çünkü {current_date} dinamik
# "yalnızca yüklü dokümanlardan" kuralı olmasa model kafadan cevap verebilir
DOCUMENT_AGENT_INSTRUCTIONS = """Sen bir doküman analiz asistanısın. Tarih: {current_date}

Kurallar:
- Yalnızca yüklü dokümanlardan bilgi ver; uydurma.
- Kaynağı (dosya adı) her yanıtta belirt.
- Bilgi bulamazsan "Yüklü dokümanlarda bu konu hakkında bilgi bulamadım." de.
- Türkçe, net ve yapılandırılmış yanıt ver.

Araçlar: search_documents (semantik arama), list_documents (dosya listesi)."""


class DocumentAgentState(MessagesState):
    """Ajan durumu — şimdilik sadece mesaj listesi tutuyor, ileride genişletilebilir."""


tools = [search_documents, list_documents]


def _build_model(model: BaseChatModel) -> RunnableSerializable[DocumentAgentState, AIMessage]:
    bound = model.bind_tools(tools)
    # preprocessor: sistem mesajını her seferinde state'in başına ekliyoruz
    # bunu lambda ile yapmak zorundayız çünkü current_date her çağrıda değişiyor
    preprocessor = RunnableLambda(
        lambda state: [
            SystemMessage(
                content=DOCUMENT_AGENT_INSTRUCTIONS.format(
                    current_date=datetime.now().strftime("%d %B %Y, %H:%M")
                )
            )
        ]
        + state["messages"],
        name="DocumentStateModifier",
    )
    return preprocessor | bound


async def _call_model(state: DocumentAgentState, config: RunnableConfig) -> DocumentAgentState:
    # model_name config'den alınıyor — bu sayede farklı thread'lerde farklı model kullanılabilir
    model = get_model(config["configurable"].get("model", settings.DEFAULT_MODEL))
    chain = _build_model(model)
    response = await chain.ainvoke(state, config)
    return {"messages": [response]}


def _route(state: DocumentAgentState) -> Literal["tools", "done"]:
    """Model tool_calls içeriyorsa araçlara git, yoksa bitir."""
    last = state["messages"][-1]
    if not isinstance(last, AIMessage):
        raise TypeError(f"AIMessage beklendi, gelen: {type(last)}")
    return "tools" if last.tool_calls else "done"


# Graf yapısı: model → (koşullu) araçlar → model → ...
graph = StateGraph(DocumentAgentState)
graph.add_node("model", _call_model)
graph.add_node("tools", ToolNode(tools=tools))
graph.set_entry_point("model")
graph.add_edge("tools", "model")
graph.add_conditional_edges("model", _route, {"tools": "tools", "done": END})

# MemorySaver uygulama restart'larında sıfırlanıyor — kalıcı bellek istesek SqliteSaver'a geçmek lazım
# şimdilik memory içi yeterli, restart = her oturum sıfırlanır
document_agent = graph.compile(checkpointer=MemorySaver())
document_agent.name = "document_agent"
